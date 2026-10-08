import type { App } from '../../core/app';
import { flags } from '../../core/flags';
import { campaignUnlocked, showEconomy } from '../../core/legacy';
import type { SaveData } from '../../save/schema';
import { MenuState, type MenuFraming } from '../../world/menuScene';
import { WEAPONS, type WeaponDef, type WeaponId } from '../../weapons/weaponDefs';
import { computeStats, MAX_UPGRADE, type EffectiveStats } from '../../weapons/weaponStats';
import { campaignOpens, ownsOrOpen, applyPreset, buyHq, buySuit, buyUnlock, buyUpgrade, levelInfo, owns, savePreset, setAttachment, setLoadout, unlockContext, wearSuit, weaponMastery } from '../../progression/profile';
import { canUpgrade, TRACKS, TRACK_LABEL, type UpgradeTrack } from '../../progression/upgrades';
import { attachmentsFor, combinedMods, type AttachmentDef, type AttachmentSlot } from '../../progression/attachments';
import { describeReq, unlockById, unlockState } from '../../progression/unlocks';
import { MASTERY_KILLS } from '../../progression/levels';
import { canBuyHq, canBuySuit, CHALLENGES, HQ, HQ_IDS, SUIT, SUIT_PIECES, suitLook, suitStats, type HqId, type SuitLoadout, type SuitPiece } from '../../progression/suit';
import { GADGETS, GADGET_IDS, type GadgetId } from '../../game/gadgets';
import { PALETTE_COLORS, SKIN_TONES, sanitizeLook, type AvatarColors, type AvatarLook } from '../../cosmetics/avatarLook';
import { CAMOS, camoUnlockId, EMBLEMS, EMOTES, emblemSvg, LOOK_FIELD, PART_OPTIONS, partUnlockId, TAGS, type PartCategory } from '../../cosmetics/catalog';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { promptHtml } from '../prompts';
import { icon } from '../icons';
import { button, choice } from '../widgets';
import { showSavedOperator } from './operator';
import { vx } from '../../core/viewRotation';

/** Weapon order in the lists. */
export const WEAPON_ORDER: WeaponId[] = ['pistolSd', 'pistol', 'fiveseven', 'smg', 'vector', 'p90', 'rifle', 'ak', 'tavor', 'dmr', 'sniper', 'crossbow', 'shotgun', 'semiShotgun', 'breacher', 'lmg'];

const SLOTS: { slot: AttachmentSlot; label: string }[] = [
  { slot: 'optic', label: 'Optic' },
  { slot: 'barrel', label: 'Barrel' },
  { slot: 'underbarrel', label: 'Underbarrel' },
  { slot: 'magazine', label: 'Magazine' },
];
const PIECE_LABEL: Record<SuitPiece, string> = { vest: 'Torso', gloves: 'Gloves', boots: 'Boots', goggles: 'Goggles', pouches: 'Pouches' };
const PART_LABEL: Record<PartCategory, string> = { body: 'Build', head: 'Head', hair: 'Hair', torso: 'Outfit', legs: 'Legs', helmet: 'Headgear', backpack: 'Backpack', pattern: 'Pattern' };
const PARTS: PartCategory[] = ['body', 'head', 'hair', 'torso', 'legs', 'helmet', 'backpack', 'pattern'];
const GADGET_DESC: Record<GadgetId, string> = {
  frag: 'Lethal blast. Loud - everyone near hears it.',
  gas: 'A cloud that knocks out anyone inside it. Silent.',
  flash: 'Blinds guards facing it for a few seconds, then they come looking.',
  emp: 'Kills lights and electronics for a while; dazes guards close by.',
  noise: 'Sticks on and calls guards over to it. Draw them away.',
  stickyCam: 'Stick it up and watch the room: ping to lure, gas once, mark.',
  drone: 'Fly in through the gaps: stun dart and one shock burst.',
  mine: 'Placed, arms after 1.5 s: a frag-strength blast when a guard walks past.',
};
const ADJ = ['Iron', 'Silent', 'Rapid', 'Lucky', 'Crimson', 'Frost', 'Shadow', 'Copper', 'Night', 'Wild', 'Steel', 'Dust'];
const NOUN = ['Fox', 'Viper', 'Hawk', 'Bear', 'Wolf', 'Raven', 'Comet', 'Badger', 'Lynx', 'Otter', 'Mantis', 'Rhino'];

type Mark = 'equipped' | 'owned' | 'buyable' | 'locked';

/** One line of a list: what it shows, what focusing it previews, what A / Y do and the details panel. */
interface Row {
  key: string;
  label: string;
  /** Header line before it (when it starts a group). */
  group?: string;
  /** Right side: a value (menu rows), a price, a requirement. */
  value?: string;
  mark?: Mark;
  /** Opens a deeper list (chevron). */
  go?: boolean;
  /** Customisable (a wrench beside it). */
  tune?: boolean;
  preview?(): void;
  detail(): HTMLElement;
  act?: Action;
  alt?: Action;
}

interface Action {
  label: string;
  run(): void;
  /** Shown but refused, with why. */
  blocked?: string;
}

/** A list page: breadcrumb, title and subtitle, rows (or a custom body for forms). */
interface Page {
  id: string;
  crumb: string;
  title: string;
  sub: string;
  framing: MenuFraming;
  rows(): Row[];
  body?(): HTMLElement;
}

/**
 * Loadout (Splinter Cell: Blacklist's gear screen): a list on the left (breadcrumb, title, the options with what
 * they cost or a check when equipped), the operator in the middle, the details on the right (stat bars with what
 * the change does, green better / red worse), the actions along the bottom. Lists drill down (Loadout > Primary >
 * a weapon's attachments and upgrades > camo). Focusing an option previews it on the operator - locked ones too;
 * A equips / buys / opens, Y customises a weapon, B goes up a level. Owned choices save at once; previews are
 * dropped on leaving.
 */
export class LoadoutScreen extends Screen {
  /** Back is on the action bar. */
  override readonly showBack = false;
  private stack: { page: Page; key: string | null }[] = [];
  private listEl: HTMLElement;
  private headEl: HTMLElement;
  private detailEl: HTMLElement;
  private actsEl: HTMLElement;
  private tickerEl: HTMLElement;
  private walletEl: HTMLElement;
  private rows = new Map<string, Row>();
  private focusKey: string | null = null;
  /** When the focused row was focused (a tap that focuses a row only previews it). */
  private focusT = 0;
  private viaNav = false;
  private dragX: number | null = null;
  private unsub: (() => void) | null = null;

  // previews (drafts): the weapon in hand, per-weapon camo / attachments, the look, the suit
  private weapon: WeaponId;
  private camo: Partial<Record<WeaponId, string>> = {};
  private att: Partial<Record<WeaponId, string[]>> = {};
  private look: AvatarLook;
  private suit: SuitLoadout;

  /** 3.5: the campaign opens every weapon and attachment (nothing is bought or saved); the economy and cosmetics only with `?legacy=1`. */
  private readonly campaign = campaignUnlocked(flags.legacy);
  private readonly eco = showEconomy(flags.legacy);

  constructor(private app: App) {
    super('loadout-screen');
    const s = this.s();
    this.weapon = s.loadout.primary;
    this.look = structuredClone(s.avatar);
    this.suit = { ...s.suit.worn };
    this.tickerEl = h('div', { class: 'net-ticker' });
    this.walletEl = h('div', { class: 'wallet' });
    this.headEl = h('div', { class: 'lo-head' });
    this.listEl = h('div', { class: 'lo-list scrollable' });
    this.detailEl = h('div', { class: 'lo-detail scrollable' });
    this.actsEl = h('div', { class: 'lo-acts' });
    // the operator in the middle: drag (or the right stick) turns them
    const stage = h('div', { class: 'lo-stage' });
    stage.addEventListener('pointerdown', (e) => {
      this.dragX = vx(e);
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      const m = this.menu();
      if (this.dragX === null || !m) return;
      m.previewYaw -= (vx(e) - this.dragX) * 0.012;
      this.dragX = vx(e);
    });
    const end = (): void => void (this.dragX = null);
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    this.listEl.addEventListener('nav-focus', (e) => this.onFocus(e.target as HTMLElement));
    this.listEl.addEventListener('nav-confirm', () => void (this.viaNav = true), { capture: true });
    this.el.append(
      h('div', { class: 'lo-top' }, h('div', { class: 'net-brand', text: this.eco ? 'SBD-NET' : 'NIGHT SHIFT' }), this.tickerEl, this.walletEl),
      h('div', { class: 'lo-main' }, h('div', { class: 'lo-left' }, this.headEl, this.listEl), stage, this.detailEl),
      this.actsEl,
    );
    this.stack.push({ page: this.rootPage(), key: null });
    this.unsub = app.save.subscribe(() => this.renderTop());
    this.renderTop();
    this.render();
  }

  private s(): SaveData {
    return this.app.save.get();
  }

  private menu(): MenuState | null {
    const m = this.app.current;
    return m instanceof MenuState ? m : null;
  }

  private get page(): Page {
    return this.stack[this.stack.length - 1]!.page;
  }

  // ------------------------------------------------------------------ frame

  /** Level, credits and the challenge ticker (the next one to finish). */
  private renderTop(): void {
    if (!this.eco) return;
    const s = this.s();
    this.walletEl.innerHTML = `<span>LV ${levelInfo(s).level}</span><b class="credits">${s.profile.credits} cr</b>`;
    const next = CHALLENGES.find((c) => !s.challenges.done.includes(c.id));
    if (next) {
      const left = next.goal - Math.min(next.goal, s.challenges.progress[next.id] ?? 0);
      this.tickerEl.textContent = `${left} to go: ${next.name.toUpperCase()} to earn ${next.credits} cr`;
    } else this.tickerEl.textContent = 'All challenges complete';
  }

  /** Draw the current page; keep the focus on the same row when it is still there. */
  private render(key: string | null = this.focusKey): void {
    const p = this.page;
    this.headEl.replaceChildren(h('div', { class: 'lo-crumb', text: this.crumbs() }), h('div', { class: 'lo-title', text: p.title }), h('div', { class: 'lo-sub', text: p.sub }));
    this.rows.clear();
    this.listEl.classList.toggle('form', !!p.body);
    if (p.body) {
      this.listEl.replaceChildren(p.body());
    } else {
      const els: HTMLElement[] = [];
      for (const r of p.rows()) {
        if (r.group) els.push(h('div', { class: 'lo-group', text: r.group }));
        els.push(this.rowEl(r));
        this.rows.set(r.key, r);
      }
      this.listEl.replaceChildren(...els);
    }
    this.menu()?.setFraming(p.framing);
    const target = (key ? this.listEl.querySelector<HTMLElement>(`[data-key="${key}"]`) : null) ?? this.listEl.querySelector<HTMLElement>('[data-focus]');
    this.focusKey = null;
    this.app.nav.setRoot(this.el, target);
    if (!target) {
      this.detailEl.replaceChildren();
      this.renderActs(null);
      this.preview();
    }
  }

  private crumbs(): string {
    return this.stack.map((e) => e.page.crumb).join(' \\ ') + ' \\';
  }

  private rowEl(r: Row): HTMLElement {
    const right = h('span', { class: 'lo-right' });
    if (r.value) right.append(h('span', { class: `lo-val${r.mark === 'buyable' ? ' price' : ''}`, text: r.value }));
    if (r.tune) right.insertAdjacentHTML('beforeend', `<span class="lo-ic">${icon('wrench', 16)}</span>`);
    if (r.mark === 'equipped') right.insertAdjacentHTML('beforeend', `<span class="lo-ic ok">${icon('check', 16)}</span>`);
    if (r.mark === 'locked') right.insertAdjacentHTML('beforeend', `<span class="lo-ic lock">${icon('lock', 15)}</span>`);
    if (r.go) right.insertAdjacentHTML('beforeend', `<span class="lo-ic">${icon('chevron', 15)}</span>`);
    const el = h('button', { class: `lo-row${r.mark ? ` m-${r.mark}` : ''}`, focus: true }, h('span', { class: 'lo-label', text: r.label }), right);
    el.dataset.key = r.key;
    el.addEventListener('click', () => {
      const nav = this.viaNav;
      this.viaNav = false;
      // a tap on a row not yet focused only previews it; the next tap (or A / the action bar) acts
      if (!nav && performance.now() - this.focusT < 350) return;
      this.run(r.act);
    });
    return el;
  }

  private onFocus(el: HTMLElement): void {
    const key = el.dataset.key ?? null;
    if (!key) return;
    this.focusKey = key;
    this.stack[this.stack.length - 1]!.key = key;
    this.focusT = performance.now();
    const r = this.rows.get(key);
    if (!r) {
      // a form (colours, tag): what is saved shows
      this.renderActs(null);
      this.resetDrafts();
      this.preview();
      return;
    }
    this.resetDrafts();
    r.preview?.();
    this.preview();
    this.detailEl.replaceChildren(r.detail());
    this.renderActs(r);
  }

  /** The bottom bar: A (act), Y (customise), B (back); tappable. */
  private renderActs(r: Row | null): void {
    const b = (btn: 'A' | 'Y' | 'B', a: Action | undefined): HTMLElement | null => {
      if (!a) return null;
      const el = h('button', { class: `lo-act nofocus${a.blocked ? ' blocked' : ''}`, html: `${promptHtml(btn)}<span>${a.label}</span>` });
      el.addEventListener('click', () => this.run(a));
      return el;
    };
    const back: Action = { label: this.stack.length > 1 ? 'Back' : 'Done', run: () => this.app.screens.back(this) };
    this.actsEl.replaceChildren(...[b('A', r?.act), b('Y', r?.alt), b('B', back)].filter((x): x is HTMLElement => !!x));
  }

  private run(a: Action | undefined): void {
    if (!a) return;
    if (a.blocked) {
      this.app.toasts.show(a.blocked, 'warn');
      return;
    }
    a.run();
  }

  private open(p: Page): void {
    this.stack.push({ page: p, key: null });
    this.render(null);
  }

  /** Re-draw after a change (keeps the focused row). */
  private refresh(): void {
    this.render(this.stack[this.stack.length - 1]!.key);
  }

  override onBack(): boolean {
    if (this.stack.length <= 1) return false;
    this.stack.pop();
    this.render(this.stack[this.stack.length - 1]!.key);
    return true;
  }

  // ------------------------------------------------------------------ previews

  private camoOf(w: WeaponId): string {
    return this.camo[w] ?? this.s().weapons[w].camo;
  }

  private attOf(w: WeaponId): string[] {
    return this.att[w] ?? this.s().weapons[w].attachments;
  }

  /** Back to what is saved (a focused row then sets its own preview). */
  private resetDrafts(): void {
    const s = this.s();
    this.camo = {};
    this.att = {};
    this.look = structuredClone(s.avatar);
    this.suit = { ...s.suit.worn };
    // the weapon in hand: the one this list is about, else the primary
    const w = this.stack.map((e) => e.page.id).reverse().find((id) => id.startsWith('w:'));
    this.weapon = w ? (w.slice(2) as WeaponId) : this.page.id === 'slot:secondary' ? s.loadout.secondary : s.loadout.primary;
  }

  private preview(): void {
    this.menu()?.setAvatar(suitLook(this.look, this.suit), this.weapon, this.camoOf(this.weapon), this.attOf(this.weapon));
  }

  private save(fn: (d: SaveData) => unknown): void {
    this.app.save.update((d) => void fn(d));
  }

  /** Buy an unlock (then `after`, e.g. equip it). */
  private buy(id: string, after?: (d: SaveData) => void): void {
    let ok = false;
    let msg = '';
    this.app.save.update((d) => {
      const r = buyUnlock(d, id);
      ok = r.ok;
      msg = r.ok ? `Unlocked ${r.item.name}` : r.reason;
      if (r.ok) after?.(d);
    });
    this.app.toasts.show(msg, ok ? 'ok' : 'warn');
    this.refresh();
  }

  /** How an unlockable stands: owned, buyable now (its price), or locked (what it needs). */
  private unlockRow(id: string): { mark: Mark; value: string; act?: Action; need: string } {
    const item = unlockById(id);
    if (!item || (this.campaign && campaignOpens(id))) return { mark: 'owned', value: '', need: '' };
    const s = this.s();
    const st = unlockState(item, unlockContext(s));
    if (st === 'owned') return { mark: 'owned', value: '', need: '' };
    if (st === 'free') return { mark: 'buyable', value: 'FREE', need: '', act: { label: `Claim ${item.name}`, run: () => this.buy(id) } };
    const price = item.req.price ?? 0;
    if (st === 'buyable') return { mark: 'buyable', value: `${price} cr`, need: `${price} cr`, act: { label: `Buy ${item.name} · ${price} cr`, run: () => this.buy(id), blocked: s.profile.credits < price ? 'Not enough credits' : undefined } };
    const need = describeReq(item);
    return { mark: 'locked', value: item.req.level ? `LV ${item.req.level}` : '', need, act: { label: `Locked · ${need}`, run: () => undefined, blocked: need } };
  }

  // ------------------------------------------------------------------ details

  private panel(title: string, ...body: (HTMLElement | null)[]): HTMLElement {
    return h('div', { class: 'lo-panel' }, h('div', { class: 'lo-ptitle', text: title }), ...body.filter((x): x is HTMLElement => !!x));
  }

  private note(text: string, cls = ''): HTMLElement {
    return h('div', { class: `lo-note ${cls}`, text });
  }

  /** Segmented bar 0..1 with the change against `base` (green better, red worse). */
  private bar(label: string, v: number, base?: number): HTMLElement {
    const N = 16;
    const on = Math.round(Math.max(0.03, Math.min(1, v)) * N);
    const was = base === undefined ? on : Math.round(Math.max(0.03, Math.min(1, base)) * N);
    const segs: HTMLElement[] = [];
    for (let i = 0; i < N; i++) {
      const cls = i < Math.min(on, was) ? 'on' : i < on ? 'up' : i < was ? 'down' : '';
      segs.push(h('i', { class: cls }));
    }
    return h('div', { class: 'lo-bar' }, h('span', { class: 'lo-bl', text: label }), h('span', { class: 'lo-segs' }, ...segs));
  }

  private line(label: string, now: string, was?: string): HTMLElement {
    const v = h('span', { class: 'lo-lv' });
    if (was !== undefined && was !== now) v.append(h('span', { class: 'was', text: was }), h('span', { class: 'arrow', text: ' ▸ ' }), h('b', { class: 'up', text: now }));
    else v.append(h('b', { text: now }));
    return h('div', { class: 'lo-line' }, h('span', { text: label }), v);
  }

  private static readonly MAX = (() => {
    const all = Object.values(WEAPONS);
    return { dmg: Math.max(...all.map((w) => w.damage * w.pellets)) * 1.15, range: Math.max(...all.map((w) => w.falloffEnd)) };
  })();

  /** Weapon stats Blacklist style: power, accuracy, range, control; magazine, silenced, upgrades. */
  private weaponStats(def: WeaponDef, st: EffectiveStats, base?: EffectiveStats, upgrades?: number): HTMLElement[] {
    const M = LoadoutScreen.MAX;
    const power = (x: EffectiveStats): number => (x.damage * def.pellets) / M.dmg;
    const acc = (x: EffectiveStats): number => 1 - Math.min(1, x.spreadAds / 2.2);
    const ctl = (x: EffectiveStats): number => 1 - Math.min(1, x.recoilPitch / 6);
    const quiet = (x: EffectiveStats): string => (x.noise <= 0.6 ? 'YES' : 'NO');
    return [
      this.bar('POWER', power(st), base && power(base)),
      this.bar('ACCURACY', acc(st), base && acc(base)),
      this.bar('RANGE', def.falloffEnd / M.range),
      this.bar('CONTROL', ctl(st), base && ctl(base)),
      this.line('MAGAZINE SIZE', String(st.magSize), base && String(base.magSize)),
      this.line('SILENCED', quiet(st), base && quiet(base)),
      this.line('FIRE MODE', def.fireMode === 'auto' ? 'AUTO' : 'SEMI'),
      ...(upgrades !== undefined ? [this.line('UPGRADES EQUIPPED', `${upgrades}/${TRACKS.length * MAX_UPGRADE}`)] : []),
    ];
  }

  private savedStats(w: WeaponId): EffectiveStats {
    const wp = this.s().weapons[w];
    return computeStats(WEAPONS[w], wp.upgrades, combinedMods(wp.attachments));
  }

  private upgradeCount(w: WeaponId): number {
    const u = this.s().weapons[w].upgrades;
    return TRACKS.reduce((n, t) => n + u[t], 0);
  }

  private weaponDetail(w: WeaponId, compare?: WeaponId): HTMLElement {
    const def = WEAPONS[w];
    const st = this.savedStats(w);
    const base = compare && compare !== w ? this.savedStats(compare) : undefined;
    const s = this.s();
    const m = weaponMastery(s, w);
    const nextK = MASTERY_KILLS[m];
    const wp = s.weapons[w];
    return h(
      'div',
      {},
      this.panel(def.name.toUpperCase(), ...this.weaponStats(def, st, base, this.upgradeCount(w))),
      this.note(`${def.class.toUpperCase()}${compare && compare !== w ? ` · compared with ${WEAPONS[compare].name}` : ''} · mastery ${m}/5 (${wp.kills} kills${nextK ? `, next ${nextK}` : ''})`),
    );
  }

  // ------------------------------------------------------------------ pages

  private rootPage(): Page {
    return {
      id: 'root',
      crumb: 'GEAR',
      title: 'LOADOUT',
      sub: 'SELECT TO CHANGE',
      framing: 'loadout',
      rows: () => {
        const s = this.s();
        const preset = s.presets[s.preset];
        const gadget = (preset?.gadget ?? 'frag') as GadgetId;
        const hqLv = HQ_IDS.reduce((n, id) => n + s.hq[id], 0);
        const hqMax = HQ_IDS.reduce((n, id) => n + HQ[id].prices.length, 0);
        const wRow = (slot: 'primary' | 'secondary'): Row => ({
          key: slot,
          label: slot === 'primary' ? 'Primary' : 'Secondary',
          value: WEAPONS[s.loadout[slot]].name,
          go: true,
          preview: () => void (this.weapon = s.loadout[slot]),
          detail: () => this.weaponDetail(s.loadout[slot]),
          act: { label: `Change ${slot}`, run: () => this.open(this.weaponsPage(slot)) },
          alt: { label: 'Customize', run: () => this.open(this.customizePage(s.loadout[slot])) },
        });
        const rows: Row[] = [
          { key: 'preset', group: 'KIT', label: 'Loadout', value: preset?.name ?? '', go: true, detail: () => this.presetDetail(s.preset), act: { label: 'Change loadout', run: () => this.open(this.presetsPage()) } },
          wRow('primary'),
          wRow('secondary'),
          { key: 'gadget', label: 'Gadget', value: GADGETS[gadget]?.name ?? '', go: true, detail: () => this.gadgetDetail(gadget), act: { label: 'Change gadget', run: () => this.open(this.gadgetsPage()) } },
          { key: 'suit', group: 'OPERATOR', label: 'Suit', value: SUIT[ 'vest'][s.suit.worn.vest]!.name, go: true, detail: () => this.suitDetail(s.suit.worn), act: { label: 'Open suit', run: () => this.open(this.suitPage()) } },
          { key: 'look', label: 'Appearance', go: true, detail: () => this.panel('APPEARANCE', this.note('Build, head, hair, outfit, headgear, backpack, pattern and colours. Locked parts preview on the operator.')), act: { label: 'Open appearance', run: () => this.open(this.lookPage()) } },
          { key: 'tag', label: 'Tag & emotes', value: s.profile.name, go: true, detail: () => this.panel('TAG & EMOTES', this.note('Callsign, title, emblem and colour; emote slots (View held, J / K / L).')), act: { label: 'Open tag & emotes', run: () => this.open(this.tagPage()) } },
          { key: 'hq', group: 'SBD-NET', label: 'HQ upgrades', value: `${hqLv}/${hqMax}`, go: true, detail: () => this.panel('HQ', this.note('Radar, sonar, Execute capacity, supply drops and field medic training.')), act: { label: 'Open HQ', run: () => this.open(this.hqPage()) } },
          { key: 'challenges', label: 'Challenges', value: `${s.challenges.done.length}/${CHALLENGES.length}`, go: true, detail: () => this.panel('CHALLENGES', this.note('Finish them in any mode for credits and XP.')), act: { label: 'Open challenges', run: () => this.open(this.challengesPage()) } },
        ];
        // (3.5: weapons, attachments, gadget and presets; the suit, appearance, tag, HQ and challenges only with `?legacy=1`)
        return this.eco ? rows : rows.filter((r) => !['suit', 'look', 'tag', 'hq', 'challenges'].includes(r.key));
      },
    };
  }

  private presetDetail(i: number): HTMLElement {
    const p = this.s().presets[i];
    if (!p) return h('div');
    return this.panel(p.name.toUpperCase(), this.line('PRIMARY', WEAPONS[p.primary as WeaponId]?.name ?? p.primary), this.line('SECONDARY', WEAPONS[p.secondary as WeaponId]?.name ?? p.secondary), this.line('GADGET', GADGETS[p.gadget as GadgetId]?.name ?? p.gadget));
  }

  private presetsPage(): Page {
    return {
      id: 'presets',
      crumb: 'LOADOUT',
      title: 'LOADOUTS',
      sub: 'SELECT A LOADOUT',
      framing: 'loadout',
      rows: () => {
        const s = this.s();
        return s.presets.map((p, i) => ({
          key: `preset-${i}`,
          label: p.name,
          value: `${WEAPONS[p.primary as WeaponId]?.name ?? ''}`,
          mark: s.preset === i ? 'equipped' : 'owned',
          preview: () => void (this.weapon = (WEAPONS[p.primary as WeaponId] ? p.primary : s.loadout.primary) as WeaponId),
          detail: () => this.presetDetail(i),
          act: s.preset === i ? undefined : { label: `Use ${p.name}`, run: () => {
            this.save((d) => applyPreset(d, i, this.campaign));
            this.refresh();
          } },
        }));
      },
    };
  }

  private weaponsPage(slot: 'primary' | 'secondary'): Page {
    return {
      id: `slot:${slot}`,
      crumb: slot.toUpperCase(),
      title: `${slot.toUpperCase()} WEAPON`,
      sub: 'SELECT A WEAPON',
      framing: 'weapon',
      rows: () => {
        const s = this.s();
        const cur = s.loadout[slot];
        return WEAPON_ORDER.map((w) => {
          const def = WEAPONS[w];
          const u = this.unlockRow(`weapon:${w}`);
          const owned = u.mark === 'owned';
          const equipped = cur === w;
          const other = s.loadout[slot === 'primary' ? 'secondary' : 'primary'] === w;
          const equip: Action = { label: `Equip ${def.name}`, run: () => {
            this.save((d) => {
              setLoadout(d, slot, w, this.campaign);
              savePreset(d, d.preset);
            });
            this.refresh();
          } };
          return {
            key: `w-${w}`,
            label: def.name,
            value: owned ? (other ? (slot === 'primary' ? 'SECONDARY' : 'PRIMARY') : '') : u.value,
            mark: equipped ? 'equipped' : u.mark,
            tune: owned,
            preview: () => void (this.weapon = w),
            detail: () => {
              const d = this.weaponDetail(w, cur);
              if (!owned) d.append(this.note(u.mark === 'locked' ? `\u{1F512} ${u.need}` : `Buy for ${u.need}`, 'lock'));
              return d;
            },
            act: owned ? (equipped ? { label: 'Customize', run: () => this.open(this.customizePage(w)) } : equip) : u.act && u.mark === 'buyable' ? { ...u.act, run: () => this.buy(`weapon:${w}`, (d) => {
              setLoadout(d, slot, w, this.campaign);
              savePreset(d, d.preset);
            }) } : u.act,
            alt: owned ? { label: 'Customize', run: () => this.open(this.customizePage(w)) } : undefined,
          };
        });
      },
    };
  }

  private customizePage(w: WeaponId): Page {
    const def = WEAPONS[w];
    return {
      id: `w:${w}`,
      crumb: def.name.toUpperCase(),
      title: def.name.toUpperCase(),
      sub: this.eco ? 'EQUIP ATTACHMENTS & UPGRADES' : 'EQUIP ATTACHMENTS',
      framing: 'weapon',
      rows: () => {
        const s = this.s();
        const ownsW = ownsOrOpen(s, `weapon:${w}`, this.campaign);
        const rows: Row[] = [];
        const saved = s.weapons[w].attachments;
        for (const sl of SLOTS) {
          const opts = attachmentsFor(w).filter((a) => a.slot === sl.slot);
          if (!opts.length) continue;
          const on = opts.filter((a) => saved.includes(a.id)).length;
          opts.forEach((a, i) => rows.push(this.attachmentRow(w, a, opts, i === 0 ? `${sl.label.toUpperCase()} [${on}/1]` : undefined, ownsW)));
        }
        if (!this.eco) return rows;
        const lvl = levelInfo(s).level;
        TRACKS.forEach((t, i) => rows.push(this.upgradeRow(w, t, lvl, ownsW, i === 0 ? `UPGRADES [${this.upgradeCount(w)}/${TRACKS.length * MAX_UPGRADE}]` : undefined)));
        const camo = CAMOS.find((c) => c.id === s.weapons[w].camo);
        rows.push({ key: 'camo', group: 'CAMO', label: 'Camo', value: camo?.name ?? '', go: true, detail: () => this.panel('CAMO', this.note(`Mastery camos unlock with kills; others are in the store.`)), act: { label: 'Change camo', run: () => this.open(this.camoPage(w)) } });
        return rows;
      },
    };
  }

  private attachmentRow(w: WeaponId, a: AttachmentDef, slotOpts: AttachmentDef[], group: string | undefined, ownsW: boolean): Row {
    const s = this.s();
    const saved = s.weapons[w].attachments;
    const on = saved.includes(a.id);
    const u = this.unlockRow(`att:${a.id}`);
    const others = slotOpts.map((o) => o.id);
    const withIt = (): string[] => [a.id, ...saved.filter((id) => !others.includes(id))];
    const set = (d: SaveData, v: boolean): void => {
      for (const id of others) setAttachment(d, w, id, false, this.campaign);
      if (v) setAttachment(d, w, a.id, true, this.campaign);
    };
    const act: Action | undefined = !ownsW
      ? { label: 'Unlock the weapon first', run: () => undefined, blocked: 'Unlock the weapon first' }
      : u.mark === 'owned'
        ? on
          ? { label: `Remove ${a.name}`, run: () => {
            this.save((d) => set(d, false));
            this.refresh();
          } }
          : { label: `Equip ${a.name}`, run: () => {
            this.save((d) => set(d, true));
            this.refresh();
          } }
        : u.mark === 'buyable' && u.act
          ? { ...u.act, run: () => this.buy(`att:${a.id}`, (d) => set(d, true)) }
          : u.act;
    return {
      key: `att-${a.id}`,
      group,
      label: a.name,
      value: u.mark === 'owned' ? '' : u.value,
      mark: on ? 'equipped' : u.mark,
      preview: () => void (this.att[w] = on ? saved : withIt()),
      detail: () => {
        const def = WEAPONS[w];
        const wp = this.s().weapons[w];
        const now = computeStats(def, wp.upgrades, combinedMods(on ? saved.filter((id) => id !== a.id) : withIt()));
        const was = this.savedStats(w);
        return h(
          'div',
          {},
          this.panel(a.name.toUpperCase(), this.note(a.desc), ...(u.mark === 'owned' ? [] : [this.note(u.mark === 'locked' ? `\u{1F512} ${u.need}` : `Buy for ${u.need}`, 'lock')])),
          this.panel(`${def.name.toUpperCase()} TOTAL${on ? ' WITHOUT IT' : ''}`, ...this.weaponStats(def, now, was, this.upgradeCount(w))),
        );
      },
      act,
    };
  }

  private upgradeRow(w: WeaponId, t: UpgradeTrack, lvl: number, ownsW: boolean, group: string | undefined): Row {
    const s = this.s();
    const wp = s.weapons[w];
    const n = wp.upgrades[t];
    const c = canUpgrade(w, wp.upgrades, t, lvl, s.profile.credits);
    const value = c.ok ? `${c.cost} cr` : c.reason === 'maxed' ? '' : c.reason === 'level' ? `LV ${c.needLevel}` : `${c.cost} cr`;
    const why = !ownsW ? 'Unlock the weapon first' : c.ok ? undefined : c.reason === 'maxed' ? 'Fully upgraded' : c.reason === 'level' ? `Requires level ${c.needLevel}` : 'Not enough credits';
    return {
      key: `up-${t}`,
      group,
      label: `${TRACK_LABEL[t]}  ${'■'.repeat(n)}${'□'.repeat(MAX_UPGRADE - n)}`,
      value,
      mark: c.ok || (!c.ok && c.reason !== 'maxed') ? (c.ok ? 'buyable' : 'locked') : 'equipped',
      detail: () => {
        const def = WEAPONS[w];
        const was = this.savedStats(w);
        const up = { ...wp.upgrades, [t]: Math.min(MAX_UPGRADE, n + 1) };
        const now = computeStats(def, up, combinedMods(wp.attachments));
        return h('div', {}, this.panel(`${TRACK_LABEL[t].toUpperCase()} ${n}/${MAX_UPGRADE}`, this.note(n >= MAX_UPGRADE ? 'Fully upgraded.' : `Next level: ${value}.`)), this.panel(`${def.name.toUpperCase()} TOTAL`, ...this.weaponStats(def, n >= MAX_UPGRADE ? was : now, was, this.upgradeCount(w))));
      },
      act: !c.ok && c.reason === 'maxed' ? undefined : { label: `Upgrade ${TRACK_LABEL[t]} · ${c.cost} cr`, run: () => {
        this.save((d) => buyUpgrade(d, w, t));
        this.refresh();
      }, blocked: why },
    };
  }

  private camoPage(w: WeaponId): Page {
    return {
      id: `camo:${w}`,
      crumb: 'CAMO',
      title: 'CAMO',
      sub: 'SELECT A CAMO',
      framing: 'weapon',
      rows: () => {
        const s = this.s();
        return CAMOS.map((c) => {
          const id = camoUnlockId(w, c.id);
          const u = this.unlockRow(id);
          const on = s.weapons[w].camo === c.id;
          const equip = (d: SaveData): void => void (d.weapons[w].camo = c.id);
          return {
            key: `camo-${c.id}`,
            label: c.name,
            value: u.mark === 'owned' ? '' : u.value,
            mark: on ? 'equipped' : u.mark,
            preview: () => void (this.camo[w] = c.id),
            detail: () => this.panel(c.name.toUpperCase(), u.mark === 'owned' ? this.note(on ? 'Equipped.' : 'Owned.') : this.note(u.mark === 'locked' ? `\u{1F512} ${u.need}` : `Buy for ${u.need}`, 'lock')),
            act: u.mark === 'owned' ? (on ? undefined : { label: `Equip ${c.name}`, run: () => {
              this.save(equip);
              this.refresh();
            } }) : u.mark === 'buyable' && u.act ? { ...u.act, run: () => this.buy(id, equip) } : u.act,
          };
        });
      },
    };
  }

  private gadgetDetail(g: GadgetId): HTMLElement {
    const d = GADGETS[g];
    return this.panel(d.name.toUpperCase(), this.note(GADGET_DESC[g] ?? ''), this.line('CARRIED', String(d.carry)), this.line('MAXIMUM', String(d.max)), this.line('LETHAL', d.lethal ? 'YES' : 'NO'));
  }

  private gadgetsPage(): Page {
    return {
      id: 'gadgets',
      crumb: 'GADGET',
      title: 'GADGET',
      sub: 'SELECT A GADGET',
      framing: 'loadout',
      rows: () => {
        const s = this.s();
        const cur = s.presets[s.preset]?.gadget;
        return GADGET_IDS.map((g) => ({
          key: `g-${g}`,
          label: GADGETS[g].name,
          mark: cur === g ? 'equipped' : 'owned',
          detail: () => this.gadgetDetail(g),
          act: cur === g ? undefined : { label: `Equip ${GADGETS[g].name}`, run: () => {
            this.save((d) => void (d.presets[d.preset]!.gadget = g));
            this.refresh();
          } },
        }));
      },
    };
  }

  // ------------------------------------------------------------------ suit

  private suitDetail(s: SuitLoadout, was?: SuitLoadout): HTMLElement {
    const st = suitStats(s);
    const b = was ? suitStats(was) : undefined;
    return this.panel(
      'OPS SUIT TOTAL',
      this.bar('ARMOR', 1 - st.damage, b && 1 - b.damage),
      this.bar('STEALTH', 1 - (st.noise - 0.6), b && 1 - (b.noise - 0.6)),
      this.bar('HANDLING', 1 - (st.hands - 0.7) * 2, b && 1 - (b.hands - 0.7) * 2),
      this.bar('SONAR', (st.sonarRange - 0.8) / 0.8, b && (b.sonarRange - 0.8) / 0.8),
      this.line('EXTRA GADGETS', String(st.gadgets), b && String(b.gadgets)),
    );
  }

  private suitPage(): Page {
    return {
      id: 'suit',
      crumb: 'SUIT',
      title: 'OPS SUIT',
      sub: 'SELECT A PART',
      framing: 'loadout',
      rows: () => {
        const s = this.s();
        return SUIT_PIECES.map((p) => ({
          key: `piece-${p}`,
          label: PIECE_LABEL[p],
          value: SUIT[p][s.suit.worn[p]]!.name,
          go: true,
          detail: () => this.suitDetail(s.suit.worn),
          act: { label: `Open ${PIECE_LABEL[p].toLowerCase()}`, run: () => this.open(this.piecePage(p)) },
        }));
      },
    };
  }

  private piecePage(piece: SuitPiece): Page {
    return {
      id: `piece:${piece}`,
      crumb: PIECE_LABEL[piece].toUpperCase(),
      title: PIECE_LABEL[piece].toUpperCase(),
      sub: `SELECT ${PIECE_LABEL[piece].toUpperCase()} PART TO EQUIP`,
      framing: 'loadout',
      rows: () => {
        const s = this.s();
        const lvl = levelInfo(s).level;
        return SUIT[piece].map((t, i) => {
          const owned = s.suit.owned[piece] >= i;
          const on = s.suit.worn[piece] === i;
          const c = canBuySuit(s.suit.owned, piece, i, lvl, s.profile.credits);
          const next = i === s.suit.owned[piece] + 1;
          const mark: Mark = on ? 'equipped' : owned ? 'owned' : next && (c.ok || c.reason === 'credits') ? 'buyable' : 'locked';
          const need = !next ? 'Buy the tiers before it' : !c.ok && c.reason === 'level' ? `Level ${t.level}` : `${t.price} cr`;
          return {
            key: `tier-${i}`,
            label: t.name,
            value: owned ? '' : mark === 'buyable' ? `${t.price} cr` : `LV ${t.level}`,
            mark,
            preview: () => void (this.suit = { ...this.s().suit.worn, [piece]: i }),
            detail: () => h('div', {}, this.panel(t.name.toUpperCase(), this.note(t.desc), ...(owned ? [] : [this.note(mark === 'locked' ? `\u{1F512} ${need}` : `Buy for ${t.price} cr`, 'lock')])), this.suitDetail({ ...this.s().suit.worn, [piece]: i }, this.s().suit.worn)),
            act: owned
              ? on ? undefined : { label: `Equip ${t.name}`, run: () => {
                this.save((d) => wearSuit(d, piece, i));
                this.refresh();
              } }
              : { label: `Buy ${t.name} · ${t.price} cr`, blocked: c.ok ? undefined : c.reason === 'credits' ? 'Not enough credits' : need, run: () => {
                this.save((d) => {
                  if (buySuit(d, piece, i).ok) wearSuit(d, piece, i);
                });
                this.app.toasts.show(`${t.name} bought`, 'ok');
                this.refresh();
              } },
          };
        });
      },
    };
  }

  // ------------------------------------------------------------------ appearance

  private lookPage(): Page {
    return {
      id: 'look',
      crumb: 'APPEARANCE',
      title: 'APPEARANCE',
      sub: 'SELECT A PART',
      framing: 'loadout',
      rows: () => {
        const s = this.s();
        const rows: Row[] = PARTS.map((cat) => ({
          key: `part-${cat}`,
          label: PART_LABEL[cat],
          value: PART_OPTIONS[cat].find((o) => o.value === s.avatar[LOOK_FIELD[cat]])?.name ?? '',
          go: true,
          detail: () => this.panel(PART_LABEL[cat].toUpperCase(), this.note(`${PART_OPTIONS[cat].filter((o) => owns(s, partUnlockId(cat, o.value))).length} of ${PART_OPTIONS[cat].length} owned.`)),
          act: { label: `Open ${PART_LABEL[cat].toLowerCase()}`, run: () => this.open(this.partPage(cat)) },
        }));
        rows.push({ key: 'colours', label: 'Colours', go: true, detail: () => this.panel('COLOURS', this.note('Skin, hair, outfit, accent, trousers, boots, headgear, backpack and pattern.')), act: { label: 'Open colours', run: () => this.open(this.coloursPage()) } });
        return rows;
      },
    };
  }

  private partPage(cat: PartCategory): Page {
    const f = LOOK_FIELD[cat];
    return {
      id: `part:${cat}`,
      crumb: PART_LABEL[cat].toUpperCase(),
      title: PART_LABEL[cat].toUpperCase(),
      sub: `SELECT ${PART_LABEL[cat].toUpperCase()}`,
      framing: 'loadout',
      rows: () => {
        const s = this.s();
        return PART_OPTIONS[cat].map((o) => {
          const id = partUnlockId(cat, o.value);
          const u = this.unlockRow(id);
          const on = s.avatar[f] === o.value;
          const wear = (d: SaveData): void => void (d.avatar = sanitizeLook({ ...d.avatar, [f]: o.value }));
          return {
            key: `opt-${o.value}`,
            label: o.name,
            value: u.mark === 'owned' ? '' : u.value,
            mark: on ? 'equipped' : u.mark,
            preview: () => void ((this.look as unknown as Record<string, unknown>)[f] = o.value),
            detail: () => this.panel(o.name.toUpperCase(), u.mark === 'owned' ? this.note(on ? 'Equipped.' : 'Owned.') : this.note(u.mark === 'locked' ? `\u{1F512} ${u.need}` : `Buy for ${u.need}`, 'lock')),
            act: u.mark === 'owned' ? (on ? undefined : { label: `Equip ${o.name}`, run: () => {
              this.save(wear);
              this.refresh();
            } }) : u.mark === 'buyable' && u.act ? { ...u.act, run: () => this.buy(id, wear) } : u.act,
          };
        });
      },
    };
  }

  private coloursPage(): Page {
    return {
      id: 'colours',
      crumb: 'COLOURS',
      title: 'COLOURS',
      sub: 'TAP A COLOUR',
      framing: 'loadout',
      rows: () => [],
      body: () => {
        const sw = (label: string, palette: readonly string[], key: keyof AvatarColors): HTMLElement => {
          const row = h('div', { class: 'swatch-row', attrs: { 'data-wrap': '' } });
          for (const c of palette) {
            const b = h('button', { class: `swatch${this.s().avatar.colors[key] === c ? ' sel' : ''}`, focus: true, style: { background: c }, attrs: { 'aria-label': `${label} ${c}` } });
            b.dataset.key = `sw-${key}-${c}`;
            b.addEventListener('click', () => {
              this.save((d) => void (d.avatar = sanitizeLook({ ...d.avatar, colors: { ...d.avatar.colors, [key]: c } })));
              this.refresh();
            });
            row.append(b);
          }
          return h('div', { class: 'swatch-field' }, h('span', { class: 'swatch-label', text: label }), row);
        };
        return h(
          'div',
          { class: 'lo-form' },
          sw('Skin', SKIN_TONES, 'skin'),
          sw('Hair', PALETTE_COLORS, 'hair'),
          sw('Outfit', PALETTE_COLORS, 'torso'),
          sw('Accent', PALETTE_COLORS, 'accent'),
          sw('Trousers', PALETTE_COLORS, 'legs'),
          sw('Boots', PALETTE_COLORS, 'boots'),
          sw('Headgear', PALETTE_COLORS, 'helmet'),
          sw('Backpack', PALETTE_COLORS, 'backpack'),
          sw('Pattern', PALETTE_COLORS, 'pattern'),
        );
      },
    };
  }

  // ------------------------------------------------------------------ tag & emotes

  private tagPage(): Page {
    return {
      id: 'tag',
      crumb: 'TAG',
      title: 'TAG & EMOTES',
      sub: 'CALLSIGN, TITLE, EMOTES',
      framing: 'loadout',
      rows: () => [],
      body: () => this.tagForm(),
    };
  }

  private tagForm(): HTMLElement {
    const s = this.s();
    const name = h('input', { class: 'text-input', attrs: { type: 'text', maxlength: '16', value: s.profile.name, 'aria-label': 'Callsign' } }) as HTMLInputElement;
    name.addEventListener('change', () => this.save((d) => void (d.profile.name = name.value.trim() || d.profile.name)));
    const random = button('Random', () => {
      const n = `${ADJ[Math.floor(Math.random() * ADJ.length)]}${NOUN[Math.floor(Math.random() * NOUN.length)]}${Math.floor(Math.random() * 90 + 10)}`;
      name.value = n;
      this.save((d) => void (d.profile.name = n));
      this.renderTag();
    }, { class: 'small' });
    const title = choice('Title', TAGS.map((t) => ({ value: t.id, label: `${owns(s, `tag:${t.id}`) ? '' : '\u{1F512} '}${t.id}` })), () => this.s().profile.tag.title, (v) => {
      if (owns(this.s(), `tag:${v}`)) this.save((d) => void (d.profile.tag.title = v));
      else {
        const item = unlockById(`tag:${v}`)!;
        if (unlockState(item, unlockContext(this.s())) === 'buyable') this.buy(`tag:${v}`, (d) => void (d.profile.tag.title = v));
        else this.app.toasts.show(`\u{1F512} ${describeReq(item)}`, 'warn');
      }
      this.renderTag();
    });
    title.dataset.key = 'title';
    const emblem = choice('Emblem', EMBLEMS.filter((e) => owns(s, `emblem:${e.id}`)).map((e) => ({ value: e.id, label: e.id[0]!.toUpperCase() + e.id.slice(1) })), () => this.s().profile.tag.emblem, (v) => {
      this.save((d) => void (d.profile.tag.emblem = v));
      this.renderTag();
    });
    emblem.dataset.key = 'emblem';
    const colors = h('div', { class: 'swatch-row', attrs: { 'data-wrap': '' } });
    for (const c of PALETTE_COLORS) {
      const sw = h('button', { class: 'swatch', focus: true, style: { background: c } });
      sw.addEventListener('click', () => {
        this.save((d) => void (d.profile.tag.color = c));
        this.renderTag();
      });
      colors.append(sw);
    }
    // emotes: four slots; picking one plays it on the operator
    const owned = EMOTES.filter((e) => owns(s, `emote:${e.id}`));
    const opts = [{ value: '', label: 'Empty' }, ...owned.map((e) => ({ value: e.id, label: e.name }))];
    // (3.2.0: the d-pad is the speed gear, gadget and wheel; slot 1 is View held, every slot has a key)
    const slots = ['View hold · J', 'K', 'L', 'Menu only'];
    const emoteRows = slots.map((label, i) => {
      const c = choice(`${i + 1} · ${label}`, opts, () => this.s().emotes[i] ?? '', (v) => {
        this.save((d) => void (d.emotes[i] = v));
        if (v) this.menu()?.emote(v);
      });
      c.dataset.key = `emote-${i}`;
      return c;
    });
    const tryOut = h('div', { class: 'emote-grid', attrs: { 'data-wrap': '' } });
    for (const e of EMOTES) {
      const has = owns(s, `emote:${e.id}`);
      const u = has ? null : this.unlockRow(`emote:${e.id}`);
      const b = button(`${has ? '' : '\u{1F512} '}${e.name}${u && u.mark === 'buyable' ? ` · ${u.value}` : ''}`, () => {
        this.menu()?.emote(e.id);
        if (u?.mark === 'buyable') this.buy(`emote:${e.id}`);
      }, { class: 'small' });
      b.dataset.key = `try-${e.id}`;
      tryOut.append(b);
    }
    this.tagPreview = h('div', { class: 'tag-preview' });
    this.renderTag();
    return h(
      'div',
      { class: 'lo-form' },
      this.tagPreview,
      h('div', { class: 'row' }, h('span', { class: 'row-label', text: 'Callsign' }), h('span', { class: 'row-right' }, name, random)),
      title,
      emblem,
      h('div', { class: 'swatch-field' }, h('span', { class: 'swatch-label', text: 'Colour' }), colors),
      h('div', { class: 'lo-group', text: 'EMOTE SLOTS' }),
      ...emoteRows,
      h('div', { class: 'lo-group', text: 'TRY AN EMOTE' }),
      tryOut,
    );
  }

  private tagPreview: HTMLElement | null = null;

  private renderTag(): void {
    const p = this.s().profile;
    if (this.tagPreview) this.tagPreview.innerHTML = `${emblemSvg(p.tag.emblem, 26, p.tag.color)}<b>${p.name.replace(/[<>&]/g, '')}</b><span style="color:${p.tag.color}">${p.tag.title}</span>`;
    this.detailEl.replaceChildren(this.panel('TAG', this.note(`${p.name} · ${p.tag.title}`)));
  }

  // ------------------------------------------------------------------ HQ and challenges

  private hqPage(): Page {
    return {
      id: 'hq',
      crumb: 'HQ',
      title: 'HQ UPGRADES',
      sub: 'SELECT AN UPGRADE',
      framing: 'loadout',
      rows: () => {
        const s = this.s();
        const lvl = levelInfo(s).level;
        return HQ_IDS.map((id: HqId) => {
          const d = HQ[id];
          const cur = s.hq[id];
          const c = canBuyHq(s.hq, id, lvl, s.profile.credits);
          const maxed = !c.ok && c.reason === 'maxed';
          return {
            key: `hq-${id}`,
            label: `${d.name}  ${'■'.repeat(cur)}${'□'.repeat(d.prices.length - cur)}`,
            value: maxed ? '' : c.ok || c.reason === 'credits' ? `${c.price} cr` : `LV ${c.level}`,
            mark: maxed ? 'equipped' : c.ok ? 'buyable' : 'locked',
            detail: () => this.panel(d.name.toUpperCase(), this.note(d.desc), this.line('LEVEL', `${cur}/${d.prices.length}`)),
            act: maxed ? undefined : { label: `Upgrade ${d.name} · ${c.price} cr`, blocked: c.ok ? undefined : c.reason === 'credits' ? 'Not enough credits' : `Requires level ${c.level}`, run: () => {
              this.save((dd) => buyHq(dd, id));
              this.app.toasts.show(`${d.name} upgraded`, 'ok');
              this.refresh();
            } },
          };
        });
      },
    };
  }

  private challengesPage(): Page {
    return {
      id: 'challenges',
      crumb: 'CHALLENGES',
      title: 'CHALLENGES',
      sub: 'FINISH THEM IN ANY MODE',
      framing: 'loadout',
      rows: () => {
        const s = this.s();
        return CHALLENGES.map((c) => {
          const done = s.challenges.done.includes(c.id);
          const p = Math.min(c.goal, s.challenges.progress[c.id] ?? 0);
          return {
            key: `ch-${c.id}`,
            label: c.name,
            value: done ? '' : `${p}/${c.goal}`,
            mark: done ? 'equipped' : 'owned',
            detail: () => this.panel(c.name.toUpperCase(), this.bar('PROGRESS', p / c.goal), this.line('REWARD', `${c.credits} cr · ${c.xp} XP`), this.line('STATUS', done ? 'DONE' : `${c.goal - p} TO GO`)),
          };
        });
      },
    };
  }

  // ------------------------------------------------------------------ screen

  override onShow(): void {
    this.app.input.state.consumeLook();
    this.refresh();
  }

  override onHide(): void {
    this.unsub?.();
    this.unsub = null;
    this.menu()?.setFraming('menu');
    showSavedOperator(this.app);
  }

  override update(): void {
    const look = this.app.input.state.consumeLook();
    const m = this.menu();
    if (m && look.x) m.previewYaw += look.x * 1.5;
  }

  override onAlt(): void {
    const r = this.focusKey ? this.rows.get(this.focusKey) : undefined;
    this.run(r?.alt);
  }

  override initialFocus(): HTMLElement | null {
    return this.listEl.querySelector<HTMLElement>('[data-focus]');
  }

  override hints(): Hint[] {
    return [];
  }
}
