// (J11 light-parity C1) The pure parts of `scripts/parity-lib.mjs`, the grey-card suite's helpers: its copies of the game's
// constants equal the game's, the row windows (A6), the band check, the card picker, the KNOWN list lookups and the summary line.
import { describe, expect, it } from 'vitest';
import { DARK_TARGETS } from '../src/world/darkCurve';
// @ts-expect-error plain .mjs script without types
import * as P from '../scripts/parity-lib.mjs';

describe('parity-lib copies the game\'s constants', () => {
  it('DARK_TARGETS equals darkCurve\'s', () => {
    expect(P.DARK_TARGETS).toEqual(DARK_TARGETS.map((t) => ({ ...t })));
  });
});

describe('rowFor', () => {
  it('maps a level to its DARK_TARGETS row', () => {
    for (const l of [0.12, 0.09, 0.149]) expect(P.rowFor(l)).toBe(0.12);
    for (const l of [0.25, 0.27, 0.279]) expect(P.rowFor(l)).toBe(0.27);
    for (const l of [0.37, 0.43]) expect(P.rowFor(l)).toBe(0.4);
    for (const l of [0.67, 0.73]) expect(P.rowFor(l)).toBe(0.7);
    for (const l of [0.16, 0.249, 0.28, 0.3, 0.5, 0.9]) expect(P.rowFor(l)).toBeNull();
  });
  it('is self-contained (the suite sends its source into the page)', () => {
    const f = (0, eval)(`(${P.rowFor.toString()})`) as (l: number) => number | null;
    expect([0.12, 0.27, 0.4, 0.7, 0.5].map(f)).toEqual([0.12, 0.27, 0.4, 0.7, null]);
  });
});

describe('inBand', () => {
  it('holds both edges (a thousandth of slack) and nothing past them', () => {
    const lit = P.DARK_TARGETS[3]!;
    expect(P.inBand(0.45, lit)).toBe(true);
    expect(P.inBand(1, lit)).toBe(true);
    expect(P.inBand(0.449, lit)).toBe(true);
    expect(P.inBand(0.448, lit)).toBe(false);
    expect(P.inBand(1.0011, lit)).toBe(false);
    const dark = P.DARK_TARGETS[0]!;
    expect(P.inBand(0, dark)).toBe(true);
    expect(P.inBand(0.04, dark)).toBe(true);
    expect(P.inBand(0.0409, dark)).toBe(true);
    expect(P.inBand(0.0411, dark)).toBe(false);
  });
});

describe('pickCards', () => {
  const c = (row: number, err: number, x: number, z: number) => ({ row, err, x, z });
  it('takes the lowest-err card of each row first, in row order', () => {
    const picked = P.pickCards([c(0.7, 0.01, 0, 0), c(0.12, 0.02, 1, 0), c(0.12, 0.005, 2, 0), c(0.4, 0.03, 3, 0)], 1);
    expect(picked.map((p: { row: number; x: number }) => [p.row, p.x])).toEqual([[0.12, 2], [0.4, 3], [0.7, 0]]);
  });
  it('then fills by err up to min, a gap apart', () => {
    const cands = [c(0.12, 0.01, 0, 0), c(0.12, 0.02, 3, 0), c(0.12, 0.03, 10, 0), c(0.12, 0.04, 20, 0), c(0.12, 0.05, 30, 0)];
    const picked = P.pickCards(cands, 3);
    expect(picked.map((p: { x: number }) => p.x)).toEqual([0, 10, 20]);
    for (const a of picked) for (const b of picked) if (a !== b) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(6);
  });
  it('stops at min, and with fewer cards than min returns what there is', () => {
    const cands = Array.from({ length: 10 }, (_, i) => c(0.12, 0.001 * i, i * 10, 0));
    expect(P.pickCards(cands, 4)).toHaveLength(4);
    expect(P.pickCards([c(0.12, 0.01, 0, 0), c(0.12, 0.02, 2, 0)], 3)).toHaveLength(1);
    expect(P.pickCards([], 3)).toEqual([]);
  });
});

describe('cardId and the KNOWN list', () => {
  const card = { map: 'tallowWharf', section: 'S1', row: 0.12, x: -12.46, z: -60 };
  const entry = { map: 'tallowWharf', section: 'S1', row: 0.12, near: [-12, -60], r: 3, conf: 'T1', owner: 'lead', until: '2026-11-02' };
  const now = new Date('2026-10-30T12:00:00Z');
  it('cardId formats map:section:row:x,z to a decimal', () => {
    expect(P.cardId('tallowWharf', 'S1', 0.12, -12.46, -60)).toBe('tallowWharf:S1:0.12:-12.5,-60.0');
    expect(P.cardId('warehouse', 'all', 0.4, 3, 4.25)).toBe('warehouse:all:0.4:3.0,4.3');
  });
  it('knownFor matches inside r, same map, section and row, not past until', () => {
    expect(P.knownFor(card, [entry], now)).toBe(entry);
  });
  it('knownFor: outside r, another row, another section, another map, expired -> null', () => {
    expect(P.knownFor({ ...card, x: -8 }, [entry], now)).toBeNull();
    expect(P.knownFor({ ...card, row: 0.27 }, [entry], now)).toBeNull();
    expect(P.knownFor({ ...card, section: 'S2' }, [entry], now)).toBeNull();
    expect(P.knownFor({ ...card, map: 'ctcourse' }, [entry], now)).toBeNull();
    expect(P.knownFor(card, [entry], new Date('2026-11-03T00:00:00Z'))).toBeNull();
    expect(P.knownFor(card, [], now)).toBeNull();
  });
  it('an until date runs to the end of that day', () => {
    expect(P.knownFor(card, [entry], new Date('2026-11-02T20:00:00Z'))).toBe(entry);
  });
  it('expiredKnown lists the entries past until', () => {
    const old = { ...entry, until: '2026-10-01' };
    expect(P.expiredKnown([entry, old], now)).toEqual([old]);
    expect(P.expiredKnown([entry], now)).toEqual([]);
  });
});

describe('summaryLine and the counters', () => {
  it('is one line that parses back', () => {
    const r = P.newResults();
    P.addCard(r, 'low:a', 'ok');
    P.addCard(r, 'low:b', 'known');
    P.addCard(r, 'low:c', 'miss');
    P.addMeter(r, 'low:a', true);
    P.addMeter(r, 'low:c', false);
    r.s = 41;
    const line = P.summaryLine(2, r);
    expect(line.includes('\n')).toBe(false);
    expect(line.startsWith('PARITY-SUMMARY ')).toBe(true);
    expect(JSON.parse(line.slice('PARITY-SUMMARY '.length))).toEqual({
      part: 2,
      cards: { ok: 1, total: 3 },
      meter: { ok: 1, total: 2 },
      known: ['low:b'],
      misses: ['low:c', 'low:c:meter'],
      s: 41,
    });
  });
});
