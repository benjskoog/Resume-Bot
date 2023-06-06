import React, { useState, useEffect, useContext } from "react";
import UserContext from './User/UserContext';
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import TopBar from './TopBar';

function TableView() {
  const [tableData, setTableData] = useState([]);
  const { tableName } = useParams();
  const { user } = useContext(UserContext);
  const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";

async function deleteRow(rowId) {
  try {
    console.log(rowId)
    const response = await axios.delete(
      `${backendUrl}/delete-row/${tableName}/${rowId}`,
      { params: { user_id: user.id } }
    );
    setTableData((prevTableData) => prevTableData.filter((row) => row.id !== rowId));
    console.log("Deleted rows:", response.data.deleted_rows);
  } catch (error) {
    console.error(`Error deleting row ${rowId} from table ${tableName}:`, error);
  }
}


  useEffect(() => {
    async function fetchData() {
      try {
        const response = await axios.get(`${backendUrl}/get-table-data/${tableName}`, {
          params: { user_id: user.id },
        });
        setTableData(response.data);
        console.log(response.data);
      } catch (error) {
        console.error(`Error fetching data for table ${tableName}:`, error);
      }
    }

    fetchData();
  }, [tableName]);

  return (
    <div className="overflow-y-auto antialiased bg-gray-100 text-gray-600 px-4 pt-8 h-[calc(100vh-72px)] min-h-[calc(100vh-72px)]">
      <div className="flex flex-col">
        <div className="w-full max-w-6xl mx-auto bg-white shadow-lg rounded-sm border border-gray-200 rounded-xl">
          <header className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">{tableName}</h2>
          </header>
          <div className="p-3">
            <div className="">
              <table className="table-auto w-full">
                <thead className="text-xs font-semibold uppercase text-gray-400 bg-gray-50">
                  <tr>
                    {tableData.length > 0 &&
                      Object.keys(tableData[0]).reverse().map((header, index) => 
                        <th className="p-2 whitespace-pre-wrap" key={index}>
                          <div className="font-semibold text-left">
                            {header}
                          </div>
                        </th>)}
                        <th className="p-2 whitespace-pre-wrap">
                          <div className="font-semibold text-left">
                            Delete
                          </div>
                        </th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-100">
                  {tableData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).reverse().map((value, i) => (
                        <td key={i} className="p-2 whitespace-pre-wrap break-words">
                          <div className="text-left">
                            {value}
                          </div>
                        </td>
                      ))}
                    <td className="p-2">
                      <button onClick={() => deleteRow(row.id)} className="text-red-500 hover:text-red-700">
                        Delete
                      </button>
                    </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TableView;
