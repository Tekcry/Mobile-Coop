/**
 * The level editor's radial menu contents (ED2 Part C3) and its ring on screen. The tree is rebuilt each time the
 * menu opens, so levels and buildings are always current. Picks run through `runMenu`.
 */
import { fmt } from './geometry';
import { OPENING_TYPES } from './ops';
import type { Radial, RadialNode } from './radial';
import type { Campus } from './types';

const DOOR_NAMES: Record<string, string> = { door: 'Door', double: 'Double door', 'fire-door': 'Fire door', roller: 'Roller shutter', gate: 'Gate' };

/** Root ring, clockwise from the top: Select, Build, Edit, Undo, Walk, View, Level, File. */
export function menuTree(d: Campus, opts: { selected: boolean; clipboard: boolean }): RadialNode {
  const levels = d.levels.slice().sort((a, b) => b.floor - a.floor);
  return {
    id: 'root',
    name: 'Menu',
    children: [
      { id: 'select', name: 'Select', desc: 'Pick, grab and move what the dot is on' },
      {
        id: 'build',
        name: 'Build',
        desc: 'Rooms, walls, doors and windows',
        children: [
          { id: 'build.room', name: 'Room', desc: 'A starts a corner, A finishes the opposite one' },
          { id: 'build.wall', name: 'Wall', desc: 'A at one end, A at the other (copies the last wall selected)' },
          {
            id: 'build.door',
            name: 'Door',
            desc: 'Door types; A on a wall places one',
            children: OPENING_TYPES.filter((t) => t !== 'window').map((t) => ({ id: `door.${t}`, name: DOOR_NAMES[t] ?? t, desc: 'A on a wall places it' })),
          },
          { id: 'build.window', name: 'Window', desc: 'A on a wall places one' },
          { id: 'build.stair', name: 'Stair', hidden: true },
          { id: 'build.ladder', name: 'Ladder', hidden: true },
          { id: 'build.hole', name: 'Floor hole', hidden: true },
          { id: 'build.object', name: 'Object', hidden: true },
        ],
      },
      {
        id: 'edit',
        name: 'Edit',
        desc: 'Duplicate, delete, rotate, copy, paste, measure',
        children: [
          { id: 'edit.props', name: 'Properties', desc: 'Change the fields with the D-pad', hidden: !opts.selected },
          { id: 'edit.dup', name: 'Duplicate', desc: 'A copy beside it', hidden: !opts.selected },
          { id: 'edit.del', name: 'Delete', desc: 'A wall takes its doors and windows', hidden: !opts.selected },
          { id: 'edit.rotate', name: 'Rotate 90', desc: 'Turn a room, wall, stair or ladder a quarter turn', hidden: !opts.selected },
          { id: 'edit.copy', name: 'Copy', desc: 'Rooms, walls and floor holes', hidden: !opts.selected },
          { id: 'edit.paste', name: 'Paste', desc: 'At the dot, on this level', hidden: !opts.clipboard },
          { id: 'edit.pasteUp', name: 'Paste to level above', desc: 'Same spot, one level up', hidden: !opts.clipboard },
          { id: 'edit.measure', name: 'Measure', desc: 'A at one point, A at the other' },
        ],
      },
      { id: 'undo', name: 'Undo', desc: 'Undo the last change (X does it too)' },
      { id: 'walk', name: 'Walk', desc: 'Walk at eye height / fly (the game player comes in Part B)' },
      {
        id: 'view',
        name: 'View',
        desc: '3D, plan, levels, buildings',
        children: [
          { id: 'view.3d', name: '3D only' },
          { id: 'view.both', name: 'Both' },
          { id: 'view.plan', name: 'Plan only' },
          {
            id: 'view.levels',
            name: 'Levels',
            desc: 'Which levels are drawn',
            children: [
              { id: 'lv.panel', name: 'Levels panel', desc: 'Pick levels, gap, cut height, building with the D-pad' },
              { id: 'lv.whole', name: 'Whole building' },
              { id: 'lv.single', name: 'Single level' },
              { id: 'lv.upTo', name: 'Up to this level' },
              { id: 'lv.ghost', name: 'Ghost the rest', desc: 'On / off' },
              { id: 'lv.exploded', name: 'Exploded', desc: 'On / off' },
              { id: 'lv.section', name: 'Cut walls at 1.2 m', desc: 'On / off' },
              { id: 'lv.underlay', name: 'Level below on plan', desc: 'On / off' },
            ],
          },
          {
            id: 'view.buildings',
            name: 'Buildings',
            children: [{ id: 'b.all', name: 'All' }, ...(d.meta.buildings ?? []).map((b) => ({ id: `b.${b.id}`, name: `Building ${b.id}` })), { id: 'b.site', name: 'Site (outside)' }],
          },
          { id: 'view.labels', name: 'Plan labels', desc: 'On / off' },
          { id: 'view.minimap', name: 'Small plan', desc: 'On / off (3D only)' },
        ],
      },
      { id: 'level', name: 'Level', desc: 'Edit another level', children: levels.map((l) => ({ id: `level.${l.id}`, name: `${l.name} (${fmt(l.floor)} m)` })) },
      {
        id: 'file',
        name: 'File',
        children: [
          { id: 'file.save', name: 'Save', desc: 'The file, the plan images and the change log' },
          { id: 'file.revert', name: 'Revert to last save', desc: 'Asks first' },
          { id: 'file.help', name: 'Help', desc: 'Every button' },
          { id: 'file.checks', name: 'Checks', desc: 'Problems found; A on one goes there' },
          { id: 'file.changes', name: 'Changes', desc: 'What changed since the last save' },
        ],
      },
    ],
  };
}

/** The ring on screen, in the game's gadget wheel style; DOM is written only when something changes. */
export class RadialView {
  private key = '';

  constructor(private readonly el: HTMLElement) {}

  render(r: Radial): void {
    if (!r.isOpen) {
      if (this.key) {
        this.el.classList.add('hidden');
        this.el.innerHTML = '';
        this.key = '';
      }
      return;
    }
    const ring = r.ring;
    const hl = r.highlight;
    const k = `${r.ringId}|${hl}|${ring.length}`;
    if (k === this.key) return;
    this.key = k;
    const n = ring.length;
    const node = ring[hl];
    const slots = ring
      .map((s, i) => {
        const a = (i / n) * Math.PI * 2;
        const style = `left:${(50 + Math.sin(a) * 38).toFixed(2)}%;top:${(50 - Math.cos(a) * 38).toFixed(2)}%`;
        return `<div class="rm-slot${i === hl ? ' hl' : ''}" style="${style}" data-slot="${i}">${esc(s.name)}${s.children ? '<span class="rm-sub">&#8250;</span>' : ''}</div>`;
      })
      .join('');
    const crumb = r.breadcrumb.length ? `<div class="rm-crumb">${esc(r.breadcrumb.join(' > '))}</div>` : '';
    const centre = `<div class="rm-centre">${crumb}<div class="rm-name">${esc(node?.name ?? '')}</div><div class="rm-desc">${esc(node?.desc ?? (node?.children ? 'Opens a submenu' : ''))}</div></div>`;
    this.el.innerHTML = `<div class="rm-ring">${slots}${centre}</div>`;
    this.el.classList.remove('hidden');
  }
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
