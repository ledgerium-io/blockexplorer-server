const WebSocket = require('ws')

const io = require('../index');

class Nodes {

  constructor() {
    this.url = 'wss://flinders.ledgerium.io/stats/primus/'
    this.nodes = {}

    this.bestBlock = 0;
    this.lastBlockMiner = '0x0000000000000000000000000000000000000000';
    this.lastBlockTime = 0;
    this.avgBlockTime = 0;
    this.minBlockTime = 0;
    this.maxBlockTime = 0;
    this.blockTimes = [];
    this.transactionHistory = [];
    this.avgTransactions = 0;
    this.minTransactions = 0;
    this.maxTransactions = 0;

    this.charts = {}
    this.init()
    this.emitNodes()

  }

  emitNodes() {
    setInterval(() => {
      io.emit('nodeList', this.nodes);
      const payload = {
        bestBlock: this.bestBlock,
        lastBlockTime: this.lastBlockTime,
        lastBlockMiner: this.lastBlockMiner,
        avgBlockTime: this.avgBlockTime,
        minBlockTime: this.minBlockTime,
        maxBlockTime: this.maxBlockTime,
        blockTimes: this.blockTimes,
        transactionHistory: this.transactionHistory,
        minTransactions: this.minTransactions,
        avgTransactions: this.avgTransactions,
        maxTransactions: this.maxTransactions,
      };
      //  console.log(payload)
      io.emit('blockStats', payload);
    }, 1000);
  }

  findMinMax(arr, key) {
    let min = arr[0][key];
    let max = arr[0][key];
    for (let i = 0; i < arr.length; i += 1) {
      const v = arr[i][key];
      min = (v < min) ? v : min;
      max = (v > max) ? v : max;
    }
    return { min, max };
  }

  addTransactions(blockNumber, transactions) {
    this.transactionHistory.push({
      blockNumber,
      transactions,
    });
    if (this.transactionHistory.length > 30) {
      this.transactionHistory.shift();
    }
    this.avgTransactions = this.transactionHistory.reduce((a, b) => a + b.transactions, 0) / this.transactionHistory.length;
    const minmax = this.findMinMax(this.transactionHistory, 'transactions');
    this.minTransactions = minmax.min;
    this.maxTransactions = minmax.max;
  }

  addBlockTime(lastRecievedBlock, lastBlockTimestamp) {
    if (this.blockTimes.length === 0) {
      this.blockTimes.push({ seconds: 5 });
    } else {
      this.blockTimes.push({ seconds: (lastRecievedBlock - lastBlockTimestamp) / 1000 });
    }
    if (this.blockTimes.length > 30) {
      this.blockTimes.shift();
    }
    this.avgBlockTime = this.blockTimes.reduce((a, b) => a + b.seconds, 0) / this.blockTimes.length;
    const minmax = this.findMinMax(this.blockTimes, 'seconds');
    this.minBlockTime = minmax.min;
    this.maxBlockTime = minmax.max;
  }

  init() {
    const connection = new WebSocket(this.url)

    connection.onopen = () => {
      console.log('Connected to WebSocket')

      connection.send(JSON.stringify({ "emit":["ready"] }))

      setInterval(() => {
        connection.ping()
      }, 10000) // 10 seconds

      setInterval(() => {
        connection.send(JSON.stringify({ "emit":["ready"] }))
      }, 120000) // 2 minutes
    }

    connection.onclose = () => {
      console.log('Disconnected to WebSocket')
    }

    connection.onmessage = (msg) => {
      const self = this
      let message = JSON.parse(msg.data)

      if (message.emit) {
        console.log('Recieved node snapshot')
        let nodeList = message.emit[1].nodes
        nodeList.forEach((node) => {
          self.nodes[node.id] = {
            id: node.info.node,
            type: node.info.node.split('/')[0],
            name: node.info.name,
            isMining: node.stats.mining,
            peers: node.stats.peers,
            lastBlockNumber: node.stats.block.number,
            lastBlockTransactions: node.stats.block.transactions.length,
            lastRecievedBlock: node.stats.block.received,
            totalDifficulty: node.stats.block.totalDifficulty,
            propagationTime: node.stats.propagationAvg,
            ping: node.stats.latency,
            ip: node.info.ip,
            geo: node.geo,
            upTime: 100,
            lastSeen: node.uptime.lastUpdate,
          }
          console.log('Registered new node: ', node.info.name )
        })
      }

      if (message.action === 'stats') {
        const node = message.data
        if (self.nodes[node.id]) {
            self.nodes[node.id].isMining   = node.stats.mining
            self.nodes[node.id].peers      = node.stats.peers
            self.nodes[node.id].ping       = node.stats.latency
            self.nodes[node.id].upTime     = node.stats.uptime
        }
      }

      if (message.action === 'block') {
        const node = message.data.id
        const block = message.data.block

        if(block.number > self.bestBlock) {

          self.addBlockTime(block.received, self.lastBlockTime);
          self.addTransactions(block.number, block.transactions);

          self.bestBlock = block.number
          self.lastBlockTime = block.received
        }

        self.lastBlockMiner = block.miner;

        if (self.nodes[node]) {
          self.nodes[node].lastBlockNumber = block.number
          self.nodes[node].lastBlockTransactions = block.transactions.length
          self.nodes[node].lastRecievedBlock = block.received
        }
      }

      if (message.action === 'charts') {
        self.charts = message.action.data
      }
    }
  }
}

module.exports = Nodes
