import React, { useState, useContext } from 'react';
import axios from 'axios';
import UserContext from './UserContext';

function QuestionModal({ question, closeModal, setIsModalOpen, submit }) {
  const [answer, setAnswer] = useState(question.answer || '');
  const [loading, setLoading] = useState(false); // Add loading state
  const { user, setUser, logout } = useContext(UserContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true before making the request

    try {
      const route = question.answer ? '/edit-answer' : '/save-answer';

      await submit(question.id, question.question, route, answer)

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
        setLoading(false);
    }
  };
  

  const getAnswerHelp = async () => {
    const proxyEndpoint = "http://localhost:3001/gpt-api-call";
    const data = {
      id: user.id,
      query: question.question,
      type: "help"
    };

    setLoading(true); // Set loading to true before making the request
    try {
      const response = await axios.post(proxyEndpoint, data);
      const result = response.data.answer;
      setAnswer(result);
    } catch (error) {
      console.error('Error getting answer help:', error);
    }
    setLoading(false); // Set loading to false after the request has completed
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
      onClick={closeModal}
    >
      <div className="bg-white rounded shadow-lg relative w-1/2 p-4">
        <h2 className="text-xl font-bold mb-4">{question.question}</h2>
        <textarea
          className="w-full h-32 p-2 border border-gray-300 rounded"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        ></textarea>
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
              <img
                className="h-8 w-8"
                src="https://icons8.com/preloaders/preloaders/1488/Iphone-spinner-2.gif"
                alt="Loading"
              />
            </div>
          )}
        <div className="flex justify-between mt-4">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={getAnswerHelp}
          >
            Help me answer
          </button>
          <div>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
              onClick={handleSubmit}
            >
              Save
            </button>
            <button
              className="bg-gray-300 text-black px-4 py-2 rounded"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuestionModal;
