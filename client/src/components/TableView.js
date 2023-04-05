import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import "./TableView.css";

function TableView() {
  const [tableData, setTableData] = useState([]);
  const { tableName } = useParams();

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
