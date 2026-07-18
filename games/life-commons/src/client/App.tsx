import {
  Activity,
  Aperture,
  BookOpen,
  Eraser,
  Eye,
  FileCode2,
  FlipHorizontal2,
  Hand,
  HandHeart,
  ListTree,
  LocateFixed,
  MessageSquare,
  MousePointer2,
  PanelRightClose,
  PanelRightOpen,
  PartyPopper,
  PenTool,
  Plus,
  RotateCw,
  Send,
  Settings,
  Sparkles,
  Trophy,
  Trash2,
  Users,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { MAX_CUSTOM_PATTERNS, MAX_ENERGY, MAX_ERASER_SIZE, SECTOR_VICTORY_COUNT } from '../shared/constants';
import { customPatternCost, PATTERNS, type LifePattern, type PatternId } from '../shared/patterns';
import {
  PING_LABELS,
  type ChatMessage,
  type PingKind,
  type WorldEvent,
  type WorldMeta,
  type WorldPlayerView,
} from '../shared/protocol';
import { PatternDesigner } from './components/PatternDesigner';
import { RleImportDialog } from './components/RleImportDialog';
import { RulesDialog } from './components/RulesDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { LifeCanvas, type LifeCanvasHandle, type ToolMode } from './game/LifeCanvas';
import { useWorldConnection } from './hooks/useWorldConnection';
import {
  createSavedPattern,
  loadCustomPatterns,
  persistCustomPatterns,
  type SavedCustomPattern,
} from './patterns/customPatterns';

type SideTab = 'ranking' | 'events' | 'chat';
const RULES_SEEN_KEY = 'life-war-rules-v3-seen';

const patternGroups = Object.values(PATTERNS).reduce<Record<string, LifePattern[]>>((groups, pattern) => {
  (groups[pattern.category] ??= []).push(pattern);
  return groups;
}, {});

export function App() {
  const connection = useWorldConnection();
  const canvasRef = useRef<LifeCanvasHandle | null>(null);
  const [tool, setTool] = useState<ToolMode>('stamp');
  const [patternId, setPatternId] = useState<PatternId>('glider');
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [brushSize, setBrushSize] = useState(1);
  const [sideTab, setSideTab] = useState<SideTab>('ranking');
  const [sideOpen, setSideOpen] = useState(() => window.innerWidth > 820);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [customPatterns, setCustomPatterns] = useState<SavedCustomPattern[]>(loadCustomPatterns);
  const [selectedCustomPatternId, setSelectedCustomPatternId] = useState<string | null>(null);
  const [designerOpen, setDesignerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingPing, setPendingPing] = useState<PingKind | null>(null);
  const selectedCustomPattern = customPatterns.find((pattern) => pattern.id === selectedCustomPatternId);
  const selectedCustomPatternData = selectedCustomPattern
    ? { name: selectedCustomPattern.name, cells: selectedCustomPattern.cells }
    : undefined;

  useEffect(() => {
    if (connection.status !== 'joined' || hasSeenRules()) return;
    setRulesOpen(true);
  }, [connection.status]);

  useEffect(() => {
    const cancelPing = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingPing(null);
    };
    window.addEventListener('keydown', cancelPing);
    return () => window.removeEventListener('keydown', cancelPing);
  }, []);

  useEffect(() => {
    if (connection.status !== 'joined') setPendingPing(null);
  }, [connection.status]);

  const closeRules = () => {
    try {
      window.localStorage.setItem(RULES_SEEN_KEY, '1');
    } catch {
      // 浏览器禁用持久化时，本次会话内仍可正常关闭。
    }
    setRulesOpen(false);
  };

  const saveCustomPattern = (pattern: Pick<SavedCustomPattern, 'name' | 'cells'>): boolean => {
    if (customPatterns.length >= MAX_CUSTOM_PATTERNS) return false;
    const saved = createSavedPattern(pattern);
    const next = [...customPatterns, saved];
    try {
      persistCustomPatterns(next);
    } catch {
      return false;
    }
    setCustomPatterns(next);
    setSelectedCustomPatternId(saved.id);
    setTool('stamp');
    return true;
  };

  const deleteCustomPattern = (id: string) => {
    const next = customPatterns.filter((pattern) => pattern.id !== id);
    try {
      persistCustomPatterns(next);
    } catch {
      return;
    }
    setCustomPatterns(next);
    if (selectedCustomPatternId === id) setSelectedCustomPatternId(null);
  };

  const place = connection.status === 'joined' ? connection.place : () => undefined;
  const selectPing = (kind: PingKind) => {
    setPendingPing((current) => current === kind ? null : kind);
  };
  const sendPingAt = (x: number, y: number) => {
    if (!pendingPing) return;
    connection.sendPing({ x, y, kind: pendingPing });
    setPendingPing(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Aperture aria-hidden="true" />
          <div>
            <strong>生命战争</strong>
            <span>LIFE WAR</span>
          </div>
        </div>
        <SeasonStatus meta={connection.meta} />
        <div className="topbar-actions">
          <button type="button" className="rules-trigger" onClick={() => setRulesOpen(true)}><BookOpen /><span>规则</span></button>
          <button type="button" className="rules-trigger" aria-label="设置" onClick={() => setSettingsOpen(true)}><Settings /><span>设置</span></button>
        </div>
        <div className="topbar-metrics" aria-label="世界状态">
          <span><Users aria-hidden="true" />{connection.meta?.online ?? 0}</span>
          <span><Sparkles aria-hidden="true" />{formatNumber(connection.meta?.population ?? 0)}</span>
          <span className={`connection-state is-${connection.status}`}>
            <i aria-hidden="true" />{connection.status === 'joined' ? '已同步' : connection.status === 'connecting' ? '连接中' : '离线'}
          </span>
        </div>
      </header>

      <main className="workspace">
        <section className="world-stage">
          <LifeCanvas
            ref={canvasRef}
            model={connection.model}
            tool={tool}
            patternId={patternId}
            customPattern={selectedCustomPatternData}
            rotation={rotation}
            flipped={flipped}
            brushSize={brushSize}
            sectorOwners={connection.meta?.sectorOwners ?? []}
            fullyOccupiedSectorOwners={connection.meta?.fullyOccupiedSectorOwners ?? []}
            selfOwnerId={connection.self?.ownerId ?? 0}
            selfColor={connection.self?.color ?? '#51d6b1'}
            signalKind={pendingPing}
            onPlace={place}
            onCursor={connection.sendCursor}
            onSignalTarget={sendPingAt}
          />

          <ChallengeBand meta={connection.meta} />
          <ToolPanel
            tool={tool}
            patternId={patternId}
            customPatterns={customPatterns}
            selectedCustomPatternId={selectedCustomPatternId}
            rotation={rotation}
            flipped={flipped}
            brushSize={brushSize}
            energy={connection.self?.energy ?? 0}
            open={toolsOpen}
            onOpenChange={setToolsOpen}
            onToolChange={setTool}
            onPatternChange={(next) => {
              setPatternId(next);
              setSelectedCustomPatternId(null);
              setTool('stamp');
              setToolsOpen(false);
            }}
            onCustomPatternChange={(id) => {
              setSelectedCustomPatternId(id);
              setTool('stamp');
              setToolsOpen(false);
            }}
            onDeleteCustomPattern={deleteCustomPattern}
            onOpenDesigner={() => {
              setDesignerOpen(true);
              setToolsOpen(false);
            }}
            onOpenImporter={() => {
              setImportOpen(true);
              setToolsOpen(false);
            }}
            onRotationChange={() => setRotation((current) => (current + 1) % 4)}
            onFlipChange={() => setFlipped((current) => !current)}
            onBrushSizeChange={setBrushSize}
          />

          <div className="view-controls" aria-label="视图控制">
            <IconButton label="放大" onClick={() => canvasRef.current?.zoomIn()}><ZoomIn /></IconButton>
            <IconButton label="缩小" onClick={() => canvasRef.current?.zoomOut()}><ZoomOut /></IconButton>
            <IconButton label="重置视野" onClick={() => canvasRef.current?.resetView()}><LocateFixed /></IconButton>
          </div>

          <div className="ping-controls" aria-label="地图标记">
            <IconButton active={pendingPing === 'look'} label="请看这里：选择位置" onClick={() => selectPing('look')}><Eye /></IconButton>
            <IconButton active={pendingPing === 'help'} label="需要协作：选择位置" onClick={() => selectPing('help')}><HandHeart /></IconButton>
            <IconButton active={pendingPing === 'celebrate'} label="欢呼：选择位置" onClick={() => selectPing('celebrate')}><PartyPopper /></IconButton>
          </div>

          {pendingPing && (
            <div className={`signal-target-mode kind-${pendingPing}`} role="status">
              <LocateFixed aria-hidden="true" />
              <span><strong>{PING_LABELS[pendingPing]}</strong><small>选择落点</small></span>
              <IconButton label="取消地图信号" onClick={() => setPendingPing(null)}><X /></IconButton>
            </div>
          )}

          <SelfHud player={connection.self} />

          <button
            type="button"
            className="mobile-panel-toggle"
            aria-label={sideOpen ? '关闭信息面板' : '打开信息面板'}
            onClick={() => setSideOpen((current) => !current)}
          >
            {sideOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </button>

          {connection.self && connection.status !== 'joined' && (
            <div className="reconnect-banner">正在重新连接公共世界…</div>
          )}
        </section>

        <SidePanel
          open={sideOpen}
          tab={sideTab}
          meta={connection.meta}
          self={connection.self}
          events={connection.events}
          messages={connection.messages}
          onTabChange={setSideTab}
          onFocus={(x, y) => canvasRef.current?.focusAt(x, y)}
          onSendChat={connection.sendChat}
        />
      </main>

      {connection.status === 'connecting' && connection.self === null && <JoinLoading />}
      {designerOpen && <PatternDesigner savedCount={customPatterns.length} onClose={() => setDesignerOpen(false)} onSave={saveCustomPattern} />}
      {importOpen && <RleImportDialog savedCount={customPatterns.length} onClose={() => setImportOpen(false)} onSave={saveCustomPattern} />}
      {connection.self && rulesOpen && <RulesDialog onClose={closeRules} />}
      {connection.self && settingsOpen && <SettingsDialog color={connection.self.color} onClose={() => setSettingsOpen(false)} onSave={connection.setColor} />}
      {connection.notice && <div className="toast" role="status">{connection.notice.text}</div>}
    </div>
  );
}

function SeasonStatus({ meta }: { meta: WorldMeta | null }) {
  const phase = meta?.season.phase ?? 'genesis';
  const phaseName = phase === 'genesis' ? '创世期' : phase === 'finale' ? '终局期' : '演化期';
  return (
    <div className="season-status">
      <span>SEASON {meta?.season.id ?? '—'}</span>
      <strong>{meta ? `${meta.season.leadingSectors} / ${meta.season.victoryAtSectors} 区域` : '— 区域'}</strong>
      <em className={`phase-${phase}`}>{phaseName}</em>
    </div>
  );
}

function ChallengeBand({ meta }: { meta: WorldMeta | null }) {
  if (!meta) return null;
  const challenge = meta.season.challenge;
  const ratio = challenge.target > 0 ? Math.min(1, challenge.progress / challenge.target) : 0;
  return (
    <div className={`challenge-band ${challenge.completed ? 'is-complete' : ''}`}>
      <div className="challenge-copy">
        <span>{challenge.completed ? '公共目标完成' : '公共目标'}</span>
        <strong>{challenge.title}</strong>
      </div>
      <div className="challenge-progress">
        <div><i style={{ width: `${ratio * 100}%` }} /></div>
        <span>{formatNumber(challenge.progress)} / {formatNumber(challenge.target)}</span>
      </div>
    </div>
  );
}

interface ToolPanelProps {
  tool: ToolMode;
  patternId: PatternId;
  customPatterns: SavedCustomPattern[];
  selectedCustomPatternId: string | null;
  rotation: number;
  flipped: boolean;
  brushSize: number;
  energy: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToolChange: (tool: ToolMode) => void;
  onPatternChange: (pattern: PatternId) => void;
  onCustomPatternChange: (id: string) => void;
  onDeleteCustomPattern: (id: string) => void;
  onOpenDesigner: () => void;
  onOpenImporter: () => void;
  onRotationChange: () => void;
  onFlipChange: () => void;
  onBrushSizeChange: (size: number) => void;
}

function ToolPanel(props: ToolPanelProps) {
  const selectedCustomPattern = props.customPatterns.find((item) => item.id === props.selectedCustomPatternId);
  const pattern: PatternPreview = selectedCustomPattern
    ? { name: selectedCustomPattern.name, cells: selectedCustomPattern.cells, cost: customPatternCost(selectedCustomPattern.cells.length) }
    : PATTERNS[props.patternId];
  return (
    <aside className={`tool-panel ${props.open ? 'is-open' : ''}`}>
      <div className="tool-mode-row" role="group" aria-label="操作模式">
        <IconButton active={props.tool === 'stamp'} label="投放细胞" onClick={() => props.onToolChange('stamp')}><MousePointer2 /></IconButton>
        <IconButton active={props.tool === 'erase'} label="清除细胞" onClick={() => props.onToolChange('erase')}><Eraser /></IconButton>
        <IconButton active={props.tool === 'pan'} label="移动视野" onClick={() => props.onToolChange('pan')}><Hand /></IconButton>
        <button type="button" className="current-pattern-button" onClick={() => props.onOpenChange(!props.open)}>
          <PatternGlyph pattern={pattern} />
          <span>{pattern.name}</span>
          <small>{pattern.cost}</small>
        </button>
      </div>

      <div className="tool-panel-content">
        <div className="tool-panel-heading">
          <span>生命图案</span>
          <strong><Zap aria-hidden="true" />{Math.floor(props.energy)}</strong>
        </div>
        <div className="energy-track"><i style={{ width: `${Math.min(100, props.energy / MAX_ENERGY * 100)}%` }} /></div>

        <div className="pattern-list">
          {Object.entries(patternGroups).map(([group, patterns]) => (
            <section key={group}>
              <h2>{group}</h2>
              <div>
                {patterns.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={props.selectedCustomPatternId === null && props.patternId === item.id && props.tool === 'stamp' ? 'is-active' : ''}
                    onClick={() => props.onPatternChange(item.id as PatternId)}
                  >
                    <PatternGlyph pattern={item} />
                    <span>{item.name}</span>
                    <small>{item.cost}</small>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <section className="custom-pattern-section">
            <h2><span>自定义</span><small>{props.customPatterns.length} / {MAX_CUSTOM_PATTERNS}</small></h2>
            <div className="custom-pattern-actions">
              <button type="button" className="design-pattern-button" onClick={props.onOpenDesigner}><PenTool /><span>设计图案</span><Plus /></button>
              <button type="button" className="import-pattern-button" onClick={props.onOpenImporter}><FileCode2 /><span>导入 RLE</span><Plus /></button>
            </div>
            {props.customPatterns.length > 0 && (
              <div className="custom-pattern-list">
                {props.customPatterns.map((item) => {
                  const preview = { name: item.name, cells: item.cells, cost: customPatternCost(item.cells.length) };
                  return (
                    <div key={item.id} className={`custom-pattern-item ${props.selectedCustomPatternId === item.id && props.tool === 'stamp' ? 'is-active' : ''}`}>
                      <button type="button" className="custom-pattern-select" onClick={() => props.onCustomPatternChange(item.id)}>
                        <PatternGlyph pattern={preview} />
                        <span>{item.name}</span>
                        <small>{preview.cost}</small>
                      </button>
                      <button type="button" className="custom-pattern-delete" aria-label={`删除${item.name}`} title="删除图案" onClick={() => props.onDeleteCustomPattern(item.id)}><Trash2 /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="transform-row">
          {props.tool === 'erase' ? (
            <label className="brush-control">
              <span>橡皮擦 <output>{props.brushSize}</output></span>
              <input type="range" aria-label="橡皮擦尺寸" min={1} max={MAX_ERASER_SIZE} step={1} value={props.brushSize} onChange={(event) => props.onBrushSizeChange(Number(event.target.value))} />
              <small>{props.brushSize * 2 - 1}×{props.brushSize * 2 - 1}</small>
            </label>
          ) : (
            <>
              <IconButton label={`旋转 ${rotationLabel(props.rotation)}`} onClick={props.onRotationChange}><RotateCw /></IconButton>
              <IconButton active={props.flipped} label="水平镜像" onClick={props.onFlipChange}><FlipHorizontal2 /></IconButton>
              <span className="pattern-cost"><Zap aria-hidden="true" />{pattern.cost}</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

type PatternPreview = Pick<LifePattern, 'name' | 'cells' | 'cost'>;

function PatternGlyph({ pattern }: { pattern: PatternPreview }) {
  const minX = Math.min(...pattern.cells.map((cell) => cell.x));
  const maxX = Math.max(...pattern.cells.map((cell) => cell.x));
  const minY = Math.min(...pattern.cells.map((cell) => cell.y));
  const maxY = Math.max(...pattern.cells.map((cell) => cell.y));
  const span = Math.max(maxX - minX + 1, maxY - minY + 1, 3);
  return (
    <i className="pattern-glyph" aria-hidden="true">
      {pattern.cells.map((cell, index) => (
        <b key={`${cell.x}:${cell.y}:${index}`} style={{
          left: `${(cell.x - minX) / span * 100}%`,
          top: `${(cell.y - minY) / span * 100}%`,
          width: `${Math.max(5, 100 / span)}%`,
          height: `${Math.max(5, 100 / span)}%`,
        }} />
      ))}
    </i>
  );
}

interface SidePanelProps {
  open: boolean;
  tab: SideTab;
  meta: WorldMeta | null;
  self: WorldPlayerView | null;
  events: WorldEvent[];
  messages: ChatMessage[];
  onTabChange: (tab: SideTab) => void;
  onFocus: (x: number, y: number) => void;
  onSendChat: (text: string, done?: (ok: boolean) => void) => void;
}

function SidePanel(props: SidePanelProps) {
  return (
    <aside className={`side-panel ${props.open ? 'is-open' : ''}`}>
      <nav className="side-tabs" aria-label="世界信息">
        <TabButton active={props.tab === 'ranking'} label="排行" onClick={() => props.onTabChange('ranking')}><Trophy /></TabButton>
        <TabButton active={props.tab === 'events'} label="动态" onClick={() => props.onTabChange('events')}><Activity /></TabButton>
        <TabButton active={props.tab === 'chat'} label="聊天" onClick={() => props.onTabChange('chat')}><MessageSquare /></TabButton>
      </nav>
      <div className="side-content">
        {props.tab === 'ranking' && <RankingPanel meta={props.meta} self={props.self} />}
        {props.tab === 'events' && <EventPanel events={props.events} onFocus={props.onFocus} />}
        {props.tab === 'chat' && <ChatPanel messages={props.messages} onSend={props.onSendChat} />}
      </div>
    </aside>
  );
}

function RankingPanel({ meta, self }: { meta: WorldMeta | null; self: WorldPlayerView | null }) {
  return (
    <div className="ranking-panel">
      <div className="panel-title"><ListTree aria-hidden="true" /><span>本赛季</span><small>积分</small></div>
      <ol className="leaderboard">
        {(meta?.leaderboard ?? []).map((player, index) => (
          <li key={player.ownerId} className={player.ownerId === self?.ownerId ? 'is-self' : ''}>
            <b>{String(index + 1).padStart(2, '0')}</b>
            <i style={{ background: player.color }} />
            <span><strong>{player.name}</strong><small>{formatNumber(player.population)} 细胞 · {player.sectors} 区域 · {player.fullyOccupiedSectors} 完全</small></span>
            <em>{formatNumber(player.score)}</em>
          </li>
        ))}
        {!meta?.leaderboard.length && <li className="empty-row">等待生命出现</li>}
      </ol>
      {!!meta?.hallOfFame.length && (
        <>
          <div className="panel-title hall-title"><Trophy aria-hidden="true" /><span>荣誉记录</span><small>历史</small></div>
          <div className="hall-list">
            {meta.hallOfFame.slice(0, 6).map((entry) => (
              <div key={`${entry.seasonId}:${entry.rank}`}>
                <i style={{ background: entry.color }} />
                <span><strong>{entry.name}</strong><small>S{entry.seasonId} · #{entry.rank}</small></span>
                <em>{formatNumber(entry.score)}</em>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EventPanel({ events, onFocus }: { events: WorldEvent[]; onFocus: (x: number, y: number) => void }) {
  return (
    <div className="event-panel">
      <div className="panel-title"><Activity aria-hidden="true" /><span>世界动态</span><small>实时</small></div>
      <div className="event-list">
        {[...events].reverse().map((event) => (
          <button
            key={event.id}
            type="button"
            disabled={event.x === undefined || event.y === undefined}
            onClick={() => event.x !== undefined && event.y !== undefined && onFocus(event.x, event.y)}
          >
            <i className={`event-icon type-${event.type}`}>{eventIcon(event.type)}</i>
            <span><strong>{event.text}</strong><small>{formatRelativeTime(event.at)}</small></span>
            {event.x !== undefined && <LocateFixed aria-hidden="true" />}
          </button>
        ))}
        {!events.length && <div className="empty-state">世界正在安静演化</div>}
      </div>
    </div>
  );
}

function ChatPanel({ messages, onSend }: { messages: ChatMessage[]; onSend: SidePanelProps['onSendChat'] }) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSend(value, (ok) => ok && setText(''));
  };
  return (
    <div className="chat-panel">
      <div className="panel-title"><MessageSquare aria-hidden="true" /><span>全服聊天</span><small>{messages.length}</small></div>
      <div ref={listRef} className="chat-list">
        {messages.map((message) => (
          <div key={message.id}>
            <span style={{ color: message.color }}>{message.senderName}</span>
            <p>{message.text}</p>
            <time>{formatClock(message.sentAt)}</time>
          </div>
        ))}
        {!messages.length && <div className="empty-state">还没有消息</div>}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input value={text} maxLength={180} placeholder="说点什么" aria-label="聊天消息" onChange={(event) => setText(event.target.value)} />
        <button type="submit" aria-label="发送消息" title="发送消息"><Send /></button>
      </form>
    </div>
  );
}

function SelfHud({ player }: { player: WorldPlayerView | null }) {
  return (
    <div className="self-hud">
      <i className="self-color" style={{ background: player?.color ?? '#63706d' }} />
      <div className="self-name"><strong>{player?.name ?? '观察者'}</strong><span><Zap aria-hidden="true" />{Math.floor(player?.energy ?? 0)}</span></div>
      <Metric label="人口" value={formatNumber(player?.population ?? 0)} />
      <Metric label="区域" value={`${player?.sectors ?? 0}/${SECTOR_VICTORY_COUNT}`} />
      <Metric label="积分" value={formatNumber(player?.score ?? 0)} accent />
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className={`self-metric ${accent ? 'is-accent' : ''}`}><span>{label}</span><strong>{value}</strong></div>;
}

function JoinLoading() {
  return <div className="join-loading"><i /><span>正在进入公共世界</span></div>;
}

function IconButton({ label, active = false, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={`icon-button ${active ? 'is-active' : ''}`} aria-label={label} aria-pressed={active || undefined} title={label} onClick={onClick}>{children}</button>;
}

function TabButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={active ? 'is-active' : ''} onClick={onClick}>{children}<span>{label}</span></button>;
}

function eventIcon(type: WorldEvent['type']) {
  if (type === 'join' || type === 'leave') return <Users />;
  if (type === 'season' || type === 'challenge') return <Trophy />;
  if (type === 'ping') return <LocateFixed />;
  if (type === 'sector') return <Aperture />;
  return <Sparkles />;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Math.round(value));
}

function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1_000));
  if (seconds < 5) return '刚刚';
  if (seconds < 60) return `${seconds} 秒前`;
  return `${Math.floor(seconds / 60)} 分钟前`;
}

function rotationLabel(rotation: number): string {
  return `${rotation * 90}°`;
}

function hasSeenRules(): boolean {
  try {
    return window.localStorage.getItem(RULES_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}
