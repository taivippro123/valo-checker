import React, { useState, useEffect } from 'react';
import axios from 'axios';
import translations from '../i18n';
import { Search, Heart, ShieldAlert, Sparkles, Check } from 'lucide-react';

const WishlistSelector = ({ activeAccount, onWishlistUpdated, API_URL, language = 'vn' }) => {
  const t = translations[language] || translations.vn;
  const [skins, setSkins] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterWishlisted, setFilterWishlisted] = useState(false);

  useEffect(() => {
    const fetchSkins = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/skins`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSkins(res.data);
      } catch (err) {
        setError(t.failedSkinsLoad);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSkins();
  }, [API_URL]);

  if (!activeAccount) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center border border-white/5">
        <Heart className="w-12 h-12 text-valorant-gray/30 mx-auto mb-3" />
        <p className="text-valorant-gray text-sm">{t.selectAccountPrompt}</p>
      </div>
    );
  }

  const wishlist = activeAccount.wishlist || [];

  const handleToggleSkin = async (skin) => {
    const isWishlisted = wishlist.includes(skin.levelUuid);
    let updatedWishlist = [];

    if (isWishlisted) {
      updatedWishlist = wishlist.filter(id => id !== skin.levelUuid);
    } else {
      updatedWishlist = [...wishlist, skin.levelUuid];
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/accounts/${activeAccount._id}`, {
        wishlist: updatedWishlist
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onWishlistUpdated(res.data);
    } catch (err) {
      console.error('Failed to update wishlist:', err);
    }
  };

  const filteredSkins = skins.filter(skin => {
    const matchesSearch = skin.displayName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !filterWishlisted || wishlist.includes(skin.levelUuid);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="glass-panel rounded-xl border border-white/5 flex flex-col h-[650px] overflow-hidden">
      {/* Header Info */}
      <div className="p-5 border-b border-white/5 bg-valorant-dark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
        <div>
          <h3 className="text-lg font-bold uppercase tracking-wider text-valorant-gold flex items-center gap-2">
            Wishlist: <span className="text-valorant-red">{activeAccount.alias}</span>
          </h3>
          <p className="text-xs text-valorant-gray mt-0.5">
            {wishlist.length} item{wishlist.length !== 1 && 's'} in wishlist. You will receive a notification if these appear in the daily shop.
          </p>
        </div>
        
        {/* Toggle Wishlisted filter */}
        <button
          onClick={() => setFilterWishlisted(!filterWishlisted)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase border transition-colors flex items-center gap-1.5 ${
            filterWishlisted 
              ? 'bg-valorant-red border-valorant-red text-white' 
              : 'border-white/10 hover:bg-white/5 text-valorant-gold'
          }`}
        >
          <Heart className="w-3.5 h-3.5 fill-current" />
          Wishlist Only
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 bg-valorant-dark/40 border-b border-white/5 flex gap-2 shrink-0">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-valorant-gray">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-valorant-dark border border-white/5 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-valorant-gray/40 focus:outline-none focus:border-valorant-red transition-all"
          />
        </div>
      </div>

      {/* Skins List Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-valorant-darker">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-valorant-red" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 bg-valorant-red/10 border border-valorant-red/20 text-valorant-red p-4 rounded-lg text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : filteredSkins.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-valorant-gray/40">
            <Sparkles className="w-12 h-12 mb-2" />
            <p className="text-sm">{t.noSkinsFound}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
            {filteredSkins.map((skin) => {
              const isWishlisted = wishlist.includes(skin.levelUuid);
              return (
                <div
                  key={skin.levelUuid}
                  onClick={() => handleToggleSkin(skin)}
                  className={`relative p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isWishlisted 
                      ? 'bg-valorant-red/5 border-valorant-red/40 hover:border-valorant-red/60 shadow-[0_0_10px_rgba(255,70,85,0.05)]' 
                      : 'bg-valorant-dark/40 border-white/5 hover:border-white/20'
                  }`}
                >
                  {/* Select indicator */}
                  {isWishlisted && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-valorant-red text-white rounded-full flex items-center justify-center shadow">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Weapon Icon */}
                  <div className="h-20 w-full flex items-center justify-center p-2 mb-2">
                    <img 
                      src={skin.displayIcon} 
                      alt={skin.displayName} 
                      loading="lazy"
                      className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-transform duration-300 hover:scale-105"
                    />
                  </div>

                  {/* Skin Name */}
                  <div className="text-xs font-bold text-white tracking-wide truncate pr-6">
                    {skin.displayName}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistSelector;
