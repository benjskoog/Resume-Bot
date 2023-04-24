import React, { useState, useEffect, useContext, useRef } from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import { UserProvider } from './components/UserContext';

import logo from "./logo.svg";
import "./App.css";
import Main from './components/Main';
import Chat from './components/Chat';
import axios from "axios";

function App() {
  const mainRef = useRef();
  const chatRef = useRef();

  const resetStates = () => {
    mainRef.current.clearMainState();
  };

  return (
    <UserProvider resetStates={resetStates}>
      <Router>
        <Main ref={mainRef} />
      </Router>
    </UserProvider>
  );
}

export default App;
