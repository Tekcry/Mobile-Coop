/**
 * The tile build menu (ON0a decisions 1-3, 6), pure: tabs of large tiles that Y (Space with the mouse) opens and
 * closes. One data list of tiles; later parts add theirs to TILES (or a new tab). A tab shows only when it has tiles;
 * Selected only with something selected. The View tab is a list of toggles, cycles and sliders (left / right changes
 * them), shared with the hub's View tab. Babylon- and DOM-free (tests/editor/tileMenu.test.ts); tileMenuView.ts draws it.
 */
import { fmt } from './geometry';
import { CATALOGUE } from './openingCatalogue';
import type { Motion } from './openingCatalogue';

/** The Openings tiles' second line, by how the leaf moves. */
const OPENING_DESC: Record<Motion, string> = { swing: 'Hinged leaf; A on a wall places one', double: 'Two hinged leaves; A on a wall', slide: 'Slides along a track; A on a wall', roll: 'Rolls up; A on a wall', none: 'A on a wall places one', hung: 'Opens out from the top; A on a wall', louvre: 'Tilting glass slats; A on a wall' };
import { ROOM_OPTIONS } from './roomWalls';
import { STAIR_TYPES } from './vertical';
import { ROOF_TYPES } from './roofGeometry';
import { GROUPS, groupPresets } from './catalogue';
import type { ObjGroup } from './catalogue';
import { CLIMB_PIECES } from './climbCatalogue';
import type { Coll } from './types';

export const MENU_TABS = ['Selected', 'Build', 'Openings', 'Objects', 'Climb', 'Lights', 'Mission', 'View'] as const;
export type MenuTab = (typeof MENU_TABS)[number];
/** go: A runs it; toggle: A or left / right flips it; cycle: steps a list; slider: A turns it on / off, left / right moves it. */
export type TileKind = 'go' | 'toggle' | 'cycle' | 'slider';

export interface Tile {
  id: string;
  icon: string;
  name: string;
  desc: string;
  kind: TileKind;
  value?: string;
  on?: boolean;
  /** Greyed: A only says why. */
  disabled?: string;
}

/** What the tiles depend on; padControl fills it from the editor. */
export interface MenuInput {
  /** The selection; `gap` when a selected wall has an end within 5 cm of another wall (ON0b). */
  sel: { coll: Coll; type: string; gap?: boolean } | null;
  clipboard: boolean;
  view: ViewState;
  /** ON3: the number of things in a multi-selection (box select or Shift+click); its tiles replace the Selected tab's. */
  group?: number;
  /** ON4: the Objects tab's group (its presets follow the group tiles). */
  objGroup?: ObjGroup;
}

export interface ViewState {
  layout: '3d' | 'both' | 'plan';
  ghost: boolean;
  exploded: boolean;
  gap: number;
  /** Cut height in metres; 0 is off. */
  cut: number;
  preset: 'whole' | 'single' | 'upTo' | 'pick';
  building: string;
  minimap: boolean;
  labels: boolean;
  underlay: boolean;
  /** ON3: room names floating in 3D (L) and the scale figure at the dot (K). */
  names?: boolean;
  figure?: boolean;
  /** ON4: the stealth view (J). */
  stealth?: boolean;
  /** ON5: the finish view (N). */
  finish?: boolean;
}

/** Tabs drawn as one column of rows (left / right changes values there instead of moving). */
export const LIST_TABS: readonly MenuTab[] = ['View'];

const PRESET_WORDS = { whole: 'Whole building', single: 'Single level', upTo: 'Up to this level', pick: 'Picked levels' } as const;
const LAYOUT_WORDS = { '3d': '3D', both: 'Both', plan: 'Plan' } as const;
const onOff = (b: boolean): string => (b ? 'on' : 'off');

/** The View items (the tile menu's View tab and the hub's View tab). */
export function viewTiles(v: ViewState): Tile[] {
  return [
    { id: 'view.layout', icon: 'V', name: 'Layout', desc: '3D, both side by side, or the plan', kind: 'cycle', value: LAYOUT_WORDS[v.layout] },
    { id: 'view.ghost', icon: 'G', name: 'Ghost other levels', desc: 'Hidden levels drawn see-through', kind: 'toggle', on: v.ghost, value: onOff(v.ghost) },
    { id: 'view.exploded', icon: 'X', name: 'Exploded', desc: 'Levels drawn apart; left / right sets the gap', kind: 'slider', on: v.exploded, value: v.exploded ? `${fmt(v.gap)} m gap` : 'off' },
    { id: 'view.cut', icon: 'C', name: 'Cut walls at', desc: 'Walls drawn up to this height; left / right moves it', kind: 'slider', on: v.cut > 0, value: v.cut > 0 ? `${fmt(v.cut)} m` : 'off' },
    { id: 'view.levels', icon: 'L', name: 'Levels shown', desc: 'Up to this level, single level, whole building', kind: 'cycle', value: PRESET_WORDS[v.preset] },
    { id: 'view.building', icon: 'B', name: 'Building filter', desc: 'All, one building, or the site', kind: 'cycle', value: v.building === 'all' ? 'All' : v.building === 'site' ? 'Site' : `Building ${v.building}` },
    { id: 'view.minimap', icon: 'M', name: 'Small plan', desc: 'A plan in the corner of 3D only', kind: 'toggle', on: v.minimap, value: onOff(v.minimap) },
    { id: 'view.labels', icon: 'T', name: 'Labels', desc: 'Room names on the plan', kind: 'toggle', on: v.labels, value: onOff(v.labels) },
    { id: 'view.underlay', icon: 'U', name: 'Level below on the plan', desc: 'The floor under this one, faint', kind: 'toggle', on: v.underlay, value: onOff(v.underlay) },
    { id: 'view.names', icon: 'N', name: 'Room names in 3D', desc: 'On each floor, fading out by 40 m (L)', kind: 'toggle', on: !!v.names, value: onOff(!!v.names) },
    { id: 'view.figure', icon: 'K', name: 'Scale figure', desc: 'A 1.75 m person and a crouch at the dot (K)', kind: 'toggle', on: !!v.figure, value: onOff(!!v.figure) },
    { id: 'view.stealth', icon: 'J', name: 'Stealth view', desc: 'Objects by what they give the player (J)', kind: 'toggle', on: !!v.stealth, value: onOff(!!v.stealth) },
    { id: 'view.finish', icon: 'N', name: 'Finish view', desc: 'Floors tinted by finish, with a legend (N)', kind: 'toggle', on: !!v.finish, value: onOff(!!v.finish) },
  ];
}

/** The tiles of one tab, in order. */
export function menuTiles(tab: MenuTab, inp: MenuInput): Tile[] {
  const copyFirst = inp.clipboard ? undefined : 'Copy something first (Selected > Copy)';
  switch (tab) {
    case 'Selected': {
      if (inp.group)
        return [
          { id: 'sel.move', icon: 'M', name: `Move ${inp.group} things`, desc: 'Grab them all at the dot, one edit', kind: 'go' },
          { id: 'sel.copy', icon: 'C', name: 'Copy', desc: 'Rooms, walls (with their doors) and floor holes', kind: 'go' },
          { id: 'sel.copyUp', icon: 'U', name: 'Copy to level above', desc: 'Same spot, one level up, one edit', kind: 'go' },
          { id: 'sel.del', icon: 'X', name: `Delete ${inp.group} things`, desc: 'One edit; walls take their doors and windows', kind: 'go' },
        ];
      const s = inp.sel;
      if (!s) return [];
      const turns = ['rooms', 'walls', 'stairs', 'ladders', 'objects'].includes(s.coll);
      const copies = ['rooms', 'walls', 'voids'].includes(s.coll);
      const types = s.coll === 'openings' || s.coll === 'rooms' || s.coll === 'walls' || s.coll === 'stairs' || s.coll === 'voids' || s.coll === 'roofs' || s.coll === 'objects' || s.coll === 'exterior';
      const t: (Tile | false)[] = [
        { id: 'sel.move', icon: 'M', name: 'Move', desc: 'Grab it, as A in the middle', kind: 'go' },
        { id: 'sel.dup', icon: 'D', name: 'Duplicate', desc: 'A copy beside it', kind: 'go' },
        turns && { id: 'sel.rotate', icon: 'R', name: 'Rotate 90', desc: 'A quarter turn', kind: 'go' },
        copies && { id: 'sel.copy', icon: 'C', name: 'Copy', desc: 'Paste it from the Build tab', kind: 'go' },
        copies && { id: 'sel.copyUp', icon: 'U', name: 'Copy to level above', desc: 'Same spot, one level up', kind: 'go' },
        s.coll === 'rooms' && { id: 'sel.finish', icon: 'F', name: 'Floor finish', desc: "The card's Floor finish row: left / right", kind: 'go' },
        s.coll === 'rooms' && { id: 'sel.split', icon: 'S', name: 'Split', desc: 'A line across the room; RB turns it', kind: 'go' },
        s.coll === 'stairs' && { id: 'sel.fit', icon: 'F', name: 'Fit', desc: 'The smallest legal size from its start corner', kind: 'go' },
        s.coll === 'stairs' && { id: 'sel.turnClimb', icon: 'A', name: 'Turn climb 90', desc: 'The climb turns; the stair stays put', kind: 'go' },
        { id: 'sel.rename', icon: 'I', name: 'Rename id', desc: 'Every reference follows', kind: 'go' },
        types && { id: 'sel.type', icon: 'T', name: 'Change type', desc: 'The card\'s Type row: left / right', kind: 'go' },
        s.gap === true && { id: 'sel.closeGap', icon: 'G', name: 'Close gap', desc: 'The wall end moves onto the wall it nearly meets', kind: 'go' },
        { id: 'sel.props', icon: 'P', name: 'Properties', desc: 'Every field in the side panel', kind: 'go' },
        { id: 'sel.del', icon: 'X', name: 'Delete', desc: 'A wall takes its doors and windows', kind: 'go' },
      ];
      return t.filter((x): x is Tile => !!x);
    }
    case 'Build':
      return [
        { id: 'select', icon: 'S', name: 'Select', desc: 'Pick, grab and move what the dot is on', kind: 'go' },
        ...ROOM_OPTIONS.map((o): Tile => ({ id: `room.${o.id}`, icon: 'R', name: o.id === 'walls' ? 'Room with walls' : o.id === 'outside' ? 'Room with outside walls' : 'Room only', desc: 'A at one corner, A at the opposite one', kind: 'go' })),
        { id: 'build.wall', icon: 'W', name: 'Wall', desc: 'A at one end, A at the other', kind: 'go' },
        ...STAIR_TYPES.map((t): Tile => ({ id: `stair.${t.id}`, icon: 'S', name: t.id === 'main-straight' ? 'Straight stair' : `Stair: ${t.name}`, desc: 'A at the start corner, point the climb, A, A', kind: 'go' })),
        { id: 'build.ladder', icon: 'L', name: 'Ladder', desc: 'A on a wall face: up to the level above', kind: 'go' },
        { id: 'build.hole', icon: 'H', name: 'Floor hole', desc: 'A at one corner, A at the other', kind: 'go' },
        // ON10: one Roof tile per type; A, A on the same spot takes the building (or room) under the dot
        ...ROOF_TYPES.map((t): Tile => ({ id: `roof.${t.id}`, icon: 'R', name: `Roof: ${t.name}`, desc: 'A at two corners, or A twice on a building', kind: 'go' })),
        { id: 'build.measure', icon: 'M', name: 'Measure', desc: 'A at one point, A at the other', kind: 'go' },
        { id: 'build.paste', icon: 'P', name: 'Paste', desc: 'At the dot, on this level', kind: 'go', disabled: copyFirst },
        { id: 'build.pasteUp', icon: 'P', name: 'Paste to level above', desc: 'Same spot, one level up', kind: 'go', disabled: copyFirst },
      ];
    case 'Openings':
      // ON9: every door and window type of the catalogue, doors first
      return CATALOGUE.map((c): Tile => ({ id: c.id === 'window' ? 'build.window' : `${c.family}.${c.id}`, icon: c.family === 'window' ? 'W' : 'D', name: c.name, desc: OPENING_DESC[c.motion], kind: 'go' }));
    case 'Objects': {
      // ON4: the five groups first (A changes the group, the menu stays), then that group's presets
      const g = inp.objGroup ?? 'dataHall';
      return [
        ...GROUPS.map((q): Tile => ({ id: `objgroup.${q.id}`, icon: 'G', name: q.name, desc: 'A shows its objects', kind: 'toggle', on: q.id === g, value: q.id === g ? 'shown' : '' })),
        ...groupPresets(g).map((p): Tile => ({ id: `obj.${p.id}`, icon: p.draw ? 'R' : p.mount === 'wall' ? 'W' : 'O', name: p.name, desc: p.draw ? 'A at the start, A at the end' : p.mount === 'wall' ? 'A on a wall; RB turns' : 'A places it; RB turns', kind: 'go' })),
      ];
    }
    case 'Climb':
      // ON5: climb pieces and exterior features (the catalogue's order)
      return CLIMB_PIECES.map((c): Tile => ({ id: `climb.${c.id}`, icon: c.place === 'draw' ? 'R' : c.place === 'point' ? 'O' : 'W', name: c.name, desc: c.desc, kind: 'go' }));
    case 'View':
      return viewTiles(inp.view);
    default:
      // Lights and Mission: the later parts add their tiles here
      return [];
  }
}

/** The tabs that show: those with tiles (Selected first, only with a selection). */
export const menuTabs = (inp: MenuInput): MenuTab[] => MENU_TABS.filter((t) => menuTiles(t, inp).length > 0);

/** Grid navigation with wrap: left / right through the list, up / down by a row (same column, wrapping). */
export function gridMove(i: number, n: number, cols: number, dx: number, dy: number): number {
  if (n <= 0) return 0;
  let j = Math.min(Math.max(0, i), n - 1);
  if (dx) j = (j + dx + n) % n;
  if (dy > 0) j = j + cols < n ? j + cols : j % cols;
  else if (dy < 0) {
    if (j - cols >= 0) j -= cols;
    else {
      const col = j % cols;
      const last = Math.floor((n - 1 - col) / cols) * cols + col;
      j = last < n ? last : n - 1;
    }
  }
  return j;
}

/** The menu's state: open, the tab, the highlight, and the last tab and tile per tab (remembered while the editor runs). */
export class TileMenu {
  isOpen = false;
  tab: MenuTab = 'Build';
  index = 0;
  private readonly last = new Map<MenuTab, number>();

  /** Opens on the last tab (or Build when `opens` is 'build', or when the last tab is not shown now). */
  open(inp: MenuInput, opens: 'last' | 'build' = 'last'): void {
    const tabs = menuTabs(inp);
    const want: MenuTab = opens === 'build' ? 'Build' : this.tab;
    this.setTab(tabs.includes(want) ? want : 'Build', inp);
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  setTab(t: MenuTab, inp: MenuInput): void {
    this.last.set(this.tab, this.index);
    this.tab = t;
    const n = menuTiles(t, inp).length;
    this.index = Math.min(this.last.get(t) ?? 0, Math.max(0, n - 1));
  }

  /** LB / RB: the next shown tab, wrapping. */
  stepTab(dir: 1 | -1, inp: MenuInput): void {
    const tabs = menuTabs(inp);
    if (!tabs.length) return;
    const i = tabs.indexOf(this.tab);
    this.setTab(tabs[(i + dir + tabs.length) % tabs.length]!, inp);
  }

  /** D-pad or stick steps; on a list tab left / right are left to the tile (values). */
  move(dx: number, dy: number, cols: number, inp: MenuInput): void {
    const n = menuTiles(this.tab, inp).length;
    const list = LIST_TABS.includes(this.tab);
    this.index = gridMove(this.index, n, list ? 1 : cols, list ? 0 : dx, dy);
    this.last.set(this.tab, this.index);
  }

  /** The highlighted tile. */
  tile(inp: MenuInput): Tile | undefined {
    return menuTiles(this.tab, inp)[this.index];
  }
}
