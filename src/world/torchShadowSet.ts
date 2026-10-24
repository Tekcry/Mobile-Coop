/**
 * (LR16t, sector-redesign) Guard torch shadows - the pure part: constants, presets, the kernel, the door pick, the cone
 * cull, the frustum and the GLSL. Babylon-free and allocation-free per frame; `world/torchShadows.ts` renders it.
 *
 * Michael 2026-10-23 ~18:20: "there was still guards torches showing through walls/doors, and their torches also need
 * to be diffused and not so sharp". Every drawn torch slot (`shadowAccuracy.TORCH_DRAW_SLOTS`, = `torches.FLASHLIGHTS`)
 * gets a spot shadow map of the static level, the characters, props and door leaves in its cone, copied into one tile
 * of ONE float atlas (2 x 2 tiles), read by the lamp plugin's torch loop (`TORCH_DRAW_GLSL` under `LAMP_TSHADOW`) with
 * contact-hardening PCF: sharp where a blocker touches the receiver, soft with the gap (`torchPenumbra`). A shut door
 * in the slot's door list cuts the torch exactly (`nsDoorBlocks`, the light field's test) on the frame it shuts.
 *
 * Light parity (bible 5.1): picture = `lampTerm` x N.L x shadow x door test; meter and guards = `lampTerm` x a static
 * ray (`GameState.lightOccluder` / `EnemyManager.bodyOccluder`, Havok vs `G.STATIC`, shut door bodies included) x the
 * field's door test. They agree everywhere except:
 * - inside the penumbra band (the picture's soft edge against the meter's binary ray, at most `maxPenumbra` wide);
 * - an open door leaf (and a character or prop) shades the picture only, as LR16-3's character maps (the field ignores
 *   open leaves and bodies).
 */
import type { ShadowQuality } from '../core/quality';
import { hyp2, hyp3 } from '../core/mathx';
import { CHAR_SHADOW, CHAR_SHADOW_DISK, CHAR_SHADOW_KERNEL, tileX, tileY } from './charShadowSet';
import { DOOR_SHUT } from './lightField';
import { TORCH } from './torches';

export const TORCH_SHADOW = {
  /** Atlas slots (2 x 2 tiles) = `FLASHLIGHTS` = `TORCH_DRAW_SLOTS` (a test asserts it). */
  slots: 4,
  /** The depth range (m): the near plane, and the far plane at the torch's whole radius (+ a little, so a receiver at
   *  the radius still reads under the far plane: a cleared texel is the far plane, lit). */
  near: 0.15,
  farPad: 0.5,
  far: TORCH.radius + 0.5,
  /** Added to the cone's full angle (rad) for the frustum: the PCSS taps at the beam's rim stay in the map. */
  fovPad: 0.06,
  /** The torch head (m): penumbra = lightRadius x (receiver - blocker) / blocker, capped at `maxPenumbra` (m). */
  lightRadius: 0.05,
  maxPenumbra: 0.25,
  /** The filter radius in texels, kept within these. */
  minTexels: 1.5,
  maxTexels: 16,
  /** Normal offset of the tested point (m, + per metre from the torch) and the depth bias (m): CharShadows' values. */
  normalOffset: CHAR_SHADOW.normalOffset,
  normalPerM: CHAR_SHADOW.normalPerM,
  bias: CHAR_SHADOW.bias,
  /** A torch in shadow gives nothing (characters keep a 0.15 floor; a wall stops a torch outright). */
  floor: 0,
  /** Casters within the torch's radius + this (m): moving casters between refreshes. */
  casterMargin: 1.5,
  /** Added to a caster's bounding sphere in the cone test (m): skinned bodies keep bind-pose bounds. */
  sphereMargin: CHAR_SHADOW.sphereMargin,
  /** Shut doors tested exactly per torch (one vec4 of door ids + 1 in the torch's uniforms). */
  doors: 4,
  /** (LR16t fix round) A tile is stale once its torch has turned more than this (rad) or moved more than this (m)
   *  since the tile was made: the slot renders this frame (`torchPoseStale`). The turn stays under the frustum's pad per
   *  side (`fovPad / 2` = 0.03) with room for the normal offset (~0.006 rad at the radius), so a tile within it still
   *  holds the whole new cone; a few cm of travel moves a blocker's edge by about as much. */
  poseTurn: 0.02,
  poseMove: 0.05,
} as const;

/** Tile px per shadow tier: every tier has torch maps (a torch through a wall is a correctness bug, not polish). */
export const TORCH_SHADOW_PRESET: Readonly<Record<ShadowQuality, number>> = { off: 256, low: 256, medium: 256, high: 512, ultra: 512, epic: 512 };
/** Filter taps per tier (the blocker search takes half): 256 tiles 4 / 2, 512 tiles 8 / 4, Epic 12 / 6. */
export const TORCH_SHADOW_TAPS: Readonly<Record<ShadowQuality, number>> = { off: 4, low: 4, medium: 4, high: 8, ultra: 8, epic: 12 };

/** The tier's tile and taps; `minimal` (`?gfx=min`, tests): no maps. */
export function torchShadowSpec(q: ShadowQuality, minimal = false): { tile: number; taps: number } {
  if (minimal) return { tile: 0, taps: 0 };
  return { tile: TORCH_SHADOW_PRESET[q], taps: TORCH_SHADOW_TAPS[q] };
}

/** LR16f's fixed Poisson kernel (read-only import: every prefix well spread, no per-frame jitter). */
export const TORCH_SHADOW_KERNEL = CHAR_SHADOW_KERNEL;
export const TORCH_SHADOW_DISK: Float32Array = CHAR_SHADOW_DISK;

/** The atlas: 2 x 2 tiles; a slot's tile origin (px). */
export function torchAtlasSize(tile: number): number {
  return tile * 2;
}
export function torchTileX(slot: number, tile: number): number {
  return tileX(slot, tile);
}
export function torchTileY(slot: number, tile: number): number {
  return tileY(slot, tile);
}

/** The slot's spot frustum (full angle, rad) for a torch cone of cos outer `cosOuter`: the cone + `fovPad`. */
export function torchShadowFov(cosOuter: number): number {
  return 2 * Math.acos(Math.max(-1, Math.min(1, cosOuter))) + TORCH_SHADOW.fovPad;
}

/** The penumbra radius (m) on a receiver `dr` from the torch behind a blocker `db` from it: 0 at contact, growing with
 *  the gap, capped. The GLSL computes the same from the same constants. */
export function torchPenumbra(dr: number, db: number): number {
  const gap = Math.max(0, dr - db);
  return Math.min(TORCH_SHADOW.maxPenumbra, (TORCH_SHADOW.lightRadius * gap) / Math.max(db, TORCH_SHADOW.near));
}

/** That radius in texels: the map spans `2 dr / sx` m over `tile` texels at the receiver (`sx` = 1 / tan(half fov)). */
export function torchFilterTexels(penumbra: number, dr: number, sx: number, tile: number): number {
  const t = (penumbra * 0.5 * tile * sx) / Math.max(dr, TORCH_SHADOW.near);
  return Math.min(TORCH_SHADOW.maxTexels, Math.max(TORCH_SHADOW.minTexels, t));
}

/**
 * A caster's bounding sphere (x, y, z, r) for a torch at (lx, ly, lz), cone axis (ax, ay, az) (unit) and cos outer:
 * within the radius + `casterMargin`, and in the cone + pad (the angle to its centre minus its angular radius under the
 * frustum's half angle). A caster around the torch counts (the level's big meshes). Allocation-free.
 */
export function casterInTorchCone(lx: number, ly: number, lz: number, ax: number, ay: number, az: number, cosOuter: number, radius: number, x: number, y: number, z: number, r: number): boolean {
  const dx = x - lx;
  const dy = y - ly;
  const dz = z - lz;
  const d = hyp3(dx, dy, dz);
  if (d - r > radius + TORCH_SHADOW.casterMargin) return false;
  const rr = r + TORCH_SHADOW.sphereMargin;
  if (d <= rr) return true;
  const a = Math.acos(Math.max(-1, Math.min(1, (dx * ax + dy * ay + dz * az) / d))) - Math.asin(rr / d);
  return a < torchShadowFov(cosOuter) * 0.5;
}

/** True when a character caster's sphere (+ `sphereMargin`) holds the torch: a candidate for its holder
 *  (`torchHolderScore`). */
export function holdsTorch(lx: number, ly: number, lz: number, x: number, y: number, z: number, r: number): boolean {
  const rr = r + TORCH_SHADOW.sphereMargin;
  const dx = x - lx;
  const dy = y - ly;
  const dz = z - lz;
  return dx * dx + dy * dy + dz * dz <= rr * rr;
}

/**
 * (lr16pol B, lr16t check A 5) How well a character caster names the torch's holder: -1 when its sphere (+
 * `sphereMargin`) does not hold the torch, else the squared plan distance (m^2) from its centre to the holder's feet,
 * found by undoing `placeTorch` (the torch sits `TORCH.ahead` along the beam's plan heading and `TORCH.side` to its
 * right of the feet; every torch, host and co-op client, is placed by it). The holder is the ONE character whose caster
 * scores lowest (`pickTorchHolder`): his body and gear stand over those feet and cast nothing into his own beam, while a
 * second guard or the player shoulder to shoulder, or a step in front of him in the beam, casts again. Not the bare
 * distance to the torch: a guard 0.6 m in front of the holder has his body centre nearer the torch than the holder's
 * own. (ax, az): the beam axis' plan part. Pure, allocation-free; the AI is not read (the registry light is all the
 * renderer holds).
 */
export function torchHolderScore(lx: number, ly: number, lz: number, ax: number, az: number, x: number, y: number, z: number, r: number): number {
  if (!holdsTorch(lx, ly, lz, x, y, z, r)) return -1;
  const h = hyp2(ax, az);
  let fx = lx;
  let fz = lz;
  if (h > 1e-6) {
    const s = ax / h;
    const c = az / h;
    fx = lx - s * TORCH.ahead - c * TORCH.side;
    fz = lz - c * TORCH.ahead + s * TORCH.side;
  }
  const dx = x - fx;
  const dz = z - fz;
  return dx * dx + dz * dz;
}

/** The holder among `n` character casters' spheres (x, y, z, r packed in `spheres`): the index of the lowest
 *  `torchHolderScore`, -1 when none holds the torch. `TorchShadows.gather` runs the same rule over its casters. */
export function pickTorchHolder(lx: number, ly: number, lz: number, ax: number, az: number, spheres: Float32Array, n: number): number {
  let best = -1;
  let bd = Infinity;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const d = torchHolderScore(lx, ly, lz, ax, az, spheres[o]!, spheres[o + 1]!, spheres[o + 2]!, spheres[o + 3]!);
    if (d >= 0 && d < bd) {
      bd = d;
      best = i;
    }
  }
  return best;
}

/** A door as the pick reads it (`Doors.list` / `FieldDoor` fit). */
export interface TorchDoor {
  anchor: { hinge: { x: number; y: number; z: number }; yaw: number; width: number; height: number };
  open: number;
}

/**
 * The shut doors a torch tests exactly: `open <= DOOR_SHUT`, the leaf's middle within the radius + the leaf's width
 * (as `lampDoorLists`), its sphere in the cone + pad, nearest first, up to `TORCH_SHADOW.doors`; ids + 1 into
 * `out[o..o + 3]` (0: none). `dist`: a scratch of `TORCH_SHADOW.doors`. Returns how many. Allocation-free.
 */
export function pickTorchDoors(doors: readonly TorchDoor[], lx: number, ly: number, lz: number, ax: number, ay: number, az: number, cosOuter: number, radius: number, out: Float32Array, o: number, dist: Float32Array): number {
  const m = TORCH_SHADOW.doors;
  let n = 0;
  for (let k = 0; k < doors.length; k++) {
    const dr = doors[k]!;
    if (dr.open > DOOR_SHUT) continue;
    const a = dr.anchor;
    const cx = a.hinge.x + Math.sin(a.yaw) * a.width * 0.5;
    const cy = a.hinge.y + a.height * 0.5;
    const cz = a.hinge.z + Math.cos(a.yaw) * a.width * 0.5;
    const d = hyp3(cx - lx, cy - ly, cz - lz);
    if (!(d < radius + a.width)) continue;
    // (the leaf's sphere: half its width and height round its middle)
    const r = Math.sqrt(a.width * a.width + a.height * a.height) * 0.5;
    if (!casterInTorchCone(lx, ly, lz, ax, ay, az, cosOuter, radius, cx, cy, cz, r)) continue;
    // insert, nearest first
    let j = n < m ? n++ : m;
    if (j === m) {
      if (!(d < dist[m - 1]!)) continue;
      j = m - 1;
    }
    while (j > 0 && dist[j - 1]! > d) {
      dist[j] = dist[j - 1]!;
      out[o + j] = out[o + j - 1]!;
      j--;
    }
    dist[j] = d;
    out[o + j] = k + 1;
  }
  for (let j = n; j < m; j++) out[o + j] = 0;
  return n;
}

/** The sphere round a torch's lit cone (to its radius): centre on the axis at half the radius, radius
 *  `R sqrt(1.25 - cos outer)` (it holds the apex and the rim at the radius), into `out` (x, y, z, r). */
export function torchLitSphere(lx: number, ly: number, lz: number, ax: number, ay: number, az: number, cosOuter: number, radius: number, out: Float32Array): void {
  const h = radius * 0.5;
  out[0] = lx + ax * h;
  out[1] = ly + ay * h;
  out[2] = lz + az * h;
  out[3] = radius * Math.sqrt(Math.max(0.25, 1.25 - cosOuter)) + 0.5;
}

/** A plane as Babylon's frustum planes hold it (normal . p + d >= 0 inside). */
export interface TsPlane {
  normal: { x: number; y: number; z: number };
  d: number;
}
/** A sphere touching the frustum (every plane at least -r). No planes: true. */
export function sphereInFrustum(planes: readonly TsPlane[] | null | undefined, x: number, y: number, z: number, r: number): boolean {
  if (!planes || planes.length === 0) return true;
  for (let i = 0; i < planes.length; i++) {
    const p = planes[i]!;
    if (p.normal.x * x + p.normal.y * y + p.normal.z * z + p.d < -r) return false;
  }
  return true;
}

const POSE_COS = Math.cos(TORCH_SHADOW.poseTurn);
const POSE_MOVE2 = TORCH_SHADOW.poseMove * TORCH_SHADOW.poseMove;

/** A torch pose (position, unit axis) into `out[o..o + 5]`. */
export function writeTorchPose(out: Float32Array, o: number, x: number, y: number, z: number, ax: number, ay: number, az: number): void {
  out[o] = x;
  out[o + 1] = y;
  out[o + 2] = z;
  out[o + 3] = ax;
  out[o + 4] = ay;
  out[o + 5] = az;
}

/**
 * (LR16t fix round, check A blocking 1) True when the torch at (x, y, z), axis (ax, ay, az) (unit), has turned more
 * than `poseTurn` or moved more than `poseMove` from the pose its tile was made from (`pose[o..o + 5]`,
 * `writeTorchPose`): the slot renders this frame instead of waiting for its interval (a guard turns ~0.13 rad a frame,
 * past the frustum's pad in one frame). Allocation-free.
 */
export function torchPoseStale(pose: Float32Array, o: number, x: number, y: number, z: number, ax: number, ay: number, az: number): boolean {
  return torchPoseMoved(pose, o, x, y, z) || torchPoseTurned(pose, o, ax, ay, az);
}

/** (lr16pol B, lr16t recheck 1) The move part of `torchPoseStale`: the torch is more than `poseMove` from the pose's
 *  position (a blocker's edge in the map is off by about as much). Allocation-free. */
export function torchPoseMoved(pose: Float32Array, o: number, x: number, y: number, z: number): boolean {
  const dx = x - pose[o]!;
  const dy = y - pose[o + 1]!;
  const dz = z - pose[o + 2]!;
  return dx * dx + dy * dy + dz * dz > POSE_MOVE2;
}

/** (lr16pol B, lr16t recheck 1) The turn part of `torchPoseStale`: the axis is more than `poseTurn` off the pose's
 *  (the map still holds every depth it held, in the same place; only its frustum no longer covers the whole new cone).
 *  Allocation-free. */
export function torchPoseTurned(pose: Float32Array, o: number, ax: number, ay: number, az: number): boolean {
  return ax * pose[o + 3]! + ay * pose[o + 4]! + az * pose[o + 5]! < POSE_COS;
}

/**
 * (lr16pol B, lr16t recheck 1) A slot's map renders this frame instead of at its interval: a tile with no map of this
 * torch (`valid` - the slot's params w - not 1: a new torch in the slot, a restore, "nothing to cast") or one made
 * from a pose the torch has moved from, always; one it has only turned from, only at governor 1. While the frame
 * governor stretches the refresh (`governorEvery` > 1) a turning guard would otherwise render every frame; his turned
 * beam waits for its interval, its rim past the old frustum reading dark (`TORCH_SHADOW_GLSL`: off-frustum 0), never
 * light through a wall. Pure.
 */
export function torchForceRender(valid: number, moved: boolean, turned: boolean, governorEvery: number): boolean {
  if (valid !== 1 || moved) return true;
  return turned && Math.max(1, governorEvery | 0) <= 1;
}

/** Frames between a slot's refreshes: the torch nearest the camera every frame, the rest every 2nd, x the governor's. */
export function torchRefreshEvery(nearest: boolean, governorEvery = 1): number {
  return (nearest ? 1 : 2) * Math.max(1, governorEvery | 0);
}

const F = (v: number): string => v.toFixed(4);
/** The kernel as a GLSL array literal (fixed). */
const DISK_GLSL = Array.from({ length: TORCH_SHADOW_KERNEL }, (_, i) => `vec2(${F(TORCH_SHADOW_DISK[i * 2]!)}, ${F(TORCH_SHADOW_DISK[i * 2 + 1]!)})`).join(', ');

/** Door texels per door in the lamp data texture (`bakedLamps.DOOR_TEXELS`; a test holds them equal). */
export const TORCH_DOOR_TEXELS = 2;

/**
 * The torch loop's tests (GLSL, `LAMP_TSHADOW`; after `LAMP_GLSL`, which defines `lampTexel`, `lampMore` and
 * `nsDoorBlocks`). `nsTorchShadow`: a point lit by torch slot `s` at `lpos` against its tile of `lampTsAtlas` - normal
 * offset, Babylon's depth metric from the snapshotted view-projection (`lampTsM`, params `lampTsP`: min z, min + max z,
 * bias, valid (2: valid, nothing to cast); `lampTsI`: tile px, filter taps, atlas px, depth sign) - then LR16f's
 * contact-hardening PCF: the blocker search over the kernel's first half sized for the widest penumbra (blockers at
 * the near plane), the mean blocker depth gives the penumbra (`torchPenumbra`) and the filter (`torchFilterTexels`).
 * Not ready (a slot's first frame): 0, a torch never shows through a wall. Outside a valid map's frustum: 0 (the cone
 * + pad fits inside it, so only a map older than its torch's pose lands there: a dark sliver for a frame, never light
 * through a wall; LR16t fix round). `nsTorchDoors`: one of the torch's shut doors (ids + 1 in `td`) between the torch and `p`.
 */
export const TORCH_SHADOW_GLSL = `
#ifdef LAMP_TSHADOW
uniform highp sampler2D lampTsAtlas;
const vec2 TS_DISK[${TORCH_SHADOW_KERNEL}] = vec2[${TORCH_SHADOW_KERNEL}](${DISK_GLSL});
float nsTorchShadow(int s, vec3 p, vec3 gn, vec3 lpos) {
  vec4 P = lampTsP[s];
  if (P.w < 0.5) return 0.0;
  if (P.w > 1.5) return 1.0;
  vec3 q = p + gn * (${F(TORCH_SHADOW.normalOffset)} + ${F(TORCH_SHADOW.normalPerM)} * length(lpos - p));
  mat4 M = mat4(lampTsM[s * 4], lampTsM[s * 4 + 1], lampTsM[s * 4 + 2], lampTsM[s * 4 + 3]);
  vec4 c = M * vec4(q, 1.0);
  if (c.w <= 1e-4) return 1.0;
  vec2 uv = c.xy / c.w;
  if (abs(uv.x) >= 1.0 || abs(uv.y) >= 1.0) return 0.0;
  float z = (lampTsI.w * c.z + P.x) / P.y - P.z;
  if (z <= 0.0) return 1.0;
  float T = lampTsI.x;
  int n = int(lampTsI.y + 0.5);
  int nb = n / 2;
  vec2 org = vec2(float(s - (s / 2) * 2), float(s / 2)) * T;
  vec2 f = (uv * 0.5 + 0.5) * T;
  vec2 hiT = vec2(T - 1.0);
  float span = max(P.y - 2.0 * P.x, 0.01);
  float dr = c.w;
  float sx = length(vec3(M[0][0], M[1][0], M[2][0]));
  float tpm = 0.5 * T * sx / max(dr, ${F(TORCH_SHADOW.near)});
  float nearB = max(P.x, ${F(TORCH_SHADOW.near)});
  float sr = clamp(min(${F(TORCH_SHADOW.maxPenumbra)}, ${F(TORCH_SHADOW.lightRadius)} * max(dr - nearB, 0.0) / nearB) * tpm, ${F(TORCH_SHADOW.minTexels)}, ${F(TORCH_SHADOW.maxTexels)});
  float zb = 0.0;
  float nbk = 0.0;
  for (int i = 0; i < ${TORCH_SHADOW_KERNEL / 2}; i++) {
    if (i >= nb) break;
    float d = texelFetch(lampTsAtlas, ivec2(org + clamp(floor(f + TS_DISK[i] * sr), vec2(0.0), hiT)), 0).r;
    if (d < z) {
      zb += d;
      nbk += 1.0;
    }
  }
  if (nbk < 0.5) return 1.0;
  float db = clamp(dr - (z + P.z - zb / nbk) * span, nearB, max(dr, nearB));
  float r = clamp(min(${F(TORCH_SHADOW.maxPenumbra)}, ${F(TORCH_SHADOW.lightRadius)} * (dr - db) / db) * tpm, ${F(TORCH_SHADOW.minTexels)}, ${F(TORCH_SHADOW.maxTexels)});
  float lit = 0.0;
  for (int i = 0; i < ${TORCH_SHADOW_KERNEL}; i++) {
    if (i >= n) break;
    lit += step(z, texelFetch(lampTsAtlas, ivec2(org + clamp(floor(f + TS_DISK[i] * r), vec2(0.0), hiT)), 0).r);
  }
  return mix(${TORCH_SHADOW.floor.toFixed(2)}, 1.0, lit / float(max(n, 1)));
}
bool nsTorchDoors(vec3 a, vec3 p, vec4 td) {
  for (int k = 0; k < ${TORCH_SHADOW.doors}; k++) {
    float did = td[k];
    if (did < 0.5) break;
    int db = int(lampMore.x) + (int(did + 0.5) - 1) * ${TORCH_DOOR_TEXELS};
    if (nsDoorBlocks(a, p, lampTexel(db), lampTexel(db + 1))) return true;
  }
  return false;
}
#endif
`;
