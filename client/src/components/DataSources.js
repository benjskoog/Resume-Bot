import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function DataSources({ onBack }) {
  const [tables, setTables] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post("http://localhost:3001/upload-resume", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      if (response.data.success) {
        alert("Resume uploaded successfully.");
      } else {
        alert("Error uploading resume.");
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get("http://localhost:3001/get-database-tables");
        setTables(response.data.tables);
      } catch (error) {
        console.error("Error fetching database tables:", error);
      }
    }

    fetchData();
  }, []);

  return (
    <div>
      <h2>Data Sources</h2>
      <div>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleFileUpload}>Upload File</button>
      </div>
      <ul>
        {tables.map((table, index) => (
          <li key={index}>
            <Link to={`/datasources/${table.name}`}>{table.name}</Link>
          </li>
        ))}
      </ul>
      <Link to="/">
        <button>Back to Main Page</button>
      </Link>
    </div>
  );
}

export default DataSources;
