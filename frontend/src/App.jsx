import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminLogs from './components/AdminLogs';

// Use env VITE_API_URL if set, or fallback to /api in production.
// In development this can be overridden with VITE_API_URL=http://localhost:4000.
const API_URL = import.meta.env.VITE_API_URL || '/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [isAdminView, setIsAdminView] = useState(localStorage.getItem('adminView') === 'true');

  // Keep state synchronized with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
    }
    localStorage.setItem('adminView', isAdminView ? 'true' : 'false');
  }, [token, username, isAdminView]);

  const handleLoginSuccess = (newToken, user, shouldOpenAdmin = false) => {
    setToken(newToken);
    setUsername(user);
    setIsAdminView(shouldOpenAdmin);
    // navigate to admin view if admin login, otherwise go to root
    try {
      window.history.replaceState({}, '', shouldOpenAdmin ? '/admin' : '/');
      window.location.reload();
    } catch (e) {
      // ignore
    }
  };

  const handleLogout = () => {
    setToken('');
    setUsername('');
    setIsAdminView(false);
  };

  // Basic client-side routing without react-router:
  // - /login -> Login page
  // - /admin -> Admin logs (protected)
  // - /      -> Dashboard (public)
  const pathname = window.location.pathname || '/';

  let content = null;
  if (pathname === '/login') {
    content = token && isAdminView ? <AdminLogs username={username} onLogout={handleLogout} API_URL={API_URL} /> : <Login onLoginSuccess={handleLoginSuccess} API_URL={API_URL} />;
  } else if (pathname === '/admin') {
    content = token && isAdminView ? <AdminLogs username={username} onLogout={handleLogout} API_URL={API_URL} /> : <Dashboard username={username} onLogout={handleLogout} API_URL={API_URL} />;
  } else {
    // root or other paths -> always show Dashboard
    content = <Dashboard username={username} onLogout={handleLogout} API_URL={API_URL} />;
  }

  return (
    <div className="bg-valorant-darker min-h-screen text-white select-none">
      {content}
    </div>
  );
}

export default App;
