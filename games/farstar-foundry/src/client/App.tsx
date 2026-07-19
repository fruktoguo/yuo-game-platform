import { AlertTriangle, Factory, LoaderCircle } from 'lucide-react';
import { useGamePlatformSession } from '@yuo-platform/client-sdk';
import { FactoryRoom } from './FactoryRoom';
import { FoundryLobby } from './FoundryLobby';
import { useFoundrySocket } from './hooks/useFoundrySocket';

export function App() {
  const session = useGamePlatformSession();
  if (session.status === 'loading') {
    return (
      <main className="boot-screen">
        <Factory aria-hidden="true" />
        <LoaderCircle className="spin" aria-hidden="true" />
        <span>正在接入远星工造</span>
      </main>
    );
  }
  if (session.status === 'error') {
    return (
      <main className="boot-screen boot-error">
        <AlertTriangle aria-hidden="true" />
        <strong>无法建立游戏会话</strong>
        <span>{session.error}</span>
        <a href={platformLobbyUrl()}>返回游戏大厅</a>
      </main>
    );
  }
  return <AuthenticatedGame accountId={session.principal.accountId} displayName={session.principal.displayName} />;
}

function AuthenticatedGame({ accountId, displayName }: { accountId: string; displayName: string }) {
  const game = useFoundrySocket(accountId);
  if (!game.room) {
    return (
      <FoundryLobby
        displayName={displayName}
        connected={game.connected}
        rooms={game.rooms}
        error={game.error}
        onClearError={game.clearError}
        onCreate={game.createRoom}
        onJoin={game.joinRoom}
      />
    );
  }
  return (
    <FactoryRoom
      accountId={accountId}
      connected={game.connected}
      room={game.room}
      factory={game.factory}
      error={game.error}
      onClearError={game.clearError}
      onLeave={game.leaveRoom}
      onStart={game.startRoom}
      onCommand={game.runCommand}
      onChat={game.sendChat}
    />
  );
}

export function platformLobbyUrl(): string {
  return import.meta.env.VITE_PLATFORM_LOBBY_URL ?? (import.meta.env.PROD ? '/' : 'http://127.0.0.1:3100');
}
