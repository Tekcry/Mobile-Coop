import { describe, expect, it } from 'vitest';
import { detectPlatform, platformOverride, uiScale, type PlatformEnv } from '../src/core/platform';

const PC: PlatformEnv = { maxTouchPoints: 0, finePointer: true, anyCoarse: false, width: 1920, height: 1080, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36' };
const PHONE: PlatformEnv = { maxTouchPoints: 5, finePointer: false, anyCoarse: true, width: 915, height: 412, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36' };

describe('platform detection', () => {
  it('a mouse and keyboard PC is desktop, a phone is mobile', () => {
    expect(detectPlatform(PC).platform).toBe('desktop');
    expect(detectPlatform(PC).touch).toBe(false);
    expect(detectPlatform(PHONE).platform).toBe('mobile');
    expect(detectPlatform(PHONE).touch).toBe(true);
  });
  it('a touchscreen laptop with a mouse is desktop that can be touched', () => {
    const p = detectPlatform({ ...PC, maxTouchPoints: 10, anyCoarse: true });
    expect(p.platform).toBe('desktop');
    expect(p.touch).toBe(true);
  });
  it('tablets stay mobile, iPadOS desktop user agent included', () => {
    expect(detectPlatform({ ...PHONE, width: 1366, height: 1024, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' }).platform).toBe('mobile');
    expect(detectPlatform({ ...PHONE, width: 1366, height: 1024, finePointer: false, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15' }).platform).toBe('mobile');
  });
  it('a narrow desktop window without touch is still desktop when its long side is wide', () => {
    expect(detectPlatform({ ...PC, width: 700, height: 1000 }).platform).toBe('desktop');
    expect(detectPlatform({ ...PC, width: 640, height: 480 }).platform).toBe('mobile');
  });
  it('the setting and ?platform= override detection', () => {
    expect(detectPlatform(PHONE, 'desktop').platform).toBe('desktop');
    expect(detectPlatform(PC, 'mobile').platform).toBe('mobile');
    expect(platformOverride('?platform=desktop')).toBe('desktop');
    expect(platformOverride('?autostart=proving')).toBeNull();
  });
  it('desktop menus scale to the window, mobile never', () => {
    expect(uiScale('desktop', 1280, 720)).toBe(1);
    expect(uiScale('desktop', 1920, 1080)).toBe(1.5);
    expect(uiScale('desktop', 2560, 1440)).toBe(2);
    expect(uiScale('desktop', 3840, 2160)).toBe(3);
    expect(uiScale('desktop', 1024, 600)).toBe(1);
    expect(uiScale('mobile', 2560, 1440)).toBe(1);
  });
});
