import React from 'react';

const Messages = ({ messages }) => {
  return (
    <div className="messages-container flex-grow">
        <div className="group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 dark:bg-[#444654] bg-gray-50">
            <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
              <div className="relative flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
                <div className="flex flex-grow flex-col gap-3">
                  <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap">
                    <div className="markdown prose w-full break-words dark:prose-invert light">
                      <p>Hi, my name is Beatrice. Nice to meet you. Please feel free to ask me questions about my work experience!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
              {messages && messages.map((message, index) => (
          <div
            key={index}
            className={`group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 dark:bg-[#444654] ${
              message.type === "user" ? "bg-blue-100" : "bg-gray-50"
            }`}
          >
            <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
              <div className="relative flex w-[calc(100%-50px)] flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
                <div className="flex flex-grow flex-col gap-3">
                  <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap">
                    <div className="markdown prose w-full break-words dark:prose-invert light">
                      <p>{message.content}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};

export default Messages;
