/**
 * (LR16-P F2) A picture-only shadow reach for the character slots: `charShadowReach` is where a lamp's level on its axis
 * (`LAMP_LEVEL_GAIN` x intensity x `photoFalloff`) falls to `CHAR_SHADOW.minLevel`. `BakedLamps.spheres` w carries it:
 * the slot picker, the casters a slot's map draws and its fit follow it; the map's far plane stays at the light's reach
 * (`lightReach`). A character past the shadow reach keeps his capsule. The light field never reads `spheres`.
 */
import { describe, expect, it } from 'vitest';
import { CHAR_SHADOW, charShadowReach, FIT, fittedSpheres, LampSlotPicker } from '../src/world/charShadowSet';
import { LAMP_LEVEL_GAIN, lampReach, photoFalloff } from '../src/world/lampMath';
import type { CharShadowLamps, CharShadows } from '../src/world/charShadows';

const level = (intensity: number, d: number, reach: number): number => LAMP_LEVEL_GAIN * intensity * photoFalloff(d, reach);

describe('(LR16-P F2) charShadowReach', () => {
  it('within the reach; the level there is minLevel', () => {
    for (const radius of [3, 4.5, 6, 8, 12]) {
      const R = lampReach(radius);
      for (const intensity of [0.2, 0.5, 0.8, 1, 1.5, 3]) {
        const s = charShadowReach(intensity, R);
        expect(s).toBeGreaterThan(0);
        expect(s).toBeLessThanOrEqual(R);
        expect(level(intensity, s, R)).toBeCloseTo(CHAR_SHADOW.minLevel, 3);
        // (just past it the level is under minLevel)
        expect(level(intensity, Math.min(R, s + 1e-3), R)).toBeLessThan(CHAR_SHADOW.minLevel);
      }
    }
  });

  it('monotonic in intensity; 0 when the lamp never reaches minLevel', () => {
    const R = lampReach(6);
    let last = 0;
    for (let k = 1; k <= 40; k++) {
      const s = charShadowReach(k * 0.1, R);
      expect(s).toBeGreaterThanOrEqual(last);
      last = s;
    }
    // (its peak, at the lamp, is LAMP_LEVEL_GAIN x intensity x 10)
    expect(charShadowReach(0.003, R)).toBe(0);
    expect(charShadowReach(0, R)).toBe(0);
    expect(charShadowReach(1, 0)).toBe(0);
    // the lower the cut, the further; no cut: the whole reach
    expect(charShadowReach(1, R, 0.02)).toBeGreaterThan(charShadowReach(1, R, 0.04));
    expect(charShadowReach(1, R, 0)).toBe(R);
  });

  it('cuts the plan area a slot draws (a 6 m lamp at intensity 1: about 0.7 of it)', () => {
    const R = lampReach(6);
    const s = charShadowReach(1, R);
    const area = (s * s) / (R * R);
    console.info(`radius 6, intensity 1: reach ${R.toFixed(2)} m, shadow reach ${s.toFixed(2)} m, plan area x ${area.toFixed(2)}`);
    expect(area).toBeLessThan(0.8);
    expect(area).toBeGreaterThan(0.4);
  });
});

describe('(LR16-P F2) campusOps', () => {
  it('the slots draw over a smaller plan area on the perf map', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { campusOps } = await import('../src/world/maps/campusOps');
    const { bakedLights } = await import('../src/world/lightBake');
    const { LAMP_STRIDE } = await import('../src/voxel/lampBake');
    const b = new LevelBuilder();
    campusOps.build(b, 0);
    const baked = bakedLights(b.lights);
    let sum = 0;
    let none = 0;
    let zero = 0;
    for (let i = 0; i < baked.ids.length; i++) {
      const R = baked.lights[i * LAMP_STRIDE + 3]!;
      if (!(R > 0)) {
        zero++;
        continue;
      }
      const s = charShadowReach(b.lights.lights[baked.ids[i]!]!.intensity, R);
      if (s <= 0) none++;
      sum += (s * s) / (R * R);
    }
    const mean = sum / (baked.ids.length - zero);
    console.info(`campusOps: ${baked.ids.length} lamps, plan area per slot x ${mean.toFixed(2)} (minLevel ${CHAR_SHADOW.minLevel}), ${none} never reach it, ${zero} with no reach`);
    expect(mean).toBeLessThan(0.85);
  }, 60_000);
});

describe('(LR16-P F2) the slot picker on the shadow spheres', () => {
  it('skips a lamp whose shadow reach + margin misses the focus (the light reach + margin would take it)', () => {
    const R = lampReach(6);
    const s = charShadowReach(1, R);
    // the focus between the two limits
    const d = (s + R) * 0.5 + CHAR_SHADOW.reachMargin;
    const focus = new Float32Array([d, 3, 0, d, 3, 0]);
    const lit = new Uint8Array([1]);
    const light = new LampSlotPicker();
    light.setSlots(1);
    light.update(new Float32Array([0, 3, 0, R]), lit, 1, focus, 2, 1);
    expect(light.slotLamp[0]).toBe(0);
    const shadow = new LampSlotPicker();
    shadow.setSlots(1);
    shadow.update(new Float32Array([0, 3, 0, s]), lit, 1, focus, 2, 1);
    expect(shadow.slotLamp[0]).toBe(-1);
    // (nearer than its shadow reach + margin: taken)
    focus[0] = focus[3] = s + CHAR_SHADOW.reachMargin - 0.5;
    shadow.update(new Float32Array([0, 3, 0, s]), lit, 1, focus, 2, 1);
    expect(shadow.slotLamp[0]).toBe(0);
  });

  it('a lamp whose shadow reach is 0 never takes a slot', () => {
    const p = new LampSlotPicker();
    p.setSlots(1);
    p.update(new Float32Array([0, 3, 0, 0]), new Uint8Array([1]), 1, new Float32Array([0, 1, 0, 0, 1, 0]), 2, 1);
    expect(p.slotLamp[0]).toBe(-1);
  });
});

/** A caster mesh as `gather` reads it. */
const caster = (x: number, y: number, z: number, r: number): unknown => ({
  isEnabled: () => true,
  isVisible: true,
  getBoundingInfo: () => ({ boundingSphere: { centerWorld: { x, y, z }, radiusWorld: r } }),
});

describe('(LR16-P F2) a slot gathers within the shadow reach; its far plane stays at the light reach', () => {
  it('a character past the shadow reach is not drawn and keeps his capsule', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Vector3 } = await import('../src/core/babylon');
    const { CharShadows: Cs } = await import('../src/world/charShadows');
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const R = lampReach(6);
    const s = charShadowReach(1, R);
    const lamps: CharShadowLamps = { count: 1, spheres: new Float32Array([0, 4, 0, s]), lightReach: new Float32Array([R]), lampLit: () => true };
    // one guard well inside, one between the shadow reach and the light's reach (both lit by the lamp)
    const dIn = 3;
    const dOut = (s + R) * 0.5 + 0.5;
    const near = caster(dIn, 1, 0, 0.4);
    const far = caster(0, 1, Math.sqrt(dOut * dOut - 9), 0.4);
    const cs = new Cs(scene, lamps, [near, far] as never);
    const slot = {
      light: { position: new Vector3(), direction: new Vector3(), angle: 1, shadowMinZ: 0.1, shadowMaxZ: 10 },
      list: [] as unknown[], lamp: 0, ready: -1, fit: new Float32Array(FIT.size), fitReady: new Float32Array(FIT.size),
      sp: new Float32Array(256 * 4), k: 0, spReady: new Float32Array(256 * 4), kReady: 0,
    };
    const ok = (cs as unknown as { gather(sl: unknown, lamp: number): boolean }).gather(slot, 0);
    expect(ok).toBe(true);
    expect(slot.list).toEqual([near]);
    expect(slot.k).toBe(1);
    // (the far plane at the light's reach: every point the lamp lights stays in the map's depth range)
    expect(slot.light.shadowMaxZ).toBeCloseTo(R + 0.5, 6);
    // as `copy()` leaves it
    slot.ready = 0;
    slot.fitReady.set(slot.fit);
    slot.kReady = fittedSpheres(0, 4, 0, slot.sp, slot.k, slot.spReady);
    (cs as unknown as { slots: unknown[] }).slots = [slot];
    const c = cs as CharShadows;
    expect(c.covers(0, dIn, 1, 0)).toBe(true);
    expect(c.covers(0, 0, 1, Math.sqrt(dOut * dOut - 9))).toBe(false);
    // (without the light reach the far plane follows the radius, as before)
    const old = new Cs(scene, { count: 1, spheres: new Float32Array([0, 4, 0, R]), lampLit: () => true }, [near, far] as never);
    slot.list.length = 0;
    expect((old as unknown as { gather(sl: unknown, lamp: number): boolean }).gather(slot, 0)).toBe(true);
    expect(slot.list).toEqual([near, far]);
    expect(slot.light.shadowMaxZ).toBeCloseTo(R + 0.5, 6);
    scene.dispose();
    engine.dispose();
  });
});
