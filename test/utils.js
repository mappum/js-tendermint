let WebSocketServer = require('ws').Server

function createWsServer (port = 26657, onRequest) {
  let server = new WebSocketServer({ port })
  let connections = []
  server.on('connection', (ws) => {
    connections.push(ws)
    ws.on('message', (data) => {
      let req = JSON.parse(data.toString())
      let send = (error, result, id = req.id) => {
        let res = { id, error, result }
        ws.send(JSON.stringify(res) + '\n')
      }
      onRequest(req, send)
    })
  })
  let _close = server.close.bind(server)
  let close = () => {
    connections.forEach((ws) => ws.close())
    _close()
  }
  server.close = close
  return server
}

module.exports = { createWsServer }
