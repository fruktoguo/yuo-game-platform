import { createServer } from 'node:http';
import { PostgresDatabase, postgresConfigFromEnv } from '@yuo-platform/persistence';
import { createPlatformApp } from './app';
import { AuthService } from './auth';
import { loadConfig } from './config';
import { createExternalIdentityAdapter } from './externalIdentity';
import { PLATFORM_MIGRATIONS } from './migrations';
import { PlatformRepository } from './repository';

const config = loadConfig();
const database = new PostgresDatabase(postgresConfigFromEnv({
  ...process.env,
  DATABASE_URL: config.databaseUrl,
  DATABASE_APPLICATION_NAME: 'yuo-game-platform',
}));
await database.migrate(PLATFORM_MIGRATIONS);
const repository = new PlatformRepository(database);
const auth = new AuthService(repository, config.sessionTtlSeconds);
const externalIdentity = createExternalIdentityAdapter(config.auth.external);
const app = createPlatformApp(config, repository, auth, externalIdentity);
const server = createServer(app);

server.listen(config.port, config.host, () => {
  console.log(`游戏平台已启动：http://${config.host}:${config.port}`);
});

const cleanupTimer = setInterval(() => {
  void repository.deleteExpiredRecords().catch((error) => console.error('过期会话清理失败', error));
}, 10 * 60_000);
cleanupTimer.unref();

let shuttingDown = false;
const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`收到 ${signal}，正在停止游戏平台`);
  clearInterval(cleanupTimer);
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  await database.close();
  process.exit(0);
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
