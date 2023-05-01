import React, { useState, useContext } from 'react';
import axios from 'axios';
import UserContext from './UserContext';
import { Navigate } from 'react-router-dom';

function UserSettings() {
  const { user, setUser, updateUserPassword } = useContext(UserContext);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleCheckboxChange = () => {
    setShowPasswordFields(!showPasswordFields);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (showPasswordFields && newPassword !== '' && newPassword === confirmNewPassword) {
      try {
        const response = await axios.put('http://localhost:3001/update-password', {
          email: user.email,
          newPassword: newPassword,
        });

        if (response.data.type === 'success') {
          setMessage('Password updated successfully');
          updateUserPassword(newPassword);
        } else {
          setError('Error updating password');
        }
      } catch (error) {
        console.error('Error updating password:', error);
        setError('Error updating password');
      }
    } else {
      setError("Please fill out the new password and confirm new password fields or uncheck the 'Change password' checkbox.");
    }
  };


  return (
    <div className="flex flex-col items-center max-w-full">
        <form className="mt-8 w-full max-w-2xl">
    <div class="mb-6">
        <label for="firstName" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">First name</label>
        <input type="text" id="firstName" value={user.first_name} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="" required></input>
    </div>
    <div class="mb-6">
        <label for="lastName" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Last name</label>
        <input type="text" id="lastName" value={user.last_name} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="" required></input>
    </div>
    <div class="mb-6">
        <label for="email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your email</label>
        <input type="email" id="email" value={user.email} readOnly class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="" required></input>
    </div>
    <div class="flex items-start mb-6">
          <div class="flex items-center h-5">
            <input
              id="remember"
              type="checkbox"
              value=""
              class="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-blue-300 dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:focus:ring-offset-gray-800"
              onChange={handleCheckboxChange}
            ></input>
          </div>
          <label for="remember" class="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
            Change password
          </label>
        </div>
        {showPasswordFields && (
          <>
            <div class="mb-6">
                <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Your password</label>
                <div class="relative">
                    <input
                        type={showCurrentPassword ? "text" : "password"}
                        id="password"
                        value={user.password}
                        class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                        required
                        />
                    <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        class="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-400 dark:text-white"
                        >
                    {showCurrentPassword ? "Hide password" : "Show password"}
                    </button>
                </div>
                </div>
            <div class="mb-6">
                <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">New password</label>
                <input type="password" id="newpassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required></input>
            </div>
            <div class="mb-6">
                <label for="password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Confirm new password</label>
                <input type="password" id="confirmpassword" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" required></input>
            </div>
          </>
        )}
    <button
        onClick={handleSave}
        className="inline-block rounded bg-blue-500 px-6 pb-2 pt-2.5 mr-2 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]"
        data-te-ripple-init
        data-te-ripple-color="light"
        >
        Save
    </button>
    </form>
    {message &&
        <div class="rounded-lg bg-green-100 px-6 py-3 mt-5 text-base text-gray-500" role="alert">
            {message}
        </div>
        }
    {error &&
        <div class="b-4 rounded-lg bg-red-100 px-6 py-3 mt-5 text-base text-red-800" role="alert">
            {error}
        </div>
        }
  </div>
  );
}

export default UserSettings;
