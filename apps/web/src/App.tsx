import Board from './components/Board/Board';

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
