// (piano-escape S1) The scene shell: the flag, the `clear` objective, the empty kit, the porch line and the end (no
// record, a fade, back to the menu). The map's geometry tests wait for the greybox (the map is a stub).
// (piano-escape S2) The intro and the EMP beat on a fake world, the spawn seam and the 7 m rule on a stub SectorMode.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREVIEW_ON, darkFlag, flags } from '../src/core/flags';
import { MAPS, getMap } from '../src/world/maps';
import { THORNBECK_LIGHTNING, THORNBECK_SECTORS, thornbeckMill } from '../src/world/maps/thornbeckMill';
import { Lightning } from '../src/world/lightning';
import { SectorRun, checkSectors, clearDone, exitZone, type SectorDef } from '../src/game/sectors';
import {
  BELT_Y,
  PIANO_FADE_S,
  PORCH_LINE,
  PianoScene,
  RESTART_SPAWN_S,
  SCENE_SPAWN_MIN,
  SEARCH_SLOTS,
  SEARCH_X,
  SEARCH_Z,
  emptyKit,
  isPianoScene,
  LIGHTNING_OFF_T0,
  empHooks,
  knifeSwitch,
  setPianoLeave,
  type FadeLayer,
  type PianoEmpHooks,
  type PianoHost,
  type PianoMusic,
  type PianoWorld,
} from '../src/game/pianoScene';
import { EMP_CUT_S, EMP_OUT_S, EMP_SEEK, OBJECTIVE_LINE, PROMPT_AT, RADIO_LINE, SKIP_SEEK } from '../src/game/pianoIntro';
import { SectorMode } from '../src/game/modes/sectorMode';
import type { GameState } from '../src/game/gameState';
import { hyp2 } from '../src/core/mathx';
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

// ---------------------------------------------------------------- S2: the intro and the EMP

describe('S2: the intro and the EMP beat (the scene on a fake world)', () => {
  function world(over: Partial<PianoWorld> = {}) {
    const log: string[] = [];
    const slots: boolean[] = [false, false, false, false];
    let onSkip: (() => void) | null = null;
    let use: ((by: string) => void) | null = null;
    let local = false;
    const hooks: PianoEmpHooks = {
      mainsOff: (x, y, z, o) => (log.push(`mainsOff ${x} ${y} ${z} ${o}`), 16),
      lightningT0: (t) => void log.push(`t0 ${t}`),
      sceneDark: (on) => void log.push(`dark ${on}`),
      blackoutSearchSlots: (s, x, z) => {
        log.push(`search ${s.join(',')} ${x} ${z}`);
        return s.filter((k) => slots[k]).length;
      },
    };
    const music: PianoMusic = {
      scene: (on) => void log.push(`music ${on}`),
      piano: {
        start: () => (log.push('piano start'), Promise.resolve()),
        seek: (s) => void log.push(`seek ${s}`),
        fadeOut: (s) => void log.push(`fadeOut ${s}`),
      },
    };
    const w: PianoWorld = {
      hooks,
      music,
      spawn: () => void log.push('spawn'),
      spawned: (k) => slots[k] === true,
      simTime: () => 123.5,
      localPress: () => local,
      empItems: (on, u) => {
        log.push(`items ${on}`);
        use = u;
      },
      operatorAt: (by, out) => {
        out.x = 4;
        out.y = 0;
        out.z = by === 'local' ? 4.6 : 6;
      },
      hud: (on) => void log.push(`hud ${on}`),
      cutLines: (r, o) => void log.push(`lines ${r} | ${o}`),
      guardWithin: () => false,
      sectionGuards: () => 12,
      view: (_i, s) => {
        onSkip = s;
        return null;
      },
      knifeScene: (on) => void log.push(`knife ${on}`),
      ...over,
    };
    return {
      w,
      log,
      slots,
      skip: () => onSkip?.(),
      use: (by: string) => use?.(by),
      pressLocal: (on: boolean) => {
        local = on;
      },
    };
  }

  function started(over: Partial<PianoWorld> = {}) {
    const f = world(over);
    const sc = new PianoScene(host().h, () => null, f.w);
    sc.start();
    return { ...f, sc, intro: sc.intro! };
  }

  /** The intro to the prompt (music in, 38 s on the clock). */
  function toPrompt(s: ReturnType<typeof started>): void {
    s.intro.musicStarted();
    s.intro.step(PROMPT_AT);
    s.sc.step(1 / 60, true);
  }

  it('the intro: guards held, no objective yet, the HUD hidden, the piano from 0 s (once)', () => {
    const s = started();
    expect(s.sc.holdsSpawn).toBe(true);
    expect(s.sc.inPlay).toBe(false);
    // (S4) no flash in the intro: the lightning's t0 is off until the press
    expect(s.log).toEqual([`t0 ${LIGHTNING_OFF_T0}`, 'hud false', 'music true', 'piano start']);
    // before the prompt: no items, a press does nothing
    s.intro.musicStarted();
    s.intro.step(20);
    s.pressLocal(true);
    s.sc.step(1 / 60, true);
    expect(s.sc.pressed).toBe(false);
    expect(s.sc.press('local')).toBe(false);
    expect(s.log).toHaveLength(4);
  });

  it('the skip seeks the music to 38 s', () => {
    const s = started();
    s.skip();
    expect(s.log[s.log.length - 1]).toBe(`seek ${SKIP_SEEK}`);
  });

  it('at the prompt: the EMP items go up once (either operator); the press runs the beat in the PLAN order', () => {
    const s = started();
    toPrompt(s);
    s.sc.step(1 / 60, true);
    expect(s.log.filter((l) => l === 'items true')).toHaveLength(1);
    s.log.length = 0;
    s.pressLocal(true);
    s.sc.step(1 / 60, true);
    expect(s.sc.pressed).toBe(true);
    expect(s.sc.pressedBy).toBe('local');
    expect(s.log).toEqual(['items false', `mainsOff 4 ${BELT_Y} 4.6 ${EMP_OUT_S}`, 't0 123.5', `seek ${EMP_SEEK}`, 'dark true', 'spawn', 'knife true']);
    expect(s.sc.t0).toBe(123.5);
    expect(s.sc.lampsCut).toBe(16);
    expect(s.sc.holdsSpawn).toBe(false);
    // once
    expect(s.sc.press('local')).toBe(false);
  });

  it('blackoutSearchSlots goes once fill has spawned the pair (never in the spawn step) and returns 2', () => {
    const s = started();
    toPrompt(s);
    s.sc.press('local');
    expect(s.log.some((l) => l.startsWith('search'))).toBe(false);
    s.slots[0] = true;
    s.sc.step(1 / 60, true);
    expect(s.sc.searches).toBe(0);
    s.slots[1] = s.slots[2] = s.slots[3] = true;
    s.sc.step(1 / 60, true);
    s.sc.step(1 / 60, true);
    expect(s.log.filter((l) => l.startsWith('search'))).toEqual([`search ${SEARCH_SLOTS.join(',')} ${SEARCH_X} ${SEARCH_Z}`]);
    expect(SEARCH_SLOTS).toEqual([0, 1]);
    expect([SEARCH_X, SEARCH_Z]).toEqual([5.5, 5.25]);
    expect(s.sc.searched).toBe(2);
  });

  it("a partner's press (the host-checked item use) sets it off at the partner", () => {
    const s = started();
    toPrompt(s);
    s.use('p2');
    expect(s.sc.pressedBy).toBe('p2');
    expect(s.log).toContain(`mainsOff 4 ${BELT_Y} 6 ${EMP_OUT_S}`);
  });

  it('(knife S4b) the intro pose: on at the intro (stand; mirror on a client), off for a restart in the intro and back after the respawn, off at the cut, once each way', () => {
    const poses: string[] = [];
    const s = started({ introPose: (on, v) => void poses.push(`${on} ${v}`) });
    expect(poses).toEqual(['true stand']);
    toPrompt(s);
    s.sc.restarted();
    expect(poses).toEqual(['true stand', 'false stand']);
    s.sc.step(0.3, true);
    expect(poses).toHaveLength(2);
    s.sc.step(0.2, true);
    expect(poses).toEqual(['true stand', 'false stand', 'true stand']);
    s.sc.press('local');
    s.intro.step(EMP_CUT_S + 0.1);
    s.sc.step(1 / 60, true);
    expect(s.sc.inPlay).toBe(true);
    expect(poses).toEqual(['true stand', 'false stand', 'true stand', 'false stand']);
    s.sc.finish();
    s.sc.dispose();
    expect(poses).toHaveLength(4);
    const c: string[] = [];
    const k = started({ introPose: (on, v) => void c.push(`${on} ${v}`), askEmp: () => undefined });
    k.sc.dispose();
    expect(c).toEqual(['true mirror', 'false mirror']);
  });

  it('press + 2.5 s: the cut (input on, the HUD, the radio line, the objective line)', () => {
    const s = started();
    toPrompt(s);
    s.sc.press('local');
    s.intro.step(EMP_CUT_S - 0.1);
    s.sc.step(1 / 60, true);
    expect(s.sc.inPlay).toBe(false);
    s.intro.step(0.2);
    s.sc.step(1 / 60, true);
    expect(s.sc.inPlay).toBe(true);
    expect(s.log).toContain('hud true');
    expect(s.log).toContain(`lines ${RADIO_LINE} | ${OBJECTIVE_LINE}`);
    expect(RADIO_LINE).toBe("Lights are dead. They'll come with torches.");
    expect(OBJECTIVE_LINE).toBe('Take down every guard. The hoist door, top floor, west end.');
  });

  it('a restart never replays the intro and the music plays on; after the respawn the dark, the spawn and the search run again', () => {
    const s = started();
    // before the EMP a restart changes nothing (the intro runs on)
    s.sc.restarted();
    expect(s.sc.holdsSpawn).toBe(true);
    toPrompt(s);
    s.sc.press('local');
    s.slots[0] = s.slots[1] = true;
    s.intro.step(EMP_CUT_S + 0.1);
    s.sc.step(1 / 60, true);
    const intro = s.sc.intro;
    s.log.length = 0;
    s.slots[0] = s.slots[1] = false;
    s.sc.restarted();
    expect(s.sc.holdsSpawn).toBe(true);
    s.sc.step(0.2, true);
    expect(s.log).toEqual([]);
    s.sc.step(0.25, true);
    expect(s.log).toEqual(['dark true', 'spawn']);
    s.slots[0] = s.slots[1] = true;
    s.sc.step(1 / 60, true);
    expect(s.log).toEqual(['dark true', 'spawn', `search 0,1 ${SEARCH_X} ${SEARCH_Z}`]);
    expect(s.sc.searches).toBe(2);
    // no new intro, no music start or seek, no second mains cut (it holds)
    expect(s.sc.intro).toBe(intro);
    expect(s.sc.intro!.shot).toBe('play');
    expect(s.log.some((l) => /piano start|seek|mainsOff|music/.test(l))).toBe(false);
    expect(RESTART_SPAWN_S).toBeGreaterThan(0.3);
  });

  it('the end: the piano fades with the picture; dispose ends the dark, the items and the scene music', () => {
    const s = started();
    toPrompt(s);
    s.sc.press('local');
    s.log.length = 0;
    s.sc.finish();
    // (S4) the knife scene ends with the scene, once
    expect(s.log).toEqual(['knife false', `fadeOut ${PIANO_FADE_S}`]);
    s.sc.dispose();
    expect(s.log.slice(2)).toEqual(['items false', 'dark false', 'music false']);
  });

  it('(S4) the knife scene: on at the EMP (not before, a restart keeps it), off once when the scene goes any way', () => {
    const s = started();
    toPrompt(s);
    expect(s.log.filter((l) => l.startsWith('knife'))).toEqual([]);
    s.sc.press('local');
    s.sc.restarted();
    s.sc.step(1, true);
    expect(s.log.filter((l) => l.startsWith('knife'))).toEqual(['knife true']);
    // leaving without the end (the pause menu's quit): dispose turns it off
    s.sc.dispose();
    s.sc.dispose();
    expect(s.log.filter((l) => l.startsWith('knife'))).toEqual(['knife true', 'knife false']);
  });

  it('(S4) the co-op host keeps the campaign revive cap for a scene map (no Sector Ops syringes)', () => {
    const h = src('src/net/coopHost.ts');
    expect(h).toContain("if (mode === 'sector' && isPianoScene(g.world.map)) this.reviveClock.cap = REVIVES_PER_MISSION;");
    expect(isPianoScene(thornbeckMill)).toBe(true);
  });

  it('(S4) knifeSwitch: setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, on))', () => {
    const was = flags.pianoEscape;
    const set: boolean[] = [];
    const g = (scene?: 'piano') => ({ takedown: { setKnifeScene: (on: boolean) => void set.push(on) }, world: { map: { scene } } });
    try {
      flags.pianoEscape = true;
      knifeSwitch(g('piano'), true);
      knifeSwitch(g('piano'), false);
      knifeSwitch(g(undefined), true);
      flags.pianoEscape = false;
      knifeSwitch(g('piano'), true);
    } finally {
      flags.pianoEscape = was;
    }
    expect(set).toEqual([true, false, false, false]);
  });

  it('the framed reveals: the hoist door as the objective closes, once; a guard within 10 m stops it; none in the intro', () => {
    for (const near of [false, true]) {
      const reveals: number[] = [];
      const s = started({
        guardWithin: () => near,
        view: () => ({ burst: () => undefined, cut: () => undefined, reveal: (i) => void reveals.push(i), revealing: false, dispose: () => undefined }),
      });
      s.sc.step(1 / 60, false);
      expect(reveals).toEqual([]);
      toPrompt(s);
      s.sc.press('local');
      s.intro.step(EMP_CUT_S + 0.1);
      s.sc.step(1 / 60, true);
      s.sc.step(1 / 60, false);
      s.sc.step(1 / 60, true);
      s.sc.step(1 / 60, false);
      expect(reveals).toEqual(near ? [] : [1]);
    }
  });

  it('(S4) empHooks: the mains cut, the lightning t0, the scene dark and the search on the real APIs', () => {
    const calls: (number | undefined)[][] = [];
    const lights = { mainsOff: (x: number, y: number, z: number, over?: number) => (calls.push([x, y, z, over]), 7) };
    const lt = new Lightning(THORNBECK_LIGHTNING);
    const searched: string[] = [];
    const em = {
      sceneDark: false,
      blackoutSearchSlots: (s: readonly number[], x: number, z: number) => (searched.push(`${s.join(',')} ${x} ${z}`), s.length),
    };
    const h = empHooks(lights, () => lt, () => em);
    expect(h.mainsOff(1, 2, 3, 0.8)).toBe(7);
    expect(calls).toEqual([[1, 2, 3, 0.8]]);
    h.lightningT0(5);
    expect(lt.t0).toBe(5);
    h.sceneDark(true);
    expect(em.sceneDark).toBe(true);
    h.sceneDark(false);
    expect(em.sceneDark).toBe(false);
    expect(h.blackoutSearchSlots([0, 1], 5.5, 5.25)).toBe(2);
    expect(searched).toEqual(['0,1 5.5 5.25']);
    // no lightning on the map, no guard manager (a co-op client): nothing happens, no search
    const none = empHooks(lights, () => null, () => null);
    none.lightningT0(5);
    none.sceneDark(true);
    expect(none.blackoutSearchSlots([0, 1], 5.5, 5.25)).toBe(0);
    // no stand-in is left (#602, #603, #604 are all on the base)
    const p = src('src/game/pianoScene.ts');
    expect(p).not.toMatch(/TODO(#60[234])|disrupt|retakeStart/);
    expect(p).not.toContain('TODO(#603)');
    expect(p).not.toContain('TODO(#604)');
  });

  it('(S4) no flash before the EMP: t0 off reads 0 at every sim time; the press time starts the timetable', () => {
    const lt = new Lightning(THORNBECK_LIGHTNING);
    lt.t0 = LIGHTNING_OFF_T0;
    for (let t = 0; t < 400; t += 0.05) expect(lt.levelAt(t)).toBe(0);
    lt.t0 = 100;
    const first = THORNBECK_LIGHTNING.flashes[0]!.t;
    expect(lt.levelAt(100 + first - 0.5)).toBe(0);
    expect(lt.levelAt(100 + first + 0.05)).toBeGreaterThan(0);
  });

  it('(S4) the map carries its lightning and its rain', () => {
    expect(thornbeckMill.lightning).toBe(THORNBECK_LIGHTNING);
    const rain = THORNBECK_SECTORS[0]!.noisy ?? [];
    expect(rain).toHaveLength(1);
    expect(rain[0]).toMatchObject({ id: 'rain', db: 6, radius: Infinity });
  });
});

describe('S2: the spawn seam and the 7 m rule (SectorMode on a stub game)', () => {
  afterEach(() => vi.restoreAllMocks());

  /** The four opening guards at their stop spots (PLAN section 3). */
  const FOUR: readonly (readonly [number, number])[] = [
    [7.5, 8.7],
    [8.3, 8.0],
    [9.0, 2.0],
    [10.0, 3.4],
  ];
  const PLAYERS: readonly (readonly [number, number])[] = [
    [4.0, 4.6],
    [4.0, 6.0],
  ];

  function sector(spots: readonly (readonly [number, number])[]) {
    const spawned: { x: number; z: number }[] = [];
    const em = {
      enemies: [] as unknown[],
      maxAlive: 32,
      coordinated: true,
      get alive(): number {
        return em.enemies.length;
      },
      spawn: (_kind: string, at: { x: number; z: number }) => {
        const e = { alive: true, setPatrol: () => undefined };
        em.enemies.push(e);
        spawned.push({ x: at.x, z: at.z });
        return e;
      },
      placeSlot: () => undefined,
    };
    const refs = PLAYERS.map(([x, z]) => ({ feet: { x, y: 0, z } }));
    const g = {
      world: { map: { sectors: [] }, layout: {}, doors: { list: [] } },
      enemyMgr: em,
      playerRefsInto: (out: unknown[]) => {
        out.length = 0;
        out.push(...refs);
        return out;
      },
      hud: { feedItem: () => undefined },
    } as unknown as GameState;
    const mode = new SectorMode(g);
    const m = mode as unknown as {
      fill(): void;
      sceneSpawn(): void;
      scene: PianoScene | null;
      pending: { k: number; slot: { kind: string; x: number; z: number; yaw: number }; alerted: boolean }[];
    };
    spots.forEach(([x, z], k) => m.pending.push({ k, slot: { kind: 'grunt', x, z, yaw: 0 }, alerted: false }));
    return { m, spawned };
  }

  const nearest = (x: number, z: number): number => Math.min(...PLAYERS.map(([px, pz]) => hyp2(px - x, pz - z)));

  it('the opening four stand 4-6.5 m from the players (inside the 7 m rule)', () => {
    for (const [x, z] of FOUR) {
      expect(nearest(x, z)).toBeGreaterThanOrEqual(4);
      expect(nearest(x, z)).toBeLessThan(6.5);
    }
  });

  it('a normal Sector Ops spawn keeps the 7 m rule: none of the four spawn, a guard 8 m off does', () => {
    const { m, spawned } = sector([...FOUR, [14, 5]]);
    m.fill();
    expect(spawned).toEqual([{ x: 14, z: 5 }]);
    expect(m.pending).toHaveLength(4);
    // sceneSpawn on a map that is not a scene does nothing
    m.sceneSpawn();
    expect(spawned).toHaveLength(1);
  });

  it('the scene EMP spawn places the four on their spots 4-6 m away; 4 m stays the floor; a later fill keeps the 7 m rule', () => {
    const { m, spawned } = sector([...FOUR, [5.5, 4.0]]);
    m.scene = new PianoScene(host().h, () => null);
    m.sceneSpawn();
    expect(spawned).toEqual(FOUR.map(([x, z]) => ({ x, z })));
    // the guard 1.6 m from a player waits (never nearer than SCENE_SPAWN_MIN)
    expect(SCENE_SPAWN_MIN).toBe(4);
    expect(m.pending.map((p) => p.k)).toEqual([4]);
    m.fill();
    expect(m.pending).toHaveLength(1);
  });

  it('while the scene holds its spawn (the intro, a restart wait) fill spawns no one', () => {
    const { m, spawned } = sector([[20, 20]]);
    const sc = new PianoScene(host().h, () => null);
    sc.holdsSpawn = true;
    m.scene = sc;
    m.fill();
    m.sceneSpawn();
    expect(spawned).toEqual([]);
    sc.holdsSpawn = false;
    m.fill();
    expect(spawned).toHaveLength(1);
  });

  it('SectorMode wires the seams: the scene steps, gates the objective, restarts before the reload, holds fill', () => {
    const mode = src('src/game/modes/sectorMode.ts');
    expect(mode).toContain("this.scene.step(dt, this.run.phase === 'objective');");
    // (S4) the press goes to the client at once, and every sector message carries it (`ep`)
    expect(mode).toContain('if (this.scene.takeEmpNews()) this.secT = 0;');
    expect(mode).toContain('...(this.scene && this.scene.t0 >= 0 ? { ep: this.scene.t0 } : {})');
    expect(mode).toContain("s.objective.kind === 'clear' && (!this.scene || this.scene.inPlay)) this.clearStep(s);");
    const r = mode.indexOf('this.scene?.restarted();');
    expect(r).toBeGreaterThan(0);
    expect(mode.indexOf('this.loadSection(this.run.index);', r)).toBeGreaterThan(r);
    expect(mode).toContain('if (this.scene?.holdsSpawn) return;');
    expect(mode).toContain('const minD = this.sceneNear ? SCENE_SPAWN_MIN : SPAWN_MIN_DIST;');
  });
});

describe('S2: the view and the gameState render-override seam', () => {
  it('(look fix) the operator shows while the scene films him: the tight-space body fade is off while the view holds', () => {
    const g = src('src/game/gameState.ts');
    const fu = g.indexOf('this.player.cam.sceneOwned = !!sv?.holdsInput;');
    expect(fu).toBeGreaterThan(0);
    expect(fu).toBeLessThan(g.indexOf('this.player.frameUpdate(dt, alpha, look'));
    expect(src('src/player/shoulderCamera.ts')).toContain('const fv = this.freeOn || this.sceneOwned;');
  });

  it('one SceneView seam in gameState: the field, the held input and pause, the frame after the game view', () => {
    const g = src('src/game/gameState.ts');
    expect(g).toContain('export interface SceneView {');
    expect(g).toContain('sceneView: SceneView | null = null;');
    expect(g).toContain("if (realIn.pressed('pause') && !sv?.ownsPause) {");
    expect(g).toContain('const real = this.paused || this.menuOpen || sv?.holdsInput ? this.menuInp');
    const fu = g.indexOf('sv?.frame(dt);');
    expect(fu).toBeGreaterThan(g.indexOf('this.player.frameUpdate(dt, alpha, look'));
  });

  it("the intro actor API is Guard AI's GuardActor's (#611): the stand-in implements it and makeActor builds the GuardActor", () => {
    const v = src('src/game/pianoIntroView.ts');
    const api = v.slice(v.indexOf('export interface IntroActor {'), v.indexOf('}', v.indexOf('export interface IntroActor {')));
    for (const k of ['setRate(r: number)', 'aimAt(x: number, y: number, z: number)', 'step(realDt: number)', 'fire(): boolean', 'muzzle(out: Vector3): Vector3', 'dispose(): void', 'done', 'pos', 'yaw', 'travelled', 'length', 'playRate', 'isDisposed']) {
      expect(api, k).toContain(k);
    }
    expect(v).toContain('class PosedStandIn implements IntroActor');
    expect(v).not.toContain('TODO(#611)');
    expect(v).toContain('new GuardActor(g.scene, g.world, ENEMIES.grunt, actorPath(i)');
    // Babylon only through core/babylon; never src/net
    expect(v).not.toMatch(/@babylonjs/);
    expect(v).not.toMatch(/from '\.\.\/net|from '\.\/net/);
  });
});
