import type { PlatformSocketData } from '@yuo-platform/server-sdk';
import type { ActionResult, UltraProfileView } from './protocol';
import type { ModuleId } from './modules';

export const P2P_PROTOCOL_VERSION = 1;
export const ROOM_MIN_PLAYERS = 1;
export const ROOM_MAX_PLAYERS = 12;

export type RoomStatus = 'waiting' | 'playing';
export type RoomModeId = 'standard';

export interface RoomConfig {
  modeId: RoomModeId;
  difficulty: number;
  maxPlayers: number;
  allowJoinInProgress: boolean;
}

export interface RoomMemberView {
  peerId: string;
  name: string;
  playerId: string;
  isHost: boolean;
  ready: boolean;
}

export interface RoomChatMessage {
  id: string;
  senderPeerId: string;
  senderName: string;
  text: string;
  sentAt: number;
}

export interface RoomClosedNotice {
  roomId: string;
  reason: string;
  returnToMenu: boolean;
}

export interface RoomSummary {
  id: string;
  code: string;
  name: string;
  hostName: string;
  isPrivate: boolean;
  status: RoomStatus;
  modeId: RoomModeId;
  difficulty: number;
  memberCount: number;
  maxPlayers: number;
  allowJoinInProgress: boolean;
}

export interface RoomView {
  id: string;
  code: string;
  name: string;
  isPrivate: boolean;
  status: RoomStatus;
  matchId: string | null;
  hostPeerId: string;
  config: RoomConfig;
  members: RoomMemberView[];
  restartVotePeerIds: string[];
  chatHistory: RoomChatMessage[];
}

export interface LobbyHelloData {
  peerId: string;
  profile: UltraProfileView;
  rooms: RoomSummary[];
  room: RoomView | null;
}

export interface RoomJoinData {
  peerId: string;
  profile: UltraProfileView;
  room: RoomView;
}

export interface RoomCreatePayload {
  name: string;
  isPrivate: boolean;
  config?: Partial<RoomConfig>;
}

export interface RoomJoinPayload {
  roomId?: string;
  code?: string;
}

export type P2PSignal =
  | { kind: 'description'; description: { type: 'offer' | 'answer'; sdp: string } }
  | { kind: 'candidate'; candidate: { candidate: string; sdpMid: string | null; sdpMLineIndex: number | null; usernameFragment?: string | null } };

export interface P2PSignalEnvelope {
  fromPeerId: string;
  signal: P2PSignal;
}

export interface RunSummaryPayload {
  score: number;
  level: number;
  survivalTime: number;
  kills: number;
  botKills: number;
  pvpKills: number;
}

/**
 * A reliable skill-hit window emitted by the host simulation. The owning
 * client turns this into a HitClaim after applying its own local hit policy.
 */
export interface SkillSpawn {
  spawnId: string;
  hitId: string;
  ownerPeerId: string;
  ownerEntityId: number;
  targetId: number;
  targetSegmentIndex: number;
  moduleId: ModuleId | null;
  amount: number;
  impactCol: number;
  impactRow: number;
  observedAt: number;
}

export interface HitClaim {
  hitId: string;
  spawnId: string;
  ownerPeerId: string;
  ownerEntityId: number;
  targetId: number;
  targetSegmentIndex: number;
  moduleId: ModuleId | null;
  amount: number;
  impactCol: number;
  impactRow: number;
  observedAt: number;
}

export interface WorldCommit {
  commitId: string;
  hitId: string;
  ownerEntityId: number;
  targetId: number;
  targetSegmentIndex: number;
  amount: number;
  beforeCount: number;
  afterCount: number;
  enemyDead: boolean;
  impactCol: number;
  impactRow: number;
  serverTime: number;
}

export interface LobbyServerToClientEvents {
  'lobby:rooms': (rooms: RoomSummary[]) => void;
  'room:updated': (room: RoomView) => void;
  'room:closed': (notice: RoomClosedNotice) => void;
  'room:started': (room: RoomView) => void;
  'p2p:signal': (envelope: P2PSignalEnvelope) => void;
  'profile:updated': (profile: UltraProfileView) => void;
  'room:chat': (message: RoomChatMessage) => void;
  'server:error': (message: string) => void;
}

export interface LobbyClientToServerEvents {
  'lobby:hello': (ack: (result: ActionResult<LobbyHelloData>) => void) => void;
  'lobby:list': (ack: (result: ActionResult<RoomSummary[]>) => void) => void;
  'room:create': (payload: RoomCreatePayload, ack: (result: ActionResult<RoomJoinData>) => void) => void;
  'room:join': (payload: RoomJoinPayload, ack: (result: ActionResult<RoomJoinData>) => void) => void;
  'room:leave': (ack: (result: ActionResult) => void) => void;
  'room:ready': (ready: boolean, ack: (result: ActionResult) => void) => void;
  'room:config': (config: Partial<RoomConfig>, ack: (result: ActionResult<RoomView>) => void) => void;
  'room:start': (ack: (result: ActionResult<RoomView>) => void) => void;
  'room:restart-vote': (ack: (result: ActionResult<RoomView>) => void) => void;
  'room:end-match': (ack: (result: ActionResult<RoomView>) => void) => void;
  'p2p:signal': (targetPeerId: string, signal: P2PSignal, ack: (result: ActionResult) => void) => void;
  'profile:record-run': (summary: RunSummaryPayload, ack: (result: ActionResult<UltraProfileView>) => void) => void;
  'room:chat': (text: string, ack: (result: ActionResult) => void) => void;
}

export interface LobbyInterServerEvents {}

export interface LobbySocketData extends PlatformSocketData {
  peerId?: string;
  roomId?: string;
}
