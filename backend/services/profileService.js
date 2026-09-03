import axios from 'axios';
import { getStorefrontCandidateShards } from './storeService.js';

const CLIENT_PLATFORM = 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';

const WALLET_CURRENCY_IDS = {
  '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741': 'VP',
  'e59aa87c-4cbf-517a-5983-6e81511be9b7': 'RP',
  '85ca954a-41f2-ce94-9b45-8ca3dd39a00d': 'KC'
};

const CACHE_TTL = 24 * 60 * 60 * 1000;
let weaponsCache = null;
let weaponsCacheTime = 0;

const buildRiotHeaders = (authDetails) => {
  const { accessToken, entitlementToken, clientVersion, authToken } = authDetails;
  return {
    Authorization: `Bearer ${authToken || accessToken}`,
    'X-Riot-Entitlements-JWT': entitlementToken,
    'X-Riot-ClientPlatform': CLIENT_PLATFORM,
    'X-Riot-ClientVersion': clientVersion,
    'Content-Type': 'application/json'
  };
};

const riotGet = async (shard, path, authDetails) => {
  const candidateShards = getStorefrontCandidateShards(shard);
  const attempts = [];

  for (const activeShard of candidateShards) {
    const url = `https://pd.${activeShard}.a.pvp.net${path}`;
    try {
      const response = await axios.get(url, { headers: buildRiotHeaders(authDetails), timeout: 15000 });
      return { shard: activeShard, data: response.data };
    } catch (error) {
      attempts.push({
        shard: activeShard,
        url,
        status: error.response?.status || null,
        errorCode: error.response?.data?.errorCode || null,
        message: error.response?.data?.message || error.message
      });
      if (error.response?.status === 404) continue;
      break;
    }
  }

  const last = attempts.at(-1);
  const err = new Error(last?.message || 'Riot API request failed on all shards.');
  err.path = path;
  err.status = last?.status || null;
  err.errorCode = last?.errorCode || null;
  err.attempts = attempts;
  throw err;
};

export const loadWeaponsCache = async (force = false) => {
  const now = Date.now();
  if (weaponsCache && !force && now - weaponsCacheTime < CACHE_TTL) {
    return weaponsCache;
  }

  try {
    // ~3.5MB payload; without a timeout a stalled fetch hangs the whole profile call.
    const response = await axios.get('https://valorant-api.com/v1/weapons', { timeout: 20000 });
    weaponsCache = response.data?.data || [];
    weaponsCacheTime = now;
    return weaponsCache;
  } catch (error) {
    if (weaponsCache) {
      console.warn('[ProfileService] Weapons catalog refresh failed, serving stale cache:', error.message);
      return weaponsCache;
    }
    throw error;
  }
};

export const resolveGunLoadout = (skinId, chromaId, weapons = []) => {
  if (!skinId) return null;

  for (const weapon of weapons) {
    for (const skin of weapon.skins || []) {
      const levelMatch = (skin.levels || []).find((level) => level.uuid === skinId);
      const skinMatch = skin.uuid === skinId;
      if (!levelMatch && !skinMatch) continue;

      let fullRender = null;
      let displayName = skin.displayName || weapon.displayName;

      if (chromaId) {
        const chroma = (skin.chromas || []).find((entry) => entry.uuid === chromaId);
        if (chroma) {
          fullRender = chroma.fullRender || null;
          if (chroma.displayName) displayName = chroma.displayName;
        }
      }

      if (!fullRender) {
        fullRender = (skin.chromas || []).find((entry) => entry.fullRender)?.fullRender
          || levelMatch?.displayIcon
          || skin.displayIcon
          || weapon.displayIcon
          || null;
      }

      return {
        weaponName: weapon.displayName,
        displayName,
        fullRender,
        displayIcon: skin.displayIcon || weapon.displayIcon || null,
        skinId,
        chromaId: chromaId || null
      };
    }
  }

  return {
    weaponName: null,
    displayName: 'Unknown Skin',
    fullRender: null,
    displayIcon: null,
    skinId,
    chromaId: chromaId || null
  };
};

const resolveSpray = async (sprayId) => {
  if (!sprayId) return null;
  try {
    const response = await axios.get(`https://valorant-api.com/v1/sprays/${sprayId}`);
    const data = response.data?.data;
    if (!data) return null;
    return {
      sprayId,
      displayName: data.displayName || 'Unknown Spray',
      fullTransparentIcon: data.fullTransparentIcon || data.displayIcon || null
    };
  } catch {
    return {
      sprayId,
      displayName: 'Unknown Spray',
      fullTransparentIcon: null
    };
  }
};

const resolvePlayerCard = async (playerCardId) => {
  if (!playerCardId) return null;
  try {
    const response = await axios.get(`https://valorant-api.com/v1/playercards/${playerCardId}`);
    const data = response.data?.data;
    if (!data) return null;
    return {
      playerCardId,
      displayName: data.displayName || null,
      largeArt: data.largeArt || data.wideArt || data.smallArt || null
    };
  } catch {
    return null;
  }
};

const resolvePlayerTitle = async (playerTitleId) => {
  if (!playerTitleId) return null;
  try {
    const response = await axios.get(`https://valorant-api.com/v1/playertitles/${playerTitleId}`);
    const data = response.data?.data;
    if (!data) return null;
    return {
      playerTitleId,
      titleText: data.titleText || data.displayName || null
    };
  } catch {
    return null;
  }
};

const mapWalletBalances = (balances = {}) => {
  const wallet = { VP: 0, RP: 0, KC: 0 };
  Object.entries(balances).forEach(([currencyId, amount]) => {
    const key = WALLET_CURRENCY_IDS[currencyId];
    if (key) wallet[key] = amount;
  });
  return wallet;
};

// personalization v3 replaced the `Sprays` block with `ActiveExpressions`,
// a flat list tagged by expression type. Sprays carry this TypeID.
const SPRAY_EXPRESSION_TYPE_ID = 'd5f120f8-ff8c-4aac-92ea-f2b5acbe9475';

const extractSprayEntries = (loadout = {}) => {
  const expressions = loadout.ActiveExpressions;
  if (Array.isArray(expressions)) {
    return expressions
      .filter((entry) => !entry?.TypeID || entry.TypeID === SPRAY_EXPRESSION_TYPE_ID)
      .map((entry, index) => ({
        sprayId: entry?.AssetID || null,
        slotId: entry?.SlotID || entry?.TypeID || null,
        slotIndex: index
      }))
      .filter((entry) => entry.sprayId);
  }

  // Legacy v2 shapes, kept so an older payload still renders.
  const spraysData = loadout.Sprays;
  if (!spraysData) return [];

  const selections = Array.isArray(spraysData)
    ? spraysData
    : spraysData.SpraySelections || spraysData.EquipSlotIDs || [];
  if (!Array.isArray(selections)) return [];

  return selections
    .map((slot) => ({
      sprayId: slot?.SprayID || slot?.sprayID || null,
      slotId: slot?.SlotID || slot?.EquipSlotID || null
    }))
    .filter((entry) => entry.sprayId);
};

export const fetchAccountProfile = async (shard, puuid, authDetails) => {
  const settled = await Promise.allSettled([
    riotGet(shard, `/account-xp/v1/players/${puuid}`, authDetails),
    riotGet(shard, `/store/v1/wallet/${puuid}`, authDetails),
    riotGet(shard, `/personalization/v3/players/${puuid}/playerloadout`, authDetails),
    loadWeaponsCache()
  ]);

  const labels = ['account-xp', 'wallet', 'playerloadout', 'weapons-catalog'];
  const errors = [];

  settled.forEach((entry, index) => {
    if (entry.status !== 'rejected') return;
    const reason = entry.reason || {};
    errors.push({
      source: labels[index],
      status: reason.status ?? reason.response?.status ?? null,
      errorCode: reason.errorCode ?? null,
      message: reason.message || 'Unknown error',
      attempts: reason.attempts || null
    });
  });

  if (errors.length) {
    console.warn('[ProfileService] Partial profile fetch:', JSON.stringify(errors));
  }

  // Every source is optional: one failing Riot endpoint must not null out the whole profile.
  const valueOf = (index) => (settled[index].status === 'fulfilled' ? settled[index].value : null);
  const xpResult = valueOf(0);
  const walletResult = valueOf(1);
  const loadoutResult = valueOf(2);
  const weapons = valueOf(3) || [];

  if (!xpResult && !walletResult && !loadoutResult) {
    const err = new Error('All Riot profile endpoints failed.');
    err.errors = errors;
    throw err;
  }

  const activeShard = loadoutResult?.shard || walletResult?.shard || xpResult?.shard || shard;
  const xpData = xpResult?.data || {};
  const walletData = walletResult?.data || {};
  const loadout = loadoutResult?.data || {};

  const identity = loadout.Identity || {};
  const [playerCard, playerTitle] = await Promise.all([
    resolvePlayerCard(identity.PlayerCardID),
    resolvePlayerTitle(identity.PlayerTitleID)
  ]);

  const guns = (loadout.Guns || []).map((gun) => ({
    id: gun.ID || null,
    skinId: gun.SkinID || null,
    chromaId: gun.ChromaID || null,
    skinLevelId: gun.SkinLevelID || null,
    metadata: resolveGunLoadout(gun.SkinID, gun.ChromaID, weapons)
  }));

  const sprayEntries = extractSprayEntries(loadout);

  const sprays = await Promise.all(
    sprayEntries.map(async (entry) => ({
      ...entry,
      metadata: await resolveSpray(entry.sprayId)
    }))
  );

  return {
    shard: activeShard,
    puuid,
    level: xpData.Progress?.Level ?? (identity.AccountLevel || null),
    xp: xpData.Progress?.XP ?? null,
    wallet: mapWalletBalances(walletData.Balances),
    identity: {
      playerCardId: identity.PlayerCardID || null,
      playerTitleId: identity.PlayerTitleID || null,
      hideAccountLevel: identity.HideAccountLevel ?? false,
      playerCard,
      playerTitle
    },
    guns,
    sprays
  };
};
