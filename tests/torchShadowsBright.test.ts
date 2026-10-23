/**
 * (lr16pol E, lr16t check A 6; moved here from part B, which could not do it inside `torchShadows.ts` alone) A map with
 * no guard torch slot (a bright map: `addTorchSlots` gives slots to dark maps only) builds no torch shadow atlas - no
 * generators, targets or atlas, `on` false, so `LAMP_TSHADOW` is off and every lit shader loses the atlas sampler - and
 * the light rig's baked pools take no spot shadow map in its place (nothing on such a map moves). Dark maps unchanged.
 */
import { describe, expect, it, vi } from 'vitest';
import { LightRegistry } from '../src/world/lights';
import { addTorchSlots, FLASHLIGHTS } from '../src/world/torches';
import { TORCH_DRAW_SLOTS, TORCH_DRAW_STRIDE } from '../src/world/shadowAccuracy';

/** Two ceiling lamps; `dark`: ambient 0.2 (torch slots added), else 0.9 (none). */
function registry(dark: boolean): LightRegistry {
  const reg = new LightRegistry();
  reg.ambient = dark ? 0.2 : 0.9;
  reg.add({ x: 0, y: 3, z: 0, radius: 8 });
  reg.add({ x: 6, y: 3, z: 0, radius: 8 });
  addTorchSlots(reg);
  return reg;
}

async function engineScene() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  return new Scene(new NullEngine());
}

describe('no torch slot: no torch atlas, no rig spot shadows (lr16pol E, check A 6)', () => {
  it('registryHasTorch follows addTorchSlots', async () => {
    const { registryHasTorch } = await import('../src/world/torchShadows');
    const bright = registry(false);
    const dark = registry(true);
    expect(bright.lights.some((l) => l.kind === 'flashlight')).toBe(false);
    expect(registryHasTorch(bright)).toBe(false);
    expect(dark.lights.filter((l) => l.kind === 'flashlight').length).toBe(FLASHLIGHTS);
    expect(registryHasTorch(dark)).toBe(true);
  });

  it('TorchShadows: a bright registry builds nothing and logs nothing, even where the atlas is supported', async () => {
    const { TorchShadows } = await import('../src/world/torchShadows');
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    for (const dark of [false, true]) {
      const scene = await engineScene();
      const reg = registry(dark);
      const draw = new Float32Array(TORCH_DRAW_SLOTS * TORCH_DRAW_STRIDE);
      const ts = new TorchShadows(scene, reg, { casters: [], torchSlotIds: new Int32Array(TORCH_DRAW_SLOTS).fill(-1) }, draw, [], () => false);
      // (the null engine has no WebGL2 float target: report the GPU's answer as yes)
      vi.spyOn(ts as unknown as { supported: () => boolean }, 'supported').mockReturnValue(true);
      for (const tile of [256, 512, 0, 256]) ts.configure(tile, 8);
      if (!dark) {
        expect(ts.on).toBe(false);
        expect(ts.atlas).toBeNull();
        expect(ts.stats()).toEqual([]);
        // (the frame is a no-op without slots)
        ts.frame(0, 1.6, 0);
        expect(ts.copies).toBe(0);
      } else {
        // a dark map still gets its four slots and the atlas
        expect(ts.on).toBe(true);
        expect(ts.atlas).not.toBeNull();
        expect(ts.stats().length).toBe(TORCH_DRAW_SLOTS);
      }
      ts.dispose();
      scene.getEngine().dispose();
    }
    expect(info).not.toHaveBeenCalled();
    // a dark map on a GPU without the float target still logs its fallback once
    const scene = await engineScene();
    const ts = new TorchShadows(scene, registry(true), { casters: [], torchSlotIds: new Int32Array(TORCH_DRAW_SLOTS).fill(-1) }, new Float32Array(TORCH_DRAW_SLOTS * TORCH_DRAW_STRIDE), [], () => false);
    ts.configure(256, 8);
    ts.configure(512, 8);
    expect(ts.on).toBe(false);
    expect(info).toHaveBeenCalledTimes(1);
    scene.getEngine().dispose();
    info.mockRestore();
  });

  it('LightRig: baked and no torch slot -> no spot shadow map; dark, or not baked, unchanged', async () => {
    const { LightRig } = await import('../src/world/lightRig');
    const cfg = { lights: 8, shadow: { sun: false, cascades: 0, sunSize: 0, casters: 4, size: 64, soft: false, charLamps: 0, charTile: 0 }, volumetric: false, minimal: true };
    const slots = async (dark: boolean, baked: boolean, atlas: boolean): Promise<number> => {
      const scene = await engineScene();
      const reg = registry(dark);
      const r = new LightRig(scene, reg);
      if (baked) r.setBaked(new Set(reg.lights.filter((l) => l.kind !== 'flashlight').map((l) => l.id)));
      r.setTorchShadows(atlas);
      r.configure(cfg);
      const n = r.shadowSlots;
      scene.getEngine().dispose();
      return n;
    };
    // a bright baked map: none (was 2 while the atlas was off; with it on, 0 + the atlas sampler)
    expect(await slots(false, true, false)).toBe(0);
    // a dark baked map: the baked cap's 2 without the atlas, 0 with it (LR16t)
    expect(await slots(true, true, false)).toBe(2);
    expect(await slots(true, true, true)).toBe(0);
    // no baked lamps (the cheap path): the pool shadows the nearest lamps as before
    expect(await slots(false, false, false)).toBe(4);
  });
});
