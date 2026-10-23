/**
 * (marlow-final N6) Several scanner pairs: `CtDevices` builds every `lay.scanners` entry, `SecWire.sc` carries one entry
 * per pair (protocol 30), and the ready-lamp glows sit on each panel's face from the device's position and yaw (Marlow's
 * station 6 keeps its old z 0.3 / 13.7). A stand-in match (as tests/laserPanels.test.ts) on a NullEngine scene.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene, Vector3, type InstancedMesh } from '../src/core/babylon';
import { SCANNER, SCAN_GLOW, SC_DONE, SC_HACKING, SC_IDLE, SC_READY, newScanPair, packScan, scanGlowAt, unpackScan, type ScannerDef } from '../src/game/scanners';
import type { CtDevices as CtDevicesT, SecWire } from '../src/game/ctDevices';
import type { CourseDevice } from '../src/game/course/courseDef';
import { parseMessage } from '../src/net/protocol';

const dev = (x: number, z: number, yaw: number, y = 0): CourseDevice => ({ x, y, z, yaw });

/** (marlow-final 0d) The retired Marlow Yard station 6 pair, kept as data (the bunker bays are gone): panels on the
 *  south and north fences at x 115, z 0.4 facing +z and z 13.6 facing -z. Its glows must stay at z 0.3 / 13.7. */
const S6_SCANNERS: ScannerDef = { id: 'sc-s6', a: 'sw-s6-a', b: 'sw-s6-b', flag: 's6-sync' };
const S6_DEVICES: Record<string, CourseDevice> = { 'sw-s6-a': dev(115, 0.4, 0), 'sw-s6-b': dev(115, 13.6, Math.PI) };

/** Two pairs as A7 / A8 place them: a7 on the cage's west and east faces (yaw -pi/2 and pi/2), a8 with T2 on a
 *  raised floor (y 1.2) to check the panel floor. */
const A7: ScannerDef = { id: 'sc-a7', a: 'a7-t1', b: 'a7-t2', flag: 'a7-sync' };
const A8: ScannerDef = { id: 'sc-a8', a: 'a8-t1', b: 'a8-t2', flag: 'a8-sync' };
const DEVICES: Record<string, CourseDevice> = {
  'a7-t1': dev(85.6, 63, -Math.PI / 2),
  'a7-t2': dev(96.4, 63, Math.PI / 2),
  'a8-t1': dev(136, 67.6, Math.PI),
  'a8-t2': dev(145.6, 62, -Math.PI / 2, 1.2),
};

interface Ref {
  id: string;
  feet: Vector3;
  crouched: boolean;
  speed: number;
  light: number;
  target: { alive: boolean; health: { hp: number }; applyDamage: (d: { amount: number }) => void; aimPoint: (o: Vector3) => Vector3 };
}

function ref(id: string, x: number, y: number, z: number): Ref {
  const r: Ref = {
    id,
    feet: new Vector3(x, y, z),
    crouched: false,
    speed: 0,
    light: 1,
    target: { alive: true, health: { hp: 100 }, applyDamage: (d) => void (r.target.health.hp -= d.amount), aimPoint: (o) => o },
  };
  return r;
}

let scene: Scene;

function world(layout: Record<string, unknown>, refs: Ref[]) {
  const g = {
    world: {
      layout,
      level: { lights: { lights: [], setOn: () => undefined } },
      parts: { instance: () => ({ instancedBuffers: {}, scaling: new Vector3(), position: new Vector3(), rotation: new Vector3(), setEnabled: () => undefined, isEnabled: () => true, dispose: () => undefined }) },
      lightField: { totalAt: () => 1 },
    },
    scene,
    security: null,
    ballistics: { hitDistance: (a: Vector3, b: Vector3) => Vector3.Distance(a, b) },
    app: { quality: { level: { minimal: false } } },
    vision: { night: 0, kind: 0 },
    hud: { banner: () => undefined, el: { appendChild: () => undefined } },
    playerRefs: () => refs,
    playerRefsInto: (out: unknown[]) => {
      out.length = 0;
      for (const r of refs) out.push(r);
      return out;
    },
    weapons: { slots: [] },
  };
  return g;
}

describe('(N6) scanner glow placement and the wire entry (pure)', () => {
  it("Marlow's station 6 devices give the old hard-coded panel faces z 0.3 / 13.7", () => {
    const da = S6_DEVICES[S6_SCANNERS.a]!;
    const db = S6_DEVICES[S6_SCANNERS.b]!;
    const o = { x: 0, y: 0, z: 0 };
    scanGlowAt(da.x, da.y, da.z, da.yaw, o);
    expect(o.x).toBeCloseTo(da.x, 9);
    expect(o.y).toBe(0);
    expect(o.z).toBeCloseTo(0.3, 9);
    scanGlowAt(db.x, db.y, db.z, db.yaw, o);
    expect(o.x).toBeCloseTo(db.x, 9);
    expect(o.z).toBeCloseTo(13.7, 9);
  });

  it('a device facing +x or -x puts its face 0.1 m behind it along its facing; the floor follows the device', () => {
    const o = { x: 0, y: 0, z: 0 };
    scanGlowAt(96.4, 0, 63, Math.PI / 2, o);
    expect(o.x).toBeCloseTo(96.3, 9);
    expect(o.z).toBeCloseTo(63, 9);
    scanGlowAt(145.6, 1.2, 62, -Math.PI / 2, o);
    expect(o.x).toBeCloseTo(145.7, 9);
    expect(o.y).toBe(1.2);
    expect(SCAN_GLOW.back).toBe(0.1);
  });

  it('packScan / unpackScan round-trip a pair (phases, occupied bits, progress in tenths)', () => {
    const p = newScanPair();
    p.ph[0] = SC_READY;
    p.ph[1] = SC_HACKING;
    p.t[0] = SCANNER.hack;
    p.t[1] = 0.73;
    const e = packScan(p, 3);
    expect(e).toEqual([SC_READY, SC_HACKING, 3, 20, 7]);
    const q = newScanPair();
    expect(unpackScan(e, q)).toBe(3);
    expect(q.ph).toEqual([SC_READY, SC_HACKING]);
    expect(q.t[0]).toBeCloseTo(2, 9);
    expect(q.t[1]).toBeCloseTo(0.7, 9);
    expect(q.open).toBe(false);
    unpackScan([SC_DONE, SC_DONE, 0, 20, 20], q);
    expect(q.open).toBe(true);
    // junk phases read as idle
    unpackScan([9, -1, 0, 0, 0], q);
    expect(q.ph).toEqual([SC_IDLE, SC_IDLE]);
  });
});

describe('(N6) protocol 30: sec.sc is one entry per pair', () => {
  const base = { ck: [], j: ['', ''], ch: [5, 5], cd: [0, 0], dv: [], al: 0 };

  it('two pairs round-trip', () => {
    const sec: SecWire = { ...base, j: ['', ''], ch: [5, 5], cd: [0, 0], sc: [[0, 0, 0, 0, 0], [3, 3, 3, 20, 20]] };
    expect(parseMessage({ t: 'sector', sec })).toEqual({ t: 'sector', sec });
  });

  it('junk is clamped, a non-array entry reads idle in its slot, at most 8 pairs', () => {
    const got = parseMessage({ t: 'sector', sec: { ...base, sc: [[9, -2, 7, 500, 'x'], 'junk', [1, 2]] } }) as { sec: SecWire };
    expect(got.sec.sc).toEqual([[3, 0, 3, 100, 0], [0, 0, 0, 0, 0], [1, 2, 0, 0, 0]]);
    const many = parseMessage({ t: 'sector', sec: { ...base, sc: Array.from({ length: 12 }, () => [1, 1, 0, 5, 5]) } }) as { sec: SecWire };
    expect(many.sec.sc).toHaveLength(8);
    // no scanners: no field
    const none = parseMessage({ t: 'sector', sec: base }) as { sec: SecWire };
    expect(none.sec.sc).toBeUndefined();
  });
});

describe('(N6) CtDevices: every scanner pair', () => {
  let CtDevices: typeof CtDevicesT;
  beforeAll(async () => {
    (globalThis as unknown as { window: unknown }).window ??= globalThis;
    const gd = globalThis as unknown as { document?: unknown };
    gd.document ??= { createElement: () => ({ className: '', textContent: '', style: { cssText: '', display: '' }, remove: () => undefined }) };
    scene = new Scene(new NullEngine());
    ({ CtDevices } = await import('../src/game/ctDevices'));
  });
  afterAll(() => {
    delete (globalThis as unknown as { __ctdev?: unknown }).__ctdev;
    scene.dispose();
  });

  type ScanDbg = { id: string; flag: string; ph: string[]; occ: number; open: boolean; ready: boolean };
  const scans = (d: CtDevicesT): ScanDbg[] => (d.debug() as { scans: ScanDbg[] }).scans;
  const make = (role: 'host' | 'client', layout: Record<string, unknown>, refs: Ref[]) => {
    const flags = new Set<string>();
    const said: string[] = [];
    const g = world(layout, refs);
    const d = new CtDevices(g as never, role, { say: (t) => said.push(t), record: () => undefined, dirty: () => undefined, flag: (f) => flags.add(f), has: (f) => flags.has(f) });
    return { d, flags, said };
  };
  const step = (d: CtDevicesT, s: number): void => {
    for (let t = 0; t < s - 1e-9; t += 1 / 60) d.fixedUpdate(1 / 60);
  };
  const pos = (m: InstancedMesh): [number, number, number] => [m.position.x, m.position.y, m.position.z];

  it("Marlow Yard: one pair, built as before (glows at z 0.3 / 13.7, heights 1.95 / 2.25), `scan` is it", () => {
    const { d } = make('host', { scanners: [S6_SCANNERS], course: { devices: S6_DEVICES } }, [ref('host', 0, 0, 7)]);
    expect(d.scans).toHaveLength(1);
    expect(d.scan).toBe(d.scans[0]);
    const sc = d.scans[0]!;
    const ax = S6_DEVICES[S6_SCANNERS.a]!.x;
    expect(pos(sc.glow[0]!)[0]).toBeCloseTo(ax, 9);
    expect(pos(sc.glow[0]!)[1]).toBeCloseTo(1.95, 9);
    expect(pos(sc.glow[0]!)[2]).toBeCloseTo(0.3, 9);
    expect(pos(sc.ready[0]!)[1]).toBeCloseTo(2.25, 9);
    expect(pos(sc.ready[1]!)[2]).toBeCloseTo(13.7, 9);
    expect(pos(sc.glow[1]!)[2]).toBeCloseTo(13.7, 9);
    expect(d.wire().sc).toEqual([[0, 0, 0, 0, 0]]);
    d.dispose();
  });

  it('two pairs: each built with its glows from its device; a pair with a missing device is skipped', () => {
    const layout = { scanners: [A7, { id: 'sc-x', a: 'nope', b: 'a7-t2', flag: 'x' }, A8], course: { devices: DEVICES } };
    const { d } = make('host', layout, [ref('host', 0, 0, 0)]);
    expect(d.scans.map((s) => s.def.id)).toEqual(['sc-a7', 'sc-a8']);
    const a7 = d.scans[0]!;
    expect(pos(a7.glow[0]!)[0]).toBeCloseTo(85.7, 9);
    expect(pos(a7.glow[1]!)[0]).toBeCloseTo(96.3, 9);
    expect(pos(a7.ready[1]!)[2]).toBeCloseTo(63, 9);
    const a8 = d.scans[1]!;
    expect(pos(a8.glow[0]!)[2]).toBeCloseTo(67.7, 9);
    expect(pos(a8.glow[1]!)[0]).toBeCloseTo(145.7, 9);
    expect(pos(a8.glow[1]!)[1]).toBeCloseTo(1.2 + 1.95, 9);
    expect(pos(a8.ready[1]!)[1]).toBeCloseTo(1.2 + 2.25, 9);
    d.dispose();
  });

  it('host: the second pair hacked in sync sets only its own flag; the wire carries both entries; the client mirrors them', () => {
    const layout = { scanners: [A7, A8], course: { devices: DEVICES } };
    // the host at a8 T1, the client at a8 T2 on its raised floor (y 1.2)
    const refs = [ref('host', 136, 0, 67), ref('cli', 145, 1.2, 62)];
    const h = make('host', layout, refs);
    expect(h.d.scanPress('nope', 0)).toBeUndefined();
    expect(h.d.scanPress('a8-t1', 0)).toBeNull();
    expect(h.d.scanPress('a8-t2', 1)).toBeNull();
    // a press at the other pair's panel from far away is refused
    expect(h.d.scanPress('a7-t1', 0)).toBe('Stand at the scanner');
    step(h.d, 0.5);
    let s = scans(h.d);
    expect(s[0]!.ph).toEqual(['idle', 'idle']);
    expect(s[1]!.ph).toEqual(['hacking', 'hacking']);
    expect(s[1]!.occ).toBe(3);
    step(h.d, SCANNER.hack);
    s = scans(h.d);
    expect(s[1]!.open).toBe(true);
    expect(s[0]!.open).toBe(false);
    expect([...h.flags]).toEqual(['a8-sync']);
    const w = h.d.wire();
    expect(w.sc).toEqual([[SC_IDLE, SC_IDLE, 0, 0, 0], [SC_DONE, SC_DONE, 3, 20, 20]]);
    // through the wire parser and onto the client's mirror
    const msg = parseMessage(JSON.parse(JSON.stringify({ t: 'sector', sec: w }))) as { sec: SecWire };
    const c = make('client', layout, [ref('cli', 145, 1.2, 62)]);
    c.d.apply(msg.sec);
    const cs = scans(c.d);
    expect(cs[0]!.ph).toEqual(['idle', 'idle']);
    expect(cs[1]!.ph).toEqual(['done', 'done']);
    expect(cs[1]!.open).toBe(true);
    expect(cs[1]!.ready).toBe(true);
    // the client's ready glows are lit on the open pair only
    expect(c.d.scans[1]!.ready[0]!.instancedBuffers.color).not.toEqual(c.d.scans[0]!.ready[0]!.instancedBuffers.color);
    h.d.dispose();
    c.d.dispose();
  });

  it('a pair out of sync fails on its own; the other pair is untouched', () => {
    const layout = { scanners: [A7, A8], course: { devices: DEVICES } };
    const refs = [ref('host', 86.5, 0, 63), ref('cli', 95.5, 0, 63)];
    const h = make('host', layout, refs);
    expect(h.d.scanPress('a7-t1', 0)).toBeNull();
    step(h.d, SCANNER.hack + SCANNER.window + 0.3);
    const s = scans(h.d);
    expect(s[0]!.ph).toEqual(['idle', 'idle']);
    expect(h.d.scanFails).toBe(1);
    expect(s[1]!.ph).toEqual(['idle', 'idle']);
    expect(h.flags.size).toBe(0);
    h.d.dispose();
  });
});
