const dotenv = require('dotenv').config()
const io = require('../index')
const chalk = require('chalk')
const Address = require('../models/Address')
const Block = require('../models/Block')
const Transaction = require('../models/Transaction')
const Web3 = require('web3')
const commandLineArguments = process.argv.slice(2)

const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_HTTP));

const web32 = new Web3(new Web3.providers.WebsocketProvider(process.env.WEB3_WS));
const subscription = web32.eth.subscribe('newBlockHeaders', function(error, result){
  if (!error) {
    // console.log(result);
  }
    console.error(error);
   })
   .on("data", function(blockHeader){
       web3.eth.getBlock(blockHeader.number)
        .then(block => {
          io.emit('newBlockHeaders', block)
        })
   })
   .on("error", console.error);

   const subscriptionTransactions = web32.eth.subscribe('pendingTransactions', function(error, result){
       if (!error)
           console.log(result);
   })
   .on("data", function(transaction){
        io.emit('pendingTransaction', transaction)
   });



class BlockchainSync {
  constructor() {
    this.latestBlock = {};
    this.lastBlockProcessed = {};
    this.currentMiner = '';
    this.currentValidators = [];
    this.eta = [];
    this.average = 1440*60

    this.commenceSync()

  }

  commenceSync() {
    if(!commandLineArguments.includes('--resync')) {
      this.checkSync()
    } else {
      console.log(chalk.red("[!] Starting with --resync flag"))
      console.log(chalk.bgRed("[!] Deleting database"))
      setTimeout(()=> {
        this.checkSync()
      },20000)
    }
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

  addBalances(tx) {
    if(tx.value > 0) {
      const {to, from, value, blockNumber} = tx
      console.log(tx.to, tx.from)
      const balance = value
      Address.findOne({address: tx.to})
        .then(doc => {
          if(!doc) {
            console.log(chalk.cyan(`New address found`))
            Address.create({to, balance, blockNumber})
          } else {
            doc.balance += value
            doc.blockNumber = blockNumber
            doc.save()
          }
        })

      Address.findOne({address: tx.from})
        .then(doc => {
          if(!doc) return
          doc.balance -= value
          doc.blockNumber = blockNumber
          doc.save()
        })
    }
  }

  getTransaction(hash) {
    return new Promise((resolve, reject) => {
      web3.eth.getTransaction(hash)
        .then(tx => {
          resolve(tx)
        })
        .catch(error => {
          reject(error)
        })
    })
  }


  addTransactions(transactions) {
    for(let i=0; i<transactions.length; i++) {
      this.getTransaction(transactions[i])
        .then(tx => {
          Transaction.create(tx)
            .then(savedTx => {
              this.addBalances(savedTx)
            })
            .catch(console.log)
        })
    }
  }

  parseBlock(block) {
    if(block.transactions.length > 0) {
      this.addTransactions(block.transactions)
    }
  }

  addETA(time) {
    if(this.eta.length > 30) {
      this.eta.shift()
    }
    this.eta.push(time)
    const average = list => list.reduce((prev, curr) => prev + curr) / list.length;
    this.average = average(this.eta)
  }


  batchBlockRequest(start, end) {
    const startTime = Date.now()
    let blockNumbers = []
    for(let i=start+1; i<end+1; i++) {
      blockNumbers.push(i)
    }

    const batch = new web3.eth.BatchRequest()

    blockNumbers.forEach((blockNumber) => {
       batch.add(
         web3.eth.getBlock.request(blockNumber, ()=>{})
       )
     })

     batch.execute()
      .then(done => {
        let promises = []
        const blocks = done.response
        for(let i=0; i<blocks.length; i++) {
          promises.push(Block.create(blocks[i]))
          this.parseBlock(blocks[i])
        }


        Promise.all(promises)
        .then(saved => {
          this.checkSync()
          this.addETA(Date.now() - startTime)
        })
      })
      .catch(error => {
        console.log(error)
      })
  }

  checkSync() {
    Promise.all([
      this.lastKnownBlock(),
      this.getLatestBlock()
    ])
    .then(data => {
      process.stdout.write("\u001b[2J\u001b[0;0H");
      this.lastBlockProcessed = data[0] && data[0].number ? data[0].number : 0
      const lastBlockProcessed = data[0] && data[0].number ? data[0].number : 0
      this.latestBlock = data[1].number
      if(lastBlockProcessed < data[1].number) {
        console.log(chalk.yellow(`[!] Out of sync: ${lastBlockProcessed.toLocaleString()}/${data[1].number.toLocaleString()} blocks (${((lastBlockProcessed/data[1].number)*100).toFixed(2)}%)`))
        console.log(chalk.yellow(`[!] ETA to completion: ${((((this.average*(data[1].number - lastBlockProcessed))/process.env.SYNC_REQUESTS)/1000)/60).toFixed(2)} minutes (process.env.SYNC_REQUESTS/${(this.average/1000).toFixed(2)}s)`))
        if(data[1].number-lastBlockProcessed > process.env.SYNC_REQUESTS) {
          this.batchBlockRequest(lastBlockProcessed, lastBlockProcessed+process.env.SYNC_REQUESTS)
        } else {
          this.batchBlockRequest(lastBlockProcessed, data[1].number)
        }
      } else {
        console.log(chalk.green(`[+] In sync`))
      }
    })
  }


}

module.exports = BlockchainSync
