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
  encode (value, buffer, offset = 0) {
    if (value[value.length - 1] !== 'Z') {
      throw Error('Timestamp must be UTC timezone')
    }

    let length = Time.encodingLength(value)
    buffer = buffer || Buffer.alloc(length)

    let { seconds, nanoseconds } = Time.getComponents(value)

    // seconds field
    buffer[offset] = 0x08
    UVarInt.encode(seconds, buffer, offset + 1)
    offset += UVarInt.encode.bytes + 1

    // nanoseconds field
    buffer[offset] = 0x10
    UVarInt.encode(nanoseconds, buffer, offset + 1)

    Time.encode.bytes = length
    return buffer
  },

  encodingLength (value) {
    let { seconds, nanoseconds } = Time.getComponents(value)

    let length = 0
    if (seconds) {
      length += 1 + UVarInt.encodingLength(seconds)
    }
    if (nanoseconds) {
      length += 1 + UVarInt.encodingLength(nanoseconds)
    }
    return length
  },

  getComponents (value) {
    let millis = new Date(value).getTime()
    let seconds = Math.floor(millis / 1000)

    // ghetto, we're pulling the nanoseconds from the string
    let withoutZone = value.slice(0, -1)
    let nanosStr = withoutZone.split('.')[1] || ''
    let nanoseconds = Number(nanosStr.padEnd(9, '0'))

    return { seconds, nanoseconds }
  }
}

const BlockID = {
  encode (value, buffer = Buffer.alloc(48), offset = 0) {
    // empty block id
    if (!value.hash) {
      return Buffer.alloc(0)
    }

    // TODO: actually do amino encoding stuff

    // hash field
    buffer[offset + 0] = 0x0a
    buffer[offset + 1] = 0x14 // length of hash (20)
    Buffer.from(value.hash, 'hex').copy(buffer, offset + 2)

    // block parts
    buffer[offset + 22] = 0x12
    buffer[offset + 23] = 0x18
    buffer[offset + 24] = 0x08
    buffer[offset + 25] = 0x01
    buffer[offset + 26] = 0x12
    buffer[offset + 27] = 0x14
    Buffer.from(value.parts.hash, 'hex').copy(buffer, offset + 28)

    return buffer
  }
}

const CanonicalBlockID = {
  encode (value, buffer = Buffer.alloc(48), offset = 0) {
    // TODO: actually do amino encoding stuff

    // hash field
    buffer[offset + 0] = 0x0a
    buffer[offset + 1] = 0x14 // length of hash (20)
    Buffer.from(value.hash, 'hex').copy(buffer, offset + 2)

    // block parts
    buffer[offset + 22] = 0x12
    buffer[offset + 23] = 0x18
    buffer[offset + 24] = 0x0a
    buffer[offset + 25] = 0x14
    Buffer.from(value.parts.hash, 'hex').copy(buffer, offset + 26)
    buffer[offset + 46] = 0x10
    buffer[offset + 47] = 0x01

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

    // pubkey field
    buffer[0] = 0x0a
    buffer[1] = 0x25
    PubKey.encode(validator.pub_key, buffer, 2)

    // voting power field
    buffer[39] = 0x10
    UVarInt.encode(validator.voting_power, buffer, 40)

    ValidatorHashInput.encode.bytes = length
    return buffer
  },
  encodingLength (validator) {
    return 40 + VarInt.encodingLength(validator.voting_power)
  }
}

const CanonicalVote = {
  decode (buffer, start = 0, end = buffer.length) {
    throw Error('Decode not implemented')
  },
  encode (vote) {
    let length = CanonicalVote.encodingLength(vote)
    let buffer = Buffer.alloc(length)

    // type field
    buffer[0] = 0x08
    buffer.writeUInt8(vote.type, 1)

    // height field
    buffer[2] = 0x11
    Int64LE.encode(vote.height, buffer, 3)

    // round field
    buffer[11] = 0x19
    Int64LE.encode(vote.round, buffer, 12)

    // block_id field
    buffer[20] = 0x22
    buffer[21] = 0x30
    CanonicalBlockID.encode(vote.block_id, buffer, 22)

    // time field
    buffer[70] = 0x2a
    buffer[71] = 0x0a
    Time.encode(vote.timestamp, buffer, 72)
    let offset = 72 + Time.encode.bytes

    // chain_id field
    buffer[offset] = 0x32
    buffer.writeUInt8(vote.chain_id.length, offset + 1)
    Buffer.from(vote.chain_id).copy(buffer, offset + 2)

    CanonicalVote.encode.bytes = length
    return buffer
  },
  encodingLength (vote) {
    return 92
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
  CanonicalBlockID,
  TreeHashInput,
  ValidatorHashInput,
  PubKey,
  Int64LE,
  CanonicalVote
}
