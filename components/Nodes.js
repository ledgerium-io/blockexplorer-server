const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_HTTP));
const geoip = require('geoip-lite');
const rpc = require('request')
const ping = require('ping')

class Nodes {
  constructor() {
      this.rawNodes = []
      this.nodeList = []
      this.hosts = []
      this.map = []
      this.compileNodeList()
  }

  pingNodes() {
    var hosts = this.hosts;

    var frequency = 1000; //1 second

    hosts.forEach(function (host) {
        ping.promise.probe(host)
            .then(function (res) {
                console.log(res);
            });
    });
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
          this.map.push({
            ip: data[0][i].network.remoteAddress.split(':')[0],
            location: geoip.lookup(data[0][i].network.remoteAddress.split(':')[0])
          })
          this.hosts.push(data[0][i].network.remoteAddress.split(':')[0])
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
