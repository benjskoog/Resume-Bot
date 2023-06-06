import React, { useState, useEffect, useContext, useImperativeHandle, useRef } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation, Link, Navigate } from 'react-router-dom';
import UserContext from './User/UserContext';
import BottomInput from './Chat/BottomInput';
import DataSources from './DataSources';
import InterviewQuestionsForm from './Interview/InterviewQuestionsForm';
import TableView from './TableView';
import Chat from './Chat/Chat';
import NavBar from './NavBar/NavBar';
import Register from './Login/Register';
import Login from './Login/Login';
import TopBar from './TopBar';
import UserSettings from './User/UserSettings';
import ForgotPassword from './Login/ForgotPassword';
import ResetPassword from "./Login/ResetPassword";
import SavedJobs from "./Jobs/SavedJobs";
import axios from "axios";
import NewJobForm from "./Jobs/NewJobForm";
import ResumeOptimizer from "./ResumeOptimizer/ResumeOptimizer";
import Jobs from "./Jobs/Jobs";

const Main = React.forwardRef((props, ref) => {
  const location = useLocation();
  const { user, loading } = useContext(UserContext);
  const [resume, setResume] = useState({});
  const [linkedIn, setLinkedIn] = useState({});
  const chatRef = useRef();

  const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";

  const clearMainState = () => {
    setResume({});
    setLinkedIn({});
    chatRef.current && chatRef.current.clearChatState()
  };

  useImperativeHandle(ref, () => ({
    clearMainState,
  }));
  
  async function fetchExperienceData() {
    try {
      const proxyUrl = `${backendUrl}/fetch-experience-data`;
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

  if (!user && location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/forgot-password' && location.pathname !== '/reset-password') {
    return <Navigate to="/login" />;
  }

  return (
    <>
      <div className="overflow w-full h-full relative flex">
      {user && <NavBar selectedItem={location.pathname} onNewChatClick={() => chatRef.current && chatRef.current.clearChatState()} />}
        <div class="flex-1 flex-col">
          <TopBar path={location.pathname}/>

            <Routes>
              <Route path="/" element={<BottomInput />} />
              <Route path="/chat" element={<Chat ref={chatRef} />} />
              <Route path="/chat/:chatId" element={<Chat ref={chatRef} />} />
              <Route path="/datasources" element={<DataSources />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/saved-jobs" element={<SavedJobs />} />
              <Route path="/new-job-form" element={<NewJobForm />} />
              <Route path="/resume-optimizer" element={<ResumeOptimizer />} />
              <Route path="/interview-questions-form" element={<InterviewQuestionsForm />} />
              <Route path="/datasources/:tableName" element={<TableView />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/user-settings" element={<UserSettings />} />
            </Routes>
        </div>
      </div>
    </>
  );
});

export default Main;
