let test = require('ava')
let tm = require('tendermint-node')
let createTempDir = require('tempy').directory
let getPort = require('get-port')
let LightNode = require('..')

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
    proxy_app: 'dummy'
  })

  t.context.ports = ports
  t.context.node = node
})

test.afterEach((t) => {
  return t.context.node.kill()
})

test('simple light node sync', async (t) => {
  let { ports, node } = t.context
  let { rpc } = node

  await node.synced()

  // get initial state through rpc
  let commit = await rpc.commit({ height: 1 })
  let { validators } = await rpc.validators({ height: 1 })
  let state = {
    ...commit.SignedHeader,
    validators
  }

  let rpcHost = `ws://localhost:${ports.rpc}`
  let lightNode = LightNode(rpcHost, state)

  await new Promise((resolve) => {
    lightNode.on('synced', resolve)
  })
  await new Promise((resolve) => {
    lightNode.on('update', resolve)
  })

  // TODO: check event data

  t.pass()
})
