/**
 * Graphics settings (pure, unit-tested). 3.1: one preset ladder for every device - Low / Medium / High / Ultra
 * (the iPhone 17 Pro Max target: 60 fps at Ultra, native) and Epic (PC only) - filling the per-feature settings; changing any
 * feature makes it Custom. Phones never get Epic or the passes in `MOBILE_OFF` (`forPlatform`). Gameplay never depends on
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
 * Phones' output resolution (3.1.9, Settings > Graphics > Output resolution): native (0, the default - the phone
 * target is 60 fps at Ultra, native) or at most 2 / 1.5 device pixels per CSS pixel (2 on a 3x phone is 2.25x fewer
 * pixels; every full-resolution pass costs with it).
 */
export const PHONE_OUTPUTS = [0, 2, 1.5] as const;
export const PHONE_OUTPUT_DEFAULT = 0;
/** Phones' frame-rate target (3.1.9): Target frame rate starts at 60 there (the governor holds it). */
export const PHONE_FPS = 60;
/**
 * Phones (3.1.9, for 120 fps): the passes that cost the most for the least - ambient occlusion (the voxels darken
 * corners themselves), screen-space reflections, depth of field, motion blur and lens effects - are off whatever the
 * preset. Lighting, shadows, bounce light and light shafts stay.
 */
export const MOBILE_OFF: Readonly<Partial<GraphicsFeatures>> = { ao: false, reflections: 'off', dof: false, motionBlur: false, lens: false };
/** Phones (3.2.2): surface textures at most High (512 a tile: Ultra's 1024 doubled the atlases' memory for a 6" screen). */
const mobileTextures = (t: TierQuality): TierQuality => (t === 'ultra' || t === 'epic' ? 'high' : t);
/** What phones list (Epic and ray-traced reflections are PC only). */
export const MOBILE_PRESET_IDS = ['low', 'medium', 'high', 'ultra'] as const;
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
/** Phones (3.1.9): Ultra renders native (no upscaling); the rest as on PC. */
export function presetDisplay(p: FixedPreset, mobile: boolean): { renderScale: number; upscaler: 'off' | 'taau' } {
  return mobile && p === 'ultra' ? { renderScale: 1, upscaler: 'off' } : PRESET_DISPLAY[p];
}
/**
 * 3.3 phones: one fixed look - no presets, no graphics settings. Built for 60 fps on the iPhone 17 Pro Max at 75 - 100%
 * of the native resolution (TAAU to native): the moon's shadows in one cascade and one flashlight shadow, bounce
 * light, the height fog; no ambient occlusion, reflections, bloom, light shafts, depth of field, motion blur or lens
 * effects; the fine prop layer off. With `PHONE_CUTS` (the lamps pre-mixed into a light volume, plain voxel
 * surfaces).
 */
export const PHONE_FEATURES: GraphicsFeatures = { shadows: 'medium', lights: 8, ao: false, bloom: false, reflections: 'off', rtRes: 'half', gi: true, volumetrics: false, volLights: 2, postRes: 'half', dof: false, motionBlur: false, lens: false, aa: 'fxaa', textures: 'medium', detail: 'medium', effects: 'medium' };
/** Phones' shadows: the moon in one 1024 cascade, one flashlight at 512. */
export const PHONE_SHADOW: ShadowSpec = { sun: true, cascades: 1, sunSize: 1024, casters: 1, size: 512, soft: false };
/** Phone render cuts made when the map loads (the Phone check puts each back for a run). */
export interface PhoneCuts {
  /** The lamps mixed into one light volume (two taps a pixel) instead of a loop over up to eight lamps. */
  lampVolume: boolean;
  /** Voxel surfaces without ambient occlusion, worn edges or the surface texture taps. */
  plainVoxels: boolean;
}
export const PHONE_CUTS: Readonly<PhoneCuts> = { lampVolume: true, plainVoxels: true };
export const NO_CUTS: Readonly<PhoneCuts> = { lampVolume: false, plainVoxels: false };
/**
 * Phones' render resolution (x native, TAAU to native): the frame governor's ladder from the top down - never under
 * 75% (`PHONE_FLOOR`); still missing 60 there, the game holds a steady 30 (`PHONE_FPS_FALLBACK`). A match starts at
 * the floor and steps up when there is room.
 */
export const PHONE_SCALES = [1, 0.92, 0.84, 0.75] as const;
export const PHONE_FLOOR = 0.75;
export const PHONE_FPS_FALLBACK = 30;

/** Tests only (`?gfx=min`): every feature off, the fewest lights - headless software GL keeps its frame rate. */
export const MIN_FEATURES: GraphicsFeatures = { shadows: 'off', lights: 8, ao: false, bloom: false, reflections: 'off', rtRes: 'half', gi: false, volumetrics: false, volLights: 2, postRes: 'half', dof: false, motionBlur: false, lens: false, aa: 'fxaa', textures: 'high', detail: 'high', effects: 'high' };

/** Phones: no Epic (Ultra instead) and none of `MOBILE_OFF`; the rest as chosen. */
export function forPlatform(name: GraphicsPreset, f: GraphicsFeatures, mobile: boolean): { name: GraphicsPreset; features: GraphicsFeatures } {
  if (!mobile) return { name, features: f };
  const g = name === 'epic' ? GRAPHICS_PRESETS.ultra : f;
  return { name: name === 'epic' ? 'ultra' : name, features: { ...g, ...MOBILE_OFF, textures: mobileTextures(g.textures) } };
}
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
}

/**
 * Lamp / flashlight shadow maps a material can take (3.1.7): WebGL guarantees 16 textures per shader and the largest
 * material (the voxel level) already uses 11 without lamp shadows - one each (PCF) fits 4 (headless software GL allows
 * 32, so only real GPUs failed). `e2e-desktop` checks every material against 16.
 */
export const MAX_SHADOW_CASTERS = 4;

export function shadowSpec(q: ShadowQuality): ShadowSpec {
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

/**
 * Phones (3.2.2): the moon's maps at most 1024 (Ultra's 3 x 2048 cascades took 72 MB with their depth buffers) and one
 * flashlight shadow (every shadowed light is sampled by every pixel, lit or idle).
 */
export function mobileShadow(s: ShadowSpec): ShadowSpec {
  return { ...s, sunSize: Math.min(s.sunSize, 1024), size: Math.min(s.size, 1024), casters: Math.min(s.casters, 1) };
}

/** Surface texture pixels per tile (the atlas is 4 x 4 tiles: 1024 -> 4096 square, two atlases ~170 MB with mips;
 *  larger would not fit a phone's WebGL memory) and anisotropic filtering per tier. */
export const TEXTURE_SIZE: Record<TierQuality, number> = { low: 256, medium: 512, high: 512, ultra: 1024, epic: 1024 };
export const TEXTURE_ANISO: Record<TierQuality, number> = { low: 2, medium: 4, high: 4, ultra: 8, epic: 16 };
/** Draw / animation distance multipliers and particle density per tier. */
export const DETAIL_SCALE: Record<TierQuality, number> = { low: 1, medium: 1.5, high: 2, ultra: 3, epic: 4 };
export const EFFECT_DENSITY: Record<TierQuality, number> = { low: 0.4, medium: 0.7, high: 1, ultra: 1.5, epic: 2 };
/** Voxel sizes per Detail tier (m): the structure, the prop layer (0: props on the structure layer), characters and
 *  weapons (with their level of detail). Low halves the resolution; the levels of detail still double from there. */
export const VOXEL_TIER: Record<TierQuality, { size: number; fine: number; character: number; weapon: number }> = {
  // (one structure size on every preset: what hides a player must look the same for everyone)
  low: { size: 0.05, fine: 0, character: 0.04, weapon: 0.02 },
  medium: { size: 0.05, fine: 0, character: 0.02, weapon: 0.01 },
  high: { size: 0.05, fine: 0.025, character: 0.02, weapon: 0.01 },
  ultra: { size: 0.05, fine: 0.025, character: 0.02, weapon: 0.01 },
  epic: { size: 0.05, fine: 0.025, character: 0.02, weapon: 0.01 },
};

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
  /** A phone: cheaper bloom (3.1.9). */
  mobile: boolean;
  /** 3.3: the fixed phone look (`PHONE_FEATURES`; its name is not a preset). */
  phone: boolean;
}

export function qualityLevel(name: GraphicsPreset, f: GraphicsFeatures, minimal = false, upscale = 1, panini = 0, mobile = false, phone = false): QualityLevel {
  return {
    minimal,
    mobile,
    phone: phone && !minimal,
    upscale: minimal ? 1 : Math.max(0.5, Math.min(1, upscale)),
    panini: minimal ? 0 : Math.max(0, Math.min(1, panini)),
    name,
    features: f,
    // (the phone look's own shadows unless a Phone check run changes them)
    shadow: phone && f.shadows === PHONE_FEATURES.shadows ? PHONE_SHADOW : mobile ? mobileShadow(shadowSpec(f.shadows)) : shadowSpec(f.shadows),
    vfxDensity: EFFECT_DENSITY[f.effects],
    realLights: Math.round(Math.min(LIGHT_RANGE.max, Math.max(LIGHT_RANGE.min, f.lights))),
    detailScale: DETAIL_SCALE[f.detail],
  };
}

/** The level's name for logs: the preset, or "phone" (3.3). */
export function levelLabel(q: QualityLevel): string {
  return q.phone ? 'phone' : q.name;
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
