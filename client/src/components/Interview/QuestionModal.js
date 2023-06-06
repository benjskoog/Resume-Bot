import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import UserContext from '../User/UserContext';

function QuestionModal({ question, closeModal, setIsModalOpen, submit }) {
  const [answer, setAnswer] = useState(question.answer || '');
  const [recommendation, setRecommendation] = useState(question.recommendation || '');
  const [loading, setLoading] = useState(false);
  const { user, setUser, logout } = useContext(UserContext);

  const backendUrl = process.env.REACT_APP_BACKEND_URL|| "http://localhost:3001";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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
    const proxyEndpoint = `${backendUrl}/get-answer-help`;
    const data = {
      id: user.id,
      question_id: question.id,
      question_answer: question.answer,
      query: question.question,
      job_id: question.job_id,
      type: "help"
    };

    setLoading(true); // Set loading to true before making the request
    try {
      const response = await axios.post(proxyEndpoint, data);
      console.log(response.data)
      const result = response.data.answer;
      setAnswer(result);
      setRecommendation(response.data.recommendation)
    } catch (error) {
      console.error('Error getting answer help:', error);
    }
    setLoading(false); // Set loading to false after the request has completed
  };

  const improveAnswer = async () => {
    const proxyEndpoint = `${backendUrl}/improve-answer`;
    const data = {
      id: user.id,
      question_id: question.id,
      question_answer: question.answer,
      query: question.question,
      job_id: question.job_id,
      type: "improve"
    };
  
    setLoading(true); // Set loading to true before making the request
    try {
      const response = await axios.post(proxyEndpoint, data);
      console.log(response.data)
      const result = response.data.answer;
      setAnswer(result);
      setRecommendation(response.data.recommendation)
    } catch (error) {
      console.error('Error improving answer:', error);
    }
    setLoading(false); // Set loading to false after the request has completed
  };

  useEffect(() => {
    if (question.recommendation) {
      setRecommendation(question.recommendation);
    }
  }, [question.recommendation]);

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
        <p className="mt-2 text-sm text-gray-600">{recommendation}</p>
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50">
              <div class="w-12 h-12 mt-4 rounded-full animate-spin border-y-2 border-solid border-gray-900 border-t-transparent"></div>
            </div>
          )}
        <div className="flex justify-between mt-4">
          <div>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded mr-2"
            onClick={getAnswerHelp}
          >
            Help me answer
          </button>
          <button
            className="bg-green-500 text-white px-4 py-2 rounded"
            onClick={improveAnswer}
          >
            Improve my answer
          </button>
          </div>
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
