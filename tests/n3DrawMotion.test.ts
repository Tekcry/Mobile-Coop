// (anim-natural N3) The draw / holster / swap motion: the pure phase curves (anim/drawMotion.ts), the Draw tuner section,
// and the real rig on a NullEngine (Wren, the real PlayerWeapons, WeaponStance and WeaponCarry, tests/helpers/drawHarness):
// one continuous move with no stop between its start and its end, nothing moving again once it is over (the "random
// stop": the gun stopped at the swap clip's level pocket, then pitched into the low ready as the overlay faded), and the
// same final poses as before N3 (low ready, aim and holstered: chest-frame numbers captured on master ea3399ed).
import { describe, expect, it } from 'vitest';
import { DRAW_CUR, DRAW_MOTION, drawArrive, drawEase, drawPath, drawRelease, gripClose, liftStart, reachWeight, RELEASE_END, settleAt, DRAW_BEAT } from '../src/anim/drawMotion';
import { DRAW_SECTION, DRAW_TIME_MUL, drawTuneApply } from '../src/weapons/drawTune';
import { TUNE_FLAGS } from '../src/anim/tuneRegistry';
import { DRAW_TIME_PRIMARY, DRAW_TIME_SIDEARM, HOLSTER_TIME_PRIMARY, HOLSTER_TIME_SIDEARM } from '../src/weapons/drawState';
import { STANCE } from '../src/player/weaponStance';
import { DT, type DrawSample } from './helpers/drawHarness';
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
});

describe('the Draw tuner section', () => {
  it('rifle and pistol groups; identity is the table; a slider moves the values in use; the bypass reads identity', () => {
    expect(DRAW_SECTION.groups).toEqual(['draw.rifle', 'draw.pistol']);
    for (const t of DRAW_SECTION.tunables) expect(t.def).toBe(t.kind === 'mul' ? 1 : 0);
    drawTuneApply('rifle');
    expect(DRAW_CUR.rifle).toEqual(DRAW_MOTION.rifle);
    expect(DRAW_CUR.pistol).toEqual(DRAW_MOTION.pistol);
    const v = DRAW_SECTION.values['draw.pistol']!;
    v.reachAdd = 0.1;
    v.viaY = 5;
    v.drawTimeMul = 1.5;
    try {
      drawTuneApply('pistol');
      expect(DRAW_CUR.pistol.reach).toBeCloseTo(DRAW_MOTION.pistol.reach + 0.1, 12);
      expect(DRAW_CUR.pistol.via[1]).toBeCloseTo(DRAW_MOTION.pistol.via[1] + 0.05, 12);
      expect(DRAW_TIME_MUL.pistol.draw).toBe(1.5);
      expect(DRAW_CUR.rifle).toEqual(DRAW_MOTION.rifle);
      TUNE_FLAGS.bypass = true;
      drawTuneApply('pistol');
      expect(DRAW_CUR.pistol).toEqual(DRAW_MOTION.pistol);
      expect(DRAW_TIME_MUL.pistol.draw).toBe(1);
    } finally {
      TUNE_FLAGS.bypass = false;
      v.reachAdd = 0;
      v.viaY = 0;
      v.drawTimeMul = 1;
      drawTuneApply(null);
    }
  });

  it('the times: rifle 0.55 s to low ready (LT sling draw still 0.75 s), pistol 0.5 s; holster 0.4 / 0.35 s', () => {
    expect(DRAW_TIME_PRIMARY).toBe(0.55);
    expect(DRAW_TIME_PRIMARY * STANCE.slingDrawLong).toBeCloseTo(0.75, 2);
    expect(DRAW_TIME_SIDEARM).toBe(0.5);
    expect(HOLSTER_TIME_PRIMARY).toBe(0.4);
    expect(HOLSTER_TIME_SIDEARM).toBe(0.35);
  });
});

/** Speed (m/s) of a sample's point (`w` wrist, `g` grip, `m` muzzle) into frame i (0 across a change of gun). */
function speed(s: readonly DrawSample[], i: number, k: 'w' | 'g' | 'm'): number {
  const a = s[i - 1]!;
  const b = s[i]!;
  if (k !== 'w' && a.gun !== b.gun) return 0;
  const r = a as unknown as Record<string, number>;
  const q = b as unknown as Record<string, number>;
  return Math.sqrt((q[`${k}x`]! - r[`${k}x`]!) ** 2 + (q[`${k}y`]! - r[`${k}y`]!) ** 2 + (q[`${k}z`]! - r[`${k}z`]!) ** 2) / DT;
}

/** Final pose on master ea3399ed after 200 frames (chest frame, m): grip x y z, muzzle x y z. */
const MASTER_FINAL: Record<string, readonly number[]> = {
  'draw rifle (X, low ready)': [0.1188, 0.0141, 0.2528, -0.2012, -0.2528, 0.7046],
  'draw rifle (LT, sling draw to aim)': [0.1361, 0.3057, 0.2167, 0.0187, 0.5773, 0.7554],
  'draw pistol (X, low ready)': [-0.0237, -0.2376, 0.3189, -0.0324, -0.4262, 0.5446],
  'draw pistol (LT, to aim)': [0.0526, 0.408, 0.2936, -0.0013, 0.5841, 0.5231],
  'holster rifle': [0.12, 0.0, -0.1189, -0.3133, -0.4359, -0.1189],
  'holster pistol': [0.2127, -0.4134, -0.0299, 0.1992, -0.6961, 0.0507],
  'swap rifle to pistol': [-0.0237, -0.237, 0.3188, -0.0324, -0.4284, 0.5421],
  'swap pistol to rifle': [0.1175, 0.0145, 0.2508, -0.2025, -0.2588, 0.6987],
  'low ready to aim (rifle)': [0.1361, 0.3055, 0.2168, 0.0186, 0.5761, 0.7559],
};

describe('the real rig: draw, holster, swap and low ready to aim are one continuous move (NullEngine)', () => {
  for (const sc of DRAW_SCENARIOS) {
    it(sc.name, async () => {
      const s = await runScenario(sc, 200);
      let end = -1;
      for (let i = s.length - 1; i >= 0; i--)
        if (s[i]!.swap >= 0) {
          end = i;
          break;
        }
      const c = (i: number): number => Math.max(speed(s, i, 'w'), speed(s, i, 'g'), speed(s, i, 'm'));
      if (end > 0) {
        // no stop between the start and the end: never 3 frames (50 ms) in a row with the hand and the gun both under
        // 0.15 m/s, from the first motion to the last few frames (the settle coming to rest)
        let first = 1;
        while (first < s.length && c(first) < 0.3) first++;
        let run = 0;
        let worst = 0;
        let at = -1;
        for (let i = first; i <= end - 4; i++) {
          if (c(i) < 0.15) {
            run++;
            if (run > worst) [worst, at] = [run, i];
          } else run = 0;
        }
        expect(worst, `${sc.name}: a stop of ${worst} frames at ${((at * DT) * 1000).toFixed(0)} ms`).toBeLessThan(3);
        // nothing moves again once it is over (a draw / swap: the gun in its final pose; master: 3-3.8 m/s at the muzzle
        // as the overlay faded); a holster's body carriage settles after it, so only the draws and swaps
        if (!sc.name.startsWith('holster')) {
          let post = 0;
          for (let i = end + 2; i < Math.min(s.length, end + 60); i++) post = Math.max(post, speed(s, i, 'm'));
          expect(post, `${sc.name}: muzzle ${post.toFixed(2)} m/s after the end`).toBeLessThan(0.8);
        }
      }
      // the final pose as on master (chest frame): the low ready, the aim, the holstered gun unchanged
      const f = s[s.length - 1]!;
      const m = MASTER_FINAL[sc.name]!;
      const tolG = sc.name === 'holster pistol' ? 0.005 : 0.003;
      expect(Math.hypot(f.cgx - m[0]!, f.cgy - m[1]!, f.cgz - m[2]!), `${sc.name}: final grip`).toBeLessThan(tolG);
      expect(Math.hypot(f.cmx - m[3]!, f.cmy - m[4]!, f.cmz - m[5]!), `${sc.name}: final muzzle`).toBeLessThan(2 * tolG);
    });
  }

  it('holstered, the gun sits in its slot exactly as before (local to its mount)', async () => {
    const { drawHarness } = await import('./helpers/drawHarness');
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
      h.run(70);
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
