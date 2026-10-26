// (preview-flags, Michael 2026-10-26 ~13:55 "All on in preview") Every dark feature flag defaults on in the /preview/
// build only; the live game, the named slots, dev and these tests keep today's defaults.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAMPUS_V2_ON, PREVIEW_ON, darkFlag, flags, readCampusV2 } from '../src/core/flags';

describe('darkFlag', () => {
  it('off by default outside /preview/: only "1" turns it on', () => {
    expect(darkFlag(null, false)).toBe(false);
    expect(darkFlag('', false)).toBe(false);
    expect(darkFlag('x', false)).toBe(false);
    expect(darkFlag('0', false)).toBe(false);
    expect(darkFlag('1', false)).toBe(true);
  });

  it('on by default in /preview/: only "0" turns it off', () => {
    expect(darkFlag(null, true)).toBe(true);
    expect(darkFlag('', true)).toBe(true);
    expect(darkFlag('x', true)).toBe(true);
    expect(darkFlag('0', true)).toBe(false);
    expect(darkFlag('1', true)).toBe(true);
  });
});

describe('readCampusV2 with the preview default', () => {
  it('outside /preview/ the default is CAMPUS_V2_ON (same reference)', () => {
    expect(readCampusV2(null)).toBe(CAMPUS_V2_ON);
    expect(readCampusV2(null, false)).toBe(CAMPUS_V2_ON);
  });

  it('in /preview/ the default is every section; a URL list still wins', () => {
    expect(readCampusV2(null, true)).toEqual([1, 2, 3, 4, 5]);
    expect(readCampusV2('bad', true)).toEqual([1, 2, 3, 4, 5]);
    expect(readCampusV2('0', true)).toEqual([]);
    expect(readCampusV2('3,1', true)).toEqual([1, 3]);
    expect(readCampusV2('1,2,3,4,5', false)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('live defaults under tests (no preview constants)', () => {
  it('PREVIEW_ON is false and the five feature flags keep their off defaults', () => {
    expect(PREVIEW_ON).toBe(false);
    expect(flags.guardModels).toBe(false);
    expect(flags.charShadowLight).toBe(false);
    expect(flags.mapReady).toBe(false);
    expect(flags.marlowReplan).toBe(false);
    // (guard-rules F0) the three guard flags (PR3) keep their off defaults too
    expect(flags.guardPairs).toBe(false);
    expect(flags.lookouts).toBe(false);
    expect(flags.dogRelease).toBe(false);
    expect(flags.campusV2).toEqual(CAMPUS_V2_ON);
  });
});

describe('source guard', () => {
  const src = readFileSync(resolve(__dirname, '../src/core/flags.ts'), 'utf8');
  const body = src.slice(src.indexOf('export const flags'));

  it('the five feature flags read through the preview default', () => {
    expect(body).toMatch(/guardModels: darkFlag\(params\.get\('guardmodels'\), PREVIEW_ON\)/);
    expect(body).toMatch(/charShadowLight: darkFlag\(params\.get\('charlight'\), PREVIEW_ON\)/);
    expect(body).toMatch(/mapReady: darkFlag\(params\.get\('mapready'\), PREVIEW_ON\)/);
    expect(body).toMatch(/marlowReplan: darkFlag\(params\.get\('marlowreplan'\), PREVIEW_ON\)/);
    expect(body).toMatch(/guardPairs: darkFlag\(params\.get\('guardpairs'\), PREVIEW_ON\)/);
    expect(body).toMatch(/lookouts: darkFlag\(params\.get\('lookouts'\), PREVIEW_ON\)/);
    expect(body).toMatch(/dogRelease: darkFlag\(params\.get\('dogrelease'\), PREVIEW_ON\)/);
    expect(body).toMatch(/campusV2: readCampusV2\(params\.get\('campusv2'\), PREVIEW_ON\)/);
  });

  it('the mission-framework flags read through the preview default (mission-c2-rules)', () => {
    expect(body).toMatch(/missions: darkFlag\(params\.get\('missions'\), PREVIEW_ON\)/);
    expect(body).toMatch(/coopKit: darkFlag\(params\.get\('coopkit'\), PREVIEW_ON\)/);
  });

  it('mixamo: the URL stays its own switch; /preview/ turns the captures on when the URL names none', () => {
    expect(body).toMatch(/mixamo: onOffFlag\(params\.get\('mixamo'\)\)/);
    const mixamo = readFileSync(resolve(__dirname, '../src/anim/mixamo.ts'), 'utf8');
    expect(mixamo).toContain('setMixamo(flags.mixamo ?? PREVIEW_ON)');
  });
});
