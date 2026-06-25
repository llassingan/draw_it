/**
 * App root — resolves the current room ID and WebSocket URL, then mounts `<Board>`.
 *
 * Room routing sources (checked in priority order):
 *   1. query string: `?room=<id>`
 *   2. hash:         `#room=<id>`
 *   3. pathname:     first segment after leading slashes
 *   4. fallback:     `'default'`
 *
 * WebSocket URL resolution:
 *   1. `VITE_WS_URL` env var (highest priority)
 *   2. special-cases the staging subdomain (`staging.mahara.web.id` → `api-staging.mahara.web.id`)
 *   3. derives from `window.location` hostname at port `14045`
 *   4. fallback: `ws://127.0.0.1:14045`
 */
import Board from './components/Board/Board';

/**
 * Extracts the room ID from the current URL.
 *
 * Priority order:
 *   1. query string `?room=`
 *   2. hash `#room=`
 *   3. first pathname segment (e.g. `/my-room` → `my-room`)
 *   4. string `'default'`
 */
function getRoomIdFromUrl(): string {
  if (typeof window === 'undefined') return 'default';
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return (
    params.get('room') ??
    hashParams.get('room') ??
    window.location.pathname.replace(/^\/+/, '').split('/')[0] ??
    'default'
  );
}

/**
 * Resolves the WebSocket server URL using the following precedence:
 *
 *   1. `VITE_WS_URL` env var — explicitly set in `.env` or CI
 *   2. staging subdomain special-case: `staging.mahara.web.id` → `wss://api-staging.mahara.web.id:14045`
 *   3. derived from `window.location.hostname` on port `14045` (with correct ws/wss protocol)
 *   4. SSR / missing window fallback: `ws://127.0.0.1:14045`
 */
function getWsUrlFromEnv(): string {
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl !== undefined && envUrl.length > 0) return envUrl;
  if (typeof window === 'undefined') return 'ws://127.0.0.1:14045';
  const { protocol, hostname, port } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  // On staging, the WS server is on a different subdomain (api-staging.mahara.web.id).
  // Locally, the WS server is on the same hostname at port 14045.
  if (hostname === 'staging.mahara.web.id') {
    return 'wss://api-staging.mahara.web.id:14045';
  }
  if (port === '14022' || port === '') {
    return `${wsProtocol}//${hostname}:14045`;
  }
  return `${wsProtocol}//${hostname}:14045`;
}

export default function App(): JSX.Element {
  const roomId = getRoomIdFromUrl();
  const wsUrl = getWsUrlFromEnv();
  return <Board roomId={roomId} wsUrl={wsUrl} />;
}
