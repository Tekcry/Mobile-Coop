/**
 * coop-fix: `LampPlugin` (baked lamps) rides on every PBR material, including the shared figure asset materials. A
 * figure loaded later clones its glow material; Babylon rebuilds a cloned plugin by class name (`Tools.Instantiate`),
 * which fails for the unregistered class and aborted the whole partner figure load (the host invisible on the joiner).
 * The plugin is `doNotSerialize`, so a clone carries none.
 */
import { describe, expect, it } from 'vitest';

describe('LampPlugin and material clones', () => {
  it('a material carrying the plugin clones without throwing, and the clone has no plugin', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene, PBRMaterial } = await import('../src/core/babylon');
    const { LampPlugin } = await import('../src/world/bakedLamps');
    const scene = new Scene(new NullEngine());
    const mat = new PBRMaterial('asset', scene);
    const lamps = { volume: null } as unknown as ConstructorParameters<typeof LampPlugin>[1];
    const plugin = new LampPlugin(mat, lamps);
    expect(plugin.doNotSerialize).toBe(true);
    expect(mat.pluginManager?.getPlugin('BakedLamps')).toBe(plugin);
    let clone: InstanceType<typeof PBRMaterial> | undefined;
    expect(() => { clone = mat.clone('asset-glow') as InstanceType<typeof PBRMaterial>; }).not.toThrow();
    expect(clone).toBeDefined();
    expect(clone!.pluginManager?.getPlugin('BakedLamps') ?? null).toBeNull();
    scene.dispose();
  });
});
