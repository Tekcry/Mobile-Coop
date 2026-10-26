/**
 * (gm-mc-polish L1) The G8 caster cull is guard-model work: with `flags.guardModels` off the light rig's shadow-map
 * caster lists keep a disabled mesh (the RTT skips it while disabled) and no caster's enabled-state change marks a
 * refill, as before G8; with the flag on a disabled mesh is left out and a toggle refills at the next frame.
 * NullEngine, the real `LightRig`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { AbstractMesh } from '../src/core/babylon';

afterEach(async () => {
  const { flags } = await import('../src/core/flags');
  flags.guardModels = false;
});

async function setup(on: boolean) {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { LightRegistry } = await import('../src/world/lights');
  const { LightRig } = await import('../src/world/lightRig');
  const { flags } = await import('../src/core/flags');
  flags.guardModels = on;
  const scene = new B.Scene(new NullEngine());
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, -3), scene);
  scene.activeCamera = cam;
  const reg = new LightRegistry();
  const torch = reg.add({ kind: 'flashlight', x: 0, y: 1.45, z: 0, radius: 13, intensity: 0.85, cone: null, on: true, destructible: false, electric: false });
  torch.reach = 8;
  const rig = new LightRig(scene, reg);
  rig.configure({ lights: 1, shadow: { sun: false, cascades: 0, sunSize: 0, casters: 1, size: 64, soft: false, charLamps: 0, charTile: 0 }, volumetric: false, minimal: true });
  const a = B.CreateBox('a', { size: 1 }, scene);
  const b = B.CreateBox('b', { size: 1 }, scene);
  a.position.set(1, 0.5, 2);
  b.position.set(-1, 0.5, 2);
  a.computeWorldMatrix(true);
  b.computeWorldMatrix(true);
  rig.addCaster(a);
  rig.addCaster(b);
  const list = (): string[] => (scene.getLightByName('maplight-shadow-0')!.getShadowGenerator()!.getShadowMap()!.renderList ?? []).map((m: AbstractMesh) => m.name);
  const pick = (): void => {
    reg.version++;
    rig.update(1, 0, 1.6, -3);
  };
  /** A frame between picks (`pickT` still positive). */
  const between = (): void => rig.update(0.01, 0, 1.6, -3);
  return { scene, a, b, list, pick, between };
}

describe('light rig caster lists: the G8 cull behind flags.guardModels', () => {
  it('flag off: a disabled caster stays listed, its toggles mark no refill (no observer)', async () => {
    const { scene, a, b, list, pick, between } = await setup(false);
    expect(a.onEffectiveEnabledStateChangedObservable.hasObservers()).toBe(false);
    pick();
    expect(list()).toEqual(['a', 'b']);
    b.setEnabled(false);
    pick();
    expect(list()).toEqual(['a', 'b']);
    // a re-enabled caster is already in the list between picks (as before G8)
    b.setEnabled(true);
    between();
    expect(list()).toEqual(['a', 'b']);
    scene.dispose();
  });

  it('flag on: a disabled caster leaves the lists, a toggle refills them at the next frame (no pick)', async () => {
    const { scene, a, b, list, pick, between } = await setup(true);
    expect(a.onEffectiveEnabledStateChangedObservable.hasObservers()).toBe(true);
    pick();
    expect(list()).toEqual(['a', 'b']);
    b.setEnabled(false);
    between();
    expect(list()).toEqual(['a']);
    b.setEnabled(true);
    between();
    expect(list()).toEqual(['a', 'b']);
    scene.dispose();
  });
});
