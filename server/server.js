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
    let yamlFilesArray = [];
    let webhookFiles = [];
    let yamlCleaned = {};

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

    const getCleanYamlFromDatabase = (filename) => {
      return new Promise((resolve, reject) => {
        db.get("SELECT content FROM clean_API WHERE filename=?", [filename], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.content : null);
          }
        });
      });
    };

    const getWebhookFileFromDatabase = () => {
      return new Promise((resolve, reject) => {
        db.all("SELECT id, header, section, content FROM webhook_md", (err, rows) => {
          if (err) {
            reject(err);
          } else {
            // Transform the rows into a key-value object
            rows.forEach((row) => {
              webhookFiles.push({
                id: row.id,
                header: row.header,
                section: row.section,
                content: row.content
              });
            });
            resolve(webhookFiles);
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

    let autoIncrementId = 1;

    const saveWebhookToDatabase = (section, content) => {
      const $ = cheerio.load(content);
      const h2Headers = $('h2');
    
      if (h2Headers.length > 0) {
        h2Headers.each((index, h2) => {
          const header = $(h2).text().trim();
          const headerContent = $(h2).nextUntil('h2').toArray().map((element) => $.html(element)).join('');
    
          db.run(
            `INSERT OR REPLACE INTO webhook_md (id, section, header, content) VALUES (?, ?, ?, ?)`,
            [autoIncrementId, section, header, headerContent],
            (err) => {
              if (err) {
                console.error("Error saving Webhook Markdown to database:", err);
              }
            }
          );
          webhookFiles.push({
            id: autoIncrementId,
            header: header,
            section: section,
            content: headerContent
          });
          autoIncrementId++;
        });
      } else {
        db.run(
          `INSERT OR REPLACE INTO webhook_md (id, section, content) VALUES (?, ?, ?)`,
          [autoIncrementId, section, content],
          (err) => {
            if (err) {
              console.error("Error saving Webhook Markdown to database:", err);
            }
          }
        );
        webhookFiles.push({
          id: autoIncrementId,
          header: "",
          section: section,
          content: content
        });
        autoIncrementId++;
      }
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
      yamlFiles[fileName]['url'] = url;

      yamlFilesArray.push({
        url: url,
        fileName: fileName,
        content: jsonContent
      });
    };


    const processWebhookUrl = async (url) => {
      let content = await getWebhookFileFromDatabase();
    
      if (Object.keys(content).length === 0) {
        content = await downloadFile(url);
        console.log(content)
    
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
      } else {
        // If webhook content is found in the database, load it into webhookFiles
        webhookFiles = content;
      }
    };

    async function processCleanYamlData() {
      let content = await getCleanYamlFromDatabase('openapi.yaml?hash=5b202b8');
      if (Object.keys(content).length === 0) {
        const deref = getDocumentationObject(['https://developers.welcomesoftware.com/openapi/openapi.yaml?hash=5b202b8'], yamlFiles);
        content = deref;

        db.run("INSERT OR REPLACE INTO clean_API (filename, content) VALUES (?, ?)", ['openapi.yaml?hash=5b202b8', JSON.stringify(deref)], (err) => {
          if (err) {
            console.error("Error saving YAML file to database:", err);
          }
        });
      }

      yamlCleaned = JSON.parse(content);

    }
    
    await processWebhookUrl('https://developers.welcomesoftware.com/webhooks.md')
    const promises = yamlUrls.map(processYamlUrl);
    await Promise.all(promises);
    await processCleanYamlData();

    res.send({ yamlFiles, yamlFilesArray, yamlCleaned, webhookFiles });

  } catch (error) {
    console.error("Error fetching and downloading YAML files:", error);
    res.status(500).send("Error fetching and downloading YAML files");
  }
});

const getDocumentationObject = (refs, documentation) => {
  if (!refs || !documentation) {
    return {};
  }

  let documentationObject = {};

  refs.forEach((ref) => {
    const encodedRef = ref.replace(/[\{\}]/g, match => match === '{' ? '%7B' : '%7D');
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
          const encodedRef2 = ref.replace(/[\{\}]/g, match => match === '{' ? '%7B' : '%7D');
          const strippedRef2 = encodedRef2.split('/').pop();
          const exceptions = ['ContentFieldValueExpandedModel.yaml', 'ContentDetailsModel.yaml', 'LocalizedFieldValues.yaml', 'template.json', 'workRequestRequestPayload.json', 'workRequestFormFieldResponse.json']
          if (!exceptions.includes(strippedRef2)) {
            const refContent = getDocumentationObject([ref], documentation);
  
            // Replace the $ref key with the strippedRef value
            // and the $ref value with the contents of the $ref YAML file
            delete obj[key];
            obj[strippedRef2] = refContent;
          }
        }
      }
    };

    recursiveExpand(yamlFile);
    documentationObject = { ...documentationObject, ...yamlFile };
  });

  return documentationObject;
};

app.post("/gpt-api-call", async (req, res) => {
  const formValues = req.body;
  const query = formValues.query;
  const documentation = formValues.yamlFiles;
  const yamlCleaned = formValues.yamlCleaned;
  const docsWebhook = formValues.webhookFiles;

  const directoryApiDocs = path.join(process.cwd(), 'embeddingsAPI');
  const directoryWebHookDocs = path.join(process.cwd(), 'embeddingsWebhook');

  const saveDocumentationEmbeddings = async (documentation, directory) => {
    // Define the vector store file path
    const vectorStoreFilePath = path.join(directory, "hnswlib.index");
  
    // Check if the file already exists in the directory
    if (!fs.existsSync(vectorStoreFilePath)) {

      const docString = JSON.stringify(documentation).trim()
      console.log(docString);

      const yamlFileEntries = Object.entries(documentation).map(([fileName, yamlData]) => {
        const content = JSON.stringify(yamlData).trim();
        const url = yamlData.url;
      
        return { url, content };
      });

      console.log(yamlFileEntries)
      
  
      // Create a vector store from the documentation text
      const vectorStore = await HNSWLib.fromTexts(
        yamlFileEntries.map((entry) => entry.content),
        yamlFileEntries.map((entry) => ({ url: entry.url })),
        new OpenAIEmbeddings()
      );
  
      // Save the vector store to the specified directory
      await vectorStore.save(directory);
    }
  };
  
  const saveWebhookEmbeddings = async (webhookFiles, directory) => {
    // Define the vector store file path
    const vectorStoreFilePath = path.join(directory, "hnswlib.index");

    // Check if the file already exists in the directory
    if (!fs.existsSync(vectorStoreFilePath)) {
      const webhookEntries = webhookFiles.map((webhook) => {
        return {
          id: webhook.id,
          header: webhook.header,
          section: webhook.section,
          content: webhook.content.trim(),
        };
      });

      // Create a vector store from the webhook text
      const vectorStore = await HNSWLib.fromTexts(
        webhookEntries.map((entry) => entry.content),
        webhookEntries.map((entry) => ({
          id: entry.id,
          header: entry.header,
          section: entry.section,
        })),
        new OpenAIEmbeddings()
      );

      // Save the vector store to the specified directory
      await vectorStore.save(directory);
    }
  };

  await saveDocumentationEmbeddings(documentation, directoryApiDocs);
  await saveWebhookEmbeddings(docsWebhook, directoryWebHookDocs);

  // Load the vector store from the same directory
  const loadedVectorStore = await HNSWLib.load(
    directoryApiDocs,
    new OpenAIEmbeddings()
  );

  // Load the webhook vector store from the same directory
  const loadedWebhookVectorStore = await HNSWLib.load(
    directoryWebHookDocs,
    new OpenAIEmbeddings()
  );

  // vectorStore and loadedVectorStore are identical
  const result = await loadedVectorStore.similaritySearch(query, 2);
  const webhookResult = await loadedWebhookVectorStore.similaritySearch(query, 1);

  //console.log(result);
  //console.log(webhookResult);
  //res.send({ assessment: JSON.stringify(webhookResult) })

  const formatApiDocsResults = (results) => {
    let newObj = {};
    results
      .map((result) => {
        const { url } = result.metadata;
        const file = url.split('/').pop();
        newObj[file] = getDocumentationObject([url], documentation);
      })
    
      return newObj;
  };

  const formatWebhookDocsResults = (results) => {
    return results
      .map((result) => {
        const { id, header, section } = result.metadata;
        return `ID: ${id}\nHeader: ${header}\nSection: ${section}\nContent: ${result.pageContent}\n`;
      })
      .join('\n');
  };

  const apiDocsFormatted = formatApiDocsResults(result);
  const webhookDocsFormatted = formatWebhookDocsResults(webhookResult);

  console.log(apiDocsFormatted);
  console.log(query)

  /*

  const toolkit = new JsonToolkit(new JsonSpec(yamlCleaned));
  const model = new OpenAI({ modelName: 'gpt-3.5-turbo', openAIApiKey: process.env.OPENAI_API_KEY, temperature: 0.0 });
  const executor = createJsonAgent(model, toolkit);

  let input = `Below is a user's request about the Optimizely Content Marketing API. Please answer the request and include a code example if applicable.
  
  Request: ${query}

  This is the end of the prompt`;

  try {

    const resultAgent = await executor.call({ input, maxIterations: 5 });

    console.log(`Got output ${resultAgent.output}`);

    console.log(
      `Got intermediate steps ${JSON.stringify(
        resultAgent.intermediateSteps,
        null,
        2
      )}`
    );

    res.send({ assessment: resultAgent.output });

  } catch (error) {
    res.send({ assessment: error });
    console.log(error)
  }

  */
  
  const model = new OpenAI({ modelName: 'gpt-3.5-turbo', openAIApiKey: process.env.OPENAI_API_KEY, temperature: 0.0 });

  const template = `A user is asking a question about the Optimizely Content Marketing Platform API and Webhook documentation. Please provide an answer and include a code example if applicable.

  User's question: {query}

  Relevant API Documentation:
  {apiDocsFormatted}

  Relevant Webhook Documentation:
  {webhookDocsFormatted}

  This is the end of the prompt.`;

  const prompt = new PromptTemplate({ template: template, inputVariables: ["query", "apiDocsFormatted", "webhookDocsFormatted"] });
  console.log(prompt)
  const tagChain = new LLMChain({ llm: model, prompt: prompt });
  
  try {
    const resultEndpoint = await tagChain.call({ query: query, apiDocsFormatted: apiDocsFormatted, webhookDocsFormatted: webhookDocsFormatted });

    const assessment = resultEndpoint.text;

    //console.log(assessment);
    res.send({ assessment: assessment });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Error fetching GPT-3.5 API');
  }
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
