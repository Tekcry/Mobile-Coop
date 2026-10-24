/** (joint-interrogation, G148) The co-op joint interrogation's pure rules, the A8 officer's joint data and the wire. */
import { describe, expect, it } from 'vitest';
import { GUARD_INFO_LINE_MAX, takeInfo, type HasInfo } from '../src/ai/guardInfo';
import { ENEMIES } from '../src/ai/enemyDefs';
import { PACE } from '../src/ai/response';
import { patrolPeriod, type GuardIntel } from '../src/game/intel';
import { bluffLive, checkJoint, hasJoint, JOINT, JOINT_BLUFF_FEED, jointBluffer, jointLines, jointOf, type Bluff } from '../src/game/jointInterrogation';
import { parseMessage } from '../src/net/protocol';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';
import { A8_JOINT_FLAG, A8_N2_FACES, A8_N2_ROUTE, A8_N2_WAITS, A8_OFFICER, A8_OFFICER_INFO } from '../src/world/maps/ctcourseSets/a8Strongroom';

const intel = (lines: string[], joint?: GuardIntel['joint']): GuardIntel => (joint ? { lines, joint } : { lines });

describe('joint interrogation: the bluff window and reach', () => {
  const b: Bluff = { eid: 'g1', t0: 10 };
  it('counts within the window, to its edge, not past it', () => {
    expect(bluffLive(b, 'g1', 10, 0)).toBe(true);
    expect(bluffLive(b, 'g1', 10 + JOINT.window, 1)).toBe(true);
    expect(bluffLive(b, 'g1', 10 + JOINT.window + 0.01, 1)).toBe(false);
    expect(bluffLive(b, 'g1', 9.9, 1)).toBe(false);
  });
  it('counts within reach, to its edge, not past it', () => {
    expect(JOINT.reach).toBe(3);
    expect(bluffLive(b, 'g1', 12, JOINT.reach)).toBe(true);
    expect(bluffLive(b, 'g1', 12, JOINT.reach + 0.01)).toBe(false);
    expect(bluffLive(b, 'g1', 12, Infinity)).toBe(false);
  });
  it('the wrong guard never counts', () => {
    expect(bluffLive(b, 'g2', 12, 1)).toBe(false);
  });
  it('the holder is never his own bluffer; another player is; stale entries go', () => {
    const near = (): number => 1;
    const own = new Map<string, Bluff>([['host', { eid: 'g1', t0: 10 }]]);
    expect(jointBluffer(own, 'g1', 'host', 11, near)).toBeNull();
    const both = new Map<string, Bluff>([['host', { eid: 'g1', t0: 10 }], ['c1', { eid: 'g1', t0: 10 }]]);
    expect(jointBluffer(both, 'g1', 'host', 11, near)).toBe('c1');
    expect(jointBluffer(both, 'g1', 'c1', 11, near)).toBe('host');
    // out of reach (or down: Infinity)
    expect(jointBluffer(both, 'g1', 'host', 11, () => Infinity)).toBeNull();
    // past the window: dropped, so the map stays small without per-step work
    const stale = new Map<string, Bluff>([['c1', { eid: 'g1', t0: 0 }], ['c2', { eid: 'g9', t0: 9 }]]);
    expect(jointBluffer(stale, 'g1', 'host', 10, near)).toBeNull();
    expect([...stale.keys()]).toEqual(['c2']);
  });
});

describe('joint interrogation: the information', () => {
  it('jointOf / hasJoint: none, set, spent (A1: a read spends the joint part too)', () => {
    expect(jointOf(null)).toBeNull();
    expect(jointOf(undefined)).toBeNull();
    expect(jointOf({ lines: ['a'] })).toBeNull();
    const v: HasInfo = { info: intel(['a'], { lines: ['j'], flag: 'f' }) };
    expect(jointOf(v.info)?.lines).toEqual(['j']);
    expect(hasJoint(v)).toBe(true);
    expect(hasJoint({ info: intel(['a'], { lines: [] }) })).toBe(false);
    expect(hasJoint({ info: intel(['a']) })).toBe(false);
    expect(hasJoint({})).toBe(false);
    expect(takeInfo(v)).toEqual(['a']);
    expect(hasJoint(v)).toBe(false);
  });
  it('jointLines caps each line at the radio length; none gives none', () => {
    expect(jointLines(null)).toEqual([]);
    const long = 'x'.repeat(GUARD_INFO_LINE_MAX + 30);
    const out = jointLines({ lines: [long, 'short'] });
    expect(out.map((l) => l.length)).toEqual([GUARD_INFO_LINE_MAX, 5]);
  });
  it('checkJoint: the A8 officer passes; empty lines, long lines, dashes and an empty flag are errors', () => {
    expect(checkJoint(A8_OFFICER_INFO.joint!)).toEqual([]);
    expect(checkJoint({ lines: [] }).length).toBe(1);
    expect(checkJoint({ lines: [''] }).length).toBe(1);
    expect(checkJoint({ lines: ['x'.repeat(GUARD_INFO_LINE_MAX + 1)] }).length).toBe(1);
    expect(checkJoint({ lines: ['a — b'] }).length).toBe(1);
    expect(checkJoint({ lines: ['a'], flag: '' }).length).toBe(1);
  });
  it('the bluff line fits the radio', () => {
    expect(JOINT_BLUFF_FEED.length).toBeLessThanOrEqual(GUARD_INFO_LINE_MAX);
  });
});

describe('joint interrogation: the A8 duty officer', () => {
  const part = buildCtcourse(new LevelBuilder()).parts[7]!;
  it('carries two joint lines and the a8-joint flag; his solo lines are unchanged', () => {
    const j = A8_OFFICER_INFO.joint!;
    expect(j.lines).toHaveLength(2);
    expect(j.flag).toBe(A8_JOINT_FLAG);
    expect(A8_JOINT_FLAG).toBe('a8-joint');
    expect(A8_OFFICER_INFO.lines).toHaveLength(2);
    expect(part.squads[A8_OFFICER]!.info).toBe(A8_OFFICER_INFO);
    for (const l of j.lines) expect(l.length, l).toBeLessThanOrEqual(GUARD_INFO_LINE_MAX);
  });
  it("the night-two line's numbers are his loop: the grille stop and patrolPeriod rounded", () => {
    const period = patrolPeriod({ points: A8_N2_ROUTE, waits: A8_N2_WAITS, faces: A8_N2_FACES }, ENEMIES.grunt.walkSpeed * PACE.patrol);
    expect(Math.round(period / 10) * 10).toBe(40);
    expect(Math.abs(period - 40)).toBeLessThan(1);
    expect(A8_N2_WAITS[2]).toBe(5);
    const line = A8_OFFICER_INFO.joint!.lines[1]!;
    expect(line).toMatch(/five seconds, every forty/);
  });
  it('the teach radio line plays on a8-split', () => {
    const r = part.bay.radio.find((x) => x.at === 'a8-split');
    expect(r?.text).toBe('The duty officer clams up with one of you. Two of you, he might say more.');
  });
});

describe('joint interrogation: the wire', () => {
  it("td kind 'bluff' round-trips the parser (no protocol edit)", () => {
    const msg = { t: 'td', target: 'e12', ph: 'start', lethal: false, kind: 'bluff' } as const;
    expect(parseMessage(JSON.parse(JSON.stringify(msg)))).toEqual(msg);
  });
});
