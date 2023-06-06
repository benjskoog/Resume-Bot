import React, { useState, useEffect, useContext, useImperativeHandle } from "react";
import Messages from './Messages';
import TopBar from '../TopBar';
import { BrowserRouter as Router, Route, Routes, useLocation, Link, useParams } from 'react-router-dom';
import BottomInput from './BottomInput';
import ChatHistory from './ChatHistory';
import UserContext from '../User/UserContext';
import axios from "axios";
import NewUserWalkthrough from '../User/NewUserWalkthrough';

const Chat = React.forwardRef((props, ref) => {
  const [messages, setMessages] = useState([]);
  const [fetchingResponse, setFetchingResponse] = useState(false);
  const [isNewUser, setIsNewUser] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [chat, setChat] = useState(false);
  const { chatId } = useParams();
  const { user, loading } = useContext(UserContext);

  const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";

  const clearChatState = () => {
    setMessages([]);
    setFetchingResponse(false);
  };

  const closeWalkthrough = () => {
    setIsNewUser(false);
  };

  useImperativeHandle(ref, () => ({
    clearChatState,
  }));

  const fetchMessagesByChatId = async (chatId) => {
    console.log(chatId);
    setChat(chatId)
    try {
      const response = await axios.get(`${backendUrl}/get-messages?user_id=${user.id}&chat_id=${chatId}`);
      const fetchedMessages = response.data;
      console.log(fetchedMessages)
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };
  
  const handleFormSubmit = async (formValues, clearForm) => {
    const proxyEndpoint = `${backendUrl}/gpt-api-call`;
    const data = {
      id: user.id,
      first_name: user.first_name,
      query: formValues.query,
      chainId: chat || chatId,
    };
    console.log(data)

    try {
      // Add user message to messages state
      setMessages((prevMessages) => [
        ...prevMessages,
        { chat_id: chatId, type: "user", message: formValues.query, user_id: user.id },
      ]);

      setFetchingResponse(true);
  
      const response = await axios.post(proxyEndpoint, data);
      const result = response.data.answer;
      setChat(response.data.chainId);
      console.log(response.data);
      console.log(fetchingResponse);
  
      // Add response to messages state
      setMessages((prevMessages) => [
        ...prevMessages,
        { chat_id: chatId, type: "bot", message: result, user_id: user.id },
      ]);
      setFetchingResponse(false);
  
      console.log("Resume question answer:", result);
    } catch (error) {
      // ...
    }
  };

  useEffect(() => {
    console.log(chatId)
    if (chatId) {
      fetchMessagesByChatId(chatId);
      setChat(chatId);
    }
  }, [chatId]);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get(`${backendUrl}/get-table-data/resume`, {
          params: { user_id: user.id },
        });

        setIsLoading(false); // Set loading to false here after data fetch

        if (response.data.length > 0) {
          setIsNewUser(false);
        }
        console.log(response.data);
      } catch (error) {
        console.error(`Error fetching data for table resume:`, error);
      }
    }

    fetchData();
  }, []);


  return (
    <>
      {!isLoading && isNewUser && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
          onClick={() => setIsNewUser(false)}
        >
          <div className="bg-white rounded shadow-lg relative w-1/2">
            <NewUserWalkthrough closeWalkthrough={closeWalkthrough} />
          </div>
        </div>
      )}
      <div className="flex">
        <div className="overflow-y-auto h-[calc(100vh-190px)] max-w-full flex-1 flex-col">
          <Messages
            messages={messages}
            fetchingResponse={fetchingResponse}
          />
          <BottomInput onSubmit={handleFormSubmit}/>
        </div>
        {user && <ChatHistory userId={user.id} onSubmit={handleFormSubmit} clearChatState={clearChatState} />}
      </div>
    </>
  );
});

export default Chat;