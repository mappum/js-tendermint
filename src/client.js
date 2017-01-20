'use strict'

const EventEmitter = require('events')
const { get } = require('request')
const url = require('url')
const old = require('old')
const camel = require('camelcase')
const websocket = require('websocket-stream')
const ndjson = require('ndjson')
const pumpify = require('pumpify').obj
const tendermintMethods = require('./methods.js')

function convertArgs (args) {
  for (let k in args) {
    let v = args[k]
    if (Buffer.isBuffer(v)) {
      args[k] = '0x' + v.toString('hex')
    } else if (v instanceof Uint8Array) {
      args[k] = '0x' + Buffer.from(v).toString('hex')
    }
  }
  return args
}

class Client extends EventEmitter {
  constructor (uriString = 'localhost:46657') {
    super()
    let uri = url.parse(uriString)
    if (uri.protocol !== 'http:' && uri.protocol !== 'ws:') {
      uri = url.parse(`http://${uriString}`)
    }
    if (uri.protocol === 'ws:') {
      this.websocket = true
      this.uri = `ws://${uri.hostname}:${uri.port}/websocket`
      this.call = this.callWs
      this.connectWs()
    } else if (uri.protocol === 'http:') {
      this.uri = `http://${uri.hostname}:${uri.port}/`
      this.call = this.callHttp
    }
  }

  connectWs () {
    this.ws = pumpify(
      ndjson.stringify(),
      websocket(this.uri)
    )
    this.ws.on('error', (err) => this.emit('error', err))
    this.ws.on('data', (data) => {
      data = JSON.parse(data)
      if (!data.id) return
      this.emit(data.id, data.error, data.result)
    })
  }

  callHttp (method, args, cb) {
    get({
      uri: this.uri + method,
      qs: convertArgs(args),
      json: true
    }, (err, res, data) => {
      if (err) return cb(err)
      if (res.statusCode !== 200) {
        let err = `Server responded with status code ${res.statusCode}`
        return cb(Error(err))
      }
      if (data.error) return cb(Error(data.error))
      cb(null, data.result)
    })
  }

  callWs (method, args, cb) {
    let params = []
    for (let k in args) params.push(args[k])

    let id = Math.random().toString(36)
    if (method === 'subscribe') {
      this.on(id + '#event', cb)
    } else {
      this.once(id, cb)
    }
    this.ws.write({ jsonrpc: '2.0', id, method, params })
  }
}

// add methods to Client class based on methods defined in './methods.js'
for (let name of tendermintMethods) {
  Client.prototype[camel(name)] = function (args, cb) {
    if (!cb) {
      cb = args
      args = null
    }
    return this.call(name, args, cb)
  }
}

module.exports = old(Client)
