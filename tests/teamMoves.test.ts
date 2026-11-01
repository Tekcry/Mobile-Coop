import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { flags } from '../src/core/flags';
import { boostPath, checkTeamRequest, inBoostBand, legUpRoom, relayPath, relaySlot, throwArc, throwLanding, throwLandingOk, throwRoom, THROW_SUB, HANG_SUB, hangDepth, hangDepthMax, hangEndOf, hangFollow, hangLanding, hangPointOk, hangReaches, hangRootY, ROPE_SUB, ropeClimb, ropeEndOf, ropeRoom, ropeSlide, ropeTopY, type TeamRequest, type TeamSide } from '../src/game/teamMoves';
import { TEAM } from '../src/config/movement';
import { ATTACH_SUB, emptyMovePose, emptyMoveState, poseFromMoveState } from '../src/player/moveState';

// (one-game) every kit move is on by default now; this file pins the host rules with none on (`?kitmoves=0`)
const kitMoves0 = flags.kitMoves;
beforeAll(() => {
  flags.kitMoves = new Set<string>();
});
afterAll(() => {
  flags.kitMoves = kitMoves0;
});

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

/** A throw: b stands offering it at the origin, a runs in from -x; the landing is the throw's length past b. */
const toss = (o: Partial<TeamRequest> = {}, b: Partial<TeamSide> = {}): TeamRequest => ({
  kind: 'throw',
  a: side({ id: 'a', x: -1.2 }),
  b: side({ id: 'b', mode: 'brace', sub: THROW_SUB, ...b }),
  target: -1,
  targetUp: 0,
  sinceLast: 5,
  land: { x: TEAM.throwDist, y: 0, z: 0 },
  ...o,
});

describe('partner throw (CT prototype B4, CT 1.3)', () => {
  it('a runner in reach of a standing, offering team-mate is thrown', () => {
    expect(checkTeamRequest(toss())).toBeNull();
  });
  it('denied: a crouched leg-up offer is not a throw (and a throw offer is not a leg-up), too far, no / a far-off landing', () => {
    expect(checkTeamRequest(toss({}, { sub: 0 }))).toBe('notOffering');
    expect(checkTeamRequest(toss({}, { mode: 'ground' }))).toBe('notOffering');
    expect(checkTeamRequest(req({ b: side({ id: 'b', mode: 'brace', sub: THROW_SUB }) }))).toBe('notBraced');
    expect(checkTeamRequest(toss({ a: side({ id: 'a', x: -(TEAM.throwReach + 0.2) }) }))).toBe('far');
    expect(checkTeamRequest(toss({ land: undefined }))).toBe('noTarget');
    expect(checkTeamRequest(toss({ land: { x: 9, y: 0, z: 0 } }))).toBe('noTarget');
    expect(checkTeamRequest(toss({ land: { x: TEAM.throwDist, y: TEAM.throwDrop + 0.5, z: 0 } }))).toBe('noTarget');
    expect(checkTeamRequest(toss({ sinceLast: 0.2 }))).toBe('rate');
  });
  it('the landing: on past the thrower along runner -> thrower; on top of them, the way they face', () => {
    const o = { x: 0, z: 0, dx: 0, dz: 0 };
    throwLanding(-1, 0, 0, 0, 0, o);
    expect(o.x).toBeCloseTo(TEAM.throwDist);
    expect(o.z).toBeCloseTo(0);
    expect(o.dx).toBeCloseTo(1);
    throwLanding(5, 5, 5, 5, Math.PI / 2, o);
    expect(o.x).toBeCloseTo(5 + TEAM.throwDist);
    expect(throwLandingOk(0, 0, 0, o.x - 5, 0, 0)).toBe(true);
    expect(throwLandingOk(0, 0, 0, 0.5, 0, 0)).toBe(false);
  });
  it('the arc: 3-4 m forward, apex 1.5-2 m half way, on the feet at the end; clears a 1.45 m beam half way', () => {
    const o = { x: 0, y: 0, z: 0 };
    expect(TEAM.throwDist).toBeGreaterThanOrEqual(3);
    expect(TEAM.throwDist).toBeLessThanOrEqual(4);
    throwArc(0, -1.2, 0, 0, TEAM.throwDist, 0, 0, o);
    expect(o).toEqual({ x: -1.2, y: 0, z: 0 });
    throwArc(TEAM.throwTime / 2, -1.2, 0, 0, TEAM.throwDist, 0, 0, o);
    expect(o.y).toBeGreaterThanOrEqual(1.5);
    expect(o.y).toBeLessThanOrEqual(2);
    // the beam band 1 m past the thrower (runner 1.2 m back): the feet are over the top beam within +-0.3 m of it
    for (const bx of [0.7, 1.0, 1.3]) {
      const t = ((bx + 1.2) / (TEAM.throwDist + 1.2)) * TEAM.throwTime;
      throwArc(t, -1.2, 0, 0, TEAM.throwDist, 0, 0, o);
      expect(o.y).toBeGreaterThan(1.45);
    }
    throwArc(TEAM.throwTime * 2, -1.2, 0, 0, TEAM.throwDist, 0.4, 0, o);
    expect(o.x).toBeCloseTo(TEAM.throwDist);
    expect(o.y).toBeCloseTo(0.4);
  });
  it('room (G151): a blocked arc, no floor or a big drop, or a low ceiling at the landing is a polite refusal', () => {
    expect(throwRoom(true, 0, 1.8)).toBe('ok');
    expect(throwRoom(false, 0, 1.8)).toBe('arc');
    expect(throwRoom(true, NaN, 1.8)).toBe('floor');
    expect(throwRoom(true, -(TEAM.throwDrop + 0.3), 1.8)).toBe('floor');
    expect(throwRoom(true, 0, 0.8)).toBe('head');
  });
});

describe('hang-down (CT prototype B5, CT 1.5 Drop Line)', () => {
  /** `b` crouches at a roof edge (y 4.4) offering the hang-down; `a` stands beside them; the hang point is 1 m ahead. */
  const hang = (o: Partial<TeamRequest> = {}, b: Partial<TeamSide> = {}): TeamRequest => ({
    kind: 'hang',
    a: side({ id: 'a', y: 4.4, z: 1.2 }),
    b: side({ id: 'b', y: 4.4, mode: 'brace', sub: HANG_SUB, ...b }),
    target: -1,
    targetUp: 0,
    sinceLast: 5,
    land: { x: 0, y: 4.4, z: -1 },
    ...o,
  });
  it('allowed onto a holder offering it; denied when not offering, far, or the hang point is off', () => {
    expect(checkTeamRequest(hang())).toBeNull();
    expect(checkTeamRequest(hang({}, { sub: 0 }))).toBe('notOffering');
    expect(checkTeamRequest(hang({}, { sub: THROW_SUB }))).toBe('notOffering');
    expect(checkTeamRequest(hang({ a: side({ id: 'a', y: 4.4, z: TEAM.hangReach + 0.2 }) }))).toBe('far');
    expect(checkTeamRequest(hang({ a: side({ id: 'a', y: 0, z: 1 }) }))).toBe('far');
    expect(checkTeamRequest(hang({ land: undefined }))).toBe('noTarget');
    expect(checkTeamRequest(hang({ land: { x: 0, y: 4.4, z: -3 } }))).toBe('noTarget');
    expect(checkTeamRequest(hang({ land: { x: 0, y: 0, z: -1 } }))).toBe('noTarget');
    // a hang-down offer is no leg-up or throw offer
    expect(checkTeamRequest(req({ b: side({ id: 'b', mode: 'brace', sub: HANG_SUB }) }))).toBe('notBraced');
    expect(hangPointOk(0, 4.4, 0, 0, 4.4, -1.5)).toBe(true);
  });
  it('height: the holder\'s stick moves the head 1-2.5 m under the edge, never into the floor', () => {
    expect(TEAM.hangMin).toBe(1.0);
    expect(TEAM.hangMax).toBe(2.5);
    // stick down (y < 0) lowers at the rate, stick up raises, clamped both ways
    expect(hangDepth(1.5, -1, 0.5)).toBeCloseTo(1.5 + TEAM.hangRate * 0.5);
    expect(hangDepth(1.5, 1, 0.5)).toBeCloseTo(1.5 - TEAM.hangRate * 0.5);
    expect(hangDepth(2.4, -1, 5)).toBe(TEAM.hangMax);
    expect(hangDepth(1.1, 1, 5)).toBe(TEAM.hangMin);
    expect(hangDepth(1.5, 0, 1)).toBe(1.5);
    // a low room: the head stops 0.3 m off the floor; no floor found = the full range
    expect(hangDepthMax(4.4, 2.6)).toBeCloseTo(1.5);
    expect(hangDepthMax(4.4, 0)).toBe(TEAM.hangMax);
    expect(hangDepthMax(4.4, NaN)).toBe(TEAM.hangMax);
    expect(hangDepth(2.0, -1, 5, hangDepthMax(4.4, 2.6))).toBeCloseTo(1.5);
    // turned over, the head is lowest: the root sits 0.62 m over it
    expect(hangRootY(4.4, 2)).toBeCloseTo(4.4 - 2 + 0.62);
    // the hanging player follows the holder's depth smoothly (no snap on the wire's steps)
    const d1 = hangFollow(1.5, 2.5, 1 / 60);
    expect(d1).toBeGreaterThan(1.5);
    expect(d1).toBeLessThan(1.6);
    expect(hangFollow(2.49, 2.5, 1 / 60)).toBe(2.5);
  });
  it('reach: the station 5 panel (1.2 m up, 0.8 m from the hang) is reached only lowered past about 2.3 m', () => {
    const at = (d: number): boolean => hangReaches(0, 1.15, 4.4, d, 0, 1.2, 0.4);
    expect(at(TEAM.hangStart)).toBe(false);
    expect(at(2.2)).toBe(false);
    expect(at(2.4)).toBe(true);
    expect(at(TEAM.hangMax)).toBe(true);
    // too far across: never
    expect(hangReaches(0, 3, 4.4, 2.5, 0, 1.2, 0.4)).toBe(false);
  });
  it('release: Co-op (either) pulls up, only the holder\'s B drops; the drop lands crouched, harmless under 3 m', () => {
    expect(hangEndOf(true, true, false)).toBe('pull');
    expect(hangEndOf(false, true, false)).toBe('pull');
    expect(hangEndOf(true, false, true)).toBe('drop');
    expect(hangEndOf(false, false, true)).toBeNull();
    expect(hangEndOf(true, false, false)).toBeNull();
    expect(hangLanding(1.9)).toEqual({ crouch: true, harm: false });
    expect(hangLanding(2.99).harm).toBe(false);
    expect(hangLanding(3.2).harm).toBe(true);
    // from the station 5 hatch at the deepest hold the head is 1.9 m up: a harmless drop
    expect(hangLanding(4.4 - TEAM.hangMax).harm).toBe(false);
  });
});

describe('hang-down remote pose (B5)', () => {
  it('remotes turn the hanging player over (boost + sub 2) and pose the holder braced (brace + sub 2)', () => {
    const hanging = poseFromMoveState({ ...emptyMoveState(), m: 'boost', sub: HANG_SUB }, 1, emptyMovePose());
    expect(hanging.tumble).toBeCloseTo(Math.PI);
    expect(hanging.traverse).toBe('none');
    const holder = poseFromMoveState({ ...emptyMoveState(), m: 'brace', sub: HANG_SUB, s: 2 }, 1, emptyMovePose());
    expect(holder.traverse).toBe('brace');
    expect(holder.tumble).toBe(0);
    // the leg-up boost is unchanged
    expect(poseFromMoveState({ ...emptyMoveState(), m: 'boost', sub: 0 }, 1, emptyMovePose()).traverse).toBe('climbUp');
  });
});

describe('two-person rope (CT prototype B7, CT 1.4 Belay Line)', () => {
  /** `b` stands on a 4.4 m wall top holding the rope (brace + rope bit); `a` stands at its foot below; the foot is 0.5 m out. */
  const rope = (o: Partial<TeamRequest> = {}, b: Partial<TeamSide> = {}): TeamRequest => ({
    kind: 'rope',
    a: side({ id: 'a', y: 0, x: -1.2 }),
    b: side({ id: 'b', y: 4.4, mode: 'brace', sub: ROPE_SUB, ...b }),
    target: -1,
    targetUp: 0,
    sinceLast: 5,
    land: { x: -0.55, y: 4.4, z: 0 },
    ...o,
  });
  it('allowed onto a holder offering it from below; denied when not offering, far, level, too deep or the foot is off', () => {
    expect(checkTeamRequest(rope())).toBeNull();
    expect(checkTeamRequest(rope({}, { sub: 0 }))).toBe('notOffering');
    expect(checkTeamRequest(rope({}, { sub: HANG_SUB }))).toBe('notOffering');
    expect(checkTeamRequest(rope({}, { mode: 'ground' }))).toBe('notOffering');
    expect(checkTeamRequest(rope({ a: side({ id: 'a', y: 0, x: -(TEAM.ropeReach + 0.3) }) }))).toBe('far');
    // the climber up there beside the holder, or under a drop longer than the rope
    expect(checkTeamRequest(rope({ a: side({ id: 'a', y: 4.4, x: -1 }) }))).toBe('far');
    expect(checkTeamRequest(rope({ a: side({ id: 'a', y: -3, x: -1 }) }))).toBe('far');
    expect(checkTeamRequest(rope({ land: undefined }))).toBe('noTarget');
    expect(checkTeamRequest(rope({ land: { x: -3, y: 4.4, z: 0 } }))).toBe('noTarget');
    // a rope offer is no leg-up, throw or hang-down offer
    expect(checkTeamRequest(req({ b: side({ id: 'b', mode: 'brace', sub: ROPE_SUB }) }))).toBe('notBraced');
    expect(checkTeamRequest({ ...rope(), kind: 'hang', a: side({ id: 'a', y: 4.4, z: 1 }) })).toBe('notBraced');
  });
  it('room (G151): ground under the edge within the rope, polite refusals otherwise', () => {
    expect(ropeRoom(4.4, 0)).toBe('ok');
    expect(ropeRoom(4.4, NaN)).toBe('noFloor');
    expect(ropeRoom(1.5, 0)).toBe('short');
    expect(ropeRoom(TEAM.ropeMax - 0.1, 0)).toBe('ok');
    expect(ropeRoom(10, 0)).toBe('deep');
  });
  it('climbing: the own stick moves the feet up / down at the rates, clamped to the floor and the top', () => {
    const top = ropeTopY(4.4);
    expect(top).toBeCloseTo(2.9);
    expect(ropeClimb(0, 1, 0.5, 0, top)).toBeCloseTo(TEAM.ropeUp * 0.5);
    expect(ropeClimb(1, -1, 0.5, 0, top)).toBeCloseTo(1 - TEAM.ropeDown * 0.5);
    expect(ropeClimb(0.1, -1, 1, 0, top)).toBe(0);
    expect(ropeClimb(2.8, 1, 1, 0, top)).toBe(top);
    expect(ropeClimb(1.3, 0, 1, 0, top)).toBe(1.3);
    // the station 7 wall climbed in about 3 s at full stick
    expect(top / TEAM.ropeUp).toBeLessThan(4);
  });
  it('never stranded: let go (either side) = a slide to the floor; the top = topped out', () => {
    expect(ropeEndOf(true, false, false)).toBe('pull');
    expect(ropeEndOf(false, true, false)).toBe('drop');
    expect(ropeEndOf(false, false, true)).toBe('drop');
    expect(ropeEndOf(false, false, false)).toBeNull();
    let y = 2.5;
    for (let i = 0; i < 120 && y > 0; i++) y = ropeSlide(y, 1 / 60, 0);
    expect(y).toBe(0);
    expect(ropeSlide(0.02, 1, 0)).toBe(0);
  });
  it('remotes pose the climber on the rope (boost + sub 4) and the holder braced (brace + sub 4)', () => {
    const climber = poseFromMoveState({ ...emptyMoveState(), m: 'boost', sub: ROPE_SUB, ph: 0.4 }, 1, emptyMovePose());
    expect(climber.traverse).toBe('climb');
    expect(climber.tumble).toBe(0);
    expect(poseFromMoveState({ ...emptyMoveState(), m: 'brace', sub: ROPE_SUB }, 1, emptyMovePose()).traverse).toBe('brace');
  });
});
