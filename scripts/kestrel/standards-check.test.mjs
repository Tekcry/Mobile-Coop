// Cases for standards-check.mjs fixes (Michael, 2026-10-11): crawl on level U, stair kinds, vertical test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standardsCheck } from './standards-check.mjs';

const U = (h) => ({
  levels: [{ id: 'U', height: h }],
  rooms: [{ id: 'U-1', level: 'U', kind: 'zone', rect: [0, 0, 10, 10], ceiling: 0 }],
});
const stairs = (kind, width) => ({
  levels: [{ id: 'G', floor: 0, height: 4.2 }, { id: 'F', floor: 4.2, height: 4.2 }],
  rooms: [{ id: 'G-1', level: 'G', kind: 'zone', rect: [0, 0, 10, 10] }],
  stairs: [{ id: 'S1', kind, width, from: 'G', to: 'F', rect: [1, 1, 5, 5] }],
  voids: [{ id: 'VF1', level: 'F', kind: 'stairwell', rect: [1, 1, 5, 5] }], // VT1 needs the well
});

test('U at 1.6 passes (clear 1.5)', () => assert.equal(standardsCheck(U(1.6)).fails.length, 0));
test('U at 1.55 fails (clear 1.45)', () => assert.equal(standardsCheck(U(1.55)).fails.length, 1));
test('feature stair 2.0 fails', () => assert.equal(standardsCheck(stairs('feature', 2.0)).fails.length, 1));
test('feature stair 2.4 passes', () => assert.equal(standardsCheck(stairs('feature', 2.4)).fails.length, 0));
test('bulkhead stair: 1 info, 0 fails', () => {
  const r = standardsCheck(stairs('bulkhead', 1.0));
  assert.equal(r.info.length, 1);
  assert.equal(r.fails.length, 0);
});
const vert = { levels: [{ id: 'G', floor: 0, height: 4.2, footprint: [[0, 0, 10, 10]] }, { id: 'F', floor: 4.2, height: 4.2, footprint: [[0, 0, 10, 10]] }],
  rooms: [{ id: 'G-1', level: 'G', kind: 'zone', rect: [0, 0, 10, 10] }], meta: { buildings: [{ id: 'A', footprint: [0, 0, 10, 10] }] } };
test('stair with no stairwell void: 1 fail (VT1)', () => {
  const r = standardsCheck({ ...vert, stairs: [{ id: 'S1', kind: 'main', width: 1.85, from: 'G', to: 'F', rect: [1, 1, 5, 5] }] });
  assert.equal(r.fails.length, 1);
});
test('void over nothing: 1 fail (VT2)', () => {
  const r = standardsCheck({ ...vert, voids: [{ id: 'V1', level: 'G', kind: 'hatch', rect: [1, 1, 2, 2] }] });
  assert.equal(r.fails.length, 1);
});
test('service ending on a building edge inside an upper level band: 1 info (VT5)', () => {
  const r = standardsCheck({ ...vert, services: [{ id: 'SV', kind: 'water', path: [[10, 5.75, 5], [20, 5.75, 5]], size: [1, 1.5] }] });
  assert.equal(r.info.length, 1);
  assert.equal(r.fails.length, 0);
});
