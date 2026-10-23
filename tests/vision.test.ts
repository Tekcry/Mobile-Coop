import { describe, expect, it } from 'vitest';
import { VISION_CYCLE, VisionState, visionKind, visionLabel } from '../src/game/vision';
import { ELECTRO_KINDS, electroColor, heatOf, SENSOR_GRAIN, sensorGrainAmp, thermalColor, thermalGrainAmp, THERMAL, VISION_GLSL } from '../src/vfx/visionLook';
import { luma709 } from '../src/vfx/nightVision';


describe('vision modes', () => {
  it('the button cycles off -> thermal -> electro -> night -> off, CT order, an instant cut (G100)', () => {
    const v = new VisionState();
    expect(VISION_CYCLE).toEqual(['off', 'thermal', 'electro', 'night']);
    for (const want of ['thermal', 'electro', 'night', 'off'] as const) {
      expect(v.cycle()).toBe(want);
      // no flip: the image is the chosen mode at once
      expect(v.shown).toBe(want);
      expect(v.kind).toBe(visionKind(want));
      expect(v.night).toBe(want === 'night' ? 1 : 0);
    }
    expect([visionKind('off'), visionKind('night'), visionKind('thermal'), visionKind('electro')]).toEqual([0, 0, 1, 2]);
    expect(visionLabel('off')).toBe('');
    expect(visionLabel('thermal')).toBe('THERMAL');
  });
  it('resets to off at once on respawn', () => {
    const v = new VisionState();
    v.cycle();
    v.cycle();
    expect(v.shown).toBe('electro');
    v.reset();
    expect(v.mode).toBe('off');
    expect(v.shown).toBe('off');
    expect(v.kind).toBe(0);
  });
  it('thermal (G102): the cold scene is flat indigo, heat climbs the CT ramp to a red core; electro: flat navy, devices glow white', () => {
    const cold = thermalColor(0.2);
    expect(cold[2]).toBeGreaterThan(cold[1]);
    expect(luma709(cold)).toBeLessThan(0.12);
    // the room is nearly invisible: every luma under coldTo is within a few percent of the same colour
    const lit = thermalColor(THERMAL.coldTo);
    for (let i = 0; i < 3; i++) expect(Math.abs(lit[i]! - cold[i]!)).toBeLessThan(0.08);
    expect(heatOf(THERMAL.coldTo)).toBe(0);
    const core = thermalColor(1);
    expect(core[0]).toBeGreaterThan(0.9);
    expect(core[1]).toBeLessThan(0.4);
    // a dim door silhouette lands low on the ramp: blue, not green / yellow
    const ghost = thermalColor(THERMAL.doorGhost);
    expect(ghost[2]).toBeGreaterThan(ghost[0]);
    expect(ghost[2]).toBeGreaterThan(ghost[1]);
    const dim = electroColor(0.3);
    expect(dim[2]).toBeGreaterThan(dim[0]);
    expect(luma709(dim)).toBeLessThan(0.2);
    expect(luma709(electroColor(1))).toBeGreaterThan(0.85);
    expect(VISION_GLSL).toContain('thermalColor');
    expect(VISION_GLSL).toContain('electroColor');
  });
  it('G101 grain: thermal on warm areas only, none in electro, night strongest in the dark (nv-pass slice 1)', () => {
    expect(thermalGrainAmp(0)).toBeLessThan(0.02);
    expect(thermalGrainAmp(0.8)).toBeGreaterThan(0.2);
    expect(SENSOR_GRAIN.electro).toBe(0);
    expect(sensorGrainAmp('electro', 0)).toBe(0);
    // (nv-pass slice 1) an intensifier's scintillation: peak to peak 6% at black (std under 2%), under half of it at
    // full drive
    expect(sensorGrainAmp('night', 0)).toBeGreaterThanOrEqual(0.05);
    expect(sensorGrainAmp('night', 0)).toBeLessThanOrEqual(0.08);
    expect(sensorGrainAmp('night', 1)).toBeLessThan(sensorGrainAmp('night', 0) * 0.5);
    expect(sensorGrainAmp('night', 0.5)).toBeLessThan(sensorGrainAmp('night', 0));
    expect(sensorGrainAmp('night', 0.5)).toBeGreaterThan(sensorGrainAmp('night', 1));
    expect(SENSOR_GRAIN.rate).toBeGreaterThanOrEqual(30);
    expect(SENSOR_GRAIN.cells).toBeGreaterThan(300);
    expect(VISION_GLSL).toContain('sensorNoise');
    expect(VISION_GLSL).toContain('thermalGrain');
    expect(VISION_GLSL).not.toContain('sin(');
  });
});

describe('electro devices (step 14, A53)', () => {
  it('only powered interactable kinds glow', () => {
    for (const k of ['switch', 'alarm', 'terminal', 'charge']) expect(ELECTRO_KINDS.has(k)).toBe(true);
    for (const k of ['intel', 'cache', 'extract', 'hide', 'body', 'door', 'vip', 'revive']) expect(ELECTRO_KINDS.has(k)).toBe(false);
  });
});

describe('instant vision cut (G100)', () => {
  it('every change shows the chosen mode at once: no flip, no timer', () => {
    const v = new VisionState();
    expect('flipT' in v).toBe(false);
    v.toggle();
    expect(v.shown).toBe(v.mode);
    expect(v.change).toBe('on');
    v.select('thermal'); // a switch between modes
    expect(v.change).toBe('switch');
    expect(v.shown).toBe('thermal');
    expect(v.kind).toBe(1);
    v.toggle();
    expect(v.change).toBe('off');
    expect(v.shown).toBe('off');
  });

  it('cycles in CT order: thermal, electro, night, off', () => {
    const v = new VisionState();
    expect([v.cycle(), v.cycle(), v.cycle(), v.cycle()]).toEqual(['thermal', 'electro', 'night', 'off']);
  });
});
