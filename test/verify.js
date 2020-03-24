let randomBytes = require('crypto').pseudoRandomBytes
let test = require('tape')
let ed25519 = require('supercop.js')
let {
  verifyCommit,
  getVoteSignBytes
} = require('../lib/verify.js')
let { getAddress } = require('../lib/pubkey.js')
let {
  getValidatorSetHash,
  getBlockHash
} = require('../lib/hash.js')

test('verifyCommit with mismatched header and commit', (t) => {
  let validators = genValidators()
  let header = genGenesisHeader(validators)
  let commit = genCommit(genGenesisHeader(validators), validators)
  t.throws(
    () => verifyCommit(header, commit, validators),
    'Commit does not match block hash'
  )
  t.end()
})

test('verifyCommit with mismatched header and precommit', (t) => {
  let validators = genValidators()
  let header = genGenesisHeader(validators)
  let commit = genCommit(header, validators)
  let commit2 = genCommit(genGenesisHeader(validators), validators)
  // copy a precommit for a different header
  commit.precommits[20] = commit2.precommits[20]
  t.throws(
    () => verifyCommit(header, commit, validators),
    'Precommit block hash does not match commit'
  )
  
  t.end()
})

test('verifyCommit with fixture', (t) => {
  let validators = [
    {
      "address": "00BA391A74E7DFDE058DF93DFCEBAD5980E5330D",
      "pub_key": {
        "type": "tendermint/PubKeyEd25519",
        "value": "KHcvGxobAi0VjlBfjYU2A5SIl571qXuIeMIv9nyLTmU="
      },
      "voting_power": "10",
      "proposer_priority": "0"
    }
  ]
  let header = { "version": {
      "block": "10",
      "app": "0"
    },
    "chain_id": "test-chain-0ExC6E",
    "height": "15",
    "time": "2020-03-23T23:04:27.217591086Z",
    "last_block_id": {
      "hash": "0E1011B6D7CF5BD72DC505837E81F84916EACB7EF7B0AA223C7F3E14E3DB6CA5",
      "parts": {
        "total": "1",
        "hash": "2BBE679AEC7B43F418DC39F281F2713F1C9AF0AFD413D6072379877D49BD315F"
      }
    },
    "last_commit_hash": "A10FD6F0E34214B2A05314724AE7A0122D8E17FBA786C3A1E2175840518AFE31",
    "data_hash": "",
    "validators_hash": "D1023F5B4022334F6D000080572565D468028E485E081089CDA21BBCC31F6DAC",
    "next_validators_hash": "D1023F5B4022334F6D000080572565D468028E485E081089CDA21BBCC31F6DAC",
    "consensus_hash": "048091BC7DDC283F77BFBF91D73C44DA58C3DF8A9CBC867405D8B7F3DAADA22F",
    "app_hash": "000000000000000B",
    "last_results_hash": "",
    "evidence_hash": "",
    "proposer_address": "00BA391A74E7DFDE058DF93DFCEBAD5980E5330D"
  }
  let commit = {
    "height": "15",
    "round": "0",
    "block_id": {
      "hash": "1FF1F9E06945CCFCAB2F1EEF42B24D462B06E005685BC8DEFA428706BE30B21C",
      "parts": {
        "total": "1",
        "hash": "6E581F5F989C9C94C0D95E336C122F6D685EF79DE8C6227C63F7B6169AF8C4B7"
      }
    },
    "signatures": [
      {
        "block_id_flag": 2,
        "validator_address": "00BA391A74E7DFDE058DF93DFCEBAD5980E5330D",
        "timestamp": "2020-03-23T23:04:28.36126444Z",
        "signature": "ITM9rAZl1SfgwfF8aXbNUGgzO9cvQ6cLKcZrCNCalwdkaY/gTD2dBR1HBOrMq1MbmtYGXyH1un40DXBOfu+3Bg=="
      }
    ]
  }
  verifyCommit(header, commit, validators)
  t.pass()
  t.end()
})

function genGenesisHeader (validators) {
  let validatorsHash = getValidatorSetHash(validators)
  return {
    version: { block: 123, app: 456 },
    chain_id: Math.random().toString(36),
    height: 1,
    time: new Date().toISOString(),
    num_txs: 0,
    last_block_id: {
      hash: '',
      parts: { total: '0', hash: '' }
    },
    total_txs: 0,
    last_commit_hash: '',
    data_hash: '',
    validators_hash: validatorsHash,
    next_validators_hash: validatorsHash,
    consensus_hash: genHash(),
    app_hash: '',
    last_results_hash: '',
    evidence_hash: '',
    proposer_address: '0001020304050607080900010203040506070809'
  }
}

function genCommit (header, validators) {
  let blockId = {
    hash: getBlockHash(header),
    parts: {
      total: 1,
      hash: genHash()
    }
  }
  let precommits = []
  let time = new Date(header.time).getTime()
  for (let i = 0; i < validators.length; i++) {
    let validator = validators[i]
    let precommit = {
      validator_address: validator.address,
      validator_index: String(i),
      height: header.height,
      round: '0',
      timestamp: new Date(time + Math.random() * 1000).toISOString(),
      type: 2,
      block_id: blockId
    }
    let signBytes = Buffer.from(getVoteSignBytes(header.chain_id, precommit))
    let pub = Buffer.from(validator.pub_key.value, 'base64')
    let signature = ed25519.sign(signBytes, pub, validator.priv_key)
    precommit.signature = {
      type: 'tendermint/SignatureEd25519',
      value: signature.toString('base64')
    }
    precommits.push(precommit)
  }
  return {
    block_id: blockId,
    precommits
  }
}

function genValidators () {
  let validators = []
  for (let i = 0; i < 100; i++) {
    let priv = randomBytes(32)
    let pub = {
      type: 'tendermint/PubKeyEd25519',
      value: priv.toString('base64')
    }
    validators.push({
      priv_key: priv,
      pub_key: pub,
      address: getAddress(pub),
      voting_power: '10',
      accum: '0'
    })
  }
  return validators
}

function genHash () {
  return randomBytes(20).toString('hex').toUpperCase()
}
