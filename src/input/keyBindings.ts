/**
 * Keyboard / mouse bindings (pure, unit-tested). Every gameplay action has up to two inputs: a keyboard `code`
 * (`KeyboardEvent.code`) or an extra mouse button (`Mouse1` middle, `Mouse3` back, `Mouse4` forward). The left /
 * right mouse buttons (fire / aim), the wheel (weapons), 1-8 (gadgets) and the menu keys (Esc, Enter, Backspace,
 * arrows, Q / E tabs) are fixed.
 */
import type { ButtonAction } from './actions';

export type BindId =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'cover'
  | 'crouch'
  | 'sprint'
  | 'traverse'
  | 'use'
  | 'reload'
  | 'nextWeapon'
  | 'prevWeapon'
  | 'gadget'
  | 'wheel'
  | 'shoulder'
  | 'goggles'
  | 'mark'
  | 'execute'
  | 'ping'
  | 'emote1'
  | 'emote2'
  | 'emote3'
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
  { id: 'cover', label: 'Cover / cover-to-cover', actions: ['cover'], defaults: ['Space'] },
  { id: 'crouch', label: 'Crouch', actions: ['crouch'], defaults: ['KeyC', 'ControlLeft'] },
  { id: 'sprint', label: 'Sprint', actions: ['dash'], defaults: ['ShiftLeft'] },
  { id: 'traverse', label: 'Traverse / use / takedown', actions: ['jump', 'interact'], defaults: ['KeyE'] },
  { id: 'use', label: 'Use', actions: ['interact'], defaults: ['KeyF'] },
  { id: 'reload', label: 'Reload', actions: ['reload'], defaults: ['KeyR'] },
  { id: 'nextWeapon', label: 'Next weapon', actions: ['swapNext'], defaults: ['KeyX'] },
  { id: 'prevWeapon', label: 'Previous weapon', actions: ['swapPrev'], defaults: ['KeyQ'] },
  { id: 'gadget', label: 'Gadget (hold to aim)', actions: ['grenade'], defaults: ['KeyG'] },
  { id: 'wheel', label: 'Gadget wheel (hold)', actions: ['gadgetWheel'], defaults: ['Tab'] },
  { id: 'shoulder', label: 'Swap shoulder', actions: ['shoulderSwap'], defaults: ['KeyV'] },
  { id: 'goggles', label: 'Goggles', actions: ['vision'], defaults: ['KeyN'] },
  { id: 'mark', label: 'Mark', actions: ['mark'], defaults: ['KeyT'] },
  { id: 'execute', label: 'Execute', actions: ['execute'], defaults: ['KeyY'] },
  { id: 'ping', label: 'Ping (co-op)', actions: ['ping'], defaults: ['KeyZ'] },
  { id: 'emote1', label: 'Emote 1', actions: ['quick2'], defaults: ['KeyJ'] },
  { id: 'emote2', label: 'Emote 2', actions: ['quick3'], defaults: ['KeyK'] },
  { id: 'emote3', label: 'Emote 3', actions: ['quick4'], defaults: ['KeyL'] },
  { id: 'pause', label: 'Pause', actions: ['pause'], defaults: ['KeyP'] },
];

export const BIND_IDS: readonly BindId[] = BINDS.map((b) => b.id);
export type KeyBinds = Record<BindId, string[]>;

/** Fixed keys: never bindable (menus, Esc pause, gadget picks). */
export const FIXED_KEYS: Record<string, readonly ButtonAction[]> = {
  Escape: ['pause', 'uiBack'],
  Backspace: ['uiBack'],
  Enter: ['uiConfirm'],
  NumpadEnter: ['uiConfirm'],
  // menus: tabs and the alternative action (also bound in game by default)
  KeyQ: ['uiTabPrev'],
  KeyE: ['uiTabNext', 'uiAlt'],
};
const RESERVED = new Set(['Escape', 'Enter', 'NumpadEnter', 'Backspace', 'F3', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'MetaLeft', 'MetaRight']);
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
  if (/^Digit[1-8]$/.test(code)) return false;
  return /^(Key[A-Z]|Digit\d|Numpad\w+|F\d{1,2}|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|Space|Tab|CapsLock|Backquote|Minus|Equal|Bracket(Left|Right)|Backslash|Semicolon|Quote|Comma|Period|Slash|Insert|Delete|Home|End|PageUp|PageDown)$/.test(code) || (MOUSE_CODES as readonly string[]).includes(code);
}

/** Merge stored binds over the defaults: unknown codes dropped, at most two per action, no code on two actions. */
export function sanitizeBinds(raw: unknown): KeyBinds {
  const out = defaultBinds();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  const used = new Set<string>();
  for (const b of BINDS) {
    const v = r[b.id];
    if (!Array.isArray(v)) continue;
    const codes: string[] = [];
    for (const c of v) if (typeof c === 'string' && bindable(c) && !codes.includes(c) && codes.length < 2) codes.push(c);
    out[b.id] = codes;
  }
  // a code bound twice stays with the first action that has it
  for (const b of BINDS) {
    out[b.id] = out[b.id].filter((c) => {
      if (used.has(c)) return false;
      used.add(c);
      return true;
    });
  }
  return out;
}

/**
 * Put `code` in `slot` (0 / 1) of `id`. A code already used by another action moves here (that action loses it);
 * returns the action it was taken from, if any.
 */
export function assignBind(binds: KeyBinds, id: BindId, slot: 0 | 1, code: string): BindId | null {
  if (!bindable(code)) return null;
  let from: BindId | null = null;
  for (const b of BIND_IDS) {
    const i = binds[b].indexOf(code);
    if (i >= 0 && !(b === id && i === slot)) {
      binds[b].splice(i, 1);
      if (b !== id) from = b;
    }
  }
  const list = binds[id];
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
