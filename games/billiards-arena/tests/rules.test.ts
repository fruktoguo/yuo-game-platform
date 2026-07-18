import { describe, expect, it } from 'vitest';
import { createRackOrder } from '../src/shared/geometry';
import { evaluateShot, getBallGroup } from '../src/shared/rules';

const baseState = {
  breakShot: false,
  tableOpen: false,
  shooterGroup: 'solids' as const,
  shooterCleared: false,
  calledPocket: null,
};

describe('标准 8 球规则', () => {
  it('合法开球未进球时交换球权且不判自由球', () => {
    const decision = evaluateShot(
      { ...baseState, breakShot: true, tableOpen: true, shooterGroup: null },
      {
        firstContact: 1,
        pocketed: [],
        cuePocketed: false,
        railAfterContact: true,
        objectRailContacts: [1, 3, 9, 12],
      },
    );
    expect(decision.foul).toBe(false);
    expect(decision.keepTurn).toBe(false);
    expect(decision.ballInHand).toBe(false);
  });

  it('开球未进球且少于四颗目标球触库时判犯规', () => {
    const decision = evaluateShot(
      { ...baseState, breakShot: true, tableOpen: true, shooterGroup: null },
      {
        firstContact: 1,
        pocketed: [],
        cuePocketed: false,
        railAfterContact: true,
        objectRailContacts: [1, 3, 9],
      },
    );
    expect(decision.foul).toBe(true);
    expect(decision.ballInHand).toBe(true);
    expect(decision.foulReasons).toContain('开球未落袋且少于四颗目标球触库');
  });

  it('开放台面首次合法落袋会按落袋顺序分组', () => {
    const decision = evaluateShot(
      { ...baseState, tableOpen: true, shooterGroup: null },
      {
        firstContact: 10,
        pocketed: [{ ball: 10, pocket: 2 }, { ball: 2, pocket: 3 }],
        cuePocketed: false,
        railAfterContact: false,
        objectRailContacts: [],
      },
    );
    expect(decision.foul).toBe(false);
    expect(decision.assignedGroup).toBe('stripes');
    expect(decision.keepTurn).toBe(true);
  });

  it('先碰对方球组时判犯规并给对手自由球', () => {
    const decision = evaluateShot(baseState, {
      firstContact: 12,
      pocketed: [],
      cuePocketed: false,
      railAfterContact: true,
      objectRailContacts: [12],
    });
    expect(decision.foul).toBe(true);
    expect(decision.ballInHand).toBe(true);
    expect(decision.foulReasons).toContain('首碰球不合法');
  });

  it('母球落袋始终判犯规', () => {
    const decision = evaluateShot(baseState, {
      firstContact: 2,
      pocketed: [{ ball: 0, pocket: 0 }, { ball: 2, pocket: 1 }],
      cuePocketed: true,
      railAfterContact: false,
      objectRailContacts: [],
    });
    expect(decision.foul).toBe(true);
    expect(decision.keepTurn).toBe(false);
    expect(decision.ballInHand).toBe(true);
  });

  it('碰球后无触库且无落袋时判犯规', () => {
    const decision = evaluateShot(baseState, {
      firstContact: 2,
      pocketed: [],
      cuePocketed: false,
      railAfterContact: false,
      objectRailContacts: [],
    });
    expect(decision.foulReasons).toContain('碰球后没有球触库或落袋');
  });

  it('清台后 8 号球进入指定袋口即获胜', () => {
    const decision = evaluateShot(
      { ...baseState, shooterCleared: true, calledPocket: 4 },
      {
        firstContact: 8,
        pocketed: [{ ball: 8, pocket: 4 }],
        cuePocketed: false,
        railAfterContact: false,
        objectRailContacts: [],
      },
    );
    expect(decision.winner).toBe('shooter');
    expect(decision.foul).toBe(false);
  });

  it('8 号球进入非指定袋口时判对手获胜', () => {
    const decision = evaluateShot(
      { ...baseState, shooterCleared: true, calledPocket: 4 },
      {
        firstContact: 8,
        pocketed: [{ ball: 8, pocket: 5 }],
        cuePocketed: false,
        railAfterContact: false,
        objectRailContacts: [],
      },
    );
    expect(decision.winner).toBe('opponent');
  });

  it('开球打进 8 号球时重新摆球', () => {
    const decision = evaluateShot(
      { ...baseState, breakShot: true, tableOpen: true, shooterGroup: null },
      {
        firstContact: 1,
        pocketed: [{ ball: 8, pocket: 1 }],
        cuePocketed: false,
        railAfterContact: false,
        objectRailContacts: [],
      },
    );
    expect(decision.rerack).toBe(true);
    expect(decision.winner).toBeNull();
  });
});

describe('摆球', () => {
  it('始终包含 1 到 15 且 8 号球在三角中心', () => {
    const rack = createRackOrder(() => 0.37);
    expect([...rack].sort((left, right) => left - right)).toEqual(Array.from({ length: 15 }, (_, index) => index + 1));
    expect(rack[4]).toBe(8);
  });

  it('底边两个角分别为全色球和花色球', () => {
    const rack = createRackOrder(() => 0.71);
    expect(new Set([getBallGroup(rack[10]), getBallGroup(rack[14])])).toEqual(new Set(['solids', 'stripes']));
  });
});
