import React, { useState } from "react";
import { Link } from "react-router-dom";

const ResumeBot = ({ onSubmit }) => {
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
        <button className="btn relative btn-neutral border-0 md:border">
          View Data Sources
        </button>
      </Link>
      <div className="flex justify-center mt-12 mb-4">
        <form className="w-full max-w-4xl">
          <h1 className="text-2xl font-bold mb-4">Ben Skoog's Work Experience Bot</h1>
          <p className="text-lg mb-4">
            Ask me anything about Ben!
          </p>
          <form className="stretch mx-2 flex flex-row gap-3 last:mb-2 md:mx-4 md:last:mb-6 lg:mx-auto lg:max-w-2xl xl:max-w-3xl">
          <div class="relative flex h-full flex-1 md:flex-col">
          <div className="flex flex-col w-full py-2 flex-grow md:py-3 md:pl-4 relative border border-black/10 bg-white dark:border-gray-900/50 dark:text-white dark:bg-gray-700 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]">
            <textarea
              tabindex="0"
              className="m-0 w-full resize-none border-0 bg-transparent p-0 pr-7 focus:ring-0 focus-visible:ring-0 dark:bg-transparent pl-2 md:pl-0"
              type="search"
              placeholder="Ask a question..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              rows="1"
              style={{ maxHeight: "200px", height: "24px", overflowY: "hidden" }}
            />
            <button className="absolute p-1 rounded-md text-gray-500 bottom-1.5 md:bottom-2.5 hover:bg-gray-100 enabled:dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent right-1 md:right-2 disabled:opacity-40">
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
          </div>
          </form>
        </form>
      </div>
    </>
  );
};

export default ResumeBot;