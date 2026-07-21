import { decrypt } from '../services/encryptionService.js';
import { authenticateAccount, getClientVersion, refreshTokenWithCookie } from '../services/riotAuthService.js';
import { fetchAccountStore } from '../services/storeService.js';

/**
 * Execute storefront check for a single account.
 * @param {object} account Mongoose RiotAccount document
 */
export const checkAccountStorefront = async (account) => {
  console.log(`[StoreCron] Starting storefront check for account: ${account.alias} (${account.username})`);

  try {
    let authDetails;

    if (account.authMode === 'token') {
      const now = new Date();
      const expiresAt = account.tokenExpiresAt ? new Date(account.tokenExpiresAt) : null;
      const isExpired = !account.accessToken || (expiresAt && now >= expiresAt);
      const isExpiringSoon = expiresAt && expiresAt.getTime() - now.getTime() < 10 * 60 * 1000;

      if (isExpired || isExpiringSoon) {
        if (account.cookieString && account.cookieString.trim()) {
          try {
            console.log(`[StoreCron] Attempting cookie reauth for token refresh on account: ${account.alias}`);
            const cookieAuth = await refreshTokenWithCookie(account.cookieString);
            account.accessToken = cookieAuth.accessToken;
            account.entitlementToken = cookieAuth.entitlementToken;
            account.tokenExpiresAt = new Date(Date.now() + (cookieAuth.expiresIn || 3600) * 1000);
            if (cookieAuth.puuid) {
              account.puuid = cookieAuth.puuid;
            }
            await account.save();
            console.log(`[StoreCron] Successfully refreshed token via cookie for account: ${account.alias}`);
          } catch (cookieError) {
            console.error(`[StoreCron] Cookie reauth failed for ${account.alias}:`, cookieError.message);
            if (cookieError.message === 'COOKIE_EXPIRED') {
              throw new Error('COOKIE_EXPIRED');
            }
            throw cookieError;
          }
        } else {
          throw new Error('TOKEN_EXPIRED');
        }
      }

      const clientVersion = await getClientVersion();
      authDetails = {
        accessToken: account.accessToken,
        entitlementToken: account.entitlementToken,
        puuid: account.puuid,
        clientVersion
      };
      console.log(`[StoreCron] Using saved token for account: ${account.alias}`);
    } else {
      const decryptedUsername = decrypt(account.username);
      const decryptedPassword = decrypt(account.password);
      authDetails = await authenticateAccount(decryptedUsername, decryptedPassword);
      if (authDetails.shard) {
        account.shard = authDetails.shard;
      }
    }

    if (!account.puuid || account.puuid !== authDetails.puuid) {
      account.puuid = authDetails.puuid;
    }

    const { storefront, offers: flattenedOffers, shard: resolvedShard } = await fetchAccountStore(account.shard, authDetails.puuid, authDetails);
    if (resolvedShard && account.shard !== resolvedShard) {
      account.shard = resolvedShard;
      console.log(`[StoreCron] Updated account shard to ${resolvedShard} for ${account.alias}`);
    }

    account.lastChecked = new Date();
    await account.save();

    return { success: true, storefront, offers: flattenedOffers };
  } catch (error) {
    console.error(`[StoreCron] Error checking account ${account.alias}:`, error.message);
    return { success: false, error: error.message };
  }
};

export default checkAccountStorefront;
