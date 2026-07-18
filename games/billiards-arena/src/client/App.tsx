import { lazy, Suspense, useEffect } from 'react';
import type { GamePrincipal } from '@yuo-platform/client-sdk';
import { Lobby } from './components/Lobby';
import { useGameSocket } from './hooks/useGameSocket';

const GameRoom = lazy(() => import('./components/GameRoom').then((module) => ({ default: module.GameRoom })));

export function App({ principal }: { principal: GamePrincipal }) {
  const game = useGameSocket(principal.accountId);

  useEffect(() => {
    if (!game.error) return;
    const timer = window.setTimeout(game.clearError, 4_500);
    return () => window.clearTimeout(timer);
  }, [game.error, game.clearError]);

  return (
    <div className="app-shell">
      {game.room ? (
        <Suspense fallback={<div className="game-loading">正在进入球局</div>}>
          <GameRoom
            accountId={principal.accountId}
            room={game.room}
            snapshot={game.snapshot}
            events={game.events}
            connected={game.connected}
            onLeave={game.leaveRoom}
            onReady={game.setReady}
            onChat={game.sendChat}
            onPlaceCue={game.placeCue}
            onCallPocket={game.callPocket}
            onShoot={game.shoot}
          />
        </Suspense>
      ) : (
        <Lobby
          name={principal.displayName}
          connected={game.connected}
          rooms={game.rooms}
          onCreate={game.createRoom}
          onJoin={game.joinRoom}
        />
      )}
      {game.error && <div className="toast toast-error" role="alert">{game.error}</div>}
    </div>
  );
}
