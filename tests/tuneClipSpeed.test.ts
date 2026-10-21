// (clip-speed, track A) The tuner's Clip speed section: identity by default, a speed scales the clip's duration (and the
// draw's fire gate with it), the every-clip slider multiplies, the bypass reads identity, the save / export round trip,
// and the bake writes the right code value (temp copies only, never the real tree) and leaves the others alone.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { CLIP_ALL, CLIP_BASE, CLIP_BODY, CLIP_GUN, CLIP_SPEED_IDS, CLIP_SPEED_SECTION, clipSpeed } from '../src/anim/tuneClipSpeed';
import { DRAW_DRAWN, DRAW_TIME_PRIMARY, DRAW_TIME_SIDEARM, DrawState, drawTimeFor, fireReady, HOLSTER_TIME, holsterTime } from '../src/weapons/drawState';
import { CLIP_RATE } from '../src/anim/clips/actions';
import { TUNE_FLAGS, TUNE_SECTIONS, tuneExport, tuneGet, tuneImport, tuneLoad, tuneResetAll, tuneSet, tuneSnapshot } from '../src/anim/tuneRegistry';
import { bakeCatalogue, tuneBake } from '../src/anim/tuneBake';
import { BAKE_LEDGER, BAKE_RULES } from '../src/anim/tuneBakeTable';
import { plainGroupWord, plainLabel, tabOfSection } from '../src/ui/tunerLayout';

const ROOT = path.join(__dirname, '..');
const DRAW = 'src/weapons/drawState.ts';
const WPN = 'src/weapons/playerWeapons.ts';
const ACT = 'src/anim/clips/actions.ts';

afterEach(() => {
  tuneResetAll();
  TUNE_FLAGS.bypass = false;
});

/** Fixed steps of `dt` until the draw state is drawn (aim held). */
function stepsToDrawn(cls: string, dt = 1 / 60): number {
  const d = new DrawState();
  let n = 0;
  while (d.update(dt, true, drawTimeFor(cls)) !== DRAW_DRAWN && n < 10000) n++;
  return n + 1;
}

describe('clip speed values', () => {
  it('registers one section with a slider per clip and the every-clip slider, all identity 1', () => {
    expect(TUNE_SECTIONS.filter((s) => s.id === 'clip')).toHaveLength(1);
    expect(CLIP_SPEED_SECTION.groups).toEqual([CLIP_GUN, CLIP_BODY, CLIP_ALL]);
    for (const id of CLIP_SPEED_IDS) {
      expect(CLIP_SPEED_SECTION.byId.get(id)!.def).toBe(1);
      expect(clipSpeed(id)).toBe(1);
    }
    expect(CLIP_SPEED_SECTION.byId.get('all')!.groups).toEqual([CLIP_ALL]);
    // the draws, holster and swap come first
    expect(CLIP_SPEED_SECTION.tunables.slice(0, 4).map((t) => t.id)).toEqual(['rifleDraw', 'pistolDraw', 'holster', 'swap']);
  });

  it('untuned is bit-identical: the draw and holster times are the code constants', () => {
    expect(drawTimeFor('rifle')).toBe(DRAW_TIME_PRIMARY);
    expect(drawTimeFor('smg')).toBe(DRAW_TIME_PRIMARY);
    expect(drawTimeFor('pistol')).toBe(DRAW_TIME_SIDEARM);
    expect(holsterTime()).toBe(HOLSTER_TIME);
    expect(CLIP_RATE).toEqual({ startShift: 1, stopSettle: 1, land: 1 });
    // the "today" lines read the owners' values
    expect(CLIP_BASE.rifleDraw).toBe(DRAW_TIME_PRIMARY);
    expect(CLIP_BASE.holster).toBe(HOLSTER_TIME);
  });

  it('a draw speed scales the draw time, and the fire gate opens when the draw ends', () => {
    const base = stepsToDrawn('rifle');
    expect(tuneSet(CLIP_GUN, 'rifleDraw', 2)).toBe(true);
    expect(drawTimeFor('rifle')).toBeCloseTo(DRAW_TIME_PRIMARY / 2, 12);
    expect(drawTimeFor('pistol')).toBe(DRAW_TIME_SIDEARM);
    const fast = stepsToDrawn('rifle');
    expect(fast).toBeLessThan(base);
    expect(Math.abs(fast - base / 2)).toBeLessThanOrEqual(1);
    // gameplay: one step short of the end the gun cannot fire, at the end it can
    const d = new DrawState();
    for (let i = 0; i < fast - 1; i++) d.update(1 / 60, true, drawTimeFor('rifle'));
    expect(fireReady(d.phase, 1)).toBe(false);
    d.update(1 / 60, true, drawTimeFor('rifle'));
    expect(fireReady(d.phase, 1)).toBe(true);
  });

  it('the holster speed scales the holster, and the every-clip slider multiplies each clip', () => {
    tuneSet(CLIP_GUN, 'holster', 0.5);
    expect(holsterTime()).toBeCloseTo(HOLSTER_TIME * 2, 12);
    tuneSet(CLIP_GUN, 'pistolDraw', 1.5);
    tuneSet(CLIP_ALL, 'all', 2);
    expect(clipSpeed('pistolDraw')).toBeCloseTo(3, 12);
    expect(clipSpeed('land')).toBe(2);
    expect(drawTimeFor('pistol')).toBeCloseTo(DRAW_TIME_SIDEARM / 3, 12);
    // the bypass reads the untuned timing
    TUNE_FLAGS.bypass = true;
    expect(drawTimeFor('pistol')).toBe(DRAW_TIME_SIDEARM);
    expect(holsterTime()).toBe(HOLSTER_TIME);
  });

  it('survives the save and the export / import round trip', () => {
    tuneSet(CLIP_GUN, 'swap', 1.25);
    tuneSet(CLIP_BODY, 'land', 0.75);
    tuneSet(CLIP_ALL, 'all', 1.1);
    const snap = JSON.parse(JSON.stringify(tuneSnapshot())) as unknown;
    const exp = JSON.parse(JSON.stringify(tuneExport())) as unknown;
    tuneResetAll();
    expect(clipSpeed('swap')).toBe(1);
    tuneLoad(snap);
    expect(tuneGet(CLIP_GUN, 'swap')).toBe(1.25);
    expect(tuneGet(CLIP_BODY, 'land')).toBe(0.75);
    expect(clipSpeed('swap')).toBeCloseTo(1.375, 12);
    tuneResetAll();
    expect(tuneImport(exp, 'clip.json').ok).toBe(true);
    expect(tuneGet(CLIP_ALL, 'all')).toBe(1.1);
    expect(tuneGet(CLIP_BODY, 'land')).toBe(0.75);
    // a save from before this section (no clip groups) loads at identity
    tuneLoad({ version: 2, values: { walk: { strideMul: 1.1 } }, log: [] });
    for (const id of CLIP_SPEED_IDS) expect(clipSpeed(id)).toBe(1);
  });

  it('shows in its own tab with plain names', () => {
    expect(tabOfSection('clip')).toBe('sec:clip');
    expect(plainLabel('clip', 'rifleDraw', 'x')).toBe('Rifle draw speed');
    expect(plainLabel('clip', 'stopSettle', 'x')).toBe('Stop settle speed');
    expect(plainGroupWord('clip', 0, 'gun')).toBe('Draw, holster, swap and throw');
  });
});

describe('clip speed bake', () => {
  const dirs: string[] = [];
  afterAll(() => {
    for (const d of dirs) rmSync(d, { recursive: true, force: true });
  });
  function tree(): { read: (p: string) => string | null; write: (w: readonly { path: string; after: string }[]) => void } {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'clip-bake-'));
    dirs.push(dir);
    for (const f of [DRAW, WPN, ACT]) {
      mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      cpSync(path.join(ROOT, f), path.join(dir, f));
    }
    const read = (p: string): string | null => (existsSync(path.join(dir, p)) ? readFileSync(path.join(dir, p), 'utf8') : null);
    const write = (ws: readonly { path: string; after: string }[]): void => {
      for (const w of ws) {
        mkdirSync(path.dirname(path.join(dir, w.path)), { recursive: true });
        writeFileSync(path.join(dir, w.path), w.after);
      }
    };
    return { read, write };
  }
  const cat = bakeCatalogue(TUNE_SECTIONS.filter((s) => s.id === 'clip'));
  const entry = (group: string, id: string, value: number) => ({ group, id, label: id, kind: 'mul', unit: 'x', value, default: 1 });
  const exp = (changed: unknown[]) => ({ magic: 'night-shift-anim-tune', version: 2, exported: '2026-10-22T10:00:00.000Z', changed, log: [] });

  it('every clip slider has a bake rule', () => {
    for (const t of CLIP_SPEED_SECTION.tunables) expect(BAKE_RULES.some((r) => r.section === 'clip' && r.id === t.id && t.groups.every((g) => r.groups.includes(g)))).toBe(true);
  });

  it('a draw speed and a landing speed bake into their constants, the other values and files untouched', () => {
    const t = tree();
    const r = tuneBake(exp([entry(CLIP_GUN, 'rifleDraw', 1.25), entry(CLIP_BODY, 'land', 2)]), cat, t.read);
    expect(r.ok, r.error).toBe(true);
    expect(r.baked).toBe(2);
    expect(r.writes.map((w) => w.path).sort()).toEqual([BAKE_LEDGER, ACT, DRAW].sort());
    t.write(r.writes);
    const draw = t.read(DRAW)!;
    expect(draw).toContain('export const DRAW_TIME_PRIMARY = 0.24;');
    expect(draw).toContain('export const DRAW_TIME_SIDEARM = 0.5;');
    expect(draw).toContain('export const HOLSTER_TIME = 0.15;');
    expect(t.read(ACT)).toContain('export const CLIP_RATE = { startShift: 1, stopSettle: 1, land: 2 };');
    expect(t.read(WPN)).toBe(readFileSync(path.join(ROOT, WPN), 'utf8'));
    // the diff names only the changed lines; a re-run of the same export is a no-op (identity after the bake)
    const again = tuneBake(exp([entry(CLIP_GUN, 'rifleDraw', 1.25), entry(CLIP_BODY, 'land', 2)]), cat, t.read);
    expect(again.ok).toBe(true);
    expect(again.writes).toHaveLength(0);
  });

  it('the every-clip speed bakes into every clip, composed with a clip\'s own speed', () => {
    const t = tree();
    const r = tuneBake(exp([entry(CLIP_ALL, 'all', 2), entry(CLIP_GUN, 'swap', 1.5)]), cat, t.read);
    expect(r.ok, r.error).toBe(true);
    t.write(r.writes);
    const draw = t.read(DRAW)!;
    expect(draw).toContain('export const DRAW_TIME_PRIMARY = 0.15;');
    expect(draw).toContain('export const DRAW_TIME_SIDEARM = 0.25;');
    expect(draw).toContain('export const HOLSTER_TIME = 0.075;');
    const wpn = t.read(WPN)!;
    expect(wpn).toContain('const SWAP_TIME = 0.3;');
    expect(wpn).toContain('const GRENADE_TIME = 0.6;');
    expect(t.read(ACT)).toContain('export const CLIP_RATE = { startShift: 2, stopSettle: 2, land: 2 };');
  });

  it('a dry run (no write) changes nothing and identity bakes nothing', () => {
    const t = tree();
    const before = t.read(DRAW);
    const r = tuneBake(exp([entry(CLIP_GUN, 'pistolDraw', 1.25)]), cat, t.read);
    expect(r.ok).toBe(true);
    expect(r.diff).toContain('-export const DRAW_TIME_SIDEARM = 0.5;');
    expect(r.diff).toContain('+export const DRAW_TIME_SIDEARM = 0.4;');
    expect(t.read(DRAW)).toBe(before);
    const none = tuneBake(exp([entry(CLIP_GUN, 'pistolDraw', 1)]), cat, t.read);
    expect(none.writes).toHaveLength(0);
  });
});
