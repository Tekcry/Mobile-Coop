import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BINDS } from '../src/input/keyBindings';
import { applyAxisDeadzone, applyCurve, applyRadialDeadzone } from '../src/input/stickMath';
import { detectPadStyle, GAME_BINDINGS, mapPad, PAD, TapHold, type PadTuning } from '../src/input/gamepadMapping';
import { WHEEL_HOLD } from '../src/input/inputState';
import { InputState } from '../src/input/inputState';
import { NavRepeater } from '../src/input/navRepeat';

const tuning: PadTuning = { deadzoneLeft: 0.15, deadzoneRight: 0.12, triggerDeadzone: 0.08, curve: 'linear', invertY: false };
const snap = (buttons: Record<number, number> = {}, axes: number[] = [0, 0, 0, 0]) => ({
  buttons: Array.from({ length: 17 }, (_, i) => buttons[i] ?? 0),
  axes,
});

describe('stick maths', () => {
  it('radial dead zone zeroes small input and rescales the rest', () => {
    expect(applyRadialDeadzone(0.1, 0.05, 0.15)).toEqual({ x: 0, y: 0 });
    const v = applyRadialDeadzone(0.575, 0, 0.15, 1);
    expect(v.x).toBeCloseTo(0.5, 5);
    const full = applyRadialDeadzone(1, 0, 0.15);
    expect(full.x).toBeCloseTo(1, 5);
  });
  it('preserves direction', () => {
    const v = applyRadialDeadzone(0.5, 0.5, 0.1);
    expect(v.x).toBeCloseTo(v.y, 6);
  });
  it('axis dead zone', () => {
    expect(applyAxisDeadzone(0.05, 0.08)).toBe(0);
    expect(applyAxisDeadzone(1, 0.08)).toBe(1);
    expect(applyAxisDeadzone(-0.54, 0.08)).toBeCloseTo(-0.5, 5);
  });
  it('curves keep 0 and 1 fixed and order precise < linear < aggressive at mid input', () => {
    const mid = { x: 0.5, y: 0 };
    expect(applyCurve({ x: 1, y: 0 }, 'precise').x).toBeCloseTo(1);
    expect(applyCurve({ x: 0, y: 0 }, 'classic').x).toBe(0);
    const p = applyCurve(mid, 'precise').x;
    const l = applyCurve(mid, 'linear').x;
    const a = applyCurve(mid, 'aggressive').x;
    expect(p).toBeLessThan(l);
    expect(l).toBeLessThan(a);
  });
});

describe('gamepad mapping', () => {
  it('maps the standard layout to gameplay and UI actions', () => {
    // (F1a) the CT pad: A interact, X draw, RB co-op action, Start pause
    const f = mapPad(snap({ [PAD.A]: 1, [PAD.X]: 1, [PAD.RB]: 1, [PAD.START]: 1 }), tuning);
    expect(f.buttons.interact).toBe(true);
    expect(f.buttons.cover).toBeUndefined();
    expect(f.buttons.jump).toBeUndefined();
    expect(f.buttons.uiConfirm).toBe(true);
    expect(f.buttons.draw).toBe(true);
    expect(f.buttons.coop).toBe(true);
    expect(f.buttons.uiTabNext).toBe(true);
    expect(f.buttons.pause).toBe(true);
    expect(f.buttons.fire).toBeUndefined();
  });
  it('B is crouch in game and back in menus; Y jump only; L3 back-to-wall; d-pad vision, gadget; up / down the held context menu (anim-rework S1: no speed gears)', () => {
    const f = mapPad(snap({ [PAD.B]: 1, [PAD.Y]: 1, [PAD.UP]: 1, [PAD.DOWN]: 1, [PAD.LEFT]: 1, [PAD.RIGHT]: 1 }), tuning);
    expect(f.buttons.crouch && f.buttons.uiBack && f.buttons.jump).toBe(true);
    expect(f.buttons.interact).toBeUndefined();
    expect(f.buttons.cover).toBeUndefined();
    expect(f.buttons.vision && f.buttons.grenade && f.buttons.ctxUp && f.buttons.ctxDown && f.buttons.uiUp && f.buttons.uiLeft).toBe(true);
    expect(mapPad(snap({ [PAD.LS]: 1 }), tuning).buttons.cover).toBe(true);
    expect(mapPad(snap({ [PAD.LB]: 1 }), tuning).buttons.gadgetWheel).toBe(true);
    expect(mapPad(snap({ [PAD.SELECT]: 1 }), tuning).buttons.vision).toBeUndefined();
  });
  it('(G343) View raises the objective action and nothing else; the goggles stay on D-pad left; a held press is one edge (G24)', () => {
    const b = mapPad(snap({ [PAD.SELECT]: 1 }), tuning).buttons;
    expect(b.objective).toBe(true);
    expect(Object.keys(b).filter((k) => b[k as keyof typeof b] === true && k !== 'objective')).toEqual([]);
    expect(GAME_BINDINGS.filter(([i]) => i === PAD.SELECT)).toEqual([[PAD.SELECT, 'objective']]);
    expect(GAME_BINDINGS.filter(([, a]) => a === 'vision')).toEqual([[PAD.LEFT, 'vision']]);
    expect(mapPad(snap({ [PAD.LEFT]: 1 }), tuning).buttons.objective).toBeUndefined();
    const s = new InputState();
    s.set('pad', 'objective', true);
    expect(s.pressed('objective')).toBe(true);
    s.consumeEdges();
    s.tick(1);
    expect(s.pressed('objective')).toBe(false);
    expect(s.down('objective')).toBe(true);
  });
  it('tap / hold: a release before the hold time is a tap, a hold fires once per press', () => {
    const t = new TapHold(0.15);
    expect(t.update(true, 0)).toBeNull();
    expect(t.update(true, 0.1)).toBeNull();
    expect(t.update(false, 0.12)).toBe('tap');
    expect(t.update(false, 0.2)).toBeNull();
    expect(t.update(true, 1)).toBeNull();
    expect(t.update(true, 1.2)).toBe('hold');
    expect(t.update(true, 1.5)).toBeNull();
    expect(t.update(false, 1.6)).toBeNull();
    // the wheel hold: LB held this long opens the gadget wheel
    expect(WHEEL_HOLD).toBeCloseTo(0.15);
  });
  it('triggers: RT fires, LT is the held aim (ads; anim-rework S1), respecting dead zone', () => {
    expect(mapPad(snap({ [PAD.RT]: 0.9, [PAD.LT]: 0.9 }), tuning).buttons).toMatchObject({ fire: true, ads: true });
    expect(mapPad(snap({ [PAD.LT]: 0.9 }), tuning).buttons.altFire).toBeUndefined();
    expect(mapPad(snap({ [PAD.RT]: 0.05 }), tuning).buttons.fire).toBeUndefined();
    expect(mapPad(snap({ [PAD.LT]: 0.05 }), tuning).buttons.ads).toBeUndefined();
  });
  it('left stick: up is forward; right stick: up looks up unless inverted', () => {
    const f = mapPad(snap({}, [0, -1, 0, -1]), tuning);
    expect(f.move.y).toBeGreaterThan(0.9);
    expect(f.look.y).toBeGreaterThan(0.9);
    const inv = mapPad(snap({}, [0, 0, 0, -1]), { ...tuning, invertY: true });
    expect(inv.look.y).toBeLessThan(-0.9);
  });
  it('(sector-fixes W) the wheel stick: the right stick position, up = +y even inverted, no curve, 0 when let go', () => {
    const curved = { ...tuning, curve: 'aggressive' as const, invertY: true };
    const up = mapPad(snap({}, [0, 0, 0, -1]), curved);
    expect(up.stick.y).toBeGreaterThan(0.9);
    const half = mapPad(snap({}, [0, 0, 0.6, 0]), curved);
    expect(half.stick.x).toBeGreaterThan(0.5);
    const rest = mapPad(snap({}, [0, 0, 0.05, -0.05]), tuning);
    expect(rest.stick.x === 0 && rest.stick.y === 0).toBe(true);
  });
  it('left stick also produces menu directions', () => {
    expect(mapPad(snap({}, [0, 0.9, 0, 0]), tuning).buttons.uiDown).toBe(true);
    expect(mapPad(snap({}, [-0.9, 0.2, 0, 0]), tuning).buttons.uiLeft).toBe(true);
    expect(mapPad(snap({}, [0.3, 0.2, 0, 0]), tuning).buttons.uiRight).toBeUndefined();
  });
  it('idle pad is inactive; drift inside dead zone stays inactive', () => {
    expect(mapPad(snap({}, [0.05, -0.08, 0.04, 0.02]), tuning).active).toBe(false);
  });
  it('detects controller families for glyphs', () => {
    expect(detectPadStyle('DualSense Wireless Controller')).toBe('playstation');
    expect(detectPadStyle('Xbox Wireless Controller')).toBe('xbox');
    expect(detectPadStyle('Pro Controller (Nintendo)')).toBe('nintendo');
  });
});

describe('InputState', () => {
  it('latches edges until consumed and merges sources', () => {
    const s = new InputState();
    s.set('a', 'fire', true);
    s.set('b', 'fire', true);
    s.set('a', 'fire', false);
    expect(s.down('fire')).toBe(true);
    expect(s.pressed('fire')).toBe(true);
    s.consumeEdges();
    expect(s.pressed('fire')).toBe(false);
    s.set('b', 'fire', false);
    expect(s.buttons.fire.released).toBe(true);
  });
  it('move takes the strongest source and clamps to unit length', () => {
    const s = new InputState();
    s.setMove('kbm', 0.2, 0);
    s.setMove('pad', 1, 1);
    expect(Math.hypot(s.move.x, s.move.y)).toBeCloseTo(1);
    s.setMove('pad', 0, 0);
    expect(s.move.x).toBeCloseTo(0.2);
  });
  it('releaseAll blocks held buttons until released (no phantom presses)', () => {
    const s = new InputState();
    s.set('pad', 'pause', true);
    s.consumeEdges();
    s.releaseAll();
    s.set('pad', 'pause', true); // still physically held
    expect(s.pressed('pause')).toBe(false);
    expect(s.down('pause')).toBe(false);
    s.set('pad', 'pause', false);
    s.set('pad', 'pause', true);
    expect(s.pressed('pause')).toBe(true);
  });
  it('look accumulates and is consumed', () => {
    const s = new InputState();
    s.addLook(0.1, 0.2);
    s.addLook(0.1, 0);
    expect(s.consumeLook()).toEqual({ x: 0.2, y: 0.2 });
    expect(s.consumeLook()).toEqual({ x: 0, y: 0 });
  });
});

describe('NavRepeater', () => {
  it('fires once on press, then repeats after the delay', () => {
    const r = new NavRepeater(0.4, 0.1);
    expect(r.update(true, 0)).toBe(true);
    expect(r.update(true, 0.2)).toBe(false);
    expect(r.update(true, 0.41)).toBe(true);
    expect(r.update(true, 0.45)).toBe(false);
    expect(r.update(true, 0.52)).toBe(true);
    expect(r.update(false, 0.6)).toBe(false);
    expect(r.update(true, 0.61)).toBe(true);
  });
});

describe('holds and the drop alias', () => {
  it('crouch also raises drop (same holders); releasing either source releases both', () => {
    const s = new InputState();
    s.set('pad', 'crouch', true);
    expect(s.pressed('drop')).toBe(true);
    expect(s.down('drop')).toBe(true);
    s.set('pad', 'crouch', false);
    expect(s.down('drop')).toBe(false);
    expect(s.buttons.drop.released).toBe(true);
  });

  it('hold time and progress; interactHold goes down after the hold delay and up on release', () => {
    const s = new InputState();
    s.set('pad', 'interact', true);
    s.tick(0.1);
    expect(s.heldTime('interact')).toBeCloseTo(0.1);
    expect(s.down('interactHold')).toBe(false);
    s.tick(0.25);
    expect(s.down('interactHold')).toBe(true);
    expect(s.pressed('interactHold')).toBe(true);
    expect(s.holdProgress('interact', 1, 0.3)).toBeCloseTo(0.05);
    expect(s.holdProgress('interact', 0.01)).toBe(1);
    s.set('pad', 'interact', false);
    s.tick(0.016);
    expect(s.down('interactHold')).toBe(false);
    expect(s.heldTime('interact')).toBe(0);
    // a quick tap never becomes a hold
    s.consumeEdges();
    s.set('pad', 'interact', true);
    s.tick(0.1);
    s.set('pad', 'interact', false);
    s.tick(0.3);
    expect(s.pressed('interactHold')).toBe(false);
  });
});

// (locomotion step 17, D1) the binding table in docs/systems/input-and-loop.md agrees with GAME_BINDINGS and BINDS
describe('binding table (docs/systems/input-and-loop.md)', () => {
  const md = readFileSync('docs/systems/input-and-loop.md', 'utf8');
  const start = md.indexOf('### Binding table');
  const rows = md
    .slice(start)
    .split('\n')
    .filter((l) => l.startsWith('| ') && !l.startsWith('| Verb') && !l.startsWith('|---'))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  rows.splice(rows.findIndex((r) => r.length !== 6) >= 0 ? rows.findIndex((r) => r.length !== 6) : rows.length);
  const ticks = (c: string): string[] => [...c.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
  const PAD_NAMES: Record<string, number> = {
    A: PAD.A, B: PAD.B, X: PAD.X, Y: PAD.Y, LB: PAD.LB, RB: PAD.RB, LT: PAD.LT, RT: PAD.RT, View: PAD.SELECT, Menu: PAD.START,
    L3: PAD.LS, R3: PAD.RS, 'D-pad up': PAD.UP, 'D-pad down': PAD.DOWN, 'D-pad left': PAD.LEFT, 'D-pad right': PAD.RIGHT,
  };
  const KEY_LABEL = (code: string): string =>
    ({ ControlLeft: 'Left Ctrl', ShiftLeft: 'Left Shift', AltLeft: 'Left Alt', CapsLock: 'Caps Lock', Equal: '=', Minus: '-', Space: 'Space', Tab: 'Tab', Mouse1: 'Middle mouse' })[code] ?? code.replace(/^Key/, '');

  it('(G343) the objective row: View (tap) and O, and no other binding row uses either', () => {
    const row = rows.find((r) => ticks(r[1]!).includes('objective'));
    expect(row, 'objective row').toBeDefined();
    expect(row![2]).toMatch(/^View/);
    expect(row![4]).toContain('`objective` (O)');
    for (const r of rows) if (r !== row) {
      expect(r[2]!.split(';').some((a) => a.trim().startsWith('View')), `${r[0]} pad cell`).toBe(false);
      expect(r[4]!, `${r[0]} key cell`).not.toContain('(O)');
    }
  });

  it('has a row per verb', () => {
    expect(rows.length).toBeGreaterThanOrEqual(19);
    for (const r of rows) expect(ticks(r[1]!).length, r[0]).toBeGreaterThan(0);
  });

  it('pad cells match GAME_BINDINGS both ways', () => {
    const doc = new Set<string>();
    for (const r of rows) {
      const actions = ticks(r[1]!);
      for (const alt of r[2]!.split(';').map((s) => s.trim())) {
        const name = alt.replace(/\s*\(.*$/, '');
        const idx = PAD_NAMES[name];
        if (idx === undefined) continue;
        for (const a of actions) {
          doc.add(`${idx}:${a}`);
          // a plain button (no bracket) is a raw GAME_BINDINGS entry
          if (!alt.includes('(') && name !== 'LT' && name !== 'RT') expect(GAME_BINDINGS.some(([i, x]) => i === idx && x === a), `${name} -> ${a}`).toBe(true);
        }
      }
    }
    for (const [i, a] of GAME_BINDINGS) expect(doc.has(`${i}:${a}`), `GAME_BINDINGS ${i} -> ${a} in the table`).toBe(true);
  });

  it('KBM cells match BINDS (ids, default keys, actions) and every BINDS entry is listed', () => {
    const seen = new Set<string>();
    for (const r of rows) {
      const actions = ticks(r[1]!);
      for (const m of r[4]!.matchAll(/`(\w+)` \(([^)]*)\)/g)) {
        const def = BINDS.find((b) => b.id === m[1]);
        expect(def, `BINDS has ${m[1]}`).toBeDefined();
        seen.add(m[1]!);
        const keys = m[2]!.split(',').map((s) => s.trim()).filter((s) => s !== 'hold');
        expect(def!.defaults.map(KEY_LABEL), `${m[1]} default keys`).toEqual(keys);
        if (actions[0] === 'move') expect(def!.actions).toEqual([]);
        else expect([...def!.actions].sort(), `${m[1]} actions`).toEqual([...actions].sort());
      }
    }
    expect([...seen].sort()).toEqual(BINDS.map((b) => b.id).sort());
  });
});

describe('menu bindings (menu-ui slice 2, SPEC 4.2, MD11)', () => {
  it('pad: X is uiX, Menu / Start is uiStart and not Back', async () => {
    const f = mapPad(snap({ [PAD.X]: 1, [PAD.START]: 1 }), tuning);
    expect(f.buttons.uiX).toBe(true);
    expect(f.buttons.uiStart).toBe(true);
    expect(f.buttons.uiBack).toBeUndefined();
    expect(f.buttons.pause).toBe(true);
    const { CAPTURE_CANCEL_BTN } = await import('../src/input/gamepadSource');
    expect(CAPTURE_CANCEL_BTN).toBe(PAD.START);
  });
  it('keys: Space confirms, R = X, F = Y, E is only tab next', async () => {
    const { keyActionMap, defaultBinds } = await import('../src/input/keyBindings');
    const m = keyActionMap(defaultBinds());
    expect(m.get('Space')).toContain('uiConfirm');
    expect(m.get('KeyR')).toEqual(expect.arrayContaining(['reload', 'uiX']));
    // (CT prototype A3, G96) F is the co-op action in play; its menu role (Y) is unchanged
    expect(m.get('KeyF')).toEqual(expect.arrayContaining(['coop', 'uiAlt']));
    expect(m.get('KeyE')).toContain('uiTabNext');
    expect(m.get('KeyE')).not.toContain('uiAlt');
    expect(m.get('Escape')).toContain('uiBack');
  });
  it('WASD navigate menus, except while typing (arrows always)', async () => {
    const { menuNavTap } = await import('../src/input/keyBindings');
    expect(menuNavTap('KeyW', false)).toBe('uiUp');
    expect(menuNavTap('KeyA', false)).toBe('uiLeft');
    expect(menuNavTap('KeyS', false)).toBe('uiDown');
    expect(menuNavTap('KeyD', false)).toBe('uiRight');
    expect(menuNavTap('KeyW', true)).toBeNull();
    expect(menuNavTap('ArrowUp', true)).toBe('uiUp');
    expect(menuNavTap('KeyQ', false)).toBeNull();
  });
});
