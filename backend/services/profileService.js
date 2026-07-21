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
  const lastError = [];

  for (const activeShard of candidateShards) {
    const url = `https://pd.${activeShard}.a.pvp.net${path}`;
    try {
      const response = await axios.get(url, { headers: buildRiotHeaders(authDetails) });
      return { shard: activeShard, data: response.data };
    } catch (error) {
      lastError.push({
        shard: activeShard,
        status: error.response?.status || null,
        message: error.response?.data?.message || error.message
      });
      if (error.response?.status === 404) continue;
      throw error;
    }
  }

  const err = new Error(lastError.at(-1)?.message || 'Riot API request failed on all shards.');
  err.attempts = lastError;
  throw err;
};

export const loadWeaponsCache = async (force = false) => {
  const now = Date.now();
  if (weaponsCache && !force && now - weaponsCacheTime < CACHE_TTL) {
    return weaponsCache;
  }

  const response = await axios.get('https://valorant-api.com/v1/weapons');
  weaponsCache = response.data?.data || [];
  weaponsCacheTime = now;
  return weaponsCache;
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

const extractSprayEntries = (spraysData) => {
  if (!spraysData) return [];

  if (Array.isArray(spraysData)) {
    return spraysData
      .map((slot) => ({
        sprayId: slot?.SprayID || slot?.sprayID || null,
        slotId: slot?.SlotID || slot?.EquipSlotID || null
      }))
      .filter((entry) => entry.sprayId);
  }

  const selections = spraysData.SpraySelections || spraysData.EquipSlotIDs || [];
  if (!Array.isArray(selections)) return [];

  return selections
    .map((slot) => ({
      sprayId: slot?.SprayID || slot?.sprayID || null,
      slotId: slot?.SlotID || slot?.EquipSlotID || null
    }))
    .filter((entry) => entry.sprayId);
};

export const fetchAccountProfile = async (shard, puuid, authDetails) => {
  const [xpResult, walletResult, loadoutResult, weapons] = await Promise.all([
    riotGet(shard, `/account-xp/v1/players/${puuid}`, authDetails),
    riotGet(shard, `/store/v1/wallet/${puuid}`, authDetails),
    riotGet(shard, `/personalization/v2/players/${puuid}/playerloadout`, authDetails),
    loadWeaponsCache()
  ]);

  const activeShard = loadoutResult.shard || walletResult.shard || xpResult.shard || shard;
  const xpData = xpResult.data || {};
  const walletData = walletResult.data || {};
  const loadout = loadoutResult.data || {};

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

  const sprayEntries = extractSprayEntries(loadout.Sprays);

  const sprays = await Promise.all(
    sprayEntries.map(async (entry) => ({
      ...entry,
      metadata: await resolveSpray(entry.sprayId)
    }))
  );

  return {
    shard: activeShard,
    puuid,
    level: xpData.Progress?.Level ?? identity.AccountLevel ?? null,
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
