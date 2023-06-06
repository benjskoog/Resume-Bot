import React, { useContext, useRef } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, Link } from 'react-router-dom';
import UserContext from '../User/UserContext';
import NavBarItem from './NavBarItem';
import TopBar from '../TopBar';
import NavBarLogo from './NavBarLogo';

const NavBar = ({ selectedItem, onNewChatClick }) => {
  const { user, setUser, logout } = useContext(UserContext);

  const handleLogout = () => {
    logout();
  };

  const icon1 = useRef(null);
  const menu1 = useRef(null);
  const icon2 = useRef(null);
  const menu2 = useRef(null);

  const showMenu1 = () => {
    icon1.current.classList.toggle("rotate-180");
    menu1.current.classList.toggle("hidden");
  };

  const showMenu2 = () => {
    icon2.current.classList.toggle("rotate-180");
    menu2.current.classList.toggle("hidden");
  };

  return (
<>
<div id="Main" className="transform xl:translate-x-0 ease-in-out transition duration-500 flex justify-start items-start h-screen w-full sm:w-64 bg-gray-900 flex-col">
  <NavBarLogo name={`${user.first_name}Bot`}/>
  <div className="mt-6 flex flex-col justify-start items-center pl-5 w-full border-gray-600 space-y-4 pb-5">
    <Link to="/chat/" onClick={onNewChatClick} className={`flex justify-start items-center space-x-6 w-full ${selectedItem === "/chat/" ? "outline-none text-indigo-400" : "text-white"} rounded`}>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    </svg>
      <p className="text-base leading-4 ">Career Assistant</p>
    </Link>
    <Link to="/interview-questions-form" className={`flex justify-start items-center space-x-6 w-full ${selectedItem === "/interview-questions-form" ? "outline-none text-indigo-400" : "text-white"} rounded`}>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
      <p className="text-base leading-4 ">Interview Questions</p>
    </Link>
    <Link to="/saved-jobs" className={`flex justify-start items-center space-x-6 w-full ${selectedItem === "/saved-jobs" ? "outline-none text-indigo-400" : "text-white"} rounded`}>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      <p className="text-base leading-4 ">Job Applications</p>
    </Link>
  </div>
  <div class="flex flex-col justify-start items-center px-6 border-b border-gray-600 w-full">
  <button onClick={showMenu2} class="focus:outline-none focus:text-indigo-400 text-left  text-white flex justify-between items-center w-full py-5 space-x-14">
    <p class="text-sm leading-5  uppercase">Jobs</p>
      <svg id="icon1" ref={icon2} class="transform" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 15L12 9L6 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div ref={menu2} class="flex justify-start  flex-col w-full md:w-auto items-start pb-1 ">
      <Link to="/jobs" className={`flex justify-start items-center space-x-6 w-full ${selectedItem === "/jobs" ? "outline-none text-indigo-400" : "text-white"} rounded px-3 py-2  w-full md:w-52`}>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
        <p className="text-base leading-4 ">Job Search</p>
      </Link>
    </div>
  </div>
  <div class="flex flex-col justify-start items-center px-6 border-b border-gray-600 w-full">
  <button onClick={showMenu1} class="focus:outline-none focus:text-indigo-400 text-left  text-white flex justify-between items-center w-full py-5 space-x-14">
    <p class="text-sm leading-5  uppercase">Data</p>
      <svg id="icon1" ref={icon1} class="transform" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 15L12 9L6 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
    <div ref={menu1} class="flex justify-start  flex-col w-full md:w-auto items-start pb-1 ">
      <Link to="/datasources" className={`flex justify-start items-center space-x-6 w-full ${selectedItem === "/datasources" ? "outline-none text-indigo-400" : "text-white"} rounded px-3 py-2  w-full md:w-52`}>
      <svg className="fill-stroke " width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 4H5C4.44772 4 4 4.44772 4 5V9C4 9.55228 4.44772 10 5 10H9C9.55228 10 10 9.55228 10 9V5C10 4.44772 9.55228 4 9 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M19 4H15C14.4477 4 14 4.44772 14 5V9C14 9.55228 14.4477 10 15 10H19C19.5523 10 20 9.55228 20 9V5C20 4.44772 19.5523 4 19 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M9 14H5C4.44772 14 4 14.4477 4 15V19C4 19.5523 4.44772 20 5 20H9C9.55228 20 10 19.5523 10 19V15C10 14.4477 9.55228 14 9 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M19 14H15C14.4477 14 14 14.4477 14 15V19C14 19.5523 14.4477 20 15 20H19C19.5523 20 20 19.5523 20 19V15C20 14.4477 19.5523 14 19 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <p className="text-base leading-4 ">My Data</p>
      </Link>
    </div>
  </div>
  <div className="flex flex-col justify-between items-center h-full pb-6 px-6 w-full space-y-32">

  </div>
  <div className="mt-6 flex flex-col justify-end items-center pl-5 w-full border-gray-600 border-b space-y-4 pb-5">
    <button onClick={handleLogout} className="flex jusitfy-end items-center w-full  space-x-6 focus:outline-none text-white focus:text-indigo-400 rounded">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
      <p className="text-base leading-4 ">Log out</p>
    </button>
  </div>
  <div className="flex flex-col justify-end items-center pb-6 px-6 w-full pt-5">
    <div className=" flex justify-between items-center w-full">
      <div className="flex justify-center items-center  space-x-2">
        <div className="flex justify-start flex-col items-start">
          <p className="text-sm leading-5 text-white">{`${user.first_name} ${user.last_name}`}</p>
          <p className="text-xs leading-3 text-gray-300">{user.email}</p>
        </div>
      </div>
      <Link to="/user-settings">
      <svg className="cursor-pointer" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.325 4.317C10.751 2.561 13.249 2.561 13.675 4.317C13.7389 4.5808 13.8642 4.82578 14.0407 5.032C14.2172 5.23822 14.4399 5.39985 14.6907 5.50375C14.9414 5.60764 15.2132 5.65085 15.4838 5.62987C15.7544 5.60889 16.0162 5.5243 16.248 5.383C17.791 4.443 19.558 6.209 18.618 7.753C18.4769 7.98466 18.3924 8.24634 18.3715 8.51677C18.3506 8.78721 18.3938 9.05877 18.4975 9.30938C18.6013 9.55999 18.7627 9.78258 18.9687 9.95905C19.1747 10.1355 19.4194 10.2609 19.683 10.325C21.439 10.751 21.439 13.249 19.683 13.675C19.4192 13.7389 19.1742 13.8642 18.968 14.0407C18.7618 14.2172 18.6001 14.4399 18.4963 14.6907C18.3924 14.9414 18.3491 15.2132 18.3701 15.4838C18.3911 15.7544 18.4757 16.0162 18.617 16.248C19.557 17.791 17.791 19.558 16.247 18.618C16.0153 18.4769 15.7537 18.3924 15.4832 18.3715C15.2128 18.3506 14.9412 18.3938 14.6906 18.4975C14.44 18.6013 14.2174 18.7627 14.0409 18.9687C13.8645 19.1747 13.7391 19.4194 13.675 19.683C13.249 21.439 10.751 21.439 10.325 19.683C10.2611 19.4192 10.1358 19.1742 9.95929 18.968C9.7828 18.7618 9.56011 18.6001 9.30935 18.4963C9.05859 18.3924 8.78683 18.3491 8.51621 18.3701C8.24559 18.3911 7.98375 18.4757 7.752 18.617C6.209 19.557 4.442 17.791 5.382 16.247C5.5231 16.0153 5.60755 15.7537 5.62848 15.4832C5.64942 15.2128 5.60624 14.9412 5.50247 14.6906C5.3987 14.44 5.23726 14.2174 5.03127 14.0409C4.82529 13.8645 4.58056 13.7391 4.317 13.675C2.561 13.249 2.561 10.751 4.317 10.325C4.5808 10.2611 4.82578 10.1358 5.032 9.95929C5.23822 9.7828 5.39985 9.56011 5.50375 9.30935C5.60764 9.05859 5.65085 8.78683 5.62987 8.51621C5.60889 8.24559 5.5243 7.98375 5.383 7.752C4.443 6.209 6.209 4.442 7.753 5.382C8.753 5.99 10.049 5.452 10.325 4.317Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </Link>
    </div>
  </div>
</div>
</>
  );
};

export default NavBar;