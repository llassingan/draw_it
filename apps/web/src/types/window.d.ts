import type { WebsocketProvider } from 'y-websocket';

declare global {
  interface Window {
    __WS_CONNECTED__?: boolean;
    __WS_PROVIDER__?: WebsocketProvider;
  }
}

export {};
