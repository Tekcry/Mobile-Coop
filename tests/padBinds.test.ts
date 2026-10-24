// (locomotion step 18, D7) controller remapping: defaults, remap, reset, the two-button cap, mapPad reads the table
import { describe, expect, it } from 'vitest';
import { GAME_BINDINGS, mapPad, PAD, type PadTuning } from '../src/input/gamepadMapping';
import { assignPadBind, clearPadBind, defaultPadBinds, padBindLabels, padBindTable, PAD_BINDS, sanitizePadBinds } from '../src/input/padBinds';
import { defaultSettings, SettingsStore } from '../src/core/settings';

const T: PadTuning = { deadzoneLeft: 0.15, deadzoneRight: 0.15, triggerDeadzone: 0.05, curve: 'linear', invertY: false };
const snap = (...down: number[]): { buttons: number[]; axes: number[] } => ({ buttons: Array.from({ length: 17 }, (_, i) => (down.includes(i) ? 1 : 0)), axes: [0, 0, 0, 0] });
const key = (t: ReadonlyArray<readonly [number, string]>): string[] => t.map(([i, a]) => `${i}:${a}`).sort();

describe('pad bindings (step 18)', () => {
  it('defaults equal the old GAME_BINDINGS (the documented table)', () => {
    expect(key(padBindTable(defaultPadBinds()))).toEqual(key(GAME_BINDINGS));
    expect(defaultSettings().pad).toEqual(defaultPadBinds());
  });

  it('(anim-rework S1) the pad: A interact, B crouch, Y jump, X holster / draw, L3 wall + shoulder, R3 zoom, RB co-op, LB wheel, D-pad left vision, right gadget, up / down free', () => {
    const m = new Map(GAME_BINDINGS.map(([i, a]) => [i, a]));
    expect(GAME_BINDINGS.filter(([i]) => i === PAD.LS).map(([, a]) => a).sort()).toEqual(['cover', 'shoulderSwap']);
    expect(m.get(PAD.A)).toBe('interact');
    expect(m.get(PAD.B)).toBe('crouch');
    expect(m.get(PAD.Y)).toBe('jump');
    expect(m.get(PAD.X)).toBe('draw');
    // (optic-coop M2) R3 zooms and pings (a reported conflict, nothing moved)
    expect(GAME_BINDINGS.filter(([i]) => i === PAD.RS).map(([, a]) => a).sort()).toEqual(['ping', 'zoom']);
    expect(m.get(PAD.RB)).toBe('coop');
    expect(m.get(PAD.LB)).toBe('gadgetWheel');
    // (anim-rework S1) no speed rocker: the stick sets the speed; D-pad up / down only step a held context menu
    expect(m.get(PAD.UP)).toBeUndefined();
    expect(m.get(PAD.DOWN)).toBeUndefined();
    expect(mapPad(snap(PAD.UP), T).buttons.ctxUp).toBe(true);
    expect(mapPad(snap(PAD.DOWN), T).buttons.ctxDown).toBe(true);
    expect(m.get(PAD.LEFT)).toBe('vision');
    expect(m.get(PAD.RIGHT)).toBe('grenade');
    // the triggers (anim-rework S1): LT is the held aim (`ads`), RT fires / strikes; LT no longer raises `altFire`
    const lt = mapPad({ ...snap(), buttons: Array.from({ length: 17 }, (_, i) => (i === PAD.LT ? 1 : 0)) }, T).buttons;
    expect(lt.ads).toBe(true);
    expect(lt.altFire).toBeUndefined();
    expect(mapPad({ ...snap(), buttons: Array.from({ length: 17 }, (_, i) => (i === PAD.RT ? 1 : 0)) }, T).buttons.fire).toBe(true);
    // L3 enters the wall; A no longer does, and Y no longer interacts
    expect(mapPad(snap(PAD.LS), T).buttons.cover).toBe(true);
    expect(mapPad(snap(PAD.A), T).buttons.cover).toBeUndefined();
    expect(mapPad(snap(PAD.Y), T).buttons.interact).toBeUndefined();
    expect(mapPad(snap(PAD.Y), T).buttons.jump).toBe(true);
  });

  it('remap: draw from X to R3, then LT; X no longer draws, the new button does (LT is still the fixed aim: the trigger is fixed)', () => {
    const b = defaultPadBinds();
    expect(assignPadBind(b, 'draw', 0, PAD.RS)).toBe(true);
    const t = padBindTable(b);
    expect(mapPad(snap(PAD.RS), T, t).buttons.draw).toBe(true);
    expect(mapPad(snap(PAD.X), T, t).buttons.draw).toBeUndefined();
    // a shared button keeps its other verb (a conflict, not a move)
    expect(mapPad(snap(PAD.RS), T, t).buttons.zoom).toBe(true);
    assignPadBind(b, 'draw', 0, PAD.LT);
    const f = mapPad(snap(PAD.LT), T, padBindTable(b));
    expect(f.buttons.draw && f.buttons.ads).toBe(true);
  });

  it('two buttons per verb at most; a second slot adds, a third assignment replaces; clear and reset', () => {
    const b = defaultPadBinds();
    assignPadBind(b, 'crouch', 1, PAD.RS);
    expect(b.crouch).toEqual([PAD.B, PAD.RS]);
    assignPadBind(b, 'crouch', 1, PAD.UP);
    expect(b.crouch).toEqual([PAD.B, PAD.UP]);
    assignPadBind(b, 'crouch', 0, PAD.UP);
    expect(b.crouch).toEqual([PAD.UP]);
    expect(assignPadBind(b, 'crouch', 0, 16)).toBe(false);
    expect(assignPadBind(b, 'crouch', 0, -1)).toBe(false);
    clearPadBind(b, 'crouch', 0);
    expect(b.crouch).toEqual([]);
    expect(padBindLabels(b, 'crouch')).toBe('Unbound');
    expect(padBindLabels(defaultPadBinds(), 'draw', 'playstation')).toBe('Square');
    const s = new SettingsStore();
    s.update((d) => void assignPadBind(d.pad, 'draw', 0, PAD.RS));
    expect(s.get().pad.draw).toEqual([PAD.RS]);
    s.reset('pad');
    expect(s.get().pad).toEqual(defaultPadBinds());
  });

  it('sanitize: unknown verbs and buttons dropped, at most two, missing verbs defaulted', () => {
    const b = sanitizePadBinds({ draw: [PAD.RB, 2.5, 99, -3, 'X', PAD.RB, PAD.LB, PAD.UP], bogus: [1], crouch: 'B' });
    expect(b.draw).toEqual([PAD.RB, PAD.LB]);
    expect(b).not.toHaveProperty('bogus');
    expect(b.crouch).toEqual([PAD.B]);
    expect(Object.keys(b).length).toBe(PAD_BINDS.length);
    expect(sanitizePadBinds(null)).toEqual(defaultPadBinds());
  });
});
