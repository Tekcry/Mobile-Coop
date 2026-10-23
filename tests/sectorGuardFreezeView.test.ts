// (sector-redesign perf) The guard render freeze on a NullEngine scene: guards behind the camera are disabled before
// the evaluation, thawed when the view turns to them, when they die, or when the freeze is disposed; a rig someone else
// disabled is never re-enabled by it; a shadowing lamp in view keeps a guard in its range drawn.
import { describe, expect, it, vi } from 'vitest';
import type { Enemy } from '../src/ai/enemy';

async function setup() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const { SectorGuardFreeze } = await import('../src/game/sectorGuardFreezeView');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new B.Scene(new NullEngine());
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, 0), scene);
  cam.setTarget(new B.Vector3(0, 1.6, 10));
  const lib = new PartLibrary(scene);
  const def = ENEMIES.grunt;
  const guard = (name: string, z: number) => {
    const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, name, { build: def.build, armor: def.plated, merge: true });
    rig.root.position.set(0, 0, z);
    return { alive: true, taken: false, dog: null, def, bodyRig: rig, thawPose: vi.fn() } as unknown as Enemy & { alive: boolean };
  };
  const front = guard('front', 12);
  const back = guard('back', -15);
  const mgr = { enemies: [front, back] };
  const freeze = new SectorGuardFreeze(scene, mgr);
  return { B, scene, cam, front, back, mgr, freeze, guard };
}

describe('sector-redesign perf: SectorGuardFreeze (NullEngine)', () => {
  it('freezes the guard behind the camera, thaws him when the view turns', async () => {
    const { B, scene, cam, front, back, freeze } = await setup();
    scene.render();
    expect(front.bodyRig.root.isEnabled(false)).toBe(true);
    expect(back.bodyRig.root.isEnabled(false)).toBe(false);
    expect(freeze.count).toBe(1);
    // the frozen body is out of the active meshes and its merged meshes report disabled
    for (const m of back.bodyRig.renderMeshes) expect(m.isEnabled()).toBe(false);
    cam.setTarget(new B.Vector3(0, 1.6, -10));
    scene.render();
    expect(back.bodyRig.root.isEnabled(false)).toBe(true);
    expect(front.bodyRig.root.isEnabled(false)).toBe(false);
    expect(scene.getActiveMeshes().data.slice(0, scene.getActiveMeshes().length)).toContain(back.bodyRig.renderMeshes[0]);
    freeze.dispose();
    expect(front.bodyRig.root.isEnabled(false)).toBe(true);
    expect(back.bodyRig.root.isEnabled(false)).toBe(true);
  });

  it('a frozen guard that dies is thawed at the next evaluation; a rig disabled by others stays as it is', async () => {
    const { scene, front, back, freeze } = await setup();
    scene.render();
    expect(back.bodyRig.root.isEnabled(false)).toBe(false);
    (back as { alive: boolean }).alive = false;
    scene.render();
    expect(back.bodyRig.root.isEnabled(false)).toBe(true);
    // someone else hides the front guard: the freeze never shows him
    front.bodyRig.root.setEnabled(false);
    scene.render();
    freeze.dispose();
    expect(front.bodyRig.root.isEnabled(false)).toBe(false);
  });

  it('a shadowing spot lamp in view keeps a guard within its range drawn; out of view it does not', async () => {
    const { B, scene, back } = await setup();
    const lamp = new B.SpotLight('lamp', new B.Vector3(0, 3, -6), new B.Vector3(0, -1, 0), 1.2, 1, scene);
    lamp.shadowMaxZ = 12;
    new B.ShadowGenerator(256, lamp);
    scene.render();
    expect(back.bodyRig.root.isEnabled(false)).toBe(true);
    lamp.intensity = 0;
    scene.render();
    expect(back.bodyRig.root.isEnabled(false)).toBe(false);
  });
});

describe('sector-redesign perf: SectorGuardFreeze occlusion (NullEngine, a fake wall)', () => {
  it('a guard in view behind a wall freezes; the wall gone, he is drawn by the next re-test; a camera cut re-tests at once', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const B = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { SectorGuardFreeze, RETEST } = await import('../src/game/sectorGuardFreezeView');
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const scene = new B.Scene(new NullEngine());
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, 0), scene);
    cam.setTarget(new B.Vector3(0, 1.6, 10));
    const lib = new PartLibrary(scene);
    const def = ENEMIES.grunt;
    const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, 'w', { build: def.build, armor: def.plated, merge: true });
    rig.root.position.set(0, 0, 15);
    const e = { alive: true, taken: false, dog: null, def, bodyRig: rig, thawPose: vi.fn() } as unknown as Enemy;
    // a wall across z = 10, 3 m high, everywhere (rays stop on it)
    let wall = true;
    let rays = 0;
    const ray = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => {
      rays++;
      const full = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
      if (!wall || (a.z - 10) * (b.z - 10) >= 0) return full;
      const t = (10 - a.z) / (b.z - a.z);
      const y = a.y + (b.y - a.y) * t;
      return y < 3 ? full * t : full;
    };
    const f = new SectorGuardFreeze(scene, { enemies: [e] }, ray);
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    expect(f.occluded).toBe(1);
    expect(rays).toBeGreaterThanOrEqual(4);
    // the next RETEST - 1 evaluations reuse the verdict (no rays)
    const r0 = rays;
    for (let k = 0; k < RETEST; k++) scene.render();
    expect(rays - r0).toBeLessThanOrEqual(6);
    wall = false;
    for (let k = 0; k <= RETEST; k++) scene.render();
    expect(rig.root.isEnabled(false)).toBe(true);
    // wall back; a camera cut (a teleport) re-tests a hidden verdict at once, a seen one waits HOLD
    wall = true;
    for (let k = 0; k < 40; k++) scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    wall = false;
    cam.position.set(0.5, 1.6, -3);
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(true);
    f.dispose();
  });
});

// (frzpol) Boxes as a fake static world: the distance to the first box the segment enters (slab test).
type Box = [number, number, number, number, number, number];
function boxRay(boxes: Box[], counter: { n: number }) {
  return (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => {
    counter.n++;
    const d = [b.x - a.x, b.y - a.y, b.z - a.z];
    const o = [a.x, a.y, a.z];
    const full = Math.sqrt(d[0]! ** 2 + d[1]! ** 2 + d[2]! ** 2);
    let best = 1;
    for (const bx of boxes) {
      let t0 = 0;
      let t1 = 1;
      for (let k = 0; k < 3; k++) {
        const lo = bx[k]!;
        const hi = bx[k + 3]!;
        if (Math.abs(d[k]!) < 1e-12) {
          if (o[k]! < lo || o[k]! > hi) t0 = 2;
          continue;
        }
        let ta = (lo - o[k]!) / d[k]!;
        let tb = (hi - o[k]!) / d[k]!;
        if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta);
        t1 = Math.min(t1, tb);
      }
      if (t0 <= t1 && t0 < best) best = t0;
    }
    return best * full;
  };
}

async function frzpolScene() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const V = await import('../src/game/sectorGuardFreezeView');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new B.Scene(new NullEngine());
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, 0), scene);
  cam.setTarget(new B.Vector3(0, 1.6, 10));
  const lib = new PartLibrary(scene);
  const def = ENEMIES.grunt;
  const guard = (name: string, x: number, y: number, z: number) => {
    const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, name, { build: def.build, armor: def.plated, merge: true });
    rig.root.position.set(x, y, z);
    return { alive: true, taken: false, dog: null, def, bodyRig: rig, thawPose: vi.fn() } as unknown as Enemy;
  };
  return { B, V, scene, cam, guard };
}

describe('sector-redesign frzpol: no late show', () => {
  it('the view epoch moving (a door opened) re-tests a hidden guard at the next evaluation', async () => {
    const { V, scene, guard } = await frzpolScene();
    const boxes: Box[] = [[-20, 0, 10, 20, 3, 10.2]];
    const c = { n: 0 };
    let epoch = 0;
    const e = guard('g', 0, 0, 15);
    const f = new V.SectorGuardFreeze(scene, { enemies: [e] }, boxRay(boxes, c), () => epoch);
    scene.render();
    expect(e.bodyRig.root.isEnabled(false)).toBe(false);
    // the wall goes with no epoch move: the verdict waits for the re-test
    boxes.length = 0;
    scene.render();
    expect(e.bodyRig.root.isEnabled(false)).toBe(false);
    // the epoch moves (a door leaf stopped hiding the view): tested and drawn at once
    epoch++;
    scene.render();
    expect(e.bodyRig.root.isEnabled(false)).toBe(true);
    f.dispose();
  });

  it('a hidden guard coming back into the frustum is re-tested at once (no stale verdict)', async () => {
    const { B, V, scene, cam, guard } = await frzpolScene();
    const boxes: Box[] = [[-20, 0, 10, 20, 3, 10.2]];
    const e = guard('g', 0, 0, 15);
    const f = new V.SectorGuardFreeze(scene, { enemies: [e] }, boxRay(boxes, { n: 0 }));
    scene.render();
    expect(f.occluded).toBe(1);
    cam.setTarget(new B.Vector3(0, 1.6, -10));
    scene.render();
    expect(e.bodyRig.root.isEnabled(false)).toBe(false);
    expect(f.occluded).toBe(0);
    // he walks into the open while out of view; the view turns back (no camera move: not a cut)
    boxes.length = 0;
    cam.setTarget(new B.Vector3(0, 1.6, 10));
    scene.render();
    expect(e.bodyRig.root.isEnabled(false)).toBe(true);
    f.dispose();
  });

  it('a guard hidden right behind a wall (near the edge) is re-tested every evaluation; far behind it, every RETEST', async () => {
    const { V, scene, guard } = await frzpolScene();
    const boxes: Box[] = [[-20, 0, 10, 20, 3, 10.2]];
    const c = { n: 0 };
    const near = guard('near', 0, 0, 10.7);
    const f = new V.SectorGuardFreeze(scene, { enemies: [near] }, boxRay(boxes, c));
    scene.render();
    expect(near.bodyRig.root.isEnabled(false)).toBe(false);
    for (let k = 0; k < 3; k++) {
      const r0 = c.n;
      scene.render();
      expect(c.n - r0).toBeGreaterThan(0);
      expect(near.bodyRig.root.isEnabled(false)).toBe(false);
    }
    boxes.length = 0;
    scene.render();
    expect(near.bodyRig.root.isEnabled(false)).toBe(true);
    f.dispose();
    // far behind the wall: the verdict is reused between re-tests
    boxes.push([-20, 0, 10, 20, 3, 10.2]);
    const far = guard('far', 0, 0, 16);
    const c2 = { n: 0 };
    const f2 = new V.SectorGuardFreeze(scene, { enemies: [far] }, boxRay(boxes, c2));
    scene.render();
    const r1 = c2.n;
    for (let k = 0; k < V.RETEST; k++) scene.render();
    expect(c2.n).toBe(r1);
    f2.dispose();
  });

  it("a roof guard hidden by the parapet is drawn while his moon shadow lands on open ground below", async () => {
    const { B, V, scene, guard } = await frzpolScene();
    const sun = new B.DirectionalLight('moon', new B.Vector3(0.8, -0.6, 0), scene);
    new B.ShadowGenerator(256, sun);
    // ground; a block 8.4 m high (x -10..2, z 18..30) with a parapet on its front edge
    const boxes: Box[] = [
      [-100, -1, -100, 100, 0, 100],
      [-10, 0, 18, 2, 8.4, 30],
      [-10, 8.4, 18, 2, 10.5, 18.2],
      // a sign in the air hides where his shadow would fall on his floor's plane past the edge (the old floor point)
      [2, 5, 17, 4, 12, 17.5],
    ];
    const edge = guard('edge', 0, 8.4, 20);
    const f = new V.SectorGuardFreeze(scene, { enemies: [edge] }, boxRay(boxes, { n: 0 }));
    scene.render();
    expect(edge.bodyRig.root.isEnabled(false)).toBe(true);
    f.dispose();
    // the same guard in the middle of the roof: his shadow stays on the roof, he freezes
    const mid = guard('mid', -6, 8.4, 20);
    const f2 = new V.SectorGuardFreeze(scene, { enemies: [mid] }, boxRay(boxes, { n: 0 }));
    scene.render();
    expect(mid.bodyRig.root.isEnabled(false)).toBe(false);
    expect(f2.occluded).toBe(1);
    f2.dispose();
  });
});

describe('sector-redesign artnext C4-C5: the forced head, the over-budget verdict', () => {
  it('a frozen guard (root disabled) forces the same neck / head world pose after animate as an unfrozen twin', async () => {
    const { B, V, scene, guard } = await frzpolScene();
    // twins on the same spot behind the camera: only `a` is in the freeze's list
    const a = guard('twinA', 0.5, 0, -15);
    const b = guard('twinB', 0.5, 0, -15);
    const f = new V.SectorGuardFreeze(scene, { enemies: [a] });
    scene.render();
    expect(a.bodyRig.root.isEnabled(false)).toBe(false);
    expect(b.bodyRig.root.isEnabled(false)).toBe(true);
    // he walks and turns while frozen, glancing aside: the same input on both rigs
    const pose = { speed: 1.4, localX: 0.2, localZ: 1, grounded: true, crouch: 0.3, aimPitch: 0.1, aim: 0.6, kick: 0, lookYaw: 0.5, lookPitch: -0.2, carry: { low: 1, high: 0, compressed: 0 }, weight: 1, armed: true };
    for (let k = 0; k < 40; k++) {
      for (const g of [a, b]) {
        g.bodyRig.root.position.set(0.5 + k * 0.02, 0, -15 - k * 0.01);
        g.bodyRig.root.rotation.y = 0.3 + k * 0.01;
        g.bodyRig.animate(1 / 60, pose);
      }
    }
    scene.render();
    expect(a.bodyRig.root.isEnabled(false)).toBe(false);
    // the gameplay readers' path (takedown hands, bodies, puppets): force the matrix, read the absolute position
    for (const node of ['neck', 'headNode', 'hips'] as const) {
      const na = a.bodyRig[node];
      const nb = b.bodyRig[node];
      na.computeWorldMatrix(true);
      nb.computeWorldMatrix(true);
      const pa = na.getAbsolutePosition();
      const pb = nb.getAbsolutePosition();
      expect(B.Vector3.Distance(pa, pb)).toBeLessThan(1e-6);
      const ma = na.getWorldMatrix().m;
      const mb = nb.getWorldMatrix().m;
      for (let i = 0; i < 16; i++) expect(ma[i]!).toBeCloseTo(mb[i]!, 6);
    }
    // and it is a pose, not the rest: the head moved with the root
    expect(a.bodyRig.headNode.getAbsolutePosition().x).toBeGreaterThan(1);
    f.dispose();
  });

  it('over budget, a due non-edge hidden guard is drawn (STALE = RETEST); a fresh verdict is kept', async () => {
    const { V, scene, guard } = await frzpolScene();
    expect(V.STALE).toBe(V.RETEST);
    const boxes: Box[] = [[-40, 0, 10, 40, 3, 10.2]];
    // 16 guards right behind the wall (near the edge: due every evaluation) fill the TESTS_PER_EVAL budget; one far
    // behind it (a routine RETEST verdict) is last in the list
    const list: Enemy[] = [];
    for (let i = 0; i < 16; i++) list.push(guard(`edge${i}`, -4 + i * 0.5, 0, 10.5));
    const far = guard('far', 0, 0, 16);
    list.push(far);
    const base = boxRay(boxes, { n: 0 });
    const probe = { far: false };
    const ray = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => {
      if (b.z > 13) probe.far = true;
      return base(a, b);
    };
    const f = new V.SectorGuardFreeze(scene, { enemies: list }, ray);
    let last = -1;
    let dueDrawn = 0;
    let kept = 0;
    for (let k = 0; k < 60; k++) {
      probe.far = false;
      scene.render();
      const on = far.bodyRig.root.isEnabled(false);
      if (probe.far) {
        last = k;
        expect(on).toBe(false);
      } else if (last >= 0 && k - last > V.RETEST) {
        // due, not tested this evaluation (the budget went to the edge guards): drawn, not kept stale
        expect(on).toBe(true);
        dueDrawn++;
      } else if (last >= 0) {
        expect(on).toBe(false);
        kept++;
      }
    }
    expect(dueDrawn).toBeGreaterThan(0);
    expect(kept).toBeGreaterThan(0);
    f.dispose();
  });
});

// (artnext C7-C9, artnext 8) The FROZEN tier driven through `GuardAnimTier` (as `Enemy.frame` / `thawPose` / `die` call
// it), not the rig directly: a frozen rig is not animated, the thaw solves at once with the carry and re-plants feet the
// root walked away from; a death while frozen solves at the current place before the ragdoll reads the bones.
describe('sector-redesign artnext C7-C9: the frozen tier, the thaw and the death solve', () => {
  const WALK = { speed: 1.4, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0 };

  async function thawScene() {
    const s = await frzpolScene();
    const { GuardAnimTier } = await import('../src/ai/animTierView');
    const A = await import('../src/ai/animTier');
    const g = s.guard('thawA', 0.5, 0, -15);
    const rig = g.bodyRig;
    const tier = new GuardAnimTier(s.scene, null, 0);
    // what `Enemy.thawPose` does (the freeze calls it from `thaw`)
    (g as unknown as { thawPose: () => void }).thawPose = () => tier.solveNow(rig, 0, WALK);
    const frame = (): void => tier.animate(rig, 1 / 60, WALK, [], false);
    return { ...s, A, g, rig, tier, frame };
  }

  it('frozen frames do not animate; the thaw in the freeze evaluation solves once with the carry and re-plants', async () => {
    const { B, A, V, scene, cam, g, rig, frame } = await thawScene();
    for (let k = 0; k < 20; k++) frame();
    const f = new V.SectorGuardFreeze(scene, { enemies: [g] });
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    const anim = vi.spyOn(rig, 'animate');
    const replant = vi.spyOn(rig, 'replantIfMoved');
    // he walks 1.2 m while frozen: no solve, no glide
    for (let k = 1; k <= 30; k++) {
      rig.root.position.x = 0.5 + k * 0.04;
      frame();
    }
    expect(anim).not.toHaveBeenCalled();
    const foot = rig.planner.L;
    expect(Math.abs(foot.x - rig.root.position.x)).toBeGreaterThan(0.9);
    // the camera turns to him: the freeze thaws him before the evaluation and his pose is solved there
    cam.setTarget(new B.Vector3(0, 1.6, -10));
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(true);
    expect(anim).toHaveBeenCalledTimes(1);
    expect(anim.mock.calls[0]![2]).toBeCloseTo(A.ANIM_TIER_FROZEN_CARRY_MAX, 9);
    expect(replant).toHaveReturnedWith(true);
    // the feet are under him again, not 1.2 m behind
    expect(Math.abs(rig.planner.L.x - rig.root.position.x)).toBeLessThan(0.5);
    expect(Math.abs(rig.planner.R.x - rig.root.position.x)).toBeLessThan(0.5);
    // the next frame is a plain one (the thaw is done): its own dt, no second re-plant check
    replant.mockClear();
    frame();
    expect(anim).toHaveBeenCalledTimes(2);
    expect(anim.mock.calls[1]![2]).toBeCloseTo(1 / 60, 9);
    expect(replant).not.toHaveBeenCalled();
    f.dispose();
  });

  it('a short move while frozen keeps the feet planted (under THAW_REPLANT); a thaw the freeze did not run is the next frame', async () => {
    const { A, rig, tier, frame } = await thawScene();
    for (let k = 0; k < 20; k++) frame();
    rig.root.setEnabled(false);
    rig.root.position.x += A.THAW_REPLANT * 0.5;
    frame();
    frame();
    expect(tier.thawing).toBe(true);
    rig.root.setEnabled(true);
    const anim = vi.spyOn(rig, 'animate');
    const replant = vi.spyOn(rig, 'replantIfMoved');
    frame();
    expect(replant).toHaveReturnedWith(false);
    expect(anim.mock.calls[0]![2]).toBeCloseTo(3 / 60, 9);
    expect(tier.thawing).toBe(false);
  });

  it('a death while frozen (`die`): one solve at his current place before the ragdoll reads the bones', async () => {
    const { A, rig, tier, frame } = await thawScene();
    for (let k = 0; k < 20; k++) frame();
    rig.root.setEnabled(false);
    for (let k = 1; k <= 30; k++) {
      rig.root.position.z = -15 + k * 0.04;
      frame();
    }
    const hips0 = rig.hips.getAbsolutePosition().z;
    const anim = vi.spyOn(rig, 'animate');
    tier.solveNow(rig, A.ANIM_TIER_FROZEN_CARRY_MAX, WALK);
    expect(anim).toHaveBeenCalledTimes(1);
    expect(anim.mock.calls[0]![2]).toBeCloseTo(2 * A.ANIM_TIER_FROZEN_CARRY_MAX, 9);
    rig.hips.computeWorldMatrix(true);
    expect(Math.abs(rig.hips.getAbsolutePosition().z - rig.root.position.z)).toBeLessThan(0.3);
    expect(Math.abs(rig.planner.L.z - rig.root.position.z)).toBeLessThan(0.5);
    expect(Number.isFinite(hips0)).toBe(true);
  });
});
