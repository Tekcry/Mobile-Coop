/**
 * The level editor's one action map: every action has an id, a plain name and its bindings per device (keyboard,
 * mouse words, controller). Keyboard dispatch, the help overlay and the hint bar are all generated from it, so a
 * binding is written once. Babylon-free (tests/editor/actions.test.ts, editorPad.test.ts).
 */
import type { PadStyle } from '../input/gamepadMapping';
import { padWords } from './pad';

/**
 * What the editor is doing right now; the hint bar and key dispatch read it. 'drag' is also a pad grab; 'menu' the tile
 * menu; 'card' the selection card being edited with the D-pad (ON0a).
 */
export type Ctx = 'idle' | 'selected' | 'card' | 'drag' | 'draw' | 'chain' | 'menu' | 'hub';
export const CTXS: readonly Ctx[] = ['idle', 'selected', 'card', 'drag', 'draw', 'chain', 'menu', 'hub'];

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
  /** One or two words for the controller's hint bar (ED3-pad1); only actions with one are shown there, at most 5. */
  short?: string;
  /** Other short words in some contexts ("B Clear" with a selection, "B Back" elsewhere). */
  shortIn?: Partial<Record<Ctx, string>>;
  /** Handled by the camera controls or the pointer code, not by key dispatch. */
  passive?: boolean;
}

const NOT_DRAG: Ctx[] = ['idle', 'selected', 'card', 'draw'];
const NOT_MENU: Ctx[] = ['idle', 'selected', 'card', 'drag', 'draw', 'chain'];
const SEL: Ctx[] = ['selected', 'card'];

export const ACTIONS: readonly Action[] = [
  { id: 'look', name: 'look around', group: 'Camera', keys: [], mouse: 'Right drag', ctx: NOT_MENU, passive: true },
  { id: 'move', name: 'move (pad: the dot across the floor; walking: walk)', group: 'Camera', keys: ['KeyW', 'KeyA', 'KeyS', 'KeyD'], pad: ['LS'], ctx: NOT_MENU, passive: true, hint: ['idle', 'drag', 'draw'] },
  { id: 'orbit', name: 'orbit / tilt (walking: look)', group: 'Camera', keys: [], pad: ['RS'], ctx: NOT_MENU, hint: ['idle', 'draw'], passive: true },
  { id: 'zoom', name: 'zoom out / in (Plan only: the plan)', group: 'Camera', keys: [], pad: ['LT/RT'], ctx: NOT_MENU, hint: ['idle'], passive: true },
  { id: 'fly', name: 'down / up when flying', group: 'Camera', keys: ['KeyQ', 'KeyE'], ctx: NOT_MENU, passive: true },
  { id: 'crouch', name: 'crouch when walking', group: 'Camera', keys: ['KeyC'], ctx: NOT_MENU, passive: true },
  { id: 'walk', name: 'walk test (game): the real player at the dot, unsaved edits included', group: 'Camera', keys: ['Tab'], pad: ['L3 hold'], ctx: NOT_DRAG, hint: ['idle'] },
  { id: 'quickWalk', name: 'quick walk at the dot, running (pad: L3 tap; L3 again walks slowly and back, B ends; L3 held is the walk test)', group: 'Camera', keys: ['Shift+Tab'], pad: ['L3'], ctx: NOT_DRAG, hint: ['idle'] , short: 'Walk' },
  { id: 'walkBack', name: 'back to the editor from the walk test (also Esc, then Back to editor)', group: 'Camera', keys: ['F10'], pad: ['View + Menu hold'], ctx: NOT_MENU, passive: true },
  { id: 'levelUp', name: 'level up', group: 'Camera', keys: ['PageUp'], ctx: NOT_DRAG, hint: ['idle'] },
  { id: 'levelDown', name: 'level down', group: 'Camera', keys: ['PageDown'], ctx: NOT_DRAG },
  { id: 'padLevel', name: 'level up / down (nothing selected)', group: 'Camera', keys: [], pad: ['D-pad up/down'], ctx: ['idle', 'draw'], passive: true, short: 'Level' },
  { id: 'frame', name: 'go to the selection', group: 'Camera', keys: ['KeyF'], pad: ['RB'], ctx: SEL, hint: SEL, short: 'Go to' },
  { id: 'camHeight', name: 'camera up / down without tilting (LB held, right stick up / down)', group: 'Camera', keys: [], pad: ['LB + RS'], ctx: NOT_MENU, passive: true, short: 'Height' },
  { id: 'topDown', name: 'top-down and back', group: 'Camera', keys: [], pad: ['View'], ctx: NOT_MENU, hint: ['idle'], passive: true },

  { id: 'pick', name: 'select; drag to move; orange handles resize', group: 'Edit', keys: [], mouse: 'Click, drag', ctx: NOT_MENU, hint: ['idle', 'selected'], passive: true },
  { id: 'padPick', name: 'select what the dot is on; on the selection, take the part the dot names (stretch an edge or end, widen, move)', group: 'Edit', keys: [], pad: ['A'], ctx: ['idle', 'selected'], hint: ['idle', 'selected'], passive: true, short: 'Select', shortIn: { selected: 'Grab' } },
  { id: 'cardEdit', name: 'the selection card: up / down picks a row, left / right changes it (Type first; held repeats)', group: 'Edit', keys: [], pad: ['D-pad'], ctx: SEL, hint: SEL, passive: true, short: 'Edit' },
  { id: 'cardDone', name: 'on the card: Name opens the name list and keyboard; elsewhere back to the dot', group: 'Edit', keys: [], pad: ['A'], ctx: ['card'], hint: ['card'], passive: true, short: 'Done' },
  { id: 'padDrop', name: 'drop it here', group: 'Edit', keys: [], pad: ['A'], ctx: ['drag'], hint: ['drag'], passive: true , short: 'Drop' },
  { id: 'padDraw', name: 'start / finish (wall ends, room and hole corners), place a door or ladder; a stair: start corner, show the proposal, accept', group: 'Tools', keys: [], pad: ['A'], ctx: ['draw'], hint: ['draw'], passive: true , short: 'Start / finish' },
  { id: 'fine', name: 'fine grid (the object grid, 0.1 m) while held, when Settings > Grid is coarser', group: 'Edit', keys: [], mouse: 'Ctrl', ctx: NOT_MENU, hint: ['drag', 'draw'], passive: true },
  { id: 'precision', name: 'while held: slower camera, magnet off (the grid stays Settings > Grid)', group: 'Edit', keys: [], pad: ['LB'], ctx: NOT_MENU, hint: ['drag', 'draw', 'chain'], passive: true , short: 'Slow', shortIn: { chain: 'Fine' } },
  { id: 'padRotate', name: 'turn it 90 degrees about the dot (rooms, stairs, ladders, walls)', group: 'Edit', keys: [], pad: ['RB'], ctx: ['drag'], hint: ['drag'], passive: true , short: 'Turn 90' },
  { id: 'padNudge', name: 'nudge one grid step (as the camera faces)', group: 'Edit', keys: [], pad: ['D-pad'], ctx: ['drag'], hint: ['drag'], passive: true , short: 'Nudge' },
  { id: 'cancel', name: 'cancel / leave the card / put the tool down / clear the selection; never deletes', group: 'Edit', keys: ['Escape'], pad: ['B'], ctx: NOT_MENU, hint: ['selected', 'card', 'drag', 'draw', 'chain'], short: 'Back', shortIn: { selected: 'Clear', chain: 'End chain' } },
  { id: 'chainNext', name: 'wall chain: end this wall here and start the next from its end; on the first point the loop closes', group: 'Tools', keys: [], mouse: 'Click', pad: ['A'], ctx: ['chain'], hint: ['chain'], passive: true, short: 'Next wall' },
  { id: 'chainRemove', name: 'wall chain: remove the last finished wall', group: 'Tools', keys: ['Backspace'], pad: ['X'], ctx: ['chain'], hint: ['chain'], short: 'Remove last' },
  { id: 'multi', name: 'add to the selection or take out (several things move, copy and delete together)', group: 'Edit', keys: [], mouse: 'Shift+click', ctx: NOT_MENU, passive: true },
  { id: 'padBox', name: 'box select: hold A where nothing is selected and move the dot; A on one of the set grabs them all', group: 'Edit', keys: [], pad: ['A hold'], ctx: ['idle', 'selected'], passive: true },
  { id: 'delete', name: 'delete', group: 'Edit', keys: ['Delete', 'Backspace'], ctx: SEL, hint: ['selected'] },
  { id: 'duplicate', name: 'duplicate', group: 'Edit', keys: ['Ctrl+KeyD'], ctx: SEL },
  { id: 'nudge', name: 'nudge one grid step (Shift: ten steps)', group: 'Edit', keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'Shift+ArrowUp', 'Shift+ArrowDown'], ctx: ['selected'], hint: ['selected'] },
  { id: 'undo', name: 'undo', group: 'Edit', keys: ['Ctrl+KeyZ'], pad: ['X'], ctx: NOT_DRAG, hint: ['idle', 'selected'] , short: 'Undo' },
  { id: 'redo', name: 'redo', group: 'Edit', keys: ['Ctrl+KeyY', 'Ctrl+Shift+KeyZ'], pad: ['X hold'], ctx: NOT_DRAG },

  { id: 'menu', name: 'the tile menu: build, openings, view and the selected thing (again closes it)', group: 'Tools', keys: ['Space'], pad: ['Y'], ctx: ['idle', 'selected', 'card', 'draw', 'menu'], hint: ['idle', 'selected', 'card', 'draw'], short: 'Menu' },
  { id: 'menuMove', name: 'move the highlight (left stick too); on View rows left / right changes the value', group: 'Tools', keys: [], pad: ['D-pad'], ctx: ['menu'], hint: ['menu'], passive: true, short: 'Move' },
  { id: 'menuPick', name: 'pick the tile', group: 'Tools', keys: [], mouse: 'Click a tile', pad: ['A'], ctx: ['menu'], hint: ['menu'], passive: true, short: 'Pick' },
  { id: 'menuTab', name: 'change tab', group: 'Tools', keys: [], mouse: 'Click a tab', pad: ['LB', 'RB'], ctx: ['menu'], hint: ['menu'], passive: true, short: 'Tab' },
  { id: 'menuClose', name: 'close the menu', group: 'Tools', keys: ['Escape'], pad: ['B'], ctx: ['menu'], hint: ['menu'], short: 'Close' },
  { id: 'toolVariant', name: "the tool's type: door type, room walls, stair type, floor hole kind (with a tool, nothing grabbed)", group: 'Tools', keys: [], pad: ['D-pad left/right'], ctx: ['draw'], hint: ['draw'], passive: true, short: 'Type' },
  { id: 'toolSelect', name: 'select tool', group: 'Tools', keys: ['Digit1'], ctx: NOT_DRAG },
  { id: 'toolRoom', name: 'room tool (drag a rectangle)', group: 'Tools', keys: ['Digit2'], ctx: NOT_DRAG },
  { id: 'toolWall', name: 'wall tool (drag end to end)', group: 'Tools', keys: ['Digit3'], ctx: NOT_DRAG },
  { id: 'toolDoor', name: 'door tool (click a wall)', group: 'Tools', keys: ['Digit4'], ctx: NOT_DRAG },
  { id: 'toolWindow', name: 'window tool (click a wall)', group: 'Tools', keys: ['Digit5'], ctx: NOT_DRAG },
  { id: 'toolStair', name: 'stair tool (click the start corner, point the climb, click to see the proposal, click to accept)', group: 'Tools', keys: ['Digit6'], ctx: NOT_DRAG },
  { id: 'toolLadder', name: 'ladder tool (click a wall face or a point: up to the level above)', group: 'Tools', keys: ['Digit7'], ctx: NOT_DRAG },
  { id: 'toolHole', name: 'floor hole tool (drag a rectangle; kind from the list)', group: 'Tools', keys: ['Digit8'], ctx: NOT_DRAG },
  { id: 'toolObject', name: 'object tool (click places the preset from the list; a row: click the start, click the end)', group: 'Tools', keys: ['Digit9'], ctx: NOT_DRAG },
  { id: 'toolLamp', name: 'light tool (click places the fitting from the list; a strip: click the start, click the end; Switch: click a wall face, then click lamps to put them on it)', group: 'Tools', keys: ['Digit0'], ctx: NOT_DRAG },
  { id: 'turnObject', name: "turn the Object, Stamp or Light tool's ghost, or the selected object, 90 degrees", group: 'Tools', keys: ['KeyR'], ctx: ['draw', 'selected'] },
  { id: 'padTurnObject', name: 'Object and Stamp tools: turn the ghost 90 degrees', group: 'Tools', keys: [], pad: ['RB'], ctx: ['draw'], passive: true },
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
  { id: 'names', name: 'room names floating in 3D (fade out by 40 m)', group: 'View', keys: ['KeyL'], ctx: NOT_MENU },
  { id: 'stealth', name: 'stealth view: objects tinted by what they do for the player (full cover green, crouch cover yellow, climb blue, see-through grey)', group: 'View', keys: ['KeyJ'], ctx: NOT_MENU },
  { id: 'finishView', name: 'finish view: floors tinted by finish, with a legend of how loud footsteps are', group: 'View', keys: ['KeyN'], ctx: NOT_MENU },
  { id: 'lightView', name: "light view: night, lit by the game's own light bake of the editing level", group: 'View', keys: ['KeyY'], ctx: NOT_MENU },
  { id: 'darkMap', name: 'darkness map: the floor by the light meter (black hidden, grey, white lit), with the hidden and lit lines', group: 'View', keys: ['KeyB'], ctx: NOT_MENU },
  { id: 'figure', name: 'scale figure at the dot: a 1.75 m person and a 1.15 m crouch', group: 'View', keys: ['KeyK'], ctx: NOT_MENU },
  { id: 'bookmarkSave', name: 'save the camera as bookmark 1-9 (pad: Hub > View > Bookmarks)', group: 'View', keys: ['Ctrl+Digit1', 'Ctrl+Digit2', 'Ctrl+Digit3', 'Ctrl+Digit4', 'Ctrl+Digit5', 'Ctrl+Digit6', 'Ctrl+Digit7', 'Ctrl+Digit8', 'Ctrl+Digit9'], ctx: NOT_DRAG },
  { id: 'bookmarkGo', name: 'go to bookmark 1-9', group: 'View', keys: ['Alt+Digit1', 'Alt+Digit2', 'Alt+Digit3', 'Alt+Digit4', 'Alt+Digit5', 'Alt+Digit6', 'Alt+Digit7', 'Alt+Digit8', 'Alt+Digit9'], ctx: NOT_DRAG },
  { id: 'help', name: 'the hub: play, file, checks, levels, view, settings, help (H opens it on Help)', group: 'View', keys: ['KeyH'], pad: ['Menu'], ctx: NOT_MENU, hint: ['idle'] , short: 'Hub' },
  { id: 'hubTab', name: 'change tab', group: 'View', keys: [], mouse: 'Click a tab', pad: ['LB', 'RB'], ctx: ['hub'], hint: ['hub'], passive: true , short: 'Tab' },
  { id: 'hubRow', name: 'pick a row', group: 'View', keys: [], mouse: 'Click a row', pad: ['D-pad up/down'], ctx: ['hub'], hint: ['hub'], passive: true , short: 'Row' },
  { id: 'hubChange', name: 'change the value', group: 'View', keys: [], pad: ['D-pad left/right'], ctx: ['hub'], hint: ['hub'], passive: true , short: 'Change' },
  { id: 'hubDo', name: 'do it', group: 'View', keys: [], pad: ['A'], ctx: ['hub'], hint: ['hub'], passive: true , short: 'Do it' },
  { id: 'hubClose', name: 'close the hub', group: 'View', keys: ['Escape', 'KeyH'], pad: ['B', 'Menu'], ctx: ['hub'], hint: ['hub'] , short: 'Close' },

  { id: 'save', name: 'save the file, plans and change log (first a summary of what will be written: Save / Cancel)', group: 'File', keys: ['Ctrl+KeyS'], ctx: NOT_DRAG, hint: ['idle'] },
  { id: 'find', name: 'find a room, stair or object by name and go there (pad: Hub > Play > Find)', group: 'File', keys: ['Ctrl+KeyK'], ctx: NOT_DRAG },
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
  if (a.id === 'bookmarkSave') return 'Ctrl+1-9';
  if (a.id === 'bookmarkGo') return 'Alt+1-9';
  return [a.mouse, ...a.keys.map(keyWords)].filter(Boolean).join(' / ');
}

/** An action's controller bindings in the pad's own names. */
export const padBindingWords = (a: Action, style: PadStyle): string => (a.pad ?? []).map((b) => padWords(b, style)).join(' / ');

/** Help rows by group, in map order: keyboard and mouse words, and controller words. */
export function helpRows(style: PadStyle = 'xbox'): { group: Group; keys: string; pad: string; name: string }[] {
  return ACTIONS.map((a) => ({ group: a.group, keys: bindingWords(a), pad: padBindingWords(a, style), name: a.name }));
}

/** Most prompts on the controller's hint bar: one line on a phone (ED3-pad1). */
export const PAD_HINT_MAX = 5;

/** The controller's hint bar per context, in order (ON0a decision 7). */
export const PAD_HINTS: Record<Ctx, readonly string[]> = {
  idle: ['padPick', 'menu', 'undo', 'quickWalk', 'help'],
  selected: ['cardEdit', 'padPick', 'menu', 'cancel', 'frame'],
  card: ['cardEdit', 'cardDone', 'menu', 'cancel', 'frame'],
  drag: ['padDrop', 'padNudge', 'padRotate', 'precision', 'cancel'],
  chain: ['chainNext', 'chainRemove', 'cancel', 'precision'],
  draw: ['padDraw', 'toolVariant', 'menu', 'precision', 'cancel'],
  menu: ['menuMove', 'menuPick', 'menuTab', 'menuClose'],
  hub: ['hubTab', 'hubRow', 'hubChange', 'hubDo', 'hubClose'],
};

/** The controller's hint bar while LB is held outside the menus (ON0b decision 2). */
export const PAD_LB_HINTS: readonly string[] = ['camHeight', 'precision'];

/** The hint bar for a context and the device used last. The controller gets its short words, at most PAD_HINT_MAX; the full words are in the hub's Help. */
export function hintItems(c: Ctx, device: Device = 'keys', style: PadStyle = 'xbox', lbHeld = false): { id: string; keys: string; name: string }[] {
  if (device === 'pad') {
    return (lbHeld && c !== 'menu' && c !== 'hub' ? PAD_LB_HINTS : PAD_HINTS[c])
      .map((id) => byId.get(id))
      .filter((a): a is Action => !!a?.short)
      .map((a) => ({ id: a.id, keys: padBindingWords(a, style), name: a.shortIn?.[c] ?? a.short! }))
      .filter((i) => i.keys)
      .slice(0, PAD_HINT_MAX);
  }
  return ACTIONS.filter((a) => a.hint?.includes(c))
    .map((a) => ({ id: a.id, keys: bindingWords(a), name: a.name }))
    .filter((i) => i.keys);
}
