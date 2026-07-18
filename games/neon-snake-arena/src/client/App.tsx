import { LayoutGrid, MessageSquare, Send, Trophy, Users, X } from 'lucide-react';
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { PLAYER_COLORS } from '../shared/constants';
import { MODULE_BY_ID, type ModuleId } from '../shared/modules';
import type {
  ChatMessage,
  LeaderboardEntry,
  UltraPlayerView,
  UltraSnapshot,
} from '../shared/protocol';
import { UltraAudio } from './game/UltraAudio';
import { UltraCanvas } from './game/UltraCanvas';
import { useSnakeArena } from './hooks/useSnakeArena';

type GamePhase = 'menu' | 'running' | 'paused' | 'gameover';
type NetworkTab = 'ranking' | 'chat';

interface RunResultView {
  score: number;
  level: number;
  kills: number;
  survivalTime: number;
  newBest: boolean;
}

export function App() {
  const connection = useSnakeArena();
  const audio = useMemo(() => new UltraAudio(), []);
  const [snapshot, setSnapshot] = useState<UltraSnapshot | null>(null);
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [spawning, setSpawning] = useState(false);
  const [result, setResult] = useState<RunResultView | null>(null);
  const [fontScale, setFontScale] = useState(() => loadNumber('ultra-snake-font-scale', 1, 0.5, 1.5));
  const [soundVolume, setSoundVolume] = useState(() => audio.getVolume());
  const [fontOpen, setFontOpen] = useState(false);
  const [soundOpen, setSoundOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [networkTab, setNetworkTab] = useState<NetworkTab>('ranking');
  const phaseRef = useRef(phase);
  const previousAliveRef = useRef(false);
  const lastLivePlayerRef = useRef<UltraPlayerView | null>(null);
  const bestBeforeRunRef = useRef(0);
  const deathTimerRef = useRef<number | null>(null);
  phaseRef.current = phase;

  const self = snapshot?.players.find((player) => player.entityId === connection.selfEntityId) ?? null;
  const active = phase === 'running' && Boolean(self?.alive && !self.paused && !self.choosingUpgrade);
  const fieldPopulation = (snapshot?.foods.length ?? 0) + (snapshot?.enemies.length ?? 0);
  const nextWave = snapshot?.waveCount ? snapshot.waveTimer.toFixed(1) : '--';
  const lobbyUrl = import.meta.env.VITE_PLATFORM_LOBBY_URL ?? (import.meta.env.PROD ? '/' : 'http://127.0.0.1:3100');

  useEffect(() => {
    const update = () => {
      const latest = connection.snapshots.getLatest();
      if (latest) setSnapshot((current) => current?.tick === latest.tick ? current : latest);
    };
    update();
    const timer = window.setInterval(update, 80);
    return () => window.clearInterval(timer);
  }, [connection.snapshots]);

  useEffect(() => {
    if (self?.alive) {
      lastLivePlayerRef.current = self;
      if (!previousAliveRef.current && phaseRef.current === 'menu') setPhase('running');
      previousAliveRef.current = true;
      if (self.paused && phaseRef.current === 'running') setPhase('paused');
      if (!self.paused && phaseRef.current === 'paused') setPhase('running');
      return;
    }
    if (!previousAliveRef.current) return;
    previousAliveRef.current = false;
    const finished = lastLivePlayerRef.current;
    if (!finished) return;
    setResult({
      score: Math.floor(finished.score),
      level: finished.level,
      kills: finished.kills,
      survivalTime: finished.survivalTime,
      newBest: finished.score > bestBeforeRunRef.current,
    });
    if (deathTimerRef.current !== null) window.clearTimeout(deathTimerRef.current);
    deathTimerRef.current = window.setTimeout(() => setPhase('gameover'), 330);
  }, [self]);

  useEffect(() => () => {
    if (deathTimerRef.current !== null) window.clearTimeout(deathTimerRef.current);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', fontScale.toFixed(2));
    saveNumber('ultra-snake-font-scale', fontScale);
  }, [fontScale]);

  const closeSettings = useCallback(() => {
    setFontOpen(false);
    setSoundOpen(false);
  }, []);

  useEffect(() => {
    const onDocumentClick = () => closeSettings();
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [closeSettings]);

  const startRun = useCallback(async () => {
    if (spawning || connection.status !== 'joined') return;
    audio.ensure();
    bestBeforeRunRef.current = connection.profile?.bestScore ?? 0;
    setSpawning(true);
    const response = await connection.spawn();
    setSpawning(false);
    if (!response.ok) return;
    setResult(null);
    setPhase('running');
  }, [audio, connection, spawning]);

  const restartRun = useCallback(async () => {
    audio.ensure();
    bestBeforeRunRef.current = connection.profile?.bestScore ?? 0;
    const response = self?.alive ? await connection.restart() : await connection.spawn();
    if (!response.ok) return;
    setResult(null);
    setPhase('running');
  }, [audio, connection, self?.alive]);

  const changePause = useCallback(async (paused: boolean) => {
    if (!self?.alive || self.choosingUpgrade) return;
    audio.ensure();
    const response = await connection.setPaused(paused);
    if (!response.ok) return;
    setPhase(paused ? 'paused' : 'running');
    audio.play(paused ? 'pause' : 'resume');
  }, [audio, connection, self?.alive, self?.choosingUpgrade]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      if (event.code === 'Escape' && (fontOpen || soundOpen)) {
        closeSettings();
        event.preventDefault();
        return;
      }
      if ((event.code === 'Escape' || event.code === 'KeyP') && (phaseRef.current === 'running' || phaseRef.current === 'paused')) {
        event.preventDefault();
        void changePause(phaseRef.current === 'running');
      }
      if (event.code === 'Enter' && phaseRef.current === 'menu') void startRun();
      if (event.code === 'Enter' && phaseRef.current === 'gameover') void restartRun();
    };
    const pauseWhenHidden = () => {
      if (document.hidden && phaseRef.current === 'running') void changePause(true);
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
    };
  }, [changePause, closeSettings, fontOpen, restartRun, soundOpen, startRun]);

  const chooseUpgrade = async (moduleId: ModuleId) => {
    audio.ensure();
    await connection.chooseUpgrade(moduleId);
  };

  const changeVolume = (volume: number) => {
    const normalized = Math.min(1, Math.max(0, volume));
    setSoundVolume(normalized);
    audio.setVolume(normalized);
  };

  const moduleCounts = countModules(self);
  const xpNeeded = self?.xpNeeded ?? 5;
  const onlineCount = connection.roster.filter((player) => player.connected).length;

  return (
    <main id="game-shell" aria-label="炫彩贪吃蛇 Ultra 游戏区域">
      <UltraCanvas
        snapshots={connection.snapshots}
        effects={connection.effects}
        selfEntityId={connection.selfEntityId}
        audio={audio}
        onDirection={connection.setDirection}
        active={active}
      />

      <header className="hud hud-top" aria-label="对局信息">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          <div><strong>炫彩贪吃蛇</strong><span>ULTRA</span></div>
          <span className="signature">by 四季鸽</span>
        </div>

        <div className="run-stats">
          <div className="stat"><span>存活</span><strong id="time-value">{formatTime(self?.survivalTime ?? 0)}</strong></div>
          <div className="stat"><span>击破</span><strong id="kill-value">{self?.kills ?? 0}</strong></div>
          <div className="stat stat-wave"><span>波次 / 球敌 · 下波</span><strong id="wave-value">{snapshot?.waveCount ?? 0}/{fieldPopulation} · {nextWave}</strong></div>
          <div className="stat stat-score"><span>得分</span><strong id="score-value">{Math.floor(self?.score ?? 0).toLocaleString('zh-CN')}</strong></div>
        </div>

        <div className="hud-actions">
          <div className={`setting-control ${fontOpen ? 'is-open' : ''}`}>
            <button
              id="font-button"
              className="icon-button font-icon"
              type="button"
              aria-label={`调节字体大小，当前 ${Math.round(fontScale * 100)}%`}
              title={`字体大小 ${Math.round(fontScale * 100)}%`}
              aria-expanded={fontOpen}
              onClick={(event) => {
                event.stopPropagation();
                audio.ensure();
                audio.play('ui');
                setSoundOpen(false);
                setFontOpen((open) => !open);
              }}
            ><span aria-hidden="true">Aa</span></button>
            <div id="font-popover" className="setting-popover" role="group" aria-label="字体大小" aria-hidden={!fontOpen} onClick={(event) => event.stopPropagation()}>
              <div className="setting-heading"><span>字体大小</span><output>{Math.round(fontScale * 100)}%</output></div>
              <input type="range" min="50" max="150" step="10" value={Math.round(fontScale * 100)} aria-label="字体大小百分比" onChange={(event) => setFontScale(Number(event.target.value) / 100)} />
            </div>
          </div>
          <div className={`setting-control ${soundOpen ? 'is-open' : ''}`}>
            <button
              id="sound-button"
              className={`icon-button ${soundVolume === 0 ? 'is-muted' : ''}`}
              type="button"
              aria-label={`调节声音大小，当前 ${Math.round(soundVolume * 100)}%`}
              title={`声音大小 ${Math.round(soundVolume * 100)}%`}
              aria-expanded={soundOpen}
              onClick={(event) => {
                event.stopPropagation();
                audio.ensure();
                audio.play('ui');
                setFontOpen(false);
                setSoundOpen((open) => !open);
              }}
            ><span className="sound-on" aria-hidden="true">♪</span><span className="sound-off" aria-hidden="true">×</span></button>
            <div id="sound-popover" className="setting-popover" role="group" aria-label="声音大小" aria-hidden={!soundOpen} onClick={(event) => event.stopPropagation()}>
              <div className="setting-heading"><span>声音大小</span><output>{Math.round(soundVolume * 100)}%</output></div>
              <input type="range" min="0" max="100" step="5" value={Math.round(soundVolume * 100)} aria-label="声音大小百分比" onChange={(event) => changeVolume(Number(event.target.value) / 100)} />
            </div>
          </div>
          <button className={`icon-button network-button is-${connection.status}`} type="button" aria-label="联机信息" title="联机信息" onClick={() => setNetworkOpen((open) => !open)}><Users aria-hidden="true" /><i>{onlineCount}</i></button>
          <a className="icon-button lobby-button" href={lobbyUrl} aria-label="返回游戏大厅" title="返回游戏大厅"><LayoutGrid aria-hidden="true" /></a>
          <button id="pause-button" className="icon-button pause-icon" type="button" aria-label={phase === 'paused' ? '继续' : '暂停'} title={phase === 'paused' ? '继续' : '暂停'} disabled={!self?.alive || Boolean(connection.upgradeOffer)} onClick={() => void changePause(phase !== 'paused')}><span aria-hidden="true" /></button>
        </div>
      </header>

      <aside id="module-rack" className="module-rack" aria-label="已装载身体模块">
        {[...moduleCounts].map(([moduleId, count]) => {
          const module = MODULE_BY_ID[moduleId];
          return (
            <span
              key={moduleId}
              className={`rack-module shape-${module.shape}`}
              style={{ '--module-color': module.color } as CSSProperties}
              title={`${module.name}：${module.desc}`}
              aria-label={`${module.name}，数量 ${count}`}
            ><i aria-hidden="true" />{count > 1 && <b>{count}</b>}</span>
          );
        })}
      </aside>

      <section className="hud hud-bottom" aria-label="等级与经验">
        <div className="level-badge"><span>LV.</span><strong id="level-value">{self?.level ?? 0}</strong></div>
        <div className="xp-panel">
          <div className="xp-row"><span>升级进度</span><strong><span id="xp-value">{self?.xp ?? 0}</span> / <span id="xp-needed">{xpNeeded}</span></strong></div>
          <div className="xp-track" aria-hidden="true">
            <div id="xp-fill" className="xp-fill" style={{ width: `${Math.min(100, ((self?.xp ?? 0) / xpNeeded) * 100)}%` }} />
            <div id="xp-pips" className="xp-pips" style={{ gridTemplateColumns: `repeat(${xpNeeded}, 1fr)` }}>{Array.from({ length: xpNeeded }, (_, index) => <span key={index} />)}</div>
          </div>
        </div>
      </section>

      <div id="touch-indicator" className="touch-indicator" aria-hidden="true"><span /></div>

      <section id="start-screen" className={`modal-layer start-screen ${phase === 'menu' ? 'is-visible' : ''}`} aria-labelledby="game-title">
        <div className="start-glow" aria-hidden="true" />
        <div className="start-content">
          <div className="title-kicker">TACTICAL SURVIVAL / ONLINE</div>
          <h1 id="game-title"><span>炫彩贪吃蛇</span><em>ULTRA</em></h1>
          <p>吞噬 / 构筑 / 生存 / 对抗</p>
          <button id="start-button" className="primary-button" type="button" disabled={connection.status !== 'joined' || spawning} onClick={() => void startRun()}><span aria-hidden="true">▶</span>{spawning ? '接入中' : '开始行动'}</button>
          <div className="best-line">平台最高分 <strong id="best-value">{Math.floor(connection.profile?.bestScore ?? 0).toLocaleString('zh-CN')}</strong></div>
          <div className={`online-line is-${connection.status}`}><i />{statusLabel(connection.status)} · {onlineCount} 人在线</div>
        </div>
      </section>

      <section id="pause-screen" className={`modal-layer ${phase === 'paused' ? 'is-visible' : ''}`} aria-labelledby="pause-title">
        <div className="dialog compact-dialog">
          <span className="dialog-kicker">OPERATION PAUSED</span>
          <h2 id="pause-title">行动暂停</h2>
          <div className="dialog-actions">
            <button className="primary-button" type="button" onClick={() => void changePause(false)}>继续游戏</button>
            <button className="secondary-button" type="button" onClick={() => void restartRun()}>重新开始</button>
          </div>
        </div>
      </section>

      <section id="upgrade-screen" className={`modal-layer upgrade-screen ${connection.upgradeOffer ? 'is-visible' : ''}`} aria-labelledby="upgrade-title">
        <div className="upgrade-wrap">
          <span className="dialog-kicker">MODULE ACQUISITION</span>
          <h2 id="upgrade-title">选择身体模块</h2>
          <p className="upgrade-level">等级提升至 <strong>{connection.upgradeOffer?.level ?? (self?.level ?? 0) + 1}</strong></p>
          <div className="upgrade-options">
            {connection.upgradeOffer?.options.map((moduleId) => <UpgradeCard key={moduleId} moduleId={moduleId} onChoose={chooseUpgrade} />)}
          </div>
        </div>
      </section>

      <section id="game-over-screen" className={`modal-layer ${phase === 'gameover' ? 'is-visible' : ''}`} aria-labelledby="game-over-title">
        <div className="dialog result-dialog">
          <span className="dialog-kicker">OPERATION COMPLETE</span>
          <h2 id="game-over-title">行动结束</h2>
          <div className="result-score"><span>最终得分</span><strong>{Math.floor(result?.score ?? 0).toLocaleString('zh-CN')}</strong><em className={result?.newBest ? 'is-visible' : ''}>NEW BEST</em></div>
          <div className="result-grid">
            <div><span>等级</span><strong>{result?.level ?? 0}</strong></div>
            <div><span>击破</span><strong>{result?.kills ?? 0}</strong></div>
            <div><span>存活</span><strong>{formatTime(result?.survivalTime ?? 0)}</strong></div>
          </div>
          <button id="restart-button" className="primary-button" type="button" onClick={() => void restartRun()}>再来一局</button>
        </div>
      </section>

      {networkOpen && (
        <NetworkPanel
          status={connection.status}
          onlineCount={onlineCount}
          botCount={snapshot?.enemies.length ?? 0}
          tab={networkTab}
          entries={connection.leaderboard}
          messages={connection.messages}
          selfEntityId={connection.selfEntityId}
          onTabChange={setNetworkTab}
          onClose={() => setNetworkOpen(false)}
          onSend={connection.sendChat}
        />
      )}
      {connection.status !== 'joined' && phase !== 'menu' && <div className="connection-curtain"><i /><strong>{statusLabel(connection.status)}</strong></div>}
      {connection.notice && <div className="snake-toast" role="status">{connection.notice.text}</div>}
    </main>
  );
}

function UpgradeCard({ moduleId, onChoose }: { moduleId: ModuleId; onChoose: (moduleId: ModuleId) => void }) {
  const module = MODULE_BY_ID[moduleId];
  return (
    <button className="upgrade-card" type="button" style={{ '--module-color': module.color } as CSSProperties} onClick={() => onChoose(moduleId)}>
      <div className="card-top">
        <span className={`module-swatch shape-${module.shape}`} aria-hidden="true"><i /></span>
        <div className="card-heading"><span>{module.category}型模块</span><h3>{module.name}</h3><small className="card-cooldown">冷却 · {module.cooldown}</small></div>
      </div>
      <p>{module.desc}</p>
      <span className="card-action">装载到尾部 <b aria-hidden="true">+</b></span>
    </button>
  );
}

interface NetworkPanelProps {
  status: ReturnType<typeof useSnakeArena>['status'];
  onlineCount: number;
  botCount: number;
  tab: NetworkTab;
  entries: LeaderboardEntry[];
  messages: ChatMessage[];
  selfEntityId: number | null;
  onTabChange: (tab: NetworkTab) => void;
  onClose: () => void;
  onSend: ReturnType<typeof useSnakeArena>['sendChat'];
}

function NetworkPanel({ status, onlineCount, botCount, tab, entries, messages, selfEntityId, onTabChange, onClose, onSend }: NetworkPanelProps) {
  const [message, setMessage] = useState('');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    onSend(text, (ok) => { if (ok) setMessage(''); });
  };
  return (
    <aside className="network-panel" aria-label="联机信息">
      <header>
        <div><span className={`network-dot is-${status}`} /><strong>ULTRA LINK</strong><small>{onlineCount} PLAYER · {botCount} AI</small></div>
        <button type="button" onClick={onClose} aria-label="关闭联机信息" title="关闭"><X aria-hidden="true" /></button>
      </header>
      <nav aria-label="联机信息视图">
        <button type="button" className={tab === 'ranking' ? 'is-active' : ''} onClick={() => onTabChange('ranking')} title="实时排行"><Trophy aria-hidden="true" /><span>排行</span></button>
        <button type="button" className={tab === 'chat' ? 'is-active' : ''} onClick={() => onTabChange('chat')} title="全服聊天"><MessageSquare aria-hidden="true" /><span>通讯</span></button>
      </nav>
      {tab === 'ranking' ? (
        <ol className="network-ranking">
          {entries.map((entry, index) => (
            <li key={entry.entityId} className={entry.entityId === selfEntityId ? 'is-self' : ''}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <i style={{ background: PLAYER_COLORS[entry.colorIndex % PLAYER_COLORS.length] }} />
              <span><strong>{entry.name}</strong><small>LV.{entry.level} · {entry.kills} 击破</small></span>
              <em>{entry.score}</em>
            </li>
          ))}
          {entries.length === 0 && <li className="empty-line">暂无行动单位</li>}
        </ol>
      ) : (
        <div className="network-chat">
          <div className="chat-messages">
            {messages.slice(-24).map((item) => <p key={item.id} className={item.senderEntityId === selfEntityId ? 'is-self' : ''}><strong>{item.senderName}</strong><span>{item.text}</span></p>)}
            {messages.length === 0 && <div className="empty-line">通讯频道待命</div>}
          </div>
          <form onSubmit={submit}><input value={message} maxLength={80} placeholder="输入消息" aria-label="聊天消息" onChange={(event) => setMessage(event.target.value)} /><button type="submit" aria-label="发送消息" title="发送"><Send aria-hidden="true" /></button></form>
        </div>
      )}
    </aside>
  );
}

function countModules(player: UltraPlayerView | null): Map<ModuleId, number> {
  const counts = new Map<ModuleId, number>();
  for (const segment of player?.segments ?? []) {
    if (segment.module) counts.set(segment.module, (counts.get(segment.module) ?? 0) + 1);
  }
  return counts;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function statusLabel(status: ReturnType<typeof useSnakeArena>['status']): string {
  if (status === 'joined') return '联机正常';
  if (status === 'connecting') return '正在接入';
  if (status === 'error') return '接入失败';
  return '正在重连';
}

function loadNumber(key: string, fallback: number, minimum: number, maximum: number): number {
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isFinite(value) && window.localStorage.getItem(key) !== null ? Math.min(maximum, Math.max(minimum, value)) : fallback;
  } catch {
    return fallback;
  }
}

function saveNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // 浏览器禁用存储时，设置仍在当前会话内生效。
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);
}
