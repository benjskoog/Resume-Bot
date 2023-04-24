import React, { createContext, useState, useEffect } from "react";

const UserContext = createContext();

export const UserProvider = ({ children, resetStates }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add a loading state

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false); // Set loading to false after fetching the user from localStorage
  }, []);

  const updateUser = (newUser) => {
    console.log("updateUser called with:", newUser);
    setUser(newUser);
    if (newUser) {
      console.log("Setting user in localStorage");
      localStorage.setItem("user", JSON.stringify(newUser));
    } else {
      console.log("Removing user from localStorage");
      localStorage.removeItem("user");
    }
  };

  const logout = () => {
    setUser(null);
    resetStates();
    localStorage.removeItem("user");
  };

  return (
    <UserContext.Provider value={{ user, setUser: updateUser, loading, logout }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;