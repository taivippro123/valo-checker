import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  riotId: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  shard: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

const Log = mongoose.model('Log', logSchema);

export default Log;
