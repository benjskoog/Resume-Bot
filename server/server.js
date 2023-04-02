require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const yaml = require("js-yaml");
const bodyParser = require("body-parser");
const { db, getTableData } = require("./db");

const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

const openai = new OpenAIApi(configuration);

const app = express();
const PORT = 3001;

app.use(bodyParser.json({ limit: "10mb" })); // You can set the limit to any appropriate size.
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.use(cors());

app.use(express.json());

app.get("/fetch-yaml-urls", async (req, res) => {
    try {
      const pageUrl = "https://developers.welcomesoftware.com/openapi.html?hash=5b202b8";
  
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
  
      const yamlUrls = [];
  
      page.on("request", (request) => {
        if (request.url().includes(".yaml")) {
          yamlUrls.push(request.url());
        }
      });
  
      await page.goto(pageUrl, { waitUntil: "networkidle0" });
      await browser.close();
  
      res.send(yamlUrls);
      console.log(yamlUrls)
    } catch (error) {
      console.error("Error fetching YAML file URLs:", error);
      res.status(500).send("Error fetching YAML file URLs");
    }
  });

  app.post("/download-yaml-files", async (req, res) => {
    const yamlUrls = req.body.yamlUrls;
    const yamlFiles = {};
  
    const downloadFile = async (url) => {
      try {
        const response = await axios.get(url);
        const content = response.data;
        return content;
      } catch (error) {
        console.error(`Error fetching YAML file at ${url}:`, error);
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
  
    const saveYamlFileToDatabase = (url, content) => {
      db.run("INSERT OR REPLACE INTO yaml_files (url, content) VALUES (?, ?)", [url, content], (err) => {
        if (err) {
          console.error("Error saving YAML file to database:", err);
        }
      });
    };
  
    const processUrl = async (url) => {
      let content = await getYamlFileFromDatabase(url);
  
      if (!content) {
        content = await downloadFile(url);
        saveYamlFileToDatabase(url, content);
      }
  
      const fileName = url.split("/").pop();
      const jsonContent = yaml.load(content); // Convert YAML content to JSON
      yamlFiles[fileName] = jsonContent;
    };
  
    const promises = yamlUrls.map(processUrl);
    await Promise.all(promises);
  
    res.send(yamlFiles);
  });

  app.post("/gpt-api-call", async (req, res) => {
    const formValues = req.body;
    const openApiBase = JSON.stringify(formValues.yamlFiles['openapi.yaml?hash=5b202b8'].paths);
    const prompt = `The following is a request by a user regarding the API documentation of the Optimizely Content Marketing Platform:

    ${formValues.query}

    From the categories below, please choose the category that is most appropriate for this request. Choose only one category.
    
    Authentication and Authorization: Questions related to API keys, access control, and user permissions.

    Endpoint Usage: Questions about how to use specific endpoints, including required parameters, HTTP methods, and response structures.

    Data Models: Questions related to the data structures and objects used within the API, such as assets, tasks, campaigns, and users.

    Error Handling: Questions about how to handle errors, interpret error codes, and troubleshoot issues with API calls.

    Rate Limits and Performance: Questions about the API's rate limits, best practices for optimizing performance, and handling large volumes of requests.

    Backward Compatibility: Questions about the compatibility of the API with previous versions and how to handle potential changes in the API.

    API Integration: Questions about integrating the Welcome API with other services or platforms, such as work management systems or document approval systems.

    API Status and Updates: Questions about the stability of the API, experimental features, and any upcoming changes or improvements.

    Recommendations and Best Practices: Questions about recommended ways to interact with the API, such as building URLs, handling pagination, and following conventions.

    SDKs and Libraries: Questions about any available SDKs, client libraries, or helper tools that simplify interaction with the API.
    
    <:endoftext:>`;
    console.log(prompt);
  
    try {
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{role: "user", content: prompt}],
      });
  
      const result = completion.data.choices[0].message.content.trim();
      console.log(result)
      res.send({ assessment: result });
    } catch (error) {
      if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
      } else {
        console.log(error.message);
      }
      res.status(500).send("Error fetching GPT-3.5 API");
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