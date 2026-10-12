const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Level Devil Server Active');
});

const wss = new WebSocketServer({ server });
const rooms = {};

wss.on('connection', (ws) => {
  ws.room = null;

  ws.on('message', (msgStr) => {
    try {
      const data = JSON.parse(msgStr);

      if (data.type === 'join') {
        const r = (data.room || '7788').toUpperCase();
        ws.room = r;
        if (!rooms[r]) rooms[r] = [];
        if (rooms[r].length >= 2) {
          ws.send(JSON.stringify({ type: 'full' }));
          return;
        }
        rooms[r].push(ws);
        const pNum = rooms[r].length;
        ws.send(JSON.stringify({ type: 'joined', pNum, room: r }));

        rooms[r].forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'ready', count: rooms[r].length }));
          }
        });
      }

      if (data.type === 'sync' && ws.room && rooms[ws.room]) {
        rooms[ws.room].forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'oppMove',
              x: data.x,
              y: data.y,
              leg: data.leg,
              alive: data.alive
            }));
          }
        });
      }

      if (data.type === 'trap' && ws.room && rooms[ws.room]) {
        rooms[ws.room].forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'trapTrigger', id: data.id }));
          }
        });
      }

      if (data.type === 'win' && ws.room && rooms[ws.room]) {
        rooms[ws.room].forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'stageWin', winner: data.winner }));
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  });

  ws.on('close', () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room] = rooms[ws.room].filter(c => c !== ws);
      if (rooms[ws.room].length === 0) delete rooms[ws.room];
    }
  });
});

server.listen(PORT, () => console.log(`Listening on ${PORT}`));
          
