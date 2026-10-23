import { describe, expect, it } from 'vitest';
import { isWindowsPlatform } from '../src/core/display';

const UA = {
  win10Chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  win11Edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  ipadSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  ipadMobile: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

describe('isWindowsPlatform', () => {
  it('is true on Windows 10 / 11 Chrome and Edge', () => {
    expect(isWindowsPlatform(UA.win10Chrome, 'Win32')).toBe(true);
    expect(isWindowsPlatform(UA.win11Edge, 'Win32')).toBe(true);
    expect(isWindowsPlatform(UA.win11Edge, 'Windows')).toBe(true);
    expect(isWindowsPlatform(UA.win10Chrome, '')).toBe(true);
  });
  it('is false on iPadOS Safari (desktop-class UA and mobile UA), iPhone, Android, macOS and Linux', () => {
    expect(isWindowsPlatform(UA.ipadSafari, 'MacIntel')).toBe(false);
    expect(isWindowsPlatform(UA.ipadMobile, 'iPad')).toBe(false);
    expect(isWindowsPlatform(UA.iphone, 'iPhone')).toBe(false);
    expect(isWindowsPlatform(UA.android, 'Linux armv81')).toBe(false);
    expect(isWindowsPlatform(UA.android, 'Android')).toBe(false);
    expect(isWindowsPlatform(UA.mac, 'MacIntel')).toBe(false);
    expect(isWindowsPlatform(UA.mac, 'macOS')).toBe(false);
    expect(isWindowsPlatform(UA.linux, 'Linux x86_64')).toBe(false);
    expect(isWindowsPlatform(UA.linux, '')).toBe(false);
  });
});
