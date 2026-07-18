import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CircleDotDashed,
  Eye,
  Gamepad2,
  LayoutGrid,
  Plus,
  Radio,
  RefreshCw,
  UserRound,
  Users,
} from 'lucide-react';
import type { ActionResult, RoomSummary, RoomView } from '../../shared/protocol';

interface LobbyProps {
  name: string;
  connected: boolean;
  rooms: RoomSummary[];
  onCreate: () => Promise<ActionResult<RoomView>>;
  onJoin: (code: string, spectate?: boolean) => Promise<ActionResult<RoomView>>;
}

export function Lobby({ name, connected, rooms, onCreate, onJoin }: LobbyProps) {
  const invitedRoom = useMemo(() => new URLSearchParams(window.location.search).get('room') ?? '', []);
  const [roomCode, setRoomCode] = useState(invitedRoom.toUpperCase());
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: () => Promise<ActionResult<RoomView>>) => {
    setPending(true);
    setMessage(null);
    const result = await action();
    if (!result.ok) setMessage(result.error ?? '操作失败');
    setPending(false);
  };

  return (
    <main className="lobby-screen">
      <header className="lobby-header">
        <div className="brand-lockup">
          <span className="brand-mark"><CircleDotDashed size={24} /></span>
          <div>
            <strong>BREAKLINE</strong>
            <span>3D 8-BALL</span>
          </div>
        </div>
        <div className={`connection-pill ${connected ? 'is-online' : ''}`}>
          <Radio size={14} />
          {connected ? '服务器在线' : '正在连接'}
        </div>
        <a className="platform-lobby-link" href={import.meta.env.VITE_PLATFORM_LOBBY_URL ?? (import.meta.env.PROD ? '/' : 'http://127.0.0.1:3100')}><LayoutGrid size={14} />游戏大厅</a>
      </header>

      <section className="lobby-workspace">
        <div className="entry-panel">
          <div className="rack-visual" aria-hidden="true">
            {[1, 9, 2, 10, 8, 3, 11, 4, 12, 5].map((ball, index) => (
              <span key={`${ball}-${index}`} className={`rack-ball ball-${ball}`}>{ball}</span>
            ))}
          </div>
          <div className="entry-copy">
            <span className="eyebrow">实时双人球局</span>
            <h1>联机 3D 台球</h1>
            <p>标准 8 球 · 平台账号 · 支持观战</p>
          </div>

          <span className="field-label">当前球手</span>
          <div className="text-input identity-display"><UserRound size={15} /><strong>{name}</strong></div>

          <button className="primary-command" disabled={!connected || pending} onClick={() => run(onCreate)}>
            {pending ? <RefreshCw className="spin" size={19} /> : <Plus size={20} />}
            创建球局
          </button>

          <div className="join-row">
            <input
              className="text-input code-input"
              value={roomCode}
              maxLength={6}
              placeholder="房间号"
              aria-label="房间号"
              onChange={(event) => setRoomCode(event.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && roomCode.length === 6) run(() => onJoin(roomCode));
              }}
            />
            <button
              className="icon-command join-command"
              title="加入球局"
              aria-label="加入球局"
              disabled={!connected || pending || roomCode.length !== 6}
              onClick={() => run(() => onJoin(roomCode))}
            >
              <ArrowRight size={21} />
            </button>
          </div>
          {message && <p className="inline-error" role="alert">{message}</p>}
        </div>

        <div className="rooms-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">公开大厅</span>
              <h2>现有球局</h2>
            </div>
            <span className="room-total">{rooms.length}</span>
          </div>

          <div className="room-list">
            {rooms.length === 0 ? (
              <div className="empty-rooms">
                <Gamepad2 size={30} />
                <strong>还没有公开球局</strong>
                <span>创建后，第二位球手可直接入座。</span>
              </div>
            ) : rooms.map((room) => {
              const joinable = room.phase === 'waiting' && room.playerCount < 2;
              return (
                <article className="room-item" key={room.code}>
                  <div className="room-code-block">
                    <strong>{room.code}</strong>
                    <span className={`status-dot status-${room.phase}`}>
                      {room.phase === 'waiting' ? '等待中' : room.phase === 'playing' ? '进行中' : '已结束'}
                    </span>
                  </div>
                  <div className="room-host">
                    <span>{room.hostName}</span>
                    <small><Users size={13} /> {room.playerCount}/2 · {room.spectators} 观战</small>
                  </div>
                  <button
                    className={joinable ? 'small-command' : 'icon-command'}
                    title={joinable ? '加入球局' : '观战'}
                    aria-label={joinable ? `加入 ${room.code}` : `观战 ${room.code}`}
                    onClick={() => run(() => onJoin(room.code, !joinable))}
                  >
                    {joinable ? <><ArrowRight size={16} /> 入座</> : <Eye size={18} />}
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>
      <footer className="lobby-footer">WPA 8 球核心规则 · 房间空置后自动回收</footer>
    </main>
  );
}
