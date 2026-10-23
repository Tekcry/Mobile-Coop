import { describe, expect, it } from 'vitest';
import { parseMessage, type Msg } from '../src/net/protocol';
import {
  applyLamps,
  decodeLamps,
  encodeLamps,
  LAMP_KEEPALIVE,
  LAMP_MAX,
  LAMP_OFF,
  LAMP_ON,
  LAMP_SHOT,
  LampMirror,
  LampSender,
  lampShotOk,
  lampTargetId,
  readLamps,
  type LampWire,
} from '../src/net/lampSync';
import { LightRegistry } from '../src/world/lights';
import { LightField } from '../src/world/lightField';
import { addTorchSlots } from '../src/world/torches';
import { SectionStartState, type ResetDoor } from '../src/game/sectorReset';
import { applyJamLight, advanceDevJam, newDevJam, stepDevJam, DEV_IDLE, type DevPhase } from '../src/game/jammer';

/** One page's level lights (host and client build the same, in the same order). */
function level(): LightRegistry {
  const reg = new LightRegistry();
  reg.ambient = 0.05;
  // circuit 3: two ceiling lamps over the room at x 0..6
  reg.add({ x: 0, y: 3, z: 0, radius: 8, intensity: 0.9, group: 3 });
  reg.add({ x: 6, y: 3, z: 0, radius: 8, intensity: 0.9, group: 3 });
  // a lamp on no circuit, not destructible
  reg.add({ x: 20, y: 3, z: 0, radius: 6, intensity: 0.8, destructible: false });
  // a non-electric fire
  reg.add({ x: -20, y: 0.5, z: 0, radius: 4, intensity: 0.6, kind: 'fire', electric: false });
  addTorchSlots(reg);
  return reg;
}

/** The host's message as it reaches the client: through JSON and the parser, as on the wire. */
function wire(w: LampWire): LampWire {
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'lamps', ...w }))) as Extract<Msg, { t: 'lamps' }> | null;
  expect(m).not.toBeNull();
  return m!;
}

/** Each page's light meter under lamp 0 (the meter reads `bodyLevel`, as guards' perception does). */
const meter = (f: LightField): number => f.bodyLevel(0.5, 0, 0, 1.8);

const doors = { list: [] as ResetDoor[], setOpen: () => undefined, crack: () => false };

describe('Sector Ops lamp sync (slice L, protocol 31)', () => {
  it('encode / decode round trips every state, flashlights read on', () => {
    const n = 200;
    const st = new Uint8Array(LAMP_MAX);
    for (let i = 0; i < n; i++) st[i] = (i * 7 + (i >> 3)) % 3;
    const w = encodeLamps(st, n);
    expect(w.of.length).toBe(Math.ceil(n / 6));
    const out = new Uint8Array(LAMP_MAX);
    expect(decodeLamps(wire(w), out)).toBe(n);
    for (let i = 0; i < n; i++) expect(out[i]).toBe(st[i]);
    const reg = level();
    const s2 = new Uint8Array(LAMP_MAX);
    const m = readLamps(reg, s2);
    expect(m).toBe(reg.lights.length);
    for (let i = 0; i < m; i++) expect(s2[i]).toBe(LAMP_ON);
  });

  it('the parser drops bad bitsets and clamps the count', () => {
    expect(parseMessage({ t: 'lamps', n: 4, of: 'A<', sh: '' })).toBeNull();
    expect(parseMessage({ t: 'lamps', n: 4, of: 'A'.repeat(200), sh: '' })).toBeNull();
    expect(parseMessage({ t: 'lamps', n: 4, of: 3, sh: '' })).toBeNull();
    expect(parseMessage({ t: 'lamps', n: 1e9, of: 'B', sh: '-_' })).toEqual({ t: 'lamps', n: LAMP_MAX, of: 'B', sh: '-_' });
  });

  it('a switch on the host flips the client lamp and its light-meter sample', () => {
    const host = level();
    const client = level();
    const hf = new LightField(null, host);
    const cf = new LightField(null, client);
    const tx = new LampSender();
    const rx = new LampMirror();
    rx.apply(client, wire(tx.step(host, 1 / 60, true)!));
    const lit = meter(cf);
    expect(lit).toBeCloseTo(meter(hf), 9);
    host.setGroup(3, false);
    const w = tx.step(host, 1 / 60);
    expect(w).not.toBeNull();
    expect(rx.apply(client, wire(w!))).toBe(2);
    expect(client.lights[0]!.on).toBe(false);
    expect(client.lights[1]!.on).toBe(false);
    expect(client.lights[2]!.on).toBe(true);
    expect(meter(cf)).toBeLessThan(lit - 0.2);
    expect(meter(cf)).toBeCloseTo(meter(hf), 9);
    // and back on
    host.setGroup(3, true);
    rx.apply(client, wire(tx.step(host, 1 / 60)!));
    expect(meter(cf)).toBeCloseTo(lit, 9);
  });

  it('a shot lamp goes out on the client with the cue once; a shot wins over off', () => {
    const host = level();
    const client = level();
    const tx = new LampSender();
    const rx = new LampMirror();
    host.setGroup(3, false);
    host.destroy(1);
    const shots: number[] = [];
    rx.apply(client, wire(tx.step(host, 0, true)!), (l) => shots.push(l.id));
    expect(shots).toEqual([1]);
    expect(client.lights[1]!.destroyed).toBe(true);
    expect(client.lights[0]!.on).toBe(false);
    expect(client.lights[0]!.destroyed).toBe(false);
    rx.apply(client, wire(tx.step(host, LAMP_KEEPALIVE)!), (l) => shots.push(l.id));
    expect(shots).toEqual([1]);
  });

  it('sends on a change, a force and the keepalive only; a jam flicker alone sends nothing', () => {
    const host = level();
    const tx = new LampSender();
    expect(tx.step(host, 0, true)).not.toBeNull();
    expect(tx.step(host, 0.1)).toBeNull();
    // a jam: the base stays on, so nothing to send (the jam rides sector.sec.dv)
    host.jamStart(0);
    host.jamLit(0, false);
    expect(host.lights[0]!.on).toBe(false);
    expect(tx.step(host, 0.1)).toBeNull();
    // a guard torch slot switching is not a lamp
    const torch = host.lights.findIndex((l) => l.kind === 'flashlight');
    host.setOn(torch, true);
    expect(tx.step(host, 0.1)).toBeNull();
    host.destroy(2);
    expect(host.lights[2]!.destroyed).toBe(false); // not destructible
    host.destroy(0);
    expect(tx.step(host, 0.1)).not.toBeNull();
    expect(tx.step(host, LAMP_KEEPALIVE - 0.05)).toBeNull();
    expect(tx.step(host, 0.1)).not.toBeNull();
    expect(tx.step(host, 0, true)).not.toBeNull();
  });

  it('a jam expires on both pages on the base the host switched meanwhile', () => {
    const host = level();
    const client = level();
    const hf = new LightField(null, host);
    const cf = new LightField(null, client);
    const tx = new LampSender();
    const rx = new LampMirror();
    rx.apply(client, wire(tx.step(host, 0, true)!));
    // the host steps the jam on lamp 0; the client mirrors its timeline (sector.sec.dv) and runs it on
    const hd = newDevJam();
    const cd = newDevJam();
    let hw: DevPhase = DEV_IDLE;
    let cw: DevPhase = DEV_IDLE;
    const dt = 1 / 60;
    let t = 0;
    let switched = false;
    for (; t < 15; t += dt) {
      stepDevJam(hd, t < 3, 'light', dt);
      applyJamLight(host, 0, hd, hw);
      hw = hd.ph;
      // the mirror: the host's phase and time each step here (the 0.5 s messages, then advanceDevJam between them)
      if (cd.ph !== hd.ph) {
        cd.ph = hd.ph;
        cd.t = hd.t;
      } else advanceDevJam(cd, 'light', dt);
      applyJamLight(client, 0, cd, cw);
      cw = cd.ph;
      if (!switched && t > 2) {
        // mid-jam the host's circuit goes off: the client gets the base, the jam keeps both dark
        switched = true;
        host.setGroup(3, false);
        rx.apply(client, wire(tx.step(host, dt)!));
      }
      expect(client.lights[0]!.on).toBe(host.lights[0]!.on);
      expect(meter(cf)).toBeCloseTo(meter(hf), 9);
    }
    expect(hd.ph).toBe(DEV_IDLE);
    expect(cd.ph).toBe(DEV_IDLE);
    expect(host.lights[0]!.on).toBe(false);
    expect(client.lights[0]!.on).toBe(false);
  });

  it('a jam alone ends lit on both', () => {
    const host = level();
    const client = level();
    const tx = new LampSender();
    const rx = new LampMirror();
    rx.apply(client, wire(tx.step(host, 0, true)!));
    host.jamStart(0);
    client.jamStart(0);
    host.jamLit(0, false);
    client.jamLit(0, false);
    expect(tx.step(host, LAMP_KEEPALIVE)).not.toBeNull();
    host.jamEnd(0);
    client.jamEnd(0);
    expect(host.lights[0]!.on).toBe(true);
    expect(client.lights[0]!.on).toBe(true);
  });

  it('a section restart resets the client too', () => {
    const host = level();
    const client = level();
    const hf = new LightField(null, host);
    const cf = new LightField(null, client);
    const tx = new LampSender();
    const rx = new LampMirror();
    const start = new SectionStartState();
    start.take(host, doors);
    rx.apply(client, wire(tx.step(host, 0, true)!));
    const lit = meter(cf);
    host.setGroup(3, false);
    host.destroy(0);
    rx.apply(client, wire(tx.step(host, 0.1)!));
    expect(client.lights[0]!.destroyed).toBe(true);
    expect(meter(cf)).toBeLessThan(lit - 0.2);
    expect(start.apply(host, doors).lights).toBe(2);
    rx.apply(client, wire(tx.step(host, 0.1, true)!));
    expect(client.lights[0]!.destroyed).toBe(false);
    expect(client.lights[0]!.on).toBe(true);
    expect(client.lights[1]!.on).toBe(true);
    expect(meter(cf)).toBeCloseTo(lit, 9);
    expect(meter(cf)).toBeCloseTo(meter(hf), 9);
  });

  it('apply skips lights the client does not have and flashlights', () => {
    const client = level();
    const torchesBefore = client.lights.filter((l) => l.kind === 'flashlight').map((l) => l.on);
    const st = new Uint8Array(LAMP_MAX).fill(LAMP_OFF);
    const n = applyLamps(client, st, LAMP_MAX);
    expect(n).toBe(4);
    expect(client.lights.filter((l) => l.kind === 'flashlight').map((l) => l.on)).toEqual(torchesBefore);
    st[0] = LAMP_SHOT;
    expect(applyLamps(client, st, 1)).toBe(1);
    expect(client.lights[0]!.destroyed).toBe(true);
  });

  it("checks a client's lamp shot: target, origin, the lamp first on the ray", () => {
    expect(lampTargetId('lt-12')).toBe(12);
    expect(lampTargetId('lt-x')).toBe(-1);
    expect(lampTargetId('lt-99999')).toBe(-1);
    expect(lampTargetId('g-3')).toBe(-1);
    const reg = level();
    const feet = { x: 0, y: 0, z: 4 };
    const o = { x: 0, y: 1.6, z: 4 };
    const d = { x: 0, y: 1.4 / Math.hypot(1.4, 4), z: -4 / Math.hypot(1.4, 4) };
    expect(lampShotOk(reg, 0, o, d, 10, feet, 60)).toBe(true);
    // the claimed ray misses lamp 1
    expect(lampShotOk(reg, 1, o, d, 10, feet, 60)).toBe(false);
    // the round did not leave from the shooter
    expect(lampShotOk(reg, 0, o, d, 10, { x: 0, y: 0, z: 9 }, 60)).toBe(false);
    // short of the lamp
    expect(lampShotOk(reg, 0, o, d, 1, feet, 60)).toBe(false);
    // not destructible, already out
    expect(lampShotOk(reg, 2, { x: 20, y: 1.6, z: 4 }, d, 10, { x: 20, y: 0, z: 4 }, 60)).toBe(false);
    reg.destroy(0);
    expect(lampShotOk(reg, 0, o, d, 10, feet, 60)).toBe(false);
  });

  it("(walk 4.72 S2) the host takes a client's round that lands on a street lamp pole just under its head", () => {
    const reg = new LightRegistry();
    const id = reg.add({ x: 9, y: 6, z: -66, destructible: true, fixture: { sx: 0.6, sy: 0.1, sz: 0.3, oy: 0 } }).id;
    // the client's real `shot` (e2e probe on the 4.72 build): muzzle, direction to where it landed, that distance
    const o = { x: 11.74, y: 1.56, z: -65.93 };
    const b = { x: 9.15, y: 5.73, z: -65.99 };
    const len = Math.hypot(b.x - o.x, b.y - o.y, b.z - o.z);
    const d = { x: (b.x - o.x) / len, y: (b.y - o.y) / len, z: (b.z - o.z) / len };
    expect(lampShotOk(reg, id, o, d, len, { x: 12, y: 0.02, z: -66 }, 60)).toBe(true);
  });

  it("(walk 4.72 check) the host takes a client's round that lands on the wall just under a wall lamp", () => {
    const reg = new LightRegistry();
    // a wall pack on the wall face z = 0, its head 3 m up; the round lands on the face 0.2 m under the head
    const id = reg.add({ x: 0, y: 3, z: 0, destructible: true, fixture: { sx: 0.3, sy: 0.2, sz: 0.1, oy: 0 } }).id;
    const o = { x: 0, y: 1.5, z: 4 };
    const b = { x: 0, y: 2.8, z: 0 };
    const len = Math.hypot(b.x - o.x, b.y - o.y, b.z - o.z);
    const d = { x: (b.x - o.x) / len, y: (b.y - o.y) / len, z: (b.z - o.z) / len };
    expect(lampShotOk(reg, id, o, d, len, { x: 0, y: 0.3, z: 4 }, 60)).toBe(true);
  });
});
