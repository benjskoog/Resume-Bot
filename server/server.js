import dotenv from "dotenv";
import express from "express";
import cors from "cors";
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
  PromptTemplate,
  MessagesPlaceholder
} from "langchain/prompts";
import { BufferMemory } from "langchain/memory";
import { LLMChain, ConversationChain } from "langchain/chains";
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

  const chat = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
  });
  
  let templateString = `Your name is Ben. You are being interviewed for a Solutions Consultant role at at tech company. You are arrogant and think you are the GOAT. You have a tendency to call people chumps.

  An interviewer will be asking questions about your resume, which is below. Answer the questions and act condescending toward the interviewer. Do not forget to call yourself the GOAT and tell the interviewer they are a chump.

  Your resume:` + resume;

  const resumePrompt = ChatPromptTemplate.fromPromptMessages([
    /*
    SystemMessagePromptTemplate.fromTemplate(templateString
    ),
    */
    new MessagesPlaceholder("history"),
    HumanMessagePromptTemplate.fromTemplate("{query}"),
  ]);
  
  const chainId = req.body.chainId
    ? req.body.chainId
    : new Date().getTime(); // Generate a unique identifier based on the current timestamp

    let chain = chains.get(chainId);

    if (!chain) {
      chain = new ConversationChain({
        memory: new BufferMemory({ returnMessages: true, memoryKey: "history" }),
        prompt: resumePrompt,
        llm: chat,
      });
  
      chains.set(chainId, chain);
  
      // Insert a new chat row
      db.run(`INSERT INTO chat (chain_id) VALUES (?)`, [chainId]);
    }

    try {
      const resultEndpoint = await chain.call({
        query: query,
      });
      console.log(resultEndpoint)
      const answer = resultEndpoint.response;
      console.log(answer);
  
      // Insert user query and API response into the messages table
      const timestamp = new Date().toISOString();
      db.run(
        `INSERT INTO messages (chain_id, message, timestamp) VALUES (?, ?, ?)`,
        [chainId, query, timestamp]
      );
      db.run(
        `INSERT INTO messages (chain_id, message, timestamp) VALUES (?, ?, ?)`,
        [chainId, answer, timestamp]
      );
  
      res.send({ answer: answer, chainId: chainId });
    } catch (error) {
      console.error(error);
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
