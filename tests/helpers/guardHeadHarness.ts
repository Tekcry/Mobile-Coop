/**
 * guard-render S3a: the shared harness of `tests/guardHeadParity.test.ts` (the parity check) and
 * `tests/guardHeadSweep.test.ts` (the fit sweep, `GUARD_HEAD_SWEEP=1`): the sim head against the rig's head node,
 * the body moved as `Enemy` moves it and the rig fed as `Enemy.frame` feeds it (see the parity test's header).
 */
import type { CharacterRig, FkPose, RigPose } from '../../src/player/characterRig';
import { GuardCq, type GuardCqMode } from '../../src/game/closeQuarters';
import { BLIND_PITCH, emoteBlind, emoteSeize, emoteStep, guardHead, guardHeadRest, leanStep, newEmoteState, newLeanState, type GuardHeadIn, type GuardHeadRest } from '../../src/ai/guardHead';
import { emptyMotionInput, MotionDriver, type MotionState } from '../../src/anim/motion';
import { ENEMY_CALM_MOTION, ENEMY_MOTION } from '../../src/config/movement';
import { GRAB } from '../../src/game/takedown';

export const DT = 1 / 60;
export const T1 = 0.05;
export const T2 = 0.08;
export const T3 = 0.12;
export type Kind = 'grunt' | 'runner' | 'heavy' | 'sniper' | 'officer' | 'enforcer' | 'droneOp';
/** Free poses: rifle average, melee lean, rifle broad. */
export const FREE: readonly Kind[] = ['grunt', 'runner', 'heavy'];
/** Armed free poses (aimed strafe / backpedal: a melee guard never aims). */
export const ARMED: readonly Kind[] = ['grunt', 'heavy'];
/** Every armed human kind (the fit sweep). */
export const ALL_ARMED: readonly Kind[] = ['grunt', 'heavy', 'sniper', 'enforcer', 'officer', 'droneOp'];
/** Cover users (`def.usesCover`): rifle average, rifle lean, pistol athletic. */
export const COVER: readonly Kind[] = ['grunt', 'sniper', 'officer'];
export const YAWS = [0.7, -2.3];

/** What the scenario asks for this step (the brain's output, `Enemy.decide` + cover / takedown state). */
export interface Ctl {
  /** The goal as a local offset from the start (x right, z ahead of the start facing; m); `go` false: stand. */
  gx: number;
  gz: number;
  go: boolean;
  /** Pace (m/s). */
  speed: number;
  /** Hold the start facing while moving (`face` given: strafe, backpedal, the wall walk). */
  face: boolean;
  wantCrouch: number;
  aim: number;
  aimPitch: number;
  wall: boolean;
  wallSide: number;
  /** The raw lean `coverPeek` (-1 / 0 / 1). */
  peek: number;
  climb: boolean;
}

export interface Def {
  walkSpeed: number;
  runSpeed: number;
}

export interface Sc {
  id: string;
  /** 1 steady upright, 2 steady posed, 3 transitions (every frame). */
  tier: 1 | 2 | 3;
  kinds: readonly Kind[];
  /** Seconds before the sampling window and the window's length. */
  settle: number;
  len: number;
  /** Sets the brain's output at scenario time `t` (s, 0 = window start). */
  step: (c: Ctl, t: number, d: Def) => void;
  /** Held from `holdAt` (s; default: from the start) in this mode, the contact `delay` s after. */
  held?: GuardCqMode;
  holdAt?: number;
  delay?: number;
  releaseAt?: number;
  /** (S3a fix 2) Held and walked by the operator (a hostage): from the hold, the body is placed along the local
   *  direction `deg` of the start facing at `speed` m/s, the facing kept, as `Enemy.holdAt` places it (the velocity
   *  eased 0.35 a step towards the placed displacement). */
  heldMove?: { deg: number; speed: number; turn?: HeldTurn };
  /** Blinded from the start. */
  blind?: boolean;
  /** T3: the steady bound after a change. */
  steady?: number;
  /** A written exception: a looser every-frame bound (and T3 steady bound) for this case, with why (the measured worst
   *  error is in the reason; see docs/archive/guard-render/STATE.md "S3a fix round"). */
  except?: { bound: number; steady?: number; why: string };
}

/** (S3a fix 3) A turning hold: the operator turns at `rate` (rad/s, + to the right) from scenario time `from` to `to`
 *  (default: the whole run) while she walks along the local `deg` of her own facing at `speed`; the hostage is placed
 *  `GRAB.hold` ahead and `GRAB.side` to her side of her and faces her way (`TakedownController`, holding), so his
 *  velocity is hers plus the swing of the ~0.34 m offset round her. */
export interface HeldTurn {
  rate: number;
  from?: number;
  to?: number;
}

const FAR = 200;
/** (S3a fix 2) The driver's acceleration (m/s^2, before the stride swing) under which a walk counts as settled. */
const ACCEL_SETTLED = 0.2;

/** Walk along the local direction `deg` (0 ahead, 90 right, 180 back) at `speed`, facing held when `face`. */
export function walk(c: Ctl, deg: number, speed: number, face: boolean): void {
  const a = (deg * Math.PI) / 180;
  c.go = true;
  c.gx = Math.sin(a) * FAR;
  c.gz = Math.cos(a) * FAR;
  c.speed = speed;
  c.face = face;
}

/** A steady upright case; `settle` s before the 1 s window (a walk backwards takes ~2.5 s to settle from rest: its start
 *  is the T3 'backpedal start'). */
export function upright(id: string, aim: number, aimPitch: number, crouch: number, move?: (c: Ctl, d: Def) => void, kinds: readonly Kind[] = FREE, settle = 1.5): Sc {
  return {
    id,
    tier: 1,
    kinds,
    settle,
    len: 1,
    step: (c, _t, d) => {
      c.aim = aim;
      c.aimPitch = aimPitch;
      c.wantCrouch = crouch;
      move?.(c, d);
    },
  };
}

export function wallStill(id: string, ws: number, peek: number): Sc {
  return {
    id,
    tier: 2,
    kinds: COVER,
    settle: 1.5,
    len: 1,
    step: (c) => {
      c.wall = true;
      c.wallSide = ws;
      c.peek = peek;
      c.aim = 1;
    },
  };
}

/** Moving along the wall at the walk pace, facing held (`Enemy.decide` 'inCover' walks to the peek point with
 *  `face: toTarget`): `dir` +1 right, -1 left. */
export function wallWalk(id: string, ws: number, peek: number, dir: number): Sc {
  return {
    id,
    tier: 2,
    kinds: COVER,
    settle: 1.5,
    len: 1,
    step: (c, _t, d) => {
      c.wall = true;
      c.wallSide = ws;
      c.peek = peek;
      c.aim = 1;
      walk(c, dir * 90, d.walkSpeed, true);
    },
  };
}

/** The whole peek at a high-cover edge: still, lean out and walk 1.2 m to the edge (the lean side), hold, lean back
 *  and walk back to the cover point. */
export function peekCycle(id: string, ws: number): Sc {
  const lean = -ws;
  return {
    id,
    tier: 3,
    kinds: COVER,
    settle: 1,
    len: 5,
    steady: T2,
    step: (c, t, d) => {
      c.wall = true;
      c.wallSide = ws;
      c.aim = 1;
      c.speed = d.walkSpeed;
      c.face = true;
      c.go = true;
      c.gz = 0;
      const out = t >= 0.5 && t < 3;
      c.peek = out ? lean : 0;
      c.gx = out ? lean * 1.2 : 0;
    },
  };
}

export function held(m: GuardCqMode): Sc {
  return { id: `held ${m}`, tier: 2, kinds: FREE, settle: 1, len: 1, held: m, step: (c) => { if (m === 'ko') c.wantCrouch = 1; } };
}

export async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../../src/core/babylon');
  const { PartLibrary } = await import('../../src/world/partLibrary');
  const { ENEMIES } = await import('../../src/ai/enemyDefs');
  const { buildEnemyRig } = await import('../../src/ai/enemyRig');
  const scene = new Scene(new NullEngine());
  const parts = new PartLibrary(scene);
  const world = { parts, map: { theme: { faction: 'urban' } }, addShadowCaster: () => {} };
  return { scene, world, ENEMIES, buildEnemyRig };
}

function newIn(x: number, z: number, yaw: number): GuardHeadIn {
  return { x, y: 0, z, yaw, crouch: 0, speed: 0, moveX: 0, moveZ: 0, phase: 0, aim: 0.2, aimPitch: 0, wall: false, wallSide: 0, lean: 0, leanDrop: 0, held: null, heldK: 0, koK: 0, blind: 0, poseW: 0, climb: false };
}

function newCtl(): Ctl {
  return { gx: 0, gz: 0, go: false, speed: 0, face: false, wantCrouch: 0, aim: 0.2, aimPitch: 0, wall: false, wallSide: 0, peek: 0, climb: false };
}

export interface Result {
  worst: number;
  /** The worst error 0.3 s or more after the last change. */
  worstSteady: number;
  /** Mean root-local offset (side, up, forward) of the rig's head and of the sim's in the window. */
  off: [number, number, number];
  pred: [number, number, number];
}

export type Env = Awaited<ReturnType<typeof setup>>;

/** One sampled frame for the sweep: scenario time, the rig head and the sim head root-local (side, up, forward, m),
 *  and the sim input the head got. */
export interface Frame {
  t: number;
  rig: [number, number, number];
  sim: [number, number, number];
  /** The sim head with the speed zeroed (the still stance the movement tables add to). */
  base: [number, number, number];
  inp: Readonly<GuardHeadIn>;
  state: MotionState;
}

export function run(kind: Kind, yaw0: number, sc: Sc, env: Env, onFrame?: (fr: Frame) => void): Result {
  const def = env.ENEMIES[kind];
  const { rig, gun } = env.buildEnemyRig(env.scene as never, env.world as never, def, `p-${kind}`);
  const melee = !!def.melee;
  const rest: GuardHeadRest = guardHeadRest(def.height, def.build, def.gun !== null, melee ? 0 : def.runSpeed);
  const x0 = 3.1;
  const z0 = -2.4;
  const s = newIn(x0, z0, yaw0);
  rig.root.position.set(x0, 0, z0);
  rig.root.rotation.y = yaw0;
  const motion = new MotionDriver(yaw0);
  const mi = emptyMotionInput();
  const cq = new GuardCq();
  cq.seed = 0.3;
  const rp: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };
  const out = { x: 0, y: 0, z: 0 };
  const still = { x: 0, y: 0, z: 0 };
  const cx = newCtl();
  const s0 = Math.sin(yaw0);
  const c0 = Math.cos(yaw0);
  let px = x0;
  let pz = z0;
  let py = 0;
  let yaw = yaw0;
  let vx = 0;
  let vz = 0;
  let crouch = 0;
  let climbT = 0;
  const lean = newLeanState();
  const emo = newEmoteState();
  let taken = false;
  let released = false;
  /** (S3a fix 3) The operator of a turning hold (her position and yaw; NaN until the hold). */
  let opX = Number.NaN;
  let opZ = Number.NaN;
  let opYaw = yaw0;
  const hold = (): void => {
    // `Enemy.beginTakedown` (+ the mode the takedown sets)
    taken = true;
    emoteSeize(emo);
    cq.seize(sc.held === 'seizedLethal', sc.delay ?? 0);
    cq.set(sc.held!);
    rig.emote = (_r: CharacterRig, t: number): FkPose | undefined => cq.pose(t) ?? undefined;
    rig.emoteTime = 0;
    vx = vz = 0;
  };
  if (sc.blind) {
    // mirrors `Enemy.blind` (src/ai/enemy.ts)
    emoteBlind(emo);
    rig.emote = (_r, t) => {
      const k = Math.min(1, t * 6);
      const w = Math.sin(t * 9) * 0.1;
      return { neck: [BLIND_PITCH.neck * k, w, 0], chest: [BLIND_PITCH.chest * k, 0, 0], shoulderL: [-2.1 * k, 0, -0.5 * k], shoulderR: [-2.1 * k, 0, 0.5 * k], elbowL: [0, 0, -2.2 * k], elbowR: [0, 0, 2.2 * k], pelvisLift: BLIND_PITCH.lift * k };
    };
    rig.emoteTime = 0;
  }
  if (sc.held && sc.holdAt === undefined) hold();
  const total = Math.round((sc.settle + sc.len) / DT);
  const startSample = Math.round(sc.settle / DT);
  let worst = 0;
  let worstSteady = 0;
  const off: [number, number, number] = [0, 0, 0];
  const pred: [number, number, number] = [0, 0, 0];
  let n = 0;
  // the last change: an input change of the scenario or a motion-state change of the driver
  let lastChange = -Infinity;
  let prevKey = '';
  let prevState: MotionState = motion.state;
  const d: Def = { walkSpeed: def.walkSpeed, runSpeed: def.runSpeed };
  for (let f = 0; f < total; f++) {
    const tt = f * DT - sc.settle;
    cx.go = false;
    cx.speed = 0;
    cx.face = false;
    cx.wantCrouch = 0;
    cx.aim = 0.2;
    cx.aimPitch = 0;
    cx.wall = false;
    cx.wallSide = 0;
    cx.peek = 0;
    cx.climb = false;
    sc.step(cx, tt, d);
    if (sc.held && sc.holdAt !== undefined && !taken && !released && tt >= sc.holdAt) hold();
    if (sc.releaseAt !== undefined && !released && tt >= sc.releaseAt) {
      // `Enemy.releaseTakedown`
      released = true;
      taken = false;
      rig.emote = null;
      crouch = 0;
      motion.reset(yaw);
    }
    const key = `${cx.go ? `${cx.gx},${cx.gz}` : '-'} ${cx.wantCrouch} ${cx.aim} ${cx.peek} ${taken} ${released}`;
    if (f > 0 && key !== prevKey) lastChange = tt;
    prevKey = key;
    // ---- the fixed step (`Enemy.update` / `move`)
    crouch += (cx.wantCrouch - crouch) * Math.min(1, DT * 8);
    const aimW = melee ? 0 : cx.aim;
    if (!taken && !cx.climb) {
      let dx = 0;
      let dz = 0;
      if (cx.go) {
        dx = x0 + cx.gx * c0 + cx.gz * s0 - px;
        dz = z0 - cx.gx * s0 + cx.gz * c0 - pz;
        const l = Math.hypot(dx, dz);
        if (l > 0.05) {
          const k = Math.min(cx.speed, l / DT) / l;
          dx *= k;
          dz *= k;
        } else dx = dz = 0;
      }
      mi.vx = dx;
      mi.vz = dz;
      const dl = Math.hypot(dx, dz);
      mi.yaw = cx.face ? yaw0 : dl > 0.3 ? Math.atan2(dx, dz) : motion.yaw;
      mi.aiming = cx.face && !melee;
      mi.sprinting = cx.speed > def.walkSpeed * 1.2;
      motion.step(DT, mi, aimW >= 0.5 ? ENEMY_MOTION : ENEMY_CALM_MOTION);
      vx = motion.outX;
      vz = motion.outZ;
      px += vx * DT;
      pz += vz * DT;
      yaw = motion.yaw;
    }
    // a start, stop, stepped turn or pivot is a transition while it lasts (the steady bound holds 0.3 s after it ends);
    // (S3a fix 2) so is the driver still getting up to (or down from) pace: the rig leans on its acceleration
    // (`accelFwd` / `accelSide`), which the sim head has no term for (`ACCEL_SETTLED`)
    if (motion.state !== prevState || (motion.state !== 'idle' && motion.state !== 'move') || Math.hypot(motion.ax, motion.az) > ACCEL_SETTLED) {
      lastChange = tt;
      prevState = motion.state;
    }
    if (taken && sc.heldMove) {
      // `Enemy.holdAt`: the operator places him, the velocity follows eased
      const hm = sc.heldMove;
      const a = (hm.deg * Math.PI) / 180;
      let tx: number;
      let tz: number;
      if (hm.turn) {
        // (S3a fix 3) `TakedownController` holding: she walks and turns, he sits at the hold offset in her frame
        if (Number.isNaN(opX)) {
          opYaw = yaw;
          opX = px - (GRAB.side * Math.cos(yaw) + GRAB.hold * Math.sin(yaw));
          opZ = pz - (-GRAB.side * Math.sin(yaw) + GRAB.hold * Math.cos(yaw));
        }
        const tr = hm.turn;
        if (tt >= (tr.from ?? -Infinity) && tt < (tr.to ?? Infinity)) {
          opYaw += tr.rate * DT;
          // a turn with an end is a transition while it lasts (T3); a steady arc (no `to`) is not
          if (tr.to !== undefined) lastChange = tt;
        }
        const so = Math.sin(opYaw);
        const co = Math.cos(opYaw);
        const lx = Math.sin(a) * hm.speed * DT;
        const lz = Math.cos(a) * hm.speed * DT;
        opX += lx * co + lz * so;
        opZ += -lx * so + lz * co;
        tx = opX + GRAB.side * co + GRAB.hold * so;
        tz = opZ - GRAB.side * so + GRAB.hold * co;
        yaw = opYaw;
      } else {
        const lx = Math.sin(a) * hm.speed * DT;
        const lz = Math.cos(a) * hm.speed * DT;
        tx = px + lx * c0 + lz * s0;
        tz = pz - lx * s0 + lz * c0;
      }
      vx += ((tx - px) * 60 - vx) * 0.35;
      vz += ((tz - pz) * 60 - vz) * 0.35;
      px = tx;
      pz = tz;
    }
    if (cx.climb) {
      py += 1.1 * DT;
      climbT += DT * 1.1 * 1.6;
    }
    // ---- `Enemy.syncHitboxes`
    leanStep(lean, cx.peek, DT);
    const sn = Math.sin(yaw);
    const cs = Math.cos(yaw);
    const sp = Math.hypot(vx, vz);
    s.x = px;
    s.y = py;
    s.z = pz;
    s.yaw = yaw;
    s.crouch = crouch;
    s.speed = sp;
    s.moveX = vx * cs - vz * sn;
    s.moveZ = vx * sn + vz * cs;
    s.phase = motion.phase;
    s.climb = cx.climb;
    s.aim = taken || cx.climb ? 0 : aimW;
    s.aimPitch = cx.aimPitch;
    s.wall = cx.wall;
    s.wallSide = cx.wall ? cx.wallSide : 0;
    s.lean = lean.bd;
    s.leanDrop = lean.dr;
    // `GuardCq.k`: the knockout's limp at full (the takedown sets it), 0 otherwise
    cq.k = cq.mode === 'ko' ? 1 : 0;
    emoteStep(emo, s, taken, !!sc.blind, cq.mode, cq.delay, cq.k, DT);
    guardHead(s, rest, out);
    // ---- `Enemy.frame`
    rig.root.position.set(px, py, pz);
    rig.root.rotation.y = yaw;
    const inv = sp > 0.01 ? 1 / sp : 0;
    rp.speed = sp;
    rp.localX = (vx * cs - vz * sn) * inv;
    rp.localZ = (vx * sn + vz * cs) * inv;
    rp.crouch = crouch;
    rp.aimPitch = cx.aimPitch;
    rp.aim = taken ? 0 : aimW;
    rp.kick = 0;
    rp.melee = -1;
    rp.wall = cx.wall;
    rp.wallSide = rp.wall ? cx.wallSide : 0;
    rp.lean = cx.peek;
    rp.dash = !melee && sp > def.runSpeed * 0.8 && aimW < 0.5 ? 1 : 0;
    rp.phase = taken ? -1 : motion.phase;
    rp.motion = taken ? undefined : motion.state;
    rp.motionT = taken ? 0 : motion.stateT;
    rp.accelFwd = taken ? 0 : motion.ax * sn + motion.az * cs;
    rp.accelSide = taken ? 0 : motion.ax * cs - motion.az * sn;
    rp.velX = vx;
    rp.velZ = vz;
    rp.goalYaw = taken ? yaw : motion.goalYaw;
    rp.stride = !rp.wall && aimW < 0.5 && rp.localZ > 0.5 ? 'facing' : 'velocity';
    rp.traverse = cx.climb ? 'climb' : 'none';
    rp.traverseT = climbT;
    if (cx.climb) rp.aim = 0;
    rig.animate(DT, rp);
    rig.headNode.computeWorldMatrix(true);
    const h = rig.headNode.getAbsolutePosition();
    if (f < startSample) continue;
    if (onFrame) {
      const hx0 = h.x - px;
      const hz0 = h.z - pz;
      const ox0 = out.x - px;
      const oz0 = out.z - pz;
      const sp0 = s.speed;
      s.speed = 0;
      guardHead(s, rest, still);
      s.speed = sp0;
      const bx0 = still.x - px;
      const bz0 = still.z - pz;
      onFrame({
        t: tt,
        rig: [hx0 * cs - hz0 * sn, h.y - py, hx0 * sn + hz0 * cs],
        sim: [ox0 * cs - oz0 * sn, out.y - py, ox0 * sn + oz0 * cs],
        base: [bx0 * cs - bz0 * sn, still.y - py, bx0 * sn + bz0 * cs],
        inp: s,
        state: motion.state,
      });
    }
    const e = Math.hypot(h.x - out.x, h.y - out.y, h.z - out.z);
    worst = Math.max(worst, e);
    if (tt - lastChange >= 0.3) worstSteady = Math.max(worstSteady, e);
    const hx = h.x - px;
    const hz = h.z - pz;
    off[0] += hx * cs - hz * sn;
    off[1] += h.y - py;
    off[2] += hx * sn + hz * cs;
    const ox = out.x - px;
    const oz = out.z - pz;
    pred[0] += ox * cs - oz * sn;
    pred[1] += out.y - py;
    pred[2] += ox * sn + oz * cs;
    n++;
  }
  for (let i = 0; i < 3; i++) {
    off[i] = off[i]! / n;
    pred[i] = pred[i]! / n;
  }
  gun?.dispose();
  rig.dispose();
  return { worst, worstSteady, off, pred };
}
