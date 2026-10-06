import type { App } from '../../core/app';
import type { SaveData } from '../../save/schema';
import { MenuState } from '../../world/menuScene';
import { WEAPONS, type WeaponId } from '../../weapons/weaponDefs';
import { computeStats, MAX_UPGRADE } from '../../weapons/weaponStats';
import { applyPreset, buyHq, buySuit, buyUnlock, buyUpgrade, levelInfo, owns, savePreset, setAttachment, setLoadout, unlockContext, wearSuit, weaponMastery } from '../../progression/profile';
import { canUpgrade, TRACKS, TRACK_LABEL } from '../../progression/upgrades';
import { attachmentsFor, combinedMods, type AttachmentSlot } from '../../progression/attachments';
import { describeReq, unlockById, unlockState } from '../../progression/unlocks';
import { MASTERY_KILLS } from '../../progression/levels';
import { canBuyHq, canBuySuit, CHALLENGES, HQ, HQ_IDS, SUIT, SUIT_PIECES, suitLook, type SuitLoadout, type SuitPiece } from '../../progression/suit';
import { GADGETS, GADGET_IDS, type GadgetId } from '../../game/gadgets';
import { PALETTE_COLORS, SKIN_TONES, sanitizeLook, type AvatarColors, type AvatarLook } from '../../cosmetics/avatarLook';
import { CAMOS, camoUnlockId, EMBLEMS, EMOTES, emblemSvg, LOOK_FIELD, PART_OPTIONS, partUnlockId, TAGS, type PartCategory } from '../../cosmetics/catalog';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice, section, TabView, type TabDef } from '../widgets';
import { statBars } from '../hud/statBars';
import { showSavedOperator } from './operator';

/** Weapon order in the picker. */
export const WEAPON_ORDER: WeaponId[] = ['rifle', 'smg', 'shotgun', 'sniper', 'pistol', 'ak', 'tavor', 'lmg', 'vector', 'p90', 'semiShotgun', 'breacher', 'dmr', 'crossbow', 'fiveseven', 'pistolSd'];

const SLOTS: { slot: AttachmentSlot; label: string }[] = [
  { slot: 'optic', label: 'Optic' },
  { slot: 'barrel', label: 'Barrel' },
  { slot: 'underbarrel', label: 'Underbarrel' },
  { slot: 'magazine', label: 'Magazine' },
];
const PIECE_LABEL: Record<SuitPiece, string> = { vest: 'Vest', gloves: 'Gloves', boots: 'Boots', goggles: 'Goggles', pouches: 'Pouches' };
const TAB_IDS = ['weapons', 'gear', 'look', 'tag', 'hq'] as const;
const LOCK = '\u{1F512} ';
const ADJ = ['Iron', 'Silent', 'Rapid', 'Lucky', 'Crimson', 'Frost', 'Shadow', 'Copper', 'Night', 'Wild', 'Steel', 'Dust'];
const NOUN = ['Fox', 'Viper', 'Hawk', 'Bear', 'Wolf', 'Raven', 'Comet', 'Badger', 'Lynx', 'Otter', 'Mantis', 'Rhino'];

/**
 * Loadout: the one place to equip, upgrade and customise (it replaces the Armory, HQ, Customise and Store).
 * Categories on the left, the operator in the middle, options on the right. Every change shows on the operator at
 * once - locked items too, as a preview with their price or requirement beside them (buy in place); owned
 * choices save immediately, previews are dropped on leaving.
 */
export class LoadoutScreen extends Screen {
  private tabs: TabView;
  private s(): SaveData {
    return this.app.save.get();
  }
  /** The weapon being looked at (the operator holds it). */
  private weapon: WeaponId;
  /** Drafts: the look (locked parts too), suit tiers, and per-weapon camo / attachments being previewed. */
  private look: AvatarLook;
  private suit: SuitLoadout;
  private camo: Partial<Record<WeaponId, string>> = {};
  private att: Partial<Record<WeaponId, string[]>> = {};
  private dragX: number | null = null;
  private unsubs: (() => void)[] = [];

  constructor(private app: App) {
    super('loadout-screen');
    const s = this.s();
    this.weapon = s.loadout.primary;
    this.look = structuredClone(s.avatar);
    this.suit = { ...s.suit.worn };
    const tabs: TabDef[] = [
      { id: 'weapons', label: 'Weapons', icon: 'gun', build: () => this.weaponsTab() },
      { id: 'gear', label: 'Gear', icon: 'vest', build: () => this.gearTab() },
      { id: 'look', label: 'Appearance', icon: 'shirt', build: () => this.lookTab() },
      { id: 'tag', label: 'Tag & Emotes', icon: 'tag', build: () => this.tagTab() },
      { id: 'hq', label: 'HQ', icon: 'hq', build: () => this.hqTab() },
    ];
    this.tabs = new TabView(tabs, { side: true });
    this.tabs.onChange = () => {
      this.framing();
      app.nav.refresh();
    };
    // the operator stands between the categories and the options; drag (or the right stick) turns them
    const stage = h('div', { class: 'loadout-stage' }, h('div', { class: 'stage-hint', text: 'Drag to rotate' }));
    stage.addEventListener('pointerdown', (e) => {
      this.dragX = e.clientX;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      const m = this.menu();
      if (this.dragX === null || !m) return;
      m.previewYaw -= (e.clientX - this.dragX) * 0.012;
      this.dragX = e.clientX;
    });
    const end = (): void => void (this.dragX = null);
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    this.tabs.body.classList.add('loadout-panel');
    this.el.append(
      h('div', { class: 'screen-head slim' }, h('div', { class: 'screen-title', text: 'Loadout' }), this.wallet()),
      h('div', { class: 'loadout-main' }, this.tabs.strip, stage, this.tabs.body),
    );
  }

  /** Level and credits, kept current. */
  private wallet(): HTMLElement {
    const el = h('div', { class: 'wallet' });
    const render = (): void => {
      const s = this.s();
      el.innerHTML = `<span>LV ${levelInfo(s).level}</span><b class="credits">${s.profile.credits} cr</b>`;
    };
    render();
    this.unsubs.push(this.app.save.subscribe(render));
    return el;
  }

  private menu(): MenuState | null {
    const m = this.app.current;
    return m instanceof MenuState ? m : null;
  }

  // ------------------------------------------------------------------ preview

  private camoOf(w: WeaponId): string {
    return this.camo[w] ?? this.s().weapons[w].camo;
  }

  private attOf(w: WeaponId): string[] {
    return this.att[w] ?? this.s().weapons[w].attachments;
  }

  /** Show the drafts on the operator (free when nothing changed). */
  private preview(): void {
    this.menu()?.setAvatar(suitLook(this.look, this.suit), this.weapon, this.camoOf(this.weapon), this.attOf(this.weapon));
  }

  private framing(): void {
    this.menu()?.setFraming(TAB_IDS[this.tabs.index] === 'weapons' ? 'weapon' : 'loadout');
  }

  /** Re-render the open category keeping the focused control, then refresh the preview. */
  private refresh(): void {
    const key = this.app.nav.focused?.dataset.key;
    this.tabs.rebuild(TAB_IDS[this.tabs.index]!);
    const el = key ? this.el.querySelector<HTMLElement>(`[data-key="${key}"]`) : null;
    this.app.nav.setRoot(this.el, el ?? this.initialFocus());
    this.preview();
  }

  private save(fn: (d: SaveData) => unknown): void {
    this.app.save.update((d) => void fn(d));
  }

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
    if (ok) this.commitLook();
    this.refresh();
  }

  /** The lock line under a previewed item: its requirement, and a buy button when it can be bought now. */
  private lockLine(id: string, after?: (d: SaveData) => void): HTMLElement | null {
    const item = unlockById(id);
    if (!item) return null;
    const s = this.s();
    const st = unlockState(item, unlockContext(s));
    if (st === 'owned') return null;
    const line = h('div', { class: 'lock-line' }, h('span', { text: `${LOCK}${item.name} · ${st === 'locked' ? describeReq(item) : 'preview'}` }));
    if (st === 'buyable' || st === 'free') {
      const price = item.req.price ?? 0;
      const b = button(st === 'free' ? 'Claim' : `Buy · ${price} cr`, () => this.buy(id, after), {
        class: 'small primary',
        blocked: s.profile.credits < price ? 'Not enough credits' : undefined,
      });
      b.dataset.key = `buy-${id}`;
      line.append(b);
    }
    return line;
  }

  private keyed<T extends HTMLElement>(el: T, key: string): T {
    el.dataset.key = key;
    return el;
  }

  // ------------------------------------------------------------------ weapons

  private weaponsTab(): HTMLElement {
    const s = this.s();
    const w = this.weapon;
    const def = WEAPONS[w];
    const wp = s.weapons[w];
    const ownsW = owns(s, `weapon:${w}`);
    const rows = h('div', { class: 'rows' });

    // the loadout: preset, gadget, the weapon being viewed
    const preset = this.keyed(
      choice('Preset', s.presets.map((p, i) => ({ value: i, label: p.name })), () => this.s().preset, (i) => {
        this.save((d) => applyPreset(d, i));
        this.weapon = this.s().loadout.primary;
        this.refresh();
      }),
      'preset',
    );
    const gadget = this.keyed(
      choice('Gadget', GADGET_IDS.map((g) => ({ value: g, label: GADGETS[g].name })), () => {
        const g = this.s().presets[this.s().preset]?.gadget;
        return GADGET_IDS.includes(g as GadgetId) ? (g as GadgetId) : 'frag';
      }, (v) => this.save((d) => void (d.presets[d.preset]!.gadget = v))),
      'gadget',
    );
    const pick = this.keyed(
      choice('Weapon', WEAPON_ORDER.map((id) => ({ value: id, label: `${owns(s, `weapon:${id}`) ? '' : LOCK}${WEAPONS[id].name}${s.loadout.primary === id ? '  ·  P' : s.loadout.secondary === id ? '  ·  S' : ''}` })), () => this.weapon, (v) => {
        this.weapon = v;
        this.refresh();
      }),
      'weapon',
    );
    pick.dataset.autofocus = '';
    rows.append(section('Loadout', preset, gadget, pick));

    // equip / unlock
    const head = h('div', { class: 'weapon-head' }, h('div', { class: 'w-title', text: def.name }), h('div', { class: 'row-note', text: `${def.class.toUpperCase()} · ${def.fireMode === 'auto' ? 'Automatic' : 'Semi-auto'}` }));
    const acts = h('div', { class: 'weapon-actions' });
    if (ownsW) {
      const eq = (slot: 'primary' | 'secondary', label: string): HTMLElement =>
        this.keyed(
          button(s.loadout[slot] === w ? `${label} ✓` : `Equip ${label.toLowerCase()}`, () => {
            this.save((d) => {
              setLoadout(d, slot, w);
              savePreset(d, d.preset);
            });
            this.refresh();
          }, { class: s.loadout[slot] === w ? 'small owned' : 'small primary' }),
          `eq-${slot}`,
        );
      acts.append(eq('primary', 'Primary'), eq('secondary', 'Secondary'));
    } else {
      const line = this.lockLine(`weapon:${w}`);
      if (line) acts.append(line);
    }
    rows.append(h('div', { class: 'weapon-card' }, head, acts));

    // stats with the previewed attachments
    const att = this.attOf(w);
    rows.append(section('Stats', statBars(def, computeStats(def, wp.upgrades, combinedMods(att)), computeStats(def))));

    // upgrades
    const lvl = levelInfo(s).level;
    const ups = section('Upgrades');
    for (const t of TRACKS) {
      const n = wp.upgrades[t];
      const c = canUpgrade(w, wp.upgrades, t, lvl, s.profile.credits);
      const label = !ownsW ? 'Locked' : c.ok ? `${c.cost} cr` : c.reason === 'maxed' ? 'Max' : c.reason === 'level' ? `Lv ${c.needLevel}` : `${c.cost} cr`;
      const why = !ownsW ? 'Unlock the weapon first' : c.ok ? undefined : c.reason === 'maxed' ? 'Fully upgraded' : c.reason === 'level' ? `Requires level ${c.needLevel}` : 'Not enough credits';
      const b = this.keyed(button(label, () => {
        this.save((d) => buyUpgrade(d, w, t));
        this.refresh();
      }, { class: 'small', blocked: why }), `up-${t}`);
      ups.append(h('div', { class: 'row upgrade-row' }, h('span', { class: 'row-label', text: TRACK_LABEL[t] }), h('span', { class: 'row-right' }, h('span', { class: 'pips' }, ...Array.from({ length: MAX_UPGRADE }, (_, i) => h('i', { class: i < n ? 'on' : '' }))), b)));
    }
    rows.append(ups);

    // attachments: every option (locked ones preview), the lock line under a previewed one
    const atts = section('Attachments');
    for (const sl of SLOTS) {
      const opts = attachmentsFor(w).filter((a) => a.slot === sl.slot);
      if (!opts.length) continue;
      const cur = att.find((id) => opts.some((o) => o.id === id)) ?? '';
      const ch = this.keyed(
        choice(sl.label, [{ value: '', label: 'None' }, ...opts.map((a) => ({ value: a.id, label: `${owns(s, `att:${a.id}`) ? '' : LOCK}${a.name}` }))], () => cur, (v) => this.setAtt(w, opts.map((o) => o.id), v)),
        `att-${sl.slot}`,
      );
      atts.append(ch);
      if (cur) {
        const a = opts.find((o) => o.id === cur)!;
        const line = this.lockLine(`att:${cur}`, (d) => setAttachment(d, w, cur, true));
        atts.append(line ?? h('div', { class: 'row-note', text: a.desc }));
      }
    }
    rows.append(atts);

    // camo: every camo (locked ones preview)
    const camo = this.camoOf(w);
    const camoCh = this.keyed(
      choice('Camo', CAMOS.map((c) => ({ value: c.id, label: `${owns(s, camoUnlockId(w, c.id)) ? '' : LOCK}${c.name}` })), () => this.camoOf(w), (v) => {
        if (owns(this.s(), camoUnlockId(w, v))) {
          delete this.camo[w];
          this.save((d) => void (d.weapons[w].camo = v));
        } else this.camo[w] = v;
        this.refresh();
      }),
      'camo',
    );
    const camoLine = this.lockLine(camoUnlockId(w, camo), (d) => void (d.weapons[w].camo = camo));
    const m = weaponMastery(s, w);
    const nextK = MASTERY_KILLS[m];
    rows.append(section('Camo', camoCh, ...(camoLine ? [camoLine] : []), h('div', { class: 'row-note', text: `Mastery ${m}/5 · ${wp.kills} kills${nextK ? ` · next at ${nextK}` : ' · mastered'}` })));
    return rows;
  }

  /** Pick an attachment for a slot (owned: saved; locked: previewed). */
  private setAtt(w: WeaponId, slotIds: string[], v: string): void {
    const cur = this.attOf(w).filter((id) => !slotIds.includes(id));
    const next = v ? [v, ...cur] : cur;
    const s = this.s();
    if (!v || owns(s, `att:${v}`)) {
      this.save((d) => {
        for (const id of slotIds) setAttachment(d, w, id, false);
        if (v) setAttachment(d, w, v, true);
      });
    }
    // the draft keeps a locked pick on show; owned picks match the save
    if (next.every((id) => owns(s, `att:${id}`))) delete this.att[w];
    else this.att[w] = next;
    this.refresh();
  }

  // ------------------------------------------------------------------ gear (suit)

  private gearTab(): HTMLElement {
    const s = this.s();
    const lvl = levelInfo(s).level;
    const rows = h('div', { class: 'rows' });
    for (const piece of SUIT_PIECES) {
      const tiers = SUIT[piece];
      const ch = this.keyed(
        choice(PIECE_LABEL[piece], tiers.map((t, i) => ({ value: i, label: `${s.suit.owned[piece] >= i ? '' : LOCK}${t.name}` })), () => this.suit[piece], (i) => {
          this.suit[piece] = i;
          if (this.s().suit.owned[piece] >= i) this.save((d) => wearSuit(d, piece, i));
          this.refresh();
        }),
        `suit-${piece}`,
      );
      const i = this.suit[piece];
      const t = tiers[i]!;
      const sec = h('div', { class: 'section' }, ch);
      if (s.suit.owned[piece] >= i) sec.append(h('div', { class: 'row-note', text: t.desc }));
      else {
        const c = canBuySuit(s.suit.owned, piece, i, lvl, s.profile.credits);
        const line = h('div', { class: 'lock-line' }, h('span', { text: `${LOCK}${t.desc} · ${i > s.suit.owned[piece] + 1 ? 'buy the tiers before it' : !c.ok && c.reason === 'level' ? `Level ${t.level}` : 'preview'}` }));
        if (c.ok || (c.reason === 'credits' && i === s.suit.owned[piece] + 1)) {
          line.append(this.keyed(button(`Buy · ${t.price} cr`, () => {
            this.save((d) => buySuit(d, piece, i));
            this.app.toasts.show(`${t.name} bought`, 'ok');
            this.refresh();
          }, { class: 'small primary', blocked: c.ok ? undefined : 'Not enough credits' }), `buy-${piece}`));
        }
        sec.append(line);
      }
      rows.append(sec);
    }
    return rows;
  }

  // ------------------------------------------------------------------ appearance

  /** Locked parts are previewed; owned ones save at once. */
  private commitLook(): void {
    const s = this.s();
    const toSave = structuredClone(this.look);
    for (const cat of Object.keys(PART_OPTIONS) as PartCategory[]) {
      const f = LOOK_FIELD[cat];
      if (!owns(s, partUnlockId(cat, this.look[f] as string))) (toSave as unknown as Record<string, unknown>)[f] = s.avatar[f];
    }
    this.save((d) => void (d.avatar = sanitizeLook(toSave)));
  }

  private lookTab(): HTMLElement {
    const s = this.s();
    const part = (cat: PartCategory, label: string): HTMLElement[] => {
      const f = LOOK_FIELD[cat];
      const ch = this.keyed(
        choice(label, PART_OPTIONS[cat].map((o) => ({ value: o.value, label: `${owns(s, partUnlockId(cat, o.value)) ? '' : LOCK}${o.name}` })), () => this.look[f] as string, (v) => {
          (this.look as unknown as Record<string, unknown>)[f] = v;
          this.commitLook();
          this.refresh();
        }),
        `part-${cat}`,
      );
      const line = this.lockLine(partUnlockId(cat, this.look[f] as string));
      return line ? [ch, line] : [ch];
    };
    return h(
      'div',
      { class: 'rows' },
      section('Body', ...part('body', 'Build'), ...part('head', 'Head'), ...part('hair', 'Hair'), this.swatches('Skin', SKIN_TONES, 'skin'), this.swatches('Hair colour', PALETTE_COLORS, 'hair')),
      section('Outfit', ...part('torso', 'Torso'), ...part('legs', 'Legs'), this.swatches('Main', PALETTE_COLORS, 'torso'), this.swatches('Accent', PALETTE_COLORS, 'accent'), this.swatches('Trousers', PALETTE_COLORS, 'legs'), this.swatches('Boots', PALETTE_COLORS, 'boots')),
      section('Headgear', ...part('helmet', 'Headgear'), ...part('backpack', 'Backpack'), this.swatches('Headgear colour', PALETTE_COLORS, 'helmet'), this.swatches('Backpack colour', PALETTE_COLORS, 'backpack')),
      section('Pattern', ...part('pattern', 'Pattern'), this.swatches('Pattern colour', PALETTE_COLORS, 'pattern')),
    );
  }

  private swatches(label: string, palette: readonly string[], key: keyof AvatarColors): HTMLElement {
    const row = h('div', { class: 'swatch-row', attrs: { 'data-wrap': '' } });
    for (const c of palette) {
      const sw = h('button', { class: `swatch${this.look.colors[key] === c ? ' sel' : ''}`, focus: true, style: { background: c }, attrs: { 'aria-label': `${label} ${c}` } });
      sw.dataset.key = `sw-${key}-${c}`;
      sw.addEventListener('click', () => {
        this.look.colors[key] = c;
        this.commitLook();
        this.refresh();
      });
      row.append(sw);
    }
    return h('div', { class: 'swatch-field' }, h('span', { class: 'swatch-label', text: label }), row);
  }

  // ------------------------------------------------------------------ tag & emotes

  private tagTab(): HTMLElement {
    const s = this.s();
    const name = h('input', { class: 'text-input', attrs: { type: 'text', maxlength: '16', value: s.profile.name, 'aria-label': 'Callsign' } }) as HTMLInputElement;
    name.addEventListener('change', () => this.save((d) => void (d.profile.name = name.value.trim() || d.profile.name)));
    const random = button('Random', () => {
      const n = `${ADJ[Math.floor(Math.random() * ADJ.length)]}${NOUN[Math.floor(Math.random() * NOUN.length)]}${Math.floor(Math.random() * 90 + 10)}`;
      name.value = n;
      this.save((d) => void (d.profile.name = n));
    }, { class: 'small' });
    const preview = h('div', { class: 'tag-preview' });
    const renderTag = (): void => {
      const p = this.s().profile;
      preview.innerHTML = `${emblemSvg(p.tag.emblem, 26, p.tag.color)}<b>${p.name.replace(/[<>&]/g, '')}</b><span style="color:${p.tag.color}">${p.tag.title}</span>`;
    };
    renderTag();
    this.unsubs.push(this.app.save.subscribe(renderTag));
    // titles and emblems: owned ones set the tag, locked ones show what they need (and buy in place)
    const title = this.keyed(
      choice('Title', TAGS.map((t) => ({ value: t.id, label: `${owns(s, `tag:${t.id}`) ? '' : LOCK}${t.id}` })), () => this.s().profile.tag.title, (v) => {
        if (owns(this.s(), `tag:${v}`)) this.save((d) => void (d.profile.tag.title = v));
        else this.app.toasts.show(`${LOCK}${describeReq(unlockById(`tag:${v}`)!)}`, 'warn');
        this.refresh();
      }),
      'title',
    );
    const emblem = this.keyed(
      choice('Emblem', EMBLEMS.filter((e) => owns(s, `emblem:${e.id}`)).map((e) => ({ value: e.id, label: e.id[0]!.toUpperCase() + e.id.slice(1) })), () => this.s().profile.tag.emblem, (v) => this.save((d) => void (d.profile.tag.emblem = v))),
      'emblem',
    );
    const colors = h('div', { class: 'swatch-row', attrs: { 'data-wrap': '' } });
    for (const c of PALETTE_COLORS) {
      const sw = h('button', { class: 'swatch', focus: true, style: { background: c } });
      sw.addEventListener('click', () => this.save((d) => void (d.profile.tag.color = c)));
      colors.append(sw);
    }
    const buyTitles = TAGS.filter((t) => !owns(s, `tag:${t.id}`) && unlockState(unlockById(`tag:${t.id}`)!, unlockContext(s)) === 'buyable').map((t) => this.lockLine(`tag:${t.id}`, (d) => void (d.profile.tag.title = t.id))!);
    // emotes: four slots; any emote (locked too) plays on the operator
    const owned = EMOTES.filter((e) => owns(s, `emote:${e.id}`));
    const opts = [{ value: '', label: 'Empty' }, ...owned.map((e) => ({ value: e.id, label: e.name }))];
    const slots = ['D-pad right', 'D-pad down', 'D-pad left', 'Menu only'];
    const emotes = section('Emote slots', ...slots.map((label, i) =>
      this.keyed(choice(`${i + 1} · ${label}`, opts, () => this.s().emotes[i] ?? '', (v) => {
        this.save((d) => void (d.emotes[i] = v));
        if (v) this.menu()?.emote(v);
      }), `emote-${i}`),
    ));
    const tryOut = h('div', { class: 'emote-grid', attrs: { 'data-wrap': '' } });
    for (const e of EMOTES) {
      const has = owns(s, `emote:${e.id}`);
      tryOut.append(this.keyed(button(`${has ? '' : LOCK}${e.name}`, () => this.menu()?.emote(e.id), { class: 'small' }), `try-${e.id}`));
    }
    const buyEmotes = EMOTES.filter((e) => !owns(s, `emote:${e.id}`)).map((e) => this.lockLine(`emote:${e.id}`)).filter((x): x is HTMLElement => !!x && !!x.querySelector('.btn'));
    return h(
      'div',
      { class: 'rows' },
      section('Tag', preview, h('div', { class: 'row' }, h('span', { class: 'row-label', text: 'Callsign' }), h('span', { class: 'row-right' }, name, random)), title, emblem, h('div', { class: 'swatch-field' }, h('span', { class: 'swatch-label', text: 'Colour' }), colors), ...buyTitles),
      emotes,
      section('Try an emote', tryOut, ...buyEmotes),
    );
  }

  // ------------------------------------------------------------------ HQ

  private hqTab(): HTMLElement {
    const s = this.s();
    const lvl = levelInfo(s).level;
    const ups = section('Upgrades');
    for (const id of HQ_IDS) {
      const d = HQ[id];
      const cur = s.hq[id];
      const c = canBuyHq(s.hq, id, lvl, s.profile.credits);
      const label = c.ok ? `${c.price} cr` : c.reason === 'maxed' ? 'Max' : c.reason === 'level' ? `Lv ${c.level}` : `${c.price} cr`;
      const b = this.keyed(button(label, () => {
        this.save((dd) => buyHq(dd, id));
        this.app.toasts.show(`${d.name} upgraded`, 'ok');
        this.refresh();
      }, { class: 'small', blocked: c.ok ? undefined : c.reason === 'maxed' ? 'Maxed' : c.reason === 'credits' ? 'Not enough credits' : `Requires level ${c.level}` }), `hq-${id}`);
      ups.append(h('div', { class: 'row hq-row' }, h('span', { class: 'row-label' }, h('b', { text: d.name }), h('small', { text: `${cur}/${d.prices.length} · ${d.desc}` })), b));
    }
    const ch = section('Challenges');
    for (const c of CHALLENGES) {
      const done = s.challenges.done.includes(c.id);
      const p = Math.min(c.goal, s.challenges.progress[c.id] ?? 0);
      const el = h(
        'div',
        { class: `row challenge${done ? ' done' : ''}`, focus: true },
        h('span', { class: 'row-label' }, h('b', { text: c.name }), h('small', { text: `${c.credits} cr · ${c.xp} XP` })),
        h('span', { class: 'challenge-bar' }, h('i', { style: { width: `${(p / c.goal) * 100}%` } }), h('em', { text: done ? 'Done' : `${p}/${c.goal}` })),
      );
      el.dataset.key = `ch-${c.id}`;
      ch.append(el);
    }
    return h('div', { class: 'rows' }, ups, ch);
  }

  // ------------------------------------------------------------------ screen

  override onShow(): void {
    this.framing();
    this.app.input.state.consumeLook();
    this.preview();
  }

  override onHide(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.commitLook();
    this.menu()?.setFraming('menu');
    showSavedOperator(this.app);
  }

  override update(): void {
    const look = this.app.input.state.consumeLook();
    const m = this.menu();
    if (m && look.x) m.previewYaw += look.x * 1.5;
  }

  override initialFocus(): HTMLElement | null {
    return this.el.querySelector<HTMLElement>('.tab-panel.active [data-autofocus]') ?? this.el.querySelector<HTMLElement>('.tab-panel.active [data-focus]');
  }

  override onTab(dir: -1 | 1): void {
    this.tabs.cycle(dir);
    this.app.nav.setRoot(this.el, this.initialFocus());
  }

  override hints(): Hint[] {
    return [
      { btn: 'LB/RB', label: 'Category' },
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Back' },
    ];
  }
}
