import '../anim/tune'; // Body, Gun and Camera register first (the panel's section order)
import { registerTuneSection, TUNE_FLAGS, type TuneTunable } from '../anim/tuneRegistry';
import { GEARS, MOVEMENT } from '../config/movement';
import { ATTACH, type AttachKind } from './attach';
import { WALL } from './wallController';

/**
 * (tuner-camera) The tuner's Speed section (registered from its own file through the section registry): multipliers on
 * the local player's movement speeds per state. Identity at default (x1). GAMEPLAY: unlike the other sections these
 * change how far and fast the body moves, so they are a local-only aid: the unit tests, the e2e suites and a co-op host's
 * speed check use the code's defaults until the values are folded into them (the panel says so).
 *
 * Read by the local player's own instances only: `PlayerController` (free movement and the aimed glide), the game's
 * `WallCore` (the wall slide) and the local traversal's `AttachMachine` (ladder, pipe, shimmy, duct crawl). No
 * allocation on those paths. The bypass (TUNE_FLAGS.bypass) reads the base table alone (x1 untuned). (anim-bake-all) A
 * baked value (the base table's `sections.speed`) is a gameplay change, the same as a baked GEARS point.
 */
export const SPEED_GROUPS = ['spd.stand', 'spd.crouch', 'spd.aim', 'spd.wall', 'spd.climb'] as const;
export type SpeedGroup = (typeof SPEED_GROUPS)[number];

const PACE: readonly SpeedGroup[] = ['spd.stand', 'spd.crouch'];
const mul = (id: string, label: string, groups: readonly SpeedGroup[], hook: string): TuneTunable => ({ id, label, kind: 'mul', def: 1, min: 0.3, max: 2, step: 0.01, unit: 'x', groups, hook });

const PACE_IDS = ['creepMul', 'sneakMul', 'walkMul', 'jogMul', 'runMul'] as const;
const PACE_NAMES = ['creep', 'sneak', 'walk', 'jog', 'run'] as const;

export const SPEED_SECTION = registerTuneSection({
  id: 'speed',
  label: 'Speed (gameplay)',
  note: 'Gameplay values, this machine and the local player only: tests and e2e use the defaults until these are folded into them; in co-op the host clamps a tuned speed (the partner sees rubber-banding).',
  groups: SPEED_GROUPS,
  tunables: [
    ...PACE_IDS.map((id, i) => mul(id, `${PACE_NAMES[i]} speed`, PACE, `movement.ts GEARS.stand / crouch[${i}] (the stick curve's ${PACE_NAMES[i]} point; playerController speedTarget)`)),
    mul('glideFwdMul', 'aimed glide forward', ['spd.aim'], 'movement.ts MOVEMENT.adsSpeed / adsCrouchSpeed (forward share of directionMult)'),
    mul('glideStrafeMul', 'aimed glide strafe', ['spd.aim'], 'movement.ts MOVEMENT.strafeMult'),
    mul('glideBackMul', 'aimed glide back', ['spd.aim'], 'movement.ts MOVEMENT.backMult'),
    mul('slideStandMul', 'wall slide standing', ['spd.wall'], 'wallController.ts WALL.slideStand'),
    mul('slideCrouchMul', 'wall slide crouched', ['spd.wall'], 'wallController.ts WALL.slideCrouch'),
    mul('ladderMul', 'ladder', ['spd.climb'], 'attach.ts ATTACH.ladder.speed'),
    mul('pipeMul', 'pipe (up / along)', ['spd.climb'], 'attach.ts ATTACH.pipeV / pipeH.speed'),
    mul('shimmyMul', 'ledge shimmy', ['spd.climb'], 'attach.ts ATTACH.ledge.speed'),
    mul('crawlMul', 'duct crawl', ['spd.climb'], 'attach.ts ATTACH.duct.speed'),
  ],
  select: (s) => speedGroupFor(s.body ?? ''),
  notes: (g, id) => {
    const t = speedToday(g, id);
    return t ? [`today: ${t}`] : [];
  },
});

// (anim-bake-all, BA-A1) the effective values (the base table's `sections.speed` composed with the tuner's, rebuilt by the
// registry on an edit or a load); the bypass reads the base alone (the code defaults). No allocation here.
const V = SPEED_SECTION.eff;
const STAND = V['spd.stand']!;
const CROUCH = V['spd.crouch']!;
const AIM = V['spd.aim']!;
const WALLV = V['spd.wall']!;
const CLIMB = V['spd.climb']!;
const VB = SPEED_SECTION.base;
const STAND_B = VB['spd.stand']!;
const CROUCH_B = VB['spd.crouch']!;
const AIM_B = VB['spd.aim']!;
const WALL_B = VB['spd.wall']!;
const CLIMB_B = VB['spd.climb']!;

/** The speed group for a body group (follow). */
export function speedGroupFor(body: string): SpeedGroup | null {
  switch (body) {
    case '':
      return null;
    case 'aim':
    case 'aimCrouch':
    case 'aimStill':
    case 'aimCrouchMove':
      return 'spd.aim';
    case 'crouchIdle':
    case 'sneak':
    case 'crouchWalk':
    case 'crouchRun':
      return 'spd.crouch';
    case 'wallIdle':
    case 'wallSlide':
    case 'wallPeek':
    case 'wallCrouchIdle':
    case 'wallCrouchSlide':
    case 'wallCrouchPeek':
      return 'spd.wall';
    case 'ladder':
    case 'pipe':
    case 'ledge':
    case 'vent':
    case 'crawl':
    case 'hang':
      return 'spd.climb';
    default:
      return 'spd.stand';
  }
}

/** The value the game uses today under a speed slider (text). */
export function speedToday(group: string, id: string): string {
  const i = (PACE_IDS as readonly string[]).indexOf(id);
  if (i >= 0) return `${(group === 'spd.crouch' ? GEARS.crouch : GEARS.stand)[i]} m/s`;
  const M = MOVEMENT;
  switch (id) {
    case 'glideFwdMul':
      return `${M.adsSpeed} m/s (crouched ${M.adsCrouchSpeed})`;
    case 'glideStrafeMul':
      return `x${M.strafeMult} (${M.adsSpeed * M.strafeMult} m/s)`;
    case 'glideBackMul':
      return `x${M.backMult} (${M.adsSpeed * M.backMult} m/s)`;
    case 'slideStandMul':
      return `${WALL.slideStand} m/s`;
    case 'slideCrouchMul':
      return `${WALL.slideCrouch} m/s`;
    case 'ladderMul':
      return `${Number(ATTACH.ladder.speed.toFixed(3))} m/s`;
    case 'pipeMul':
      return `${ATTACH.pipeV.speed} up / ${ATTACH.pipeH.speed} along m/s`;
    case 'shimmyMul':
      return `${ATTACH.ledge.speed} m/s`;
    case 'crawlMul':
      return `${ATTACH.duct.speed} m/s`;
    default:
      return '';
  }
}

function paceMulAt(vals: Record<string, number>, i: number): number {
  switch (i) {
    case 0:
      return vals.creepMul!;
    case 1:
      return vals.sneakMul!;
    case 2:
      return vals.walkMul!;
    case 3:
      return vals.jogMul!;
    default:
      return vals.runMul!;
  }
}

/**
 * The free-movement speed multiplier at the stick's analogue speed `v` (m/s): the multipliers of the speed curve's
 * points (creep .. run), interpolated between the two points around `v`. Exactly 1 at identity. No allocation.
 */
export function speedPaceMul(v: number, crouched: boolean): number {
  const by = TUNE_FLAGS.bypass;
  const vals = crouched ? (by ? CROUCH_B : CROUCH) : by ? STAND_B : STAND;
  const pts = crouched ? GEARS.crouch : GEARS.stand;
  if (!(v > pts[0])) return vals.creepMul!;
  for (let i = 1; i < pts.length; i++) {
    const b = pts[i]!;
    if (v <= b) {
      const a = pts[i - 1]!;
      const ma = paceMulAt(vals, i - 1);
      const mb = paceMulAt(vals, i);
      return ma === mb ? ma : ma + (mb - ma) * ((v - a) / (b - a));
    }
  }
  return vals.runMul!;
}

/**
 * The aimed glide's multiplier for the local move direction (lx, lz; z forward): the tuned direction weights over the
 * code's (`movement.ts directionMult`). Exactly 1 at identity. No allocation.
 */
export function speedGlideMul(lx: number, lz: number): number {
  const a = TUNE_FLAGS.bypass ? AIM_B : AIM;
  const f = a.glideFwdMul!;
  const s = a.glideStrafeMul!;
  const k = a.glideBackMul!;
  if (f === 1 && s === 1 && k === 1) return 1;
  const M = MOVEMENT;
  const l = Math.sqrt(lx * lx + lz * lz) || 1;
  const x = Math.abs(lx) / l;
  const z = lz / l;
  const fwd = Math.max(0, z);
  const back = Math.max(0, -z);
  const base = fwd + x * M.strafeMult + back * M.backMult;
  return base > 0 ? (fwd * f + x * M.strafeMult * s + back * M.backMult * k) / base : 1;
}

/** The free-movement multiplier for a stance (PlayerController). */
export function speedMoveMul(v: number, stance: 'stand' | 'crouch' | 'ads' | 'adsCrouch', lx: number, lz: number): number {
  return stance === 'stand' || stance === 'crouch' ? speedPaceMul(v, stance === 'crouch') : speedGlideMul(lx, lz);
}

/** The wall slide multiplier (WallCore). */
export function speedWallMul(crouch: boolean): number {
  const w = TUNE_FLAGS.bypass ? WALL_B : WALLV;
  return crouch ? w.slideCrouchMul! : w.slideStandMul!;
}

/** The attach speed multiplier for an anchor kind (AttachMachine). */
export function speedAttachMul(kind: AttachKind | 'none'): number {
  const c = TUNE_FLAGS.bypass ? CLIMB_B : CLIMB;
  switch (kind) {
    case 'ladder':
      return c.ladderMul!;
    case 'pipeV':
    case 'pipeH':
      return c.pipeMul!;
    case 'ledge':
      return c.shimmyMul!;
    case 'duct':
      return c.crawlMul!;
    default:
      return 1;
  }
}
