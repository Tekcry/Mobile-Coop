// (anim-gear, marlow-bays item 22) Gear offsets: the Gear section (registry, its own tuner tab), the composition per rig
// (base table + tuner delta, standing + crouch x crouched, clamped), the pivot maths, the bake into the base table's
// `gear` key (a literal export, round trip, old tables print as before) and the real rig: a holstered pistol and the
// sling node move on a Wren rig by exactly the offset, a guard rig is untouched, and a reset is bit-identical.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import '../src/anim/tune';
import '../src/anim/tuneV2Sections';
import { TUNE_SECTIONS, tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { GEAR_GROUP_IDS, GEAR_SECTION, tuneV2SyncAll } from '../src/anim/tuneV2Sections';
import { bakeCatalogue, tuneBake, type BakeResult } from '../src/anim/tuneBake';
import { BAKE_BASE_FILE, emptyBase, parseAnimBase, printAnimBase, spliceAnimBase } from '../src/anim/tuneBakeBase';
import { ANIM_BASE, type AnimBaseData } from '../src/anim/animBase';
import { animBaseLoad } from '../src/anim/tuneJointsRig';
import { eulerQuat } from '../src/anim/tuneJoints';
import { GEAR_OUT, GEAR_PARAMS, GEAR_ROWS, GEAR_SOCKETS, GS, gearAnyLive, gearCompose, gearEffective, gearRigState, gearRigUpdate, gearSocketOfSlot } from '../src/anim/tuneGear';
import { buildTabs } from '../src/ui/tunerLayout';

const ROOT = path.join(__dirname, '..');
const lf = (s: string): string => s.replace(/\r\n/g, '\n');
const CAT = bakeCatalogue(TUNE_SECTIONS.filter((s) => s.id !== 'keys'));
const D2R = Math.PI / 180;
/** A vector turned by a quaternion [x, y, z, w]. */
function qrot(q: ArrayLike<number>, v: number[]): number[] {
  const [x, y, z, w] = [q[0]!, q[1]!, q[2]!, q[3]!];
  const tx = 2 * (y * v[2]! - z * v[1]!);
  const ty = 2 * (z * v[0]! - x * v[2]!);
  const tz = 2 * (x * v[1]! - y * v[0]!);
  return [v[0]! + w * tx + (y * tz - z * ty), v[1]! + w * ty + (z * tx - x * tz), v[2]! + w * tz + (x * ty - y * tx)];
}
const empty = (): AnimBaseData => ({ version: 1, joints: {}, hands: {}, ik: {} });

const dirs: string[] = [];
function tempTree(): { read: (p: string) => string | null; write: (r: BakeResult) => void } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'anim-gear-'));
  dirs.push(dir);
  mkdirSync(path.dirname(path.join(dir, BAKE_BASE_FILE)), { recursive: true });
  cpSync(path.join(ROOT, BAKE_BASE_FILE), path.join(dir, BAKE_BASE_FILE));
  // (anim-bake-1022) the generated table is no longer empty: the literal GEAR_BASE assumes an untuned base
  writeFileSync(path.join(dir, BAKE_BASE_FILE), spliceAnimBase(readFileSync(path.join(dir, BAKE_BASE_FILE), "utf8"), emptyBase()));
  const read = (p: string): string | null => (existsSync(path.join(dir, p)) ? readFileSync(path.join(dir, p), 'utf8') : null);
  const write = (r: BakeResult): void => {
    for (const w of r.writes) {
      mkdirSync(path.dirname(path.join(dir, w.path)), { recursive: true });
      writeFileSync(path.join(dir, w.path), w.after);
    }
  };
  return { read, write };
}
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
afterEach(() => {
  animBaseLoad(ANIM_BASE);
  tuneResetAll();
  tuneV2SyncAll();
});
const jsonOf = (text: string): string => {
  const t = lf(text);
  return t.slice(t.indexOf('\n', t.indexOf('// @anim-base-begin')) + 1, t.lastIndexOf('\n', t.indexOf('// @anim-base-end')) + 1);
};

describe('anim-gear: the Gear section', () => {
  it('registers a socket group and a crouched group per socket, six identity sliders, in its own tuner tab', () => {
    expect(GEAR_SECTION.id).toBe('gear');
    expect(GEAR_SECTION.label).toBe('Gear');
    expect(GEAR_SOCKETS).toEqual(['holster', 'backL', 'backC', 'backR', 'slingHip', 'goggles']); // (anim-goggle) goggles last
    expect(GEAR_SECTION.groups).toEqual([...GEAR_SOCKETS.map((s) => `gear.${s}`), ...GEAR_SOCKETS.map((s) => `gear.${s}.crouch`)]);
    expect(GEAR_GROUP_IDS).toEqual(GEAR_SECTION.groups);
    expect(GEAR_SECTION.tunables.map((t) => t.id)).toEqual(['x', 'y', 'z', 'pitch', 'yaw', 'roll']);
    for (const t of GEAR_SECTION.tunables) {
      expect(t.kind).toBe('add');
      expect(t.def).toBe(0);
      expect(t.groups).toEqual(GEAR_SECTION.groups);
    }
    // the panel (track A) builds a tab for every registered section: Gear is its own tab, no UI change
    const tabs = buildTabs(TUNE_SECTIONS.map((s) => s.id), (id) => TUNE_SECTIONS.find((s) => s.id === id)?.label ?? id);
    expect(tabs.find((t) => t.id === 'sec:gear')?.sections).toEqual(['gear']);
    expect(tabs.find((t) => t.id === 'sec:gear')?.label).toBe('Gear');
  });

  it('the carry slots map onto their sockets', () => {
    expect(['thigh', 'backL', 'backC', 'backR', 'sling'].map(gearSocketOfSlot)).toEqual([GS.holster, GS.backL, GS.backC, GS.backR, GS.slingHip]);
    expect(gearSocketOfSlot('none')).toBe(-1);
  });
});

describe('anim-gear: composition', () => {
  it('base + tuner delta, standing + crouch x crouched (clamped 0..1); angles to a quaternion; unchanged input no work', () => {
    animBaseLoad({ ...empty(), gear: { holster: { x: 0.02, yaw: 30 }, 'holster.crouch': { x: 0.01 } } });
    tuneSet('gear.holster.crouch', 'y', 0.004);
    tuneSet('gear.holster', 'x', 0.005);
    tuneV2SyncAll();
    expect(gearEffective('holster', 0)).toBeCloseTo(0.025, 12);
    expect(gearAnyLive()).toBe(true);
    const st = gearRigState();
    const o = GS.holster * GEAR_OUT;
    gearRigUpdate(st, 0);
    expect([st.out[o], st.out[o + 1], st.out[o + 2]]).toEqual([0.025, 0, 0]);
    const q = new Float64Array(4);
    eulerQuat(0, 30 * D2R, 0, q, 0);
    expect(Array.from(st.out.slice(o + 3, o + 7))).toEqual(Array.from(q));
    expect(st.live[GS.holster]).toBe(1);
    for (const s of GEAR_SOCKETS) if (s !== 'holster') expect(st.live[GS[s]]).toBe(0);
    gearRigUpdate(st, 0.5);
    expect(st.out[o]).toBeCloseTo(0.03, 12);
    expect(st.out[o + 1]).toBeCloseTo(0.002, 12);
    gearRigUpdate(st, 1);
    expect(st.out[o]).toBeCloseTo(0.035, 12);
    expect(st.out[o + 1]).toBeCloseTo(0.004, 12);
    const v = st.ver;
    gearRigUpdate(st, 3); // clamped to 1: the same input
    expect(st.ver).toBe(v);
    gearRigUpdate(st, -1);
    expect(st.out[o]).toBeCloseTo(0.025, 12);
    expect(st.out[o + 1]).toBe(0);
  });

  it('nothing live: no work; switched off after an offset: every socket back to identity', () => {
    expect(gearAnyLive()).toBe(false);
    const st = gearRigState();
    gearRigUpdate(st, 0.7);
    expect(st.ver).toBe(0);
    expect(st.on).toBe(false);
    animBaseLoad({ ...empty(), gear: { 'backC.crouch': { pitch: 10 } } });
    gearRigUpdate(st, 0.7);
    expect(st.on).toBe(true);
    expect(st.live[GS.backC]).toBe(1);
    animBaseLoad(ANIM_BASE);
    gearRigUpdate(st, 0.7);
    expect(st.on).toBe(false);
    expect(Array.from(st.live)).toEqual(GEAR_SOCKETS.map(() => 0));
    const v = st.ver;
    gearRigUpdate(st, 0.2);
    expect(st.ver).toBe(v); // off and nothing live: no work at all
  });

  it('the pivot stays put under a turn; a move goes along the slot frame (p\' = p + R (d + v - r v), q\' = q r)', () => {
    const rot = (q: ArrayLike<number>, v: number[]): number[] => {
      const [x, y, z, w] = [q[0]!, q[1]!, q[2]!, q[3]!];
      const tx = 2 * (y * v[2]! - z * v[1]!);
      const ty = 2 * (z * v[0]! - x * v[2]!);
      const tz = 2 * (x * v[1]! - y * v[0]!);
      return [v[0]! + w * tx + (y * tz - z * ty), v[1]! + w * ty + (z * tx - x * tz), v[2]! + w * tz + (x * ty - y * tx)];
    };
    const q = new Float64Array(4);
    eulerQuat(0.3, -1.1, 0.7, q, 0);
    const p = [0.1, -0.25, 0.03];
    const v = [0.01, -0.0175, 0.118];
    const res = new Float64Array(7);
    const st = gearRigState();
    animBaseLoad({ ...empty(), gear: { holster: { pitch: 20, yaw: -15, roll: 5 } } });
    gearRigUpdate(st, 0);
    expect(gearCompose(st, GS.holster, p[0]!, p[1]!, p[2]!, q[0]!, q[1]!, q[2]!, q[3]!, v[0]!, v[1]!, v[2]!, res)).toBe(true);
    const w0 = rot(q, v).map((c, i) => c + p[i]!);
    const w1 = rot(res.slice(3), v).map((c, i) => c + res[i]!);
    for (let i = 0; i < 3; i++) expect(w1[i]).toBeCloseTo(w0[i]!, 12);
    animBaseLoad({ ...empty(), gear: { holster: { x: 0.02, z: -0.01 } } });
    gearRigUpdate(st, 0);
    gearCompose(st, GS.holster, p[0]!, p[1]!, p[2]!, q[0]!, q[1]!, q[2]!, q[3]!, v[0]!, v[1]!, v[2]!, res);
    const d = rot(q, [0.02, 0, -0.01]);
    for (let i = 0; i < 3; i++) expect(res[i]! - p[i]!).toBeCloseTo(d[i]!, 12);
    expect(Array.from(res.slice(3))).toEqual(Array.from(q));
    // a socket without an offset: nothing written
    expect(gearCompose(st, GS.backL, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, res)).toBe(false);
  });
});

// A literal export (version 2, as the tuner writes it) with Gear rows.
const GEAR_EXPORT = JSON.parse(`{
  "magic": "night-shift-anim-tune",
  "version": 2,
  "exported": "2026-10-21T23:30:00.000Z",
  "changed": [
    { "group": "gear.holster", "id": "x", "label": "x (socket right, m)", "kind": "add", "unit": "m", "value": 0.012, "default": 0 },
    { "group": "gear.holster", "id": "yaw", "label": "yaw (about y, deg)", "kind": "add", "unit": "deg", "value": -6.5, "default": 0 },
    { "group": "gear.holster.crouch", "id": "y", "label": "y (socket up / gun top, m)", "kind": "add", "unit": "m", "value": 0.008, "default": 0 },
    { "group": "gear.backC", "id": "z", "label": "z (socket forward / along the bore, m)", "kind": "add", "unit": "m", "value": -0.015, "default": 0 },
    { "group": "gear.slingHip", "id": "x", "label": "x (socket right, m)", "kind": "add", "unit": "m", "value": -0.01, "default": 0 }
  ],
  "log": []
}`) as unknown;

const GEAR_BASE = `{
  "version": 1,
  "joints": {},
  "hands": {},
  "ik": {},
  "gear": {
    "backC": { "z": -0.015 },
    "holster": { "x": 0.012, "yaw": -6.5 },
    "holster.crouch": { "y": 0.008 },
    "slingHip": { "x": -0.01 }
  }
}
`;

describe('anim-gear: the bake', () => {
  it('a literal export bakes into the base table\'s gear key; the rows read "baked (base table)"', () => {
    const t = tempTree();
    const r = tuneBake(GEAR_EXPORT, CAT, t.read, { now: new Date('2026-10-21T23:40:00Z') });
    expect(r.ok, r.error).toBe(true);
    t.write(r);
    expect(jsonOf(t.read(BAKE_BASE_FILE)!)).toBe(GEAR_BASE);
    for (const row of r.rows.filter((x) => x.group.startsWith('gear.'))) expect(row.result, `${row.group} ${row.id}`).toBe('baked (base table)');
    expect(r.rows.find((x) => x.group === 'gear.holster' && x.id === 'yaw')!.target).toBe('src/anim/animBase.ts: gear.holster.yaw + (deg, wrapped)');
    expect(r.rows.find((x) => x.group === 'gear.backC')!.target).toBe('src/anim/animBase.ts: gear.backC.z + (m)');
    // a re-run is a no-op (the ledger)
    const again = tuneBake(GEAR_EXPORT, CAT, t.read, { now: new Date('2026-10-21T23:41:00Z') });
    expect(again.writes.filter((w) => w.path === BAKE_BASE_FILE).length).toBe(0);
  });

  it('round trip: bake, load the new base, reset the tuner: every gear row has the same effective value', () => {
    const t = tempTree();
    const r = tuneBake(GEAR_EXPORT, CAT, t.read, { now: new Date('2026-10-21T23:40:00Z') });
    t.write(r);
    const changed = (GEAR_EXPORT as { changed: { group: string; id: string; value: number }[] }).changed;
    for (const c of changed) tuneSet(c.group, c.id, c.value);
    tuneV2SyncAll();
    const before = GEAR_ROWS.map((row) => GEAR_PARAMS.map((_, p) => gearEffective(row, p)));
    tuneResetAll();
    animBaseLoad(parseAnimBase(t.read(BAKE_BASE_FILE)!));
    tuneV2SyncAll();
    const after = GEAR_ROWS.map((row) => GEAR_PARAMS.map((_, p) => gearEffective(row, p)));
    expect(after).toEqual(before);
  });

  it('a table without the gear key (every one before anim-gear) parses and prints exactly as before; offsets add', () => {
    const old = lf(readFileSync(path.join(ROOT, BAKE_BASE_FILE), 'utf8'));
    const b = parseAnimBase(old);
    expect(b.gear).toBeUndefined();
    expect(printAnimBase(b)).toBe(jsonOf(old));
    expect(printAnimBase({ ...empty(), gear: { holster: { x: 0 } } })).toBe(printAnimBase(empty()));
    // a second bake on a base that has gear adds
    const t = tempTree();
    t.write(tuneBake(GEAR_EXPORT, CAT, t.read, { now: new Date('2026-10-21T23:40:00Z') }));
    const more = JSON.parse(JSON.stringify(GEAR_EXPORT)) as { changed: { value: number; id: string; group: string }[]; exported: string };
    more.changed = more.changed.filter((c) => c.group === 'gear.holster' && c.id === 'x').map((c) => ({ ...c, value: 0.003 }));
    more.exported = '2026-10-22T00:10:00.000Z';
    const r2 = tuneBake(more, CAT, t.read, { now: new Date('2026-10-22T00:11:00Z') });
    expect(r2.ok, r2.error).toBe(true);
    t.write(r2);
    expect(parseAnimBase(t.read(BAKE_BASE_FILE)!).gear!.holster!.x).toBe(0.015);
  });
});

describe('anim-gear: the real rig', () => {
  it('a holster row moves the holstered pistol and a slingHip row the sling node on a Wren rig by exactly the offset; a guard is untouched; reset is bit-identical', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
    const { WEAPONS } = await import('../src/weapons/weaponDefs');
    const { WREN_HOLSTER } = await import('../src/operators/handFrame');
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const mk = (wren: boolean, k: number) => {
      const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, `g${k}`, { build: 'average', style: 'detailed' });
      rig.thighMount = WREN_HOLSTER as unknown as typeof rig.thighMount;
      rig.tuneRows = wren;
      rig.root.position.x = k * 3;
      const pistol = new WeaponModel(scene, lib, WEAPONS.pistolSd, DEFAULT_WEAPON_COLORS, rig.weaponPivot);
      pistol.holster(rig, 'thigh');
      return { rig, pistol };
    };
    const wren = mk(true, 0);
    const guard = mk(false, 1);
    const pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
    const run = (n: number, crouch = 0): void => {
      pose.crouch = crouch;
      for (let f = 0; f < n; f++) {
        wren.rig.animate(1 / 60, pose);
        guard.rig.animate(1 / 60, pose);
      }
    };
    const snap = (m: { pistol: { node: { position: { x: number; y: number; z: number }; rotationQuaternion: { x: number; y: number; z: number; w: number } | null } } }) => {
      const n = m.pistol.node;
      const q = n.rotationQuaternion!;
      return [n.position.x, n.position.y, n.position.z, q.x, q.y, q.z, q.w];
    };
    const sling = () => wren.rig.slingHip.position.asArray();
    run(10);
    const w0 = snap(wren);
    const g0 = snap(guard);
    const s0 = sling();
    animBaseLoad({ ...empty(), gear: { holster: { x: 0.02 }, 'holster.crouch': { y: 0.01 }, slingHip: { z: -0.015 } } });
    run(2);
    const w1 = snap(wren);
    // in the holster's own frame (its x axis, from the hip joint): exactly 2 cm along WREN_HOLSTER.x
    const ax = qrot(w0.slice(3), [1, 0, 0]);
    const ay = qrot(w0.slice(3), [0, 1, 0]);
    for (let i = 0; i < 3; i++) expect(w1[i]! - w0[i]!).toBeCloseTo(0.02 * ax[i]!, 12);
    for (let i = 0; i < 3; i++) expect(ax[i]).toBeCloseTo(WREN_HOLSTER.x[i]!, 2); // the holster's own x axis
    expect(w1.slice(3)).toEqual(w0.slice(3));
    expect(snap(guard)).toEqual(g0);
    const s1 = sling();
    expect(s1[0]).toBe(s0[0]);
    expect(s1[2]! - s0[2]!).toBeCloseTo(-0.015, 12);
    // crouched: the crouched row adds along the holster's y
    run(2, 1);
    const w2 = snap(wren);
    for (let i = 0; i < 3; i++) expect(w2[i]! - w0[i]!).toBeCloseTo(0.02 * ax[i]! + 0.01 * ay[i]!, 12);
    // a draw's travel end reads the same place (the ghost through `place`): covered by the same `place` call
    animBaseLoad(ANIM_BASE);
    run(2);
    expect(snap(wren)).toEqual(w0);
    expect(sling()).toEqual(s0);
    expect(snap(guard)).toEqual(g0);
    scene.dispose();
  });
});
