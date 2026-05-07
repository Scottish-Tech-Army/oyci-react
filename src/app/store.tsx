import React, { createContext, useContext } from "react";

interface AppStore {
  // Add your global state properties here
}

const AppStoreContext = createContext<AppStore>({});

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AppStoreContext.Provider value={{}}>
      {children}
    </AppStoreContext.Provider>
  );
};

export const useAppStore = () => useContext(AppStoreContext);