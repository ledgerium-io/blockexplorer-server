const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addressSchema = new Schema({
     address: { type: String, index: { unique: true } },
     balance: Number,
     blockNumber: Number,
     transactions: [],
     type: { type: Number, default: 0 }, // address: 0x0, contract: 0x1
});

module.exports = mongoose.model('Address', addressSchema);
