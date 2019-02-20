let test = require('ava')
let getPort = require('get-port')
let { LightNode } = require('..')
let { createWsServer } = require('./utils.js')

// TODO: enable when we use time heuristic to detect fake high heights (see lightNode.js)
test.cb.skip('fake sync height', (t) => {
  getPort().then((rpcPort) => {
    let expectedReqs = [
      [
        'status', {
          sync_info: {
            latest_block_height: 10000
          }
        }
      ]
    ]

    let server = createWsServer(rpcPort, (message, send) => {
      if (expectedReqs.length === 0) {
        t.fail('unexpected request')
        return
      }
      let [ req, res ] = expectedReqs.shift()
      if (message.method !== req) {
        t.fail(`expected "${req}" request`)
        return
      }
      send(null, res)

      if (expectedReqs.length === 0) {
        t.end()
      }
    })
    let peer = `ws://localhost:${rpcPort}`

    let node = LightNode(peer, {
      validators: [],
      header: { height: 1 }
    })
  })
})

test('fake header timestamp', async (t) => {
  let rpcPort = await getPort()
  let server = createWsServer(rpcPort, () => {})
  let peer = `ws://localhost:${rpcPort}`

  let node = LightNode(peer, {
    validators: [
      {
        "address": "96E2BEAF73D1694F1FE2747AF128C42E0CF1CBB8",
        "pub_key": {
          "type": "tendermint/PubKeyEd25519",
          "value": "mME8SWTtXhXX/H242IDYLPQsSl8I6ybZjDUcHjyXeE4="
        },
        "voting_power": "10",
        "proposer_priority": "0"
      }
    ],
    header: { height: 1 }
  })

  try {
    await node.update({
      height: '123',
      time: Date.now() + 1e8
    })
    t.fail()
  } catch (err) {
    t.is(err.message, 'Header time is too far in the future')
  }
})
