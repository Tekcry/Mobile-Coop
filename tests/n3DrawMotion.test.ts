// (anim-natural N3) The draw / holster / swap motion: the pure phase curves (anim/drawMotion.ts), the Draw tuner section,
// the real-world times (docs/archive/anim-natural/n3/DRAW-TIMES.md), and the real rig on a NullEngine (Wren, the real
// PlayerWeapons, WeaponStance and WeaponCarry, tests/helpers/drawHarness): one continuous move with no stop between its
// start and its settle, no one-frame jump, nothing moving again once it is over (the "random stop": the gun held at the
// swap clip's level pocket, then pitched into the low ready as the overlay faded), and the same final poses as before N3
// (low ready, aim and holstered: chest-frame numbers captured on master ea3399ed).
import { describe, expect, it } from 'vitest';
import { DRAW_BEAT, DRAW_CUR, DRAW_MOTION, drawArrive, drawEase, drawEnter, drawPath, drawRelease, gripClose, liftStart, reachWeight, RELEASE_END, settleAt, turnEase } from '../src/anim/drawMotion';
import { DRAW_SECTION, drawTuneApply } from '../src/weapons/drawTune';
import { TUNE_FLAGS, tuneSet } from '../src/anim/tuneRegistry';
import { CLIP_GUN, CLIP_SPEED_SECTION } from '../src/anim/tuneClipSpeed';
import { AIM_IN_PRIMARY, AIM_IN_SIDEARM, drawTimeFor, DRAW_TIME_PRIMARY, DRAW_TIME_SIDEARM, HOLSTER_TIME_MOVE, HOLSTER_TIME_PRIMARY, HOLSTER_TIME_SIDEARM, holsterTimeFor } from '../src/weapons/drawState';
import { STANCE, StrikeTrigger } from '../src/player/weaponStance';
import { drawHarness, DT, type DrawHarness, type DrawSample } from './helpers/drawHarness';
import { DRAW_SCENARIOS, runScenario } from './helpers/drawScenarios';

describe('drawMotion: the phase curves', () => {
  it('the lift / present ease starts and ends at rest, eased in, and settles past the pocket', () => {
    for (const s of [0, 3, 5, 6]) {
      expect(drawEase(0, s)).toBe(0);
      expect(drawEase(1, s)).toBe(1);
      const d0 = (drawEase(1e-4, s) - drawEase(0, s)) / 1e-4;
      const d1 = (drawEase(1, s) - drawEase(1 - 1e-4, s)) / 1e-4;
      expect(Math.abs(d0)).toBeLessThan(0.01);
      expect(Math.abs(d1)).toBeLessThan(0.01);
    }
    // 0 is the smoothstep; 3 never passes 1; 5 overshoots about 2.4 % and arrives at drawArrive
    for (let k = 0; k <= 1; k += 0.05) expect(drawEase(k, 0)).toBeCloseTo(k * k * (3 - 2 * k), 12);
    let max3 = 0;
    let max5 = 0;
    for (let k = 0; k <= 1; k += 0.001) {
      max3 = Math.max(max3, drawEase(k, 3));
      max5 = Math.max(max5, drawEase(k, 5));
    }
    expect(max3).toBeLessThanOrEqual(1 + 1e-9);
    expect(max5).toBeGreaterThan(1.015);
    expect(max5).toBeLessThan(1.035);
    expect(drawEase(drawArrive(5), 5)).toBeCloseTo(1, 9);
    expect(drawArrive(3)).toBe(1);
    // never backwards before the overshoot
    let prev = 0;
    for (let k = 0; k <= drawArrive(5); k += 0.01) {
      const v = drawEase(k, 5);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it('the turn runs at an even rate with eased ends (the rifle no longer flicks off the back)', () => {
    expect(turnEase(0)).toBe(0);
    expect(turnEase(1)).toBeCloseTo(1, 12);
    let prev = 0;
    let peak = 0;
    for (let k = 0.001; k <= 1; k += 0.001) {
      const v = turnEase(k);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      peak = Math.max(peak, (v - prev) / 0.001);
      prev = v;
    }
    // the path's ease peaks at 2.1 x its mean rate; the turn at 1.25 x
    expect(peak).toBeLessThan(1.3);
    expect((turnEase(1e-4) - turnEase(0)) / 1e-4).toBeLessThan(0.01);
    expect((turnEase(1) - turnEase(1 - 1e-4)) / 1e-4).toBeLessThan(0.01);
  });

  it('the reach eases the hand onto the grip; the gun leaves before the reach ends, as the fingers close', () => {
    for (const m of [DRAW_MOTION.rifle, DRAW_MOTION.pistol]) {
      expect(reachWeight(0, m)).toBe(0);
      expect(reachWeight(m.reach, m)).toBe(1);
      expect(liftStart(m)).toBeLessThan(m.reach);
      expect(liftStart(m)).toBeGreaterThan(0.5 * m.reach);
      // the gun in the slot until the lift, then moving; the fingers mostly shut when it leaves
      expect(drawPath(liftStart(m), m)).toBe(0);
      expect(drawPath(m.reach, m)).toBeGreaterThan(0);
      expect(gripClose(reachWeight(liftStart(m), m))).toBeGreaterThan(0.5);
      expect(drawPath(1, m)).toBeCloseTo(1, 12);
    }
    expect(gripClose(0)).toBe(0);
    expect(gripClose(1)).toBe(1);
  });

  it('a draw from rest brings the swap clip in over the reach; anything else at once', () => {
    const m = DRAW_MOTION.rifle;
    expect(drawEnter(0.5, -1, m)).toBe(1);
    expect(drawEnter(DRAW_BEAT, DRAW_BEAT, m)).toBe(0);
    expect(drawEnter(DRAW_BEAT + m.reach * (1 - DRAW_BEAT), DRAW_BEAT, m)).toBe(1);
    expect(drawEnter(DRAW_BEAT + 0.5 * m.reach * (1 - DRAW_BEAT), DRAW_BEAT, m)).toBeCloseTo(0.5, 9);
  });

  it('the reach pose hands over to the ready pose during the present, done before the settle', () => {
    for (const m of [DRAW_MOTION.rifle, DRAW_MOTION.pistol]) {
      expect(drawRelease(0.2, m)).toBe(1); // a holster's half
      expect(drawRelease(DRAW_BEAT, m)).toBe(1);
      const s = liftStart(m);
      const u1 = s + (1 - s) * RELEASE_END;
      expect(drawRelease(DRAW_BEAT + (1 - DRAW_BEAT) * u1, m)).toBeCloseTo(0, 12);
      expect(drawRelease(1, m)).toBe(0);
      let prev = 1;
      for (let st = DRAW_BEAT; st <= 1; st += 0.01) {
        const w = drawRelease(st, m);
        expect(w).toBeLessThanOrEqual(prev + 1e-12);
        prev = w;
      }
    }
  });

  it('the settle fades out as the gun comes up to the aim (the shoulder stops it)', () => {
    expect(settleAt(5, 0)).toBe(5);
    expect(settleAt(5, 1)).toBe(3);
    expect(settleAt(2, 0.5)).toBe(2);
  });

  it('allocates nothing per call (the curves and the Draw section)', () => {
    const m = DRAW_CUR.rifle;
    const slot = new Float64Array(1);
    const run = (): number => {
      const before = process.memoryUsage().heapUsed;
      for (let k = 0; k < 200000; k++) {
        const u = (k % 1000) / 1000;
        slot[0]! += drawPath(u, m) + turnEase(u) + reachWeight(u, m) + drawRelease(DRAW_BEAT + u * (1 - DRAW_BEAT), m) + drawEnter(u, DRAW_BEAT, m) + gripClose(u);
        if ((k & 1023) === 0) drawTuneApply('rifle');
      }
      return process.memoryUsage().heapUsed - before;
    };
    run();
    // the least of three runs (a busy machine's GC and JIT noise); one 16-byte object per call would be 3.2 MB
    expect(Math.min(run(), run(), run())).toBeLessThan(2_000_000);
    expect(Number.isFinite(slot[0]!)).toBe(true);
  });
});

describe('the Draw tuner section and the times', () => {
  it('rifle and pistol groups; identity is the table; a slider moves the values in use; the bypass reads identity', () => {
    expect(DRAW_SECTION.groups).toEqual(['draw.rifle', 'draw.pistol']);
    for (const t of DRAW_SECTION.tunables) expect(t.def).toBe(t.kind === 'mul' ? 1 : 0);
    drawTuneApply('rifle');
    expect(DRAW_CUR.rifle).toEqual(DRAW_MOTION.rifle);
    expect(DRAW_CUR.pistol).toEqual(DRAW_MOTION.pistol);
    const v = DRAW_SECTION.values['draw.pistol']!;
    v.reachAdd = 0.1;
    v.viaY = 5;
    try {
      drawTuneApply('pistol');
      expect(DRAW_CUR.pistol.reach).toBeCloseTo(DRAW_MOTION.pistol.reach + 0.1, 12);
      expect(DRAW_CUR.pistol.via[1]).toBeCloseTo(DRAW_MOTION.pistol.via[1] + 0.05, 12);
      expect(DRAW_CUR.rifle).toEqual(DRAW_MOTION.rifle);
      TUNE_FLAGS.bypass = true;
      drawTuneApply('pistol');
      expect(DRAW_CUR.pistol).toEqual(DRAW_MOTION.pistol);
    } finally {
      TUNE_FLAGS.bypass = false;
      v.reachAdd = 0;
      v.viaY = 0;
      drawTuneApply(null);
    }
  });

  it('the draw and holster times are Clip speed\'s, per gun (master 4.53.0 merge); the bypass reads the code times', () => {
    expect(DRAW_SECTION.tunables.some((t) => /time/i.test(t.id))).toBe(false);
    expect(holsterTimeFor('rifle')).toBe(HOLSTER_TIME_PRIMARY);
    expect(holsterTimeFor('pistol')).toBe(HOLSTER_TIME_SIDEARM);
    try {
      tuneSet(CLIP_GUN, 'pistolDraw', 1.5);
      tuneSet(CLIP_GUN, 'holsterSidearm', 2);
      expect(drawTimeFor('pistol')).toBeCloseTo(DRAW_TIME_SIDEARM / 1.5, 12);
      expect(holsterTimeFor('pistol')).toBeCloseTo(HOLSTER_TIME_SIDEARM / 2, 12);
      expect(drawTimeFor('rifle')).toBe(DRAW_TIME_PRIMARY);
      expect(holsterTimeFor('rifle')).toBe(HOLSTER_TIME_PRIMARY);
      tuneSet(CLIP_GUN, 'holsterPrimary', 4);
      expect(holsterTimeFor('rifle')).toBeCloseTo(HOLSTER_TIME_PRIMARY / 4, 12);
      TUNE_FLAGS.bypass = true;
      expect(holsterTimeFor('rifle')).toBe(HOLSTER_TIME_PRIMARY);
      expect(drawTimeFor('pistol')).toBe(DRAW_TIME_SIDEARM);
    } finally {
      TUNE_FLAGS.bypass = false;
      for (const id of ['pistolDraw', 'holsterSidearm', 'holsterPrimary']) tuneSet(CLIP_GUN, id, 1);
    }
  });

  it('the real-world times (DRAW-TIMES.md); the pre-N3 times stay reachable on the sliders', () => {
    expect(DRAW_TIME_PRIMARY).toBe(1.1);
    expect(DRAW_TIME_SIDEARM).toBe(0.75);
    expect(HOLSTER_TIME_PRIMARY).toBe(1.0);
    expect(HOLSTER_TIME_SIDEARM).toBe(0.9);
    // the LT sling draw: draw plus the raise (rifle 1.5 s, pistol 1.2 s)
    expect(STANCE.slingDrawLong).toBe(1.36);
    expect(STANCE.slingDrawMult).toBe(1.6);
    expect(DRAW_TIME_PRIMARY * STANCE.slingDrawLong).toBeCloseTo(1.5, 1);
    expect(DRAW_TIME_SIDEARM * STANCE.slingDrawMult).toBeCloseTo(1.2, 9);
    // traversal keeps G2's holster; the aim from low ready keeps the pre-N3 camera blend
    expect(HOLSTER_TIME_MOVE).toBe(0.15);
    expect(AIM_IN_PRIMARY).toBe(0.3);
    expect(AIM_IN_SIDEARM).toBe(0.5);
    // Clip speed's draw / holster sliders reach the pre-N3 times (a speed divides the time)
    const max = (id: string) => CLIP_SPEED_SECTION.byId.get(id)!.max;
    expect(max('rifleDraw')).toBeGreaterThanOrEqual(DRAW_TIME_PRIMARY / 0.3);
    expect(max('pistolDraw')).toBeGreaterThanOrEqual(DRAW_TIME_SIDEARM / 0.5);
    expect(max('holsterPrimary')).toBeGreaterThanOrEqual(HOLSTER_TIME_PRIMARY / 0.15);
    expect(max('holsterSidearm')).toBeGreaterThanOrEqual(HOLSTER_TIME_SIDEARM / 0.15);
  });
});

type K = 'w' | 'g' | 'm';
const P = (s: DrawSample, k: K, a: 'x' | 'y' | 'z'): number => (s as unknown as Record<string, number>)[`${k}${a}`]!;
/** Speed (m/s) of a sample's point (`w` wrist, `g` grip, `m` muzzle) into frame i (0 across a change of gun). */
function speed(s: readonly DrawSample[], i: number, k: K): number {
  const a = s[i - 1]!;
  const b = s[i]!;
  if (k !== 'w' && a.gun !== b.gun) return 0;
  return Math.sqrt((P(b, k, 'x') - P(a, k, 'x')) ** 2 + (P(b, k, 'y') - P(a, k, 'y')) ** 2 + (P(b, k, 'z') - P(a, k, 'z')) ** 2) / DT;
}
/** The change of a point's one-frame step into frame i (m): a jump shows as a large second difference. */
function jerk(s: readonly DrawSample[], i: number, k: K): number {
  const a = s[i - 2]!;
  const b = s[i - 1]!;
  const c = s[i]!;
  if (k !== 'w' && (a.gun !== b.gun || b.gun !== c.gun)) return 0;
  let sum = 0;
  for (const ax of ['x', 'y', 'z'] as const) sum += (P(c, k, ax) - 2 * P(b, k, ax) + P(a, k, ax)) ** 2;
  return Math.sqrt(sum);
}

/** The gun's direction (grip to muzzle, world, unit) of sample `s` into `o`. */
function gunDir(s: DrawSample, o: Float64Array, k: number): void {
  const x = s.mx - s.gx;
  const y = s.my - s.gy;
  const z = s.mz - s.gz;
  const l = Math.sqrt(x * x + y * y + z * z);
  o[k] = x / l;
  o[k + 1] = y / l;
  o[k + 2] = z / l;
}
const dirs = new Float64Array(9);
/** The change of the gun direction's one-frame step into frame i (rad, small angles): a snap in its turn. */
function angJerk(s: readonly DrawSample[], i: number): number {
  if (s[i]!.gun !== s[i - 1]!.gun || s[i - 1]!.gun !== s[i - 2]!.gun) return 0;
  gunDir(s[i - 2]!, dirs, 0);
  gunDir(s[i - 1]!, dirs, 3);
  gunDir(s[i]!, dirs, 6);
  let sum = 0;
  for (let k = 0; k < 3; k++) sum += (dirs[6 + k]! - 2 * dirs[3 + k]! + dirs[k]!) ** 2;
  return Math.sqrt(sum);
}
/** The muzzle's turn may change by at most this in a frame (deg); the turn back of a draw holstered mid-way (frames). */
const ANG_JERK = 15;
const TURN_MAX = 10;

/** Final pose on master ea3399ed after 200 frames (chest frame, m): grip x y z, muzzle x y z. */
const LOW_RIFLE = [0.1188, 0.0141, 0.2528, -0.2012, -0.2528, 0.7046];
const AIM_RIFLE = [0.1361, 0.3055, 0.2168, 0.0186, 0.5761, 0.7559];
const AIM_PISTOL = [0.0526, 0.408, 0.2936, -0.0013, 0.5841, 0.5231];
const MASTER_FINAL: Record<string, readonly number[]> = {
  'draw rifle (X, low ready)': LOW_RIFLE,
  'draw rifle (LT, sling draw to aim)': [0.1361, 0.3057, 0.2167, 0.0187, 0.5773, 0.7554],
  'draw pistol (X, low ready)': [-0.0237, -0.2376, 0.3189, -0.0324, -0.4262, 0.5446],
  'draw pistol (LT, to aim)': AIM_PISTOL,
  'holster rifle': [0.12, 0.0, -0.1189, -0.3133, -0.4359, -0.1189],
  'holster pistol': [0.2127, -0.4134, -0.0299, 0.1992, -0.6961, 0.0507],
  'swap rifle to pistol': [-0.0237, -0.237, 0.3188, -0.0324, -0.4284, 0.5421],
  'swap pistol to rifle': [0.1175, 0.0145, 0.2508, -0.2025, -0.2588, 0.6987],
  'low ready to aim (rifle)': AIM_RIFLE,
  'draw rifle (X, LT held mid-draw)': AIM_RIFLE,
  'swap rifle to pistol (aiming)': AIM_PISTOL,
};

describe('the real rig: draw, holster, swap and low ready to aim are one continuous move (NullEngine)', () => {
  for (const sc of DRAW_SCENARIOS) {
    it(sc.name, async () => {
      const { REWIND_QUICK } = await import('../src/weapons/playerWeapons');
      const s = await runScenario(sc, sc.frames ?? 200);
      const f = s[s.length - 1]!;
      // the move's end: the swap clock's last frame (a holster: the gun seated); the settle: from where the grip stays
      // within 2 cm of its final place (chest frame)
      let end = -1;
      for (let i = s.length - 1; i >= 0; i--)
        if (s[i]!.swap >= 0) {
          end = i;
          break;
        }
      let settle = s.length - 1;
      while (settle > 0 && Math.hypot(s[settle - 1]!.cgx - f.cgx, s[settle - 1]!.cgy - f.cgy, s[settle - 1]!.cgz - f.cgz) < 0.02) settle--;
      // the hand reaching or the gun moving: whichever is faster
      const c = (i: number): number => Math.max(speed(s, i, 'w'), speed(s, i, 'g'));
      let first = 1;
      while (first < s.length && c(first) < 0.3) first++;
      // (a holster's end is the seat: the gun comes to rest in its slot before the hand lets go; a draw holstered mid-way
      // seats the gun before its clock ends, the reach let go last: its last frame with the gun moving)
      let stop = end > 0 ? Math.min(settle, end - 3) : settle;
      const back = (sc.name.includes('mid-draw') || sc.name.startsWith('redraw')) && sc.then ? sc.then.at : -1;
      if (back >= 0 && sc.name.includes('mid-draw')) {
        let gMax = 0;
        for (let i = back; i < s.length; i++) gMax = Math.max(gMax, speed(s, i, 'g'));
        let seat = s.length - 1;
        while (seat > back && speed(s, seat, 'g') < 0.1 * gMax) seat--;
        stop = Math.min(stop, seat + 1);
      }
      // (anim-natural N3 fix, check finding 4: was the hand and the gun under 0.15 m/s) no stop between the start and the
      // settle: never 3 frames (50 ms) in a row with the wrist, the grip and the muzzle all under 10 % of their peak in
      // the move (master: the gun held 0.08-0.17 s at the clip's level pocket, then moved again). A draw holstered
      // mid-way is two moves, the draw and its rewind, each with its own peaks; between them the gun turns back and
      // passes through rest once: that turn may take up to TURN_MAX frames
      // (a re-draw after the seat: the holster's move ends at its seat, as every holster's; then the hand lets go until X)
      let endA = back + 1;
      if (sc.name.startsWith('redraw')) {
        let e1 = first;
        while (e1 < back && s[e1]!.swap >= 0) e1++;
        endA = Math.min(endA, e1 - 3);
      }
      const segs = back >= 0 ? [first, endA, back + 1, stop] : [first, stop];
      const pk = [0, 0, 0];
      const slow = (i: number): boolean => speed(s, i, 'w') < 0.1 * pk[0]! && speed(s, i, 'g') < 0.1 * pk[1]! && speed(s, i, 'm') < 0.1 * pk[2]!;
      let worst = 0;
      let at = -1;
      let turn = 0;
      for (let g = 0; g + 1 < segs.length; g++) {
        if (g === 1) continue;
        const a = segs[g]!;
        const b = segs[g + 1]!;
        pk.fill(0);
        for (let i = a; i < b; i++) {
          pk[0] = Math.max(pk[0]!, speed(s, i, 'w'));
          pk[1] = Math.max(pk[1]!, speed(s, i, 'g'));
          pk[2] = Math.max(pk[2]!, speed(s, i, 'm'));
        }
        let run = 0;
        for (let i = a; i <= b; i++) {
          if (i < b && slow(i)) {
            run++;
            continue;
          }
          // the run touching the press that turns the draw back is the turn
          if (back >= 0 && i - run <= back + 3 && i >= back - 2) turn += run;
          else if (run > worst) [worst, at] = [run, i - run];
          run = 0;
        }
      }
      expect(worst, `${sc.name}: a stop of ${worst} frames at ${(at * DT * 1000).toFixed(0)} ms`).toBeLessThan(3);
      expect(turn, `${sc.name}: the turn back takes ${turn} frames`).toBeLessThanOrEqual(TURN_MAX);
      // no one-frame jump: the grip's and the wrist's step never changes by more than 3.5 cm in a frame (master: the
      // rifle jumped 28 cm at a swap's press and 11 cm at its hand-off; the pistol's LT draw 7 cm at its end)
      for (const k of ['g', 'w'] as const) {
        let jmax = 0;
        let jat = -1;
        for (let i = 3; i < s.length; i++) {
          const j = jerk(s, i, k);
          if (j > jmax) [jmax, jat] = [j, i];
        }
        expect(jmax, `${sc.name}: ${k === 'g' ? 'grip' : 'wrist'} jumps ${(jmax * 100).toFixed(1)} cm at ${(jat * DT * 1000).toFixed(0)} ms`).toBeLessThan(0.035);
      }
      // the rifle comes off the back at an even turn (master: the muzzle swung 218 deg in 0.2 s, 17 m/s); a draw rewound
      // for a traversal goes back REWIND_QUICK x the draw's pace, so its muzzle at most that much faster
      if (sc.name.startsWith('draw rifle') || sc.name.includes('mid-draw')) {
        let mx = 0;
        for (let i = 2; i < s.length; i++) mx = Math.max(mx, speed(s, i, 'm'));
        const lim = sc.name.includes('traversal') ? 10 * REWIND_QUICK : 10;
        expect(mx, `${sc.name}: muzzle peak ${mx.toFixed(1)} m/s`).toBeLessThan(lim);
      }
      // (anim-natural N3 fix, check finding 4) no snap in the gun's turn: the one-frame change of its direction (grip to
      // muzzle, world) never changes by more than ANG_JERK in a frame (the mid-draw snap into the slot turned it 90+ deg in
      // a frame; the worst kept move, the swap's hand-off, measures 12.5 deg)
      {
        let aj = 0;
        let ajAt = -1;
        for (let i = 2; i < s.length; i++) {
          const j = angJerk(s, i);
          if (j > aj) [aj, ajAt] = [j, i];
        }
        expect(aj * (180 / Math.PI), `${sc.name}: the muzzle's turn jumps ${(aj * (180 / Math.PI)).toFixed(1)} deg at ${(ajAt * DT * 1000).toFixed(0)} ms`).toBeLessThan(ANG_JERK);
      }
      // nothing moves again once it is over (a draw / swap: the gun in its final pose; master: 3-3.8 m/s at the muzzle
      // as the overlay faded); a holster's body carriage settles after it, so only the draws and swaps
      if (end > 0 && !sc.name.startsWith('holster')) {
        let post = 0;
        for (let i = end + 2; i < Math.min(s.length, end + 60); i++) post = Math.max(post, speed(s, i, 'm'));
        expect(post, `${sc.name}: muzzle ${post.toFixed(2)} m/s after the end`).toBeLessThan(0.8);
      }
      // the final pose as on master (chest frame): the low ready, the aim, the holstered gun unchanged
      const m = MASTER_FINAL[sc.final ?? sc.name]!;
      // (master 4.54.0 merge) #103's body bake moved the thigh holster ~1.3 mm in the chest frame against these ea3399ed
      // numbers (a rewound pistol ends 6.3 mm off them, the same spot for every mid-draw case)
      const tolG = sc.name.startsWith('holster pistol') ? 0.007 : 0.004;
      expect(Math.hypot(f.cgx - m[0]!, f.cgy - m[1]!, f.cgz - m[2]!), `${sc.name}: final grip`).toBeLessThan(tolG);
      expect(Math.hypot(f.cmx - m[3]!, f.cmy - m[4]!, f.cmz - m[5]!), `${sc.name}: final muzzle`).toBeLessThan(2 * tolG);
    });
  }

  it('holstered, the gun sits in its slot exactly as before (local to its mount)', async () => {
    const want: Record<string, { slot: string; parent: string; trs: number[] }> = {
      rifle: { slot: 'backC', parent: 'chest', trs: [0.086219, 0.013559, -0.11894, 0.311, -0.635043, 0.311, 0.635043] },
      pistol: { slot: 'thigh', parent: 'hipR', trs: [0.123049, -0.141198, 0.017656, 0.706766, -0.062254, 0.022077, 0.704357] },
    };
    for (const gun of ['rifle', 'pistol'] as const) {
      const h = await drawHarness();
      h.run(40);
      if (gun === 'pistol') {
        h.tap('swapNext');
        h.run(30);
      }
      h.tap('draw');
      h.run(100);
      h.tap('draw');
      h.run(120);
      const md = h.weapons.current.model;
      const p = md.node.position;
      const q = md.node.rotationQuaternion!;
      expect(md.slot).toBe(want[gun]!.slot);
      expect((md.node.parent as { name: string }).name).toBe(`n3-${want[gun]!.parent}`);
      const got = [p.x, p.y, p.z, q.x, q.y, q.z, q.w];
      for (let k = 0; k < 7; k++) expect(got[k]!).toBeCloseTo(want[gun]!.trs[k]!, 5);
      h.dispose();
    }
  });
});

/** Frames until the weapons' draw phase is `phase` (at most `max`). */
function framesTo(h: DrawHarness, phase: number, max = 300): number {
  for (let n = 1; n <= max; n++) if (h.step().phase === phase) return n;
  return max + 1;
}

describe('gameplay: what the longer draw and holster gate (anim-natural N3, step 4)', () => {
  it('X draws in the draw time and holsters in the holster time, per class', async () => {
    for (const gun of ['rifle', 'pistol'] as const) {
      const h = await drawHarness();
      h.run(40);
      if (gun === 'pistol') {
        h.tap('swapNext');
        h.run(30);
      }
      h.tap('draw');
      const draw = framesTo(h, 2) * DT;
      h.run(40);
      h.tap('draw');
      const hol = framesTo(h, 0) * DT;
      h.dispose();
      expect(draw, `${gun} draw`).toBeCloseTo(gun === 'pistol' ? DRAW_TIME_SIDEARM : DRAW_TIME_PRIMARY, 1);
      expect(hol, `${gun} holster`).toBeCloseTo(gun === 'pistol' ? HOLSTER_TIME_SIDEARM : HOLSTER_TIME_PRIMARY, 1);
    }
  });

  it("a traversal or busy move holsters in G2's 0.15 s, not the deliberate holster", async () => {
    const h = await drawHarness();
    h.run(40);
    h.tap('draw');
    h.run(100);
    h.suspend(true);
    const t = framesTo(h, 0) * DT;
    h.dispose();
    expect(t).toBeLessThanOrEqual(HOLSTER_TIME_MOVE + 2 * DT);
  });

  it('RT pressed during the holster (0.2 s after X) is kept: the holster finishes as a busy move, the strike starts at the slot', async () => {
    // (anim-natural N3 fix, check finding 1: armed only when holstered, the press made during the 0.9-1.0 s holster was
    // dropped) GameState's order per step: the trigger, the strike, then the weapons
    for (const gun of ['rifle', 'pistol'] as const) {
      const hol = gun === 'pistol' ? HOLSTER_TIME_SIDEARM : HOLSTER_TIME_PRIMARY;
      for (const kind of ['tap', 'hold'] as const) {
        const h = await drawHarness();
        h.run(40);
        if (gun === 'pistol') {
          h.tap('swapNext');
          h.run(30);
        }
        h.tap('draw');
        h.run(100);
        const trig = new StrikeTrigger();
        const press = Math.round(0.2 / DT);
        const release = kind === 'tap' ? press + 3 : 1e9;
        h.tap('draw');
        let phase0 = -1;
        let at = -1;
        let res: 'tap' | 'hold' | null = null;
        let pend = false;
        for (let k = 0; k < 120; k++) {
          const ph = h.weapons.drawPhase;
          trig.update(k >= press && k < release, DT, ph, h.stance.base === 'holstered', false);
          h.weapons.strikePending = trig.pending;
          if (k === press + 1) pend = trig.pending;
          const r = trig.strike(ph);
          if (ph === 0 && phase0 < 0) phase0 = k;
          if (r !== null && at < 0) [at, res] = [k, r];
          h.step();
        }
        h.dispose();
        const name = `${gun} ${kind}`;
        expect(pend, `${name}: waiting on the holster`).toBe(true);
        // the rest of the holster runs at the busy move's pace: (1 - 0.2 / holster time) x HOLSTER_TIME_MOVE after the press,
        // plus the ease onto it (HOLSTER_EASE 0.04 s: switched in a frame, the gun jumped 8 cm)
        expect((phase0 - press) * DT, `${name}: holstered after the press`).toBeLessThanOrEqual((1 - 0.2 / hol) * HOLSTER_TIME_MOVE + 0.1);
        expect(phase0 * DT, `${name}: holstered`).toBeLessThan(hol - 0.5);
        // decided from the press: a tap (let go before the slot) starts as the gun is in its slot; a hold once held
        // STANCE.rtHold from the press (after the slot here)
        expect(res, name).toBe(kind);
        if (kind === 'tap') expect(at, `${name}: starts at the slot`).toBe(phase0);
        else {
          expect(at, `${name}: not before the slot`).toBeGreaterThanOrEqual(phase0);
          expect(Math.abs(at - press - STANCE.rtHold / DT), `${name}: at the hold time from the press`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('the aim camera from low ready keeps its pre-N3 blend; a draw from holstered blends with the draw', async () => {
    const h = await drawHarness();
    h.run(40);
    h.hold('ads', true);
    // the LT sling draw from holstered: 0.9 x what is left of its 1.5 s, never under the aim's own blend, with no jump
    // (anim-natural N3 fix, check finding 6: 1.35 s -> 0.27 s in a frame as the draw ended, the dolly sped up mid-way)
    h.step();
    const t0 = h.adsInTime();
    expect(t0).toBeLessThanOrEqual(0.9 * DRAW_TIME_PRIMARY * STANCE.slingDrawLong + 1e-9);
    expect(t0).toBeGreaterThan(0.9 * (DRAW_TIME_PRIMARY * STANCE.slingDrawLong - 2 * DT));
    let prev = t0;
    let dmax = 0;
    for (let k = 0; k < 120; k++) {
      h.step();
      dmax = Math.max(dmax, Math.abs(h.adsInTime() - prev));
      prev = h.adsInTime();
    }
    expect(dmax).toBeLessThan(0.03);
    expect(h.adsInTime()).toBeCloseTo(0.9 * AIM_IN_PRIMARY, 6);
    // LT during an X draw: the aim's own blend at once (was 0.9 x the 1.1 s draw until drawn, then 0.27 s)
    h.hold('ads', false);
    h.tap('draw');
    h.run(120);
    h.tap('draw');
    h.run(10);
    h.hold('ads', true);
    h.step();
    expect(h.weapons.drawPhase).toBe(1);
    expect(h.adsInTime()).toBeCloseTo(0.9 * AIM_IN_PRIMARY, 6);
    h.dispose();
  });
});
