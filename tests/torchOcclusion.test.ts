/**
 * (LR16t) Every guard torch stops at walls and shut doors: in the meter and guard perception (the light field with a
 * static ray occluder and its door test) for each of the 4 drawn torch slots; the picture's term (`torchDrawTerm`
 * without the reach cut, the atlas path) equals the field's in the open beam; the light rig gives no flashlight a
 * Babylon light while the atlas is on; the guards' fallback light sample (`enemy.ts` `fieldLight`) is occluded.
 */
import { describe, expect, it, vi } from 'vitest';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { LightRegistry, makeCone, type LightDef } from '../src/world/lights';
import { FLASHLIGHTS, TORCH } from '../src/world/torches';
import { rayOccluder, TORCH_DRAW_SLOTS, TORCH_DRAW_STRIDE, torchDrawTerm } from '../src/world/shadowAccuracy';
import { LAMP_LEVEL_GAIN } from '../src/world/lampMath';
import { pickTorchDoors, TORCH_SHADOW } from '../src/world/torchShadowSet';
import { hyp2, hyp3 } from '../src/core/mathx';
import type { AiContext } from '../src/ai/enemy';

/** Four guard torches at (-4.5 + 3 k, 1.45, 0), all pointing +x (pitched down a little), off. */
function torches(): { reg: LightRegistry; ls: LightDef[] } {
  const reg = new LightRegistry();
  reg.ambient = 0;
  const ls: LightDef[] = [];
  for (let k = 0; k < FLASHLIGHTS; k++) {
    ls.push(reg.add({ kind: 'flashlight', x: 0, y: 1.45, z: -4.5 + 3 * k, radius: TORCH.radius, intensity: TORCH.intensity, color: [...TORCH.color], cone: makeCone(Math.cos(TORCH.pitch), -Math.sin(TORCH.pitch), 0, TORCH.outer, TORCH.inner), on: false, destructible: false, electric: false }));
  }
  return { reg, ls };
}

/** A static wall (the plane x = `wx`, everywhere): a ray from a to b stops there. */
function wallHit(wx: number) {
  return (ax: number, ay: number, az: number, bx: number, by: number, bz: number): number => {
    const full = hyp3(bx - ax, by - ay, bz - az);
    return ax < wx && bx > wx ? (full * (wx - ax)) / (bx - ax) : full;
  };
}

/** A shut door across each torch's beam at x = 3 (leaf from z - 0.5 to z + 0.5, 2.1 m high). */
function doorsAt(zs: readonly number[]): FieldDoor[] {
  return zs.map((z) => ({ anchor: { hinge: { x: 3, y: 0, z: z - 0.5 }, yaw: 0, width: 1, height: 2.1 }, open: 0 }));
}

/** mulberry32 */
function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The light rig on a null engine, `n` torches on, the atlas `on`; `casters` shadow maps asked for. */
async function rig(n: number, on: boolean, casters = 2) {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { LightRig } = await import('../src/world/lightRig');
  const scene = new Scene(new NullEngine());
  const { reg, ls } = torches();
  for (let k = 0; k < n; k++) reg.setOn(ls[k]!.id, true);
  const r = new LightRig(scene, reg);
  r.setBaked(new Set());
  const buf = new Float32Array(TORCH_DRAW_SLOTS * TORCH_DRAW_STRIDE);
  r.setTorchDraw(buf);
  r.setTorchShadows(on);
  r.configure({ lights: 8, shadow: { sun: false, cascades: 0, sunSize: 0, casters, size: 64, soft: false, charLamps: 0, charTile: 0 }, volumetric: false, minimal: true });
  r.update(1, 0, 1.6, 0);
  return { scene, reg, ls, r, buf };
}

describe('every torch slot stops at walls and shut doors (LR16t)', () => {
  it('a torch behind a wall lights nothing in the field (each of the 4 slots)', async () => {
    const { scene, reg, ls, r } = await rig(FLASHLIGHTS, true);
    expect(r.drawnTorches).toBe(FLASHLIGHTS);
    const field = new LightField(null, reg);
    const occ = rayOccluder(wallHit(3));
    for (let s = 0; s < TORCH_DRAW_SLOTS; s++) {
      const id = r.torchSlotIds[s]!;
      expect(id).toBeGreaterThanOrEqual(0);
      // only this slot's torch on
      for (const l of ls) reg.setOn(l.id, l.id === id);
      const l = reg.lights[id]!;
      // in front of the wall: lit; behind it (on the beam's axis, and beside it): nothing
      expect(field.dynamicAt(2.5, 1.0, l.z, occ)).toBeGreaterThan(0.05);
      for (const [x, dz] of [[3.5, 0], [5, 0], [8, 0.4], [6, -0.6]] as const) {
        expect(field.dynamicAt(x, 0.9, l.z + dz)).toBeGreaterThan(0.01);
        expect(field.dynamicAt(x, 0.9, l.z + dz, occ)).toBe(0);
      }
    }
    scene.getEngine().dispose();
  });

  it('a torch behind a shut door lights nothing; open door lets it through', () => {
    const { reg, ls } = torches();
    const doors = doorsAt(ls.map((l) => l.z));
    const field = new LightField(null, reg, doors);
    const out = new Float32Array(TORCH_DRAW_SLOTS * TORCH_DRAW_STRIDE);
    const dist = new Float32Array(TORCH_SHADOW.doors);
    for (let k = 0; k < FLASHLIGHTS; k++) {
      for (const l of ls) reg.setOn(l.id, l === ls[k]);
      const l = ls[k]!;
      const c = l.cone!;
      // the picture's door list for this slot holds the door across its beam (nearest first)
      pickTorchDoors(doors, l.x, l.y, l.z, c.dx, c.dy, c.dz, c.cosOuter, l.radius, out, k * TORCH_DRAW_STRIDE + 12, dist);
      expect(out[k * TORCH_DRAW_STRIDE + 12]).toBe(k + 1);
      const p: [number, number, number] = [4, 1.0, l.z];
      expect(field.doorBlocks(l.x, l.y, l.z, ...p)).toBe(true);
      expect(field.dynamicAt(...p)).toBe(0);
      expect(field.dynamicAt(2.5, 1.0, l.z)).toBeGreaterThan(0.05);
      doors[k]!.open = 1;
      expect(field.dynamicAt(...p)).toBeGreaterThan(0.05);
      // an open leaf leaves the picture's list
      pickTorchDoors(doors, l.x, l.y, l.z, c.dx, c.dy, c.dz, c.cosOuter, l.radius, out, k * TORCH_DRAW_STRIDE + 12, dist);
      expect(out[k * TORCH_DRAW_STRIDE + 12]).not.toBe(k + 1);
      doors[k]!.open = 0;
    }
  });

  it('open beam: field term equals torchDrawTerm without cut at 200 points', () => {
    const { reg, ls } = torches();
    const l = ls[1]!;
    reg.setOn(l.id, true);
    // a short beam reach (a wall the 5 rays hit) no longer cuts the drawn term
    l.reach = 3;
    const field = new LightField(null, reg);
    const next = rng(0x16a7);
    const c = l.cone!;
    let compared = 0;
    let worst = 0;
    let pastReach = 0;
    for (let i = 0; i < 200; i++) {
      // a point in the cone (and its feather band): distance 0.3..13, angle up to 1.05 x outer
      const d = 0.3 + next() * (TORCH.radius - 0.3);
      const a = next() * TORCH.outer * 1.05;
      const phi = next() * Math.PI * 2;
      // an orthonormal pair across the axis
      const ux = -c.dz;
      const uz = c.dx;
      const ul = hyp2(ux, uz);
      const vx = c.dy * (uz / ul);
      const vy = c.dz * (ux / ul) - c.dx * (uz / ul);
      const vz = -c.dy * (ux / ul);
      const s = Math.sin(a);
      const x = l.x + d * (c.dx * Math.cos(a) + s * (Math.cos(phi) * (ux / ul) + Math.sin(phi) * vx));
      const y = l.y + d * (c.dy * Math.cos(a) + s * Math.sin(phi) * vy);
      const z = l.z + d * (c.dz * Math.cos(a) + s * (Math.cos(phi) * (uz / ul) + Math.sin(phi) * vz));
      const pic = LAMP_LEVEL_GAIN * l.intensity * torchDrawTerm(l, x, y, z, false);
      const met = field.dynamicAt(x, y, z);
      // (the field skips a light under 0.01)
      if (pic > 0.01) {
        worst = Math.max(worst, Math.abs(pic - met));
        compared++;
        if (d > l.reach) {
          pastReach++;
          expect(torchDrawTerm(l, x, y, z)).toBe(0);
        }
      } else expect(met).toBe(0);
    }
    expect(compared).toBeGreaterThan(80);
    expect(pastReach).toBeGreaterThan(20);
    expect(worst).toBeLessThan(1e-6);
  });

  it('guard perception fallback (enemy.ts) uses the occluder', async () => {
    const { fieldLight } = await import('../src/ai/enemy');
    const { EnemyManager } = await import('../src/ai/enemyManager');
    const { DIFFICULTY } = await import('../src/ai/archetypes');
    // the helper hands the context's occluder to the field
    const totalAt = vi.fn((_x: number, _y: number, _z: number, _o?: unknown) => 0.3);
    const occ = vi.fn(() => true);
    const ctx = { world: { lightField: { totalAt } }, lightOccluder: occ } as unknown as AiContext;
    expect(fieldLight(ctx, 1, 2, 3)).toBe(0.3);
    expect(totalAt).toHaveBeenCalledWith(1, 2, 3, occ);
    // with a real field: a torch behind a wall gives the fallback sample nothing
    const { reg, ls } = torches();
    const l = ls[0]!;
    reg.setOn(l.id, true);
    const field = new LightField(null, reg);
    const hit = wallHit(3);
    const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] }, lightField: field };
    const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0) };
    const ballistics = { clear: vi.fn(() => true), hitDistance: (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => hit(a.x, a.y, a.z, b.x, b.y, b.z) };
    const em = new EnemyManager({} as never, world as never, nav as never, {} as never, ballistics as never, {} as never, DIFFICULTY.normal, () => []);
    const ectx = (em as unknown as { ctx: AiContext }).ctx;
    expect(typeof ectx.lightOccluder).toBe('function');
    expect(fieldLight(ectx, 2.5, 1.0, l.z)).toBeGreaterThan(0.05);
    expect(fieldLight(ectx, 5, 0.9, l.z)).toBe(0);
    // (without the occluder, the old call, the wall leaked)
    expect(field.totalAt(5, 0.9, l.z)).toBeGreaterThan(0.01);
  });
});

describe('the light rig with the torch atlas (LR16t)', () => {
  it('no flashlight in the shadow or clustered pool; every torch on is drawn (up to 4); no spot shadow sampler', async () => {
    for (let n = 1; n <= FLASHLIGHTS; n++) {
      const on = await rig(n, true);
      expect(on.r.drawnTorches).toBe(n);
      expect(on.r.placed).toBe(0);
      expect(on.r.shadowed).toBe(0);
      // (samplers: today's per lit shader - the 2 baked spot shadow maps + the atlas)
      expect(on.r.shadowSlots).toBe(0);
      on.scene.getEngine().dispose();
    }
    // the fallback (no atlas): the baked cap's 2 shadow maps take two torches, the rest drawn with the reach cut
    const off = await rig(FLASHLIGHTS, false);
    expect(off.r.shadowSlots).toBe(2);
    expect(off.r.shadowed).toBe(2);
    expect(off.r.drawnTorches).toBe(2);
    // switching the atlas on rebuilds the pool without spot shadows and draws all four
    off.r.setTorchShadows(true);
    off.r.update(1, 0, 1.6, 0);
    expect(off.r.shadowSlots).toBe(0);
    expect(off.r.drawnTorches).toBe(FLASHLIGHTS);
    off.scene.getEngine().dispose();
  });

  it('a torch keeps its slot (and atlas tile) while it stays drawn', async () => {
    const { scene, reg, ls, r } = await rig(3, true);
    const before = Array.from(r.torchSlotIds);
    // the camera moves so the nearest order changes; a fourth torch turns on
    reg.setOn(ls[3]!.id, true);
    r.update(1, 0, 1.6, 6);
    const after = Array.from(r.torchSlotIds);
    for (let s = 0; s < TORCH_DRAW_SLOTS; s++) if (before[s]! >= 0) expect(after[s]).toBe(before[s]);
    expect(after.filter((id) => id >= 0).length).toBe(4);
    // one goes off: its slot empties, the others stay
    reg.setOn(before[0]!, false);
    r.update(1, 0, 1.6, -6);
    const off = Array.from(r.torchSlotIds);
    expect(off[0]).toBe(-1);
    for (let s = 1; s < TORCH_DRAW_SLOTS; s++) expect(off[s]).toBe(after[s]);
    scene.getEngine().dispose();
  });
});
