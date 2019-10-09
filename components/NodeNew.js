const io = require('../index')

class Nodes {

  constructor() {
    this.nodeList = {}

    this.bestBlock = 0
    this.lastBlockMiner = '0x0000000000000000000000000000000000000000'
    this.lastBlockTime = 0
    this.avgBlockTime = 0
    this.minBlockTime = 0
    this.maxBlockTime = 0
    this.blockTimes = []
    this.transactionHistory = []
    this.avgTransactions = 0
    this.minTransactions = 0
    this.maxTransactions = 0
    this.init()
  }

  init() {
    this.listen()
    this.pingClients()
    this.emitNodes()
  }

  emitNodes() {
    setInterval(()=>{
      io.emit('nodeList', this.nodeList)
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
      }
      console.log(payload)
      io.emit('blockStats', payload)
    },1000)
  }

  pingClients() {
    const self = this
    setInterval(()=>{
      Object.keys(this.nodeList).forEach( id => {
        self.nodeList[id].upTime = self.calculateUptime(self.nodeList[id].upTimeRequests, self.nodeList[id].upTimeReplies)
        self.nodeList[id].upTimeRequests++
      });
      io.emit('checkAlive')
    },5000)
  }

  findMinMax(arr, key) {
  let min = arr[0][key], max = arr[0][key];

  for (let i = 0; i<arr.length; i++) {
    let v = arr[i][key];
    min = (v < min) ? v : min;
    max = (v > max) ? v : max;
  }

  return {min, max};
}
  addTransactions(blockNumber, transactions) {
    this.transactionHistory.push({
      blockNumber,
      transactions
    })
    if(this.transactionHistory.length  > 30) {
      this.transactionHistory.shift()
    }
    this.avgTransactions = this.transactionHistory.reduce((a,b) => a + b.transactions, 0) / this.transactionHistory.length
    const minmax = this.findMinMax(this.transactionHistory, 'transactions')
    this.minTransactions = minmax.min
    this.maxTransactions = minmax.max
  }

  addBlockTime(lastRecievedBlock, lastBlockTimestamp) {
    if(this.blockTimes.length === 0) {
      this.blockTimes.push({seconds: 5})
    } else {
      this.blockTimes.push({seconds: (lastRecievedBlock-lastBlockTimestamp)/1000})
    }
    if(this.blockTimes.length > 30) {
      this.blockTimes.shift()
    }
    this.avgBlockTime = this.blockTimes.reduce((a,b) => a + b.seconds, 0) / this.blockTimes.length
    const minmax = this.findMinMax(this.blockTimes, 'seconds')
    this.minBlockTime = minmax.min
    this.maxBlockTime = minmax.max
  }

  calculateUptime(upTimeRequests, upTimeReplies) {
    if(upTimeRequests === 0) return '100'
    const uptime = ((upTimeReplies/upTimeRequests)*100).toFixed(2)
    return uptime === '100.00' ? '100' : uptime;
  }

  listen() {
    const self = this

    io.on('connect', (socket) => {
      console.log('[+] User connected')

      socket.on('isAlive', (id) => {
        if(self.nodeList[id]) {
          self.nodeList[id].upTimeReplies++
          self.nodeList[id].lastSeen = Date.now()
        }
      })

      socket.on('nodeStats', (data) => {
        if(data.lastBlockNumber > self.bestBlock) {
          self.addBlockTime(data.lastRecievedBlock, self.lastBlockTime )
          self.addTransactions(data.lastBlockNumber, data.lastBlockTransactions)
          self.bestBlock = data.lastBlockNumber
          self.lastBlockTime = data.lastRecievedBlock
          self.lastBlockMiner = data.lastBlockMiner
        }
        if(self.nodeList[data.id]) {
          const ping = Date.now() - data.timestamp;
          const node = self.nodeList[data.id]
          node.id                     = data.id
          node.type                   = data.type
          node.name                   = data.name
          node.isMining               = data.isMining
          node.peers                  = data.peers
          node.lastBlockNumber        = data.lastBlockNumber
          node.lastBlockTransactions  = data.lastBlockTransactions
          node.lastRecievedBlock      = data.lastRecievedBlock
          node.totalDifficulty        = data.totalDifficulty
          node.propagationTime        = data.propagationTime
          node.ping                   = ping
          node.ip                     = data.ip
          node.geo                    = data.geo
          node.upTime                 = self.calculateUptime(self.nodeList[data.id].upTimeRequests, self.nodeList[data.id].upTimeReplies)
          node.lastSeen               = Date.now()
          // console.log(self.nodeList[data.id])
        } else {
          console.log('[+] Registering new node:', data.name)
          const ping = Date.now() - data.timestamp;
          self.nodeList[data.id] = {
            id: data.id,
            type: data.type,
            name: data.name,
            isMining: data.isMining,
            peers: data.peers,
            lastBlockNumber: data.lastBlockNumber,
            lastBlockTransactions: data.lastBlockTransactions,
            lastRecievedBlock: data.lastRecievedBlock,
            totalDifficulty: data.totalDifficulty,
            propagationTime: data.propagationTime,
            ping: ping,
            ip: data.ip,
            geo: data.geo,
            upTimeRequests: 0,
            upTimeReplies: 0,
            upTime: 100,
            lastSeen: Date.now(),
          }
        }
      })
    })
  }

}

module.exports = Nodes
