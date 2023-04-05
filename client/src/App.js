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
      query: formValues.query,
    };

    try {
      const response = await axios.post(proxyEndpoint, data);
      const result = response.data.assessment;
      console.log("Integration feasibility assessment:", result);
      setAssessment(result);
    } catch (error) {
      console.error("Error fetching GPT-3.5 API:", error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      const files = await fetchAndDownloadYamlFiles();
      console.log(files);
      setYamlFiles(files.yamlFiles);
    }
    fetchData();
  }, []);

  return (
    <Router>
      <div className="app">
        <h1>Optimizely CMP API Bot</h1>
        <Routes>
          <Route path="/" element={<APIIntegrationForm onSubmit={handleFormSubmit} />} />
          <Route path="/datasources" element={<DataSources />} />
          <Route path="/datasources/:tableName" element={<TableView />} />
        </Routes>
        {assessment && (
          <div className="assessment">
            <h2>Integration Feasibility Assessment:</h2>
            <p>{assessment}</p>
          </div>
        )}
      </div>
    </Router>
  );
}

export default App;
