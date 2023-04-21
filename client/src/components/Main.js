import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation, Link, Navigate } from 'react-router-dom';
import UserContext from './UserContext';
import BottomInput from './BottomInput';
import DataSources from './DataSources';
import TableView from './TableView';
import Chat from './Chat';
import NavBar from './NavBar';
import Register from './Register';
import Login from './Login';
import TopBar from './TopBar';
import axios from "axios";

function Main () {
  const location = useLocation();
  const { user, loading } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [resume, setResume] = useState({});
  const [linkedIn, setLinkedIn] = useState({});
  const [chainId, setChainId] = useState(null);
  const [fetchingResponse, setFetchingResponse] = useState(false);

  const clearState = () => {
    setMessages([]);
    setResume({});
    setLinkedIn({});
    setChainId(null);
    setFetchingResponse(false);
  };
  
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
      id: user.id,
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

      setFetchingResponse(true);
  
      const response = await axios.post(proxyEndpoint, data);
      const result = response.data.answer;
      setChainId(response.data.chainId);
      console.log(response.data);
      console.log(fetchingResponse);
  
      // Add response to messages state
      setMessages((prevMessages) => [
        ...prevMessages,
        { type: "response", content: result },
      ]);
      setFetchingResponse(false);
  
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

  if (loading) {
    return null; // or render a loading indicator
  }

  if (!user && location.pathname !== '/login' && location.pathname !== '/register') {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <div className="overflow w-full h-full relative flex">
      {user && <NavBar onLogout={clearState} />}
        <div class="flex-1 flex-col">
          <TopBar path={location.pathname}/>

            <Routes>
              <Route path="/" element={<BottomInput onSubmit={handleFormSubmit} />} />
              <Route path="/chat" element={<Chat messages={messages} onSubmit={handleFormSubmit} fetchingResponse={fetchingResponse} />} />
              <Route path="/datasources" element={<DataSources />} />
              <Route path="/datasources/:tableName" element={<TableView />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
            </Routes>
        </div>
      </div>
    </>
  );
};

export default Main;
