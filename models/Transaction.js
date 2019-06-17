const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
     blockHash: String,
     blockNumber: Number,
     from: String,
     gas: Number,
     gasPrice: Number,
     hash: { type: String, index: { unique: true } },
     input: String,
     nonce: Number,
     r: String,
     s: String,
     to: String,
     transactionIndex: Number,
     v: String,
     value: Number
});

module.exports = mongoose.model('Transaction', transactionSchema);
