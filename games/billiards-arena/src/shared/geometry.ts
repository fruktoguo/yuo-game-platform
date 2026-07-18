export const TABLE = {
  width: 2.54,
  height: 1.27,
  ballRadius: 0.028575,
  ballMass: 0.17,
  cushionThickness: 0.055,
  pocketRadius: 0.058,
  cornerPocketRadius: 0.064,
  headStringX: -0.635,
  footSpotX: 0.635,
} as const;

export const POCKETS = [
  { x: -TABLE.width / 2, z: -TABLE.height / 2, kind: 'corner' },
  { x: 0, z: -TABLE.height / 2, kind: 'side' },
  { x: TABLE.width / 2, z: -TABLE.height / 2, kind: 'corner' },
  { x: -TABLE.width / 2, z: TABLE.height / 2, kind: 'corner' },
  { x: 0, z: TABLE.height / 2, kind: 'side' },
  { x: TABLE.width / 2, z: TABLE.height / 2, kind: 'corner' },
] as const;

export const BALL_COLORS: Record<number, string> = {
  0: '#f4eee0',
  1: '#f2c94c',
  2: '#2563a8',
  3: '#be3434',
  4: '#6d479b',
  5: '#d9782d',
  6: '#26845a',
  7: '#7e2530',
  8: '#171a1b',
  9: '#f2c94c',
  10: '#2563a8',
  11: '#be3434',
  12: '#6d479b',
  13: '#d9782d',
  14: '#26845a',
  15: '#7e2530',
};

export function createRackOrder(random: () => number = Math.random): number[] {
  const solids = [1, 2, 3, 4, 5, 6, 7];
  const stripes = [9, 10, 11, 12, 13, 14, 15];
  shuffle(solids, random);
  shuffle(stripes, random);

  const rack = new Array<number>(15);
  rack[4] = 8;
  const solidCorner = random() > 0.5;
  rack[10] = solidCorner ? solids.pop()! : stripes.pop()!;
  rack[14] = solidCorner ? stripes.pop()! : solids.pop()!;

  const remaining = [...solids, ...stripes];
  shuffle(remaining, random);
  for (let index = 0; index < rack.length; index += 1) {
    if (rack[index] === undefined) rack[index] = remaining.pop()!;
  }
  return rack;
}

function shuffle<T>(items: T[], random: () => number): void {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
}
