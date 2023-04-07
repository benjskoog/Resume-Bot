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
import {
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  ChatPromptTemplate,
  PromptTemplate
} from "langchain/prompts";
import { LLMChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import { initializeAgentExecutor } from 'langchain/agents';
import { Document } from "langchain/document";
import { resourceLimits } from "worker_threads";
import { HNSWLib } from "langchain/vectorstores";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { TextLoader } from "langchain/document_loaders";
import mammoth from "mammoth";
import fileUpload from "express-fileupload";

dotenv.config();
const md = markdownIt();

const app = express();
const PORT = 3001;

app.use(bodyParser.json({ limit: "10mb" })); // You can set the limit to any appropriate size.
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.use(fileUpload());

app.use(cors());

app.use(express.json());

const chains = new Map();


app.post("/upload-resume", async (req, res) => {

  async function saveResumeToDatabase(resumeText) {
    // Check if there's any row in the resume table
    db.get("SELECT COUNT(*) as count FROM resume", (err, row) => {
      if (err) {
        console.error("Error checking resume table count:", err);
        return;
      }
  
      // If no rows, insert a new one
      if (row.count === 0) {
        db.run("INSERT INTO resume (content) VALUES (?)", [resumeText], (err) => {
          if (err) {
            console.error("Error inserting resume to database:", err);
          }
        });
      } else {
        // If there's a row, update it
        db.run("UPDATE resume SET content = ?", [resumeText], (err) => {
          if (err) {
            console.error("Error updating resume in database:", err);
          }
        });
      }
    });
  }
  

  try {
    const buffer = req.files.file.data;
    const { value: plainText } = await mammoth.extractRawText({ buffer: buffer });
    await saveResumeToDatabase(plainText);
    res.send({ success: true, message: "Resume uploaded and parsed successfully." });
  } catch (error) {
    console.error("Error uploading and parsing resume:", error);
    res.status(500).send({ success: false, message: "Error uploading and parsing resume." });
  }
});


app.get("/get-linkedIn", async (req, res) => {  
});

app.get("/fetch-experience-data", async (req, res) => {
  try {
    const data = await getTableData("resume");
    res.send({ resume: data });
  } catch (error) {
    console.error("Error fetching resume data:", error);
    res.status(500).send({ success: false, message: "Error fetching resume data." });
  }
});


app.post("/gpt-api-call", async (req, res) => {
  const formValues = req.body;
  const query = formValues.query;
  const resume = formValues.resume;

  console.log(req.body.chain)
  
  const chat = new ChatOpenAI({ modelName: 'gpt-3.5-turbo', openAIApiKey: process.env.OPENAI_API_KEY, temperature: 0 });

  const resumePrompt = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate(
      `You are an assistant that helps employers answer questions about a job applicant based on their resume. Please provide answers to their questions and include examples from the resume if applicable.

      Job applicant resume:
      {resume}`
    ),
    HumanMessagePromptTemplate.fromTemplate("{query}"),
  ]);
  
  const chainId = req.body.chainId ? req.body.chainId : new Date().getTime(); // Generate a unique identifier based on the current timestamp
  const chain = chainId ? chains.get(chainId) : new LLMChain({
    prompt: resumePrompt,
    llm: chat,
  });

  chains.set(chainId, chain);

  console.log(chain);

  try {
    const resultEndpoint = await chain.call({
      resume: resume,
      query: query
    });

    const answer = resultEndpoint.text;

    //console.log(assessment);
    res.send({ answer: answer, chainId: chainId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching GPT-3.5 API');
  }


  /*

  const model = new OpenAI({ modelName: 'gpt-3.5-turbo', openAIApiKey: process.env.OPENAI_API_KEY, temperature: 0.0 });

  const template = `An employer is asking a question about this job seeker's resume, which is provided below. Please provide an answer and include examples from the resume if possible.

  Employer question: {query}

  Job seeker resume:
  {resume}

  This is the end of the prompt.`;

  const prompt = new PromptTemplate({ template: template, inputVariables: ["query", "resume"] });
  console.log(prompt)
  const tagChain = new LLMChain({ llm: model, prompt: prompt });
  
  try {
    const resultEndpoint = await tagChain.call({ query: query, resume: resume});

    const answer = resultEndpoint.text;

    //console.log(assessment);
    res.send({ answer: answer });
  } catch (error) {
    console.error(error);
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
