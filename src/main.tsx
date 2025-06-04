import React from 'react';
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx'
import './index.css'
import { CRMProvider } from './context/CRMContext';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CRMProvider>
        <App />
      </CRMProvider>
    </BrowserRouter>
  </React.StrictMode>
);
