/**
 * Collaborative Whiteboard — WebSocket (CRDT) Server
 *
 * A minimal y-websocket server that synchronizes Yjs documents between
 * clients via the Yjs sync protocol. Each room is isolated by extracting
 * the room ID from the URL path (e.g. ws://host:14045/room-name).
 *
 * Key design decisions:
 * - Uses y-websocket's built-in `setupWSConnection` instead of a custom
 *   protocol — this handles the full Yjs sync handshake (SyncStep1/2,
 *   awareness broadcast, and garbage collection).
 * - The HTTP server only serves a health-check endpoint; all real work
 *   happens on the WebSocket upgrade path.
 * - A periodic ping (every 30 s) prevents stale connections from being
 *   silently dropped by intermediate proxies or NAT gateways.
 * - Graceful shutdown on SIGINT/SIGTERM closes the WebSocket server first,
 *   then the HTTP server, with a 5-second fallback that forces process exit
 *   in case something hangs.
 */

import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { WebSocketServer, type WebSocket } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

const PORT = Number(process.env['PORT'] ?? 14045);
const HOST = process.env['HOST'] ?? '0.0.0.0';
const PING_INTERVAL_MS = 30_000;

// HTTP server used only as a health-check endpoint and WebSocket upgrade host.
const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('whiteboard-ws: ok\n');
});

const wss = new WebSocketServer({ server });

// Each incoming WebSocket connection represents a client joining a room.
// The room ID is extracted from the URL path: ws://host:14045/my-room → "my-room".
// Query params are stripped; a bare "/" defaults to room "default".
wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const roomId = (req.url ?? '/').slice(1).split('?')[0] || 'default';
  // eslint-disable-next-line no-console
  console.info(`[ws] connection room=${roomId} remote=${req.socket.remoteAddress}`);
  // `gc: true` enables Yjs garbage collection to clean up tombstones from deleted data.
  setupWSConnection(ws, req, { gc: true });
  ws.on('close', () => {
    // eslint-disable-next-line no-console
    console.info(`[ws] disconnect room=${roomId}`);
  });
});

// Periodic WebSocket ping keeps connections alive through proxies/NATs
// that would otherwise drop idle TCP connections.
const pingInterval = setInterval(() => {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.ping();
    }
  }
}, PING_INTERVAL_MS);

// Graceful shutdown cascade: stop pings → close WebSocket server →
// close HTTP server → exit. If any step hangs, a 5-second forced-exit
// fallback fires. `.unref()` ensures the timer doesn't keep the event
// loop alive if everything closes cleanly before the timeout.
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
