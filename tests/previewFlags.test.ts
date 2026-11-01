// (preview-flags, Michael 2026-10-26 ~13:55 "All on in preview"; one-game, Michael 2026-11-01) Every feature flag that was
// on only in the /preview/ build defaults on in every build (the live game and these tests too); `=0` turns one off.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KIT_BUILT, KIT_MOVES_ON, PREVIEW_ON, darkFlag, flags, readCoopKit, readKitMoves } from '../src/core/flags';

describe('darkFlag', () => {
  it('off by default when the default is false: only "1" turns it on', () => {
    expect(darkFlag(null, false)).toBe(false);
    expect(darkFlag('', false)).toBe(false);
    expect(darkFlag('x', false)).toBe(false);
    expect(darkFlag('0', false)).toBe(false);
    expect(darkFlag('1', false)).toBe(true);
  });

  it('on by default when the default is true (what the game passes): only "0" turns it off', () => {
    expect(darkFlag(null, true)).toBe(true);
    expect(darkFlag('', true)).toBe(true);
    expect(darkFlag('x', true)).toBe(true);
    expect(darkFlag('0', true)).toBe(false);
    expect(darkFlag('1', true)).toBe(true);
  });
});

describe('defaults under tests (no URL, no preview constants): all on (one-game)', () => {
  it('PREVIEW_ON is true and every feature flag defaults on', () => {
    expect(PREVIEW_ON).toBe(true);
    // (gm-flip, Michael 2026-10-26 ~23:55 "Just switch them on") the guard models are on everywhere
    expect(flags.guardModels).toBe(true);
    expect(flags.charShadowLight).toBe(true);
    expect(flags.mapReady).toBe(true);
    expect(flags.marlowReplan).toBe(true);
    expect(flags.guardPairs).toBe(true);
    expect(flags.lookouts).toBe(true);
    expect(flags.dogRelease).toBe(true);
    expect(flags.contextPrompts).toBe(true);
    expect(flags.missions).toBe(true);
    expect(flags.campaign).toBe(true);
  });
});

describe('(coop-kit A1) kitMoves: the kit list flag', () => {
  const ids = (s: ReadonlySet<string>): string[] => [...s].sort();

  it('absent: every built id when the default is on (the game), the off list (none) when it is off', () => {
    expect(ids(readKitMoves(null, true))).toEqual([...KIT_BUILT].sort());
    expect(ids(readKitMoves(null, false))).toEqual([...KIT_MOVES_ON].sort());
    expect(ids(readKitMoves(null, false))).toEqual([]);
    expect(KIT_BUILT).toEqual(expect.arrayContaining(['descent', 'pull', 'shutter']));
    // unreadable: the default
    expect(ids(readKitMoves('de scent', true))).toEqual([...KIT_BUILT].sort());
    expect(ids(readKitMoves('', false))).toEqual([]);
  });

  it('0 / none: empty everywhere; all: every built id', () => {
    for (const p of [true, false]) {
      expect(readKitMoves('0', p).size).toBe(0);
      expect(readKitMoves('none', p).size).toBe(0);
      expect(ids(readKitMoves('all', p))).toEqual([...KIT_BUILT].sort());
    }
  });

  it('a list: exactly those built ids (any case); an unbuilt id is dropped', () => {
    expect(ids(readKitMoves('descent', false))).toEqual(['descent']);
    expect(ids(readKitMoves('descent', true))).toEqual(['descent']);
    expect(ids(readKitMoves('Descent,PULL', false))).toEqual(['descent', 'pull']);
    expect(ids(readKitMoves('stand,descent,warp', false))).toEqual(['descent']);
    expect(readKitMoves('stand', true).size).toBe(0);
  });

  it('?coopkit=1 / 0 adds / removes pull and shutter', () => {
    expect(ids(readKitMoves(null, false, '1'))).toEqual(['pull', 'shutter']);
    expect(ids(readKitMoves('descent', false, '1'))).toEqual(['descent', 'pull', 'shutter']);
    // (coop-kit K5b) every built id but the two `?coopkit=0` removes
    expect(ids(readKitMoves(null, true, '0'))).toEqual(KIT_BUILT.filter((id) => id !== 'pull' && id !== 'shutter').sort());
    expect(ids(readKitMoves(null, true, 'x'))).toEqual([...KIT_BUILT].sort());
  });

  it('coopKit loads from the list: on with pull or shutter; ?coopkit=1 / 0 win', () => {
    expect(readCoopKit(null, readKitMoves(null, true))).toBe(true);
    expect(readCoopKit(null, readKitMoves(null, false))).toBe(false);
    expect(readCoopKit(null, readKitMoves('shutter', false))).toBe(true);
    expect(readCoopKit(null, readKitMoves('descent', true))).toBe(false);
    expect(readCoopKit('1', readKitMoves(null, false, '1'))).toBe(true);
    expect(readCoopKit('0', readKitMoves(null, true, '0'))).toBe(false);
    // with no ?kitmoves= it gives what darkFlag gave before the fold
    for (const v of [null, '', 'x', '0', '1']) for (const p of [true, false]) expect(readCoopKit(v, readKitMoves(null, p, v))).toBe(darkFlag(v, p));
  });

  it('under tests (no URL): every built id on, coopKit on (one-game); both plain writable fields', () => {
    expect([...flags.kitMoves].sort()).toEqual([...KIT_BUILT].sort());
    expect(flags.coopKit).toBe(true);
    const k0 = flags.kitMoves;
    const c0 = flags.coopKit;
    flags.kitMoves = new Set(['descent']);
    flags.coopKit = false;
    expect(flags.kitMoves.has('descent')).toBe(true);
    expect(flags.coopKit).toBe(false);
    flags.kitMoves = k0;
    flags.coopKit = c0;
  });
});

describe('source guard', () => {
  const src = readFileSync(resolve(__dirname, '../src/core/flags.ts'), 'utf8');
  const body = src.slice(src.indexOf('export const flags'));

  it('PREVIEW_ON is the constant true (one build, one set of defaults)', () => {
    expect(src).toMatch(/export const PREVIEW_ON = true;/);
  });

  it('the feature flags read through the default (PREVIEW_ON, true)', () => {
    expect(body).toMatch(/guardModels: params\.get\('guardmodels'\) !== '0'/);
    expect(body).toMatch(/charShadowLight: darkFlag\(params\.get\('charlight'\), PREVIEW_ON\)/);
    expect(body).toMatch(/mapReady: darkFlag\(params\.get\('mapready'\), PREVIEW_ON\)/);
    expect(body).toMatch(/marlowReplan: darkFlag\(params\.get\('marlowreplan'\), PREVIEW_ON\)/);
    expect(body).toMatch(/guardPairs: darkFlag\(params\.get\('guardpairs'\), PREVIEW_ON\)/);
    expect(body).toMatch(/lookouts: darkFlag\(params\.get\('lookouts'\), PREVIEW_ON\)/);
    expect(body).toMatch(/dogRelease: darkFlag\(params\.get\('dogrelease'\), PREVIEW_ON\)/);
    expect(body).toMatch(/contextPrompts: darkFlag\(params\.get\('ctxprompts'\), PREVIEW_ON\)/);
  });

  it('the mission-framework flags read through the default (mission-c2-rules)', () => {
    expect(body).toMatch(/missions: darkFlag\(params\.get\('missions'\), PREVIEW_ON\)/);
    expect(body).toMatch(/campaign: darkFlag\(params\.get\('campaign'\), PREVIEW_ON\)/);
    // (coop-kit A1) `coopKit` loads from the kit list (which reads the default); it stays a plain field
    expect(body).toMatch(/coopKit: readCoopKit\(params\.get\('coopkit'\), kitMovesAtLoad\)/);
    expect(src).toMatch(/kitMovesAtLoad = readKitMoves\(params\.get\('kitmoves'\), PREVIEW_ON, params\.get\('coopkit'\)\)/);
    expect(body).toMatch(/kitMoves: kitMovesAtLoad/);
  });

  it('mixamo: the URL stays its own switch; the captures are on when the URL names none', () => {
    expect(body).toMatch(/mixamo: onOffFlag\(params\.get\('mixamo'\)\)/);
    const mixamo = readFileSync(resolve(__dirname, '../src/anim/mixamo.ts'), 'utf8');
    expect(mixamo).toContain('setMixamo(flags.mixamo ?? PREVIEW_ON)');
  });
});
