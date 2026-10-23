/**
 * (lr16pol B, lr15-check 1 + lr16t check A 7) Small lit surfaces that sit in the level - the chain-link fences, the
 * zipline / rappel ropes, the co-op rope line, the bullet decals - shade as the level beside them, so the guard torches
 * light them too: the lamp plugin draws the torches (`shadowAccuracy.TORCH_DRAW_GLSL`, `LAMP_TORCH`) only on PBR
 * materials, never on its standard-material path. Where the level material is PBR (`LevelBuilder.build` with an atlas,
 * the default) they get a PBR material with the level's own settings; on the standard / `?gfx=min` path they keep
 * `StandardMaterial`, as the level does. Not marked as level (`markLampLevel`): the night-vision fill cap applies as on
 * props. Load time only.
 */
import { PBRMaterial, type Color3, type Scene } from '../core/babylon';

/** The level is drawn with PBR: its own material (marked by `bakedLamps.markLampLevel`, read here as `isLampLevel`
 *  does, so `vfx` takes no import of the lamp plugin) is a `PBRMaterial`. Call after the level is built. */
export function levelIsPbr(scene: Scene): boolean {
  const ms = scene.materials;
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i]!;
    if (m instanceof PBRMaterial && (m.metadata as { lampLevel?: boolean } | null)?.lampLevel) return true;
  }
  return false;
}

/**
 * A PBR material with the level material's settings (`levelBuilder.ts` `build`: matte, no metal, range falloff, the
 * direct light x PI as the standard material saw it, the probe's light at 0.6, blurred by roughness). `srgb`: the
 * authored colour, linearised here. The caller sets alpha, culling and freeze as its standard material had them.
 */
export function levelPbrMaterial(name: string, scene: Scene, srgb: Color3): PBRMaterial {
  const pm = new PBRMaterial(name, scene);
  pm.albedoColor = srgb.toLinearSpace();
  pm.metallic = 0;
  pm.roughness = 1;
  pm.usePhysicalLightFalloff = false;
  pm.directIntensity = Math.PI;
  pm.environmentIntensity = 0.6;
  pm.realTimeFiltering = true;
  return pm;
}
