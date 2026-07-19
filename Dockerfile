FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/lobby/package.json apps/lobby/package.json
COPY services/platform/package.json services/platform/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/client-sdk/package.json packages/client-sdk/package.json
COPY packages/server-sdk/package.json packages/server-sdk/package.json
COPY packages/persistence/package.json packages/persistence/package.json
COPY packages/realtime/package.json packages/realtime/package.json
COPY games/life-commons/package.json games/life-commons/package.json
COPY games/billiards-arena/package.json games/billiards-arena/package.json
COPY ["games/PROJECT GSS0/package.json", "games/PROJECT GSS0/package.json"]
COPY games/farstar-foundry/package.json games/farstar-foundry/package.json
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev --workspaces

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN groupadd --system platform && useradd --system --gid platform --home /app platform \
  && mkdir -p /app/data/life /app/data/snake /app/data/foundry /app/data/platform \
  && chown -R platform:platform /app

COPY --from=build --chown=platform:platform /app/package.json /app/package-lock.json ./
COPY --from=build --chown=platform:platform /app/node_modules ./node_modules
COPY --from=build --chown=platform:platform /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=platform:platform /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=platform:platform /app/packages/client-sdk/package.json ./packages/client-sdk/package.json
COPY --from=build --chown=platform:platform /app/packages/client-sdk/dist ./packages/client-sdk/dist
COPY --from=build --chown=platform:platform /app/packages/server-sdk/package.json ./packages/server-sdk/package.json
COPY --from=build --chown=platform:platform /app/packages/server-sdk/dist ./packages/server-sdk/dist
COPY --from=build --chown=platform:platform /app/packages/persistence/package.json ./packages/persistence/package.json
COPY --from=build --chown=platform:platform /app/packages/persistence/dist ./packages/persistence/dist
COPY --from=build --chown=platform:platform /app/packages/realtime/package.json ./packages/realtime/package.json
COPY --from=build --chown=platform:platform /app/packages/realtime/dist ./packages/realtime/dist
COPY --from=build --chown=platform:platform /app/apps/lobby/package.json ./apps/lobby/package.json
COPY --from=build --chown=platform:platform /app/apps/lobby/dist ./apps/lobby/dist
COPY --from=build --chown=platform:platform /app/services/platform/package.json ./services/platform/package.json
COPY --from=build --chown=platform:platform /app/services/platform/dist ./services/platform/dist
COPY --from=build --chown=platform:platform /app/games/life-commons/package.json ./games/life-commons/package.json
COPY --from=build --chown=platform:platform /app/games/life-commons/dist ./games/life-commons/dist
COPY --from=build --chown=platform:platform /app/games/billiards-arena/package.json ./games/billiards-arena/package.json
COPY --from=build --chown=platform:platform /app/games/billiards-arena/dist ./games/billiards-arena/dist
COPY --from=build --chown=platform:platform ["/app/games/PROJECT GSS0/package.json", "./games/PROJECT GSS0/package.json"]
COPY --from=build --chown=platform:platform ["/app/games/PROJECT GSS0/dist", "./games/PROJECT GSS0/dist"]
COPY --from=build --chown=platform:platform /app/games/farstar-foundry/package.json ./games/farstar-foundry/package.json
COPY --from=build --chown=platform:platform /app/games/farstar-foundry/dist ./games/farstar-foundry/dist
# 生产服务器上的旧 Compose 仍可能通过历史目录启动 PROJECT GSS0。
RUN mkdir -p games/neon-snake-arena \
  && ln -s "../PROJECT GSS0/package.json" games/neon-snake-arena/package.json \
  && ln -s "../PROJECT GSS0/dist" games/neon-snake-arena/dist

USER platform

CMD ["node", "services/platform/dist/server/index.js"]
