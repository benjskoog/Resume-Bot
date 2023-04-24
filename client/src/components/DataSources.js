import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import FileUploader from "./FileUploader";

function DataSources({ onBack }) {
  const [tables, setTables] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const closeModal = (e) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get("http://localhost:3001/get-database-tables");
        setTables(response.data.tables);
        console.log(response.data)
      } catch (error) {
        console.error("Error fetching database tables:", error);
      }
    }

    fetchData();
  }, []);

  return (
<div className="overflow-y-auto bg-gray-100 h-[calc(100vh-72px)] max-w-full">
      <div className="pt-8 px-8">
        <button
          className="bg-gray-900 text-white active:bg-slate-600 uppercase text-5xl leading-none w-10 h-10 p-0 rounded-full shadow-lg hover:shadow-md outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 flex items-center justify-center"
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="relative" style={{ top: "-0.125em" }}>+</span>
        </button>
      </div>
      <ul className="space-x-4 pt-8 px-8 flex">
        {tables.map((table, index) => (
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
