// (idle-shins) The teleport stance's shank clearance, the anim-audit way (`scripts/anim-audit.mjs` selfShanks: the
// knee -> ankle segments of both legs as capsules of LIMB_RADIUS.shank, the penetration over CLIP_SELF fails). The
// audit's `tp` resets the foot planner, and `FootPlanner.reset` put the feet on the ideal spots of Michael's idle track
// 0.05 (0.4 cm off the midline), skipping the stance band every free-movement landing keeps: the shanks sat 2.4-3.2 cm
// into each other from the teleport to the first step (frame 0 of every standing row). The mesh never clipped (the
// GLB knees sit wider than the rig's proxy knees); the reset now lands inside the band, the idle track stays 0.05.
import { afterEach, describe, expect, it } from 'vitest';
import { ANIM_BASE } from '../src/anim/animBase';
import { TURN_FOLLOW } from '../src/anim/footPlanner';
import { CLIP_SELF, LIMB_RADIUS } from '../src/anim/audit/limits';
import { segmentDistance } from '../src/anim/audit/metrics';
import { bodyBaseGet, bodyBaseLoad } from '../src/anim/tune';

type Node = { getAbsolutePosition(): { x: number; y: number; z: number }; computeWorldMatrix(f: boolean): unknown };
type Foot = { x: number; z: number; init: boolean };
const JOINTS = ['kneeL', 'ankleL', 'kneeR', 'ankleR'] as const;

/** The worst selfShanks (m, 0 = clear) over 2 s of idle after the audit's teleport, Wren's rig, and the feet's offsets. */
async function teleportShanks(): Promise<{ worst: number; latL: number; latR: number }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/player/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  bodyBaseLoad(ANIM_BASE.body);
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const op = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), 'shins');
  const rig = op.rig as unknown as Record<(typeof JOINTS)[number], Node> & { planner: { L: Foot; R: Foot }; graph: Record<string, number> };
  const pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' as const };
  // 5 s to ease the body rows in (BODY_TAU), then the audit's `tp`: the feet reset as `player.ts` does on a teleport,
  // the idle and still clocks zeroed
  for (let k = 0; k < 300; k++) op.rig.animate(1 / 60, pose);
  rig.planner.L.init = rig.planner.R.init = false;
  rig.graph['idleT'] = 0;
  rig.graph['stillT'] = 0;
  const N = 120;
  const cols = JOINTS.map(() => new Float64Array(N * 3));
  for (let k = 0; k < N; k++) {
    op.rig.animate(1 / 60, pose);
    JOINTS.forEach((j, c) => {
      rig[j].computeWorldMatrix(true);
      const p = rig[j].getAbsolutePosition();
      cols[c]!.set([p.x, p.y, p.z], k * 3);
    });
  }
  // the rig stands at the origin facing +z: the lateral offset is x
  const latL = -rig.planner.L.x;
  const latR = rig.planner.R.x;
  op.figure.dispose();
  op.rig.dispose();
  scene.dispose();
  return { worst: segmentDistance(cols[0]!, cols[1]!, cols[2]!, cols[3]!, 2 * LIMB_RADIUS.shank, CLIP_SELF).worst, latL, latR };
}

afterEach(() => {
  bodyBaseLoad(ANIM_BASE.body);
});

describe('idle-shins: a teleport plants the feet inside the stance band (anim-audit selfShanks)', () => {
  it("the base table keeps Michael's idle track 0.05", () => {
    expect(bodyBaseGet('idle', 'trackMul')).toBe(0.05);
  });

  it('after the reset the feet sit inside the standing band and the shanks clear (2.36 cm before)', async () => {
    const r = await teleportShanks();
    expect(r.latL).toBeGreaterThanOrEqual(TURN_FOLLOW.standMinLateral - 1e-6);
    expect(r.latR).toBeGreaterThanOrEqual(TURN_FOLLOW.standMinLateral - 1e-6);
    expect(r.worst).toBeLessThanOrEqual(0.01);
  }, 120000);
});
