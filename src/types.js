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

    // XXX ghetto, we're pulling the nanoseconds from the string
    let nanosStr = value
      .split('.')[1]
      .slice(0, -1)
      .padEnd(9, '0')
    let nanos = Number(nanosStr)

    let buffer = Buffer.alloc(15)
    // TODO: use js-amino

    buffer[0] = (1 << 3) | 1 // field 1, typ3 1
    buffer.writeUInt32BE(seconds, 5)

    buffer[9] = (2 << 3) | 5 // field 2, typ3 5
    buffer.writeUInt32BE(nanos, 10)

    buffer[14] = 4 // terminator

    return buffer
  }
}

let BlockID = {
  encode (value) {
    // empty block id
    if (!value.hash) {
      return Buffer.from('1308000404', 'hex')
    }

    let buffer = Buffer.alloc(49)

    // TODO: actually do amino encoding stuff

    // hash field
    buffer[0] = 0x0a
    buffer[1] = 0x14 // length of hash (20)
    Buffer.from(value.hash, 'hex').copy(buffer, 2)

    // block parts
    buffer[22] = 0x13
    buffer[23] = 0x08
    buffer[24] = 0x02
    buffer[25] = 0x12
    buffer[26] = 0x14
    Buffer.from(value.parts.hash, 'hex').copy(buffer, 27)
    buffer[47] = 0x04
    buffer[48] = 0x04

    return buffer
  }
}

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
      Buffer.from(pub.value, 'base64')
        .copy(buffer, offset + pubkeyAminoPrefix.length)
    }
    PubKey.encode.bytes = length
    return buffer
  },
  encodingLength (pub) {
    if (pub == null) return 1
    return 37
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
