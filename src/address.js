let struct = require('varstruct')
let { ripemd160 } = require('./hash.js')
let { VarHexBuffer } = require('./types.js')

let AddressBytes = struct([
  { name: 'type', type: struct.Byte },
  { name: 'key', type: VarHexBuffer }
])

let types = {
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
  return ripemd160(bytes).toString('hex').toUpperCase()
}

module.exports = getAddress
