import { describe, expect, it, vi } from 'vitest';
import { parseMessage, type Msg } from '../src/net/protocol';
import { CoopHost, hostLampShots } from '../src/net/coopHost';
import { CoopClient, clientLampShots } from '../src/net/coopClient';
import { LightRegistry } from '../src/world/lights';
import { addTorchSlots } from '../src/world/torches';
import { Vector3 } from '../src/core/babylon';

// (coop-real F1b, S2) Course mode: a client's round through a lamp goes to the host as the Sector Ops `shot` at
// `lt-<id>` (no wire change); the host runs the same checks and shoots it out (the client sees it dark from `course`).

type Shot = Extract<Msg, { t: 'shot' }>;

/** One page's level lights (host and client build the same, in the same order; `tests/sectorLampSync.test.ts`). */
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

/** The round from the chest at z 4 up through lamp 0 (`tests/sectorLampSync.test.ts`), 10 m long. */
const O = { x: 0, y: 1.6, z: 4 };
const D = { x: 0, y: 1.4 / Math.hypot(1.4, 4), z: -4 / Math.hypot(1.4, 4) };
const FEET = { x: 0, y: 0, z: 4 };
const seg = (len: number): [Vector3, Vector3] => [new Vector3(O.x, O.y, O.z), new Vector3(O.x + D.x * len, O.y + D.y * len, O.z + D.z * len)];

/** A client stand-in on CoopClient's prototype: only what `lampRay` reads. */
function client(reg: LightRegistry) {
  const c = Object.create(CoopClient.prototype) as CoopClient;
  const toHost = vi.fn();
  const g = { world: { level: { lights: reg } }, ballistics: { clear: () => true }, weapons: { current: { def: { id: 'pistolSd' } } }, opts: { mode: 'course' } };
  Object.assign(c, { g, s: { toHost }, clock: { now: () => 5 }, reachA: new Vector3(), reachB: new Vector3() });
  const lampRay = (a: Vector3, b: Vector3): void => (c as unknown as { lampRay(a: Vector3, b: Vector3): void }).lampRay(a, b);
  return { lampRay, toHost };
}

/** The client's `shot` as it reaches the host: through JSON and the parser, as on the wire. */
function wire(m: unknown): Shot {
  const p = parseMessage(JSON.parse(JSON.stringify(m)));
  expect(p).not.toBeNull();
  expect(p!.t).toBe('shot');
  return p as Shot;
}

/** A host stand-in on CoopHost's prototype in the Course shape (`lampShots` true, no `LampSender`). */
function host(reg: LightRegistry, lampShots = true) {
  const h = Object.create(CoopHost.prototype) as CoopHost;
  const shootLight = vi.fn((id: number) => reg.destroy(id));
  const g = { world: { level: { lights: reg } }, stealth: { shootLight }, ballistics: { clear: () => true, hitDistance: () => 1e9 } };
  Object.assign(h, { g, lampShots, lampTx: null, lampLim: new Map(), time: 10, lampA: new Vector3(), lampB: new Vector3() });
  const r = { id: 'C', alive: true, feet: { ...FEET }, state: { mv: { dw: 2 }, w: 'pistolSd' }, loadout: ['pistolSd'], violations: 0 };
  const onLampShot = (m: Shot): void => (h as unknown as { onLampShot(r: unknown, m: Shot): void }).onLampShot(r, m);
  return { r, onLampShot, shootLight };
}

/** The client's real lamp round for lamp 0, through the wire. */
function clientShot(): Shot {
  const { lampRay, toHost } = client(level());
  lampRay(...seg(10));
  expect(toHost).toHaveBeenCalledTimes(1);
  return wire(toHost.mock.calls[0]![0]);
}

describe('coop-real F1b: Course mode client lamp shots reach the host', () => {
  it('the mode rule: Sector Ops and Course mode only, on both pages', () => {
    for (const f of [hostLampShots, clientLampShots]) {
      expect(f('course')).toBe(true);
      expect(f('sector')).toBe(true);
      for (const m of ['infiltration', 'sandbox', 'clear', undefined]) expect(f(m)).toBe(false);
    }
  });

  it("the client sends its round through a lamp as a `shot` at lt-<id>, dmg 0, that parses on the wire", () => {
    const { lampRay, toHost } = client(level());
    lampRay(...seg(10));
    expect(toHost).toHaveBeenCalledTimes(1);
    const sent = toHost.mock.calls[0]![0] as Shot;
    expect(sent.t).toBe('shot');
    expect(sent.target).toBe('lt-0');
    expect(sent.dmg).toBe(0);
    expect(sent.w).toBe('pistolSd');
    const m = wire(sent);
    expect(m.target).toBe('lt-0');
    expect(m.dmg).toBe(0);
  });

  it('the client sends nothing for a round that misses every lamp, or for a lamp already out', () => {
    const reg = level();
    const { lampRay, toHost } = client(reg);
    // straight back, away from every lamp
    lampRay(new Vector3(O.x, O.y, O.z), new Vector3(O.x, O.y, O.z + 10));
    expect(toHost).not.toHaveBeenCalled();
    reg.destroy(0);
    lampRay(...seg(10));
    expect(toHost).not.toHaveBeenCalled();
  });

  it("the host in Course mode (no LampSender) checks the client's round and shoots lamp 0 out", () => {
    const m = clientShot();
    const reg = level();
    const { r, onLampShot, shootLight } = host(reg);
    onLampShot(m);
    expect(shootLight).toHaveBeenCalledTimes(1);
    expect(shootLight).toHaveBeenCalledWith(0);
    expect(reg.lights[0]!.destroyed).toBe(true);
    expect(r.violations).toBe(0);
  });

  it('refusals unchanged: a mode without lamp shots, a bad origin, the rate limit', () => {
    const m = clientShot();
    // a mode without lamp shots does nothing
    const off = host(level(), false);
    off.onLampShot(m);
    expect(off.shootLight).not.toHaveBeenCalled();
    expect(off.r.violations).toBe(0);
    // a round that did not leave from the shooter (feet 5 m away): a violation, nothing shot out
    const reg = level();
    const bad = host(reg);
    bad.r.feet = { x: 0, y: 0, z: 9 };
    bad.onLampShot(m);
    expect(bad.shootLight).not.toHaveBeenCalled();
    expect(reg.lights[0]!.destroyed).toBe(false);
    expect(bad.r.violations).toBe(1);
    // the clock fixed: 4 a second, so the 5th returns at the limiter before `lampShotOk`
    for (let i = 0; i < 4; i++) bad.onLampShot(m);
    expect(bad.r.violations).toBe(4);
    expect(bad.shootLight).not.toHaveBeenCalled();
  });
});
