/**
 * Type declarations for y-websocket's undocumented `bin/utils` module.
 *
 * The y-websocket package does not ship its own TypeScript definitions
 * for the internal `bin/utils` entry point. This ambient module
 * declaration provides the types needed to safely import
 * `setupWSConnection` in the server entry point.
 */

declare module 'y-websocket/bin/utils' {
  import type { IncomingMessage } from 'node:http';

  import type { WebSocket } from 'ws';

  export interface SetupWSConnectionOptions {
    docName?: string;
    gc?: boolean;
  }

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: SetupWSConnectionOptions,
  ): void;
}
