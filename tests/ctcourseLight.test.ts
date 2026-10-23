/**
 * Marlow Yard light frame (marlow-final slice 0d; SPEC section 7, LIGHTING-PLAN sections 2-5): the real ctcourse light
 * field, baked in node with the pure bakers as `World.create` + `bakeLevelLight` do, read at every part's light-test
 * spots (`LIGHT_SPOTS`: the facility's and each set's `SetPart.lightSpots`) against the plan's bands (`MARLOW_LEVEL`):
 * lit pools >= 0.60, read floor >= 0.40, dark pockets <= 0.22 crouched, a cut circuit's area <= 0.24, the sets' standby
 * 0.14 and the facility rooms' house 0.30 with every lamp off. No house or gallery lamp reaches a set's spot, no 2 m
 * column lists more lamps than the shaders hold, no moon. Each set's tuned levels live in its own
 * `tests/ctcourse/<set>.light.json` (one file per set, so parallel builders never share one): every spot within 0.08 of
 * its tuning and no band change but at a band's edge. `CTLIGHT_PRINT=1` prints each set's json to paste after a re-tune.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse, ctcourse, LIGHT_SPOTS } from '../src/world/maps/ctcourse';
import { SET_IDS, inSet, type LightSpot, type SetId } from '../src/world/maps/ctcourseSets/types';
import { MOVEMENT } from '../src/config/movement';
import { dressingOn } from '../src/world/detailPass';
import { canonicalLightSet } from '../src/voxel/lightShapes';
import { bakeLamps, LAMP_GRID, LAMP_GRID_SLOTS, LAMP_STRIDE } from '../src/voxel/lampBake';
import { bakeMoon, MOON_CELL } from '../src/voxel/skyBake';
import { bakedLights, type LightBake } from '../src/world/lightBake';
import { buildAmbientGrid } from '../src/world/ambientGrid';
import { LightField, type FieldDoor } from '../src/world/lightField';
import { moonLight } from '../src/world/lampMath';
import { LIGHT } from '../src/world/lights';
import { MARLOW_LEVEL } from '../src/world/lighting/levels';

const b = new LevelBuilder();
const built = buildCtcourse(b);
const reg = b.lights;
let bake: LightBake;
let open: LightField;
let shut: LightField;
let bakeMs = 0;

beforeAll(() => {
  const t0 = performance.now();
  const set = canonicalLightSet(b.boxes, b.cylinders, 'ctcourse', dressingOn(ctcourse));
  reg.ambient = ctcourse.theme.lightLevel ?? 0.75;
  const mL = moonLight(ctcourse.theme);
  const sky = Math.max(0, reg.ambient - mL);
  const ambient = buildAmbientGrid({ ambientAt: (x, y, z) => { const v = reg.zoneAt(x, y, z); return v === v ? v : sky; } }, set.lo, set.hi);
  const s = ctcourse.theme.sunDir;
  const l = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
  const dir: [number, number, number] = [-s[0] / l, -s[1] / l, -s[2] / l];
  const n: [number, number, number] = [0, 1, 2].map((k) => Math.max(1, Math.ceil((set.hi[k]! - set.lo[k]!) / MOON_CELL))) as [number, number, number];
  const m = bakeMoon({ kind: 'moon', id: 0, origin: set.lo, n, shapes: set.shapes, dir });
  const baked = bakedLights(reg);
  const r = bakeLamps({ kind: 'lamps', id: 0, shapes: set.shapes, lights: baked.lights, lo: set.lo, hi: set.hi });
  bake = { lo: set.lo, hi: set.hi, lampKey: 't', moonKey: 't', lamps: { baked, r }, moon: { origin: set.lo, n, cell: MOON_CELL, vis: m.vis, dir }, ambient, moonLight: mL, ms: 0 };
  const doors = (o: number): FieldDoor[] => b.anchors.doors.map((anchor) => ({ anchor, open: o }));
  open = new LightField(bake, reg, doors(1));
  shut = new LightField(bake, reg, doors(0));
  bakeMs = performance.now() - t0;
}, 120_000);

/** A spot's level: a standing body (crouched in a pocket) or a surface point, doors open unless the spot says shut. */
const read = (p: LightSpot): number => {
  const f = p.shut ? shut : open;
  if (p.kind === 'surf') return f.levelAt(p.x, p.y, p.z);
  return f.bodyLevel(p.x, p.y, p.z, p.band === 'pocket' ? MOVEMENT.crouchHeight : 1.7);
};
/** Read with the lamps `ids` switched off (restored after). */
const withOff = <T>(ids: readonly number[], fn: () => T): T => {
  for (const id of ids) reg.setOn(id, false);
  try {
    return fn();
  } finally {
    for (const id of ids) reg.setOn(id, true);
  }
};
const lampIds = (): number[] => bake.lamps!.baked.ids;
const groupIds = (groups: readonly number[]): number[] => reg.lights.filter((l) => l.kind !== 'flashlight' && groups.includes(l.group)).map((l) => l.id);
/** The level a spot is tuned on: its band's own state (every lamp off for standby / house, its circuits off for a cut). */
const levelOf = (p: LightSpot): number =>
  p.band === 'standby' || p.band === 'house' ? withOff(lampIds(), () => read(p)) : p.band === 'cut' ? withOff(groupIds(p.off ?? []), () => read(p)) : read(p);

const ALL: [SetId | 'facility', LightSpot][] = (Object.entries(LIGHT_SPOTS) as [SetId | 'facility', readonly LightSpot[]][]).flatMap(([k, spots]) => spots.map((p) => [k, p] as [SetId | 'facility', LightSpot]));
const tunedFile = (id: SetId): string => `tests/ctcourse/${id}.light.json`;

describe('Marlow Yard light frame (marlow-final 0d)', () => {
  it('bakes in node fast enough for the unit run; every lamp is in the bake', () => {
    expect(bakeMs).toBeLessThan(60_000);
    const ids = new Set(lampIds());
    for (const l of reg.lights) if (l.kind !== 'flashlight') expect(ids.has(l.id), `lamp ${l.id}`).toBe(true);
  });

  it('the spots the frame reads are the ones the build gives (LIGHT_SPOTS = the parts\' spots)', () => {
    expect(LIGHT_SPOTS.facility.map((p) => p.name)).toEqual(built.facility.lightSpots.map((p) => p.name));
    for (const p of built.parts) expect(LIGHT_SPOTS[p.id].map((s) => s.name)).toEqual(p.lightSpots.map((s) => s.name));
    for (const id of SET_IDS) expect(LIGHT_SPOTS[id].some((p) => p.band === 'read' || p.band === 'pool'), `${id} has a lit spot`).toBe(true);
  });

  it('every spot reads in its band: pools lit, floors read, pockets dark, cut circuits dark, standby and house fills', () => {
    const bad: string[] = [];
    for (const [, p] of ALL) {
      const v = levelOf(p);
      const why =
        p.band === 'pool' ? (v >= MARLOW_LEVEL.poolMin ? '' : `< pool ${MARLOW_LEVEL.poolMin}`)
        : p.band === 'read' ? (v >= MARLOW_LEVEL.readMin ? '' : `< read ${MARLOW_LEVEL.readMin}`)
        : p.band === 'pocket' ? (v <= MARLOW_LEVEL.pocketMax ? '' : `> pocket ${MARLOW_LEVEL.pocketMax}`)
        : p.band === 'cut' ? (v <= MARLOW_LEVEL.cutMax ? '' : `> cut ${MARLOW_LEVEL.cutMax}`)
        : p.band === 'standby' ? (Math.abs(v - MARLOW_LEVEL.standby) <= 0.03 ? '' : `not standby ${MARLOW_LEVEL.standby}`)
        : p.band === 'house' ? (Math.abs(v - MARLOW_LEVEL.house) <= 0.03 ? '' : `not house ${MARLOW_LEVEL.house}`)
        : '';
      if (why) bad.push(`${p.name}: ${v.toFixed(3)} ${why}`);
    }
    expect(bad).toEqual([]);
  });

  it('no house or gallery lamp (groups 90-98) reaches any set spot, doors open or shut', () => {
    const house = bake.lamps!.baked.ids.map((id, i) => [id, i] as const).filter(([id]) => reg.lights[id]!.group >= 90);
    expect(house.length).toBeGreaterThan(20);
    const bad: string[] = [];
    for (const [k, p] of ALL) {
      if (k === 'facility' || !inSet(k, p.x, p.z)) continue;
      for (const f of [open, shut]) for (const [id, i] of house) for (const y of [p.y + 0.3, p.y + 1.0, p.y + 1.6]) if (f.lampAt(i, p.x, y, p.z) > 0) bad.push(`${p.name}: lamp ${id} (group ${reg.lights[id]!.group})`);
    }
    expect([...new Set(bad)]).toEqual([]);
  });

  it('no 2 m column has more lamps in reach than the shaders list', () => {
    const L = bake.lamps!.baked.lights;
    const n = L.length / LAMP_STRIDE;
    const cols = Math.ceil((bake.hi[0] - bake.lo[0]) / LAMP_GRID);
    const rows = Math.ceil((bake.hi[2] - bake.lo[2]) / LAMP_GRID);
    let worst = 0;
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const cx0 = bake.lo[0] + q * LAMP_GRID;
        const cz0 = bake.lo[2] + r * LAMP_GRID;
        let c = 0;
        for (let i = 0; i < n; i++) {
          const o = i * LAMP_STRIDE;
          const dx = Math.max(cx0 - L[o]!, 0, L[o]! - (cx0 + LAMP_GRID));
          const dz = Math.max(cz0 - L[o + 2]!, 0, L[o + 2]! - (cz0 + LAMP_GRID));
          if (Math.sqrt(dx * dx + dz * dz) < L[o + 3]!) c++;
        }
        worst = Math.max(worst, c);
      }
    }
    expect(worst).toBeLessThanOrEqual(LAMP_GRID_SLOTS);
  });

  it('indoor: no moon; every lamp under the bake box top', () => {
    expect(moonLight(ctcourse.theme)).toBe(0);
    expect(bake.moonLight).toBe(0);
    for (const l of reg.lights) if (l.kind !== 'flashlight') expect(l.y + 0.2).toBeLessThanOrEqual(bake.hi[1]);
  });

  // CTLIGHT_PRINT=1 prints each set's tuned block; CTLIGHT_WRITE=<set id> (or `all`) writes that set's json (run it
  // before the tuned-levels case: `npx vitest run tests/ctcourseLight.test.ts`, then rerun without it)
  it.runIf(process.env.CTLIGHT_PRINT === '1' || !!process.env.CTLIGHT_WRITE)('prints / writes the levels (one json per set)', () => {
    const out: string[] = [`bake ${(bakeMs / 1000).toFixed(1)} s, ${lampIds().length} lamps`];
    const write = process.env.CTLIGHT_WRITE ?? '';
    for (const [k, spots] of Object.entries(LIGHT_SPOTS)) {
      const levels: Record<string, number> = {};
      for (const p of spots) levels[p.name] = Number(levelOf(p).toFixed(2));
      const text = `${JSON.stringify({ levels }, null, 1)}\n`;
      out.push(`--- ${k === 'facility' ? 'facility (band checks only)' : tunedFile(k as SetId)}\n${text}`);
      if (k !== 'facility' && (write === 'all' || write === k)) {
        mkdirSync('tests/ctcourse', { recursive: true });
        writeFileSync(tunedFile(k as SetId), text);
      }
    }
    console.info(out.join('\n'));
  });

  it('each set holds its tuned levels: every spot within 0.08, no band change but at its edge', () => {
    const band = (v: number): number => (v < LIGHT.shadow ? 0 : v < LIGHT.lit ? 1 : 2);
    const nearEdge = (v: number): boolean => Math.min(Math.abs(v - LIGHT.shadow), Math.abs(v - LIGHT.lit)) <= 0.05;
    const bad: string[] = [];
    for (const id of SET_IDS) {
      const spots = LIGHT_SPOTS[id];
      if (!existsSync(tunedFile(id))) {
        bad.push(`${id}: no ${tunedFile(id)} (run CTLIGHT_PRINT=1 and paste its block)`);
        continue;
      }
      const before = (JSON.parse(readFileSync(tunedFile(id), 'utf8')) as { levels: Record<string, number> }).levels;
      if (Object.keys(before).length !== spots.length) bad.push(`${id}: ${spots.length} spots, ${Object.keys(before).length} tuned`);
      for (const p of spots) {
        const v = levelOf(p);
        const was = before[p.name];
        if (was === undefined) bad.push(`${p.name}: not in ${tunedFile(id)}`);
        else if (Math.abs(v - was) > 0.08) bad.push(`${p.name}: ${was} -> ${v.toFixed(2)}`);
        else if (band(v) !== band(was) && !(nearEdge(v) && nearEdge(was))) bad.push(`${p.name}: band ${was} -> ${v.toFixed(2)}`);
      }
    }
    expect(bad).toEqual([]);
  });

});
