import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRIEF_FRAC, briefNight, clock, MOON, nightAt, NIGHT_LENGTH, panelNight, skyAt, stepNight, timeWords } from '../../src/editor/night';
import { campusText } from '../../src/editor/model';
import type { Campus } from '../../src/editor/types';
import { moonLight } from '../../src/world/lampMath';
import { MAPS } from '../../src/world/maps';
import { KESTREL_THEME, kestrel, setKestrelDraft } from '../../src/world/maps/kestrel';
import type { CampusFile } from '../../src/world/maps/kestrelCampus';
import { moonTravel, nightTheme, readNight } from '../../src/world/maps/kestrelNight';

const campusPath = new URL('../../docs/kestrel/kestrel.campus.blocks.json', import.meta.url);

describe('ON15 time of night to the moon (the simple sky path)', () => {
  it('dusk: low, north of east, rising', () => {
    const s = skyAt(MOON.dusk);
    expect(s.bearing).toBeGreaterThan(30);
    expect(s.bearing).toBeLessThan(90);
    expect(s.height).toBe(MOON.heightMin);
  });
  it('midnight: due south, highest (90 - latitude + declination)', () => {
    const s = skyAt(0);
    expect(s.bearing).toBe(180);
    expect(s.height).toBe(90 - MOON.latitude + MOON.declination);
  });
  it('dawn: low, north of west, mirroring dusk', () => {
    const s = skyAt(MOON.dawn);
    expect(s.bearing).toBeGreaterThan(270);
    expect(s.bearing).toBeLessThan(330);
    expect(s.bearing).toBe(360 - skyAt(MOON.dusk).bearing);
    expect(s.height).toBe(MOON.heightMin);
  });
  it("the brief's night is 01:10 with no moonlight, west of south; its marker sits on the slider", () => {
    const b = briefNight();
    expect(b.time).toBe('01:10');
    expect(b.brightness).toBe('new');
    expect(b.bearing).toBeGreaterThan(180);
    expect(b.bearing).toBeLessThan(230);
    expect(timeWords(b)).toBe('01:10 Brief');
    expect(BRIEF_FRAC).toBeGreaterThan(0.5);
    expect(BRIEF_FRAC).toBeLessThan(1);
  });
  it('the slider steps within dusk and dawn; bearing and height steps mark the time hand set', () => {
    let n = nightAt(MOON.dawn, 'full');
    n = stepNight(n, 'time', 1);
    expect(n.time).toBe(clock(MOON.dawn));
    n = stepNight(nightAt(MOON.dusk, 'full'), 'time', -1);
    expect(n.time).toBe(clock(MOON.dusk));
    const t = stepNight(nightAt(0, 'full'), 'time', 1);
    expect(t.time).toBe(clock(MOON.timeStep));
    expect(NIGHT_LENGTH).toBe(16 * 60);
    const b = stepNight(nightAt(0, 'full'), 'bearing', 1);
    expect(b.bearing).toBe(180 + MOON.bearingStep);
    expect(b.time).toBe('');
    expect(stepNight({ ...b, bearing: 357 }, 'bearing', 1).bearing).toBe(0);
    expect(stepNight({ ...b, bearing: 2 }, 'bearing', 1).bearing).toBe(5);
    expect(stepNight({ ...b, bearing: 2 }, 'bearing', -1).bearing).toBe(0);
    expect(stepNight({ ...b, height: MOON.heightMax }, 'height', 1).height).toBe(MOON.heightMax);
    expect(stepNight({ ...b, brightness: 'new' }, 'brightness', 1).brightness).toBe('quarter');
    expect(stepNight({ ...b, brightness: 'full' }, 'brightness', 1).brightness).toBe('full');
  });
});

describe('ON15 meta.night', () => {
  it('round-trips through the campus file text; the file today has none (the map keeps its moon)', () => {
    const c = JSON.parse(readFileSync(campusPath, 'utf8')) as Campus;
    expect(c.meta.night).toBeUndefined();
    expect(panelNight(c.meta)).toEqual(briefNight());
    const n = nightAt(MOON.dusk + 120, 'half');
    c.meta.night = n;
    const back = JSON.parse(campusText(c)) as Campus;
    expect(readNight(back.meta.night)).toEqual(n);
    expect(panelNight(back.meta)).toEqual(n);
    expect(readNight({ bearing: 10, height: 95, brightness: 'full' })).toBeNull();
    expect(readNight({ bearing: 10, height: 30, brightness: 'blue' })).toBeNull();
  });

  it('the theme: the moon from the setting, its share of the theme moon, the sky fill unchanged', () => {
    const fill = (t: typeof KESTREL_THEME): number => (t.lightLevel ?? 0.75) - moonLight(t);
    const full = nightTheme(KESTREL_THEME, { bearing: 90, height: 30, brightness: 'full', time: '' });
    expect(full.sunDir[0]).toBeCloseTo(-Math.cos(Math.PI / 6));
    expect(full.sunDir[1]).toBeCloseTo(-0.5);
    expect(full.sunDir[2]).toBeCloseTo(0);
    expect(moonLight(full)).toBeCloseTo(moonLight(KESTREL_THEME));
    expect(full.lightLevel).toBeCloseTo(KESTREL_THEME.lightLevel!);
    const half = nightTheme(KESTREL_THEME, { bearing: 90, height: 30, brightness: 'half', time: '' });
    expect(moonLight(half)).toBeCloseTo(moonLight(KESTREL_THEME) / 2);
    expect(fill(half)).toBeCloseTo(fill(KESTREL_THEME));
    const none = nightTheme(KESTREL_THEME, { bearing: 90, height: 30, brightness: 'new', time: '' });
    expect(moonLight(none)).toBe(0);
    expect(none.lightLevel).toBeCloseTo(fill(KESTREL_THEME));
    expect(nightTheme(KESTREL_THEME, undefined)).toBe(KESTREL_THEME);
    const t = moonTravel(180, 45);
    expect(t[2]).toBeGreaterThan(0); // a moon in the south throws shadows north
  });

  it('the Kestrel map reads it for its theme; without it, and every other map, unchanged', () => {
    const before = new Map(MAPS.map((m) => [m.id, JSON.stringify(m.theme)]));
    expect(kestrel.theme).toBe(KESTREL_THEME);
    const c = JSON.parse(readFileSync(campusPath, 'utf8')) as CampusFile & { meta: Record<string, unknown> };
    c.meta.night = { bearing: 270, height: 40, brightness: 'quarter', time: '' };
    setKestrelDraft(c, null);
    const t = kestrel.theme;
    expect(t.sunDir[0]).toBeGreaterThan(0.7); // a moon in the west throws shadows east
    expect(moonLight(t)).toBeCloseTo(moonLight(KESTREL_THEME) / 4);
    expect(kestrel.theme).toBe(t);
    for (const m of MAPS) if (m.id !== 'kestrel') expect(JSON.stringify(m.theme)).toBe(before.get(m.id));
    delete c.meta.night;
    setKestrelDraft(JSON.parse(JSON.stringify(c)) as CampusFile, null);
    expect(kestrel.theme).toBe(KESTREL_THEME);
  });
});
