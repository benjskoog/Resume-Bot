import React, { useState } from "react";
import { Link } from "react-router-dom";

const TopBar = ({ text }) => {

  return (
          <div className="group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 dark:bg-[#444654] bg-gray-500">
            <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
              <div className="relative flex w-full flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
                <div className="flex flex-grow flex-col gap-3">
                  <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap">
                    <div className="markdown prose w-full break-words dark:prose-invert light text-center">
                      <h1>{text}</h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
    </div>
  );
};

export default TopBar;
