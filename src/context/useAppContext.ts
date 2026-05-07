import { useContext } from 'react';
import { AppContext } from './AppContext';
import type { AppContextType } from './AppContext';

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
