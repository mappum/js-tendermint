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
      address: '8E593C2621AF81D46820DA7119805A1815510826',
      pub_key: {
        type: 'tendedrmint/PubKeyEd25519',
        value: 'Q6Sw1toW1Vktd13mpwgJXMjOGk4TVQdsN9WfWN24/zs='
      },
      voting_power: 10,
      proposer_priority: '0'
    },
    {
      address: 'D39250AFFA7046E082C010E449952846F5C3E58C',
      pub_key: {
        type: 'tendermint/PubKeyEd25519',
        value: '3zheJ3wd/jv1y5kCVvs6aG4oikgt5INv6rdz1m6gAE8='
      },
      voting_power: 10,
      proposer_priority: '0'
    }
  ]
  let header = { version: { block: '10', app: '0' },
    chain_id: 'bitcoin-peg',
    height: 22,
    time: '2019-05-10T01:33:43.512766Z',
    num_txs: '1',
    total_txs: '13',
    last_block_id:
     { hash:
        '9834F1E15D5EAFFD752844303CAC647E652C7D950A1EA50CD224295EAF9A2681',
       parts:
        { total: '1',
          hash:
           '357336D5D2E28298E80EEFB7C6E3A8E9B62CDD1A3F3ECF74CA2266242FDCFECF' } },
    last_commit_hash:
     '08EA1D192D3FCBB39FEAB21C4646BFA32658217424BBA07BF160EC130FA230DE',
    data_hash:
     'E97D243EDF5C278765CEB85E6C9FCDF21EC2863A5144168D933266B47BEF744F',
    validators_hash:
     'A06687B9F454F3ADCCAEF5CCCD474B2D60F11E261045935A54D249AF37B2EE67',
    next_validators_hash:
     'A06687B9F454F3ADCCAEF5CCCD474B2D60F11E261045935A54D249AF37B2EE67',
    consensus_hash:
     '048091BC7DDC283F77BFBF91D73C44DA58C3DF8A9CBC867405D8B7F3DAADA22F',
    app_hash: '6894E993ED49F48157EDA6F138B419990A4DBA60',
    last_results_hash:
     '6E340B9CFFB37A989CA544E6BB780A2C78901D3FB33738768511A30617AFA01D',
    evidence_hash: '',
    proposer_address: 'D39250AFFA7046E082C010E449952846F5C3E58C' }
  let commit = { block_id:
   { hash:
      '2A8EB50A5929E307BFEF94D19BDEBFF555D682ABFE5A1E6625511022BAFFB475',
     parts:
      { total: '1',
        hash:
         'B03B51C5BFCC6F7B9B55CFDAF9FAE4539A20E5250297E52317A64DF2752601CF' } },
  precommits:
   [ { type: 2,
       height: '22',
       round: '0',
       block_id: { hash:
          '2A8EB50A5929E307BFEF94D19BDEBFF555D682ABFE5A1E6625511022BAFFB475',
         parts:
          { total: '1',
            hash:
             'B03B51C5BFCC6F7B9B55CFDAF9FAE4539A20E5250297E52317A64DF2752601CF' } },
       timestamp: '2019-05-10T01:33:45.283332Z',
       validator_address: '8E593C2621AF81D46820DA7119805A1815510826',
       validator_index: '0',
       signature:
        '1LKBIc+AdZgdhpgCT20C9kv8Gq+9zdyogOh6yAkYMy6TpY7R9qXN+SvMFK+tjXUmciSPYf707Xk1OaaKz/kqDg==' },
     { type: 2,
       height: '22',
       round: '0',
       block_id: { hash:
          '2A8EB50A5929E307BFEF94D19BDEBFF555D682ABFE5A1E6625511022BAFFB475',
         parts:
          { total: '1',
            hash:
             'B03B51C5BFCC6F7B9B55CFDAF9FAE4539A20E5250297E52317A64DF2752601CF' } },
       timestamp: '2019-05-10T01:33:45.494564Z',
       validator_address: 'D39250AFFA7046E082C010E449952846F5C3E58C',
       validator_index: '1',
       signature:
        '6EXjUmTCMOCYQNFusfO7hLuOtIy/jgBnK+gqiiFcRkCtS7P1oqIrS7G47PKu8FBoxTEyLD01P9KObNXO9Ha6Bg==' } ] }
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
