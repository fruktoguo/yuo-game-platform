import type { PlayerGroup } from './protocol';

export interface PocketRecord {
  ball: number;
  pocket: number;
}

export interface ShotFacts {
  firstContact: number | null;
  pocketed: PocketRecord[];
  cuePocketed: boolean;
  railAfterContact: boolean;
  objectRailContacts: number[];
}

export interface RuleState {
  breakShot: boolean;
  tableOpen: boolean;
  shooterGroup: PlayerGroup;
  shooterCleared: boolean;
  calledPocket: number | null;
}

export interface RuleDecision {
  foul: boolean;
  foulReasons: string[];
  assignedGroup: PlayerGroup;
  keepTurn: boolean;
  winner: 'shooter' | 'opponent' | null;
  rerack: boolean;
  ballInHand: boolean;
  message: string;
}

export function getBallGroup(ball: number): Exclude<PlayerGroup, null> | null {
  if (ball >= 1 && ball <= 7) return 'solids';
  if (ball >= 9 && ball <= 15) return 'stripes';
  return null;
}

export function groupLabel(group: PlayerGroup): string {
  if (group === 'solids') return '全色球';
  if (group === 'stripes') return '花色球';
  return '未分组';
}

export function evaluateShot(state: RuleState, facts: ShotFacts): RuleDecision {
  const foulReasons: string[] = [];
  const objectPockets = facts.pocketed.filter((record) => record.ball !== 0 && record.ball !== 8);
  const eightPocket = facts.pocketed.find((record) => record.ball === 8);

  if (facts.cuePocketed) foulReasons.push('母球落袋');
  if (facts.firstContact === null) {
    foulReasons.push('未碰到目标球');
  } else if (!isLegalFirstContact(state, facts.firstContact)) {
    foulReasons.push('首碰球不合法');
  }

  if (facts.firstContact !== null && !facts.railAfterContact && objectPockets.length === 0 && !eightPocket) {
    foulReasons.push('碰球后没有球触库或落袋');
  }

  if (state.breakShot && objectPockets.length === 0 && !eightPocket && new Set(facts.objectRailContacts).size < 4) {
    foulReasons.push('开球未落袋且少于四颗目标球触库');
  }

  const foul = foulReasons.length > 0;

  if (eightPocket) {
    if (state.breakShot) {
      return {
        foul,
        foulReasons,
        assignedGroup: null,
        keepTurn: false,
        winner: null,
        rerack: true,
        ballInHand: foul,
        message: foul ? '8 号球开球落袋并伴随犯规，重新摆球，由对手开球' : '8 号球开球落袋，重新摆球并再次开球',
      };
    }

    const calledCorrectly = state.calledPocket !== null && state.calledPocket === eightPocket.pocket;
    const legalEight = state.shooterCleared && facts.firstContact === 8 && calledCorrectly && !foul;
    return {
      foul,
      foulReasons,
      assignedGroup: null,
      keepTurn: false,
      winner: legalEight ? 'shooter' : 'opponent',
      rerack: false,
      ballInHand: false,
      message: legalEight ? '8 号球合法落袋，赢得本局' : calledCorrectly ? '8 号球在不合法条件下落袋，输掉本局' : '8 号球未落入指定袋口，输掉本局',
    };
  }

  let assignedGroup: PlayerGroup = null;
  if (state.tableOpen && !state.breakShot && !foul) {
    assignedGroup = objectPockets.map((record) => getBallGroup(record.ball)).find((group) => group !== null) ?? null;
  }

  const effectiveGroup = state.shooterGroup ?? assignedGroup;
  const keepTurn = !foul && (state.breakShot
    ? objectPockets.length > 0
    : effectiveGroup === null
      ? objectPockets.length > 0
      : objectPockets.some((record) => getBallGroup(record.ball) === effectiveGroup));

  return {
    foul,
    foulReasons,
    assignedGroup,
    keepTurn,
    winner: null,
    rerack: false,
    ballInHand: foul,
    message: foul ? `犯规：${foulReasons.join('、')}` : keepTurn ? '合法进球，继续击球' : '未进目标球，交换球权',
  };
}

function isLegalFirstContact(state: RuleState, ball: number): boolean {
  if (ball === 0) return false;
  if (state.breakShot) return ball !== 8;
  if (state.tableOpen) return ball !== 8;
  if (state.shooterCleared) return ball === 8;
  return getBallGroup(ball) === state.shooterGroup;
}
