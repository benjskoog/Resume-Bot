import React, { useState, useEffect, useContext, useImperativeHandle, useRef } from "react";
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

const Main = React.forwardRef((props, ref) => {
  const location = useLocation();
  const { user, loading } = useContext(UserContext);
  const [resume, setResume] = useState({});
  const [linkedIn, setLinkedIn] = useState({});
  const chatRef = useRef();

  const clearMainState = () => {
    setResume({});
    setLinkedIn({});
    chatRef.current.clearChatState();
  };

  useImperativeHandle(ref, () => ({
    clearMainState,
  }));
  
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
      {user && <NavBar onNewChatClick={() => chatRef.current && chatRef.current.clearChatState()} />}
        <div class="flex-1 flex-col">
          <TopBar path={location.pathname}/>

            <Routes>
              <Route path="/" element={<BottomInput />} />
              <Route path="/chat" element={<Chat ref={chatRef} />} />
              <Route path="/chat/:chatId" element={<Chat ref={chatRef} />} />
              <Route path="/datasources" element={<DataSources />} />
              <Route path="/datasources/:tableName" element={<TableView />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
            </Routes>
        </div>
      </div>
    </>
  );
});

export default Main;
