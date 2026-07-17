import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { RefreshCw, LogOut } from 'lucide-react';

const AdminLogs = ({ API_URL, username, onLogout }) => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = async (nextPage = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/admin/logs?page=${nextPage}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.logs || []);
      setPage(res.data.page || 1);
      setPages(res.data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [API_URL]);

  return (
    <div className="min-h-screen bg-valorant-darker text-white p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-valorant-gold">Admin Logs</h1>
            <p className="text-sm text-valorant-gray">Danh sách Riot ID đã dùng web trong phiên gần đây.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => fetchLogs(page)} className="px-3 py-2 rounded-lg border border-white/10 text-valorant-gold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
            <button onClick={onLogout} className="flex items-center gap-2 border border-white/10 hover:border-valorant-red/30 text-valorant-gold hover:text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-valorant-red/10 transition-all"><LogOut className="w-4 h-4 text-valorant-red" />Logout</button>
          </div>
        </div>

        {error && <div className="text-valorant-red">{error}</div>}

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
              {loading ? (
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
      </div>
    </div>
  );
};

export default AdminLogs;
