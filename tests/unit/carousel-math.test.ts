import { describe, it, expect } from 'vitest';
import { visibleCards, clampIndex } from '../../src/scripts/carousel-math';

describe('visibleCards', () => {
  it('shows 1 card at 720px and below', () => {
    expect(visibleCards(720)).toBe(1);
    expect(visibleCards(360)).toBe(1);
  });
  it('shows 2 cards between 721px and 1000px', () => {
    expect(visibleCards(721)).toBe(2);
    expect(visibleCards(1000)).toBe(2);
  });
  it('shows 3 cards above 1000px', () => {
    expect(visibleCards(1001)).toBe(3);
    expect(visibleCards(1920)).toBe(3);
  });
});

describe('clampIndex', () => {
  it('clamps to the last fully visible window', () => {
    expect(clampIndex(5, 5, 3)).toBe(2);
  });
  it('never goes below zero', () => {
    expect(clampIndex(-1, 5, 3)).toBe(0);
  });
  it('passes through valid indexes', () => {
    expect(clampIndex(1, 5, 3)).toBe(1);
  });
  it('handles fewer items than visible cards', () => {
    expect(clampIndex(2, 2, 3)).toBe(0);
  });
});
