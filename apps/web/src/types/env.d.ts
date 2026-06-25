// Typings for Vite-injected environment variables (`import.meta.env.*`).
//
// VITE_WS_URL  – Override the WebSocket server URL (e.g. "wss://api.example.com").
//                When unset the app falls back to the current host on port 14045.
//                Useful for staging / production deployments where the WS server
//                runs on a different subdomain.
//
// VITE_WS_PATH – Optional custom path appended to the WebSocket URL (e.g. "/ws").
//                When unset the app uses the y-websocket default.

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
  readonly VITE_WS_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
