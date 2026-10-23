import { describe, expect, it } from 'vitest';
import {
  REFUSE_SCAN_BUSY,
  REFUSE_SCAN_OTHER,
  SCANNER,
  SC_DONE,
  SC_HACKING,
  SC_IDLE,
  SC_READY,
  newScanPair,
  newScanResult,
  scanDamage,
  scanPairReady,
  scanStart,
  scanStep,
  scanWindowLeft,
  type ScanPair,
} from '../src/game/scanners';

const DT = 1 / 60;
/** Step `secs` with both players at their panels (or as given); returns the last non-'none' result kind. */
function run(s: ScanPair, secs: number, atA = true, atB = true): { kind: string; who: number; why: string } {
  const out = newScanResult();
  let last = { kind: 'none', who: -1, why: '' };
  for (let t = 0; t < secs - 1e-9; t += DT) {
    scanStep(s, DT, atA, atB, out);
    if (out.kind !== 'none') last = { kind: out.kind, who: out.who, why: out.why };
  }
  return last;
}

describe('paired scanners (B6)', () => {
  it('starting values: hack 2 s, forgiving 1.5 s window, 10 HP cost, floor 1 HP', () => {
    expect(SCANNER.hack).toBe(2);
    expect(SCANNER.window).toBe(1.5);
    expect(SCANNER.cost).toBe(10);
    expect(SCANNER.floorHp).toBe(1);
  });

  it('both hacks started together open the pair (both done)', () => {
    const s = newScanPair();
    expect(scanStart(s, 0, 0)).toBeNull();
    expect(scanStart(s, 1, 1)).toBeNull();
    expect(s.ph).toEqual([SC_HACKING, SC_HACKING]);
    const r = run(s, SCANNER.hack + 0.1);
    expect(r.kind).toBe('open');
    expect(s.open).toBe(true);
    expect(s.ph).toEqual([SC_DONE, SC_DONE]);
  });

  it('the second hack finishing inside the window (1.4 s late) still opens', () => {
    const s = newScanPair();
    scanStart(s, 0, 0);
    run(s, 1.4);
    scanStart(s, 1, 1);
    expect(run(s, SCANNER.hack + 0.1).kind).toBe('open');
  });

  it('a finished hack waits as ready, with the window counting down', () => {
    const s = newScanPair();
    scanStart(s, 0, 0);
    run(s, SCANNER.hack + 0.5);
    expect(s.ph[0]).toBe(SC_READY);
    expect(scanWindowLeft(s)).toBeGreaterThan(0.9);
    expect(scanWindowLeft(s)).toBeLessThan(1.1);
  });

  it('one hack late (started 2 s after): both reset, the late player pays', () => {
    const s = newScanPair();
    scanStart(s, 0, 0);
    run(s, SCANNER.hack);
    scanStart(s, 1, 1);
    const r = run(s, SCANNER.hack + 0.2);
    expect(r).toEqual({ kind: 'fail', who: 1, why: 'late' });
    expect(s.ph).toEqual([SC_IDLE, SC_IDLE]);
    expect(s.who).toEqual([-1, -1]);
    expect(s.open).toBe(false);
  });

  it('one hack alone (the partner never started): the window runs out, both reset, nobody pays (Michael, 2026-10-19)', () => {
    const s = newScanPair();
    scanStart(s, 1, 0);
    const r = run(s, SCANNER.hack + SCANNER.window + 0.1);
    expect(r).toEqual({ kind: 'fail', who: -1, why: 'alone' });
    expect(s.ph).toEqual([SC_IDLE, SC_IDLE]);
  });

  it('walking off mid-hack aborts: both reset, the walker pays', () => {
    const s = newScanPair();
    scanStart(s, 0, 0);
    scanStart(s, 1, 1);
    run(s, 0.5);
    const r = run(s, 0.1, true, false);
    expect(r).toEqual({ kind: 'fail', who: 1, why: 'abort' });
    expect(s.ph).toEqual([SC_IDLE, SC_IDLE]);
  });

  it('one player cannot work both panels; a busy panel refuses the partner', () => {
    const s = newScanPair();
    expect(scanStart(s, 0, 0)).toBeNull();
    expect(scanStart(s, 1, 0)).toBe(REFUSE_SCAN_OTHER);
    expect(scanStart(s, 0, 1)).toBe(REFUSE_SCAN_BUSY);
    // the dev solo flag lets one player work both
    expect(scanStart(s, 1, 0, true)).toBeNull();
  });

  it('a failed sync can be retried and then opens', () => {
    const s = newScanPair();
    scanStart(s, 0, 0);
    run(s, SCANNER.hack + SCANNER.window + 0.1);
    expect(s.ph).toEqual([SC_IDLE, SC_IDLE]);
    scanStart(s, 0, 0);
    scanStart(s, 1, 1);
    expect(run(s, SCANNER.hack + 0.1).kind).toBe('open');
  });

  it('health cost: 10, never below 1 HP', () => {
    expect(scanDamage(100)).toBe(10);
    expect(scanDamage(8)).toBe(7);
    expect(scanDamage(1)).toBe(0);
  });

  it('the ready light needs both panels occupied', () => {
    expect(scanPairReady(true, true)).toBe(true);
    expect(scanPairReady(true, false)).toBe(false);
  });

  // (marlow-final 0d) the Marlow Yard station 6 case (two panels too far apart for one player inside the window, the flag
  // gate and its external flag) returns with the A7 and A8 scanner pairs in their set tests (tests/ctcourse/<set>.test.ts;
  // `syncStation` throws under `syncMinGap`). The rule it pinned, kept here map-free: a pair 12 m apart beats a lone
  // player's 6 m/s sprint between the two hacks.
  it('a pair 12 m apart is too far for one player in the window', () => {
    const d = 12;
    expect((d - 2 * SCANNER.reach) / 6 + SCANNER.hack).toBeGreaterThan(SCANNER.window);
  });
});
