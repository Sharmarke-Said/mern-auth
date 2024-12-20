import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";

// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext();

export const AppContextProvider = (props) => {
  // const backendUrl = import.meta.env.VITE_BACKEND_URL;
  // console.log(
  //   "Environment Backend URL:",
  //   import.meta.env.VITE_BACKEND_URL
  // );

  axios.defaults.withCredentials = true;

  const BACKEND_URL = "http://localhost:4000";
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(false);

  // Get user data
  const getUserData = async () => {
    try {
      const { data } = await axios.get(
        BACKEND_URL + "/api/user/data"
      );
      data.success
        ? setUserData(data.userData)
        : toast.error(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getAuthState = async () => {
    try {
      const { data } = await axios.get(
        BACKEND_URL + "/api/auth/is-auth"
      );
      if (data.success) {
        setIsLoggedIn(true);
        getUserData();
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    getAuthState();
  });

  const value = {
    BACKEND_URL,
    isLoggedIn,
    setIsLoggedIn,
    userData,
    setUserData,
    getUserData,
  };
  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};
