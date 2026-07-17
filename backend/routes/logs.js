import express from 'express';
import Log from '../models/Log.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { riotId, shard, timestamp } = req.body || {};
    if (!riotId) {
      return res.status(400).json({ message: 'riotId is required' });
    }

    const log = await Log.create({
      riotId,
      shard: shard || '',
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
