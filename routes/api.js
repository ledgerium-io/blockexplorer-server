const dotenv = require('dotenv').config()
const express = require('express');
const rpc = require('request')
const router = express.Router();
const Block = require('../models/Block')
const Transaction = require('../models/Transaction')
const Address = require('../models/Address')
const BlockchainSync = require('../components/BlockchainSync')
const blockchainSync = new BlockchainSync()
const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.WEB3_HTTP));
const validUnits = ["noether","wei","kwei","Kwei","babbage","femtoether","mwei","Mwei","lovelace","picoether","gwei","Gwei","shannon","nanoether","nano","szabo","microether","micro","finney","milliether","milli","ether","kether","grand","mether","gether","tethe"]

router.get('/limits', (request, response) => {
  response.status(200).send({
    success: true,
    timestamp: Date.now(),
    data: {
      paths: [
        {
          path: '/api/latestTransactions/:limit',
          limit: parseInt(process.env.API_LIMIT_TRANSACTIONS) || 100,
          default: 1
        },
        {
          path: '/api/latestBlocks/:limit',
          limit: parseInt(process.env.API_LIMIT_Blocks) || 25,
          default: 1
        }
      ]
    }
  })
})

router.get('/contractCount', (request, response) => {
  Address.find({type: 1})
    .then(results => {
      response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data: results.length
      })
    })
})

router.get('/nodes', (request, response) => {
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
      if(error) returnError(response, error)
      response.status(200).send({
          success: true,
          timestamp: Date.now(),
          data: result.body.result
        })
  })
})


router.get('/peers', (request, response) => {
  web3.eth.net.getPeerCount()
    .then(peerCount => {
      response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data: peerCount+1
      })
    })
    .catch(error => {
      returnError(response, error)
    })
})

router.get('/balance/:address', (request, response) => {
  const {address, unit} = request.params
  web3.eth.getBalance(address)
    .then(balance => {
      console.log(balance)
      if(unit && validUnits.include(unit)) {
        balance = web3.utils.fromWei(balance, unit)
      }
      response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data: balance
      })
    })
    .catch(error =>{
      console.log(error)
      returnError(response, error)
    })
})

router.get('/block/:number', (request, response) => {
  const {number} = request.params
  Block.findOne({number})
    .then(block => {
      if(!block) throw 'Block not found'
      response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data: block
      })
    })
    .catch(error => {
      returnError(response, error)
    })
})

router.get('/blocks', (request, response) => {
  Block.find().sort({ _id: -1 }).limit(100)
    .then(data => {
      return response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data
      })
    })
    .catch(error => {
      return returnError(response, error)
    })
})

router.get('/transactions', (request, response) => {
  Transaction.find().sort({ _id: -1 }).limit(100)
  .then(data => {
    return response.status(200).send({
      success: true,
      timestamp: Date.now(),
      data
    })
  })
  .catch(error => {
    return returnError(response, error)
  })
})

router.get('/tx/:hash', (request, response) => {
  const {hash} = request.params
  Transaction.findOne({hash})
    .then(tx => {
      if(!tx) throw 'Tx hash not found'
      response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data: tx
      })
    })
    .catch(error => {
      returnError(response, error)
    })
})

router.get('/address/:address', (request, response) => {
  const {address} = request.params
  Address.findOne({address})
    .then(address => {
      if(!address) throw 'Address not found'
      response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data: address
      })
    })
    .catch(error => {
      returnError(response, error)
    })
})

router.get('/latestTransactions/:limit', (request, response) => {
  const {limit} = request.params
  if(!limit) limit = 1
  if(+limit > (+process.env.API_LIMIT_TRANSACTIONS || 100)) return returnError(response, `Limit too high (MAX ${process.env.API_LIMIT_TRANSACTIONS})`)
  Transaction.find().sort({ _id: -1 }).limit(+limit)
    .then(tx => {
      response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data: tx
      })
    })
    .catch(error => {
      returnError(response, error)
    })
})

router.get('/latestBlock', (request, response) => {
  Block.findOne().sort({ _id: -1 })
    .then(block => {
      response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data: block
      })
    })
    .catch(error => {
      returnError(response, error)
    })
})

router.get('/latestBlocks/:limit', (request, response) => {
  const {limit} = request.params
  if(+limit > (+process.env.API_LIMIT_BLOCKS || 25)) return returnError(response, `Limit too high (MAX ${process.env.API_LIMIT_BLOCKS})`)
  console.log(limit)
  Block.find().sort({ _id: -1 }).limit(+limit)
    .then(block => {
      response.status(200).send({
        success: true,
        timestamp: Date.now(),
        data: block
      })
    })
    .catch(error => {
      returnError(response, error)
    })
})

const returnError = (response, message) => {
  response.status(400).send({
    success:false,
    timestamp: Date.now(),
    data: message
  })
}


module.exports = router;
