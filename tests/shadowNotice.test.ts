/**
 * (guard-ai-j16 G2) The notice rule for a player's cast shadow (`src/ai/shadowNotice.ts`; PLAN G2 and section 1,
 * BRIEF A1-A6, A11):
 * - the numbers sit where section 1 says: meter above `suspicious`, below hearing's `turnMax` and `investigate`, under
 *   the 0.366 break point; the cone is the focused cone;
 * - a decision table: each gate failing alone gives -1, its boundary passes; all passing picks the nearest point;
 *   a footprint from the moon (-1) counts as a lamp's; another slot, a stale footprint past `count` do not;
 * - the angle and distance agree with `atan2(dx, dz) - yaw` wrapped (`Enemy.perceive`) on random cases;
 * - on a real `ShadowCues` fill: a walking player's shadow in front of the guard is noticed, standing still it is not;
 * - (plan check 1 item 4) the drain after the last cue: without a real glimpse in the last `hold` the floor drains
 *   below `lingerMeter` inside `hearLook` whatever the sub-leak pattern; only a glimpse inside `hold` can outlast it;
 * - nothing allocates per call; nothing from src/game, src/net or graphics is imported.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALERT } from '../src/ai/alertState';
import { HEARING } from '../src/ai/hearing';
import { PERCEPTION, stepMeter } from '../src/ai/perception';
import {
  NI_X,
  NI_YAW,
  NI_Z,
  NO_ANGLE,
  NO_CONTRAST,
  NO_DIST,
  NO_SPEED,
  NO_X,
  NO_Y,
  NO_Z,
  NOTICE_IN,
  NOTICE_OUT,
  noticeInto,
  SHADOW_NOTICE,
  type NoticeCues,
} from '../src/ai/shadowNotice';
import { CharOccluders, OCC_KIND, occKey } from '../src/world/charOccluders';
import { CUE, ShadowCues, type CueField, type CueLight, type CuePlayer } from '../src/world/shadowCues';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

// the real cues fit the rule's input (a compile-time check)
const cuesFit = (c: ShadowCues): NoticeCues => c;
void cuesFit;

const DEG = Math.PI / 180;
const f = Math.fround;

/** Empty cues: every slot count 0. */
function cuesOf(): NoticeCues {
  return {
    count: new Int8Array(CUE.players),
    pts: new Float32Array(CUE.players * CUE.sources * CUE.points * 4),
    speed: new Float32Array(CUE.players * CUE.sources),
  };
}
/** Footprint `c` of slot `s`: speed and its points (x, z, contrast); y 0.05. Raises `count` to cover it. */
function foot(cues: NoticeCues, s: number, c: number, speed: number, points: [number, number, number][]): void {
  cues.speed[s * CUE.sources + c] = speed;
  points.forEach(([x, z, con], p) => {
    const q = ((s * CUE.sources + c) * CUE.points + p) * 4;
    cues.pts[q] = x;
    cues.pts[q + 1] = 0.05;
    cues.pts[q + 2] = z;
    cues.pts[q + 3] = con;
  });
  if (cues.count[s]! < c + 1) cues.count[s] = c + 1;
}
/** The guard at (x, z) facing `yaw` (forward (sin yaw, cos yaw)). */
function at(x: number, z: number, yaw: number): void {
  NOTICE_IN[NI_X] = x;
  NOTICE_IN[NI_Z] = z;
  NOTICE_IN[NI_YAW] = yaw;
}
const out = new Float64Array(NOTICE_OUT);
/** A point at distance d, bearing b (rad off +Z) from the origin. */
const polar = (d: number, b: number, con = 0.6): [number, number, number] => [Math.sin(b) * d, Math.cos(b) * d, con];
/** One footprint, three points ahead along +Z at 3, 4, 5 m: every gate passes for a guard at the origin facing +Z. */
function base(con = 0.6, speed = 1): NoticeCues {
  const c = cuesOf();
  foot(c, 0, 0, speed, [[0, 3, con], [0, 4, con], [0, 5, con]]);
  return c;
}

describe('shadowNotice: the numbers (PLAN section 1)', () => {
  it('meter: suspicious < meter < turnMax < investigate, and under the linger break point 0.366', () => {
    const N = SHADOW_NOTICE;
    expect(N.enabled).toBe(true);
    expect(N.meter).toBeGreaterThan(PERCEPTION.suspicious);
    expect(N.meter).toBeLessThan(HEARING.turnMax);
    expect(HEARING.turnMax).toBeLessThan(PERCEPTION.investigate);
    const brk = ALERT.lingerMeter + PERCEPTION.decay * 0.5 * ALERT.hearLook;
    expect(brk).toBeCloseTo(0.366, 6);
    expect(N.meter).toBeLessThan(brk);
    expect(N.half).toBe(PERCEPTION.focusHalf);
    expect([N.contrast, N.moving, N.near, N.range, N.slack]).toEqual([0.4, 0.3, 1, 10, 0.2]);
    // the contrast gate is reachable: the field's contrast tops out at 1 - CAPSULE.floor (0.85)
    expect(N.contrast).toBeLessThan(0.85);
  });
});

describe('shadowNotice: the decision table', () => {
  it('all gates passing: the nearest point, every logged input in out', () => {
    at(0, 0, 0);
    const c = base();
    expect(noticeInto(c, 0, out)).toBe(0);
    expect(Array.from(out)).toEqual([0, f(0.05), 3, f(0.6), 1, 3, 0]);
  });

  it('contrast: 0.39 fails, 0.40 passes', () => {
    at(0, 0, 0);
    expect(noticeInto(base(0.39), 0, out)).toBe(-1);
    expect(noticeInto(base(0.4), 0, out)).toBe(0);
    expect(out[NO_CONTRAST]).toBe(f(0.4));
  });

  it('moving: 0.29 m/s fails, 0.3 passes, a still shadow (0) fails', () => {
    at(0, 0, 0);
    expect(noticeInto(base(0.6, 0.29), 0, out)).toBe(-1);
    expect(noticeInto(base(0.6, 0), 0, out)).toBe(-1);
    expect(noticeInto(base(0.6, 0.3), 0, out)).toBe(0);
    expect(out[NO_SPEED]).toBe(f(0.3));
  });

  it('range: under 1 m and past 10 m fail, 1 and 10 pass (horizontal: height ignored)', () => {
    at(0, 0, 0);
    const near = cuesOf();
    foot(near, 0, 0, 1, [[0, 0.5, 0.6], [0, 0.9, 0.6], [0, 0.99, 0.6]]);
    expect(noticeInto(near, 0, out)).toBe(-1);
    const far = cuesOf();
    foot(far, 0, 0, 1, [[0, 10.01, 0.6], [0, 11, 0.6], [0, 20, 0.6]]);
    expect(noticeInto(far, 0, out)).toBe(-1);
    const edge = cuesOf();
    foot(edge, 0, 0, 1, [[0, 10, 0.6], [0, 1, 0.6], [0, 0.5, 0.6]]);
    expect(noticeInto(edge, 0, out)).toBe(1);
    expect(out[NO_DIST]).toBe(1);
    edge.pts[1 * 4 + 3] = 0;
    expect(noticeInto(edge, 0, out)).toBe(0);
    expect(out[NO_DIST]).toBe(10);
    // the guard on a floor 3 m up: still the horizontal distance
    edge.pts[1] = -3;
    expect(noticeInto(edge, 0, out)).toBe(0);
  });

  it('cone: 27 deg passes, 28 deg fails (either side), behind and beside fail', () => {
    at(0, 0, 0);
    expect(SHADOW_NOTICE.half / DEG).toBeCloseTo(27.5, 9);
    for (const b of [27, -27]) {
      const c = cuesOf();
      foot(c, 0, 0, 1, [polar(4, b * DEG), [0, 0, 0], [0, 0, 0]]);
      expect(noticeInto(c, 0, out), `${b} deg`).toBe(0);
      expect(out[NO_ANGLE]! / DEG).toBeCloseTo(b, 4);
    }
    for (const b of [28, -28, 90, -90, 180]) {
      const c = cuesOf();
      foot(c, 0, 0, 1, [polar(4, b * DEG), polar(6, b * DEG), polar(9, b * DEG)]);
      expect(noticeInto(c, 0, out), `${b} deg`).toBe(-1);
    }
  });

  it('no footprints, a slot out of range, another slot\'s shadow, a stale footprint past count: -1 / not picked', () => {
    at(0, 0, 0);
    const c = cuesOf();
    expect(noticeInto(c, 0, out)).toBe(-1);
    foot(c, 2, 0, 1, [[0, 3, 0.6], [0, 4, 0.6], [0, 5, 0.6]]);
    expect(noticeInto(c, 0, out)).toBe(-1);
    expect(noticeInto(c, 1, out)).toBe(-1);
    expect(noticeInto(c, -1, out)).toBe(-1);
    expect(noticeInto(c, CUE.players, out)).toBe(-1);
    expect(noticeInto(c, 2, out)).toBe(0);
    // slot 2 gets a nearer footprint 1, then its count drops back to 1: the stale one is never read
    foot(c, 2, 1, 1, [[0, 2, 0.6], [0, 2.5, 0.6], [0, 3, 0.6]]);
    expect(noticeInto(c, 2, out)).toBe(CUE.points);
    c.count[2] = 1;
    expect(noticeInto(c, 2, out)).toBe(0);
    expect(out[NO_Z]).toBe(3);
  });

  it('nearest across footprints and points; a nearer point failing a gate never blocks a farther one; the moon counts', () => {
    at(1, -2, 0);
    const c = cuesOf();
    // footprint 0 (a lamp): 6, 7, 8 m ahead
    foot(c, 1, 0, 2, [[1, 4, 0.7], [1, 5, 0.7], [1, 6, 0.7]]);
    // footprint 1 (the moon, source -1: the rule never reads the source): 2.5 m too faint, 3.5 m passes, 30 m out
    foot(c, 1, 1, 0.5, [[1, 0.5, 0.2], [1, 1.5, 0.45], [1, 28, 0.8]]);
    // footprint 2: nearer still but out of the cone and too slow
    foot(c, 1, 2, 3, [[3, -1, 0.8], [-1, -1, 0.8], [1, -1.2, 0.8]]);
    c.speed[1 * CUE.sources + 2] = 0.1;
    expect(noticeInto(c, 1, out)).toBe(1 * CUE.points + 1);
    expect([out[NO_X], out[NO_Z], out[NO_DIST], out[NO_SPEED]]).toEqual([1, 1.5, 3.5, 0.5]);
    expect(out[NO_Y]).toBe(f(0.05));
    // footprint 2 fast again: its third point (0.8 m) is too near, its first two (63 deg and 117 deg off) are out of the cone
    c.speed[1 * CUE.sources + 2] = 3;
    expect(noticeInto(c, 1, out)).toBe(1 * CUE.points + 1);
    // ties keep the first
    const t = cuesOf();
    foot(t, 0, 0, 1, [[0.5, 3, 0.6], [-0.5, 3, 0.6], [0, 9, 0.6]]);
    at(0, 0, 0);
    expect(noticeInto(t, 0, out)).toBe(0);
  });

  it('a miss leaves out as it was', () => {
    at(0, 0, 0);
    out.fill(7);
    expect(noticeInto(base(0.1), 0, out)).toBe(-1);
    expect(Array.from(out)).toEqual(new Array(NOTICE_OUT).fill(7));
  });
});

describe('shadowNotice: geometry against the guard\'s own angle formula', () => {
  it('random guards and points: the verdict, angle and distance match atan2(dx, dz) - yaw wrapped and hyp2', () => {
    let seed = 11;
    const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const wrap = (a: number): number => {
      let x = a;
      while (x > Math.PI) x -= 2 * Math.PI;
      while (x < -Math.PI) x += 2 * Math.PI;
      return x;
    };
    let hits = 0;
    for (let k = 0; k < 2000; k++) {
      const gx = rnd() * 20 - 10;
      const gz = rnd() * 20 - 10;
      const yaw = rnd() * 4 * Math.PI - 2 * Math.PI;
      const px = f(gx + rnd() * 24 - 12);
      const pz = f(gz + rnd() * 24 - 12);
      const c = cuesOf();
      foot(c, 0, 0, 1, [[px, pz, 0.6], [0, 0, 0], [0, 0, 0]]);
      at(gx, gz, yaw);
      const dx = px - gx;
      const dz = pz - gz;
      const d = Math.sqrt(dx * dx + dz * dz);
      const a = wrap(Math.atan2(dx, dz) - yaw);
      // keep off the edges, where rounding may go either way
      if (Math.abs(Math.abs(a) - SHADOW_NOTICE.half) < 1e-9 || Math.abs(d - 1) < 1e-9 || Math.abs(d - 10) < 1e-9) continue;
      const want = d >= 1 && d <= 10 && Math.abs(a) <= SHADOW_NOTICE.half;
      expect(noticeInto(c, 0, out) === 0, `case ${k}`).toBe(want);
      if (want) {
        hits++;
        expect(out[NO_ANGLE]).toBeCloseTo(a, 9);
        expect(out[NO_DIST]).toBeCloseTo(d, 9);
      }
    }
    expect(hits).toBeGreaterThan(50);
  });
});

describe('shadowNotice: on a real ShadowCues fill', () => {
  /** One lamp 4 m over (0, 0); flat terms: the lamp gives 0.4 everywhere, the level is 0.5 (contrast 0.68). */
  class FlatField implements CueField {
    readonly qp = new Float64Array(3);
    readonly qr = new Float64Array(1);
    sourcesQ(ids: Int32Array, lv: Float32Array, max: number): number {
      if (max < 1) return 0;
      ids[0] = 0;
      lv[0] = 0.4;
      return 1;
    }
    sourceQ(): void {
      this.qr[0] = 0.4;
    }
    totalQ(): void {
      this.qr[0] = 0.5;
    }
  }
  const lights: CueLight[] = [{ x: 0, y: 4, z: 0, swx: 0, swy: 0, swz: 0 }];
  const players: CuePlayer[] = [{ id: 'local' }];
  const keys = new Int32Array([occKey(OCC_KIND.player, 0)]);
  /** The player's upright capsule with feet at (x, 0, z). */
  function standAt(occ: CharOccluders, x: number, z: number): void {
    occ.clear();
    occ.add(OCC_KIND.player, 0, x, 0.25, z, x, 1.55, z, 0.22);
  }

  it('a player walking past the lamp casts a moving shadow the guard ahead notices; standing still, he does not', () => {
    const cues = new ShadowCues(new FlatField(), lights, null);
    const occ = new CharOccluders();
    // the player 1 m east of the lamp walks north at 1 m/s; his shadow points east, away from the lamp
    standAt(occ, 1, 0);
    cues.fill(occ, players, keys, 1, 0.1);
    standAt(occ, 1, 0.1);
    cues.fill(occ, players, keys, 1, 0.1);
    expect(cues.count[0]).toBe(1);
    expect(cues.speed[0]).toBeGreaterThan(SHADOW_NOTICE.moving);
    // the guard 6 m further east, facing west (yaw -90 deg): the shadow lies between them; the player is behind it
    at(8, 0.1, -Math.PI / 2);
    const slot = cues.slotOf('local');
    expect(slot).toBe(0);
    const k = noticeInto(cues, slot, out);
    expect(k).toBeGreaterThanOrEqual(0);
    // the nearest qualifying point is the far tip (the shadow's end nearest him)
    expect(k).toBe(CUE.points - 1);
    expect(out[NO_CONTRAST]).toBeCloseTo(0.68, 5);
    expect(out[NO_X]!).toBeGreaterThan(1);
    expect(out[NO_X]!).toBeLessThan(8 - SHADOW_NOTICE.near);
    // the same player standing still: speed 0, nothing
    cues.fill(occ, players, keys, 1, 0.1);
    expect(cues.speed[0]).toBe(0);
    expect(noticeInto(cues, slot, out)).toBe(-1);
    // walking again, but the guard turned away: nothing
    standAt(occ, 1, 0.2);
    cues.fill(occ, players, keys, 1, 0.1);
    at(8, 0.1, Math.PI / 2);
    expect(noticeInto(cues, slot, out)).toBe(-1);
  });
});

describe('shadowNotice: the drain after the last cue (plan check 1 item 4)', () => {
  const DT = 1 / 120;
  /** Seconds from the last cue until the meter (from `m0`) is under `lingerMeter`, the target last seen `since0` s
   *  before and unseen after (sight rate 0, or a sub-leak glimpse 0.1 where `sub(t)`); Infinity past 10 s. */
  function drainT(m0: number, since0: number, sub: (t: number) => boolean): number {
    let m = m0;
    let since = since0;
    for (let t = 0; t < 10; t += DT) {
      if (m < ALERT.lingerMeter) return t;
      m = stepMeter(m, sub(t) ? 0.1 : 0, DT, since);
      since += DT;
    }
    return Infinity;
  }
  /** Sub-leak patterns: none, all, before or after a switch time. */
  const patterns: [string, (t: number) => boolean][] = [['rate 0', () => false], ['sub-leak', () => true]];
  for (let s = 0.1; s < 3.5; s += 0.1) {
    const k = s;
    patterns.push([`sub-leak after ${k.toFixed(1)} s`, (t) => t >= k], [`sub-leak until ${k.toFixed(1)} s`, (t) => t < k]);
  }

  it('no real glimpse in the last hold: the cue floor drains below lingerMeter inside hearLook, whatever the sub-leak pattern', () => {
    expect(0.1).toBeLessThanOrEqual(PERCEPTION.leak);
    let worst = 0;
    for (const [name, sub] of patterns) {
      const t = drainT(SHADOW_NOTICE.meter, PERCEPTION.hold + DT, sub);
      expect(t, name).toBeLessThan(ALERT.hearLook);
      worst = Math.max(worst, t);
    }
    // the half drain is the slowest: (0.35 - 0.15) / 0.09 = 2.22 s
    expect(worst).toBeCloseTo((SHADOW_NOTICE.meter - ALERT.lingerMeter) / (PERCEPTION.decay / 2), 1);
    // above the break point it would not (the reason for 0.35)
    expect(drainT(0.37, PERCEPTION.hold + DT, () => true)).toBeGreaterThan(ALERT.hearLook);
  });

  it('a real glimpse inside the last hold: at rate 0 he still calms (1.2 + 1.11 s); only sub-leak after the hold outlasts the look (sight, not the shadow)', () => {
    for (let since0 = 0; since0 < PERCEPTION.hold; since0 += 0.1) {
      const t0 = drainT(SHADOW_NOTICE.meter, since0, () => false);
      expect(t0, `glimpse ${since0.toFixed(1)} s before`).toBeLessThan(ALERT.hearLook);
    }
    expect(drainT(SHADOW_NOTICE.meter, 0, () => false)).toBeCloseTo(PERCEPTION.hold + (SHADOW_NOTICE.meter - ALERT.lingerMeter) / PERCEPTION.decay, 1);
    // the hold, then the half drain: 1.2 + 2.22 = 3.42 s, past the 2.4 s look; it needs the glimpse (since0 < hold)
    const late = drainT(SHADOW_NOTICE.meter, 0, (t) => t >= PERCEPTION.hold);
    expect(late).toBeGreaterThan(ALERT.hearLook);
    expect(late).toBeCloseTo(PERCEPTION.hold + (SHADOW_NOTICE.meter - ALERT.lingerMeter) / (PERCEPTION.decay / 2), 1);
    expect(drainT(SHADOW_NOTICE.meter, PERCEPTION.hold + DT, (t) => t >= PERCEPTION.hold)).toBeLessThan(ALERT.hearLook);
  });
});

describe('shadowNotice: no allocation per call', () => {
  it('noticeInto over 4 slots x 3 footprints reads under one HeapNumber per call; an object per call reads more', async () => {
    const c = cuesOf();
    for (let s = 0; s < CUE.players; s++) {
      for (let k = 0; k < CUE.sources; k++) {
        const b = (s * 40 + k * 15 - 30) * DEG;
        foot(c, s, k, 0.2 + k * 0.4, [polar(2 + k, b, 0.3 + 0.2 * k), polar(4 + k, b, 0.5), polar(7 + k, b, 0.8)]);
      }
    }
    const N = 2000;
    const X = inputs(N, (k) => (k % 7) - 3);
    const Z = inputs(N, (k) => (k % 5) - 6);
    const Y = inputs(N, (k) => (k % 13) * 0.5 - 3);
    const run = (n: number): void => {
      for (let i = 0; i < n; i++) {
        NOTICE_IN[NI_X] = X[i]!;
        NOTICE_IN[NI_Z] = Z[i]!;
        NOTICE_IN[NI_YAW] = Y[i]!;
        sink[0] = noticeInto(c, i & 3, out) + noticeInto(c, (i + 1) & 3, out);
      }
    };
    // the inputs give both verdicts
    let found = 0;
    for (let i = 0; i < N; i++) {
      at(X[i]!, Z[i]!, Y[i]!);
      if (noticeInto(c, i & 3, out) >= 0) found++;
    }
    expect(found).toBeGreaterThan(N / 20);
    expect(found).toBeLessThan(N);
    const per = await bytesPerCall(run, 0, { n: N, warm: 100000 });
    const ring: object[] = new Array<object>(64);
    const ctl = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) ring[i & 63] = { k: noticeInto(c, i & 3, out) };
    }, -Infinity, { n: N, warm: 100000 });
    console.info(`bytes per 2 x noticeInto: ${per.toFixed(1)} (${found} of ${N} found), control with an object ${ctl.toFixed(1)}`);
    expect(per).toBeLessThan(HEAP_NUMBER);
    expect(ctl).toBeGreaterThan(per + 8);
  }, 120_000);
});

describe('shadowNotice: purity', () => {
  it('imports nothing from src/game, src/net or graphics, and only the cue data, perception and mathx', () => {
    const src = readFileSync('src/ai/shadowNotice.ts', 'utf8');
    const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l));
    expect(imports.length).toBe(3);
    for (const l of imports) {
      expect(l).not.toMatch(/\/(game|net|ui|render|player)\//);
      expect(l).not.toMatch(/babylon|quality|governor|charShadowSet|bakedLamps|lightRig|rig\b/i);
      expect(l).toMatch(/from '(\.\.\/core\/mathx|\.\.\/world\/shadowCues|\.\/perception)'/);
    }
    expect(src).not.toMatch(/Math\.hypot/);
  });
});
