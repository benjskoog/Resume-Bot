import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import "./TableView.css";

function TableView() {
  const [tableData, setTableData] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const { tableName } = useParams();

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
        const response = await axios.get(`http://localhost:3001/get-table-data/${tableName}`);
        setTableData(response.data);
      } catch (error) {
        console.error(`Error fetching data for table ${tableName}:`, error);
      }
    }

    fetchData();
  }, [tableName]);

  return (
    <div>
      <Link to="/datasources">
        <button>Back to Data Sources</button>
      </Link>
      <h2>{tableName}</h2>
      <div>
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleFileUpload}>Upload File</button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {tableData.length > 0 &&
                Object.keys(tableData[0]).map((header, index) => <th key={index}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, i) => (
                  <td key={i}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TableView;
