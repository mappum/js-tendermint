'use strict'

const EventEmitter = require('events')
const { request, STATUS_CODES } = require('http')
const url = require('url')
const old = require('old')
const concat = require('concat-stream')
const regeneratorRuntime = require('regenerator-runtime')
const watt = require('watt')
const camel = require('camelcase')
const tendermintMethods = require('./methods.js')

const noop = () => regeneratorRuntime
// hack to prevent standard from complaining about not using `regeneratorRuntime`

function requestBody (method, params) {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: String(Date.now()),
    method,
    params
  })
}

class Client extends EventEmitter {
  constructor (uriString = 'localhost:46657') {
    super()

    let uri = url.parse(uriString)
    if (uri.protocol !== 'http' && uri.protocol !== 'tcp') {
      uri = url.parse(`http://${uriString}`)
    }
    this.reqOpts = {
      host: uri.hostname,
      port: uri.port,
      method: 'POST',
      path: '/'
    }

    this.call = watt(this.call, { context: this })
  }

  * call (method, args, next) {
    let req = request(this.reqOpts, next.arg(0))
    let reqBody = requestBody(method, args)
    req.write(reqBody)
    req.end()

    let res = yield // wait for http request callback
    if (res.statusCode !== 200) {
      let err = `${res.statusCode} - ${STATUS_CODES[res.statusCode]}`
      throw new Error(err)
    }

    let data = yield res.pipe(concat(next.arg(0))) // buffer response stream
    data = JSON.parse(data.toString())
    if (data.error) throw new Error(data.error)
    return data.result
  }
}

// add methods to Client class based on methods defined in './methods.js'
for (let method of tendermintMethods) {
  Client.prototype[camel(method)] = function (...args) {
    let cb = args[args.length - 1]
    if (typeof cb !== 'function') {
      cb = noop
    } else {
      args = args.slice(0, args.length - 1)
    }
    return this.call(method, args, cb)
  }
}

module.exports = old(Client)
