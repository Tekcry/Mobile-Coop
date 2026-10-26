/**
 * (piano SO3) A map's guard torch slots: 4 by default (every map as before), 8 / 12 / 16 on a map that asks
 * (`MapDef.torchSlots`), and a shadowed-slot cap (`MapDef.torchShadows`: the rest `beamCut`). Light parity: every lit
 * torch, the 5th to the 16th included, reaches the light field (the meter and guard sight) and the picture's draw
 * slots; a `beamCut` torch is cut at its beam's reach in the field exactly as the picture's torch loop cuts it.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LightField } from '../src/world/lightField';
import { LightRegistry } from '../src/world/lights';
import { addTorchSlots, FLASHLIGHTS, FLASHLIGHTS_MAX, placeTorch, TORCH, torchShadowCount, torchSlotCount } from '../src/world/torches';
import { rayOccluder, TORCH_DRAW_GLSL, TORCH_DRAW_MAX, TORCH_DRAW_SLOTS, TORCH_DRAW_STRIDE, torchDrawGlsl, torchDrawTerm } from '../src/world/shadowAccuracy';
import { LAMP_LEVEL_GAIN } from '../src/world/lampMath';
import { hyp3 } from '../src/core/mathx';

function dark(n: number, shadowed = n): LightRegistry {
  const reg = new LightRegistry();
  reg.ambient = 0.2;
  addTorchSlots(reg, n, shadowed);
  return reg;
}

/** Torch k of the registry placed at (3 k, 0, 0) facing +z, on. */
function lightAll(reg: LightRegistry): void {
  const ts = reg.lights.filter((l) => l.kind === 'flashlight');
  ts.forEach((l, k) => {
    placeTorch(l, 3 * k, 0, 0, 0, false, 1);
    reg.setOn(l.id, true);
  });
}

/** A wall everywhere at z = `wz` (a static ray from a to b stops there). */
function wallZ(wz: number) {
  return (ax: number, ay: number, az: number, bx: number, by: number, bz: number): number => {
    const full = hyp3(bx - ax, by - ay, bz - az);
    return az < wz && bz > wz ? (full * (wz - az)) / (bz - az) : full;
  };
}

describe('piano SO3: torch slot counts', () => {
  it('4 by default; asked counts round up to 4 / 8 / 12 / 16; the shadowed cap is 1..n, default all', () => {
    expect(FLASHLIGHTS).toBe(TORCH_DRAW_SLOTS);
    expect(FLASHLIGHTS_MAX).toBe(TORCH_DRAW_MAX);
    expect(torchSlotCount(undefined)).toBe(4);
    expect(torchSlotCount(null)).toBe(4);
    expect(torchSlotCount(2)).toBe(4);
    expect(torchSlotCount(8)).toBe(8);
    expect(torchSlotCount(9)).toBe(12);
    expect(torchSlotCount(16)).toBe(16);
    expect(torchSlotCount(40)).toBe(16);
    expect(torchShadowCount(undefined, 16)).toBe(16);
    expect(torchShadowCount(4, 16)).toBe(4);
    expect(torchShadowCount(0, 16)).toBe(1);
    expect(torchShadowCount(20, 8)).toBe(8);
  });

  it('the registry gets the count; only the slots past the shadowed cap are beamCut; a lit map none', () => {
    const def = dark(4);
    expect(def.lights.length).toBe(4);
    expect(def.lights.some((l) => l.beamCut)).toBe(false);
    const big = dark(16, 4);
    const ts = big.lights.filter((l) => l.kind === 'flashlight');
    expect(ts.length).toBe(16);
    expect(ts.map((l) => !!l.beamCut)).toEqual([...Array(16)].map((_, i) => i >= 4));
    for (const l of ts) {
      expect(l.radius).toBe(TORCH.radius);
      expect(l.electric).toBe(false);
    }
    const lit = new LightRegistry();
    lit.ambient = 0.8;
    addTorchSlots(lit, 16);
    expect(lit.lights.length).toBe(0);
  });

  it('the default torch loop is the 4-slot, all-shadowed one; a bigger map gets its own count and the cut branch', () => {
    // (fix round) master's own text, stored before SO3 (tests/fixtures/torchDrawGlsl.master.glsl, origin/master
    // 1b58989ed's TORCH_DRAW_GLSL): a map that sets nothing draws byte for byte what it did
    const master = readFileSync('tests/fixtures/torchDrawGlsl.master.glsl', 'utf8').split('\r\n').join('\n');
    expect(master.length).toBe(3770);
    expect(torchDrawGlsl(4)).toBe(master);
    expect(TORCH_DRAW_GLSL).toBe(master);
    expect(TORCH_DRAW_GLSL).not.toContain('lampTsP[c].w > 2.5');
    const g = torchDrawGlsl(16, true);
    expect(g).toContain('c < 16');
    expect(g).not.toContain('c < 4;');
    expect(g).toContain('lampTsP[c].w > 2.5');
  });
});

describe('piano SO3: light parity at 16 slots', () => {
  it('every lit torch (the 5th to the 16th too) reaches the light field, with and without the ray test', () => {
    const reg = dark(16);
    lightAll(reg);
    const field = new LightField(null, reg);
    const occ = rayOccluder(wallZ(50));
    const ts = reg.lights.filter((l) => l.kind === 'flashlight');
    for (const l of ts) {
      // only this torch on: a point 3 m down its beam is lit
      for (const o of ts) reg.setOn(o.id, o === l);
      const x = l.x + l.cone!.dx * 3;
      const y = l.y + l.cone!.dy * 3;
      const z = l.z + l.cone!.dz * 3;
      expect(field.dynamicAt(x, y, z)).toBeGreaterThan(0.05);
      expect(field.dynamicAt(x, y, z, occ)).toBeGreaterThan(0.05);
    }
  });

  it('the light rig draws all 16 (16 on, a null engine); with beamCut torches each holds its own slot', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { LightRig } = await import('../src/world/lightRig');
    for (const shadowed of [16, 4]) {
      const scene = new Scene(new NullEngine());
      const reg = dark(16, shadowed);
      lightAll(reg);
      const r = new LightRig(scene, reg);
      r.setBaked(new Set());
      const buf = new Float32Array(16 * TORCH_DRAW_STRIDE);
      r.setTorchDraw(buf);
      r.setTorchShadows(true);
      r.configure({ lights: 8, shadow: { sun: false, cascades: 0, sunSize: 0, casters: 2, size: 64, soft: false, charLamps: 0, charTile: 0 }, volumetric: false, minimal: true });
      r.update(1, 20, 1.6, 0);
      expect(r.drawnTorches).toBe(16);
      expect(r.torchSlotIds.length).toBe(16);
      for (let s = 0; s < 16; s++) expect(buf[s * TORCH_DRAW_STRIDE + 3]).toBeGreaterThan(0);
      if (shadowed < 16) {
        // the k-th flashlight in slot k: the shadowed ones in the slots with a shadow tile
        const ts = reg.lights.filter((l) => l.kind === 'flashlight');
        for (let s = 0; s < 16; s++) expect(r.torchSlotIds[s]).toBe(ts[s]!.id);
      }
      scene.getEngine().dispose();
    }
  });

  it('a beamCut torch: the field cuts at the beam reach exactly as the picture (no ray test), at 300 points', () => {
    const reg = dark(16, 4);
    lightAll(reg);
    const ts = reg.lights.filter((l) => l.kind === 'flashlight');
    const l = ts[9]!;
    for (const o of ts) reg.setOn(o.id, o === l);
    expect(l.beamCut).toBe(true);
    l.reach = 4.2;
    const field = new LightField(null, reg);
    // a ray test that blocks everything: a beamCut torch ignores it (the picture has no shadow map for it)
    const blockAll = () => true;
    let s = 0x5a3;
    const next = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    let compared = 0;
    let cut = 0;
    for (let i = 0; i < 300; i++) {
      const d = 0.3 + next() * TORCH.radius;
      const x = l.x + (next() - 0.5) * 0.6 * d;
      const y = l.y + l.cone!.dy * d + (next() - 0.5) * 0.4 * d;
      const z = l.z + d;
      const pic = LAMP_LEVEL_GAIN * l.intensity * torchDrawTerm(l, x, y, z, true);
      const met = field.dynamicAt(x, y, z, blockAll);
      if (pic > 0.01) {
        expect(Math.abs(met - Math.min(1, pic))).toBeLessThan(1e-6);
        compared++;
      } else {
        expect(met).toBe(0);
        if (torchDrawTerm(l, x, y, z, false) * LAMP_LEVEL_GAIN * l.intensity > 0.01) cut++;
      }
    }
    expect(compared).toBeGreaterThan(30);
    expect(cut).toBeGreaterThan(30);
    // a shadowed torch still takes the ray test
    const sh = ts[2]!;
    for (const o of ts) reg.setOn(o.id, o === sh);
    expect(field.dynamicAt(sh.x, sh.y - 0.4, sh.z + 3)).toBeGreaterThan(0.05);
    expect(field.dynamicAt(sh.x, sh.y - 0.4, sh.z + 3, blockAll)).toBe(0);
  });
});
