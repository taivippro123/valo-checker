import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// Use env VITE_API_URL if set, or fallback to current origin host or localhost:5000
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  // Keep state synchronized with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
    }
  }, [token, username]);

  const handleLoginSuccess = (newToken, user) => {
    setToken(newToken);
    setUsername(user);
  };

  const handleLogout = () => {
    setToken('');
    setUsername('');
  };

  return (
    <div className="bg-valorant-darker min-h-screen text-white select-none">
      {token ? (
        <Dashboard 
          username={username} 
          onLogout={handleLogout} 
          API_URL={API_URL} 
        />
      ) : (
        <Login 
          onLoginSuccess={handleLoginSuccess} 
          API_URL={API_URL} 
        />
      )}
    </div>
  );
}

export default App;
