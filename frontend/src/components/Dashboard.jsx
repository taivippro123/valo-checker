import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, Terminal, Globe, ShieldCheck, Activity, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import translations from '../i18n';
import FAQ from './FAQ';
import Footer from './Footer';

const Dashboard = ({ onLogout, API_URL, username }) => {
  const [redirectUrl, setRedirectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverHealth, setServerHealth] = useState({ ok: false, message: 'Checking...' });
  const [language, setLanguage] = useState('en');
  const [storefront, setStorefront] = useState(null);
  const [error, setError] = useState('');
  const [riotId, setRiotId] = useState('');
  const [shard, setShard] = useState('');
  const t = translations[language] || translations.vn;

  const checkHealth = async () => {
    try {
      const res = await axios.get(`${API_URL}/health`);
      if (res.data && res.data.status === 'OK') {
        setServerHealth({ ok: true, message: 'Active' });
      }
    } catch (err) {
      setServerHealth({ ok: false, message: 'Offline' });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!redirectUrl.trim()) {
      setError(t.redirectUrlRequired);
      return;
    }

    if (!redirectUrl.trim().startsWith('https://playvalorant.com/')) {
      setError(t.redirectUrlPrefixInvalid);
      return;
    }

    setLoading(true);
    setStorefront(null);

    try {
      const res = await axios.post(`${API_URL}/api/store/check`, { redirectUrl });
      setStorefront(res.data.storefront || null);
      setRiotId(res.data.riotId || '');
      setShard(res.data.shard || '');
      // clear the input after successful check
      setRedirectUrl('');
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      const mappedMessage = serverMessage === 'Please provide a Riot redirect URL containing an access_token.'
        ? t.redirectUrlAccessTokenRequired
        : serverMessage === 'The provided access token is invalid.'
          ? t.invalidAccessToken
          : serverMessage || t.storeCheckFailed;
      setError(mappedMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStorefront = () => {
    if (!storefront) return null;

    const sections = [];
    const renderCard = (item, label, priceText, priceInfo = {}) => {
      const meta = item.metadata || {};
      return (
        <div className="p-3 rounded-2xl border bg-valorant-dark border-white/5 text-center flex flex-col justify-between min-h-[16rem]">
          <div className="relative h-40 w-full flex items-center justify-center p-2 mb-3 rounded-2xl bg-black/10 overflow-hidden">
            {meta.displayIcon ? <img src={meta.displayIcon} alt={meta.displayName} className="h-full w-full object-contain" /> : <span className="text-sm text-valorant-gray">No image</span>}
            {priceInfo.discountPercent ? (
              <span className="absolute top-2 left-2 rounded-full bg-valorant-red text-[10px] font-semibold uppercase tracking-[0.12em] text-white px-2 py-0.5 shadow-sm">-{priceInfo.discountPercent}%</span>
            ) : null}
            {meta.contentTier?.displayIcon ? (
              <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-white/10 ring-1 ring-white/20 shadow-[0_0_8px_rgba(0,0,0,0.25)] p-[2px] backdrop-blur-sm">
                <img src={meta.contentTier.displayIcon} alt={meta.contentTier.displayName || 'Tier'} className="h-full w-full object-contain rounded-full" />
              </div>
            ) : null}
          </div>
          <div className="text-sm font-bold text-white tracking-wide whitespace-normal break-words min-h-[4rem] leading-snug">
            <span className="block">{meta.displayName || label || 'Unknown'}</span>
          </div>
          {priceInfo.discountPercent ? (
            <div className="mt-2 flex flex-col items-center gap-1">
              {priceInfo.discountedPrice ? <span className="text-sm font-bold text-white">{priceInfo.discountedPrice} VP</span> : null}
              {priceInfo.basePrice ? <span className="text-[11px] text-valorant-gray line-through">{priceInfo.basePrice} VP</span> : null}
            </div>
          ) : priceText ? <div className="text-xs text-valorant-gray mt-2">{priceText}</div> : null}
        </div>
      );
    };

    if (storefront.featuredBundle?.items?.length) {
      sections.push(
        <div key="featuredBundle" className="mt-3 p-4 bg-valorant-darker/60 rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-valorant-gold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-valorant-red" /> Featured Bundle</h5>
            <span className="text-[10px] text-valorant-gray">Bundle</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {storefront.featuredBundle.items.map((item, idx) => {
              const priceText = [item.basePrice ? `${item.basePrice} VP` : '', item.discountedPrice ? `${item.discountedPrice} VP` : '', item.discountPercent ? `${item.discountPercent}%` : ''].filter(Boolean).join(' • ');
              return <div key={idx} className="min-h-0">{renderCard(item, item.metadata?.displayName, priceText)}</div>;
            })}
          </div>
        </div>
      );
    }

    if (storefront.skinsPanel?.offers?.length) {
      sections.push(
        <div key="skinsPanel" className="mt-3 p-4 bg-valorant-darker/60 rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-valorant-gold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-valorant-red" /> Daily 4 Skins</h5>
            <span className="text-[10px] text-valorant-gray">Daily Shop</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {storefront.skinsPanel.offers.map((offer, idx) => <div key={idx} className="min-h-0">{renderCard(offer, offer.metadata?.displayName, offer.priceVP ? `${offer.priceVP} VP` : '')}</div>)}
          </div>
        </div>
      );
    }

    if (storefront.bonusStore?.offers?.length) {
      sections.push(
        <div key="bonusStore" className="mt-3 p-4 bg-valorant-darker/60 rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-valorant-gold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-valorant-red" /> Night Market / Bonus Store</h5>
            <span className="text-[10px] text-valorant-gray">Discounted</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {storefront.bonusStore.offers.map((offer, idx) => {
            const priceInfo = {
              basePrice: offer.basePrice,
              discountedPrice: offer.discountedPrice,
              discountPercent: offer.discountPercent
            };
            return <div key={idx} className="min-h-0">{renderCard(offer, offer.metadata?.displayName, null, priceInfo)}</div>;
          })}
          </div>
        </div>
      );
    }

    if (storefront.accessoryStore?.offers?.length) {
      sections.push(
        <div key="accessoryStore" className="mt-3 p-4 bg-valorant-darker/60 rounded-lg border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-valorant-gold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-valorant-red" /> Accessory Store</h5>
            <span className="text-[10px] text-valorant-gray">KC</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {storefront.accessoryStore.offers.map((offer, idx) => <div key={idx} className="min-h-0">{renderCard(offer, offer.metadata?.displayName, offer.price ? `${offer.price} KC` : '')}</div>)}
          </div>
        </div>
      );
    }

    return sections.length ? sections : null;
  };

  return (
    <div className="min-h-screen bg-valorant-darker flex flex-col">
      <header className="glass-panel border-b border-white/5 px-6 py-4 shrink-0 relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-valorant-red/10 rounded-xl flex items-center justify-center border border-valorant-red/20 shadow-[0_0_10px_rgba(255,70,85,0.15)]">
              <Terminal className="w-5 h-5 text-valorant-red" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-widest uppercase text-valorant-red">{t.brand || 'VALOCHECK'}</h1>
              <p className="text-[10px] text-valorant-gray font-mono mt-0.5 flex items-center gap-1.5">
                <span className="relative flex h-2 w-2"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${serverHealth.ok ? 'bg-emerald-400' : 'bg-red-400'}`}></span><span className={`relative inline-flex rounded-full h-2 w-2 ${serverHealth.ok ? 'bg-emerald-500' : 'bg-red-500'}`}></span></span>
                System: {serverHealth.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => setLanguage('en')} className={`px-2 py-1 rounded ${language === 'en' ? 'bg-valorant-red text-white' : 'text-valorant-gray hover:text-white'}`}>EN</button>
              <button onClick={() => setLanguage('vn')} className={`px-2 py-1 rounded ${language === 'vn' ? 'bg-valorant-red text-white' : 'text-valorant-gray hover:text-white'}`}>VN</button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 space-y-4">
          <div className="glass-panel rounded-xl p-5 border border-white/5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-valorant-gold flex items-center gap-2"><Activity className="w-4 h-4 text-valorant-red" /> {t.quickStepsTitle}</h2>
            <ol className="mt-4 space-y-3 text-sm text-valorant-gray">
              <li><span className="font-bold text-white">1.</span> {t.quickStep1} <a href="https://auth.riotgames.com/authorize?redirect_uri=https://playvalorant.com/opt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&scope=account%20openid&nonce=1" target="_blank" rel="noreferrer" className="text-valorant-gold underline inline-flex items-center gap-1">{language === 'vn' ? 'trang này' : 'login page'} <ExternalLink className="w-3.5 h-3.5" /></a>.</li>
              <li><span className="font-bold text-white">2.</span> {t.quickStep2}</li>
              <li><span className="font-bold text-white">3.</span> {t.quickStep3}</li>
            </ol>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <textarea value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} rows="5" placeholder={t.pasteRedirectUrl} className="w-full bg-valorant-darker border border-white/10 rounded-lg p-3 text-white placeholder-valorant-gray/40 focus:outline-none focus:border-valorant-red" />
              <button type="submit" disabled={loading} className="w-full bg-valorant-red hover:bg-valorant-red-hover text-white font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" />{t.checking}</> : t.loginButton}
              </button>
            </form>
            {error && <div className="mt-3 text-sm text-valorant-red">{error}</div>}
            {riotId && <div className="mt-3 text-base font-semibold text-emerald-400">{t.riotIDLabel} {riotId} • {language === 'vn' ? 'Vùng' : 'Region'}: {shard || 'ap'}</div>}
            {storefront && riotId && (
              <div className="mt-2 text-sm text-valorant-gray">
                <span>{t.checkAnotherAccountPart1} </span>
                <a href={t.signOutUrl} target="_blank" rel="noreferrer" className="text-valorant-gold underline hover:text-white">{t.checkAnotherAccountLink}</a>
                <span> {t.checkAnotherAccountPart2}</span>
              </div>
            )}
          </div>

         
        </section>

        <section className="lg:col-span-7">
          <div className="glass-panel rounded-xl p-5 border border-white/5 min-h-[650px]">
            {!storefront ? (
              <div className="h-full flex items-center justify-center text-center text-valorant-gray">
                    <div>
                      <Sparkles className="w-12 h-12 mx-auto mb-3 text-valorant-red/50" />
                      <p>{t.waitingPasteUrl}</p>
                    </div>
              </div>
            ) : renderStorefront()}
          </div>
        </section>
      </main>
      <FAQ language={language} />
      <Footer language={language} />
    </div>
  );
};

export default Dashboard;
