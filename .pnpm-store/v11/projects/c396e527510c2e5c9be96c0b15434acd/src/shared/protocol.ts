import type { PlatformSocketData } from '@yuo-platform/server-sdk';
import type { ModuleId } from './modules';

export interface GridPoint {
  col: number;
  row: number;
}

export interface UltraSegment extends GridPoint {
  angle: number;
  module: ModuleId | null;
  neutral: boolean;
  timer: number;
  ready: boolean;
  cooldown: number;
  orbit: number;
  birthAge: number | null;
}

export interface GrowthView {
  color: string;
  special: boolean;
  elapsed: number;
  nodeCount: number;
}

export interface UltraPlayerView extends GridPoint {
  entityId: number;
  name: string;
  colorIndex: number;
  connected: boolean;
  alive: boolean;
  paused: boolean;
  choosingUpgrade: boolean;
  angle: number;
  desiredAngle: number;
  invulnerable: number;
  collisionCooldown: number;
  score: number;
  kills: number;
  botKills: number;
  pvpKills: number;
  survivalTime: number;
  level: number;
  xp: number;
  xpNeeded: number;
  respawnAt: number | null;
  segments: UltraSegment[];
  growth: GrowthView | null;
}

export interface UltraEnemyView extends GridPoint {
  id: number;
  angle: number;
  color: string;
  captured: number;
  segments: GridPoint[];
}

export interface UltraFoodView extends GridPoint {
  id: number;
  color: string;
  phase: number;
  special: boolean;
  isPulled: boolean;
}

export interface UltraProjectileView {
  id: number;
  col: number;
  row: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

export interface UltraProjectileState extends UltraProjectileView {
  homing: number;
  targetId: number | null;
  bounces: number;
}

export type UltraProjectileEvent =
  | { type: 'spawn' | 'update'; projectile: UltraProjectileState }
  | { type: 'destroy'; id: number; col: number; row: number };

export interface UltraHazardView {
  id: number;
  kind: 'mine' | 'gravity';
  col: number;
  row: number;
  radius: number;
  color: string;
  phase: number;
}

export interface PendingSpawnView {
  id: number;
  color: string;
  headCell: GridPoint;
  bodyCells: GridPoint[];
  timer: number;
  maxTimer: number;
}

export interface UltraSnapshot {
  tick: number;
  serverTime: number;
  gameTime: number;
  waveCount: number;
  waveTimer: number;
  threatLevel: number;
  arenaSize: number;
  players: UltraPlayerView[];
  enemies: UltraEnemyView[];
  foods: UltraFoodView[];
  projectiles: UltraProjectileView[];
  hazards: UltraHazardView[];
  pendingSpawns: PendingSpawnView[];
}

export type UltraSoundKind = 'ui' | 'start' | 'pause' | 'resume' | 'foodSpawn' | 'enemyWarning' | 'enemySpawn' | 'bounce' | 'shoot' | 'skill' | 'frost' | 'electric' | 'nova' | 'laser' | 'mine' | 'pulse' | 'regen' | 'hit' | 'kill' | 'level' | 'levelCharge' | 'select' | 'shield' | 'death' | 'eat';

export type UltraEffect =
  | { id: string; type: 'burst'; col: number; row: number; color: string; count: number; speed: number; audienceEntityId?: number }
  | { id: string; type: 'ring'; col: number; row: number; color: string; life: number; radius: number; endRadius: number; endRadiusUnit: 'pixels' | 'cells'; audienceEntityId?: number }
  | { id: string; type: 'beam' | 'lightning'; col: number; row: number; col2: number; row2: number; color: string; life: number; audienceEntityId?: number }
  | { id: string; type: 'text'; col: number; row: number; text: string; color: string; life: number; audienceEntityId?: number }
  | { id: string; type: 'sound'; kind: UltraSoundKind; detail?: number; audienceEntityId?: number }
  | { id: string; type: 'shake'; strength: number; audienceEntityId?: number }
  | { id: string; type: 'flash'; color: string; strength: number; audienceEntityId?: number };

export interface UpgradeOffer {
  level: number;
  expiresAt: number;
  options: ModuleId[];
}

export interface UltraProfileView {
  bestScore: number;
  bestLevel: number;
  bestSurvivalTime: number;
  totalKills: number;
  totalBotKills: number;
  totalPvpKills: number;
  gamesPlayed: number;
}

export interface RosterPlayer {
  entityId: number;
  name: string;
  playerId: string;
  colorIndex: number;
  connected: boolean;
  alive: boolean;
  paused: boolean;
  choosingUpgrade: boolean;
  score: number;
  kills: number;
  level: number;
  length: number;
  respawnAt: number | null;
}

export interface LeaderboardEntry {
  entityId: number;
  name: string;
  playerId: string;
  colorIndex: number;
  score: number;
  kills: number;
  level: number;
  length: number;
}

export interface ArenaJoinData {
  selfEntityId: number;
  profile: UltraProfileView;
  snapshot: UltraSnapshot;
  projectiles: UltraProjectileState[];
  roster: RosterPlayer[];
  leaderboard: LeaderboardEntry[];
  messages: ChatMessage[];
  events: ArenaEvent[];
}

export interface InputPayload {
  sequence: number;
  desiredAngle: number;
}

export interface FoodClaimPayload {
  foodIds: number[];
}

export interface FoodClaimResult {
  claimedFoodIds: number[];
}

export interface ArenaEvent {
  id: string;
  type: 'join' | 'leave' | 'bot-kill' | 'pvp-kill' | 'record';
  text: string;
  at: number;
  entityId?: number;
}

export interface ChatMessage {
  id: string;
  senderEntityId: number;
  senderName: string;
  text: string;
  sentAt: number;
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface ServerToClientEvents {
  'ultra:snapshot': (snapshot: ArrayBuffer) => void;
  'ultra:projectiles': (events: UltraProjectileEvent[]) => void;
  'ultra:effects': (effects: UltraEffect[]) => void;
  'ultra:roster': (players: RosterPlayer[]) => void;
  'ultra:leaderboard': (entries: LeaderboardEntry[]) => void;
  'ultra:event': (event: ArenaEvent) => void;
  'ultra:chat': (message: ChatMessage) => void;
  'ultra:profile': (profile: UltraProfileView) => void;
  'ultra:upgrade': (offer: UpgradeOffer | null) => void;
  'server:error': (message: string) => void;
}

export interface ClientToServerEvents {
  'ultra:join': (ack: (result: ActionResult<ArenaJoinData>) => void) => void;
  'ultra:spawn': (ack: (result: ActionResult) => void) => void;
  'ultra:restart': (ack: (result: ActionResult) => void) => void;
  'ultra:leave-run': (ack: (result: ActionResult) => void) => void;
  'ultra:autopilot': (enabled: boolean, ack: (result: ActionResult) => void) => void;
  'ultra:pause': (paused: boolean, ack: (result: ActionResult) => void) => void;
  'ultra:input': (payload: InputPayload) => void;
  'ultra:claim-food': (payload: FoodClaimPayload, ack: (result: ActionResult<FoodClaimResult>) => void) => void;
  'ultra:upgrade': (moduleId: ModuleId, ack: (result: ActionResult) => void) => void;
  'ultra:chat': (text: string, ack: (result: ActionResult) => void) => void;
}

export interface InterServerEvents {}

export interface SocketData extends PlatformSocketData {
  arenaEntityId?: number;
  joinedArena?: boolean;
}
