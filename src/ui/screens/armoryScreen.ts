import type { App } from '../../core/app';
import { WEAPONS, type WeaponId } from '../../weapons/weaponDefs';

const ORDER: WeaponId[] = ['rifle', 'smg', 'shotgun', 'sniper', 'pistol', 'ak', 'tavor', 'lmg', 'vector', 'p90', 'semiShotgun', 'breacher', 'dmr', 'crossbow', 'fiveseven', 'pistolSd'];
import { computeStats, MAX_UPGRADE } from '../../weapons/weaponStats';
import { buyUnlock, buyUpgrade, owns, setAttachment, setLoadout, unlockContext, weaponMastery, levelInfo } from '../../progression/profile';
import { canUpgrade, TRACKS, TRACK_LABEL } from '../../progression/upgrades';
import { attachmentsFor, combinedMods, type AttachmentSlot } from '../../progression/attachments';
import { describeReq, unlockById, unlockState } from '../../progression/unlocks';
import { MASTERY_KILLS } from '../../progression/levels';
import { CAMOS, camoUnlockId } from '../../cosmetics/catalog';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice, section } from '../widgets';
import { statBars } from '../hud/statBars';
import { profileBadge } from './profileBadge';

const SLOTS: { slot: AttachmentSlot; label: string }[] = [
  { slot: 'optic', label: 'Optic' },
  { slot: 'barrel', label: 'Barrel' },
  { slot: 'underbarrel', label: 'Underbarrel' },
  { slot: 'magazine', label: 'Magazine' },
];

/** Loadout, upgrade trees, attachments and mastery for every weapon. LB/RB cycles weapons. */
export class ArmoryScreen extends Screen {
  private idx = 0;
  private strip: HTMLElement;
  private panel: HTMLElement;

  constructor(private app: App) {
    super('armory-screen');
    this.idx = Math.max(0, ORDER.indexOf(app.save.get().loadout.primary));
    this.strip = h('div', { class: 'tab-strip scrollable' });
    this.panel = h('div', { class: 'armory-panel scrollable' });
    this.el.append(h('div', { class: 'screen-head' }, h('div', { class: 'screen-title', text: 'Armory' }), profileBadge(app)), this.strip, this.panel);
    this.render();
  }

  private get weapon(): WeaponId {
    return ORDER[this.idx]!;
  }

  private render(keepFocus = true): void {
    const focusedKey = keepFocus ? this.app.nav.focused?.dataset.key : undefined;
    const s = this.app.save.get();
    this.strip.replaceChildren(
      h('span', { class: 'tab-bumper', text: 'LB' }),
      ...ORDER.map((w, i) => {
        const t = h('button', { class: `tab${i === this.idx ? ' active' : ''}${owns(s, `weapon:${w}`) ? '' : ' locked'}`, text: WEAPONS[w].name.split(' ')[0]!, focus: true });
        t.dataset.key = `tab-${w}`;
        t.addEventListener('click', () => {
          this.idx = i;
          this.render();
        });
        return t;
      }),
      h('span', { class: 'tab-bumper', text: 'RB' }),
    );
    const w = this.weapon;
    const def = WEAPONS[w];
    const wp = s.weapons[w];
    const ownsW = owns(s, `weapon:${w}`);
    const stats = computeStats(def, wp.upgrades, combinedMods(wp.attachments));
    const base = computeStats(def);
    const li = levelInfo(s);
    const keyed = <T extends HTMLElement>(el: T, key: string): T => {
      el.dataset.key = key;
      return el;
    };
    const head = h(
      'div',
      { class: 'armory-head' },
      h('div', {}, h('div', { class: 'w-title', text: def.name }), h('div', { class: 'row-note', text: `${def.class.toUpperCase()} · ${def.fireMode === 'auto' ? 'Automatic' : 'Semi-auto'} · ${def.kind === 'projectile' ? 'Projectile' : 'Hitscan'}` })),
    );
    const actions = h('div', { class: 'armory-actions' });
    if (ownsW) {
      const eqP = s.loadout.primary === w;
      const eqS = s.loadout.secondary === w;
      actions.append(
        keyed(button(eqP ? 'Primary ✓' : 'Equip primary', () => this.mutate((d) => setLoadout(d, 'primary', w)), { class: eqP ? 'primary' : '' }), 'eqp'),
        keyed(button(eqS ? 'Secondary ✓' : 'Equip secondary', () => this.mutate((d) => setLoadout(d, 'secondary', w)), { class: eqS ? 'primary' : '' }), 'eqs'),
      );
    } else {
      const item = unlockById(`weapon:${w}`)!;
      const st = unlockState(item, unlockContext(s));
      actions.append(
        keyed(
          button(st === 'buyable' ? `Unlock · ${item.req.price} cr` : `Locked · ${describeReq(item)}`, () => this.buy(`weapon:${w}`), {
            blocked: st !== 'buyable' ? `Requires ${describeReq(item)}` : s.profile.credits < (item.req.price ?? 0) ? 'Not enough credits' : undefined,
            class: 'primary',
          }),
          'unlock',
        ),
      );
    }
    head.append(actions);

    // upgrade trees
    const tree = h('div', { class: 'rows' });
    for (const t of TRACKS) {
      const lvl = wp.upgrades[t];
      const pips = h('span', { class: 'pips' }, ...Array.from({ length: MAX_UPGRADE }, (_, i) => h('i', { class: i < lvl ? 'on' : '' })));
      const c = canUpgrade(w, wp.upgrades, t, li.level, s.profile.credits);
      const label = !ownsW ? 'Locked' : c.ok ? `Upgrade · ${c.cost} cr` : c.reason === 'maxed' ? 'Maxed' : c.reason === 'level' ? `Level ${c.needLevel}` : `${c.cost} cr`;
      const why = !ownsW ? 'Unlock the weapon first' : c.ok ? undefined : c.reason === 'maxed' ? 'Fully upgraded' : c.reason === 'level' ? `Requires level ${c.needLevel}` : 'Not enough credits';
      const btn = keyed(button(label, () => this.mutate((d) => buyUpgrade(d, w, t)), { blocked: why, class: 'small' }), `up-${t}`);
      tree.append(h('div', { class: 'row' }, h('span', { class: 'row-label', text: TRACK_LABEL[t] }), h('span', { class: 'row-right' }, pips, btn)));
    }

    // attachments
    const att = h('div', { class: 'rows' });
    for (const sl of SLOTS) {
      const opts = attachmentsFor(w).filter((a) => a.slot === sl.slot);
      if (!opts.length) continue;
      const ownedOpts = opts.filter((a) => owns(s, `att:${a.id}`));
      const cur = wp.attachments.find((id) => opts.some((o) => o.id === id)) ?? '';
      const options = [{ value: '', label: 'None' }, ...ownedOpts.map((a) => ({ value: a.id, label: a.name }))];
      const ch = choice(sl.label, options, () => cur, (v) => this.mutate((d) => {
        if (cur) setAttachment(d, w, cur, false);
        if (v) setAttachment(d, w, v, true);
      }));
      keyed(ch, `att-${sl.slot}`);
      if (!ownsW) ch.setAttribute('disabled', '');
      const lockedN = opts.length - ownedOpts.length;
      att.append(ch);
      if (lockedN) att.append(h('div', { class: 'row-note', text: `${lockedN} more in the Store: ${opts.filter((a) => !owns(s, `att:${a.id}`)).map((a) => a.name).join(', ')}` }));
    }
    // camo
    const camoOpts = CAMOS.filter((c) => owns(s, camoUnlockId(w, c.id))).map((c) => ({ value: c.id, label: c.name }));
    const camoChoice = keyed(choice('Camo', camoOpts, () => wp.camo, (v) => this.mutate((d) => void (d.weapons[w].camo = v))), 'camo');
    if (!ownsW) camoChoice.setAttribute('disabled', '');
    att.append(camoChoice, h('div', { class: 'row-note', text: 'Mastery levels unlock Woodland, Desert, Urban, Tiger and Gold camos for this weapon.' }));
    const m = weaponMastery(s, w);
    const nextK = MASTERY_KILLS[m];
    const mastery = h('div', { class: 'row-note', text: `Mastery ${m}/5 · ${wp.kills} kills${nextK ? ` · next at ${nextK}` : ' · mastered'}` });
    this.panel.replaceChildren(
      head,
      h('div', { class: 'armory-cols' }, h('div', {}, section('Stats', statBars(def, stats, base)), mastery), h('div', {}, section('Upgrade tree', tree), section('Attachments', att))),
    );
    if (focusedKey) {
      const el = this.el.querySelector<HTMLElement>(`[data-key="${focusedKey}"]`);
      this.app.nav.setRoot(this.el, el);
    } else {
      this.app.nav.refresh();
    }
  }

  private mutate(fn: (d: ReturnType<App['save']['get']>) => unknown): void {
    this.app.save.update((d) => void fn(d));
    this.render();
  }

  private buy(id: string): void {
    let msg = '';
    this.app.save.update((d) => {
      const r = buyUnlock(d, id);
      msg = r.ok ? `Unlocked ${r.item.name}` : r.reason;
    });
    this.app.toasts.show(msg, msg.startsWith('Unlocked') ? 'ok' : 'warn');
    this.render();
  }

  override initialFocus(): HTMLElement | null {
    return this.el.querySelector<HTMLElement>('.armory-actions [data-focus]');
  }

  override onTab(dir: -1 | 1): void {
    this.idx = (this.idx + dir + ORDER.length) % ORDER.length;
    this.render(false);
    this.app.nav.setRoot(this.el, this.initialFocus());
  }

  override hints(): Hint[] {
    return [
      { btn: 'LB/RB', label: 'Weapon' },
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Back' },
    ];
  }
}
