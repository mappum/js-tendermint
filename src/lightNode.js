let old = require('old')
let EventEmitter = require('events')
let RpcClient = require('./rpc.js')
let { verifyCommit, verify } = require('./verify.js')

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
    // sync every 1000 blocks by default
    this.epoch = opts.epoch || 1000

    // we should be able to trust this state since it was either
    // hardcoded into the client, or previously verified/stored,
    // but it doesn't hurt to do a sanity check
    verifyCommit(state.header, state.commit, state.validators)
    this.state = state

    this.rpc = RpcClient(peer)
    this.rpc.on('error', (err) => this.emit('error', err))
    this.on('error', () => this.rpc.close())

    this.synced = this.handleError(this.sync())
  }

  handleError (promise) {
    promise.catch((err) => this.emit('error', err))
    return promise
  }

  getState () {
    // TODO: deep clone
    return this.state
  }

  // sync from current state to latest block
  async sync () {
    // TODO: get latest block height, check every `this.epoch` block
    // up to that height,
    // let { last_block_height } = await this.rpc.status()

    this.handleError(this.subscribe())
  }

  // start verifying new blocks as they come in
  async subscribe () {
    let query = 'tm.event = \'NewBlockHeader\''
    await this.rpc.subscribe({ query }, ({ header }) => {
      this.handleError(this.handleHeader(header))
    })
  }

  async handleHeader (header) {
    let { height } = header

    if (!height) {
      throw Error('Expected header to have height')
    }

    // make sure we aren't syncing from longer than than the unbonding period
    // FIXME: nodes can DoS us by sending us a fake high height
    if (height - this.state.header.height > this.maxAge) {
      throw Error('Our state is too old, cannot update safely')
    }

    let { commit } = await this.rpc.commit({ height })

    let validators = this.state.validators

    let validatorSetChanged = header.validators_hash !== this.state.header.validators_hash
    if (validatorSetChanged) {
      validators = await this.rpc.validators({ height })
    }

    let newState = { header, commit, validators }
    verify(this.state, newState)

    this.state = newState
    this.emit('update', header, commit, validators)
  }
}

module.exports = old(LightNode)
