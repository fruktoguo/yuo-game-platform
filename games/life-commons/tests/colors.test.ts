import { describe, expect, it } from 'vitest';
import { normalizePlayerColor, playerColorForOwner } from '../src/shared/colors';

describe('玩家颜色', () => {
  it('拒绝与深色背景过于接近的颜色', () => {
    expect(normalizePlayerColor('#071012')).toBeNull();
    expect(normalizePlayerColor('#111111')).toBeNull();
    expect(normalizePlayerColor('#58D8B4')).toBe('#58d8b4');
  });

  it('默认玩家颜色均满足对比度要求', () => {
    for (let ownerId = 1; ownerId <= 64; ownerId += 1) expect(normalizePlayerColor(playerColorForOwner(ownerId))).not.toBeNull();
  });
});
