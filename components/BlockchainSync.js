const dotenv = require('dotenv').config()
const io = require('../index')
const chalk = require('chalk')
const Address = require('../models/Address')
const Block = require('../models/Block')
const Transaction = require('../models/Transaction')
const Web3 = require('web3')
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
    this.currentValidators = [];
    this.eta = [];
    this.average = 86400;
    this.progressBar = false;
    this.syncing = true
    this.commenceSync()
    this.startListening()
  }

  startListening() {
    const self = this
    const web3WS = new Web3(new Web3.providers.WebsocketProvider(process.env.WEB3_WS));
    const blockListener = web3WS.eth.subscribe('newBlockHeaders', function(error, result){
        if (error) return console.log(error);
      })
      .on("data", function(blockHeader){
        if(self.syncing) return
        web3.eth.getBlock(blockHeader.number)
          .then(block => {
            io.emit('newBlockHeaders', block)
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
    if(tx.value > 0 || to.gasPrice > 0) {
      const {to, from, value, blockNumber} = tx
      const balance = value
      const address = tx.to
      Address.findOne({address: tx.to})
        .then(doc => {
          if(!doc) {
            console.log(chalk.cyan(`New address found`))
            const transactions = []
            transactions.push(tx)
            Address.create({address, balance, transactions, blockNumber})
              .then(newAddress => {
                console.log(newAddress)
              })
              .catch(error => {
                console.log(error)
              })
          } else {
            doc.transactions.push(tx)
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
    this.currentMiner = block.miner
    this.lastKnownBlock
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
          this.parseBlock(blocks[i])
        }
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
