import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Check, LogOut, Plus, RefreshCw, Trash2, Edit, UserPlus, X } from 'lucide-react';
import translations from '../i18n';
import { toast } from 'sonner';

const UserLogs = ({ API_URL, username, fullName, onLogout }) => {
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'vn');
  const t = translations[language] || translations.en;
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [selectedAccountTab, setSelectedAccountTab] = useState('details');
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [showGuidePrompt, setShowGuidePrompt] = useState(false);
  const [accountsError, setAccountsError] = useState('');
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [accountForm, setAccountForm] = useState({
    name: '',
    redirectUrl: '',
    riotCookies: '',
    ntfyTopicUrl: '',
    discordWebhookUrl: ''
  });
  const [accountFormSaving, setAccountFormSaving] = useState(false);

  const [skinsLoading, setSkinsLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistSaving, setWishlistSaving] = useState(false);
  const [wishlistRemoving, setWishlistRemoving] = useState(null);
  const [reauthLoading, setReauthLoading] = useState(null);
  const [shopCheckLoading, setShopCheckLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [skins, setSkins] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkinUuids, setSelectedSkinUuids] = useState([]);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
  });

  const fetchAccounts = async () => {
    setAccountsLoading(true);
    setAccountsError('');
    try {
      const res = await axios.get(`${API_URL}/api/user/accounts`, {
        headers: authHeaders()
      });
      const loadedAccounts = Array.isArray(res.data?.accounts) ? res.data.accounts : [];
      setAccounts(loadedAccounts);
      setShowGuidePrompt(loadedAccounts.length === 0);
      if (!selectedAccountId && res.data?.accounts?.length > 0) {
        setSelectedAccountId(res.data.accounts[0].id);
      }
    } catch (err) {
      setAccounts([]);
      setAccountsError(err.response?.data?.message || t.accountsLoadError);
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    setAccountFormSaving(true);

    try {
      if (editingAccountId) {
        // Update existing account
        const res = await axios.put(`${API_URL}/api/user/accounts/${editingAccountId}`, accountForm, {
          headers: authHeaders()
        });
        toast.success(t.successUpdateAccount);
      } else {
        // Create new account
        const res = await axios.post(`${API_URL}/api/user/accounts`, accountForm, {
          headers: authHeaders()
        });
        toast.success(t.successCreateAccount);
      }
      setShowAccountForm(false);
      setEditingAccountId(null);
      setAccountForm({ name: '', redirectUrl: '', riotCookies: '', ntfyTopicUrl: '', discordWebhookUrl: '' });
      await fetchAccounts();
    } catch (err) {
      const errorMessage = err.response?.data?.message;
      toast.error(
        errorMessage === 'Hiện tại bạn chỉ có thể tạo 1 tài khoản'
          ? t.accountLimitReached
          : (editingAccountId ? t.errorUpdateAccount : t.errorCreateAccount)
      );
    } finally {
      setAccountFormSaving(false);
    }
  };

  const handleEditAccount = (account) => {
    setEditingAccountId(account.id);
    setAccountForm({
      name: account.name || '',
      redirectUrl: account.redirectUrl || '',
      riotCookies: account.riotCookies || '',
      ntfyTopicUrl: account.ntfyTopicUrl || '',
      discordWebhookUrl: account.discordWebhookUrl || ''
    });
    setShowAccountForm(true);
  };

  const handleShowCreateForm = () => {
    // Check if user already has an account (non-premium limit)
    if (accounts.length >= 1) {
      toast.error(t.accountLimitReached);
      return;
    }
    setShowAccountForm(true);
  };

  const handleDeleteAccount = async (accountId) => {
    toast.promise(
      (async () => {
        setDeleteLoading(accountId);
        try {
          await axios.delete(`${API_URL}/api/user/accounts/${accountId}`, {
            headers: authHeaders()
          });
          if (selectedAccountId === accountId) {
            setSelectedAccountId(null);
          }
          await fetchAccounts();
        } catch (err) {
          throw new Error(err.response?.data?.message || t.errorDeleteAccount);
        } finally {
          setDeleteLoading(null);
        }
      })(),
      {
        loading: t.deleteAccountLoading,
        success: t.deleteAccountSuccess,
        error: (err) => err.message
      }
    );
  };

  const handleReauthNow = async (accountId) => {
    setReauthLoading(accountId);
    try {
      const res = await axios.post(`${API_URL}/api/user/accounts/${accountId}/reauth`, {}, {
        headers: authHeaders()
      });
      toast.success(res.data?.message || t.reauthSuccess);
      await fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || t.reauthError);
    } finally {
      setReauthLoading(null);
    }
  };

  const handleCheckShop = async (accountId) => {
    setShopCheckLoading(accountId);
    try {
      const res = await axios.post(`${API_URL}/api/user/accounts/${accountId}/check-shop`, {}, {
        headers: authHeaders()
      });
      toast.success(res.data?.message || t.shopCheckSuccess);
      await fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || t.shopCheckError);
    } finally {
      setShopCheckLoading(null);
    }
  };

  const fetchSkins = useCallback(async () => {
    // Only fetch if not already cached
    if (skins.length > 0) return;

    setSkinsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/skins`, {
        headers: authHeaders()
      });
      setSkins(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setSkins([]);
      toast.error(err.response?.data?.message || t.skinsLoadError);
    } finally {
      setSkinsLoading(false);
    }
  }, [skins.length, API_URL]);

  const fetchWishlist = useCallback(async () => {
    if (!selectedAccountId) return;

    setWishlistLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/user/wishlist/${selectedAccountId}`, {
        headers: authHeaders()
      });
      setWishlist(Array.isArray(res.data?.wishlist) ? res.data.wishlist : []);
    } catch (err) {
      setWishlist([]);
      toast.error(err.response?.data?.message || t.wishlistLoadError);
    } finally {
      setWishlistLoading(false);
    }
  }, [API_URL, selectedAccountId]);

  const handleAddToWishlist = async () => {
    if (!selectedAccountId || selectedSkinUuids.length === 0) return;

    setWishlistSaving(true);

    try {
      await axios.post(`${API_URL}/api/user/wishlist/${selectedAccountId}`, {
        skinUuids: selectedSkinUuids
      }, {
        headers: authHeaders()
      });
      toast.success(t.addWishlistSuccess);
      setSelectedSkinUuids([]);
      await fetchWishlist();
    } catch (err) {
      toast.error(err.response?.data?.message || t.addWishlistError);
    } finally {
      setWishlistSaving(false);
    }
  };

  const handleRemoveFromWishlist = async (skinUuid) => {
    if (!selectedAccountId) return;

    setWishlistRemoving(skinUuid);
    try {
      await axios.delete(`${API_URL}/api/user/wishlist/${selectedAccountId}/${encodeURIComponent(skinUuid)}`, {
        headers: authHeaders()
      });
      toast.success(t.removeWishlistSuccess);
      await fetchWishlist();
    } catch (err) {
      toast.error(err.response?.data?.message || t.removeWishlistError);
    } finally {
      setWishlistRemoving(null);
    }
  };

  const filteredSkins = useMemo(() => {
    return skins.filter(skin =>
      skin.displayName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [skins, searchTerm]);

  // Create a map for O(1) skin lookup
  const skinsMap = useMemo(() => {
    const map = new Map();
    skins.forEach(skin => {
      const uuid = skin.levelUuid || skin.uuid;
      if (uuid) map.set(uuid, skin);
    });
    return map;
  }, [skins]);

  const getTierAccent = (skin) => {
    const tierName = skin?.contentTier?.displayName?.toLowerCase() || '';
    if (tierName.includes('exclusive')) return '#F09B0D';
    if (tierName.includes('ultra')) return '#FFD663';
    if (tierName.includes('premium')) return '#D1548D';
    if (tierName.includes('deluxe')) return '#009984';
    if (tierName.includes('select')) return '#5A9FE2';
    return 'rgba(255, 255, 255, 0.12)';
  };

  useEffect(() => {
    fetchAccounts();
    // Pre-load skins on mount to avoid delay when switching to wishlist
    fetchSkins();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      setSelectedAccountTab('details');
    }
  }, [selectedAccountId]);

  const handleOpenWishlist = async () => {
    if (!selectedAccountId) return;

    setSelectedAccountTab('wishlist');
    await fetchWishlist();
  };

  const renderAccountsList = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-valorant-gold">{t.yourAccounts}</h3>
        <button
          type="button"
          onClick={handleShowCreateForm}
          className="inline-flex items-center gap-2 bg-valorant-red hover:bg-valorant-red-hover text-white font-bold px-4 py-2 rounded-lg"
        >
          <UserPlus className="w-4 h-4" /> {t.createAccount}
        </button>
      </div>

      {showAccountForm && (
        <div className="glass-panel rounded-xl border border-white/5 p-4 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-valorant-gold">
            {editingAccountId ? t.editAccount : t.createAccount}
          </h3>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gold mb-2">{t.accountNameLabel}</label>
            <input
              value={accountForm.name}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
              placeholder=""
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gold mb-2">{t.riotRedirectLabel}</label>
            <input
              value={accountForm.redirectUrl}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, redirectUrl: e.target.value }))}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
              placeholder="https://playvalorant.com/..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gold mb-2">{t.ntfyTopicLabel}</label>
            <input
              value={accountForm.ntfyTopicUrl}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, ntfyTopicUrl: e.target.value }))}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
              placeholder="https://ntfy.sh/your-topic"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gold mb-2">{t.discordWebhookLabel}</label>
            <input
              value={accountForm.discordWebhookUrl}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, discordWebhookUrl: e.target.value }))}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gold mb-2">{t.riotCookiesLabel}</label>
            <textarea
              value={accountForm.riotCookies}
              onChange={(e) => setAccountForm((prev) => ({ ...prev, riotCookies: e.target.value }))}
              rows={5}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red resize-y"
              placeholder="ssid=...; clid=...; csid=...; tdid=..."
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={accountFormSaving}
              className="inline-flex items-center gap-2 bg-valorant-red hover:bg-valorant-red-hover text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {accountFormSaving ? t.saving : (editingAccountId ? t.update : t.save)}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAccountForm(false);
                setEditingAccountId(null);
                setAccountForm({ name: '', redirectUrl: '', riotCookies: '', ntfyTopicUrl: '', discordWebhookUrl: '' });
              }}
              className="inline-flex items-center gap-2 bg-valorant-dark hover:bg-valorant-dark-hover text-white font-bold px-4 py-2 rounded-lg border border-white/10"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {accountsLoading ? (
        <div className="text-center py-8 text-valorant-gray">{t.loading}</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-8 text-valorant-gray">{t.noAccountsTitle}</div>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`glass-panel rounded-lg p-4 border cursor-pointer transition-all ${selectedAccountId === account.id ? 'border-valorant-red bg-valorant-red/10' : 'border-white/5 hover:border-white/10'
                }`}
              onClick={() => setSelectedAccountId(account.id)}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                <div className="min-w-0">
                  <h4 className="font-bold text-white">{account.name}</h4>
                  <p className="text-xs text-valorant-gray mt-1">
                    {account.shard?.toUpperCase() || 'AP'} • {account.isActive ? t.active : t.inactive}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReauthNow(account.id);
                    }}
                    disabled={reauthLoading === account.id}
                    className="w-full sm:w-auto justify-center px-3 py-2 rounded-lg border border-white/10 text-xs text-white hover:border-valorant-red/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {reauthLoading === account.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" /> {t.loading}
                      </>
                    ) : (
                      t.reauth
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckShop(account.id);
                    }}
                    disabled={shopCheckLoading === account.id}
                    className="w-full sm:w-auto justify-center px-3 py-2 rounded-lg border border-white/10 text-xs text-white hover:border-valorant-red/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {shopCheckLoading === account.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" /> {t.loading}
                      </>
                    ) : (
                      t.checkShop
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAccount(account);
                    }}
                    className="h-10 w-full sm:w-auto flex items-center justify-center p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 text-valorant-gray" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteAccount(account.id);
                    }}
                    disabled={deleteLoading === account.id}
                    className="h-10 w-full sm:w-auto flex items-center justify-center p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleteLoading === account.id ? (
                      <RefreshCw className="w-4 h-4 text-valorant-red animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-valorant-red" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAccountDetails = () => {
    const account = accounts.find(a => a.id === selectedAccountId);
    if (!account) return null;

    return (
      <div className="space-y-4">
        {/* Account Info */}
        <div className="glass-panel rounded-xl border border-white/5 p-4">
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <button
              type="button"
              onClick={() => setSelectedAccountTab('details')}
              className={`w-full sm:flex-1 py-2 px-4 rounded-lg font-bold transition-colors ${selectedAccountTab === 'details' ? 'bg-valorant-red text-white' : 'bg-valorant-dark text-valorant-gray hover:text-white'
                }`}
            >
              {t.details}
            </button>
            <button
              type="button"
              onClick={handleOpenWishlist}
              className={`w-full sm:flex-1 py-2 px-4 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${selectedAccountTab === 'wishlist' ? 'bg-valorant-red text-white' : 'bg-valorant-dark text-valorant-gray hover:text-white'
                }`}
            >
              {wishlistLoading && selectedAccountTab === 'wishlist' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> {t.wishlist}
                </>
              ) : (
                t.wishlist
              )}
            </button>
          </div>

          {selectedAccountTab === 'details' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">{t.accountNameLabel}</label>
                  <p className="text-white">{account.name}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">{t.regionLabel}</label>
                  <p className="text-white">{account.shard?.toUpperCase() || 'AP'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">{t.statusLabel}</label>
                  <p className={account.isActive ? 'text-emerald-400' : 'text-valorant-red'}>
                    {account.isActive ? t.active : t.inactive}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">{t.ntfyTopicLabel}</label>
                <p className="text-sm text-valorant-gray break-all">{account.ntfyTopicUrl || t.notConfigured}</p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">{t.discordWebhookLabel}</label>
                <p className="text-sm text-valorant-gray break-all">{account.discordWebhookUrl || t.notConfigured}</p>
              </div>

              <div className="border-t border-white/10 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">{t.reauthStatusLabel}</label>
                <p className={`text-sm ${account.lastReauthStatus === 'success' ? 'text-emerald-400' : 'text-valorant-red'}`}>
                  {account.lastReauthStatus || t.never}
                </p>
                {account.lastReauthError && (
                  <p className="text-xs text-valorant-red mt-1">{account.lastReauthError}</p>
                )}
              </div>

              <div className="border-t border-white/10 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">{t.shopCheckStatusLabel}</label>
                <p className={`text-sm ${account.lastShopCheckStatus === 'success' ? 'text-emerald-400' : 'text-valorant-red'}`}>
                  {account.lastShopCheckStatus || t.never}
                </p>
                {account.lastShopCheckError && (
                  <p className="text-xs text-valorant-red mt-1">{account.lastShopCheckError}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-valorant-gold">{t.wishlist}</h3>
                <button
                  type="button"
                  onClick={fetchWishlist}
                  disabled={wishlistLoading}
                  className="inline-flex items-center justify-center gap-2 bg-valorant-dark hover:bg-valorant-dark-hover text-white font-bold px-4 py-2 rounded-lg border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  <RefreshCw className={`w-4 h-4 ${wishlistLoading ? 'animate-spin' : ''}`} /> {wishlistLoading ? t.loading : t.refresh}
                </button>
              </div>

              {wishlistLoading ? (
                <div className="text-center py-8 text-valorant-gray">{t.loading}</div>
              ) : wishlist.length === 0 ? (
                <div className="text-center py-8 text-valorant-gray">{t.noWishlist}</div>
              ) : (
                <div className="space-y-2 max-h-[30rem] overflow-auto pr-1">
                  {wishlist.map((item) => {
                    const matchedSkin = skinsMap.get(item.skinUuid);
                    const displayIcon = matchedSkin?.displayIcon || item.displayIcon;

                    return (
                      <div key={item.skinUuid} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/10 p-3">
                        <div
                          className="h-20 w-28 sm:h-24 sm:w-36 shrink-0 rounded-lg bg-black/20 overflow-hidden flex items-center justify-center border p-1"
                          style={{ borderColor: getTierAccent(matchedSkin) }}
                        >
                            {displayIcon ? (
                            <img
                              src={matchedSkin?.fullRender || displayIcon}
                              alt={item.skinName}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] text-valorant-gray">{t.na}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white break-words">{item.skinName}</div>
                          {matchedSkin?.contentTier?.displayName ? (
                            <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-valorant-gold">
                              {matchedSkin.contentTier.displayIcon ? (
                                <img
                                  src={matchedSkin.contentTier.displayIcon}
                                  alt=""
                                  className="h-4 w-4 object-contain"
                                />
                              ) : null}
                              {matchedSkin.contentTier.displayName}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromWishlist(item.skinUuid)}
                          disabled={wishlistRemoving === item.skinUuid}
                          className="shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {wishlistRemoving === item.skinUuid ? (
                            <RefreshCw className="w-4 h-4 text-valorant-red animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-valorant-red" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-white/10 pt-4 mt-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-valorant-gold mb-4">{t.addToWishlist}</h4>

                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
                    placeholder={t.searchSkinsPlaceholder}
                  />
                </div>

                {skinsLoading ? (
                  <div className="text-center py-4 text-valorant-gray">{t.loading}</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-[30rem] overflow-auto pr-1">
                    {filteredSkins.map((skin) => {
                      const skinUuid = skin.levelUuid || skin.uuid;
                      const isSelected = selectedSkinUuids.includes(skinUuid);

                      return (
                        <button
                          key={skinUuid}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSkinUuids(selectedSkinUuids.filter(id => id !== skinUuid));
                            } else {
                              setSelectedSkinUuids([...selectedSkinUuids, skinUuid]);
                            }
                          }}
                          className={`flex items-center gap-3 text-left rounded-xl border p-3 transition-colors ${isSelected ? 'border-valorant-red bg-valorant-red/10' : 'border-white/5 bg-black/10 hover:border-white/10 hover:bg-white/5'}`}
                        >
                          <div
                            className="h-20 w-28 sm:h-24 sm:w-36 shrink-0 rounded-lg bg-black/20 overflow-hidden flex items-center justify-center border p-1"
                            style={{ borderColor: getTierAccent(skin) }}
                          >
                            {skin.fullRender || skin.displayIcon ? <img src={skin.fullRender || skin.displayIcon} alt={skin.displayName} className="h-full w-full object-contain" /> : <span className="text-[10px] text-valorant-gray">N/A</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-white break-words">{skin.displayName}</div>
                            {skin.contentTier?.displayName ? (
                              <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-valorant-gold">
                                {skin.contentTier.displayIcon ? <img src={skin.contentTier.displayIcon} alt="" className="h-4 w-4 object-contain" /> : null}
                                {skin.contentTier.displayName}
                              </div>
                            ) : null}
                          </div>
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-valorant-red bg-valorant-red text-white' : 'border-white/20 text-transparent'}`}>
                            <Check className="w-3 h-3" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddToWishlist}
                  disabled={wishlistSaving || selectedSkinUuids.length === 0}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-valorant-red hover:bg-valorant-red-hover text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> {wishlistSaving ? t.adding : t.addToWishlist}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-valorant-dark to-valorant-black text-white">
      {showGuidePrompt && !accountsLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="glass-panel relative w-full max-w-md rounded-xl border border-white/10 p-6 shadow-2xl shadow-black/50">
            <button
              type="button"
              onClick={() => setShowGuidePrompt(false)}
              className="absolute right-4 top-4 text-valorant-gray transition-colors hover:text-white"
              aria-label="Close guide prompt"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="pr-8 text-xl font-bold text-white">
              {language === 'vn' ? 'Chưa kết nối tài khoản game' : 'No game account connected'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-valorant-gray">
              {language === 'vn'
                ? 'Bấm vào nút Xem hướng dẫn để sử dụng.'
                : 'Click View Guide to learn how to get started.'}
            </p>
            <Link
              to="/guide"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowGuidePrompt(false)}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-valorant-red px-4 py-3 font-bold text-white transition-colors hover:bg-valorant-red-hover"
            >
              {t.viewGuide}
            </Link>
          </div>
        </div>
      )}
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold">{t.brand} - {fullName || username}</h1>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="inline-flex items-center gap-2 mr-2">
              <button
                type="button"
                onClick={() => { setLanguage('vn'); localStorage.setItem('language', 'vn'); }}
                className={`px-3 py-2 rounded-lg font-bold ${language === 'vn' ? 'bg-valorant-red text-white' : 'bg-valorant-dark text-valorant-gray'}`}
              >VN</button>
              <button
                type="button"
                onClick={() => { setLanguage('en'); localStorage.setItem('language', 'en'); }}
                className={`px-3 py-2 rounded-lg font-bold ${language === 'en' ? 'bg-valorant-red text-white' : 'bg-valorant-dark text-valorant-gray'}`}
              >EN</button>
            </div>
            <Link className="py-2 px-4 rounded-lg font-bold transition-colors bg-valorant-red hover:bg-valorant-red-hover text-white text-center" to="/guide" target="_blank" rel="noopener noreferrer">{t.viewGuide}</Link>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 bg-valorant-dark hover:bg-valorant-dark-hover text-white font-bold px-4 py-2 rounded-lg border border-white/10"
            >
              <LogOut className="w-4 h-4" /> {t.signOut}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="glass-panel rounded-xl border border-white/5 p-4">
              {renderAccountsList()}
            </div>
          </div>

          <div className="lg:col-span-2 order-1 lg:order-2">
            {!selectedAccountId ? (
              <div className="glass-panel rounded-xl border border-white/5 p-4">
                <div className="text-center py-8 text-valorant-gray">{t.chooseAccount}</div>
              </div>
            ) : (
              renderAccountDetails()
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogs;
