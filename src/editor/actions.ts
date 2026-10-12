/**
 * The level editor's one action map: every action has an id, a plain name and its bindings per device (keyboard,
 * mouse words, controller). Keyboard dispatch, the help overlay and the hint bar are all generated from it, so a
 * binding is written once. Babylon-free (tests/editor/actions.test.ts, editorPad.test.ts).
 */
import type { PadStyle } from '../input/gamepadMapping';
import { padWords } from './pad';

/** What the editor is doing right now; the hint bar and key dispatch read it. 'drag' is also a pad grab; 'menu' a wheel. */
export type Ctx = 'idle' | 'selected' | 'drag' | 'draw' | 'menu' | 'hub';
export const CTXS: readonly Ctx[] = ['idle', 'selected', 'drag', 'draw', 'menu', 'hub'];

export type Group = 'Camera' | 'Edit' | 'Tools' | 'View' | 'File';
export type Device = 'keys' | 'pad';

export interface Action {
  id: string;
  /** Plain words for the help and the hint bar. */
  name: string;
  group: Group;
  /** Key ids: optional `Ctrl+`, `Shift+`, `Alt+` (in that order) then a KeyboardEvent.code. */
  keys: string[];
  /** Mouse words, shown only (the pointer code handles the mouse). */
  mouse?: string;
  /** Controller bindings in Xbox names ("Y hold", "D-pad up"); padControl.ts handles them, the words go to the screen. */
  pad?: string[];
  /** Contexts the action works in; omitted means every context. */
  ctx?: Ctx[];
  /** Contexts whose hint bar lists it. */
  hint?: Ctx[];
  /** Handled by the camera controls or the pointer code, not by key dispatch. */
  passive?: boolean;
}

const NOT_DRAG: Ctx[] = ['idle', 'selected', 'draw'];
const NOT_MENU: Ctx[] = ['idle', 'selected', 'drag', 'draw'];

export const ACTIONS: readonly Action[] = [
  { id: 'look', name: 'look around', group: 'Camera', keys: [], mouse: 'Right drag', ctx: NOT_MENU, passive: true },
  { id: 'move', name: 'move (pad: the dot across the floor; walking: walk)', group: 'Camera', keys: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], pad: ['LS'], ctx: NOT_MENU, passive: true, hint: ['idle', 'drag', 'draw'] },
  { id: 'orbit', name: 'orbit / tilt (walking: look)', group: 'Camera', keys: [], pad: ['RS'], ctx: NOT_MENU, hint: ['idle', 'draw'], passive: true },
  { id: 'zoom', name: 'zoom out / in (Plan only: the plan)', group: 'Camera', keys: [], pad: ['LT/RT'], ctx: NOT_MENU, hint: ['idle'], passive: true },
  { id: 'fly', name: 'down / up when flying', group: 'Camera', keys: ['KeyQ', 'KeyE'], ctx: NOT_MENU, passive: true },
  { id: 'crouch', name: 'crouch when walking', group: 'Camera', keys: ['KeyC'], ctx: NOT_MENU, passive: true },
  { id: 'walk', name: 'walk test (game): the real player at the dot, unsaved edits included', group: 'Camera', keys: ['Tab'], ctx: NOT_DRAG, hint: ['idle'] },
  { id: 'quickWalk', name: 'quick walk at the dot / back', group: 'Camera', keys: ['Shift+Tab'], pad: ['L3'], ctx: NOT_DRAG, hint: ['idle'] },
  { id: 'walkBack', name: 'back to the editor from the walk test (also Esc, then Back to editor)', group: 'Camera', keys: ['F10'], pad: ['View + Menu hold'], ctx: NOT_MENU, passive: true },
  { id: 'levelUp', name: 'level up', group: 'Camera', keys: ['PageUp'], pad: ['D-pad up'], ctx: NOT_DRAG, hint: ['idle'] },
  { id: 'levelDown', name: 'level down', group: 'Camera', keys: ['PageDown'], pad: ['D-pad down'], ctx: NOT_DRAG },
  { id: 'frame', name: 'go to the selection', group: 'Camera', keys: ['KeyF'], pad: ['RB'], ctx: ['selected'], hint: ['selected'] },
  { id: 'selWheel', name: 'Selection wheel: change the selected thing (point, release to pick)', group: 'Edit', keys: [], mouse: 'Hold R', pad: ['RB hold'], ctx: ['selected'], hint: ['selected'], passive: true },
  { id: 'topDown', name: 'top-down and back', group: 'Camera', keys: [], pad: ['View'], ctx: NOT_MENU, hint: ['idle'], passive: true },

  { id: 'pick', name: 'select; drag to move; orange handles resize', group: 'Edit', keys: [], mouse: 'Click, drag', ctx: NOT_MENU, hint: ['idle', 'selected'], passive: true },
  { id: 'padPick', name: 'select what the dot is on; on the selection, take the part the dot names (stretch an edge or end, widen, move)', group: 'Edit', keys: [], pad: ['A'], ctx: ['idle', 'selected'], hint: ['idle', 'selected'], passive: true },
  { id: 'padDrop', name: 'drop it here', group: 'Edit', keys: [], pad: ['A'], ctx: ['drag'], hint: ['drag'], passive: true },
  { id: 'padDraw', name: 'start / finish (wall ends, room corners), place a door', group: 'Tools', keys: [], pad: ['A'], ctx: ['draw'], hint: ['draw'], passive: true },
  { id: 'fine', name: 'fine grid (0.1 m) while held', group: 'Edit', keys: [], mouse: 'Ctrl', ctx: NOT_MENU, hint: ['drag', 'draw'], passive: true },
  { id: 'precision', name: 'precision while held: 0.1 m grid, slower camera, no magnet', group: 'Edit', keys: [], pad: ['LB'], ctx: NOT_MENU, hint: ['drag', 'draw'], passive: true },
  { id: 'padRotate', name: 'turn it 90 degrees about the dot (rooms, stairs, ladders, walls)', group: 'Edit', keys: [], pad: ['RB'], ctx: ['drag'], hint: ['drag'], passive: true },
  { id: 'padNudge', name: 'nudge one grid step (as the camera faces)', group: 'Edit', keys: [], pad: ['D-pad'], ctx: ['drag'], hint: ['drag'], passive: true },
  { id: 'cancel', name: 'cancel / put the tool down / clear the selection; never deletes', group: 'Edit', keys: ['Escape'], pad: ['B'], ctx: NOT_MENU, hint: ['selected', 'drag', 'draw'] },
  { id: 'delete', name: 'delete', group: 'Edit', keys: ['Delete', 'Backspace'], ctx: ['selected'], hint: ['selected'] },
  { id: 'duplicate', name: 'duplicate', group: 'Edit', keys: ['Ctrl+KeyD'], ctx: ['selected'] },
  { id: 'nudge', name: 'nudge 0.5 m (Shift: 5 m)', group: 'Edit', keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'Shift+ArrowUp', 'Shift+ArrowDown'], ctx: ['selected'], hint: ['selected'] },
  { id: 'undo', name: 'undo', group: 'Edit', keys: ['Ctrl+KeyZ'], pad: ['X'], ctx: NOT_DRAG, hint: ['idle', 'selected'] },
  { id: 'redo', name: 'redo', group: 'Edit', keys: ['Ctrl+KeyY', 'Ctrl+Shift+KeyZ'], pad: ['X hold'], ctx: NOT_DRAG },

  { id: 'radial', name: 'Build wheel: what to make (point, release to pick)', group: 'Tools', keys: [], mouse: 'Hold Space', pad: ['Y hold'], ctx: ['idle', 'selected', 'draw'], hint: ['idle', 'selected', 'draw'], passive: true },
  { id: 'repeatTool', name: 'the last tool again', group: 'Tools', keys: [], pad: ['Y'], ctx: ['idle', 'selected', 'draw'], passive: true },
  { id: 'menuPick', name: 'pick / open', group: 'Tools', keys: [], mouse: 'Click', pad: ['A'], ctx: ['menu'], hint: ['menu'], passive: true },
  { id: 'menuPoint', name: 'point at a slot (rest on a submenu to open it)', group: 'Tools', keys: [], mouse: 'Mouse', pad: ['LS/RS'], ctx: ['menu'], hint: ['menu'], passive: true },
  { id: 'menuBack', name: 'back; at the top, close', group: 'Tools', keys: [], mouse: 'Esc', pad: ['B'], ctx: ['menu'], hint: ['menu'], passive: true },
  { id: 'toolSelect', name: 'select tool', group: 'Tools', keys: ['Digit1'], ctx: NOT_DRAG },
  { id: 'toolRoom', name: 'room tool (drag a rectangle)', group: 'Tools', keys: ['Digit2'], ctx: NOT_DRAG },
  { id: 'toolWall', name: 'wall tool (drag end to end)', group: 'Tools', keys: ['Digit3'], ctx: NOT_DRAG },
  { id: 'toolDoor', name: 'door tool (click a wall)', group: 'Tools', keys: ['Digit4'], ctx: NOT_DRAG },
  { id: 'toolPrev', name: 'previous tool on the tool bar', group: 'Tools', keys: [], pad: ['D-pad left'], ctx: NOT_DRAG, passive: true },
  { id: 'toolNext', name: 'next tool on the tool bar', group: 'Tools', keys: [], pad: ['D-pad right'], ctx: NOT_DRAG, hint: ['idle'], passive: true },
  { id: 'toolWindow', name: 'window tool (click a wall)', group: 'Tools', keys: ['Digit5'], ctx: NOT_DRAG },
  { id: 'draw', name: 'draw on the editing level', group: 'Tools', keys: [], mouse: 'Drag', ctx: ['draw'], hint: ['draw'], passive: true },

  { id: 'layout', name: 'view: 3D, both, plan', group: 'View', keys: ['KeyV'], pad: ['View hold'], ctx: NOT_MENU, hint: ['idle'] },
  { id: 'drawer', name: 'open / close the side panel', group: 'View', keys: ['Backquote', 'KeyI'], ctx: NOT_MENU },
  { id: 'minimap', name: 'small plan in 3D only', group: 'View', keys: ['KeyM'], ctx: NOT_MENU },
  { id: 'whole', name: 'whole building', group: 'View', keys: ['KeyG'], ctx: NOT_MENU },
  { id: 'single', name: 'single level', group: 'View', keys: ['KeyO'], ctx: NOT_MENU },
  { id: 'upTo', name: 'up to this level', group: 'View', keys: ['KeyU'], ctx: NOT_MENU },
  { id: 'display', name: 'levels shown: up to this level, single level, whole building', group: 'View', keys: [], pad: ['R3'], ctx: NOT_MENU, passive: true },
  { id: 'ghost', name: 'ghost the hidden levels', group: 'View', keys: ['Shift+KeyG'], ctx: NOT_MENU },
  { id: 'exploded', name: 'exploded view', group: 'View', keys: ['KeyX'], ctx: NOT_MENU },
  { id: 'help', name: 'the hub: play, file, checks, levels, view, settings, help (H opens it on Help)', group: 'View', keys: ['KeyH'], pad: ['Menu'], ctx: NOT_MENU, hint: ['idle'] },
  { id: 'hubTab', name: 'change tab', group: 'View', keys: [], mouse: 'Click a tab', pad: ['LB', 'RB'], ctx: ['hub'], hint: ['hub'], passive: true },
  { id: 'hubRow', name: 'pick a row', group: 'View', keys: [], mouse: 'Click a row', pad: ['D-pad up/down'], ctx: ['hub'], hint: ['hub'], passive: true },
  { id: 'hubChange', name: 'change the value', group: 'View', keys: [], pad: ['D-pad left/right'], ctx: ['hub'], hint: ['hub'], passive: true },
  { id: 'hubDo', name: 'do it', group: 'View', keys: [], pad: ['A'], ctx: ['hub'], hint: ['hub'], passive: true },
  { id: 'hubClose', name: 'close the hub', group: 'View', keys: ['Escape', 'KeyH'], pad: ['B', 'Menu'], ctx: ['hub'], hint: ['hub'] },

  { id: 'save', name: 'save the file, plans and change log', group: 'File', keys: ['Ctrl+KeyS'], ctx: NOT_DRAG, hint: ['idle'] },
];

const byId = new Map(ACTIONS.map((a) => [a.id, a]));
export const action = (id: string): Action | undefined => byId.get(id);

const inCtx = (a: Action, c: Ctx): boolean => !a.ctx || a.ctx.includes(c);

/** The key id of a keyboard event: `Ctrl+Shift+KeyZ`. Meta counts as Ctrl. */
export function keyId(e: { code: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }): string {
  return `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.code}`;
}

/** The non-passive action a key id runs in a context, if any. */
export function actionForKey(id: string, c: Ctx): Action | undefined {
  return ACTIONS.find((a) => !a.passive && inCtx(a, c) && a.keys.includes(id));
}

/** Pad binding parts: "D-pad left/right" covers "D-pad left" and "D-pad right"; "D-pad" covers all four. */
export function padParts(b: string): string[] {
  if (b === 'D-pad') return ['D-pad up', 'D-pad down', 'D-pad left', 'D-pad right'];
  if (b === 'LS/RS') return ['LS', 'RS'];
  if (b === 'LT/RT') return ['LT', 'RT'];
  const m = /^D-pad (\w+)\/(\w+)$/.exec(b);
  return m ? [`D-pad ${m[1]}`, `D-pad ${m[2]}`] : [b];
}

/** Bindings used twice in one context, keyboard or pad (should be empty; a Vitest checks it). */
export function conflicts(): string[] {
  const out: string[] = [];
  for (const c of CTXS) {
    for (const dev of ['keys', 'pad'] as const) {
      const seen = new Map<string, string>();
      for (const a of ACTIONS) {
        if (!inCtx(a, c)) continue;
        for (const k of (dev === 'keys' ? a.keys : (a.pad ?? []).flatMap(padParts))) {
          const prev = seen.get(k);
          if (prev && prev !== a.id) out.push(`${c} ${dev}: ${k} is ${prev} and ${a.id}`);
          seen.set(k, a.id);
        }
      }
    }
  }
  return out;
}

const KEY_WORDS: Record<string, string> = { Backquote: '`', PageUp: 'PgUp', PageDown: 'PgDn', Escape: 'Esc', Delete: 'Del', ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down' };

/** A key id in plain words: `Ctrl+KeyZ` -> `Ctrl+Z`. */
export function keyWords(id: string): string {
  const parts = id.split('+');
  const code = parts.pop() ?? '';
  const word = KEY_WORDS[code] ?? code.replace(/^Key/, '').replace(/^Digit/, '');
  return [...parts, word].join('+');
}

/** An action's keyboard and mouse bindings in words, shortened for families (WASD, the arrows). */
export function bindingWords(a: Action): string {
  if (a.id === 'move') return 'W A S D (Shift fast, wheel zooms)';
  if (a.id === 'fly') return 'Q / E';
  if (a.id === 'nudge') return 'Arrows';
  return [a.mouse, ...a.keys.map(keyWords)].filter(Boolean).join(' / ');
}

/** An action's controller bindings in the pad's own names. */
export const padBindingWords = (a: Action, style: PadStyle): string => (a.pad ?? []).map((b) => padWords(b, style)).join(' / ');

/** Help rows by group, in map order: keyboard and mouse words, and controller words. */
export function helpRows(style: PadStyle = 'xbox'): { group: Group; keys: string; pad: string; name: string }[] {
  return ACTIONS.map((a) => ({ group: a.group, keys: bindingWords(a), pad: padBindingWords(a, style), name: a.name }));
}

/** The hint bar for a context and the device used last. */
export function hintItems(c: Ctx, device: Device = 'keys', style: PadStyle = 'xbox'): { keys: string; name: string }[] {
  return ACTIONS.filter((a) => a.hint?.includes(c))
    .map((a) => ({ keys: device === 'pad' ? padBindingWords(a, style) : bindingWords(a), name: a.name }))
    .filter((i) => i.keys);
}
