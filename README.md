# tendermint

A light client for Tendermint blockchains which works in Node.js and browsers.

### Usage
```
npm install tendermint
```

**Light Node**

Requests data over RPC and verifies blockchain headers

```js
let Tendermint = require('tendermint')

// some full node's RPC port
let peer = 'ws://localhost:46657'

// `state` contains information about an older part of the chain which is known
// to be valid. This cannot be older than the unbonding period, otherwise we
// cannot safely sync using proof-of-stake. This should either be hardcoded by
// the app developer as a trusted starting point, manually accepted as
// trustworthy by the user, or loaded from the last time the user ran the
// light client.
let state = {
  // a header, in the same format as returned by RPC
  // (see http://localhost:46657/commit, under `"header":`)
  header: { ... },

  // the valdiator set for this header, in the same format as returned by RPC
  // (see http://localhost:46657/validators)
  validators: [ ... ],

  // the commit (validator signatures) for this header, in the same format as
  // returned by RPC (see http://localhost:46657/commit, under `"commit":`)
  commit: { ... }
}

// options
let opts = {
  // the maximum number of blocks we can sync into the future
  // from our previous state, e.g. the unbonding period
  maxAge: 1728000 // defaults to 30 days of 1 second blocks
}

// instantiate client. will automatically start syncing to the latest state of
// the blockchain
let node = Tendermint(peer, state, opts)

// make sure to handle errors
node.on('error', (err) => { ... })
// emitted once we have caught up to the current chain tip
node.on('synced', () => { ... })
// emitted every time we have verified a new part of the blockchain
node.on('update', () => { ... })

// returns the height of the most recent header we have verified
node.height()

// returns the state object ({ header, validators, commit }) of the most recently
// verified header, should be stored and used to instantiate the light client
// the next time the user runs the app
node.state()
```

**RPC Client**

Simple client to make RPC requests to nodes

```js
let { RpcClient } = require('tendermint')

let client = RpcClient('ws://localhost:46657')

// request a block
client.block({ height: 100 })
  .then((res) => console.log(res))
```

The following RPC methods are available:

```
- subscribe
- unsubscribe
- status
- netInfo
- dialSeeds
- blockchain
- genesis
- block
- validators
- dumpConsensusState
- broadcastTxCommit
- broadcastTxSync
- broadcastTxSync
- unconfirmedTxs
- numUnconfirmedTxs
- abciQuery
- abciInfo
- abciProof
- unsafeFlushMempool
- unsafeSetConfig
- unsafeStartCpuProfiler
- unsafeStopCpuProfiler
- unsafeWriteHeapProfile
```
