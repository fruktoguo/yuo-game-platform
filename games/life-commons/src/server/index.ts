import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { GameAuthBridge } from '@yuo-platform/server-sdk';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../shared/protocol';
import { LifeWorld } from './LifeWorld';
import { WorldHub } from './WorldHub';
import { WorldStore } from './WorldStore';

const port = parsePort(process.env.PORT, 3101);
const host = process.env.HOST ?? '0.0.0.0';
const dataPath = process.env.DATA_PATH ?? resolve(process.cwd(), 'data/world.json.gz');
const store = new WorldStore(dataPath);
const storedState = await store.load();
const world = new LifeWorld(store, storedState);
const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: process.env.NODE_ENV === 'production' ? undefined : { origin: true, credentials: true },
  maxHttpBufferSize: 512 * 1024,
  perMessageDeflate: false,
  pingInterval: 20_000,
  pingTimeout: 10_000,
});
const authBridge = new GameAuthBridge({
  gameId: 'life-commons',
  platformInternalUrl: process.env.PLATFORM_INTERNAL_URL ?? 'http://127.0.0.1:3100',
  serviceToken: process.env.PLATFORM_SERVICE_TOKEN ?? 'dev-life-service-token-change-before-production-2026',
  sessionSecret: process.env.GAME_SESSION_SECRET ?? 'dev-life-game-session-secret-change-before-production-2026',
  cookieName: 'yuo_life_game_session',
  secureCookies: process.env.COOKIE_SECURE === 'true',
});
io.use(authBridge.socketMiddleware());
const hub = new WorldHub(io, world);

app.disable('x-powered-by');
app.use(authBridge.createRouter());
app.get('/health', (_request, response) => {
  const meta = world.getMeta();
  response.json({
    ok: true,
    service: 'life-commons',
    tick: meta.tick,
    online: meta.online,
    population: meta.population,
    seasonId: meta.season.id,
  });
});

if (process.env.NODE_ENV === 'production') {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const clientDirectory = resolve(moduleDirectory, '../client');
  app.use('/assets', express.static(join(clientDirectory, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(clientDirectory, { index: false, maxAge: '1h' }));
  app.get('/{*path}', (_request, response) => {
    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(join(clientDirectory, 'index.html'));
  });
}

httpServer.listen(port, host, () => {
  world.start();
  console.log(`生命战争已启动：http://${host}:${port}`);
});

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`收到 ${signal}，正在保存世界并停止服务`);
  hub.dispose();
  await world.stop();
  await new Promise<void>((resolveClose) => io.close(() => resolveClose()));
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) throw new Error('PORT 必须是 1 至 65535 的整数');
  return parsed;
}
