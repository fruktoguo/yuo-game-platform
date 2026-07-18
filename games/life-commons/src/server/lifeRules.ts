import type { CellPatch } from '../shared/binary';

export interface EvolutionBuffers {
  nextOwners: Uint16Array;
  nextAges: Uint8Array;
  populations: Uint32Array;
  births: Uint32Array;
  elders: Uint32Array;
}

export interface EvolutionResult {
  changes: CellPatch[];
  totalPopulation: number;
}

const neighborTables = new Map<string, Uint32Array>();
const INVALID_NEIGHBOR = 0xffff_ffff;

export function evolveGeneration(
  owners: Uint16Array,
  ages: Uint8Array,
  width: number,
  height: number,
  buffers: EvolutionBuffers,
): EvolutionResult {
  const count = width * height;
  if (owners.length !== count || ages.length !== count || buffers.nextOwners.length !== count || buffers.nextAges.length !== count) {
    throw new Error('生命世界数组长度不匹配');
  }

  buffers.populations.fill(0);
  buffers.births.fill(0);
  buffers.elders.fill(0);
  const changes: CellPatch[] = [];
  const neighborTable = getNeighborTable(width, height);
  let totalPopulation = 0;

  for (let index = 0; index < count; index += 1) {
    let neighbors = 0;
    let ownerA = 0;
    let ownerB = 0;
    let ownerC = 0;
    let ageA = 0;
    let ageB = 0;
    let ageC = 0;

    const neighborOffset = index * 8;
    for (let neighbor = 0; neighbor < 8; neighbor += 1) {
      const neighborIndex = neighborTable[neighborOffset + neighbor];
      if (neighborIndex === INVALID_NEIGHBOR) continue;
      const ownerId = owners[neighborIndex];
      if (ownerId === 0) continue;
      neighbors += 1;
      if (neighbors === 1) {
        ownerA = ownerId;
        ageA = ages[neighborIndex];
      } else if (neighbors === 2) {
        ownerB = ownerId;
        ageB = ages[neighborIndex];
      } else if (neighbors === 3) {
        ownerC = ownerId;
        ageC = ages[neighborIndex];
      }
    }

    const currentOwner = owners[index];
    let nextOwner = 0;
    let nextAge = 0;
    if (currentOwner !== 0 && (neighbors === 2 || neighbors === 3)) {
      nextOwner = currentOwner;
      nextAge = Math.min(255, ages[index] + 1);
    } else if (currentOwner === 0 && neighbors === 3) {
      nextOwner = chooseBirthOwner(ownerA, ageA, ownerB, ageB, ownerC, ageC);
      nextAge = 1;
      buffers.births[nextOwner] += 1;
    }

    buffers.nextOwners[index] = nextOwner;
    buffers.nextAges[index] = nextAge;
    if (nextOwner !== 0) {
      totalPopulation += 1;
      buffers.populations[nextOwner] += 1;
      if (nextAge === 25) buffers.elders[nextOwner] += 1;
    }
    if (nextOwner !== currentOwner) changes.push({ index, ownerId: nextOwner, age: nextAge });
  }

  return { changes, totalPopulation };
}

function getNeighborTable(width: number, height: number): Uint32Array {
  const key = `${width}x${height}`;
  const cached = neighborTables.get(key);
  if (cached) return cached;
  const table = new Uint32Array(width * height * 8);
  table.fill(INVALID_NEIGHBOR);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 8;
      let slot = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighborX = x + offsetX;
          const neighborY = y + offsetY;
          if (neighborX >= 0 && neighborX < width && neighborY >= 0 && neighborY < height) {
            table[offset + slot] = neighborY * width + neighborX;
          }
          slot += 1;
        }
      }
    }
  }
  neighborTables.set(key, table);
  return table;
}

function chooseBirthOwner(ownerA: number, ageA: number, ownerB: number, ageB: number, ownerC: number, ageC: number): number {
  if (ownerA === ownerB || ownerA === ownerC) return ownerA;
  if (ownerB === ownerC) return ownerB;
  if (ageA > ageB && ageA > ageC) return ownerA;
  if (ageB > ageA && ageB > ageC) return ownerB;
  if (ageC > ageA && ageC > ageB) return ownerC;
  return Math.min(ownerA, ownerB, ownerC);
}
