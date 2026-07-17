import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Lock, User, Eye, EyeOff, ShieldAlert, Terminal } from 'lucide-react';

const Login = ({ onLoginSuccess, API_URL }) => {
  const [isSetup, setIsSetup] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if system requires initial setup
  useEffect(() => {
    const checkSetup = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/setup-check`);
        setIsSetup(res.data.setupRequired);
      } catch (err) {
        console.error('Failed to check setup requirements', err);
      }
    };
    checkSetup();
  }, [API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSetup && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isSetup ? '/api/auth/register' : '/api/auth/login';
      const response = await axios.post(`${API_URL}${endpoint}`, {
        username,
        password
      });

      if (response.data && response.data.token) {
        onLoginSuccess(response.data.token, response.data.username);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-valorant-darker overflow-hidden px-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-valorant-red rounded-full filter blur-[150px] opacity-15 animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full filter blur-[150px] opacity-10 animate-pulse-slow"></div>
      
      {/* Visual Accent Box */}
      <div className="absolute top-0 right-0 w-32 h-1 bg-valorant-red"></div>
      <div className="absolute top-0 right-0 w-1 h-32 bg-valorant-red"></div>
      <div className="absolute bottom-0 left-0 w-32 h-1 bg-valorant-red"></div>
      <div className="absolute bottom-0 left-0 w-1 h-32 bg-valorant-red"></div>

      <div className="w-full max-w-md p-8 glass-panel rounded-2xl shadow-2xl relative z-10 border border-white/5">
        
        {/* Logo/Icon */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-valorant-red/10 rounded-2xl flex items-center justify-center border border-valorant-red/20 mb-3 shadow-[0_0_15px_rgba(255,70,85,0.2)]">
            <Terminal className="w-8 h-8 text-valorant-red" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-valorant-gold">
            VALORANT CHECKER
          </h1>
          <p className="text-valorant-gray text-xs mt-1">
            {isSetup ? 'Initial Dashboard Setup' : 'Local Administrator Portal'}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-valorant-red/10 border border-valorant-red/20 text-valorant-red p-3 rounded-lg text-sm mb-6 animate-shake">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              Dashboard Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-valorant-gray">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-valorant-gray">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-valorant-gray hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (only for setup) */}
          {isSetup && (
            <div>
              <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-valorant-gray">
                  <Lock className="w-5 h-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-valorant-red hover:bg-valorant-red-hover active:scale-[0.98] text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-valorant-red/20 tracking-wider uppercase text-sm transition-all flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : isSetup ? (
              'Create Admin Account'
            ) : (
              'Access Panel'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
