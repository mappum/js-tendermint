'use strict'

const old = require('old')
const EventEmitter = require('events')
const RpcClient = require('./rpc.js')
const {
  verifyCommit,
  verifyCommitSigs,
  verifyValidatorSet,
  verify
} = require('./verify.js')
const { getValidatorSetHash } = require('./hash.js')
const { safeParseInt } = require('./common.js')

const HOUR = 60 * 60 * 1000
const FOUR_HOURS = 4 * HOUR
const THIRTY_DAYS = 30 * 24 * HOUR

// TODO: support multiple peers
// (multiple connections to listen for headers,
// get current height from multiple peers before syncing,
// randomly select peer when requesting data,
// broadcast txs to many peers)

// TODO: on error, disconnect from peer and try again

// TODO: use time heuristic to ensure nodes can't DoS by
// sending fake high heights.
// (applies to getting height when getting status in `sync()`,
// and when receiving a block in `update()`)

// talks to nodes via RPC and does light-client verification
// of block headers.
class LightNode extends EventEmitter {
  constructor (peer, state, opts = {}) {
    super()

    this.maxAge = opts.maxAge || THIRTY_DAYS

    if (state.header.height == null) {
      throw Error('Expected state header to have a height')
    }
    state.header.height = safeParseInt(state.header.height)

    // we should be able to trust this state since it was either
    // hardcoded into the client, or previously verified/stored,
    // but it doesn't hurt to do a sanity check. commit verifification
    // not required for first block, since we might be deriving it from
    // genesis
    verifyValidatorSet(state.validators, state.header.validators_hash)
    if (state.header.height > 1 || state.commit != null) {
      verifyCommit(state.header, state.commit, state.validators)
    } else {
      // add genesis validator hash to state
      let validatorHash = getValidatorSetHash(state.validators)
      state.header.validators_hash = validatorHash.toString('hex').toUpperCase()
    }

    this._state = state

    this.rpc = RpcClient(peer)
    // TODO: ensure we're using websocket
    this.emitError = this.emitError.bind(this)
    this.rpc.on('error', this.emitError)

    this.handleError(this.initialSync)()
      .then(() => this.emit('synced'))
  }

  handleError (func) {
    return (...args) => {
      return func.call(this, ...args)
        .catch((err) => this.emitError(err))
    }
  }

  emitError (err) {
    this.rpc.close()
    this.emit('error', err)
  }

  state () {
    // TODO: deep clone
    return Object.assign({}, this._state)
  }

  height () {
    return this._state.header.height
  }

  // sync from current state to latest block
  async initialSync () {
    // TODO: use time heuristic (see comment at top of file)
    // TODO: get tip height from multiple peers and make sure
    //       they give us similar results
    let status = await this.rpc.status()
    let tip = safeParseInt(status.sync_info.latest_block_height)
    if (tip > this.height()) {
      await this.syncTo(tip)
    }
    this.handleError(this.subscribe)()
  }

  // binary search to find furthest block from our current state,
  // which is signed by 2/3+ voting power of our current validator set
  async syncTo (nextHeight, targetHeight = nextHeight) {
    let { signed_header: { header, commit } } =
      await this.rpc.commit({ height: nextHeight })
    header.height = safeParseInt(header.height)

    try {
      // try to verify (throws if we can't)
      await this.update(header, commit)

      // reached target
      if (nextHeight === targetHeight) return

      // continue syncing from this point
      return this.syncTo(targetHeight)
    } catch (err) {
      // throw real errors
      if (!err.insufficientVotingPower) {
        throw err
      }

      // insufficient verifiable voting power error,
      // couldn't verify this header

      let height = this.height()
      if (nextHeight === height + 1) {
        // should not happen unless peer sends us fake transition
        throw Error('Could not verify transition')
      }

      // let's try going halfway back and see if we can verify
      let midpoint = height + Math.ceil((nextHeight - height) / 2)
      return this.syncTo(midpoint, targetHeight)
    }
  }

  // start verifying new blocks as they come in
  async subscribe () {
    let query = 'tm.event = \'NewBlockHeader\''
    let syncing = false
    let targetHeight = this.height()
    await this.rpc.subscribe({ query }, this.handleError(async ({ header }) => {
      header.height = safeParseInt(header.height)
      targetHeight = header.height

      // don't start another sync loop if we are in the middle of syncing
      if (syncing) return
      syncing = true

      // sync one block at a time to target
      while (this.height() < targetHeight) {
        await this.syncTo(this.height() + 1)
      }

      // unlock
      syncing = false
    }))
  }

  async update (header, commit) {
    header.height = safeParseInt(header.height)
    let { height } = header

    // make sure we aren't syncing from longer than than the unbonding period
    let prevTime = new Date(this._state.header.time).getTime()
    if (Date.now() - prevTime > this.maxAge) {
      throw Error('Our state is too old, cannot update safely')
    }

    // make sure new commit isn't too far in the future
    let nextTime = new Date(header.time).getTime()
    if (nextTime - Date.now() > FOUR_HOURS) {
      throw Error('Header time is too far in the future')
    }

    if (commit == null) {
      let res = await this.rpc.commit({ height })
      commit = res.signed_header.commit
      commit.header.height = safeParseInt(commit.header.height)
    }

    let validators = this._state.validators

    let validatorSetChanged = header.validators_hash !== this._state.header.validators_hash
    if (validatorSetChanged) {
      let res = await this.rpc.validators({ height, per_page: -1 })
      validators = res.validators
    }

    let newState = { header, commit, validators }
    verify(this._state, newState)

    this._state = newState
    this.emit('update', header, commit, validators)
  }

  close () {
    this.rpc.close()
  }
}

module.exports = old(LightNode)
