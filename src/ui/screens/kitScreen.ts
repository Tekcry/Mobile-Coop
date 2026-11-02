import type { App } from '../../core/app';
import { campaignAttachments, campaignKit } from '../../config/arsenal';
import { GADGETS, type GadgetId } from '../../game/gadgets';
import { attachmentById, combinedMods } from '../../progression/attachments';
import { computeStats } from '../../weapons/weaponStats';
import { WEAPONS, type WeaponId } from '../../weapons/weaponDefs';
import { h } from '../dom';
import { MenuScreen } from '../menuScreen';
import { button } from '../widgets';

const GADGET_DESC: Record<GadgetId, string> = {
  frag: 'Lethal blast. Loud - everyone near hears it.',
  gas: 'A cloud that knocks out anyone inside it. Silent.',
  flash: 'Blinds guards facing it for a few seconds, then they come looking.',
  emp: 'Kills lights and electronics for a while; dazes guards close by.',
  noise: 'Sticks on and calls guards over to it. Draw them away.',
  stickyCam: 'Stick it up and watch the room: ping to lure, gas once.',
  mine: 'Placed, arms after 1.5 s: a frag-strength blast when a guard walks past.',
};

const MAX_DMG = Math.max(...Object.values(WEAPONS).map((w) => w.damage * w.pellets)) * 1.15;
const MAX_RANGE = Math.max(...Object.values(WEAPONS).map((w) => w.falloffEnd));

const bar = (label: string, v: number): string =>
  `<div class="kit-bar"><span class="kit-bar-l">${label}</span><span class="kit-bar-t"><i style="width:${Math.round(Math.max(0.04, Math.min(1, v)) * 100)}%"></i></span></div>`;

/**
 * menu-ui slice 4 (step 08, D-11): the issued kit, read only. Kits are fixed per mission; no per-mission kit data exists
 * yet, so every mission shows the default campaign kit (the long gun and the suppressed pistol with their issued parts
 * and the gadget the game issues). Per-mission kits come with the co-op gameplay slices. The revive syringe is not
 * modelled yet, so it is not listed.
 */
export class KitScreen extends MenuScreen {
  constructor(app: App) {
    super('kit-screen', ['Issued', 'Kit']);
    const sv = app.save.get();
    const kit = campaignKit({ primary: sv.loadout.primary as WeaponId, secondary: sv.loadout.secondary as WeaponId });
    const list = h('div', { class: 'ms-list', attrs: { 'data-wrap': '' } });
    const gun = (slot: string, w: WeaponId, first: boolean): HTMLElement => {
      const def = WEAPONS[w];
      const ids = campaignAttachments(w, sv.weapons[w]?.attachments ?? []);
      const st = computeStats(def, sv.weapons[w]?.upgrades, combinedMods(ids));
      const atts = ids.map((id) => attachmentById(id)?.name ?? id);
      const ctx =
        `<h3>${slot}</h3><p><b>${def.name}</b>  ·  ${def.fireMode === 'auto' ? 'Automatic' : 'Semi-automatic'}  ·  ${st.magSize} rounds</p>` +
        `<p>${atts.length ? 'Fitted: ' + atts.join(', ') + '.' : 'No attachments fitted.'}</p>` +
        bar('Power', (st.damage * def.pellets) / MAX_DMG) +
        bar('Accuracy', 1 - Math.min(1, st.spreadAds / 2.2)) +
        bar('Range', def.falloffEnd / MAX_RANGE) +
        bar('Handling', 1 - Math.min(1, st.recoilPitch / 6)) +
        '<p class="kit-note">Issued for the mission. Not selectable.</p>';
      return this.entry(slot, slot === 'Sidearm' ? 'secondary' : 'primary', def.name, ctx, first);
    };
    const gid = (sv.presets[sv.preset]?.gadget ?? 'frag') as GadgetId;
    const g = GADGETS[gid];
    list.append(
      gun('Primary', kit.primary, true),
      gun('Sidearm', kit.sidearm, false),
      this.entry('Gadget', 'gadget', g.name, `<h3>Gadget</h3><p><b>${g.name}</b>  ·  carries ${g.carry}</p><p>${GADGET_DESC[gid] ?? ''}</p><p class="kit-note">Issued for the mission. Not selectable.</p>`, false),
    );
    this.body.append(
      h('p', { class: 'ms-note', text: 'Issued for the next mission' }),
      list,
      h('p', { class: 'ms-note dim', text: 'Kits are fixed per mission. Per-mission kits arrive with co-op.' }),
    );
  }

  private entry(label: string, key: string, ctr: string, ctx: string, first: boolean): HTMLElement {
    const b = button(label, () => {}, { class: 'menu-item ms-item', key });
    b.append(h('span', { class: 'ms-ctr', text: ctr }));
    b.dataset.ctx = ctx;
    if (first) b.dataset.autofocus = '';
    return b;
  }
}
