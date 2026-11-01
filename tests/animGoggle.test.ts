// (anim-goggle, marlow-bays item 22's last socket) The worn goggle as a Gear socket: the `goggles` rows (standing and
// crouched, head frame, metres and degrees), the per-rig composition, each Wren rig's write into track C's
// `GOGGLE_OFFSET.inUse` inside its own window and the restore after it (the global never leaks to the next rig or to a
// guard), untuned bit-identical, and the bake of a literal export into the base table's `gear` key.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import '../src/anim/tune';
import '../src/anim/tuneV2Sections';
import { TUNE_SECTIONS, tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import { GEAR_SECTION, tuneV2SyncAll } from '../src/anim/tuneV2Sections';
import { bakeCatalogue, tuneBake, type BakeResult } from '../src/anim/tuneBake';
import { BAKE_BASE_FILE, emptyBase, parseAnimBase, spliceAnimBase } from '../src/anim/tuneBakeBase';
import { ANIM_BASE, type AnimBaseData } from '../src/anim/animBase';
import { animBaseLoad } from '../src/anim/tuneJointsRig';
import { GEAR_PARAMS, GEAR_ROWS, GEAR_SOCKETS, GS, gearAnyLive, gearEffective, gearRigState, gearRigUpdate, gearSocketOfSlot } from '../src/anim/tuneGear';
import { GOGGLE_OFFSET, goggleOffsetIdentity, setGoggleOffset } from '../src/operators/runtime/goggle';

const ROOT = path.join(__dirname, '..');
const lf = (s: string): string => s.replace(/\r\n/g, '\n');
const CAT = bakeCatalogue(TUNE_SECTIONS.filter((s) => s.id !== 'keys'));
const empty = (): AnimBaseData => ({ version: 1, joints: {}, hands: {}, ik: {} });
const inUse = (): number[] => {
  const o = GOGGLE_OFFSET.inUse;
  return [o.x, o.y, o.z, o.pitch, o.yaw, o.roll];
};

const dirs: string[] = [];
function tempTree(): { read: (p: string) => string | null; write: (r: BakeResult) => void } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'anim-goggle-'));
  dirs.push(dir);
  mkdirSync(path.dirname(path.join(dir, BAKE_BASE_FILE)), { recursive: true });
  cpSync(path.join(ROOT, BAKE_BASE_FILE), path.join(dir, BAKE_BASE_FILE));
  // the generated table holds Michael's bake (4.46.0): the literal expected text assumes an untuned base
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
  setGoggleOffset('inUse', 0, 0, 0, 0, 0, 0);
});
const jsonOf = (text: string): string => {
  const t = lf(text);
  return t.slice(t.indexOf('\n', t.indexOf('// @anim-base-begin')) + 1, t.lastIndexOf('\n', t.indexOf('// @anim-base-end')) + 1);
};

describe('anim-goggle: the socket', () => {
  it('goggles (worn) and goggles.crouch are Gear rows with the six identity sliders; no stowed socket; no carry slot', () => {
    expect(GEAR_SOCKETS).toContain('goggles');
    expect(GEAR_ROWS).toContain('goggles');
    expect(GEAR_ROWS).toContain('goggles.crouch');
    expect(GEAR_ROWS.some((r) => /stow/i.test(r))).toBe(false);
    expect(GEAR_SECTION.groups).toContain('gear.goggles');
    expect(GEAR_SECTION.groups).toContain('gear.goggles.crouch');
    expect(GEAR_SECTION.tunables.map((t) => [t.id, t.def, t.unit])).toEqual([
      ['x', 0, 'm'], ['y', 0, 'm'], ['z', 0, 'm'], ['pitch', 0, 'deg'], ['yaw', 0, 'deg'], ['roll', 0, 'deg'],
    ]);
    for (const s of ['thigh', 'backL', 'backC', 'backR', 'sling', 'none']) expect(gearSocketOfSlot(s)).not.toBe(GS.goggles);
  });

  it('composes base + tuner delta, standing + crouch x crouched, in metres and degrees; untuned: nothing live', () => {
    expect(gearAnyLive()).toBe(false);
    const st = gearRigState();
    gearRigUpdate(st, 0.5);
    expect(st.ver).toBe(0);
    expect([...st.goggle]).toEqual([0, 0, 0, 0, 0, 0]);
    animBaseLoad({ ...empty(), gear: { goggles: { y: 0.01, pitch: -8 }, 'goggles.crouch': { z: 0.004, pitch: 2 } } });
    tuneSet('gear.goggles', 'x', 0.002);
    tuneV2SyncAll();
    expect(gearEffective('goggles', 0)).toBe(0.002);
    gearRigUpdate(st, 0);
    expect([...st.goggle]).toEqual([0.002, 0.01, 0, -8, 0, 0]);
    expect(st.live[GS.goggles]).toBe(1);
    for (const s of GEAR_SOCKETS) if (s !== 'goggles') expect(st.live[GS[s]]).toBe(0);
    gearRigUpdate(st, 0.5);
    expect(st.goggle[2]).toBeCloseTo(0.002, 12);
    expect(st.goggle[3]).toBeCloseTo(-7, 12);
    animBaseLoad(ANIM_BASE);
    tuneResetAll();
    tuneV2SyncAll();
    gearRigUpdate(st, 0.5);
    expect(st.live[GS.goggles]).toBe(0);
    expect([...st.goggle]).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('anim-goggle: the real rig', () => {
  it("each Wren rig's goggleOff carries its own inUse offset; GOGGLE_OFFSET is back after each; a guard never; reset exact", async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const mk = (wren: boolean, k: number) => {
      const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, `gg${k}`, { build: 'average', style: 'detailed' });
      rig.tuneRows = wren;
      rig.root.position.x = k * 3;
      return rig;
    };
    const wren = mk(true, 0);
    const wrenB = mk(true, 1);
    const guard = mk(false, 2);
    const stand = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
    const low = { ...stand, crouch: 1 };
    const run = (n: number): void => {
      for (let f = 0; f < n; f++) {
        wren.animate(1 / 60, stand);
        expect(goggleOffsetIdentity('inUse')).toBe(true);
        wrenB.animate(1 / 60, low);
        expect(goggleOffsetIdentity('inUse')).toBe(true);
        guard.animate(1 / 60, stand);
      }
    };
    const off = (r: { goggleOff: Float64Array }): number[] => [...r.goggleOff];
    run(6);
    // untuned: identity everywhere, no gear version (bit-identical: nothing written)
    const zero = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(off(wren)).toEqual(zero);
    expect(off(wrenB)).toEqual(zero);
    expect(off(guard)).toEqual(zero);
    expect(wren.gearVer).toBe(0);
    animBaseLoad({ ...empty(), gear: { goggles: { y: 0.012, z: -0.004, pitch: -10 }, 'goggles.crouch': { y: -0.002, roll: 3 } } });
    run(2);
    expect(off(wren).slice(6)).toEqual([0, 0.012, -0.004, -10, 0, 0]);
    expect(off(wren).slice(0, 6)).toEqual([0, 0, 0, 0, 0, 0]); // no stowed socket
    expect(off(wrenB).slice(6)[1]).toBeCloseTo(0.01, 12); // her own crouch adds the crouched row
    expect(off(wrenB).slice(6)[5]).toBe(3);
    expect(off(guard)).toEqual(zero);
    expect(inUse()).toEqual([0, 0, 0, 0, 0, 0]);
    // the tuner's delta adds on the base row
    tuneSet('gear.goggles', 'y', 0.003);
    tuneV2SyncAll();
    run(1);
    expect(off(wren)[7]).toBeCloseTo(0.015, 12);
    // a value the table holds (track C's own) stays, the rig's offset over it; the guard copies the table as it stands
    setGoggleOffset('inUse', 0.001, 0, 0, 0, 0, 0);
    wren.animate(1 / 60, stand);
    guard.animate(1 / 60, stand);
    expect(inUse()).toEqual([0.001, 0, 0, 0, 0, 0]);
    expect(off(wren)[6]).toBe(0.001);
    expect(off(wren)[7]).toBeCloseTo(0.015, 12);
    expect(off(guard).slice(6)).toEqual([0.001, 0, 0, 0, 0, 0]);
    setGoggleOffset('inUse', 0, 0, 0, 0, 0, 0);
    // reset: back to identity exactly
    animBaseLoad(ANIM_BASE);
    tuneResetAll();
    tuneV2SyncAll();
    run(2);
    expect(off(wren)).toEqual(zero);
    expect(off(wrenB)).toEqual(zero);
    expect(off(guard)).toEqual(zero);
    expect(inUse()).toEqual([0, 0, 0, 0, 0, 0]);
    scene.dispose();
  });
});

// A literal export (version 2, as the tuner writes it) with goggle rows.
const GOGGLE_EXPORT = JSON.parse(`{
  "magic": "night-shift-anim-tune",
  "version": 2,
  "exported": "2026-10-22T09:00:00.000Z",
  "changed": [
    { "group": "gear.goggles", "id": "y", "label": "y (socket up / gun top, m)", "kind": "add", "unit": "m", "value": 0.006, "default": 0 },
    { "group": "gear.goggles", "id": "pitch", "label": "pitch (about x, deg)", "kind": "add", "unit": "deg", "value": -7.5, "default": 0 },
    { "group": "gear.goggles.crouch", "id": "z", "label": "z (socket forward / along the bore, m)", "kind": "add", "unit": "m", "value": 0.003, "default": 0 }
  ],
  "log": []
}`) as unknown;

const GOGGLE_BASE = `{
  "version": 1,
  "joints": {},
  "hands": {},
  "ik": {},
  "gear": {
    "goggles": { "pitch": -7.5, "y": 0.006 },
    "goggles.crouch": { "z": 0.003 }
  }
}
`;

describe('anim-goggle: the bake', () => {
  it('a literal export bakes gear.goggles / gear.goggles.crouch into the base table (no bake code change); round trip', () => {
    const t = tempTree();
    const r = tuneBake(GOGGLE_EXPORT, CAT, t.read, { now: new Date('2026-10-22T09:05:00Z') });
    expect(r.ok, r.error).toBe(true);
    t.write(r);
    expect(jsonOf(t.read(BAKE_BASE_FILE)!)).toBe(GOGGLE_BASE);
    for (const row of r.rows.filter((x) => x.group.startsWith('gear.'))) expect(row.result, `${row.group} ${row.id}`).toBe('baked (base table)');
    expect(r.rows.find((x) => x.group === 'gear.goggles' && x.id === 'pitch')!.target).toBe('src/anim/animBase.ts: gear.goggles.pitch + (deg, wrapped)');
    expect(r.rows.find((x) => x.group === 'gear.goggles.crouch')!.target).toBe('src/anim/animBase.ts: gear.goggles.crouch.z + (m)');
    // the round trip: the tuner's values, then the baked base with the tuner reset: the same effective rows
    const changed = (GOGGLE_EXPORT as { changed: { group: string; id: string; value: number }[] }).changed;
    for (const c of changed) tuneSet(c.group, c.id, c.value);
    tuneV2SyncAll();
    const before = GEAR_ROWS.map((row) => GEAR_PARAMS.map((_, p) => gearEffective(row, p)));
    tuneResetAll();
    animBaseLoad(parseAnimBase(t.read(BAKE_BASE_FILE)!));
    tuneV2SyncAll();
    expect(GEAR_ROWS.map((row) => GEAR_PARAMS.map((_, p) => gearEffective(row, p)))).toEqual(before);
    expect(gearEffective('goggles', 3)).toBe(-7.5);
  });
});
