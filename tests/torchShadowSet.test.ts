/**
 * (LR16t) Guard torch shadows, the pure part (`world/torchShadowSet.ts`): slots, presets, the atlas tiles, the frustum,
 * the caster cull, the door pick, the penumbra, the kernel, and the GLSL the lamp plugin's torch loop runs.
 */
import { describe, expect, it } from 'vitest';
import { FLASHLIGHTS, TORCH } from '../src/world/torches';
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
  torchLitSphere,
  torchPenumbra,
  torchPoseStale,
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
  it('slots equal FLASHLIGHTS and TORCH_DRAW_SLOTS', () => {
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
});
