const dotenv = require('dotenv').config()
const io = require('../index')
const chalk = require('chalk')
const Address = require('../models/Address')
const Block = require('../models/Block')
const Transaction = require('../models/Transaction')
const TransactionProcessor = require('./TransactionProcessor')
const transactionProcessor = new TransactionProcessor()
const moment = require('moment')
require('moment-countdown');
const _cliProgress = require('cli-progress');

const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_HTTP));

const syncProgressBar = new _cliProgress.Bar({
    format: ' {bar} {percentage}% | {value}/{total}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591'
});

const startProgressBar = (start, stop) => {
  syncProgressBar.start(stop, start);
}

const updateProgressBar = (start) => {
  syncProgressBar.update(start);
}
const stopProgressBar = () => {
  syncProgressBar.stop();
}
function setTotalProgressBar(total) {
  syncProgressBar.setTotal(total);
}

class BlockchainSync {
  constructor() {
      this.latestBlock = {}
      this.lastBlockProcessed = {}
      this.currentMiner = '0x0000000000000000000000000000000000000000'
      this.eta = []
      this.lastBlockTimes = []
      this.lastBlockTime = Date.now()
      this.averageBlockTime = 5
      this.average = 86400
      this.progressBar = false;
      this.syncing = true
      this.init()
  }

  init() {
    if(global.isReady) {
      this.checkSync()
      this.parseTransactionQue()
      this.emitter()
      this.listenForNewBlocks()
    } else {
      setTimeout(()=>{
        this.init()
      },1000)
    }

  }

  emitter() {
    setInterval(() => {
      io.emit('averageBlockTime', this.averageBlockTime)
    },1000)
  }

  listenForNewBlocks() {
    const self = this

    const web3WS = new Web3(new Web3.providers.WebsocketProvider(process.env.WEB3_WS));

    const blockListener = web3WS.eth.subscribe('newBlockHeaders', function(error, result){
      if (error) return console.log(error);
    })
      .on("data", function(blockHeader){
        web3.eth.getBlock(blockHeader.number)
          .then(block => {
            self.addAverageTime(Date.now()-self.lastBlockTime)
            self.lastBlockTime = Date.now()
            if(self.syncing) return
            if( block.number >= self.latestBlock) {
              Block.create(block)
                .then( () => {
                  self.parseBlock(block)
                  self.lastBlockProcessed = block.number
                })
                .catch(()=>{
                  return
                })
            }
          })
       })
      .on("error", console.error);

    // const transactionListener = web3WS.eth.subscribe('pendingTransactions', function(error, result){
    //   if (error) return console.log(error)
    // })
    //   .on("data", function(transaction){
    //     web3.eth.getTransaction(transaction)
    //       .then(tx => {
    //         io.emit('pendingTransaction', tx)
    //       })
    //       .catch(console.log)
    //    })
    //    .on("error", console.error);
  }


  getLastKnownBlock() {
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

  clearConsole() {
    process.stdout.write("\u001b[2J\u001b[0;0H");
  }

  printSyncing() {
    console.log(chalk.yellow(`[!] Status: NOT SYNC `))
    console.log(chalk.yellow(`[!] Average Speed: ${process.env.SYNC_REQUESTS} per ${(this.average/1000).toFixed(2)} second(s)`))
    console.log(chalk.yellow(`[!] Estimated time left: ${chalk.cyan(moment().countdown(Date.now() + ((this.average*(this.latestBlock - this.lastBlockProcessed))/process.env.SYNC_REQUESTS)))}\n\n`))
  }

  printSynced() {
    console.log(chalk.green(`[+] Status: SYNC`))
  }

  checkSyncTimeout() {
    setTimeout(()=>{
      this.checkSync()
    },5000)
  }

  updateProgressBar() {
    if(!this.progressBar) {
      this.progressBar = true
      startProgressBar(this.lastBlockProcessed, this.latestBlock)
    } else {
      updateProgressBar(this.lastBlockProcessed)
      setTotalProgressBar(this.latestBlock)
    }
  }

  checkSync() {
    Promise.all([this.getLastKnownBlock(), this.getLatestBlock()])
      .then(data => {
        const lastBlockProcessed = data[0] && data[0].number ? data[0].number : 0
        const latestBlock = data[1].number
        this.lastBlockProcessed = lastBlockProcessed
        this.latestBlock = latestBlock
        if(this.syncing && (lastBlockProcessed < latestBlock)) {
          this.clearConsole()
          this.printSyncing()
          if( (latestBlock-lastBlockProcessed) > parseInt(process.env.SYNC_REQUESTS)) {
            this.batchBlockRequest(lastBlockProcessed, (lastBlockProcessed + parseInt(process.env.SYNC_REQUESTS)) )
          } else {
            this.batchBlockRequest(lastBlockProcessed, latestBlock)
          }

        } else {
          this.syncing = false
          this.clearConsole()
          this.printSynced()
          this.checkSyncTimeout()
        }

        this.updateProgressBar()
      })
      .catch(error => {
        console.log(error)
        this.checkSyncTimeout()
      })
  }

  batchBlockRequest(start, end) {
    const startTime = Date.now()
    const batch = new web3.eth.BatchRequest()

    for(let i=start+1; i<end+1; i++) {
      batch.add(web3.eth.getBlock.request(i, ()=>{}))
    }

    batch.execute()
      .then(data => {
        const blocks = data.response
        Block.create(blocks)
          .then(done => {
            this.checkSync()
            this.addAverageTime(Date.now()-startTime)
          })
          .catch(error => {
            console.log(error)
            this.checkSync()
          })
        for(let i=0; i<blocks.length; i++) {
          this.parseBlock(blocks[i])
        }
      })
      .catch(console.log)
  }

  addressExists(address) {
    return new Promise((resolve, reject) => {
      if(!address) return reject('Address is invalid')
      Address.findOne({address})
        .then(doc => {
          if(!doc) {
            resolve(false)
          } else {
            resolve(true)
          }

        })
        .catch(error => {
          resolve(false)
        })
    })
  }

  isContract(address) {
    return new Promise((resolve, reject) => {
      if(!address) return reject('Not an address')
      web3.eth.getCode(address)
        .then(code => {
          code === "0x" ? resolve(false) : resolve(true)
        })
        .catch(error => {
          reject(error)
        })
    })
  }

  getTransactionDetails(hash) {
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

  parseTransactionQue() {
    const tx = transactionProcessor.getFirstFromQue()
    this.processTransaction(tx)
      .then(result => {
        if(result) {
          this.parseTransactionQue()
        } else {
          setTimeout(()=>{
            this.parseTransactionQue()
          },5000)
        }
      })
      .catch(error => {
        setTimeout(()=>{
          this.parseTransactionQue()
        },5000)
      })
  }

  addTransactionFrom(tx) {
    return new Promise((resolve, reject) => {
      const from = web3.utils.toChecksumAddress(tx.from)
      Address.findOne({address: from})
        .then(account => {
          if(!account) {
            web3.eth.getBalance(from)
              .then(balance => {
                Address.create({address: from, balance, transactions: [tx], blockNumber: tx.blockNumber, type: 0})
                  .then(()=>{
                    resolve()
                  })
                  .catch(resolve())
              })
          } else {
            web3.eth.getBalance(from)
              .then(balance => {
                account.balance = balance
                account.blockNumber = tx.blockNumber
                account.transactions.push(tx)
                account.markModified('transactions')
                account.save()
                  .then(resolve())
                  .catch(resolve())
              })
          }
        })
        .catch(error => {
          console.log(error)
          resolve()
        })
    })
  }

  processTransaction(tx) {
    return new Promise((resolve, reject) => {
      if(!tx) return reject('No Transaction');
      if(tx.value <= 0 && tx.gasPrice <= 0) return reject({});
      if(!tx.to) {
        this.addTransactionFrom(tx)
          .then(()=>{
            resolve()
          })
      }  else {
        const { value, blockNumber } = tx
        const to = tx.to ? web3.utils.toChecksumAddress(tx.to) : null
        const address = to
        this.addressExists(to)
          .then(exists => {
            if(!exists) {
              const transactions = [tx]
              const address = to
              this.isContract(address)
                .then(contract => {
                  if(!contract) {
                    const type = 0
                    web3.eth.getBalance(address)
                      .then(balance => {
                        Address.create({address, balance, transactions, blockNumber, type})
                        this.addTransactionFrom(tx)
                          .then(()=>{
                            resolve()
                          })
                      })
                  } else {
                    const type = 1
                    web3.eth.getBalance(address)
                      .then(balance => {
                        Address.create({address, balance, transactions, blockNumber, type})
                        this.addTransactionFrom(tx)
                          .then(()=>{
                            resolve()
                          })
                      })
                  }
                })
            } else {
              Address.findOne({address})
                .then(account => {
                  if(!account) return reject('Address was not found');
                  account.balance += value
                  account.blockNumber = tx.blockNumber
                  account.transactions.push(tx)
                  account.markModified('transactions')
                  account.save()
                  this.addTransactionFrom(tx)

                  resolve({})
                })
            }
          })
          .catch(error => {
            reject(error)
          })
      }
    })
  }



  parseTransactions(transactions) {
    let promises = []
    for(let i=0; i<transactions.length; i++) {
      this.getTransactionDetails(transactions[i])
        .then(tx => {
          io.emit('pendingTransaction', tx)
          Transaction.create(tx)
            .then(savedTx => {
              if(!savedTx) return;
              transactionProcessor.addTransactionProcessQue(savedTx)
            })
            .catch(console.log)
        })
    }
  }

  parseBlock(block) {
    io.emit('newBlockHeaders', block)
    this.currentMiner = block.miner
    if(block.transactions.length > 0) {
      this.parseTransactions(block.transactions)
    }
  }

  addAverageTime(time) {
    if(this.eta.length > 30) {
      this.eta.shift()
    }
    this.eta.push(time)
    const average = list => list.reduce((prev, curr) => prev + curr) / list.length;
    this.average = average(this.eta)
  }

}

module.exports = BlockchainSync
