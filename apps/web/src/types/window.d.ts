// Augment the global `Window` interface with test hooks exposed on
// `window` at runtime so Playwright (E2E) tests can introspect the
// y-websocket provider and connection state.
//
// __WS_CONNECTED__ – a flag set to `true` by the useYDoc hook once the
//                    WebSocket provider finishes its initial sync.  Tests
//                    poll this flag to wait for a stable connection before
//                    driving interactions.
//
// __WS_PROVIDER__   – the live y-websocket WebsocketProvider instance.
//                     Tests use it to inspect awareness state and to
//                     force-disconnect / reconnect the transport.
//
// Both properties are optional (`?`) because they only exist at runtime
// after the provider has been instantiated.

import type { WebsocketProvider } from 'y-websocket';

declare global {
  interface Window {
    __WS_CONNECTED__?: boolean;
    __WS_PROVIDER__?: WebsocketProvider;
  }
}

export {};
