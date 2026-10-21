/**
 * (sector-fixes C, items 4 and 5) The laser sensor in `CtDevices` with a stand-in match: a break raises the alarm on
 * the camera's path and never deals damage; the beams are infrared, drawn only in night vision, and the sensor works
 * the same in every vision mode (gameplay never reads the drawing).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Vector3, Vector4 } from '../src/core/babylon';
import { ALARM_GAP, LASER, type LaserDef } from '../src/game/jammer';
import type { CtDevices as CtDevicesT } from '../src/game/ctDevices';

const LASER_DEF: LaserDef = { id: 'laser-t', x1: 10, z1: 4, x2: 10, z2: 10, ys: [0.35, 0.9, 1.45], label: 'Test laser' };

interface FakeBeam {
  enabled: boolean;
  instancedBuffers: { pattern: Vector4 };
  scaling: Vector3;
  position: Vector3;
  rotation: Vector3;
  isPickable: boolean;
  setEnabled(on: boolean): void;
  isEnabled(): boolean;
  dispose(): void;
}

function beam(): FakeBeam {
  return {
    enabled: true,
    instancedBuffers: { pattern: new Vector4(0, 1, 0, 0) },
    scaling: new Vector3(),
    position: new Vector3(),
    rotation: new Vector3(),
    isPickable: true,
    setEnabled(on) {
      this.enabled = on;
    },
    isEnabled() {
      return this.enabled;
    },
    dispose() {},
  };
}

function world() {
  const beams: FakeBeam[] = [];
  const damage: unknown[] = [];
  const banners: string[] = [];
  const player = {
    id: 'host',
    feet: new Vector3(0, 0, 7),
    crouched: false,
    speed: 0,
    light: 1,
    target: { alive: true, health: { hp: 100 }, applyDamage: (d: unknown) => damage.push(d), aimPoint: (o: Vector3) => o },
  };
  const g = {
    world: { layout: { lasers: [LASER_DEF] }, parts: { instance: () => { const b = beam(); beams.push(b); return b; } }, lightField: { totalAt: () => 1 } },
    scene: {},
    security: null,
    ballistics: { hitDistance: (a: Vector3, b: Vector3) => Vector3.Distance(a, b) },
    app: { quality: { level: { minimal: false } } },
    vision: { night: 0, kind: 0 },
    hud: { banner: (t: string, s: string) => banners.push(`${t}|${s}`) },
    playerRefs: () => [player],
    weapons: { slots: [] },
  };
  return { g, beams, damage, banners, player };
}

describe('(sector-fixes C) the laser sensor', () => {
  let CtDevices: typeof CtDevicesT;
  beforeAll(async () => {
    (globalThis as unknown as { window: unknown }).window ??= globalThis;
    ({ CtDevices } = await import('../src/game/ctDevices'));
  });
  afterAll(() => {
    delete (globalThis as unknown as { __ctdev?: unknown }).__ctdev;
  });

  const make = () => {
    const w = world();
    const said: string[] = [];
    const records: string[] = [];
    const dev = new CtDevices(w.g as never, 'host', { say: (t) => said.push(t), record: (s) => records.push(s), dirty: () => undefined });
    return { ...w, dev, said, records };
  };
  const step = (dev: CtDevicesT, s: number): void => {
    for (let t = 0; t < s; t += 1 / 60) dev.fixedUpdate(1 / 60);
  };

  it('a break raises the alarm on the camera path (stage, stat, banner, radio) and deals no damage', () => {
    const m = make();
    step(m.dev, 0.5);
    expect(m.dev.alarm).toBe(0);
    // walk into the band
    m.player.feet.set(10.1, 0, 7);
    step(m.dev, 0.1);
    expect(m.dev.hits).toBe(1);
    expect(m.dev.alarm).toBe(1);
    expect(m.records).toEqual(['alarms']);
    expect(m.banners[0]).toBe('ALARM STAGE 1|Test laser tripped');
    expect(m.said[0]).toMatch(/Test laser tripped: alarm stage 1/);
    expect(m.damage).toEqual([]);
    expect(m.player.target.health.hp).toBe(100);
    // standing in it: one break per cooldown, the stage once per ALARM_GAP
    step(m.dev, LASER.cooldown + 0.1);
    expect(m.dev.hits).toBe(2);
    expect(m.dev.alarm).toBe(1);
    step(m.dev, ALARM_GAP);
    expect(m.dev.alarm).toBe(2);
    expect(m.damage).toEqual([]);
    expect(m.player.target.health.hp).toBe(100);
    m.dev.dispose();
  });

  it('the beams are drawn only in night vision, and the sensor works the same with them hidden or shown', () => {
    const m = make();
    expect(m.beams.length).toBe(3);
    step(m.dev, 0.1);
    expect(m.beams.every((b) => !b.enabled)).toBe(true);
    // thermal and electro: still hidden
    m.g.vision.kind = 1;
    step(m.dev, 0.1);
    expect(m.beams.every((b) => !b.enabled)).toBe(true);
    m.g.vision.kind = 2;
    step(m.dev, 0.1);
    expect(m.beams.every((b) => !b.enabled)).toBe(true);
    // night vision: drawn, glowing
    m.g.vision.kind = 0;
    m.g.vision.night = 1;
    step(m.dev, 0.1);
    expect(m.beams.every((b) => b.enabled && b.instancedBuffers.pattern.w > 0)).toBe(true);
    // goggles off: hidden again
    m.g.vision.night = 0;
    step(m.dev, 0.1);
    expect(m.beams.every((b) => !b.enabled)).toBe(true);
    // the sensor trips in normal vision (beams hidden) just as in night vision
    m.player.feet.set(10.1, 0, 7);
    step(m.dev, 0.1);
    expect(m.dev.alarm).toBe(1);
    m.player.feet.set(0, 0, 7);
    m.g.vision.night = 1;
    step(m.dev, LASER.cooldown + ALARM_GAP);
    m.player.feet.set(10.1, 0, 7);
    step(m.dev, 0.1);
    expect(m.dev.alarm).toBe(2);
    expect(m.damage).toEqual([]);
    m.dev.dispose();
  });
});
