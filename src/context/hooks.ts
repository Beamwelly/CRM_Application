import { createContext, useContext } from 'react';
import { CRMContextType } from './CRMContext';

// Create the context itself
export const CRMContext = createContext<CRMContextType | undefined>(undefined);

// Create the custom hook to access the context
export const useCRM = () => {
  const context = useContext(CRMContext);
  if (context === undefined) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
}; 