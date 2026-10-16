import { describe, expect, it } from 'vitest';
import { VISION, VISION_CYCLE, VisionState, visionKind, visionLabel } from '../src/game/vision';
import { ELECTRO_KINDS, electroColor, SENSOR_GRAIN, sensorGrainAmp, thermalColor, VISION_GLSL } from '../src/vfx/visionLook';
import { luma709 } from '../src/vfx/nightVision';

/** The top of thermal's cold ramp (THERMAL.hotFrom). */
const THERMAL_COOL = 0.55;

const run = (v: VisionState, sec: number, dt = 1 / 60): void => {
  for (let t = 0; t < sec; t += dt) v.step(dt);
};

describe('vision modes', () => {
  it('the button cycles off -> night -> thermal -> electro -> off (step 14)', () => {
    const v = new VisionState();
    expect(VISION_CYCLE).toEqual(['off', 'night', 'thermal', 'electro']);
    expect(v.cycle()).toBe('night');
    expect(v.cycle()).toBe('thermal');
    expect(v.cycle()).toBe('electro');
    expect(v.cycle()).toBe('off');
    expect([visionKind('off'), visionKind('night'), visionKind('thermal'), visionKind('electro')]).toEqual([0, 0, 1, 2]);
    expect(visionLabel('off')).toBe('');
    expect(visionLabel('thermal')).toBe('THERMAL');
  });
  it('every switch is one flip; the image changes at its middle', () => {
    const v = new VisionState();
    for (const want of ['night', 'thermal', 'electro', 'off'] as const) {
      const was = v.shown;
      v.cycle();
      run(v, VISION.flip * 0.4);
      expect(v.shown).toBe(was);
      expect(Number.isNaN(v.flipCentre)).toBe(false);
      run(v, VISION.flip * 0.2);
      expect(v.shown).toBe(want);
      expect(v.kind).toBe(visionKind(want));
      expect(v.night).toBe(want === 'night' ? 1 : 0);
      run(v, VISION.flip);
      expect(Number.isNaN(v.flipCentre)).toBe(true);
    }
  });
  it('a press during a flip queues one more flip to the newest mode', () => {
    const v = new VisionState();
    v.cycle();
    run(v, VISION.flip * 0.3);
    v.cycle();
    run(v, VISION.flip * 0.8);
    expect(v.shown).toBe('night');
    run(v, VISION.flip * 1.2);
    expect(v.shown).toBe('thermal');
  });
  it('resets to off at once on respawn', () => {
    const v = new VisionState();
    v.cycle();
    v.cycle();
    run(v, VISION.flip * 3);
    expect(v.shown).toBe('thermal');
    v.reset();
    expect(v.mode).toBe('off');
    expect(v.shown).toBe('off');
    expect(v.kind).toBe(0);
    expect(Number.isNaN(v.flipCentre)).toBe(true);
  });
  it('thermal: cold scene blue-grey and dark, heat white-hot; electro: dim green, live devices glow', () => {
    const cold = thermalColor(0.2);
    expect(cold[2]).toBeGreaterThan(cold[0]);
    expect(luma709(cold)).toBeLessThan(0.3);
    expect(luma709(thermalColor(1))).toBeGreaterThan(0.85);
    let prev = -1;
    for (let l = 0; l <= 1.0001; l += 0.05) {
      const y = luma709(thermalColor(l));
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = y;
    }
    const dim = electroColor(0.3);
    expect(dim[1]).toBeGreaterThan(dim[0]);
    expect(luma709(dim)).toBeLessThan(0.15);
    expect(luma709(electroColor(1))).toBeGreaterThan(0.85);
    expect(VISION_GLSL).toContain('thermalColor');
    expect(VISION_GLSL).toContain('electroColor');
  });
  it('step 21v: sensor grain on every goggle mode, luminance-weighted, moderate, animated', () => {
    // M14 N7: grainier than step 14 (0.04 thermal / electro, 0.075 night), still readable (under 0.15 peak to peak)
    for (const m of ['thermal', 'electro', 'night'] as const) {
      const dark = sensorGrainAmp(m, 0);
      expect(dark).toBeGreaterThan(m === 'night' ? 0.075 : 0.04);
      expect(dark).toBeLessThanOrEqual(0.15);
      // the bright end (hot bodies, live devices, lit phosphor) carries less grain, but some
      expect(sensorGrainAmp(m, 1)).toBeLessThan(dark * 0.6);
      expect(sensorGrainAmp(m, 1)).toBeGreaterThan(0);
      expect(sensorGrainAmp(m, 2)).toBe(sensorGrainAmp(m, 1));
    }
    // thermal: a white-hot body plus its worst grain stays brighter than the coolest scene plus its best
    const hot = luma709(thermalColor(1)) - sensorGrainAmp('thermal', luma709(thermalColor(1))) / 2;
    const cool = luma709(thermalColor(THERMAL_COOL)) + sensorGrainAmp('thermal', luma709(thermalColor(THERMAL_COOL))) / 2;
    expect(hot).toBeGreaterThan(cool + 0.3);
    // a new field at least every second frame at 60 Hz; the size is per screen height, not per pixel
    expect(SENSOR_GRAIN.rate).toBeGreaterThanOrEqual(30);
    expect(SENSOR_GRAIN.cells).toBeGreaterThan(300);
    expect(VISION_GLSL).toContain('sensorNoise');
    expect(VISION_GLSL).not.toContain('sin(');
  });
  it('only the flip time is a constant', () => {
    expect(Object.keys(VISION)).toEqual(['flip']);
    expect(VISION.flip).toBe(0.2);
  });
  it('night vision does not fade: the goggles flip and it switches at the middle (Step 4b fix round 3)', () => {
    const v = new VisionState();
    expect(Number.isNaN(v.flipCentre)).toBe(true);
    v.cycle();
    run(v, VISION.flip * 0.4);
    expect(v.night).toBe(0);
    // flipping down: the housing comes from above the screen
    expect(v.flipCentre).toBeGreaterThan(0.5);
    run(v, VISION.flip * 0.2);
    expect(v.night).toBe(1);
    run(v, VISION.flip);
    expect(v.night).toBe(1);
    expect(Number.isNaN(v.flipCentre)).toBe(true);
    v.set('off');
    run(v, VISION.flip * 0.4);
    expect(v.night).toBe(1);
    // flipping up: from below
    expect(v.flipCentre).toBeLessThan(0.5);
    run(v, VISION.flip);
    expect(v.night).toBe(0);
  });
});

describe('electro devices (step 14, A53)', () => {
  it('only powered interactable kinds glow', () => {
    for (const k of ['switch', 'alarm', 'terminal', 'charge']) expect(ELECTRO_KINDS.has(k)).toBe(true);
    for (const k of ['intel', 'cache', 'extract', 'hide', 'body', 'door', 'vip', 'revive']) expect(ELECTRO_KINDS.has(k)).toBe(false);
  });
});
