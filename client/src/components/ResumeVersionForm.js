import React, { useState, useContext, useEffect } from 'react';
import UserContext from './UserContext';
import Select from 'react-select';
import RecommendationsForm from './RecommendationsForm';

const ResumeVersionForm = ({ versionExists, currentVersion, handleSave, showForm, jobApplications }) => {
  const [form, setForm] = useState(currentVersion);
  const { user, setUser, logout } = useContext(UserContext);
  const [showFields, setShowFields] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const options = jobApplications.map(app => ({
    value: app.id,
    label: `${app.job_title} - ${app.company_name}`,
  }));
  const [selectedOption, setSelectedOption] = useState(
    options.find(option => option.value === form.job_app_id) || options[0]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    console.log(form)
    console.log(currentVersion)
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
    setForm({ ...form, job_app_id: selectedOption.value });
  };
  

  useEffect(() => {
    if (!form.job_app_id) {
      setForm({ ...form, job_app_id: options[0]?.value });
    }
    console.log(currentVersion);
  }, []);

  return (
    <div className="p-4 overflow-y-auto h-[calc(100vh-72px)] bg-gray-200">
    <button
        onClick={backButton}
        className="absolute rounded bg-blue-500 px-6 pb-2 pt-2.5 mr-2 mt-2 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
        data-te-ripple-init
        data-te-ripple-color="light"
        >
        Back to Versions
    </button>
    <div className="flex flex-col items-center max-w-full mt-2">
        <div className="w-full max-w-6xl rounded-t-xl border border-gray-300 bg-gray-100">
            <div onClick={() => setShowFields(!showFields)} className="px-4 py-4 cursor-pointer flex flex-row justify-between items-center border-b border-gray-300">
                <p className="text-2xl font-semibold text-gray-600">Version Details</p>
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
                <label for="version_name" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Version name</label>
                <input type="text" id="version_name" name="version_name" value={form.version_name} onChange={handleChange} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="" required></input>
            </div>
        <div className="mb-6">
        <label htmlFor="jobApps" className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Job Applications</label>
        <Select
            options={options}
            value={selectedOption}
            onChange={handleOptionChange}
            placeholder="Job Applications..."
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
    {versionExists &&
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
        {showRecommendations && <RecommendationsForm resumeVersion={true} resumeVersionId={currentVersion.id} />}
        </div>
    }
  </div>
  </div>
  );
};

export default ResumeVersionForm;
