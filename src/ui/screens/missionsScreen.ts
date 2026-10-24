import type { App } from '../../core/app';
import type { GameOptions } from '../../game/gameState';
import { MISSIONS } from '../../game/missions';
import { MAPS } from '../../world/maps';
import { h } from '../dom';
import { MenuScreen } from '../menuScreen';
import { button } from '../widgets';
import { BriefingScreen, STARS } from './briefingScreen';
import type { MapDef } from '../../world/mapDef';
import { DIFFICULTIES, DIFFICULTY } from '../../ai/archetypes';
import { emptySectorRecord, loadSectorRecord, starsOf, starsText, type SectorRecord } from '../../save/sectorRecord';
import { fmtTime } from '../../game/sectors';
import { loadRatingRecord, type RatingRecord } from '../../save/ratingRecord';
import { ALL_MARKS } from '../../game/rating/sectionRating';

/** Four small pips for a marks bitmask (filled = earned; a recorded 0 is four empty); '' when nothing is recorded. */
export function marksPips(marks: number | undefined): string {
  if (marks === undefined) return '';
  return [1, 2, 4, 8].map((b) => ((marks & ALL_MARKS & b) !== 0 ? '●' : '○')).join('');
}

/** menu-ui slice 4 (step 07): a list item with a counter, as on the main menu. */
function item(label: string, key: string, ctr: string, ctx: string, onClick: () => void): HTMLButtonElement {
  const b = button(label, onClick, { class: 'menu-item ms-item', key });
  b.append(h('span', { class: 'ms-ctr', text: ctr }));
  b.dataset.ctx = ctx;
  return b;
}

/** The campaign: a card (list item) per mission with its best result; confirm opens the briefing. */
export class MissionsScreen extends MenuScreen {
  constructor(app: App, start: (o: GameOptions) => void) {
    super('missions-screen', ['Select', 'Mission']);
    const list = h('div', { class: 'ms-list ms-scroll', attrs: { 'data-wrap': '' } });
    const sv = app.save.get();
    MISSIONS.forEach((m, i) => {
      const mp = MAPS.find((x) => x.id === m.map);
      const rec = sv.missions[m.id];
      const ctx = `<h3>${m.name}</h3><p>${mp?.name ?? ''}</p><p>${m.brief}</p><p>${rec ? `Best ${STARS(rec.rating)}  ·  ${rec.wins}/${rec.plays} won` : 'Not played yet.'}</p>`;
      const b = item(m.name, 'm-' + m.id, rec ? STARS(rec.rating) : '--', ctx, () => app.screens.push(new BriefingScreen(app, start, { kind: 'mission', mission: m })));
      b.dataset.mission = m.id;
      if (i === 0) b.dataset.autofocus = '';
      list.append(b);
    });
    this.body.append(list);
  }
}

/** The maps that are Sector Ops ops (a `sectors` list and the `sector` mode), in map order. */
// (sector-redesign A68) campusOps listed from slice 3 (after the Warehouse, MAPS order)
export const sectorOps = (): MapDef[] => MAPS.filter((m) => !m.unlisted && m.modes.includes('sector') && (m.sectors?.length ?? 0) > 0);

/** An op's context: name, sections, and per difficulty its star and best time. */
function opCtx(m: MapDef, rec: SectorRecord, rating: RatingRecord | null = null): string {
  const e = rec.ops[m.id];
  const rows = DIFFICULTIES.map((p) => {
    const done = !!e && e.done.includes(p);
    const best = e?.best[p];
    return `<p>${done ? '★' : '☆'} ${DIFFICULTY[p].label}${done && best ? `  ·  best ${fmtTime(best)}` : done ? '  ·  completed' : ''}</p>`;
  }).join('');
  const best = rating?.maps[m.id];
  const secRows = (m.sectors ?? [])
    .map((sc) => {
      const p = marksPips(best?.[sc.id]?.marks);
      return p ? `<p>${sc.name}  ·  <span class="ms-pips" aria-label="best rating">${p}</span></p>` : '';
    })
    .join('');
  return `<h3>${m.name}</h3><p>${m.description}</p><p>${m.sectors?.length ?? 0} sections. Objective, then exit. Kills optional.</p>${rows}${secRows}`;
}

/**
 * Sector Ops (feature/sector-ops M7): the op list. Each op shows its difficulty stars (filled for each difficulty it was
 * completed on, from the `sector:ops` record) and, in the context panel, the best time per difficulty; confirm opens
 * its briefing (which has the difficulty choice).
 */
export class SectorOpsScreen extends MenuScreen {
  private readonly items = new Map<string, HTMLButtonElement>();

  constructor(app: App, start: (o: GameOptions) => void) {
    super('sectorops-screen', ['Sector', 'Ops']);
    const list = h('div', { class: 'ms-list ms-scroll', attrs: { 'data-wrap': '' } });
    const empty = emptySectorRecord();
    sectorOps().forEach((m, i) => {
      const b = item(m.name, 'op-' + m.id, starsText(starsOf(empty, m.id)), opCtx(m, empty), () => app.screens.push(new BriefingScreen(app, start, { kind: 'sector', map: m })));
      b.dataset.op = m.id;
      b.dataset.stars = '0000';
      if (i === 0) b.dataset.autofocus = '';
      this.items.set(m.id, b);
      list.append(b);
    });
    this.body.append(list);
    void Promise.all([loadSectorRecord(), loadRatingRecord()]).then(([rec, rating]) => this.fill(rec, rating));
  }

  /** The saved stars and best times into the list (the record loads after the screen is built). */
  private fill(rec: SectorRecord, rating: RatingRecord): void {
    for (const m of sectorOps()) {
      const b = this.items.get(m.id);
      if (!b) continue;
      const st = starsOf(rec, m.id);
      const c = b.querySelector('.ms-ctr');
      if (c) c.textContent = starsText(st);
      b.dataset.stars = st.map((x) => (x ? '1' : '0')).join('');
      b.dataset.ctx = opCtx(m, rec, rating);
    }
    const f = this.manager?.nav.focused ?? null;
    if (f && this.el.contains(f)) this.showContext(f);
  }
}

/** Free roam: every map with a sandbox mode; confirm opens its (short) briefing with Weather and Start. */
export class FreeRoamScreen extends MenuScreen {
  constructor(app: App, start: (o: GameOptions) => void) {
    super('freeroam-screen', ['Free', 'Roam']);
    const list = h('div', { class: 'ms-list ms-scroll', attrs: { 'data-wrap': '' } });
    MAPS.filter((m) => m.modes.includes('sandbox')).forEach((m, i) => {
      const ctx = `<h3>${m.name}</h3><p>${m.description}</p><p>No guards. The full kit.</p>`;
      const b = item(m.name, 'map-' + m.id, '', ctx, () => app.screens.push(new BriefingScreen(app, start, { kind: 'freeroam', map: m })));
      b.dataset.map = m.id;
      if (i === 0) b.dataset.autofocus = '';
      list.append(b);
    });
    this.body.append(list);
  }
}
