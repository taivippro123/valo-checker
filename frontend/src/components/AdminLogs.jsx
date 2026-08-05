import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LogOut, RefreshCw, Users, Shield, Mail, Calendar, Terminal } from 'lucide-react';

const AdminLogs = ({ API_URL, username, onLogout }) => {
  const isSystemAdmin = (username || '').trim().toLowerCase() === 'admin';
  const [activeTab, setActiveTab] = useState('logs');

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [selectedUserDetailsLoading, setSelectedUserDetailsLoading] = useState(false);

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

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await axios.get(`${API_URL}/api/admin/users`, {
        headers: authHeaders()
      });
      setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
    } catch (err) {
      setUsers([]);
      setUsersError(err.response?.data?.message || 'Unable to load users.');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    setSelectedUserDetailsLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/admin/users/${userId}`, {
        headers: authHeaders()
      });
      setSelectedUserDetails(res.data.user);
    } catch (err) {
      setSelectedUserDetails(null);
    } finally {
      setSelectedUserDetailsLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/ban`, {}, {
        headers: authHeaders()
      });
      await fetchUsers();
      if (selectedUserId === userId) {
        await fetchUserDetails(userId);
      }
    } catch (err) {
      console.error('Failed to ban user:', err);
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await axios.put(`${API_URL}/api/admin/users/${userId}/unban`, {}, {
        headers: authHeaders()
      });
      await fetchUsers();
      if (selectedUserId === userId) {
        await fetchUserDetails(userId);
      }
    } catch (err) {
      console.error('Failed to unban user:', err);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [API_URL]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDetails(selectedUserId);
    }
  }, [selectedUserId]);

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

  const renderUsersTab = () => (
    <div className="space-y-4">
      {usersError ? <div className="text-valorant-red text-sm">{usersError}</div> : null}

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold uppercase tracking-wider text-valorant-gold">Danh sách Users</h3>
        <button
          type="button"
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 bg-valorant-dark hover:bg-valorant-dark-hover text-white font-bold px-4 py-2 rounded-lg border border-white/10"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {usersLoading ? (
        <div className="text-center py-8 text-valorant-gray">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-valorant-gray">No users found</div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className={`glass-panel rounded-lg p-4 border cursor-pointer transition-all ${
                selectedUserId === user.id ? 'border-valorant-red bg-valorant-red/10' : 'border-white/5 hover:border-white/10'
              }`}
              onClick={() => setSelectedUserId(user.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white">{user.fullName}</h4>
                    {user.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-valorant-red/20 text-valorant-red text-xs font-semibold">
                        <Shield className="w-3 h-3" /> Admin
                      </span>
                    )}
                    {user.isPremium && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-valorant-gold/20 text-valorant-gold text-xs font-semibold">
                        Premium
                      </span>
                    )}
                    {!user.isActive && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-valorant-red/20 text-valorant-red text-xs font-semibold">
                        Banned
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-valorant-gray">
                    <span className="flex items-center gap-1">
                      <Terminal className="w-3 h-3" /> {user.username}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {user.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-valorant-gray">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {user.accountCount} accounts
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.role !== 'admin' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        user.isActive ? handleBanUser(user.id) : handleUnbanUser(user.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        user.isActive 
                          ? 'border-valorant-red/20 text-valorant-red hover:bg-valorant-red/10' 
                          : 'border-emerald-400/20 text-emerald-400 hover:bg-emerald-400/10'
                      }`}
                    >
                      {user.isActive ? 'Ban' : 'Unban'}
                    </button>
                  )}
                  {user.accounts.some(acc => acc.hasNotifications) && (
                    <div className="text-emerald-400 text-xs">Has notifications</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedUserId && (
        <div className="glass-panel rounded-xl border border-white/5 p-4 mt-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-valorant-gold mb-4">User Details</h3>
          
          {selectedUserDetailsLoading ? (
            <div className="text-center py-4 text-valorant-gray">Loading...</div>
          ) : selectedUserDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">Full Name</label>
                  <p className="text-white">{selectedUserDetails.fullName}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">Username</label>
                  <p className="text-white">{selectedUserDetails.username}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">Email</label>
                  <p className="text-white">{selectedUserDetails.email}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-valorant-gray mb-1">Role</label>
                  <p className={selectedUserDetails.role === 'admin' ? 'text-valorant-red' : 'text-white'}>
                    {selectedUserDetails.role}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-valorant-gold mb-3">Connected Game Accounts ({selectedUserDetails.accounts.length})</h4>
                {selectedUserDetails.accounts.length === 0 ? (
                  <div className="text-sm text-valorant-gray">No game accounts connected</div>
                ) : (
                  <div className="space-y-2">
                    {selectedUserDetails.accounts.map((acc) => (
                      <div key={acc.id} className="bg-valorant-dark/50 rounded-lg p-3 border border-white/5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-semibold text-white">{acc.name}</h5>
                            <p className="text-xs text-valorant-gray">{acc.shard?.toUpperCase() || 'AP'}</p>
                          </div>
                          <div className="flex gap-2">
                            {acc.isActive ? (
                              <span className="text-emerald-400 text-xs">Active</span>
                            ) : (
                              <span className="text-valorant-red text-xs">Inactive</span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-valorant-gray">
                          {acc.ntfyTopicUrl && <div>Ntfy: configured</div>}
                          {acc.discordWebhookUrl && <div>Discord: configured</div>}
                          {!acc.ntfyTopicUrl && !acc.discordWebhookUrl && <div>No notifications configured</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
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
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider ${activeTab === 'users' ? 'text-valorant-gold border-b-2 border-valorant-red' : 'text-valorant-gray'}`}
            >
              Users
            </button>
          ) : null}
        </div>

        {activeTab === 'logs' ? renderLogsTab() : null}
        {activeTab === 'users' && isSystemAdmin ? renderUsersTab() : null}
      </div>
    </div>
  );
};

export default AdminLogs;
