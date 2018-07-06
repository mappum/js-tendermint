'use strict'

const struct = require('varstruct')
const { Int64LE } = struct
const { VarInt, UVarInt } = require('./varint.js')

const VarString = struct.VarString(UVarInt)
const VarBuffer = struct.VarBuffer(UVarInt)

const VarHexBuffer = {
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
    return length + UVarInt.encodingLength(length)
  }
}

const Time = {
  encode (value) {
    if (value[value.length - 1] !== 'Z') {
      throw Error('Timestamp must be UTC timezone')
    }

    let millis = new Date(value).getTime()
    let seconds = Math.floor(millis / 1000)

    // ghetto, we're pulling the nanoseconds from the string
    let withoutZone = value.slice(0, -1)
    let nanosStr = withoutZone.split('.')[1] || ''
    let nanos = Number(nanosStr.padEnd(9, '0'))

    let buffer = Buffer.alloc(14)

    buffer[0] = (1 << 3) | 1 // field 1, typ3 1
    buffer.writeUInt32LE(seconds, 1)

    buffer[9] = (2 << 3) | 5 // field 2, typ3 5
    buffer.writeUInt32LE(nanos, 10)

    return buffer
  }
}

const BlockID = {
  encode (value) {
    // empty block id
    if (!value.hash) {
      return Buffer.from('1200', 'hex')
    }

    let buffer = Buffer.alloc(48)

    // TODO: actually do amino encoding stuff

    // hash field
    buffer[0] = 0x0a
    buffer[1] = 0x14 // length of hash (20)
    Buffer.from(value.hash, 'hex').copy(buffer, 2)

    // block parts
    buffer[22] = 0x12
    buffer[23] = 0x18
    buffer[24] = 0x08
    buffer[25] = 0x02
    buffer[26] = 0x12
    buffer[27] = 0x14
    Buffer.from(value.parts.hash, 'hex').copy(buffer, 28)

    return buffer
  }
}

const TreeHashInput = struct([
  { name: 'left', type: VarBuffer },
  { name: 'right', type: VarBuffer }
])

const pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex')
const PubKey = {
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

const ValidatorHashInput = {
  decode (buffer, start = 0, end = buffer.length) {
    throw Error('Decode not implemented')
  },
  encode (validator) {
    let length = ValidatorHashInput.encodingLength(validator)
    let buffer = Buffer.alloc(length)

    // address field
    buffer[0] = 0x0a
    buffer[1] = 0x14
    let address = Buffer.from(validator.address, 'hex')
    address.copy(buffer, 2)

    // pubkey field
    buffer[22] = 0x12
    buffer[23] = 0x25
    PubKey.encode(validator.pub_key, buffer, 24)

    // voting power field
    buffer[61] = 0x18
    VarInt.encode(validator.voting_power, buffer, 62)

    ValidatorHashInput.encode.bytes = length
    return buffer
  },
  encodingLength (validator) {
    return 62 + VarInt.encodingLength(validator.voting_power)
  }
}

module.exports = {
  VarInt,
  UVarInt,
  VarString,
  VarBuffer,
  VarHexBuffer,
  Time,
  BlockID,
  TreeHashInput,
  ValidatorHashInput,
  PubKey,
  Int64LE
}
