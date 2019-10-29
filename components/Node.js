const Web3 = require('web3')
const rpc = require('request')
const ping = require('ping')

class Node {
  constructor(WEB3_HTTP, WEB3_WS) {
    this.WEB3_HTTP = WEB3_HTTP
    this.WEB3_WS = WEB3_WS
    this.web3_http = null
    this.web3_ws = null
    this.pingInterval = 5000
    this.node = {
      id: null,
      name: null,
      identifier: null,
      ip: WEB3_HTTP.split('//')[1].split(':')[0],
      online: null,
      connected: null,
      latency: null,
      difficulty: null,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      lastBlock: null,
      lastBlockSeen: null,
      peers: null,
      downtime: 0,
      uptime: 0,
      uptimePerentage: 100

    }
    this.init()

  }

  calculateUptime() {
    if(this.node.uptime == 0) return 0;
    if(this.node.downtime > this.node.uptime) return 0;
    return 100-((this.node.downtime/86400)*100);
  }

  pingNode() {
    const self = this
    setInterval(()=> {
      ping.promise.probe(self.node.ip)
        .then(function (res) {
          self.node.online = res.alive
          if(!res.alive) {
            self.node.downtime += (self.pingInterval/1000)
          } else {
            self.node.uptime += (self.pingInterval/1000)
          }
          self.node.lastSeen = Date.now()
          self.node.latency = res.avg
        });
      this.calculateUptime()
      console.log(self.node)
    },this.pingInterval)
  }

  init() {
    const self = this
    this.web3_http = new Web3(new Web3.providers.HttpProvider(this.WEB3_HTTP))
    this.web3_ws = new Web3(new Web3.providers.WebsocketProvider(this.WEB3_WS))
    this.web3_ws.eth.net.isListening()
      .then(() => {
        self.node.connected = true
      })
      .catch(()=>{
        self.node.connected = false
      })
    Promise.all([this.getPeers(), this.getNodeInfo()])
      .then(data => {
        self.node.peers = data[0].length
        self.node.id = data[1].id
        self.node.name = data[1].name
        self.node.identifier = data[1].name.split('/')[1]
        this.pingNode()
      })
      .catch(console.log)

    this.web3_ws.eth.subscribe('newBlockHeaders', function(error){
        if (error) return console.log(error);
      })
      .on("data", function(blockHeader){
        self.web3_http.eth.getBlock(blockHeader.number)
          .then(block => {
            self.node.lastBlock = block.number
            self.node.lastBlockSeen = block.timestamp
            self.node.difficulty = block.totalDifficulty
          })
          .catch(console.log)

       })
      .on("error", console.error);
  }

  getPeers() {
    return new Promise((resolve, reject) => {
      rpc({
        url: this.WEB3_HTTP,
        method: 'POST',
        json: {
          jsonrpc: '2.0',
          method: 'admin_peers',
          params: [],
          id: new Date().getTime()
        },
      }, (error, result) => {
          if(error) return reject(error);
          return resolve(result.body.result)
      })
    })
  }

  getNodeInfo() {
    return new Promise((resolve, reject) => {
      rpc({
        url: this.WEB3_HTTP,
        method: 'POST',
        json: {
          jsonrpc: '2.0',
          method: 'admin_nodeInfo',
          params: [],
          id: new Date().getTime()
        },
      }, (error, result) => {
          if(error) return reject(error);
          return resolve(result.body.result)
      })
    })
  }

}

module.exports = Node
