import { describe, expect, it } from 'vitest';
import { Awareness, CAUTION, holdKindFor, MAX_KEYS, PHASE_CAUTIOUS, PHASE_NONE } from '../src/ai/awareness';

// (guard-ai S4) awareness and caution (design section 4): held caution after a death, timed caution after a knockout.

const m = (...keys: number[]): number => keys.reduce((a, k) => (a | (1 << k)) >>> 0, 0);

/** Tick `s` seconds at 5 Hz (the board's rate). */
function run(a: Awareness, s: number): void {
  const n = Math.round(s * 5);
  for (let i = 0; i < n; i++) a.tick(0.2);
}

describe('awareness: held caution (death)', () => {
  it('a death witnessed by 2: both held; eliminate one: still held; eliminate both: the hold clears', () => {
    const a = new Awareness();
    const h = a.openHold('witness', m(3, 7));
    expect(a.cautionOf(3)).toBe(2);
    expect(a.cautionOf(7)).toBe(2);
    expect(a.cautionOf(4)).toBe(0);
    expect(a.holdCount()).toBe(1);
    a.onDown(3, true);
    run(a, 1);
    expect(a.cautionOf(7)).toBe(2);
    expect(a.holdCount()).toBe(1);
    a.onDown(7, true);
    run(a, 0.2);
    expect(a.holdCount()).toBe(0);
    expect(a.isOpen(h)).toBe(false);
    expect(a.cautionOf(7)).toBe(0);
    expect(a.held).toBe(0);
  });

  it('time alone never clears a held caution', () => {
    const a = new Awareness();
    a.openHold('dead', m(1));
    run(a, 3600);
    expect(a.cautionOf(1)).toBe(2);
  });

  it('a later guard learns of it (voice, radio): he is held too and must be eliminated as well', () => {
    const a = new Awareness();
    const h = a.openHold('dead', m(0));
    expect(a.addAware(h, 5)).toBe(true);
    a.onDown(0, true);
    expect(a.cautionOf(5)).toBe(2);
    expect(a.holdCount()).toBe(1);
    a.onDown(5, true);
    expect(a.holdCount()).toBe(0);
    // a dead key cannot learn of a hold; a closed hold takes nobody
    expect(a.addAware(h, 9)).toBe(false);
  });

  it('the section learns of it at once (a report gets through): addAwareMask', () => {
    const a = new Awareness();
    const h = a.openHold('dead', m(2), 41);
    expect(a.holdFor(41)).toBe(h);
    expect(a.kindOf(h)).toBe('dead');
    a.addAwareMask(h, m(2, 4, 6, 31));
    expect(a.awareOf(h)).toBe(m(2, 4, 6, 31));
    expect(a.cautionOf(31)).toBe(2);
  });

  it('A3: knocking out an aware guard counts as eliminated; waking him brings the hold back', () => {
    const a = new Awareness();
    const h = a.openHold('witness', m(3, 7));
    a.onDown(3, true);
    a.onDown(7, false);
    run(a, 0.2);
    expect(a.isEliminated(7)).toBe(true);
    expect(a.holdCount()).toBe(0);
    expect(a.held).toBe(0);
    // dormant: kept for his memory
    expect(a.isOpen(h)).toBe(true);
    expect(a.downAwareOf(h)).toBe(m(7));
    a.onRevived(7);
    expect(a.holdCount()).toBe(1);
    expect(a.cautionOf(7)).toBe(2);
    expect(a.awareOf(h)).toBe(m(7));
    // killed while knocked out: gone for good
    a.onDown(7, false);
    a.onDown(7, true);
    expect(a.isOpen(h)).toBe(false);
    a.onRevived(7);
    expect(a.cautionOf(7)).toBe(0);
  });

  it('a knocked-out guard who learns of a hold (opened while he is down) remembers it once woken', () => {
    const a = new Awareness();
    a.onDown(2, false);
    const h = a.openHold('contact', m(2, 3));
    expect(a.awareOf(h)).toBe(m(3));
    expect(a.downAwareOf(h)).toBe(m(2));
    a.onRevived(2);
    expect(a.cautionOf(2)).toBe(2);
  });

  it('resetKey: a new guard on a freed key starts clean', () => {
    const a = new Awareness();
    a.openHold('dead', m(25, 26));
    a.onDown(25, true);
    a.resetKey(25);
    expect(a.isEliminated(25)).toBe(false);
    expect(a.cautionOf(25)).toBe(0);
    expect(a.cautionOf(26)).toBe(2);
  });

  it('holdKindFor maps the board kinds that hold; others hold nobody', () => {
    expect(holdKindFor('bodyDead')).toBe('dead');
    expect(holdKindFor('witnessKill')).toBe('witness');
    expect(holdKindFor('contact')).toBe('contact');
    expect(holdKindFor('missing')).toBe('missing');
    expect(holdKindFor('bodyKo')).toBe(null);
    expect(holdKindFor('light')).toBe(null);
    expect(holdKindFor('camBody')).toBe(null);
  });
});

describe('awareness: timed caution (knockout)', () => {
  it('KO found: waker and woken search 60 s, cautious to 240 s, then 0; nobody else', () => {
    const a = new Awareness();
    a.onDown(4, false);
    expect(a.isEliminated(4)).toBe(true);
    a.startKo(9, 4);
    expect(a.isEliminated(4)).toBe(false);
    for (const k of [9, 4]) {
      expect(a.cautionOf(k)).toBe(1);
      expect(a.isSearching(k)).toBe(true);
    }
    expect(a.cautionOf(5)).toBe(0);
    expect(a.holdCount()).toBe(0);
    run(a, CAUTION.koSearch - 1);
    expect(a.isSearching(9)).toBe(true);
    run(a, 2);
    expect(a.isSearching(9)).toBe(false);
    expect(a.phase[9]).toBe(PHASE_CAUTIOUS);
    expect(a.cautionOf(9)).toBe(1);
    expect(a.cautionOf(4)).toBe(1);
    // 61 s so far: on to 239 s (still cautious), then 241 s (normal)
    run(a, CAUTION.koSearch + CAUTION.koCautious - 1 - (CAUTION.koSearch + 1));
    expect(a.cautionOf(4)).toBe(1);
    run(a, 2);
    expect(a.cautionOf(4)).toBe(0);
    expect(a.cautionOf(9)).toBe(0);
    expect(a.phase[4]).toBe(PHASE_NONE);
  });

  it('cautious knobs: sight x1.3 and waits x0.6 while caution >= 1', () => {
    const a = new Awareness();
    a.startKo(1, 2);
    expect(a.sightMul(1)).toBe(CAUTION.sens);
    expect(a.waitMul(2)).toBe(CAUTION.waitMul);
    expect(a.sightMul(3)).toBe(1);
    expect(a.waitMul(3)).toBe(1);
  });

  it('a held key also in a timed KO stays held; his timer runs on underneath', () => {
    const a = new Awareness();
    const h = a.openHold('dead', m(1, 2));
    a.startKo(1, 3);
    expect(a.cautionOf(1)).toBe(2);
    expect(a.cautionOf(3)).toBe(1);
    expect(a.isSearching(1)).toBe(true);
    run(a, CAUTION.koSearch + CAUTION.koCautious + 1);
    expect(a.phase[1]).toBe(PHASE_NONE);
    expect(a.cautionOf(1)).toBe(2);
    expect(a.cautionOf(3)).toBe(0);
    // the other aware guard dead, 1 knocked out: eliminated, the hold is dormant
    a.onDown(2, true);
    a.onDown(1, false);
    expect(a.holdCount()).toBe(0);
    // found and woken by 3: held again (it beats the new timed caution), and searching with his waker
    a.startKo(3, 1);
    expect(a.isOpen(h)).toBe(true);
    expect(a.cautionOf(1)).toBe(2);
    expect(a.isSearching(1)).toBe(true);
    expect(a.cautionOf(3)).toBe(1);
  });

  it("a hold clearing leaves another key's timed caution alone", () => {
    const a = new Awareness();
    a.openHold('dead', m(5, 6));
    a.startKo(7, 8);
    a.onDown(5, true);
    a.onDown(6, true);
    expect(a.holdCount()).toBe(0);
    expect(a.cautionOf(7)).toBe(1);
    expect(a.isSearching(8)).toBe(true);
  });

  it('a timed key that goes down loses the timer; dead keys ignore startKo', () => {
    const a = new Awareness();
    a.startKo(1, 2);
    a.onDown(1, true);
    expect(a.cautionOf(1)).toBe(0);
    a.startKo(1, 3);
    expect(a.cautionOf(1)).toBe(0);
    expect(a.cautionOf(3)).toBe(1);
  });

  it('a second KO find restarts the search for both', () => {
    const a = new Awareness();
    a.startKo(1, 2);
    run(a, CAUTION.koSearch + 30);
    expect(a.isSearching(1)).toBe(false);
    a.startKo(1, 4);
    expect(a.isSearching(1)).toBe(true);
    expect(a.cautionT[1]).toBe(CAUTION.koSearch);
  });
});

describe('awareness: pool, keys, allocation', () => {
  it('pool exhaustion: dormant slots are reused first, then keys merge into the oldest active hold (never clears early)', () => {
    const a = new Awareness();
    const ids: number[] = [];
    for (let i = 0; i < CAUTION.holds; i++) ids.push(a.openHold('dead', m(i)));
    expect(a.slotsUsed()).toBe(CAUTION.holds);
    // full and all active: the next merges into the oldest (key 0's)
    const extra = a.openHold('witness', m(20));
    expect(extra).toBe(ids[0]);
    expect(a.merges).toBe(1);
    expect(a.awareOf(ids[0]!)).toBe(m(0, 20));
    a.onDown(0, true);
    expect(a.cautionOf(20)).toBe(2);
    a.onDown(20, true);
    expect(a.isOpen(ids[0]!)).toBe(false);
    // a dormant slot (its only key knocked out) is taken before any merge
    a.openHold('dead', m(21)); // fills the freed slot
    a.onDown(1, false);
    expect(a.isOpen(ids[1]!)).toBe(true);
    const fresh = a.openHold('contact', m(22));
    expect(a.merges).toBe(1);
    expect(a.isOpen(ids[1]!)).toBe(false);
    expect(a.kindOf(fresh)).toBe('contact');
    // the reused slot forgot key 1: waking him brings nothing back
    a.onRevived(1);
    expect(a.cautionOf(1)).toBe(0);
    expect(a.slotsUsed()).toBe(CAUTION.holds);
  });

  it('keys out of range are ignored; key 31 works (u32 masks)', () => {
    const a = new Awareness();
    const h = a.openHold('dead', m(31));
    expect(a.cautionOf(31)).toBe(2);
    expect(a.awareOf(h)).toBe(2 ** 31);
    expect(a.addAware(h, 32)).toBe(false);
    expect(a.addAware(h, -1)).toBe(false);
    a.onDown(40, true);
    a.startKo(-3, 99);
    expect(a.cautionOf(99)).toBe(0);
    a.onDown(31, false);
    expect(a.downAwareOf(h)).toBe(2 ** 31);
    a.onRevived(31);
    expect(a.cautionOf(31)).toBe(2);
  });

  it('deterministic: the same calls give the same state', () => {
    const script = (a: Awareness): void => {
      const h = a.openHold('witness', m(1, 2, 3));
      a.startKo(4, 5);
      run(a, 30);
      a.onDown(2, false);
      a.addAware(h, 6);
      run(a, 50.4);
      a.onRevived(2);
      a.onDown(1, true);
      run(a, 100);
    };
    const a = new Awareness();
    const b = new Awareness();
    script(a);
    script(b);
    expect(Array.from(a.caution)).toEqual(Array.from(b.caution));
    expect(Array.from(a.cautionT)).toEqual(Array.from(b.cautionT));
    expect(Array.from(a.aware)).toEqual(Array.from(b.aware));
    expect(a.held).toBe(b.held);
  });

  it('10k ticks with churn: fixed pools, bounded holds, no growth', () => {
    const a = new Awareness();
    const pools = [a.caution, a.cautionT, a.phase, a.aware, a.downAware, a.holdOpen, a.holdId];
    for (let i = 0; i < 10_000; i++) {
      const k = i % MAX_KEYS;
      if (i % 50 === 0) a.openHold('dead', m(k, (k + 1) % MAX_KEYS));
      if (i % 70 === 0) a.onDown(k, (i & 1) === 0);
      if (i % 90 === 0) a.onRevived(k);
      if (i % 110 === 0) a.startKo(k, (k + 2) % MAX_KEYS);
      if (i % 400 === 0) a.resetKey(k);
      a.tick(0.2);
      expect(a.slotsUsed()).toBeLessThanOrEqual(CAUTION.holds);
    }
    const now = [a.caution, a.cautionT, a.phase, a.aware, a.downAware, a.holdOpen, a.holdId];
    now.forEach((p, i) => expect(p).toBe(pools[i]));
    expect(a.caution.length).toBe(MAX_KEYS);
    expect(a.aware.length).toBe(CAUTION.holds);
    expect(Object.keys(a).length).toBe(Object.keys(new Awareness()).length);
  });
});
