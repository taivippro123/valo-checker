import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User, Terminal, Mail, UserPlus, Globe, Eye } from 'lucide-react';
import translations from '../i18n';
import { toast } from 'sonner';

const Register = ({ onRegisterSuccess, API_URL }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('vn');
  const [showPassword, setShowPassword ] = useState(false)
  const t = translations[language] || translations.vn;

  const validateForm = () => {
    if (!fullName.trim()) {
      toast.error(t.register.fullNameRequired);
      return false;
    }
    if (!username.trim()) {
      toast.error(t.register.usernameRequired);
      return false;
    }
    if (username.length < 3 || username.length > 20) {
      toast.error(t.register.usernameLength);
      return false;
    }
    if (!email.trim()) {
      toast.error(t.register.emailRequired);
      return false;
    }
    if (!email.includes('@')) {
      toast.error(t.register.emailInvalid);
      return false;
    }
    if (!password) {
      toast.error(t.register.passwordRequired);
      return false;
    }
    if (password.length < 6) {
      toast.error(t.register.passwordLength);
      return false;
    }
    if (password !== confirmPassword) {
      toast.error(t.register.passwordMismatch);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        fullName,
        username,
        email,
        password,
        language
      });

      if (response.data && response.data.token) {
        onRegisterSuccess(response.data.token, response.data.username, response.data.role || 'user', response.data.language || language, response.data.fullName || '');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t.register.registerFailed);
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
            <UserPlus className="w-8 h-8 text-valorant-red" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-valorant-gold">
            {t.register.title}
          </h1>
          <p className="text-valorant-gray text-xs mt-1">
            {t.register.subtitle}
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

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              {t.register.fullName}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-valorant-gray">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={language === 'vn' ? 'Nguyễn Văn A' : 'John Doe'}
                className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              {t.register.username}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-valorant-gray">
                <Terminal className="w-5 h-5" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t.register.usernamePlaceholder}
                minLength={3}
                maxLength={20}
                className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
              />
            </div>
            <p className="text-xs text-valorant-gray mt-1">{t.register.usernameHint}</p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              {t.register.email}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-valorant-gray">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.register.emailPlaceholder}
                className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              {t.register.password}
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
                placeholder={t.register.passwordPlaceholder}
                minLength={6}
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
            <p className="text-xs text-valorant-gray mt-1">{t.register.passwordHint}</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-2">
              {t.register.confirmPassword}
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
                placeholder={t.register.passwordPlaceholder}
                className="w-full bg-valorant-dark border border-white/10 rounded-lg py-2.5 pl-10 pr-10 text-white placeholder-valorant-gray/60 focus:outline-none focus:border-valorant-red focus:ring-1 focus:ring-valorant-red/30 transition-all"
              />
            </div>
          </div>

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
                {t.register.processing}
              </span>
            ) : (
              t.register.registerButton
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-valorant-gray text-sm">
            {t.register.hasAccount}{' '}
            <button
              type="button"
              onClick={() => window.location.href = '/login'}
              className="text-valorant-red hover:text-valorant-red-hover font-semibold transition-colors"
            >
              {t.register.loginLink}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
