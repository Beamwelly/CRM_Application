import React from 'react';
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx'
import './index.css'
import { CRMProvider } from './context/CRMContext';

// Read the Client ID from environment variables
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Check if the environment variable is set
if (!googleClientId) {
  console.error("FATAL ERROR: VITE_GOOGLE_CLIENT_ID environment variable is not set!");
  // Optionally render an error message instead of the app
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <BrowserRouter>
        <CRMProvider>
          <App />
        </CRMProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
