let old = require('old')
let EventEmitter = require('events')
let RpcClient = require('./rpc.js')
let {
  verifyCommit,
  verifyCommitSigs,
  verifyValidatorSet,
  verify
} = require('./verify.js')

const FOUR_HOURS = 4 * 60 * 60 * 1000

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

    // 30 days
    this.maxAge = opts.maxAge || 30 * 24 * 60 * 60 * 1000

    if (typeof state.header.height !== 'number') {
      throw Error('Expected state header to have a height')
    }

    // we should be able to trust this state since it was either
    // hardcoded into the client, or previously verified/stored,
    // but it doesn't hurt to do a sanity check. not required
    // for first block, since we might be deriving it from genesis
    if (state.header.height > 1 || state.commit != null) {
      verifyValidatorSet(state.validators, state.header.validators_hash)
      verifyCommit(state.header, state.commit, state.validators)
    }

    this._state = state

    this.rpc = RpcClient(peer)
    this.rpc.on('error', (err) => this.emit('error', err))
    this.on('error', () => this.rpc.close())

    this.handleError(this.initialSync)()
      .then(() => this.emit('synced'))
  }

  handleError (func) {
    return (...args) => {
      return func.call(this, ...args)
        .catch((err) => this.emit('error', err))
    }
  }

  state () {
    // TODO: deep clone
    return this._state
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
    let tip = status.sync_info.latest_block_height
    await this.syncTo(tip)
    this.handleError(this.subscribe)()
  }

  // binary search to find furthest block from our current state,
  // which is signed by 2/3+ voting power of our current validator set
  async syncTo (nextHeight, targetHeight = nextHeight) {
    let { SignedHeader } = await this.rpc.commit({ height: nextHeight })
    let { header, commit } = SignedHeader

    try {
      // test if this commit is signed by 2/3+ of our old set
      // (throws if not)
      verifyCommitSigs(header, commit, this._state.validators)

      // verifiable, let's update
      await this.update(header, commit)

      // reached target
      if (nextHeight === targetHeight) return

      // continue syncing from this point
      return this.syncTo(targetHeight)
    } catch (err) {
      // real error, not just insufficient voting power
      if (!err.insufficientVotingPower) {
        throw err
      }

      // insufficient verifiable voting power,
      // couldn't verify this header

      let height = this.height()
      if (nextHeight === height + 1) {
        throw Error('Validator set changed too much to verify transition')
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
    await this.rpc.subscribe({ query }, this.handleError(async ({ header }) => {
      // don't start another recursive sync if we are in the middle of syncing
      if (syncing) return
      syncing = true
      await this.syncTo(header.height)
      syncing = false
    }))
  }

  async update (header, commit) {
    let { height } = header

    if (!height) {
      throw Error('Expected header to have height')
    }

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
      commit = res.SignedHeader.commit
    }

    let validators = this._state.validators

    let validatorSetChanged = header.validators_hash !== this._state.header.validators_hash
    if (validatorSetChanged) {
      let res = await this.rpc.validators({ height })
      validators = res.validators
    }

    let newState = { header, commit, validators }
    verify(this._state, newState)

    this._state = newState
    this.emit('update', header, commit, validators)
  }
}

module.exports = old(LightNode)
