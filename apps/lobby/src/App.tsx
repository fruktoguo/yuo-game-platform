import {
  ArrowRight,
  Coins,
  ExternalLink,
  Gamepad2,
  History,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
} from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  PlatformApiClient,
  PlatformApiError,
  type AuthProviderDescriptor,
  type GameManifest,
  type SessionView,
  type WalletView,
} from '@yuo-platform/client-sdk';

type AuthMode = 'login' | 'register';

interface AppData {
  session: SessionView | null;
  providers: AuthProviderDescriptor[];
  games: GameManifest[];
  wallet: WalletView | null;
}

export function App() {
  const api = useMemo(() => new PlatformApiClient(), []);
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [session, providers, games] = await Promise.all([api.getSession(), api.getProviders(), api.getGames()]);
      const wallet = session ? await api.getWallet() : null;
      setData({ session, providers, games, wallet });
      setError(null);
    } catch (refreshError) {
      setError(errorMessage(refreshError));
    }
  };

  useEffect(() => { void refresh(); }, []);

  if (!data) return <LoadingState error={error} onRetry={() => void refresh()} />;
  if (!data.session) {
    return (
      <AuthScreen
        api={api}
        providers={data.providers}
        games={data.games}
        error={error}
        onAuthenticated={(session) => {
          setData((current) => current ? { ...current, session } : current);
          void refresh();
        }}
        onError={setError}
      />
    );
  }
  return (
    <LobbyScreen
      api={api}
      data={data as AppData & { session: SessionView }}
      error={error}
      onError={setError}
      onLogout={async () => {
        await api.logout();
        setData((current) => current ? { ...current, session: null, wallet: null } : current);
      }}
    />
  );
}

function AuthScreen(props: {
  api: PlatformApiClient;
  providers: AuthProviderDescriptor[];
  games: GameManifest[];
  error: string | null;
  onAuthenticated: (session: SessionView) => void;
  onError: (message: string | null) => void;
}) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const localEnabled = props.providers.some((provider) => provider.id === 'local' && provider.enabled);
  const externalProviders = props.providers.filter((provider) => (
    provider.mode === 'redirect' && provider.enabled && provider.authorizationUrl
  ));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'register' && password !== passwordConfirm) return props.onError('两次输入的密码不一致');
    setSubmitting(true);
    props.onError(null);
    try {
      const session = mode === 'login'
        ? await props.api.login({ username, password })
        : await props.api.register({ username, password, displayName: displayName || undefined });
      props.onAuthenticated(session);
    } catch (submitError) {
      props.onError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-screen">
      <div className="auth-media" aria-hidden="true">
        {props.games.slice(0, 2).map((game) => <img key={game.id} src={game.coverUrl} alt="" />)}
      </div>
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-block">
          <span className="brand-mark"><Gamepad2 /></span>
          <div><strong>Yuo戏大厅</strong><small>统一游戏大厅</small></div>
        </div>
        <header>
          <span>{localEnabled ? mode === 'login' ? '欢迎回来' : '建立平台账号' : '连接平台账号'}</span>
          <h1 id="auth-title">{localEnabled && mode === 'register' ? '注册游戏大厅' : '登录游戏大厅'}</h1>
        </header>
        {externalProviders.length > 0 && (
          <div className="external-auth-list">
            {externalProviders.map((provider) => (
              <a className="external-auth-command" href={provider.authorizationUrl} key={provider.id}>
                <LogIn />
                <span>使用 {provider.name} 登录</span>
                <ExternalLink />
              </a>
            ))}
          </div>
        )}
        {externalProviders.length > 0 && localEnabled && <div className="auth-divider"><span>或使用平台账号</span></div>}
        {localEnabled && (
          <>
            <div className="auth-tabs" role="tablist" aria-label="账号操作">
              <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); props.onError(null); }}>登录</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); props.onError(null); }}>注册</button>
            </div>
            <form onSubmit={(event) => void submit(event)}>
              <label>
                <span>用户名</span>
                <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={24} required />
              </label>
              {mode === 'register' && (
                <label>
                  <span>显示名称</span>
                  <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" maxLength={24} placeholder={username || '游戏内名称'} />
                </label>
              )}
              <label>
                <span>密码</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={10} maxLength={128} required />
              </label>
              {mode === 'register' && (
                <label>
                  <span>确认密码</span>
                  <input type="password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} autoComplete="new-password" minLength={10} maxLength={128} required />
                </label>
              )}
              {props.error && <div className="form-error" role="alert">{props.error}</div>}
              <button className="primary-command" type="submit" disabled={submitting}>
                {mode === 'login' ? <LogIn /> : <UserRound />}
                <span>{submitting ? '正在处理' : mode === 'login' ? '登录' : '创建账号'}</span>
                <ArrowRight />
              </button>
            </form>
          </>
        )}
        {!localEnabled && props.error && <div className="form-error external-auth-error" role="alert">{props.error}</div>}
        <footer><ShieldCheck /><span>账号会话由平台统一管理</span></footer>
      </section>
    </main>
  );
}

function LobbyScreen(props: {
  api: PlatformApiClient;
  data: AppData & { session: SessionView };
  error: string | null;
  onError: (message: string | null) => void;
  onLogout: () => Promise<void>;
}) {
  const [launching, setLaunching] = useState<string | null>(null);
  const account = props.data.session.account;
  const wallet = props.data.wallet;

  const launch = async (game: GameManifest) => {
    if (game.status !== 'online' || launching) return;
    setLaunching(game.id);
    props.onError(null);
    try {
      const result = await props.api.launchGame(game.id);
      window.location.assign(result.launchUrl);
    } catch (launchError) {
      props.onError(errorMessage(launchError));
      setLaunching(null);
    }
  };

  return (
    <div className="lobby-shell">
      <header className="lobby-topbar">
        <div className="brand-block compact">
          <span className="brand-mark"><Gamepad2 /></span>
          <div><strong>Yuo戏大厅</strong><small>游戏大厅</small></div>
        </div>
        <nav aria-label="大厅导航"><button className="is-active"><Gamepad2 />游戏</button><button><History />动态</button></nav>
        <div className="account-strip">
          <div className="points-pill"><Coins /><span>通用积分</span><strong>{wallet?.balance ?? 0}</strong></div>
          <div className="avatar">{Array.from(account.displayName)[0]?.toUpperCase()}</div>
          <div className="account-name"><strong>{account.displayName}</strong><span>@{account.username}</span></div>
          <button className="icon-command" type="button" aria-label="退出登录" title="退出登录" onClick={() => void props.onLogout()}><LogOut /></button>
        </div>
      </header>

      <main className="lobby-workspace">
        <section className="library-pane">
          <header className="section-heading">
            <div><span>GAME LIBRARY</span><h1>全部游戏</h1></div>
            <p><span className="live-dot" />{props.data.games.filter((game) => game.status === 'online').length} 款可用</p>
          </header>
          {props.error && <div className="inline-error" role="alert">{props.error}</div>}
          <div className="game-grid">
            {props.data.games.map((game) => (
              <article className="game-card" key={game.id}>
                <div className="game-cover"><img src={game.coverUrl} alt={`${game.name} 游戏画面`} /><span className={`status status-${game.status}`}>{statusLabel(game.status)}</span></div>
                <div className="game-info">
                  <div><h2>{game.name}</h2><p>{game.shortDescription}</p></div>
                  <div className="capability-row">
                    {game.capabilities.realtime && <span><Users />联机</span>}
                    {game.capabilities.persistentState && <span><RefreshCw />持续世界</span>}
                    <span><Sparkles />平台账号</span>
                  </div>
                  <button type="button" className="play-command" disabled={game.status !== 'online' || launching !== null} onClick={() => void launch(game)}>
                    <Play />
                    <span>{launching === game.id ? '正在启动' : game.status === 'online' ? '开始游戏' : statusLabel(game.status)}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="account-pane">
          <section className="profile-summary">
            <div className="large-avatar">{Array.from(account.displayName)[0]?.toUpperCase()}</div>
            <div><span>PLAYER PROFILE</span><strong>{account.displayName}</strong><small>@{account.username}</small></div>
          </section>
          <section className="wallet-panel">
            <header><div><WalletCards /><span>通用积分</span></div><small>POINT</small></header>
            <strong>{wallet?.balance ?? 0}</strong>
            <p>版本 {wallet?.version ?? 0}</p>
          </section>
          <section className="ledger-panel">
            <header><div><History /><span>最近流水</span></div></header>
            {(wallet?.entries.length ?? 0) > 0 ? wallet!.entries.map((entry) => (
              <div className="ledger-row" key={entry.id}>
                <span><strong>{entry.reasonCode}</strong><small>{new Date(entry.createdAt).toLocaleString('zh-CN')}</small></span>
                <em className={entry.amount > 0 ? 'is-positive' : ''}>{entry.amount > 0 ? '+' : ''}{entry.amount}</em>
              </div>
            )) : <div className="empty-ledger"><Coins /><span>暂无积分流水</span></div>}
          </section>
        </aside>
      </main>
    </div>
  );
}

function LoadingState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return <main className="loading-screen"><Gamepad2 /><strong>{error ?? '正在连接游戏大厅'}</strong>{error && <button type="button" onClick={onRetry}><RefreshCw />重试</button>}</main>;
}

function statusLabel(status: GameManifest['status']): string {
  if (status === 'online') return '在线';
  if (status === 'maintenance') return '维护中';
  return '即将开放';
}

function errorMessage(error: unknown): string {
  if (error instanceof PlatformApiError || error instanceof Error) return error.message;
  return '请求失败，请稍后重试';
}
