import React from 'react';
import { Crosshair, Droplets } from 'lucide-react';

const InventoryPanel = ({ profile, riotId, t }) => {
  if (!profile) {
    return (
      <div className="h-full flex items-center justify-center text-center text-valorant-gray py-16">
        <p>{t.inventoryUnavailable}</p>
      </div>
    );
  }

  const { level, wallet, identity, guns = [], sprays = [] } = profile;
  const playerCardArt = identity?.playerCard?.largeArt;
  const playerTitle = identity?.playerTitle?.titleText;
  const equippedGuns = guns.filter((gun) => gun.metadata?.fullRender || gun.metadata?.displayIcon);
  const equippedSprays = sprays.filter((spray) => spray.metadata?.fullTransparentIcon || spray.metadata?.displayName);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-white/5 bg-valorant-darker/40 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
          <WalletPill label="VP" amount={wallet?.VP ?? 0} accent="text-emerald-300" />
          <WalletPill label="RP" amount={wallet?.RP ?? 0} accent="text-sky-300" />
          <WalletPill label="KC" amount={wallet?.KC ?? 0} accent="text-amber-300" />
        </div>

        <div className="flex justify-center">
          <div className="relative w-[134px] md:w-[201px] aspect-[268/640] overflow-hidden border border-white/15 shadow-[0_0_30px_rgba(255,70,85,0.12)] bg-[#111821]">
            <div className="absolute inset-x-0 top-0 z-20 flex justify-center pt-3">
              <div className="h-10 w-10 rotate-45 border border-white/30 bg-black/70 flex items-center justify-center shadow-lg">
                <span className="-rotate-45 text-sm font-black text-white">{level ?? '—'}</span>
              </div>
            </div>

            {playerCardArt ? (
              <img
                src={playerCardArt}
                alt={identity?.playerCard?.displayName || 'Player card'}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-b from-valorant-red/20 via-[#111821] to-black" />
            )}

            <div className="absolute inset-x-0 bottom-0 z-20 px-2.5 pb-3 pt-12 bg-gradient-to-t from-black via-black/95 to-transparent">
              {playerTitle ? (
                <p className="text-[10px] uppercase tracking-[0.18em] text-valorant-gold text-center mb-1 truncate">{playerTitle}</p>
              ) : null}
              <div className="rounded-sm border border-white/20 bg-white/10 backdrop-blur-sm px-2 py-1.5 text-center">
                <p className="text-xs md:text-sm font-bold text-white truncate">{riotId || '—'}</p>
              </div>
            </div>

            <div className="absolute inset-0 pointer-events-none border border-white/10" />
            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 h-3 w-3 rotate-45 border border-white/30 bg-black/80" />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-valorant-gold flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-valorant-red" /> {t.loadoutWeaponsTitle}
          </h5>
          <span className="text-[10px] text-valorant-gray">{equippedGuns.length}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {equippedGuns.length ? equippedGuns.map((gun, idx) => (
            <div key={`${gun.id || gun.skinId}-${idx}`} className="rounded-xl border border-white/5 bg-valorant-dark/80 p-3 text-center">
              <div className="h-24 flex items-center justify-center mb-2 overflow-hidden">
                {gun.metadata.fullRender ? (
                  <img src={gun.metadata.fullRender} alt={gun.metadata.displayName} className="max-h-full max-w-full object-contain" />
                ) : gun.metadata.displayIcon ? (
                  <img src={gun.metadata.displayIcon} alt={gun.metadata.displayName} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-valorant-gray">N/A</span>
                )}
              </div>
              <p className="text-[10px] uppercase tracking-wide text-valorant-gray truncate">{gun.metadata.weaponName}</p>
              <p className="text-xs font-semibold text-white mt-1 break-words line-clamp-2">{gun.metadata.displayName}</p>
            </div>
          )) : (
            <div className="col-span-full text-sm text-valorant-gray py-6 text-center">{t.loadoutEmptyWeapons}</div>
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-[11px] font-extrabold uppercase tracking-wider text-valorant-gold flex items-center gap-1.5">
            <Droplets className="w-3.5 h-3.5 text-valorant-red" /> {t.loadoutSpraysTitle}
          </h5>
          <span className="text-[10px] text-valorant-gray">{equippedSprays.length}</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {equippedSprays.length ? equippedSprays.map((spray, idx) => (
            <div key={`${spray.sprayId}-${idx}`} className="rounded-xl border border-white/5 bg-valorant-dark/80 p-3 text-center">
              <div className="h-20 flex items-center justify-center mb-2">
                {spray.metadata?.fullTransparentIcon ? (
                  <img src={spray.metadata.fullTransparentIcon} alt={spray.metadata.displayName} className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-xs text-valorant-gray">N/A</span>
                )}
              </div>
              <p className="text-xs font-semibold text-white break-words line-clamp-2">{spray.metadata?.displayName || 'Unknown'}</p>
            </div>
          )) : (
            <div className="col-span-full text-sm text-valorant-gray py-6 text-center">{t.loadoutEmptySprays}</div>
          )}
        </div>
      </section>
    </div>
  );
};

const WalletPill = ({ label, amount, accent }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
    <span className={`text-[11px] font-black uppercase tracking-wider ${accent}`}>{label}</span>
    <span className="text-sm font-bold text-white tabular-nums">{amount?.toLocaleString?.() ?? amount}</span>
  </div>
);

export default InventoryPanel;
