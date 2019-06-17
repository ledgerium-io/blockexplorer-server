const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blockSchema = new Schema({
     difficulty: Number,
     extraData: String,
     gasLimit: Number,
     gasUsed: Number,
     hash: String,
     logsBloom: String,
     miner: String,
     mixHash: String,
     nonce: String,
     number: { type: Number, index: { unique: true } },
     parentHash: String,
     receiptsRoot: String,
     sha3Uncles: String,
     size: Number,
     stateRoot: String,
     timestamp: Number,
     totalDifficulty: Number,
     transactions: Array,
     transactionsRoot: String,
     uncles: Array,
     validators: Array,
});

module.exports = mongoose.model('Block', blockSchema);
