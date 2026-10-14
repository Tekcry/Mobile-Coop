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
const OPENING_DESC: Record<Motion, string> = { swing: 'Hinged leaf, on a wall', double: 'Two hinged leaves', slide: 'Slides along a track', roll: 'Rolls up', none: 'Fixed, on a wall', hung: 'Opens out from the top', louvre: 'Tilting glass slats' };
import { ROOM_OPTIONS } from './roomWalls';
import { STAIR_TYPES } from './vertical';
import { ROOF_TYPES } from './roofGeometry';
import { GROUPS, groupPresets } from './catalogue';
import type { ObjGroup } from './catalogue';
import { CLIMB_PIECES } from './climbCatalogue';
import type { Coll } from './types';
import { PRESET_FROMS } from './presets';
import { fittingOf, groupFittings, LIGHT_GROUPS } from './lightCatalogue';
import type { LightGroup } from './lightCatalogue';
import type { PresetFrom } from './presets';
import { MISSION_TOOLS } from './missionCatalogue';
import { SEC_TOOLS } from './securityCatalogue';
import { SIGN_KINDS } from './signCatalogue';

export const MENU_TABS = ['Selected', 'Build', 'Openings', 'Objects', 'Presets', 'Climb', 'Lights', 'Mission', 'Security', 'View'] as const;
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
  /** ON15: a slider's place (0 to 1) and a marker on it (the hub draws them). */
  frac?: number;
  mark?: number;
  /** Greyed: A only says why. */
  disabled?: string;
}

/** What the tiles depend on; padControl fills it from the editor. */
export interface MenuInput {
  /** The selection; `gap` when a selected wall has an end within 5 cm of another wall (ON0b). */
  sel: { coll: Coll; type: string; gap?: boolean; breakable?: boolean } | null;
  clipboard: boolean;
  view: ViewState;
  /** ON3: the number of things in a multi-selection (box select or Shift+click); its tiles replace the Selected tab's. */
  group?: number;
  /** ON4: the Objects tab's group (its presets follow the group tiles); ON14: or Signs. */
  objGroup?: ObjGroup | 'signs';
  /** ON14: Align lines up on the first picked (else the outermost). */
  alignFirst?: boolean;
  /** ON11: the Presets tab: the source shown, its presets, and the own preset Rename / Delete act on (the one last picked). */
  presets?: { from: PresetFrom; list: { id: string; name: string; desc: string }[]; mine: { id: string; name: string } | null };
  /** ON6: the Lights tab's group (its fittings follow the group tiles and Switch). */
  lightGroup?: LightGroup;
  /** ON8: a guard's patrol is playing (Selected: Stop patrol instead of Play patrol). */
  playing?: boolean;
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
  /** ON7: the light view (Y), the darkness map (B), the lights preview mode's name and the circuit switched off. */
  light?: boolean;
  dark?: boolean;
  lmode?: string;
  circuit?: string | null;
  /** ON8: the guard paths shown: every guard's, or only the selected guard's. */
  paths?: 'all' | 'selected';
  /** ON12: the security coverage view. */
  coverage?: boolean;
  /** ON13: the ceiling voids view. */
  voids?: boolean;
  /** ON15: the Moon and time panel: on, and its rows' words (the time, bearing, height, brightness, whether the map uses it). */
  night?: { on: boolean; time: string; frac: number; brief: number; bearing: string; height: string; brightness: string; used: boolean };
}

/** Tabs drawn as one column of rows (left / right changes values there instead of moving). */
export const LIST_TABS: readonly MenuTab[] = ['View'];

const PRESET_WORDS = { whole: 'Whole building', single: 'Single level', upTo: 'Up to this level', pick: 'Picked levels' } as const;
const LAYOUT_WORDS = { '3d': '3D', both: 'Both', plan: 'Plan' } as const;
const onOff = (b: boolean): string => (b ? 'on' : 'off');

/** The View items (the tile menu's View tab and the hub's View tab). */
export function viewTiles(v: ViewState): Tile[] {
  return [
    { id: 'view.layout', icon: 'V', name: 'Layout', desc: '3D, both or plan', kind: 'cycle', value: LAYOUT_WORDS[v.layout] },
    { id: 'view.ghost', icon: 'G', name: 'Ghost other levels', desc: 'Hidden levels see-through', kind: 'toggle', on: v.ghost, value: onOff(v.ghost) },
    { id: 'view.exploded', icon: 'X', name: 'Exploded', desc: 'Levels drawn apart', kind: 'slider', on: v.exploded, value: v.exploded ? `${fmt(v.gap)} m gap` : 'off' },
    { id: 'view.cut', icon: 'C', name: 'Cut walls at', desc: 'Walls cut to a height', kind: 'slider', on: v.cut > 0, value: v.cut > 0 ? `${fmt(v.cut)} m` : 'off' },
    { id: 'view.levels', icon: 'L', name: 'Levels shown', desc: 'Which levels show', kind: 'cycle', value: PRESET_WORDS[v.preset] },
    { id: 'view.building', icon: 'B', name: 'Building filter', desc: 'All, one or the site', kind: 'cycle', value: v.building === 'all' ? 'All' : v.building === 'site' ? 'Site' : `Building ${v.building}` },
    { id: 'view.minimap', icon: 'M', name: 'Small plan', desc: 'Plan in the 3D corner', kind: 'toggle', on: v.minimap, value: onOff(v.minimap) },
    { id: 'view.labels', icon: 'T', name: 'Labels', desc: 'Room names on the plan', kind: 'toggle', on: v.labels, value: onOff(v.labels) },
    { id: 'view.underlay', icon: 'U', name: 'Level below on the plan', desc: 'Floor below, faint', kind: 'toggle', on: v.underlay, value: onOff(v.underlay) },
    { id: 'view.names', icon: 'N', name: 'Room names in 3D', desc: 'Names over each floor', kind: 'toggle', on: !!v.names, value: onOff(!!v.names) },
    { id: 'view.figure', icon: 'K', name: 'Scale figure', desc: '1.75 m person and crouch', kind: 'toggle', on: !!v.figure, value: onOff(!!v.figure) },
    { id: 'view.stealth', icon: 'J', name: 'Stealth view', desc: 'Objects by what they give', kind: 'toggle', on: !!v.stealth, value: onOff(!!v.stealth) },
    { id: 'view.finish', icon: 'N', name: 'Finish view', desc: 'Floors tinted by finish', kind: 'toggle', on: !!v.finish, value: onOff(!!v.finish) },
    // ON7: the game's own light: night lighting in 3D, the darkness map, the lights preview modes
    { id: 'view.light', icon: 'Y', name: 'Lighting', desc: 'Night, the game\'s light', kind: 'toggle', on: !!v.light, value: onOff(!!v.light) },
    { id: 'view.dark', icon: 'B', name: 'Darkness map', desc: 'Floor by the light meter', kind: 'toggle', on: !!v.dark, value: onOff(!!v.dark) },
    { id: 'view.lmode', icon: 'P', name: 'Lights preview', desc: 'Mains off, switched off, shot', kind: 'cycle', value: v.lmode ?? 'Normal' },
    ...(v.lmode === 'Switched off' ? [{ id: 'view.circuit', icon: 'C', name: 'Circuit off', desc: 'Pick the circuit', kind: 'cycle' as const, value: v.circuit ?? 'none' }] : []),
    // ON8: every guard's patrol path, or only the selected guard's
    { id: 'view.paths', icon: 'G', name: 'Guard paths', desc: 'All or the selected guard', kind: 'cycle', value: v.paths === 'selected' ? 'Selected guard' : 'All guards' },
    // ON12: every camera cone and sensor fan of this level tinted, the unwatched floor clear
    { id: 'view.coverage', icon: 'S', name: 'Security coverage', desc: 'Camera cones, sensor fans', kind: 'toggle', on: !!v.coverage, value: onOff(!!v.coverage) },
    { id: 'view.voids', icon: 'V', name: 'Ceiling voids', desc: 'Green meets the crawl rule', kind: 'toggle', on: !!v.voids, value: onOff(!!v.voids) },
    // ON15: the moon's direction, height and brightness, and the time of night (its rows show while it is on)
    { id: 'view.night', icon: 'O', name: 'Moon and time', desc: 'Moon arrow and shadows', kind: 'toggle', on: !!v.night?.on, value: onOff(!!v.night?.on) },
    ...(v.night?.on ? nightTiles(v.night) : []),
  ];
}

/** ON15: the Moon and time rows (left / right steps them; A on the time goes to the brief's night). */
function nightTiles(n: NonNullable<ViewState['night']>): Tile[] {
  return [
    { id: 'view.ntime', icon: 'T', name: 'Time of night', desc: 'Dusk to dawn', kind: 'slider', on: true, value: n.time, frac: n.frac, mark: n.brief },
    { id: 'view.nbear', icon: 'D', name: 'Moon bearing', desc: 'Compass, 5 degree steps', kind: 'cycle', value: n.bearing },
    { id: 'view.nheight', icon: 'H', name: 'Moon height', desc: 'Degrees above the horizon', kind: 'cycle', value: n.height },
    { id: 'view.nbright', icon: 'M', name: 'Moon brightness', desc: 'New to full', kind: 'cycle', value: n.brightness },
    { id: 'view.nuse', icon: 'U', name: 'Use for the map', desc: 'Walk test and game', kind: 'go', value: n.used ? 'in use' : 'not yet' },
  ];
}

/** ON14: what Mirror and Array take (a room brings its walls, doors and contents: arrange.ts). */
const ARRANGE_COLLS: readonly Coll[] = ['rooms', 'walls', 'openings', 'objects', 'signs', 'voids', 'stairs', 'ladders', 'lamps'];
const mirrorTiles = (): Tile[] => [
  { id: 'sel.mirrorX', icon: 'M', name: 'Mirror east-west', desc: 'About its own centre', kind: 'go' },
  { id: 'sel.mirrorZ', icon: 'M', name: 'Mirror north-south', desc: 'About its own centre', kind: 'go' },
  { id: 'sel.mirrorLine', icon: 'L', name: 'Mirror about a line', desc: 'Two points on the line', kind: 'go' },
];
const arrayTile: Tile = { id: 'sel.array', icon: 'Y', name: 'Array', desc: 'Copies along a line', kind: 'go' };
const ALIGN_TILES: readonly [string, string][] = [
  ['left', 'Align left (west)'],
  ['right', 'Align right (east)'],
  ['top', 'Align top (north)'],
  ['bottom', 'Align bottom (south)'],
  ['cx', 'Align centres (x)'],
  ['cz', 'Align centres (z)'],
];

/** The tiles of one tab, in order. */
export function menuTiles(tab: MenuTab, inp: MenuInput): Tile[] {
  const copyFirst = inp.clipboard ? undefined : 'Copy something first';
  switch (tab) {
    case 'Selected': {
      if (inp.group)
        return [
          { id: 'sel.move', icon: 'M', name: `Move ${inp.group} things`, desc: 'Grab them all', kind: 'go' },
          { id: 'sel.copy', icon: 'C', name: 'Copy', desc: 'Rooms, walls and holes', kind: 'go' },
          { id: 'sel.copyUp', icon: 'U', name: 'Copy to level above', desc: 'Same spot, level up', kind: 'go' },
          { id: 'sel.del', icon: 'X', name: `Delete ${inp.group} things`, desc: 'Walls take their doors', kind: 'go' },
          { id: 'sel.savePreset', icon: 'P', name: 'Save as preset', desc: 'Shows under Presets, Mine', kind: 'go' },
          // ON14: mirror, align, evenly space and Array the set (one undo step each)
          ...mirrorTiles(),
          ...ALIGN_TILES.map((a): Tile => ({ id: `sel.align.${a[0]}`, icon: 'A', name: a[1], desc: inp.alignFirst ? 'To the first picked' : 'To the outermost', kind: 'go' })),
          { id: 'sel.alignFirst', icon: 'F', name: 'Align to', desc: 'Outermost or first picked', kind: 'toggle', on: !!inp.alignFirst, value: inp.alignFirst ? 'First picked' : 'Outermost' },
          { id: 'sel.distX', icon: 'E', name: 'Evenly space along x', desc: 'Equal gaps, ends stay', kind: 'go', disabled: inp.group < 3 ? 'Select three or more' : undefined },
          { id: 'sel.distZ', icon: 'E', name: 'Evenly space along z', desc: 'Equal gaps, ends stay', kind: 'go', disabled: inp.group < 3 ? 'Select three or more' : undefined },
          arrayTile,
        ];
      const s = inp.sel;
      if (!s) return [];
      const turns = ['rooms', 'walls', 'stairs', 'ladders', 'objects'].includes(s.coll);
      const copies = ['rooms', 'walls', 'voids'].includes(s.coll);
      const types = s.coll === 'openings' || s.coll === 'rooms' || s.coll === 'walls' || s.coll === 'stairs' || s.coll === 'voids' || s.coll === 'roofs' || s.coll === 'objects' || s.coll === 'exterior' || s.coll === 'lamps' || s.coll === 'guards' || s.coll === 'objectives' || s.coll === 'hides' || s.coll === 'devices' || s.coll === 'ceilings';
      // ON8: mission records are not duplicated (a fresh one is placed with its tool)
      // ON12: nor are security devices (a reader binds one door)
      // ON13: nor are ceilings (a room's own) and crawl spaces; a ceiling moves and is renamed with its room
      const mission = ['guards', 'objectives', 'hides', 'checkpoints', 'spawns', 'extraction', 'devices', 'ceilings', 'crawls'].includes(s.coll);
      const own = s.coll !== 'ceilings';
      const t: (Tile | false)[] = [
        // ON8: a guard: its path, the patrol preview and the isolation point first
        s.coll === 'guards' && { id: 'sel.path', icon: 'P', name: 'Edit path', desc: 'Patrol stops, then close', kind: 'go' },
        s.coll === 'guards' && { id: 'sel.patrol', icon: 'W', name: inp.playing ? 'Stop patrol' : 'Play patrol', desc: 'Walk the loop, unsaved', kind: 'go' },
        s.coll === 'guards' && { id: 'sel.alone', icon: 'I', name: 'Mark alone here', desc: 'Point nearest the dot', kind: 'go' },
        s.coll === 'objectives' && { id: 'sel.requires', icon: 'N', name: 'Needs first', desc: 'Objectives it needs', kind: 'go' },
        s.coll === 'objectives' && { id: 'sel.unlocks', icon: 'O', name: 'Opens', desc: 'Objectives it opens', kind: 'go' },
        own && { id: 'sel.move', icon: 'M', name: 'Move', desc: 'Grab it whole', kind: 'go' },
        !mission && { id: 'sel.dup', icon: 'D', name: 'Duplicate', desc: 'Copy beside it', kind: 'go' },
        turns && { id: 'sel.rotate', icon: 'R', name: 'Rotate 90', desc: 'Quarter turn', kind: 'go' },
        copies && { id: 'sel.copy', icon: 'C', name: 'Copy', desc: 'Paste from Build', kind: 'go' },
        copies && { id: 'sel.copyUp', icon: 'U', name: 'Copy to level above', desc: 'Same spot, level up', kind: 'go' },
        s.coll === 'rooms' && { id: 'sel.finish', icon: 'F', name: 'Floor finish', desc: 'Floor finish row', kind: 'go' },
        // ON13: the room's ceiling as a piece (type, height, hatches)
        s.coll === 'rooms' && { id: 'sel.ceiling', icon: 'C', name: 'Ceiling', desc: 'Type, height and hatches', kind: 'go' },
        s.coll === 'ceilings' && { id: 'sel.room', icon: 'R', name: 'Room', desc: 'Room under this ceiling', kind: 'go' },
        s.coll === 'rooms' && { id: 'sel.savePreset', icon: 'P', name: 'Save as preset', desc: 'Room, walls, doors, objects', kind: 'go' },
        s.coll === 'rooms' && { id: 'sel.split', icon: 'S', name: 'Split', desc: 'Line across the room', kind: 'go' },
        s.coll === 'stairs' && { id: 'sel.fit', icon: 'F', name: 'Fit', desc: 'Smallest legal size', kind: 'go' },
        s.coll === 'stairs' && { id: 'sel.turnClimb', icon: 'A', name: 'Turn climb 90', desc: 'Climb turns, stair stays', kind: 'go' },
        // ON6: aim a flood or twin spot with the right stick; the circuit row; a switch takes more lamps
        s.coll === 'devices' && (s.type === 'camera' || s.type === 'pir') && { id: 'sel.aim', icon: 'A', name: 'Aim', desc: 'Turn where it looks', kind: 'go' },
        s.coll === 'lamps' && fittingOf(s.type)?.aimPitch !== undefined && { id: 'sel.aim', icon: 'A', name: 'Aim', desc: 'Point the light', kind: 'go' },
        s.coll === 'lamps' && { id: 'sel.circuit', icon: 'C', name: 'Circuit', desc: 'Pick or add one', kind: 'go' },
        // ON7: the light view with this lamp out (not saved)
        s.coll === 'lamps' && s.breakable === true && { id: 'sel.shot', icon: 'O', name: 'Preview shot out', desc: 'Light view, lamp out', kind: 'go' },
        s.coll === 'circuits' && { id: 'sel.addLamps', icon: 'L', name: 'Add lamps', desc: 'Pick lamps for this switch', kind: 'go' },
        // ON14: mirror and Array; name plates on every door of the room's level or building
        ...(ARRANGE_COLLS.includes(s.coll) ? mirrorTiles() : []),
        ARRANGE_COLLS.includes(s.coll) && s.coll !== 'openings' && arrayTile,
        s.coll === 'rooms' && { id: 'sel.platesLevel', icon: 'N', name: 'Name plates: this level', desc: 'Every door on this level', kind: 'go' },
        s.coll === 'rooms' && { id: 'sel.platesBuilding', icon: 'N', name: 'Name plates: this building', desc: 'Every door, every level', kind: 'go' },
        own && { id: 'sel.rename', icon: 'I', name: 'Rename id', desc: 'References follow', kind: 'go' },
        types && { id: 'sel.type', icon: 'T', name: 'Change type', desc: 'Type row on the card', kind: 'go' },
        s.gap === true && { id: 'sel.closeGap', icon: 'G', name: 'Close gap', desc: 'Meet the nearby wall', kind: 'go' },
        { id: 'sel.props', icon: 'P', name: 'Properties', desc: 'Every field, side panel', kind: 'go' },
        { id: 'sel.del', icon: 'X', name: 'Delete', desc: 'Walls take their doors', kind: 'go' },
      ];
      return t.filter((x): x is Tile => !!x);
    }
    case 'Build':
      return [
        { id: 'select', icon: 'S', name: 'Select', desc: 'Pick, grab and move', kind: 'go' },
        ...ROOM_OPTIONS.map((o): Tile => ({ id: `room.${o.id}`, icon: 'R', name: o.id === 'walls' ? 'Room with walls' : o.id === 'outside' ? 'Room with outside walls' : 'Room only', desc: 'Two corners', kind: 'go' })),
        { id: 'build.wall', icon: 'W', name: 'Wall', desc: 'End to end', kind: 'go' },
        ...STAIR_TYPES.map((t): Tile => ({ id: `stair.${t.id}`, icon: 'S', name: t.id === 'main-straight' ? 'Straight stair' : `Stair: ${t.name}`, desc: 'Corner, then point the climb', kind: 'go' })),
        { id: 'build.ladder', icon: 'L', name: 'Ladder', desc: 'Wall face, up a level', kind: 'go' },
        { id: 'build.hole', icon: 'H', name: 'Floor hole', desc: 'Two corners', kind: 'go' },
        // ON13: a crawl space in a ceiling void, from a hatch or vent to another
        { id: 'build.crawl', icon: 'C', name: 'Crawl space', desc: 'Hatch or vent to another', kind: 'go' },
        // ON10: one Roof tile per type; A, A on the same spot takes the building (or room) under the dot
        ...ROOF_TYPES.map((t): Tile => ({ id: `roof.${t.id}`, icon: 'R', name: `Roof: ${t.name}`, desc: 'Two corners, or a building', kind: 'go' })),
        { id: 'build.measure', icon: 'M', name: 'Measure', desc: 'Point to point', kind: 'go' },
        { id: 'build.paste', icon: 'P', name: 'Paste', desc: 'At the dot', kind: 'go', disabled: copyFirst },
        { id: 'build.pasteUp', icon: 'P', name: 'Paste to level above', desc: 'Same spot, level up', kind: 'go', disabled: copyFirst },
      ];
    case 'Openings':
      // ON9: every door and window type of the catalogue, doors first
      return CATALOGUE.map((c): Tile => ({ id: c.id === 'window' ? 'build.window' : `${c.family}.${c.id}`, icon: c.family === 'window' ? 'W' : 'D', name: c.name, desc: OPENING_DESC[c.motion], kind: 'go' }));
    case 'Objects': {
      // ON4: the five groups first (A changes the group, the menu stays), then that group's presets
      const g = inp.objGroup ?? 'dataHall';
      return [
        ...GROUPS.map((q): Tile => ({ id: `objgroup.${q.id}`, icon: 'G', name: q.name, desc: 'Pick a group', kind: 'toggle', on: q.id === g, value: q.id === g ? 'shown' : '' })),
        // ON14: Signs (wayfinding and safety) as a sixth group
        { id: 'objgroup.signs', icon: 'G', name: 'Signs', desc: 'Pick a group', kind: 'toggle', on: g === 'signs', value: g === 'signs' ? 'shown' : '' },
        ...(g === 'signs' ? SIGN_KINDS.map((k): Tile => ({ id: `sign.${k.id}`, icon: k.group === 'way' ? 'W' : 'S', name: k.name, desc: k.mount === 'wall' ? 'On a wall face' : 'On a wall, or hung', kind: 'go' })) : []),
        ...(g === 'signs' ? [] : groupPresets(g)).map((p): Tile => ({ id: `obj.${p.id}`, icon: p.draw ? 'R' : p.mount === 'wall' ? 'W' : 'O', name: p.name, desc: p.draw ? 'Start to end' : p.mount === 'wall' ? 'On a wall' : 'Place and turn', kind: 'go' })),
      ];
    }
    case 'Presets': {
      // ON11: the three sources first (A shows that list, the menu stays), then its presets (A picks the Stamp tool)
      const ps = inp.presets ?? { from: 'start' as PresetFrom, list: [], mine: null };
      const pickFirst = ps.mine ? undefined : 'Pick one of yours first';
      return [
        ...PRESET_FROMS.map((q): Tile => ({ id: `presetfrom.${q.id}`, icon: 'G', name: q.name, desc: 'Pick a group', kind: 'toggle', on: q.id === ps.from, value: q.id === ps.from ? 'shown' : '' })),
        ...(ps.from === 'mine'
          ? [
              { id: 'mine.rename', icon: 'I', name: ps.mine ? `Rename ${ps.mine.name}` : 'Rename a preset', desc: 'Name list and keyboard', kind: 'go', disabled: pickFirst } as Tile,
              { id: 'mine.delete', icon: 'X', name: ps.mine ? `Delete ${ps.mine.name}` : 'Delete a preset', desc: 'Gone at the next Save', kind: 'go', disabled: pickFirst } as Tile,
            ]
          : []),
        ...ps.list.map((p): Tile => ({ id: `preset.${p.id}`, icon: 'S', name: p.name, desc: p.desc, kind: 'go' })),
      ];
    }
    case 'Climb':
      // ON5: climb pieces and exterior features (the catalogue's order)
      return CLIMB_PIECES.map((c): Tile => ({ id: `climb.${c.id}`, icon: c.place === 'draw' ? 'R' : c.place === 'point' ? 'O' : 'W', name: c.name, desc: c.desc, kind: 'go' }));
    case 'Lights': {
      // ON6: the five groups and Switch first (a group tile shows its fittings, the menu stays), then the group's fittings
      const g = inp.lightGroup ?? 'interior';
      return [
        ...LIGHT_GROUPS.map((q): Tile => ({ id: `lightgroup.${q.id}`, icon: 'G', name: q.name, desc: 'Pick a group', kind: 'toggle', on: q.id === g, value: q.id === g ? 'shown' : '' })),
        { id: 'light.switch', icon: 'S', name: 'Switch', desc: 'Wall, then pick lamps', kind: 'go' },
        // ON7: the guard view tester (not saved)
        { id: 'guard.view', icon: 'E', name: 'Guard view', desc: 'What a guard sees', kind: 'go' },
        ...groupFittings(g).map((f): Tile => ({ id: `light.${f.id}`, icon: f.linear ? 'R' : f.mount === 'wall' || f.mount === 'sign' ? 'W' : 'L', name: f.name, desc: f.linear ? 'Start to end' : f.mount === 'wall' ? 'On a wall face' : f.mount === 'sign' ? 'Over a door' : f.mount === 'desk' || f.mount === 'object' ? `On a ${f.onObjects?.[0]?.replace(/-/g, ' ') ?? 'object'}` : 'Place and turn', kind: 'go' })),
      ];
    }
    case 'View':
      return viewTiles(inp.view);
    case 'Mission':
      // ON8: the guard and the mission markers (the play file's records)
      return MISSION_TOOLS.map((m): Tile => ({ id: `mission.${m.id}`, icon: m.name[0]!, name: m.name, desc: m.desc, kind: 'go' }));
    case 'Security':
      // ON12: cameras, readers, sensors and beams (the security file's records)
      return SEC_TOOLS.map((t): Tile => ({ id: `security.${t.id}`, icon: t.name[0]!, name: t.name, desc: t.desc, kind: 'go' }));
    default:
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
