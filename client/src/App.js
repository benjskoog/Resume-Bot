import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import logo from "./logo.svg";
import "./App.css";
import ResumeBot from "./components/IntegrationForm";
import DataSources from "./components/DataSources";
import TableView from "./components/TableView";
import axios from "axios";

function App() {

  const [messages, setMessages] = useState([]);
  const [resume, setResume] = useState({});
  const [linkedIn, setLinkedIn] = useState({});
  const [chainId, setChainId] = useState(null);

  async function fetchExperienceData() {
    try {
      const proxyUrl = "http://localhost:3001/fetch-experience-data";
      const response = await axios.get(proxyUrl);
      const experienceData = response.data;
      return experienceData;
    } catch (error) {
      console.error("Error fetching and downloading data:", error);
      return {};
    }
  }

  const handleFormSubmit = async (formValues, clearForm) => {
    const proxyEndpoint = "http://localhost:3001/gpt-api-call";
    const data = {
      resume: resume,
      linkedIn: linkedIn,
      query: formValues.query,
      chainId: chainId
    };

    try {
      // Add user message to messages state
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "user", content: formValues.query },
      ]);
  
      const response = await axios.post(proxyEndpoint, data);
      const result = response.data.answer;
      setChain(response.data.chain);
      console.log(response.data.chain);
  
      // Add response to messages state
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "response", content: result },
      ]);
  
      console.log("Resume question answer:", result);
    } catch (error) {
      // ...
    }
  };

  useEffect(() => {
    async function fetchData() {
      const files = await fetchExperienceData();
      console.log(files);
      setResume(files.resume[0].content);
    }
    fetchData();
  }, []);

  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<ResumeBot onSubmit={handleFormSubmit} />} />
          <Route path="/datasources" element={<DataSources />} />
          <Route path="/datasources/:tableName" element={<TableView />} />
        </Routes>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 bg-gray-50 dark:bg-[#444654] ${
              message.type === "user" ? "bg-green-100" : "bg-blue-100"
            }`}
          >
            <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
              <div className="relative flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
                <div className="flex flex-grow flex-col gap-3">
                  <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap">
                    <div className="markdown prose w-full break-words dark:prose-invert light">
                      <p>{message.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Router>
  );
}

export default App;