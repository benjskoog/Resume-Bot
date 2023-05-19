import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import QuestionModal from './QuestionModal';
import UserContext from './UserContext';
import Select from 'react-select';

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, setUser, logout } = useContext(UserContext);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";
    
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');

  async function fetchJobs() {
    setLoading(true);
    try {
        const response = await axios.post(`${backendUrl}/search-jobs`, {
            user_id: user.id,
            page: 1,
            itemsPerPage: 50,
            query: user.job_title,
            location: user.location
        });
        setJobs(response.data.jobs);
        console.log(response.data)
        setLoading(false);
    } catch (error) {
        console.error("Error fetching jobs:", error);
        setLoading(false);
    }
}

async function saveJob(job) {
    setLoading(true);

    try {
        const response = await axios.post(`${backendUrl}/create-job`, {
            id: job.id,
            user_id: user.id,
            job_title: job.title,
            company_name: job.company_name,
            job_description: job.description,
            saved: true,
            status: "Not Started", // Adapt to your use case
        });

        if(response.data.success) {
            console.log("Job saved successfully");
            // You can add additional logic here like showing a success message to the user
            fetchJobs(); // Refresh jobs after saving a job
        } else {
            console.error("Error saving job:", response.data.message);
            // Here you can add logic to handle when saving a job fails, like showing an error message to the user
        }
    } catch (error) {
        console.error("Error saving job:", error);
    } finally {
        setLoading(false);
    }
}

useEffect(() => {
    fetchJobs();
}, [query, location, user.id]);

  const openModal = (question, answer = null) => {
    setSelectedQuestion({ ...question, answer });
    setIsModalOpen(true);
  };  

  const closeModal = (e) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  {jobs.map((job, index) => {
    console.log(`Job ${index}: saved=${job.saved}, type=${typeof job.saved}`);
    // Rest of your code...
  })}
  
  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex justify-center items-center bg-white bg-opacity-50">
          <div className="w-12 h-12 mt-4 mb-4 rounded-full animate-spin border-y-2 border-solid border-gray-900 border-t-transparent"></div>
        </div>
      )}
      <div className="bg-gray-200 overflow-y-auto h-[calc(100vh-72px)] p-4 max-w-full flex flex-col items-center">
        <div className="flex flex-col max-w-7xl mt-2 w-full">
          <ul className="max-w-7xl">
            {jobs.map((job, index) => (
              <li key={index} className="mb-2">
                <div className="block rounded-lg bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] dark:bg-neutral-700">
                  <h5 className="mb-4 text-xl font-medium leading-tight text-neutral-800 dark:text-neutral-50">
                  <span
                                        className={`relative inline-block px-3 py-1 font-semibold text-white-900 leading-tight`}>
                                        <span aria-hidden
                                            className={`absolute inset-0 opacity-50 bg-green-200 rounded-full`}></span>
                                        <span className="relative whitespace-nowrap">{job.title}</span>
                                    </span>
                  </h5>
                  <p className="mb-2 text-base font-medium text-neutral-600 dark:text-neutral-200">
                    Company: {job.company_name}
                  </p>
                  <p className="mb-2 text-base font-medium text-neutral-600 dark:text-neutral-200">
                    Location: {job.location}
                  </p>
                  <p className="mb-2 text-base truncate-5-lines text-neutral-600 dark:text-neutral-200">
                    {job.description}
                  </p>
                  {job.saved ? (
                    <button
                        type="button"
                        className="mb-4 flex-shrink-0 inline-block rounded bg-gray-500 px-8 pb-2.5 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                        data-te-ripple-init
                        data-te-ripple-color="light">
                        Saved
                    </button>
                    ) : (
                        <button
                        onClick={() => saveJob(job)}
                        type="button"
                        className="mb-4 flex-shrink-0 inline-block rounded bg-blue-500 px-8 pb-2.5 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                        data-te-ripple-init
                        data-te-ripple-color="light">
                        Save this job
                    </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
  
}

export default Jobs;
