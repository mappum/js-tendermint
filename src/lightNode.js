let old = require('old')
let EventEmitter = require('events')
let RpcClient = require('./rpc.js')
let {
  verifyCommit,
  verifyCommitSigs,
  verify
} = require('./verify.js')

// TODO: support multiple peers
// (multiple connections to listen for headers,
// randomly select peer when requesting data,
// broadcast txs to many peers)

// TODO: on error, disconnect from peer and try again

// TODO: use time heuristic to ensure nodes can't DoS by
// sending fake high heights.
// (applies to getting height when getting status in `sync()`,
// and when receiving a block in `handleHeader()`)

// talks to nodes via RPC and does light-client verification
// of block headers.
class LightNode extends EventEmitter {
  constructor (peer, state, opts = {}) {
    super()

    // 30 days of 1s blocks
    this.maxAge = opts.maxAge || 30 * 24 * 60 * 60

    // we should be able to trust this state since it was either
    // hardcoded into the client, or previously verified/stored,
    // but it doesn't hurt to do a sanity check
    verifyCommit(state.header, state.commit, state.validators)
    this._state = state

    this.rpc = RpcClient(peer)
    this.rpc.on('error', (err) => this.emit('error', err))
    this.on('error', () => this.rpc.close())

    this.synced = this.handleError(this.initialSync())
  }

  handleError (promise) {
    promise.catch((err) => this.emit('error', err))
    return promise
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
    let status = await this.rpc.status()
    let tip = status.latest_block_height

    // make sure we aren't syncing from longer than than the unbonding period
    if (tip - this.height() > this.maxAge) {
      throw Error('Our state is too old, cannot update safely')
    }

    await this.syncTo(tip)

    this.handleError(this.subscribe())
  }

  // binary search to find furthest block from our current state,
  // which is signed by 2/3+ voting power of our current validator set
  async syncTo (nextHeight, targetHeight = nextHeight) {
    let { header, commit } = await this.rpc.commit({ height: nextHeight })

    try {
      // test if this commit is signed by 2/3+ of our old set
      // (throws if not)
      verifyCommitSigs(header, commit, this._state.validators)

      // verifiable, let's update
      await this.handleHeader(header, commit)

      // reached target
      if (nextHeight === targetHeight) return

      // continue syncing from this point
      return this.syncTo(targetHeight)

    } catch (err) {
      let height = this.height()
      if (nextHeight === height + 1) {
        throw Error('Validator set changed too much to verify transition')
      }

      // changed too much to verify, try going half as far
      let midpoint = height + Math.ceil((nextHeight - height) / 2)
      return this.syncTo(midpoint, targetHeight)
    }
  }

  // start verifying new blocks as they come in
  async subscribe () {
    let query = 'tm.event = \'NewBlockHeader\''
    let syncing = false
    await this.rpc.subscribe({ query }, async ({ header }) => {
      // don't start another recursive sync if we are in the middle of syncing
      if (syncing) return
      syncing = true
      await this.handleError(this.syncTo(header.height))
      syncing = false
    })
  }

  async handleHeader (header, commit) {
    let { height } = header

    if (!height) {
      throw Error('Expected header to have height')
    }

    if (commit == null) {
      let res = await this.rpc.commit({ height })
      commit = res.commit
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
