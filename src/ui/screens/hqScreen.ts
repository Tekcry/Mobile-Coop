import type { App } from '../../core/app';
import { applyPreset, buyHq, buySuit, levelInfo, savePreset, wearSuit } from '../../progression/profile';
import { canBuyHq, canBuySuit, CHALLENGES, HQ, HQ_IDS, SUIT, SUIT_PIECES, type HqId, type SuitPiece } from '../../progression/suit';
import { WEAPONS, type WeaponId } from '../../weapons/weaponDefs';
import { GADGETS, GADGET_IDS, type GadgetId } from '../../game/gadgets';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice, TabView } from '../widgets';
import { profileBadge } from './profileBadge';

const PIECE_LABEL: Record<SuitPiece, string> = { vest: 'Vest', gloves: 'Gloves', boots: 'Boots', goggles: 'Goggles', pouches: 'Pouches' };

/**
 * HQ (Paladin-style hub): the suit (buy tiers in order, wear any owned tier), HQ upgrades (radar, sonar, execute
 * capacity, supply drops, revive training), challenges (progress and rewards) and the three loadout presets.
 */
export class HqScreen extends Screen {
  private tabs: TabView;

  constructor(private app: App) {
    super('hq-screen');
    this.tabs = new TabView([
      { id: 'suit', label: 'Suit', build: () => this.buildSuit() },
      { id: 'upgrades', label: 'Upgrades', build: () => this.buildHq() },
      { id: 'challenges', label: 'Challenges', build: () => this.buildChallenges() },
      { id: 'presets', label: 'Loadouts', build: () => this.buildPresets() },
    ]);
    this.tabs.onChange = () => app.nav.refresh();
    this.el.append(h('div', { class: 'screen-head' }, h('div', { class: 'screen-title', text: 'HQ' }), profileBadge(app)), this.tabs.el);
  }

  private mutate(f: Parameters<App['save']['update']>[0], key: string, msg?: () => string): void {
    this.app.save.update(f);
    if (msg) {
      const m = msg();
      if (m) this.app.toasts.show(m, 'ok');
    }
    const tab = ['suit', 'upgrades', 'challenges', 'presets'][this.tabs.index]!;
    this.tabs.rebuild(tab);
    this.app.nav.setRoot(this.el, this.el.querySelector<HTMLElement>(`[data-key="${key}"]`));
  }

  private buildSuit(): HTMLElement {
    const s = this.app.save.get();
    const lvl = levelInfo(s).level;
    const list = h('div', { class: 'store-grid' });
    for (const piece of SUIT_PIECES) {
      SUIT[piece].forEach((t, i) => {
        const owned = s.suit.owned[piece] >= i;
        const worn = s.suit.worn[piece] === i;
        const c = canBuySuit(s.suit.owned, piece, i, lvl, s.profile.credits);
        const label = worn ? 'Worn' : owned ? 'Wear' : c.ok ? `Buy · ${t.price} cr` : c.reason === 'level' ? `Level ${t.level}` : `${t.price} cr`;
        const b = button(label, () => {
          let r = '';
          this.mutate(
            (d) => {
              if (owned) wearSuit(d, piece, i);
              else {
                const x = buySuit(d, piece, i);
                r = x.ok ? `${t.name} bought` : '';
              }
            },
            `${piece}${i}`,
            () => r,
          );
        }, { class: worn ? 'owned small' : 'small', blocked: worn ? 'Worn' : !owned && !c.ok ? (c.reason === 'credits' ? 'Not enough credits' : 'Locked') : undefined });
        b.dataset.key = `${piece}${i}`;
        list.append(h('div', { class: `store-item ${owned ? 'owned' : ''}` }, h('div', { class: 'store-name', text: `${PIECE_LABEL[piece]}: ${t.name}` }), h('div', { class: 'store-kind', text: t.desc }), b));
      });
    }
    return list;
  }

  private buildHq(): HTMLElement {
    const s = this.app.save.get();
    const lvl = levelInfo(s).level;
    const list = h('div', { class: 'store-grid' });
    for (const id of HQ_IDS) {
      const d = HQ[id];
      const cur = s.hq[id];
      const c = canBuyHq(s.hq, id, lvl, s.profile.credits);
      const label = !c.ok && c.reason === 'maxed' ? 'Maxed' : c.ok ? `Upgrade · ${c.price} cr` : c.reason === 'level' ? `Level ${c.level}` : `${c.price} cr`;
      const b = button(label, () => {
        let r = '';
        this.mutate(
          (dd) => {
            const x = buyHq(dd, id as HqId);
            r = x.ok ? `${d.name} upgraded` : '';
          },
          id,
          () => r,
        );
      }, { class: 'small', blocked: c.ok ? undefined : c.reason === 'maxed' ? 'Maxed' : c.reason === 'credits' ? 'Not enough credits' : 'Locked' });
      b.dataset.key = id;
      list.append(h('div', { class: 'store-item' }, h('div', { class: 'store-name', text: `${d.name} (${cur}/${d.prices.length})` }), h('div', { class: 'store-kind', text: d.desc }), b));
    }
    return list;
  }

  private buildChallenges(): HTMLElement {
    const s = this.app.save.get();
    const list = h('div', { class: 'store-grid' });
    for (const c of CHALLENGES) {
      const done = s.challenges.done.includes(c.id);
      const p = Math.min(c.goal, s.challenges.progress[c.id] ?? 0);
      const el = h('div', { class: `store-item ${done ? 'owned' : ''}`, focus: true }, h('div', { class: 'store-name', text: c.name }), h('div', { class: 'store-kind', text: done ? `Done · +${c.credits} cr, +${c.xp} XP` : `${p}/${c.goal} · ${c.credits} cr, ${c.xp} XP` }));
      el.dataset.key = c.id;
      list.append(el);
    }
    return list;
  }

  private buildPresets(): HTMLElement {
    const s = this.app.save.get();
    const list = h('div', { class: 'rows' });
    s.presets.forEach((p, i) => {
      const active = s.preset === i;
      const gadget = choice(
        `${p.name}${active ? ' (in use)' : ''}: gadget`,
        GADGET_IDS.map((g) => ({ value: g, label: GADGETS[g].name })),
        () => (GADGET_IDS.includes(p.gadget as GadgetId) ? (p.gadget as GadgetId) : 'frag'),
        (v) => this.app.save.update((d) => (d.presets[i]!.gadget = v)),
      );
      const weapons = `${WEAPONS[p.primary as WeaponId]?.name ?? p.primary} + ${WEAPONS[p.secondary as WeaponId]?.name ?? p.secondary}`;
      const use = button(`Use ${p.name}`, () => this.mutate((d) => applyPreset(d, i), `use${i}`, () => `${p.name} loadout in use`), { class: active ? 'primary small' : 'small', sub: weapons });
      use.dataset.key = `use${i}`;
      const store = button('Save current loadout here', () => this.mutate((d) => savePreset(d, i), `save${i}`, () => `Saved to ${p.name}`), { class: 'small' });
      store.dataset.key = `save${i}`;
      list.append(gadget, use, store);
    });
    return list;
  }

  override initialFocus(): HTMLElement | null {
    return this.el.querySelector<HTMLElement>('.tab-panel.active [data-focus]:not(.blocked)') ?? this.el.querySelector<HTMLElement>('.tab-panel.active [data-focus]');
  }

  override onTab(dir: -1 | 1): void {
    this.tabs.cycle(dir);
    this.app.nav.setRoot(this.el, this.initialFocus());
  }

  override hints(): Hint[] {
    return [
      { btn: 'LB/RB', label: 'Section' },
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Back' },
    ];
  }
}
