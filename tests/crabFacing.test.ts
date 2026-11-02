/**
 * (anim-natural-n2 A11) The anti-crab facing frame (src/anim/audit/crabFacing.ts): the gated planted-foot track and
 * knee-out read through the hip midpoint along the root's right axis, so the body motion layer's added hip yaw does not
 * rotate the measuring line. Unit checks of the frame, then the gated rows on a headless Wren rig (operatorRig, 60 Hz,
 * sim time) against the audit limits (src/anim/audit/limits.ts), widened where e2e-anim widens them for the Body base (A12):
 * every gated crab row passes in the facing frame.
 * CRABF_PRINT=1 prints the table (facing and pelvis frame).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CharacterRig, RigPose } from '../src/player/characterRig';
import { facingHips } from '../src/anim/audit/crabFacing';
import * as M from '../src/anim/audit/metrics';
import * as L from '../src/anim/audit/limits';

describe('crab facing frame: the synthetic hips', () => {
  it('yaw 0: the hip axis is +x through the hip midpoint, the horizontal hip width kept', () => {
    // a hip line yawed 10 deg about its midpoint (1, 0.9, 2), 17 cm wide
    const a = (10 * Math.PI) / 180;
    const hw = 0.085;
    const hipL = [1 - hw * Math.cos(a), 0.9, 2 + hw * Math.sin(a)];
    const hipR = [1 + hw * Math.cos(a), 0.95, 2 - hw * Math.sin(a)];
    const f = facingHips(hipL, hipR, [0]);
    expect(f.hipL[0]).toBeCloseTo(1 - hw, 9);
    expect(f.hipR[0]).toBeCloseTo(1 + hw, 9);
    expect(f.hipL[2]).toBeCloseTo(2, 9);
    expect(f.hipR[2]).toBeCloseTo(2, 9);
    expect(f.hipL[1]).toBeCloseTo(0.925, 9);
  });
  it('the root yaw turns the axis as Babylon does (local +x -> (cos, 0, -sin))', () => {
    const y = Math.PI / 2;
    const f = facingHips([0, 0, 0], [0.2, 0, 0], [y]);
    expect(f.hipR[0]! - f.hipL[0]!).toBeCloseTo(0, 9);
    expect(f.hipR[2]! - f.hipL[2]!).toBeCloseTo(-0.2, 9);
  });
});

/** The crab limits a row reads (the fields this test asserts, plus the ones e2e-anim spreads in). */
interface Ranges { readonly kneeSep: { readonly min: number; readonly max: number }; readonly trackHalf: number; readonly kneeBow: number; readonly elbowWing: number }
/**
 * (A12, master 4.54.1 merge) e2e-anim's Body tune tables (master anim-bake-targets: Michael's 2026-10-22 Body base puts
 * the feet near one line, which widens some rows' knee-out), read from scripts/e2e-anim.mjs itself so this test and
 * e2e-anim gate a row on the same limits: the object literal after `const <name> = `, evaluated with the audit limits
 * (`L`, `RUN_STAND` = L.crabRanges(false)) as the script does.
 */
function e2eTable(name: string): Record<string, Partial<Ranges>> {
  const src = readFileSync('scripts/e2e-anim.mjs', 'utf8');
  const at = src.indexOf(`const ${name} = {`);
  if (at < 0) throw new Error(`scripts/e2e-anim.mjs: no table ${name}`);
  const open = src.indexOf('{', at);
  let depth = 0;
  let end = open;
  for (; end < src.length; end++) {
    if (src[end] === '{') depth++;
    else if (src[end] === '}' && --depth === 0) break;
  }
  const make = new Function('L', 'RUN_STAND', `return (${src.slice(open, end + 1)});`) as (l: typeof L, r: Ranges) => Record<string, Partial<Ranges>>;
  return make(L, L.crabRanges(false));
}
const BODY_GAIT = e2eTable('BODY_GAIT');
const BODY_STATE = e2eTable('BODY_STATE');
const BODY_DRAWN = e2eTable('BODY_DRAWN');

interface Row { id: string; speed: number; crouch?: number; armed?: boolean; aim?: number; dir?: 'side' | 'back'; yaw?: number; ranges: Ranges }
/**
 * The gated rows CHECK-2 finding 1 lists (game speeds), plus the aimed glide and the idle (the frame must not hurt them).
 * (A12) The game (Body base + layer) against e2e-anim's limits for the same row: the walk its walk gait row
 * (BODY_GAIT.walk), the 2.1 m/s walk its speed-3 straight sub-state (BODY_STATE.straight), the jog BODY_GAIT.jog, the low
 * ready walk / jog the rifle's (BODY_DRAWN), the idle its idle sub-state (BODY_STATE.idle); every other row keeps the
 * audit limits (knee-out 3 cm).
 */
const ROWS: Row[] = [
  { id: 'walk', speed: 1.4, ranges: { ...L.CRAB, ...BODY_GAIT.walk } },
  { id: 'walk yaw 0.7', speed: 1.4, yaw: 0.7, ranges: { ...L.CRAB, ...BODY_GAIT.walk } },
  { id: 'walk 2.1', speed: 2.1, ranges: { ...L.CRAB, ...BODY_STATE.straight } },
  { id: 'jog', speed: 3.0, ranges: { ...L.CRAB, ...BODY_GAIT.jog } },
  { id: 'crouch 1.7', speed: 1.7, crouch: 1, ranges: L.CRAB_CROUCH },
  { id: 'crouch 2.15', speed: 2.15, crouch: 1, ranges: L.CRAB_CROUCH },
  { id: 'crouch run 2.6', speed: 2.6, crouch: 1, ranges: L.CRAB_CROUCH },
  { id: 'sneak 0.85', speed: 0.85, crouch: 1, ranges: L.CRAB_CROUCH },
  { id: 'sneak 1.1', speed: 1.1, crouch: 1, ranges: L.CRAB_CROUCH },
  { id: 'low ready walk', speed: 1.4, armed: true, ranges: { ...L.crabDrawnRanges('readyWalk'), ...BODY_DRAWN['rifle readyWalk'] } },
  { id: 'low ready jog', speed: 3.0, armed: true, ranges: { ...L.crabDrawnRanges('readyJog'), ...BODY_DRAWN['rifle readyJog'] } },
  { id: 'crouched ready walk', speed: 1.7, crouch: 1, armed: true, ranges: L.CRAB_CROUCH },
  { id: 'aim fwd 1.4', speed: 1.4, armed: true, aim: 1, ranges: L.CRAB },
  { id: 'aim side 0.7', speed: 0.7, armed: true, aim: 1, dir: 'side', ranges: L.CRAB_STRAFE },
  { id: 'aim back 1.05', speed: 1.05, armed: true, aim: 1, dir: 'back', ranges: L.CRAB },
  { id: 'idle', speed: 0, ranges: { ...L.CRAB_IDLE, ...BODY_STATE.idle } },
  // the run reads against e2e-anim's RUN_TUNE (its track 16 cm, knee-out 9 cm): report-only here
  { id: 'run', speed: 4.0, ranges: L.CRAB },
];
/** Rows whose track is not asserted (CRAB_DRAWN_CHECKS.aimFwd: report-only). */
const TRACK_REPORT_ONLY = new Set(['aim fwd 1.4', 'run']);
const REPORT_ONLY = new Set(['run']);
/** (e2e-anim low ready jog elbows) Rows whose elbow wing is asserted: e2e-anim's CRAB_DRAWN_CHECKS 'elbows' (readyWalk /
 *  readyJog, the rifle) at their limit; the others report only. */
const WING_GATED = new Set(['low ready walk', 'low ready jog']);

interface Out { latCm: number; trackF: [number, number]; bowF: number; track: [number, number]; bow: number; trackPass: boolean; bowPass: boolean; wing: number; wingPass: boolean }

async function measure(): Promise<Record<string, Out>> {
  const DT = 1 / 60;
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/player/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
  const { WEAPONS } = await import('../src/weapons/weaponDefs');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const make = (a: Parameters<typeof lib.instance>[0], b: string, c?: Parameters<typeof lib.instance>[2]) => lib.instance(a, b, c);
  const res: Record<string, Out> = {};
  const random = Math.random;
  let seed = 12345;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    for (const sc of ROWS) {
      seed = 12345;
      const op = operatorRig(scene, make, defaultLook(), 'm');
      const rig = op.rig as CharacterRig & { carrier: boolean };
      if (sc.armed) new WeaponModel(scene, lib, WEAPONS.rifle, DEFAULT_WEAPON_COLORS, rig.root).hold(rig);
      rig.carrier = true;
      const p: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' };
      const yaw = sc.yaw ?? 0;
      const lx = sc.dir === 'side' ? 1 : 0;
      const lz = sc.dir === 'side' ? 0 : sc.dir === 'back' ? -1 : 1;
      // local (lx, lz) -> world: x = lx cos + lz sin, z = -lx sin + lz cos (Babylon rotation.y)
      const wx = lx * Math.cos(yaw) + lz * Math.sin(yaw);
      const wz = -lx * Math.sin(yaw) + lz * Math.cos(yaw);
      const J = ['hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR'] as const;
      const rec: Record<string, number[]> = Object.fromEntries(J.map((j) => [j, []]));
      const cL: number[] = [];
      const cR: number[] = [];
      const yw: number[] = [];
      let latLo = Infinity;
      let latHi = -Infinity;
      const warm = 2;
      const N = Math.round((warm + 4) * 60);
      for (let k = 0; k < N; k++) {
        rig.root.rotation.y = yaw;
        rig.root.position.x += wx * sc.speed * DT;
        rig.root.position.z += wz * sc.speed * DT;
        Object.assign(p, { speed: sc.speed, localX: sc.speed > 0 ? lx : 0, localZ: sc.speed > 0 ? lz : 0, crouch: sc.crouch ?? 0, armed: !!sc.armed, aim: sc.aim ?? 0, stride: (sc.aim ?? 0) > 0.5 ? 'velocity' : 'facing', weight: 1, yawRate: 0 });
        rig.animate(DT, p);
        if (k * DT < warm) continue;
        rig.root.computeWorldMatrix(true);
        for (const j of J) {
          const n = (rig as unknown as Record<string, { computeWorldMatrix(f: boolean): unknown; getAbsolutePosition(): { x: number; y: number; z: number } }>)[j]!;
          n.computeWorldMatrix(true);
          const v = n.getAbsolutePosition();
          rec[j]!.push(v.x, v.y, v.z);
        }
        cL.push(rig.planner.L.contact ? 1 : 0);
        cR.push(rig.planner.R.contact ? 1 : 0);
        yw.push(rig.root.rotation.y);
        rig.hips.computeWorldMatrix(true);
        const hp = rig.hips.getAbsolutePosition();
        const lat = (hp.x - rig.root.position.x) * Math.cos(yaw) - (hp.z - rig.root.position.z) * Math.sin(yaw);
        latLo = Math.min(latLo, lat);
        latHi = Math.max(latHi, lat);
      }
      const C = sc.ranges;
      const anyPlant = cL.some(Boolean) || cR.some(Boolean);
      const f = facingHips(rec.hipL!, rec.hipR!, yw);
      const trackF = M.footTrack(f.hipL, f.hipR, rec.ankleL!, rec.ankleR!, C.trackHalf, anyPlant ? cL : undefined, anyPlant ? cR : undefined);
      const bowF = M.kneeBow(f.hipL, f.hipR, rec.kneeL!, rec.kneeR!, rec.ankleL!, rec.ankleR!, C.kneeBow);
      const track = M.footTrack(rec.hipL!, rec.hipR!, rec.ankleL!, rec.ankleR!, C.trackHalf, anyPlant ? cL : undefined, anyPlant ? cR : undefined);
      const bow = M.kneeBow(rec.hipL!, rec.hipR!, rec.kneeL!, rec.kneeR!, rec.ankleL!, rec.ankleR!, C.kneeBow);
      // (e2e-anim crabRow) the elbows outside the shoulders, on the shoulder line
      const wing = M.elbowWing(rec.shoulderL!, rec.shoulderR!, rec.elbowL!, rec.elbowR!, C.elbowWing);
      const cm = (x: number) => +(x * 100).toFixed(1);
      res[sc.id] = { latCm: cm(latHi - latLo), trackF: [cm(trackF.min), cm(trackF.max)], bowF: cm(bowF.max), track: [cm(track.min), cm(track.max)], bow: cm(bow.max), trackPass: trackF.pass, bowPass: bowF.pass, wing: +(wing.max * 100).toFixed(2), wingPass: wing.pass };
      op.figure.dispose();
      rig.dispose();
    }
  } finally {
    Math.random = random;
    scene.dispose();
  }
  return res;
}

describe('crab facing frame: the gated rows on a headless Wren rig', () => {
  it('every gated row keeps its track and knee-out within the e2e-anim limits in the facing frame', async () => {
    // (A12) the tables e2e-anim reads are found (a renamed table fails here, not as a silent 3 cm)
    for (const t of [BODY_GAIT.walk, BODY_GAIT.jog, BODY_STATE.straight, BODY_STATE.idle, BODY_DRAWN['rifle readyWalk'], BODY_DRAWN['rifle readyJog']]) expect(t?.kneeBow).toBeTypeOf('number');
    const r = await measure();
    if (process.env.CRABF_PRINT) {
      for (const sc of ROWS) {
        const x = r[sc.id]!;
        console.info(`${sc.id.padEnd(20)} lateral ${x.latCm} cm, facing track ${x.trackF.join(' / ')} cm (<= ${sc.ranges.trackHalf * 100}), knee-out ${x.bowF} cm (<= ${sc.ranges.kneeBow * 100}) | pelvis frame track ${x.track.join(' / ')}, knee-out ${x.bow} | elbows out ${x.wing} cm (<= ${+(sc.ranges.elbowWing * 100).toFixed(1)}${WING_GATED.has(sc.id) ? '' : ', report-only'})`);
      }
    }
    for (const sc of ROWS) {
      const x = r[sc.id]!;
      if (!TRACK_REPORT_ONLY.has(sc.id)) expect(x.trackPass, `${sc.id}: facing track ${x.trackF.join(' / ')} cm`).toBe(true);
      if (!REPORT_ONLY.has(sc.id)) expect(x.bowPass, `${sc.id}: facing knee-out ${x.bowF} cm`).toBe(true);
      if (WING_GATED.has(sc.id)) expect(x.wingPass, `${sc.id}: elbows ${x.wing} cm outside the shoulder`).toBe(true);
    }
    // the frame follows the root's yaw: a walk facing 0.7 rad reads as the walk facing 0
    expect(Math.abs(r['walk yaw 0.7']!.trackF[1] - r.walk!.trackF[1])).toBeLessThanOrEqual(0.2);
    expect(Math.abs(r['walk yaw 0.7']!.bowF - r.walk!.bowF)).toBeLessThanOrEqual(0.2);
  }, 900000);
});
