import cron from 'node-cron';
import RiotAccount from '../models/RiotAccount.js';
import { decrypt } from '../services/encryptionService.js';
import { authenticateAccount, getClientVersion } from '../services/riotAuthService.js';
import { fetchAccountStore } from '../services/storeService.js';
import { sendPushNotification } from '../services/ntfyService.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute storefront check for a single account
 * @param {object} account Mongoose RiotAccount document
 */
export const checkAccountStorefront = async (account) => {
  console.log(`[StoreCron] Starting storefront check for account: ${account.alias} (${account.username})`);
  
  try {
    let authDetails;
    
    if (account.authMode === 'token') {
      // Check if token is expired (1 hour TTL)
      if (account.tokenExpiresAt && new Date() > new Date(account.tokenExpiresAt)) {
        throw new Error('TOKEN_EXPIRED');
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
      // 1. Decrypt credentials
      const decryptedUsername = decrypt(account.username);
      const decryptedPassword = decrypt(account.password);

      // 2. Perform authentication flow
      authDetails = await authenticateAccount(decryptedUsername, decryptedPassword);
      if (authDetails.shard) {
        account.shard = authDetails.shard;
      }
    }
    
    // Update stored PUUID if it was empty
    if (!account.puuid || account.puuid !== authDetails.puuid) {
      account.puuid = authDetails.puuid;
    }

    // 3. Fetch storefront offers
    const { storefront, offers: flattenedOffers, shard: resolvedShard } = await fetchAccountStore(account.shard, authDetails.puuid, authDetails);
    if (resolvedShard && account.shard !== resolvedShard) {
      account.shard = resolvedShard;
      console.log(`[StoreCron] Updated account shard to ${resolvedShard} for ${account.alias}`);
    }
    
    // 4. Update lastChecked timestamp
    account.lastChecked = new Date();
    await account.save();

    // 5. Compare with wishlist
    const wishlistSet = new Set((account.wishlist || []).map(id => id.toLowerCase()));
    const matchedSkins = [];

    for (const offer of flattenedOffers || []) {
      if (offer.uuid && wishlistSet.has(offer.uuid.toLowerCase())) {
        matchedSkins.push(offer);
      }
    }

    // 6. Alert on match
    if (matchedSkins.length > 0) {
      console.log(`[StoreCron] MATCH FOUND on account ${account.alias}! Matches:`, matchedSkins.map(s => s.displayName));
      
      for (const skin of matchedSkins) {
        const title = `🚨 VALORANT SKIN FOUND!`;
        const body = `"${skin.displayName}" is available in the daily shop for account: ${account.alias}!`;
        await sendPushNotification(account.ntfyTopic, body, title);
      }
    } else {
      console.log(`[StoreCron] No wishlist matches for account: ${account.alias}`);
    }

    return { success: true, storefront, offers: flattenedOffers };
  } catch (error) {
    console.error(`[StoreCron] Error checking account ${account.alias}:`, error.message);
    
    // If it's a critical auth/MFA error, alert the user via ntfy if they have a topic
    if (account.ntfyTopic) {
      const errorMsg = error.message === 'MFA_REQUIRED' 
        ? `Riot Account verification failed for "${account.alias}": Multi-factor authentication is active on your account. Please log in manually once.`
        : `Store check failed for "${account.alias}": ${error.message}`;
      await sendPushNotification(account.ntfyTopic, errorMsg, `❌ VALORANT CHECK ERROR`);
    }

    return { success: false, error: error.message };
  }
};

/**
 * Perform storefront check for all stored Riot accounts sequentially
 */
export const checkAllAccounts = async () => {
  console.log('[StoreCron] Starting sequential daily shop checker run...');
  try {
    const accounts = await RiotAccount.find({});
    if (accounts.length === 0) {
      console.log('[StoreCron] No Riot accounts found in database. Skipping check.');
      return;
    }

    console.log(`[StoreCron] Found ${accounts.length} accounts to check.`);
    
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      
      // Run the check for this account
      await checkAccountStorefront(account);

      // Delay 30 seconds between accounts if not the last account to avoid rate limits
      if (i < accounts.length - 1) {
        console.log(`[StoreCron] Waiting 30 seconds before checking next account...`);
        await delay(30000);
      }
    }
    console.log('[StoreCron] Completed daily storefront check run.');
  } catch (err) {
    console.error('[StoreCron] Error executing accounts loop:', err.message);
  }
};

/**
 * Initialize the node-cron scheduler
 */
export const initCronScheduler = () => {
  const schedulePattern = process.env.CRON_SCHEDULE || '5 7 * * *'; // default 07:05 AM
  const timezone = process.env.TIMEZONE || 'Asia/Ho_Chi_Minh';
  
  console.log(`[StoreCron] Initializing cron job pattern "${schedulePattern}" for timezone "${timezone}"`);
  
  cron.schedule(schedulePattern, () => {
    console.log('[StoreCron] Scheduled cron job triggered.');
    checkAllAccounts();
  }, {
    timezone
  });
};
