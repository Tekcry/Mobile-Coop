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
    return { alive: true, taken: false, dog: null, def, bodyRig: rig } as unknown as Enemy & { alive: boolean };
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
    const e = { alive: true, taken: false, dog: null, def, bodyRig: rig } as unknown as Enemy;
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
