import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import axios from "axios";
import cheerio from "cheerio";
import puppeteer from "puppeteer";
import yaml from "js-yaml";
import bodyParser from "body-parser";
import { db, getTableData } from "./db.js";
import fs from "fs";
import path from "path";
import markdownIt from "markdown-it";
import { OpenAI } from "langchain/llms";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { initializeAgentExecutor } from 'langchain/agents';
import { JsonToolkit, createJsonAgent } from 'langchain/agents';
import { JsonSpec } from 'langchain/tools';
import { loadQAStuffChain, loadQAMapReduceChain } from "langchain/chains";
import { Document } from "langchain/document";
import { resourceLimits } from "worker_threads";
import { HNSWLib } from "langchain/vectorstores";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { TextLoader } from "langchain/document_loaders";

dotenv.config();
const md = markdownIt();

const app = express();
const PORT = 3001;

app.use(bodyParser.json({ limit: "10mb" })); // You can set the limit to any appropriate size.
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.use(cors());

app.use(express.json());

app.get("/fetch-and-download-yaml-files", async (req, res) => {
  try {
    const isYamlFilesTableEmpty = async () => {
      return new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='yaml_files'", (err, row) => {
          if (err) {
            reject(err);
          } else {
            if (row.count === 0) {
              resolve(true);
            } else {
              db.get("SELECT COUNT(*) as count FROM yaml_files", (err, row) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(row.count === 0);
                }
              });
            }
          }
        });
      });
    };

    const yamlFilesIsEmpty = await isYamlFilesTableEmpty();

    let yamlUrls = [];

    if (yamlFilesIsEmpty) {
      const pageUrl = "https://developers.welcomesoftware.com/openapi.html?hash=5b202b8";

      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      page.on("request", (request) => {
        if (request.url().includes(".yaml")) {
          yamlUrls.push(request.url());
        }
      });

      await page.goto(pageUrl, { waitUntil: "networkidle0" });
      await browser.close();
    } else {
      // Fetch URLs from the database if the table is not empty
      const fetchYamlUrlsFromDatabase = () => {
        return new Promise((resolve, reject) => {
          db.all("SELECT url FROM yaml_files", (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows.map((row) => row.url));
            }
          });
        });
      };

      yamlUrls = await fetchYamlUrlsFromDatabase();
    }

    const yamlFiles = {};
    let webhookFiles = {};

    const downloadFile = async (url) => {
      try {
        const response = await axios.get(url);
        const content = response.data;
        return content;
      } catch (error) {
        console.error(`Error fetching file at ${url}:`, error);
      }
    };

    const getYamlFileFromDatabase = (url) => {
      return new Promise((resolve, reject) => {
        db.get("SELECT content FROM yaml_files WHERE url=?", [url], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.content : null);
          }
        });
      });
    };

    const getWebhookFileFromDatabase = (url) => {
      return new Promise((resolve, reject) => {
        db.get("SELECT content FROM webhook_md WHERE url=?", [url], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.content : null);
          }
        });
      });
    };

    const saveYamlFileToDatabase = (url, content) => {
      db.run("INSERT OR REPLACE INTO yaml_files (url, content) VALUES (?, ?)", [url, content], (err) => {
        if (err) {
          console.error("Error saving YAML file to database:", err);
        }
      });
    };

    const saveWebhookToDatabase = (section, content) => {
      db.run(
        `INSERT OR REPLACE INTO webhook_md (section, content) VALUES (?, ?)`,
        [section, content],
        (err) => {
          if (err) {
            console.error("Error saving Webhook Markdown to database:", err);
          }
        }
      );
    };

    const processYamlUrl = async (url) => {
      let content = await getYamlFileFromDatabase(url);

      if (!content) {
        content = await downloadFile(url);
        saveYamlFileToDatabase(url, content);
      }

      const fileName = url.split("/").pop();
      const jsonContent = yaml.load(content); // Convert YAML content to JSON
      yamlFiles[fileName] = jsonContent;
    };

    const processWebhookUrl = async (url) => {
      let content = await downloadFile(url);
  
      // Parse the markdown content and store it in the webhook_md table
      const tokens = md.parse(content, {});
  
      let currentSection = "";
      let currentContent = "";
  
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
  
        if (token.type === "heading_open" && token.tag === "h1") {
          if (currentSection && currentContent) {
            saveWebhookToDatabase(currentSection, currentContent.trim());
          }
  
          currentSection = tokens[i + 1].content;
          currentContent = "";
        } else {
          currentContent += md.renderer.render([token], md.options);
        }
      }
  
      if (currentSection && currentContent) {
        saveWebhookToDatabase(currentSection, currentContent.trim());
      }
  
      webhookFiles = content;
    };

    await processWebhookUrl('https://developers.welcomesoftware.com/webhooks.md')
    
    const promises = yamlUrls.map(processYamlUrl);
    await Promise.all(promises);

    res.send({ yamlFiles, webhookFiles });

  } catch (error) {
    console.error("Error fetching and downloading YAML files:", error);
    res.status(500).send("Error fetching and downloading YAML files");
  }
});


app.post("/gpt-api-call", async (req, res) => {
  const formValues = req.body;
  const query = formValues.query;
  const documentation = formValues.yamlFiles;

  const getDocumentationString = (refs, documentation) => {
    if (!refs || !documentation) {
      return "";
    }
  
    let documentationString = "";
  
    refs.forEach((ref) => {
      const encodedRef = ref.replace('{', '%7B').replace('}', '%7D');
      const strippedRef = encodedRef.split('/').pop();
  
      const yamlFile = documentation[strippedRef];
      if (!yamlFile) {
        return;
      }
  
      const recursiveExpand = (obj) => {
        for (const key in obj) {
          if (typeof obj[key] === "object") {
            recursiveExpand(obj[key]);
          } else if (key === "$ref") {
            const ref = obj[key];
            const encodedRef2 = ref.replace('{', '%7B').replace('}', '%7D');
            const strippedRef2 = encodedRef2.split('/').pop();
            const refContent = getDocumentationString([ref], documentation);
  
            // Replace the $ref key with the strippedRef value
            // and the $ref value with the contents of the $ref YAML file
            delete obj[key];
            obj[strippedRef2] = JSON.parse(refContent);
          }
        }
      };
  
      recursiveExpand(yamlFile);
      documentationString += JSON.stringify(yamlFile, null, 2);
    });
  
    return documentationString;
  };

  const directory = path.join(process.cwd(), 'embeddings');

  const saveDocumentationEmbeddings = async (documentation, directory) => {
    // Define the vector store file path
    const vectorStoreFilePath = path.join(directory, "hnswlib.bin");
  
    // Check if the file already exists in the directory
    if (!fs.existsSync(vectorStoreFilePath)) {
      
      //const loader = new TextLoader(JSON.stringify(documentation));
      //const docs = await loader.load();

      const docString = JSON.stringify(documentation).trim()
      console.log(docString);
  
      // Create a vector store from the documentation text
      const vectorStore = await HNSWLib.fromTexts(
        ["Hello world", "Bye bye", "hello nice world"],
        [{ id: 2 }, { id: 1 }, { id: 3 }],
        new OpenAIEmbeddings()
      );
  
      // Save the vector store to the specified directory
      await vectorStore.save(directory);
    }
  };
  
  await saveDocumentationEmbeddings(documentation['openapi.yaml?hash=5b202b8'].paths, directory);
  
  // Load the vector store from the same directory
  /*
  const loadedVectorStore = await HNSWLib.load(
    directory,
    new OpenAIEmbeddings()
  );
  
  
  // vectorStore and loadedVectorStore are identical
  const result = await loadedVectorStore.similaritySearch(query, 1);
  //console.log(result);
  res.send(result);

  */

  /*
  const pathData = documentation['openapi.yaml?hash=5b202b8'].paths;
  const pathString = JSON.stringify(pathData);
  const tags = documentation['openapi.yaml?hash=5b202b8'].tags;
  const tagsString = JSON.stringify(tags);
  console.log(query)
  const model = new OpenAI({ modelName: 'gpt-3.5-turbo', openAIApiKey: process.env.OPENAI_API_KEY, temperature: 0.0 });

  const tagTemplate = `Below is a user request regarding the Optimizely Content Marketing Platform API. I will include the documentation later. For now, I want you to categorize the request into the correct API Endpoint as listed below. Please only pick one API Endpoint. If there is no match, return the string "info".

  Request: {query}

  API Endpoints: {tagsString}
  
  This is the end of the prompt.`;

  const tagPrompt = new PromptTemplate({ template: tagTemplate, inputVariables: ["query", "tagsString"] });
  const tagChain = new LLMChain({ llm: model, prompt: tagPrompt });

  const pathsArray = "['paths/tasks.yaml', 'paths/tasks_{id}.yaml', 'paths/tasks_{id}_assets.yaml', 'paths/tasks_{task_id}_assets_{asset_id}_drafts.yaml', 'paths/tasks_{task_id}_assets_{asset_id}_comments.yaml', 'paths/tasks_{id}_attachments.yaml', 'paths/tasks_{task_id}_articles_{article_id}.yaml', 'paths/tasks_{task_id}_images_{image_id}.yaml', 'paths/tasks_{task_id}_videos_{video_id}.yaml', 'paths/tasks_{task_id}_raw-files_{raw_file_id}.yaml', 'paths/tasks_{task_id}_comments.yaml']";
  
  try {
    const resultEndpoint = await tagChain.call({ query: query, tagsString: tagsString });

    const pathTemplate = `I have been tasked with categorizing a user's request about the Optimizely Content Marketing Platform API into the correct API Endpoint. Using the paths documentation, please return an array of all of the "$ref" values corresponding to the paths containing the correct API Endpoint. The request, the correct API Endpoint, and the path documentation are below:
    
    Request: {request}

    Correct API Endpoint: {result}

    Paths documentation: {pathString}

    Here is an example: ['paths/example_path.yaml', 'paths/example_path2.yaml', ...]
    
    This is the end of the prompt.`;

    const pathPrompt = new PromptTemplate({ template: pathTemplate, inputVariables: ["request", "result", "pathString"] });
    const pathChain = new LLMChain({ llm: model, prompt: pathPrompt });

    const resultPath = await pathChain.call({ request: query, result: resultEndpoint.text.trim(), pathString: pathString });

    console.log(resultPath.text.trim())

    const expandedDoc = getDocumentationString(JSON.parse(resultPath.text.trim().replace(/'/g, "\"")), documentation);

    console.log(expandedDoc)

    const finalTemplate = `Below is a user request regarding the Optimizely Content Marketing Platform API. The relevant documentation is included below as well. Please provide an answer to the user given the documentation:
    
    Request: {request}
    
    Documentation: {documentation}

    This is the end of the prompt.`;

    const finalPrompt = new PromptTemplate({ template: finalTemplate, inputVariables: ["request", "documentation"] });
    const finalChain = new LLMChain({ llm: model, prompt: finalPrompt });

    //const finalPath = await pathChain.call({ request: query, documentation: expandedDoc });

    const assessment = expandedDoc;
    //console.log(assessment);
    res.send({ assessment: assessment });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error fetching GPT-3.5 API');
  }

  */
});

  app.get("/get-database-tables", (req, res) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
      if (err) {
        res.status(500).send("Error fetching database tables");
        return;
      }
      res.send({ tables: rows });
    });
  });

  app.get("/get-table-data/:tableName", async (req, res) => {
    const tableName = req.params.tableName;
    try {
      const tableData = await getTableData(tableName);
      res.json(tableData);
    } catch (error) {
      console.error(`Error fetching data for table ${tableName}:`, error);
      res.status(500).json({ error: "An error occurred while fetching table data." });
    }
  });
  
  
  app.listen(PORT, () => {
    console.log(`Proxy server listening on port ${PORT}`);
  });
