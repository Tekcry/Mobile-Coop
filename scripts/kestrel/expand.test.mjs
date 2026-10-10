// Tests for expand.mjs and the module kit. Run: node --test scripts/kestrel/expand.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runChecks } from './check.mjs';
import { expandLayout, formatArch, loadModules, rectSizeFor } from './expand.mjs';
import { loadFacts, readJson } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.join(HERE, '..', '..', 'docs', 'kestrel', 'sample.layout.json');
const facts = loadFacts();
const modules = loadModules();
const moduleTable = Object.fromEntries([...modules.values()].map((m) => [m.id, m]));
const G = 0.5;
const EXT = facts.fact('rules.wallExterior');

const sampleLayout = () => readJson(SAMPLE);
const expand = (layout, base = null, mods = modules) => expandLayout({ layout, base, modules: mods, facts });
const ok = (r) => { assert.deepEqual(r.errors, []); return r.arch; };
const checks = (arch) => runChecks({ arch, facts, modules: moduleTable });
const failing = (results, ignore = []) => results.filter((r) => r.status === 'FAIL' && !ignore.includes(r.id)).map((r) => `${r.id}: ${r.details.join(' | ')}`);
const byId = (list, id) => list.find((x) => x.id === id);

// A one-level layout for a single placement.
const single = (p, extraLevels = []) => ({
  meta: { id: 't', version: 1, grid: G, objectGrid: 0.1, entry: [1, 1], bay: [6, 6], site: [0, 0, 60, 45], footprint: [0, 0, 60, 45] },
  levels: [{ id: 'G', name: 'Ground', floor: 0, height: 3.3 }, ...extraLevels],
  placements: [{ level: 'G', ...p }],
});
const upper = [{ id: 'F', name: 'First', floor: 3.3, height: 3.3 }];
const withRoof = [...upper, { id: 'R', name: 'Roof', floor: 6.6, height: 3.3 }];

// ---------- sizes ----------
test('a clear size becomes a grid rect: clear plus the exterior wall, rounded up', () => {
  assert.deepEqual(rectSizeFor([9, 7], G, EXT), [9.5, 7.5]);
  assert.deepEqual(rectSizeFor([2.5, 2.2], G, EXT), [3, 3]);
  assert.deepEqual(rectSizeFor([3.5, 26], G, EXT), [4, 26.5]);
});

// ---------- module data ----------
test('modules.json: every prompt module is there and the data is well formed', () => {
  const need = ['lobby', 'visitor-wc', 'meeting-room', 'security-office', 'control-room', 'goods-lobby', 'office', 'noc', 'facilities-office', 'kitchenette', 'staff-wc', 'shower-lockers', 'janitor',
    'storage', 'build-room', 'loading-bay', 'comms-room', 'plant-corridor', 'mantrap', 'data-hall-bay', 'meet-me-room', 'customer-cage', 'ups-room', 'battery-room', 'switchroom',
    'cooling-gallery', 'carrier-vault', 'carrier-riser', 'main-stair', 'fire-stair', 'fire-stair-roof', 'riser-cupboard', 'gatehouse', 'generator-compound', 'bin-store'];
  for (const id of need) assert.ok(modules.has(id), `module ${id}`);
  const rings = [1, 2, 3, '3+', 4, 5];
  const ref = (v, where) => {
    if (typeof v === 'string' && v.startsWith('@')) assert.notEqual(facts.fact(v.slice(1)), undefined, `${where}: ${v} is not in facts.json`);
    else if (typeof v === 'string' && v.startsWith('size+')) ref(v.slice(5), where);
  };
  for (const m of modules.values()) {
    assert.ok(rings.includes(m.ring), `${m.id} ring`);
    assert.ok(m.zone && m.source && m.name && m.kind, `${m.id} zone, source, name, kind`);
    assert.ok(m.sizes.length > 0, `${m.id} sizes`);
    for (const s of m.sizes) for (const v of s) assert.ok(Math.abs(v / G - Math.round(v / G)) < 1e-9, `${m.id} size ${s} is on the ${G} m grid`);
    ref(m.ceiling, `${m.id} ceiling`);
    for (const d of m.doors ?? []) {
      assert.ok(['S', 'E', 'N', 'W'].includes(d.side), `${m.id} door ${d.key}`);
      assert.ok(d.reason, `${m.id} door ${d.key} reason`);
      ref(d.w, `${m.id} door ${d.key}`); ref(d.h, `${m.id} door ${d.key}`);
    }
    for (const o of m.objects ?? []) {
      assert.ok(o.reason && o.name, `${m.id} object ${o.name}`);
      ref(o.h, `${m.id} ${o.name}`); o.size.forEach((v) => ref(v, `${m.id} ${o.name}`));
      for (const r of o.repeat ?? []) { ref(r.pitch, `${m.id} ${o.name}`); ref(r.endGap, `${m.id} ${o.name}`); }
      ref(o.x[1], `${m.id} ${o.name}`); ref(o.z[1], `${m.id} ${o.name}`);
    }
    if (m.stair) ref(m.stair.width, `${m.id} stair`);
  }
});

test('modules.json: zone rooms ring and group, as the prompt lists them', () => {
  assert.equal(modules.get('lobby').ring, 2);
  assert.equal(modules.get('control-room').ring, '3+');
  assert.equal(modules.get('office').ring, 3);
  assert.equal(modules.get('data-hall-bay').ring, 4);
  assert.equal(modules.get('meet-me-room').ring, 5);
  assert.equal(modules.get('staff-wc').provides[0], 'staffWC');
  assert.equal(modules.get('janitor').provides[0], 'janitor');
});

// ---------- the 3-module sample ----------
test('the 3-module sample expands: three rooms, no errors', () => {
  const arch = ok(expand(sampleLayout()));
  assert.deepEqual(arch.rooms.map((r) => r.id), ['J1', 'T1', 'W1']);
  assert.deepEqual(byId(arch.rooms, 'W1').rect, [2, 2, 7.5, 6.5]);
  assert.deepEqual(byId(arch.rooms, 'J1').rect, [7.5, 2, 10, 4]);
  assert.deepEqual(byId(arch.rooms, 'T1').rect, [10, 2, 15.5, 6.5]);
  assert.equal(byId(arch.rooms, 'W1').module, 'staff-wc');
  assert.equal(byId(arch.rooms, 'W1').ring, 3);
  assert.equal(byId(arch.rooms, 'W1').name, 'Staff WC');
});

test('walls shared by two placements become one wall; collinear walls of one kind join into one', () => {
  const arch = ok(expand(sampleLayout()));
  // the south line z = 2 is the outside face of all three rooms: one exterior wall for the whole run
  const south = arch.walls.filter((w) => w.a[1] === 2 && w.b[1] === 2);
  assert.equal(south.length, 1);
  assert.deepEqual([south[0].a, south[0].b, south[0].kind, south[0].t], [[2, 2], [15.5, 2], 'exterior', EXT]);
  // the wall between the WC and the janitor is one interior wall, only as long as the shared run
  const shared = arch.walls.filter((w) => w.a[0] === 7.5 && w.b[0] === 7.5 && w.kind === 'interior');
  assert.equal(shared.length, 1);
  assert.deepEqual([shared[0].a, shared[0].b, shared[0].t], [[7.5, 2], [7.5, 4], facts.fact('rules.wallInterior')]);
  // the rest of the WC's east side faces the outside: a separate, thicker wall
  const rest = arch.walls.filter((w) => w.a[0] === 7.5 && w.b[0] === 7.5 && w.kind === 'exterior');
  assert.deepEqual(rest.map((w) => [w.a[1], w.b[1]]), [[4, 6.5]]);
  assert.equal(arch.walls.length, new Set(arch.walls.map((w) => w.id)).size);
  // the doors of the two southern rooms sit in the one long wall; the turned store's door is on its north wall
  assert.deepEqual(arch.openings.filter((o) => o.wall === south[0].id).map((o) => o.id).sort(), ['J1-Dmain', 'W1-Dmain']);
  assert.deepEqual(doorPoint(arch, 'T1', 'main'), [12.5, 6.5]);
  assert.deepEqual(byId(arch.openings, 'W1-Dmain').between, ['W1', '']);
});

test('check.mjs passes on the expanded 3-module sample', () => {
  const results = checks(ok(expand(sampleLayout())));
  assert.deepEqual(failing(results), []);
  assert.equal(results.find((r) => r.id === 'A30').status, 'PASS');
  assert.equal(results.find((r) => r.id === 'A28').status, 'PASS');
  assert.equal(results.find((r) => r.id === 'A29').status, 'PASS');
  assert.equal(results.find((r) => r.id === 'A06').status, 'PASS');
  assert.equal(results.find((r) => r.id === 'A07').status, 'PASS');
});

test('expanding twice gives the same file', () => {
  const first = ok(expand(sampleLayout()));
  const second = ok(expand(sampleLayout(), first));
  assert.equal(formatArch(second), formatArch(first));
});

// ---------- rotation ----------
/** World point of the door `key` of a placed module. */
function doorPoint(arch, id, key) {
  const o = byId(arch.openings, `${id}-D${key}`);
  const w = byId(arch.walls, o.wall);
  const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  const d = [(w.b[0] - w.a[0]) / L, (w.b[1] - w.a[1]) / L];
  return [w.a[0] + d[0] * o.at, w.a[1] + d[1] * o.at];
}

test('rotations turn the room, its door side and its door position', () => {
  // main-stair: clear 8 x 3.5 -> rect 8.5 x 4. Door "foot" is on local side S, 2.5 m from the west end.
  const cases = [
    { rot: 0, rect: [10, 10, 18.5, 14], door: [12.5, 10] },     // south edge, 2.5 from the west end
    { rot: 90, rect: [10, 10, 14, 18.5], door: [10, 16] },      // west edge, 2.5 from the north end
    { rot: 180, rect: [10, 10, 18.5, 14], door: [16, 14] },     // north edge, 2.5 from the east end
    { rot: 270, rect: [10, 10, 14, 18.5], door: [14, 12.5] },   // east edge, 2.5 from the south end
  ];
  for (const c of cases) {
    const arch = ok(expand(single({ id: 'S', module: 'main-stair', at: [10, 10], rot: c.rot }, upper)));
    assert.deepEqual(byId(arch.rooms, 'S').rect, c.rect, `rect at ${c.rot}`);
    assert.deepEqual(doorPoint(arch, 'S', 'foot'), c.door, `door at ${c.rot}`);
  }
});

test('a rotated stair climbs the right way and its rect follows the room', () => {
  const up = { 0: 'E', 90: 'S', 180: 'W', 270: 'N' };
  for (const rot of [0, 90, 180, 270]) {
    const arch = ok(expand(single({ id: 'S', module: 'main-stair', at: [10, 10], rot }, upper)));
    const s = arch.stairs[0];
    assert.equal(s.up, up[rot], `up at ${rot}`);
    const long = s.up === 'E' || s.up === 'W' ? s.rect[2] - s.rect[0] : s.rect[3] - s.rect[1];
    assert.ok(long >= 7.13, `stair run ${long} at ${rot}`);
    assert.equal(s.risers, 20);
    assert.equal(arch.voids[0].level, 'F');
    assert.deepEqual(arch.voids[0].rect, s.rect);
  }
});

test('fixed contents turn with the room: the lobby desk stays in its local corner', () => {
  // local desk: west and north. Turned a quarter clockwise, west becomes north and north becomes east: the north-east corner.
  const arch = ok(expand(single({ id: 'L', module: 'lobby', at: [10, 10], rot: 90 })));
  const room = byId(arch.rooms, 'L');
  const desk = arch.objects.find((o) => o.name === 'Reception desk');
  assert.ok(room.rect[3] - desk.rect[3] < 2 && room.rect[2] - desk.rect[2] < 2, 'desk against the north-east of the room');
  assert.ok(Math.abs(desk.rect[2] - desk.rect[0] - 1) < 1e-6 && Math.abs(desk.rect[3] - desk.rect[1] - 3) < 1e-6, 'desk 1 x 3 after the quarter turn');
  // and at rot 0 it is 3 x 1 in the north-west
  const a0 = ok(expand(single({ id: 'L', module: 'lobby', at: [10, 10], rot: 0 })));
  const d0 = a0.objects.find((o) => o.name === 'Reception desk');
  assert.ok(Math.abs(d0.rect[2] - d0.rect[0] - 3) < 1e-6 && d0.rect[0] - 10 < 1.5);
});

test('a ladder and a shaft void follow the rotation', () => {
  const lv = [{ id: 'B', name: 'Basement', floor: -3.3, height: 3.3 }];
  const mk = (rot) => {
    const layout = single({ id: 'R', module: 'carrier-riser', at: [10, 10], rot });
    layout.levels = [...lv, { id: 'G', name: 'Ground', floor: 0, height: 3.3 }];
    layout.placements[0].level = 'B';
    return ok(expand(layout));
  };
  const facing = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
  for (const rot of [0, 90, 180, 270]) {
    const arch = mk(rot);
    assert.equal(arch.ladders[0].facing, facing[rot]);
    assert.equal(arch.ladders[0].from, 'B');
    assert.equal(arch.ladders[0].to, 'G');
    assert.equal(arch.voids[0].level, 'G');
    assert.equal(arch.voids[0].kind, 'riser');
    const room = arch.rooms[0].rect;
    const [x, z] = arch.ladders[0].at;
    assert.ok(x > room[0] && x < room[2] && z > room[1] && z < room[3], 'ladder foot inside the shaft');
  }
});

// ---------- stacks ----------
test('a stair core makes a room per level, a stair and a stairwell void per storey', () => {
  const arch = ok(expand(single({ id: 'S1', module: 'main-stair', at: [10, 10] }, upper)));
  assert.deepEqual(arch.rooms.map((r) => `${r.id}@${r.level}`), ['S1@G', 'S1.F@F']);
  assert.equal(arch.stairs.length, 1);
  assert.equal(arch.stairs[0].from, 'G');
  assert.equal(arch.stairs[0].to, 'F');
  assert.equal(arch.stairs[0].kind, 'main');
  assert.equal(arch.stairs[0].width, facts.fact('stair.featureWidth'));
  assert.equal(arch.voids.length, 1);
});

test('the roof variant climbs to the roof with a bulkhead room at the top', () => {
  const arch = ok(expand(single({ id: 'FS', module: 'fire-stair-roof', at: [10, 10] }, withRoof)));
  assert.deepEqual(arch.rooms.map((r) => r.level), ['G', 'F', 'R']);
  assert.deepEqual(arch.stairs.map((s) => `${s.from}${s.to}`), ['GF', 'FR']);
  assert.equal(byId(arch.rooms, 'FS.R').ceiling, 2.4);
  assert.deepEqual(arch.voids.map((v) => v.level), ['F', 'R']);
  // the exit-only door is on the ground only
  assert.deepEqual(arch.openings.filter((o) => o.type === 'fire-door').map((o) => byId(arch.walls, o.wall).level), ['G']);
});

test('a plain fire stair stops at the next level', () => {
  const arch = ok(expand(single({ id: 'FS', module: 'fire-stair', at: [10, 10] }, withRoof)));
  assert.deepEqual(arch.rooms.map((r) => r.level), ['G', 'F']);
});

// ---------- contents ----------
test('data hall racks stand at the 0.6 m pitch in rows with 1.8 m aisles', () => {
  const arch = ok(expand(single({ id: 'H', module: 'data-hall-bay', size: [20, 14], at: [10, 10] })));
  const racks = arch.objects.filter((o) => o.name === 'Server rack');
  assert.ok(racks.length > 20, `${racks.length} racks`);
  assert.ok(racks.every((r) => r.noLedge === true && r.h >= 1.9), 'racks are noLedge');
  const rows = new Map();
  for (const r of racks) rows.set(r.rect[1], [...(rows.get(r.rect[1]) ?? []), r]);
  assert.ok(rows.size >= 2, 'at least two rows');
  for (const row of rows.values()) {
    row.sort((a, b) => a.rect[0] - b.rect[0]);
    for (let i = 1; i < row.length; i++) assert.ok(Math.abs(row[i].rect[0] - row[i - 1].rect[0] - facts.fact('rules.rackWidth')) < 1e-6, 'pitch is the rack width');
  }
  const ys = [...rows.keys()].sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] - 1.2 >= facts.fact('rules.aisleMin') - 1e-6, 'aisle between rows');
});

test('a tall object (top at the auto-lip height) is noLedge unless the module says otherwise', () => {
  const arch = ok(expand(single({ id: 'N', module: 'noc', at: [10, 10] })));
  assert.equal(arch.objects.find((o) => o.name === 'Monitoring cabinet').noLedge, true);
  assert.equal(arch.objects.find((o) => o.name === 'Operator console desk').noLedge, false);
});

// ---------- manual items and re-runs ----------
test('manual items survive; stale generated items go; hand items without a tag stay', () => {
  const first = ok(expand(sampleLayout()));
  const base = JSON.parse(JSON.stringify(first));
  base.walls.push({ id: 'MW1', level: 'G', a: [3, 7], b: [5, 7], t: 0.3, h: 3, kind: 'interior', manual: true });
  base.rooms.push({ id: 'MR1', level: 'G', name: 'Hand room', kind: 'room', rect: [20, 2, 22, 4], ceiling: 3, finish: 'x', minShort: 2, open: [], ring: 3, module: '', manual: true });
  base.objects.push({ id: 'MO1', level: 'G', name: 'Hand box', rect: [20.1, 2.1, 20.5, 2.5], h: 1, y: 0, noLedge: false, reason: 'test', manual: true, gen: 'W1' });
  base.openings.push({ id: 'MD1', wall: 'MW1', at: 1, w: 1.2, h: 2.1, sill: 0, type: 'door', between: ['W1', 'MR1'], locked: false, key: '', reason: 'hand door' });
  base.rooms.push({ id: 'OLD', level: 'G', name: 'Stale', kind: 'room', rect: [0, 0, 1, 1], ceiling: 3, finish: 'x', minShort: 1, open: [], ring: 3, module: 'office', gen: 'REMOVED' });
  const layout = sampleLayout();
  layout.placements = layout.placements.filter((p) => p.id !== 'J1'); // J1 is gone from the layout
  const out = ok(expand(layout, base));
  assert.deepEqual(byId(out.walls, 'MW1'), byId(base.walls, 'MW1'));
  assert.deepEqual(byId(out.rooms, 'MR1'), byId(base.rooms, 'MR1'));
  assert.deepEqual(byId(out.objects, 'MO1'), byId(base.objects, 'MO1'), 'a manual item with a gen tag is still kept');
  assert.deepEqual(byId(out.openings, 'MD1'), byId(base.openings, 'MD1'), 'an untagged hand item stays');
  assert.equal(byId(out.rooms, 'OLD'), undefined, 'a stale generated room is dropped');
  assert.equal(byId(out.rooms, 'J1'), undefined, 'a removed placement leaves no room');
  assert.equal(out.openings.filter((o) => o.id === 'J1-Dmain').length, 0);
});

test('a layout meta and levels set the arch meta; other tables are untouched', () => {
  const base = { meta: { id: 'x', grid: 0.5, objectGrid: 0.1, keep: 1 }, levels: [{ id: 'G', name: 'G', floor: 0, height: 3.3 }], exterior: [{ id: 'E1', kind: 'downpipe' }], services: [{ id: 'SV1' }] };
  const out = ok(expand({ placements: [{ id: 'B', module: 'bin-store', level: 'G', at: [2, 2] }] }, base));
  assert.equal(out.meta.keep, 1);
  assert.deepEqual(out.exterior, base.exterior);
  assert.deepEqual(out.services, base.services);
  const out2 = ok(expand({ meta: { id: 'y' }, placements: [] }, base));
  assert.equal(out2.meta.id, 'y');
  assert.equal(out2.meta.keep, 1);
});

// ---------- errors ----------
test('bad placements are reported, not guessed', () => {
  const err = (p, extra = []) => expand(single({ id: 'P', at: [10, 10], ...p }, extra)).errors.join(' | ');
  assert.match(err({ module: 'nope' }), /unknown module/);
  assert.match(err({ module: 'lobby', size: [9, 8] }), /not offered/);
  assert.match(err({ module: 'lobby', rot: 45 }), /rot 45/);
  assert.match(err({ module: 'lobby', at: [10.2, 10] }), /grid/);
  assert.match(err({ module: 'lobby', level: 'Z' }), /unknown level/);
  assert.match(err({ module: 'main-stair' }), /does not exist/);
  assert.match(err({ module: 'office', size: [3, 3] }), /not offered/);
  assert.equal(expand(single({ id: 'P', module: 'office', size: [10, 7], at: [10, 10] })).errors.length, 0, 'a free module takes any grid size above its minimum');
});

test('a door on an open edge, or a clash with another door, is a warning', () => {
  const layout = single({ id: 'A', module: 'office', at: [10, 10], open: ['S'] });
  const r = expand(layout);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => /A door main/.test(w)), r.warnings.join('|'));
  const two = single({ id: 'A', module: 'goods-lobby', at: [10, 10] });
  two.placements.push({ level: 'G', id: 'B', module: 'loading-bay', at: [8, 13.5] });
  const r2 = expand(two);
  assert.deepEqual(r2.errors, []);
  assert.ok(r2.warnings.some((w) => /overlaps/.test(w)) || r2.arch.openings.filter((o) => o.between.includes('A') && o.between.includes('B')).length >= 1);
});

test('placement doors replace the module doors, skipDoors drops one, and the outside list names exterior doors', () => {
  const r = expand(single({ id: 'L', module: 'lobby', at: [10, 10], skipDoors: ['staff'] }));
  assert.deepEqual(r.arch.openings.map((o) => o.id), ['L-Dentrance']);
  assert.equal(r.outside.length, 1);
  const r2 = expand(single({ id: 'L', module: 'lobby', at: [10, 10], doors: [{ key: 'east', side: 'E', at: 2, w: 1.2, h: 2.1, type: 'door', reason: 'test' }] }));
  assert.deepEqual(r2.arch.openings.map((o) => o.id), ['L-Deast']);
});

// ---------- every module alone ----------
const STRIP = { id: 'strip', name: 'Strip', kind: 'room', zone: 'S4', ring: 3, ceiling: '@room.ceiling', finish: 'linoleum', sizes: [[3.5, 3.5]], free: true, sizeMin: [0.5, 0.5], doors: [], objects: [] };

/** One module inside a frame of filler rooms, so every wall around it is interior and runs on past the room (as a corridor wall does). */
function harness(m, size, rot) {
  const [rw, rd] = rectSizeFor(size, G, EXT);
  const swap = rot === 90 || rot === 270;
  const W = swap ? rd : rw;
  const D = swap ? rw : rd;
  const T = 4;
  const strip = (id, x, z, w, d) => ({ id, module: 'strip', level: 'G', at: [x, z], size: [w - 0.5, d - 0.5], ring: m.ring });
  const mods = new Map(modules);
  mods.set('strip', { ...STRIP, ceiling: m.ceiling }); // same height as the room, so the walls between them do not split
  const span = m.stair ? (m.stair.span === 'roof' ? 2 : m.stair.span ?? 1) : 0;
  const levels = [{ id: 'G', name: 'Ground', floor: 0, height: 3.3 }];
  let baseLevel = 'G';
  if (m.ladder) { levels.unshift({ id: 'B', name: 'Basement', floor: -3.3, height: 3.3 }); baseLevel = 'B'; }
  const top = m.voidAbove && !m.ladder ? 1 : span;
  const fp = [T, T, T + W, T + D];
  if (top >= 1) levels.push({ id: 'F', name: 'First', floor: 3.3, height: 3.3, footprint: fp });
  if (top >= 2) levels.push({ id: 'R', name: 'Roof', floor: 6.6, height: 3.3, footprint: fp });
  const layout = {
    meta: { id: 'solo', version: 1, grid: G, objectGrid: 0.1, entry: [1, 1], bay: [6, 6], site: [0, 0, W + 2 * T, D + 2 * T], footprint: [0, 0, W + 2 * T, D + 2 * T] },
    levels,
    placements: [{ id: 'M', module: m.id, level: baseLevel, at: [T, T], rot, size }],
  };
  // a 3 x 3 grid: the room in the middle, eight filler rooms round it, so each of the room's four walls runs on past it, interior all the way
  const fillers = [['SW', 0, 0, T, T], ['SS', T, 0, W, T], ['SE', T + W, 0, T, T], ['WW', 0, T, T, D], ['EE', T + W, T, T, D], ['NW', 0, T + D, T, T], ['NN', T, T + D, W, T], ['NE', T + W, T + D, T, T]];
  for (const [id, x, z, w, d] of fillers) layout.placements.push({ ...strip(id, x, z, w, d), level: baseLevel });
  // a shaft that opens through the floor above needs a room up there for the opening to sit in
  if (m.voidAbove && !m.ladder) layout.placements.push({ ...strip('UP', T, T, W, D), level: 'F' });
  return { layout, mods };
}

test('every module, size and rotation expands alone and passes the checker (A30, which needs a whole building, aside)', () => {
  let runs = 0;
  const problems = [];
  for (const m of modules.values()) {
    const sizes = [...m.sizes];
    if (m.free) sizes.push(m.sizeMin ?? m.sizes[0]);
    for (const size of sizes) {
      for (const rot of [0, 90, 180, 270]) {
        const { layout, mods } = harness(m, size, rot);
        const r = expandLayout({ layout, base: null, modules: mods, facts });
        runs += 1;
        const tag = `${m.id} [${size}] rot ${rot}`;
        if (r.errors.length) { problems.push(`${tag}: ${r.errors.join('; ')}`); continue; }
        const results = checks(r.arch);
        for (const f of failing(results, ['A30'])) problems.push(`${tag}: ${f}`);
        for (const w of results.filter((x) => x.status === 'WARN' && x.id !== 'A10')) problems.push(`${tag}: WARN ${w.id}: ${w.details.join(' | ')}`);
        for (const w of r.warnings) problems.push(`${tag}: expand warning: ${w}`);
      }
    }
  }
  assert.ok(runs > 150, `${runs} runs`);
  assert.deepEqual(problems, []);
});

// ---------- command line ----------
test('the command line expands the sample and writes the arch file; --list prints the modules', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kestrel-expand-'));
  const out = path.join(dir, 'arch.json');
  const run = (...args) => spawnSync(process.execPath, [path.join(HERE, 'expand.mjs'), ...args], { encoding: 'utf8', timeout: 60000 });
  const r = run('--layout', SAMPLE, '--out', out);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const arch = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(arch.rooms.length, 3);
  assert.match(r.stdout, /expanded: 3 rooms/);
  const dry = run('--layout', SAMPLE, '--out', path.join(dir, 'never.json'), '--dry');
  assert.equal(dry.status, 0);
  assert.equal(fs.existsSync(path.join(dir, 'never.json')), false);
  const list = run('--layout', SAMPLE, '--list');
  assert.match(list.stdout, /lobby\s+ring 2/);
  assert.match(list.stdout, /9 x 7 -> rect 9.5 x 7.5/);
  const bad = path.join(dir, 'bad.layout.json');
  fs.writeFileSync(bad, JSON.stringify({ ...sampleLayout(), placements: [{ id: 'X', module: 'nope', level: 'G', at: [0, 0] }] }));
  const e = run('--layout', bad, '--out', path.join(dir, 'bad.json'));
  assert.equal(e.status, 1);
  assert.match(e.stdout, /ERROR placement X: unknown module/);
  fs.rmSync(dir, { recursive: true, force: true });
});
