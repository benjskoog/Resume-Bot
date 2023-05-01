import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Link } from 'react-router-dom';
import axios from 'axios';

const ChatHistory = ({ userId, onSubmit, clearChatState }) => {
    const [chats, setChats] = useState([]);


    useEffect(() => {
        async function fetchData() {
          try {
            const response = await axios.get(`http://localhost:3001/get-table-data/chat`, {
              params: { user_id: userId },
            });
            setChats(response.data);
            console.log(response.data);
          } catch (error) {
            console.error(`Error fetching chat history:`, error);
          }
        }
    
        fetchData();
      }, [userId, onSubmit]);

  return (
    <div className="transform xl:translate-x-0 ease-in-out transition duration-500 flex justify-start items-start h-[calc(100vh-72px)] w-full sm:w-64 bg-gray-900 flex-col">
      <div className="flex flex-col justify-center items-center pl-5 pr-5 w-full pb-5">
      <ul>
      {chats.map((chat) => (
        <li key={chat.chat_id}>
                <Link to={`/chat/${chat.chat_id}`} className="w-64 h-15 mb-4 px-3 py-3 rounded-lg text-base text-gray-400 overflow-hidden hover:text-white focus:bg-gray-700 focus:text-white hover:bg-gray-700 flex jusitfy-start items-center" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 6H7C6.46957 6 5.96086 6.21071 5.58579 6.58579C5.21071 6.96086 5 7.46957 5 8V17C5 17.5304 5.21071 18.0391 5.58579 18.4142C5.96086 18.7893 6.46957 19 7 19H16C16.5304 19 17.0391 18.7893 17.4142 18.4142C17.7893 18.0391 18 17.5304 18 17V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M17 10C18.6569 10 20 8.65685 20 7C20 5.34314 18.6569 4 17 4C15.3431 4 14 5.34314 14 7C14 8.65685 15.3431 10 17 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <div className="pl-2 w-full max-w-[calc(100%-24px)] overflow-hidden whitespace-nowrap truncate">
                    {chat.chat_name}
                </div>
                </Link>
        </li>
            ))}
        </ul>
      </div>
      <Link to="/chat" onClick={() => clearChatState()}className="absolute bottom-1 w-64 h-15 mb-4 px-3 py-3 rounded-lg text-base overflow-hidden text-white bg-gray-700 focus:text-white hover:bg-gray-700 flex jusitfy-start items-center" role="alert">
        <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
                <div className="pl-2 w-full max-w-[calc(100%-24px)] overflow-hidden whitespace-nowrap truncate">
                    New chat
                </div>
        </Link>
    </div>
  );
};

export default ChatHistory;
