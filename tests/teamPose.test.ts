// (anim-n4b, track A) The co-op team poses (clips/team.ts): role B's hands on the contact, a working trunk, and the
// leg-up's push phase (anim-natural PASS2 rows 73, 75-77; AUDIT fix 25).
import { afterEach, describe, expect, it } from 'vitest';
import { TEAM } from '../src/config/movement';
import {
  BOOST_A,
  HANG_ANKLE,
  STAND_DROP,
  TEAM_LINK,
  TeamPoser,
  boostB,
  curve,
  hangB,
  kitMoveOfSub,
  newTeamBPose,
  newTeamPoseIn,
  ropeB,
  teamLinkFrame,
  teamPoseOfState,
  teamPoseOfWire,
  throwB,
  type TeamRigIn,
  type TeamRigPose,
} from '../src/anim/clips/team';
import { PAIR_PARTS, newPairRole, pairPose, ropeHoldLine, type PairRole } from '../src/anim/chamberPairs';
import { PAIR_STATION } from '../src/anim/chamberTraversal';
import { boostPath, KIT_SUB } from '../src/game/teamMoves';
import { KIT_POSERS, registerKitPoser } from '../src/anim/clips/kit/posers';
import { emptyMovePose, emptyMoveState, poseFromMoveState } from '../src/player/moveState';
import { teamRowOfWire } from '../src/anim/tuneMoveRows';

const H = 1.75;
const DT = 1 / 60;

interface FakeRig extends TeamRigIn {
  reachL: { x: number; y: number; z: number; w: number; ax?: number; ay?: number; az?: number; rad?: number };
  reachR: { x: number; y: number; z: number; w: number; ax?: number; ay?: number; az?: number; rad?: number };
  plantR: { x: number; y: number; z: number; w: number };
}

function fakeRig(): FakeRig {
  return { reachL: { x: 0, y: 0, z: 0, w: 0 }, reachR: { x: 0, y: 0, z: 0, w: 0 }, plantR: { x: 0, y: 0, z: 0, w: 0 }, root: { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } }, height: H };
}

/** One chamber pair frame through the posers (as chamberStage.posePuppet): the targets are read between begin and end. */
interface Frame {
  a: PairRole;
  b: PairRole;
  ra: FakeRig;
  rb: FakeRig;
  pa: TeamRigPose;
  pb: TeamRigPose;
}

function pairRun(move: 'boost' | 'throw' | 'hang' | 'rope', from: number, to: number, each: (f: Frame, t: number) => void): void {
  const a = newPairRole();
  const b = newPairRole();
  const ta = new TeamPoser();
  const tb = new TeamPoser();
  const ra = fakeRig();
  const rb = fakeRig();
  const pa: TeamRigPose = {};
  const pb: TeamRigPose = {};
  for (let t = from; t <= to + 1e-9; t += DT) {
    pairPose(move, t, PAIR_STATION, H, a, b);
    for (const [r, rig, p] of [[a, ra, pa], [b, rb, pb]] as const) {
      rig.root.position.x = r.x;
      rig.root.position.y = r.y;
      rig.root.position.z = r.z;
      rig.root.rotation.y = r.yaw;
      p.traverse = r.traverse;
      p.bend = p.bendDrop = p.sway = 0;
    }
    ta.begin(DT, a.tp, pa, ra);
    tb.begin(DT, b.tp, pb, rb);
    each({ a, b, ra, rb, pa, pb }, t);
    ta.end(ra);
    tb.end(rb);
  }
}

const dist = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }): number => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);

afterEach(() => {
  TEAM_LINK.partner = '';
  TEAM_LINK.move = '';
  TEAM_LINK.role = '';
  TEAM_LINK.k = -1;
  TEAM_LINK.linger = 0;
});

describe('team pose: the leg-up', () => {
  const P = PAIR_PARTS.boost;

  it('B\'s cupped hands take A\'s foot through the contact, and rise with A', () => {
    let contact = 0;
    let lowY = Infinity;
    let highY = -Infinity;
    pairRun('boost', P.walk - 0.3, P.walk + P.move - DT, (f, t) => {
      const k = (t - P.walk) / P.move;
      const { ra, rb } = f;
      if (k < 0) {
        // the offer (eased in): the hands cupped together low in front (knee height), on their targets
        if (rb.reachL.w < 0.99) return;
        expect(rb.reachL.y).toBeLessThan(0.65);
        expect(Math.abs(rb.reachL.x - rb.reachR.x) + Math.abs(rb.reachL.z - rb.reachR.z)).toBeLessThan(0.2);
        return;
      }
      const fw = ra.plantR.w;
      if (fw > 0.99) {
        // A's lead sole on the hands: the hands' middle under the foot
        contact++;
        const mid = { x: (rb.reachL.x + rb.reachR.x) / 2, y: (rb.reachL.y + rb.reachR.y) / 2, z: (rb.reachL.z + rb.reachR.z) / 2 };
        expect(dist(mid, ra.plantR)).toBeLessThan(0.08);
        expect(rb.reachL.w).toBeGreaterThan(0.99);
        lowY = Math.min(lowY, mid.y);
        highY = Math.max(highY, mid.y);
      }
    });
    // in contact for 0.24..0.62 of the boost at least (~0.34 s at 60 Hz)
    expect(contact).toBeGreaterThan(0.3 * P.move * 60);
    // the lift: the hands carry the foot from knee height to the chest and over
    expect(lowY).toBeLessThan(0.6);
    expect(highY - lowY).toBeGreaterThan(0.9);
  });

  it('the push: A\'s foot is on the hands with the knee up, the leg drives the hips up off them before A leaves', () => {
    const rows: { k: number; fw: number; footOverHips: number; rootY: number; pathY: number }[] = [];
    pairRun('boost', P.walk - 0.3, P.walk + P.move - DT, (f, t) => {
      const k = (t - P.walk) / P.move;
      if (k < 0) return;
      rows.push({ k, fw: f.ra.plantR.w, footOverHips: f.ra.plantR.y - f.ra.root.position.y, rootY: f.ra.root.position.y, pathY: f.a.y });
    });
    const on = rows.filter((r) => r.fw > 0.99);
    expect(on.length).toBeGreaterThan(10);
    // the step-on: the foot well above the (visual) root, the hips held under the game's path (not lifted off)
    expect(on[0]!.footOverHips).toBeGreaterThan(0.35);
    expect(on[0]!.rootY).toBeLessThan(on[0]!.pathY - 0.2);
    // the drive: the hips rise to the foot while it is still on the hands (the leg extends)
    const last = on[on.length - 1]!;
    expect(last.footOverHips).toBeLessThan(0.15);
    expect(last.rootY - on[0]!.rootY).toBeGreaterThan(0.8);
    // A leaves the hands only after the push (the foot's weight falls after the drive), by the end of the boost
    const off = rows.find((r) => r.k > last.k && r.fw < 0.01);
    expect(off).toBeDefined();
    expect(off!.k).toBeGreaterThan(0.62);
    expect(off!.k).toBeLessThan(0.85);
    // the curves: the foot is on before the toss starts (0.35) and the push ends before the foot leaves
    expect(curve(BOOST_A.foot, 0.3)).toBe(1);
    expect(curve(BOOST_A.lift, 0.62)).toBeLessThan(curve(BOOST_A.lift, 0.3));
  });

  it('A\'s visual offset is gone by the end: A arrives on the game\'s path (the hang)', () => {
    let endGap = Infinity;
    pairRun('boost', P.walk, P.walk + P.move - DT, (f) => {
      endGap = Math.abs(f.ra.root.position.y - f.a.y) + Math.abs(f.ra.root.position.x - f.a.x) + Math.abs(f.ra.root.position.z - f.a.z);
    });
    expect(endGap).toBeLessThan(0.01);
  });

  it('B\'s trunk works: loads forward over the hands, drives up and back; the pelvis sinks then stands', () => {
    const o = newTeamBPose();
    const bends: number[] = [];
    const drops: number[] = [];
    for (let k = 0; k <= 1; k += 0.01) {
      boostB(k, 0, o);
      bends.push(o.bend);
      drops.push(o.drop);
    }
    expect(Math.max(...bends) - Math.min(...bends)).toBeGreaterThan(0.4);
    expect(Math.min(...bends)).toBeLessThan(-0.1);
    // the load sinks the pelvis (0.2 -> 0.33), the drive stands it up; never a positive drop (the close-quarters bend's)
    expect(boostB(0.33, 0, o).drop - boostB(0.2, 0, o).drop).toBeGreaterThan(0.03);
    expect(Math.max(...drops)).toBeLessThanOrEqual(0);
    expect(Math.min(...drops)).toBeLessThan(-0.15);
    // settled back to the brace crouch, the hands let go
    boostB(1, 0, o);
    expect([o.bend, o.drop, o.handW]).toEqual([0, 0, 0]);
  });
});

describe('team pose: the partner throw', () => {
  const P = PAIR_PARTS.throw;

  it('B turns to the runner, the hands cupped at the waist, then swept up over the head; the trunk loads and extends', () => {
    let maxHand = -Infinity;
    let offerHand = NaN;
    const bends: number[] = [];
    let faced = Infinity;
    pairRun('throw', P.walk - 0.3, P.walk + P.move - DT, (f, t) => {
      const k = (t - P.walk) / P.move;
      const { rb, pb } = f;
      bends.push(pb.bend ?? 0);
      if (k < 0 && Number.isNaN(offerHand)) offerHand = rb.reachR.y;
      if (k >= 0 && k < 0.42) {
        expect(rb.reachR.w).toBeGreaterThan(0.95);
        maxHand = Math.max(maxHand, rb.reachR.y);
      }
      if (k > 0.1 && k < 0.25) faced = Math.min(faced, Math.abs(Math.atan2(Math.sin(rb.root.rotation.y - f.b.yaw), Math.cos(rb.root.rotation.y - f.b.yaw))));
      expect(pb.traverse).toBe('brace');
    });
    expect(offerHand).toBeGreaterThan(0.5);
    expect(offerHand).toBeLessThan(0.75);
    expect(maxHand).toBeGreaterThan(1.8);
    expect(Math.max(...bends) - Math.min(...bends)).toBeGreaterThan(0.4);
    // the chamber's thrower already faces the runner: no turn needed there
    expect(faced).toBeLessThan(0.05);
  });

  it('a thrower facing away turns to the runner in the move (visual root yaw), from standing', () => {
    const tp = new TeamPoser();
    const rig = fakeRig();
    const p: TeamRigPose = {};
    const i = newTeamPoseIn();
    i.move = 'throw';
    i.role = 'b';
    i.px = 0;
    i.py = 0;
    i.pz = -1.2; // the runner behind
    i.pyaw = 0;
    for (let n = 0; n < 20; n++) {
      i.k = (n * DT) / TEAM.throwTime;
      rig.root.rotation.y = 0;
      p.bend = p.bendDrop = 0;
      tp.begin(DT, i, p, rig);
      // eases in from standing (the brace clip's crouch taken up), not from a crouch
      if (n === 0) expect(p.bendDrop!).toBeLessThan(STAND_DROP + 0.03);
      tp.end(rig);
    }
    expect(Math.abs(tp.turn)).toBeGreaterThan(1.5);
  });

  it('throw curves: the trunk range, and B ends standing with the hands free', () => {
    const o = newTeamBPose();
    const bends: number[] = [];
    for (let k = 0; k <= 1; k += 0.01) bends.push(throwB(k, 0, o).bend);
    expect(Math.max(...bends) - Math.min(...bends)).toBeGreaterThan(0.45);
    throwB(1, 0, o);
    expect(o.drop).toBeCloseTo(STAND_DROP, 5);
    expect(o.handW).toBe(0);
  });
});

describe('team pose: the hang-down', () => {
  const P = PAIR_PARTS.hang;

  it('B\'s hands close round A\'s shins at the ankles while A is lowered and hangs, at every depth', () => {
    let held = 0;
    let depthLo = Infinity;
    let depthHi = -Infinity;
    pairRun('hang', P.walk - 0.3, P.walk + P.move + P.hold, (f) => {
      const { a, b, rb } = f;
      if (b.state !== 'hangHold' || (a.state !== 'hangDown' && a.state !== 'hanging')) return;
      if (rb.reachL.w < 0.99) return;
      held++;
      const ankle = { x: a.x, y: a.y + HANG_ANKLE, z: a.z };
      const mid = { x: (rb.reachL.x + rb.reachR.x) / 2, y: (rb.reachL.y + rb.reachR.y) / 2, z: (rb.reachL.z + rb.reachR.z) / 2 };
      // on the ankles (the hands a little toward the holder: the shins' near side)
      expect(dist(mid, ankle)).toBeLessThan(0.1);
      // closed round the shins: a plumb grip axis
      expect(rb.reachL.ay).toBe(1);
      expect(rb.reachL.rad).toBeGreaterThan(0);
      depthLo = Math.min(depthLo, b.tp.depth);
      depthHi = Math.max(depthHi, b.tp.depth);
    });
    expect(held).toBeGreaterThan(60);
    expect(depthHi - depthLo).toBeGreaterThan(1);
  });

  it('a braced lean back when A hangs shallow, bent over the edge when deep; the hips back', () => {
    const o = newTeamBPose();
    hangB(true, 0.85, 1.67 - 1.0, 0, 0, o);
    const shallow = o.bend;
    expect(o.back).toBeGreaterThan(0.05);
    hangB(true, 0.85, 1.67 - 2.5, 0, 0, o);
    const deep = o.bend;
    expect(shallow).toBeLessThan(-0.15);
    expect(deep).toBeGreaterThan(0.3);
  });
});

describe('team pose: the two-person rope', () => {
  const P = PAIR_PARTS.rope;

  it('both of B\'s hands are on the rope (the length to the lip) while A climbs, and B leans back under the load', () => {
    let on = 0;
    let minBend = Infinity;
    const line = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0, z1: 0 };
    pairRun('rope', P.walk - 0.3, P.walk + P.move, (f) => {
      const { a, b, rb, pb } = f;
      if (b.state !== 'ropeHold' || a.state !== 'ropeClimb' || rb.reachL.w < 0.99) return;
      expect(ropeHoldLine(b, H, line)).toBe(true);
      // each hand's distance from the rope line through the grip toward the lip
      const dx = line.x1 - line.x0;
      const dy = line.y1 - line.y0;
      const dz = line.z1 - line.z0;
      const n = Math.hypot(dx, dy, dz);
      for (const h of [rb.reachL, rb.reachR]) {
        const vx = h.x - line.x0;
        const vy = h.y - line.y0;
        const vz = h.z - line.z0;
        const along = (vx * dx + vy * dy + vz * dz) / n;
        const off = Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - along * along));
        expect(off).toBeLessThan(0.06);
      }
      // closed round the rope (its axis along the line)
      expect(Math.abs(rb.reachL.ay ?? 0)).toBeGreaterThan(0.5);
      minBend = Math.min(minBend, pb.bend ?? 0);
      on++;
    });
    expect(on).toBeGreaterThan(60);
    expect(minBend).toBeLessThan(-0.15);
  });

  it('rope curves: loaded leans back, unloaded leans over; the climber\'s pull moves the trunk', () => {
    const o = newTeamBPose();
    const unloaded = ropeB(0.25, 0, 0, 0, o).bend;
    const loaded = ropeB(1, 0, 0, 0, o).bend;
    const tug = ropeB(1, 1, 0, 0, o).bend;
    expect(unloaded).toBeGreaterThan(0);
    expect(loaded).toBeLessThan(-0.2);
    expect(tug - loaded).toBeGreaterThan(0.03);
  });
});

describe('team pose: the state, the wire and the link', () => {
  it('the team controller states map to move / role / phase', () => {
    const i = newTeamPoseIn();
    expect(teamPoseOfState('offer', 3, i)).toMatchObject({ move: 'boost', role: 'b', k: -1 });
    expect(teamPoseOfState('assist', TEAM.boostTime / 2, i)).toMatchObject({ move: 'boost', role: 'b', k: 0.5 });
    expect(teamPoseOfState('boost', TEAM.boostTime / 4, i)).toMatchObject({ move: 'boost', role: 'a', k: 0.25 });
    expect(teamPoseOfState('throwAssist', TEAM.throwTime / 2, i)).toMatchObject({ move: 'throw', role: 'b', k: 0.5 });
    expect(teamPoseOfState('hangHold', 1, i)).toMatchObject({ move: 'hang', role: 'b', k: 1 });
    expect(teamPoseOfState('hangOffer', 1, i)).toMatchObject({ move: 'hang', role: 'b', k: -1 });
    expect(teamPoseOfState('ropeHold', 1, i)).toMatchObject({ move: 'rope', role: 'b', k: 1 });
    expect(teamPoseOfState('ropeClimb', 1, i)).toMatchObject({ move: 'rope', role: 'a' });
    expect(teamPoseOfState('relayHold', 1, i)).toMatchObject({ move: '', role: '' });
    expect(teamPoseOfState('none', 1, i)).toMatchObject({ move: '' });
  });

  it('the partner\'s avatar: its own wire mode / sub, and our clock when we are its partner (no wire change)', () => {
    const i = newTeamPoseIn();
    // a braced partner with no link: the offer of the move its sub names
    expect(teamPoseOfWire('brace', 0, 0, 0, 'p2', i)).toMatchObject({ move: 'boost', role: 'b', k: -1 });
    expect(teamPoseOfWire('brace', 1, 0, 0, 'p2', i)).toMatchObject({ move: 'throw', role: 'b' });
    expect(teamPoseOfWire('brace', 2, 2.1, 0, 'p2', i)).toMatchObject({ move: 'hang', role: 'b', depth: 2.1 });
    expect(teamPoseOfWire('brace', 4, 0, 0, 'p2', i)).toMatchObject({ move: 'rope', role: 'b' });
    expect(teamPoseOfWire('ground', 0, 0, 0, 'p2', i)).toMatchObject({ move: '' });
    // we are boosted by p2: our clock and feet drive its hands
    const me = newTeamPoseIn();
    teamPoseOfState('boost', TEAM.boostTime * 0.4, me);
    teamLinkFrame(DT, 'p2', me, 1, 0, 2, 0.5);
    expect(teamPoseOfWire('brace', 0, 0, 0, 'p2', i)).toMatchObject({ move: 'boost', role: 'b', k: 0.4, px: 1, pz: 2 });
    // another player's avatar is not linked
    expect(teamPoseOfWire('brace', 0, 0, 0, 'p3', i).k).toBe(-1);
    // a boosted partner (we are the booster): our clock over its own phase, our feet for its foot
    const b = newTeamPoseIn();
    teamPoseOfState('assist', TEAM.boostTime * 0.3, b);
    teamLinkFrame(DT, 'p2', b, 4, 0, 5, 1);
    expect(teamPoseOfWire('boost', 0, 0, 0.29, 'p2', i)).toMatchObject({ move: 'boost', role: 'a', k: 0.3, px: 4, pz: 5, pyaw: 1 });
    // unlinked it plays its own phase from the wire, with no contact
    TEAM_LINK.partner = '';
    expect(teamPoseOfWire('boost', 0, 0, 0.29, 'p2', i)).toMatchObject({ move: 'boost', role: 'a', k: 0.29 });
    expect(Number.isNaN(i.px)).toBe(true);
  });

  it('the link lingers a moment past a leg-up\'s end (the partner is drawn a little in the past), then clears', () => {
    const me = newTeamPoseIn();
    teamPoseOfState('boost', TEAM.boostTime * 0.98, me);
    teamLinkFrame(DT, 'p2', me, 0, 0, 0, 0);
    teamPoseOfState('none', 0, me);
    teamLinkFrame(0.1, '', me, 0, 0, 0, 0);
    expect(TEAM_LINK.move).toBe('boost');
    expect(TEAM_LINK.k).toBeGreaterThan(1);
    for (let n = 0; n < 10; n++) teamLinkFrame(0.1, '', me, 0, 0, 0, 0);
    expect(TEAM_LINK.move).toBe('');
    expect(TEAM_LINK.partner).toBe('');
  });

  it('the poser eases in and out and leaves no grip weight behind', () => {
    const tp = new TeamPoser();
    const rig = fakeRig();
    const p: TeamRigPose = {};
    const i = newTeamPoseIn();
    i.move = 'boost';
    i.role = 'b';
    tp.begin(DT, i, p, rig);
    expect(tp.w).toBeCloseTo(DT / 0.2, 5);
    expect(rig.reachL.w).toBeGreaterThan(0);
    tp.end(rig);
    expect([rig.reachL.w, rig.reachR.w, rig.plantR.w]).toEqual([0, 0, 0]);
    for (let n = 0; n < 30; n++) {
      tp.begin(DT, i, p, rig);
      tp.end(rig);
    }
    expect(tp.w).toBe(1);
    i.move = '';
    for (let n = 0; n < 30; n++) {
      p.traverse = 'none';
      tp.begin(DT, i, p, rig);
      tp.end(rig);
    }
    expect(tp.w).toBe(0);
    p.traverse = 'none';
    tp.begin(DT, i, p, rig);
    expect(p.traverse).toBe('none');
    expect(rig.reachL.w).toBe(0);
  });

  it('the boost path is the game\'s: the pose never changes where A goes, only how it is drawn', () => {
    // the foot-on-hands height the path assumes (0.75 m over B's feet at 0.35) is reached by the push, not jumped
    const pt = { x: 0, y: 0, z: 0 };
    boostPath(0.35 * TEAM.boostTime, 0, 0, 1, 0, 0, 0, 0, 4.3, 0.3, 1.9, pt);
    expect(pt.y).toBeCloseTo(0.75, 5);
  });
});

// (coop-kit K0) The kit's wire bit table: every kit move's sub bit names its move on both roles (`teamPoseOfWire`), the
// remote body's placeholder (`poseFromMoveState`: role A's traverse, role B's brace), its tuner row (`teamRowOfWire`)
// and role B's TeamPoser placeholder (a B body, or a traverse: the deadweight hanger hangs as from a ledge); a KA pose
// file's registered body (`KIT_POSERS`) replaces the placeholder.
describe('team pose: the kit wire bit table (coop-kit K0)', () => {
  /** kind, bit, the remote role A traverse, role B's TeamPoser placeholder ('body' = a B body, else the traverse). */
  const TABLE = [
    ['pull', 8, 'hang', 'body'],
    ['shutter', 16, 'none', 'body'],
    ['deadweight', 64, 'none', 'hang'],
    ['dropCatch', 128, 'drop', 'body'],
    ['chimneyPair', 256, 'climb', 'climb'],
    ['swingPass', 512, 'vault', 'body'],
    ['plankBridge', 1024, 'none', 'body'],
  ] as const;

  it('each bit names its move on brace (role B) and boost (role A), and its tuner row', () => {
    const i = newTeamPoseIn();
    TEAM_LINK.partner = '';
    for (const [kind, bit] of TABLE) {
      expect(KIT_SUB[kind]).toBe(bit);
      expect(kitMoveOfSub(bit)).toBe(kind);
      expect(teamPoseOfWire('brace', bit, 0, 0, 'p9', i)).toMatchObject({ move: kind, role: 'b' });
      expect(teamPoseOfWire('boost', bit, 0, 0.4, 'p9', i)).toMatchObject({ move: kind, role: 'a', k: 0.4 });
      const row = kind === 'pull' || kind === 'shutter' ? ['', ''] : [`team.${kind}.b`, `team.${kind}.a`];
      expect([teamRowOfWire('brace', bit), teamRowOfWire('boost', bit)]).toEqual(row);
    }
    // the built-ins are unchanged
    expect(teamPoseOfWire('brace', 0, 0, 0, 'p9', i)).toMatchObject({ move: 'boost', role: 'b' });
    expect(teamPoseOfWire('boost', 0, 0, 0.3, 'p9', i)).toMatchObject({ move: 'boost', role: 'a' });
    expect(teamPoseOfWire('brace', 4, 0, 0, 'p9', i)).toMatchObject({ move: 'rope', role: 'b' });
  });

  it("a remote in any kit move draws its placeholder: role A's traverse at the wire's phase, role B braced", () => {
    for (const [kind, bit, trav] of TABLE) {
      const a = poseFromMoveState({ ...emptyMoveState(), m: 'boost', sub: bit, ph: 0 } as never, 0, emptyMovePose());
      expect([kind, a.traverse]).toEqual([kind, trav]);
      const b = poseFromMoveState({ ...emptyMoveState(), m: 'brace', sub: bit, ph: 0 } as never, 0, emptyMovePose());
      expect([kind, b.traverse]).toEqual([kind, 'brace']);
    }
    // never the leg-up's climb-up
    expect(poseFromMoveState({ ...emptyMoveState(), m: 'boost', sub: 256, ph: 0.6 } as never, 0, emptyMovePose()).traverseT).toBeCloseTo(0.6);
    expect(poseFromMoveState({ ...emptyMoveState(), m: 'boost', sub: 0, ph: 0.5 } as never, 0, emptyMovePose()).traverse).toBe('climbUp');
  });

  it("role B's TeamPoser plays the move's placeholder: a B body with the hands on, or the deadweight hanger's hang", () => {
    for (const [kind, , , ph] of TABLE) {
      const tp = new TeamPoser();
      const rig = fakeRig();
      const p: TeamRigPose = { traverse: 'brace' };
      const i = newTeamPoseIn();
      i.move = kind;
      i.role = 'b';
      for (let n = 0; n < 15; n++) {
        tp.begin(DT, i, p, rig);
        tp.end(rig);
      }
      tp.begin(DT, i, p, rig);
      if (ph === 'body') {
        expect([kind, p.traverse]).toEqual([kind, 'brace']);
        expect(rig.reachL.w + rig.reachR.w).toBeGreaterThan(0);
      } else {
        expect([kind, p.traverse]).toEqual([kind, ph]);
        expect(rig.reachL.w + rig.reachR.w).toBe(0);
      }
      tp.end(rig);
    }
  });

  it("a KA pose file's registered body replaces the placeholder (KIT_POSERS)", () => {
    const seen: number[] = [];
    registerKitPoser('deadweight', { b: (_i, t, o) => (seen.push(t), boostB(-1, t, o)) });
    try {
      const tp = new TeamPoser();
      const rig = fakeRig();
      const p: TeamRigPose = { traverse: 'brace' };
      const i = newTeamPoseIn();
      i.move = 'deadweight';
      i.role = 'b';
      tp.begin(DT, i, p, rig);
      expect(seen).toHaveLength(1);
      expect(p.traverse).toBe('brace');
      tp.end(rig);
    } finally {
      KIT_POSERS.delete('deadweight');
    }
  });
});
