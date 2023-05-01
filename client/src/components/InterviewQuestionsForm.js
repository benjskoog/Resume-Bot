import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import QuestionModal from './QuestionModal';
import UserContext from './UserContext';

function InterviewQuestionsForm() {
    const [questions, setQuestions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [loading, setLoading] = useState(false);
    const { user, setUser, logout } = useContext(UserContext);

    const generateQuestions = async () => {
        setLoading(true);
        try {
          const response = await axios.post("http://localhost:3001/generate-interview-questions", user);
          console.log("Response data:", response.data);
          const questionsArray = response.data.questions;
          setQuestions(questionsArray);
        } catch (error) {
          console.error("Error fetching interview questions:", error);
        } finally {
          setLoading(false);
        }
      };
    
    const handleSubmit = async (questionId, question, route, answer) => {
        try {
            const response = await axios.post(`http://localhost:3001${route}`, {
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
        const response = await axios.post("http://localhost:3001/get-interview-questions", { user_id: user.id });
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
  }, []);
  

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
      const response = await axios.post('http://localhost:3001/delete-interview-question', {
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
  

  return (
    <div className="p-4 overflow-y-auto h-[calc(100vh-72px)] max-w-full flex-1 flex-col">
      <h1 className="text-xl font-bold mb-4">Interview Questions</h1>
      <button
        onClick={generateQuestions}
        type="button"
        className="mb-4 inline-block rounded bg-blue-500 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
        data-te-ripple-init
        data-te-ripple-color="light">
        Generate Questions
      </button>
      <div className="flex flex-col">
      {loading ? (
          <div className="flex justify-center items-center h-16">
            <img
              className="h-8 w-8"
              src="https://icons8.com/preloaders/preloaders/1488/Iphone-spinner-2.gif"
              alt="Loading"
            />
          </div>
        ) : (
          <ul className="max-w-7xl">
        {questions.map((question, index) => (
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
                <button
                    onClick={() => openModal(question, question.answer)}
                    className="inline-block rounded bg-green-500 px-6 pb-2 pt-2.5 mr-2 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                    data-te-ripple-init
                    data-te-ripple-color="light"
                    >
                    Edit
                </button>
                </>
              ) : (
                <button
                  onClick={() => openModal(question)}
                  type="button"
                  className="inline-block rounded bg-blue-500 px-6 pb-2 pt-2.5 mr-2 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                  data-te-ripple-init
                  data-te-ripple-color="light">
                  Answer
                </button>
              )}
                <button
                    onClick={() => deleteQuestion(question)}
                    className="inline-block rounded bg-red-500 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
                    data-te-ripple-init
                    data-te-ripple-color="light"
                    >
                    Delete
                </button>
            </div>
          </li>
        ))}
      </ul>
        )}
      </div>
      {isModalOpen && (
        <QuestionModal
          question={selectedQuestion}
          closeModal={closeModal}
          setIsModalOpen={setIsModalOpen}
          submit={handleSubmit}
        />
      )}
    </div>
  );
}

export default InterviewQuestionsForm;
