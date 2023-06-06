import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import UserContext from '../User/UserContext';
import Select from 'react-select';
import InterviewQuestionsForm from '../Interview/InterviewQuestionsForm';
import RecommendationsForm from '../ResumeOptimizer/RecommendationsForm';
import CoverLetter from './CoverLetter';

const calculateRows = (text) => {
    if (text) {
        console.log()
      const numOfLines = (text.match(/\n/g) || '').length + 1;
      return numOfLines;
    }
    return 5;  // default rows for blank text
  }

const NewJobForm = ({ jobExists, currentJob, handleSave, showForm }) => {
  const [form, setForm] = useState(currentJob);
  const { user, setUser, logout } = useContext(UserContext);
  const [showFields, setShowFields] = useState(true);
  const [showInterviewQuestions, setShowInterviewQuestions] = useState(true);
  const [showCoverLetter, setShowCoverLetter] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [showVersion, setShowVersion] = useState(true);
  const [version, setVersion] = useState();
  const [rows, setRows] = useState(calculateRows(form.job_description));
  const [versionRows, setVersionRows] = useState(calculateRows(version ? version.version_text : ""));
  const options = [
    { value: 'NotStarted', label: 'Not Started' },
    { value: 'InProgress', label: 'In Progress' },
    { value: 'Complete', label: 'Complete' }
  ];
  const [selectedOption, setSelectedOption] = useState(
    options.find(option => option.label === form.status) || options[0]
  );

  const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // update rows when version_text changes
    if (name === 'job_description') {
      setRows(calculateRows(value));
    }
    console.log(form)
    console.log(currentJob)
  };

  const backButton = () => {
    showForm(false)
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave(form);
    showForm(false);
  };

  const handleOptionChange = (selectedOption) => {
    setSelectedOption(selectedOption);
    setForm({ ...form, status: selectedOption.label });
    console.log(form)
  };

  useEffect(() => {
    if (!form.status) {
      setForm({ ...form, status: options[0].label });
    }
    console.log(currentJob)
  }, []);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await axios.post(`${backendUrl}/get-resume-versions`, {
          user_id: user.id,
          job_id: currentJob.id,
        });
        const data = response.data;
        setVersion(response.data)
        setVersionRows(calculateRows(response.data.version_text))
        console.log(data);
      } catch (error) {
        console.error('Error fetching job resumes:', error);
      }
    };
  
    fetchVersion();
  }, []);

  return (
    <div className="p-4 overflow-y-auto h-[calc(100vh-72px)] bg-gray-200">
    <button
        onClick={backButton}
        className="absolute rounded bg-blue-500 px-6 pb-2 pt-2.5 mr-2 mt-2 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
        data-te-ripple-init
        data-te-ripple-color="light"
        >
        Back to Jobs
    </button>
    <div className="flex flex-col items-center max-w-full mt-2">
        <div className="w-full max-w-6xl rounded-t-xl border border-gray-300 bg-gray-100">
            <div onClick={() => setShowFields(!showFields)} className="px-4 py-4 cursor-pointer flex flex-row justify-between items-center border-b border-gray-300">
                <p className="text-2xl font-semibold text-gray-600">Job Details</p>
                <button>
                            {showFields ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                        ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                        )}
                </button>
            </div>
        {showFields && (
        <div className="bg-white px-8 py-8">
        <form onSubmit={handleSubmit}>
            <div className="mb-6">
                <label for="job_title" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Job Title</label>
                <input type="text" id="job_title" name="job_title" value={form.job_title} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="" required></input>
            </div>
            <div className="mb-6">
                <label for="company_name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Company Name</label>
                <input type="text" id="company_name" name="company_name" value={form.company_name} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="" required></input>
            </div>
        <div className="mb-6">
        <label htmlFor="jobDescription" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Job Description</label>
        <textarea
            id="jobDescription"
            name="job_description"
            value={form.job_description || ""}
            onChange={handleChange}
            rows={rows} // You can adjust the number of rows to control the height of the text box
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder=""
            required
        ></textarea>
        </div>
        <div className="mb-6">
        <label htmlFor="status" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Status</label>
        <Select
            options={options}
            value={selectedOption}
            onChange={handleOptionChange}
            placeholder="Status..."
            className="w-full mb-4 mr-4 text-sm leading-normal"
            theme={(theme) => ({
                ...theme,
                borderRadius: 4,
                colors: {
                ...theme.colors,
                primary25: 'rgb(219 234 254)',
                primary: 'rgb(59 130 246)',
                },
            })}
        />
        </div>
    <div className="mb-6">
        <label for="post_url" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Job Post Link</label>
        <input type="text" id="post_url" name="post_url" value={form.post_url} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder=""></input>
    </div>
    <button
        type="submit"
        className="inline-block rounded bg-blue-500 px-6 pb-2 pt-2.5 mr-2 mt-2 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
        data-te-ripple-init
        data-te-ripple-color="light"
        >
        Save
    </button>
    </form>
    </div>
    )}
    </div>
    {jobExists &&
    <div className="w-full max-w-6xl border border-gray-300 bg-gray-100">
        <div onClick={() => setShowInterviewQuestions(!showInterviewQuestions)} className="px-4 py-4 cursor-pointer flex flex-row justify-between items-center border-b border-gray-300">
                <p className="text-2xl font-semibold text-gray-600">Interview Questions</p>
                <button>
                            {showInterviewQuestions ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                        ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                        )}
                </button>
            </div>
        {showInterviewQuestions && <InterviewQuestionsForm job={true} jobId={currentJob.id} />}
        </div>
    }
    {jobExists &&
    <div className="w-full max-w-6xl border border-gray-300 bg-gray-100">
        <div onClick={() => setShowCoverLetter(!showCoverLetter)} className="px-4 py-4 cursor-pointer flex flex-row justify-between items-center border-b border-gray-300">
                <p className="text-2xl font-semibold text-gray-600">Cover Letter</p>
                <button>
                            {showCoverLetter ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                        ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                        )}
                </button>
            </div>
        {showCoverLetter && <CoverLetter jobId={currentJob.id} calculateRows={calculateRows} />}
        </div>
    }
    {jobExists &&
        <div className="w-full max-w-6xl border border-gray-300 bg-gray-100">
        <div onClick={() => setShowRecommendations(!showRecommendations)} className="px-4 py-4 cursor-pointer flex flex-row justify-between items-center border-b border-gray-300">
                <p className="text-2xl font-semibold text-gray-600">Resume Recommendations</p>
                <button>
                            {showRecommendations ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                        ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                        )}
                </button>
            </div>
        {showRecommendations && <RecommendationsForm jobId={currentJob.id} />}
        </div>
    }
    {jobExists &&
        <div className="w-full max-w-6xl border border-gray-300 bg-gray-100">
        <div onClick={() => setShowVersion(!showVersion)} className="px-4 py-4 cursor-pointer flex flex-row justify-between items-center border-b border-gray-300">
                <p className="text-2xl font-semibold text-gray-600">Resume Version</p>
                <button>
                            {showVersion ? (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                        ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                        )}
                </button>
            </div>
        {showVersion && version && (
          <div className="bg-white px-8 py-8">
          <div className="mb-6">
          <label htmlFor="version" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Resume Version</label>
          <textarea
              id="version"
              name="version_text"
              value={version.version_text || ""}
              onChange={handleChange}
              rows={versionRows} // You can adjust the number of rows to control the height of the text box
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder=""
              required
          ></textarea>
          </div>
          </div>
        )}
        </div>
    }
  </div>
  </div>
  );
};

export default NewJobForm;
