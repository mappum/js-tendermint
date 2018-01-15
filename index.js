module.exports.RpcClient = require('./lib/client.js')
module.exports.RpcClient.METHODS = require('./lib/methods.js')

Object.assign(module.exports, require('./lib/verify.js'))
