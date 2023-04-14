import React from 'react';
import Messages from './Messages';
import TopBar from './TopBar';
import BottomInput from './BottomInput';

const Chat = ({ messages, onSubmit }) => {
  return (
    <>   
      <TopBar text={'Ben Bot'}/>
      <Messages messages={messages}/>
      <BottomInput onSubmit={onSubmit}/>
    </>
  );
};

export default Chat;
