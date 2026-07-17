import express from 'express';
import RiotAccount from '../models/RiotAccount.js';
import { encrypt, decrypt } from '../services/encryptionService.js';
import { checkAccountStorefront } from '../jobs/storeCron.js';
import { loginToRiot, getEntitlements, getUserInfo, refreshTokenWithCookie } from '../services/riotAuthService.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all accounts (masking passwords)
router.get('/', protect, async (req, res) => {
  try {
    const accounts = await RiotAccount.find({});
    // Return with decrypted/plain alias, shard, puuid, ntfyTopic, lastChecked, wishlist, and masked credentials
    const safeAccounts = accounts.map(acc => {
      let decryptedUser = '';
      if (acc.authMode === 'token') {
        decryptedUser = acc.username; // Already stored in plain text as "Name#TAG"
      } else {
        try {
          decryptedUser = decrypt(acc.username);
        } catch (err) {
          decryptedUser = 'Decryption Error';
        }
      }
      return {
        _id: acc._id,
        username: decryptedUser, // show decrypted username for visibility
        alias: acc.alias,
        shard: acc.shard,
        puuid: acc.puuid,
        wishlist: acc.wishlist,
        ntfyTopic: acc.ntfyTopic,
        lastChecked: acc.lastChecked,
        authMode: acc.authMode,
        tokenExpiresAt: acc.tokenExpiresAt
      };
    });
    res.json(safeAccounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add new Riot Account (or link/verify via redirect URL token)
router.post('/', protect, async (req, res) => {
  const { authMode, redirectUrl, cookieString, username, password, alias, shard, ntfyTopic } = req.body;

  if (authMode === 'token') {
    if (!redirectUrl && !cookieString) {
      return res.status(400).json({ message: 'Riot redirect URL or cookie string is required for Token Mode.' });
    }

    try {
      let accessToken;
      let entitlementToken;
      let tokenExpiresAt = new Date(Date.now() + 3600 * 1000);
      let puuid = '';
      let playerUsername = 'Riot Account#VNM';

      if (cookieString) {
        const cookieAuth = await refreshTokenWithCookie(cookieString);
        accessToken = cookieAuth.accessToken;
        entitlementToken = cookieAuth.entitlementToken;
        tokenExpiresAt = new Date(Date.now() + (cookieAuth.expiresIn || 3600) * 1000);
        puuid = cookieAuth.puuid || '';

        if (cookieAuth.idToken) {
          try {
            const tokenParts = cookieAuth.idToken.split('.');
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
            if (payload.acct) {
              playerUsername = `${payload.acct.game_name}#${payload.acct.tag_line}`;
            }
          } catch (_) {
            const userInfo = await getUserInfo(accessToken);
            playerUsername = `${userInfo.gameName}#${userInfo.tagLine}`;
          }
        } else {
          const userInfo = await getUserInfo(accessToken);
          playerUsername = `${userInfo.gameName}#${userInfo.tagLine}`;
        }
      } else {
        // 1. Extract access token from redirect URL
        const urlObj = new URL(redirectUrl.replace('#', '?'));
        accessToken = urlObj.searchParams.get('access_token');
        if (!accessToken) {
          return res.status(400).json({ message: 'Invalid redirect URL. Token not found.' });
        }

        // 2. Fetch entitlements token
        entitlementToken = await getEntitlements(accessToken);
        tokenExpiresAt = new Date(Date.now() + 3600 * 1000);

        const idToken = urlObj.searchParams.get('id_token');
        if (idToken) {
          try {
            const tokenParts = idToken.split('.');
            const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
            if (payload.acct) {
              playerUsername = `${payload.acct.game_name}#${payload.acct.tag_line}`;
            }
          } catch (_) {
            const userInfo = await getUserInfo(accessToken);
            playerUsername = `${userInfo.gameName}#${userInfo.tagLine}`;
          }
        } else {
          const userInfo = await getUserInfo(accessToken);
          playerUsername = `${userInfo.gameName}#${userInfo.tagLine}`;
        }

        const tokenParts = accessToken.split('.');
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
        puuid = payload.sub;
      }

      // 5. Check if account already exists
      let account = await RiotAccount.findOne({ puuid });

      if (account) {
        console.log(`[AccountsAPI] Account already exists. Updating token credentials for: ${account.alias}`);
        account.username = playerUsername;
        account.accessToken = accessToken;
        account.entitlementToken = entitlementToken;
        account.tokenExpiresAt = tokenExpiresAt;
        account.cookieString = cookieString || account.cookieString;
        account.authMode = 'token';
        account.alias = alias || account.alias;
        account.shard = shard || account.shard;
        account.ntfyTopic = ntfyTopic !== undefined ? ntfyTopic : account.ntfyTopic;
        await account.save();
      } else {
        console.log(`[AccountsAPI] Registering new token account: ${playerUsername}`);
        account = await RiotAccount.create({
          username: playerUsername,
          alias: alias || playerUsername,
          shard: shard || 'ap',
          ntfyTopic: ntfyTopic || '',
          puuid,
          authMode: 'token',
          accessToken,
          entitlementToken,
          tokenExpiresAt,
          cookieString: cookieString || ''
        });
      }

      return res.status(201).json({
        _id: account._id,
        username: account.username,
        alias: account.alias,
        shard: account.shard,
        puuid: account.puuid,
        wishlist: account.wishlist,
        ntfyTopic: account.ntfyTopic,
        lastChecked: account.lastChecked,
        authMode: account.authMode,
        tokenExpiresAt: account.tokenExpiresAt
      });
    } catch (error) {
      console.error('[AccountsAPI] Token registration failed:', error.message);
      if (error.message === 'COOKIE_EXPIRED') {
        return res.status(400).json({ message: 'Cookie expired or invalid. Please update the session cookie.' });
      }
      return res.status(400).json({ message: `Token registration check failed: ${error.message}` });
    }
  }

  // Standard Username / Password registration Mode
  if (!username || !password || !alias) {
    return res.status(400).json({ message: 'Username, password, and alias are required.' });
  }

  try {
    // 1. Verify Riot credentials work and fetch initial PUUID
    console.log(`[AccountsAPI] Verifying credentials for new account: ${alias}...`);
    let puuid = '';
    try {
      const authResult = await loginToRiot(username, password);
      puuid = authResult.puuid;
    } catch (authError) {
      return res.status(400).json({ 
        message: `Riot authentication check failed: ${authError.message}. Account not added.` 
      });
    }

    // 2. Encrypt credentials
    const encryptedUsername = encrypt(username);
    const encryptedPassword = encrypt(password);

    // 3. Save to database
    const newAccount = await RiotAccount.create({
      username: encryptedUsername,
      password: encryptedPassword,
      alias,
      shard: shard || 'ap',
      puuid,
      authMode: 'credentials',
      ntfyTopic: ntfyTopic || ''
    });

    res.status(201).json({
      _id: newAccount._id,
      username,
      alias: newAccount.alias,
      shard: newAccount.shard,
      puuid: newAccount.puuid,
      wishlist: newAccount.wishlist,
      ntfyTopic: newAccount.ntfyTopic,
      lastChecked: newAccount.lastChecked,
      authMode: newAccount.authMode
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Riot Account
router.put('/:id', protect, async (req, res) => {
  const { alias, shard, ntfyTopic, wishlist, username, password, authMode, redirectUrl, cookieString } = req.body;

  try {
    const account = await RiotAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Riot Account not found' });
    }

    account.alias = alias !== undefined ? alias : account.alias;
    account.shard = shard !== undefined ? shard : account.shard;
    account.ntfyTopic = ntfyTopic !== undefined ? ntfyTopic : account.ntfyTopic;
    account.wishlist = wishlist !== undefined ? wishlist : account.wishlist;
    account.cookieString = cookieString !== undefined ? cookieString : account.cookieString;

    // Refresh token details if provided in Token Mode
    if (authMode === 'token' && (redirectUrl || cookieString)) {
      try {
        console.log(`[AccountsAPI] Updating token for account: ${account.alias}...`);

        let accessToken;
        let entitlementToken;
        let tokenExpiresAt = new Date(Date.now() + 3600 * 1000);
        let playerUsername = account.username;

        if (cookieString) {
          const cookieAuth = await refreshTokenWithCookie(cookieString);
          accessToken = cookieAuth.accessToken;
          entitlementToken = cookieAuth.entitlementToken;
          tokenExpiresAt = new Date(Date.now() + (cookieAuth.expiresIn || 3600) * 1000);
          account.puuid = cookieAuth.puuid || account.puuid;

          if (cookieAuth.idToken) {
            try {
              const tokenParts = cookieAuth.idToken.split('.');
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
              if (payload.acct) {
                playerUsername = `${payload.acct.game_name}#${payload.acct.tag_line}`;
              }
            } catch (_) {
              const userInfo = await getUserInfo(accessToken);
              playerUsername = `${userInfo.gameName}#${userInfo.tagLine}`;
            }
          } else {
            const userInfo = await getUserInfo(accessToken);
            playerUsername = `${userInfo.gameName}#${userInfo.tagLine}`;
          }
        } else {
          const urlObj = new URL(redirectUrl.replace('#', '?'));
          accessToken = urlObj.searchParams.get('access_token');
          if (!accessToken) {
            return res.status(400).json({ message: 'Invalid redirect URL. Token not found.' });
          }
          entitlementToken = await getEntitlements(accessToken);
          tokenExpiresAt = new Date(Date.now() + 3600 * 1000);

          const idToken = urlObj.searchParams.get('id_token');
          if (idToken) {
            try {
              const tokenParts = idToken.split('.');
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
              if (payload.acct) {
                playerUsername = `${payload.acct.game_name}#${payload.acct.tag_line}`;
              }
            } catch (_) {
              const userInfo = await getUserInfo(accessToken);
              playerUsername = `${userInfo.gameName}#${userInfo.tagLine}`;
            }
          } else {
            const userInfo = await getUserInfo(accessToken);
            playerUsername = `${userInfo.gameName}#${userInfo.tagLine}`;
          }

          const tokenParts = accessToken.split('.');
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString('utf8'));
          if (account.puuid && account.puuid !== payload.sub) {
            return res.status(400).json({ 
              message: 'Authentication mismatch: The logged-in Riot account does not match this account profile.' 
            });
          }
        }

        account.username = playerUsername;
        account.accessToken = accessToken || account.accessToken;
        account.entitlementToken = entitlementToken || account.entitlementToken;
        account.tokenExpiresAt = tokenExpiresAt;
        account.authMode = 'token';
      } catch (tokenError) {
        if (tokenError.message === 'COOKIE_EXPIRED') {
          return res.status(400).json({ message: 'Cookie expired or invalid. Please update the session cookie.' });
        }
        return res.status(400).json({ 
          message: `Failed to refresh token: ${tokenError.message}` 
        });
      }
    }

    // Re-verify and update credentials if provided in Credentials Mode
    if (authMode === 'credentials' && username && password) {
      try {
        console.log(`[AccountsAPI] Verifying updated credentials for account: ${account.alias}...`);
        const authResult = await loginToRiot(username, password);
        account.puuid = authResult.puuid;
        account.username = encrypt(username);
        account.password = encrypt(password);
        account.authMode = 'credentials';
      } catch (authError) {
        return res.status(400).json({ 
          message: `Riot authentication check failed for updated credentials: ${authError.message}.` 
        });
      }
    }

    const updatedAccount = await account.save();
    
    // Return safe data
    let decryptedUser = '';
    if (updatedAccount.authMode === 'token') {
      decryptedUser = updatedAccount.username;
    } else {
      try {
        decryptedUser = decrypt(updatedAccount.username);
      } catch (err) {
        decryptedUser = 'Decryption Error';
      }
    }

    res.json({
      _id: updatedAccount._id,
      username: decryptedUser,
      alias: updatedAccount.alias,
      shard: updatedAccount.shard,
      puuid: updatedAccount.puuid,
      wishlist: updatedAccount.wishlist,
      ntfyTopic: updatedAccount.ntfyTopic,
      lastChecked: updatedAccount.lastChecked,
      authMode: updatedAccount.authMode,
      tokenExpiresAt: updatedAccount.tokenExpiresAt
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Riot Account
router.delete('/:id', protect, async (req, res) => {
  try {
    const account = await RiotAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Riot Account not found' });
    }

    await RiotAccount.deleteOne({ _id: req.params.id });
    res.json({ message: 'Riot Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Trigger manual storefront check
router.post('/:id/check', protect, async (req, res) => {
  try {
    const account = await RiotAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Riot Account not found' });
    }

    const result = await checkAccountStorefront(account);
    if (result.success) {
      res.json({
        message: 'Storefront check completed successfully.',
        storefront: result.storefront || null,
        offers: result.offers || []
      });
    } else {
      res.status(500).json({ 
        message: `Storefront check failed: ${result.error}` 
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
