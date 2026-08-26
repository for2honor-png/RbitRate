import { createContext, useContext } from 'react';

export const AppContext = createContext({
  state: {
    ready: false,
    hasServer: false,
    isLoggedIn: false,
    currentStaff: null,
    currentProperty: null,
  },
  setState: () => {},
});

export const useAppContext = () => useContext(AppContext);
