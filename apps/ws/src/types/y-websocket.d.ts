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
