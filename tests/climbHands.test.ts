// (traverse-fix-2, spare job 8 item 2) The ledge climb-up's hands: the palms stay on the lip while the knee comes on.
import { describe, expect, it } from 'vitest';
import type { Ledge } from '../src/world/anchors';

type V3 = { x: number; y: number; z: number };
interface Frame {
  k: number;
  /** each palm centre's miss from the lip (on the top within 12 cm of the edge, or the face's top 2 cm) */
  palm: [number, number];
  /** the farther shoulder's distance to its hand's grip on the lip */
  shLip: number;
  root: V3;
  hips: V3;
  sh: V3;
  kneeL: V3;
  kneeR: V3;
  footL: V3;
  footR: V3;
  /** clearances (m) from the block of the head, neck and chest spheres (negative: inside) */
  head: number;
  neck: number;
  chest: number;
  /** the knees' clearance from the block (the kneecap: the joint less 5 cm) */
  knee: number;
  /** per node: body-frame then world position */
  pts: number[];
}

/** Runs a ledge hang then the climb-up (CLIMB_UP_TIME + CLIMB_UP_STAND, the stick held) on Wren's rig, as
 *  attachController drives it: the root on CLIMB_UP_PATH, the grips (AttachGrips, attachGripWeight) on the lip. */
async function climb(hz = 60): Promise<{ frames: Frame[]; reach: number }> {
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
  const { attachGripWeight, climbUpFootWeight } = await import('../src/player/moveState');
  const { makeLedge, TraversalAnchors, HANG } = await import('../src/world/anchors');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  // as operatorRig (playerFigure.ts): Wren's build and her own hands
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
  const p = attachPose(lip, s, 1, GAMEPLAY_HEIGHT, { x: 0, y: 0, z: 0, yaw: 0 });
  const end = { x: p.x - lip.nx * (HANG.out + 0.45), y: top, z: p.z - lip.nz * (HANG.out + 0.45) };
  const P = CLIMB_UP_PATH;
  const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const pose = { speed: 0, localX: 0, localZ: 0, grounded: false, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, traverse: 'hang' as 'hang' | 'climbUp', traverseT: 0 };
  rig.root.rotation.y = p.yaw;
  const dt = 1 / hz;
  const reach = rig.p.upperArm.len + rig.p.forearm.len;
  const frames: Frame[] = [];
  const nodes = [rig.hips, rig.spine, rig.torso, rig.neck, rig.headNode, rig.shoulderL, rig.shoulderR, rig.elbowL, rig.elbowR, rig.wristL, rig.wristR, rig.hipL, rig.hipR, rig.kneeL, rig.kneeR, rig.ankleL, rig.ankleR, rig.toeL, rig.toeR];
  const palmV = new Vector3();
  const palm = (side: 1 | -1): number => {
    const hand = side > 0 ? WREN_HANDS.R : WREN_HANDS.L;
    const m = (side > 0 ? rig.wristR : rig.wristL).computeWorldMatrix(true);
    Vector3.TransformCoordinatesFromFloatsToRef(hand.palm[0], hand.palm[1], hand.palm[2], m, palmV);
    const dz = Math.max(0, -palmV.z - 0.02, palmV.z - 0.12);
    const dy = Math.max(0, Math.abs(palmV.y - top) - 0.03);
    return Math.sqrt(dz * dz + dy * dy);
  };
  // clearance of a sphere (centre q, radius r) from the block (z > 0, y < top): negative inside
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
  const N = Math.round((CLIMB_UP_TIME + CLIMB_UP_STAND) * hz);
  for (let n = -Math.round(0.6 * hz); n <= N; n++) {
    const k = n < 0 ? 0 : n / N;
    const exit = n >= 0;
    let y = p.y;
    let fwd = 0;
    let out = 0;
    if (exit) {
      const mid = top - P.lipDrop;
      y = k < P.k1 ? p.y + (Math.max(p.y, mid) - p.y) * smooth(k / P.k1) : Math.max(p.y, mid) + (top - Math.max(p.y, mid)) * smooth((k - P.k1) / (P.k2 - P.k1));
      fwd = smooth((k - P.fwd0) / P.fwdSpan);
      out = Math.sin(Math.PI * Math.min(1, k / P.outK)) * 0.12;
    }
    const w = exit ? attachGripWeight('exit', k, true) : 1;
    g.footW = climbUpFootWeight(exit, k);
    g.update(dt, lip, s, 0, 1, w, rig);
    rig.root.position.set(p.x + (end.x - p.x) * fwd + lip.nx * out + g.lift.x, y + g.lift.y, p.z + (end.z - p.z) * fwd + lip.nz * out + g.lift.z);
    pose.traverse = exit ? 'climbUp' : 'hang';
    pose.traverseT = k;
    rig.animate(dt, pose);
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
    if (!exit) continue;
    const shL = at(rig.shoulderL);
    const shR = at(rig.shoulderR);
    const d = (a: V3, gx: number): number => Math.sqrt((a.x - gx) ** 2 + (a.y - top) ** 2 + (a.z - 0.04) ** 2);
    const kL = at(rig.kneeL);
    const kR = at(rig.kneeR);
    const pts: number[] = [];
    const rp = rig.root.position;
    for (const nd of nodes) {
      const q = nd.getAbsolutePosition();
      pts.push(q.x - rp.x, q.y - rp.y, q.z - rp.z, q.x, q.y, q.z);
    }
    frames.push({
      k,
      palm: [palm(-1), palm(1)],
      shLip: Math.max(d(shL, rig.reachL.x), d(shR, rig.reachR.x)),
      root: { x: rp.x, y: rp.y, z: rp.z },
      hips: at(rig.hips),
      sh: { x: (shL.x + shR.x) / 2, y: (shL.y + shR.y) / 2, z: (shL.z + shR.z) / 2 },
      kneeL: kL,
      kneeR: kR,
      footL: at(rig.ankleL),
      footR: at(rig.ankleR),
      head: clear(at(rig.headNode), 0.11),
      neck: clear(at(rig.neck), 0.07),
      chest: clear(at(rig.torso), 0.12),
      knee: Math.min(clear(kL, 0.05), clear(kR, 0.05)),
      pts,
    });
  }
  scene.dispose();
  return { frames, reach };
}

/** The worst per-frame step and velocity change (m per frame) of the rig's joints, body frame (o 0) or world (o 3). */
function steps(frames: Frame[], o: 0 | 3): { step: number; pop: number; popK: number } {
  let step = 0;
  let pop = 0;
  let popK = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1]!.pts;
    const b = frames[i]!.pts;
    const c = i > 1 ? frames[i - 2]!.pts : null;
    for (let j = o; j < a.length; j += 6) {
      const dx = b[j]! - a[j]!;
      const dy = b[j + 1]! - a[j + 1]!;
      const dz = b[j + 2]! - a[j + 2]!;
      step = Math.max(step, Math.sqrt(dx * dx + dy * dy + dz * dz));
      if (c) {
        const ex = dx - (a[j]! - c[j]!);
        const ey = dy - (a[j + 1]! - c[j + 1]!);
        const ez = dz - (a[j + 2]! - c[j + 2]!);
        const pp = Math.sqrt(ex * ex + ey * ey + ez * ez);
        if (pp > pop) {
          pop = pp;
          popK = frames[i]!.k;
        }
      }
    }
  }
  return { step, pop, popK };
}

const f3 = (v: V3): string => `${v.y.toFixed(2)}/${v.z.toFixed(2)}`;

describe('(traverse-fix-2) the ledge climb-up hands', () => {
  it('measure', async () => {
    const { frames, reach } = await climb(60);
    console.log('reach', reach.toFixed(3));
    for (const f of frames) {
      console.log(
        `k ${f.k.toFixed(3)} palm ${(f.palm[0] * 100).toFixed(1)} ${(f.palm[1] * 100).toFixed(1)} sh ${f.shLip.toFixed(3)} | y/z root ${f3(f.root)} hips ${f3(f.hips)} sh ${f3(f.sh)} kL ${f3(f.kneeL)} kR ${f3(f.kneeR)} fL ${f3(f.footL)} fR ${f3(f.footR)} | knee ${f.knee.toFixed(3)} head ${f.head.toFixed(3)} neck ${f.neck.toFixed(3)} chest ${f.chest.toFixed(3)}`,
      );
    }
    const b = steps(frames, 0);
    const w = steps(frames, 3);
    console.log(`steps body ${(b.step * 100).toFixed(1)} world ${(w.step * 100).toFixed(1)} pops body ${(b.pop * 100).toFixed(1)} (k ${b.popK.toFixed(3)}) world ${(w.pop * 100).toFixed(1)} (k ${w.popK.toFixed(3)}) cm`);
    expect(frames.length).toBeGreaterThan(10);
  });
});
