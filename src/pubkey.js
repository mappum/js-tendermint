'use strict'

const struct = require('varstruct')
const { ripemd160 } = require('./hash.js')
const { VarHexBuffer } = require('./types.js')

const AddressBytes = struct([
  { name: 'type', type: struct.Byte },
  { name: 'key', type: VarHexBuffer }
])

const types = {
  'ed25519': 1,
  'secp256k1': 2
}

function getAddress (pubkey) {
  let type = types[pubkey.type]
  if (type == null) {
    throw Error('Invalid pubkey type')
  }
  let bytes = AddressBytes.encode({
    type,
    key: pubkey.data
  })
  return ripemd160(bytes)
}

module.exports = getAddress
