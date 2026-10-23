// (LR16-6, G102) Thermal through a shut door: who qualifies (warm, in range, a fully shut leaf on the floor line and
// nothing else on the sight line, never the local player or a dog's hidden stand-in rig) and where the figure is drawn
// (each joint slid along its own camera ray to just in front of the leaf, so it looks exactly like the body would).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bodyHeat, closedDoorIndex, doorPlaneFactor, ghostEmissive, ghostWarm, inGhostRange, type GhostDoor } from '../src/vfx/thermalGhost';
import { stampKeptBodies } from '../src/net/keptBodies';
import { heatOf, THERMAL, thermalColor } from '../src/vfx/visionLook';

// a leaf on the line x = 0, hinge (0, -0.5), 1 m wide along +z (yaw 0: edge (sin 0, cos 0))
const door = (open = 0): GhostDoor => ({ open, anchor: { yaw: 0, width: 1, hinge: { x: 0, z: -0.5 } } });
const out = { x: 0, z: 0 };

describe('thermal through a shut door: the pure rules', () => {
  it('the first fully shut leaf on the floor line, by index; a cracked door or a miss is none', () => {
    expect(closedDoorIndex([door()], -3, 0, 2, 0.2, out)).toBe(0);
    expect(out.x).toBeCloseTo(0);
    expect(out.z).toBeCloseTo(0.12);
    expect(closedDoorIndex([door(0.05)], -3, 0, 2, 0, out)).toBe(-1);
    expect(closedDoorIndex([door(1), door()], -3, 0, 2, 0, out)).toBe(1);
    expect(closedDoorIndex([door()], -3, 2, 2, 2, out)).toBe(-1);
    expect(closedDoorIndex([door()], 1, 0, 3, 0, out)).toBe(-1);
  });

  it('range: THERMAL.doorRange from the camera, horizontal', () => {
    const r = THERMAL.doorRange;
    expect(inGhostRange(0, 0, r - 0.01, 0)).toBe(true);
    expect(inGhostRange(0, 0, r * 0.75, r * 0.75)).toBe(false);
  });

  it('warm: a live body (bodyEmit) and a fresh body; cold (thermal off, or cooled past half) is not', () => {
    const e = THERMAL.bodyEmit;
    expect(ghostWarm(e)).toBe(true);
    expect(ghostWarm(0)).toBe(false);
    // a body cools in 1/16 steps (gameState.paintHeat): 8/16 still shows, 7/16 no longer
    expect(ghostWarm((e * 8) / 16)).toBe(true);
    expect(ghostWarm((e * 7) / 16)).toBe(false);
  });

  it('the look: CT dim blue, low on the ramp, whatever the exposure (bodies in the open stay far warmer)', () => {
    const c = thermalColor(THERMAL.doorGhost);
    expect(heatOf(THERMAL.doorGhost)).toBeGreaterThan(0.05);
    expect(heatOf(THERMAL.doorGhost)).toBeLessThan(THERMAL.stops[2]![0]);
    expect(c[2]).toBeGreaterThan(0.7);
    expect(c[0]).toBeLessThan(0.1);
    expect(c[1]).toBeLessThan(0.15);
    expect(heatOf(0.97)).toBeGreaterThan(0.8);
    // the pipeline's exposure 1.08 brightens a display-space colour by 1.08^(1/2.2): divided out
    expect(ghostEmissive(1)).toBeCloseTo(THERMAL.doorGhost, 9);
    expect(ghostEmissive(1.08) * Math.pow(1.08, 1 / 2.2)).toBeCloseTo(THERMAL.doorGhost, 9);
    expect(ghostEmissive(0)).toBeCloseTo(THERMAL.doorGhost, 9);
  });

  it('the figure plane: every point behind the leaf lands THERMAL.doorFront in front of it, on its own camera ray', () => {
    const f0 = THERMAL.doorFront;
    const cx = -3, cz = 0.1;
    for (const [px, pz] of [[0.3, 0.1], [1.0, 0.4], [2, 3], [0.6, -0.4]] as const) {
      const f = doorPlaneFactor(door(), cx, cz, px, pz, f0);
      expect(f).toBeGreaterThan(0);
      expect(f).toBeLessThan(1);
      // on the camera side of the leaf, `doorFront` off its line (the line is x = 0)
      expect(cx + (px - cx) * f).toBeCloseTo(-f0, 9);
    }
    // a point already in front of that plane, or a ray along the leaf, is left where it is
    expect(doorPlaneFactor(door(), cx, cz, -1, 0, f0)).toBe(1);
    expect(doorPlaneFactor(door(), 0.5, -3, 0.5, 3, f0)).toBe(1);
    // a camera closer to the leaf than doorFront: the factor floors at 0.02
    expect(doorPlaneFactor(door(), -0.03, 0, 2, 0, f0)).toBe(0.02);
    // the leaf line behind the camera (the ray meets it at t <= 0): left where it is, not floored
    expect(doorPlaneFactor(door(), -3, 0, -4, 0, f0)).toBe(1);
  });

  it('a body cools on bodyHeat: warm enough for the door figure for the first half of coolTime only', () => {
    expect(bodyHeat(0)).toBe(THERMAL.bodyEmit);
    expect(ghostWarm(bodyHeat(THERMAL.coolTime * 0.45))).toBe(true);
    expect(ghostWarm(bodyHeat(THERMAL.coolTime * 0.6))).toBe(false);
    expect(bodyHeat(THERMAL.coolTime * 2)).toBe(0);
  });
});

describe('thermal through a shut door: the co-op client keeps its bodies cooling (LR16-6 fix)', () => {
  it('stampKeptBodies marks each kept rig a body this frame with its age: past half coolTime it no longer shows', () => {
    const fresh = { rig: { bodyFrame: -1, bodyAge: 0 } };
    const old = { rig: { bodyFrame: -1, bodyAge: 0 } };
    const kept = new Map([['e1', fresh], ['e2', old]]);
    const at = new Map([['e1', 100], ['e2', 100 - THERMAL.coolTime * 0.6]]);
    stampKeptBodies(kept, at, 105, 7);
    expect(fresh.rig.bodyFrame).toBe(7);
    expect(old.rig.bodyFrame).toBe(7);
    expect(fresh.rig.bodyAge).toBeCloseTo(5, 9);
    expect(old.rig.bodyAge).toBeCloseTo(5 + THERMAL.coolTime * 0.6, 9);
    // what paintHeat then gives them (the host's curve): the fresh body ghosts, the old one no longer
    expect(ghostWarm(bodyHeat(fresh.rig.bodyAge))).toBe(true);
    expect(ghostWarm(bodyHeat(old.rig.bodyAge))).toBe(false);
    // a body with no recorded time counts as fresh (age 0)
    const lone = { rig: { bodyFrame: -1, bodyAge: 3 } };
    stampKeptBodies(new Map([['e3', lone]]), at, 105, 8);
    expect(lone.rig.bodyFrame).toBe(8);
    expect(lone.rig.bodyAge).toBe(0);
  });
});

describe('thermal through a shut door: DoorGhosts on a real rig (NullEngine)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('draws a guard behind the shut leaf, in front of it; not when open, blocked, cold, out of range, the player or a stand-in', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, Vector3 } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const { DoorGhosts } = await import('../src/vfx/doorGhosts');
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const mk = (x: number, z: number, k: number) => {
      const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, `tg${k}`, { build: 'average', style: 'detailed' });
      rig.root.position.set(x, 0, z);
      rig.root.computeWorldMatrix(true);
      for (const n of rig.root.getChildTransformNodes(false)) n.computeWorldMatrix(true);
      rig.setHeat(THERMAL.bodyEmit);
      return rig;
    };
    const guard = mk(1.2, 0, 0);
    const player = mk(-1.5, 0, 1);
    const d = { ...door(), index: 0 };
    const doors = { list: [d] } as unknown as ConstructorParameters<typeof DoorGhosts>[1];
    // `Ballistics.hitDistance`: the first hit's distance, or the full length on a miss. `wall`: something on the camera
    // side; `short`: the body-side ray (it starts past the leaf, x > 0) stops this far short of the chest
    let wall = false;
    let short = 0;
    const ray = (a: InstanceType<typeof Vector3>, b: InstanceType<typeof Vector3>): number => {
      const L = Vector3.Distance(a, b);
      if (a.x > 0) return L - short;
      return wall ? 0 : L;
    };
    const gh = new DoorGhosts(scene, doors, ray);
    const cam = new Vector3(-3, 1.6, 0);
    const heads = scene.getMeshByName('doorGhostHeads')!;
    const headX = (): number => (heads as unknown as { _thinInstanceDataStorage: { matrixData: Float32Array } })._thinInstanceDataStorage.matrixData[12]!;

    gh.update(true, cam, [guard, player], player);
    expect(gh.count).toBe(1);
    expect(heads.isEnabled()).toBe(true);
    // the figure stamps its rig (a render-frozen guard keeps solving: GuardAnimTier.animate)
    expect(guard.ghostFrame).toBe(scene.getFrameId());
    expect(player.ghostFrame).toBe(-1);
    // the head drawn on the camera side of the leaf, at doorFront (it looks the same: moved along its camera ray)
    expect(headX()).toBeCloseTo(-THERMAL.doorFront, 3);

    // thermal off: nothing (an instant cut, G100)
    gh.update(false, cam, [guard, player], player);
    expect(gh.count).toBe(0);
    expect(heads.isEnabled()).toBe(false);
    // the door open (the real body shows), a wall or glass on the sight line, cold, a stand-in, out of range
    d.open = 0.3;
    gh.update(true, cam, [guard], player);
    expect(gh.count).toBe(0);
    d.open = 0;
    wall = true;
    gh.update(true, cam, [guard], player);
    expect(gh.count).toBe(0);
    wall = false;
    // the body-side ray: a hit within BODY_SLACK of the chest (his own arm, a prop at his feet) still shows; well short of
    // him (a wall between the leaf and him) blocks
    short = 0.2;
    gh.update(true, cam, [guard], player);
    expect(gh.count).toBe(1);
    short = 0.6;
    gh.update(true, cam, [guard], player);
    expect(gh.count).toBe(0);
    short = 0;
    guard.setHeat(0);
    gh.update(true, cam, [guard], player);
    expect(gh.count).toBe(0);
    guard.setHeat(THERMAL.bodyEmit);
    guard.standIn = true;
    gh.update(true, cam, [guard], player);
    expect(gh.count).toBe(0);
    guard.standIn = false;
    gh.update(true, new Vector3(-THERMAL.doorRange - 1, 1.6, 0), [guard], player);
    expect(gh.count).toBe(0);
    // the player's own rig never, even placed behind a door
    gh.update(true, cam, [guard], guard);
    expect(gh.count).toBe(0);
    gh.update(true, cam, [guard], player);
    expect(gh.count).toBe(1);
    scene.dispose();
  });
});
