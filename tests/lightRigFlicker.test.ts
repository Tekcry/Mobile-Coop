/**
 * (lr16pol E, lr16-5 A5) The light rig's fitting glow on a flicker move: a `flickerVersion`-only move writes only the
 * flickering lamps' texels (bulbs, fixture boxes, fitting faces, LR16-5b's swinging pendants) and re-uploads only the
 * meshes that hold one; a `version` move still repaints every bulb; neither allocates per flicker move.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Mesh } from '../src/core/babylon';
import { LightRegistry, type LightDef, type LightFixture } from '../src/world/lights';
import { FLICKER_NONE, FLICKER_STUTTER } from '../src/world/lampFlicker';
import { SwaySet } from '../src/world/lampSway';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

const BOX: LightFixture = { sx: 1.2, sy: 0.08, sz: 0.2, oy: 0.05 };
const strip = (): LightFixture => ({ sx: 1.2, sy: 0.08, sz: 0.2, oy: 0, model: 'strip', base: 'ceiling', yaw: 0, mount: 0 });
const panel = (): LightFixture => ({ sx: 0.6, sy: 0.04, sz: 0.6, oy: 0, model: 'panel', base: 'ceiling', yaw: 0, mount: 0 });

/** The rig's private colour buffers (read and poisoned by the tests only). */
interface RigBufs {
  bulbColors: Float32Array;
  fittings: { ids: Int32Array; colors: Float32Array }[];
  swayColors: Float32Array | null;
}

/** Every kind of drawn light, a steady and a flickering one each (the panel steady only), plus a guard torch. */
function lights(reg: LightRegistry): { steady: LightDef[]; flick: LightDef[] } {
  const steady: LightDef[] = [];
  const flick: LightDef[] = [];
  const add = (fixture: LightFixture | null, f: boolean, x: number): void => {
    const l = reg.add({ x, y: 3, z: 0, radius: 6, color: [1, 0.8, 0.6], fixture });
    (f ? flick : steady).push(l);
    if (f) reg.setFlicker(l.id, FLICKER_STUTTER);
  };
  add(null, false, 0);
  add(null, true, 2);
  add({ ...BOX }, false, 4);
  add({ ...BOX }, true, 6);
  add(strip(), false, 8);
  add(strip(), true, 10);
  add(panel(), false, 12);
  reg.add({ kind: 'flashlight', x: 0, y: 1.45, z: 3, radius: 8, on: false });
  // (LR16-5b) a swinging pendant that also stutters: its glow is drawn by the sway bodies
  const p = reg.add({ x: 14, y: 5, z: 0, radius: 13, color: [1, 0.8, 0.6], fixture: { ...BOX } });
  reg.sway = new SwaySet([{ light: p, hangers: [] }]);
  reg.setFlicker(p.id, FLICKER_STUTTER);
  flick.push(p);
  return { steady, flick };
}

async function rig() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { LightRig } = await import('../src/world/lightRig');
  const scene = new Scene(new NullEngine());
  const reg = new LightRegistry();
  const { steady, flick } = lights(reg);
  const r = new LightRig(scene, reg);
  r.update(1, 0, 1.6, 0);
  const b = r as unknown as RigBufs;
  return { scene, reg, r, b, steady, flick };
}

/** Every texel (rgb) of the rig's colour buffers set to NaN. */
function poison(b: RigBufs): void {
  b.bulbColors.fill(NaN);
  for (const f of b.fittings) f.colors.fill(NaN);
  b.swayColors?.fill(NaN);
}

/** Texels written since `poison` (r not NaN), per buffer. */
function written(a: Float32Array): number {
  let n = 0;
  for (let k = 0; k < a.length; k += 4) if (a[k] === a[k]) n++;
  return n;
}

describe('LightRig fitting glow on a flicker move (lr16pol E)', () => {
  it('a flicker-only move writes only the flickering fittings\' texels, at colour x flicker', async () => {
    const { scene, reg, r, b, steady, flick } = await rig();
    poison(b);
    for (let k = 0; k < flick.length; k++) flick[k]!.flicker = 0.25 + 0.25 * k;
    reg.flickerVersion++;
    r.update(0.01, 0, 1.6, 0);
    // count: one bulb texel per flickering lamp, nothing else
    expect(written(b.bulbColors)).toBe(flick.length);
    for (const l of steady) expect(b.bulbColors[l.id * 4]).toBeNaN();
    for (const l of flick) {
      const k = Math.max(0.08, l.flicker);
      expect(b.bulbColors[l.id * 4]).toBeCloseTo(l.color[0] * k, 6);
      expect(b.bulbColors[l.id * 4 + 1]).toBeCloseTo(l.color[1] * k, 6);
      expect(b.bulbColors[l.id * 4 + 2]).toBeCloseTo(l.color[2] * k, 6);
    }
    // the strip face: only the flickering strip's instance; the panel face: nothing
    const stripFit = b.fittings.find((f) => f.ids.length === 2)!;
    const panelFit = b.fittings.find((f) => f.ids.length === 1)!;
    expect(written(stripFit.colors)).toBe(1);
    const fk = stripFit.ids.indexOf(flick[2]!.id);
    expect(stripFit.colors[fk * 4]).toBeCloseTo(flick[2]!.color[0] * flick[2]!.flicker, 6);
    expect(written(panelFit.colors)).toBe(0);
    // the swinging pendant's body follows its light
    expect(written(b.swayColors!)).toBe(1);
    expect(b.swayColors![0]).toBeCloseTo(b.bulbColors[flick[3]!.id * 4]!, 6);
    scene.getEngine().dispose();
  });

  it('re-uploads only the meshes that hold a flickering lamp', async () => {
    const { scene, reg, r, flick } = await rig();
    const spy = (name: string) => vi.spyOn(scene.getMeshByName(name) as Mesh, 'thinInstanceBufferUpdated');
    const bulbs = spy('lightBulbs');
    const boxes = spy('lightFixtures');
    const stripFace = spy('lampFace-strip');
    const panelFace = spy('lampFace-panel');
    const sway = spy('swayFittings');
    flick[0]!.flicker = 0.5;
    reg.flickerVersion++;
    r.update(0.01, 0, 1.6, 0);
    expect(bulbs).toHaveBeenCalledTimes(1);
    expect(boxes).toHaveBeenCalledTimes(1);
    expect(stripFace).toHaveBeenCalledTimes(1);
    expect(panelFace).not.toHaveBeenCalled();
    expect(sway).toHaveBeenCalledTimes(1);
    scene.getEngine().dispose();
  });

  it('a version move (a switch) still repaints every bulb, with the live flicker', async () => {
    const { scene, reg, r, b, steady, flick } = await rig();
    poison(b);
    flick[0]!.flicker = 0.3;
    reg.flickerVersion++;
    reg.setOn(steady[0]!.id, false);
    r.update(0.01, 0, 1.6, 0);
    expect(written(b.bulbColors)).toBe(reg.lights.length);
    expect(b.bulbColors[steady[0]!.id * 4]).toBeCloseTo(steady[0]!.color[0] * 0.08, 6);
    expect(b.bulbColors[flick[0]!.id * 4]).toBeCloseTo(flick[0]!.color[0] * 0.3, 6);
    for (const f of b.fittings) expect(written(f.colors)).toBe(f.ids.length);
    expect(written(b.swayColors!)).toBe(1);
    scene.getEngine().dispose();
  });

  it('a lamp taken off the flicker list (back at 1, no longer listed) is repainted', async () => {
    const { scene, reg, r, b, flick } = await rig();
    flick[0]!.flicker = 0;
    reg.flickerVersion++;
    r.update(0.01, 0, 1.6, 0);
    expect(b.bulbColors[flick[0]!.id * 4]).toBeCloseTo(flick[0]!.color[0] * 0.08, 6);
    reg.setFlicker(flick[0]!.id, FLICKER_NONE);
    r.update(0.01, 0, 1.6, 0);
    expect(b.bulbColors[flick[0]!.id * 4]).toBeCloseTo(flick[0]!.color[0], 6);
    scene.getEngine().dispose();
  });

  it('a flicker move allocates nothing (tickFlicker + the rig\'s frame)', async () => {
    const { scene, reg, r, b, flick } = await rig();
    const T = inputs(2000, (k) => 100 + k / 60);
    const before = reg.flickerVersion;
    const per = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) {
        reg.tickFlicker(T[i]!);
        r.update(0, 0, 1.6, 0);
        sink[0] = b.bulbColors[flick[0]!.id * 4]!;
      }
    }, HEAP_NUMBER);
    console.info(`bytes per flicker move (rig, ${flick.length} flickering of ${reg.lights.length}): ${per.toFixed(1)}`);
    // (the stutter moved in the run: the paint path was measured, not skipped)
    expect(reg.flickerVersion).toBeGreaterThan(before);
    expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
    scene.getEngine().dispose();
  });
});
