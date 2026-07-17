import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LogOut, Plus, RefreshCw, Terminal, Heart, 
  HelpCircle, ShieldCheck, Activity, BellRing
} from 'lucide-react';
import AccountList from './AccountList';
import AccountForm from './AccountForm';
import WishlistSelector from './WishlistSelector';
import { Globe } from 'lucide-react';
import translations from '../i18n';

const Dashboard = ({ onLogout, API_URL, username }) => {
  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [serverHealth, setServerHealth] = useState({ ok: false, message: 'Checking...' });
  const [language, setLanguage] = useState('vn');
  const t = translations[language] || translations.vn;
  const [autoCheckAccountId, setAutoCheckAccountId] = useState(null);

  const fetchAccounts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/accounts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(res.data);
      
      // Keep active account ref updated if already selected
      if (activeAccount) {
        const updatedActive = res.data.find(acc => acc._id === activeAccount._id);
        setActiveAccount(updatedActive || null);
      }
    } catch (err) {
      console.error('Failed to retrieve accounts', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const checkHealth = async () => {
    try {
      const res = await axios.get(`${API_URL}/health`);
      if (res.data && res.data.status === 'OK') {
        setServerHealth({ ok: true, message: 'Active & Monitoring' });
      }
    } catch (err) {
      setServerHealth({ ok: false, message: 'Offline / Connecting...' });
    }
  };

  useEffect(() => {
    fetchAccounts();
    checkHealth();
    
    // Refresh health status every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [API_URL]);

  const handleCreateOrUpdateAccount = async (accountData) => {
    const token = localStorage.getItem('token');
    if (accountToEdit) {
      // Update
      const res = await axios.put(`${API_URL}/api/accounts/${accountToEdit._id}`, accountData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Replace in array
      setAccounts(prev => prev.map(acc => acc._id === res.data._id ? res.data : acc));
      if (activeAccount?._id === res.data._id) {
        setActiveAccount(res.data);
      }
    } else {
      // Create
      const res = await axios.post(`${API_URL}/api/accounts`, accountData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccounts(prev => [...prev, res.data]);
      // trigger auto-check in AccountList
      setAutoCheckAccountId(res.data._id);
    }
    setAccountToEdit(null);
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to remove this Riot account? This will also delete its local wishlist settings.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/accounts/${accountId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAccounts(prev => prev.filter(acc => acc._id !== accountId));
      if (activeAccount?._id === accountId) {
        setActiveAccount(null);
      }
    } catch (err) {
      console.error('Failed to delete account', err);
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAccountChecked = (accountId, offers) => {
    // Silently refresh accounts array to capture updated lastChecked dates
    fetchAccounts(true);
  };

  const handleWishlistUpdated = (updatedAccount) => {
    setAccounts(prev => prev.map(acc => acc._id === updatedAccount._id ? updatedAccount : acc));
    setActiveAccount(updatedAccount);
  };

  return (
    <div className="min-h-screen bg-valorant-darker flex flex-col">
      {/* Header Banner */}
      <header className="glass-panel border-b border-white/5 px-6 py-4 shrink-0 relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-valorant-red/10 rounded-xl flex items-center justify-center border border-valorant-red/20 shadow-[0_0_10px_rgba(255,70,85,0.15)]">
              <Terminal className="w-5 h-5 text-valorant-red" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-widest uppercase text-valorant-gold">
                VALORANT CHECKER
              </h1>
              <p className="text-[10px] text-valorant-gray font-mono mt-0.5 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${serverHealth.ok ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${serverHealth.ok ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </span>
                System: {serverHealth.message}
              </p>
            </div>
          </div>

          {/* Action Header Panel */}
          <div className="flex items-center justify-between md:justify-end gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-valorant-gold/70" />
                <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded ${language==='en' ? 'bg-valorant-red text-white' : 'text-valorant-gray hover:text-white'}`}>EN</button>
                <button onClick={() => setLanguage('vn')} className={`px-2 py-1 rounded ${language==='vn' ? 'bg-valorant-red text-white' : 'text-valorant-gray hover:text-white'}`}>VN</button>
              </div>

              <div className="text-left md:text-right">
                <p className="text-[10px] text-valorant-gray uppercase tracking-wider">{t.dashboardUser}</p>
                <p className="text-xs font-semibold text-white/95">{username}</p>
              </div>
              
              <button
                onClick={onLogout}
                className="flex items-center gap-2 border border-white/10 hover:border-valorant-red/30 text-valorant-gold hover:text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-valorant-red/10 transition-all active:scale-[0.98]"
              >
                <LogOut className="w-4 h-4 text-valorant-red" />
                {t.signOut}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Riot Account list (5 columns wide) */}
        <section className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-valorant-gold flex items-center gap-2">
              <Activity className="w-4 h-4 text-valorant-red" /> {t.addAccount}
            </h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => fetchAccounts(false)}
                disabled={loading}
                title="Refresh lists"
                className="p-2 border border-white/5 hover:border-white/10 text-valorant-gray hover:text-white rounded-lg bg-valorant-dark/40 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => {
                  setAccountToEdit(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-1.5 bg-valorant-red hover:bg-valorant-red-hover text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-valorant-red/10 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" /> {t.addAccount}
              </button>
            </div>
          </div>

          <AccountList
            accounts={accounts}
            activeAccountId={activeAccount?._id}
            onSelectAccount={(acc) => setActiveAccount(acc)}
            onEditAccount={(acc) => {
              setAccountToEdit(acc);
              setIsFormOpen(true);
            }}
            onDeleteAccount={handleDeleteAccount}
            onAccountChecked={handleAccountChecked}
            API_URL={API_URL}
            language={language}
            autoCheckAccountId={autoCheckAccountId}
            onAutoCheckComplete={() => setAutoCheckAccountId(null)}
          />

          {/* Quick tips panel */}
          <div className="glass-panel rounded-xl p-4 border border-white/5 text-xs text-valorant-gray leading-relaxed space-y-2">
            <h4 className="font-bold text-white flex items-center gap-1.5 uppercase tracking-wide text-[10px] text-valorant-gold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {t.systemInfoSetup}
            </h4>
            <p>
              {t.quickTip1}
            </p>
            <p>
              {t.quickTip2}
            </p>
            <p className="flex items-center gap-1 font-mono text-[9px] text-valorant-gray/60">
              <BellRing className="w-3 h-3 text-blue-400" /> {t.quickTip3} 
              <a href="https://ntfy.sh" target="_blank" rel="noreferrer" className="underline hover:text-white">https://ntfy.sh/&#123;topic&#125;</a>
            </p>
          </div>
        </section>

        {/* Right Column: Wishlist selector (7 columns wide) */}
        <section className="lg:col-span-7">
          <WishlistSelector
            activeAccount={activeAccount}
            onWishlistUpdated={handleWishlistUpdated}
            API_URL={API_URL}
            language={language}
          />
        </section>

      </main>

      {/* Account Creation Modal Form */}
      <AccountForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setAccountToEdit(null);
        }}
        onSave={handleCreateOrUpdateAccount}
        accountToEdit={accountToEdit}
        API_URL={API_URL}
        language={language}
      />
    </div>
  );
};

export default Dashboard;
