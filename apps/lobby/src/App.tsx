import {
  ArrowRight,
  Coins,
  ExternalLink,
  Gamepad2,
  History,
  HardDrive,
  LogIn,
  LogOut,
  Monitor,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import {
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  PlatformApiClient,
  PlatformApiError,
  type AuthProviderDescriptor,
  type GameManifest,
  type GamePulseView,
  type GameTag,
  type SessionView,
  type WalletView,
} from '@yuo-platform/client-sdk';

type AuthMode = 'login' | 'register';

type TagFilter = GameTag | 'all';
type SortMode = 'hotness' | 'online' | 'name';

const TAG_LABELS: Record<GameTag, string> = {
  casual: '休闲',
  competitive: '竞技',
  combat: '战斗',
  progression: '养成',
  strategy: '策略',
  'single-player': '单机',
};

const TAG_ORDER: GameTag[] = ['single-player', 'casual', 'competitive', 'combat', 'progression', 'strategy'];

const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'hotness', label: '热度' },
  { id: 'online', label: '在线' },
  { id: 'name', label: '名称' },
];

const PULSE_POLL_INTERVAL_MS = 20_000;

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
  const [authOpen, setAuthOpen] = useState(false);

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
  return (
    <>
      <LobbyScreen
        api={api}
        data={data}
        error={error}
        onError={setError}
        onRequestAuth={() => {
          setError(null);
          setAuthOpen(true);
        }}
        onLogout={async () => {
          await api.logout();
          setData((current) => current ? { ...current, session: null, wallet: null } : current);
        }}
      />
      {authOpen && !data.session && (
      <AuthScreen
        api={api}
        providers={data.providers}
        games={data.games}
        error={error}
        onClose={() => {
          setAuthOpen(false);
          setError(null);
        }}
        onAuthenticated={(session) => {
          setData((current) => current ? { ...current, session } : current);
          setAuthOpen(false);
          void refresh();
        }}
        onError={setError}
      />
      )}
    </>
  );
}

function AuthScreen(props: {
  api: PlatformApiClient;
  providers: AuthProviderDescriptor[];
  games: GameManifest[];
  error: string | null;
  onClose: () => void;
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
  const title = useScramble(localEnabled && mode === 'register' ? '注册游戏大厅' : '登录游戏大厅');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') props.onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [props.onClose]);

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
    <main className="auth-screen auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <BackgroundFx />
      <div className="auth-media" aria-hidden="true">
        {props.games.slice(0, 2).map((game) => <img key={game.id} src={game.coverUrl} alt="" />)}
      </div>
      <section className="auth-panel" aria-labelledby="auth-title">
        <button className="auth-close" type="button" aria-label="关闭账号面板" title="关闭" onClick={props.onClose}><X /></button>
        <div className="brand-block">
          <span className="brand-mark"><Gamepad2 /></span>
          <div><strong>Yuo戏大厅</strong><small>统一游戏大厅</small></div>
        </div>
        <header>
          <span>{localEnabled ? mode === 'login' ? '欢迎回来' : '建立平台账号' : '连接平台账号'}</span>
          <h1 id="auth-title">{title}</h1>
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
  data: AppData;
  error: string | null;
  onError: (message: string | null) => void;
  onRequestAuth: () => void;
  onLogout: () => Promise<void>;
}) {
  const [launching, setLaunching] = useState<string | null>(null);
  const account = props.data.session?.account ?? null;
  const wallet = props.data.wallet;
  const balance = useCountUp(wallet?.balance ?? 0);
  const heading = useScramble('全部游戏');

  const [pulse, setPulse] = useState<GamePulseView[] | null>(null);
  const [activeTag, setActiveTag] = useState<TagFilter>('all');
  const [sortBy, setSortBy] = useState<SortMode>('hotness');

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      props.api.getGamePulse()
        .then((data) => { if (!cancelled) setPulse(data); })
        .catch(() => { /* 统计拉取失败不影响大厅主流程,下一周期重试 */ });
    };
    load();
    const timer = setInterval(load, PULSE_POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(timer); };
  }, [props.api]);

  const pulseById = useMemo(() => new Map((pulse ?? []).map((entry) => [entry.gameId, entry])), [pulse]);

  const availableTags = useMemo(() => {
    const present = new Set<GameTag>();
    props.data.games.forEach((game) => game.tags.forEach((tag) => present.add(tag)));
    return TAG_ORDER.filter((tag) => present.has(tag));
  }, [props.data.games]);

  const visibleGames = useMemo(() => {
    const filtered = activeTag === 'all'
      ? props.data.games
      : props.data.games.filter((game) => game.tags.includes(activeTag));
    return [...filtered].sort((left, right) => {
      if (sortBy === 'name') return left.name.localeCompare(right.name, 'zh-CN');
      const leftPulse = pulseById.get(left.id);
      const rightPulse = pulseById.get(right.id);
      const diff = sortBy === 'online'
        ? (rightPulse?.onlineNow ?? 0) - (leftPulse?.onlineNow ?? 0)
        : (rightPulse?.hotness ?? 0) - (leftPulse?.hotness ?? 0);
      return diff !== 0 ? diff : left.sortOrder - right.sortOrder;
    });
  }, [props.data.games, activeTag, sortBy, pulseById]);

  const launch = async (game: GameManifest) => {
    if (game.status !== 'online' || launching) return;
    if (game.access === 'account' && !account) {
      props.onRequestAuth();
      return;
    }
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
      <BackgroundFx />
      <header className="lobby-topbar">
        <div className="brand-block compact">
          <span className="brand-mark"><Gamepad2 /></span>
          <div><strong>Yuo戏大厅</strong><small>游戏大厅</small></div>
        </div>
        <nav aria-label="大厅导航"><button className="is-active"><Gamepad2 />游戏</button><button><History />动态</button></nav>
        <div className="account-strip">
          <span className="sys-readout" aria-hidden="true"><i />LOBBY // ONLINE</span>
          {account ? (
            <>
              <div className="points-pill"><Coins /><span>通用积分</span><strong>{balance}</strong></div>
              <div className="avatar">{Array.from(account.displayName)[0]?.toUpperCase()}</div>
              <div className="account-name"><strong>{account.displayName}</strong><span>@{account.username}</span></div>
              <button className="icon-command" type="button" aria-label="退出登录" title="退出登录" onClick={() => void props.onLogout()}><LogOut /></button>
            </>
          ) : (
            <>
              <div className="avatar guest-avatar"><UserRound /></div>
              <div className="account-name"><strong>游客</strong><span>单机直玩</span></div>
              <button className="session-command" type="button" onClick={props.onRequestAuth}><LogIn /><span>登录</span></button>
            </>
          )}
        </div>
      </header>

      <main className="lobby-workspace">
        <section className="library-pane">
          <header className="section-heading">
            <div><span>GAME LIBRARY</span><h1>{heading}</h1></div>
            <p><span className="live-dot" />{props.data.games.filter((game) => game.status === 'online').length} 款可用</p>
          </header>
          <div className="library-toolbar">
            <div className="filter-chips" role="group" aria-label="按类型筛选">
              <button type="button" className={activeTag === 'all' ? 'is-active' : ''} onClick={() => setActiveTag('all')}>全部</button>
              {availableTags.map((tag) => (
                <button key={tag} type="button" className={activeTag === tag ? 'is-active' : ''} onClick={() => setActiveTag(tag)}>{TAG_LABELS[tag]}</button>
              ))}
            </div>
            <div className="sort-switch" role="group" aria-label="排序方式">
              {SORT_OPTIONS.map((option) => (
                <button key={option.id} type="button" className={sortBy === option.id ? 'is-active' : ''} onClick={() => setSortBy(option.id)}>{option.label}</button>
              ))}
            </div>
          </div>
          {props.error && <div className="inline-error" role="alert">{props.error}</div>}
          {visibleGames.length === 0 && <div className="empty-filter">该类型下暂无游戏</div>}
          <div className="game-grid">
            {visibleGames.map((game) => {
              const gamePulse = pulseById.get(game.id);
              return (
                <article className="game-card" key={game.id} onMouseMove={handleCardTilt} onMouseLeave={resetCardTilt}>
                  <div className="game-cover"><img src={game.coverUrl} alt={`${game.name} 游戏画面`} /><span className="cover-scan" /><span className={`status status-${game.status}`}>{statusLabel(game.status)}</span></div>
                  <div className="game-info">
                    <div>
                      <div className="game-title-row">
                        <h2>{game.name}</h2>
                        <span className="hot-readout" title="由启动次数、累计在线时长与当前在线加权得出">HOT {String(gamePulse?.hotness ?? 0).padStart(3, '0')}</span>
                      </div>
                      <p>{game.shortDescription}</p>
                    </div>
                    <div className={`online-row${gamePulse && gamePulse.onlineNow > 0 ? ' is-live' : ''}`}>
                      {gamePulse && gamePulse.onlineNow > 0 ? (
                        <>
                          <span className="online-avatars">
                            {gamePulse.onlinePlayers.slice(0, 5).map((player) => (
                              <i key={player.accountId} title={`${player.displayName} @${player.username}`}>{Array.from(player.displayName)[0]?.toUpperCase()}</i>
                            ))}
                          </span>
                          <span className="online-count">{gamePulse.onlineNow} 人在玩</span>
                        </>
                      ) : (
                        <span className="online-count is-empty">{pulse === null ? '数据同步中' : '暂无在线'}</span>
                      )}
                    </div>
                    <div className="capability-row">
                      {game.tags.includes('single-player') && <span><Monitor />单机</span>}
                      {game.capabilities.realtime && <span><Users />联机</span>}
                      {game.capabilities.persistentState && (
                        <span>{game.tags.includes('single-player') ? <HardDrive /> : <RefreshCw />}{game.tags.includes('single-player') ? '本地存档' : '持续世界'}</span>
                      )}
                      <span>{game.access === 'guest' ? <Sparkles /> : <ShieldCheck />}{game.access === 'guest' ? '免登录' : '平台账号'}</span>
                    </div>
                    <button type="button" className="play-command" disabled={game.status !== 'online' || launching !== null} onClick={() => void launch(game)}>
                      <Play />
                      <span>{launching === game.id ? '正在启动' : game.status !== 'online' ? statusLabel(game.status) : game.access === 'account' && !account ? '登录后游玩' : '开始游戏'}</span>
                      <ArrowRight className="play-arrow" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <aside className="account-pane">
          {account ? (
            <>
              <section className="profile-summary">
                <div className="large-avatar">{Array.from(account.displayName)[0]?.toUpperCase()}</div>
                <div><span>PLAYER PROFILE</span><strong>{account.displayName}</strong><small>@{account.username}</small></div>
              </section>
              <section className="wallet-panel">
                <header><div><WalletCards /><span>通用积分</span></div><small>POINT</small></header>
                <strong>{balance}</strong>
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
            </>
          ) : (
            <section className="guest-panel">
              <span className="guest-panel-icon"><UserRound /></span>
              <div><span>GUEST ACCESS</span><strong>游客模式</strong></div>
              <p>单机游戏可直接启动，账号游戏会在进入时提示登录。</p>
              <button className="primary-command" type="button" onClick={props.onRequestAuth}><LogIn /><span>登录或注册</span><ArrowRight /></button>
            </section>
          )}
        </aside>
      </main>
    </div>
  );
}

function LoadingState({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <main className="loading-screen">
      <BackgroundFx />
      <span className="loading-mark"><Gamepad2 /></span>
      <strong>{error ?? '正在连接游戏大厅'}</strong>
      {error && <button type="button" onClick={onRetry}><RefreshCw />重试</button>}
    </main>
  );
}

function BackgroundFx() {
  return (
    <div className="bg-fx" aria-hidden="true">
      <i className="fx-scan" />
      <b className="fx-corner fx-corner-tl" />
      <b className="fx-corner fx-corner-tr" />
      <b className="fx-corner fx-corner-bl" />
      <b className="fx-corner fx-corner-br" />
    </div>
  );
}

/* 鼠标驱动的卡片 3D 倾斜:把相对位置写成 CSS 变量,transform 在 CSS 侧组合 */
function handleCardTilt(event: ReactMouseEvent<HTMLElement>) {
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width - 0.5;
  const py = (event.clientY - rect.top) / rect.height - 0.5;
  el.style.setProperty('--ry', `${(px * 5).toFixed(2)}deg`);
  el.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`);
}

function resetCardTilt(event: ReactMouseEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--rx', '0deg');
  event.currentTarget.style.setProperty('--ry', '0deg');
}

/* HUD 风格的文字解码:先随机字符噪声,再逐字稳定下来 */
const SCRAMBLE_GLYPHS = '01<>/\\|+-*=#';

function useScramble(text: string): string {
  const [output, setOutput] = useState(text);

  useEffect(() => {
    let frame = 0;
    const settleFrames = text.length * 2 + 6;
    const timer = setInterval(() => {
      frame += 1;
      const settledCount = Math.floor(((frame - 4) / settleFrames) * text.length * 1.6);
      if (settledCount >= text.length) {
        setOutput(text);
        clearInterval(timer);
        return;
      }
      setOutput(
        Array.from(text)
          .map((ch, index) => (index < settledCount || ch === ' '
            ? ch
            : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)]))
          .join(''),
      );
    }, 42);
    return () => clearInterval(timer);
  }, [text]);

  return output;
}

/* 积分数字滚动:从旧值缓动到新值 */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const from = previous.current;
    previous.current = target;
    if (from === target) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
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
