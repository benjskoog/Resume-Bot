import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import TopBar from './TopBar';

function TableView() {
  const [tableData, setTableData] = useState([]);
  const { tableName } = useParams();

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get(`http://localhost:3001/get-table-data/${tableName}`);
        setTableData(response.data);
        console.log(response.data)
      } catch (error) {
        console.error(`Error fetching data for table ${tableName}:`, error);
      }
    }

    fetchData();
  }, [tableName]);

  return (
    <div>
      <TopBar text={'Data Sources'} />
      <div className="markdown prose w-full break-words dark:prose-invert light text-center">
        <h2>{tableName}</h2>
      </div>
      <div className="text-base gap-4 md:gap-6 md:max-w-2xl lg:max-w-xl xl:max-w-3xl p-3 md:py-6 flex lg:px-0 m-auto">
      <div className="relative flex w-full flex-col gap-1 md:gap-3 lg:w-[calc(100%-115px)]">
      <div className="flex flex-grow flex-col gap-3">
      <div className="min-h-[20px] flex flex-col items-start gap-4 whitespace-pre-wrap">
      <div className="markdown prose w-full break-words dark:prose-invert light">
      <table>
        <thead>
          <tr>
            {tableData.length > 0 &&
              Object.keys(tableData[0]).reverse().map((header, index) => <th key={index}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, index) => (
            <tr key={index}>
              {Object.values(row).reverse().map((value, i) => (
                <td key={i}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      </div>
      </div>
      </div>
      </div>
    </div>
  );
}

export default TableView;
