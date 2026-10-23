import { charShadowSpec, type CharShadowMode } from '../world/charShadowSet';

/**
 * Graphics settings (pure, unit-tested). 3.1: one preset ladder - Low / Medium / High / Ultra / Epic - filling the
 * per-feature settings; changing any feature makes it Custom. Gameplay never depends on
 * the preset (collision, cover, nav, perception and fog visibility are the same on every one).
 */
export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra' | 'epic' | 'custom';
/** A named preset (not Custom). */
export type FixedPreset = Exclude<GraphicsPreset, 'custom'>;
export type ShadowQuality = 'off' | 'low' | 'medium' | 'high' | 'ultra' | 'epic';
export type AaMode = 'fxaa' | 'msaa' | 'taa';
export type TierQuality = 'low' | 'medium' | 'high' | 'ultra' | 'epic';
/** Post passes (SSAO, SSR) at half or full resolution. */
export type PostRes = 'half' | 'full';
/** Reflections: none, screen space, or 'rt' (kept for saved settings: runs screen space since voxel-retire). */
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
  /** Volumetric light shafts (the height fog is drawn on every preset: it decides what you can see). */
  volumetrics: boolean;
  /** Lights the volumetric pass scatters (nearest first; 2..12). */
  volLights: number;
  postRes: PostRes;
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
  low: { shadows: 'low', lights: 8, ao: false, bloom: false, reflections: 'off', rtRes: 'half', gi: false, volumetrics: false, volLights: 2, postRes: 'half', dof: false, motionBlur: false, lens: false, aa: 'fxaa', textures: 'low', detail: 'low', effects: 'low' },
  medium: { shadows: 'medium', lights: 12, ao: true, bloom: true, reflections: 'off', rtRes: 'half', gi: true, volumetrics: true, volLights: 6, postRes: 'half', dof: false, motionBlur: false, lens: false, aa: 'fxaa', textures: 'medium', detail: 'medium', effects: 'medium' },
  high: { shadows: 'high', lights: 16, ao: true, bloom: true, reflections: 'ssr', rtRes: 'half', gi: true, volumetrics: true, volLights: 6, postRes: 'half', dof: true, motionBlur: false, lens: false, aa: 'fxaa', textures: 'high', detail: 'high', effects: 'high' },
  ultra: { shadows: 'ultra', lights: 20, ao: true, bloom: true, reflections: 'ssr', rtRes: 'half', gi: true, volumetrics: true, volLights: 8, postRes: 'full', dof: true, motionBlur: false, lens: false, aa: 'taa', textures: 'ultra', detail: 'ultra', effects: 'ultra' },
  epic: { shadows: 'epic', lights: 32, ao: true, bloom: true, reflections: 'ssr', rtRes: 'half', gi: true, volumetrics: true, volLights: 12, postRes: 'full', dof: true, motionBlur: false, lens: true, aa: 'taa', textures: 'epic', detail: 'epic', effects: 'epic' },
};
export const PRESET_IDS = ['low', 'medium', 'high', 'ultra', 'epic'] as const;
/**
 * A preset's render resolution: the scale and TAAU (the frame governor adapts within it). Epic renders native; the
 * rest render smaller and resolve to full resolution over frames, so the picture stays sharp.
 */
export const PRESET_DISPLAY: Record<FixedPreset, { renderScale: number; upscaler: 'off' | 'taau' }> = {
  low: { renderScale: 0.67, upscaler: 'taau' },
  medium: { renderScale: 0.75, upscaler: 'taau' },
  high: { renderScale: 0.85, upscaler: 'taau' },
  ultra: { renderScale: 0.9, upscaler: 'taau' },
  epic: { renderScale: 1, upscaler: 'off' },
};
/** Tests (`?gfx=min`) and phones (G182): every feature off, the fewest lights - headless software GL keeps its frame rate. */
export const MIN_FEATURES: GraphicsFeatures = { shadows: 'off', lights: 8, ao: false, bloom: false, reflections: 'off', rtRes: 'half', gi: false, volumetrics: false, volLights: 2, postRes: 'half', dof: false, motionBlur: false, lens: false, aa: 'fxaa', textures: 'high', detail: 'high', effects: 'high' };

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
  /** 3.1 Low: the moon shades only the level; characters and props get contact blobs. */
  staticSun?: boolean;
  /** (LR14) Lamps given a character silhouette shadow map (the nearest; 0: capsule shadows only) and each one's atlas
   *  tile (px): one more texture per lit shader while on (`world/charShadows.ts`). */
  charLamps: number;
  charTile: number;
}

/**
 * Lamp / flashlight shadow maps a material can take (3.1.7): WebGL guarantees 16 textures per shader and the largest
 * material (the voxel-era level) already uses 11 without lamp shadows - one each (PCF) fits 4 (headless software GL allows
 * 32, so only real GPUs failed). `e2e-desktop` checks every material against 16, before and after the guards alert.
 * (Since the lamp bake the level's micro-detail shader takes 15 without a lamp shadow: `LightRig` caps the pool at one there.)
 */
export const MAX_SHADOW_CASTERS = 4;

/** `charMode`: the character shadow override (LR14, Settings > Graphics; 'auto' = the tier's). */
export function shadowSpec(q: ShadowQuality, charMode: CharShadowMode = 'auto'): ShadowSpec {
  const c = charShadowSpec(q, charMode);
  return { ...shadowBase(q), charLamps: c.lamps, charTile: c.tile };
}

function shadowBase(q: ShadowQuality): Omit<ShadowSpec, 'charLamps' | 'charTile'> {
  switch (q) {
    case 'off':
      return { sun: false, cascades: 0, sunSize: 0, casters: 0, size: 0, soft: false };
    case 'low':
      return { sun: true, cascades: 1, sunSize: 1024, casters: 0, size: 0, soft: false, staticSun: true };
    case 'medium':
      return { sun: true, cascades: 2, sunSize: 1024, casters: 2, size: 512, soft: false };
    case 'high':
      return { sun: true, cascades: 2, sunSize: 2048, casters: 3, size: 1024, soft: false };
    case 'ultra':
      return { sun: true, cascades: 3, sunSize: 2048, casters: 4, size: 1024, soft: false };
    case 'epic':
      // (3.1.7: 4 lamp casters, as Ultra - 8 soft ones took the level's shaders past WebGL's 16 textures: on the
      // laptop the level drew black under fog; Epic keeps the bigger maps and the moon's 4 high-quality cascades)
      return { sun: true, cascades: 4, sunSize: 4096, casters: MAX_SHADOW_CASTERS, size: 2048, soft: true };
  }
}

/** Surface texture pixels per tile (the atlas is 4 x 4 tiles: 1024 -> 4096 square, two atlases ~170 MB with mips;
 *  larger would not fit WebGL memory) and anisotropic filtering per tier. */
export const TEXTURE_SIZE: Record<TierQuality, number> = { low: 256, medium: 512, high: 512, ultra: 1024, epic: 1024 };
export const TEXTURE_ANISO: Record<TierQuality, number> = { low: 2, medium: 4, high: 4, ultra: 8, epic: 16 };
/** Draw / animation distance multipliers and particle density per tier. */
export const DETAIL_SCALE: Record<TierQuality, number> = { low: 1, medium: 1.5, high: 2, ultra: 3, epic: 4 };
export const EFFECT_DENSITY: Record<TierQuality, number> = { low: 0.4, medium: 0.7, high: 1, ultra: 1.5, epic: 2 };

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
  /** Tests (`?gfx=min`) and phones (G182): no post stack at all, a few plain lights - cheap on software GL. */
  minimal: boolean;
  /** TAAU: the scene renders at this fraction of the display's resolution and is resolved up to it (1: off). */
  upscale: number;
  /** Panini projection strength (0: off). */
  panini: number;
}

/** `charMode`: the character shadow override (LR14). */
export function qualityLevel(name: GraphicsPreset, f: GraphicsFeatures, minimal = false, upscale = 1, panini = 0, charMode: CharShadowMode = 'auto'): QualityLevel {
  return {
    minimal,
    upscale: minimal ? 1 : Math.max(0.5, Math.min(1, upscale)),
    panini: minimal ? 0 : Math.max(0, Math.min(1, panini)),
    name,
    features: f,
    shadow: shadowSpec(f.shadows, minimal ? 'off' : charMode),
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
/**
 * Frame limiter by deadline (pure): the time of this display frame and the next render deadline (0: none yet) give
 * the next deadline when the frame renders, or -1 to skip it. Deadlines step by the cap's interval, so a 60 cap holds
 * 60 on a 90 Hz display (2 frames of 3) as on 120 Hz (every other); a frame late by a whole interval restarts the
 * clock. (A 90 Hz phone drew 90 fps under capAllows: its 5.6 ms slack let every 11.1 ms frame through.)
 */
export const CAP_SLACK_MS = 2;
export function capNext(t: number, next: number, cap: number): number {
  const want = 1000 / cap;
  if (next > 0 && t < next - CAP_SLACK_MS) return -1;
  return next > 0 && t - next < want ? next + want : t + want;
}

export function capAllows(sinceLastMs: number, cap: number, displayMs: number): boolean {
  if (cap <= 0) return true;
  const want = 1000 / cap;
  return sinceLastMs >= want - Math.min(displayMs, want) * 0.5;
}
