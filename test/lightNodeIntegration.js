let test = require('ava')
let tm = require('tendermint-node')
let createTempDir = require('tempy').directory
let getPort = require('get-port')
let { LightNode, RpcClient } = require('..')

test.beforeEach(async (t) => {
  let home = createTempDir()
  await tm.init(home)

  let ports = {
    p2p: await getPort(),
    rpc: await getPort()
  }

  let node = tm.node(home, {
    p2p: { laddr: `tcp://127.0.0.1:${ports.p2p}` },
    rpc: { laddr: `tcp://127.0.0.1:${ports.rpc}` },
    proxy_app: 'noop'
  })

  t.context.ports = ports
  t.context.node = node
})

test.afterEach((t) => {
  return t.context.node.kill()
})

test('simple light node sync', async (t) => {
  let { ports, node } = t.context

  await node.synced()

  // get initial state through rpc
  let rpcHost = `ws://localhost:${ports.rpc}`
  let rpc = RpcClient(rpcHost)
  let commit = await rpc.commit({ height: 1 })
  let { validators } = await rpc.validators({ height: 1 })
  let state = {
    ...commit.signed_header,
    validators
  }
  rpc.close()

  let lightNode = LightNode(rpcHost, state)
  lightNode.once('error', (err) => {
    console.error(err.stack)
    t.fail()
  })

  await new Promise((resolve) => {
    lightNode.once('synced', resolve)
  })
  await new Promise((resolve) => {
    lightNode.once('update', resolve)
  })

  // TODO: check event data

  lightNode.close()

  t.pass()
})
