import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Gamepad2, LayoutGrid } from 'lucide-react';
import { useGamePlatformSession } from '@yuo-platform/client-sdk';
import { App } from './App';
import './styles.css';

function PlatformGameRoot() {
  const session = useGamePlatformSession();
  if (session.status === 'loading') return <div className="platform-session-gate"><i /><strong>正在验证平台账号</strong></div>;
  if (session.status === 'error') {
    return (
      <div className="platform-session-gate is-error">
        <Gamepad2 />
        <strong>{session.error}</strong>
        <a href={import.meta.env.VITE_PLATFORM_LOBBY_URL ?? (import.meta.env.PROD ? '/' : 'http://127.0.0.1:3100')}><LayoutGrid />返回游戏大厅</a>
      </div>
    );
  }
  return <App principal={session.principal} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlatformGameRoot />
  </StrictMode>,
);
