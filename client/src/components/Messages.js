import React from 'react';

const Messages = ({ messages, fetchingResponse }) => {
  return (
    <div className="messages-container flex-grow">
      <div className="group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 dark:bg-[#444654] bg-gray-100">
        <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
          <div className="relative flex w-full flex-col gap-1 md:gap-3">
            <div className="flex flex-grow flex-col gap-3">
              <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap">
                <div className="markdown prose w-full break-words dark:prose-invert light">
                  <p>Ask me questions about my career.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {messages &&
        messages.map((message, index) => (
          <div
            key={index}
            className={`group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 dark:bg-[#444654] ${
              message.type === 'user' ? 'bg-blue-100' : 'bg-gray-100'
            }`}
          >
            <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
              <div className="relative flex w-full flex-col gap-1 md:gap-3">
                <div className="flex flex-grow flex-col gap-3">
                  <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap">
                    <div className="markdown prose w-full break-words dark:prose-invert light">
                      <p>{message.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      {fetchingResponse && (
        <div className="loader-container">
        <div className="bg-white p-8">
          <div className="flex justify-center items-center h-full">
            <img
              className="h-8 w-8"
              src="https://icons8.com/preloaders/preloaders/1488/Iphone-spinner-2.gif"
              alt=""
            ></img>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Messages;
