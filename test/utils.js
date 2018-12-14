let WebSocketServer = require('ws').Server

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
  let close = server.close.bind(server)
  server.close = () => new Promise(close)
  return server
}

module.exports = { createWsServer }
