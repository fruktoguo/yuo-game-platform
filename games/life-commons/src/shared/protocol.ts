import type { CustomPatternData, PatternId } from './patterns';
import type { PlatformSocketData } from '@yuo-platform/server-sdk';

export type SeasonPhase = 'genesis' | 'evolution' | 'finale';
export type ChallengeType = 'births' | 'elders' | 'population';

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export interface WorldPlayerView {
  ownerId: number;
  name: string;
  color: string;
  connected: boolean;
  energy: number;
  score: number;
  births: number;
  population: number;
  peakPopulation: number;
  sectors: number;
  fullyOccupiedSectors: number;
}

export interface HallOfFameEntry {
  seasonId: number;
  rank: number;
  name: string;
  color: string;
  score: number;
  births: number;
  peakPopulation: number;
}

export interface SeasonChallenge {
  type: ChallengeType;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
}

export interface SeasonView {
  id: number;
  startedAt: number;
  occupiedSectors: number;
  claimableSectors: number;
  victoryAtSectors: number;
  leadingSectors: number;
  phase: SeasonPhase;
  challenge: SeasonChallenge;
}

export interface WorldMeta {
  tick: number;
  tickRate: number;
  online: number;
  population: number;
  season: SeasonView;
  leaderboard: WorldPlayerView[];
  sectorOwners: number[];
  fullyOccupiedSectorOwners: number[];
  playerColors: PlayerColorView[];
  hallOfFame: HallOfFameEntry[];
}

export interface PlayerColorView {
  ownerId: number;
  color: string;
}

export interface ChatMessage {
  id: string;
  ownerId: number | null;
  senderName: string;
  color: string;
  text: string;
  sentAt: number;
  system?: boolean;
}

export interface WorldEvent {
  id: string;
  type: 'join' | 'leave' | 'stamp' | 'sector' | 'challenge' | 'season' | 'ping';
  text: string;
  at: number;
  ownerId?: number;
  x?: number;
  y?: number;
}

export interface CursorPayload {
  x: number;
  y: number;
  mode: 'stamp' | 'erase' | 'pan';
  patternId: PatternId;
  rotation: number;
  flipped: boolean;
  brushSize: number;
}

export interface CursorView extends CursorPayload {
  ownerId: number;
  name: string;
  color: string;
  updatedAt: number;
}

export interface JoinData {
  player: WorldPlayerView;
  snapshot: ArrayBuffer;
  meta: WorldMeta;
  messages: ChatMessage[];
  events: WorldEvent[];
  cursors: CursorView[];
}

export interface PlacementAction {
  mode: 'stamp' | 'erase';
  x: number;
  y: number;
  patternId: PatternId;
  customPattern?: CustomPatternData;
  rotation: number;
  flipped: boolean;
  brushSize: number;
}

export interface PlacementResult {
  changed: number;
  cost: number;
  energy: number;
}

export const PING_LABELS = {
  look: '请看这里',
  help: '需要协作',
  celebrate: '为你欢呼！',
} as const;

export type PingKind = keyof typeof PING_LABELS;

export interface PingPayload {
  x: number;
  y: number;
  kind: PingKind;
}

export interface ClientToServerEvents {
  'world:join': (ack: (result: ActionResult<JoinData>) => void) => void;
  'world:resync': (ack: (result: ActionResult<ArrayBuffer>) => void) => void;
  'world:place': (payload: PlacementAction, ack?: (result: ActionResult<PlacementResult>) => void) => void;
  'world:set-color': (color: string, ack?: (result: ActionResult<WorldPlayerView>) => void) => void;
  'world:cursor': (payload: CursorPayload) => void;
  'world:chat': (text: string, ack?: (result: ActionResult) => void) => void;
  'world:ping': (payload: PingPayload, ack?: (result: ActionResult) => void) => void;
}

export interface ServerToClientEvents {
  'world:snapshot': (snapshot: ArrayBuffer) => void;
  'world:patch': (patch: ArrayBuffer) => void;
  'world:meta': (meta: WorldMeta) => void;
  'world:self': (player: WorldPlayerView) => void;
  'world:cursor': (cursor: CursorView) => void;
  'world:cursor-remove': (ownerId: number) => void;
  'world:chat': (message: ChatMessage) => void;
  'world:event': (event: WorldEvent) => void;
  'server:error': (message: string) => void;
}

export interface InterServerEvents {}

export interface SocketData extends PlatformSocketData {
  accountId?: string;
  ownerId?: number;
  joined?: boolean;
}
