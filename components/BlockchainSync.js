const dotenv = require('dotenv').config()
const io = require('../index')
const chalk = require('chalk')
const Address = require('../models/Address')
const Block = require('../models/Block')
const Transaction = require('../models/Transaction')
const Web3 = require('web3')
const TransactionProcessor = require('./TransactionProcessor')
const transactionProcessor = new TransactionProcessor()
const commandLineArguments = process.argv.slice(2)
const moment = require('moment')
require('moment-countdown');
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_HTTP));
const _cliProgress = require('cli-progress');

const syncProgressBar = new _cliProgress.Bar({
    format: ' {bar} {percentage}% | {value}/{total}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591'
});

function startProgressBar(start, stop) {
  syncProgressBar.start(stop, start);
}

function updateProgressBar(start) {
  syncProgressBar.update(start);
}
function stopProgressBar() {
  syncProgressBar.stop();
}
function setTotalProgressBar(total) {
  syncProgressBar.setTotal(total);
}

class BlockchainSync {
  constructor() {
    this.latestBlock = {};
    this.lastBlockProcessed = {};
    this.currentMiner = '';
    this.transactionProcessQue = [];
    this.currentValidators = [];
    this.eta = [];
    this.lastBlockTimes = []
    this.lastBlockTime = Date.now()
    this.averageBlockTime = 5
    this.average = 86400;
    this.progressBar = false;
    this.syncing = true
    this.commenceSync()
    this.startListening()
    this.parseTransactionQue()
  }

  addAverageBlockTime(time) {
    if(this.lastBlockTimes.length > 10) {
      this.lastBlockTimes.shift()
    }
    this.lastBlockTimes.push(time)
    const average = list => list.reduce((prev, curr) => prev + curr) / list.length;
    this.averageBlockTime = average(this.lastBlockTimes)
  }

  startListening() {
    setInterval(() => {
      io.emit('averageBlockTime', this.averageBlockTime)
    },1000)

    const self = this
    const web3WS = new Web3(new Web3.providers.WebsocketProvider(process.env.WEB3_WS));
    const blockListener = web3WS.eth.subscribe('newBlockHeaders', function(error, result){
        if (error) return console.log(error);
      })
      .on("data", function(blockHeader){
        web3.eth.getBlock(blockHeader.number)
          .then(block => {
            io.emit('newBlockHeaders', block)
            self.addAverageBlockTime(Date.now()-self.lastBlockTime)
            self.lastBlockTime = Date.now()
            if(self.syncing) return
            if( block.number >= self.latestBlock) {
              Block.create(block)
                .then(()=> {
                  this.parseBlock(block)
                  self.lastBlockProcessed = block.number
                })
                .catch(()=>{
                  return
                })
            }
          })
       })
      .on("error", console.error);

    const transactionListener = web3WS.eth.subscribe('pendingTransactions', function(error, result){
      if (error) return console.log(error)
    })
      .on("data", function(transaction){
        io.emit('pendingTransaction', transaction)
       })
       .on("error", console.error);
  }

  addPremine2(){
    let blockPromises = []
    let preminers = []
    blockPromises.push(web3.eth.getBlock(1), web3.eth.getBlock(2), web3.eth.getBlock(3))
    Promise.all(blockPromises)
      .then(blocks => {
        for(let i=0; i<blocks.length; i++) {
          const validators = blocks[i].validators
          for(let y=0 y<validators.length; y++) {
            if(!preminers.include(validators[y])) preminers.push(validators[y]);
          }
        }
        preminers.forEach((address) => {
          web3.eth.getBalance(address)
            .then(balance => {
              const blockNumber = 1
              const transactions = []
              const balance = balance
              const type = 2
              Address.create({address, blockNumber, transactions, balance, type})
                .then(console.log("Created Premine Balance: ", balance, address))
            })
        })
      })

  }

  addPremine(){
    web3.eth.getBlock(2)
      .then(block => {
        let preminers = []
        let promises = []
        preminers.push(block.miner)
        for(let i=0; i<block.validators.length; i++) {
          preminers.push(block.validators[i])
        }
        for(let i=0; i<preminers.length; i++) {
          promises.push(web3.eth.getBalance(preminers[i]))
        }
        Promise.all(promises)
          .then(done => {
            for(let i=0; i<done.length; i++) {
              const address = preminers[i]
              const blockNumber = 1
              const transactions = []
              const balance = done[i]
              const type = 2
              Address.create({address, blockNumber, transactions, balance, type})
                .then(console.log("Created Premine Balance: ", balance, address))
            }
          })
      })
      .catch(error => {
        console.log(error)
      })
  }

  commenceSync() {
    if(!commandLineArguments.includes('--resync')) {
      this.checkSync()
    } else {
      console.log(chalk.red("[!] Starting with --resync flag"))
      console.log(chalk.bgRed("[!] Deleting database"))
      setTimeout(()=> {
        this.addPremine()
        this.checkSync()
      },10000)
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

  addAddress(address, blockNumber, transactions = [], balance = 0, type = 0) {
    return new Promise((resolve, reject) => {
      Address.create({address, blockNumber, transactions, balance, type})
        .then(newAddress => {
          resolve(newAddress)
        })
        .catch(error => {
          reject(error)
        })
    })
  }

  isValidAddress(address) {
    return new Promise((resolve, reject) => {
      web3.utils.isAddress(address) ? resolve(true) : resolve(false)
    })
  }

  addressExists(address) {
    return new Promise((resolve, reject) => {
      Address.findOne({address})
        .then(doc => {
          if(!doc) {
            resolve(false)
          } else {
            resolve(true)
          }

        })
        .catch(error => {
          reject(error)
        })
    })
  }

  isContract(address) {
    return new Promise((resolve, reject) => {
      web3.eth.getCode(address)
        .then(code => {
          code === "0x" ? resolve(false) : resolve(true)
        })
        .catch(error => {
          reject(error)
        })
    })
  }

  changeAddressBalance(address, value, tx) {
    Address.findOne({address})
      .then(doc => {
        if(!doc) return;
        doc.balance += value
        doc.blockNumber = tx.blockNumber
        doc.transactions.push(tx)
        doc.save()
      })
      .catch(console.log)
  }

parseTransactionQue() {
  const tx = transactionProcessor.getFirstFromQue()
  this.processTransaction(tx)
    .then(result => {
      this.parseTransactionQue()
    })
    .catch(error => {
      setTimeout(()=>{
        this.parseTransactionQue()
      },5000)
    })
}


  processTransaction(tx) {
      return new Promise((resolve, reject) => {
        if(!tx) return reject({})
        if (tx.value <= 0 && tx.gasPrice <= 0 ) return reject({});
        const {from, to, value, blockNumber} = tx
        const fromValue = value * -1
        this.changeAddressBalance(from, fromValue, tx)
        this.addressExists(to)
          .then(exists => {
            if(!exists) {
              const balance = value
              const transactions = [tx]
              const address = to
              this.isContract(address)
                .then(contract => {
                  if(contract) {
                    const type = 1
                    Address.create({address, balance, transactions, blockNumber, type})
                      .then(resolve(true))
                      .catch(reject({}))
                  } else {
                    const type = 0
                    Address.create({address, balance, transactions, blockNumber, type})
                    .then(resolve(true))
                    .catch(reject({}))
                  }
                })
                .catch(error => {
                  console.log(error)
                  return reject({})
                })

            } else {
              this.changeAddressBalance(to, value, tx)
              return resolve(true)
            }
          })
          .catch(error => {
            reject({})
          })
      })
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
              transactionProcessor.addTransactionProcessQue(savedTx)
            })
            .catch(console.log)
        })
    }
  }

  parseBlock(block) {
    this.currentMiner = block.miner
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


  batchMinerRewards(blocks) {
    return new Promise((resolve, reject) => {
      let promises = []
      let minerArray = []
      let miners = {}
      for(let i=0; i<blocks.length; i++) {
        if(miners[blocks[i].miner]) {
          miners[blocks[i].miner].blockNumber = blocks[i].number
          miners[blocks[i].miner].balance += +process.env.MINER_BLOCK_REWARD
          miners[blocks[i].miner].transactions.push({
            blockHash: blocks[i].hash,
            blockNumber: blocks[i].number,
            timestamp: blocks[i].timestamp,
            from: "MINED",
            to: blocks[i].miner,
            value: +process.env.MINER_BLOCK_REWARD
          })
        } else {
          miners[blocks[i].miner] = {
            address: blocks[i].miner,
            blockNumber: blocks[i].number,
            transactions: [{
              blockHash: blocks[i].hash,
              blockNumber: blocks[i].number,
              timestamp: blocks[i].timestamp,
              from: "MINED",
              to: blocks[i].miner,
              value: +process.env.MINER_BLOCK_REWARD
            }],
            balance: +process.env.MINER_BLOCK_REWARD,
            type: 3
          }
        }
      }
      Object.keys(miners).forEach((miner) => {
        const address = miners[miner].address
        minerArray.push(miners[miner].address)
        promises.push(Address.findOne({address}))
      })

      let promises2 = []
      Promise.all(promises)
        .then(data => {
          for(let i=0; i<data.length; i++) {
            const account = data[i]
            if(!account) {
              const miner = minerArray[i];
              const address = miner
              const blockNumber = miners[miner].blockNumber
              const transactions = miners[miner].transactions
              const balance = miners[miner].balance
              const type = miners[miner].type
              promises2.push(Address.create({address, blockNumber, transactions, balance, type}))
            } else {
              const miner = account.address;
              account.blockNumber = miners[miner].blockNumber
              account.transactions = miners[miner].transactions
              account.balance += miners[miner].balance
              account.type = 3
              promises2.push(this.saveMinerUpdates(account))
            }
          }
          Promise.all(promises2)
            .then(done => {
              resolve({})
            })
            .catch(resolve({}))
        })
        .catch(resolve({}))
    })
  }

  saveMinerUpdates(account) {
    return new Promise((resolve, reject)=>{
      account.save()
        .then(resolve({}))
        .catch(resolve({}))
    })
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
          this.parseBlock(blocks[i])
        }
        if(blocks.length > 0) promises.push(this.batchMinerRewards(blocks));
        promises.push(Block.create(blocks))
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
      const lastBlockProcessed = data[0] && data[0].number ? data[0].number : 0
      this.lastBlockProcessed = lastBlockProcessed
      this.latestBlock = data[1].number

      if(this.syncing && (lastBlockProcessed < data[1].number) ) {
        const estimatedTimeLeft = ((data[1]-lastBlockProcessed)*this.average)
        console.log(chalk.yellow(`[!] Status: NOT SYNC `)) //`${chalk.cyan(lastBlockProcessed.toLocaleString())}/${chalk.cyan(data[1].number.toLocaleString())} blocks (${((lastBlockProcessed/data[1].number)*100).toFixed(2)}%)`))
        console.log(chalk.yellow(`[!] Average Speed: ${process.env.SYNC_REQUESTS} per ${(this.average/1000).toFixed(2)} second(s)`))
        console.log(chalk.yellow(`[!] Estimated time left: ${chalk.cyan(moment().countdown(Date.now() + ((this.average*(data[1].number - lastBlockProcessed))/process.env.SYNC_REQUESTS)))}\n\n`))

        if( (data[1].number-lastBlockProcessed) > parseInt(process.env.SYNC_REQUESTS)) {
          this.batchBlockRequest(lastBlockProcessed, lastBlockProcessed + parseInt(process.env.SYNC_REQUESTS))
        } else {
          this.batchBlockRequest(lastBlockProcessed, data[1].number)
        }

      } else {
        this.syncing = false
        console.log(chalk.green(`[+] Status: SYNC`))
        setTimeout(()=> {
          return this.checkSync()
        },5000)
      }
      if(!this.progressBar) {
        this.progressBar = !this.progressBar
        startProgressBar(lastBlockProcessed, data[1].number)
      } else {
        updateProgressBar(lastBlockProcessed)
        setTotalProgressBar(data[1].number)
      }
    })
  }


}

module.exports = BlockchainSync
