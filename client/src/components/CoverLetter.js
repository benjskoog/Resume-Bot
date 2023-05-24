import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import UserContext from './UserContext';
import Select from 'react-select';

function CoverLetter({ jobId, resumeVersionId }) {
    const [coverLetter, setCoverLetter] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [triggerUpdate, setTriggerUpdate] = useState(false);
    const { user, setUser, logout } = useContext(UserContext);

    const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";

    const generateCoverLetter = async () => {
        setLoading(true);
        console.log(jobId)
        try {
          const response = await axios.post(`${backendUrl}/generate-cover-letter`, { user_id: user.id, version_id: resumeVersionId, job_id: jobId});
          console.log("Response data:", response.data);
          setTriggerUpdate(!triggerUpdate);
          setCoverLetter(response.data.cover_letter);
        } catch (error) {
          console.error("Error fetching cover letter:", error);
        } finally {
          setLoading(false);
        }
    };
      
        useEffect(() => {
            async function fetchCoverLetter() {
              setLoading(true);
              console.log(jobId)
              console.log(resumeVersionId)
              try {
                const response = await axios.post(`${backendUrl}/get-cover-letter`, {
                  user_id: user.id,
                  job_id: jobId
                });
                console.log("Response data:", response.data);
                setCoverLetter(response.data.cover_letter);
                setLoading(false);
              } catch (error) {
                console.error("Error fetching cover letter:", error);
                setLoading(false);
              }
            }
          
            fetchCoverLetter();
          }, [triggerUpdate]);


          const deleteCoverLetter = async (coverLetter) => {
            try {
              const response = await axios.post(`${backendUrl}/delete-cover-letter`, {
                user_id: user.id,
                cover_letter_id: coverLetter.id,
              });
          
              if (response.data.success) {
                setCoverLetter();
              } else {
                console.error('Error deleting the cover letter:', response.data.message);
              }
            } catch (error) {
              console.error('Error deleting the cover letter:', error);
            }
          };
  
  
  return (
    <div className="relative">
    {loading && (
              <div className="absolute inset-0 z-10 flex justify-center items-center bg-white bg-opacity-50">
                  <div className="w-12 h-12 mt-4 mb-4 rounded-full animate-spin border-y-2 border-solid border-gray-900 border-t-transparent"></div>
              </div>
              )}
    <div className="bg-white p-4 max-w-full flex flex-col items-center">
      <div className="flex max-w-6xl mt-2 w-full">
      <button
        onClick={generateCoverLetter}
        type="button"
        className="mb-4 flex-shrink-0 inline-block rounded bg-blue-500 px-8 pb-2.5 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
        data-te-ripple-init
        data-te-ripple-color="light">
        Generate Cover Letter
      </button>
      </div>
      <div className="max-w-7xl flex flex-col max-w-6xl mt-2 w-full">
            <div className="block rounded-lg bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] dark:bg-neutral-700">
                <p className="mb-2 text-base text-neutral-600 dark:text-neutral-200 whitespace-pre-wrap">
                  {coverLetter}
                </p>
                <button
                    onClick={() => deleteCoverLetter(coverLetter)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-1 rounded"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </div>
      </div>
    </div>
    </div>
  );
}

export default CoverLetter;
