// Tests for check.mjs: the clean sample passes, and for every check that can FAIL or WARN
// a small change to the sample trips it. Run: node --test scripts/kestrel/check.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runChecks, summary } from './check.mjs';
import { loadFacts } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE = path.join(HERE, '..', '..', 'docs', 'kestrel', 'sample.arch.json');
const facts = loadFacts();

const sample = () => JSON.parse(fs.readFileSync(SAMPLE, 'utf8'));
const find = (list, id) => list.find((x) => x.id === id);
/** Run the checks on a sample changed by `mut`. */
function run(mut, extra = {}) {
  const arch = sample();
  mut?.(arch);
  return runChecks({ arch, facts, ...extra });
}
const status = (results, id) => results.find((r) => r.id === id)?.status;
const details = (results, id) => results.find((r) => r.id === id)?.details ?? [];
function trips(id, mut, want = 'FAIL', extra = {}) {
  const results = run(mut, extra);
  assert.equal(status(results, id), want, `${id}: expected ${want}, got ${status(results, id)}\n${details(results, id).join('\n')}`);
  return results;
}

const room = (id, level, rect, over = {}) => ({ id, level, name: id, kind: 'room', rect, ceiling: 3.0, finish: 'carpet tile', minShort: 3.0, open: [], ring: 2, module: '', ...over });
const object = (id, rect, over = {}) => ({ id, level: 'G', name: 'Test box', rect, h: 1.0, y: 0, noLedge: false, reason: 'test object', ...over });

// ---------- clean sample ----------
test('the clean sample has no FAIL and no WARN', () => {
  const results = run();
  const bad = results.filter((r) => r.status === 'FAIL' || r.status === 'WARN');
  assert.deepEqual(bad.map((r) => `${r.id}: ${r.details.join(' | ')}`), []);
  const n = summary(results);
  assert.equal(n.FAIL, 0);
  assert.ok(n.PASS >= 20);
});

test('every check in the table has a result line (A01-A30, SC01-SC06)', () => {
  const ids = run().map((r) => r.id);
  for (let i = 1; i <= 30; i++) assert.ok(ids.includes(`A${String(i).padStart(2, '0')}`), `A${i}`);
  for (let i = 1; i <= 6; i++) assert.ok(ids.includes(`SC0${i}`), `SC0${i}`);
});

// ---------- architecture checks ----------
test('A01 trips on a missing field, a duplicate id and a bad reference', () => {
  trips('A01', (a) => { delete a.rooms[0].kind; });
  trips('A01', (a) => { a.rooms[1].id = 'G01'; });
  trips('A01', (a) => { a.openings[0].wall = 'W999'; });
  trips('A01', (a) => { a.walls[0].b = [17, 5]; });
});

test('A02 trips on an off-grid coordinate', () => {
  trips('A02', (a) => { a.stairs[0].rect = [13, 3, 15.7, 11]; });
  trips('A02', (a) => { a.openings[0].at = 5.2; });
});

test('A03 trips on a reversed rect', () => {
  trips('A03', (a) => { a.rooms[0].rect = [11, 2, 2, 12]; });
});

test('A04 trips on overlapping rooms, not on touching rooms', () => {
  trips('A04', (a) => { a.rooms.push(room('G03', 'G', [5, 5, 8, 8])); });
  assert.equal(status(run(), 'A04'), 'PASS');
});

test('A05 trips on a short room and a narrow corridor', () => {
  trips('A05', (a) => { a.rooms[0].minShort = 10; });
  trips('A05', (a) => { a.rooms.push(room('G03', 'G', [17.5, 2, 19, 12], { kind: 'corridor', minShort: 1 })); });
});

test('A06 trips on an uncovered edge and passes when the edge is listed open', () => {
  trips('A06', (a) => { a.walls = a.walls.filter((w) => w.id !== 'W003'); });
  trips('A06', (a) => { find(a.walls, 'W003').a = [17, 8]; });
  const results = run((a) => {
    a.walls = a.walls.filter((w) => w.id !== 'W003');
    find(a.rooms, 'G01').open = ['N'];
    find(a.rooms, 'G02').open = ['N'];
  });
  assert.equal(status(results, 'A06'), 'PASS');
});

test('A07 trips on a door near a wall end, off the wall, and a bad door height', () => {
  trips('A07', (a) => { a.openings[0].at = 1.5; });
  trips('A07', (a) => { a.openings[0].at = 9.9; });
  trips('A07', (a) => { a.openings[0].h = 2.5; });
  trips('A07', (a) => { a.openings[0].h = 1.8; });
  assert.equal(status(run((a) => { a.openings[1].h = 3.5; }), 'A07'), 'PASS', 'window height is free');
});

/** A room east of the sample with one wall and one door 0.9 m from the wall end (near edge), to the outside. */
const cornerDoor = (rect, over = {}, doorOver = {}) => (a) => {
  a.rooms.push(room('G03', 'G', rect, { ...over }));
  a.walls.push({ id: 'W900', level: 'G', a: [rect[0], rect[1]], b: [rect[0], rect[3]], t: 0.3, h: 3, kind: 'interior' });
  a.openings.push({ id: 'D900', wall: 'W900', at: 1.5, w: 1.2, h: 2.1, sill: 0, type: 'door', between: ['G03', ''], locked: false, key: '', reason: 'test door', ...doorOver });
};
test('A07: the corner rule applies to corridors and play-space rooms, not to service or small rooms', () => {
  // a 3 x 3 room is under play-space size: the door only has to fit inside the wall
  assert.equal(status(run(cornerDoor([20, 2, 23, 5])), 'A07'), 'PASS');
  // a room at play-space size (7 x 7) is strict
  trips('A07', cornerDoor([20, 2, 27, 9]));
  // ... unless the brief marks it as a service room
  assert.equal(status(run(cornerDoor([20, 2, 27, 9], { service: true })), 'A07'), 'PASS');
  // a corridor is always strict, even a short one
  trips('A07', cornerDoor([20, 2, 23.5, 5], { kind: 'corridor' }));
  // an opening is strict when any room it joins is strict: a service room off the lobby
  trips('A07', cornerDoor([20, 2, 23, 5], { service: true }, { between: ['G03', 'G01'] }));
  assert.equal(status(run(cornerDoor([20, 2, 23, 5], { service: true }, { between: ['G03', 'G03'] })), 'A07'), 'PASS');
  // the door still has to fit inside the wall
  trips('A07', cornerDoor([20, 2, 23, 5], { service: true }, { at: 0.4 }));
  trips('A07', cornerDoor([20, 2, 23, 5], { service: true }, { at: 2.8 }));
  // and the height rule still holds
  trips('A07', cornerDoor([20, 2, 23, 5], { service: true }, { h: 2.5 }));
});

test('A08 trips on two doors too close on one wall', () => {
  trips('A08', (a) => { a.openings.push({ ...a.openings[0], id: 'D004', at: 6.0 }); });
  assert.equal(status(run((a) => { a.openings.push({ ...a.openings[0], id: 'D004', at: 8.5 }); }), 'A08'), 'PASS');
});

test('A09 trips on a door close to a stair end', () => {
  trips('A09', (a) => { a.openings.push({ id: 'D004', wall: 'W001', at: 11.5, w: 1.2, h: 2.1, sill: 0, type: 'door', between: ['G02', ''], locked: false, key: '', reason: 'test door' }); });
});

test('A10 warns on doors facing across a corridor with no offset', () => {
  trips('A10', (a) => {
    find(a.rooms, 'G02').kind = 'corridor';
    a.openings.push({ id: 'D004', wall: 'W002', at: 5.0, w: 1.2, h: 2.1, sill: 0, type: 'door', between: ['G02', ''], locked: false, key: '', reason: 'test door' });
  }, 'WARN');
  trips('A10', (a) => {
    find(a.rooms, 'G02').kind = 'corridor';
    a.openings.push({ id: 'D004', wall: 'W002', at: 9.0, w: 1.2, h: 2.1, sill: 0, type: 'door', between: ['G02', ''], locked: false, key: '', reason: 'test door' });
  }, 'PASS');
});

test('A11 trips on a wrong riser count, too many risers per flight, and a short rect', () => {
  trips('A11', (a) => { a.stairs[0].risers = 19; });
  trips('A11', (a) => { a.stairs[0].flights = 1; });
  trips('A11', (a) => { a.stairs[0].rect = [13, 3, 15.5, 6]; });
  trips('A11', (a) => { a.levels[1].floor = 3.0; });
});

test('A11 dog-leg: two flights side by side with a landing, sized by the scale sheet', () => {
  const dog = (over = {}) => (a) => { Object.assign(a.stairs[0], { layout: 'dogleg', width: 1.2, ...over }); };
  // 20 risers = two flights of 10: 9 goings of 0.285 plus a 2.0 landing = 4.57 m long, two flights of 1.2 = 2.4 m wide (rect 2.5 x 8)
  assert.equal(status(run(dog()), 'A11'), 'PASS');
  // a rect too short for flight and landing
  trips('A11', dog({ rect: [13, 3, 15.5, 7] }));
  assert.ok(details(run(dog({ rect: [13, 3, 15.5, 7] })), 'A11')[0].match(/need 4.5[67] m/));
  // too narrow for two flights
  trips('A11', dog({ width: 1.3 }));
  // a fire stair uses the 1.3 m landing: 2.57 + 1.3 = 3.87 m
  assert.equal(status(run(dog({ kind: 'fire', width: 1.2, rect: [13, 3, 15.5, 7] })), 'A11'), 'PASS');
  trips('A11', dog({ kind: 'fire', width: 1.2, rect: [13, 3, 15.5, 6.5] }));
  // more than 18 risers per flight: 38 risers is 19 per flight
  trips('A11', (a) => { dog({ risers: 38 })(a); a.levels[1].floor = 6.27; });
  // the riser count is still checked, and a stair with no layout is still a straight run
  trips('A11', dog({ risers: 19 }));
  trips('A11', (a) => { a.stairs[0].rect = [13, 3, 15.5, 7]; });
});

test('A12 trips on a ladder in an ordinary room', () => {
  const ladder = { id: 'L01', room: 'G01', at: [4, 4], from: 'G', to: 'F', facing: 'N', reason: 'test ladder' };
  trips('A12', (a) => { a.ladders.push(ladder); });
  assert.equal(status(run((a) => { find(a.rooms, 'G01').kind = 'plant'; a.ladders.push(ladder); }), 'A12'), 'PASS');
});

test('A13 trips on a ladder next to a stair that joins the same levels', () => {
  const ladder = { id: 'L01', room: 'G01', at: [10, 4], from: 'G', to: 'F', facing: 'N', reason: 'test ladder' };
  trips('A13', (a) => { find(a.rooms, 'G01').kind = 'plant'; a.ladders.push(ladder); });
  assert.equal(status(run((a) => { find(a.rooms, 'G01').kind = 'plant'; a.ladders.push({ ...ladder, to: 'R' }); a.levels.push({ id: 'R', name: 'Roof', floor: 6.6, height: 3.3 }); }), 'A13'), 'PASS');
});

test('A14 trips on an uncovered upper floor, a bad void kind and a void with no reason', () => {
  trips('A14', (a) => { a.rooms = a.rooms.filter((r) => r.id !== 'F02'); });
  trips('A14', (a) => { a.voids[0].kind = 'pit'; });
  trips('A14', (a) => { a.voids[0].reason = ''; });
});

test('A14 uses a level footprint when the level has one', () => {
  // F covered only over the south half, with its own footprint: pass. The same level with the full footprint: fail.
  const half = (a) => {
    find(a.levels, 'F').footprint = [2, 2, 17, 7];
    a.rooms = a.rooms.filter((r) => r.id !== 'F01' && r.id !== 'F02');
    a.rooms.push(room('F01', 'F', [2, 2, 11, 7], { ring: 3 }), room('F02', 'F', [11, 2, 17, 7], { ring: 3 }));
    a.voids[0].rect = [13, 3, 15.5, 6.5];
  };
  assert.equal(status(run(half), 'A14'), 'PASS');
  trips('A14', (a) => { half(a); delete find(a.levels, 'F').footprint; });
  trips('A21', (a) => { find(a.levels, 'F').footprint = [1, 2, 17, 7]; });
  trips('A02', (a) => { find(a.levels, 'F').footprint = [2, 2, 17, 7.2]; });
  trips('A03', (a) => { find(a.levels, 'F').footprint = [17, 2, 2, 7]; });
});

test('A15 trips on an object with no name, an exterior with no reason and a void with no kind', () => {
  trips('A15', (a) => { a.objects[0].name = ''; });
  trips('A15', (a) => { a.exterior[0].reason = ''; });
  trips('A15', (a) => { a.voids[0].kind = ''; });
});

test('A16 warns on a tall object that can be hung from', () => {
  trips('A16', (a) => { a.objects[0].h = 2.0; }, 'WARN');
  assert.equal(status(run((a) => { a.objects[0].h = 2.0; a.objects[0].noLedge = true; }), 'A16'), 'PASS');
});

test('A17 trips on an object in front of a door', () => {
  trips('A17', (a) => { a.objects.push(object('O010', [9.5, 6.5, 10.5, 7.5])); });
  assert.equal(status(run((a) => { a.objects.push(object('O010', [9.5, 3.5, 10.5, 4.5])); }), 'A17'), 'PASS');
});

test('A18 warns on a split-jump gap between two tall faces', () => {
  const pair = (gap) => (a) => {
    a.objects.push(object('O010', [4, 4, 5, 7], { h: 4, noLedge: true }), object('O011', [5 + gap, 4, 6 + gap, 7], { h: 4, noLedge: true }));
  };
  trips('A18', pair(1.5), 'WARN');
  assert.equal(status(run(pair(2.5)), 'A18'), 'PASS');
  assert.equal(status(run(pair(1.0)), 'A18'), 'PASS');
});

test('A19 lists lips by reach class', () => {
  const results = run((a) => { a.objects.push(object('O010', [4, 4, 5, 5], { h: 3.4, noLedge: true }), object('O011', [6, 4, 7, 5], { h: 4.2, noLedge: true }), object('O012', [8, 4, 9, 5], { h: 5.0, noLedge: true })); });
  assert.equal(status(results, 'A19'), 'INFO');
  const text = details(results, 'A19').join('\n');
  assert.match(text, /^hand \(2\).*O001/m);
  assert.match(text, /^wall jump \(1\).*O010/m);
  assert.match(text, /^co-op \(1\).*O011/m);
  assert.match(text, /^out of reach \(1\).*O012/m);
});

test('A20 trips on five stacked walkable surfaces', () => {
  trips('A20', (a) => {
    a.levels.push({ id: 'B', name: 'Basement', floor: -3.3, height: 3.3 }, { id: 'S', name: 'Second', floor: 6.6, height: 3.3 }, { id: 'R', name: 'Roof', floor: 9.9, height: 3.3 });
    for (const id of ['B', 'S', 'R']) a.rooms.push(room(`${id}01`, id, [2, 2, 11, 12]));
  });
});

test('A21 trips on an oversize site, an oversize footprint and a footprint outside the site', () => {
  trips('A21', (a) => { a.meta.site = [0, 0, 100, 14]; });
  trips('A21', (a) => { a.meta.footprint = [2, 2, 52, 12]; });
  trips('A21', (a) => { a.meta.footprint = [2, 2, 17, 15]; });
  trips('A21', (a) => { a.meta.footprint = [0, 0, 0, 0]; });
});

test('A22 trips on a wrong wall thickness', () => {
  trips('A22', (a) => { find(a.walls, 'W001').t = 0.4; });
  trips('A22', (a) => { find(a.walls, 'W005').t = 0.45; });
});

test('A23 trips when one exterior kind mixes climbable values', () => {
  trips('A23', (a) => { a.exterior.push({ id: 'E002', kind: 'downpipe', a: [2.5, 12], b: [2.5, 12], y0: 0, y1: 6.6, climbable: false, reason: 'test pipe' }); });
});

test('A24 trips when an id is missing from the register and passes with a full register', () => {
  const arch = sample();
  const ids = ['levels', 'rooms', 'walls', 'openings', 'stairs', 'ladders', 'voids', 'objects', 'exterior', 'services'].flatMap((k) => (arch[k] ?? []).map((e) => e.id));
  const table = (list) => `| Id | Name |\n| --- | --- |\n${list.map((id) => `| ${id} | x |`).join('\n')}\n`;
  assert.equal(status(runChecks({ arch, facts, registerText: table(ids) }), 'A24'), 'PASS');
  const results = runChecks({ arch, facts, registerText: table(ids.filter((id) => id !== 'G02')) });
  assert.equal(status(results, 'A24'), 'FAIL');
  assert.match(details(results, 'A24').join(), /G02/);
  assert.equal(status(runChecks({ arch, facts }), 'A24'), 'SKIP');
});

test('A25 trips on an object edge off the object grid', () => {
  trips('A25', (a) => { a.objects[0].rect = [3.55, 9, 6.5, 10]; });
});

test('A26 trips on a gap that is neither an aisle nor closed', () => {
  // The pair sits in the middle of G01, at least 1.8 m from every wall, so only the pair's own gap is tested.
  const pair = (gap) => (a) => { a.objects.push(object('O010', [4.5, 4.1, 5.5, 7], { h: 2, noLedge: true }), object('O011', [5.5 + gap, 4.1, 6.5 + gap, 7], { h: 2, noLedge: true })); };
  trips('A26', pair(1.0));
  assert.equal(status(run(pair(0.2)), 'A26'), 'PASS');
  assert.equal(status(run(pair(1.8)), 'A26'), 'PASS');
  assert.equal(status(run(pair(2.5)), 'A26'), 'PASS');
  trips('A26', (a) => { a.objects.push(object('O010', [4, 9.6, 5, 11], { h: 2, noLedge: true })); });
});

test('A27 warns on a rack row that can be a lip, unless the play file plans a traversal', () => {
  const add = (a) => a.objects.push(object('O010', [4, 4, 4.6, 7], { name: 'Server rack row', h: 1.0 }));
  trips('A27', add, 'WARN');
  const play = { traversal: [{ id: 'T1', kind: 'mantle', element: 'O010' }] };
  assert.equal(status(run(add, { play }), 'A27'), 'PASS');
});

// ---------- module kit checks (A28-A30) and two Part B fixes found while building the kit ----------
test('A06 ignores a collinear wall that only lies beside the edge', () => {
  const beside = (a) => { a.walls.push({ id: 'W901', level: 'G', a: [17.5, 2], b: [19, 2], t: 0.45, h: 3, kind: 'exterior' }); };
  assert.equal(status(run(beside), 'A06'), 'PASS');
  trips('A06', (a) => { beside(a); a.walls = a.walls.filter((w) => w.id !== 'W005'); });
});

test('A26 does not count a gap with a tall object or wall standing across it (a row of racks at 0.6 m pitch)', () => {
  const rack = (id, x0) => object(id, [x0, 5, x0 + 0.6, 6.2], { name: 'Test rack', h: 2, noLedge: true });
  assert.equal(status(run((a) => { for (let i = 0; i < 4; i++) a.objects.push(rack(`O01${i}`, 5 + i * 0.6)); }), 'A26'), 'PASS');
  // a rack 0.8 m from the west wall is a bad gap on its own, and fine with a second rack between it and the wall
  trips('A26', (a) => { a.objects.push(rack('O010', 3.0)); });
  assert.equal(status(run((a) => { a.objects.push(rack('O010', 3.0), rack('O011', 2.4)); }), 'A26'), 'PASS');
  // a blocker that covers only part of the gap leaves a lane: still a bad gap
  trips('A26', (a) => { a.objects.push(rack('O010', 3.0), object('O011', [2.4, 5, 3.0, 5.5], { name: 'Half rack', h: 2, noLedge: true })); });
});

test('A28 trips on a missing or unknown ring', () => {
  assert.equal(status(run(), 'A28'), 'PASS');
  trips('A28', (a) => { delete a.rooms[0].ring; });
  trips('A28', (a) => { a.rooms[0].ring = 6; });
  trips('A28', (a) => { a.rooms[0].ring = '3'; });
  assert.equal(status(run((a) => { a.rooms[0].ring = '3+'; }), 'A28'), 'PASS');
});

test('A29 steps are 1-2-3-4-5; 3+ is a side room of 3 only', () => {
  const rings = (r1, r2, mut) => (a) => { find(a.rooms, 'G01').ring = r1; find(a.rooms, 'G02').ring = r2; mut?.(a); };
  assert.equal(status(run(), 'A29'), 'PASS');
  for (const [r1, r2] of [[1, 3], [2, 4], [5, 3], [1, 5], [2, '3+'], ['3+', 2], ['3+', 4], [4, '3+'], ['3+', 5]]) trips('A29', rings(r1, r2));
  for (const [r1, r2] of [[1, 2], [2, 3], [3, 4], [4, 3], [4, 5], [4, 4], [3, '3+'], ['3+', 3], ['3+', '3+']]) assert.equal(status(run(rings(r1, r2)), 'A29'), 'PASS', `${r1} to ${r2}`);
  // exemptions: an exit-only fire door, the carriers' entrance (module flag or the opening's ringExempt), and a window
  assert.equal(status(run(rings(2, 5, (a) => { find(a.openings, 'D001').type = 'fire-door'; })), 'A29'), 'PASS');
  assert.equal(status(run(rings(2, 5, (a) => { find(a.rooms, 'G02').module = 'vault'; }), { modules: { vault: { carrier: true } } }), 'A29'), 'PASS');
  assert.equal(status(run(rings(2, 5, (a) => { find(a.openings, 'D001').ringExempt = 'carriers entrance'; })), 'A29'), 'PASS');
  assert.equal(status(run(rings(2, 5, (a) => { find(a.openings, 'D001').type = 'window'; })), 'A29'), 'PASS');
});

/** The sample as a kit building: rooms carry modules, and every floor has a staff WC and a janitor cupboard (kept outside the footprint, kind shaft so only the stair rules look at them). */
const kit = (a) => {
  find(a.rooms, 'G01').module = 'lobby'; find(a.rooms, 'G02').module = 'main-stair'; find(a.rooms, 'F01').module = 'office'; find(a.rooms, 'F02').module = 'main-stair';
  for (const L of ['G', 'F']) a.rooms.push(room(`${L}90`, L, [20, 2, 22, 4], { kind: 'shaft', name: 'Staff WC', module: 'staff-wc', ring: 3 }), room(`${L}91`, L, [20, 4, 22, 6], { kind: 'shaft', name: 'Janitor', module: 'janitor', ring: 3 }));
};
const fireStair = (id, from, to, rect) => ({ id, kind: 'fire', from, to, rect, up: 'N', width: 1, risers: 20 });
const exitDoor = { id: 'D090', wall: 'W002', at: 5, w: 1.2, h: 2.1, sill: 0, type: 'fire-door', between: ['G02', ''], locked: false, key: '', reason: 'Exit-only discharge from the stair.' };
const factsWith = (over) => ({ ...facts, fact: (p) => (p in over ? over[p] : facts.fact(p)) });
const a30 = (mut, extra) => details(run((a) => { kit(a); mut?.(a); }, extra), 'A30');

test('A30 skips a plan that uses no module', () => {
  assert.equal(status(run(), 'A30'), 'SKIP');
});

test('A30: an occupied floor needs a staff WC and a janitor cupboard', () => {
  const lines = a30((a) => { a.rooms = a.rooms.filter((r) => !['G90', 'F91'].includes(r.id)); });
  assert.ok(lines.some((l) => /level G: occupied floor has no staff WC/.test(l)), lines.join('|'));
  assert.ok(lines.some((l) => /level F: occupied floor has no janitor/.test(l)), lines.join('|'));
  assert.ok(!lines.some((l) => /level G: occupied floor has no janitor|level F: occupied floor has no staff WC/.test(l)));
  // a manual room with no module is found by its name
  const named = a30((a) => { a.rooms = a.rooms.filter((r) => r.id !== 'G90'); a.rooms.push(room('G92', 'G', [22, 2, 24, 4], { kind: 'shaft', name: 'Staff toilets', ring: 3 })); });
  assert.ok(!named.some((l) => /level G: occupied floor has no staff WC/.test(l)), named.join('|'));
});

test('A30: an upper occupied level needs an enclosed fire stair with an outside exit', () => {
  const lines = a30();
  assert.ok(lines.some((l) => /level F: no enclosed fire stair/.test(l)), lines.join('|'));
  const ok1 = (a) => { a.stairs.push(fireStair('S02', 'G', 'F', [15.5, 3, 16.5, 11])); a.openings.push(structuredClone(exitDoor)); };
  assert.deepEqual(a30(ok1), []);
  const noExit = a30((a) => { ok1(a); a.openings = a.openings.filter((o) => o.id !== 'D090'); });
  assert.ok(noExit.some((l) => /fire stair S02 has no exit/.test(l)), noExit.join('|'));
  // an exit door that is not to the outside does not count
  const inside = a30((a) => { ok1(a); find(a.openings, 'D090').between = ['G01', 'G02']; });
  assert.ok(inside.some((l) => /fire stair S02 has no exit/.test(l)));
});

test('A30: travel to the nearest fire stair stays inside the escape distance (45 m with two stairs, 18 m with one)', () => {
  const one = (a) => { a.stairs.push(fireStair('S02', 'G', 'F', [15.5, 3, 16.5, 11])); a.openings.push(structuredClone(exitDoor)); };
  const two = (a) => { one(a); a.stairs.push(fireStair('S03', 'G', 'F', [12, 3, 13, 11])); };
  // F01 is 7.5 m from the stair room
  assert.deepEqual(a30(one), []);
  assert.ok(a30(one, { facts: factsWith({ 'escape.oneWay': 5 }) }).some((l) => /F01 \(F\): 7\.5 m to the nearest fire stair, limit 5 m \(one direction\)/.test(l)));
  assert.deepEqual(a30(two, { facts: factsWith({ 'escape.oneWay': 5 }) }), []);
  assert.ok(a30(two, { facts: factsWith({ 'escape.twoWay': 5 }) }).some((l) => /limit 5 m \(two directions\)/.test(l)));
  const lost = a30((a) => { one(a); a.rooms.push(room('F95', 'F', [30, 2, 34, 6], { ring: 3 })); });
  assert.ok(lost.some((l) => /F95 \(F\): no door route to a fire stair/.test(l)), lost.join('|'));
});

test('A30: at least one fire stair reaches the roof, when the plan has a roof level', () => {
  const roof = (a) => {
    a.levels.push({ id: 'R', name: 'Roof', floor: 6.6, height: 3.3 });
    a.stairs.push(fireStair('S02', 'G', 'F', [15.5, 3, 16.5, 11])); a.openings.push(structuredClone(exitDoor));
  };
  assert.ok(a30(roof).some((l) => /no enclosed fire stair reaches the roof/.test(l)));
  assert.deepEqual(a30((a) => { roof(a); a.stairs.push(fireStair('S04', 'F', 'R', [15.5, 3, 16.5, 11])); }), []);
  // a roof stair that does not continue the fire stair below it does not count
  assert.ok(a30((a) => { roof(a); a.stairs.push(fireStair('S04', 'F', 'R', [12, 3, 13, 5])); }).some((l) => /roof/.test(l)));
});

// ---------- security checks ----------
const security = () => ({
  devices: [
    { id: 'cam-1', kind: 'camera', level: 'G', at: [3, 3], y: 3.0, facing: 0, sweep: [315, 45], room: 'G01', reason: 'covers the lobby door' },
    { id: 'rd-1', kind: 'reader', level: 'G', at: [10.5, 6], y: 1.1, facing: 90, room: 'G01', door: 'D001', reason: 'stair core door' },
    { id: 'beam-1', kind: 'beam', level: 'G', a: [5, 1.4, 4], b: [5, 1.4, 8], room: 'G01', reason: 'lobby trap' },
  ],
  zones: [{ id: 'core', rooms: ['G02'], secure: false }],
  cards: [{ id: 'card-1', opens: ['rd-1'], heldBy: 'g-s2-manager' }],
});
const ringed = (a) => { find(a.rooms, 'G02').ring = 3; };
function secTrips(id, mutSec, mutArch, want = 'FAIL') {
  const sec = security();
  mutSec?.(sec);
  const results = run((a) => { ringed(a); mutArch?.(a); }, { security: sec });
  assert.equal(status(results, id), want, `${id}: expected ${want}\n${details(results, id).join('\n')}`);
}

test('the clean sample with a clean security file has no FAIL', () => {
  const results = run(ringed, { security: security() });
  assert.deepEqual(results.filter((r) => r.status === 'FAIL').map((r) => `${r.id}: ${r.details.join(' | ')}`), []);
  for (let i = 1; i <= 6; i++) assert.equal(status(results, `SC0${i}`), 'PASS');
});

test('SC checks skip without a security file', () => {
  assert.equal(status(run(), 'SC01'), 'SKIP');
});

test('SC01 trips on an unknown room, opening, device or zone room', () => {
  secTrips('SC01', (s) => { s.devices[0].room = 'nowhere'; });
  secTrips('SC01', (s) => { s.devices[1].door = 'D999'; });
  secTrips('SC01', (s) => { s.devices.push({ id: 'desk', kind: 'desk', level: 'G', at: [3, 3], y: 0, room: 'G01', feeds: ['cam-9'], reason: 'operator post' }); });
  secTrips('SC01', (s) => { s.zones[0].rooms = ['G99']; });
  secTrips('SC01', (s) => { s.devices[0].level = 'Z'; });
});

test('SC02 trips on a door into a higher zone with no reader, and passes for an exit-only fire door', () => {
  secTrips('SC02', (s) => { s.devices = s.devices.filter((d) => d.id !== 'rd-1'); s.cards = []; });
  secTrips('SC02', (s) => { s.devices = s.devices.filter((d) => d.id !== 'rd-1'); s.cards = []; }, (a) => { find(a.openings, 'D001').type = 'fire-door'; }, 'PASS');
});

test('SC03 trips on a camera mounted out of range and on too many devices', () => {
  secTrips('SC03', (s) => { s.devices[0].y = 5; });
  secTrips('SC03', (s) => { s.devices[0].y = 1; });
  secTrips('SC03', (s) => { for (let i = 0; i < facts.fact('security.maxCameras'); i++) s.devices.push({ ...s.devices[0], id: `cam-x${i}` }); });
});

test('SC04 trips on a beam at a height outside the allowed bands', () => {
  secTrips('SC04', (s) => { s.devices[2].a[1] = 0.9; });
  secTrips('SC04', (s) => { s.devices[2].b[1] = 2; });
  secTrips('SC04', (s) => { s.devices[2].a[1] = 0.4; s.devices[2].b[1] = 0.4; }, undefined, 'PASS');
});

test('SC05 trips on a device with no reason', () => {
  secTrips('SC05', (s) => { s.devices[0].reason = ''; });
});

test('SC06 trips on a card that opens a missing or non-reader device', () => {
  secTrips('SC06', (s) => { s.cards[0].opens = ['rd-nope']; });
  secTrips('SC06', (s) => { s.cards[0].opens = ['cam-1']; });
  secTrips('SC06', (s) => { s.cards[0].opens = []; });
});

// ---------- command line ----------
test('the command line exits 0 on the clean sample and 1 on a broken one', () => {
  const script = path.join(HERE, 'check.mjs');
  const ok = spawnSync(process.execPath, [script, SAMPLE], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /\d+ PASS, 0 WARN, 0 FAIL/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kestrel-check-'));
  try {
    const broken = sample();
    broken.rooms[0].rect = [11, 2, 2, 12];
    const file = path.join(dir, 'broken.arch.json');
    fs.writeFileSync(file, JSON.stringify(broken));
    const bad = spawnSync(process.execPath, [script, file], { encoding: 'utf8' });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /^FAIL A03/m);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a missing fact prints SKIP, not PASS', () => {
  const noFacts = { fact: () => undefined, src: () => undefined, need: () => { throw new Error('no'); } };
  const results = runChecks({ arch: sample(), facts: noFacts });
  assert.equal(status(results, 'A07'), 'SKIP');
  assert.match(details(results, 'A07').join(), /no fact/);
});
