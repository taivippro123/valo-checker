import React, { useState } from 'react';
import axios from 'axios';
import { 
  Globe, Bell, Clock, Heart, Edit2, Trash2, 
  RotateCw, ShieldAlert, Sparkles, Check, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import translations from '../i18n';

const AccountList = ({ 
  accounts, 
  activeAccountId, 
  onSelectAccount, 
  onEditAccount, 
  onDeleteAccount, 
  onAccountChecked,
  API_URL,
  language = 'vn',
  autoCheckAccountId,
  onAutoCheckComplete
}) => {
  const t = translations[language] || translations.vn;
  const [checkingIds, setCheckingIds] = useState(new Set());
  const [activeShops, setActiveShops] = useState({}); // Stores resolved storefront offers by account ID
  const [shopErrors, setShopErrors] = useState({});

  // Auto-trigger a shop check when Dashboard creates a new account
  React.useEffect(() => {
    if (!autoCheckAccountId) return;
    const account = accounts.find(a => a._id === autoCheckAccountId);
    if (account) {
      // Trigger check and notify parent when done
      (async () => {
        await handleManualCheck({ stopPropagation: () => {} }, account);
        if (typeof onAutoCheckComplete === 'function') onAutoCheckComplete();
      })();
    }
  }, [autoCheckAccountId]);

  const handleManualCheck = async (e, account) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    
    const accountId = account._id;
    setCheckingIds(prev => new Set([...prev, accountId]));
    setShopErrors(prev => ({ ...prev, [accountId]: '' }));
    
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/accounts/${accountId}/check`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update store state with resolved offers
      setActiveShops(prev => ({ ...prev, [accountId]: res.data.offers }));
      
      // Notify parent to refresh account info (like lastChecked date)
      if (onAccountChecked) {
        onAccountChecked(accountId, res.data.offers);
      }
    } catch (err) {
      console.error(err);
      const isExpired = err.response?.data?.message?.includes('TOKEN_EXPIRED');
      setShopErrors(prev => ({ 
        ...prev, 
        [accountId]: isExpired 
          ? 'Riot Web Login Token has expired. Please click the edit (pencil icon) button and choose Re-authenticate.'
          : (err.response?.data?.message || 'Verification / Storefront check failed.')
      }));
    } finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const toggleShopCollapse = (e, accountId) => {
    e.stopPropagation();
    if (activeShops[accountId]) {
      setActiveShops(prev => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
    } else {
      // If shop isn't loaded, user should click the check button. 
      // We can also trigger check automatically, but manual check requires Riot login so let's keep it manual.
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-10 text-center border border-white/5 flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-valorant-gray/30 mb-3" />
        <h4 className="text-valorant-gold font-bold uppercase tracking-wider mb-1">{t.noAccountsTitle}</h4>
        <p className="text-valorant-gray text-xs max-w-sm">
          {t.noAccountsBody}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => {
        const isSelected = activeAccountId === account._id;
        const isChecking = checkingIds.has(account._id);
        const shopOffers = activeShops[account._id];
        const error = shopErrors[account._id];

        return (
          <div
            key={account._id}
            onClick={() => onSelectAccount(account)}
            className={`glass-card rounded-xl p-5 border cursor-pointer relative overflow-hidden transition-all ${
              isSelected 
                ? 'bg-valorant-dark/90 border-valorant-red shadow-[0_0_15px_rgba(255,70,85,0.08)]' 
                : 'bg-valorant-dark/50 border-white/5'
            }`}
          >
            {/* Visual Accent bar for active selection */}
            {isSelected && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-valorant-red"></div>
            )}

            {/* Top row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-md font-bold uppercase tracking-wider text-white">
                    {account.alias}
                  </h4>
                  <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] text-valorant-gold uppercase tracking-wider font-semibold">
                    {account.shard}
                  </span>
                  {account.authMode === 'token' && (
                    <span className="bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] text-blue-400 uppercase tracking-wider font-semibold">
                      {t.tokenMode}
                    </span>
                  )}
                  {account.authMode === 'token' && account.tokenExpiresAt && new Date() > new Date(account.tokenExpiresAt) && (
                    <span className="bg-valorant-red/10 border border-valorant-red/20 px-2 py-0.5 rounded text-[10px] text-valorant-red uppercase tracking-wider font-semibold animate-pulse">
                      Token Expired
                    </span>
                  )}
                </div>
                <p className="text-xs text-valorant-gray mt-0.5">
                  {t.riotIDLabel} <span className="text-white/70">{account.username}</span>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleManualCheck(e, account)}
                  disabled={isChecking}
                  title={t.checkShop}
                  className="p-2 border border-white/10 hover:border-white/30 text-valorant-gold hover:text-white rounded-lg hover:bg-white/5 disabled:opacity-40 transition-all flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  {isChecking ? t.checking : t.checkShop}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAccount(account);
                  }}
                  title={t.editSettings}
                  className="p-2 border border-white/10 hover:border-white/30 text-valorant-gold hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAccount(account._id);
                  }}
                  title="Delete Account"
                  className="p-2 border border-valorant-red/20 hover:border-valorant-red/40 text-valorant-red hover:bg-valorant-red/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Info row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/5 text-xs text-valorant-gray">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-valorant-red fill-valorant-red/15" />
                <span>{account.wishlist?.length || 0} Skins on Wishlist</span>
              </div>
              <div className="flex items-center gap-1.5 col-span-1">
                <Bell className="w-4 h-4 text-blue-400" />
                <span className="truncate" title={account.ntfyTopic || t.ntfyGlobal}>
                  ntfy: {account.ntfyTopic || t.none}
                </span>
              </div>
              <div className="flex items-center gap-1.5 col-span-2">
                <Clock className="w-4 h-4" />
                <span>
                  {t.lastChecked}{' '}
                  {account.lastChecked 
                    ? new Date(account.lastChecked).toLocaleString() 
                    : t.none}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 bg-valorant-red/10 border border-valorant-red/20 text-valorant-red p-3 rounded-lg text-xs mt-3">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Collapse Shop Toggle */}
            {shopOffers && (
              <div className="mt-3 flex justify-center">
                <button
                  onClick={(e) => toggleShopCollapse(e, account._id)}
                  className="text-valorant-gold hover:text-white flex items-center gap-1 text-[10px] tracking-wider uppercase font-bold"
                >
                  {t.hideStorefront} <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Daily Storefront Visual Section */}
            {shopOffers && (
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="mt-3 p-4 bg-valorant-darker/60 rounded-lg border border-white/5 animate-fadeIn"
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-valorant-gold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-valorant-red" /> {t.activeOffers}
                  </h5>
                  <span className="text-[10px] text-valorant-gray bg-white/5 px-2 py-0.5 rounded font-mono">
                    {t.resetCycle}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {shopOffers.map((offer, idx) => {
                    const isWishlisted = (account.wishlist || []).includes(offer.uuid);
                    return (
                      <div 
                        key={idx} 
                        className={`p-2.5 rounded-lg border text-center relative flex flex-col justify-between ${
                          isWishlisted 
                            ? 'bg-valorant-red/10 border-valorant-red/40 shadow-[0_0_10px_rgba(255,70,85,0.1)]' 
                            : 'bg-valorant-dark border-white/5'
                        }`}
                      >
                        {/* Wishlist badge */}
                        {isWishlisted && (
                          <span className="absolute top-1.5 right-1.5 bg-valorant-red text-[8px] font-bold uppercase tracking-wider text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Heart className="w-2 h-2 fill-current" /> Match
                          </span>
                        )}
                        
                        <div className="h-24 w-full flex items-center justify-center p-1 mb-2">
                          {offer.displayIcon ? (
                            <img 
                              src={offer.displayIcon} 
                              alt={offer.displayName} 
                              className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]"
                            />
                          ) : (
                            <span className="text-sm text-valorant-gray">No image</span>
                          )}
                        </div>

                        <div className="text-sm font-bold text-white tracking-wide whitespace-normal">
                          {offer.displayName}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
};

export default AccountList;
