import { describe, expect, it } from 'vitest';
import { contribution, LIGHT, LightRegistry, makeCone, nearestLights, visibilityFromLight, type Occluder } from '../src/world/lights';
import { LightField } from '../src/world/lightField';
import { LAMP_CONE_COS, LAMP_EXP, lampCone, lampFalloff, lampTerm, moonLight, SPOT_EXP } from '../src/world/lampMath';

// (3.6: falloff and cones come from `lampMath`; a field without a bake sums every light with the caller's ray test)
const lightLevelAt = (r: LightRegistry, x: number, y: number, z: number, occ?: Occluder): number => new LightField(null, r).totalAt(x, y, z, occ);
const bodyLightLevel = (r: LightRegistry, x: number, y: number, z: number, h: number): number => new LightField(null, r).bodyLevel(x, y, z, h);

describe('light model', () => {
  it('falloff is 1 at the light, linear, and 0 at the radius', () => {
    expect(lampFalloff(0, 5)).toBe(1);
    expect(lampFalloff(5, 5)).toBe(0);
    expect(lampFalloff(9, 5)).toBe(0);
    expect(lampFalloff(2.5, 5)).toBeCloseTo(0.5);
    let prev = 2;
    for (let d = 0; d <= 5; d += 0.25) {
      const f = lampFalloff(d, 5);
      expect(f).toBeLessThanOrEqual(prev);
      prev = f;
    }
  });

  it('cones: a spot is the squared cosine inside its outer angle and nothing outside; a lamp lights the hemisphere below by the cosine', () => {
    expect(lampCone(1, Math.cos(0.6), SPOT_EXP)).toBe(1);
    expect(lampCone(Math.cos(0.5), Math.cos(0.6), SPOT_EXP)).toBeCloseTo(Math.cos(0.5) ** 2);
    expect(lampCone(Math.cos(0.7), Math.cos(0.6), SPOT_EXP)).toBe(0);
    expect(lampCone(0.5, LAMP_CONE_COS, LAMP_EXP)).toBeCloseTo(0.5);
    // (above a lamp: nothing)
    expect(lampCone(-0.2, LAMP_CONE_COS, LAMP_EXP)).toBe(0);
  });

  it('known values of the one formula', () => {
    // straight under a lamp, half its reach down: falloff 0.5, cone 1
    expect(lampTerm(0, -3, 0, 6, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP)).toBeCloseTo(0.5, 6);
    // 3 m out and 4 m down from a lamp of reach 10: falloff 0.5, cosine 0.8
    expect(lampTerm(3, -4, 0, 10, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP)).toBeCloseTo(0.4, 6);
    // a spot pointing down, 30 degrees off its axis at 2 m of 8 m: 0.75 x cos(30)^2
    const c = Math.cos(Math.PI / 6);
    expect(lampTerm(2 * Math.sin(Math.PI / 6), -2 * c, 0, 8, 0, -1, 0, Math.cos(0.7), SPOT_EXP)).toBeCloseTo(0.75 * c * c, 6);
    // beyond the reach and level with an omni lamp: nothing
    expect(lampTerm(0, -8.1, 0, 8, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP)).toBe(0);
    expect(lampTerm(2, 0.5, 0, 8, 0, -1, 0, LAMP_CONE_COS, LAMP_EXP)).toBe(0);
    // the moon's share: a theme's sun light against its sky fill
    expect(moonLight({ lightLevel: 0.3, ambient: 0.3, sunIntensity: 0.16 })).toBeCloseTo(0.3 * 0.16 / 0.46, 6);
    expect(moonLight({ ambient: 0, sunIntensity: 0 })).toBe(0);
  });

  it('level = ambient + contributions, clamped; off and destroyed lights give nothing', () => {
    const r = new LightRegistry();
    r.ambient = 0.1;
    const l = r.add({ x: 0, y: 3, z: 0, radius: 6, intensity: 0.8 });
    expect(lightLevelAt(r, 30, 0, 0)).toBeCloseTo(0.1);
    const under = lightLevelAt(r, 0, 1, 0);
    expect(under).toBeGreaterThan(0.5);
    expect(under).toBeLessThanOrEqual(1);
    r.add({ x: 0, y: 3, z: 0.5, radius: 6, intensity: 0.8 });
    expect(lightLevelAt(r, 0, 1, 0)).toBe(1);
    r.setOn(1, false);
    expect(lightLevelAt(r, 0, 1, 0)).toBeCloseTo(under);
    expect(r.destroy(l.id)).toBe(true);
    expect(r.destroy(l.id)).toBe(false);
    expect(lightLevelAt(r, 0, 1, 0)).toBeCloseTo(0.1);
    // a destroyed light cannot be switched back on through its group
    l.group = 3;
    expect(r.setGroup(3, true)).toBe(0);
  });

  it('occlusion only runs for lights in range, and blocks them', () => {
    const r = new LightRegistry();
    r.ambient = 0;
    r.add({ x: 0, y: 3, z: 0, radius: 5 });
    r.add({ x: 50, y: 3, z: 0, radius: 5 });
    const tested: number[] = [];
    const lvl = lightLevelAt(r, 0, 1, 0, (l) => {
      tested.push(l.id);
      return true;
    });
    expect(lvl).toBe(0);
    expect(tested).toEqual([0]);
  });

  it('spot lights only light inside their cone', () => {
    const r = new LightRegistry();
    r.ambient = 0;
    const s = r.add({ kind: 'spot', x: 0, y: 4, z: 0, radius: 10, intensity: 1, cone: makeCone(0, -1, 0, 0.4) });
    expect(contribution(s, 0, 0, 0)).toBeGreaterThan(0.5);
    expect(contribution(s, 4, 0, 0)).toBe(0);
  });

  it('body level: the brighter of chest and head; crouching under a pool keeps the head out of it', () => {
    const r = new LightRegistry();
    r.ambient = 0.05;
    // a low, short-range lamp above head height: a standing head is in it, a crouch is not
    r.add({ x: 0, y: 1.9, z: 0, radius: 0.6, intensity: 1 });
    const stand = bodyLightLevel(r, 0, 0, 0, 1.75);
    const crouch = bodyLightLevel(r, 0, 0, 0, 1.15);
    expect(stand).toBeGreaterThan(0.5);
    expect(crouch).toBeLessThan(stand);
  });

  it('switch groups and EMP outages', () => {
    const r = new LightRegistry();
    r.add({ x: 0, y: 3, z: 0, group: 1 });
    r.add({ x: 2, y: 3, z: 0, group: 1 });
    r.add({ x: 30, y: 3, z: 0, group: 2, electric: false });
    const v0 = r.version;
    expect(r.setGroup(1, false)).toBe(2);
    expect(r.countOn()).toBe(1);
    expect(r.version).toBeGreaterThan(v0);
    r.setGroup(1, true);
    // EMP: electric lights near the blast go out for a while (the non-electric fire stays)
    expect(r.disrupt(1, 1, 0, 10, 8)).toBe(2);
    expect(r.disrupt(30, 1, 0, 10, 8)).toBe(0);
    r.update(7.9);
    expect(r.countOn()).toBe(1);
    r.update(0.2);
    expect(r.countOn()).toBe(3);
  });

  it('nearest lights: ordered, capped, skips lights that are off, no allocation of results', () => {
    const r = new LightRegistry();
    for (let i = 0; i < 10; i++) r.add({ x: i * 5, y: 3, z: 0, radius: 4 });
    r.setOn(1, false);
    const ids = new Int32Array(3);
    const dist = new Float32Array(3);
    const n = nearestLights(r, 6, 3, 0, ids, dist);
    expect(n).toBe(3);
    // x = 10 is 4 m away, x = 0 is 6, x = 15 is 9 (x = 5 is off)
    expect(Array.from(ids)).toEqual([2, 0, 3]);
    expect(dist[0]!).toBeLessThanOrEqual(dist[1]!);
    expect(dist[1]!).toBeLessThanOrEqual(dist[2]!);
    const few = new LightRegistry();
    few.add({ x: 0, y: 0, z: 0 });
    expect(nearestLights(few, 0, 0, 0, ids, dist)).toBe(1);
  });

  it('visibility from light: dim but never zero in shadow, full when lit, monotone', () => {
    expect(visibilityFromLight(0)).toBeCloseTo(0.25);
    expect(visibilityFromLight(1)).toBeCloseTo(1);
    expect(visibilityFromLight(LIGHT.lit)).toBeCloseTo(1);
    let prev = 0;
    for (let l = 0; l <= 1; l += 0.05) {
      const v = visibilityFromLight(l);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});
