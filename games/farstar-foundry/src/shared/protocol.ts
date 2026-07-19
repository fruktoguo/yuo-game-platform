import type { PlatformSocketData } from '@yuo-platform/server-sdk';
import type {
  ProductionLineId,
  ProductionPriority,
  ResourceId,
  SpecializationId,
  TechnologyId,
} from './catalog';

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export type RoomPhase = 'waiting' | 'running' | 'completed';

export interface RoomMemberView {
  accountId: string;
  name: string;
  connected: boolean;
  joinedAt: number;
  lastSeenAt: number;
  contribution: number;
  specialization: SpecializationId | null;
}

export interface ActivityEntry {
  id: string;
  actorId: string | null;
  actorName: string;
  text: string;
  createdAt: number;
  kind: 'system' | 'build' | 'research' | 'milestone' | 'launch' | 'role' | 'priority';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: number;
}

export interface ObjectiveView {
  id: string;
  label: string;
  current: number;
  target: number;
  complete: boolean;
}

export interface MissionView {
  stage: number;
  title: string;
  status: string;
  objectives: ObjectiveView[];
  progress: number;
}

export interface PowerView {
  supply: number;
  demand: number;
  satisfaction: number;
}

export interface FactoryModifiersView {
  throughput: number;
  productivity: number;
  powerEfficiency: number;
}

export type ProductionLineTuple = [
  id: ProductionLineId,
  count: number,
  active: number,
  priority: ProductionPriority,
];
export type ManualGatherResourceId = Extract<ResourceId, 'ironOre' | 'copperOre' | 'coal' | 'stone'>;
export type ManualGatherJobTuple = [
  accountId: string,
  resourceId: ManualGatherResourceId,
  startedAt: number,
  completesAt: number,
];

export interface FactorySnapshot {
  sequence: number;
  serverTime: number;
  simulatedAt: number;
  phase: 'running' | 'completed';
  resources: number[];
  rates: number[];
  manualJobs: ManualGatherJobTuple[];
  lines: ProductionLineTuple[];
  technologies: TechnologyId[];
  mission: MissionView;
  power: PowerView;
  modifiers: FactoryModifiersView;
  storageCapacity: number;
  totalRuntimeSeconds: number;
  completedAt: number | null;
}

export interface FactorySync {
  sequence: number;
  serverTime: number;
  simulatedAt: number;
  resources: number[];
  rates: number[];
  manualJobs: ManualGatherJobTuple[];
  power: [supply: number, demand: number, satisfaction: number];
  totalRuntimeSeconds: number;
}

export interface RoomView {
  code: string;
  name: string;
  hostId: string;
  hasPassword: boolean;
  maxPlayers: number;
  phase: RoomPhase;
  createdAt: number;
  startedAt: number | null;
  members: RoomMemberView[];
  factory: FactorySnapshot | null;
  activity: ActivityEntry[];
  messages: ChatMessage[];
}

export interface RoomSummary {
  code: string;
  name: string;
  hostName: string;
  hasPassword: boolean;
  maxPlayers: number;
  memberCount: number;
  onlineCount: number;
  phase: RoomPhase;
  missionStage: number;
  createdAt: number;
}

export interface CreateRoomPayload {
  name: string;
  password?: string;
  maxPlayers: 2 | 4 | 6;
}

export interface JoinRoomPayload {
  code: string;
  password?: string;
}

interface FactoryCommandBase {
  requestId: string;
}

export type FactoryCommand = FactoryCommandBase & (
  | { type: 'gather'; resourceId: ManualGatherResourceId }
  | { type: 'build'; lineId: ProductionLineId; amount?: 1 | 5 | 10 }
  | { type: 'dismantle'; lineId: ProductionLineId }
  | { type: 'setActive'; lineId: ProductionLineId; active: number }
  | { type: 'setPriority'; lineId: ProductionLineId; priority: ProductionPriority }
  | { type: 'research'; technologyId: TechnologyId }
  | { type: 'assignSpecialization'; specializationId: SpecializationId }
  | { type: 'launch' }
);

export interface ClientToServerEvents {
  'lobby:list': (ack: (result: ActionResult<RoomSummary[]>) => void) => void;
  'room:create': (payload: CreateRoomPayload, ack: (result: ActionResult<RoomView>) => void) => void;
  'room:join': (payload: JoinRoomPayload, ack: (result: ActionResult<RoomView>) => void) => void;
  'room:leave': (ack?: (result: ActionResult) => void) => void;
  'room:start': (ack: (result: ActionResult<RoomView>) => void) => void;
  'room:chat': (text: string, ack?: (result: ActionResult) => void) => void;
  'factory:command': (command: FactoryCommand, ack: (result: ActionResult<{ sequence: number }>) => void) => void;
}

export interface ServerToClientEvents {
  'lobby:rooms': (rooms: RoomSummary[]) => void;
  'room:state': (room: RoomView) => void;
  'room:activity': (entry: ActivityEntry) => void;
  'room:chat': (message: ChatMessage) => void;
  'factory:snapshot': (snapshot: FactorySnapshot) => void;
  'factory:sync': (sync: FactorySync) => void;
  'server:error': (message: string) => void;
}

export interface InterServerEvents {}

export interface SocketData extends PlatformSocketData {
  accountId?: string;
  roomCode?: string;
}
