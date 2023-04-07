import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import logo from "./logo.svg";
import "./App.css";
import APIIntegrationForm from "./components/IntegrationForm";
import DataSources from "./components/DataSources";
import TableView from "./components/TableView";
import axios from "axios";

function App() {
  const [yamlFiles, setYamlFiles] = useState({});
  const [webhookFiles, setWebhookFiles] = useState([]);
  const [yamlCleaned, setYamlCleaned] = useState({});
  const [assessment, setAssessment] = useState(null);

  async function fetchAndDownloadYamlFiles() {
    try {
      const proxyUrl = "http://localhost:3001/fetch-and-download-yaml-files";
      const response = await axios.get(proxyUrl);
      const yamlFiles = response.data;
      return yamlFiles;
    } catch (error) {
      console.error("Error fetching and downloading YAML files:", error);
      return {};
    }
  }

  const handleFormSubmit = async (formValues, clearForm) => {
    const proxyEndpoint = "http://localhost:3001/gpt-api-call";
    const data = {
      yamlFiles: yamlFiles,
      yamlCleaned: yamlCleaned,
      webhookFiles: webhookFiles,
      query: formValues.query,
    };

    try {
      const response = await axios.post(proxyEndpoint, data);
      const result = response.data.assessment;
      console.log("Integration feasibility assessment:", result);
      setAssessment(result);
      console.log(JSON.parse(result))
    } catch (error) {
      console.error("Error fetching GPT-3.5 API:", error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const files = await fetchAndDownloadYamlFiles();
      console.log(files);
      setYamlFiles(files.yamlFiles);
      setWebhookFiles(files.webhookFiles);
      setYamlCleaned(files.yamlCleaned); 
    }
    fetchData();
  }, []);

  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<APIIntegrationForm onSubmit={handleFormSubmit} />} />
          <Route path="/datasources" element={<DataSources />} />
          <Route path="/datasources/:tableName" element={<TableView />} />
        </Routes>
        {assessment && (
          <div className="group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 bg-gray-50 dark:bg-[#444654]">
            <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
              <div className="relative flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
                <div className="flex flex-grow flex-col gap-3">
                  <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap">
                    <div className="markdown prose w-full break-words dark:prose-invert light">
                      <p>{assessment}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;