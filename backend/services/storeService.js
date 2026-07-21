import axios from 'axios';

// In-memory cache for skin levels and parent skin metadata
let skinLevelCache = null;
let skinParentByLevelUuid = null;
let skinParentByName = null;
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

const currencyAliases = {
  '85ad13f7-3d1b-5128-9eb2-7cd8ee0b5741': 'VP',
  '85ca954a-41f2-ce94-9b45-8ca3dd39a00d': 'KC'
};

const contentTierCache = new Map();

export const resolveContentTier = async (uuid) => {
  if (!uuid) return null;
  const key = uuid.toLowerCase();
  if (contentTierCache.has(key)) {
    return contentTierCache.get(key);
  }

  try {
    const response = await axios.get(`https://valorant-api.com/v1/contenttiers/${uuid}`);
    const data = response.data?.data;
    if (!data) return null;

    const tier = {
      uuid: data.uuid,
      displayName: data.displayName || null,
      devName: data.devName || null,
      rank: data.rank || null,
      displayIcon: data.displayIcon || null
    };

    contentTierCache.set(key, tier);
    return tier;
  } catch (error) {
    console.warn('[StoreService] Failed to resolve content tier:', error.message);
    return null;
  }
};

const itemTypeToEndpoint = {
  'e7c63390-eda7-46e0-bb7a-a6abdacd2433': 'weapons/skinlevels',
  'dd3bf334-87f3-40bd-b043-682a57a8dc3a': 'buddies/levels',
  'd5f120f8-ff8c-4aac-92ea-f2b5acbe9475': 'sprays',
  '3f296c07-64c3-494c-923b-fe692a4fa1bd': 'playercards',
  '03a572de-4234-31ed-d344-ababa488f981': 'playertitles'
};

const FEATURED_ITEM_ENDPOINTS = [
  'weapons/skinlevels',
  'buddies/levels',
  'sprays',
  'playercards',
  'playertitles',
  'flex'
];

export const mapResolvedViaToItemCategory = (resolvedVia) => {
  if (!resolvedVia) return null;
  if (resolvedVia.startsWith('weapons/')) return 'weapon';
  if (resolvedVia === 'buddies/levels') return 'buddies';
  if (resolvedVia === 'sprays') return 'spray';
  if (resolvedVia === 'playercards') return 'playercard';
  if (resolvedVia === 'playertitles') return 'playertitle';
  if (resolvedVia === 'flex') return 'flex';
  return null;
};

export const extractFeaturedBundleEntries = (featuredBundle) => {
  const fromTiles = (featuredBundle?.FeaturedTileEntries || [])
    .map((entry) => entry?.Entry?.Bundle)
    .filter(Boolean);

  if (fromTiles.length) {
    return fromTiles;
  }

  if (featuredBundle?.Bundles?.length) {
    return featuredBundle.Bundles;
  }

  if (featuredBundle?.Bundle) {
    return [featuredBundle.Bundle];
  }

  return [];
};

export const resolveBundleMetaByDataAssetId = async (dataAssetId, logFn = null) => {
  const log = (message) => {
    console.log(message);
    logFn?.(message);
  };

  if (!dataAssetId) {
    log('[FeaturedBundle] Step 1: skip bundle meta — missing DataAssetID');
    return null;
  }

  const url = `https://valorant-api.com/v1/bundles/${dataAssetId}`;
  log(`[FeaturedBundle] Step 1: GET ${url}`);

  try {
    const response = await axios.get(url);
    const bundleData = response.data?.data;
    if (!bundleData) {
      log(`[FeaturedBundle] Step 1: empty bundle data for ${dataAssetId}`);
      return null;
    }

    log(`[FeaturedBundle] Step 1: resolved bundle "${bundleData.displayName}"`);
    return {
      displayName: bundleData.displayName || null,
      displayIcon: bundleData.displayIcon || bundleData.displayIcon2 || null,
      verticalPromoImage: bundleData.verticalPromoImage || null,
      extraImage: bundleData.extraImage || null
    };
  } catch (error) {
    log(`[FeaturedBundle] Step 1: failed bundle lookup ${dataAssetId} — ${error.message}`);
    return null;
  }
};

export const resolveFeaturedBundleItem = async (itemId, itemTypeId = null, logFn = null) => {
  const log = (message) => {
    console.log(message);
    logFn?.(message);
  };

  if (!itemId) {
    return {
      displayName: 'Unknown Item',
      displayIcon: null,
      image: null,
      resolvedVia: null,
      itemTypeId: itemTypeId || null
    };
  }

  const endpoints = [];
  const typedEndpoint = itemTypeId ? itemTypeToEndpoint[itemTypeId] : null;
  if (typedEndpoint) {
    endpoints.push(typedEndpoint);
    if (typedEndpoint === 'weapons/skinlevels') {
      endpoints.push('weapons/skins');
    }
    if (typedEndpoint === 'playertitles') {
      endpoints.push('flex');
    }
  }

  FEATURED_ITEM_ENDPOINTS.forEach((endpoint) => {
    if (!endpoints.includes(endpoint)) {
      endpoints.push(endpoint);
    }
  });

  log(`[FeaturedBundle] Step 2: resolve item ${itemId}${itemTypeId ? ` (ItemTypeID=${itemTypeId})` : ''}`);

  for (const endpoint of endpoints) {
    const url = `https://valorant-api.com/v1/${endpoint}/${itemId}`;
    log(`[FeaturedBundle] Step 2: try GET ${url}`);

    try {
      const response = await axios.get(url);
      const data = response.data?.data;
      if (!data) {
        log(`[FeaturedBundle] Step 2: empty response from ${endpoint}`);
        continue;
      }

      const displayName = data.displayName || data.name || 'Unknown Item';
      log(`[FeaturedBundle] Step 2: hit ${endpoint} -> "${displayName}"`);

      return {
        displayName,
        displayIcon: data.displayIcon || data.displayIcon2 || data.smallIcon || null,
        image: data.fullRender || data.displayIcon || data.smallIcon || null,
        resolvedVia: endpoint,
        itemCategory: mapResolvedViaToItemCategory(endpoint),
        itemTypeId: itemTypeId || null
      };
    } catch (error) {
      log(`[FeaturedBundle] Step 2: miss ${endpoint} (${error.response?.status || error.message})`);
    }
  }

  log(`[FeaturedBundle] Step 2: unresolved item ${itemId}`);
  return {
    displayName: 'Unknown Item',
    displayIcon: null,
    image: null,
    resolvedVia: null,
    itemCategory: null,
    itemTypeId: itemTypeId || null
  };
};

const mapFeaturedBundleItem = (item) => {
  const offerItem = item?.Item || null;
  if (!offerItem?.ItemID) {
    return null;
  }

  return {
    itemId: offerItem.ItemID,
    itemTypeId: offerItem.ItemTypeID || null,
    amount: offerItem.Amount ?? 1,
    basePrice: item.BasePrice ?? null,
    discountedPrice: item.DiscountedPrice ?? null,
    discountPercent: item.DiscountPercent ?? null,
    currencyId: item.CurrencyID || null
  };
};

export const buildFeaturedBundles = async (featuredBundle, { logFn = null } = {}) => {
  const log = (message) => {
    console.log(message);
    logFn?.(message);
  };

  const entries = extractFeaturedBundleEntries(featuredBundle);
  log(`[FeaturedBundle] Found ${entries.length} bundle entr${entries.length === 1 ? 'y' : 'ies'} in FeaturedTileEntries/Bundles`);

  const bundles = [];

  for (const [index, bundleEntry] of entries.entries()) {
    const bundleLabel = `[Bundle ${index + 1}/${entries.length}]`;
    log(`${bundleLabel} DataAssetID=${bundleEntry.DataAssetID || 'n/a'}, items=${bundleEntry.Items?.length || 0}`);

    const bundleMeta = await resolveBundleMetaByDataAssetId(bundleEntry.DataAssetID, logFn);
    const items = [];

    for (const [itemIndex, item] of (bundleEntry.Items || []).entries()) {
      const mapped = mapFeaturedBundleItem(item);
      if (!mapped) {
        log(`${bundleLabel} Item ${itemIndex + 1}: skipped (missing ItemID)`);
        continue;
      }

      log(`${bundleLabel} Item ${itemIndex + 1}: ItemID=${mapped.itemId}, BasePrice=${mapped.basePrice}, DiscountedPrice=${mapped.discountedPrice}`);
      const metadata = await resolveFeaturedBundleItem(mapped.itemId, mapped.itemTypeId, logFn);
      items.push({
        ...mapped,
        metadata
      });
    }

    bundles.push({
      bundleId: bundleEntry.ID || null,
      dataAssetId: bundleEntry.DataAssetID || null,
      durationRemainingInSeconds: bundleEntry.DurationRemainingInSeconds ?? null,
      totalBaseCost: bundleEntry.TotalBaseCost || null,
      totalDiscountedCost: bundleEntry.TotalDiscountedCost || null,
      totalDiscountPercent: bundleEntry.TotalDiscountPercent ?? null,
      wholesaleOnly: bundleEntry.WholesaleOnly ?? null,
      bundleMeta,
      items
    });
  }

  return bundles;
};

/**
 * Fetch and build the skins cache from valorant-api.com
 */
export const loadSkinsCache = async (force = false) => {
  const now = Date.now();
  if (skinLevelCache && !force && (now - lastCacheFetch < CACHE_TTL)) {
    return skinLevelCache;
  }

  try {
    console.log('[StoreService] Loading skin levels and skins metadata from Valorant-API...');
    const [levelResp, skinResp] = await Promise.all([
      axios.get('https://valorant-api.com/v1/weapons/skinlevels'),
      axios.get('https://valorant-api.com/v1/weapons/skins')
    ]);

    if (!levelResp.data?.data || !skinResp.data?.data) {
      throw new Error('Invalid response structure from valorant-api');
    }

    const levelsMap = new Map();
    const parentByLevel = new Map();
    const parentByNameMap = new Map();

    skinResp.data.data.forEach(skin => {
      if (skin.displayName) {
        parentByNameMap.set(skin.displayName.toLowerCase(), {
          uuid: skin.uuid,
          displayName: skin.displayName,
          contentTierUuid: skin.contentTierUuid || null,
          displayIcon: skin.displayIcon || null
        });
      }
      if (Array.isArray(skin.levels)) {
        skin.levels.forEach(level => {
          if (level?.uuid) {
            parentByLevel.set(level.uuid.toLowerCase(), {
              parentUuid: skin.uuid,
              parentDisplayName: skin.displayName,
              contentTierUuid: skin.contentTierUuid || null,
              parentDisplayIcon: skin.displayIcon || null
            });
          }
        });
      }
    });

    levelResp.data.data.forEach(level => {
      levelsMap.set(level.uuid.toLowerCase(), {
        uuid: level.uuid,
        displayName: level.displayName,
        displayIcon: level.displayIcon,
        streamedVideo: level.streamedVideo || null,
        parentTheme: level.parentTheme || null
      });
    });

    skinLevelCache = levelsMap;
    skinParentByLevelUuid = parentByLevel;
    skinParentByName = parentByNameMap;
    lastCacheFetch = now;
    console.log(`[StoreService] Loaded ${levelsMap.size} skin levels and ${skinResp.data.data.length} skin parents into in-memory cache.`);
    return levelsMap;
  } catch (error) {
    console.error('[StoreService] Error building skins cache:', error.message);
    throw new Error(`Failed to initialize skin levels asset resolver: ${error.message}`);
  }
};

export const resolveMetaByItem = async (itemId, itemTypeId) => {
  const endpointBase = itemTypeToEndpoint[itemTypeId] || 'weapons/skinlevels';
  const endpoints = [endpointBase];
  if (endpointBase === 'weapons/skinlevels') {
    endpoints.push('weapons/skins');
  }

  let data = null;
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`https://valorant-api.com/v1/${endpoint}/${itemId}`);
      data = response.data?.data;
      if (data) break;
    } catch (error) {
      continue;
    }
  }

  if (!data) {
    return { displayName: 'Unknown Offer', displayIcon: null, image: null, type: itemTypeId, contentTierUuid: null, contentTier: null };
  }

  let contentTierUuid = data.contentTierUuid || data.contentTier?.uuid || null;
  let contentTier = contentTierUuid ? await resolveContentTier(contentTierUuid) : null;

  if (!contentTierUuid && endpointBase === 'weapons/skinlevels') {
    const parent = await resolveParentSkinByLevel(itemId, data.displayName || data.name);
    if (parent) {
      contentTierUuid = parent.contentTierUuid;
      contentTier = parent.contentTierUuid ? await resolveContentTier(parent.contentTierUuid) : null;
    }
  }

  return {
    displayName: data.displayName || data.name || 'Unknown Offer',
    displayIcon: data.displayIcon || data.displayIcon2 || null,
    image: data.fullRender || data.displayIcon || null,
    type: itemTypeId,
    contentTierUuid,
    contentTier
  };
};

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

const normalizeSkinName = (name) => {
  if (!name || typeof name !== 'string') return '';
  let normalized = name.toLowerCase().trim();
  normalized = normalized.replace(/\s*\b(level\s*\d+|variant\s*\d+)\b.*$/i, '').trim();
  normalized = normalized.replace(/[()\[\]]/g, '').trim();
  return normalized;
};

export const resolveParentSkinByLevel = async (itemId, displayName) => {
  await loadSkinsCache();
  const levelKey = itemId?.toLowerCase?.();
  if (levelKey && skinParentByLevelUuid?.has(levelKey)) {
    return skinParentByLevelUuid.get(levelKey);
  }

  const nameKey = normalizeSkinName(displayName);
  if (nameKey && skinParentByName?.has(nameKey)) {
    return skinParentByName.get(nameKey);
  }

  if (nameKey) {
    for (const [parentName, parentData] of skinParentByName?.entries() || []) {
      if (parentName.includes(nameKey) || nameKey.includes(parentName)) {
        return parentData;
      }
    }
  }

  return null;
};

const extractPrice = (costs = {}, preferredCurrency = 'VP') => {
  const entries = Object.entries(costs || {});
  if (!entries.length) return null;
  const match = entries.find(([currencyId]) => currencyAliases[currencyId] === preferredCurrency) || entries[0];
  return match ? { currencyId: match[0], amount: match[1] } : null;
};

export const fetchRawStorefront = async (shard, puuid, authDetails) => {
  const { accessToken, entitlementToken, clientVersion, authToken } = authDetails;
  const clientPlatform = 'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';
  const candidateShards = getStorefrontCandidateShards(shard);
  const attempts = [];

  for (const activeShard of candidateShards) {
    const url = `https://pd.${activeShard}.a.pvp.net/store/v3/storefront/${puuid}`;

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

      return {
        shard: activeShard,
        url,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      attempts.push({
        shard: activeShard,
        url,
        status: error.response?.status || null,
        data: error.response?.data ?? null,
        message: error.message
      });

      if (error.response?.status === 404) {
        continue;
      }

      throw error;
    }
  }

  const lastAttempt = attempts.at(-1);
  const err = new Error(lastAttempt?.data?.message || lastAttempt?.message || 'Storefront unavailable on all shards.');
  err.attempts = attempts;
  err.status = lastAttempt?.status || 502;
  err.data = lastAttempt?.data ?? null;
  throw err;
};

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
      if (!storeData) {
        throw new Error('Empty storefront response');
      }

      const featuredBundle = storeData.FeaturedBundle || null;
      const skinsPanel = storeData.SkinsPanelLayout || null;
      const bonusStore = storeData.BonusStore || null;
      const accessoryStore = storeData.AccessoryStore || null;

      const result = {
        featuredBundles: [],
        skinsPanel: null,
        bonusStore: null,
        accessoryStore: null
      };

      if (featuredBundle) {
        result.featuredBundles = await buildFeaturedBundles(featuredBundle);
      }

      if (skinsPanel) {
        const offers = [];
        const singleOffers = skinsPanel.SingleItemStoreOffers || skinsPanel.SingleItemOffers || [];
        for (const offer of singleOffers) {
          const reward = offer.Rewards?.[0] || null;
          const itemId = reward?.ItemID;
          const itemTypeId = reward?.ItemTypeID;
          if (!itemId) continue;
          let meta = itemTypeId ? await resolveMetaByItem(itemId, itemTypeId) : await resolveSkin(itemId);
          if (!meta.contentTierUuid && itemTypeId === 'e7c63390-eda7-46e0-bb7a-a6abdacd2433') {
            const parent = await resolveParentSkinByLevel(itemId, meta.displayName);
            if (parent) {
              meta = {
                ...meta,
                contentTierUuid: parent.contentTierUuid,
                contentTier: parent.contentTierUuid ? await resolveContentTier(parent.contentTierUuid) : null
              };
            }
          }
          const price = extractPrice(offer.Cost || {}, 'VP');
          offers.push({
            itemId,
            itemTypeId,
            offerId: offer.OfferID || itemId,
            priceVP: price ? price.amount : null,
            priceCurrency: price ? currencyAliases[price.currencyId] || price.currencyId : 'VP',
            metadata: meta
          });
        }
        result.skinsPanel = {
          remainingDurationInSeconds: skinsPanel.SingleItemOffersRemainingDurationInSeconds || null,
          offers
        };
      }

      if (bonusStore?.BonusStoreOffers?.length) {
        const offers = [];
        for (const offer of bonusStore.BonusStoreOffers) {
          const reward = offer.Offer?.Rewards?.[0] || null;
          const itemId = reward?.ItemID;
          const itemTypeId = reward?.ItemTypeID;
          if (!itemId) continue;
          const meta = itemTypeId ? await resolveMetaByItem(itemId, itemTypeId) : await resolveSkin(itemId);
          const basePrice = extractPrice(offer.Offer?.Cost || {}, 'VP');
          let discountedPrice = extractPrice(offer.Offer?.DiscountCosts || {}, 'VP');
          const discountPercent = offer.DiscountPercent || null;

          if (!discountedPrice && basePrice && discountPercent) {
            discountedPrice = {
              currencyId: basePrice.currencyId,
              amount: Math.round(basePrice.amount * (100 - discountPercent) / 100)
            };
          }

          offers.push({
            itemId,
            itemTypeId,
            basePrice: basePrice ? basePrice.amount : null,
            discountedPrice: discountedPrice ? discountedPrice.amount : null,
            discountPercent,
            metadata: meta
          });
        }
        result.bonusStore = { offers };
      }

      if (accessoryStore?.AccessoryStoreOffers?.length) {
        const offers = [];
        for (const offer of accessoryStore.AccessoryStoreOffers) {
          const reward = offer.Offer?.Rewards?.[0] || null;
          const itemId = reward?.ItemID;
          const itemTypeId = reward?.ItemTypeID;
          if (!itemId) continue;
          const meta = itemTypeId ? await resolveMetaByItem(itemId, itemTypeId) : await resolveSkin(itemId);
          const price = extractPrice(offer.Offer?.Cost || {}, 'KC');
          offers.push({
            itemId,
            itemTypeId,
            price: price ? price.amount : null,
            priceCurrency: price ? currencyAliases[price.currencyId] || price.currencyId : 'KC',
            metadata: meta
          });
        }
        result.accessoryStore = { offers };
      }

      const flattened = [];
      if (result.skinsPanel?.offers) flattened.push(...result.skinsPanel.offers.map(o => ({ uuid: o.itemId, displayName: o.metadata?.displayName || '', displayIcon: o.metadata?.displayIcon || null })));
      if (result.bonusStore?.offers) flattened.push(...result.bonusStore.offers.map(o => ({ uuid: o.itemId, displayName: o.metadata?.displayName || '', displayIcon: o.metadata?.displayIcon || null })));
      if (result.featuredBundles?.length) {
        result.featuredBundles.forEach((bundle) => {
          flattened.push(...(bundle.items || []).map((item) => ({
            uuid: item.itemId,
            displayName: item.metadata?.displayName || '',
            displayIcon: item.metadata?.displayIcon || null
          })));
        });
      }
      if (result.accessoryStore?.offers) flattened.push(...result.accessoryStore.offers.map(o => ({ uuid: o.itemId, displayName: o.metadata?.displayName || '', displayIcon: o.metadata?.displayIcon || null })));

      return { storefront: result, offers: flattened, shard: activeShard };
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
  return { storefront: { featuredBundles: [], skinsPanel: null, bonusStore: null, accessoryStore: null }, offers: [], shard: shard || 'ap', warning: fallbackMessage };
};
