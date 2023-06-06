import React, { useContext, useEffect, useRef } from "react";
import UserContext from '../User/UserContext';

const Messages = ({ messages, fetchingResponse }) => {

  const { user, loading } = useContext(UserContext);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="messages-container flex-grow">
      <div className="group w-full text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 dark:bg-[#444654] bg-orange-200">
        <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
        <div class="w-[60px] flex flex-col relative items-end">
                <div class="relative h-[60px] w-[60px] p-1 rounded-sm text-white flex items-center justify-center">
                <div className="relative h-[60px] w-[60px] p-1 rounded-sm text-white flex items-center justify-center">
                  <img src="/ResumeBot.png" alt="Logo"/>
                </div>
                </div>
              </div>
          
              <p className="flex items-center justify-center">{`Hi ${user.first_name}! I am your personal career assistant. Ask me how to improve your resume or prepare for your next interview!`}</p>

        </div>
      </div>
      {messages &&
        messages.map((message, index) => (
          <div
            key={index}
            className={`group w-full whitespace-pre-wrap text-gray-800 dark:text-gray-100 border-b border-black/10 dark:border-gray-900/50 dark:bg-[#444654] ${
              message.type === 'user' ? 'bg-blue-100' : 'bg-orange-200'
            }`}
          >
            <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0 m-auto">
            {message.type === 'bot' ? (
              <div class="w-[60px] flex flex-col relative items-end">
                <div class="relative h-[60px] w-[60px] p-1 rounded-sm text-white flex items-center justify-center">
                  <div className="relative h-[60px] w-[60px] p-1 rounded-sm text-white flex items-center justify-center">
                    <img src="/ResumeBot.png" alt="Logo"/>
                  </div>
                </div>
            </div>
            ) : (
              <div class="w-[60px] flex flex-col relative items-center rounded-full">
                <div class="relative h-[44px] w-[44px] p-1 rounded-full text-black flex items-center font-bold text-2xl justify-center">
                  {user.first_name.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
                      <p className="flex items-center justify-center">{message.message}</p>
            </div>
          </div>
        ))}
      {fetchingResponse && (
        <div className="loader-container">
        <div className="bg-white p-8">
          <div className="flex justify-center items-center h-full">
            <div class="w-12 h-12 mt-4 rounded-full animate-spin border-y-2 border-solid border-gray-900 border-t-transparent"></div>
          </div>
        </div>
      </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default Messages;
