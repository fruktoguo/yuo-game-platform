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
import { RoomManager } from './RoomManager';
import { RoomStore } from './RoomStore';

const port = parsePort(process.env.PORT, 3104);
const host = process.env.HOST ?? '0.0.0.0';
const dataPath = process.env.DATA_PATH ?? resolve(process.cwd(), 'data/foundry-rooms.json.gz');
const store = new RoomStore(dataPath);
const storedState = await store.load();
const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: process.env.NODE_ENV === 'production' ? undefined : { origin: true, credentials: true },
  maxHttpBufferSize: 8 * 1024,
  perMessageDeflate: false,
  pingInterval: 25_000,
  pingTimeout: 12_000,
});
const authBridge = new GameAuthBridge({
  gameId: 'farstar-foundry',
  platformInternalUrl: process.env.PLATFORM_INTERNAL_URL ?? 'http://127.0.0.1:3100',
  serviceToken: process.env.PLATFORM_SERVICE_TOKEN ?? 'dev-foundry-service-token-change-before-production-2026',
  sessionSecret: process.env.GAME_SESSION_SECRET ?? 'dev-foundry-game-session-secret-change-before-production-2026',
  cookieName: 'yuo_foundry_game_session',
  secureCookies: process.env.COOKIE_SECURE === 'true',
});
io.use(authBridge.socketMiddleware());
const rooms = new RoomManager(io, store, storedState);

app.disable('x-powered-by');
app.use(express.json({ limit: '8kb' }));
app.use(authBridge.createRouter());
app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'farstar-foundry', ...rooms.getHealth() });
});

if (process.env.NODE_ENV === 'production') {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  const clientDirectory = resolve(currentDirectory, '../client');
  app.use('/assets', express.static(join(clientDirectory, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(clientDirectory, { index: false, maxAge: '1h' }));
  app.get('/{*path}', (request, response, next) => {
    if (request.path.startsWith('/api/') || request.path.startsWith('/socket.io/')) {
      next();
      return;
    }
    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(join(clientDirectory, 'index.html'));
  });
}

io.on('connection', (socket) => rooms.register(socket));

httpServer.listen(port, host, () => {
  console.log(`远星工造已启动：http://${host}:${port}`);
});

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`收到 ${signal}，正在保存协作房间并停止服务`);
  await rooms.dispose();
  await new Promise<void>((resolveClose) => io.close(() => resolveClose()));
  await new Promise<void>((resolveClose) => httpServer.close(() => resolveClose()));
  process.exit(0);
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) throw new Error('PORT 必须是 1 至 65535 的整数');
  return parsed;
}
