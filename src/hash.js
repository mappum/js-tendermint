let createHash = require('create-hash')
let {
  VarInt,
  VarString,
  VarBuffer,
  VarHexBuffer,
  Time,
  BlockID,
  TreeHashInput,
  ValidatorHashInput
} = require('./types.js')
let { safeParseInt } = require('./common.js')

const sha256 = hashFunc('sha256')
const tmhash = function (...data) {
  return sha256(...data).slice(0, 20)
}

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
  [ 'Evidence', 'evidence_hash', VarHexBuffer ]
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
  let hashes = validators.map(getValidatorHash)
  return treeHash(hashes).toString('hex').toUpperCase()
}

function getValidatorHash (validator) {
  let bytes = ValidatorHashInput.encode(validator)
  return tmhash(bytes)
}

function kvHash (type, value, key) {
  let encodedValue = ''
  if (type === VarInt) {
    value = safeParseInt(value)
  }
  if (value || typeof value === 'number') {
    encodedValue = type.encode(value)
  }
  let valueHash = tmhash(encodedValue)
  return tmhash(
    VarString.encode(key),
    VarBuffer.encode(valueHash)
  )
}

function treeHash (hashes) {
  if (hashes.length === 1) {
    return hashes[0]
  }
  let midpoint = Math.ceil(hashes.length / 2)
  let left = treeHash(hashes.slice(0, midpoint))
  let right = treeHash(hashes.slice(midpoint))
  let hashInput = TreeHashInput.encode({ left, right })
  return tmhash(hashInput)
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
  getValidatorHash,
  getValidatorSetHash,
  sha256,
  tmhash
}
