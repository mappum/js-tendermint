let stringify = require('json-stable-stringify')
let ed25519 = require('ed25519-supercop')
let createHash = require('create-hash')
let BN = require('bn.js')
let getBlockHash = require('./blockHash.js')

function verifyCommit (header, commit, validators) {
  let blockHash = getBlockHash(header)

  if (blockHash !== commit.blockID.hash) {
    throw Error('Commit does not match block hash')
  }

  let committedVotingPower = new BN(0)
  let countedValidators = new Array(validators.length)

  for (let precommit of commit.precommits) {
    if (precommit == null) continue

    // all fields of block ID must match commit
    if (precommit.block_id.hash !== commit.blockID.hash) {
      throw Error('Precommit block hash does not match commit')
    }
    if (precommit.block_id.parts.total !== commit.blockID.parts.total) {
      throw Error('Precommit parts count does not match commit')
    }
    if (precommit.block_id.parts.hash !== commit.blockID.parts.hash) {
      throw Error('Precommit parts hash does not match commit')
    }

    // height must match header
    if (precommit.height !== header.height) {
      throw Error('Precommit height does not match header')
    }

    // rounds of all precommits must match
    if (precommit.round !== commit.precommits[0].round) {
      throw Error('Precommit rounds do not match')
    }

    // type must be 2 (precommit)
    if (precommit.type !== 2) {
      throw Error('Precommit has invalid type value')
    }

    // get validator associated with this precommit
    if (countedValidators[precommit.validator_index]) {
      throw Error('Validator has multiple precommits')
    }
    countedValidators[precommit.validator_index] = true
    let validator = validators[precommit.validator_index]
    if (validator.address !== precommit.validator_address) {
      throw Error('Precommit address does not match validator')
    }
    // TODO:
    // if (getAddress(validator.pub_key) !== validator.address) {
    //   throw Error('Validator address does not match pubkey')
    // }

    // verify signature
    // TODO: support secp256k1 sigs
    let signBytes = getVoteSignBytes(header.chain_id, precommit)
    let pubKey = validator.pub_key.data
    if (!ed25519.verify(precommit.signature.data, signBytes, pubKey)) {
      throw Error('Invalid precommit signature')
    }

    // count this validator's voting power
    committedVotingPower.iaddn(validator.voting_power)
  }

  // ensure sufficient voting power has voted for this commit
  let totalVotingPower = validators.reduce(
    (sum, v) => sum.iaddn(v.voting_power), new BN(0))
  let votingPowerThreshold = totalVotingPower.idivn(3).imuln(2)
  if (committedVotingPower.lt(votingPowerThreshold)) {
    throw Error('Not enough committed voting power')
  }
}

function getVoteSignBytes (chain_id, vote) {
  let { block_id, height, round, type, timestamp } = vote

  // normalize time zone
  timestamp = new Date(timestamp).toISOString()

  return stringify({
    chain_id,
    vote: { block_id, height, round, type, timestamp }
  })
}

module.exports = verifyCommit
