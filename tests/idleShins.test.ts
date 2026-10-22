// (idle-shins) The idle stance's shank clearance, the anim-audit way (`scripts/anim-audit.mjs` selfShanks: the
// knee -> ankle segments of both legs as capsules of LIMB_RADIUS.shank, the penetration over CLIP_SELF fails). Michael's
// idle `trackMul 0.05` (#103) put the shanks 3.18 cm into each other at frame 0 of every standing row (the audit's
// teleport puts the feet straight into the stance); the base table's idle track is widened just enough. Headless (no
// ground, the procedural idle) reads lower than the in-game audit (0.05: 2.42 here, 3.18 there), so the pin keeps a
// margin under the audit limit.
import { afterEach, describe, expect, it } from 'vitest';
import { ANIM_BASE } from '../src/anim/animBase';
import { CLIP_SELF, LIMB_RADIUS } from '../src/anim/audit/limits';
import { segmentDistance } from '../src/anim/audit/metrics';
import { bodyBaseGet, bodyBaseLoad } from '../src/anim/tune';

type Node = { getAbsolutePosition(): { x: number; y: number; z: number }; computeWorldMatrix(f: boolean): unknown };
const JOINTS = ['kneeL', 'ankleL', 'kneeR', 'ankleR'] as const;

/** The worst selfShanks (m, 0 = clear) over 4 s of idle after a teleport-style feet reset, Wren's rig, idle track `tm`. */
async function idleShanks(tm: number): Promise<number> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  bodyBaseLoad({ ...ANIM_BASE.body, idle: { ...ANIM_BASE.body!.idle, trackMul: tm } });
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const op = operatorRig(scene, (s, h, n) => lib.instance(s, h, n), defaultLook(), 'shins');
  const rig = op.rig as unknown as Record<(typeof JOINTS)[number], Node> & { planner: { L: { init: boolean }; R: { init: boolean } } };
  const pose = { speed: 0, localX: 0, localZ: 0, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, stride: 'facing' as const };
  // 3 s to ease the idle row in (BODY_TAU), then the feet reset as `player.ts` does on a teleport (the audit's `tp`)
  for (let k = 0; k < 180; k++) op.rig.animate(1 / 60, pose);
  rig.planner.L.init = rig.planner.R.init = false;
  const N = 240;
  const cols = JOINTS.map(() => new Float64Array(N * 3));
  for (let k = 0; k < N; k++) {
    op.rig.animate(1 / 60, pose);
    JOINTS.forEach((j, c) => {
      rig[j].computeWorldMatrix(true);
      const p = rig[j].getAbsolutePosition();
      cols[c]!.set([p.x, p.y, p.z], k * 3);
    });
  }
  op.figure.dispose();
  op.rig.dispose();
  scene.dispose();
  return segmentDistance(cols[0]!, cols[1]!, cols[2]!, cols[3]!, 2 * LIMB_RADIUS.shank, CLIP_SELF).worst;
}

afterEach(() => {
  bodyBaseLoad(ANIM_BASE.body);
});

describe('idle-shins: the idle stance keeps the shanks apart (anim-audit selfShanks)', () => {
  it('the base table widens only the idle track (walk / jog / run keep Michael\'s 0.05)', () => {
    expect(bodyBaseGet('idle', 'trackMul')).toBe(0.3);
    expect(bodyBaseGet('walk', 'trackMul')).toBe(0.05);
    expect(bodyBaseGet('jog', 'trackMul')).toBe(0.05);
    expect(bodyBaseGet('run', 'trackMul')).toBe(0.05);
  });

  it('idle trackMul 0.3: under 1 cm headless (the audit reads ~0.8 cm more), 0.05 over the limit', async () => {
    const now = await idleShanks(ANIM_BASE.body!.idle!.trackMul!);
    expect(now).toBeLessThanOrEqual(0.01);
    expect(await idleShanks(0.05)).toBeGreaterThan(CLIP_SELF);
  }, 120000);
});
