import axios from 'axios';

// In-memory cache for skin levels
let skinCache = null;
let lastCacheFetch = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const SHARD_ORDER = ['ap', 'eu', 'na', 'kr'];

export const getStorefrontCandidateShards = (shard) => {
  const normalized = (shard || '').toLowerCase().trim();
  if (!normalized) {
    return [...SHARD_ORDER];
  }

  const ordered = [normalized];
  SHARD_ORDER.forEach(candidate => {
    if (candidate !== normalized && !ordered.includes(candidate)) {
      ordered.push(candidate);
    }
  });

  return ordered;
};

/**
 * Fetch and build the skins cache from valorant-api.com
 */
export const loadSkinsCache = async (force = false) => {
  const now = Date.now();
  if (skinCache && !force && (now - lastCacheFetch < CACHE_TTL)) {
    return skinCache;
  }

  try {
    console.log('[StoreService] Loading skins levels from Valorant-API...');
    // We fetch skinlevels as required, but we can also fetch skins to get better category mappings
    const response = await axios.get('https://valorant-api.com/v1/weapons/skinlevels');
    
    if (response.data && response.data.data) {
      const skinsMap = new Map();
      response.data.data.forEach(level => {
        skinsMap.set(level.uuid.toLowerCase(), {
          uuid: level.uuid,
          displayName: level.displayName,
          displayIcon: level.displayIcon,
          streamedVideo: level.streamedVideo || null
        });
      });
      
      skinCache = skinsMap;
      lastCacheFetch = now;
      console.log(`[StoreService] Loaded ${skinsMap.size} skins into in-memory cache.`);
      return skinsMap;
    }
    throw new Error('Invalid response structure from valorant-api');
  } catch (error) {
    console.error('[StoreService] Error building skins cache:', error.message);
    throw new Error(`Failed to initialize skin levels asset resolver: ${error.message}`);
  }
};

/**
 * Resolve a single skin level UUID to its metadata
 * @param {string} uuid 
 * @returns {Promise<{uuid: string, displayName: string, displayIcon: string, streamedVideo: string|null}>}
 */
export const resolveSkin = async (uuid) => {
  const cache = await loadSkinsCache();
  const matched = cache.get(uuid.toLowerCase());
  if (matched) {
    return matched;
  }
  return {
    uuid,
    displayName: 'Unknown Skin Offer',
    displayIcon: null,
    streamedVideo: null
  };
};

/**
 * Fetch daily store offers for an authenticated user
 * @param {string} shard 
 * @param {string} puuid 
 * @param {object} authDetails 
 * @param {string} authDetails.accessToken 
 * @param {string} authDetails.entitlementToken 
 * @param {string} authDetails.clientVersion 
 * @returns {Promise<Array>} List of resolved skin details
 */
export const fetchAccountStore = async (shard, puuid, authDetails) => {
  const { accessToken, entitlementToken, clientVersion, authToken } = authDetails;
  const clientPlatform = 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';
  const candidateShards = getStorefrontCandidateShards(shard);
  const lastError = [];

  for (const activeShard of candidateShards) {
    const url = `https://pd.${activeShard}.a.pvp.net/store/v3/storefront/${puuid}`;
    console.log(`[StoreService] Fetching storefront for PUUID: ${puuid} on shard: ${activeShard}...`);

    try {
      const response = await axios.post(url, {}, {
        headers: {
          'Authorization': `Bearer ${authToken || accessToken}`,
          'X-Riot-Entitlements-JWT': entitlementToken,
          'X-Riot-ClientPlatform': clientPlatform,
          'X-Riot-ClientVersion': clientVersion,
          'Content-Type': 'application/json'
        }
      });

      const storeData = response.data;
      if (!storeData || !storeData.SkinsPanelLayout || !storeData.SkinsPanelLayout.SingleItemOffers) {
        console.error('[StoreService] Storefront response missing single item offers:', storeData);
        throw new Error('Skins storefront offers not found in Riot response');
      }

      const offers = storeData.SkinsPanelLayout.SingleItemOffers;
      console.log(`[StoreService] Extracted ${offers.length} offers from shard ${activeShard}:`, offers);

      // Resolve details for each skin offer
      const resolvedOffers = await Promise.all(
        offers.map(async (uuid) => {
          return await resolveSkin(uuid);
        })
      );

      return { offers: resolvedOffers, shard: activeShard };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      lastError.push({ shard: activeShard, message: errorMessage });
      console.warn(`[StoreService] Storefront fetch failed for shard ${activeShard}:`, errorMessage);

      if (error.response?.status === 404) {
        continue;
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new Error(`Failed to fetch shop storefront from Riot: ${errorMessage}`);
      }

      if (error.response?.status === 429) {
        throw new Error(`Failed to fetch shop storefront from Riot: ${errorMessage}`);
      }
    }
  }

  const fallbackMessage = lastError.at(-1)?.message || 'Unknown storefront error';
  console.warn(`[StoreService] Storefront unavailable for PUUID ${puuid} after trying shards ${candidateShards.join(', ')}. Returning empty offers.`);
  return { offers: [], shard: shard || 'ap', warning: fallbackMessage };
};
