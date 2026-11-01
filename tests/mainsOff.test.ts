// (piano SO1) `LightRegistry.mainsOff`: the mains cut for good in the one lighting system (built for the removed piano scene's EMP). Every electric light
// goes dark for good in order of distance over 0.8 s; torches and window lights stay; nothing turns a cut lamp back on;
// the client gets it in the `lamps` snapshot; the light field (meter, guard sight) drops with it; the step allocates nothing.
import { describe, expect, it } from 'vitest';
import { DARK_NONE, darkState, type BreakerHost } from '../src/ai/breaker';
import { SectionStartState, type ResetDoor } from '../src/game/sectorReset';
import { LampMirror, LampSender, LAMP_OFF, readLamps } from '../src/net/lampSync';
import { LightField } from '../src/world/lightField';
import { LightRegistry } from '../src/world/lights';
import { addTorchSlots } from '../src/world/torches';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

const DT = 1 / 60;

/** Electric lamps at x 2, 4, 8, 12 (id 0..3, circuit 1), a window light (4), a fire (5), then the torch slots. */
function level(): LightRegistry {
  const reg = new LightRegistry();
  reg.ambient = 0.03;
  reg.add({ x: 8, y: 3, z: 0, radius: 6, group: 1 });
  reg.add({ x: 2, y: 3, z: 0, radius: 6, group: 1 });
  reg.add({ x: 12, y: 3, z: 0, radius: 6, group: 1 });
  reg.add({ x: 4, y: 3, z: 0, radius: 6, group: 1 });
  reg.add({ x: 0, y: 4, z: 6, radius: 5, intensity: 0.2, kind: 'window', electric: false, destructible: false });
  reg.add({ x: -6, y: 0.5, z: 0, radius: 4, intensity: 0.5, kind: 'fire', electric: false });
  addTorchSlots(reg);
  // a guard's torch lit
  const t = reg.lights.find((l) => l.kind === 'flashlight')!;
  reg.setOn(t.id, true);
  return reg;
}

const doors = { list: [] as ResetDoor[], setOpen: () => undefined, crack: () => false };

/** Step the registry for `s` seconds; the time each light id went dark (NaN: never). */
function run(reg: LightRegistry, s: number, off: Float64Array, t0 = 0): void {
  const steps = Math.round(s / DT);
  for (let k = 1; k <= steps; k++) {
    reg.update(DT);
    for (const l of reg.lights) if (!l.on && off[l.id] !== off[l.id]) off[l.id] = t0 + k * DT;
  }
}

describe('mainsOff (piano SO1)', () => {
  it('cuts every electric light nearest first, the last at 0.8 s; torches, windows and fires stay', () => {
    const reg = level();
    const torch = reg.lights.find((l) => l.kind === 'flashlight' && l.on)!;
    expect(reg.mainsOff(0, 1, 0)).toBe(4);
    const off = new Float64Array(reg.lights.length).fill(Number.NaN);
    run(reg, 0.7, off);
    // the nearest (x 2) before the next (x 4) before x 8; x 12 (the farthest) not yet
    expect(off[1]!).toBeLessThan(off[3]!);
    expect(off[3]!).toBeLessThan(off[0]!);
    expect(reg.lights[2]!.on).toBe(true);
    run(reg, 0.1 + 1e-9, off, 0.7);
    expect(off[2]!).toBeCloseTo(0.8, 6);
    for (let id = 0; id < 4; id++) expect(reg.lights[id]!.on).toBe(false);
    expect(reg.lights[4]!.on).toBe(true);
    expect(reg.lights[5]!.on).toBe(true);
    expect(torch.on).toBe(true);
    // never times out
    run(reg, 120, off);
    for (let id = 0; id < 4; id++) expect(reg.lights[id]!.on).toBe(false);
  });

  it('stays dark against a switch, a jam end, an outage end, a restore and a section restart', () => {
    const reg = level();
    // a lamp mid-EMP-outage and a jammed lamp when the mains go
    reg.disrupt(8, 3, 0, 0.5, 2);
    reg.jamStart(1);
    reg.jamLit(1, true);
    const start = new SectionStartState();
    start.take(reg, doors);
    reg.mainsOff(0, 1, 0);
    run(reg, 1, new Float64Array(reg.lights.length));
    // the scene retakes the start state after the blackout (sectorMode's `startState.take`)
    start.take(reg, doors);
    reg.setGroup(1, true);
    reg.jamLit(1, true);
    reg.jamEnd(1);
    run(reg, 3, new Float64Array(reg.lights.length));
    for (let id = 0; id < 4; id++) reg.setOn(id, true);
    reg.destroy(3);
    reg.restore(3);
    for (let id = 0; id < 4; id++) reg.resetTo(id, true, false);
    start.apply(reg, doors);
    for (let id = 0; id < 4; id++) {
      expect(reg.lights[id]!.on).toBe(false);
      expect(reg.baseOn(reg.lights[id]!)).toBe(false);
      expect(reg.mainsCut(id)).toBe(true);
    }
    // a restart from a start state taken before the blackout cannot revive them either
    const before = new SectionStartState();
    const fresh = level();
    before.take(fresh, doors);
    before.apply(reg, doors);
    for (let id = 0; id < 4; id++) expect(reg.lights[id]!.on).toBe(false);
    expect(reg.lights[4]!.on).toBe(true);
  });

  it('the guards never read a mains-off lamp as a cut circuit (no reset walk)', () => {
    const reg = level();
    const h: BreakerHost = { switchOf: () => true, isOff: () => true, reset: () => false };
    reg.mainsOff(0, 1, 0, 0);
    for (let id = 0; id < 4; id++) expect(darkState(reg, reg.lights[id]!, h)).toBe(DARK_NONE);
  });

  it("the host's cut reaches the client in the lamps snapshot, mid-ripple and done", () => {
    const host = level();
    const client = level();
    const tx = new LampSender();
    const rx = new LampMirror();
    rx.apply(client, JSON.parse(JSON.stringify(tx.step(host, DT, true)!)));
    host.mainsOff(0, 1, 0);
    let sends = 0;
    for (let k = 0; k < 60; k++) {
      host.update(DT);
      const w = tx.step(host, DT);
      if (!w) continue;
      sends++;
      rx.apply(client, JSON.parse(JSON.stringify(w)));
      for (let id = 0; id < 6; id++) expect(client.lights[id]!.on).toBe(host.lights[id]!.on);
    }
    expect(sends).toBeGreaterThan(1);
    const st = new Uint8Array(64);
    readLamps(client, st);
    for (let id = 0; id < 4; id++) expect(st[id]).toBe(LAMP_OFF);
    expect(client.lights[4]!.on).toBe(true);
  });

  it('the light field (meter, guard sight) reads the lamp level before, the dark level after the ripple passes', () => {
    const reg = level();
    const f = new LightField(null, reg);
    // under the x 2 lamp, away from the window and the fire
    const lit = f.totalAt(2, 0.5, 0);
    const litBody = f.bodyLevel(2, 0, 0, 1.8);
    const off = level();
    for (let id = 0; id < 4; id++) off.setOn(id, false);
    const df = new LightField(null, off);
    const dark = df.totalAt(2, 0.5, 0);
    expect(lit).toBeGreaterThan(dark + 0.2);
    expect(litBody).toBeGreaterThan(df.bodyLevel(2, 0, 0, 1.8) + 0.2);
    reg.mainsOff(0, 1, 0);
    run(reg, 0.8 + 1e-9, new Float64Array(reg.lights.length));
    expect(f.totalAt(2, 0.5, 0)).toBeCloseTo(dark, 9);
    expect(f.bodyLevel(2, 0, 0, 1.8)).toBeCloseTo(df.bodyLevel(2, 0, 0, 1.8), 9);
  });

  it('the per-step update allocates nothing while the ripple runs', async () => {
    const reg = new LightRegistry();
    for (let i = 0; i < 400; i++) reg.add({ x: i, y: 3, z: 0 });
    // one lamp a second at 1 ms steps: the measured rounds cut lamps now and then
    reg.mainsOff(0, 3, 0, 399);
    const bytes = await bytesPerCall((n) => {
      for (let i = 0; i < n; i++) reg.update(1e-3);
    }, 1, { n: 2000, warm: 100000 });
    expect(bytes).toBeLessThanOrEqual(HEAP_NUMBER);
    expect(reg.mainsCut(10)).toBe(true);
  });
});
