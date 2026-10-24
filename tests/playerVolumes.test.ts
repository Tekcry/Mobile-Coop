/**
 * rig-pose-fix S1: the sim player body (`src/player/playerVolumes.ts`), pure: the joint centres from the sim state, the
 * frame (yaw, feet, height), the wall mirror and peek, the weapon and stance terms, the wire mapping, no allocation.
 * The fit against the rig is `tests/playerVolumesParity.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import {
  attachLiftOf,
  bodyFromMoveState,
  crouchBlendOf,
  crouchStep,
  emptyPlayerBodyIn,
  emptyPlayerBodyOut,
  peekShare,
  playerBody,
  PLAYER_OPERATOR_HEIGHT,
  type PlayerBodyIn,
  type PlayerBodyOut,
} from '../src/player/playerVolumes';
import { emptyMoveState, packAttachSub, type MoveState } from '../src/player/moveState';
import { WALL_SUB } from '../src/player/wallController';
import { MOVEMENT } from '../src/config/movement';
import { easeInOut } from '../src/anim/motion';
import { attachLift } from '../src/player/attach';
import { hitVolumes, proportions } from '../src/player/proportions';
import type { Ladder } from '../src/world/anchors';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

const body = (f: Partial<PlayerBodyIn>): PlayerBodyOut => {
  const i = { ...emptyPlayerBodyIn(), ...f };
  return playerBody(i, emptyPlayerBodyOut());
};
/** Capsule-local (side, up, forward) of a world point. */
const local = (p: { x: number; y: number; z: number }, x: number, y: number, z: number, yaw: number): [number, number, number] => {
  const dx = p.x - x;
  const dz = p.z - z;
  return [dx * Math.cos(yaw) - dz * Math.sin(yaw), p.y - y, dx * Math.sin(yaw) + dz * Math.cos(yaw)];
};

describe('player body model (pure)', () => {
  it('standing: the joints stack up the body, the head near the hit volumes\' head height', () => {
    const b = body({});
    expect(b.pelvis.y).toBeGreaterThan(0.8);
    expect(b.chest.y).toBeGreaterThan(b.pelvis.y + 0.15);
    expect(b.neck.y).toBeGreaterThan(b.chest.y + 0.15);
    expect(b.head.y).toBeGreaterThan(b.neck.y + 0.1);
    // Wren's proportions' head centre (1.68 m, G72), within the rig's idle posture
    const hv = hitVolumes(proportions('average', PLAYER_OPERATOR_HEIGHT));
    expect(Math.abs(b.head.y - hv.headY)).toBeLessThan(0.06);
  });

  it('the frame: feet and yaw move it rigidly; height scales the offsets', () => {
    const a = body({ crouch: 0.6, drawn: true, raise: 1, pitch: 0.2 });
    for (const [x, y, z, yaw] of [[3, 1.5, -2, 0.9], [-7, 0, 4, -2.6]] as const) {
      const b = body({ x, y, z, yaw, crouch: 0.6, drawn: true, raise: 1, pitch: 0.2 });
      for (const j of ['pelvis', 'chest', 'neck', 'head'] as const) {
        const l = local(b[j], x, y, z, yaw);
        const l0 = local(a[j], 0, 0, 0, 0);
        for (let k = 0; k < 3; k++) expect(l[k]).toBeCloseTo(l0[k]!, 9);
      }
    }
    const t = body({ height: PLAYER_OPERATOR_HEIGHT * 1.1 });
    expect(t.head.y).toBeCloseTo(body({}).head.y * 1.1, 9);
  });

  it('crouching lowers every joint; the kneel and a raised aim move the head', () => {
    const s = body({});
    const c = body({ crouch: 1 });
    for (const j of ['pelvis', 'chest', 'neck', 'head'] as const) expect(c[j].y).toBeLessThan(s[j].y - 0.2);
    const up = body({ drawn: true, raise: 1, pitch: 0.4 });
    const down = body({ drawn: true, raise: 1, pitch: -0.4 });
    // aiming down the head comes forward and down
    expect(down.head.y).toBeLessThan(up.head.y);
    expect(local(down.head, 0, 0, 0, 0)[2]).toBeGreaterThan(local(up.head, 0, 0, 0, 0)[2]);
    // the raise only counts with a weapon in the hand
    expect(body({ drawn: false, raise: 1 }).head.y).toBeCloseTo(s.head.y, 9);
  });

  it('moving changes the posture from the still stance (the kneel only when still), and the strafe counts aimed', () => {
    // crouched at low ready the kneel sits the trunk up (the head back over the knee)
    const still = body({ crouch: 1, drawn: true });
    const kneel = body({ crouch: 1, drawn: true, kneel: true });
    expect(local(still.head, 0, 0, 0, 0)[2] - local(kneel.head, 0, 0, 0, 0)[2]).toBeGreaterThan(0.1);
    // moving, the kneel flag is not set by any caller; still, the move term is off
    expect(body({ crouch: 1, drawn: true, kneel: true, speed: 1 }).head.y).toBeCloseTo(kneel.head.y, 9);
    const walkF = body({ drawn: true, raise: 1, speed: 1.4, strafe: 0 });
    const walkS = body({ drawn: true, raise: 1, speed: 1.4, strafe: 1 });
    // the aimed strafe sinks the pelvis (wider steps)
    expect(walkS.pelvis.y).toBeLessThan(walkF.pelvis.y - 0.05);
    // under the first knot the move term scales down to the still stance
    const s0 = body({ speed: 0 });
    const s1 = body({ speed: 0.005 });
    expect(s1.head.y).toBeCloseTo(s0.head.y, 9);
  });

  it('the wall: the left stance mirrors the right; the peek moves the head out toward the stance side', () => {
    for (const crouch of [0, 1]) {
      const r = body({ wall: true, wallSide: 1, crouch, peek: 1 });
      const l = body({ wall: true, wallSide: -1, crouch, peek: 1 });
      for (const j of ['pelvis', 'chest', 'neck', 'head'] as const) {
        const a = local(r[j], 0, 0, 0, 0);
        const b = local(l[j], 0, 0, 0, 0);
        expect(b[0]).toBeCloseTo(-a[0], 9);
        expect(b[1]).toBeCloseTo(a[1], 9);
        expect(b[2]).toBeCloseTo(a[2], 9);
      }
      const flat = local(body({ wall: true, wallSide: 1, crouch }).head, 0, 0, 0, 0);
      const out = local(r.head, 0, 0, 0, 0);
      // a standing peek: the head ends about WALL.peekOut (0.35 m) along the wall
      expect(out[0] - flat[0]).toBeGreaterThan(0.25);
    }
    // standing flat on the wall the body sits back toward the face (the root push), behind the capsule
    expect(local(body({ wall: true, wallSide: 1 }).chest, 0, 0, 0, 0)[2]).toBeLessThan(-0.1);
  });

  it('a traversal family: its table (around the capsule plus the attach lift); an unknown family is the free stance', () => {
    const crawl = body({ traverse: 'crawl' });
    expect(crawl.head.y).toBeLessThan(0.8);
    const lifted = body({ traverse: 'crawl', liftX: 0.1, liftY: 0.2, liftZ: -0.3 });
    expect(lifted.head.x - crawl.head.x).toBeCloseTo(0.1, 9);
    expect(lifted.head.y - crawl.head.y).toBeCloseTo(0.2, 9);
    expect(lifted.head.z - crawl.head.z).toBeCloseTo(-0.3, 9);
    // the lift is ignored off a family (free movement)
    expect(body({ liftY: 0.5 }).head.y).toBeCloseTo(body({}).head.y, 9);
    // a phased family follows its phase
    expect(body({ traverse: 'mantle', traverseT: 0.5 }).pelvis.y).toBeLessThan(body({ traverse: 'mantle', traverseT: 0 }).pelvis.y - 0.3);
    // inverted on a pipe: the head under the pelvis
    const inv = body({ traverse: 'pipeInv', tumble: Math.PI });
    expect(inv.head.y).toBeLessThan(inv.pelvis.y - 0.5);
  });

  it('crouchStep: the controller\'s linear ease (crouchTime / standTime), eased in and out', () => {
    let k = 0;
    for (let i = 0; i < 6; i++) k = crouchStep(k, true, 1 / 60);
    expect(k).toBeCloseTo(6 / 60 / MOVEMENT.crouchTime, 9);
    expect(crouchBlendOf(k)).toBeCloseTo(easeInOut(k), 12);
    k = crouchStep(1, false, 1 / 60);
    expect(k).toBeCloseTo(1 - 1 / 60 / MOVEMENT.standTime, 9);
  });

  it('the wire mapping: the wall side and peek from WALL_SUB (the peek only at an edge), the weapon, the families', () => {
    const i = emptyPlayerBodyIn();
    const mv: MoveState = { ...emptyMoveState(), m: 'wall', a: 0, sub: WALL_SUB.crouch | WALL_SUB.edgeL | WALL_SUB.peek, dw: 2, r: 0.7 };
    bodyFromMoveState(mv, 0.5, i);
    expect(i.wall).toBe(true);
    expect(i.wallSide).toBe(-1);
    expect(i.peek).toBeCloseTo(peekShare(0.5), 12);
    expect(i.drawn).toBe(true);
    expect(i.raise).toBe(0.7);
    bodyFromMoveState({ ...mv, sub: WALL_SUB.faceRight | WALL_SUB.peek }, 1, i);
    expect(i.wallSide).toBe(1);
    expect(i.peek).toBe(0);
    bodyFromMoveState({ ...emptyMoveState(), m: 'ladder', a: 3, sub: packAttachSub('on', 1, 'none') }, 0, i);
    expect(i.wall).toBe(false);
    expect(i.traverse).toBe('climb');
    bodyFromMoveState({ ...emptyMoveState(), m: 'vault', ph: 0.4 }, 0, i);
    expect(i.traverse).toBe('vault');
    expect(i.traverseT).toBeCloseTo(0.4, 12);
    bodyFromMoveState({ ...emptyMoveState(), m: 'strike', ph: 0.4, dw: 2 }, 0, i);
    expect(i.drawn).toBe(false);
    bodyFromMoveState(undefined, 0, i);
    expect(i.traverse).toBe('none');
    expect(i.drawn).toBe(false);
  });

  it('attachLiftOf: the anchor\'s attach lift at the body height, faded with the grips, zero off an anchor', () => {
    const lad = { id: 0, kind: 'ladder', base: { x: 1, y: 0, z: 2 }, top: { x: 1, y: 4, z: 2 }, facing: 0.5, rung: 0.3, width: 0.45 } as unknown as Ladder;
    const on: MoveState = { ...emptyMoveState(), m: 'ladder', a: 0, s: 1.2, sub: packAttachSub('on', 1, 'none') };
    const o = attachLiftOf(on, lad, PLAYER_OPERATOR_HEIGHT, { x: 0, y: 0, z: 0 });
    const want = attachLift(lad, 1.2, 1, PLAYER_OPERATOR_HEIGHT, { x: 0, y: 0, z: 0 });
    expect(o.x).toBeCloseTo(want.x, 12);
    expect(o.z).toBeCloseTo(want.z, 12);
    expect(Math.hypot(o.x, o.z)).toBeGreaterThan(0.005);
    const entering = attachLiftOf({ ...on, sub: packAttachSub('enter', 1, 'none'), ph: 0 }, lad, PLAYER_OPERATOR_HEIGHT, { x: 0, y: 0, z: 0 });
    expect(Math.hypot(entering.x, entering.z)).toBe(0);
    const off = attachLiftOf({ ...emptyMoveState() }, lad, PLAYER_OPERATOR_HEIGHT, { x: 9, y: 9, z: 9 });
    expect([off.x, off.y, off.z]).toEqual([0, 0, 0]);
  });

  // (tests/helpers/allocPerCall.ts) only the doubles V8 boxes across calls it does not inline (16 B each, about 52 B a
  // call measured); one { x, y, z } literal would add 48-64 B
  it('allocates nothing per call (boxed doubles only)', async () => {
    const i = emptyPlayerBodyIn();
    const o = emptyPlayerBodyOut();
    const C = inputs(2000, (k) => (k % 11) / 10);
    const S = inputs(2000, (k) => (k % 7) * 0.6);
    const kinds = ['none', 'mantle', 'climb', 'none'] as const;
    sink[0] = 0;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        i.crouch = C[k]!;
        i.speed = S[k]!;
        i.wall = (k & 7) === 1;
        i.drawn = (k & 1) === 0;
        i.raise = C[k]!;
        i.peek = C[k]!;
        i.traverse = kinds[k & 3]!;
        i.traverseT = C[k]!;
        sink[0]! += playerBody(i, o).head.y;
      }
    }, 4 * HEAP_NUMBER);
    console.info(`bytes per playerBody: ${per.toFixed(1)}`);
    expect(sink[0]!).toBeGreaterThan(0);
    expect(per).toBeLessThanOrEqual(4 * HEAP_NUMBER);
  });
});
