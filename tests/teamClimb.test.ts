// (team-climb) The two-person rope's top-out (CLIMB_UP_TEAM from the rope, teamController `ropeTop`), headless.
import { beforeAll, describe, expect, it } from 'vitest';
import type { CharacterRig } from '../src/player/characterRig';
import type { WREN_HANDS as WrenHands } from '../src/operators/handFrame';

type V3 = { x: number; y: number; z: number };

/** The wall: its face along x at z 0 (out towards -z), its top at TOP, the block behind it (z > 0); the floor y 0. */
const TOP = 4.0;
/** The rope's foot (x, z) a little out from the face, the climber starting further out, the holder on the top. */
const ROPE = { x: 0, z: -0.3 };
const HOLDER = { x: 0, y: TOP, z: 0.3, yaw: Math.PI };

/** A ray into the scene (the block and the floor): the first hit, as `Ballistics.ray`. */
async function makeRay(): Promise<(a: V3, b: V3) => { hit: boolean; point: V3; normal: V3; distance: number }> {
  const { Vector3 } = await import('../src/core/babylon');
  return (a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    let best = 2;
    let nx = 0, ny = 1, nz = 0;
    // the block: z >= 0 and y <= TOP (entry: the later of the two planes, the exit the earlier)
    {
      let t0 = 0, t1 = 1, ex = 0, ey = 0, ez = 0;
      const clip = (p: number, d: number, sgn: number, fx: number, fy: number, fz: number): void => {
        // inside where sgn * (p + d t) >= 0
        if (Math.abs(d) < 1e-12) {
          if (sgn * p < 0) t0 = 2;
          return;
        }
        const t = -p / d;
        if (sgn * d > 0) {
          if (t > t0) { t0 = t; ex = fx; ey = fy; ez = fz; }
        } else if (t < t1) t1 = t;
      };
      clip(a.z, dz, 1, 0, 0, -1);
      clip(TOP - a.y, -dy, 1, 0, 1, 0);
      if (t0 <= t1 && t0 < best && t0 > 0) { best = t0; nx = ex; ny = ey; nz = ez; }
    }
    // the floor
    if (dy < 0 && a.y >= 0) {
      const t = -a.y / dy;
      if (t <= 1 && t < best) { best = t; nx = 0; ny = 1; nz = 0; }
    }
    if (best > 1) return { hit: false, point: new Vector3(b.x, b.y, b.z), normal: new Vector3(0, 1, 0), distance: Math.sqrt(dx * dx + dy * dy + dz * dz) };
    return { hit: true, point: new Vector3(a.x + dx * best, a.y + dy * best, a.z + dz * best), normal: new Vector3(nx, ny, nz), distance: best * Math.sqrt(dx * dx + dy * dy + dz * dz) };
  };
}

interface Frame {
  state: string;
  k: number;
  /** the body root (the kinematic feet) */
  root: V3;
  /** each palm centre's miss from the lip: on the top within 12 cm of the edge, or the face's top 2 cm (m) */
  palm: [number, number];
  palmAt: number[];
  /** the grip weights (L, R) the controller set */
  w: [number, number];
  /** the farther shoulder's distance to its hand's grip point (m) */
  shLip: number;
  /** per joint (JOINTS): its world position */
  pts: number[];
  /** the wire phase the owner sends (localMoveState: `pose.traverseT`) */
  ph: number;
  /** both grip targets (L then R): x, y, z, hook, liftOff */
  grip: number[];
}

const gripOf = (L: object, R: object): number[] => [L as Record<string, unknown>, R as Record<string, unknown>].flatMap((t) => [Number(t.cx ?? t.x), Number(t.cy ?? t.y), Number(t.cz ?? t.z), Number(t.hook ?? 0), Number(t.liftOff ?? 0)]);

export const JOINTS = ['hips', 'spine', 'torso', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR', 'toeL', 'toeR'] as const;

/**
 * The climber's side of a rope move, driven as GameState drives it: `TeamController.begin` (the host's start), then the
 * fixed step with the stick held up until the top-out ends; the rig (Wren's) posed each frame from the controller's
 * kinematic root, facing, `pose.traverse / traverseT` and the reach targets it wrote. `rig` false: the controller only.
 */
async function ropeTop(hz: number, rigOn: boolean, stick = 1): Promise<{ frames: Frame[]; reach: number }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3 } = await import('../src/core/babylon');
  const { TeamController } = await import('../src/game/teamController');
  const { ROPE_SUB } = await import('../src/game/teamMoves');
  const ray = await makeRay();
  const scene = new Scene(new NullEngine());
  let rig: CharacterRig | null = null;
  let WREN: typeof WrenHands | null = null;
  if (rigOn) {
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { WREN_HANDS } = await import('../src/operators/handFrame');
    const { PLAYER_HEIGHT } = await import('../src/operators/runtime/playerFigure');
    const lib = new PartLibrary(scene);
    rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), PLAYER_HEIGHT, 'climb', { build: 'average', style: 'detailed' });
    rig.setHands(WREN_HANDS);
    rig.tuneRows = true;
    WREN = WREN_HANDS;
  }
  const blank = { x: 0, y: 0, z: 0, w: 0 };
  const controller = { pos: new Vector3(0, 0, -1.2), yaw: 0, override: null as null | { kinematic?: V3; yaw?: number }, grounded: true, swallowCrouch: false };
  const pose = { traverse: 'none', traverseT: 0, tumble: 0 };
  const holder = { id: 'h', pos: new Vector3(HOLDER.x, HOLDER.y, HOLDER.z), yaw: HOLDER.yaw, mode: 'brace', sub: ROPE_SUB };
  const g = {
    player: { alive: true, controller, pose, rig: rig ?? { reachL: { ...blank }, reachR: { ...blank }, plantL: { ...blank }, plantR: { ...blank } } },
    ballistics: { ray: (a: V3, b: V3) => ray(a, b) },
    net: { teamMates: () => [holder], teamHangEnd: () => {}, teamRequest: () => {} },
    app: { toasts: { show: () => {} } },
    traversal: { attached: false, committed: false, attach: { kind: 'ledge', phase: 'on' } },
    takedown: { active: null },
    strike: { active: false },
  };
  const tm = new TeamController(g as never);
  tm.begin({ kind: 'rope', a: 'me', b: 'h', target: -1, s: 0, l: [ROPE.x, TOP, ROPE.z] }, 'me');
  const dt = 1 / hz;
  const frames: Frame[] = [];
  const nodes = rig ? [rig.hips, rig.spine, rig.torso, rig.neck, rig.headNode, rig.shoulderL, rig.shoulderR, rig.elbowL, rig.elbowR, rig.wristL, rig.wristR, rig.hipL, rig.hipR, rig.kneeL, rig.kneeR, rig.ankleL, rig.ankleR, rig.toeL, rig.toeR] : [];
  const palmV = new Vector3();
  const rpose = { speed: 0, localX: 0, localZ: 0, grounded: false, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, traverse: 'none', traverseT: 0 };
  let after = -1;
  for (let n = 0; n < 60 * hz && after < Math.round(0.25 * hz); n++) {
    tm.fixedUpdate(dt, false, false, stick);
    const ov = controller.override;
    if (ov?.kinematic) controller.pos.set(ov.kinematic.x, ov.kinematic.y, ov.kinematic.z);
    if (ov?.yaw !== undefined) controller.yaw = ov.yaw;
    const st = tm.state;
    if (st !== 'ropeClimb' && st !== 'ropeTop') after++;
    // record from a little before the top (the rope's last 0.8 m: the pull in to the face starts 0.6 m under its top)
    if (st === 'ropeClimb' && controller.pos.y < TOP - 1.5 - 0.8) continue;
    const f: Frame = { state: pose.traverse === 'climbUp' ? 'top' : pose.traverse, k: pose.traverse === 'climbUp' ? pose.traverseT : st === 'ropeClimb' ? 0 : 1, root: { x: controller.pos.x, y: controller.pos.y, z: controller.pos.z }, palm: [9, 9], palmAt: [], w: [g.player.rig.reachL.w, g.player.rig.reachR.w], shLip: 0, pts: [], ph: pose.traverseT, grip: gripOf(g.player.rig.reachL, g.player.rig.reachR) };
    if (rig && WREN) {
      rig.root.position.set(controller.pos.x, controller.pos.y, controller.pos.z);
      rig.root.rotation.y = controller.yaw;
      rpose.traverse = pose.traverse;
      rpose.traverseT = pose.traverseT;
      rpose.grounded = st !== 'ropeClimb' && st !== 'ropeTop';
      const lim0 = rig.limited;
      rig.animate(dt, rpose as never);
      (f as { lim?: number }).lim = rig.limited - lim0;
      rig.root.computeWorldMatrix(true);
      for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
      for (const nd of nodes) {
        const q = nd.getAbsolutePosition();
        f.pts.push(q.x, q.y, q.z);
      }
      const palm = (side: 1 | -1): number => {
        const hand = side > 0 ? WREN!.R : WREN!.L;
        Vector3.TransformCoordinatesFromFloatsToRef(hand.palm[0], hand.palm[1], hand.palm[2], (side > 0 ? rig!.wristR : rig!.wristL).computeWorldMatrix(true), palmV);
        f.palmAt.push(palmV.x, palmV.y, palmV.z);
        const dz = Math.max(0, -palmV.z - 0.02, palmV.z - 0.12);
        const dy = Math.max(0, Math.abs(palmV.y - TOP) - 0.03);
        return Math.sqrt(dz * dz + dy * dy);
      };
      f.palm = [palm(-1), palm(1)];
      const sh = (node: typeof rig.shoulderL, t: V3): number => {
        const q = node.getAbsolutePosition();
        const tx = (t as { cx?: number }).cx ?? t.x, ty = (t as { cy?: number }).cy ?? t.y, tz = (t as { cz?: number }).cz ?? t.z;
        return Math.sqrt((q.x - tx) ** 2 + (q.y - ty) ** 2 + (q.z - tz) ** 2);
      };
      f.shLip = Math.max(sh(rig.shoulderL, rig.reachL), sh(rig.shoulderR, rig.reachR));
    }
    frames.push(f);
  }
  const reach = rig ? rig.p.upperArm.len + rig.p.forearm.len : 0;
  scene.dispose();
  return { frames, reach };
}


/** The worst per-frame step and velocity change ("pop": the step minus the frame before's, m) of the points `get`
 *  returns over frames i0.., and the frame of the worst pop. */
function motion(frames: Frame[], get: (f: Frame) => number[], i0 = 0): { step: number; pop: number; at: number } {
  let step = 0;
  let pop = 0;
  let at = -1;
  for (let i = Math.max(1, i0); i < frames.length; i++) {
    const a = get(frames[i - 1]!);
    const b = get(frames[i]!);
    const c = i >= 2 && i - 2 >= i0 - 1 ? get(frames[i - 2]!) : null;
    for (let j = 0; j + 2 < b.length; j += 3) {
      const dx = b[j]! - a[j]!, dy = b[j + 1]! - a[j + 1]!, dz = b[j + 2]! - a[j + 2]!;
      step = Math.max(step, Math.sqrt(dx * dx + dy * dy + dz * dz));
      if (c) {
        const ex = dx - (a[j]! - c[j]!), ey = dy - (a[j + 1]! - c[j + 1]!), ez = dz - (a[j + 2]! - c[j + 2]!);
        const p = Math.sqrt(ex * ex + ey * ey + ez * ez);
        if (p > pop) { pop = p; at = i; }
      }
    }
  }
  return { step, pop, at };
}

const rootOf = (f: Frame): number[] => [f.root.x, f.root.y, f.root.z];
const cm = (m: number): string => (m * 100).toFixed(2);

describe('(team-climb) the rope top-out path (teamMoves)', () => {
  it('rises 0 -> 1 and moves in 0 -> 1, monotone and still at both ends, for any carried-in speed', async () => {
    const { ropeTopPath, ropeClimbPull, ROPE_TOP_PATH } = await import('../src/game/teamMoves');
    const o = { rise: 0, across: 0 };
    for (const m0 of [0, 0.5, 1]) {
      let r0 = -1, a0 = -1;
      for (let i = 0; i <= 400; i++) {
        ropeTopPath(i / 400, m0, o);
        expect(o.rise).toBeGreaterThanOrEqual(r0 - 1e-12);
        expect(o.across).toBeGreaterThanOrEqual(a0 - 1e-12);
        expect(o.rise).toBeLessThanOrEqual(1 + 1e-12);
        r0 = o.rise;
        a0 = o.across;
      }
      expect(ropeTopPath(0, m0, o).rise).toBe(0);
      expect(ropeTopPath(1, m0, o).rise).toBeCloseTo(1, 12);
      expect(o.across).toBeCloseTo(1, 12);
      // the move in waits for the rise
      expect(ropeTopPath(ROPE_TOP_PATH.acrossStart, m0, o).across).toBe(0);
    }
    // the pull in by height: none `pullIn` m under the top, all of it at the top, still at both ends
    expect(ropeClimbPull(ROPE_TOP_PATH.pullIn)).toBe(0);
    expect(ropeClimbPull(0)).toBe(1);
    expect(ropeClimbPull(1e-4)).toBeGreaterThan(1 - 1e-9);
  });
});

describe('(team-climb) the rope top-out (TeamController + Wren rig, 60 Hz)', () => {
  let run: Awaited<ReturnType<typeof ropeTop>>;
  let i0 = 0;
  beforeAll(async () => {
    run = await ropeTop(60, true);
    i0 = run.frames.findIndex((f) => f.state === 'top');
  }, 120_000);

  it("the root never pops: every frame's step within 0.5 cm of the frame before's (was 5.7 cm at the rise's stop)", () => {
    const r = motion(run.frames, rootOf);
    const top = run.frames.filter((f) => f.state === 'top');
    if (process.env.TC_VERBOSE) {
      for (const f of top) console.info(`${f.k.toFixed(3)} w ${f.w[0].toFixed(2)} palm ${cm(f.palm[0])}/${cm(f.palm[1])} sh ${f.shLip.toFixed(3)} y ${f.root.y.toFixed(3)}`);
      const groups: Record<string, number[]> = { trunk: [0, 1, 2, 3, 4, 5, 6, 11, 12], arms: [7, 8, 9, 10], legs: [13, 14, 15, 16], toes: [17, 18] };
      for (const [n, idx] of Object.entries(groups)) {
        const m = motion(run.frames, (f) => idx.flatMap((j) => [f.pts[j * 3]!, f.pts[j * 3 + 1]!, f.pts[j * 3 + 2]!]));
        console.info(`group ${n} (${idx.map((j) => JOINTS[j]).join(' ')}) step ${cm(m.step)} pop ${cm(m.pop)} at ${m.at - i0}`);
      }
    }
    console.info(`root: step ${cm(r.step)} cm, pop ${cm(r.pop)} cm at frame ${r.at - i0} of ${top.length} (the top-out from 0)`);
    expect(top.length).toBeGreaterThan(60);
    expect(r.pop).toBeLessThanOrEqual(0.005);
    // the top-out ends beside the holder, on the top
    const last = run.frames[run.frames.length - 1]!;
    expect(last.root.y).toBeCloseTo(TOP, 3);
    expect(last.root.z).toBeGreaterThan(0.1);
  });

  it('the hands grip the lip: on it (within 3 cm) while the body rises past, both lip ("hook") grips on the edge', async () => {
    const { ROPE_TOP_HANDS } = await import('../src/game/teamMoves');
    const held = run.frames.filter((f) => f.state === 'top' && f.k >= ROPE_TOP_HANDS.inK - 0.05 && f.k <= ROPE_TOP_HANDS.k0 - 0.01);
    expect(held.length).toBeGreaterThanOrEqual(8);
    let worst = 0;
    for (const f of held) {
      worst = Math.max(worst, f.palm[0], f.palm[1]);
      expect(Math.min(f.w[0], f.w[1])).toBeGreaterThan(0.85);
      for (let h = 0; h < 2; h++) {
        const [, gy, gz, hook, lo] = f.grip.slice(h * 5, h * 5 + 5);
        expect(gy).toBeCloseTo(TOP, 6);
        expect(Math.abs(gz!)).toBeLessThan(1e-6);
        expect(hook).toBe(1);
        expect(lo).toBe(ROPE_TOP_HANDS.liftOff);
      }
      // a hand either side of the body, the ledge hang's span
      expect(f.grip[0]! - f.grip[5]!).toBeLessThan(-0.4);
    }
    console.info(`palms on the lip k ${held[0]!.k.toFixed(3)} - ${held[held.length - 1]!.k.toFixed(3)}: worst miss ${cm(worst)} cm`);
    expect(worst).toBeLessThanOrEqual(0.03);
  });

  it("the grips start on the rope's last stretch, stay light into the top-out (the team clip) and are let go after it", async () => {
    const { ROPE_TOP_HANDS } = await import('../src/game/teamMoves');
    const first = run.frames[i0]!;
    expect(first.w[0]).toBeGreaterThan(0.3);
    expect(first.w[0]).toBeLessThanOrEqual(0.5);
    let dw = 0;
    for (let i = 1; i < run.frames.length; i++) dw = Math.max(dw, Math.abs(run.frames[i]!.w[0] - run.frames[i - 1]!.w[0]));
    expect(dw).toBeLessThan(0.1);
    const pre = run.frames.filter((f) => f.state === 'climb' && f.w[0] > 0);
    expect(pre.length).toBeGreaterThan(0);
    for (const f of pre) expect(TOP - 1.5 - f.root.y).toBeLessThan(ROPE_TOP_HANDS.pre + 1e-9);
    const after = run.frames.filter((f) => f.state !== 'top' && f.state !== 'climb');
    expect(after.length).toBeGreaterThan(0);
    for (const f of after) expect(f.w[0] + f.w[1]).toBe(0);
  });

  it('a slower stick (half speed) still never pops the root', async () => {
    const slow = await ropeTop(60, false, 0.5);
    const r = motion(slow.frames, rootOf);
    console.info(`root at half stick: pop ${cm(r.pop)} cm`);
    expect(r.pop).toBeLessThanOrEqual(0.005);
  }, 120_000);

  it("a partner sees the same: the top-out from the feet and the wire phase, the grips as the owner's (ropeSeenStep)", async () => {
    const { ropeSeenStep, ROPE_SEEN } = await import('../src/game/teamMoves');
    const s = { top: false, w: 0 };
    let topAt = -1;
    let diff = 0;
    for (let i = 0; i < run.frames.length; i++) {
      const f = run.frames[i]!;
      if (f.state !== 'top' && f.state !== 'climb') break;
      ropeSeenStep(s, f.root.y, TOP, f.ph, 1 / 60);
      if (s.top && topAt < 0) {
        topAt = i;
        expect(s.w).toBeLessThanOrEqual(ROPE_SEEN.firstW);
      }
      if (i > i0 + 3) diff = Math.max(diff, Math.abs(s.w - f.w[0]));
    }
    console.info(`seen top-out at frame ${topAt - i0}; seen grip weight within ${diff.toFixed(3)} of the owner's`);
    expect(topAt - i0).toBeGreaterThanOrEqual(0);
    expect(topAt - i0).toBeLessThanOrEqual(3);
    expect(diff).toBeLessThan(0.12);
  });
});
