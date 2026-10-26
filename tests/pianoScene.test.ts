// (piano-escape S1) The scene shell: the flag, the `clear` objective, the empty kit, the porch line and the end (no
// record, a fade, back to the menu). The map's geometry tests wait for the greybox (the map is a stub).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PREVIEW_ON, darkFlag, flags } from '../src/core/flags';
import { MAPS, getMap } from '../src/world/maps';
import { THORNBECK_SECTORS, thornbeckMill } from '../src/world/maps/thornbeckMill';
import { SectorRun, checkSectors, clearDone, exitZone, type SectorDef } from '../src/game/sectors';
import { PIANO_FADE_S, PORCH_LINE, PianoScene, emptyKit, isPianoScene, setPianoLeave, type FadeLayer, type PianoHost } from '../src/game/pianoScene';
import type { PlayerRef } from '../src/ai/enemy';

const src = (p: string): string => readFileSync(resolve(__dirname, '..', p), 'utf8').replace(/\r\n/g, '\n');

interface FakeSlot {
  def: { class: string };
  mag: number;
  reserve: number;
  sd?: number;
  stats: { magSize: number };
}
const slot = (cls: string, mag: number, reserve: number, sd?: number): FakeSlot => ({ def: { class: cls }, mag, reserve, stats: { magSize: 15 }, ...(sd !== undefined ? { sd } : {}) });

function host(over: Partial<PianoHost> = {}): { h: PianoHost; fed: string[]; ends: string[]; switched: number[]; slots: FakeSlot[]; counts: Record<string, number> } {
  const fed: string[] = [];
  const ends: string[] = [];
  const switched: number[] = [];
  const slots = [slot('rifle', 30, 90), slot('pistol', 15, 45, 12)];
  const counts: Record<string, number> = { frag: 2, noisemaker: 1, emp: 0 };
  const h: PianoHost = {
    weapons: {
      slots,
      gadgets: { counts },
      index: 0,
      switchTo(i: number) {
        switched.push(i);
        this.index = i;
      },
    },
    hud: { feedItem: (t: string) => void fed.push(t) },
    net: null,
    endSession: (_w: boolean, s: string) => void ends.push(s),
    playerRefsInto: () => [],
    ...over,
  };
  return { h, fed, ends, switched, slots, counts };
}

const ref = (x: number, z: number, y = 0): PlayerRef => ({ feet: { x, y, z } }) as unknown as PlayerRef;

afterEach(() => setPianoLeave(null));

describe('the flag and the map entry', () => {
  it('pianoEscape is off by default (no ?piano=1, not /preview/): the map is not listed', () => {
    expect(PREVIEW_ON).toBe(false);
    expect(flags.pianoEscape).toBe(false);
    expect(MAPS.some((m) => m.id === 'thornbeckMill')).toBe(false);
    // an unlisted id falls back (a client without the flag loads the proving grounds)
    expect(getMap('thornbeckMill').id).not.toBe('thornbeckMill');
  });

  it('reads ?piano= through darkFlag with the preview default', () => {
    expect(darkFlag(null, false)).toBe(false);
    expect(darkFlag('1', false)).toBe(true);
    expect(darkFlag(null, true)).toBe(true);
    expect(darkFlag('0', true)).toBe(false);
    expect(src('src/core/flags.ts')).toMatch(/pianoEscape: darkFlag\(params\.get\('piano'\), PREVIEW_ON\)/);
  });

  it('the MAPS entry is behind the flag', () => {
    expect(src('src/world/maps/index.ts')).toMatch(/\.\.\.\(flags\.pianoEscape \? \[thornbeckMill\] : \[\]\)/);
  });

  it('the main-menu entry is created only with the flag on, and the Sector Ops list skips scene maps', () => {
    const main = src('src/main.ts');
    const i = main.indexOf("key: 'piano'");
    expect(i).toBeGreaterThan(0);
    // the entry sits inside `if (flags.pianoEscape) {`, before the next top-level block
    const before = main.slice(0, i);
    expect(before.lastIndexOf('if (flags.pianoEscape) {')).toBeGreaterThan(before.lastIndexOf('\n  }\n'));
    expect(main).toContain("label: 'Piano Escape'");
    expect(src('src/ui/screens/missionsScreen.ts')).toMatch(/\.filter\(\(m\) => m\.modes\.includes\('sector'\)[^\n]*&& !m\.scene\)/);
  });

  it('the map: the piano scene on the sector runtime, one clear section, the 12 guards (S1b)', () => {
    expect(thornbeckMill.id).toBe('thornbeckMill');
    expect(thornbeckMill.name).toBe('Thornbeck Mill');
    expect(thornbeckMill.scene).toBe('piano');
    expect(thornbeckMill.modes).toEqual(['sector']);
    expect(thornbeckMill.sectors).toBe(THORNBECK_SECTORS);
    expect(THORNBECK_SECTORS).toHaveLength(1);
    expect(THORNBECK_SECTORS[0]!.objective.kind).toBe('clear');
    expect(THORNBECK_SECTORS[0]!.guards).toHaveLength(12);
    expect(checkSectors(THORNBECK_SECTORS)).toEqual([]);
    expect(isPianoScene(thornbeckMill)).toBe(true);
    expect(isPianoScene(getMap('warehouseOps'))).toBe(false);
  });
});

describe('the clear objective', () => {
  it('is done only when none is pending and none is living', () => {
    expect(clearDone(0, 0)).toBe(true);
    expect(clearDone(1, 0)).toBe(false);
    expect(clearDone(0, 1)).toBe(false);
    expect(clearDone(3, 8)).toBe(false);
  });

  it('a woken guard counts again (living goes back up)', () => {
    expect(clearDone(0, 0)).toBe(true);
    expect(clearDone(0, 1)).toBe(false);
  });

  it('on the last section it opens the extraction (the run goes to the extract phase)', () => {
    const run = new SectorRun(THORNBECK_SECTORS);
    expect(run.phase).toBe('objective');
    expect(run.objectiveDone()).toBe(true);
    expect(run.phase).toBe('extract');
    expect(exitZone(THORNBECK_SECTORS[0] as SectorDef)).not.toBeNull();
    // it can only be done once
    expect(run.objectiveDone()).toBe(false);
  });

  it('SectorMode feeds it the pending list and the living count, with no interactable', () => {
    const mode = src('src/game/modes/sectorMode.ts');
    expect(mode).toContain('clearDone(this.pending.length, em.alive)');
    expect(mode).toMatch(/if \(o\.kind === 'clear'\) \{\n\s+g\.hud\.setObjective\(o\.label\);\n\s+return;/);
  });
});

describe('the empty kit', () => {
  it('zeroes every gun, quiet rounds and gadget, and finds the pistol', () => {
    const { slots, counts } = host();
    const i = emptyKit(slots as never, counts);
    expect(i).toBe(1);
    for (const s of slots) {
      expect(s.mag).toBe(0);
      expect(s.reserve).toBe(0);
    }
    expect(slots[1]!.sd).toBe(0);
    expect(slots[0]!.sd).toBeUndefined();
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
  });

  it('start() empties the kit and draws the pistol; no pistol: no swap', () => {
    const a = host();
    new PianoScene(a.h, () => null).start();
    expect(a.slots.every((s) => s.mag === 0 && s.reserve === 0)).toBe(true);
    expect(a.switched).toEqual([1]);
    const b = host();
    b.slots.splice(1, 1);
    new PianoScene(b.h, () => null).start();
    expect(b.switched).toEqual([]);
  });

  it('start() runs before the section records its checkpoint (so a restart is empty too)', () => {
    const mode = src('src/game/modes/sectorMode.ts');
    const a = mode.indexOf('this.scene.start();');
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(mode.indexOf('this.loadSection(this.run.index);\n    this.beginSection();'));
  });
});

describe('the porch line', () => {
  it('shows once, only for a player inside the exit zone', () => {
    const { h, fed } = host();
    const sc = new PianoScene(h, () => null);
    const s = THORNBECK_SECTORS[0]!;
    const zone = exitZone(s)!;
    const [x0, z0, x1, z1] = zone.box;
    const y = zone.floorY ?? 0;
    sc.porchStep(s, [ref(0, 0)]);
    expect(fed).toEqual([]);
    sc.porchStep(s, [ref(0, 0), ref((x0 + x1) / 2, (z0 + z1) / 2, y)]);
    expect(fed).toEqual([PORCH_LINE]);
    sc.porchStep(s, [ref((x0 + x1) / 2, (z0 + z1) / 2, y)]);
    expect(fed).toHaveLength(1);
    expect(PORCH_LINE).toBe('Not yet. Nobody walks away from this.');
  });
});

describe('the end', () => {
  function fakeFade(): { f: FadeLayer; log: string[] } {
    const log: string[] = [];
    return { f: { to: (a, s) => void log.push(`to ${a} ${s}`), dispose: () => void log.push('dispose') }, log };
  }

  it('finish() fades to black over PIANO_FADE_S and says how long; leave() goes to the menu once', () => {
    const { f, log } = fakeFade();
    let left = 0;
    setPianoLeave(() => void left++);
    const { h, ends } = host();
    const sc = new PianoScene(h, () => f);
    expect(sc.finish()).toBe(PIANO_FADE_S);
    expect(PIANO_FADE_S).toBe(2);
    expect(log).toEqual(['to 1 2']);
    expect(sc.finish()).toBe(PIANO_FADE_S);
    expect(log).toHaveLength(1);
    sc.leave();
    sc.leave();
    expect(left).toBe(1);
    // no results screen, no end session
    expect(ends).toEqual([]);
    sc.dispose();
    expect(log[log.length - 1]).toBe('dispose');
  });

  it('co-op, or no menu hook: the host ends as it always does (S4 gives co-op its lobby)', () => {
    const a = host({ net: {} });
    setPianoLeave(() => {
      throw new Error('solo menu hook in co-op');
    });
    new PianoScene(a.h, () => null).leave();
    expect(a.ends).toHaveLength(1);
    setPianoLeave(null);
    const b = host();
    new PianoScene(b.h, () => null).leave();
    expect(b.ends).toHaveLength(1);
  });

  it('a scene end writes no record, rating, star, banner or results: complete() returns before them', () => {
    const mode = src('src/game/modes/sectorMode.ts');
    const c = mode.slice(mode.indexOf('private complete(): void {'));
    const body = c.slice(0, c.indexOf('\n  }\n'));
    const scene = body.indexOf('if (this.scene) {');
    expect(scene).toBeGreaterThan(0);
    for (const later of ['this.rate(', 'markCompleted(', "emit('operationComplete'", 'SECTORS CLEAR', 'slowBeat(']) {
      expect(body.indexOf(later), later).toBeGreaterThan(scene);
    }
    // and the end of the timer leaves through the scene, never through endSession's results
    expect(mode).toMatch(/if \(this\.scene\) \{\n\s+this\.scene\.leave\(\);\n\s+return;\n\s+\}\n\s+if \(this\.result\(\)\.ghost\)/);
  });

  it('the scene file never imports src/net and never touches the save', () => {
    const p = src('src/game/pianoScene.ts');
    expect(p).not.toMatch(/from '\.\.\/net|from '\.\/net/);
    expect(p).not.toMatch(/save|markCompleted|updateRatingRecord/i);
  });
});
