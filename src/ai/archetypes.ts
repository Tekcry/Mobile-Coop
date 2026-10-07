/**
 * Enemy archetype rules (pure, unit-tested): heavy armour by hit direction and its frontal grab immunity, the
 * enforcer's shield arc, the sniper's relocation and glint, the dog's smell, the officer's buff, squad radio
 * checks, and the difficulty tiers.
 */
import { hyp2 } from '../core/mathx';

export const ARCHETYPE = {
  heavy: {
    /** Half-angle (rad) round the facing that counts as "from the front". */
    frontHalf: (75 * Math.PI) / 180,
    /** Damage multipliers: plates in front, the back exposed, the face plate a weak point. */
    frontBody: 0.45,
    backBody: 1.5,
    faceHead: 2.2,
    backHead: 1.2,
  },
  enforcer: {
    /** Shield covers this half-angle (rad) round the facing. */
    shieldHalf: (70 * Math.PI) / 180,
    /** Pushes forward at this speed (m/s) while firing. */
    pushSpeed: 1.1,
  },
  sniper: {
    /** Relocate after this many shots, or this long (s) after the first shot of a position. */
    shotsPerPost: 2,
    postTime: 9,
    /** The scope glints when it points within this half-angle (rad) of the viewer. */
    glintHalf: (14 * Math.PI) / 180,
    /** Laser aim time before a shot (s). */
    laserTime: 1.1,
  },
  dog: {
    /** Smell radius (m) whatever the light; crouched x`crouchMul`; meter rate inside it. */
    smell: 6,
    crouchMul: 0.7,
    smellRate: 0.9,
    /** Distance kept beside the handler while calm (m). */
    heel: 1.3,
  },
  officer: {
    /** Squadmates within this (m) aim better and react faster. */
    buffRadius: 12,
    accuracy: 1.25,
    reaction: 0.7,
    /** A search he leads lasts this much longer. */
    searchMul: 1.5,
  },
  drone: {
    /** Recon drone: orbit radius round its operator (m), height over the floor (m), speed (m/s), hit points. */
    orbit: 7,
    height: 3.4,
    speed: 2.2,
    hp: 25,
    /** Its camera: range (m), cone half-angle (rad), rate x a guard's. */
    range: 16,
    half: (40 * Math.PI) / 180,
    rate: 1.4,
  },
  radio: {
    /** Squad check-in period (s, +- jitter); a missed answer makes the caller search the silent member's post. */
    period: 40,
    jitter: 8,
  },
} as const;

function wrapPi(a: number): number {
  let d = a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Whether a hit travelling along (dx, dz) strikes the front of a character facing `yaw` (the shot comes from
 * within `half` of where it faces). The hit direction points from the shooter to the target.
 */
export function fromFront(yaw: number, dx: number, dz: number, half: number): boolean {
  const l = hyp2(dx, dz);
  if (l < 1e-6) return true;
  // the shooter is where the shot came from: opposite the travel direction
  const toShooter = Math.atan2(-dx, -dz);
  return Math.abs(wrapPi(toShooter - yaw)) <= half;
}

/** Heavy armour: damage multiplier for a hit on `part` travelling along (dx, dz). */
export function heavyMult(yaw: number, dx: number, dz: number, part: 'head' | 'body' | 'legs'): number {
  const H = ARCHETYPE.heavy;
  const front = fromFront(yaw, dx, dz, H.frontHalf);
  if (part === 'head') return front ? H.faceHead : H.backHead;
  return front ? H.frontBody : H.backBody;
}

/** Enforcer shield: a bullet from inside the shield arc is stopped. */
export function shieldBlocks(yaw: number, dx: number, dz: number): boolean {
  return fromFront(yaw, dx, dz, ARCHETYPE.enforcer.shieldHalf);
}

/**
 * Takedowns a victim allows: heavies and enforcers cannot be grabbed from the front (`front` / `side` /
 * `corner` / `overCover` / `window` / `below` are frontal), except a heavy can be struck down lethally.
 * Returns 'ok', 'lethal' (allowed only as a lethal strike), or 'no'.
 */
export function grabRule(kind: string, takedown: string): 'ok' | 'lethal' | 'no' {
  const frontal = takedown !== 'behind' && takedown !== 'above';
  if (!frontal) return 'ok';
  if (kind === 'heavy') return 'lethal';
  if (kind === 'enforcer') return takedown === 'side' ? 'ok' : 'no';
  return 'ok';
}

/** Sniper: time to move to another post. */
export function sniperRelocate(shots: number, sinceFirstShot: number): boolean {
  const S = ARCHETYPE.sniper;
  return shots >= S.shotsPerPost || (shots > 0 && sinceFirstShot >= S.postTime);
}

/**
 * Scope glint seen from a viewer: the sniper's aim (yaw / pitch) points within `glintHalf` of the viewer.
 * Returns 0..1 (1 dead on).
 */
export function glint(aimYaw: number, aimPitch: number, sx: number, sy: number, sz: number, vx: number, vy: number, vz: number): number {
  const dx = vx - sx;
  const dy = vy - sy;
  const dz = vz - sz;
  const d = hyp2(dx, dz);
  const yawTo = Math.atan2(dx, dz);
  const pitchTo = Math.atan2(dy, d);
  const off = hyp2(wrapPi(yawTo - aimYaw), pitchTo - aimPitch);
  const H = ARCHETYPE.sniper.glintHalf;
  return off >= H ? 0 : 1 - off / H;
}

/** Dog: smell meter rate at distance `dist` (no light or line of sight needed). */
export function smellRate(dist: number, crouched: boolean): number {
  const D = ARCHETYPE.dog;
  const r = D.smell * (crouched ? D.crouchMul : 1);
  if (dist >= r) return 0;
  return D.smellRate * (1 - dist / r) * 2;
}

/** Squad radio check: the members that do not answer (down: dead or knocked out). */
export function radioCheck(members: readonly { id: string; up: boolean }[], out: string[]): string[] {
  out.length = 0;
  for (const m of members) if (!m.up) out.push(m.id);
  return out;
}

export type Difficulty = 'rookie' | 'normal' | 'realistic' | 'perfectionist';
export const DIFFICULTIES: readonly Difficulty[] = ['rookie', 'normal', 'realistic', 'perfectionist'];

export interface DifficultyDef {
  label: string;
  damage: number;
  accuracy: number;
  hp: number;
  reward: number;
  /** Sight / smell meter rates. */
  perception: number;
  /** Reaction delays (radio, first shot). */
  reaction: number;
  /** Mark & Execute and the sonar goggles. */
  execute: boolean;
  sonar: boolean;
}

export const DIFFICULTY: Record<Difficulty, DifficultyDef> = {
  rookie: { label: 'Rookie', damage: 0.6, accuracy: 0.7, hp: 0.85, reward: 0.8, perception: 0.7, reaction: 1.35, execute: true, sonar: true },
  normal: { label: 'Normal', damage: 1, accuracy: 1, hp: 1, reward: 1, perception: 1, reaction: 1, execute: true, sonar: true },
  realistic: { label: 'Realistic', damage: 1.6, accuracy: 1.3, hp: 1.15, reward: 1.35, perception: 1.3, reaction: 0.8, execute: true, sonar: true },
  perfectionist: { label: 'Perfectionist', damage: 1.6, accuracy: 1.3, hp: 1.15, reward: 1.6, perception: 1.5, reaction: 0.7, execute: false, sonar: false },
};

/** A stored / received difficulty, including the 1.x names (easy / hard). */
export function parseDifficulty(v: unknown): Difficulty {
  if (v === 'easy') return 'rookie';
  if (v === 'hard') return 'realistic';
  return DIFFICULTIES.includes(v as Difficulty) ? (v as Difficulty) : 'normal';
}
