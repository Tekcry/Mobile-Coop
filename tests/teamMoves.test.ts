import { describe, expect, it } from 'vitest';
import { boostPath, canBrace, checkTeamRequest, type TeamRequest, type TeamSide } from '../src/game/teamMoves';
import { TEAM } from '../src/config/movement';

const side = (o: Partial<TeamSide> = {}): TeamSide => ({ id: 'a', x: 0, y: 0, z: 0, mode: 'ground', alive: true, team: 0, ...o });
const req = (o: Partial<TeamRequest> = {}): TeamRequest => ({ kind: 'boost', a: side({ id: 'a', z: 0.9 }), b: side({ id: 'b', mode: 'brace' }), target: 4, targetUp: 4.2, sinceLast: 5, ...o });

describe('team moves (3.2.0 phase 5)', () => {
  it('a boost or a ladder onto a braced team-mate in reach is allowed', () => {
    expect(checkTeamRequest(req())).toBeNull();
    expect(checkTeamRequest(req({ kind: 'ladder', target: -1, targetUp: 0 }))).toBeNull();
  });
  it('denied: rate, dead, not team-mates (or yourself), partner not braced, busy, too far, no / too high target', () => {
    expect(checkTeamRequest(req({ sinceLast: 0.5 }))).toBe('rate');
    expect(checkTeamRequest(req({ b: side({ id: 'b', mode: 'brace', alive: false }) }))).toBe('dead');
    expect(checkTeamRequest(req({ b: side({ id: 'b', mode: 'brace', team: 1 }) }))).toBe('notMates');
    expect(checkTeamRequest(req({ b: side({ id: 'a', mode: 'brace' }) }))).toBe('notMates');
    expect(checkTeamRequest(req({ b: side({ id: 'b', mode: 'ground' }) }))).toBe('notBraced');
    expect(checkTeamRequest(req({ a: side({ id: 'a', z: 0.9, mode: 'cover' }) }))).toBe('busy');
    // the partner moved away mid-request
    expect(checkTeamRequest(req({ a: side({ id: 'a', z: TEAM.partnerReach + 0.3 }) }))).toBe('far');
    expect(checkTeamRequest(req({ target: -1 }))).toBe('noTarget');
    expect(checkTeamRequest(req({ targetUp: TEAM.boostMax + 0.2 }))).toBe('tooHigh');
  });
  it('brace: a team-mate within 3 m and a wall within 1 m behind, grounded and free', () => {
    expect(canBrace(2, 0.5, true, true)).toBe(true);
    expect(canBrace(3.5, 0.5, true, true)).toBe(false);
    expect(canBrace(2, 1.5, true, true)).toBe(false);
    expect(canBrace(2, 0.5, false, true)).toBe(false);
    expect(canBrace(2, 0.5, true, false)).toBe(false);
  });
  it('the boost path: in to the hands, a foot up, then tossed onto the grip', () => {
    const o = { x: 0, y: 0, z: 0 };
    boostPath(0, 0, 0, 1, 0, 0, 0, 0, 4.2, -0.3, 1.9, o);
    expect(o).toEqual({ x: 0, y: 0, z: 1 });
    boostPath(TEAM.boostTime * 0.35, 0, 0, 1, 0, 0, 0, 0, 4.2, -0.3, 1.9, o);
    expect(o.y).toBeCloseTo(0.75);
    expect(o.z).toBeCloseTo(0);
    boostPath(TEAM.boostTime, 0, 0, 1, 0, 0, 0, 0, 4.2, -0.3, 1.9, o);
    expect(o.y).toBeCloseTo(4.2 - 1.9);
    expect(o.z).toBeCloseTo(-0.3);
  });
});
