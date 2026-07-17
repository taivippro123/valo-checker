import mongoose from 'mongoose';

const schema = new mongoose.Schema({}, { strict: false });
const RiotAccount = mongoose.model('RiotAccount', schema, 'riotaccounts');

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/valo-check');
  console.log('Connected to DB');
  
  const accounts = await RiotAccount.find({});
  console.log('Accounts in DB:');
  console.log(JSON.stringify(accounts, null, 2));
  
  await mongoose.disconnect();
}

run().catch(console.error);
