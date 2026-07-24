import mongoose from 'mongoose';
import WishlistItem from '../models/WishlistItem.js';
import Account from '../models/Account.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const migrateExistingWishlist = async () => {
  try {
    console.log('Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/valo-check';
    await mongoose.connect(mongoUri);
    
    console.log('Finding wishlist items without accountId...');
    const itemsWithoutAccount = await WishlistItem.find({ accountId: { $exists: false } });
    
    if (itemsWithoutAccount.length === 0) {
      console.log('No items without accountId found. Migration not needed.');
      return;
    }
    
    console.log(`Found ${itemsWithoutAccount.length} items without accountId`);
    
    // Get first account to assign these items to
    const firstAccount = await Account.findOne();
    if (!firstAccount) {
      console.log('No accounts found. Please create an account first.');
      return;
    }
    
    console.log(`Assigning items to account: ${firstAccount.name} (${firstAccount.id})`);
    
    for (const item of itemsWithoutAccount) {
      item.accountId = firstAccount.id;
      await item.save();
      console.log(`Updated item: ${item.skinName}`);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

migrateExistingWishlist();
