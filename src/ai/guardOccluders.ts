/**
 * (guard-ai-j16 G1, J16) The guard side's character-occluder shapes (BRIEF A7, A9): one sim capsule per living guard,
 * dog and lying body near a player, written into the Sector Ops contract (`world/charOccluders.ts`) that the meter, the
 * picture's round shadows and the guards' shadow cue all read (G352, bible P1). They replace the interim upright guard
 * capsule (`charOccluderFill.ts` `fillVictims`) once G4a wires `EnemyManager.fillOccluders`.
 *
 *   guard: a = the feet + `FILL.footLift` (the players' foot lift), b = `Enemy.simHead` (the sim head: crouch, lean and
 *          wall come with it, `guardHead`), r = the hit capsule's `bodyR` (`guardOccR`, cached per guard at spawn)
 *   dog:   along its yaw at `DOG_BODY_Y` above the feet: a = the rump (`DOG_BODY` / 2 behind the feet), b = the sim
 *          head's x / z (`dogHead`), r `GUARD_OCC.dogR`
 *   body:  a = the pelvis (`Body.lie`, already `lieLift` off the floor), b = `headReach` along `headYaw`, r = `lieLift`
 *          (`bodyOccR` / `bodyOccReach`, cached per body)
 *
 * Culled as the interim fill: feet (a body's pelvis) within `FILL.reach` (horizontal) of any `pin` player slot. Owner
 * keys come from each character's stable number (`occKey(kind, num)`), never a list index, so a list change between the
 * fill and a light sample never makes a body or a guard shadow itself (A7).
 *
 * Pure: no Babylon, no rig, no graphics state (gameplay never reads it). Hot: the writers run every sim step for every
 * guard, so nothing allocates and no double crosses a call (V8 boxes one at a call it does not inline): the inputs are
 * read from the characters' own fields, the capsule goes through the module scratch `S`, and `put` writes the contract
 * as `CharOccluders.add` does (whose seven double arguments would box), as `charOccluderFill.ts` `put` does.
 */
import { hyp2 } from '../core/mathx';
import { FILL, FILL_IN } from '../game/charOccluderFill';
import { hitVolumes, proportions, STANDARD_HEIGHT, type Build } from '../player/proportions';
import { OCC, OCC_KIND, occKey, type CharOccluders } from '../world/charOccluders';
import { headReach, lieLift, type LieBody } from './bodyLie';
import { DOG_BODY, DOG_BODY_Y } from './dogHead';

/** The shapes' own numbers (A9). `footLift`: a guard's foot end sits where a player's does (`FILL.footLift`, the
 *  interim fill's), so the two kinds cast the same floor gap. `dogR`: the dog's body is 0.78 m long and 0.62 m at the
 *  shoulder (`dogHead.ts`); a 0.15 m radius at `DOG_BODY_Y` spans about 0.37-0.67 m, its trunk (the legs cast nothing
 *  worth a cue). `dogBack`: the rump, half the body behind the feet (the model's body node sits over the feet). */
export const GUARD_OCC = { footLift: FILL.footLift, dogR: 0.15, dogBack: DOG_BODY / 2 } as const;

/** A writer's result for a character beyond `FILL.reach` of every player (not written; -1 is "contract full"). */
export const OCC_FAR = -2;

/** A read-only point (`Vector3` fits it). */
type P3 = { readonly x: number; readonly y: number; readonly z: number };

/** A human guard as the writer reads him (`Enemy` fits it once G3 adds `occR`). */
export interface GuardOccSrc {
  /** Stable number (`Enemy.num`): the owner key's index. */
  readonly num: number;
  /** Feet. */
  readonly pos: P3;
  /** The sim head's centre this step (`Enemy.simHead`). */
  readonly simHead: P3;
  /** The capsule radius (`guardOccR`, cached at spawn). */
  readonly occR: number;
}

/** A dog as the writer reads it (`Enemy` fits it). */
export interface DogOccSrc {
  readonly num: number;
  readonly pos: P3;
  /** Facing (rad; forward is (sin yaw, 0, cos yaw)). */
  readonly yaw: number;
  /** The sim head's centre this step (`dogHead`). */
  readonly simHead: P3;
}

/** A lying body as the writer reads it (`Body` fits it once G3 adds `num`, `occR` and `occReach`). */
export interface BodyOccSrc {
  /** Stable body number (`Body.num`, A7). */
  readonly num: number;
  /** Where it lies (`Body.lie`): the pelvis, lifted off the floor, and the way the head points (rad, 0 = +Z). */
  readonly lie: { readonly x: number; readonly y: number; readonly z: number; readonly headYaw: number };
  /** The capsule radius (`bodyOccR`) and the pelvis-to-head length (`bodyOccReach`), cached per body. */
  readonly occR: number;
  readonly occReach: number;
}

/** A guard's capsule radius: the hit capsule's `bodyR` (`hitboxes.ts`: `hitVolumes(proportions(build, 1.75 x scale))`).
 *  Allocates (the proportions): call once per guard at spawn, never per step. */
export function guardOccR(build: Build, scale: number): number {
  return hitVolumes(proportions(build, STANDARD_HEIGHT * scale)).bodyR;
}

/** A lying body's capsule radius: the pelvis's height off the floor (`lieLift`), so the capsule rests on the floor.
 *  Once per body. */
export function bodyOccR(p: LieBody): number {
  return lieLift(p);
}

/** A lying body's capsule length, pelvis to the head end (`headReach`). Once per body. */
export function bodyOccReach(p: LieBody): number {
  return headReach(p);
}

/** One capsule for `put` (ax ay az bx by bz r), then the cull point (x, z). */
const S = new Float64Array(9);
const S_CX = 7;
const S_CZ = 8;

/** True when the cull point in `S` is within `FILL.reach` (horizontal) of any of the `n` player slots in `pin`. */
function nearQ(pin: Float64Array, n: number): boolean {
  const x = S[S_CX]!;
  const z = S[S_CZ]!;
  for (let s = 0; s < n; s++) {
    const o = s * FILL_IN;
    if (hyp2(x - pin[o]!, z - pin[o + 2]!) <= FILL.reach) return true;
  }
  return false;
}

/** The capsule in `S` into the contract, owner `occKey(kind, num)` (as `CharOccluders.add`); its slot, or -1 when the
 *  contract is full. */
function put(occ: CharOccluders, kind: number, num: number): number {
  if (occ.n >= OCC.max) return -1;
  const i = occ.n++;
  const o = i * OCC.stride;
  const c = occ.cap;
  c[o] = S[0]!;
  c[o + 1] = S[1]!;
  c[o + 2] = S[2]!;
  c[o + 3] = S[3]!;
  c[o + 4] = S[4]!;
  c[o + 5] = S[5]!;
  c[o + 6] = S[6]!;
  c[o + 7] = kind;
  occ.owner[i] = occKey(kind, num);
  return i;
}

/** A human guard: feet + `footLift` to the sim head, radius `occR`, owner `occKey(OCC_KIND.guard, num)`. Its slot,
 *  `OCC_FAR` beyond every player's reach, -1 when the contract is full. */
export function putGuard(occ: CharOccluders, g: GuardOccSrc, pin: Float64Array, n: number): number {
  const p = g.pos;
  const h = g.simHead;
  S[0] = p.x;
  S[1] = p.y + GUARD_OCC.footLift;
  S[2] = p.z;
  S[3] = h.x;
  S[4] = h.y;
  S[5] = h.z;
  S[6] = g.occR;
  S[S_CX] = p.x;
  S[S_CZ] = p.z;
  if (!nearQ(pin, n)) return OCC_FAR;
  return put(occ, OCC_KIND.guard, g.num);
}

/** A dog: rump to the sim head's x / z, both at `DOG_BODY_Y` over the feet, radius `dogR`, owner
 *  `occKey(OCC_KIND.dog, num)`. Its slot, `OCC_FAR`, or -1 when full. */
export function putDog(occ: CharOccluders, d: DogOccSrc, pin: Float64Array, n: number): number {
  const p = d.pos;
  const h = d.simHead;
  const yaw = d.yaw;
  const y = p.y + DOG_BODY_Y;
  S[0] = p.x - Math.sin(yaw) * GUARD_OCC.dogBack;
  S[1] = y;
  S[2] = p.z - Math.cos(yaw) * GUARD_OCC.dogBack;
  S[3] = h.x;
  S[4] = y;
  S[5] = h.z;
  S[6] = GUARD_OCC.dogR;
  S[S_CX] = p.x;
  S[S_CZ] = p.z;
  if (!nearQ(pin, n)) return OCC_FAR;
  return put(occ, OCC_KIND.dog, d.num);
}

/** A lying body: the pelvis to `occReach` along `headYaw` (level), radius `occR`, owner `occKey(OCC_KIND.body, num)`.
 *  Its slot, `OCC_FAR`, or -1 when full. */
export function putBody(occ: CharOccluders, b: BodyOccSrc, pin: Float64Array, n: number): number {
  const l = b.lie;
  const k = b.occReach;
  const hy = l.headYaw;
  S[0] = l.x;
  S[1] = l.y;
  S[2] = l.z;
  S[3] = l.x + Math.sin(hy) * k;
  S[4] = l.y;
  S[5] = l.z + Math.cos(hy) * k;
  S[6] = b.occR;
  S[S_CX] = l.x;
  S[S_CZ] = l.z;
  if (!nearQ(pin, n)) return OCC_FAR;
  return put(occ, OCC_KIND.body, b.num);
}
