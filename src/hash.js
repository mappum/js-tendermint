let createHash = require('create-hash')
let {
  VarString,
  VarBuffer,
  VarHexBuffer,
  Time,
  BlockID,
  TreeHashInput,
  ValidatorHashInput,
  Int64BE
} = require('./types.js')

const blockHashFields = [
  [ 'ChainID', 'chain_id', VarString ],
  [ 'Height', 'height', Int64BE ],
  [ 'Time', 'time', Time ],
  [ 'NumTxs', 'num_txs', Int64BE ],
  [ 'LastBlockID', 'last_block_id', BlockID ],
  [ 'TotalTxs', 'total_txs', Int64BE ],
  [ 'LastCommit', 'last_commit_hash', VarHexBuffer ],
  [ 'Data', 'data_hash', VarHexBuffer ],
  [ 'Validators', 'validators_hash', VarHexBuffer ],
  [ 'Consensus', 'consensus_hash', VarHexBuffer ],
  [ 'App', 'app_hash', VarHexBuffer ],
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
    let hash = kvHash(keyHash, type, header[jsonKey], key)
    hash.key = key
    return hash
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
  let bytes = Buffer.concat([
    VarBuffer.encode(keyHash),
    VarBuffer.encode(valueHash)
  ])
  return ripemd160(bytes)
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

function ripemd160 (data) {
  return createHash('ripemd160').update(data).digest()
}

module.exports = {
  getBlockHash,
  getValidatorHash,
  getValidatorSetHash,
  ripemd160
}
