import { createServer } from 'node:http';

const port = parsePort(process.env.MOCK_PLATFORM_PORT, 3100);

const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || request.url !== '/internal/v1/game-sessions/exchange') {
    respond(response, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'not found' } });
    return;
  }

  let body = '';
  for await (const chunk of request) body += chunk;

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    respond(response, 400, { ok: false, error: { code: 'INVALID_JSON', message: 'invalid JSON' } });
    return;
  }

  const code = typeof payload?.code === 'string' ? payload.code.trim() : '';
  if (!code) {
    respond(response, 400, { ok: false, error: { code: 'INVALID_CODE', message: 'launch code is required' } });
    return;
  }

  const identity = code.toLowerCase().endsWith('-b') ? 'b' : 'a';
  const accountId = `local-smoke-${identity}`;
  respond(response, 200, {
    ok: true,
    data: {
      principal: {
        accountId,
        username: accountId,
        displayName: `Local Smoke ${identity.toUpperCase()}`,
        gameId: 'neon-snake-arena',
      },
      expiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
    },
  });
});

server.listen(port, '127.0.0.1', () => {
  console.info(`Local platform mock: http://127.0.0.1:${port}`);
  console.info('Client A: http://127.0.0.1:5176/?launch_code=local-a');
  console.info('Client B: http://localhost:5176/?launch_code=local-b');
});

process.once('SIGINT', close);
process.once('SIGTERM', close);

function close() {
  server.close(() => process.exit(0));
}

function respond(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

function parsePort(value, fallback) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    throw new Error('MOCK_PLATFORM_PORT must be an integer from 1 to 65535');
  }
  return parsed;
}
