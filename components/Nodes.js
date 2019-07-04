const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_HTTP));
const geoip = require('geoip-lite');
const rpc = require('request')
const ping = require('ping')

class Nodes {
  constructor() {
      this.rawNodes = []
      this.hosts = []
      this.map = []
      this.nodeList = {}
      this.pingInterval = 5000
      this.compileNodeList()
  }

  pingNodes() {
    const self = this
    const hosts = this.nodeList;

    setInterval(()=> {
      Object.keys(hosts).forEach((key) => {
        ping.promise.probe(hosts[key].ip)
            .then(function (res) {
                self.nodeList[key].online = res.alive
                self.nodeList[key].lastSeen = Date.now()
                self.nodeList[key].latency = res.avg
            });
      })
    },this.pingInterval)
  }

  getNodeCount() {
    return this.rawNodes.length
  }

  compileNodeList() {
    let promises = []
    promises.push(this.getPeers(), this.getNodeInfo())
    Promise.all(promises)
      .then(data => {
        this.rawNodes = [...data[0], data[1]]
        for(let i=0; i<data[0].length; i++) {
          const id = data[0][i].id
          const nodeName = data[0][i].name
          const ip = data[0][i].network.remoteAddress.split(':')[0]
          const difficulty = data[0][i].protocols.istanbul.difficulty
          this.nodeList[id] = {
            id,
            name: nodeName,
            ip,
            online: true,
            latency: 0,
            difficulty,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            lastBlock: 0,
            lastBlockSeen: Date.now(),
            peers: 0
          }
          this.map.push({
            ip: data[0][i].network.remoteAddress.split(':')[0],
            location: geoip.lookup(data[0][i].network.remoteAddress.split(':')[0])
          })
          this.hosts.push(data[0][i].network.remoteAddress.split(':')[0])
        }
        const id = data[1].id
        const nodeName = data[1].name
        const ip = process.env.WEB3_HTTP.split('//')[1].split(':')[0]
        const difficulty = data[1].protocols.istanbul.difficulty
        this.nodeList[id] = {
          id,
          name: nodeName,
          ip,
          online: true,
          latency: 0,
          difficulty,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          lastBlock: 0,
          lastBlockSeen: Date.now(),
          peers: 0
        }
        this.map.push({
          ip: process.env.WEB3_HTTP.split('//')[1].split(':')[0],
          location: geoip.lookup(process.env.WEB3_HTTP.split('//')[1].split(':')[0])
        })
        this.hosts.push(process.env.WEB3_HTTP.split('//')[1].split(':')[0])
        this.pingNodes()
      })
      .catch(console.log)
  }

  getPeers() {
    return new Promise((resolve, reject) => {
      rpc({
        url: process.env.WEB3_HTTP,
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
        url: process.env.WEB3_HTTP,
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

module.exports = Nodes
