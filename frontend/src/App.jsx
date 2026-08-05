import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminLogs from './components/AdminLogs';
import UserLogs from './components/UserLogs';
import Guide from './components/Guide';
import { Analytics } from "@vercel/analytics/react"
import { Toaster } from 'sonner'
// Use env VITE_API_URL if set, otherwise default to local backend in development.
const rawApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const API_URL = rawApiUrl ?? (import.meta.env.DEV ? 'http://localhost:4000' : '');

function AppContent() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [fullName, setFullName] = useState(localStorage.getItem('fullName') || '');
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'user');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const navigate = useNavigate();

  // Keep state synchronized with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);
      localStorage.setItem('fullName', fullName);
      localStorage.setItem('userRole', userRole);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('fullName');
      localStorage.removeItem('userRole');
    }
    localStorage.setItem('language', language);
  }, [token, username, fullName, userRole, language]);

  const handleLoginSuccess = (newToken, user, role = 'user', language = 'en', userFullName = '') => {
    setToken(newToken);
    setUsername(user);
    setFullName(userFullName);
    setUserRole(role);
    setLanguage(language);
    // redirect based on role
    const targetPath = role === 'admin' ? '/admin' : '/user';
    navigate(targetPath);
  };

  const handleLogout = () => {
    setToken('');
    setUsername('');
    setUserRole('user');
    navigate('/');
  };

  return (
    <Routes>
      <Route path="/" element={<Dashboard username={username} fullName={fullName} onLogout={handleLogout} API_URL={API_URL} />} />
      <Route path="/guide" element={<Guide />} />
      <Route 
        path="/login" 
        element={
          token 
            ? (userRole === 'admin' 
              ? <Navigate to="/admin" replace /> 
              : <Navigate to="/user" replace />)
            : <Login onLoginSuccess={handleLoginSuccess} API_URL={API_URL} />
        } 
      />
      <Route 
        path="/register" 
        element={
          token 
            ? (userRole === 'admin' 
              ? <Navigate to="/admin" replace /> 
              : <Navigate to="/user" replace />)
            : <Register onRegisterSuccess={handleLoginSuccess} API_URL={API_URL} />
        } 
      />
      <Route 
        path="/admin" 
        element={
          token && userRole === 'admin' 
            ? <AdminLogs username={username} onLogout={handleLogout} API_URL={API_URL} /> 
            : <Navigate to="/" replace />
        } 
      />
      <Route 
        path="/user" 
        element={
          token && userRole === 'user' 
            ? <UserLogs username={username} fullName={fullName} onLogout={handleLogout} API_URL={API_URL} /> 
            : <Navigate to="/" replace />
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="bg-valorant-darker min-h-screen text-white select-none">
        <AppContent />
        <Analytics />
        <Toaster position="top-right" richColors closeButton />
      </div>
    </BrowserRouter>
  );
}

export default App;
