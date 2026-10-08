/**
 * Display maths (3.0, pure): ultrawide field of view, the HUD's safe width and the GPU check. Babylon / DOM free.
 */

export type HudWidth = 'auto' | '16:9' | '21:9' | 'full';
export const HUD_WIDTHS: readonly HudWidth[] = ['auto', '16:9', '21:9', 'full'];

const RAD = Math.PI / 180;

/**
 * The vertical FOV (radians) for a horizontal setting given at 16:9 on a screen of `aspect` (w / h): Hor+ (the
 * vertical angle held, wider screens see more at the sides) until the horizontal angle reaches `maxHDeg`, then
 * Vert- (the horizontal angle held at the cap, the vertical one narrows) so 32:9 never turns into a fisheye.
 */
export function vfovFor(hDeg16x9: number, aspect: number, maxHDeg: number): number {
  const v = 2 * Math.atan(Math.tan((hDeg16x9 * RAD) / 2) * (9 / 16));
  const a = aspect > 0 ? aspect : 16 / 9;
  const h = 2 * Math.atan(Math.tan(v / 2) * a);
  const max = Math.max(hDeg16x9, maxHDeg) * RAD;
  if (h <= max) return v;
  return 2 * Math.atan(Math.tan(max / 2) / a);
}

/** The horizontal FOV (degrees) a vertical FOV gives on `aspect`. */
export function hfovDeg(vRad: number, aspect: number): number {
  return (2 * Math.atan(Math.tan(vRad / 2) * aspect)) / RAD;
}

/**
 * Pixels to keep the HUD panels in from each side: '16:9' / '21:9' centre them in a region of that aspect (on a
 * wider screen), 'full' uses the whole width, 'auto' = 16:9 on anything wider than 21:9 (3440 x 1440 is 2.39; 32:9
 * monitors), else full.
 */
export function hudInset(w: number, h: number, mode: HudWidth): number {
  if (w <= 0 || h <= 0) return 0;
  const aspect = w / h;
  const target = mode === '16:9' ? 16 / 9 : mode === '21:9' ? 21 / 9 : mode === 'auto' && aspect > 2.6 ? 16 / 9 : 0;
  if (!target || aspect <= target) return 0;
  return Math.round((w - h * target) / 2);
}

/** A readable aspect for reports: "16:9", "16:10", "21:9", "32:9" or the ratio. */
export function aspectLabel(w: number, h: number): string {
  const a = w / h;
  const known: [number, string][] = [
    [16 / 9, '16:9'],
    [16 / 10, '16:10'],
    [4 / 3, '4:3'],
    [64 / 27, '21:9'],
    [43 / 18, '21:9'],
    [32 / 9, '32:9'],
    [20 / 9, '20:9'],
  ];
  for (const [r, l] of known) if (Math.abs(a - r) < 0.03) return l;
  return `${a.toFixed(2)}:1`;
}

export type GpuKind = 'discrete' | 'integrated' | 'software' | 'unknown';

/**
 * Classify the WebGL renderer string (unmasked where the browser allows): a laptop browser left on the
 * integrated GPU (Intel UHD / Iris, AMD "Radeon(TM) Graphics" APUs) runs the PC renderer at a fraction of the
 * discrete GPU's speed; Windows picks the GPU per app (Settings > System > Display > Graphics).
 */
export function classifyGpu(renderer: string): GpuKind {
  const r = renderer.toLowerCase();
  if (!r) return 'unknown';
  if (/swiftshader|llvmpipe|softpipe|basic render|software/.test(r)) return 'software';
  if (/nvidia|geforce|quadro|rtx|gtx|radeon rx|radeon pro|arc\(tm\) a|arc a\d|intel\(r\) arc/.test(r)) return 'discrete';
  if (/intel|uhd|iris|hd graphics|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|apple|mali|adreno|powervr/.test(r)) return 'integrated';
  return 'unknown';
}

/** Desktop Resolution choices (3.1.7): render scales of the native output, low to high (above 1 supersamples). */
export const RES_SCALES = [0.5, 0.67, 0.75, 0.83, 0.9, 1, 1.25, 1.5, 2] as const;

/** Standard desktop resolutions (3.2.1): 32:9, 21:9, 16:10, 16:9. */
export const STANDARD_RESOLUTIONS: readonly (readonly [number, number])[] = [
  [7680, 2160], [5120, 1440], [3840, 1080],
  [5120, 2160], [3440, 1440], [2560, 1080],
  [3840, 2400], [2560, 1600], [1920, 1200], [1680, 1050], [1440, 900], [1280, 800],
  [3840, 2160], [3200, 1800], [2560, 1440], [1920, 1080], [1600, 900], [1366, 768], [1280, 720],
];

/**
 * Pure (3.2.1): the resolutions a monitor offers - its native one first, then the standard ones of its shape (within
 * 3% of its aspect) and at least half its height, largest first; a monitor of an unusual shape gets its native size at
 * 75%, 67% and 50%. (A 7680 x 2160 monitor: 7680 x 2160, 5120 x 1440, 3840 x 1080.)
 */
export function desktopResolutions(monW: number, monH: number): { w: number; h: number }[] {
  const out: { w: number; h: number }[] = [{ w: monW, h: monH }];
  const a = monW / Math.max(1, monH);
  for (const [w, h] of STANDARD_RESOLUTIONS) {
    if (h >= monH || h < monH * 0.5 - 0.5 || Math.abs(w / h / a - 1) > 0.03) continue;
    if (!out.some((r) => r.w === w && r.h === h)) out.push({ w, h });
  }
  if (out.length === 1) for (const k of [0.75, 0.67, 0.5]) out.push({ w: Math.round((monW * k) / 2) * 2, h: Math.round((monH * k) / 2) * 2 });
  return out.sort((p, q) => q.h - p.h);
}

/** Pure: the render scale that draws `h` lines on a monitor `monH` high (fullscreen; a window gets the same share). */
export function resolutionScale(h: number, monH: number): number {
  return Math.max(0.5, Math.min(2, h / Math.max(1, monH)));
}

/** Pure: how a render size is shown (desktop): the chosen resolution, and the real size when a window differs. */
export function shownResolution(setting: string, renderW: number, renderH: number): string {
  const real = `${renderW}x${renderH}`;
  if (!setting) return real;
  const [w, h] = setting.split('x').map(Number);
  return Math.abs(w! - renderW) <= 2 && Math.abs(h! - renderH) <= 2 ? setting : `${setting} (window ${real})`;
}
/** Seconds a new resolution waits for Keep before it reverts. */
export const RES_CONFIRM_S = 15;

/** The render resolution a scale gives on a native output (even pixel counts, as the engine rounds). */
export function renderSize(nativeW: number, nativeH: number, scale: number): { w: number; h: number } {
  return { w: Math.max(2, Math.round(nativeW * scale)), h: Math.max(2, Math.round(nativeH * scale)) };
}

/** "2304 x 1356 (90%)" / "2560 x 1507 (native)". */
export function resolutionLabel(nativeW: number, nativeH: number, scale: number): string {
  const r = renderSize(nativeW, nativeH, scale);
  return `${r.w} x ${r.h} (${Math.abs(scale - 1) < 1e-3 ? 'native' : `${Math.round(scale * 100)}%`})`;
}
