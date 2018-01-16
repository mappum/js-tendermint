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

module.exports = {
  VarInt,
  VarString,
  VarBuffer,
  VarHexBuffer,
  Time,
  BlockID,
  TreeHashInput,
  Int64BE
}
