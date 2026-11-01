import type { App } from '../../core/app';
import type { GameOptions } from '../../game/gameState';
import { MISSIONS } from '../../game/missions';
import { MAPS } from '../../world/maps';
import { h } from '../dom';
import { MenuScreen } from '../menuScreen';
import { button } from '../widgets';
import { BriefingScreen, STARS } from './briefingScreen';

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
