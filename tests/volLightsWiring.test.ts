import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { LightRegistry, makeCone, type LightDef } from '../src/world/lights';
import { mapLampBeams, VOL_BEAM_GAIN, VOL_BEAM_MAX, VOL_LAMP_COS, VOL_LAMP_MAX, writeVolLights } from '../src/vfx/volLights';
import { campusOps } from '../src/world/maps/campusOps';
import { ctcourse } from '../src/world/maps/ctcourse';
import { warehouseOps } from '../src/world/maps/warehouseOps';

const COOL: [number, number, number] = [0.9, 0.95, 1];
const STRIP = { sx: 0.25, sy: 0.08, sz: 2.6, oy: 0.15, model: 'strip' as const };
const HOUSING = { sx: 0.45, sy: 0.22, sz: 0.3, oy: 0.12 };

/** A coned fixed lamp with a plain box fitting (a campus cone fitting / a flood), an LED strip and a torch. */
function fakeLights(): LightDef[] {
  const reg = new LightRegistry();
  reg.add({ kind: 'spot', x: 0, y: 5, z: 0, radius: 7.5, intensity: 0.9, color: COOL, cone: makeCone(0, -1, 0, 0.7), fixture: HOUSING });
  reg.add({ kind: 'spot', x: 4, y: 5, z: 0, radius: 7, intensity: 0.7, color: COOL, cone: makeCone(0, -1, 0, Math.PI / 4), fixture: STRIP });
  reg.add({ kind: 'flashlight', x: 8, y: 1.6, z: 0, radius: 10, intensity: 1, color: COOL, cone: makeCone(0, -0.2, 1, 0.3) });
  return reg.lights;
}

/** The long beam's march / gain (`writeVolLight`): the reach capped at 14 m, x 1.6. */
const beamMarch = (l: LightDef): number => Math.min(l.reach ?? l.radius, VOL_BEAM_MAX);
const lampMarch = (l: LightDef): number => Math.min(VOL_LAMP_MAX, l.radius * 0.5, Math.max(0.8, l.y));

describe('vol-light wiring (fog triage): theme.lampBeams -> GameState -> PostStack -> writeVolLights', () => {
  it('mapLampBeams: no theme or no field -> true (floods keep the beam); false -> false', () => {
    expect(mapLampBeams(undefined)).toBe(true);
    expect(mapLampBeams({})).toBe(true);
    expect(mapLampBeams({ lampBeams: true })).toBe(true);
    expect(mapLampBeams({ lampBeams: false })).toBe(false);
  });

  it('the real maps: Saltmarsh Park turns the lamp beams off; Marlow Yard and Sector Ops keep the default', () => {
    expect(mapLampBeams(campusOps.theme)).toBe(false);
    expect(mapLampBeams(ctcourse.theme)).toBe(true);
    expect(mapLampBeams(warehouseOps.theme)).toBe(true);
  });

  it('writeVolLights: lampBeams false -> only the torch beams; true -> the coned box lamp beams too; the LED strip never', () => {
    const lights = fakeLights();
    const [lamp, strip, torch] = lights as [LightDef, LightDef, LightDef];
    // nearest first: the torch, the strip, the lamp (slot k = the k-th id)
    const ids = new Int32Array([2, 1, 0, 0]);
    const pos = new Float32Array(16).fill(-7);
    const dir = new Float32Array(16);
    const col = new Float32Array(16);
    // the slot the shader reads as a beam: march (pos.w), cone (dir.w), gain (col.r / colour.r)
    const slot = (k: number): { march: number; cos: number; gain: number } => ({ march: pos[k * 4 + 3]!, cos: dir[k * 4 + 3]!, gain: col[k * 4]! / COOL[0] });

    expect(writeVolLights(lights, ids, 3, false, pos, dir, col)).toBe(3);
    expect(pos[15]).toBe(-7); // slot 3 untouched (n = 3)
    // the torch: the long beam
    expect(slot(0).march).toBeCloseTo(beamMarch(torch), 5);
    expect(slot(0).march).toBeGreaterThan(VOL_LAMP_MAX);
    expect(slot(0).cos).toBeCloseTo(Math.cos(0.3), 5);
    expect(slot(0).gain).toBeCloseTo(torch.intensity * torch.flicker * VOL_BEAM_GAIN, 5);
    // the strip and the coned box lamp: haze under the shade
    for (const [k, l] of [[1, strip], [2, lamp]] as const) {
      expect(slot(k).march).toBeCloseTo(lampMarch(l), 5);
      expect(slot(k).march).toBeLessThanOrEqual(VOL_LAMP_MAX + 1e-6);
      expect(slot(k).cos).toBeCloseTo(VOL_LAMP_COS, 5);
      expect(slot(k).gain).toBeCloseTo(l.intensity * l.flicker, 5);
    }

    expect(writeVolLights(lights, ids, 3, true, pos, dir, col)).toBe(3);
    expect(slot(0).march).toBeCloseTo(beamMarch(torch), 5);
    expect(slot(1).march).toBeCloseTo(lampMarch(strip), 5);
    expect(slot(1).gain).toBeCloseTo(strip.intensity * strip.flicker, 5);
    // the coned box lamp now takes the beam: its reach, its own cone, gain 1.6
    expect(slot(2).march).toBeCloseTo(beamMarch(lamp), 5);
    expect(slot(2).march).toBeGreaterThan(VOL_LAMP_MAX);
    expect(slot(2).cos).toBeCloseTo(Math.cos(0.7), 5);
    expect(slot(2).gain).toBeCloseTo(lamp.intensity * lamp.flicker * VOL_BEAM_GAIN, 5);

    // n counts what is written (the governor's / preset's cap)
    expect(writeVolLights(lights, ids, 0, true, pos, dir, col)).toBe(0);
    expect(writeVolLights(lights, ids, 4, true, pos, dir, col)).toBe(4);
  });

  it('wiring guard: PostStack passes the option to writeVolLights and GameState reads the map theme through mapLampBeams', () => {
    // dropping either line would pass every behaviour test above: the pass only runs on a GPU page.
    // (polish3) the files are read relative to this test, not the process cwd: the chdir proves it
    const cwd = process.cwd();
    let post: string;
    let gs: string;
    try {
      process.chdir(tmpdir());
      post = readFileSync(new URL('../src/vfx/postStack.ts', import.meta.url), 'utf8');
      gs = readFileSync(new URL('../src/game/gameState.ts', import.meta.url), 'utf8');
    } finally {
      process.chdir(cwd);
    }
    expect(
      post,
      'wiring guard: postStack.ts must pass this.opts.lampBeams ?? true to writeVolLights; if you rewrote that line on purpose, update this regex with it, do not loosen it',
    ).toMatch(/writeVolLights\([^;]*\bthis\.opts\.lampBeams\s*\?\?\s*true\b[^;]*\)/);
    expect(
      gs,
      'wiring guard: gameState.ts must pass lampBeams: mapLampBeams(world.map.theme) to the post stack; if you rewrote that line on purpose, update this regex with it, do not loosen it',
    ).toMatch(/\blampBeams:\s*mapLampBeams\(world\.map\.theme\)/);
  });
});
