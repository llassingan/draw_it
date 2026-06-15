import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { WebSocketServer, type WebSocket } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

const PORT = Number(process.env['PORT'] ?? 14045);
const HOST = process.env['HOST'] ?? '0.0.0.0';
const PING_INTERVAL_MS = 30_000;

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('whiteboard-ws: ok\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const roomId = (req.url ?? '/').slice(1).split('?')[0] || 'default';
  // eslint-disable-next-line no-console
  console.info(`[ws] connection room=${roomId} remote=${req.socket.remoteAddress}`);
  setupWSConnection(ws, req, { gc: true });
  ws.on('close', () => {
    // eslint-disable-next-line no-console
    console.info(`[ws] disconnect room=${roomId}`);
  });
});

const pingInterval = setInterval(() => {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.ping();
    }
  }
}, PING_INTERVAL_MS);

function shutdown(signal: NodeJS.Signals): void {
  // eslint-disable-next-line no-console
  console.info(`[ws] ${signal} received, shutting down`);
  clearInterval(pingInterval);
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
  setTimeout(() => {
    process.exit(1);
  }, 5_000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[ws] server error', err);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const address = server.address() as AddressInfo | null;
  const port = address?.port ?? PORT;
  // eslint-disable-next-line no-console
  console.info(`[ws] listening on ws://${HOST}:${port}`);
});
