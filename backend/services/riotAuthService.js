import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import axios from 'axios';

let cachedClientVersion = '';
let lastVersionFetch = 0;

export const buildAuthRequestBody = (username, password) => ({
  type: 'auth',
  language: 'en_US',
  remember: true,
  riot_identity: {
    captcha: '',
    username,
    password
  }
});

const SHARD_ALIASES = {
  ap: 'ap',
  eu: 'eu',
  na: 'na',
  kr: 'kr',
  pbe: 'ap',
  latam: 'na',
  br: 'na',
  'latam-br': 'na',
  'na': 'na',
  'eu': 'eu',
  'ap': 'ap',
  'kr': 'kr'
};

export const resolveShardFromRiotGeo = (geoData, fallbackShard = 'ap') => {
  const affinity = geoData?.affinities?.live || geoData?.affinities?.pbe;
  const normalized = (affinity || '').toLowerCase().trim();
  if (!normalized) {
    return (fallbackShard || 'ap').toLowerCase();
  }

  const resolved = SHARD_ALIASES[normalized] || SHARD_ALIASES[normalized.split('-')[0]];
  if (resolved) {
    return resolved;
  }

  return (fallbackShard || 'ap').toLowerCase();
};

/**
 * Fetch latest client version from valorant-api.com
 */
export const getClientVersion = async () => {
  const now = Date.now();
  // Cache for 1 hour
  if (cachedClientVersion && now - lastVersionFetch < 3600000) {
    return cachedClientVersion;
  }
  
  try {
    const response = await axios.get('https://valorant-api.com/v1/version');
    if (response.data && response.data.data && response.data.data.riotClientVersion) {
      cachedClientVersion = response.data.data.riotClientVersion;
      lastVersionFetch = now;
      console.log(`Fetched latest Riot Client Version: ${cachedClientVersion}`);
      return cachedClientVersion;
    }
    throw new Error('Unexpected client version response structure');
  } catch (error) {
    console.error('Error fetching client version:', error.message);
    // Return a default fallback if API is down
    return cachedClientVersion || 'release-08.11-shipping-21-2550186';
  }
};

/**
 * Perform Riot Auth Flow
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{accessToken: string, puuid: string}>}
 */
export const loginToRiot = async (username, password) => {
  const jar = new CookieJar();
  const client = wrapper(axios.create({
    jar,
    headers: {
      'User-Agent': 'RiotClient/43.0.1.4192661.4190674 rso-auth (Windows)',
      'Content-Type': 'application/json'
    }
  }));

  try {
    // Step 1: Initialize session to collect initial cookies
    console.log(`[RiotAuth] Initializing session...`);
    const initResponse = await client.post('https://auth.riotgames.com/api/v1/authorization', {
      client_id: 'play-valorant-web-prod',
      nonce: '1',
      redirect_uri: 'https://playvalorant.com/opt_in',
      response_type: 'token id_token',
      scope: 'openid link ban lol_region'
    });

    if (initResponse.status !== 200) {
      throw new Error(`Failed to initialize session. Status: ${initResponse.status}`);
    }

    // Step 2: Submit Credentials using the documented auth request body
    console.log(`[RiotAuth] Submitting credentials...`);
    const authResponse = await client.put(
      'https://auth.riotgames.com/api/v1/authorization',
      buildAuthRequestBody(username, password)
    );

    const data = authResponse.data;
    if (data.type === 'multifactor') {
      console.warn(`[RiotAuth] 2FA/Multifactor authentication encountered for user ${username}`);
      throw new Error('MFA_REQUIRED');
    }

    if (data.error) {
      throw new Error(`Auth Error: ${data.error}`);
    }

    const redirectUri = data?.success?.redirect_url || data?.response?.parameters?.uri;
    if (!redirectUri) {
      throw new Error('Authentication failed: Missing response URI');
    }

    console.log(`[RiotAuth] Login success. Extracting tokens from redirect URI...`);
    
    // Extract access_token
    const accessTokenMatch = redirectUri.match(/access_token=([^&]+)/);
    if (!accessTokenMatch) {
      throw new Error('Failed to parse access_token from redirect URI');
    }
    const accessToken = accessTokenMatch[1];
    const idTokenMatch = redirectUri.match(/id_token=([^&]+)/);
    const idToken = idTokenMatch ? idTokenMatch[1] : '';
    const loginToken = data?.success?.login_token || '';

    // Decode PUUID from the accessToken JWT payload
    const tokenParts = accessToken.split('.');
    if (tokenParts.length < 2) {
      throw new Error('Invalid access_token JWT format');
    }
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
    const puuid = payload.sub;

    if (!puuid) {
      throw new Error('Failed to extract PUUID (sub) from JWT');
    }

    console.log(`[RiotAuth] Successfully authenticated. PUUID: ${puuid}`);
    return { accessToken, puuid, idToken, loginToken, authToken: loginToken || accessToken };
  } catch (error) {
    if (error.message === 'MFA_REQUIRED') {
      throw error;
    }
    console.error(`[RiotAuth] Authentication process error:`, error.response?.data || error.message);
    throw new Error(`Riot authentication failed: ${error.response?.data?.error || error.message}`);
  }
};

/**
 * Get Riot Entitlement Token
 * @param {string} accessToken 
 * @returns {Promise<string>}
 */
export const getEntitlements = async (accessToken) => {
  try {
    console.log(`[RiotAuth] Fetching entitlements token...`);
    const response = await axios.post('https://entitlements.auth.riotgames.com/api/token/v1', {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.entitlements_token) {
      return response.data.entitlements_token;
    }
    throw new Error('Entitlements token not found in response');
  } catch (error) {
    console.error(`[RiotAuth] Entitlements fetch error:`, error.response?.data || error.message);
    throw new Error(`Failed to retrieve entitlements: ${error.message}`);
  }
};

const sanitizeCookieString = (cookieString) => {
  if (!cookieString || typeof cookieString !== 'string') {
    return '';
  }

  return cookieString
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [key, ...valueParts] = segment.split('=');
      const value = valueParts.join('=');
      return value ? `${key.trim()}=${value.trim()}` : null;
    })
    .filter(Boolean)
    .join('; ');
};

export const refreshTokenWithCookie = async (cookieString) => {
  try {
    console.log('[RiotAuth] Refreshing token using Riot session cookie...');
    const sanitizedCookie = sanitizeCookieString(cookieString);
    if (!sanitizedCookie) {
      throw new Error('COOKIE_EXPIRED');
    }

    const response = await axios.get(
      'https://auth.riotgames.com/authorize?redirect_uri=https%3A%2F%2Fplayvalorant.com%2Fopt_in&client_id=play-valorant-web-prod&response_type=token%20id_token&nonce=1&scope=account%20openid',
      {
        headers: {
          Cookie: sanitizedCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      }
    );

    if (![302, 303].includes(response.status)) {
      console.error('[RiotAuth] Cookie auth did not redirect as expected.', response.status, response.data?.toString?.());
      throw new Error('COOKIE_EXPIRED');
    }

    const redirectUrl = response.headers.location;
    if (!redirectUrl) {
      throw new Error('COOKIE_EXPIRED');
    }

    if (/authenticate\.riotgames\.com\/login/i.test(redirectUrl)) {
      throw new Error('COOKIE_EXPIRED');
    }

    const hash = redirectUrl.split('#')[1] || '';
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const idToken = params.get('id_token');
    const expiresIn = parseInt(params.get('expires_in') || '3600', 10);

    if (!accessToken) {
      throw new Error('COOKIE_EXPIRED');
    }

    const entitlementToken = await getEntitlements(accessToken);
    const tokenParts = accessToken.split('.');
    if (tokenParts.length < 2) {
      throw new Error('Failed to parse access token payload');
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
    const puuid = payload.sub;

    return {
      accessToken,
      entitlementToken,
      idToken,
      puuid,
      expiresIn,
      setCookies: response.headers['set-cookie'] || []
    };
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error('COOKIE_EXPIRED');
    }
    if (error.message === 'COOKIE_EXPIRED') {
      throw error;
    }

    console.error('[RiotAuth] Cookie reauth error:', error.response?.data || error.message);
    throw new Error(`Cookie reauth failed: ${error.message}`);
  }
};

/**
 * Fetch player profile info (game_name, tag_line) using Access Token
 * @param {string} accessToken 
 * @returns {Promise<{gameName: string, tagLine: string}>}
 */
export const getUserInfo = async (accessToken) => {
  try {
    console.log(`[RiotAuth] Fetching userinfo profile details...`);
    const response = await axios.get('https://auth.riotgames.com/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.data && response.data.acct) {
      const { game_name, tag_line } = response.data.acct;
      return {
        gameName: game_name,
        tagLine: tag_line
      };
    }
    
    // Fallback if acct claims aren't found
    return {
      gameName: 'Riot Account',
      tagLine: 'VNM'
    };
  } catch (error) {
    console.error(`[RiotAuth] Userinfo fetch error:`, error.response?.data || error.message);
    throw new Error(`Failed to retrieve userinfo details: ${error.message}`);
  }
};

/**
 * High-level orchestration function to fetch all auth parameters needed for store APIs
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<{accessToken: string, entitlementToken: string, puuid: string, clientVersion: string}>}
 */
export const getRiotGeo = async (accessToken, idToken, entitlementToken) => {
  try {
    const response = await axios.put('https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant', {
      id_token: idToken
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Riot-Entitlements-JWT': entitlementToken,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.affinities) {
      return response.data;
    }

    return null;
  } catch (error) {
    console.warn('[RiotAuth] Riot Geo lookup failed:', error.response?.data || error.message);
    return null;
  }
};

export const authenticateAccount = async (username, password) => {
  const { accessToken, puuid, idToken, authToken } = await loginToRiot(username, password);
  const entitlementToken = await getEntitlements(accessToken);
  const clientVersion = await getClientVersion();
  let shard = 'ap';

  if (idToken) {
    const geoData = await getRiotGeo(accessToken, idToken, entitlementToken);
    shard = resolveShardFromRiotGeo(geoData, shard);
  }

  return {
    accessToken,
    entitlementToken,
    puuid,
    clientVersion,
    shard,
    authToken
  };
};
