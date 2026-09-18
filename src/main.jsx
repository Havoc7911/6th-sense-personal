import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import App from './App.jsx'
import './index.css'

const rootEl = document.getElementById('root');

try {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
} catch (err) {
  console.error('MOUNT ERROR:', err);
  document.body.innerHTML = '<pre style="color:red;padding:2rem;background:#222;font-size:16px">' + err.stack + '</pre>';
}
