let tendermint = require('.')

async function main ({ argv }) {
  let rpcUrl = argv[2] || 'ws://localhost:46657'

  // this example fetches the initial commit/validators dynamically
  // for convenience. you should NEVER do this in production, this
  // should be hardcoded or manually approved by the user. otherwise,
  // a malicious node or MITM can trivially trick you onto their own chain!
  let rpc = tendermint.RpcClient(rpcUrl)
  let commit = await rpc.commit({ height: 1 })
  let { validators } = await rpc.validators({ height: 1 })

  let state = {
    ...commit.SignedHeader,
    validators
  }

  let node = tendermint(rpcUrl, state)

  node.on('error', (err) => console.error(err.stack))
  node.on('synced', () => console.log('synced'))
  node.on('update', (update) => console.log('update', update))
}

main(process).catch((err) => {
  console.error(err.stack)
})
