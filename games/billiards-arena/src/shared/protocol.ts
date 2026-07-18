export type PlayerGroup = 'solids' | 'stripes' | null;
export type GamePhase = 'placing' | 'aiming' | 'rolling' | 'finished';
export type PlacementConstraint = 'anywhere' | 'kitchen';

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface PlayerView {
  id: string;
  name: string;
  seat: 0 | 1;
  connected: boolean;
  ready: boolean;
  group: PlayerGroup;
  remaining: number;
}

export interface BallSnapshot {
  number: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  pocketed: boolean;
}

export interface BallInHandView {
  playerId: string;
  constraint: PlacementConstraint;
  placed: boolean;
}

export interface GameSnapshot {
  sequence: number;
  serverTime: number;
  phase: GamePhase;
  turnNumber: number;
  currentPlayerId: string;
  breakerId: string;
  tableOpen: boolean;
  calledPocket: number | null;
  ballInHand: BallInHandView | null;
  balls: BallSnapshot[];
  winnerId: string | null;
  status: string;
}

export interface RoomView {
  code: string;
  createdAt: number;
  hostId: string;
  players: PlayerView[];
  spectators: number;
  phase: 'waiting' | 'playing' | 'finished';
  game: GameSnapshot | null;
  messages: ChatMessage[];
}

export interface RoomSummary {
  code: string;
  hostName: string;
  playerCount: number;
  spectators: number;
  phase: RoomView['phase'];
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string | null;
  senderName: string;
  text: string;
  sentAt: number;
  system?: boolean;
}

export interface GameEvent {
  id: string;
  type: 'collision' | 'cushion' | 'pocket' | 'shot' | 'turn' | 'win';
  at: number;
  intensity?: number;
  ball?: number;
  pocket?: number;
  message?: string;
}

export interface JoinRoomPayload {
  code: string;
  spectate?: boolean;
}

export interface ShotPayload {
  angle: number;
  power: number;
  spinX: number;
  spinY: number;
}

export interface ClientToServerEvents {
  'lobby:list': (ack: (result: ActionResult<RoomSummary[]>) => void) => void;
  'room:create': (ack: (result: ActionResult<RoomView>) => void) => void;
  'room:join': (payload: JoinRoomPayload, ack: (result: ActionResult<RoomView>) => void) => void;
  'room:leave': (ack?: (result: ActionResult) => void) => void;
  'room:ready': (ready: boolean, ack?: (result: ActionResult) => void) => void;
  'room:chat': (text: string, ack?: (result: ActionResult) => void) => void;
  'game:place-cue': (position: { x: number; z: number }, ack?: (result: ActionResult) => void) => void;
  'game:call-pocket': (pocket: number, ack?: (result: ActionResult) => void) => void;
  'game:shoot': (shot: ShotPayload, ack?: (result: ActionResult) => void) => void;
}

export interface ServerToClientEvents {
  'lobby:rooms': (rooms: RoomSummary[]) => void;
  'room:state': (room: RoomView) => void;
  'room:chat': (message: ChatMessage) => void;
  'game:snapshot': (snapshot: GameSnapshot) => void;
  'game:event': (event: GameEvent) => void;
  'server:error': (message: string) => void;
}

export interface InterServerEvents {}

export interface SocketData extends PlatformSocketData {
  accountId?: string;
  roomCode?: string;
  role?: 'player' | 'spectator';
}
import type { PlatformSocketData } from '@yuo-platform/server-sdk';
