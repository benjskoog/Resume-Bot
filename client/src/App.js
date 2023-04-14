import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import logo from "./logo.svg";
import "./App.css";
import Main from './components/Main';
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
    console.log(data)

    try {
      // Add user message to messages state
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "user", content: formValues.query },
      ]);
  
      const response = await axios.post(proxyEndpoint, data);
      const result = response.data.answer;
      setChainId(response.data.chainId);
      console.log(response.data);
  
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
      setResume(files.resume[0]);
    }
    fetchData();
  }, []);

  return (
    <Router>
      <Main onSubmit={handleFormSubmit} messages={messages} />
    </Router>
  );
}

export default App;