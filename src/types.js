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
    let millis = new Date(value).getTime()
    let seconds = Math.floor(millis / 1000)

    // XXX ghetto, we're pulling the microseconds from the string
    let micros = +(value.split('.')[1].slice(0, -1)) * 1000

    let buffer = Buffer.alloc(15)
    // TODO: use js-amino

    buffer[0] = (1 << 3) | 1 // field 1, typ3 1
    buffer.writeUInt32BE(seconds, 5)

    buffer[9] = (2 << 3) | 5 // field 2, typ3 5
    Buffer.from(nanoseconds.toString(16), 'hex')
      .copy(buffer, 10)

    buffer[14] = 4 // terminator

    return buffer
  }
}

let BlockID = struct([
  {
    name: 'hash',
    type: VarHexBuffer
  },
  {
    name: 'parts',
    type: struct([
      { name: 'total', type: VarInt },
      { name: 'hash', type: VarHexBuffer }
    ])
  }
])

let TreeHashInput = struct([
  { name: 'left', type: VarBuffer },
  { name: 'right', type: VarBuffer }
])

const pubkeyAminoPrefix = Buffer.from('1624DE6220', 'hex')
let PubKey = {
  decode (buffer, start = 0, end = buffer.length) {
    throw Error('Decode not implemented')
  },
  encode (pub, buffer, offset = 0) {
    let length = PubKey.encodingLength(pub)
    buffer = buffer || Buffer.alloc(length)
    if (pub == null) {
      buffer[offset] = 0
    } else {
      pubkeyAminoPrefix.copy(buffer, offset)
      Buffer.from(pub.type, 'hex').copy(buffer, offset + 5)
      Buffer.from(pub.value, 'base64').copy(buffer, offset + 12)
    }
    PubKey.encode.bytes = length
    return buffer
  },
  encodingLength (pub) {
    if (pub == null) return 1
    return 5 + 7 + 33
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
