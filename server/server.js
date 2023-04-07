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
import docxPkg from "docx";


const { Document: DocxDocument, Packer } = docxPkg;


dotenv.config();
const md = markdownIt();

const app = express();
const PORT = 3001;

app.use(bodyParser.json({ limit: "10mb" })); // You can set the limit to any appropriate size.
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.use(cors());

app.use(express.json());

app.get("/upload-resume", async (req, res) => {  
});

app.get("/get-linkedIn", async (req, res) => {  
});

app.get("/fetch-experience-data", async (req, res) => {  
});

app.post("/gpt-api-call", async (req, res) => {
  const formValues = req.body;
  const query = formValues.query;

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
