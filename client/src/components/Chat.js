import React, { useState } from 'react';
import Messages from './Messages';
import TopBar from './TopBar';
import BottomInput from './BottomInput';

const Chat = ({ onSubmit, messages, fetchingResponse }) => {

  return (
    <>
    <div class="overflow-y-auto flex h-[calc(100vh-190px)] max-w-full flex-1 flex-col">
      <Messages
        messages={messages}
        fetchingResponse={fetchingResponse}
      />
      <BottomInput onSubmit={onSubmit}/>
    </div>
    </>
  );
};

export default Chat;
