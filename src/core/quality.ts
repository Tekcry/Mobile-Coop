/**
 * Graphics settings (pure, unit-tested). 3.0: one renderer for every device, sized for a gaming PC - presets
 * High / Ultra / Epic (default) fill the per-feature settings, changing any feature makes it Custom. Nothing
 * drops quality by device; dynamic resolution is an optional toggle (off by default).
 */
export type GraphicsPreset = 'high' | 'ultra' | 'epic' | 'custom';
/** A named preset (not Custom). */
export type FixedPreset = Exclude<GraphicsPreset, 'custom'>;
export type ShadowQuality = 'off' | 'high' | 'ultra' | 'epic';
export type AaMode = 'fxaa' | 'msaa' | 'taa';
export type TierQuality = 'high' | 'ultra' | 'epic';
/** Reflections: none, screen space, or ray traced through the voxel world (hybrid: screen space first). */
export type ReflectionMode = 'off' | 'ssr' | 'rt';
/** Ray-traced reflections: every pixel, or half (a checkerboard alternating each frame). */
export type RtRes = 'half' | 'full';

/** The per-feature graphics settings a preset fills. */
export interface GraphicsFeatures {
  /** Shadow-casting lights and map resolution (off: none, high: sun + 3 lamps / flashlights at 1K, ultra: 5, epic: 8 at 2K + soft; WebGL's 16 texture units cap it). */
  shadows: ShadowQuality;
  /** Map lights rendered as real per-pixel lights (nearest first). */
  lights: number;
  /** Screen-space ambient occlusion. */
  ao: boolean;
  bloom: boolean;
  /** Reflections on wet / polished floors, steel and puddles. */
  reflections: ReflectionMode;
  rtRes: RtRes;
  /** One-bounce global illumination per lamp circuit (baked when the map loads). */
  gi: boolean;
  /** Volumetric light shafts and height fog. */
  volumetrics: boolean;
  /** Depth of field: aiming and the menu operator. */
  dof: boolean;
  motionBlur: boolean;
  /** Subtle chromatic aberration and lens dirt. */
  lens: boolean;
  aa: AaMode;
  /** Procedural surface textures: pixels per tile (high 512, ultra / epic 1024; epic filters 16x anisotropic). */
  textures: TierQuality;
  /** Mesh detail and draw distances: LOD and animation distances, map clutter. */
  detail: TierQuality;
  /** Particles, debris, weather. */
  effects: TierQuality;
}

export const GRAPHICS_PRESETS: Record<FixedPreset, GraphicsFeatures> = {
  high: { shadows: 'high', lights: 16, ao: true, bloom: true, reflections: 'off', rtRes: 'half', gi: false, volumetrics: false, dof: true, motionBlur: false, lens: false, aa: 'fxaa', textures: 'high', detail: 'high', effects: 'high' },
  ultra: { shadows: 'ultra', lights: 24, ao: true, bloom: true, reflections: 'ssr', rtRes: 'half', gi: false, volumetrics: true, dof: true, motionBlur: false, lens: true, aa: 'msaa', textures: 'ultra', detail: 'ultra', effects: 'ultra' },
  epic: { shadows: 'epic', lights: 32, ao: true, bloom: true, reflections: 'ssr', rtRes: 'half', gi: true, volumetrics: true, dof: true, motionBlur: false, lens: true, aa: 'taa', textures: 'epic', detail: 'epic', effects: 'epic' },
};
export const PRESET_IDS = ['high', 'ultra', 'epic'] as const;
/** Tests only (`?gfx=min`): every feature off, the fewest lights - headless software GL keeps its frame rate. */
export const MIN_FEATURES: GraphicsFeatures = { shadows: 'off', lights: 8, ao: false, bloom: false, reflections: 'off', rtRes: 'half', gi: false, volumetrics: false, dof: false, motionBlur: false, lens: false, aa: 'fxaa', textures: 'high', detail: 'high', effects: 'high' };
export const FEATURE_KEYS = Object.keys(GRAPHICS_PRESETS.epic) as (keyof GraphicsFeatures)[];
export const LIGHT_RANGE = { min: 8, max: 48 } as const;

/** The preset these features equal, else 'custom'. */
export function presetOf(f: GraphicsFeatures): GraphicsPreset {
  for (const id of PRESET_IDS) {
    const p = GRAPHICS_PRESETS[id];
    if (FEATURE_KEYS.every((k) => p[k] === f[k])) return id;
  }
  return 'custom';
}

/** Shadow-casting budget per quality: lamps / flashlights with shadow maps, map size, filtering. */
export interface ShadowSpec {
  /** Sun / moon cascaded shadows (outdoor and roofless maps). */
  sun: boolean;
  cascades: number;
  sunSize: number;
  /** Lamps and flashlights casting shadows (nearest first). */
  casters: number;
  size: number;
  /** Contact-hardening soft shadows (PCSS) instead of PCF. */
  soft: boolean;
}

export function shadowSpec(q: ShadowQuality): ShadowSpec {
  switch (q) {
    case 'off':
      return { sun: false, cascades: 0, sunSize: 0, casters: 0, size: 0, soft: false };
    case 'high':
      return { sun: true, cascades: 2, sunSize: 2048, casters: 3, size: 1024, soft: false };
    case 'ultra':
      return { sun: true, cascades: 3, sunSize: 2048, casters: 5, size: 1024, soft: false };
    case 'epic':
      return { sun: true, cascades: 4, sunSize: 4096, casters: 8, size: 2048, soft: true };
  }
}

/** Surface texture pixels per tile (the atlas is 4 x 4 tiles: 1024 -> 4096 square, two atlases ~170 MB with mips;
 *  larger would not fit a phone's WebGL memory) and anisotropic filtering per tier. */
export const TEXTURE_SIZE: Record<TierQuality, number> = { high: 512, ultra: 1024, epic: 1024 };
export const TEXTURE_ANISO: Record<TierQuality, number> = { high: 4, ultra: 8, epic: 16 };
/** Draw / animation distance multipliers and particle density per tier. */
export const DETAIL_SCALE: Record<TierQuality, number> = { high: 2, ultra: 3, epic: 4 };
export const EFFECT_DENSITY: Record<TierQuality, number> = { high: 1, ultra: 1.5, epic: 2 };

/** The live level the game applies (`QualityTarget.applyQuality`). */
export interface QualityLevel {
  name: GraphicsPreset;
  features: GraphicsFeatures;
  shadow: ShadowSpec;
  /** Particle density (1 = the authored amount). */
  vfxDensity: number;
  /** Map lights rendered as real lights. */
  realLights: number;
  /** LOD / animation distance multiplier. */
  detailScale: number;
  /** Tests (`?gfx=min`): no post stack at all, a few plain lights - the phone-era cost on software GL. */
  minimal: boolean;
  /** TAAU: the scene renders at this fraction of the display's resolution and is resolved up to it (1: off). */
  upscale: number;
  /** Panini projection strength (0: off). */
  panini: number;
}

export function qualityLevel(name: GraphicsPreset, f: GraphicsFeatures, minimal = false, upscale = 1, panini = 0): QualityLevel {
  return {
    minimal,
    upscale: minimal ? 1 : Math.max(0.5, Math.min(1, upscale)),
    panini: minimal ? 0 : Math.max(0, Math.min(1, panini)),
    name,
    features: f,
    shadow: shadowSpec(f.shadows),
    vfxDensity: EFFECT_DENSITY[f.effects],
    realLights: Math.round(Math.min(LIGHT_RANGE.max, Math.max(LIGHT_RANGE.min, f.lights))),
    detailScale: DETAIL_SCALE[f.detail],
  };
}

/** Frame-rate caps offered (0 = off: the display's refresh rate). */
export const FPS_CAPS = [0, 30, 60, 90, 120, 144, 165, 240] as const;

/**
 * Frame limiter (pure): given the time since the last rendered frame, should this display frame render?
 * Allows half a display interval of slack so a 60 cap on a 120 Hz display renders every other frame.
 */
export function capAllows(sinceLastMs: number, cap: number, displayMs: number): boolean {
  if (cap <= 0) return true;
  const want = 1000 / cap;
  return sinceLastMs >= want - Math.min(displayMs, want) * 0.5;
}
