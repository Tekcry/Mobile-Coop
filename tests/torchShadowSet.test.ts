/**
 * (LR16t) Guard torch shadows, the pure part (`world/torchShadowSet.ts`): slots, presets, the atlas tiles, the frustum,
 * the caster cull, the door pick, the penumbra, the kernel, and the GLSL the lamp plugin's torch loop runs.
 */
import { describe, expect, it } from 'vitest';
import { FLASHLIGHTS, placeTorch, TORCH } from '../src/world/torches';
import { makeCone, type LightDef } from '../src/world/lights';
import { TORCH_CUT_SOFT, TORCH_DRAW_GLSL, TORCH_DRAW_SLOTS, TORCH_DRAW_STRIDE } from '../src/world/shadowAccuracy';
import { CHAR_SHADOW_DISK, CHAR_SHADOW_KERNEL } from '../src/world/charShadowSet';
import { DOOR_SHUT } from '../src/world/lightField';
import { DOOR_TEXELS } from '../src/world/bakedLamps';
import { bytesPerCall, sink } from './helpers/allocPerCall';
import { hyp2, hyp3 } from '../src/core/mathx';
import {
  casterInTorchCone,
  holdsTorch,
  pickTorchDoors,
  pickTorchHolder,
  sphereInFrustum,
  TORCH_DOOR_TEXELS,
  TORCH_SHADOW,
  TORCH_SHADOW_DISK,
  TORCH_SHADOW_GLSL,
  TORCH_SHADOW_KERNEL,
  TORCH_SHADOW_PRESET,
  TORCH_SHADOW_TAPS,
  torchAtlasSize,
  torchFilterTexels,
  torchForceRender,
  torchHolderScore,
  torchLitSphere,
  torchPenumbra,
  torchPoseMoved,
  torchPoseStale,
  torchPoseTurned,
  torchRefreshEvery,
  torchShadowFov,
  torchShadowSpec,
  torchTileX,
  torchTileY,
  type TorchDoor,
  writeTorchPose,
} from '../src/world/torchShadowSet';

const COS = Math.cos(TORCH.outer);

/** The `#ifdef LAMP_TSHADOW` branch of the torch loop (up to its `#else`). */
function tshadowBranch(): string {
  const a = TORCH_DRAW_GLSL.indexOf('#ifdef LAMP_TSHADOW\nvec3 nsTorches');
  const b = TORCH_DRAW_GLSL.indexOf('#else', a);
  expect(a).toBeGreaterThanOrEqual(0);
  expect(b).toBeGreaterThan(a);
  return TORCH_DRAW_GLSL.slice(a, b);
}

describe('torch shadow set (LR16t)', () => {
  it('slots equal FLASHLIGHTS and TORCH_DRAW_SLOTS (the default; piano SO3: a map may ask for up to 16)', () => {
    expect(TORCH_SHADOW.slots).toBe(FLASHLIGHTS);
    expect(TORCH_SHADOW.slots).toBe(TORCH_DRAW_SLOTS);
    // (the 4th vec4 of each drawn torch: its doors)
    expect(TORCH_DRAW_STRIDE).toBe(16);
    expect(TORCH_SHADOW.doors).toBe(4);
    expect(TORCH_DOOR_TEXELS).toBe(DOOR_TEXELS);
  });

  it('every shadow tier has torch maps (off and low at 256)', () => {
    for (const q of ['off', 'low', 'medium', 'high', 'ultra', 'epic'] as const) {
      const s = torchShadowSpec(q);
      expect(s.tile).toBeGreaterThan(0);
      expect(s.taps).toBeGreaterThan(0);
      expect(s.taps).toBeLessThanOrEqual(TORCH_SHADOW_KERNEL);
      expect(s.tile).toBe(TORCH_SHADOW_PRESET[q]);
      expect(s.taps).toBe(TORCH_SHADOW_TAPS[q]);
    }
    expect(torchShadowSpec('off').tile).toBe(256);
    expect(torchShadowSpec('low').tile).toBe(256);
    expect([torchShadowSpec('low').taps, torchShadowSpec('high').taps, torchShadowSpec('epic').taps]).toEqual([4, 8, 12]);
    expect(torchShadowSpec('epic').tile).toBe(512);
    // (`?gfx=min`: none)
    expect(torchShadowSpec('epic', true)).toEqual({ tile: 0, taps: 0 });
  });

  it('tile layout 2 x 2, slot origins', () => {
    for (const t of [256, 512]) {
      expect(torchAtlasSize(t)).toBe(t * 2);
      const o = [0, 1, 2, 3].map((s) => [torchTileX(s, t), torchTileY(s, t)]);
      expect(o).toEqual([[0, 0], [t, 0], [0, t], [t, t]]);
    }
    // (the shader's origin: vec2(s mod 2, s / 2) x T)
    expect(TORCH_SHADOW_GLSL).toContain('vec2 org = vec2(float(s - (s / 2) * 2), float(s / 2)) * T;');
  });

  it('frustum covers the cone plus the PCSS pad', () => {
    const fov = torchShadowFov(COS);
    expect(fov).toBeCloseTo(2 * TORCH.outer + TORCH_SHADOW.fovPad, 9);
    // a point on the cone's rim, at every distance, projects inside the map (square, half angle fov / 2) with room for
    // the pad's texels at a 256 tile
    const half = fov / 2;
    for (let d = 0.5; d <= TORCH.radius; d += 0.5) {
      const r = d * Math.tan(TORCH.outer);
      const uv = r / (d * Math.tan(half));
      expect(uv).toBeLessThan(1);
      expect((1 - uv) * 128).toBeGreaterThan(5);
    }
    // the depth range: near 0.15 m, far past the radius (a cleared texel reads lit everywhere in range)
    expect(TORCH_SHADOW.near).toBe(0.15);
    expect(TORCH_SHADOW.far).toBeGreaterThan(TORCH.radius);
    // the lit sphere holds the cone to its radius (apex and rim)
    const sp = new Float32Array(4);
    torchLitSphere(1, 2, 3, 0, 0, 1, COS, TORCH.radius, sp);
    const rim = [1 + TORCH.radius * Math.sin(TORCH.outer), 2, 3 + TORCH.radius * COS];
    expect(hyp3(rim[0]! - sp[0]!, rim[1]! - sp[1]!, rim[2]! - sp[2]!)).toBeLessThanOrEqual(sp[3]!);
    expect(hyp3(1 - sp[0]!, 2 - sp[1]!, 3 - sp[2]!)).toBeLessThanOrEqual(sp[3]!);
    expect(hyp3(1 - sp[0]!, 2 - sp[1]!, 3 + TORCH.radius - sp[2]!)).toBeLessThanOrEqual(sp[3]!);
    // the camera frustum test (Babylon planes: n . p + d >= 0 inside)
    const planes = [{ normal: { x: 1, y: 0, z: 0 }, d: 0 }];
    expect(sphereInFrustum(planes, 1, 0, 0, 0.5)).toBe(true);
    expect(sphereInFrustum(planes, -0.4, 0, 0, 0.5)).toBe(true);
    expect(sphereInFrustum(planes, -2, 0, 0, 0.5)).toBe(false);
    expect(sphereInFrustum(undefined, -2, 0, 0, 0.5)).toBe(true);
    // refresh: the nearest every frame, the rest every 2nd, x the governor
    expect([torchRefreshEvery(true), torchRefreshEvery(false), torchRefreshEvery(true, 2), torchRefreshEvery(false, 3)]).toEqual([1, 2, 2, 6]);
  });

  it('caster cull: inside reach and cone kept, behind the torch dropped, margin for moving casters', () => {
    // torch at the origin pointing +z
    const at = (x: number, y: number, z: number, r: number): boolean => casterInTorchCone(0, 0, 0, 0, 0, 1, COS, TORCH.radius, x, y, z, r);
    expect(at(0, 0, 5, 0.5)).toBe(true);
    expect(at(0, 0, -5, 0.5)).toBe(false);
    // beside the cone: out; a big sphere reaching into it: in
    expect(at(5, 0, 5, 0.5)).toBe(false);
    expect(at(5, 0, 5, 3.5)).toBe(true);
    // just past the cone's edge, within the pad + sphere margin: in
    const a = TORCH.outer + 0.02;
    expect(at(5 * Math.sin(a), 0, 5 * Math.cos(a), 0.05)).toBe(true);
    // past the radius: in within the moving casters' margin, out beyond it
    expect(at(0, 0, TORCH.radius + 1.2, 0.2)).toBe(true);
    expect(at(0, 0, TORCH.radius + TORCH_SHADOW.casterMargin + 0.5, 0.2)).toBe(false);
    // a mesh round the torch (the level's big meshes): in
    expect(at(0, 0, -3, 20)).toBe(true);
    // the guard holding it: his body's sphere holds the torch
    expect(holdsTorch(0, 1.45, 0.35, 0, 0.9, 0, 0.95)).toBe(true);
    expect(holdsTorch(0, 1.45, 0.35, 0, 0.9, 3, 0.95)).toBe(false);
  });

  it('holder drop (lr16pol B, check A 5): only the guard holding the torch, not the one shoulder to shoulder', async () => {
    // two guards side by side, 0.55 m apart, both facing +z: body spheres (centre 0.9 m up, r 0.95) as the merged rig
    const sph = new Float32Array([0, 0.9, 0, 0.95, 0.55, 0.9, 0, 0.95]);
    const l = { x: 0, y: 0, z: 0, cone: makeCone(0, 0, 1, TORCH.outer, TORCH.inner) } as LightDef;
    const c = l.cone!;
    const pick = (s: Float32Array, n: number): number => pickTorchHolder(l.x, l.y, l.z, c.dx, c.dz, s, n);
    // A holds it: the torch sits inside both spheres (+ margin), only A is the holder
    placeTorch(l, 0, 0, 0, 0, false, 1);
    expect(holdsTorch(l.x, l.y, l.z, 0, 0.9, 0, 0.95)).toBe(true);
    expect(holdsTorch(l.x, l.y, l.z, 0.55, 0.9, 0, 0.95)).toBe(true);
    expect(pick(sph, 2)).toBe(0);
    // B holds it: B
    placeTorch(l, 0.55, 0, 0, 0, false, 1);
    expect(pick(sph, 2)).toBe(1);
    // listed in the other order, B on either side of A: still A
    const sw = new Float32Array([0.55, 0.9, 0, 0.95, 0, 0.9, 0, 0.95]);
    placeTorch(l, 0, 0, 0, 0, false, 1);
    expect(pick(sw, 2)).toBe(1);
    const sw2 = new Float32Array([-0.55, 0.9, 0, 0.95, 0, 0.9, 0, 0.95]);
    expect(pick(sw2, 2)).toBe(1);
    // B a step in front of A, in A's beam: B's centre is nearer the torch than A's (a bare-distance rule would drop B
    // and let A shade his own beam), yet A is the holder and B casts
    const front = new Float32Array([0, 0.9, 0.6, 0.95, 0, 0.9, 0, 0.95]);
    expect(holdsTorch(l.x, l.y, l.z, 0, 0.9, 0.6, 0.95)).toBe(true);
    expect(hyp3(l.x, l.y - 0.9, l.z - 0.6)).toBeLessThan(hyp3(l.x, l.y - 0.9, l.z));
    expect(pick(front, 2)).toBe(1);
    // crouched (the torch 1.0 m up) and turned away from B (yaw -PI / 2): still the holder
    placeTorch(l, 0, 0, 0, -Math.PI / 2, true, 1);
    expect(pick(sph, 2)).toBe(0);
    // any heading and scale: a sphere centred over the feet scores 0 (placeTorch undone exactly, pitch included)
    for (const yaw of [0, 0.7, Math.PI / 2, 2.5, -1.9]) {
      placeTorch(l, 3, 0.2, -4, yaw, yaw > 1, 1.1);
      expect(torchHolderScore(l.x, l.y, l.z, c.dx, c.dz, 3, 1.1, -4, 0.95)).toBeCloseTo(0, 9);
    }
    // a neighbour's small gear sphere (his gun at his hip, beside the torch) does not win over A's body
    placeTorch(l, 0, 0, 0, 0, false, 1);
    const gear = new Float32Array([0, 0.9, 0, 0.95, 0.4, 1.4, 0.2, 0.12]);
    expect(hyp3(l.x - 0.4, l.y - 1.4, l.z - 0.2)).toBeLessThan(hyp3(l.x, l.y - 0.9, l.z));
    expect(pick(gear, 2)).toBe(0);
    // nobody near: -1; a sphere that does not hold the torch scores -1
    expect(pick(new Float32Array([0, 0.9, 3, 0.95]), 1)).toBe(-1);
    expect(torchHolderScore(0, 1.45, 0.35, 0, 1, 0, 0.9, 3, 0.95)).toBe(-1);
    // allocation-free (per caster per slot per frame)
    const bytes = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) sink[0] = sink[0]! + pickTorchHolder(l.x, l.y + k * 1e-7, l.z, c.dx, c.dz, sph, 2) + torchHolderScore(l.x, l.y, l.z, c.dx, c.dz, 0, 0.9, 0, 0.95);
    }, 16, { n: 2000 });
    expect(bytes).toBeLessThanOrEqual(16);
  });

  it('door pick: shut only, nearest first, at most 4, open leaves skipped, allocation-free', async () => {
    // torch at (0, 1.45, 0) pointing +z; doors across the beam at z = 2, 3, ... (hinge at x -0.5, yaw pi / 2: along +x)
    const door = (z: number, open = 0): TorchDoor => ({ anchor: { hinge: { x: -0.5, y: 0, z }, yaw: Math.PI / 2, width: 1, height: 2.1 }, open });
    const doors = [door(6), door(3, 1), door(2), door(5), door(4), door(7), door(-3)];
    const out = new Float32Array(TORCH_DRAW_STRIDE * 2).fill(9);
    const dist = new Float32Array(TORCH_SHADOW.doors);
    const o = TORCH_DRAW_STRIDE + 12;
    const n = pickTorchDoors(doors, 0, 1.45, 0, 0, 0, 1, COS, TORCH.radius, out, o, dist);
    expect(n).toBe(4);
    // ids + 1, nearest first: z 2 (index 2), z 4 (4), z 5 (3), z 6 (0); the open one (z 3) and the one behind skipped
    expect(Array.from(out.subarray(o, o + 4))).toEqual([3, 5, 4, 1]);
    expect(out[o - 1]).toBe(9);
    // a door at DOOR_SHUT still counts; past it, open
    doors[2]!.open = DOOR_SHUT;
    pickTorchDoors(doors, 0, 1.45, 0, 0, 0, 1, COS, TORCH.radius, out, o, dist);
    expect(out[o]).toBe(3);
    doors[2]!.open = DOOR_SHUT + 0.01;
    pickTorchDoors(doors, 0, 1.45, 0, 0, 0, 1, COS, TORCH.radius, out, o, dist);
    expect(out[o]).toBe(5);
    // none in the cone (the torch turned to +x): zeros
    expect(pickTorchDoors(doors, 0, 1.45, 0, 1, 0, 0, COS, TORCH.radius, out, o, dist)).toBe(0);
    expect(Array.from(out.subarray(o, o + 4))).toEqual([0, 0, 0, 0]);
    // allocation-free (the shared new-space reader; the cull and the lit sphere too)
    const sp = new Float32Array(4);
    const bytes = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        sink[0] = sink[0]! + pickTorchDoors(doors, 0, 1.45, 0, 0, 0, 1, COS, TORCH.radius, out, o, dist);
        sink[1] = sink[1]! + (casterInTorchCone(0, 1.45, 0, 0, 0, 1, COS, TORCH.radius, 0, 1, 5, 0.5) ? 1 : 0);
        torchLitSphere(0, 1.45, 0, 0, 0, 1, COS, TORCH.radius, sp);
      }
    }, 16, { n: 2000 });
    expect(bytes).toBeLessThanOrEqual(16);
  });

  it('penumbra: 0 at contact, grows with receiver-blocker gap, capped at maxPenumbra', () => {
    expect(torchPenumbra(3, 3)).toBe(0);
    expect(torchPenumbra(2.9, 3)).toBe(0);
    const a = torchPenumbra(3, 2);
    const b = torchPenumbra(5, 2);
    expect(a).toBeCloseTo((TORCH_SHADOW.lightRadius * 1) / 2, 9);
    expect(b).toBeGreaterThan(a);
    // a doorway 1 m from the torch, the wall 5 m away: ~0.2 m (soft with distance)
    expect(torchPenumbra(5, 1)).toBeCloseTo(0.2, 9);
    expect(torchPenumbra(13, 0.3)).toBe(TORCH_SHADOW.maxPenumbra);
    // in texels: clamped to [minTexels, maxTexels]
    const sx = 1 / Math.tan(torchShadowFov(COS) / 2);
    expect(torchFilterTexels(0, 5, sx, 256)).toBe(TORCH_SHADOW.minTexels);
    expect(torchFilterTexels(1, 1, sx, 512)).toBe(TORCH_SHADOW.maxTexels);
    const mid = torchFilterTexels(0.05, 5, sx, 256);
    expect(mid).toBeGreaterThan(TORCH_SHADOW.minTexels);
    expect(mid).toBeLessThan(TORCH_SHADOW.maxTexels);
  });

  it('kernel: fixed, in the unit disc, every prefix spread', () => {
    // LR16f's kernel by import, not a copy
    expect(TORCH_SHADOW_DISK).toBe(CHAR_SHADOW_DISK);
    expect(TORCH_SHADOW_KERNEL).toBe(CHAR_SHADOW_KERNEL);
    const n = TORCH_SHADOW_KERNEL;
    for (let i = 0; i < n; i++) expect(hyp2(TORCH_SHADOW_DISK[i * 2]!, TORCH_SHADOW_DISK[i * 2 + 1]!)).toBeLessThanOrEqual(1);
    // every prefix the tiers take (search halves and filters) is spread: no two taps closer than a floor
    for (const k of [2, 3, 4, 6, 8, 12]) {
      let minD = Infinity;
      for (let i = 0; i < k; i++) for (let j = 0; j < i; j++) minD = Math.min(minD, hyp2(TORCH_SHADOW_DISK[i * 2]! - TORCH_SHADOW_DISK[j * 2]!, TORCH_SHADOW_DISK[i * 2 + 1]! - TORCH_SHADOW_DISK[j * 2 + 1]!));
      expect(minD).toBeGreaterThan(0.2);
    }
  });

  it('GLSL: no torchCut under LAMP_TSHADOW, nsLampCone and nsDoorBlocks present, constants embedded', () => {
    const br = tshadowBranch();
    expect(br).not.toContain(TORCH_CUT_SOFT.toFixed(2));
    expect(br).not.toContain('ta.w - d');
    expect(br).toContain('nsLampCone(ca, tb.w, 2.0)');
    expect(br).toContain('nsTorchShadow(c, p, gn, ta.xyz)');
    expect(br).toContain('nsTorchDoors(ta.xyz, p, lampTorch[c * 4 + 3])');
    expect(TORCH_SHADOW_GLSL).toContain('nsDoorBlocks(a, p, lampTexel(db), lampTexel(db + 1))');
    expect(TORCH_SHADOW_GLSL).toContain('uniform highp sampler2D lampTsAtlas;');
    // the fallback keeps today's cut
    const fb = TORCH_DRAW_GLSL.slice(TORCH_DRAW_GLSL.indexOf('#else', TORCH_DRAW_GLSL.indexOf('#ifdef LAMP_TSHADOW\nvec3 nsTorches')));
    expect(fb).toContain(TORCH_CUT_SOFT.toFixed(2));
    // constants: penumbra, texel clamps, near, normal offset, floor, the kernel's taps exactly
    const F = (v: number): string => v.toFixed(4);
    for (const v of [TORCH_SHADOW.lightRadius, TORCH_SHADOW.maxPenumbra, TORCH_SHADOW.minTexels, TORCH_SHADOW.maxTexels, TORCH_SHADOW.near, TORCH_SHADOW.normalOffset, TORCH_SHADOW.normalPerM]) expect(TORCH_SHADOW_GLSL).toContain(F(v));
    expect(TORCH_SHADOW_GLSL).toContain(`mix(${TORCH_SHADOW.floor.toFixed(2)}, 1.0,`);
    for (let i = 0; i < TORCH_SHADOW_KERNEL; i++) expect(TORCH_SHADOW_GLSL).toContain(`vec2(${F(TORCH_SHADOW_DISK[i * 2]!)}, ${F(TORCH_SHADOW_DISK[i * 2 + 1]!)})`);
    expect(TORCH_SHADOW_GLSL).toContain(`const vec2 TS_DISK[${TORCH_SHADOW_KERNEL}]`);
    // fixed: no time, no random, uniform-bounded loops with constant bounds
    expect(TORCH_SHADOW_GLSL).not.toMatch(/\btime\b|random|fract\(sin/i);
    expect(TORCH_SHADOW_GLSL).toContain(`for (int i = 0; i < ${TORCH_SHADOW_KERNEL}; i++)`);
    expect(TORCH_SHADOW_GLSL).toContain(`for (int k = 0; k < ${TORCH_SHADOW.doors}; k++)`);
    // not ready: dark (never through a wall); nothing to cast: lit
    expect(TORCH_SHADOW_GLSL).toContain('if (P.w < 0.5) return 0.0;');
    expect(TORCH_SHADOW_GLSL).toContain('if (P.w > 1.5) return 1.0;');
    // (fix round, check A blocking 1) a valid map reads dark outside its frustum: only a map older than its torch's
    // pose lands there, and a stale map must never let the beam through a wall
    expect(TORCH_SHADOW_GLSL).toContain('if (abs(uv.x) >= 1.0 || abs(uv.y) >= 1.0) return 0.0;');
    expect(TORCH_SHADOW_GLSL).not.toContain('abs(uv.y) >= 1.0) return 1.0;');
  });

  it('pose rule: a tile renders again once its torch turned past the pad or moved a few cm (fix round)', async () => {
    const pose = new Float32Array(8).fill(7);
    // a guard's torch at (2, 1.45, 3) pointing +z, in the slot's pose at offset 1
    writeTorchPose(pose, 1, 2, 1.45, 3, 0, 0, 1);
    expect(Array.from(pose)).toEqual([7, 2, 1.45, 3, 0, 0, 1, 7].map((v) => Math.fround(v)));
    const turned = (a: number): boolean => torchPoseStale(pose, 1, 2, 1.45, 3, Math.sin(a), 0, Math.cos(a));
    expect(turned(0)).toBe(false);
    expect(turned(0.01)).toBe(false);
    expect(turned(-0.02)).toBe(false);
    // one frame of a guard's turn (turnRate 7.85 rad/s at 60 fps: ~0.13 rad) and anything past the threshold: stale
    expect(turned(0.13)).toBe(true);
    expect(turned(-0.13)).toBe(true);
    expect(turned(TORCH_SHADOW.poseTurn + 0.002)).toBe(true);
    // the threshold leaves the per-side pad room for the normal offset: a turn just under it keeps the whole new cone
    // (rim + the normal offset at the radius) inside the old frustum, so a kept map never reads off-frustum in steady state
    const half = torchShadowFov(COS) / 2;
    const normalAng = (TORCH_SHADOW.normalOffset + TORCH_SHADOW.normalPerM * TORCH.radius) / TORCH.radius;
    expect(TORCH.outer + TORCH_SHADOW.poseTurn + normalAng).toBeLessThan(half);
    expect(TORCH_SHADOW.poseTurn).toBeLessThanOrEqual(TORCH_SHADOW.fovPad / 2);
    // moved: a few cm hold, past poseMove renders
    const moved = (dx: number, dy: number, dz: number): boolean => torchPoseStale(pose, 1, 2 + dx, 1.45 + dy, 3 + dz, 0, 0, 1);
    expect(moved(0.02, 0, 0)).toBe(false);
    expect(moved(0, 0.03, 0.03)).toBe(false);
    expect(moved(TORCH_SHADOW.poseMove + 0.01, 0, 0)).toBe(true);
    expect(moved(0, 0, -0.1)).toBe(true);
    expect(TORCH_SHADOW.poseMove).toBeLessThanOrEqual(0.1);
    // a stale map past a single frame's turn: the beam's rim lands outside the old frustum (where the shader now reads 0)
    expect(TORCH.outer + 0.13).toBeGreaterThan(half);
    // allocation-free (per slot per frame)
    const bytes = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        sink[0] = sink[0]! + (torchPoseStale(pose, 1, 2, 1.45, 3 + k * 1e-6, 0, 0, 1) ? 1 : 0);
        writeTorchPose(pose, 1, 2, 1.45, 3, 0, 0, 1);
      }
    }, 16, { n: 2000 });
    expect(bytes).toBeLessThanOrEqual(16);
  });

  it('pose split and the governor rule (lr16pol B, recheck 1): a turn-only pose waits under the governor', async () => {
    const pose = new Float32Array(6);
    writeTorchPose(pose, 0, 2, 1.45, 3, 0, 0, 1);
    // the split: moved reads the position only, turned the axis only; stale is their OR
    const cases: [number, number, number, number][] = [
      [0, 0, 0, 0],
      [0.13, 0, 0, 0],
      [0, 0, 0.1, 0],
      [0.13, 0.1, 0, 0],
      [TORCH_SHADOW.poseTurn * 0.5, 0, 0, TORCH_SHADOW.poseMove * 0.5],
    ];
    for (const [a, dx, dz, dy] of cases) {
      const ax = Math.sin(a);
      const az = Math.cos(a);
      const mv = torchPoseMoved(pose, 0, 2 + dx, 1.45 + dy, 3 + dz);
      const tn = torchPoseTurned(pose, 0, ax, 0, az);
      expect(mv).toBe(dx * dx + dz * dz + dy * dy > TORCH_SHADOW.poseMove ** 2);
      expect(tn).toBe(Math.cos(a) < Math.cos(TORCH_SHADOW.poseTurn));
      expect(torchPoseStale(pose, 0, 2 + dx, 1.45 + dy, 3 + dz, ax, 0, az)).toBe(mv || tn);
    }
    // the force rule: a tile with no map of this torch (valid 0: new, restored, or "nothing to cast" before its first
    // map) or a moved pose always renders now; a turn-only pose renders now at governor 1 (as before), waits above it
    for (const gov of [1, 2, 3, 4]) {
      expect(torchForceRender(0, false, false, gov)).toBe(true);
      expect(torchForceRender(2, false, false, gov)).toBe(true);
      expect(torchForceRender(1, true, false, gov)).toBe(true);
      expect(torchForceRender(1, true, true, gov)).toBe(true);
      expect(torchForceRender(1, false, false, gov)).toBe(false);
      expect(torchForceRender(1, false, true, gov)).toBe(gov <= 1);
    }
    // a bad governor value counts as 1 (no change from the LR16t rule)
    expect(torchForceRender(1, false, true, 0)).toBe(true);
    expect(torchForceRender(1, false, true, 1.7)).toBe(true);
    // governor 1 reproduces the old single rule exactly: force = !valid || stale
    for (const valid of [0, 1, 2]) {
      for (const [a, dx] of [[0, 0], [0.13, 0], [0, 0.1], [0.13, 0.1]] as const) {
        const mv = torchPoseMoved(pose, 0, 2 + dx, 1.45, 3);
        const tn = torchPoseTurned(pose, 0, Math.sin(a), 0, Math.cos(a));
        const old = valid !== 1 || torchPoseStale(pose, 0, 2 + dx, 1.45, 3, Math.sin(a), 0, Math.cos(a));
        expect(torchForceRender(valid, valid === 1 && mv, valid === 1 && !mv && tn, 1)).toBe(old);
      }
    }
    // allocation-free (per slot per frame)
    const bytes = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        const mv = torchPoseMoved(pose, 0, 2, 1.45, 3 + k * 1e-6);
        const tn = torchPoseTurned(pose, 0, 0, 0, 1);
        sink[0] = sink[0]! + (torchForceRender(1, mv, tn, 2) ? 1 : 0);
      }
    }, 16, { n: 2000 });
    expect(bytes).toBeLessThanOrEqual(16);
  });
});
