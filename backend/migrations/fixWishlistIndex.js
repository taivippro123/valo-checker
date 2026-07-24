import mongoose from 'mongoose';
import WishlistItem from '../models/WishlistItem.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const fixWishlistIndex = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/valo-check';
    console.log('Using MongoDB URI:', mongoUri);
    await mongoose.connect(mongoUri);
    
    console.log('Getting current indexes...');
    const indexes = await WishlistItem.collection.indexes();
    console.log('Current indexes:', indexes.map(i => ({ name: i.name, key: i.key })));
    
    // Check if the old single-field unique index exists
    const oldIndex = indexes.find(i => i.key && i.key.skinUuid === 1 && !i.key.accountId);
    
    if (oldIndex) {
      console.log('Found old skinUuid unique index, dropping it...');
      await WishlistItem.collection.dropIndex('skinUuid_1');
      console.log('Old index dropped successfully.');
    } else {
      console.log('Old skinUuid unique index not found, skipping drop.');
    }
    
    console.log('Ensuring compound index exists...');
    await WishlistItem.syncIndexes();
    console.log('Compound index ensured.');
    
    console.log('Final indexes:', (await WishlistItem.collection.indexes()).map(i => ({ name: i.name, key: i.key })));
    console.log('Migration completed successfully!');
  } catch (error) {
    if (error.code === 27) {
      console.log('Index does not exist, skipping drop.');
    } else if (error.code === 26) {
      console.log('Collection does not exist yet, skipping migration.');
    } else {
      console.error('Migration failed:', error.message);
      throw error;
    }
  } finally {
    await mongoose.disconnect();
  }
};

fixWishlistIndex();
