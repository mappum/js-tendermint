let { createServer } = require('http')
let parseUrl = require('url').parse
let test = require('ava')
let getPort = require('get-port')
let WebSocketServer = require('ws').Server
let { RpcClient } = require('..')

function createHttpServer (port = 26657, onRequest) {
  let server = createServer((req, res) => {
    let { query } = parseUrl(req.url, true)
    let resValue = onRequest(req, query)
    res.end(JSON.stringify(resValue))
  })
  server.listen(port)
  return server
}

function createWsServer (port = 26657, onRequest) {
  let server = new WebSocketServer({ port })
  server.on('connection', (ws) => {
    ws.on('message', (data) => {
      let req = JSON.parse(data.toString())
      let send = (error, result, id = req.id) => {
        let res = { id, error, result }
        ws.send(JSON.stringify(res) + '\n')
      }
      onRequest(req, send)
    })
  })
  return server
}

test('default constructor', (t) => {
  let rpc = RpcClient()
  t.is(rpc.uri, 'http://localhost:26657/')
  t.falsy(rpc.websocket)
})

test('constructor with no protocol', (t) => {
  let rpc = RpcClient('localhost:1234')
  t.is(rpc.uri, 'http://localhost:1234/')
  t.falsy(rpc.websocket)
})

test('constructor with no port', (t) => {
  let rpc = RpcClient('https://localhost')
  t.is(rpc.uri, 'https://localhost:26657/')
  t.falsy(rpc.websocket)
})

test('constructor with websocket', async (t) => {
  let rpc = RpcClient('ws://localhost:26657')
  t.is(rpc.uri, 'ws://localhost:26657/websocket')
  t.true(rpc.websocket)
  rpc.close()
})

test('constructor with secure websocket', async (t) => {
  let rpc = RpcClient('wss://localhost:26657')
  t.is(rpc.uri, 'wss://localhost:26657/websocket')
  t.true(rpc.websocket)
  rpc.close()
})

test('http path', async (t) => {
  let port = await getPort()
  let server = createHttpServer(port, (req, query) => {
    t.is(req.url, '/status')
    return { result: 'foo' }
  })
  let rpc = RpcClient(`http://localhost:${port}`)
  let res = await rpc.status()
  t.is(res, 'foo')
  server.close()
})

test('http arg conversion', async (t) => {
  let port = await getPort()
  let server = createHttpServer(port, (req, query) => {
    t.is(JSON.parse(query.height), '123')
    return {}
  })
  let rpc = RpcClient(`http://localhost:${port}`)
  await rpc.commit({ height: 123 })
  server.close()
})

test('http response errors are thrown', async (t) => {
  let port = await getPort()
  let server = createHttpServer(port, (req, query) => {
    return { error: { code: 123, message: 'test' } }
  })
  let rpc = RpcClient(`http://localhost:${port}`)
  try {
    await rpc.commit({ height: 123 })
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.code, 123)
    t.is(err.message, 'test')
  }
  server.close()
})

test('http non-response errors are thrown', async (t) => {
  let rpc = RpcClient(`http://localhost:0`)
  try {
    await rpc.commit({ height: 123 })
    t.fail('should have thrown')
  } catch (err) {
    t.pass()
  }
})

test('ws arg conversion', async (t) => {
  let port = await getPort()
  let server = createWsServer(port, (req, res) => {
    t.is(req.method, 'commit')
    t.is(req.params.number, '123')
    t.is(req.params.buffer, '0x68656c6c6f')
    t.is(req.params.uint8array, '0x01020304')
    res(null, 'bar')
  })
  let rpc = RpcClient(`ws://localhost:${port}`)
  let res = await rpc.commit({
    number: 123,
    buffer: Buffer.from('hello'),
    uint8array: new Uint8Array([ 1, 2, 3, 4 ])
  })
  t.is(res, 'bar')
  rpc.close()
  server.close()
})

test('ws subscription', async (t) => {
  t.plan(1)
  let port = await getPort()
  let events = []
  let server = createWsServer(port, (req, res) => {
    res(null, {})
    res(null,
      { data: { value: 'foo' } },
      `${req.id}#event`)
    res(null,
      { data: { value: 'bar' } },
      `${req.id}#event`)
  })
  let rpc = RpcClient(`ws://localhost:${port}`)
  await rpc.subscribe({ query: 'foo' }, (event) => {
    events.push(event)
    if (events.length < 2) return
    t.deepEqual(events, [ 'foo', 'bar' ])
    rpc.close()
    server.close()
  })
})

test('ws subscription error', async (t) => {
  let port = await getPort()
  let server = createWsServer(port, (req, res) => {
    res({ code: 123, message: 'uh oh' })
  })
  let rpc = RpcClient(`ws://localhost:${port}`)
  try {
    await rpc.subscribe({ query: 'foo' }, () => {})
    t.fail('should have thrown')
  } catch (err) {
    t.is(err.code, 123)
    t.is(err.message, 'uh oh')
  }
  rpc.close()
  server.close()
})
