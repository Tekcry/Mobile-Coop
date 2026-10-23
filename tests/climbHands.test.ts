// (traverse-fix-2, spare job 8 item 2) The ledge climb-up's hands: the palms stay on the lip while the knees come on and
// the right foot steps onto the top, then let go before the crouch without a jump. Was: the CLIMB_UP trunk near upright
// while the knee came on put the shoulders 0.6 - 0.88 m from the lip (arm 0.54 m) over k 0.32 - 0.52 and the palms left
// it from k 0.32 (31 cm off by 0.36, 65 cm by 0.52) whatever the grip weight; the wrists' velocity changed 23.5 cm in a
// frame at the release (docs/traverse-fix-2/REPORT.md).
import { beforeAll, describe, expect, it } from 'vitest';
import type { Ledge } from '../src/world/anchors';

type V3 = { x: number; y: number; z: number };
interface Frame {
  k: number;
  /** each palm centre's miss from the lip: on the top within 12 cm of the edge, or the face's top 2 cm (m) */
  palm: [number, number];
  /** the palm centres (world, L then R) */
  palmAt: number[];
  /** the farther shoulder's distance to its hand's grip on the lip (m) */
  shLip: number;
  /** the head, neck and chest spheres' clearance from the block (m; negative: inside) */
  head: number;
  neck: number;
  chest: number;
  /** the knees' clearance from the block (the joint less 5 cm) and their lowest height over the top while over it */
  knee: number;
  kneeOverTop: number;
  /** per rig joint (JOINTS): its world position */
  pts: number[];
}

/** The joints the steps are measured on, grouped as the report lists them. */
const JOINTS = ['hips', 'spine', 'torso', 'neck', 'head', 'shL', 'shR', 'elL', 'elR', 'wrL', 'wrR', 'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR', 'toeL', 'toeR'] as const;
const GROUPS: Record<string, readonly number[]> = { trunk: [0, 1, 2, 3, 4, 5, 6, 11, 12], arms: [7, 8, 9, 10], legs: [13, 14, 15, 16], toes: [17, 18] };
/** Before traverse-fix-2 (the old CLIMB_UP keys, CLIMB_UP_HANDS 0.38): each group's worst world step and velocity change
 *  per 60 Hz frame over the whole exit (cm), measured with this harness. */
const BEFORE: Record<string, { step: number; pop: number }> = {
  trunk: { step: 9.6, pop: 3.1 },
  arms: { step: 16.2, pop: 23.5 },
  legs: { step: 17.4, pop: 24.2 },
  toes: { step: 20.9, pop: 39.9 },
};

/** A ledge hang then the climb-up (CLIMB_UP_TIME + CLIMB_UP_STAND: the stick held) on Wren's rig, driven as
 *  attachController drives it: the root on CLIMB_UP_PATH (plus the grips' lift), the grips (AttachGrips with
 *  attachGripWeight / climbUpFootWeight) on the lip. */
async function climb(hz: number): Promise<{ frames: Frame[]; reach: number; crouchK: number; footOnK: number; hands: { k0: number; span: number } }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3 } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { WREN_HANDS } = await import('../src/operators/handFrame');
  const { PLAYER_HEIGHT } = await import('../src/operators/runtime/playerFigure');
  const { AttachGrips } = await import('../src/player/attachGrips');
  const { attachPose, GAMEPLAY_HEIGHT } = await import('../src/player/attach');
  const { CLIMB_UP_PATH, CLIMB_UP_TIME, CLIMB_UP_STAND } = await import('../src/player/attachController');
  const { attachGripWeight, climbUpFootWeight, CLIMB_UP_HANDS } = await import('../src/player/moveState');
  const { CLIMB_UP_CROUCH_K } = await import('../src/anim/clips/traverse');
  const { makeLedge, TraversalAnchors, HANG } = await import('../src/world/anchors');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  // as operatorRig (playerFigure.ts): Wren's height and build, her own hands, the animation base rows
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), PLAYER_HEIGHT, 'climb', { build: 'average', style: 'detailed' });
  rig.setHands(WREN_HANDS);
  rig.tuneRows = true;
  // the lip runs along +x at z 0, the wall's face out towards -z, the block behind it (z > 0, y < top)
  const top = 2.4;
  const anchors = new TraversalAnchors();
  const lip = anchors.add<Ledge>(makeLedge(0, 0, 4, 0, top));
  const s = 2;
  const g = new AttachGrips();
  g.setup(lip, s, 1, PLAYER_HEIGHT);
  // attachController: the hang pose, the climb's end (beginExit 'climb' on a ledge) and the exit path
  const p = attachPose(lip, s, 1, GAMEPLAY_HEIGHT, { x: 0, y: 0, z: 0, yaw: 0 });
  const end = { x: p.x - lip.nx * (HANG.out + 0.45), z: p.z - lip.nz * (HANG.out + 0.45) };
  const P = CLIMB_UP_PATH;
  const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const pose = { speed: 0, localX: 0, localZ: 0, grounded: false, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, traverse: 'hang' as 'hang' | 'climbUp', traverseT: 0 };
  rig.root.rotation.y = p.yaw;
  const dt = 1 / hz;
  const nodes = [rig.hips, rig.spine, rig.torso, rig.neck, rig.headNode, rig.shoulderL, rig.shoulderR, rig.elbowL, rig.elbowR, rig.wristL, rig.wristR, rig.hipL, rig.hipR, rig.kneeL, rig.kneeR, rig.ankleL, rig.ankleR, rig.toeL, rig.toeR];
  const palmV = new Vector3();
  let palmAt: number[] = [];
  const palm = (side: 1 | -1): number => {
    const hand = side > 0 ? WREN_HANDS.R : WREN_HANDS.L;
    Vector3.TransformCoordinatesFromFloatsToRef(hand.palm[0], hand.palm[1], hand.palm[2], (side > 0 ? rig.wristR : rig.wristL).computeWorldMatrix(true), palmV);
    palmAt.push(palmV.x, palmV.y, palmV.z);
    const dz = Math.max(0, -palmV.z - 0.02, palmV.z - 0.12);
    const dy = Math.max(0, Math.abs(palmV.y - top) - 0.03);
    return Math.sqrt(dz * dz + dy * dy);
  };
  const clear = (q: V3, r: number): number => {
    if (q.z <= 0 && q.y >= top) return Math.sqrt(q.z * q.z + (q.y - top) * (q.y - top)) - r;
    if (q.z <= 0) return -q.z - r;
    if (q.y >= top) return q.y - top - r;
    return -Math.min(q.z, top - q.y) - r;
  };
  const at = (n: { getAbsolutePosition(): V3 }): V3 => {
    const q = n.getAbsolutePosition();
    return { x: q.x, y: q.y, z: q.z };
  };
  const frames: Frame[] = [];
  const N = Math.round((CLIMB_UP_TIME + CLIMB_UP_STAND) * hz);
  for (let n = -Math.round(0.6 * hz); n <= N; n++) {
    const exit = n >= 0;
    const k = exit ? n / N : 0;
    let y = p.y;
    let fwd = 0;
    let out = 0;
    if (exit) {
      const mid = Math.max(p.y, top - P.lipDrop);
      y = k < P.k1 ? p.y + (mid - p.y) * smooth(k / P.k1) : mid + (top - mid) * smooth((k - P.k1) / (P.k2 - P.k1));
      fwd = smooth((k - P.fwd0) / P.fwdSpan);
      out = Math.sin(Math.PI * Math.min(1, k / P.outK)) * 0.12;
    }
    g.footW = climbUpFootWeight(exit, k);
    g.update(dt, lip, s, 0, 1, exit ? attachGripWeight('exit', k, true) : 1, rig);
    rig.root.position.set(p.x + (end.x - p.x) * fwd + lip.nx * out + g.lift.x, y + g.lift.y, p.z + (end.z - p.z) * fwd + lip.nz * out + g.lift.z);
    pose.traverse = exit ? 'climbUp' : 'hang';
    pose.traverseT = k;
    rig.animate(dt, pose);
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
    if (!exit) continue;
    const grip = (sh: V3, gx: number): number => Math.sqrt((sh.x - gx) ** 2 + (sh.y - top) ** 2 + (sh.z - 0.04) ** 2);
    const kL = at(rig.kneeL);
    const kR = at(rig.kneeR);
    const over = (q: V3): number => (q.z > 0.05 ? q.y - top : 9);
    const pts: number[] = [];
    for (const nd of nodes) {
      const q = nd.getAbsolutePosition();
      pts.push(q.x, q.y, q.z);
    }
    palmAt = [];
    frames.push({
      k,
      palm: [palm(-1), palm(1)],
      palmAt,
      shLip: Math.max(grip(at(rig.shoulderL), rig.reachL.x), grip(at(rig.shoulderR), rig.reachR.x)),
      head: clear(at(rig.headNode), 0.11),
      neck: clear(at(rig.neck), 0.07),
      chest: clear(at(rig.torso), 0.12),
      knee: Math.min(clear(kL, 0.05), clear(kR, 0.05)),
      kneeOverTop: Math.min(over(kL), over(kR)),
      pts,
    });
  }
  const reach = rig.p.upperArm.len + rig.p.forearm.len;
  scene.dispose();
  // the right foot is on the top from the first frame its ankle stays over the top (8 cm in) at its crouch height
  const ci = frames.findIndex((f) => f.k >= CLIMB_UP_CROUCH_K);
  const anR = (f: Frame, a: number): number => f.pts[16 * 3 + a]!;
  const rest = anR(frames[ci]!, 1);
  let footOnK = 1;
  for (let i = ci; i >= 0 && anR(frames[i]!, 2) > 0.08 && anR(frames[i]!, 1) <= rest + 0.03; i--) footOnK = frames[i]!.k;
  return { frames, reach, crouchK: CLIMB_UP_CROUCH_K, footOnK, hands: { ...CLIMB_UP_HANDS } };
}

/** A group's worst per-frame step and velocity change (m) over the frames (from frame i0). */
function motion(frames: Frame[], group: readonly number[], i0 = 1): { step: number; pop: number } {
  let step = 0;
  let pop = 0;
  for (let i = Math.max(1, i0); i < frames.length; i++) {
    const a = frames[i - 1]!.pts;
    const b = frames[i]!.pts;
    const c = i > 1 ? frames[i - 2]!.pts : null;
    for (const n of group) {
      const j = n * 3;
      const dx = b[j]! - a[j]!;
      const dy = b[j + 1]! - a[j + 1]!;
      const dz = b[j + 2]! - a[j + 2]!;
      step = Math.max(step, Math.sqrt(dx * dx + dy * dy + dz * dz));
      if (c) {
        const ex = dx - (a[j]! - c[j]!);
        const ey = dy - (a[j + 1]! - c[j + 1]!);
        const ez = dz - (a[j + 2]! - c[j + 2]!);
        pop = Math.max(pop, Math.sqrt(ex * ex + ey * ey + ez * ez));
      }
    }
  }
  return { step, pop };
}

describe('(traverse-fix-2) the ledge climb-up hands', () => {
  let run: Awaited<ReturnType<typeof climb>>;
  beforeAll(async () => {
    run = await climb(60);
  });
  const within = (k0: number, k1: number): Frame[] => run.frames.filter((f) => f.k >= k0 - 1e-9 && f.k <= k1 + 1e-9);

  it('the palms stay on the lip (within 1.5 cm, no slide) until the right foot is on the top, then let go by the crouch', () => {
    // the right foot is on the top by k 0.474 (was 0.52), before the hands start to let go (CLIMB_UP_HANDS.k0)
    expect(run.footOnK).toBeLessThan(0.5);
    expect(run.footOnK).toBeLessThanOrEqual(run.hands.k0);
    let worst = 0;
    let slide = 0;
    const p0 = run.frames[0]!.palmAt;
    for (const f of within(0, run.footOnK)) {
      worst = Math.max(worst, f.palm[0], f.palm[1]);
      for (let s = 0; s < 6; s += 3) slide = Math.max(slide, Math.sqrt((f.palmAt[s]! - p0[s]!) ** 2 + (f.palmAt[s + 1]! - p0[s + 1]!) ** 2 + (f.palmAt[s + 2]! - p0[s + 2]!) ** 2));
    }
    // was 31 cm off at k 0.36, 65 cm by 0.52 (and 5.6 cm off, 7.8 cm of slide with CLIMB_UP_HANDS 0.52 / 0.12); now 0.0 / 1.1
    expect(worst).toBeLessThanOrEqual(0.015);
    expect(slide).toBeLessThanOrEqual(0.015);
    // off the lip by the crouch on top (CLIMB_UP_CROUCH_K), the hands on the clip's own targets
    for (const f of within(run.crouchK, 1)) expect(Math.min(f.palm[0], f.palm[1])).toBeGreaterThan(0.3);
  });

  it('the shoulders stay within arm reach of the lip while the hands hold it (k 0.30 to the foot on the top)', () => {
    let worst = 0;
    for (const f of within(0.3, run.footOnK)) worst = Math.max(worst, f.shLip);
    // arm 0.538 m; was 0.88 m (0.47 at 0.30, 0.59 at 0.32, 0.84 at 0.35)
    expect(worst).toBeLessThanOrEqual(run.reach);
  });

  it('the knees never sink into the block, and the head, neck and chest stay clear of the lip', () => {
    let knee = 9;
    let overTop = 9;
    for (const f of within(0.3, 1)) {
      knee = Math.min(knee, f.knee);
      overTop = Math.min(overTop, f.kneeOverTop);
    }
    // the knee joints (r 5 cm) stay out of the block (was 2.4 cm clear), never lower than 10 cm over the top while over it
    expect(knee).toBeGreaterThanOrEqual(0.024);
    expect(overTop).toBeGreaterThan(0.1);
    let head = 9;
    let neck = 9;
    let chest = 9;
    for (const f of within(0.2, 1)) {
      head = Math.min(head, f.head);
      neck = Math.min(neck, f.neck);
      chest = Math.min(chest, f.chest);
    }
    // (were 18.6 / 12.9 / 8.9 cm, all in the pull-up before the knee; the chest's 8.8 cm is there too)
    expect(head).toBeGreaterThan(0.18);
    expect(neck).toBeGreaterThan(0.12);
    expect(chest).toBeGreaterThan(0.085);
    // over the lip with the chest low (k 0.3 - 0.66): the head well clear of the top
    for (const f of within(0.3, run.crouchK)) expect(f.head).toBeGreaterThan(0.3);
  });

  it('no hand jump at the release: the wrists change velocity by at most 3 cm a frame from the let-go to the crouch', () => {
    // from 3 frames before the hands start to let go to k 0.75 (past the crouch, where the released arms settle); 60 Hz.
    // Was 23.5 cm (before traverse-fix-2), 13.7 cm (CLIMB_UP_HANDS 0.52 / 0.12), 5.4 cm (the lip pivot's 0 -> 90 degree
    // flip and the trunk's late rise); now 2.8 cm. The elbows' worst is 6.2 cm there (the arms' swing into the crouch).
    const i0 = run.frames.findIndex((f) => f.k >= run.hands.k0) - 3;
    const i1 = run.frames.findIndex((f) => f.k >= 0.75);
    const span = run.frames.slice(i0 - 2, i1 + 1);
    const wr = motion(span, [9, 10], 2);
    const el = motion(span, [7, 8], 2);
    console.info(`(traverse-fix-2) climb-up release: wrists ${(wr.step * 100).toFixed(1)} / ${(wr.pop * 100).toFixed(1)} cm, elbows ${(el.step * 100).toFixed(1)} / ${(el.pop * 100).toFixed(1)} cm (step / velocity change a frame)`);
    expect(wr.pop).toBeLessThanOrEqual(0.03);
    // the hands' release ends before the crouch, where a climb-up with the stick released ends (the grips drop there)
    expect(run.hands.k0 + run.hands.span).toBeLessThan(run.crouchK);
  });

  it('no new pops: each joint group moves no more per frame than before (60 Hz, the whole exit)', () => {
    const lines: string[] = [];
    for (const [name, group] of Object.entries(GROUPS)) {
      const m = motion(run.frames, group);
      lines.push(`${name} ${(m.step * 100).toFixed(1)} / ${(m.pop * 100).toFixed(1)} cm (before ${BEFORE[name]!.step} / ${BEFORE[name]!.pop})`);
      expect(m.step * 100, `${name} step`).toBeLessThanOrEqual(BEFORE[name]!.step);
      expect(m.pop * 100, `${name} velocity change`).toBeLessThanOrEqual(BEFORE[name]!.pop);
    }
    expect(JOINTS.length).toBe(19);
    console.info(`(traverse-fix-2) climb-up joint steps / velocity changes per frame: ${lines.join('; ')}`);
  });
});
