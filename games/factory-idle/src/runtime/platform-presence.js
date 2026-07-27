const GAME_ID = 'alien-factory';
const TOKEN_STORAGE_KEY = 'alien-factory.platform-presence-token';
const LOBBY_STORAGE_KEY = 'alien-factory.lobby-url';
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;

const currentUrl = new URL(window.location.href);
const launchToken = currentUrl.searchParams.get('presence_token');
const launchLobbyUrl = currentUrl.searchParams.get('lobby_url');

if (launchToken) localStorage.setItem(TOKEN_STORAGE_KEY, launchToken);
if (launchLobbyUrl) localStorage.setItem(LOBBY_STORAGE_KEY, launchLobbyUrl);

if (launchToken || launchLobbyUrl) {
  currentUrl.searchParams.delete('presence_token');
  currentUrl.searchParams.delete('lobby_url');
  window.history.replaceState(null, '', `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
}

export const lobbyUrl = localStorage.getItem(LOBBY_STORAGE_KEY) || '/';

let token = launchToken || localStorage.getItem(TOKEN_STORAGE_KEY) || undefined;
let heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS;
let heartbeatTimer = 0;
let requestInFlight = false;

async function reportPresence() {
  if (requestInFlight) return;
  requestInFlight = true;
  try {
    const response = await fetch(`/api/v1/games/${GAME_ID}/presence`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(token ? { token } : {}),
    });
    if (!response.ok) throw new Error(`在线状态上报失败：${response.status}`);
    const result = await response.json();
    if (!result?.ok || typeof result.data?.token !== 'string') throw new Error('在线状态响应格式异常');
    token = result.data.token;
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    const seconds = Number(result.data.heartbeatIntervalSeconds);
    if (Number.isFinite(seconds) && seconds >= 10 && seconds <= 120) {
      heartbeatIntervalMs = seconds * 1000;
    }
  } catch {
    // 平台统计故障不影响单机游戏运行，下一周期自动重试。
  } finally {
    requestInFlight = false;
    scheduleHeartbeat();
  }
}

function scheduleHeartbeat() {
  window.clearTimeout(heartbeatTimer);
  heartbeatTimer = window.setTimeout(() => void reportPresence(), heartbeatIntervalMs);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void reportPresence();
});

window.addEventListener('pagehide', () => {
  if (!token || !navigator.sendBeacon) return;
  const payload = new Blob([JSON.stringify({ token })], { type: 'application/json' });
  navigator.sendBeacon(`/api/v1/games/${GAME_ID}/presence`, payload);
});

void reportPresence();
