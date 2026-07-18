import express from 'express';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { GameAuthBridge } from '@yuo-platform/server-sdk';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../shared/protocol';
import { RoomManager } from './roomManager';

const port = Number.parseInt(process.env.PORT ?? '3102', 10);
const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: process.env.NODE_ENV === 'production' ? undefined : { origin: true, credentials: true },
  maxHttpBufferSize: 16 * 1024,
  pingInterval: 20_000,
  pingTimeout: 15_000,
  perMessageDeflate: false,
});
const authBridge = new GameAuthBridge({
  gameId: 'billiards-arena',
  platformInternalUrl: process.env.PLATFORM_INTERNAL_URL ?? 'http://127.0.0.1:3100',
  serviceToken: process.env.PLATFORM_SERVICE_TOKEN ?? 'dev-billiards-service-token-change-before-production-2026',
  sessionSecret: process.env.GAME_SESSION_SECRET ?? 'dev-billiards-game-session-secret-change-before-production-2026',
  cookieName: 'yuo_billiards_game_session',
  secureCookies: process.env.COOKIE_SECURE === 'true',
});
io.use(authBridge.socketMiddleware());
const rooms = new RoomManager(io);

app.disable('x-powered-by');
app.use(express.json({ limit: '8kb' }));
app.use(authBridge.createRouter());
app.get('/api/health', (_request, response) => {
  response.json({ ok: true, now: Date.now() });
});

if (process.env.NODE_ENV === 'production') {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  const clientDirectory = join(currentDirectory, '../client');
  app.use(express.static(clientDirectory, {
    etag: true,
    maxAge: '1h',
    setHeaders(response, path) {
      if (path.includes('/assets/')) response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (path.endsWith('/index.html')) response.setHeader('Cache-Control', 'no-cache');
    },
  }));
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api/') || request.path.startsWith('/socket.io/')) {
      next();
      return;
    }
    response.setHeader('Cache-Control', 'no-cache');
    response.sendFile(join(clientDirectory, 'index.html'));
  });
}

io.on('connection', (socket) => rooms.register(socket));

httpServer.listen(port, '0.0.0.0', () => {
  console.info(`Breakline 服务已启动：http://0.0.0.0:${port}`);
});

function shutdown(signal: string): void {
  console.info(`收到 ${signal}，正在停止服务`);
  rooms.dispose();
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 8_000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
