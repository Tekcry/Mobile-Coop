import { afterEach, describe, expect, it } from 'vitest';
import { TEAM } from '../src/config/movement';
import { TUNE_FLAGS, TUNE_SECTIONS, TUNE_STATE_BAG, tuneGet, tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import {
  MOVE_TUNE_TEAM,
  TEAM_MOVES,
  TEAM_TUNE_NOTE,
  TRAV_GROUPS,
  moveTuneBegin,
  moveTuneEnd,
  moveTuneGroup,
  moveTuneRoot,
  moveTuneSelect,
  teamContactK,
  teamGroup,
  teamRoleGroup,
  trapezoid,
  travGroup,
} from '../src/anim/moveTune';
import { PAIR_PARTS, newPairRole, pairCycle, pairFrames, pairPose, stationLedge } from '../src/anim/studioPairs';
import { PAIR_TOP, STUDIO_PROPS, STUDIO_SIZE } from '../src/anim/studioProps';
import { PAIR_STATION, TRAV_ENTRIES, newTravOut, newTravState, travCycle, travEntry, travTick } from '../src/anim/studioTraversal';
import { STUDIO_ENTRIES, studioAdvance, studioEntry, studioInput, studioStepPhase, type StudioInputOut } from '../src/anim/studio';
import { emptyTargets } from '../src/anim/animGraph';
import { newStudioDrive, studioDriveTargets } from '../src/anim/studioDrive';
import { pickTraversal } from '../src/player/movement';
import { LEDGE, REACH } from '../src/world/anchors';
import { inBoostBand, ropeRoom } from '../src/game/teamMoves';

afterEach(() => {
  tuneResetAll();
  TUNE_FLAGS.bypass = false;
  MOVE_TUNE_TEAM.group = '';
  MOVE_TUNE_TEAM.k = 0;
  MOVE_TUNE_TEAM.follow = '';
  moveTuneSelect('', 0, 'none', false);
});

describe('anim studio 2: the move sections', () => {
  it('one section per team move (A, B, contact) and one for the traversal moves, every slider identity at default', () => {
    for (const m of TEAM_MOVES) {
      const sec = TUNE_SECTIONS.find((s) => s.id === `team_${m}`)!;
      expect(sec, m).toBeTruthy();
      expect(sec.groups).toEqual([teamGroup(m, 'a'), teamGroup(m, 'b'), teamGroup(m, 'contact')]);
      expect(sec.note).toBe(TEAM_TUNE_NOTE);
      for (const t of sec.tunables) expect(t.def).toBe(t.kind === 'mul' ? 1 : 0);
      // the contact sliders only on the contact group, the role sliders only on A / B
      expect(sec.tunables.filter((t) => t.groups.includes(teamGroup(m, 'contact'))).map((t) => t.id)).toEqual(['cFwd', 'cUp', 'cSide']);
    }
    const trav = TUNE_SECTIONS.find((s) => s.id === 'trav')!;
    expect(trav.groups).toEqual(TRAV_GROUPS);
    for (const t of trav.tunables) expect(t.def).toBe(t.kind === 'mul' ? 1 : 0);
    // the section order: the Body section and the tuner-v2 ones register first
    const ids = TUNE_SECTIONS.map((s) => s.id);
    expect(ids.indexOf('body')).toBeLessThan(ids.indexOf('team_boost'));
    expect(ids.indexOf('joint')).toBeLessThan(ids.indexOf('team_boost'));
  });

  it('the note says the partner never gets live values and nothing goes on the wire', () => {
    expect(TEAM_TUNE_NOTE).toMatch(/YOUR role only/);
    expect(TEAM_TUNE_NOTE).toMatch(/partner always plays the shared defaults/);
    expect(TEAM_TUNE_NOTE).toMatch(/Nothing goes on the wire/);
  });

  it('the team controller states map to the roles; the traversal kinds to their groups', () => {
    expect(teamRoleGroup('boost')).toBe('team.boost.a');
    expect(teamRoleGroup('offer')).toBe('team.boost.b');
    expect(teamRoleGroup('assist')).toBe('team.boost.b');
    expect(teamRoleGroup('relayUp')).toBe('team.relay.a');
    expect(teamRoleGroup('relayHold')).toBe('team.relay.b');
    expect(teamRoleGroup('throw')).toBe('team.throw.a');
    expect(teamRoleGroup('throwAssist')).toBe('team.throw.b');
    expect(teamRoleGroup('hanging')).toBe('team.hang.a');
    expect(teamRoleGroup('hangHold')).toBe('team.hang.b');
    expect(teamRoleGroup('ropeClimb')).toBe('team.rope.a');
    expect(teamRoleGroup('ropeHold')).toBe('team.rope.b');
    expect(teamRoleGroup('revive')).toBe('team.revive.a');
    expect(teamRoleGroup('none')).toBe('');
    expect(travGroup('vault')).toBe('trav.vault');
    expect(travGroup('climbUp')).toBe('trav.climbUp');
    // the Body section has these: no duplicate here
    for (const k of ['climb', 'hang', 'pipeClimb', 'crawl', 'none']) expect(travGroup(k)).toBe('');
  });

  it('identity at default: the root, the pose and the grip targets are untouched', () => {
    const pos = { x: 1, y: 2, z: 3 };
    const rot = { y: 0.7 };
    const tgt = () => ({ x: 1, y: 1, z: 1, cx: 2, cy: 2, cz: 2 });
    const rig = { reachL: tgt(), reachR: tgt(), plantL: tgt(), plantR: tgt(), root: { rotation: rot } };
    const p = { crouch: 0.4, tumble: 0.1, traverseT: 0.3 };
    expect(moveTuneSelect('team.boost.a', 1, 'climbUp', false)).toBe('team.boost.a');
    moveTuneRoot(pos, rot);
    moveTuneBegin(p, rig);
    expect(pos).toEqual({ x: 1, y: 2, z: 3 });
    expect(rot.y).toBe(0.7);
    expect(p).toEqual({ crouch: 0.4, tumble: 0.1, traverseT: 0.3 });
    expect(rig.reachL).toEqual(tgt());
    moveTuneEnd(rig);
    expect(rig.plantR).toEqual(tgt());
  });

  it('a role slider moves only that role; the contact offset moves role A by its weight; end restores the grips', () => {
    tuneSet('team.boost.a', 'bodyFwd', 0.2);
    tuneSet('team.boost.a', 'handUp', 0.1);
    tuneSet('team.boost.a', 'time', 1.5);
    tuneSet('team.boost.contact', 'cUp', 0.3);
    tuneSet('team.boost.b', 'crouch', -0.5);
    const tgt = () => ({ x: 0, y: 1, z: 0 });
    const rig = { reachL: tgt(), reachR: tgt(), plantL: tgt(), plantR: tgt(), root: { rotation: { y: 0 } } };
    // role A, half way through the contact window
    const pos = { x: 0, y: 0, z: 0 };
    moveTuneSelect('team.boost.a', 0.5, 'climbUp', false);
    moveTuneRoot(pos, rig.root.rotation);
    expect(pos.z).toBeCloseTo(0.2, 9); // yaw 0: forward is +z
    expect(pos.y).toBeCloseTo(0.15, 9);
    const p = { crouch: 0, traverseT: 0.4 };
    moveTuneBegin(p, rig);
    expect(rig.reachL.y).toBeCloseTo(1.1, 9);
    expect(p.traverseT).toBeCloseTo(0.6, 9);
    moveTuneEnd(rig);
    expect(rig.reachL).toEqual(tgt());
    // role B: its own crouch, no contact
    const pb = { x: 0, y: 0, z: 0 };
    moveTuneSelect('team.boost.b', 1, 'brace', false);
    moveTuneRoot(pb, { y: 0 });
    expect(pb).toEqual({ x: 0, y: 0, z: 0 });
    const q = { crouch: 1 };
    moveTuneBegin(q, rig);
    expect(q.crouch).toBeCloseTo(0.5, 9);
    moveTuneEnd(rig);
    // the bypass: identity
    TUNE_FLAGS.bypass = true;
    expect(moveTuneSelect('team.boost.a', 1, 'climbUp', false)).toBe('');
    expect(moveTuneGroup()).toBe('');
  });

  it('contact offset maths: forward / right in the body frame at any yaw, up as is', () => {
    tuneSet('team.relay.contact', 'cFwd', 0.1);
    tuneSet('team.relay.contact', 'cSide', 0.2);
    for (const yaw of [0, Math.PI / 2, 2.3]) {
      const pos = { x: 0, y: 0, z: 0 };
      moveTuneSelect('team.relay.a', 1, 'climbUp', false);
      moveTuneRoot(pos, { y: yaw });
      const fx = Math.sin(yaw);
      const fz = Math.cos(yaw);
      expect(pos.x).toBeCloseTo(fx * 0.1 + fz * 0.2, 9);
      expect(pos.z).toBeCloseTo(fz * 0.1 - fx * 0.2, 9);
    }
  });

  it('the follow keys: the local role, or the studio pair while it plays', () => {
    moveTuneSelect('team.throw.b', 0, 'none');
    expect(TUNE_STATE_BAG.team).toBe('team.throw.b');
    expect(TUNE_STATE_BAG.trav).toBe('');
    moveTuneSelect('', 0, 'vault');
    expect(TUNE_STATE_BAG.team).toBe('');
    expect(TUNE_STATE_BAG.trav).toBe('trav.vault');
    MOVE_TUNE_TEAM.follow = 'team.rope.a';
    moveTuneSelect('', 0, 'none');
    expect(TUNE_STATE_BAG.team).toBe('team.rope.a');
  });

  it('the contact windows follow the game timing', () => {
    expect(trapezoid(0.3, 0.1, 0.25, 0.4, 0.6)).toBe(1);
    expect(trapezoid(0, 0.1, 0.25, 0.4, 0.6)).toBe(0);
    expect(trapezoid(0, 0, 0, 0.1, 0.35)).toBe(1);
    expect(trapezoid(1, 0, 1, 1, 1)).toBe(1);
    expect(teamContactK('boost', TEAM.boostTime * 0.3, TEAM)).toBe(1);
    expect(teamContactK('boost', TEAM.boostTime * 0.9, TEAM)).toBe(0);
    expect(teamContactK('relayUp', TEAM.relayClimb * 0.4, TEAM)).toBe(1);
    expect(teamContactK('throw', 0, TEAM)).toBe(1);
    expect(teamContactK('throw', TEAM.throwTime * 0.5, TEAM)).toBe(0);
    expect(teamContactK('hanging', 3, TEAM)).toBe(1);
    expect(teamContactK('hangPull', TEAM.hangPull, TEAM)).toBe(0);
    expect(teamContactK('assist', 0.2, TEAM)).toBe(0);
  });
});

describe('anim studio 2: the pairs', () => {
  const H = 1.68;

  it('both roles are posed from one clock: the same t gives the same pair, a cycle later too', () => {
    const a = newPairRole();
    const b = newPairRole();
    const a2 = newPairRole();
    const b2 = newPairRole();
    for (const m of TEAM_MOVES) {
      const cyc = pairCycle(m);
      expect(cyc).toBeGreaterThan(2);
      for (let k = 0; k < 40; k++) {
        const t = (k / 40) * cyc;
        pairPose(m, t, PAIR_STATION, H, a, b);
        pairPose(m, t + cyc, PAIR_STATION, H, a2, b2);
        expect(a2).toEqual(a);
        expect(b2).toEqual(b);
        for (const v of [a.x, a.y, a.z, a.yaw, b.x, b.y, b.z, b.yaw]) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('the pair clock: the phase advances once for both rigs; a step is one 30 fps frame', () => {
    const cyc = pairCycle('boost');
    let ph = 0;
    for (let i = 0; i < 30; i++) ph = studioAdvance(ph, 1 / 60, cyc);
    expect(ph * cyc).toBeCloseTo(0.5, 6);
    const n = pairFrames(cyc);
    expect(studioStepPhase(0, n, 1)).toBeCloseTo(1 / n, 9);
    // a hold pair's two drives are held to the pair's phase: the drive never moves it on its own
    const d = newStudioDrive();
    const g = newStudioDrive();
    const e = studioEntry('pair:hold_choke');
    expect(e.kind).toBe('pair');
    expect(e.clip?.name).toBe('hold_choke');
    expect(e.guardClip?.name).toBe('guard_choke_sag');
    d.clip = e.clip;
    g.clip = e.guardClip;
    d.held = g.held = true;
    d.cycle = g.cycle = e.cycle;
    d.phase = g.phase = 0.37;
    studioDriveTargets(d, emptyTargets(), 0.25);
    studioDriveTargets(g, emptyTargets(), 0.25);
    expect(d.phase).toBe(0.37);
    expect(g.phase).toBe(0.37);
    expect(d.live).toBe(g.live);
  });

  it('the leg-up: B offers then assists crouched with cupped hands while A walks in and is boosted to the lip, then hangs', () => {
    const a = newPairRole();
    const b = newPairRole();
    const P = PAIR_PARTS.boost;
    pairPose('boost', P.walk * 0.5, PAIR_STATION, H, a, b);
    expect(b.state).toBe('offer');
    expect(b.traverse).toBe('brace');
    expect(b.group).toBe('team.boost.b');
    expect(a.state).toBe('none');
    expect(a.speed).toBeGreaterThan(0);
    pairPose('boost', P.walk + P.move * 0.3, PAIR_STATION, H, a, b);
    expect(b.state).toBe('assist');
    expect(a.state).toBe('boost');
    expect(a.traverse).toBe('climbUp');
    expect(a.group).toBe('team.boost.a');
    expect(a.k).toBe(1);
    pairPose('boost', P.walk + P.move + 0.5, PAIR_STATION, H, a, b);
    expect(a.traverse).toBe('hang');
    expect(a.grip).toBe('lip');
    // the hands on the lip (its height), the body under it facing the wall
    expect(a.hly).toBe(PAIR_TOP);
    expect(a.y).toBeLessThan(PAIR_TOP - 1.5);
    const l = stationLedge(PAIR_STATION);
    expect(Math.abs(a.z - l.a.z)).toBeLessThan(0.4);
    // facing the wall: the right hand to the body's right
    const rx = Math.cos(a.yaw);
    const rz = -Math.sin(a.yaw);
    expect((a.hrx - a.hlx) * rx + (a.hrz - a.hlz) * rz).toBeGreaterThan(0.3);
  });

  it('the other moves put each role in its team state', () => {
    const a = newPairRole();
    const b = newPairRole();
    const at = (m: (typeof TEAM_MOVES)[number], dt: number): void => pairPose(m, PAIR_PARTS[m].walk + dt, PAIR_STATION, H, a, b);
    at('relay', TEAM.relayClimb * 0.5);
    expect([a.state, b.state, b.traverse]).toEqual(['relayUp', 'relayHold', 'hang']);
    at('throw', TEAM.throwTime * 0.5);
    expect([a.state, b.state, a.traverse]).toEqual(['throw', 'throwAssist', 'vault']);
    expect(a.y).toBeGreaterThan(1);
    at('hang', TEAM.hangLower + 0.5);
    expect([a.state, b.state, b.traverse]).toEqual(['hanging', 'hangHold', 'brace']);
    expect(a.tumble).toBe(Math.PI);
    expect(b.y).toBe(PAIR_TOP);
    expect(a.y).toBeLessThan(PAIR_TOP);
    at('rope', 1);
    expect([a.state, b.state, a.traverse, a.grip]).toEqual(['ropeClimb', 'ropeHold', 'climb', 'rope']);
    at('revive', 1);
    expect([a.state, b.state, a.kneel, b.lie]).toEqual(['revive', 'downed', true, true]);
    expect(b.group).toBe('team.revive.b');
  });

  it('the loop list has every pair and every traversal loop', () => {
    const ids = STUDIO_ENTRIES.map((e) => e.id);
    for (const m of TEAM_MOVES) expect(ids).toContain(`pair:${m}`);
    for (const h of ['hold_idle', 'hold_back', 'hold_choke', 'hold_knife']) expect(ids).toContain(`pair:${h}`);
    for (const t of TRAV_ENTRIES) expect(ids).toContain(t.id);
    // pairs and loops never walk the circle (the stage owns them)
    const out: StudioInputOut = { x: 0, y: 0, turn: 0, ads: false, crouch: false, drawn: false };
    for (const e of STUDIO_ENTRIES.filter((x) => x.kind === 'pair' || x.kind === 'trav')) {
      studioInput(e, true, out);
      expect([out.x, out.y, out.turn]).toEqual([0, 0, 0]);
    }
  });
});

describe('anim studio 2: the traversal loops', () => {
  it('approach, act, reset: one teleport, the walk-in, each step pressed once, then again', () => {
    const e = travEntry('trav:ledge')!;
    const s = newTravState();
    const o = newTravOut();
    const dt = 1 / 60;
    let teleports = 0;
    const presses: string[] = [];
    let walked = 0;
    let approachTicks = 0;
    const phases: string[] = [];
    for (let i = 0; i < Math.round((travCycle(e) * 2 + 2) / dt); i++) {
      travTick(e, s, dt, walked, o);
      if (phases[phases.length - 1] !== s.phase) phases.push(s.phase);
      if (o.teleport) {
        teleports++;
        walked = 0;
      }
      if (s.phase === 'approach') {
        approachTicks++;
        expect(o.y).toBeGreaterThan(0);
        walked += 1.4 * dt;
      }
      if (o.press) presses.push(o.press);
    }
    expect(phases.slice(0, 5)).toEqual(['settle', 'approach', 'act', 'reset', 'settle']);
    expect(teleports).toBeGreaterThanOrEqual(2);
    expect(s.loops).toBeGreaterThanOrEqual(1);
    // the ledge: grab, then climb up: two jump presses a loop
    expect(presses.slice(0, 2)).toEqual(['jump', 'jump']);
    expect(approachTicks).toBeGreaterThan(0);
  });

  it('a held button is held through its step; a camera turn and a stage call come once at the step start', () => {
    const vent = travEntry('trav:vent')!;
    const s = newTravState();
    const o = newTravOut();
    let held = 0;
    for (let i = 0; i < 600; i++) {
      travTick(vent, s, 1 / 60, 5, o);
      if (o.hold === 'interact') held++;
    }
    expect(held).toBeGreaterThan(100);
    const door = travEntry('trav:door')!;
    const s2 = newTravState();
    let calls = 0;
    for (let i = 0; i < 280; i++) {
      travTick(door, s2, 1 / 60, 5, o);
      if (o.call === 'doorOpen') calls++;
    }
    expect(calls).toBe(1);
    const rap = travEntry('trav:rappel')!;
    const s3 = newTravState();
    let faces = 0;
    for (let i = 0; i < 400; i++) {
      travTick(rap, s3, 1 / 60, 0, o);
      if (!Number.isNaN(o.face)) faces++;
    }
    expect(faces).toBe(1);
  });

  it('a stuck walk-in still starts the act', () => {
    const e = travEntry('trav:vault')!;
    const s = newTravState();
    const o = newTravOut();
    for (let i = 0; i < 60 * 6; i++) travTick(e, s, 1 / 60, 0, o);
    expect(s.phase === 'act' || s.loops > 0).toBe(true);
  });
});

describe('anim studio 2: the props at the engine sizes', () => {
  const P = STUDIO_PROPS;

  it('the low wall is a vault, the ledge a jump-grab lip, the co-op lip in the boost band', () => {
    expect(pickTraversal({ height: P.lowWall.h, depth: P.lowWall.thick, landingClear: true, topClear: true })).toBe('vault');
    expect(P.ledge.top).toBeGreaterThanOrEqual(LEDGE.minDrop);
    expect(P.ledge.top).toBeLessThanOrEqual(REACH.grabMax);
    expect(P.ledge.top).toBeGreaterThan(P.lowWall.h + 0.65);
    expect(inBoostBand(P.team.top)).toBe(true);
    expect(P.team.top).toBeGreaterThanOrEqual(4.3);
    expect(P.team.top).toBeLessThanOrEqual(TEAM.boostMax);
    expect(ropeRoom(P.team.top, 0)).toBe('ok');
    expect(P.team.top - TEAM.hangDrop).toBeGreaterThan(0);
    // a ledge relay's hanger is within the climber's reach
    expect(P.team.top - LEDGE.minDrop).toBeLessThanOrEqual(TEAM.relayMax);
  });

  it('the ladder, the duct, the window and the door are the standard sizes; the pipes in a jump-grab', () => {
    expect(P.ladder.width).toBe(0.5);
    expect(P.vent.w).toBe(1.0);
    expect(P.vent.h).toBe(1.1);
    expect([P.window.w, P.window.h, P.window.sill]).toEqual([1.2, 1.2, 0.9]);
    expect([P.door.w, P.door.h]).toEqual([1.2, 2.1]);
    for (const y of [P.pipeH.y, P.bar.y]) {
      expect(y).toBeGreaterThanOrEqual(REACH.grabMin);
      expect(y).toBeLessThanOrEqual(REACH.grabMax);
    }
  });

  it('every prop and start is inside the room, clear of the middle circle', () => {
    const mid = STUDIO_SIZE / 2;
    for (const t of TRAV_ENTRIES) {
      expect(t.start.x).toBeGreaterThan(0);
      expect(t.start.x).toBeLessThan(STUDIO_SIZE);
      expect(t.start.z).toBeGreaterThan(0);
      expect(t.start.z).toBeLessThan(STUDIO_SIZE);
      expect(Math.hypot(t.start.x - mid, t.start.z - mid)).toBeGreaterThan(4);
    }
    expect(PAIR_STATION.top).toBe(PAIR_TOP);
    expect(tuneGet('team.boost.a', 'bodyFwd')).toBe(0);
  });
});

describe('anim studio 2: the studio map is real level geometry', () => {
  it('the props give the game anchors, and the pairs use the team block\'s generated lip', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { studio } = await import('../src/world/maps/studio');
    const { generateLedges } = await import('../src/world/anchors');
    const b = new LevelBuilder();
    studio.build(b, 0);
    const an = b.anchors;
    generateLedges(b.boxes, an);
    expect(an.ladders.length).toBe(1);
    expect(an.pipesV.length).toBe(1);
    expect(an.pipesH.length).toBe(2);
    // (G2b) the floor duct, window and team rope plus the booth's roof duct, glazed window and rope; a zipline and a fence
    expect(an.ducts.length).toBe(2);
    expect(an.windows.length).toBe(2);
    expect(an.doors.length).toBe(1);
    expect(an.rappels.length).toBe(2);
    expect(an.ziplines.length).toBe(1);
    expect(an.fences.length).toBe(1);
    // the old ones keep their place in each list (the loops and the suites read index 0)
    expect(an.windows[0]!.open).toBe(true);
    expect(an.windows[1]!.open).toBe(false);
    expect(an.windows[1]!.breakable).toBe(true);
    expect(an.ducts[0]!.exit.where).toBe('wall');
    expect(an.ducts[1]!.exit.where).toBe('ceiling');
    expect(an.rappels[0]!.top.x).toBe(STUDIO_PROPS.rappel.x);
    // the team block's south lip: the pairs' station lip (same height, line and outward normal)
    const st = stationLedge(PAIR_STATION);
    const lip = an.ledges.find((l) => Math.abs(l.top - PAIR_TOP) < 1e-6 && Math.abs(l.a.z - STUDIO_PROPS.team.z0) < 1e-6 && l.nz < -0.99);
    expect(lip).toBeTruthy();
    expect(lip!.canHang).toBe(true);
    expect(st.nz).toBeCloseTo(lip!.nz, 9);
    expect(Math.min(lip!.a.x, lip!.b.x)).toBeCloseTo(Math.min(st.a.x, st.b.x), 6);
    // the ledge wall's lip at 2.4 m, hangable
    expect(an.ledges.some((l) => Math.abs(l.top - STUDIO_PROPS.ledge.top) < 1e-6 && l.nz < -0.99 && l.canHang)).toBe(true);
    // no lip off the vent block (a crawl duct, not a climb)
    const v = STUDIO_PROPS.vent;
    expect(an.ledges.some((l) => l.a.x > v.x0 - 0.01 && l.a.x < v.x1 + 0.01 && l.a.z > v.z0 - 0.01 && l.a.z < v.z1 + 0.01)).toBe(false);
  });
});

describe('anim studio 2: the G2b test pieces leave the old room as it was', () => {
  /** (G2b) Every `STUDIO_PROPS` key of the Anim Studio, with its value as it was before the test pieces came (the owner's rule: the existing room keeps its place). */
  const OLD = {
    team: { x0: 11, x1: 17, z0: 25, z1: 28, top: 4.4 },
    ledge: { x0: 2, x1: 6, z0: 25, z1: 28, top: 2.4 },
    lowWall: { x: 4, z0: 15, z1: 19, h: 1.0, thick: 0.3 },
    platform: { x0: 0, x1: 3, z0: 8, z1: 11, top: 3.0 },
    ladder: { x: 3.05, z: 9.0, width: 0.5 },
    pipeV: { x: 3.1, z: 10.4 },
    pipeH: { x: 25.5, z0: 4, z1: 9, y: 2.5 },
    bar: { x0: 21, x1: 23.5, z: 25.5, y: 2.3 },
    vent: { x0: 21, x1: 25, z0: 12, z1: 16, z: 14, w: 1.0, h: 1.1, top: 2.0 },
    window: { x: 18, z: 4, w: 1.2, h: 1.2, sill: 0.9, wall0: 15, wall1: 21, wallH: 3 },
    door: { hinge: 9.4, z: 4, w: 1.2, h: 2.1, wall0: 7, wall1: 13, wallH: 3 },
    rappel: { x: 16.3, z: 25, top: 4.4 },
  };

  it('every old STUDIO_PROPS key keeps its value; the room is still 28 m, the middle 14', async () => {
    const { STUDIO_MID } = await import('../src/anim/studioProps');
    for (const [k, v] of Object.entries(OLD)) expect((STUDIO_PROPS as Record<string, unknown>)[k], k).toEqual(v);
    expect(STUDIO_SIZE).toBe(28);
    expect(STUDIO_MID).toBe(14);
  });

  it('the old room is still built: the 7 lamps, the two spawns, the grid, the team block box, the door and window walls', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { studio } = await import('../src/world/maps/studio');
    const b = new LevelBuilder();
    const lay = studio.build(b, 0);
    expect(b.lights.lights.length).toBe(7);
    expect(lay.playerSpawns.map((s) => [s.pos.x, s.pos.z])).toEqual([[14, 14], [16, 14]]);
    const has = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): boolean => b.boxes.some((x) => [cx, cy, cz, sx, sy, sz].every((v, i) => Math.abs((i < 3 ? x.c[i]! : x.s[i - 3]!) - v) < 1e-6));
    expect(has(14, 2.2, 26.5, 6, 4.4, 3)).toBe(true);
    expect(has(4, 1.2, 26.5, 4, 2.4, 3)).toBe(true);
    expect(has(18, 0.45, 4, 1.2, 0.9, 0.3)).toBe(true);
  });

  it('no solid box stands in the animation lane (x 8-26, z 18-24) or on a loop\'s walk-in', async () => {
    const { LevelBuilder } = await import('../src/world/levelBuilder');
    const { studio } = await import('../src/world/maps/studio');
    const b = new LevelBuilder();
    studio.build(b, 0);
    // a box stands in the room (not the floor, the perimeter or the ceiling) when it rises over the floor
    const solid = b.boxes.filter((x) => x.collide && x.c[1] + x.s[1] / 2 > 0.05 && x.c[1] - x.s[1] / 2 < 7.9 && x.c[0] > 0 && x.c[0] < STUDIO_SIZE && x.c[2] > 0 && x.c[2] < STUDIO_SIZE);
    expect(solid.length).toBeGreaterThan(20);
    const hits = (x0: number, x1: number, z0: number, z1: number, yLo: number, yHi: number): number =>
      solid.filter((x) => Math.abs(x.yaw) < 1e-9 && x.c[0] - x.s[0] / 2 < x1 && x.c[0] + x.s[0] / 2 > x0 && x.c[2] - x.s[2] / 2 < z1 && x.c[2] + x.s[2] / 2 > z0 && x.c[1] - x.s[1] / 2 < yHi && x.c[1] + x.s[1] / 2 > yLo).length;
    expect(hits(8, 26, 18, 24, 0.05, 7.9)).toBe(0);
    // each loop walks `walk` m from its start along its yaw: 0.35 m each side of that line stays clear (at body height)
    for (const t of TRAV_ENTRIES) {
      const ex = t.start.x + Math.sin(t.start.yaw) * t.walk;
      const ez = t.start.z + Math.cos(t.start.yaw) * t.walk;
      const n = hits(Math.min(t.start.x, ex) - 0.35, Math.max(t.start.x, ex) + 0.35, Math.min(t.start.z, ez) - 0.35, Math.max(t.start.z, ez) + 0.35, t.start.y + 0.15, t.start.y + 1.5);
      expect(n, `${t.id} walk-in`).toBe(0);
    }
  });

  it('the new pieces are the engine\'s sizes: step rows, the tunnel, the slopes, the fence, block B, the fin gap, the zip, the booth', async () => {
    const { MOVEMENT } = await import('../src/config/movement');
    const P = STUDIO_PROPS;
    const [r0, r1, r2] = P.steps.rows;
    expect(r0.h).toBeLessThanOrEqual(MOVEMENT.maxStep);
    expect(r1.h).toBeGreaterThan(MOVEMENT.maxStep);
    expect(r1.h).toBeLessThanOrEqual(0.65);
    expect(r2.h).toBeGreaterThan(0.65);
    expect(P.tunnel.under).toBeGreaterThan(MOVEMENT.crouchHeight);
    expect(P.tunnel.under).toBeLessThan(MOVEMENT.standHeight);
    const deg = (rise: number, len: number): number => (Math.atan2(rise, len) * 180) / Math.PI;
    expect(deg(P.stairs.rise, P.stairs.len)).toBeLessThan(50);
    expect(deg(P.ramp55.rise, P.ramp55.len)).toBeGreaterThan(50);
    expect(P.fence.x1 - P.fence.x0).toBeGreaterThanOrEqual(2.5);
    expect(P.blockB.top).toBeGreaterThanOrEqual(LEDGE.minDrop);
    expect(P.blockB.top).toBeLessThanOrEqual(REACH.grabMax);
    expect(P.blockB.z0).toBe(P.ledge.z0);
    const gap = P.fin.x0 - P.team.x1;
    expect(gap).toBeGreaterThanOrEqual(1.2);
    expect(gap).toBeLessThanOrEqual(1.95);
    expect(inBoostBand(P.fin.top)).toBe(true);
    expect(P.zip.a.y - P.zip.b.y).toBeGreaterThan(1.5);
    expect(P.booth.top).toBe(PAIR_TOP);
    expect(P.booth.window.sill).toBeGreaterThan(0.3);
    expect(P.booth.rope.x).toBe(P.booth.window.x);
  });
});