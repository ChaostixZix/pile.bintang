import React, { useState, createContext, useContext, useEffect } from 'react';

export const NavContext = createContext();

export function NavContextProvider({ children }) {
  const [nav, setNav] = useState([]);

  const navContextValue = {
    setNav,
  };

  return (
    <NavContext.Provider value={navContextValue}>
      {children}
    </NavContext.Provider>
  );
}

export const useNavContext = useContext(NavContext);
