import React from 'react';
import { Crosshair } from 'lucide-react';
import OwnedWeaponsShare from './OwnedWeaponsShare';

const OwnedWeaponsPanel = ({ profile, API_URL, riotId, shard, language, t }) => {
  const ownedWeapons = profile?.ownedWeapons || [];

  if (!profile) {
    return <div className="py-16 text-center text-valorant-gray">{t.inventoryUnavailable}</div>;
  }

  const groupedWeapons = ownedWeapons.reduce((groups, skin) => {
    const weaponName = skin.metadata?.weaponName || skin.weaponName || t.ownedWeaponsUnknown;
    if (!groups[weaponName]) groups[weaponName] = [];
    groups[weaponName].push(skin);
    return groups;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h5 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-valorant-gold">
          <Crosshair className="h-3.5 w-3.5 text-valorant-red" /> {t.ownedWeaponsTitle}
        </h5>
        <div className="flex items-center gap-2"><span className="text-[10px] text-valorant-gray">{ownedWeapons.length}</span><OwnedWeaponsShare API_URL={API_URL} profile={profile} riotId={riotId} shard={shard} language={language} t={t} /></div>
      </div>

      {ownedWeapons.length ? (
        <div className="space-y-5">
          {Object.entries(groupedWeapons).map(([weaponName, skins]) => (
            <section key={weaponName}>
              <h6 className="mb-2 text-xs font-bold uppercase tracking-wide text-white">{weaponName}</h6>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {skins.map((skin, index) => {
                  const metadata = skin.metadata || skin;
                  const image = metadata.fullRender || metadata.displayIcon;
                  return (
                    <div key={`${skin.ownedItemId || skin.skinId}-${index}`} className="rounded-xl border border-white/5 bg-valorant-dark/80 p-3 text-center">
                      <div className="mb-2 flex h-24 items-center justify-center overflow-hidden">
                        {image ? <img src={image} alt={metadata.displayName} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-valorant-gray">N/A</span>}
                      </div>
                      <p className="break-words text-xs font-semibold text-white">{metadata.displayName || t.ownedWeaponsUnknown}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="py-10 text-center text-sm text-valorant-gray">{t.ownedWeaponsEmpty}</div>
      )}
    </div>
  );
};

export default OwnedWeaponsPanel;