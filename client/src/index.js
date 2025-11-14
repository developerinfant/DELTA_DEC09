import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './theme.css'; // Add our new theme CSS
import App from './App';
import { AuthProvider } from './context/AuthContext'; 

const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);