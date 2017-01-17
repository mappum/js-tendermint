'use strict'

const { get } = require('request')
const url = require('url')
const old = require('old')
const camel = require('camelcase')
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

class Client {
  constructor (uriString = 'localhost:46657') {
    let uri = url.parse(uriString)
    if (uri.protocol !== 'http' && uri.protocol !== 'tcp') {
      uri = url.parse(`http://${uriString}`)
    }
    this.uri = `http://${uri.hostname}:${uri.port}/`
  }

  call (method, args, cb) {
    get({
      uri: method,
      baseUrl: this.uri,
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
