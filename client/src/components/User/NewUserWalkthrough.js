import React, { useState, useContext } from 'react';
import FileUploader from "../FileUploader";
import UserContext from './UserContext';

function NewUserWalkthrough( {closeWalkthrough} ) {
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const { user } = useContext(UserContext);
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";

  const goToNext = (event) => {
    event.stopPropagation(); // prevent event bubbling
    setIsUploaderOpen(true);
  };

  const closeModal = (e) => {
    if (e.target === e.currentTarget) {
      setIsUploaderOpen(false);
      closeWalkthrough();
    }
  };

  const stopPropagation = (e) => {
    e.stopPropagation();
  };

  return (
    <>
      <div className="p-6 mx-auto bg-white rounded-xl shadow-lg flex items-center space-x-4">
        <div>
          <div className="text-xl font-medium text-black">
            Click "Next" to upload your resume!
          </div>
          <p className="text-gray-500">
            ResumeBot is an intelligent and user-friendly web application designed to streamline job applications. Built on OpenAI's gpt-3.5-turbo, it combines the power of AI with the complexities of the job application process to make your job hunting more effective and less stressful.
          </p>
          <button
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={goToNext}
          >
            Next
          </button>
        </div>
      </div>
      {isUploaderOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
          onClick={closeModal}
        >
        <div 
            className="bg-white rounded shadow-lg relative w-1/2"
            onClick={stopPropagation} // Add stopPropagation here
          >
          <FileUploader closeModal={closeModal}/>
          </div>
        </div>
      )}
    </>
  );
}

export default NewUserWalkthrough;
