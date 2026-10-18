import { describe, expect, it } from 'vitest';
import { boostPath, checkTeamRequest, inBoostBand, legUpRoom, relayPath, relaySlot, type TeamRequest, type TeamSide } from '../src/game/teamMoves';
import { TEAM } from '../src/config/movement';
import { ATTACH_SUB } from '../src/player/moveState';

const side = (o: Partial<TeamSide> = {}): TeamSide => ({ id: 'a', x: 0, y: 0, z: 0, mode: 'ground', alive: true, ...o });
const req = (o: Partial<TeamRequest> = {}): TeamRequest => ({ kind: 'boost', a: side({ id: 'a', z: 0.9 }), b: side({ id: 'b', mode: 'brace' }), target: 4, targetUp: 4.2, sinceLast: 5, ...o });
/** A relay: `b` hangs (y 2.5) on ledge 7 offering it, `a` stands under them. */
const relay = (o: Partial<TeamRequest> = {}, b: Partial<TeamSide> = {}): TeamRequest => ({
  kind: 'ladder',
  a: side({ id: 'a', z: 0.5 }),
  b: side({ id: 'b', y: 2.5, mode: 'ledge', anchor: 7, s: 3, sub: ATTACH_SUB.relay | 1, ...b }),
  target: 7,
  targetUp: 0,
  sinceLast: 5,
  ...o,
});

describe('team moves (CT prototype B2: leg-up and ledge relay)', () => {
  it('a leg-up onto a crouched offering team-mate in reach is allowed', () => {
    expect(checkTeamRequest(req())).toBeNull();
  });
  it('denied: rate, dead, not team-mates (or yourself), partner not offering, busy, too far, no / too high / too low target', () => {
    expect(checkTeamRequest(req({ sinceLast: 0.5 }))).toBe('rate');
    expect(checkTeamRequest(req({ b: side({ id: 'b', mode: 'brace', alive: false }) }))).toBe('dead');
    expect(checkTeamRequest(req({ b: side({ id: 'a', mode: 'brace' }) }))).toBe('notMates');
    expect(checkTeamRequest(req({ b: side({ id: 'b', mode: 'ground' }) }))).toBe('notBraced');
    expect(checkTeamRequest(req({ a: side({ id: 'a', z: 0.9, mode: 'wall' }) }))).toBe('busy');
    // the partner moved away mid-request
    expect(checkTeamRequest(req({ a: side({ id: 'a', z: TEAM.partnerReach + 0.3 }) }))).toBe('far');
    expect(checkTeamRequest(req({ target: -1 }))).toBe('noTarget');
    expect(checkTeamRequest(req({ targetUp: TEAM.boostMax + 0.2 }))).toBe('tooHigh');
    expect(checkTeamRequest(req({ targetUp: TEAM.legUpMin - 0.3 }))).toBe('noTarget');
  });
  it('the ledge band: out of a jump, inside the boost (the G57 band 4.3-4.5 is inside it)', () => {
    expect(inBoostBand(4.3)).toBe(true);
    expect(inBoostBand(4.5)).toBe(true);
    expect(inBoostBand(1.2)).toBe(false);
    expect(inBoostBand(TEAM.boostMax + 0.1)).toBe(false);
  });
  it('room (G151): free air over the crouched head and one side to run in from', () => {
    expect(legUpRoom(Infinity, [0.3, 0.4, Infinity, 0.2])).toBe(true);
    expect(legUpRoom(TEAM.roomUp + 0.1, [0.3, 0.4, TEAM.roomSide, 0.2])).toBe(true);
    // a low ceiling, or boxed in on every side: no room (a polite refusal)
    expect(legUpRoom(1.8, [Infinity, Infinity, Infinity, Infinity])).toBe(false);
    expect(legUpRoom(Infinity, [0.3, 0.4, 0.5, 0.2])).toBe(false);
    expect(legUpRoom(Infinity, [])).toBe(false);
  });
  it('relay: the climber under a hanging, offering mate is allowed', () => {
    expect(checkTeamRequest(relay())).toBeNull();
  });
  it('relay denied: mate not hanging, not offering, too far, hanging out of reach, no ledge, or the climber busy', () => {
    expect(checkTeamRequest(relay({}, { mode: 'ground' }))).toBe('notOffering');
    expect(checkTeamRequest(relay({}, { sub: 1 }))).toBe('notOffering');
    expect(checkTeamRequest(relay({ a: side({ id: 'a', z: TEAM.relayReach + 0.4 }) }))).toBe('far');
    expect(checkTeamRequest(relay({}, { y: TEAM.relayMax + 0.5 }))).toBe('far');
    expect(checkTeamRequest(relay({}, { y: 0.1 }))).toBe('far');
    expect(checkTeamRequest(relay({}, { anchor: -1 }))).toBe('noTarget');
    expect(checkTeamRequest(relay({ a: side({ id: 'a', z: 0.5, mode: 'boost' }) }))).toBe('busy');
  });
  it('relay slot: beside the hanger along the ledge, the other way at the end of it', () => {
    expect(relaySlot(2, 10)).toBeCloseTo(2 + TEAM.relaySlide);
    expect(relaySlot(9.9, 10)).toBeCloseTo(9.9 - TEAM.relaySlide);
    expect(relaySlot(0.1, 0.5)).toBeGreaterThanOrEqual(0);
  });
  it('the relay path: in to the hanging body, then up to the hang beside it', () => {
    const o = { x: 0, y: 0, z: 0 };
    relayPath(0, 0, 0, 1, 2, 2.5, -0.3, o);
    expect(o).toEqual({ x: 0, y: 0, z: 1 });
    relayPath(TEAM.relayClimb * 0.4, 0, 0, 1, 2, 2.5, -0.3, o);
    expect(o.x).toBeCloseTo(2);
    expect(o.z).toBeCloseTo(-0.3);
    expect(o.y).toBeGreaterThan(0);
    expect(o.y).toBeLessThan(2.5);
    relayPath(TEAM.relayClimb, 0, 0, 1, 2, 2.5, -0.3, o);
    expect(o.y).toBeCloseTo(2.5);
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
