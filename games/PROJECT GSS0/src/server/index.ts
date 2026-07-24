import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { GameAuthBridge } from '@yuo-platform/server-sdk';
import type {
  LobbyClientToServerEvents,
  LobbyInterServerEvents,
  LobbyServerToClientEvents,
  LobbySocketData,
} from '../shared/roomProtocol';
import { RoomHub } from './RoomHub';

const port = parsePort(process.env.PORT, 3103);
const host = process.env.HOST ?? '0.0.0.0';
const dataPath = process.env.DATA_PATH ?? resolve(process.cwd(), 'data/snake-profiles.json.gz');
const app = express();
const httpServer = createServer(app);
const io = new Server<LobbyClientToServerEvents, LobbyServerToClientEvents, LobbyInterServerEvents, LobbySocketData>(httpServer, {
  cors: process.env.NODE_ENV === 'production' ? undefined : { origin: true, credentials: true },
  // WebRTC SDP can exceed 16 KiB.
  maxHttpBufferSize: 64 * 1024,
  perMessageDeflate: false,
  pingInterval: 20_000,
  pingTimeout: 10_000,
});
const authBridge = new GameAuthBridge({
  gameId: 'neon-snake-arena',
  platformInternalUrl: process.env.PLATFORM_INTERNAL_URL ?? 'http://127.0.0.1:3100',
  serviceToken: process.env.PLATFORM_SERVICE_TOKEN ?? 'dev-snake-service-token-change-before-production-2026',
  sessionSecret: process.env.GAME_SESSION_SECRET ?? 'dev-snake-game-session-secret-change-before-production-2026',
  cookieName: 'yuo_snake_game_session',
  secureCookies: process.env.COOKIE_SECURE === 'true',
});
io.use(authBridge.socketMiddleware());
const hub = await RoomHub.create(io, dataPath);

app.disable('x-powered-by');
app.use(authBridge.createRouter());
app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'neon-snake-arena', ...hub.getHealth() });
});

if (process.env.NODE_ENV === 'production') {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const clientDirectory = resolve(moduleDirectory, '../client');
  app.use('/assets', express.static(join(clientDirectory, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(clientDirectory, {
    index: false,
    maxAge: 0,
    setHeaders(response) {
      response.setHeader('Cache-Control', 'no-cache');
    },
  }));
  app.get('/{*path}', (_request, response) => {
    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(join(clientDirectory, 'index.html'));
  });
}

httpServer.listen(port, host, () => {
  console.info(`Neon Snake P2P 大厅已启动：http://${host}:${port}`);
});

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`收到 ${signal}，正在保存大厅状态并停止服务`);
  await hub.stop();
  await new Promise<void>((resolveClose) => io.close(() => resolveClose()));
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8_000).unref();
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) throw new Error('PORT 必须是 1 至 65535 的整数');
  return parsed;
}
