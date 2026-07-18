import {
  ArrowLeft,
  BookOpen,
  Check,
  Circle,
  Copy,
  Crosshair,
  Eye,
  Focus,
  MessageSquare,
  RotateCcw,
  RotateCw,
  Send,
  Settings2,
  Target,
  Trophy,
  UserRound,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ActionResult,
  GameEvent,
  GameSnapshot,
  PlayerView,
  RoomView,
  ShotPayload,
} from '../../shared/protocol';
import { groupLabel } from '../../shared/rules';
import type { CameraMode, SceneInteraction } from '../game/BilliardsRenderer';
import { GameAudio } from '../game/audio';
import { GameCanvas } from './GameCanvas';
import { SpinControl } from './SpinControl';

interface GameRoomProps {
  accountId: string;
  room: RoomView;
  snapshot: GameSnapshot | null;
  events: GameEvent[];
  connected: boolean;
  onLeave: () => void;
  onReady: (ready: boolean) => Promise<ActionResult>;
  onChat: (text: string) => Promise<ActionResult>;
  onPlaceCue: (position: { x: number; z: number }) => Promise<ActionResult>;
  onCallPocket: (pocket: number) => Promise<ActionResult>;
  onShoot: (shot: ShotPayload) => Promise<ActionResult>;
}

export function GameRoom({
  accountId,
  room,
  snapshot,
  events,
  connected,
  onLeave,
  onReady,
  onChat,
  onPlaceCue,
  onCallPocket,
  onShoot,
}: GameRoomProps) {
  const localPlayer = room.players.find((player) => player.id === accountId) ?? null;
  const isPlayer = localPlayer !== null;
  const isTurn = Boolean(snapshot && snapshot.currentPlayerId === accountId);
  const canPlace = Boolean(isPlayer && isTurn && snapshot?.phase === 'placing' && snapshot.ballInHand?.playerId === accountId);
  const canAim = Boolean(isPlayer && isTurn && snapshot?.phase === 'aiming');
  const canCallPocket = Boolean(canAim && localPlayer?.group && localPlayer.remaining === 0);
  const [aimAngle, setAimAngle] = useState(0);
  const [power, setPower] = useState(0.58);
  const [spin, setSpin] = useState({ x: 0, y: 0 });
  const [cameraMode, setCameraMode] = useState<CameraMode>('overhead');
  const [activePanel, setActivePanel] = useState<'controls' | 'chat'>('controls');
  const [chatText, setChatText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showRules, setShowRules] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const lastEventIdRef = useRef<string | null>(null);
  const shootRef = useRef<() => Promise<void>>(async () => undefined);

  if (!audioRef.current) audioRef.current = new GameAudio();

  useEffect(() => {
    audioRef.current?.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    const event = events.at(-1);
    if (!event || event.id === lastEventIdRef.current) return;
    lastEventIdRef.current = event.id;
    audioRef.current?.play(event);
  }, [events]);

  useEffect(() => () => audioRef.current?.close(), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3_500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const interaction = useMemo<SceneInteraction>(() => ({
    canAim,
    canPlace,
    canCallPocket,
    aimAngle,
    power,
    calledPocket: snapshot?.calledPocket ?? null,
    cameraMode,
  }), [aimAngle, cameraMode, canAim, canCallPocket, canPlace, power, snapshot?.calledPocket]);

  const runAction = async (promise: Promise<ActionResult>) => {
    const result = await promise;
    if (!result.ok) setNotice(result.error ?? '操作失败');
    return result.ok;
  };

  const shoot = async () => {
    if (!canAim) return;
    void audioRef.current?.unlock();
    const ok = await runAction(onShoot({ angle: aimAngle, power, spinX: spin.x, spinY: spin.y }));
    if (ok) {
      setSpin({ x: 0, y: 0 });
      setPower(0.58);
    }
  };
  shootRef.current = shoot;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.repeat || !canAim || (canCallPocket && snapshot?.calledPocket === null)) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, button, [contenteditable="true"]')) return;
      event.preventDefault();
      void shootRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canAim, canCallPocket, snapshot?.calledPocket]);

  const sendMessage = async () => {
    const text = chatText.trim();
    if (!text) return;
    const ok = await runAction(onChat(text));
    if (ok) setChatText('');
  };

  const copyInvite = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', room.code);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setNotice(`房间号：${room.code}`);
    }
  };

  const leave = () => {
    if (room.phase === 'playing' && isPlayer && !window.confirm('离开进行中的球局将判负，确定离开吗？')) return;
    onLeave();
  };

  const winner = snapshot?.winnerId ? room.players.find((player) => player.id === snapshot.winnerId) : null;
  const waitingLabel = room.phase === 'finished' ? (localPlayer?.ready ? '已申请重赛' : '准备再来一局') : (localPlayer?.ready ? '取消准备' : '准备开球');

  return (
    <main className="game-screen">
      <div className="table-stage">
        <GameCanvas
          snapshot={snapshot}
          interaction={interaction}
          onAim={setAimAngle}
          onPlaceCue={(position) => void runAction(onPlaceCue(position))}
          onCallPocket={(pocket) => void runAction(onCallPocket(pocket))}
          onInteraction={() => void audioRef.current?.unlock()}
        />

        <header className="game-toolbar">
          <button className="glass-icon" title="返回大厅" aria-label="返回大厅" onClick={leave}><ArrowLeft size={20} /></button>
          <button className="room-code-button" title="复制邀请链接" onClick={copyInvite}>
            <span>ROOM</span>
            <strong>{room.code}</strong>
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <div className="toolbar-spacer" />
          {!isPlayer && <span className="spectator-badge"><Eye size={15} /> 观战</span>}
          <span className={`live-badge ${connected ? 'is-online' : ''}`}>{connected ? 'LIVE' : 'RECONNECTING'}</span>
          <button className="glass-icon" title="标准 8 球规则" aria-label="标准 8 球规则" onClick={() => setShowRules(true)}><BookOpen size={19} /></button>
          <button className="glass-icon" title={soundEnabled ? '关闭声音' : '打开声音'} aria-label={soundEnabled ? '关闭声音' : '打开声音'} onClick={() => setSoundEnabled((value) => !value)}>
            {soundEnabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
        </header>

        <div className="players-hud">
          <PlayerHud player={room.players[0]} active={snapshot?.currentPlayerId === room.players[0]?.id} side="left" />
          <div className="turn-display">
            <span>{snapshot ? `第 ${snapshot.turnNumber} 杆` : '等待双方'}</span>
            <strong>{snapshot?.status ?? '等待另一位球手入座'}</strong>
          </div>
          <PlayerHud player={room.players[1]} active={snapshot?.currentPlayerId === room.players[1]?.id} side="right" />
        </div>

        {canPlace && <div className="context-prompt"><Target size={17} /> 点击台面确认母球位置</div>}
        {canCallPocket && snapshot?.calledPocket === null && <div className="context-prompt call-prompt"><Circle size={17} /> 选择 8 号球目标袋口</div>}

        {room.phase === 'waiting' && (
          <div className="match-overlay">
            <div className="match-dialog">
              <span className="eyebrow">房间 {room.code}</span>
              <h2>{room.players.length < 2 ? '等待对手入座' : '双方确认后开球'}</h2>
              <div className="seat-list">
                {[0, 1].map((seat) => {
                  const player = room.players[seat];
                  return (
                    <div className={`seat-row ${player?.ready ? 'is-ready' : ''}`} key={seat}>
                      <span className="seat-avatar">{player ? player.name.slice(0, 1) : <UserRound size={19} />}</span>
                      <div><strong>{player?.name ?? '空席位'}</strong><small>{player ? (player.connected ? (player.ready ? '已准备' : '未准备') : '重连中') : '分享房间号邀请球手'}</small></div>
                      {player?.ready && <Check size={18} />}
                    </div>
                  );
                })}
              </div>
              {isPlayer ? (
                <button className={`primary-command ${localPlayer?.ready ? 'is-ready' : ''}`} disabled={room.players.length < 2 || !connected} onClick={() => void runAction(onReady(!localPlayer?.ready))}>
                  {localPlayer?.ready ? <><X size={19} /> 取消准备</> : <><Crosshair size={19} /> {waitingLabel}</>}
                </button>
              ) : <div className="watching-note"><Eye size={17} /> 当前以观战身份加入</div>}
            </div>
          </div>
        )}

        {room.phase === 'finished' && winner && (
          <div className="match-overlay result-overlay">
            <div className="match-dialog result-dialog">
              <span className="trophy-mark"><Trophy size={32} /></span>
              <span className="eyebrow">本局结束</span>
              <h2>{winner.name} 获胜</h2>
              <p>{snapshot?.status}</p>
              {isPlayer && (
                <button className={`primary-command ${localPlayer?.ready ? 'is-ready' : ''}`} disabled={!connected} onClick={() => void runAction(onReady(!localPlayer?.ready))}>
                  {localPlayer?.ready ? <><Check size={19} /> 已申请重赛</> : <><RotateCw size={19} /> {waitingLabel}</>}
                </button>
              )}
              <button className="secondary-command" onClick={leave}><ArrowLeft size={17} /> 返回大厅</button>
            </div>
          </div>
        )}
      </div>

      <aside className="control-dock">
        <div className="dock-tabs" role="tablist">
          <button className={activePanel === 'controls' ? 'is-active' : ''} onClick={() => setActivePanel('controls')}><Settings2 size={17} /> 击球</button>
          <button className={activePanel === 'chat' ? 'is-active' : ''} onClick={() => setActivePanel('chat')}><MessageSquare size={17} /> 房间</button>
        </div>

        {activePanel === 'controls' ? (
          <div className="controls-panel">
            <div className="camera-segment" aria-label="镜头模式">
              <button className={cameraMode === 'aim' ? 'is-active' : ''} title="跟杆镜头" aria-label="跟杆镜头" onClick={() => setCameraMode('aim')}><Focus size={18} /></button>
              <button className={cameraMode === 'overhead' ? 'is-active' : ''} title="俯视镜头" aria-label="俯视镜头" onClick={() => setCameraMode('overhead')}><Target size={18} /></button>
              <button className={cameraMode === 'cinematic' ? 'is-active' : ''} title="全景镜头" aria-label="全景镜头" onClick={() => setCameraMode('cinematic')}><Video size={18} /></button>
            </div>

            <div className="control-section">
              <div className="control-label"><span>母球击点</span><output>{describeSpin(spin.x, spin.y)}</output></div>
              <SpinControl x={spin.x} y={spin.y} disabled={!canAim} onChange={(x, y) => setSpin({ x, y })} />
            </div>

            <div className="control-section power-section">
              <div className="control-label"><span>击球力度</span><output>{Math.round(power * 100)}%</output></div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.01"
                value={power}
                disabled={!canAim}
                aria-label="击球力度"
                style={{ '--power': `${power * 100}%` } as React.CSSProperties}
                onChange={(event) => setPower(Number(event.target.value))}
              />
            </div>

            <div className="aim-fine-row">
              <button className="icon-command" title="向左微调" aria-label="向左微调" disabled={!canAim} onClick={() => setAimAngle((angle) => angle - Math.PI / 360)}><RotateCcw size={18} /></button>
              <div><span>方向</span><strong>{formatAngle(aimAngle)}</strong></div>
              <button className="icon-command" title="向右微调" aria-label="向右微调" disabled={!canAim} onClick={() => setAimAngle((angle) => angle + Math.PI / 360)}><RotateCw size={18} /></button>
            </div>

            {canCallPocket && (
              <div className="control-section pocket-section">
                <div className="control-label"><span>8 号球袋口</span><output>{snapshot?.calledPocket === null ? '未指定' : `${(snapshot?.calledPocket ?? 0) + 1} 号袋`}</output></div>
                <div className="pocket-grid">
                  {[0, 1, 2, 3, 4, 5].map((pocket) => (
                    <button
                      key={pocket}
                      className={snapshot?.calledPocket === pocket ? 'is-active' : ''}
                      title={`指定 ${pocket + 1} 号袋口`}
                      aria-label={`指定 ${pocket + 1} 号袋口`}
                      onClick={() => void runAction(onCallPocket(pocket))}
                    ><Circle size={14} /></button>
                  ))}
                </div>
              </div>
            )}

            <button className="shoot-command" aria-keyshortcuts="Space" disabled={!canAim || (canCallPocket && snapshot?.calledPocket === null)} onClick={() => void shoot()}>
              <Crosshair size={21} />
              {isPlayer ? (isTurn ? '击球' : '等待对手') : '观战中'}
            </button>
          </div>
        ) : (
          <ChatPanel room={room} accountId={accountId} text={chatText} onTextChange={setChatText} onSend={() => void sendMessage()} />
        )}
      </aside>

      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}

function PlayerHud({ player, active, side }: { player?: PlayerView; active: boolean; side: 'left' | 'right' }) {
  return (
    <div className={`player-hud player-${side} ${active ? 'is-active' : ''} ${!player?.connected ? 'is-disconnected' : ''}`}>
      <span className="player-avatar">{player?.name.slice(0, 1) ?? '?'}</span>
      <div className="player-details">
        <strong>{player?.name ?? '等待入座'}</strong>
        <span>{player ? groupLabel(player.group) : '空席位'}{player?.group ? ` · 剩 ${player.remaining} 球` : ''}</span>
      </div>
      {player?.group && <div className={`group-token group-${player.group}`}>{player.remaining}</div>}
    </div>
  );
}

function ChatPanel({ room, accountId, text, onTextChange, onSend }: { room: RoomView; accountId: string; text: string; onTextChange: (text: string) => void; onSend: () => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [room.messages]);
  return (
    <div className="chat-panel">
      <div className="room-stats"><Users size={16} /> {room.players.length} 名球手 · {room.spectators} 人观战</div>
      <div className="chat-list" ref={listRef}>
        {room.messages.map((message) => (
          <div className={`chat-message ${message.system ? 'is-system' : ''} ${message.senderId === accountId ? 'is-self' : ''}`} key={message.id}>
            <div><strong>{message.senderName}</strong><time>{new Date(message.sentAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</time></div>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <div className="chat-compose">
        <input
          value={text}
          maxLength={160}
          placeholder="发送消息"
          aria-label="聊天消息"
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSend();
          }}
        />
        <button className="icon-command" title="发送" aria-label="发送" disabled={!text.trim()} onClick={onSend}><Send size={17} /></button>
      </div>
    </div>
  );
}

function RulesDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <header><div><span className="eyebrow">WPA 核心规则</span><h2 id="rules-title">标准 8 球</h2></div><button className="icon-command" title="关闭" aria-label="关闭" onClick={onClose}><X size={19} /></button></header>
        <div className="rules-list">
          <p><strong>开球</strong><span>开球需有球落袋，或至少四颗目标球触库；8 号球开球落袋时重新摆球。</span></p>
          <p><strong>分组</strong><span>开球后保持开放台面，首次合法落袋的全色或花色决定双方球组。</span></p>
          <p><strong>合法击球</strong><span>先碰自己的球组，并在碰球后有任意球触库或落袋；犯规后对手获得全台自由球。</span></p>
          <p><strong>8 号球</strong><span>清完本组球后指定袋口。合法落入指定袋获胜；提前落袋、带母球落袋或进错袋判负。</span></p>
        </div>
      </section>
    </div>
  );
}

function describeSpin(x: number, y: number): string {
  if (Math.hypot(x, y) < 0.12) return '中心';
  const vertical = y > 0.25 ? '高杆' : y < -0.25 ? '低杆' : '';
  const horizontal = x > 0.25 ? '右塞' : x < -0.25 ? '左塞' : '';
  return `${vertical}${horizontal}` || '偏杆';
}

function formatAngle(angle: number): string {
  const degrees = ((angle * 180 / Math.PI) % 360 + 360) % 360;
  return `${degrees.toFixed(1)}°`;
}
