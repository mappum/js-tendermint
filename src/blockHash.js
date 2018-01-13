let {
  VarInt,
  VarString,
  VarHexBuffer,
  Time,
  BlockID,
  TreeHashInput
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
blockHashFields.sort((a, b) => a[0] < b[0] ? -1 : 1)

function getBlockHash (header) {
  let hashes = blockHashFields.map(([ key, jsonKey, type ]) =>
    kvHash(key, type, header[jsonKey]))
  return treeHash(hashes).toString('hex').toUpperCase()
}

function kvHash (key, type, value) {
  let valueBytes = type.encode(value)
  let bytes = Buffer.concat([
    VarString.encode(key),
    valueBytes
  ])
  return ripemd160(bytes)
}

function treeHash (hashes) {
  if (hashes.length === 1) return hashes[0]
  let midpoint = Math.ceil(hashes.length / 2)
  let left = treeHash(hashes.slice(0, midpoint))
  let right = treeHash(hashes.slice(midpoint))
  let hashInput = TreeHashInput.encode({ left, right })
  return ripemd160(hashInput)
}

function ripemd160 (data) {
  return createHash('ripemd160').update(data).digest()
}

module.exports = getBlockHash
