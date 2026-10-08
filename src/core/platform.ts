/**
 * Platform (pure, unit-tested): which UI and input the device gets. It never changes rendering - every device
 * runs the same renderer and settings. Desktop: no touch points, or a fine hovering pointer is primary, on a
 * wide viewport. Desktop hides touch-only controls and settings (a touchscreen laptop still gets the touch layer
 * the moment it is touched, and keeps the Touch settings).
 */
import { viewHeight, viewWidth } from './viewRotation';

export type Platform = 'mobile' | 'desktop';
export type PlatformChoice = 'auto' | Platform;

export interface PlatformEnv {
  maxTouchPoints: number;
  /** `(pointer: fine)` and `(hover: hover)`: the primary pointer is a mouse / trackpad. */
  finePointer: boolean;
  /** `(any-pointer: coarse)`: some pointer is a finger. */
  anyCoarse: boolean;
  /** Viewport in CSS px. */
  width: number;
  height: number;
  userAgent: string;
}

export interface PlatformInfo {
  platform: Platform;
  /** The device can be touched (Touch settings stay available). */
  touch: boolean;
  /** Why (debug / tests). */
  reason: string;
}

/** Narrowest landscape viewport (CSS px) treated as a desktop window. */
export const DESKTOP_MIN_WIDTH = 900;
const MOBILE_UA = /Android|iPhone|iPod|iPad|Mobile|Silk|Kindle|PlayBook|BB10/i;

export function detectPlatform(env: PlatformEnv, choice: PlatformChoice = 'auto'): PlatformInfo {
  const touch = env.maxTouchPoints > 0 || env.anyCoarse;
  if (choice !== 'auto') return { platform: choice, touch, reason: 'setting' };
  const mobileUa = MOBILE_UA.test(env.userAgent);
  const wide = Math.max(env.width, env.height) >= DESKTOP_MIN_WIDTH;
  // iPadOS reports a desktop Safari user agent with touch points: still a tablet
  const ipadAsMac = /Macintosh/.test(env.userAgent) && env.maxTouchPoints > 1;
  if (mobileUa || ipadAsMac) return { platform: 'mobile', touch, reason: mobileUa ? 'user agent' : 'iPad' };
  if (env.maxTouchPoints === 0 && wide) return { platform: 'desktop', touch, reason: 'no touch' };
  if (env.finePointer && wide) return { platform: 'desktop', touch, reason: 'fine pointer' };
  return { platform: 'mobile', touch, reason: wide ? 'touch first' : 'narrow' };
}

/** Reads the browser environment (not unit-tested). */
export function browserEnv(): PlatformEnv {
  const mq = (q: string): boolean => (typeof matchMedia === 'function' ? matchMedia(q).matches : false);
  return {
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    finePointer: mq('(pointer: fine)') && mq('(hover: hover)'),
    anyCoarse: mq('(any-pointer: coarse)'),
    width: viewWidth(),
    height: viewHeight(),
    userAgent: navigator.userAgent,
  };
}

/** `?platform=desktop|mobile` (tests) wins over the setting. */
export function platformOverride(search: string): Platform | null {
  const v = new URLSearchParams(search).get('platform');
  return v === 'desktop' || v === 'mobile' ? v : null;
}

/**
 * Menu / HUD scale on desktop: the layout is computed for a 1280 x 720 reference window and scaled up to fill
 * bigger ones (1080p 1.5x, 1440p 2x, 4K 3x), so a big screen is never a phone UI in one corner. 1 on mobile.
 */
export function uiScale(platform: Platform, width: number, height: number): number {
  if (platform !== 'desktop') return 1;
  const k = Math.min(width / 1280, height / 720);
  return Math.round(Math.min(3, Math.max(1, k)) * 100) / 100;
}
