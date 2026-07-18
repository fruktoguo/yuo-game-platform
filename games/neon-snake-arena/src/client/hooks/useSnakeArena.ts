import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { resolveGameSocketPath } from '@yuo-platform/client-sdk';
import { MAX_CHAT_HISTORY, MAX_EVENT_HISTORY } from '../../shared/constants';
import type {
  ActionResult,
  ArenaEvent,
  ArenaJoinData,
  ChatMessage,
  ClientToServerEvents,
  LeaderboardEntry,
  RosterPlayer,
  ServerToClientEvents,
  UltraProfileView,
  UpgradeOffer,
} from '../../shared/protocol';
import type { ModuleId } from '../../shared/modules';
import { decodeUltraSnapshot } from '../../shared/snapshotCodec';
import { EffectQueue } from '../game/EffectQueue';
import { SnapshotBuffer } from '../game/SnapshotBuffer';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type ArenaConnectionStatus = 'connecting' | 'joined' | 'disconnected' | 'error';

interface Notice {
  id: number;
  text: string;
}

export function useSnakeArena() {
  const snapshots = useMemo(() => new SnapshotBuffer(), []);
  const effects = useMemo(() => new EffectQueue(), []);
  const socketRef = useRef<ClientSocket | null>(null);
  const noticeIdRef = useRef(0);
  const inputSequenceRef = useRef(0);
  const desiredAngleRef = useRef(0);
  const sentAngleRef = useRef(Number.NaN);
  const lastSentAtRef = useRef(0);
  const [status, setStatus] = useState<ArenaConnectionStatus>('connecting');
  const [selfEntityId, setSelfEntityId] = useState<number | null>(null);
  const [profile, setProfile] = useState<UltraProfileView | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<ArenaEvent[]>([]);
  const [upgradeOffer, setUpgradeOffer] = useState<UpgradeOffer | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const showNotice = useCallback((text: string) => {
    const id = ++noticeIdRef.current;
    setNotice({ id, text });
    window.setTimeout(() => setNotice((current) => current?.id === id ? null : current), 2_800);
  }, []);

  useEffect(() => {
    const socket: ClientSocket = io({ path: resolveGameSocketPath(), transports: ['websocket', 'polling'], timeout: 8_000 });
    socketRef.current = socket;
    socket.on('connect', () => {
      setStatus('connecting');
      socket.emit('ultra:join', (result: ActionResult<ArenaJoinData>) => {
        if (!result.ok || !result.data) {
          setStatus('error');
          showNotice(result.error ?? '无法接入行动区域');
          return;
        }
        snapshots.clear();
        effects.clear();
        snapshots.push(result.data.snapshot);
        setSelfEntityId(result.data.selfEntityId);
        setProfile(result.data.profile);
        setRoster(result.data.roster);
        setLeaderboard(result.data.leaderboard);
        setMessages(result.data.messages);
        setEvents(result.data.events);
        setStatus('joined');
      });
    });
    socket.on('ultra:snapshot', (payload) => {
      try {
        snapshots.push(decodeUltraSnapshot(payload));
      } catch {
        showNotice('收到的世界快照无效');
      }
    });
    socket.on('ultra:effects', (incoming) => effects.push(incoming));
    socket.on('ultra:roster', setRoster);
    socket.on('ultra:leaderboard', setLeaderboard);
    socket.on('ultra:profile', setProfile);
    socket.on('ultra:upgrade', setUpgradeOffer);
    socket.on('ultra:event', (event) => setEvents((current) => appendLimited(current, event, MAX_EVENT_HISTORY)));
    socket.on('ultra:chat', (message) => setMessages((current) => appendLimited(current, message, MAX_CHAT_HISTORY)));
    socket.on('server:error', showNotice);
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => {
      setStatus('disconnected');
      showNotice('无法连接行动区域，正在重试');
    });
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [effects, showNotice, snapshots]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const socket = socketRef.current;
      if (!socket?.connected || status !== 'joined') return;
      const desired = desiredAngleRef.current;
      const difference = Math.abs(Math.atan2(Math.sin(desired - sentAngleRef.current), Math.cos(desired - sentAngleRef.current)));
      const now = performance.now();
      if (Number.isFinite(sentAngleRef.current) && difference < 0.006 && now - lastSentAtRef.current < 220) return;
      sentAngleRef.current = desired;
      lastSentAtRef.current = now;
      socket.emit('ultra:input', { sequence: ++inputSequenceRef.current, desiredAngle: desired });
    }, 34);
    return () => window.clearInterval(timer);
  }, [status]);

  const setDirection = useCallback((angle: number) => {
    if (Number.isFinite(angle)) desiredAngleRef.current = Math.atan2(Math.sin(angle), Math.cos(angle));
  }, []);

  const spawn = useCallback(() => new Promise<ActionResult>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) return resolve({ ok: false, error: '行动区域尚未连接' });
    setUpgradeOffer(null);
    socket.emit('ultra:spawn', (result) => {
      if (!result.ok) showNotice(result.error ?? '无法开始行动');
      resolve(result);
    });
  }), [showNotice]);

  const restart = useCallback(() => new Promise<ActionResult>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) return resolve({ ok: false, error: '行动区域尚未连接' });
    setUpgradeOffer(null);
    socket.emit('ultra:restart', (result) => {
      if (!result.ok) showNotice(result.error ?? '无法重新开始行动');
      resolve(result);
    });
  }), [showNotice]);

  const setPaused = useCallback((paused: boolean) => new Promise<ActionResult>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) return resolve({ ok: false, error: '行动区域尚未连接' });
    socket.emit('ultra:pause', paused, (result) => {
      if (!result.ok) showNotice(result.error ?? '无法切换暂停状态');
      resolve(result);
    });
  }), [showNotice]);

  const chooseUpgrade = useCallback((moduleId: ModuleId) => new Promise<ActionResult>((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) return resolve({ ok: false, error: '行动区域尚未连接' });
    socket.emit('ultra:upgrade', moduleId, (result) => {
      if (result.ok) setUpgradeOffer(null);
      else showNotice(result.error ?? '模块装载失败');
      resolve(result);
    });
  }), [showNotice]);

  const sendChat = useCallback((text: string, done?: (ok: boolean) => void) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      showNotice('行动区域尚未连接');
      done?.(false);
      return;
    }
    socket.emit('ultra:chat', text, (result) => {
      if (!result.ok) showNotice(result.error ?? '发送失败');
      done?.(result.ok);
    });
  }, [showNotice]);

  return {
    snapshots,
    effects,
    status,
    selfEntityId,
    profile,
    roster,
    leaderboard,
    messages,
    events,
    upgradeOffer,
    notice,
    setDirection,
    spawn,
    restart,
    setPaused,
    chooseUpgrade,
    sendChat,
  };
}

function appendLimited<T>(items: T[], item: T, maximum: number): T[] {
  const next = [...items, item];
  return next.length > maximum ? next.slice(-maximum) : next;
}
