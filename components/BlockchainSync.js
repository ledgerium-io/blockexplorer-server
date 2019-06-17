const dotenv = require('dotenv').config()
const io = require('../index')
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_HTTP));
const web32 = new Web3(new Web3.providers.WebsocketProvider(process.env.WEB3_WS));
   const subscription = web32.eth.subscribe('newBlockHeaders', function(error, result){
       if (!error) {
           console.log(result);
           process.exit(0)
           return;
       }

       console.error(error);
   })
   .on("data", function(blockHeader){
       console.log(blockHeader);
   })
   .on("error", console.error);
const Block = require('../models/Block')
const Transaction = require('../models/Transaction')
const Address = require('../models/Address')
const chalk = require('chalk')
class BlockchainSync {
  constructor() {
    this.latestBlock = {}
    this.lastBlockProcessed = {}
    this.currentMiner = ''
    this.currentValidators = []
    this.checkSync()
  }

  commenceSync() {

  }

  lastKnownBlock() {
    return new Promise((resolve, reject) => {
      Block.findOne().sort({ _id: -1 })
        .then(block => {
          resolve(block)
        })
        .catch(error => {
          reject(error)
        })
    })
  }

  getLatestBlock() {
    return new Promise((resolve, reject) => {
      web3.eth.getBlock('latest')
        .then(block => {
          resolve(block)
        })
        .catch(error => {
          reject(error)
        })
    })
  }

  checkSync() {
    Promise.all([
      this.lastKnownBlock(),
      this.getLatestBlock()
    ])
    .then(data => {
      this.lastBlockProcessed = data[0].number
      this.latestBlock = data[1].number
      if(data[0].number < data[1].number) {
        console.log(chalk.yellow(`[!] Out of sync: ${data[0].number.toLocaleString()}/${data[1].number.toLocaleString()} blocks`))
      }
    })
  }


}

module.exports = BlockchainSync
