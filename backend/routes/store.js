import express from 'express';
import Log from '../models/Log.js';
import { getEntitlements, getClientVersion, getRiotGeo, resolveShardFromRiotGeo, getUserInfo } from '../services/riotAuthService.js';
import { fetchAccountStore, fetchRawStorefront, buildFeaturedBundles } from '../services/storeService.js';

const router = express.Router();

const parseRiotAuthResponse = (rawUrl, providedAccessToken, providedIdToken, providedExpiresIn) => {
  if (providedAccessToken) {
    return {
      accessToken: providedAccessToken,
      idToken: providedIdToken || '',
      expiresIn: providedExpiresIn || ''
    };
  }

  if (!rawUrl || typeof rawUrl !== 'string') {
    return { accessToken: '', idToken: '', expiresIn: '' };
  }

  const normalized = rawUrl.trim();
  const hashIndex = normalized.indexOf('#');
  const hashPart = hashIndex >= 0 ? normalized.slice(hashIndex + 1) : '';
  const queryPart = normalized.includes('?') ? normalized.split('?')[1].split('#')[0] : '';
  const params = new URLSearchParams(`${queryPart}&${hashPart}`);

  return {
    accessToken: params.get('access_token') || params.get('accessToken') || '',
    idToken: params.get('id_token') || params.get('idToken') || '',
    expiresIn: params.get('expires_in') || params.get('expiresIn') || ''
  };
};

router.post('/test/featured-bundle', async (req, res) => {
  try {
    const { redirectUrl, accessToken: providedAccessToken, idToken: providedIdToken, expiresIn: providedExpiresIn } = req.body || {};
    const { accessToken, idToken, expiresIn } = parseRiotAuthResponse(redirectUrl, providedAccessToken, providedIdToken, providedExpiresIn);

    if (!accessToken) {
      return res.status(400).json({ message: 'Please provide a Riot redirect URL containing an access_token.' });
    }

    const entitlementToken = await getEntitlements(accessToken);
    const clientVersion = await getClientVersion();
    const riotGeo = await getRiotGeo(accessToken, idToken, entitlementToken);
    const shard = resolveShardFromRiotGeo(riotGeo, 'ap');

    const tokenParts = accessToken.split('.');
    if (tokenParts.length < 2) {
      return res.status(400).json({ message: 'The provided access token is invalid.' });
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
    const puuid = payload.sub;

    const { shard: resolvedShard, data } = await fetchRawStorefront(shard, puuid, {
      accessToken,
      entitlementToken,
      clientVersion,
      authToken: accessToken,
      expiresIn
    });

    const logs = [];
    const featuredBundles = await buildFeaturedBundles(data?.FeaturedBundle, {
      logFn: (message) => logs.push(message)
    });

    res.json({
      success: true,
      shard: resolvedShard,
      puuid,
      featuredTileEntryCount: data?.FeaturedBundle?.FeaturedTileEntries?.length || 0,
      bundleCount: featuredBundles.length,
      logs,
      featuredBundles
    });
  } catch (error) {
    console.error('[StoreRoute] Featured bundle test failed:', error.message);

    if (error.attempts) {
      return res.status(error.status || 502).json({
        message: error.message,
        attempts: error.attempts
      });
    }

    res.status(error.response?.status || 500).json({
      message: error.message || 'Featured bundle test failed.'
    });
  }
});

router.post('/test', async (req, res) => {
  try {
    const { redirectUrl, accessToken: providedAccessToken, idToken: providedIdToken, expiresIn: providedExpiresIn } = req.body || {};
    const { accessToken, idToken, expiresIn } = parseRiotAuthResponse(redirectUrl, providedAccessToken, providedIdToken, providedExpiresIn);

    if (!accessToken) {
      return res.status(400).json({ message: 'Please provide a Riot redirect URL containing an access_token.' });
    }

    const entitlementToken = await getEntitlements(accessToken);
    const clientVersion = await getClientVersion();
    const riotGeo = await getRiotGeo(accessToken, idToken, entitlementToken);
    const shard = resolveShardFromRiotGeo(riotGeo, 'ap');

    const tokenParts = accessToken.split('.');
    if (tokenParts.length < 2) {
      return res.status(400).json({ message: 'The provided access token is invalid.' });
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
    const puuid = payload.sub;

    const { shard: resolvedShard, status, data } = await fetchRawStorefront(shard, puuid, {
      accessToken,
      entitlementToken,
      clientVersion,
      authToken: accessToken,
      expiresIn
    });

    res.set('X-Storefront-Shard', resolvedShard);
    res.status(status).json(data);
  } catch (error) {
    console.error('[StoreRoute] Storefront test failed:', error.message);

    if (error.attempts) {
      return res.status(error.status || 502).json(error.data ?? { message: error.message, attempts: error.attempts });
    }

    const status = error.response?.status || 500;
    const data = error.response?.data ?? { message: error.message || 'Storefront test failed.' };
    res.status(status).json(data);
  }
});

router.post('/check', async (req, res) => {
  try {
    const { redirectUrl, accessToken: providedAccessToken, idToken: providedIdToken, expiresIn: providedExpiresIn } = req.body || {};
    const { accessToken, idToken, expiresIn } = parseRiotAuthResponse(redirectUrl, providedAccessToken, providedIdToken, providedExpiresIn);

    if (!accessToken) {
      return res.status(400).json({ message: 'Please provide a Riot redirect URL containing an access_token.' });
    }

    const entitlementToken = await getEntitlements(accessToken);
    const clientVersion = await getClientVersion();
    const riotGeo = await getRiotGeo(accessToken, idToken, entitlementToken);
    const shard = resolveShardFromRiotGeo(riotGeo, 'ap');
    const userInfo = await getUserInfo(accessToken);

    const tokenParts = accessToken.split('.');
    if (tokenParts.length < 2) {
      return res.status(400).json({ message: 'The provided access token is invalid.' });
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
    const puuid = payload.sub;

    const { storefront, offers, shard: resolvedShard } = await fetchAccountStore(shard, puuid, {
      accessToken,
      entitlementToken,
      clientVersion,
      authToken: accessToken,
      expiresIn
    });

    const riotId = `${userInfo.gameName}#${userInfo.tagLine}`;
    await Log.create({
      riotId,
      shard: resolvedShard || shard,
      timestamp: new Date()
    });

    res.json({
      success: true,
      riotId,
      shard: resolvedShard || shard,
      storefront,
      offers
    });
  } catch (error) {
    console.error('[StoreRoute] Store check failed:', error.message);
    res.status(500).json({ message: error.message || 'Store check failed.' });
  }
});

export default router;
