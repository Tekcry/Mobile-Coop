// (team-climb) The two-person rope's top-out (CLIMB_UP_TEAM from the rope, teamController `ropeTop`), headless.
import { beforeAll, describe, expect, it } from 'vitest';

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
}

const JOINTS = ['hips', 'spine', 'torso', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR', 'toeL', 'toeR'] as const;

/**
 * The climber's side of a rope move, driven as GameState drives it: `TeamController.begin` (the host's start), then the
 * fixed step with the stick held up until the top-out ends; the rig (Wren's) posed each frame from the controller's
 * kinematic root, facing, `pose.traverse / traverseT` and the reach targets it wrote. `rig` false: the controller only.
 */
async function ropeTop(hz: number, rigOn: boolean): Promise<{ frames: Frame[]; reach: number }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3 } = await import('../src/core/babylon');
  const { TeamController } = await import('../src/game/teamController');
  const { ROPE_SUB } = await import('../src/game/teamMoves');
  const ray = await makeRay();
  const scene = new Scene(new NullEngine());
  let rig: InstanceType<typeof import('../src/player/characterRig').CharacterRig> | null = null;
  let WREN: typeof import('../src/operators/handFrame').WREN_HANDS | null = null;
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
    tm.fixedUpdate(dt, false, false, 1);
    const ov = controller.override;
    if (ov?.kinematic) controller.pos.set(ov.kinematic.x, ov.kinematic.y, ov.kinematic.z);
    if (ov?.yaw !== undefined) controller.yaw = ov.yaw;
    const st = tm.state;
    if (st !== 'ropeClimb' && st !== 'ropeTop') after++;
    // record from a little before the top (the rope's last 0.4 m)
    if (st === 'ropeClimb' && controller.pos.y < TOP - 1.5 - 0.4) continue;
    const f: Frame = { state: pose.traverse === 'climbUp' ? 'top' : pose.traverse, k: pose.traverse === 'climbUp' ? pose.traverseT : st === 'ropeClimb' ? 0 : 1, root: { x: controller.pos.x, y: controller.pos.y, z: controller.pos.z }, palm: [9, 9], palmAt: [], w: [g.player.rig.reachL.w, g.player.rig.reachR.w], shLip: 0, pts: [] };
    if (rig && WREN) {
      rig.root.position.set(controller.pos.x, controller.pos.y, controller.pos.z);
      rig.root.rotation.y = controller.yaw;
      rpose.traverse = pose.traverse;
      rpose.traverseT = pose.traverseT;
      rpose.grounded = st !== 'ropeClimb' && st !== 'ropeTop';
      rig.animate(dt, rpose as never);
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

/** The worst per-frame step and velocity change (m) of the points `get` returns, over frames i0.. */
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

describe('(team-climb) the rope top-out', () => {
  let run: Awaited<ReturnType<typeof ropeTop>>;
  beforeAll(async () => {
    run = await ropeTop(60, true);
  }, 120_000);

  it('baseline numbers', () => {
    const top = run.frames.filter((f) => f.state === 'top');
    const r = motion(run.frames, rootOf);
    const body = motion(run.frames, (f) => f.pts);
    const i0 = run.frames.findIndex((f) => f.state === 'top');
    let near = 9;
    let nearK = 0;
    for (const f of top) if (Math.min(f.palm[0], f.palm[1]) < near) { near = Math.min(f.palm[0], f.palm[1]); nearK = f.k; }
    const rows = top.map((f) => `${f.k.toFixed(3)} w ${f.w[0].toFixed(2)} palm ${(f.palm[0] * 100).toFixed(1)}/${(f.palm[1] * 100).toFixed(1)} sh ${f.shLip.toFixed(3)} y ${f.root.y.toFixed(3)}`);
    console.info(rows.join('\n'));
    console.info(`root step ${(r.step * 100).toFixed(2)} pop ${(r.pop * 100).toFixed(2)} at ${r.at - i0}; body step ${(body.step * 100).toFixed(2)} pop ${(body.pop * 100).toFixed(2)} at ${body.at - i0} of ${top.length}; nearest palm ${(near * 100).toFixed(1)} cm at k ${nearK.toFixed(2)}`);
    const G: Record<string, number[]> = { trunk: [0, 1, 2, 3, 4, 5, 6, 11, 12], arms: [7, 8, 9, 10], legs: [13, 14, 15, 16], toes: [17, 18] };
    for (const [n, idx] of Object.entries(G)) {
      const m = motion(run.frames, (f) => idx.flatMap((j) => [f.pts[j * 3]!, f.pts[j * 3 + 1]!, f.pts[j * 3 + 2]!]));
      console.info(`group ${n} step ${(m.step * 100).toFixed(1)} pop ${(m.pop * 100).toFixed(1)} at ${m.at - i0}`);
    }
    for (let i = i0 - 2; i < i0 + 3; i++) console.info(`DBG ${i - i0} root ${rootOf(run.frames[i]!).map((v) => v.toFixed(4)).join(" ")} sh ${run.frames[i]!.pts.slice(15, 21).map((v) => v.toFixed(4)).join(" ")}`);
    expect(top.length).toBeGreaterThan(50);
  });
});

describe.skipIf(!process.env.TC_EXPLORE)('explore', () => {
  it('configs', async () => {
    const { ROPE_TOP_HANDS } = await import('../src/game/teamMoves');
    const lines: string[] = [];
    const cfgs = JSON.parse(process.env.TC_EXPLORE!) as [number, number, number][];
    for (const [inK, k0, span] of cfgs) {
      ROPE_TOP_HANDS.inK = inK;
      ROPE_TOP_HANDS.k0 = k0;
      ROPE_TOP_HANDS.span = span;
      const r = await ropeTop(60, true);
      const i0 = r.frames.findIndex((f) => f.state === 'top');
      let worst = 0, shMax = 0, slide = 0;
      const held = r.frames.filter((f) => f.state === 'top' && f.k >= inK - 1e-9 && f.k <= k0 + 1e-9);
      const p0 = held[0]?.palmAt ?? [];
      for (const f of held) {
        worst = Math.max(worst, f.palm[0], f.palm[1]);
        shMax = Math.max(shMax, f.shLip);
        for (let s = 0; s < 6; s += 3) slide = Math.max(slide, Math.hypot(f.palmAt[s]! - p0[s]!, f.palmAt[s + 1]! - p0[s + 1]!, f.palmAt[s + 2]! - p0[s + 2]!));
      }
      const wr = motion(r.frames, (f) => f.pts.slice(27, 33), i0 + 2);
      const el = motion(r.frames, (f) => f.pts.slice(21, 27), i0 + 2);
      const ri = r.frames.findIndex((f) => f.state === 'top' && f.k >= k0) - 3;
      const wrRel = motion(r.frames.slice(ri - 2), (f) => f.pts.slice(27, 33), 2);
      lines.push(`in ${inK} k0 ${k0} span ${span}: palm ${(worst * 100).toFixed(1)} slide ${(slide * 100).toFixed(1)} sh ${shMax.toFixed(3)}/${r.reach.toFixed(3)}; wrists ${(wr.step * 100).toFixed(1)}/${(wr.pop * 100).toFixed(1)} at ${wr.at - i0}, release ${(wrRel.pop * 100).toFixed(1)}; elbows ${(el.step * 100).toFixed(1)}/${(el.pop * 100).toFixed(1)} at ${el.at - i0}`);
    }
    console.info(lines.join('\n'));
  }, 600_000);
});
