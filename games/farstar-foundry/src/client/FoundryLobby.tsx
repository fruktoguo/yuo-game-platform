import {
  ArrowRight,
  Clock3,
  Factory,
  Hash,
  KeyRound,
  LayoutGrid,
  LockKeyhole,
  Plus,
  Radio,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import type { ActionResult, CreateRoomPayload, RoomSummary, RoomView } from '../shared/protocol';
import { platformLobbyUrl } from './App';

interface FoundryLobbyProps {
  displayName: string;
  connected: boolean;
  rooms: RoomSummary[];
  error: string | null;
  onClearError: () => void;
  onCreate: (payload: CreateRoomPayload) => Promise<ActionResult<RoomView>>;
  onJoin: (code: string, password?: string) => Promise<ActionResult<RoomView>>;
}

export function FoundryLobby(props: FoundryLobbyProps) {
  const invitedCode = useMemo(() => new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? '', []);
  const [factoryName, setFactoryName] = useState(`${props.displayName}工造站`.slice(0, 24));
  const [createPassword, setCreatePassword] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<2 | 4 | 6>(4);
  const [joinCode, setJoinCode] = useState(invitedCode);
  const [joinPassword, setJoinPassword] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<ActionResult<RoomView>>) => {
    setPending(key);
    setFormError(null);
    props.onClearError();
    const result = await action();
    if (!result.ok) setFormError(result.error ?? '房间操作失败');
    setPending(null);
    return result;
  };

  const createRoom = async (event: FormEvent) => {
    event.preventDefault();
    await run('create', () => props.onCreate({ name: factoryName, password: createPassword || undefined, maxPlayers }));
  };

  const joinDirectly = async (event: FormEvent) => {
    event.preventDefault();
    await run('join', () => props.onJoin(joinCode, joinPassword));
  };

  const joinSelected = async () => {
    if (!selectedRoom) return;
    const result = await run(`room-${selectedRoom.code}`, () => props.onJoin(selectedRoom.code, joinPassword));
    if (result.ok) setSelectedRoom(null);
  };

  return (
    <div className="foundry-lobby">
      <header className="game-topbar">
        <div className="foundry-brand">
          <span className="foundry-mark"><Factory /></span>
          <div><strong>远星工造</strong><small>FARSTAR FOUNDRY</small></div>
        </div>
        <div className={`connection-state ${props.connected ? 'is-online' : ''}`}>
          <Radio />
          <span>{props.connected ? '服务器在线' : '正在重连'}</span>
        </div>
        <a className="lobby-link" href={platformLobbyUrl()}><LayoutGrid />游戏大厅</a>
      </header>

      <main className="foundry-lobby-main">
        <section className="room-browser" aria-labelledby="rooms-title">
          <header className="workspace-heading">
            <div><span>COOPERATIVE ROOMS</span><h1 id="rooms-title">协作房间</h1></div>
            <strong>{props.rooms.length}</strong>
          </header>

          <form className="quick-join" onSubmit={(event) => void joinDirectly(event)}>
            <label>
              <span>房间号</span>
              <div className="input-with-icon"><Hash /><input aria-label="房间号" value={joinCode} maxLength={6} placeholder="6 位房间号" onChange={(event) => setJoinCode(cleanCode(event.target.value))} /></div>
            </label>
            <label>
              <span>房间密码</span>
              <div className="input-with-icon"><KeyRound /><input aria-label="加入密码" type="password" value={joinPassword} maxLength={64} placeholder="无密码可留空" onChange={(event) => setJoinPassword(event.target.value)} /></div>
            </label>
            <button className="primary-button join-button" type="submit" disabled={!props.connected || pending !== null || joinCode.length !== 6}>
              {pending === 'join' ? <RefreshCw className="spin" /> : <ArrowRight />}
              加入
            </button>
          </form>

          <div className="room-table" role="list">
            {props.rooms.length === 0 ? (
              <div className="empty-room-list">
                <Factory />
                <strong>暂无协作房间</strong>
                <span>右侧创建第一座工造站。</span>
              </div>
            ) : props.rooms.map((room) => (
              <article className="room-row" role="listitem" key={room.code}>
                <div className="room-identity">
                  <strong>{room.name}</strong>
                  <span><b>{room.code}</b>{room.hasPassword && <LockKeyhole aria-label="需要密码" />}</span>
                </div>
                <div className="room-owner"><span>{room.hostName}</span><small><Clock3 />{formatRelativeTime(room.createdAt)}</small></div>
                <div className="room-capacity"><Users /><strong>{room.memberCount}/{room.maxPlayers}</strong><span>{room.onlineCount} 在线</span></div>
                <div className={`room-phase phase-${room.phase}`}><i />{phaseLabel(room.phase, room.missionStage)}</div>
                <button
                  className="row-command"
                  type="button"
                  disabled={!props.connected || pending !== null || room.phase === 'completed'}
                  onClick={() => {
                    setJoinPassword('');
                    if (room.hasPassword) setSelectedRoom(room);
                    else void run(`room-${room.code}`, () => props.onJoin(room.code));
                  }}
                >
                  {pending === `room-${room.code}` ? <RefreshCw className="spin" /> : <ArrowRight />}
                  <span>进入</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="create-room-pane" aria-labelledby="create-title">
          <header><span>NEW OPERATION</span><h2 id="create-title">建立工造站</h2></header>
          <div className="operator-line"><span>当前负责人</span><strong>{props.displayName}</strong></div>
          <form onSubmit={(event) => void createRoom(event)}>
            <label>
              <span>工厂名称</span>
              <input aria-label="工厂名称" value={factoryName} minLength={2} maxLength={24} required onChange={(event) => setFactoryName(event.target.value)} />
            </label>
            <label>
              <span>房间密码</span>
              <div className="input-with-icon"><LockKeyhole /><input aria-label="创建密码" type="password" value={createPassword} minLength={createPassword ? 4 : undefined} maxLength={64} placeholder="可选" onChange={(event) => setCreatePassword(event.target.value)} /></div>
            </label>
            <fieldset>
              <legend>协作席位</legend>
              <div className="segment-control">
                {[2, 4, 6].map((count) => (
                  <button key={count} type="button" className={maxPlayers === count ? 'is-active' : ''} onClick={() => setMaxPlayers(count as 2 | 4 | 6)}>{count} 人</button>
                ))}
              </div>
            </fieldset>
            <button className="primary-button create-button" type="submit" disabled={!props.connected || pending !== null}>
              {pending === 'create' ? <RefreshCw className="spin" /> : <Plus />}
              创建房间
            </button>
          </form>
          {(formError || props.error) && <div className="inline-error" role="alert">{formError ?? props.error}</div>}
        </aside>
      </main>

      {selectedRoom && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelectedRoom(null)}>
          <section className="password-dialog" role="dialog" aria-modal="true" aria-labelledby="password-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <span className="dialog-icon"><LockKeyhole /></span>
              <div><small>{selectedRoom.code}</small><h2 id="password-title">{selectedRoom.name}</h2></div>
              <button className="icon-button" type="button" title="关闭" aria-label="关闭密码窗口" onClick={() => setSelectedRoom(null)}><X /></button>
            </header>
            <label>
              <span>房间密码</span>
              <input autoFocus aria-label="房间密码" type="password" value={joinPassword} maxLength={64} onChange={(event) => setJoinPassword(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && joinPassword) void joinSelected(); }} />
            </label>
            {formError && <div className="inline-error" role="alert">{formError}</div>}
            <button className="primary-button" type="button" disabled={!joinPassword || pending !== null} onClick={() => void joinSelected()}>
              {pending === `room-${selectedRoom.code}` ? <RefreshCw className="spin" /> : <ArrowRight />}
              验证并进入
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

function cleanCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
}

function phaseLabel(phase: RoomSummary['phase'], missionStage: number): string {
  if (phase === 'waiting') return '等待启动';
  if (phase === 'completed') return '任务完成';
  return `阶段 ${missionStage + 1}`;
}

function formatRelativeTime(timestamp: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}
