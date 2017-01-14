'use strict'

const { get, STATUS_CODES } = require('http')
const url = require('url')
const qs = require('querystring')
const old = require('old')
const concat = require('concat-stream')
const regeneratorRuntime = require('regenerator-runtime')
const watt = require('watt')
const camel = require('camelcase')
const tendermintMethods = require('./methods.js')

class Client {
  constructor (uriString = 'localhost:46657') {
    let uri = url.parse(uriString)
    if (uri.protocol !== 'http' && uri.protocol !== 'tcp') {
      uri = url.parse(`http://${uriString}`)
    }
    this.uri = uri
    this.call = watt(this.call, { context: this })
  }

  requestUrl (method, params) {
    for (let k in params) {
      let v = params[k]
      if (Buffer.isBuffer(v)) {
        params[k] = '0x' + v.toString('hex')
      } else if (v instanceof Uint8Array) {
        params[k] = '0x' + Buffer.from(v).toString('hex')
      }
    }
    let query = qs.stringify(params)
    return `http://${this.uri.hostname}:${this.uri.port}/${method}?${query}`
  }

  * call (method, args, next) {
    let res = yield get(this.requestUrl(method, args), next.arg(0))
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
for (let name of tendermintMethods) {
  Client.prototype[camel(name)] = function (args, cb) {
    return this.call(name, args, cb)
  }
}

module.exports = old(Client)

// HACK: to prevent standard from complaining about not using `regeneratorRuntime`
const noop = () => regeneratorRuntime; noop()
