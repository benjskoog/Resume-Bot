import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Link } from 'react-router-dom';
import BottomInput from './BottomInput';
import DataSources from './DataSources';
import TableView from './TableView';
import Chat from './Chat';
import NavBar from './NavBar';

function Main ({ onSubmit, messages }) {
  const location = useLocation();

  const shouldShowMessages = location.pathname !== '/datasources';

  return (
    <>
      <div className="overflow-hidden w-full h-full relative flex">
        <NavBar />
        <div class="overflow-y-auto flex h-full max-w-full flex-1 flex-col">
          <div className="flex flex-col min-h-screen">
            <Routes>
              <Route path="/" element={<BottomInput onSubmit={onSubmit} />} />
              <Route path="/chat" element={<Chat messages={messages} onSubmit={onSubmit} />} />
              <Route path="/datasources" element={<DataSources />} />
              <Route path="/datasources/:tableName" element={<TableView />} />
            </Routes>
          </div>
        </div>
      </div>
    </>
  );
};

export default Main;
