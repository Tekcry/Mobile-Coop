/**
 * The level editor's one action map: every action has an id, a plain name and its bindings per device. Keyboard
 * dispatch, the help overlay and the hint bar are all generated from it, so a binding is written once. Part C adds
 * gamepad bindings here. Babylon-free (tests/editor/actions.test.ts).
 */

/** What the editor is doing right now; the hint bar and key dispatch read it. */
export type Ctx = 'idle' | 'selected' | 'drag' | 'draw' | 'menu';
export const CTXS: readonly Ctx[] = ['idle', 'selected', 'drag', 'draw', 'menu'];

export type Group = 'Camera' | 'Edit' | 'Tools' | 'View' | 'File';

export interface Action {
  id: string;
  /** Plain words for the help and the hint bar. */
  name: string;
  group: Group;
  /** Key ids: optional `Ctrl+`, `Shift+`, `Alt+` (in that order) then a KeyboardEvent.code. */
  keys: string[];
  /** Mouse words, shown only (the pointer code handles the mouse). */
  mouse?: string;
  /** Contexts the action works in; omitted means every context. */
  ctx?: Ctx[];
  /** Contexts whose hint bar lists it. */
  hint?: Ctx[];
  /** Handled by the camera controls, not by dispatch (listed for the help and conflict checks). */
  passive?: boolean;
}

const NOT_DRAG: Ctx[] = ['idle', 'selected', 'draw'];

export const ACTIONS: readonly Action[] = [
  { id: 'look', name: 'look around', group: 'Camera', keys: [], mouse: 'Right drag', hint: ['idle', 'selected', 'draw'], passive: true },
  { id: 'move', name: 'move (Shift fast; wheel zooms)', group: 'Camera', keys: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], passive: true, hint: ['idle'] },
  { id: 'fly', name: 'down / up when flying', group: 'Camera', keys: ['KeyQ', 'KeyE'], passive: true },
  { id: 'crouch', name: 'crouch when walking', group: 'Camera', keys: ['KeyC'], passive: true },
  { id: 'walk', name: 'walk at eye height / fly', group: 'Camera', keys: ['Tab'], ctx: NOT_DRAG, hint: ['idle'] },
  { id: 'levelUp', name: 'level up', group: 'Camera', keys: ['PageUp'], ctx: NOT_DRAG, hint: ['idle'] },
  { id: 'levelDown', name: 'level down', group: 'Camera', keys: ['PageDown'], ctx: NOT_DRAG },
  { id: 'frame', name: 'go to the selection', group: 'Camera', keys: ['KeyF'], ctx: ['selected'], hint: ['selected'] },

  { id: 'pick', name: 'select; drag to move; orange handles resize', group: 'Edit', keys: [], mouse: 'Click, drag', hint: ['idle', 'selected'] },
  { id: 'fine', name: 'fine grid (0.1 m) while dragging', group: 'Edit', keys: [], mouse: 'Ctrl', hint: ['drag', 'draw'] },
  { id: 'cancel', name: 'cancel / put the tool down / clear the selection', group: 'Edit', keys: ['Escape'], hint: ['selected', 'drag', 'draw', 'menu'] },
  { id: 'delete', name: 'delete', group: 'Edit', keys: ['Delete', 'Backspace'], ctx: ['selected'], hint: ['selected'] },
  { id: 'duplicate', name: 'duplicate', group: 'Edit', keys: ['Ctrl+KeyD'], ctx: ['selected'], hint: ['selected'] },
  { id: 'nudge', name: 'nudge 0.5 m (Shift: 5 m)', group: 'Edit', keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'Shift+ArrowUp', 'Shift+ArrowDown'], ctx: ['selected'], hint: ['selected'] },
  { id: 'undo', name: 'undo', group: 'Edit', keys: ['Ctrl+KeyZ'], ctx: NOT_DRAG, hint: ['idle'] },
  { id: 'redo', name: 'redo', group: 'Edit', keys: ['Ctrl+KeyY', 'Ctrl+Shift+KeyZ'], ctx: NOT_DRAG },

  { id: 'toolSelect', name: 'select tool', group: 'Tools', keys: ['Digit1'], ctx: NOT_DRAG },
  { id: 'toolRoom', name: 'room tool (drag a rectangle)', group: 'Tools', keys: ['Digit2'], ctx: NOT_DRAG },
  { id: 'toolWall', name: 'wall tool (drag end to end)', group: 'Tools', keys: ['Digit3'], ctx: NOT_DRAG },
  { id: 'toolDoor', name: 'door tool (click a wall)', group: 'Tools', keys: ['Digit4'], ctx: NOT_DRAG },
  { id: 'toolWindow', name: 'window tool (click a wall)', group: 'Tools', keys: ['Digit5'], ctx: NOT_DRAG },
  { id: 'draw', name: 'draw on the editing level', group: 'Tools', keys: [], mouse: 'Drag', hint: ['draw'] },

  { id: 'layout', name: 'view: 3D, both, plan', group: 'View', keys: ['KeyV'], hint: ['idle'] },
  { id: 'drawer', name: 'open / close the side panel', group: 'View', keys: ['Backquote', 'KeyI'], hint: ['selected'] },
  { id: 'minimap', name: 'small plan in 3D only', group: 'View', keys: ['KeyM'] },
  { id: 'whole', name: 'whole building', group: 'View', keys: ['KeyG'], hint: ['idle'] },
  { id: 'single', name: 'single level', group: 'View', keys: ['KeyO'], hint: ['idle'] },
  { id: 'upTo', name: 'up to this level', group: 'View', keys: ['KeyU'] },
  { id: 'ghost', name: 'ghost the hidden levels', group: 'View', keys: ['Shift+KeyG'] },
  { id: 'exploded', name: 'exploded view', group: 'View', keys: ['KeyX'] },
  { id: 'help', name: 'show / hide this help', group: 'View', keys: ['KeyH'] },

  { id: 'save', name: 'save the file, plans and change log', group: 'File', keys: ['Ctrl+KeyS'], ctx: NOT_DRAG, hint: ['idle', 'selected'] },
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

/** Key ids bound twice in one context (should be empty; a Vitest checks it). */
export function conflicts(): string[] {
  const out: string[] = [];
  for (const c of CTXS) {
    const seen = new Map<string, string>();
    for (const a of ACTIONS) {
      if (!inCtx(a, c)) continue;
      for (const k of a.keys) {
        const prev = seen.get(k);
        if (prev && prev !== a.id) out.push(`${c}: ${k} is ${prev} and ${a.id}`);
        seen.set(k, a.id);
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

/** An action's bindings in words, shortened for families (WASD, the arrows). */
export function bindingWords(a: Action): string {
  if (a.id === 'move') return 'W A S D';
  if (a.id === 'fly') return 'Q / E';
  if (a.id === 'nudge') return 'Arrows';
  const keys = a.keys.map(keyWords);
  return [a.mouse, ...keys].filter(Boolean).join(' / ');
}

/** Help rows by group, in map order. */
export function helpRows(): { group: Group; keys: string; name: string }[] {
  return ACTIONS.map((a) => ({ group: a.group, keys: bindingWords(a), name: a.name }));
}

/** The hint bar for a context: "Click, drag select ...   Del delete   ...". */
export function hintItems(c: Ctx): { keys: string; name: string }[] {
  return ACTIONS.filter((a) => a.hint?.includes(c)).map((a) => ({ keys: bindingWords(a), name: a.name }));
}
