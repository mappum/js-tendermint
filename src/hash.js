'use strict'

const createHash = require('create-hash')
const {
  VarInt,
  VarString,
  VarBuffer,
  VarHexBuffer,
  Time,
  BlockID,
  ValidatorHashInput
} = require('./types.js')

const sha256 = hashFunc('sha256')
const tmhash = sha256

const blockHashFields = [
  [ 'ChainID', 'chain_id', VarString ],
  [ 'Height', 'height', VarInt ],
  [ 'Time', 'time', Time ],
  [ 'NumTxs', 'num_txs', VarInt ],
  [ 'TotalTxs', 'total_txs', VarInt ],
  [ 'LastBlockID', 'last_block_id', BlockID ],
  [ 'LastCommit', 'last_commit_hash', VarHexBuffer ],
  [ 'Data', 'data_hash', VarHexBuffer ],
  [ 'Validators', 'validators_hash', VarHexBuffer ],
  [ 'NextValidators', 'next_validators_hash', VarHexBuffer ],
  [ 'App', 'app_hash', VarHexBuffer ],
  [ 'Consensus', 'consensus_hash', VarHexBuffer ],
  [ 'Results', 'last_results_hash', VarHexBuffer ],
  [ 'Evidence', 'evidence_hash', VarHexBuffer ],
  [ 'Proposer', 'proposer_address', VarHexBuffer ]
]

// sort fields by hash of name
blockHashFields.sort(([ keyA ], [ keyB ]) => {
  let bufA = Buffer.from(keyA)
  let bufB = Buffer.from(keyB)
  return bufA.compare(bufB)
})

function getBlockHash (header) {
  let hashes = blockHashFields.map(([ key, jsonKey, type ]) => {
    return kvHash(type, header[jsonKey], key)
  })
  return treeHash(hashes).toString('hex').toUpperCase()
}

function getValidatorSetHash (validators) {
  let bytes = validators.map(ValidatorHashInput.encode)
  return treeHash(bytes).toString('hex').toUpperCase()
}

function kvHash (type, value, key) {
  let encodedValue = ''
  if (value || typeof value === 'number') {
    encodedValue = type.encode(value)

    // some types have an "empty" value,
    // if we got that then use an empty buffer instead
    if (type.empty != null && encodedValue === type.empty) {
      encodedValue = Buffer.alloc(0)
    }
  }
  let valueHash = tmhash(encodedValue)
  return tmhash(
    VarString.encode(key),
    VarBuffer.encode(valueHash)
  )
}

function treeHash (hashes) {
  if (hashes.length === 0) {
    return null
  }
  if (hashes.length === 1) {
    // leaf hash
    return tmhash(Buffer.concat([
      Buffer.from([ 0 ]),
      hashes[0]
    ]))
  }
  let splitPoint = getSplitPoint(hashes.length)
  let left = treeHash(hashes.slice(0, splitPoint))
  let right = treeHash(hashes.slice(splitPoint))
  // inner hash
  return tmhash(Buffer.concat([
    Buffer.from([ 1 ]),
    left,
    right
  ]))
}

function getSplitPoint (n) {
  if (n < 1) {
    throw Error('Trying to split tree with length < 1')
  }

  let mid = 2 ** Math.floor(Math.log2(n))
  if (mid === n) {
    mid /= 2
  }
  return mid
}

function hashFunc (algorithm) {
  return function (...chunks) {
    let hash = createHash(algorithm)
    for (let data of chunks) hash.update(data)
    return hash.digest()
  }
}

module.exports = {
  getBlockHash,
  getValidatorSetHash,
  sha256,
  tmhash
}
