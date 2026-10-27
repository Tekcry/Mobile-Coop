import { describe, expect, it } from 'vitest';
import { checkTeamRequest, HANG_SUB, inOpenMove, ROPE_SUB, THROW_SUB, type BuiltinTeamKind, type TeamDenial, type TeamRequest, type TeamSide } from '../src/game/teamMoves';
import { TEAM } from '../src/config/movement';
import { ATTACH_SUB } from '../src/player/moveState';

const side = (o: Partial<TeamSide> = {}): TeamSide => ({ id: 'a', x: 0, y: 0, z: 0, mode: 'ground', alive: true, ...o });
const base = { target: -1, targetUp: 0, sinceLast: 5 };

/** One valid (allowed) request per built-in team-move kind (the kit kinds pull / shutter check through their own registered rules), built from the same shapes as `tests/teamMoves.test.ts`. */
const valid: Record<BuiltinTeamKind, TeamRequest> = {
  boost: { ...base, kind: 'boost', a: side({ id: 'a', z: 0.9 }), b: side({ id: 'b', mode: 'brace' }), target: 4, targetUp: 4.2 },
  ladder: { ...base, kind: 'ladder', a: side({ id: 'a', z: 0.5 }), b: side({ id: 'b', y: 2.5, mode: 'ledge', anchor: 7, s: 3, sub: ATTACH_SUB.relay | 1 }), target: 7 },
  throw: { ...base, kind: 'throw', a: side({ id: 'a', x: -1.2 }), b: side({ id: 'b', mode: 'brace', sub: THROW_SUB }), land: { x: TEAM.throwDist, y: 0, z: 0 } },
  hang: { ...base, kind: 'hang', a: side({ id: 'a', y: 4.4, z: 1.2 }), b: side({ id: 'b', y: 4.4, mode: 'brace', sub: HANG_SUB }), land: { x: 0, y: 4.4, z: -1 } },
  rope: { ...base, kind: 'rope', a: side({ id: 'a', y: 0, x: -1.2 }), b: side({ id: 'b', y: 4.4, mode: 'brace', sub: ROPE_SUB }), land: { x: -0.55, y: 4.4, z: 0 } },
};

/** Every existing denial reached by tweaking a valid request (kind, tweak, expected result without `bBusy`). */
const cases: Array<[string, BuiltinTeamKind, (r: TeamRequest) => TeamRequest, TeamDenial | null]> = [];
for (const kind of Object.keys(valid) as BuiltinTeamKind[]) {
  cases.push([`${kind} allowed`, kind, (r) => r, null]);
  cases.push([`${kind} rate`, kind, (r) => ({ ...r, sinceLast: 0.1 }), 'rate']);
  cases.push([`${kind} dead partner`, kind, (r) => ({ ...r, b: { ...r.b, alive: false } }), 'dead']);
  cases.push([`${kind} dead requester`, kind, (r) => ({ ...r, a: { ...r.a, alive: false } }), 'dead']);
  cases.push([`${kind} self`, kind, (r) => ({ ...r, b: { ...r.b, id: r.a.id } }), 'notMates']);
  cases.push([`${kind} requester busy`, kind, (r) => ({ ...r, a: { ...r.a, mode: 'wall' } }), 'busy']);
}
cases.push(['boost partner not braced', 'boost', (r) => ({ ...r, b: { ...r.b, mode: 'ground' } }), 'notBraced']);
cases.push(['boost far', 'boost', (r) => ({ ...r, a: { ...r.a, z: TEAM.partnerReach + 0.3 } }), 'far']);
cases.push(['boost no target', 'boost', (r) => ({ ...r, target: -1 }), 'noTarget']);
cases.push(['boost too high', 'boost', (r) => ({ ...r, targetUp: TEAM.boostMax + 0.2 }), 'tooHigh']);
cases.push(['ladder not offering', 'ladder', (r) => ({ ...r, b: { ...r.b, sub: 1 } }), 'notOffering']);
cases.push(['ladder far', 'ladder', (r) => ({ ...r, a: { ...r.a, z: TEAM.relayReach + 0.4 } }), 'far']);
cases.push(['ladder no ledge', 'ladder', (r) => ({ ...r, b: { ...r.b, anchor: -1 } }), 'noTarget']);
cases.push(['throw not offering', 'throw', (r) => ({ ...r, b: { ...r.b, sub: 0 } }), 'notOffering']);
cases.push(['throw far', 'throw', (r) => ({ ...r, a: { ...r.a, x: -(TEAM.throwReach + 0.2) } }), 'far']);
cases.push(['throw no landing', 'throw', (r) => ({ ...r, land: undefined }), 'noTarget']);
cases.push(['hang not offering', 'hang', (r) => ({ ...r, b: { ...r.b, sub: 0 } }), 'notOffering']);
cases.push(['hang far', 'hang', (r) => ({ ...r, a: { ...r.a, z: TEAM.hangReach + 0.4 } }), 'far']);
cases.push(['hang no point', 'hang', (r) => ({ ...r, land: undefined }), 'noTarget']);
cases.push(['rope not offering', 'rope', (r) => ({ ...r, b: { ...r.b, sub: 0 } }), 'notOffering']);
cases.push(['rope far', 'rope', (r) => ({ ...r, a: { ...r.a, x: -(TEAM.ropeReach + 0.5) } }), 'far']);
cases.push(['rope no point', 'rope', (r) => ({ ...r, land: undefined }), 'noTarget']);

describe('team-move arbitration: bBusy -> taken (coop4 A20)', () => {
  it.each(cases)('%s: unchanged without bBusy (absent or false), "taken" with it', (_name, kind, tweak, expected) => {
    const r = tweak(valid[kind]);
    expect(checkTeamRequest(r)).toBe(expected);
    expect(checkTeamRequest({ ...r, bBusy: false })).toBe(expected);
    expect(checkTeamRequest({ ...r, bBusy: true })).toBe('taken');
  });
  it('a braced partner busy with someone else is taken, not "braced"', () => {
    expect(checkTeamRequest({ ...valid.boost, bBusy: true })).toBe('taken');
    expect(checkTeamRequest(valid.boost)).toBeNull();
  });
});

describe('open-ended hang / rope busy entries end with the climber (coop4 net check M1)', () => {
  it('a climber alive and posed in the hang or the rope keeps the move running', () => {
    expect(inOpenMove(side({ mode: 'boost', sub: HANG_SUB }))).toBe(true);
    expect(inOpenMove(side({ mode: 'boost', sub: ROPE_SUB }))).toBe(true);
    expect(inOpenMove(side({ mode: 'boost', sub: ROPE_SUB | 1 }))).toBe(true);
  });
  it('a missing, dead, landed or plain leg-up climber frees the pair', () => {
    expect(inOpenMove(null)).toBe(false);
    expect(inOpenMove(side({ mode: 'boost', sub: HANG_SUB, alive: false }))).toBe(false);
    expect(inOpenMove(side({ mode: 'ground', sub: HANG_SUB }))).toBe(false);
    expect(inOpenMove(side({ mode: 'down' }))).toBe(false);
    expect(inOpenMove(side({ mode: 'boost', sub: 0 }))).toBe(false);
    expect(inOpenMove(side({ mode: 'boost' }))).toBe(false);
    expect(inOpenMove(side({ mode: 'brace', sub: HANG_SUB }))).toBe(false);
  });
});
