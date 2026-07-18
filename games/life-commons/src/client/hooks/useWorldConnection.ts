import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { resolveGameSocketPath } from '@yuo-platform/client-sdk';
import { MAX_CHAT_HISTORY, MAX_EVENT_HISTORY } from '../../shared/constants';
import type {
  ActionResult,
  ChatMessage,
  ClientToServerEvents,
  CursorPayload,
  JoinData,
  PingPayload,
  PlacementAction,
  PlacementResult,
  ServerToClientEvents,
  WorldEvent,
  WorldMeta,
  WorldPlayerView,
} from '../../shared/protocol';
import { WorldModel } from '../game/WorldModel';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type ConnectionStatus = 'idle' | 'connecting' | 'joined' | 'disconnected';

interface Notice {
  id: number;
  text: string;
}

export function useWorldConnection() {
  const model = useMemo(() => new WorldModel(), []);
  const socketRef = useRef<ClientSocket | null>(null);
  const resyncingRef = useRef(false);
  const lastCursorAtRef = useRef(0);
  const noticeIdRef = useRef(0);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [self, setSelf] = useState<WorldPlayerView | null>(null);
  const [meta, setMeta] = useState<WorldMeta | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);

  const showNotice = useCallback((text: string) => {
    const id = ++noticeIdRef.current;
    setNotice({ id, text });
    window.setTimeout(() => setNotice((current) => current?.id === id ? null : current), 2_800);
  }, []);

  const requestResync = useCallback((socket: ClientSocket) => {
    if (resyncingRef.current) return;
    resyncingRef.current = true;
    socket.emit('world:resync', (result) => {
      resyncingRef.current = false;
      if (!result.ok || !result.data) return showNotice(result.error ?? '世界同步失败');
      try {
        model.applySnapshot(result.data);
      } catch {
        showNotice('世界快照格式无效');
      }
    });
  }, [model, showNotice]);

  const installListeners = useCallback((socket: ClientSocket) => {
    socket.on('world:snapshot', (snapshot) => {
      try {
        model.applySnapshot(snapshot);
      } catch {
        requestResync(socket);
      }
    });
    socket.on('world:patch', (patch) => {
      try {
        if (model.applyPatch(patch) === 'gap') requestResync(socket);
      } catch {
        requestResync(socket);
      }
    });
    socket.on('world:meta', (nextMeta) => {
      model.setPlayerColors(nextMeta.playerColors);
      setMeta(nextMeta);
    });
    socket.on('world:self', setSelf);
    socket.on('world:cursor', (cursor) => model.setCursor(cursor));
    socket.on('world:cursor-remove', (ownerId) => model.removeCursor(ownerId));
    socket.on('world:chat', (message) => setMessages((current) => appendLimited(current, message, MAX_CHAT_HISTORY)));
    socket.on('world:event', (event) => {
      model.addMapEvent(event);
      setEvents((current) => appendLimited(current, event, MAX_EVENT_HISTORY));
    });
    socket.on('server:error', showNotice);
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.io.on('reconnect_attempt', () => setStatus('connecting'));
    socket.io.on('reconnect_failed', () => showNotice('连接中断，请刷新页面重试'));
  }, [model, requestResync, showNotice]);

  useEffect(() => {
    setStatus('connecting');
    const socket: ClientSocket = io({
      path: resolveGameSocketPath(),
      transports: ['websocket', 'polling'],
      timeout: 8_000,
    });
    socketRef.current = socket;
    installListeners(socket);

    socket.on('connect', () => {
      socket.emit('world:join', (result: ActionResult<JoinData>) => {
        if (!result.ok || !result.data) {
          setStatus('idle');
          showNotice(result.error ?? '无法加入世界');
          socket.disconnect();
          return;
        }
        try {
          model.setPlayerColors(result.data.meta.playerColors);
          model.applySnapshot(result.data.snapshot);
          model.replaceCursors(result.data.cursors);
          for (const event of result.data.events) model.addMapEvent(event);
        } catch {
          setStatus('idle');
          showNotice('世界初始数据无效');
          socket.disconnect();
          return;
        }
        setSelf(result.data.player);
        setMeta(result.data.meta);
        setMessages(result.data.messages);
        setEvents(result.data.events);
        setStatus('joined');
      });
    });
    socket.on('connect_error', () => {
      setStatus('disconnected');
      showNotice('无法连接到公共世界');
    });
    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [installListeners, model, showNotice]);

  const place = useCallback((action: PlacementAction) => {
    const socket = socketRef.current;
    if (!socket?.connected) return showNotice('当前未连接');
    socket.emit('world:place', action, (result: ActionResult<PlacementResult>) => {
      if (!result.ok) showNotice(result.error ?? '放置失败');
    });
  }, [showNotice]);

  const setColor = useCallback((color: string, done?: (ok: boolean) => void) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      showNotice('当前未连接');
      done?.(false);
      return;
    }
    socket.emit('world:set-color', color, (result) => {
      if (!result.ok || !result.data) {
        showNotice(result.error ?? '颜色修改失败');
        done?.(false);
        return;
      }
      setSelf(result.data);
      model.setPlayerColor(result.data.ownerId, result.data.color);
      done?.(true);
    });
  }, [model, showNotice]);

  const sendCursor = useCallback((payload: CursorPayload) => {
    const now = performance.now();
    if (now - lastCursorAtRef.current < 90) return;
    lastCursorAtRef.current = now;
    socketRef.current?.emit('world:cursor', payload);
  }, []);

  const sendChat = useCallback((text: string, done?: (ok: boolean) => void) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      showNotice('当前未连接');
      done?.(false);
      return;
    }
    socket.emit('world:chat', text, (result: ActionResult) => {
      if (!result.ok) showNotice(result.error ?? '发送失败');
      done?.(result.ok);
    });
  }, [showNotice]);

  const sendPing = useCallback((payload: PingPayload) => {
    const socket = socketRef.current;
    if (!socket?.connected) return showNotice('当前未连接');
    socket.emit('world:ping', payload, (result: ActionResult) => {
      if (!result.ok) showNotice(result.error ?? '标记失败');
    });
  }, [showNotice]);

  return { model, status, self, meta, messages, events, notice, place, setColor, sendCursor, sendChat, sendPing };
}

function appendLimited<T>(items: T[], item: T, limit: number): T[] {
  const next = [...items, item];
  return next.length > limit ? next.slice(next.length - limit) : next;
}
