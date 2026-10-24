import { describe, expect, it } from 'vitest';
import { GUARD_INFO_NEAR, hasInfo, infoAtSpawn, takeInfo, type GuardInfo } from '../src/ai/guardInfo';
import { addGrabRows } from '../src/game/grabMenu';
import { ContextMenu } from '../src/game/contextMenu';

// (CT prototype PR 3, Michael 2026-10-20 08:40: "Add one in Marlow Yard") one training guard with information, so a held
// guard can show INTERROGATE (08:10: "once they are grabbed it can show interrogate (if they have information)").
const rows = (v: { info?: GuardInfo | null }): string[] => {
  const m = new ContextMenu();
  m.begin();
  addGrabRows(m, hasInfo(v));
  m.end();
  const out: string[] = [];
  for (let i = 0; i < m.count; i++) out.push(`${m.opts[i]!.kind}:${m.opts[i]!.opt}`);
  return out;
};

describe('guard information (PR 3)', () => {
  const info: GuardInfo = { lines: ['One.', 'Two.'] };

  it('a guard with information lists INTERROGATE; spent, or without, no menu', () => {
    const g: { info?: GuardInfo | null } = { info };
    expect(hasInfo(g)).toBe(true);
    expect(rows(g)).toEqual(['grab:interrogate']);
    expect(takeInfo(g)).toEqual(['One.', 'Two.']);
    expect(hasInfo(g)).toBe(false);
    expect(rows(g)).toEqual([]);
    // interrogated once, never again
    expect(takeInfo(g)).toBeNull();
    expect(rows({})).toEqual([]);
    expect(rows({ info: null })).toEqual([]);
    expect(rows({ info: { lines: [] } })).toEqual([]);
  });

  it('a co-op puppet finds the slot it appeared at (no wire data), and only within reach of it', () => {
    const slots = { a: { x: 10, z: 3 }, b: { x: 10.5, z: 3.2, info } };
    expect(infoAtSpawn(slots, 10.6, 3.3)).toBe(info);
    expect(infoAtSpawn(slots, 10.5 + GUARD_INFO_NEAR + 0.1, 3.2)).toBeNull();
    expect(infoAtSpawn(undefined, 10.5, 3.2)).toBeNull();
    expect(infoAtSpawn({}, 10.5, 3.2)).toBeNull();
  });
});

// (marlow-final 0d) The Marlow Yard cases (the bay-1 training guard: passive, information, inside the first set, lines
// within the radio) moved to the whole-map frame (tests/ctcourse.test.ts); the A1, A4 and A8 guard-information cases
// return with their set slices (tests/ctcourse/<set>.test.ts, SPEC 16).
