import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * GET /api/skins
 * Fetches all available skins from valorant-api.com and maps them
 * to their corresponding level-1 UUID (which Riot uses in storefront offers).
 */
router.get('/', async (req, res) => {
  try {
    console.log('[SkinsAPI] Fetching all weapon skins from Valorant-API...');
    const response = await axios.get('https://valorant-api.com/v1/weapons/skins');
    
    if (response.data && response.data.data) {
      // Filter out base/standard skins (default weapon appearances)
      const filteredSkins = response.data.data.filter(skin => {
        const isStandard = skin.displayName.toLowerCase().startsWith('standard') || 
                           skin.displayName.toLowerCase().includes('random');
        return skin.displayIcon && !isStandard;
      });

      const mappedSkins = filteredSkins.map(skin => {
        // In storefront offers, Riot sells the first level of the skin level, not the base skin UUID itself.
        // We resolve and store the levelUuid (usually levels[0].uuid) for precise matchmaking.
        const levelUuid = skin.levels && skin.levels.length > 0 
          ? skin.levels[0].uuid 
          : skin.uuid;

        return {
          uuid: skin.uuid,
          levelUuid: levelUuid,
          displayName: skin.displayName,
          displayIcon: skin.displayIcon,
          chromas: skin.chromas || []
        };
      });

      // Sort alphabetically
      mappedSkins.sort((a, b) => a.displayName.localeCompare(b.displayName));

      console.log(`[SkinsAPI] Resolved and sorted ${mappedSkins.length} skins.`);
      res.json(mappedSkins);
    } else {
      throw new Error('Invalid response structure from Valorant-API');
    }
  } catch (error) {
    console.error('[SkinsAPI] Error retrieving skins:', error.message);
    res.status(500).json({ message: `Failed to fetch skins: ${error.message}` });
  }
});

export default router;
