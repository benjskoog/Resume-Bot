import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate  } from 'react-router-dom';
import JobApplicationsForm from './JobApplicationsForm';
import UserContext from './UserContext';
import axios from 'axios';

const JobApplications = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4); // Change this to your desired number of items per page
  const { user, setUser, logout } = useContext(UserContext);
  const navigate = useNavigate();

  const backendUrl = process.env.BACKEND_URL|| "http://localhost:3001";

  const handleSave = async (updatedApp) => {
    setLoading(true);
    try {
      if (selectedApp === null) {
        // Create a new job application
        const response = await axios.post(`${backendUrl}/create-job-application`, {
          user_id: user.id,
          job_title: updatedApp.job_title,
          company_name: updatedApp.company_name,
          job_description: updatedApp.job_description,
          status: updatedApp.status,
          post_url: updatedApp.post_url
        });
  
        const newApp = response.data;
        setApplications([...applications, newApp]);
      } else {
        // Edit an existing job application
        const response = await axios.put(`${backendUrl}/edit-job-application/${applications[selectedApp].id}`, {
          user_id: user.id,
          job_title: updatedApp.job_title,
          company_name: updatedApp.company_name,
          job_description: updatedApp.job_description,
          status: updatedApp.status,
          post_url: updatedApp.post_url
        });
  
        // Use the spread operator to create a new object with the updated properties
        const editedApp = {
          ...applications[selectedApp],
          job_title: updatedApp.job_title,
          company_name: updatedApp.company_name,
          job_description: updatedApp.job_description,
          status: updatedApp.status,
          post_url: updatedApp.post_url
        };
  
        setApplications(
          applications.map((app, index) =>
            index === selectedApp ? editedApp : app
          )
        );
      }
      setSelectedApp(null);
      setShowForm(false);
      setLoading(false);
    } catch (error) {
      console.error('Error saving job application:', error);
    }
  };

  const handleDelete = async (index) => {
    try {
      const response = await axios({
        method: 'delete',
        url: `${backendUrl}/delete-job-application/${applications[index].id}`,
        data: {
          user_id: user.id,
        },
      });
  
      if (response.data.success) {
        setApplications(applications.filter((_, i) => i !== index));
      } else {
        console.error("Error deleting job application");
      }
    } catch (error) {
      console.error("Error deleting job application:", error);
    }
  };

  const handleEdit = (index) => {
    setSelectedApp(index);
    setShowForm(true);

  };

  const handleNewApp = () => {
    setShowForm(true);
    setSelectedApp(null);
  };

  const statusClass = (status) => {
    switch (status.toLowerCase()) {
      case "not started":
        return "red";
      case "in progress":
        return "yellow";
      case "rejected":
        return "red";
      case "complete":
        return "green";
      default:
        return "gray";
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const handleNextPage = () => {
    setCurrentPage(currentPage + 1);
  };
  
  

  useEffect(() => {
    setLoading(true);
    const fetchApplications = async () => {
      try {
        const response = await axios.post(`${backendUrl}/get-job-applications`, {
          user_id: user.id,
          page: currentPage,
          itemsPerPage: itemsPerPage,
        });
        const data = response.data;
        console.log(data);
        setApplications(data.applications);
        setLoading(false);
        console.log(applications)
      } catch (error) {
        console.error('Error fetching job applications:', error);
      }
    };    
  
    fetchApplications();
  }, [currentPage]);

  useEffect(() => {
    const handleMouseUp = (e) => {
      if (e.button === 3) {
        e.preventDefault();
        setShowForm(false);
      }
    };
  
    window.addEventListener('mouseup', handleMouseUp);
  
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const newApplication = { job_title: '', company_name: '', job_description: '', post_url: ''};
  const currentApp = selectedApp === null ? newApplication : applications[selectedApp];
  const appExists = selectedApp === null ? null : applications[selectedApp];

  return (
    <>
      {showForm ? (
        <JobApplicationsForm
          appExists={appExists}
          currentApp={currentApp}
          handleSave={handleSave}
          showForm={setShowForm}
        />
      ) : (
    <div className="overflow-y-auto antialiased bg-gray-200 h-[calc(100vh-72px)]">
    <div className="container mx-auto px-4 sm:px-8">
        <div className="py-8">
            <div>
                <h2 className="text-2xl font-semibold leading-tight">Track your job applications</h2>
            </div>
            <button
                onClick={handleNewApp}
                type="button"
                className="mb-4 mt-8 flex-shrink-0 inline-block rounded bg-blue-500 px-8 pb-2.5 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                data-te-ripple-init
                data-te-ripple-color="light">
                New Application
            </button>
            <div className="-mx-4 sm:-mx-8 px-4 sm:px-8 py-4 overflow-x-auto">
              <div className="inline-block min-w-full shadow rounded-lg overflow-hidden">
              <div className="relative">
                {loading && (
                <div className="absolute inset-0 z-10 flex justify-center items-center bg-white bg-opacity-50">
                    <div className="w-12 h-12 mt-4 mb-4 rounded-full animate-spin border-y-2 border-solid border-gray-900 border-t-transparent"></div>
                </div>
                )}
                <table className="min-w-full leading-normal">
                  <thead>
                    <tr>
                      <th
                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Job Title/Role
                      </th>
                      <th
                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Company Name
                      </th>
                      <th
                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Job Description
                      </th>
                      <th
                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th
                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date Added
                      </th>
                      <th
                        className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                        </th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((application, index) => (
                      <tr key={application.id}>
                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <button
                            className="text-left text-blue-600 hover:text-blue-800 focus:outline-none"
                            onClick={() => handleEdit(index)}
                        >
                            <p className="text-gray-900 text-blue-900 whitespace-no-wrap">
                            {application.job_title}
                            </p>
                        </button>
                        </td>
                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                          <p className="text-gray-900 whitespace-no-wrap">
                            {application.company_name}
                          </p>
                        </td>
                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                          <p className="text-gray-900 truncate-5-lines max-w-xl">
                            {application.job_description}
                          </p>
                        </td>
                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                    <span
                                        className={`relative inline-block px-3 py-1 font-semibold text-${application.status && statusClass(application.status)}-900 leading-tight`}>
                                        <span aria-hidden
                                            className={`absolute inset-0 opacity-50 bg-${application.status && statusClass(application.status)}-200 rounded-full`}></span>
                                        <span className="relative whitespace-nowrap">{application.status}</span>
                                    </span>
                                </td>
                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                          <p className="text-gray-900 whitespace-no-wrap">
                            {application.date_added}
                          </p>
                        </td>
                        <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                        <div className="flex flex-row items-center">
                        <button
                            onClick={() => handleEdit(index)}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-1 rounded mr-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                        </button>
                            <button
                                onClick={() => handleDelete(index)}
                                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-1 rounded"
                            >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                            </button>
                            </div>
                            </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
                    <div
                        className="px-5 py-5 bg-white border-t flex flex-col xs:flex-row items-center xs:justify-between          ">
                        <span className="text-xs xs:text-sm text-gray-900">
                            Showing 1 to 4 of 50 Entries
                        </span>
                        <div className="inline-flex mt-2 xs:mt-0">
                        <button
                          onClick={handlePrevPage}
                          className="text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-l"
                        >
                          Prev
                        </button>
                        <button
                          onClick={handleNextPage}
                          className="text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-r"
                        >
                          Next
                        </button>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
    </div>
</div>
      )}
</>
  );
};

export default JobApplications;
