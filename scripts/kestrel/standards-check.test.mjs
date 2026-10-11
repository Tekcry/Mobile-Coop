// Cases for standards-check.mjs fixes (Michael, 2026-10-11): crawl on level U, stair kinds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { standardsCheck } from './standards-check.mjs';

const U = (h) => ({
  levels: [{ id: 'U', height: h }],
  rooms: [{ id: 'U-1', level: 'U', kind: 'zone', rect: [0, 0, 10, 10], ceiling: 0 }],
});
const stairs = (kind, width) => ({
  levels: [{ id: 'G', height: 4.2 }, { id: 'F', height: 4.2 }],
  rooms: [],
  stairs: [{ id: 'S1', kind, width, from: 'G', to: 'F' }],
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
