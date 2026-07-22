import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Check, LogOut, Plus, RefreshCw, Search } from 'lucide-react';

const AdminLogs = ({ API_URL, username, onLogout }) => {
  const isSystemAdmin = (username || '').trim().toLowerCase() === 'admin';
  const [activeTab, setActiveTab] = useState('logs');

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const [configError, setConfigError] = useState('');
  const [configForm, setConfigForm] = useState({
    redirectUrl: '',
    riotCookies: '',
    ntfyTopicUrl: ''
  });
  const [configMeta, setConfigMeta] = useState({
    hasAccessToken: false,
    hasEntitlementToken: false,
    tokenExpiresAt: null,
    lastReauthAt: null,
    lastShopCheckAt: null,
    lastReauthStatus: '',
    lastReauthError: '',
    lastShopCheckStatus: '',
    lastShopCheckError: '',
    jobsStarted: false,
    nextReauthInMinutes: null,
    dailyShopCron: ''
  });

  const [skinsLoading, setSkinsLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistSaving, setWishlistSaving] = useState(false);
  const [wishlistError, setWishlistError] = useState('');
  const [wishlistMessage, setWishlistMessage] = useState('');
  const [skins, setSkins] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkinUuids, setSelectedSkinUuids] = useState([]);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token') || ''}`
  });

  const fetchLogs = async (nextPage = 1) => {
    setLogsLoading(true);
    setLogsError('');
    try {
      const res = await axios.get(`${API_URL}/api/admin/logs?page=${nextPage}&limit=20`, {
        headers: authHeaders()
      });
      setLogs(res.data.logs || []);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch (err) {
      setLogs([]);
      setLogsError(err.response?.data?.message || 'Unable to load logs.');
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchConfig = async () => {
    setConfigLoading(true);
    setConfigError('');
    try {
      const res = await axios.get(`${API_URL}/api/admin/config`, {
        headers: authHeaders()
      });
      const config = res.data?.config || {};
      setConfigForm({
        redirectUrl: config.redirectUrl || '',
        riotCookies: config.riotCookies || '',
        ntfyTopicUrl: config.ntfyTopicUrl || ''
      });
      setConfigMeta({
        hasAccessToken: Boolean(config.hasAccessToken),
        hasEntitlementToken: Boolean(config.hasEntitlementToken),
        tokenExpiresAt: config.tokenExpiresAt || null,
        lastReauthAt: config.lastReauthAt || null,
        lastShopCheckAt: config.lastShopCheckAt || null,
        lastReauthStatus: config.lastReauthStatus || '',
        lastReauthError: config.lastReauthError || '',
        lastShopCheckStatus: config.lastShopCheckStatus || '',
        lastShopCheckError: config.lastShopCheckError || '',
        jobsStarted: Boolean(config.jobsStarted),
        nextReauthInMinutes: config.nextReauthInMinutes || null,
        dailyShopCron: config.dailyShopCron || ''
      });
    } catch (err) {
      setConfigError(err.response?.data?.message || 'Không tải được cấu hình.');
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchSkins = async () => {
    setSkinsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/skins`);
      setSkins(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setSkins([]);
    } finally {
      setSkinsLoading(false);
    }
  };

  const fetchWishlist = async () => {
    setWishlistLoading(true);
    setWishlistError('');
    try {
      const res = await axios.get(`${API_URL}/api/admin/wishlist`, {
        headers: authHeaders()
      });
      const items = Array.isArray(res.data?.wishlist) ? res.data.wishlist : [];
      setWishlist(items);
      setSelectedSkinUuids(items.map((item) => item.skinUuid));
    } catch (err) {
      setWishlistError(err.response?.data?.message || 'Không tải được wishlist.');
    } finally {
      setWishlistLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [API_URL]);

  useEffect(() => {
    if (activeTab !== 'config' || !isSystemAdmin) {
      return;
    }

    fetchConfig();
    fetchSkins();
    fetchWishlist();
  }, [activeTab, isSystemAdmin]);

  const filteredSkins = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return skins;
    }

    return skins.filter((skin) => {
      const name = (skin.displayName || '').toLowerCase();
      return name.includes(term);
    });
  }, [skins, searchTerm]);

  const syncWishlistState = (nextSelected) => {
    const selectedSet = new Set(nextSelected);
    setSelectedSkinUuids(nextSelected);
    setWishlist((current) => current.filter((item) => selectedSet.has(item.skinUuid)));
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigMessage('');
    setConfigError('');

    try {
      const res = await axios.put(`${API_URL}/api/admin/config`, configForm, {
        headers: authHeaders()
      });

      const config = res.data?.config || {};
      setConfigMeta({
        hasAccessToken: Boolean(config.hasAccessToken),
        hasEntitlementToken: Boolean(config.hasEntitlementToken),
        tokenExpiresAt: config.tokenExpiresAt || null,
        lastReauthAt: config.lastReauthAt || null,
        lastShopCheckAt: config.lastShopCheckAt || null,
        lastReauthStatus: config.lastReauthStatus || '',
        lastReauthError: config.lastReauthError || '',
        lastShopCheckStatus: config.lastShopCheckStatus || '',
        lastShopCheckError: config.lastShopCheckError || '',
        jobsStarted: Boolean(config.jobsStarted),
        nextReauthInMinutes: config.nextReauthInMinutes || null,
        dailyShopCron: config.dailyShopCron || ''
      });
      setConfigMessage('Đã lưu cấu hình.');
    } catch (err) {
      setConfigError(err.response?.data?.message || 'Không lưu được cấu hình.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSaveWishlist = async () => {
    setWishlistSaving(true);
    setWishlistMessage('');
    setWishlistError('');

    try {
      const items = selectedSkinUuids
        .map((skinUuid) => {
          const skin = skins.find((entry) => (entry.levelUuid || entry.uuid) === skinUuid);
          if (!skin) return null;

          return {
            skinUuid,
            skinName: skin.displayName || 'Unknown Skin'
          };
        })
        .filter(Boolean);

      const res = await axios.put(`${API_URL}/api/admin/wishlist`, { items }, {
        headers: authHeaders()
      });

      const nextWishlist = Array.isArray(res.data?.wishlist) ? res.data.wishlist : [];
      setWishlist(nextWishlist);
      setWishlistMessage('Đã lưu wishlist.');
    } catch (err) {
      setWishlistError(err.response?.data?.message || 'Không lưu được wishlist.');
    } finally {
      setWishlistSaving(false);
    }
  };

  const toggleSkin = (skin) => {
    const skinUuid = skin.levelUuid || skin.uuid;
    const nextSelected = selectedSkinUuids.includes(skinUuid)
      ? selectedSkinUuids.filter((value) => value !== skinUuid)
      : [...selectedSkinUuids, skinUuid];

    syncWishlistState(nextSelected);
  };

  const removeFromWishlist = async (skinUuid) => {
    try {
      await axios.delete(`${API_URL}/api/admin/wishlist/${encodeURIComponent(skinUuid)}`, {
        headers: authHeaders()
      });
      const nextSelected = selectedSkinUuids.filter((value) => value !== skinUuid);
      syncWishlistState(nextSelected);
      setWishlist((current) => current.filter((item) => item.skinUuid !== skinUuid));
    } catch (err) {
      setWishlistError(err.response?.data?.message || 'Không xoá được skin khỏi wishlist.');
    }
  };

  const triggerReauthNow = async () => {
    setConfigMessage('');
    setConfigError('');
    try {
      const res = await axios.post(`${API_URL}/api/admin/automation/reauth-now`, {}, { headers: authHeaders() });
      const result = res.data?.result || {};
      setConfigMessage(result.ok ? 'Reauth đã chạy. Kiểm tra trạng thái bên dưới.' : `Reauth thất bại: ${result.reason || 'unknown'}`);
      await fetchConfig();
    } catch (err) {
      setConfigError(err.response?.data?.message || 'Không chạy được reauth ngay.');
    }
  };

  const triggerShopNow = async () => {
    setConfigMessage('');
    setConfigError('');
    try {
      const res = await axios.post(`${API_URL}/api/admin/automation/shop-now`, {}, { headers: authHeaders() });
      const result = res.data?.result || {};
      setConfigMessage(result.ok ? 'Shop check đã chạy. Kiểm tra ntfy topic.' : `Shop check thất bại: ${result.reason || 'unknown'}`);
      await fetchConfig();
    } catch (err) {
      setConfigError(err.response?.data?.message || 'Không chạy được shop check ngay.');
    }
  };

  const renderLogsTab = () => (
    <>
      {logsError ? <div className="text-valorant-red text-sm">{logsError}</div> : null}
      <div className="glass-panel rounded-xl border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-valorant-dark/80 text-valorant-gold">
            <tr>
              <th className="text-left p-3">Riot ID</th>
              <th className="text-left p-3">Shard</th>
              <th className="text-left p-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logsLoading ? (
              <tr><td colSpan="3" className="p-6 text-center text-valorant-gray">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan="3" className="p-6 text-center text-valorant-gray">No logs yet.</td></tr>
            ) : logs.map((log) => (
              <tr key={log._id} className="border-t border-white/5">
                <td className="p-3">{log.riotId}</td>
                <td className="p-3">{log.shard || '—'}</td>
                <td className="p-3">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-valorant-gray">Page {page} / {pages}</span>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => fetchLogs(page - 1)} className="px-3 py-2 rounded-lg border border-white/10 disabled:opacity-40">Prev</button>
          <button disabled={page >= pages} onClick={() => fetchLogs(page + 1)} className="px-3 py-2 rounded-lg border border-white/10 disabled:opacity-40">Next</button>
        </div>
      </div>
    </>
  );

  const renderConfigTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel rounded-xl border border-white/5 p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gold mb-2">redirectUrl</label>
            <input
              value={configForm.redirectUrl}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, redirectUrl: e.target.value }))}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
              placeholder="https://playvalorant.com/..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gold mb-2">ntfyTopicUrl</label>
            <input
              value={configForm.ntfyTopicUrl}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, ntfyTopicUrl: e.target.value }))}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
              placeholder="https://ntfy.sh/your-topic"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveConfig}
            disabled={configSaving}
            className="inline-flex items-center gap-2 bg-valorant-red hover:bg-valorant-red-hover text-white font-bold px-4 py-2.5 rounded-lg disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> {configSaving ? 'Saving...' : 'Save'}
          </button>

          {configMessage ? <div className="text-emerald-400 text-sm">{configMessage}</div> : null}
          {configError ? <div className="text-valorant-red text-sm">{configError}</div> : null}

          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={triggerReauthNow} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white hover:border-valorant-red/40">Test reauth now</button>
            <button type="button" onClick={triggerShopNow} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white hover:border-valorant-red/40">Test shop now</button>
          </div>
        </div>

        <div className="glass-panel rounded-xl border border-white/5 p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gold mb-2">riotCookies</label>
            <textarea
              value={configForm.riotCookies}
              onChange={(e) => setConfigForm((prev) => ({ ...prev, riotCookies: e.target.value }))}
              rows={10}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg px-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red resize-y"
              placeholder="ssid=...; clid=...; csid=...; tdid=..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-valorant-gray">
            <div className="rounded-lg border border-white/5 bg-black/10 p-3">Access token: {configMeta.hasAccessToken ? 'Ready' : 'Empty'}</div>
            <div className="rounded-lg border border-white/5 bg-black/10 p-3">Entitlement token: {configMeta.hasEntitlementToken ? 'Ready' : 'Empty'}</div>
            <div className="rounded-lg border border-white/5 bg-black/10 p-3 col-span-2">Token expires: {configMeta.tokenExpiresAt ? new Date(configMeta.tokenExpiresAt).toLocaleString() : '—'}</div>
            <div className="rounded-lg border border-white/5 bg-black/10 p-3 col-span-2">Last reauth: {configMeta.lastReauthAt ? new Date(configMeta.lastReauthAt).toLocaleString() : '—'}</div>
            <div className="rounded-lg border border-white/5 bg-black/10 p-3 col-span-2">Reauth status: {configMeta.lastReauthStatus || '—'}{configMeta.lastReauthError ? ` • ${configMeta.lastReauthError}` : ''}</div>
            <div className="rounded-lg border border-white/5 bg-black/10 p-3 col-span-2">Last shop check: {configMeta.lastShopCheckAt ? new Date(configMeta.lastShopCheckAt).toLocaleString() : '—'}</div>
            <div className="rounded-lg border border-white/5 bg-black/10 p-3 col-span-2">Shop status: {configMeta.lastShopCheckStatus || '—'}{configMeta.lastShopCheckError ? ` • ${configMeta.lastShopCheckError}` : ''}</div>
            <div className="rounded-lg border border-white/5 bg-black/10 p-3 col-span-2">Jobs started: {configMeta.jobsStarted ? 'Yes' : 'No'}{configMeta.nextReauthInMinutes ? ` • reauth every ${configMeta.nextReauthInMinutes} mins` : ''}{configMeta.dailyShopCron ? ` • cron ${configMeta.dailyShopCron}` : ''}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass-panel rounded-xl border border-white/5 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-valorant-gold">Skin list</h3>
              <p className="text-xs text-valorant-gray">Tìm và chọn nhiều skin để lưu wishlist.</p>
            </div>
            <button
              type="button"
              onClick={handleSaveWishlist}
              disabled={wishlistSaving}
              className="inline-flex items-center gap-2 bg-valorant-red hover:bg-valorant-red-hover text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {wishlistSaving ? 'Saving...' : 'Save Wishlist'}
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-valorant-gray absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-valorant-dark border border-white/10 rounded-lg pl-10 pr-3 py-2 text-white placeholder-valorant-gray/50 focus:outline-none focus:border-valorant-red"
              placeholder="Search skin..."
            />
          </div>

          {skinsLoading ? (
            <div className="text-sm text-valorant-gray">Loading skins...</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 max-h-[34rem] overflow-auto pr-1">
              {filteredSkins.map((skin) => {
                const skinUuid = skin.levelUuid || skin.uuid;
                const isSelected = selectedSkinUuids.includes(skinUuid);

                return (
                  <button
                    key={skinUuid}
                    type="button"
                    onClick={() => toggleSkin(skin)}
                    className={`flex items-center gap-3 text-left rounded-xl border p-3 transition-colors ${isSelected ? 'border-valorant-red bg-valorant-red/10' : 'border-white/5 bg-black/10 hover:border-white/10 hover:bg-white/5'}`}
                  >
                    <div className="h-14 w-14 shrink-0 rounded-lg bg-black/20 overflow-hidden flex items-center justify-center">
                      {skin.displayIcon ? <img src={skin.displayIcon} alt={skin.displayName} className="h-full w-full object-contain" /> : <span className="text-[10px] text-valorant-gray">N/A</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white break-words">{skin.displayName}</div>
                      <div className="text-[11px] text-valorant-gray break-all">{skinUuid}</div>
                    </div>
                    <div className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-valorant-red bg-valorant-red text-white' : 'border-white/20 text-transparent'}`}>
                      <Check className="w-3 h-3" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-panel rounded-xl border border-white/5 p-4 space-y-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-valorant-gold">Wishlist</h3>
            <p className="text-xs text-valorant-gray">Danh sách skin đã lưu sẽ được so sánh với shop hằng ngày.</p>
          </div>

          {wishlistLoading ? (
            <div className="text-sm text-valorant-gray">Loading wishlist...</div>
          ) : wishlist.length === 0 ? (
            <div className="text-sm text-valorant-gray">Chưa có skin nào trong wishlist.</div>
          ) : (
            <div className="space-y-2 max-h-[34rem] overflow-auto pr-1">
              {wishlist.map((item) => (
                <div key={item.skinUuid} className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/10 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white break-words">{item.skinName}</div>
                    <div className="text-[11px] text-valorant-gray break-all">{item.skinUuid}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(item.skinUuid)}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-valorant-gold hover:text-white hover:border-valorant-red/40"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {wishlistMessage ? <div className="text-emerald-400 text-sm">{wishlistMessage}</div> : null}
          {wishlistError ? <div className="text-valorant-red text-sm">{wishlistError}</div> : null}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-valorant-darker text-white p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-valorant-gold">Admin Logs</h1>
            <p className="text-sm text-valorant-gray">Danh sách Riot ID đã dùng web trong phiên gần đây.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchLogs(page)} className="px-3 py-2 rounded-lg border border-white/10 text-valorant-gold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
            <button onClick={onLogout} className="flex items-center gap-2 border border-white/10 hover:border-valorant-red/30 text-valorant-gold hover:text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-valorant-red/10 transition-all"><LogOut className="w-4 h-4 text-valorant-red" />Logout</button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider ${activeTab === 'logs' ? 'text-valorant-gold border-b-2 border-valorant-red' : 'text-valorant-gray'}`}
          >
            Logs
          </button>
          {isSystemAdmin ? (
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider ${activeTab === 'config' ? 'text-valorant-gold border-b-2 border-valorant-red' : 'text-valorant-gray'}`}
            >
              Cấu hình
            </button>
          ) : null}
        </div>

        {activeTab === 'logs' ? renderLogsTab() : null}
        {activeTab === 'config' && isSystemAdmin ? renderConfigTab() : null}
      </div>
    </div>
  );
};

export default AdminLogs;
