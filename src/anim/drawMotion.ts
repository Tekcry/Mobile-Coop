/**
 * (anim-natural N3) The draw / holster / swap motion: one continuous move in believable phases (pure, Babylon-free,
 * unit-tested in `tests/drawMotion.test.ts`; Michael 2026-10-22: "Pulling any weapons out also should be believable, and
 * there's a random stop animation when taking out the weapons before it ends up in its final position").
 *
 * The incoming gun's part of the swap clip runs from the holstered beat (`DRAW_BEAT`, the clip time where a draw from
 * holstered enters) to the clip's end, as the travel's `u` 0..1 (`WeaponModel.travel`):
 * - reach `0 .. reach`: the trigger hand goes to the gun on the sling / in the holster (the rig blends its IK onto the
 *   gun's grip by `reachWeight`, eased; the chest turns toward it with the swap clip's keys, the shoulder protracts);
 * - grip: the fingers close over the last part of the reach (`CharacterRig.travelReach`), and the gun starts to leave at
 *   `reach x grip` (before the reach ends: the hand slows onto the grip and carries on with the gun, never stopping);
 * - lift / clear and present: the gun along its path (out of the holster / off the back plate by TRAVEL_OUT + `out`,
 *   through TRAVEL_VIA + `via`) to the low ready or the aim pocket by `drawEase`, eased in;
 * - settle: `drawEase` runs past the pocket (about 2.4 % of the path at `settle` 5) and back, so the gun arrives with
 *   its momentum and settles instead of stopping dead;
 * - hand-over: from `handover` of the lift / present on, the swap clip's reach pose (chest turn, the clip's hands and
 *   weapon pitch, the support hand off the gun) hands over to the ready / aim pose (`drawRelease`), so the pocket the gun
 *   arrives in IS the final pose: nothing moves again when the swap ends (the old "random stop": the gun arrived at the
 *   clip's level pocket at 0.8, held still to 1.0, then pitched into the low ready as the overlay faded out).
 *
 * Every value is a tuner slider in the Draw section (`weapons/drawTune.ts`, groups `draw.rifle` / `draw.pistol`) that
 * bakes into this table. `DRAW_CUR` holds the values in use (the table plus the local player's sliders), written by
 * `drawTuneApply`; nothing here allocates.
 */

export type DrawClass = 'rifle' | 'pistol';

export interface DrawMotion {
  /** Share of the incoming travel (the holstered beat to the end) the hand takes to reach the gun. */
  reach: number;
  /** Where in the reach (share of it) the gun starts to leave: below 1 the lift begins as the fingers close. */
  grip: number;
  /** Share of the lift / present at which the reach pose starts handing over to the ready / aim pose. */
  handover: number;
  /** The settle: `drawEase`'s overshoot shape (3 none, 4 about 0.5 %, 5 about 2.4 %, 6 about 5.5 % of the path). */
  settle: number;
  /** Lift / clear: added to TRAVEL_OUT at the slot end (chest frame x right, y up, z forward, m). */
  out: [number, number, number];
  /** Present: added to the path's waypoint TRAVEL_VIA (chest frame, m). */
  via: [number, number, number];
}

/** The tuned draw motion per class (identity of the Draw sliders). Starting values (N3). */
export const DRAW_MOTION: Record<DrawClass, DrawMotion> = {
  rifle: { reach: 0.38, grip: 0.8, handover: 0.35, settle: 5, out: [0, 0, 0], via: [0, 0, 0] },
  pistol: { reach: 0.34, grip: 0.75, handover: 0.3, settle: 5, out: [0, 0, 0], via: [0, 0, 0] },
};

const copy = (m: DrawMotion): DrawMotion => ({ ...m, out: [m.out[0], m.out[1], m.out[2]], via: [m.via[0], m.via[1], m.via[2]] });
/** The values in use (the table plus the local player's Draw sliders; `drawTuneApply` writes them each step). */
export const DRAW_CUR: Record<DrawClass, DrawMotion> = { rifle: copy(DRAW_MOTION.rifle), pistol: copy(DRAW_MOTION.pistol) };

/** The swap clip's holstered beat: a draw from holstered enters the clip here, and the incoming travel starts here. */
export const DRAW_BEAT = 0.38;

/** The draw class of a weapon class (the pistol, every other gun the long-gun motion). */
export function drawClass(cls: string): DrawClass {
  return cls === 'pistol' ? 'pistol' : 'rifle';
}

const sat = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x: number): number => {
  const c = sat(x);
  return c * c * (3 - 2 * c);
};

/** The hand's IK weight onto the gun's grip at the incoming travel's `u` (eased over the reach). */
export function reachWeight(u: number, m: DrawMotion): number {
  return m.reach <= 1e-4 ? 1 : smooth(u / m.reach);
}

/** The travel's `u` at which the gun leaves its slot (the lift's start). */
export function liftStart(m: DrawMotion): number {
  return Math.max(0, Math.min(0.95, m.reach * m.grip));
}

/**
 * The lift / present ease at `k` 0..1 (from the lift's start to the end): 0 with no speed at 0, 1 with no speed at 1,
 * eased in, and past 1 before it settles back when `settle` > 3 (1 - (1-k)^2 (1 + 2k - settle k^2); 0 is the
 * smoothstep).
 */
export function drawEase(k: number, settle: number): number {
  const c = sat(k);
  const a = 1 - c;
  return 1 - a * a * (1 + 2 * c - settle * c * c);
}

/** The path parameter of the incoming travel at `u` (0 in the slot until the lift starts); `settle` the ease's shape. */
export function drawPath(u: number, m: DrawMotion, settle = m.settle): number {
  const s = liftStart(m);
  return drawEase((u - s) / (1 - s), settle);
}

/**
 * The settle's shape for a gun raised `aim` 0..1 toward the aim: the overshoot fades out as the gun comes up to the
 * cheek (the shoulder and the sight stop it; past the aim pocket it went into the face).
 */
export function settleAt(settle: number, aim: number): number {
  const a = aim < 0 ? 0 : aim > 1 ? 1 : aim;
  return settle > 3 ? 3 + (settle - 3) * (1 - a) : settle;
}

/** The `k` at which `drawEase` first reaches 1 (the gun at the pocket before the settle; 1 without overshoot). */
export function drawArrive(settle: number): number {
  return settle > 3 ? (1 + Math.sqrt(1 + settle)) / settle : 1;
}

/**
 * The hand-over ends at this share of the lift / present (the pocket is still for the rest of the settle, so the gun
 * settles onto a still target and the hand-off to the hold at the clip's end, a frame behind the pocket, moves nothing).
 */
export const RELEASE_END = 0.85;

/**
 * The swap clip's weight multiplier at clip time `st` for the incoming gun (1 before the hand-over, easing to 0 at
 * RELEASE_END): its chest turn, hands and weapon pitch hand over to the ready / aim pose while the gun presents.
 */
export function drawRelease(st: number, m: DrawMotion, handover = m.handover): number {
  if (st <= DRAW_BEAT) return 1;
  const u = (st - DRAW_BEAT) / (1 - DRAW_BEAT);
  const s = liftStart(m);
  const h = sat(handover);
  const u0 = s + (1 - s) * Math.min(h, RELEASE_END - 0.05);
  const u1 = s + (1 - s) * RELEASE_END;
  return 1 - smooth((u - u0) / (u1 - u0));
}

/** The fingers' closure on the grip at reach weight `w` (they close over its last part). */
export function gripClose(w: number): number {
  return smooth((w - 0.55) / 0.45);
}
