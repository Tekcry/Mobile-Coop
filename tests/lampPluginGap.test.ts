/**
 * Backlog 30: `BakedLamps.frame` attached the lamp plugin to new materials only when `scene.materials.length` changed,
 * so a material made in the same frame another was disposed stayed without the plugin (unlit by the baked lamps, a
 * light parity break). The scene's new-material event now marks the next frame to attach.
 */
import { describe, expect, it } from 'vitest';

describe('BakedLamps material attach', () => {
  it('a material added in the frame another is disposed still gets the plugin', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, PBRMaterial, StandardMaterial } = await import('../src/core/babylon');
    const { BakedLamps } = await import('../src/world/bakedLamps');
    const scene = new Scene(new NullEngine());
    // (only the fields `attachAll` / `frame` read on the PBR path with no doors, capsules or volume: the bake itself is
    // not under test)
    const lamps = Object.create(BakedLamps.prototype) as InstanceType<typeof BakedLamps>;
    Object.assign(lamps, {
      scene, plugins: new Set(), standard: false, matCount: -1, version: 0, reg: { version: 0 }, doors: [],
      capsules: null, volume: null, caps: 0, moonTex: null, fillTex: null, skyTex: null, vis: { dispose() {} }, data: { dispose() {} },
    });
    const has = (m: { pluginManager?: { getPlugin(n: string): unknown } | null }): boolean => !!m.pluginManager?.getPlugin('BakedLamps');
    // (Babylon notifies a new material a tick later, `TimingTools.SetImmediate`; render frames are further apart)
    const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
    const old = new PBRMaterial('old', scene);
    lamps.attachAll();
    expect(has(old)).toBe(true);
    lamps.frame();
    // (one frame: a material disposed and another made; the count is unchanged)
    const count = scene.materials.length;
    old.dispose();
    const made = new PBRMaterial('made', scene);
    const unlit = new StandardMaterial('std', scene);
    unlit.dispose();
    expect(scene.materials.length).toBe(count);
    await tick();
    lamps.frame();
    expect(has(made)).toBe(true);
    // (the filter is unchanged: a standard material on the PBR path gets none)
    const std = new StandardMaterial('std2', scene);
    await tick();
    lamps.frame();
    expect(has(std)).toBe(false);
    // (an add alone still attaches)
    const late = new PBRMaterial('late', scene);
    await tick();
    lamps.frame();
    expect(has(late)).toBe(true);
    // (dispose drops the scene observer; Babylon removes it a tick later)
    const before = scene.onNewMaterialAddedObservable.observers.length;
    lamps.dispose();
    await tick();
    expect(scene.onNewMaterialAddedObservable.observers.length).toBe(before - 1);
    scene.dispose();
  });
});
