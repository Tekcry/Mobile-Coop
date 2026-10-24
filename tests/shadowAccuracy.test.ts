/**
 * Shadow accuracy fixes (sector-redesign shadow audit, Michael 2026-10-23 ~14:45; `world/shadowAccuracy.ts`; always on
 * since LR16a, one light model). Findings: `docs/sector-redesign/checks/shadow-audit.md`.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps } from '../src/voxel/lampBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { ambientFromGrid, AMBIENT_CELL, buildAmbientGrid } from '../src/world/ambientGrid';
import * as shadowAccuracy from '../src/world/shadowAccuracy';
import { bakeVisSampler, doorSeen, DOORS_PER_LAMP, DOORS_PER_LAMP_ACCURATE, lampDoorLists, LightField, trilinear, type FieldDoor } from '../src/world/lightField';
import { LAMP_LEVEL_GAIN, lampTerm, LIGHT_GAIN, SPOT_EXP } from '../src/world/lampMath';
import { gameLightFalloff, rayOccluder, TORCH_CUT_SOFT, TORCH_DRAW_GLSL, TORCH_DRAW_SLOTS, TORCH_DRAW_STRIDE, torchCut, torchDrawTerm, torchShadowPass, writeTorchDraw } from '../src/world/shadowAccuracy';
import { beamReach, TORCH } from '../src/world/torches';
import { makeCone } from '../src/world/lights';
import { hyp3 } from '../src/core/mathx';

describe('always on (LR16a)', () => {
  it('no toggle is left', () => {
    const names = Object.keys(shadowAccuracy);
    for (const gone of ['setShadowAccuracy', 'shadowAccuracyOn', 'matchShadowAccuracy']) expect(names).not.toContain(gone);
  });
});

/** A lamp at (0, 3, 0) beside a 4 m wall at x -0.7..-0.5 (everything at x < -0.7 is hidden from it), a 0.1 / 0.5 fill. */
function scene() {
  const b = new LevelBuilder();
  b.box(0, -0.1, 0, 24, 0.2, 24, '#888');
  b.box(-0.6, 2, 0, 0.2, 4, 16, '#888');
  const reg = b.lights;
  reg.add({ x: 0, y: 3, z: 0, radius: 8, intensity: 1 });
  reg.ambient = 0.5;
  reg.addZone({ minX: -12, maxX: 0.5, minY: -1, maxY: 6, minZ: -12, maxZ: 12, ambient: 0.1 });
  const set = canonicalLightSet(b.boxes, b.cylinders, 'shadow-test', false);
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const ambient = buildAmbientGrid(reg, set.lo, set.hi);
  const bake: LightBake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n: [1, 1, 1], cell: 1, vis: new Uint8Array([255]), dir: [0, 1, 0] }, ambient, moonLight: 0, ms: 0 };
  // five doors behind the wall (nearer the lamp, unseen) and one in its view at x 4.5 (the sixth nearest)
  const door = (x: number, z: number): FieldDoor => ({ anchor: { hinge: { x, y: 0, z }, yaw: 0, width: 1, height: 2.1 }, open: 0 });
  const doors = [door(-1.5, -3), door(-1.5, -1.5), door(-1.5, 0), door(-1.5, 1.5), door(-2, 3), door(4.5, -0.5)];
  return { reg, bake, doors, r, baked };
}

describe('door lists skip the doorways a lamp cannot see', () => {
  it('the seen door keeps a slot; the field cuts the light behind it', () => {
    const { reg, bake, doors, r, baked } = scene();
    const seen = bakeVisSampler(r);
    expect(doors.slice(0, 5).every((d) => !doorSeen(seen, 0, d))).toBe(true);
    expect(doorSeen(seen, 0, doors[5]!)).toBe(true);
    // without the bake sampler: the four nearest (all behind the wall); the door in view gets no slot
    const old = lampDoorLists(baked.lights, doors);
    expect(Array.from(old.subarray(0, DOORS_PER_LAMP)).includes(5)).toBe(false);
    const fixed = lampDoorLists(baked.lights, doors, seen);
    expect(fixed[0]).toBe(5);
    // a point behind the closed door in view: the leaf is between it and the lamp
    const p: [number, number, number] = [5.5, 1, 0];
    const on = new LightField(bake, reg, doors);
    expect(on.doorBlocks(0, 3, 0, ...p)).toBe(true);
    expect(on.lampAt(0, ...p)).toBe(0);
    // with the door open the light passes
    doors[5]!.open = 1;
    expect(on.lampAt(0, ...p)).toBeGreaterThan(0.05);
  });

  it('the sampler reads what the field reads', () => {
    const { reg, bake, r } = scene();
    const f = new LightField(bake, reg);
    const s = bakeVisSampler(r);
    const pts: [number, number, number][] = [[1, 1, 0], [3.3, 0.4, -2.2], [-2, 1, 0], [0.2, 2.9, 0.1]];
    for (const p of pts) expect(s(0, ...p)).toBeCloseTo(f.visAt(0, ...p), 9);
  });
});

describe('the ambient fill is read as the shaders read it', () => {
  it('trilinear, not the nearest cell', () => {
    const { reg, bake } = scene();
    reg.setOn(0, false);
    const g = bake.ambient;
    const on = new LightField(bake, reg);
    let most = 0;
    for (let x = -2; x <= 3; x += 0.1) {
      const tri = trilinear(g.data, 0, g.origin[0], g.origin[1], g.origin[2], g.n[0], g.n[1], g.n[2], AMBIENT_CELL, x, 1.2, 0.3);
      expect(on.levelAt(x, 1.2, 0.3)).toBeCloseTo(tri, 9);
      most = Math.max(most, Math.abs(tri - ambientFromGrid(g, x, 1.2, 0.3)));
    }
    // the zone edge: the old read stepped by up to half the zone's step from what the picture shows
    expect(most).toBeGreaterThan(0.15);
  });
});

describe('flashlights in the picture', () => {
  it('game PBR materials drop the inverse-square falloff', () => {
    const m = { usePhysicalLightFalloff: true };
    expect(gameLightFalloff(m)).toBe(true);
    expect(m.usePhysicalLightFalloff).toBe(false);
    expect(gameLightFalloff(m)).toBe(false);
    expect(gameLightFalloff({})).toBe(false);
  });

  it('shadow maps go to the cut beams first', () => {
    const cut = { kind: 'flashlight', radius: 13, reach: 3.4 };
    const free = { kind: 'flashlight', radius: 13, reach: 13 };
    const lamp = { kind: 'lamp', radius: 6 };
    expect([torchShadowPass(cut), torchShadowPass(free), torchShadowPass(lamp)]).toEqual([0, 1, 2]);
    expect(torchShadowPass({ kind: 'flashlight', radius: 13 })).toBe(1);
  });

  it('a body behind a wall is not lit by a torch for the guards', () => {
    // a wall at x 2: the ray stops there
    const hit = (ax: number, _ay: number, _az: number, bx: number, by: number, bz: number): number => {
      const full = Math.hypot(bx - ax, by - _ay, bz - _az);
      return ax < 2 && bx > 2 ? (full * (2 - ax)) / (bx - ax) : full;
    };
    const occ = rayOccluder(hit);
    const torch = { x: 0, y: 1.5, z: 0 };
    expect(occ(torch, 4, 0.2, 0)).toBe(true);
    expect(occ(torch, 1.5, 0.2, 0)).toBe(false);
    expect(occ(torch, 0.1, 1.4, 0)).toBe(false);
  });
});

/** (LR15) A lamp at (0, 3, 0) over an open floor and a row of `n` shut doors in a line at x 2.5 (centres z +-0.5, +-1.5,
 *  +-2.5, +-3.5, nearest first), all in the lamp's view; a point 1 m past each door on the ray through its centre. */
function doorRow(n: number) {
  const b = new LevelBuilder();
  b.box(0, -0.1, 0, 24, 0.2, 24, '#888');
  const reg = b.lights;
  reg.add({ x: 0, y: 3, z: 0, radius: 8, intensity: 1 });
  reg.ambient = 0;
  const set = canonicalLightSet(b.boxes, b.cylinders, 'door-row', false);
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  const ambient = buildAmbientGrid(reg, set.lo, set.hi);
  const bake: LightBake = { lo: set.lo, hi: set.hi, lampKey: 'r', moonKey: 'r', lamps: { baked, r }, moon: { origin: set.lo, n: [1, 1, 1], cell: 1, vis: new Uint8Array([255]), dir: [0, 1, 0] }, ambient, moonLight: 0, ms: 0 };
  const centres = [0.5, -0.5, 1.5, -1.5, 2.5, -2.5, 3.5, -3.5].slice(0, n);
  const doors: FieldDoor[] = centres.map((zc) => ({ anchor: { hinge: { x: 2.5, y: 0, z: zc - 0.5 }, yaw: 0, width: 1, height: 2.1 }, open: 0 }));
  // (the ray from the lamp to (3.5, 1, zc * 1.4) crosses x 2.5 at the door's centre line, 1.57 m up)
  const pts = centres.map((zc) => [3.5, 1, zc * 1.4] as [number, number, number]);
  return { reg, bake, doors, baked, r, pts };
}

describe('8 door slots per lamp (LR15)', () => {
  it('8 slots (two door texels of 4)', () => {
    expect(DOORS_PER_LAMP).toBe(4);
    expect(DOORS_PER_LAMP_ACCURATE).toBe(8);
  });

  it('the list holds the 8 nearest doors in view, nearest first', () => {
    for (let n = 5; n <= 8; n++) {
      const { doors, baked, r } = doorRow(n);
      const seen = bakeVisSampler(r);
      const four = lampDoorLists(baked.lights, doors, seen);
      expect(four.length).toBe(DOORS_PER_LAMP);
      expect(Array.from(four).sort()).toEqual([0, 1, 2, 3]);
      const eight = lampDoorLists(baked.lights, doors, seen, 8);
      expect(eight.length).toBe(8);
      expect(Array.from(eight.subarray(0, n)).sort()).toEqual(Array.from({ length: n }, (_, k) => k));
      expect(Array.from(eight.subarray(n))).toEqual(new Array(8 - n).fill(-1));
    }
    // a ninth door in reach: the 8 nearest keep the slots
    const { doors, baked } = doorRow(8);
    doors.push({ anchor: { hinge: { x: 2.5, y: 0, z: 4 }, yaw: 0, width: 1, height: 2.1 }, open: 0 });
    expect(Array.from(lampDoorLists(baked.lights, doors, undefined, 8)).includes(8)).toBe(false);
  });

  it('5-8 shut doors: every one cuts the light (a 4-slot list would leak the 5th-8th)', () => {
    for (let n = 5; n <= 8; n++) {
      const { reg, bake, doors, pts } = doorRow(n);
      const on = new LightField(bake, reg, doors);
      expect(pts.filter((p) => on.lampAt(0, ...p) > 0).length).toBe(0);
      // every point is behind a leaf; open them and every point is lit
      for (const p of pts) expect(on.doorBlocks(0, 3, 0, ...p)).toBe(true);
      for (const d of doors) d.open = 1;
      for (const p of pts) expect(on.lampAt(0, ...p)).toBeGreaterThan(0.05);
    }
  });
});

describe('exact torch drawing (LR15)', () => {
  /** A guard's torch at 1.45 m pointing along +x (pitched down a little), a wall at x = `wall`. */
  function torch(wall: number) {
    const reg = new LevelBuilder().lights;
    const l = reg.add({ kind: 'flashlight', x: 0, y: 1.45, z: 0, radius: TORCH.radius, intensity: TORCH.intensity, color: [...TORCH.color], cone: makeCone(Math.cos(TORCH.pitch), -Math.sin(TORCH.pitch), 0, TORCH.outer, TORCH.inner), on: true, destructible: false, electric: false });
    // every ray stops at the wall (`beamReach`'s 5 rays alike): the reach is the farthest hit + 0.4
    const hit = (ax: number, ay: number, az: number, bx: number, by: number, bz: number): number => {
      const full = hyp3(bx - ax, by - ay, bz - az);
      return bx > wall && ax < wall ? (full * (wall - ax)) / (bx - ax) : full;
    };
    l.reach = beamReach(l, hit);
    return { reg, l, hit };
  }

  it('the drawn term is the light field per torch inside the beam, and 0 past the wall the beam lands on', () => {
    for (const wall of [2, 3, 4]) {
      const { reg, l, hit } = torch(wall);
      const field = new LightField(null, reg);
      const occ = rayOccluder(hit);
      let compared = 0;
      for (let x = 0.8; x < wall - 0.05; x += 0.1) {
        for (const [y, z] of [[1.2, 0], [0.4, 0.2], [1.0, -0.3]] as const) {
          const f = field.dynamicAt(x, y, z, occ);
          const t = torchDrawTerm(l, x, y, z);
          expect(t).toBeCloseTo(lampTerm(x - l.x, y - l.y, z - l.z, l.radius, l.cone!.dx, l.cone!.dy, l.cone!.dz, l.cone!.cosOuter, SPOT_EXP), 9);
          if (f > 0) {
            expect(LAMP_LEVEL_GAIN * l.intensity * t).toBeCloseTo(f, 9);
            compared++;
          }
        }
      }
      expect(compared).toBeGreaterThan(5);
      // the wall's face is drawn at the full exact term (the cut sits 0.4 m past the farthest edge ray's hit)
      expect(torchDrawTerm(l, wall - 0.01, 1.2, 0)).toBeCloseTo(lampTerm(wall - 0.01 - l.x, 1.2 - l.y, 0, l.radius, l.cone!.dx, l.cone!.dy, l.cone!.dz, l.cone!.cosOuter, SPOT_EXP), 9);
      // past the wall (beyond the meter ray's 0.25 m short stop): dark in the meter; in the picture past the reach (a
      // sliver under 1 m behind the wall is inside the sphere the cut draws, as with today's range: the wall hides it from
      // a camera on the torch's side)
      expect(l.reach! - wall).toBeLessThan(1);
      for (let x = wall + 0.3; x < wall + 3; x += 0.2) {
        expect(field.dynamicAt(x, 1.2, 0, occ)).toBe(0);
        if (hyp3(x - l.x, 1.2 - l.y, 0) >= l.reach!) expect(torchDrawTerm(l, x, 1.2, 0)).toBe(0);
      }
    }
  });

  it('on the wall the old range-cut draw was a fraction of the meter; the drawn term matches it', () => {
    const { l } = torch(3);
    const x = 2.95;
    const exact = lampTerm(x - l.x, 1.2 - l.y, 0, l.radius, l.cone!.dx, l.cone!.dy, l.cone!.dz, l.cone!.cosOuter, SPOT_EXP);
    const old = lampTerm(x - l.x, 1.2 - l.y, 0, l.reach!, l.cone!.dx, l.cone!.dy, l.cone!.dz, l.cone!.cosOuter, SPOT_EXP);
    expect(exact).toBeGreaterThan(0);
    expect(old / exact).toBeLessThan(0.3);
    expect(torchDrawTerm(l, x, 1.2, 0) / exact).toBeCloseTo(1, 9);
    expect(torchCut(l.reach! - TORCH_CUT_SOFT / 2, l.reach!)).toBeCloseTo(0.5, 9);
    expect(torchCut(l.reach!, l.reach!)).toBe(0);
  });

  it('(LR16t) torchDrawTerm(cut = false): the field term past the reach, no ramp before it', () => {
    const { l } = torch(3);
    for (let x = 0.8; x < 9; x += 0.37) {
      for (const [y, z] of [[1.2, 0], [0.4, 0.2]] as const) {
        const exact = lampTerm(x - l.x, y - l.y, z - l.z, l.radius, l.cone!.dx, l.cone!.dy, l.cone!.dz, l.cone!.cosOuter, SPOT_EXP);
        expect(torchDrawTerm(l, x, y, z, false)).toBe(exact > 0 ? exact : 0);
        if (hyp3(x - l.x, y - l.y, z - l.z) >= l.reach!) expect(torchDrawTerm(l, x, y, z)).toBe(0);
      }
    }
    // the default keeps the cut (the fallback path)
    expect(torchDrawTerm(l, l.reach! + 1, 1.2, 0)).toBe(0);
    expect(torchDrawTerm(l, l.reach! + 1, 1.2, 0, false)).toBeGreaterThan(0);
  });

  it('the slot data: position + cut, axis + cos, colour x intensity x gain + radius; empty when off', () => {
    const { l } = torch(3);
    const buf = new Float32Array(TORCH_DRAW_SLOTS * TORCH_DRAW_STRIDE).fill(9);
    writeTorchDraw(buf, 1, l);
    const o = TORCH_DRAW_STRIDE;
    expect(buf[o + 3]).toBeCloseTo(l.reach!, 5);
    expect(buf[o + 7]).toBeCloseTo(l.cone!.cosOuter, 6);
    expect(buf[o + 8]).toBeCloseTo(TORCH.color[0] * TORCH.intensity * LIGHT_GAIN, 5);
    expect(buf[o + 11]).toBe(TORCH.radius);
    expect(buf[0]).toBe(9);
    // (LR16t) stride 16: the 4th vec4 (the torch's shut doors) is the torch shadows' - a write leaves it, a clear zeros it
    expect(TORCH_DRAW_STRIDE).toBe(16);
    expect(Array.from(buf.subarray(o + 12, o + 16))).toEqual([9, 9, 9, 9]);
    expect(buf[2 * TORCH_DRAW_STRIDE]).toBe(9);
    l.on = false;
    writeTorchDraw(buf, 1, l);
    expect(Array.from(buf.subarray(o, o + TORCH_DRAW_STRIDE))).toEqual(new Array(TORCH_DRAW_STRIDE).fill(0));
    writeTorchDraw(buf, 0, null);
    expect(buf[3]).toBe(0);
    // the shader reads the same constants
    expect(TORCH_DRAW_GLSL).toContain(`c < ${TORCH_DRAW_SLOTS}`);
    expect(TORCH_DRAW_GLSL).toContain(TORCH_CUT_SOFT.toFixed(2));
  });

  it('(lrpolish, LR15 polish 5) the rig: 1 shadow slot and 3 torches -> 1 shadowed, 2 drawn', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { LightRig } = await import('../src/world/lightRig');
    const { LightRegistry } = await import('../src/world/lights');
    const run = (): { drawn: number; buf: Float32Array } => {
      const scene = new Scene(new NullEngine());
      const reg = new LightRegistry();
      for (let i = 0; i < 3; i++) reg.add({ kind: 'flashlight', x: i * 2, y: 1.45, z: 0, radius: TORCH.radius, intensity: TORCH.intensity, color: [...TORCH.color], cone: makeCone(1, -0.2, 0, TORCH.outer, TORCH.inner), on: true, destructible: false, electric: false });
      const rig = new LightRig(scene, reg);
      rig.configure({ lights: 8, shadow: { sun: false, cascades: 0, sunSize: 0, casters: 1, size: 64, soft: false, charLamps: 0, charTile: 0 }, volumetric: false, minimal: true });
      const buf = new Float32Array(TORCH_DRAW_SLOTS * TORCH_DRAW_STRIDE);
      rig.setTorchDraw(buf);
      rig.update(1, 0, 1.6, 0);
      const drawn = rig.drawnTorches;
      scene.getEngine().dispose();
      return { drawn, buf };
    };
    const on = run();
    expect(on.drawn).toBe(2);
    // two slots filled (reach > 0), the rest empty
    let filled = 0;
    for (let s = 0; s < TORCH_DRAW_SLOTS; s++) if (on.buf[s * TORCH_DRAW_STRIDE + 3]! > 0) filled++;
    expect(filled).toBe(2);
  });
});
