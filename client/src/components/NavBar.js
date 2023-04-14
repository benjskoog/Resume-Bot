import React from 'react';
import Messages from './Messages';
import TopBar from './TopBar';
import { BrowserRouter as Router, Route, Routes, useLocation, Link } from 'react-router-dom';

const NavBar = () => {
  return (
    <div className="dark bg-gray-900 md:flex md:flex-col w-nav">
    <div className="flex h-full min-h-0 flex-col">
      <div className="scrollbar-trigger flex h-full w-full flex-1 items-start border-white/20">
        <nav className="flex h-full flex-1 flex-col p-2">
        <Link
            to="/chat"
            className="flex py-3 px-3 items-center gap-3 rounded-lg hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm mb-2 flex-shrink-0 border border-white"
          >
            Chat
          </Link>
          <Link
            to="/datasources"
            className="flex py-3 px-3 items-center gap-3 rounded-lg hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm mb-2 flex-shrink-0 border border-white"
          >
            ATS Optimizer
          </Link>
          <Link
            to="/datasources"
            className="flex py-3 px-3 items-center gap-3 rounded-lg hover:bg-gray-500/10 transition-colors duration-200 text-white cursor-pointer text-sm mb-2 flex-shrink-0 border border-white"
          >
            Data Sources
          </Link>
        </nav>
      </div>
    </div>
  </div>
  );
};

export default NavBar;