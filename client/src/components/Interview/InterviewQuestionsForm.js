import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import QuestionModal from './QuestionModal';
import UserContext from '../User/UserContext';
import Select from 'react-select';

function InterviewQuestionsForm({ job, jobId }) {
    const [questions, setQuestions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedOption, setSelectedOption] = useState('');
    const [triggerUpdate, setTriggerUpdate] = useState(false);
    const { user, setUser, logout } = useContext(UserContext);

    const options = [
        { value: 'WorkExperience', label: 'Work Experience' },
        { value: 'RoleBased', label: 'Role Based' },
        { value: 'Technical', label: 'Technical' }
      ];
    
    const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";

    const generateQuestions = async () => {
        setLoading(true);
        try {
          const response = await axios.post(`${backendUrl}/generate-interview-questions`, { user_id: user.id, job_id: jobId, type: selectedOption.value });
          console.log("Response data:", response.data);
          const questionsArray = response.data.questions;
          setQuestions(prevQuestions => [...prevQuestions, ...questionsArray]);
          setTriggerUpdate(!triggerUpdate);
        } catch (error) {
          console.error("Error fetching interview questions:", error);
        } finally {
          setLoading(false);
        }
    };
    
    
    const handleSubmit = async (questionId, question, route, answer) => {
        try {
            const response = await axios.post(`${backendUrl}/${route}`, {
              user_id: user.id,
              question_id: questionId,
              question: question,
              answer,
            });
        
            if (response.data.success) {
            const updatedQuestions = questions.map((q) => {
                if (q.id === questionId) {
                return { ...q, answer };
                }
                return q;
            });
            setQuestions(updatedQuestions);
            } else {
            console.error('Error saving the answer:', response.data.message);
            }
        } catch (error) {
            console.error('Error saving the answer:', error);
        }
        };
      
        useEffect(() => {
            async function fetchQuestions() {
              setLoading(true);
              try {
                const response = await axios.post(`${backendUrl}/get-interview-questions`, {
                  user_id: user.id,
                  job_id: jobId,
                });
                console.log("Response data:", response.data);
                const questionsArray = response.data.questions.map(question => question);
                setQuestions(questionsArray);
                setLoading(false);
              } catch (error) {
                console.error("Error fetching interview questions:", error);
                setLoading(false);
              }
            }
          
            fetchQuestions();
          }, [triggerUpdate]);
          
  

  const openModal = (question, answer = null) => {
    setSelectedQuestion({ ...question, answer });
    setIsModalOpen(true);
  };  

  const closeModal = (e) => {
    if (e.target === e.currentTarget) {
      setIsModalOpen(false);
    }
  };

  const deleteQuestion = async (question) => {
    try {
      const response = await axios.post(`${backendUrl}/delete-interview-question`, {
        user_id: user.id,
        question_id: question.id,
      });
  
      if (response.data.success) {
        const newQuestions = questions.filter((q) => q.id !== question.id);
        setQuestions(newQuestions);
      } else {
        console.error('Error deleting the question:', response.data.message);
      }
    } catch (error) {
      console.error('Error deleting the question:', error);
    }
  };

  const handleOptionChange = (selectedOption) => {
    setSelectedOption(selectedOption);
    console.log(selectedOption)
  };
  
  
  return (
    <div className="relative">
    {loading && (
              <div className="absolute inset-0 z-10 flex justify-center items-center bg-white bg-opacity-50">
                  <div className="w-12 h-12 mt-4 mb-4 rounded-full animate-spin border-y-2 border-solid border-gray-900 border-t-transparent"></div>
              </div>
              )}
    <div className={`${job ? "bg-white" : "bg-gray-200 overflow-y-auto h-[calc(100vh-72px)]"} p-4 max-w-full flex flex-col items-center`}>
      <div className={`flex ${job ? "max-w-6xl" : "max-w-7xl"} mt-2 w-full`}>
      <Select
        options={options}
        value={selectedOption}
        onChange={handleOptionChange}
        placeholder="Select the type of interview questions to generate..."
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
      <button
        onClick={generateQuestions}
        type="button"
        className="mb-4 flex-shrink-0 inline-block rounded bg-blue-500 px-8 pb-2.5 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
        data-te-ripple-init
        data-te-ripple-color="light">
        Generate Questions
      </button>
      </div>
      <div className={`flex flex-col ${job ? "max-w-6xl" : "max-w-7xl"} mt-2 w-full`}>
          <ul className={`${job ? "max-w-6xl" : "max-w-7xl"}`}>
        {questions
            .filter((question) => !job || question.job_id === jobId)
            .map((question, index) => (
          <li key={index} className="mb-2">
            <div className="block rounded-lg bg-white p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] dark:bg-neutral-700">
                <h5 className="mb-4 text-xl font-medium leading-tight text-neutral-800 dark:text-neutral-50">
                    {question.question}
                </h5>
            {question.answer ? (
                <>
                <p className="mb-2 text-base font-medium text-neutral-600 dark:text-neutral-200">
                    Answer:
                </p>
                <p className="mb-2 text-base text-neutral-600 dark:text-neutral-200">
                  {question.answer}
                </p>

                </>
              ) : ""}
                <button
                    onClick={() => openModal(question, question.answer)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-1 rounded mr-2"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                </button>
                <button
                    onClick={() => deleteQuestion(question)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-1 rounded"
                    >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </button>
            </div>
          </li>
        ))}
      </ul>
      {isModalOpen && (
        <QuestionModal
          question={selectedQuestion}
          closeModal={closeModal}
          setIsModalOpen={setIsModalOpen}
          submit={handleSubmit}
        />
      )}
    </div>
    </div>
    </div>
  );
}

export default InterviewQuestionsForm;
