import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Lock, User, Terminal, Globe, Eye, EyeOff } from 'lucide-react';
import translations from '../i18n';
import { toast } from 'sonner';

const Login = ({ onLoginSuccess, API_URL }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [language, setLanguage] = useState('vn');
  const [showPassword, setShowPassword ] = useState(false)
  const t = translations[language] || translations.vn;
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const resetCloseTimerRef = useRef(null);

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

  useEffect(() => {
    return () => {
      if (resetCloseTimerRef.current) {
        clearTimeout(resetCloseTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (isSetup && password !== confirmPassword) {
      toast.error(t.login.passwordMismatch);
      setLoading(false);
      return;
    }

    try {
      const endpoint = isSetup ? '/api/auth/setup' : '/api/auth/login';
      const response = await axios.post(`${API_URL}${endpoint}`, {
        username,
        password
      });

      if (response.data && response.data.token) {
        onLoginSuccess(response.data.token, response.data.username, response.data.role || 'user', response.data.language || 'en', response.data.fullName || '');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t.login.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, {
        identifier: resetIdentifier
      });
      setResetOtpSent(true);
      toast.success(t.login.otpSent);
    } catch (err) {
      toast.error(err.response?.data?.message || t.login.resetRequestFailed);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (resetPassword !== resetConfirmPassword) {
      toast.error(t.login.passwordMismatch);
      return;
    }

    setResetLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/reset-password`, {
        identifier: resetIdentifier,
        otp: resetOtp,
        newPassword: resetPassword
      });

      toast.success(response.data?.message || t.login.resetSuccess);
      setResetOtpSent(false);
      setResetOtp('');
      setResetPassword('');
      setResetConfirmPassword('');
      if (resetCloseTimerRef.current) {
        clearTimeout(resetCloseTimerRef.current);
      }
      resetCloseTimerRef.current = setTimeout(() => {
        setShowResetPanel(false);
        setResetIdentifier('');
        setResetOtp('');
        setResetPassword('');
        setResetConfirmPassword('');
        setResetOtpSent(false);
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || t.login.resetPasswordFailed);
    } finally {
      setResetLoading(false);
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
            {t.login.title}
          </h1>
          <p className="text-valorant-gray text-xs mt-1">
            {isSetup ? t.login.initialSetup : t.login.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Language Selector */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              {t.register.language}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-valorant-gray">
                <Globe className="w-5 h-5" />
              </span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
              >
                <option value="en">English</option>
                <option value="vn">Tiếng Việt</option>
              </select>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              {t.login.username}
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
                placeholder={t.login.usernamePlaceholder}
                className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              {t.login.password}
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
                placeholder={t.login.passwordPlaceholder}
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

          {/* Confirm Password (setup only) */}
          {isSetup && (
            <div>
              <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
                {t.login.confirmPassword}
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
                  placeholder={t.login.passwordPlaceholder}
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
                {t.login.processing}
              </span>
            ) : isSetup ? (
              t.login.createAdminButton
            ) : (
              t.login.loginButton
            )}
          </button>
        </form>

        {!isSetup && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                if (resetCloseTimerRef.current) {
                  clearTimeout(resetCloseTimerRef.current);
                  resetCloseTimerRef.current = null;
                }
                setShowResetPanel((prev) => !prev);
              }}
              className="w-full text-center text-sm text-valorant-gray hover:text-white transition-colors"
            >
              {showResetPanel ? t.login.backToLogin : t.login.forgotPassword}
            </button>
          </div>
        )}

        {!isSetup && showResetPanel && (
          <div className="mt-5 rounded-xl border border-white/10 bg-valorant-dark/80 p-4 space-y-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-valorant-gold">{t.login.resetPasswordTitle}</h2>
              <p className="text-xs text-valorant-gray mt-1">{t.login.resetPasswordSubtitle}</p>
            </div>

            <form onSubmit={resetOtpSent ? handleResetPassword : handleSendResetOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
                  {t.login.identifier}
                </label>
                <input
                  type="text"
                  value={resetIdentifier}
                  onChange={(e) => setResetIdentifier(e.target.value)}
                  placeholder={t.login.identifierPlaceholder}
                  className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
                />
              </div>

              {resetOtpSent && (
                <>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
                      {t.login.otp}
                    </label>
                    <input
                      type="text"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value)}
                      placeholder={t.login.otpPlaceholder}
                      className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all tracking-[0.4em] text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
                      {t.login.newPassword}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder={t.login.newPasswordPlaceholder}
                      className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
                      {t.login.confirmNewPassword}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder={t.login.newPasswordPlaceholder}
                      className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 px-4 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={resetLoading || !resetIdentifier.trim()}
                className="w-full bg-valorant-dark hover:bg-valorant-dark-hover active:scale-[0.98] text-white font-bold py-3 rounded-lg border border-white/10 tracking-wider uppercase text-sm transition-all flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none"
              >
                {resetLoading
                  ? t.login.processing
                  : resetOtpSent
                    ? t.login.resetPassword
                    : t.login.sendOtp}
              </button>
            </form>
          </div>
        )}

        {/* Register Link - only show if not in setup mode */}
        {!isSetup && (
          <div className="mt-6 text-center">
            <p className="text-valorant-gray text-sm">
              {t.login.hasAccount}{' '}
              <button
                type="button"
                onClick={() => window.location.href = '/register'}
                className="text-valorant-red hover:text-valorant-red-hover font-semibold transition-colors"
              >
                {t.login.registerLink}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
