import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, ShieldAlert, KeyRound, User, Tag, HelpCircle, 
  Sparkles, RefreshCw, ExternalLink
} from 'lucide-react';
import translations from '../i18n';

const AccountForm = ({ isOpen, onClose, onSave, accountToEdit, API_URL, language = 'vn' }) => {
  const [authMode, setAuthMode] = useState('token'); // 'token' or 'credentials'
  const t = translations[language] || translations.vn;
  const [alias, setAlias] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [cookieString, setCookieString] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (accountToEdit) {
      setAuthMode(accountToEdit.authMode || 'credentials');
      setAlias(accountToEdit.alias || '');
      setUsername(accountToEdit.username || '');
      setPassword('');
      setRedirectUrl('');
      setCookieString('');
    } else {
      setAuthMode('token');
      setAlias('');
      setUsername('');
      setPassword('');
      setRedirectUrl('');
      setCookieString('');
    }
    setError('');
    setLoading(false);
  }, [accountToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle saving of both credentials and token accounts
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!alias.trim()) {
      setError(t.accountAliasRequired);
      setLoading(false);
      return;
    }

    if (authMode === 'token') {
      if (!redirectUrl.trim() && !cookieString.trim()) {
        setError(t.cookieOrRedirectRequired);
        setLoading(false);
        return;
      }
      if (redirectUrl.trim() && (!redirectUrl.includes('playvalorant.com') || !redirectUrl.includes('access_token='))) {
        setError(t.invalidUrlFormat);
        setLoading(false);
        return;
      }
      if (cookieString.trim() && !cookieString.includes('ssid=')) {
        setError(t.invalidCookieString);
        setLoading(false);
        return;
      }
    } else {
      if (!username.trim()) {
        setError(t.riotUsernameRequired);
        setLoading(false);
        return;
      }
      if (!accountToEdit && !password.trim()) {
        setError(t.riotPasswordRequired);
        setLoading(false);
        return;
      }
    }

      try {
        // Build payload and delegate actual API request to parent via onSave
        const data = {
          alias: alias.trim(),
          authMode
        };

        if (authMode === 'token') {
          if (redirectUrl.trim()) data.redirectUrl = redirectUrl.trim();
          if (cookieString.trim()) data.cookieString = cookieString.trim();
        } else {
          data.username = username.trim();
          if (password.trim()) data.password = password.trim();
        }

        // Parent will perform the network request (create or update)
        await onSave(data);
        onClose();
      } catch (err) {
        setError(err.response?.data?.message || err.message || t.saveFailed);
      } finally {
        setLoading(false);
      }
  };

  const handleOpenRiotPortal = () => {
    const url = 'https://auth.riotgames.com/authorize?client_id=play-valorant-web-prod&nonce=1&redirect_uri=https://playvalorant.com/opt_in&response_type=token%20id_token&scope=openid%20link%20ban%20lol_region&prompt=login';
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg glass-panel rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-valorant-dark">
          <h3 className="text-lg font-bold uppercase tracking-wider text-valorant-gold flex items-center gap-2">
            {accountToEdit ? t.editAccount : t.addAccount}
          </h3>
          <button 
            onClick={onClose}
            className="text-valorant-gray hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-3 bg-valorant-red/10 border border-valorant-red/20 text-valorant-red p-3 rounded-lg text-sm animate-shake">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Setup tab switch (only when adding new account) */}
          {!accountToEdit && (
            <div className="grid grid-cols-1 p-1 bg-valorant-darker rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setAuthMode('token')}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 ${
                  authMode === 'token'
                    ? 'bg-valorant-red text-white shadow-md'
                    : 'text-valorant-gray hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> {t.riotRedirect}
              </button>
            </div>
          )}

          {/* Alias */}
          <div>
            <label className="text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> {t.alias}
            </label>
            <input
              type="text"
              required
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="e.g. My Main Acc, Smurf 1"
              disabled={loading}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/40 focus:outline-none focus:border-valorant-red transition-colors disabled:opacity-50"
            />
          </div>

          {/* Dynamic layout based on authMode */}
          {authMode === 'token' ? (
            /* POPUP REDIRECT URL VIEW */
            <div className="space-y-4 pt-2">
              {accountToEdit && (
                <div className="bg-valorant-dark/40 border border-white/5 rounded-lg p-3 text-xs">
                  <span className="text-valorant-gray block">{t.associatedRiotId}</span>
                  <span className="text-white font-bold tracking-wide text-sm">{username}</span>
                </div>
              )}

              {/* Step 1: Open Tab */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-valorant-gold uppercase">
                  1. {t.openRiotPortal}
                </label>
                <button
                  type="button"
                  onClick={handleOpenRiotPortal}
                  disabled={loading}
                  className="w-full bg-valorant-dark border border-white/15 hover:border-white/30 text-white font-semibold py-2 px-4 rounded-lg tracking-wide text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-valorant-red" />
                  {t.openRiotPortal}
                </button>
              </div>

              {/* Step 2: Paste Redirect URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-valorant-gold uppercase">
                  2. {t.pasteRedirectUrl}
                </label>
                <textarea
                  rows="3"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="Dán toàn bộ địa chỉ URL chuyển hướng tại đây (bắt đầu bằng https://playvalorant.com/opt_in#access_token=...)"
                  disabled={loading}
                  className="w-full bg-valorant-darker border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-valorant-gray/30 focus:outline-none focus:border-valorant-red transition-colors disabled:opacity-50 font-mono"
                />
                <p className="text-[10px] text-valorant-gray leading-relaxed">
                  {t.redirectHelp}
                </p>
              </div>

              {/* Step 3: Or paste Riot session cookie string */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-valorant-gold uppercase">
                  3. {t.pasteCookieString}
                </label>
                <textarea
                  rows="3"
                  value={cookieString}
                  onChange={(e) => setCookieString(e.target.value)}
                  placeholder="ssid=...; csid=...; clid=as1"
                  disabled={loading}
                  className="w-full bg-valorant-darker border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-valorant-gray/30 focus:outline-none focus:border-valorant-red transition-colors disabled:opacity-50 font-mono"
                />
                <p className="text-[10px] text-valorant-gray leading-relaxed">
                  {t.cookieStringHelp}
                </p>
              </div>
            </div>
          ) : (
            /* STANDARD CREDENTIALS LOGIN FORM */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> {t.riotUsername}
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.usernamePlaceholder}
                    disabled={loading}
                    className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/40 focus:outline-none focus:border-valorant-red transition-colors disabled:opacity-50"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="text-xs font-semibold tracking-wider text-valorant-gold uppercase mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> {t.riotPassword}
                  </label>
                  <input
                    type="password"
                    required={!accountToEdit}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={accountToEdit ? t.leaveEmpty : t.passwordPlaceholder}
                    disabled={loading}
                    className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/40 focus:outline-none focus:border-valorant-red transition-colors disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-lg text-sm font-semibold tracking-wider uppercase text-valorant-gold transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-valorant-red hover:bg-valorant-red-hover text-white rounded-lg text-sm font-semibold tracking-wider uppercase shadow-md transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
            >
              {loading ? (
                <RefreshCw className="animate-spin h-4 w-4 text-white" />
              ) : (
                accountToEdit && authMode === 'token' ? t.refreshTokenButton : t.saveButton
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountForm;
