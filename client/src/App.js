import React, { useState, useEffect, useContext } from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
import { UserProvider } from './components/UserContext';

import logo from "./logo.svg";
import "./App.css";
import Main from './components/Main';
import axios from "axios";

function App() {


  return (
    <UserProvider>
      <Router>
        <Main/>
      </Router>
    </UserProvider>
  );
  
}

export default App;