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
    if (seconds) {
      buffer[offset] = 0x08
      UVarInt.encode(seconds, buffer, offset + 1)
      offset += UVarInt.encode.bytes + 1
    }

    // nanoseconds field
    if (nanoseconds) {
      buffer[offset] = 0x10
      UVarInt.encode(nanoseconds, buffer, offset + 1)
    }

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
  encode (value, buffer, offset = 0) {
    let length = BlockID.encodingLength(value)
    buffer = buffer || Buffer.alloc(length)

    // TODO: actually do amino encoding stuff

    // hash field
    if (value.hash) {
      let hash = Buffer.from(value.hash, 'hex')
      buffer[offset + 0] = 0x0a
      buffer[offset + 1] = hash.length
      hash.copy(buffer, offset + 2)
      offset += hash.length + 2
    }

    // block parts
    if (value.parts && value.parts.hash) {
      let partsHash = Buffer.from(value.parts.hash, 'hex')
      buffer[offset] = 0x12
      buffer[offset + 1] = partsHash.length + 4

      buffer[offset + 2] = 0x08
      buffer[offset + 3] = value.parts.total

      buffer[offset + 4] = 0x12
      buffer[offset + 5] = partsHash.length
      partsHash.copy(buffer, offset + 6)
      offset += partsHash.length + 4
    }

    CanonicalBlockID.encode.bytes = length
    return buffer
  },

  encodingLength (value) {
    let length = 0
    if (value.hash) length += value.hash.length / 2 + 2
    if (value.parts && value.parts.hash) {
      length += value.parts.hash.length / 2 + 6
    }
    return length
  }
}

const CanonicalBlockID = {
  encode (value, buffer, offset = 0) {
    let length = CanonicalBlockID.encodingLength(value)
    buffer = buffer || Buffer.alloc(length)

    // TODO: actually do amino encoding stuff

    // hash field
    let hash = Buffer.from(value.hash, 'hex')
    buffer[offset + 0] = 0x0a
    buffer[offset + 1] = hash.length
    hash.copy(buffer, offset + 2)
    offset += hash.length + 2

    // block parts
    let partsHash = Buffer.from(value.parts.hash, 'hex')
    buffer[offset] = 0x12
    buffer[offset + 1] = partsHash.length + 4
    buffer[offset + 2] = 0x0a
    buffer[offset + 3] = partsHash.length
    partsHash.copy(buffer, offset + 4)
    offset += partsHash.length + 4

    buffer[offset] = 0x10
    buffer[offset + 1] = value.parts.total

    CanonicalBlockID.encode.bytes = length
    return buffer
  },

  encodingLength (value) {
    return (value.hash.length / 2) +
      (value.parts.hash.length / 2) +
      8
  }
}

const TreeHashInput = struct([
  { name: 'left', type: VarBuffer },
  { name: 'right', type: VarBuffer }
])

// TODO: support secp keys (separate prefix)
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

    // TODO: handle pubkeys of different length

    // voting power field
    buffer[39] = 0x10
    UVarInt.encode(validator.voting_power, buffer, 40)

    ValidatorHashInput.encode.bytes = length
    return buffer
  },
  encodingLength (validator) {
    return 40 + UVarInt.encodingLength(validator.voting_power)
  }
}

const CanonicalVote = {
  decode (buffer, start = 0, end = buffer.length) {
    throw Error('Decode not implemented')
  },
  encode (vote) {
    let length = CanonicalVote.encodingLength(vote)
    let buffer = Buffer.alloc(length)
    let offset = 0

    // type field
    if (Number(vote.type)) {
      buffer[offset] = 0x08
      buffer.writeUInt8(vote.type, offset + 1)
      offset += 2
    }

    // height field
    if (Number(vote.height)) {
      buffer[offset] = 0x11
      Int64LE.encode(vote.height, buffer, offset + 1)
      offset += 9
    }

    // round field
    if (Number(vote.round)) {
      buffer[offset] = 0x19
      Int64LE.encode(vote.round, buffer, offset + 1)
      offset += 9
    }

    // block_id field
    if (vote.block_id && vote.block_id.hash) {
      buffer[offset] = 0x22
      CanonicalBlockID.encode(vote.block_id, buffer, offset + 2)
      buffer[offset + 1] = CanonicalBlockID.encode.bytes
      offset += CanonicalBlockID.encode.bytes + 2
    }

    // time field
    buffer[offset] = 0x2a
    Time.encode(vote.timestamp, buffer, offset + 2)
    buffer[offset + 1] = Time.encode.bytes
    offset += Time.encode.bytes + 2

    // chain_id field
    buffer[offset] = 0x32
    buffer.writeUInt8(vote.chain_id.length, offset + 1)
    Buffer.from(vote.chain_id).copy(buffer, offset + 2)

    CanonicalVote.encode.bytes = length
    return buffer
  },
  encodingLength (vote) {
    let length = 0

    // type field
    if (Number(vote.type)) {
      length += 2
    }

    // height field
    if (Number(vote.height)) {
      length += 9
    }

    // round field
    if (Number(vote.round)) {
      length += 9
    }

    // block_id field
    if (vote.block_id && vote.block_id.hash) {
      length += CanonicalBlockID.encodingLength(vote.block_id) + 2
    }

    // time field
    length += Time.encodingLength(vote.timestamp) + 2

    // chain_id field
    length += vote.chain_id.length + 2

    return length
  }
}

const Version = {
  decode (buffer, start = 0, end = buffer.length) {
    throw Error('Decode not implemented')
  },
  encode (version) {
    let length = Version.encodingLength(version)
    let buffer = Buffer.alloc(length)
    let offset = 0

    let block = Number(version.block)
    let app = Number(version.app)

    // block field
    if (block) {
      buffer[offset] = 0x08
      UVarInt.encode(version.block, buffer, offset + 1)
      offset += UVarInt.encode.bytes + 1
    }

    // app field
    if (app) {
      buffer[offset] = 0x10
      UVarInt.encode(version.app, buffer, offset + 1)
    }

    CanonicalVote.encode.bytes = length
    return buffer
  },
  encodingLength (version) {
    let block = Number(version.block)
    let app = Number(version.app)

    let length = 0
    if (block) {
      length += UVarInt.encodingLength(version.block) + 1
    }
    if (app) {
      length += UVarInt.encodingLength(version.app) + 1
    }
    return length
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
  CanonicalVote,
  Version
}
