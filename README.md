# tendermint
A JS RPC client for Tendermint nodes.

### usage

First, make sure you've [set up a tendermint node and ABCI application](https://tendermint.com/download)

then:
```
npm install tendermint
```

```js
let Tendermint = require('tendermint')


// a websocket uri is required to subscribe to events:
const NODE_URI = 'ws://localhost:46657'
let client = Tendermint(NODE_URI)

// let's just log new blocks:
client.subscribe({ event: 'NewBlock' }, (err, event) => {
  console.log(event)
  /*
    {
      name: 'NewBlock',
      data: {
        type: 'new_block',
        data: {
          block: [
            {
              txs: []
            }
          ]
        }
      }
    } 
  */
})
```

the following methods are available on the `client` object, each accepting a nodeback as the last argument:

```
- subscribe
- unsubscribe

- status
- net_info
- dial_seeds
- blockchain
- genesis
- block
- validators
- dump_consensus_state
- broadcast_tx_commit
- broadcast_tx_sync
- broadcast_tx_async
- unconfirmed_txs
- num_unconfirmed_txs

- abci_query
- abci_info
- abci_proof

- unsafe_flush_mempool
- unsafe_set_config
- unsafe_start_cpu_profiler
- unsafe_stop_cpu_profiler
- unsafe_write_heap_profile
```

more detailed docs about arguments to each method coming soon.

