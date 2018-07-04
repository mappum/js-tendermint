let createHash = require('create-hash')
let {
  VarString,
  VarBuffer,
  VarHexBuffer,
  Time,
  BlockID,
  TreeHashInput,
  ValidatorHashInput,
  Int64LE
} = require('./types.js')

const ripemd160 = hashFunc('ripemd160')
const sha256 = hashFunc('sha256')
const tmhash = function (...data) {
  return sha256(...data).slice(0, 20)
}

const blockHashFields = [
  [ 'ChainID', 'chain_id', VarString ],
  [ 'Height', 'height', Int64LE ],
  [ 'Time', 'time', Time ],
  [ 'NumTxs', 'num_txs', Int64LE ],
  [ 'TotalTxs', 'total_txs', Int64LE ],
  [ 'LastBlockID', 'last_block_id', BlockID ],
  [ 'LastCommit', 'last_commit_hash', VarHexBuffer ],
  [ 'Data', 'data_hash', VarHexBuffer ],
  [ 'Validators', 'validators_hash', VarHexBuffer ],
  [ 'App', 'app_hash', VarHexBuffer ],
  [ 'Consensus', 'consensus_hash', VarHexBuffer ],
  [ 'Results', 'last_results_hash', VarHexBuffer ],
  [ 'Evidence', 'evidence_hash', VarHexBuffer ]
]

// sort fields by hash of name
for (let field of blockHashFields) {
  field.push(ripemd160(field[0]))
}
blockHashFields.sort((a, b) => a[3].compare(b[3]))

function getBlockHash (header) {
  let hashes = blockHashFields.map(([ key, jsonKey, type, keyHash ]) => {
    return kvHash(keyHash, type, header[jsonKey], key)
  })
  return treeHash(hashes).toString('hex').toUpperCase()
}

function getValidatorSetHash (validators) {
  let hashes = validators.map(getValidatorHash)
  return treeHash(hashes).toString('hex').toUpperCase()
}

function getValidatorHash (validator) {
  let bytes = ValidatorHashInput.encode(validator)
  return ripemd160(bytes)
}

function kvHash (keyHash, type, value, key) {
  let encodedValue = ''
  if (value || typeof value === 'number') {
    encodedValue = type.encode(value)
  }
  let valueHash = ripemd160(encodedValue)
  return ripemd160(
    VarBuffer.encode(keyHash),
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
  return ripemd160(hashInput)
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
  ripemd160,
  sha256,
  tmhash
}
