import React, { useState } from "react";
import { Link } from "react-router-dom";

const APIIntegrationForm = ({ onSubmit }) => {
  const [query, setQuery] = useState("");

  const handleKeyDown = async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit({ query });
    }
  };

  return (
    <>
      <Link to="/datasources">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          View Data Sources
        </button>
      </Link>
      <div className="flex justify-center mt-12 mb-4">
        <form className="w-full max-w-4xl">
          <h1 className="text-2xl font-bold mb-4">Welcome to Optimizely CMP API Bot</h1>
          <p className="text-lg mb-4">
            Ask me anything about the Optimizely CMP API!
          </p>
          <div className="">
            <input
              className="
                w-full px-4 py-2 leading-tight text-gray-700 bg-white rounded-md shadow-md focus:outline-none 
                focus:border-blue-500 focus:shadow-outline
                border border-blue-400"
              type="search"
              placeholder='Ask a question...'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
        </form>
      </div>
      
    </>
  );
};

export default APIIntegrationForm;
