/**
 * Keyboard / mouse bindings (pure, unit-tested). Every gameplay action has up to two inputs: a keyboard `code`
 * (`KeyboardEvent.code`) or an extra mouse button (`Mouse1` middle, `Mouse3` back, `Mouse4` forward). The left /
 * right mouse buttons (fire / aim held; anim-rework S1), the wheel (the held context menu's highlight), 1-7 (gadgets)
 * and the menu keys (Esc, Enter, Backspace, arrows, Q / E tabs) are fixed. (anim-rework S1, A1) WASD walk; Left Shift
 * held runs, Left Alt held creeps (`run` / `creep`: move magnitudes, no action); back to wall moved to Caps Lock.
 */
import type { ButtonAction } from './actions';

export type BindId =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'run'
  | 'creep'
  | 'wall'
  | 'crouch'
  | 'jump'
  | 'interact'
  | 'reload'
  | 'draw'
  | 'knockout'
  | 'zoom'
  | 'nextWeapon'
  | 'prevWeapon'
  | 'gadget'
  | 'wheel'
  | 'shoulder'
  | 'goggles'
  | 'coop'
  | 'ping'
  | 'pause';

export interface BindDef {
  id: BindId;
  label: string;
  /** Actions it raises (movement binds raise none: they are the move axes). */
  actions: readonly ButtonAction[];
  defaults: readonly string[];
}

export const BINDS: readonly BindDef[] = [
  { id: 'forward', label: 'Move forward', actions: [], defaults: ['KeyW'] },
  { id: 'back', label: 'Move back', actions: [], defaults: ['KeyS'] },
  { id: 'left', label: 'Move left', actions: [], defaults: ['KeyA'] },
  { id: 'right', label: 'Move right', actions: [], defaults: ['KeyD'] },
  { id: 'run', label: 'Run (hold)', actions: [], defaults: ['ShiftLeft'] },
  { id: 'creep', label: 'Creep (hold)', actions: [], defaults: ['AltLeft'] },
  { id: 'wall', label: 'Back to wall', actions: ['cover'], defaults: ['CapsLock'] },
  { id: 'crouch', label: 'Crouch', actions: ['crouch'], defaults: ['KeyC', 'ControlLeft'] },
  { id: 'jump', label: 'Jump / traverse', actions: ['jump'], defaults: ['Space'] },
  { id: 'interact', label: 'Interact / context (doors, takedown)', actions: ['interact'], defaults: ['KeyE'] },
  { id: 'reload', label: 'Reload', actions: ['reload'], defaults: ['KeyR'] },
  { id: 'draw', label: 'Holster / draw (tap); reload (hold, gun out)', actions: ['draw'], defaults: ['KeyX'] },
  { id: 'knockout', label: 'Knockout (holstered or holding a guard)', actions: ['altFire'], defaults: ['KeyZ'] },
  { id: 'zoom', label: 'Zoom (aiming, scoped weapon)', actions: ['zoom'], defaults: ['KeyB'] },
  { id: 'nextWeapon', label: 'Next weapon (Tab tap too)', actions: ['swapNext'], defaults: ['KeyT'] },
  { id: 'prevWeapon', label: 'Previous weapon', actions: ['swapPrev'], defaults: ['KeyQ'] },
  { id: 'gadget', label: 'Quick-use selected gadget (hold to aim)', actions: ['grenade'], defaults: ['KeyG'] },
  { id: 'wheel', label: 'Selection wheel (hold) / switch weapon (tap)', actions: ['gadgetWheel'], defaults: ['Tab'] },
  { id: 'shoulder', label: 'Swap shoulder', actions: ['shoulderSwap'], defaults: ['KeyV'] },
  { id: 'goggles', label: 'Vision on / off (mode picked on the wheel)', actions: ['vision'], defaults: ['KeyN'] },
  { id: 'coop', label: 'Co-op action (aiming the pistol: jammer, hold)', actions: ['coop'], defaults: ['KeyF', 'PageDown'] },
  // (optic-coop M2, Michael 2026-10-24: "Bind ping: middle mouse on keyboard, R3 on pad; it works from the optic view too")
  { id: 'ping', label: 'Ping (co-op; from the optic view too)', actions: ['ping'], defaults: ['Mouse1'] },
  { id: 'pause', label: 'Pause', actions: ['pause'], defaults: ['KeyP'] },
];

export const BIND_IDS: readonly BindId[] = BINDS.map((b) => b.id);
export type KeyBinds = Record<BindId, string[]>;

/**
 * (anim-rework S1) The stored key layout's version. 1: Left Shift runs and Left Alt creeps (A1), so back to wall left
 * Left Shift for Caps Lock; the speed keys (= / -) are gone (`sanitizeBinds` drops their entries).
 */
export const KEY_LAYOUT_V = 1;

/** (anim-rework S1) Moves a save from before `KEY_LAYOUT_V` 1 to today's layout (in place): back to wall still on its
 *  old default (Left Shift alone) goes to Caps Lock; a remapped wall key is kept (a clash with the run is a conflict,
 *  reported). */
export function migrateKeysV1(b: KeyBinds): void {
  if (b.wall.length === 1 && b.wall[0] === 'ShiftLeft') b.wall = [...BINDS.find((x) => x.id === 'wall')!.defaults];
}

/** Fixed keys: never bindable (menus, Esc pause, gadget picks). */
export const FIXED_KEYS: Record<string, readonly ButtonAction[]> = {
  Escape: ['pause', 'uiBack'],
  Backspace: ['uiBack'],
  Enter: ['uiConfirm'],
  NumpadEnter: ['uiConfirm'],
  // menus (menu-ui SPEC 4.2, MD11): tabs Q / E, Space confirms, R = X action, F = Y action (these keys also keep their
  // gameplay bindings; the ui actions are only read while a menu is open). WASD navigate: `MENU_NAV_KEYS`.
  KeyQ: ['uiTabPrev'],
  KeyE: ['uiTabNext'],
  Space: ['uiConfirm'],
  KeyR: ['uiX'],
  KeyF: ['uiAlt'],
};

/** Menu navigation taps (arrows always; WASD too, except in a text field: menu-ui MD11). */
export const MENU_NAV_KEYS: Readonly<Record<string, ButtonAction>> = {
  ArrowUp: 'uiUp',
  ArrowDown: 'uiDown',
  ArrowLeft: 'uiLeft',
  ArrowRight: 'uiRight',
  KeyW: 'uiUp',
  KeyS: 'uiDown',
  KeyA: 'uiLeft',
  KeyD: 'uiRight',
};

/** The menu tap of a key (`typing`: a text field has the keyboard, so WASD type instead). */
export function menuNavTap(code: string, typing: boolean): ButtonAction | null {
  if (typing && !code.startsWith('Arrow')) return null;
  return MENU_NAV_KEYS[code] ?? null;
}
const RESERVED = new Set(['Escape', 'Enter', 'NumpadEnter', 'Backspace', 'F1', 'F2', 'F3', 'F4', 'F8', 'F9', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'MetaLeft', 'MetaRight']);
/** Mouse buttons that can be bound (the left and right buttons are fire / aim). */
export const MOUSE_CODES = ['Mouse1', 'Mouse3', 'Mouse4'] as const;

export function defaultBinds(): KeyBinds {
  const out = {} as KeyBinds;
  for (const b of BINDS) out[b.id] = [...b.defaults];
  return out;
}

/** A code that may be bound at all. */
export function bindable(code: string): boolean {
  if (RESERVED.has(code)) return false;
  if (/^Digit[1-7]$/.test(code)) return false;
  return /^(Key[A-Z]|Digit\d|Numpad\w+|F\d{1,2}|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Space|Tab|CapsLock|Backquote|Minus|Equal|Bracket(Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|Insert|Delete|Home|End|PageUp|PageDown)$/.test(code) || (MOUSE_CODES as readonly string[]).includes(code);
}

/** Merge stored binds over the defaults: unknown codes dropped, at most two per action. A code on two actions is kept
 *  (locomotion step 18, D7: a conflict the controls screen warns about, `findConflicts`). */
export function sanitizeBinds(raw: unknown): KeyBinds {
  const out = defaultBinds();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  for (const b of BINDS) {
    const v = r[b.id];
    if (!Array.isArray(v)) continue;
    const codes: string[] = [];
    for (const c of v) if (typeof c === 'string' && bindable(c) && !codes.includes(c) && codes.length < 2) codes.push(c);
    out[b.id] = codes;
  }
  return out;
}

/**
 * Put `code` in `slot` (0 / 1) of `id`. (locomotion step 18, D7) A code already used by another action stays there too
 * (a conflict, warned, not blocked); returns that other action, if any.
 */
export function assignBind(binds: KeyBinds, id: BindId, slot: 0 | 1, code: string): BindId | null {
  if (!bindable(code)) return null;
  let from: BindId | null = null;
  for (const b of BIND_IDS) if (b !== id && from === null && binds[b].includes(code)) from = b;
  const list = binds[id];
  const at = list.indexOf(code);
  if (at >= 0) list.splice(at, 1);
  if (slot >= list.length) list.push(code);
  else list[slot] = code;
  if (list.length > 2) list.length = 2;
  return from;
}

export function clearBind(binds: KeyBinds, id: BindId, slot: 0 | 1): void {
  binds[id].splice(slot, 1);
}

/** Code -> actions for the source (bound actions + fixed keys). */
export function keyActionMap(binds: KeyBinds): Map<string, ButtonAction[]> {
  const m = new Map<string, ButtonAction[]>();
  const add = (code: string, acts: readonly ButtonAction[]): void => {
    const cur = m.get(code) ?? [];
    for (const a of acts) if (!cur.includes(a)) cur.push(a);
    m.set(code, cur);
  };
  for (const b of BINDS) for (const c of binds[b.id]) add(c, b.actions);
  for (const [c, acts] of Object.entries(FIXED_KEYS)) add(c, acts);
  return m;
}

const NAMES: Record<string, string> = {
  Space: 'Space',
  ShiftLeft: 'Shift',
  ShiftRight: 'R Shift',
  ControlLeft: 'Ctrl',
  ControlRight: 'R Ctrl',
  AltLeft: 'Alt',
  AltRight: 'R Alt',
  Tab: 'Tab',
  CapsLock: 'Caps',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Insert: 'Ins',
  Delete: 'Del',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  Mouse1: 'Mouse 3',
  Mouse3: 'Mouse 4',
  Mouse4: 'Mouse 5',
  Escape: 'Esc',
};

/** Short label for a code ("KeyW" -> "W", "Mouse3" -> "Mouse 4"). */
export function keyName(code: string): string {
  if (NAMES[code]) return NAMES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return `Num ${code.slice(6)}`;
  return code;
}

/** The first key of an action ("" when unbound), for prompts. */
export function bindLabel(binds: KeyBinds, id: BindId): string {
  const c = binds[id][0];
  return c ? keyName(c) : '-';
}

/** All keys of an action ("C / Ctrl"). */
export function bindLabels(binds: KeyBinds, id: BindId): string {
  return binds[id].length ? binds[id].map(keyName).join(' / ') : 'Unbound';
}
