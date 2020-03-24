'use strict'

const EventEmitter = require('events')
const axios = require('axios')
const url = require('url')
const old = require('old')
const camel = require('camelcase')
const websocket = require('websocket-stream')
const ndjson = require('ndjson')
const pumpify = require('pumpify').obj
const debug = require('debug')('tendermint:rpc')
const tendermintMethods = require('./methods.js')

function convertHttpArgs (args) {
  args = args || {}
  for (let k in args) {
    let v = args[k]
    if (typeof v === 'number') {
      args[k] = `"${v}"`
    }
  }
  return args
}

function convertWsArgs (args) {
  args = args || {}
  for (let k in args) {
    let v = args[k]
    if (typeof v === 'number') {
      args[k] = String(v)
    } else if (Buffer.isBuffer(v)) {
      args[k] = '0x' + v.toString('hex')
    } else if (v instanceof Uint8Array) {
      args[k] = '0x' + Buffer.from(v).toString('hex')
    }
  }
  return args
}

const wsProtocols = [ 'ws:', 'wss:' ]
const httpProtocols = [ 'http:', 'https:' ]
const allProtocols = wsProtocols.concat(httpProtocols)

class Client extends EventEmitter {
  constructor (uriString = 'localhost:26657') {
    super()

    // parse full-node URI
    let { protocol, hostname, port } = url.parse(uriString)

    // default to http
    if (!allProtocols.includes(protocol)) {
      let uri = url.parse(`http://${uriString}`)
      protocol = uri.protocol
      hostname = uri.hostname
      port = uri.port
    }

    // default port
    if (!port) {
      port = 26657
    }

    if (wsProtocols.includes(protocol)) {
      this.websocket = true
      this.uri = `${protocol}//${hostname}:${port}/websocket`
      this.call = this.callWs
      this.connectWs()
    } else if (httpProtocols.includes(protocol)) {
      this.uri = `${protocol}//${hostname}:${port}/`
      this.call = this.callHttp
    }
  }

  connectWs () {
    this.ws = pumpify(
      ndjson.stringify(),
      websocket(this.uri)
    )
    this.ws.on('error', (err) => this.emit('error', err))
    this.ws.on('close', () => {
      if (this.closed) return
      this.emit('error', Error('websocket disconnected'))
    })
    this.ws.on('data', (data) => {
      data = JSON.parse(data)
      if (data.result && data.result.query) {
        this.emit('query#' + data.result.query, data.error, data.result)
      }
      if (!data.id) return
      this.emit(data.id, data.error, data.result)
    })
  }

  callHttp (method, args) {
    return axios({
      url: this.uri + method,
      params: convertHttpArgs(args)
    }).then(function ({ data }) {
      if (data.error) {
        let err = Error(data.error.message)
        Object.assign(err, data.error)
        throw err
      }
      return data.result
    }, function (err) {
      throw Error(err)
    })
  }

  callWs (method, args, listener) {
    let self = this
    return new Promise((resolve, reject) => {
      let id = Math.random().toString(36)
      let params = convertWsArgs(args)

      if (method === 'subscribe') {
        if (typeof listener !== 'function') {
          throw Error('Must provide listener function')
        }

        // id-free query responses in tendermint-0.33 are returned as follows
        if (params.query) {
          this.on('query#' + params.query, (err, res) => {
            if (err) return self.emit('error', err)
            listener(res.data.value)
          })
        }

        // promise resolves on successful subscription or error
        this.once(id, (err, res) => {
          if (err) return reject(err)
          
          // now that we are subscribed, pass further events to listener
          this.on(id, (err, res) => {
            if (err) return this.emit('error', err)
            listener(res.data.value)
          })

          resolve()
        })
      } else {
        // response goes to promise
        this.once(id, (err, res) => {
          if (err) return reject(err)
          resolve(res)
        })
      }

      this.ws.write({ jsonrpc: '2.0', id, method, params })
    })
  }

  close () {
    this.closed = true
    if (!this.ws) return
    this.ws.destroy()
  }
}

// add methods to Client class based on methods defined in './methods.js'
for (let name of tendermintMethods) {
  Client.prototype[camel(name)] = function (args, listener) {
    if (args) {
      debug('>>', name, args)
    } else {
      debug('>>', name)
    }
    return this.call(name, args, listener)
      .then((res) => {
        debug('<<', name, res)
        return res
      })
  }
}

module.exports = old(Client)
