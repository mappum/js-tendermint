let BN = require('bn.js')
let struct = require('varstruct')
let { Int64BE } = struct
let VarInt = require('./varint.js')

let VarString = struct.VarString(VarInt)
let VarBuffer = struct.VarBuffer(VarInt)

let VarHexBuffer = {
  decode () {
    throw Error('Decode not implemented')
  },
  encode (value, buffer, offset) {
    value = Buffer.from(value, 'hex')
    let bytes = VarBuffer.encode(value, buffer, offset)
    VarHexBuffer.encode.bytes = VarBuffer.encode.bytes
    return bytes
  },
  encodingLength (value) {
    let length = value.length / 2
    return length + VarInt.encodingLength(length)
  }
}

let Time = {
  encode (value) {
    let date = new Date(value)
    let time = new BN(date.getTime())
    time.imuln(1e6)
    return Buffer.from(time.toString(16), 'hex')
  }
}

let BlockID = struct([
  {
    name: 'hash',
    type: VarHexBuffer
  }, {
    name: 'parts',
    type: struct([
      { name: 'total', type: VarInt },
      { name: 'hash', type: VarHexBuffer }
    ])
  },
])

let TreeHashInput = struct([
  { name: 'left', type: VarBuffer },
  { name: 'right', type: VarBuffer }
])

let PubKey = {
  decode(buffer, start = 0, end = buffer.length) {
    throw Error('Decode not implemented')
  },
  encode(pub, buffer, offset = 0) {
    let length = PubKey.encodingLength(pub)
    buffer = buffer || Buffer.alloc(length)
    if (pub == null) {
      buffer[offset] = 0
    } else {
      buffer[offset] = 1
      Buffer.from(pub.data, 'hex').copy(buffer, offset + 1)
    }
    PubKey.encode.bytes = length
    return buffer
  },
  encodingLength(pub) {
    if (pub == null) return 1
    return 33
  }
}

let ValidatorHashInput = struct([
  { name: 'address', type: VarHexBuffer },
  { name: 'pub_key', type: PubKey },
  { name: 'voting_power', type: Int64BE }
])

module.exports = {
  VarInt,
  VarString,
  VarBuffer,
  VarHexBuffer,
  Time,
  BlockID,
  TreeHashInput,
  ValidatorHashInput,
  PubKey,
  Int64BE
}
