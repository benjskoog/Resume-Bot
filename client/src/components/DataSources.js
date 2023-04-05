import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

function DataSources({ onBack }) {
  const [tables, setTables] = useState([]);

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
