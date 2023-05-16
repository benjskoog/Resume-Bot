import React, { useState, useEffect, useRef, useContext } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import FileUploader from "./FileUploader";
import UserContext from './UserContext';

function DataSources({ onBack }) {
  const [tables, setTables] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, setUser, logout } = useContext(UserContext);

  const closeModal = (e) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";
        const response = await axios.get(`${backendUrl}/get-database-tables`);
        setTables(response.data.tables);
        console.log(response.data)
      } catch (error) {
        console.error("Error fetching database tables:", error);
      }
    }

    fetchData();
  }, []);

  let allowedTableNames = [];

  if (user.email === "benjskoog@gmail.com") {
    allowedTableNames = ["chat", "messages", "resume", "users", "interview_questions", "job_applications"];
  } else {
    allowedTableNames = ["chat", "messages", "resume"];
  }

  return (
    <div className="overflow-y-auto bg-gray-200 h-[calc(100vh-72px)] max-w-full">
      <div className="px-8">
      <button
        onClick={() => setIsModalOpen(true)}
        type="button"
        className="mt-8 flex-shrink-0 inline-block rounded bg-blue-500 px-8 pb-2.5 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
        data-te-ripple-init
        data-te-ripple-color="light">
        Upload
      </button>
      </div>
      <ul className="space-x-4 pt-8 px-8 flex">
      {tables
        .filter((table) => allowedTableNames.includes(table.name))
        .map((table, index) => (
          <li key={index}>
            <Link className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-lg flex items-center space-x-4" to={`/datasources/${table.name}`}>
              <div>
              <div className="text-xl font-medium text-black">
                {table.name}
              </div>
              <p className="text-slate-500">Click to view data</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {isModalOpen && (
        <div
        className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
          onClick={closeModal}
        >
          <div className="bg-white rounded shadow-lg relative w-1/2">
            <FileUploader setIsModalOpen={setIsModalOpen} closeModal={closeModal}/>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataSources;