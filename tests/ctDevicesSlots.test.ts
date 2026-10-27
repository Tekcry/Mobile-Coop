/**
 * (coop4 D1, A11 / A27) The jammer per player slot in `CtDevices`, with a stand-in match (as tests/laserPanels.test.ts):
 * up to 4 jams at once, each slot's entry on the wire, a client's HUD line from its own slot, a held slot idling. And
 * Marlow Yard's 2-slot output pinned byte for byte: the course host's wire and the client mirror for a scripted jam are
 * the values master's `ctDevices.ts` produced for the same script (recorded once on master, A27).
 */
import { writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { DEV_JAMMED, JAMMER, jamHudText, type LaserDef } from '../src/game/jammer';
import type { LaserPanelDef } from '../src/game/laserPanels';
import { PLAYER_SLOTS } from '../src/game/playerSlots';
import { DRAW_DRAWN } from '../src/weapons/drawState';
import type { CtDevices as CtDevicesT, SecWire } from '../src/game/ctDevices';

const L1: LaserDef = { id: 'l1', x1: 10, z1: 4, x2: 10, z2: 10, ys: [0.35, 0.9, 1.45], label: 'Test laser' };
/** Four power panels on the north wall (z 0), facing the players (yaw 0: the face is +z). p1 powers the laser. */
const PANELS: LaserPanelDef[] = [
  { id: 'p1', lasers: ['l1'], x: 2, y: 2, z: 0, yaw: 0 },
  { id: 'p2', lasers: [], x: 4, y: 2, z: 0, yaw: 0 },
  { id: 'p3', lasers: [], x: 6, y: 2, z: 0, yaw: 0 },
  { id: 'p4', lasers: [], x: 8, y: 2, z: 0, yaw: 0 },
];

interface FakePlayer {
  id: string;
  feet: Vector3;
  crouched: boolean;
  speed: number;
  light: number;
  slot?: number;
  mv?: null;
  target: { alive: boolean; health: { hp: number }; applyDamage: () => void; aimPoint: (o: Vector3) => Vector3 };
}

function player(id: string, x: number, z: number, slot?: number): FakePlayer {
  return {
    id,
    feet: new Vector3(x, 0, z),
    crouched: false,
    speed: 0,
    light: 1,
    ...(slot === undefined ? {} : { slot, mv: null }),
    target: { alive: true, health: { hp: 100 }, applyDamage: () => undefined, aimPoint: (o: Vector3) => o },
  };
}

function part() {
  const p = {
    enabled: true,
    instancedBuffers: { pattern: { x: 0, y: 1, z: 0, w: 0 }, color: null as unknown },
    scaling: new Vector3(),
    position: new Vector3(),
    rotation: new Vector3(),
    isPickable: true,
    setEnabled(on: boolean) {
      p.enabled = on;
    },
    isEnabled() {
      return p.enabled;
    },
    dispose() {},
  };
  return p;
}

/** A stand-in match: `refs` is the team list in slot order (what `playerRefs` / `playerRefsInto` return). */
function world(refs: FakePlayer[]) {
  const g = {
    world: {
      layout: { lasers: [L1], laserPanels: PANELS },
      level: { lights: { lights: [], setOn: () => undefined } },
      parts: { instance: () => part() },
      lightField: { totalAt: () => 1 },
    },
    scene: {},
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
    // the local player (the trigger's checks): pistol drawn, aiming at the floor (no pick)
    player: { alive: true, cam: { gamePos: new Vector3(5, 1.6, 6), forward: new Vector3(0, -1, 0) } },
    weapons: { slots: [], drawPhase: DRAW_DRAWN, current: { def: { class: 'pistol' } } },
  };
  return { g, refs };
}

const quiet = { say: () => undefined, record: () => undefined, dirty: () => undefined };

/** The host's own intent (the trigger's job in the game), as tests/laserPanels.test.ts sets it. */
function hostWant(dev: CtDevicesT, want: string): void {
  const p = dev as unknown as { want: string[]; wantAt: number[]; time: number };
  p.want[0] = want;
  p.wantAt[0] = p.time;
}

type Dbg = { jam: string[]; left: number[]; cool: number[]; hud: string };
const dbg = (d: CtDevicesT): Dbg => d.debug() as unknown as Dbg;

/**
 * The course script (A27): a 2-player Marlow Yard host (refs without slot fields, as `courseMode` has them) and its
 * client mirror. Only the API the course calls: `onRemoteJam(tgt)` with 2 args, `wire()`, `apply()`, `frame()`,
 * a client built without a `slot` hook. Returns the samples: host wire, host debug, client debug after a mirror.
 */
function courseScript(CtDevices: typeof CtDevicesT): string[] {
  const hw = world([player('host', 3, 3), player('c1', 5, 3)]);
  const cw = world([player('c1', 5, 3), player('host', 3, 3)]);
  const h = new CtDevices(hw.g as never, 'host', quiet);
  const c = new CtDevices(cw.g as never, 'client', quiet);
  const out: string[] = [];
  const pick = (d: Dbg) => JSON.stringify({ jam: d.jam, left: d.left, cool: d.cool });
  const run = (s: number, mine: string, theirs: string): void => {
    for (let t = 0; t < s - 1e-9; t += 1 / 60) {
      hostWant(h, mine);
      h.onRemoteJam(theirs);
      h.fixedUpdate(1 / 60);
    }
  };
  const sample = (): void => {
    const w = h.wire();
    out.push(JSON.stringify(w));
    out.push(pick(dbg(h)));
    c.apply(w);
    for (let k = 0; k < 6; k++) c.frame(1 / 30);
    out.push(pick(dbg(c)));
  };
  run(0.5, '', '');
  sample();
  run(0.5, 'p1', 'p2');
  sample();
  run(1, '', 'p2');
  sample();
  run(4, '', 'p2');
  sample();
  // the client moves while it asks: no jam (and it is cooling anyway)
  hw.refs[1]!.speed = 1;
  run(2, 'p3', 'p3');
  sample();
  hw.refs[1]!.speed = 0;
  run(3.2, 'p3', 'p3');
  sample();
  // the host walks into the laser's band while p1 is idle: the alarm
  hw.refs[0]!.feet.set(10.1, 0, 7);
  run(0.2, '', '');
  sample();
  h.dispose();
  c.dispose();
  return out;
}

/** Recorded on master's `src/game/ctDevices.ts` (08267f27, the same as origin/master's) with `courseScript`. */
const MASTER: string[] = [
  '{"ck":[],"j":["",""],"ch":[5,5],"cd":[0,0],"dv":[],"al":0}',
  '{"jam":["",""],"left":[5,5],"cool":[0,0]}',
  '{"jam":["",""],"left":[5,5],"cool":[0,0]}',
  '{"ck":[],"j":["p1","p2"],"ch":[4.5,4.5],"cd":[0,0],"dv":[["p1",1,0.48],["p2",1,0.48]],"al":0}',
  '{"jam":["p1","p2"],"left":[4.5,4.5],"cool":[0,0]}',
  '{"jam":["p1","p2"],"left":[4.3,4.3],"cool":[0,0]}',
  '{"ck":[],"j":["","p2"],"ch":[0,3.5],"cd":[4.02,0],"dv":[["p1",2,0.98],["p2",1,1.48]],"al":0}',
  '{"jam":["","p2"],"left":[0,3.5000000000000004],"cool":[4.01666666666667,0]}',
  '{"jam":["","p2"],"left":[0,3.2999999999999994],"cool":[3.8200000000000003,0]}',
  '{"ck":[],"j":["",""],"ch":[0,0],"cd":[0.02,4.5],"dv":[["p2",2,0.5]],"al":0}',
  '{"jam":["",""],"left":[0,0],"cool":[0.016666666666679427,4.500000000000002]}',
  '{"jam":["",""],"left":[5,0],"cool":[0,4.300000000000001]}',
  '{"ck":[],"j":["p3",""],"ch":[3.03,0],"cd":[0,2.5],"dv":[["p3",1,1.95]],"al":0}',
  '{"jam":["p3",""],"left":[3.0333333333333354,0],"cool":[0,2.500000000000009]}',
  '{"jam":["p3",""],"left":[2.8300000000000005,0],"cool":[0,2.3000000000000007]}',
  '{"ck":[],"j":["","p3"],"ch":[0,4.32],"cd":[4.83,0],"dv":[["p3",1,5.15]],"al":0}',
  '{"jam":["","p3"],"left":[0,4.316666666666666],"cool":[4.833333333333334,0]}',
  '{"jam":["","p3"],"left":[0,4.12],"cool":[4.630000000000001,0]}',
  '{"ck":[],"j":["",""],"ch":[0,0],"cd":[4.63,4.82],"dv":[["p3",2,0.18]],"al":1}',
  '{"jam":["",""],"left":[0,0],"cool":[4.633333333333335,4.816666666666667]}',
  '{"jam":["",""],"left":[0,0],"cool":[4.430000000000001,4.620000000000001]}',
];

describe('(coop4 D1) CtDevices: the jammer per player slot', () => {
  let CtDevices: typeof CtDevicesT;
  beforeAll(async () => {
    (globalThis as unknown as { window: unknown }).window ??= globalThis;
    const gd = globalThis as unknown as { document?: unknown };
    gd.document ??= { createElement: () => ({ className: '', textContent: '', style: { cssText: '', display: '' }, remove: () => undefined }) };
    ({ CtDevices } = await import('../src/game/ctDevices'));
  });
  afterAll(() => {
    delete (globalThis as unknown as { __ctdev?: unknown }).__ctdev;
  });

  const four = () => world([player('host', 2, 3, 0), player('c1', 4, 3, 1), player('c2', 6, 3, 2), player('c3', 8, 3, 3)]);
  const run4 = (h: CtDevicesT, s: number, wants: readonly string[], slots: readonly number[] = [1, 2, 3]): void => {
    for (let t = 0; t < s - 1e-9; t += 1 / 60) {
      hostWant(h, wants[0] ?? '');
      for (const k of slots) h.onRemoteJam(wants[k] ?? '', undefined, k);
      h.fixedUpdate(1 / 60);
    }
  };

  it('4 slots jam 4 devices at once; the wire has one entry per slot', () => {
    const w = four();
    const h = new CtDevices(w.g as never, 'host', quiet);
    run4(h, 0.5, ['p1', 'p2', 'p3', 'p4']);
    const s = h.wire();
    expect(s.j).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(s.ch.length).toBe(PLAYER_SLOTS);
    expect(s.cd).toEqual([0, 0, 0, 0]);
    for (let k = 0; k < PLAYER_SLOTS; k++) expect(s.ch[k]).toBeCloseTo(JAMMER.useMax - 0.5, 1);
    expect(s.dv.map((e) => [e[0], e[1]]).sort()).toEqual([
      ['p1', DEV_JAMMED],
      ['p2', DEV_JAMMED],
      ['p3', DEV_JAMMED],
      ['p4', DEV_JAMMED],
    ]);
    expect(dbg(h).jam).toEqual(['p1', 'p2', 'p3', 'p4']);
    h.dispose();
  });

  it("slot 3's claim lands in entry 3, found by the ref's slot (not its list index)", () => {
    // slot 2 is not in the match: slot 3's ref is the list's third entry
    const w = world([player('host', 2, 3, 0), player('c1', 4, 3, 1), player('c3', 8, 3, 3)]);
    const h = new CtDevices(w.g as never, 'host', quiet);
    run4(h, 0.3, ['', '', '', 'p4'], [3]);
    const s = h.wire();
    expect(s.j).toEqual(['', '', '', 'p4']);
    expect(s.ch[3]).toBeCloseTo(JAMMER.useMax - 0.3, 1);
    expect(s.ch[2]).toBe(JAMMER.useMax);
    // a slot out of range is dropped
    h.onRemoteJam('p1', undefined, PLAYER_SLOTS);
    h.onRemoteJam('p1', undefined, -1);
    h.fixedUpdate(1 / 60);
    expect(h.wire().j).toEqual(['', '', '', 'p4']);
    h.dispose();
  });

  it('the wire sends max(2, highest slot in use + 1) entries', () => {
    const solo = world([player('host', 2, 3, 0)]);
    const h1 = new CtDevices(solo.g as never, 'host', quiet);
    run4(h1, 0.2, ['p1'], []);
    expect(h1.wire().j).toEqual(['p1', '']);
    h1.dispose();
    const three = world([player('host', 2, 3, 0), player('c1', 4, 3, 1), player('c2', 6, 3, 2)]);
    const h3 = new CtDevices(three.g as never, 'host', quiet);
    run4(h3, 0.2, ['', '', 'p3'], [1, 2]);
    const s = h3.wire();
    expect(s.j).toEqual(['', '', 'p3']);
    expect(s.ch.length).toBe(3);
    expect(s.cd.length).toBe(3);
    h3.dispose();
  });

  it('a held slot idles: its jam ends, its cooldown runs down and its entry goes blank', () => {
    const w = four();
    const h = new CtDevices(w.g as never, 'host', quiet);
    run4(h, 0.5, ['', '', 'p3', 'p4']);
    expect(h.wire().j).toEqual(['', '', 'p3', 'p4']);
    // slot 2 drops and is held: left out of the team list (gameState's playerRefsInto)
    w.refs.splice(2, 1);
    run4(h, 0.1, ['', '', 'p3', 'p4']);
    let s = h.wire();
    expect(s.j).toEqual(['', '', '', 'p4']);
    expect(s.cd[2]).toBeGreaterThan(JAMMER.cooldown - 0.2);
    // still listed while it cools (its cooldown shows), its intent ignored; then idle
    run4(h, JAMMER.cooldown, ['', '', 'p3', ''], [1, 2, 3]);
    s = h.wire();
    expect(s.j[2]).toBe('');
    expect(s.cd[2]).toBe(0);
    expect(s.ch[2]).toBe(JAMMER.useMax);
    h.dispose();
  });

  it('a client with slot 2 mirrors every entry and shows its HUD line from entry 2', () => {
    const w = four();
    const h = new CtDevices(w.g as never, 'host', quiet);
    run4(h, 0.5, ['p1', '', 'p3', '']);
    const s: SecWire = h.wire();
    const cw = four();
    const c = new CtDevices(cw.g as never, 'client', { ...quiet, slot: () => 2 });
    c.apply(s);
    expect(dbg(c).jam).toEqual(['p1', '', 'p3', '']);
    c.localStep(1 / 60, false);
    const st = (c as unknown as { jam: { active: boolean; use: number; cool: number }[] }).jam[2]!;
    expect(st.active).toBe(true);
    expect(dbg(c).hud).toBe(jamHudText(st, false, false));
    expect(dbg(c).hud).toMatch(/^JAMMING /);
    // slot 1 (the course's client, the default) is idle: no line while nothing is picked
    const c1 = new CtDevices(cw.g as never, 'client', quiet);
    c1.apply(s);
    c1.localStep(1 / 60, false);
    expect(dbg(c1).hud).toBe('');
    // frame runs every received entry on
    for (let k = 0; k < 30; k++) c.frame(1 / 60);
    expect((c as unknown as { jam: { use: number }[] }).jam[2]!.use).toBeCloseTo(1, 1);
    // a shorter message (the course's 2) idles the slots it does not carry
    c.apply({ ...s, j: ['', 'p2'], ch: [JAMMER.useMax, 4], cd: [0, 0] });
    expect(dbg(c).jam).toEqual(['', 'p2']);
    expect((c as unknown as { jam: { active: boolean }[] }).jam[2]!.active).toBe(false);
    h.dispose();
    c.dispose();
    c1.dispose();
  });

  it('(A27) Marlow Yard: the course host gives exactly 2 entries, the values master gave for the same script', () => {
    const got = courseScript(CtDevices);
    if (process.env.D1_RECORD) {
      // re-record on master: D1_RECORD=<file> npx vitest run tests/ctDevicesSlots.test.ts -t A27
      writeFileSync(process.env.D1_RECORD, JSON.stringify(got, null, 2));
      return;
    }
    expect(MASTER.length).toBeGreaterThan(0);
    for (let i = 0; i < got.length; i += 3) {
      const w = JSON.parse(got[i]!) as SecWire;
      expect(w.j.length).toBe(2);
      expect(w.ch.length).toBe(2);
      expect(w.cd.length).toBe(2);
    }
    expect(got).toEqual(MASTER);
  });
});
