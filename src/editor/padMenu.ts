/**
 * The level editor's two wheels (ED2 Part C3, ED3-2) and their ring on screen. The Build wheel (Y held, hold Space)
 * picks what to make; the Selection wheel (RB held, hold R) changes the selected thing and shows only what fits it.
 * Trees are rebuilt each time a wheel opens. Picks run through `runMenu`.
 */
import { DOOR_NAMES, OPENING_TYPES, ROOM_KINDS, WALL_KINDS } from './ops';
import type { Radial, RadialNode } from './radial';
import type { Coll } from './types';

export { DOOR_NAMES };

/** Build wheel, clockwise from the top. Stair, Ladder, Floor hole and Object stay hidden until those tools exist. */
export function buildTree(opts: { clipboard: boolean }): RadialNode {
  return {
    id: 'build',
    name: 'Build',
    children: [
      { id: 'select', name: 'Select', desc: 'Pick, grab and move what the dot is on' },
      { id: 'build.room', name: 'Room', desc: 'A starts a corner, A finishes the opposite one' },
      { id: 'build.wall', name: 'Wall', desc: 'A at one end, A at the other (copies the last wall selected)' },
      {
        id: 'build.door',
        name: 'Door',
        desc: 'Door types; A on a wall places one',
        children: OPENING_TYPES.filter((t) => t !== 'window').map((t) => ({ id: `door.${t}`, name: DOOR_NAMES[t] ?? t, desc: 'A on a wall places it' })),
      },
      { id: 'build.window', name: 'Window', desc: 'A on a wall places one' },
      { id: 'build.measure', name: 'Measure', desc: 'A at one point, A at the other' },
      { id: 'build.paste', name: 'Paste', desc: 'At the dot, on this level', hidden: !opts.clipboard },
      { id: 'build.pasteUp', name: 'Paste to level above', desc: 'Same spot, one level up', hidden: !opts.clipboard },
      { id: 'build.stair', name: 'Stair', hidden: true },
      { id: 'build.ladder', name: 'Ladder', hidden: true },
      { id: 'build.hole', name: 'Floor hole', hidden: true },
      { id: 'build.object', name: 'Object', hidden: true },
    ],
  };
}

/** The kinds "Change type" offers for a selected element (its own kind left out); empty when it has none. */
export function changeTypes(coll: Coll, current: string): { id: string; name: string }[] {
  const list = coll === 'openings' ? OPENING_TYPES.map((t) => [t, DOOR_NAMES[t] ?? t]) : coll === 'rooms' ? ROOM_KINDS.map((k) => [k, k]) : coll === 'walls' ? WALL_KINDS.map((k) => [k, k]) : [];
  return list.filter(([v]) => v !== current).map(([v, n]) => ({ id: `type.${v}`, name: n! }));
}

/** Selection wheel for the selected element: only what fits it. Split joins in ED3-3. */
export function selectionTree(coll: Coll, current: string): RadialNode {
  const turns = coll === 'rooms' || coll === 'walls' || coll === 'stairs' || coll === 'ladders';
  const copies = coll === 'rooms' || coll === 'walls' || coll === 'voids';
  const types = changeTypes(coll, current);
  return {
    id: 'sel',
    name: 'Selection',
    children: [
      { id: 'sel.move', name: 'Move', desc: 'Grab it, as A in the middle' },
      { id: 'sel.props', name: 'Properties', desc: 'Change the fields with the D-pad' },
      { id: 'sel.dup', name: 'Duplicate', desc: 'A copy beside it' },
      { id: 'sel.rotate', name: 'Rotate 90', desc: 'A quarter turn', hidden: !turns },
      { id: 'sel.copy', name: 'Copy', desc: 'Paste it from the Build wheel', hidden: !copies },
      { id: 'sel.copyUp', name: 'Copy to level above', desc: 'Same spot, one level up; the editing level goes with it', hidden: !copies },
      { id: 'sel.type', name: 'Change type', desc: 'One undo step', hidden: !types.length, children: types.map((t) => ({ ...t, desc: 'A picks it' })) },
      { id: 'sel.split', name: 'Split', hidden: true },
      { id: 'sel.del', name: 'Delete', desc: 'A wall takes its doors and windows' },
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
