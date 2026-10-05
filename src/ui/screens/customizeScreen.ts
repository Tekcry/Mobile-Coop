import type { App } from '../../core/app';
import { MenuState } from '../../world/menuScene';
import { PALETTE_COLORS, SKIN_TONES, sanitizeLook, type AvatarColors, type AvatarLook } from '../../cosmetics/avatarLook';
import { EMBLEMS, EMOTES, LOOK_FIELD, PART_OPTIONS, TAGS, emblemSvg, partUnlockId, type PartCategory } from '../../cosmetics/catalog';
import { buyUnlock, owns, unlockContext } from '../../progression/profile';
import { describeReq, unlockById, unlockState } from '../../progression/unlocks';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, choice, section, TabView, type TabDef } from '../widgets';

const ADJ = ['Iron', 'Silent', 'Rapid', 'Lucky', 'Crimson', 'Frost', 'Shadow', 'Copper', 'Night', 'Wild', 'Steel', 'Dust'];
const NOUN = ['Fox', 'Viper', 'Hawk', 'Bear', 'Wolf', 'Raven', 'Comet', 'Badger', 'Lynx', 'Otter', 'Mantis', 'Rhino'];

/** Avatar customiser with a live 3D preview (rotate with right stick or by dragging). */
export class CustomizeScreen extends Screen {
  private look: AvatarLook;
  private tabs: TabView;
  private note: HTMLElement;
  private dragX: number | null = null;
  private unsubs: (() => void)[] = [];

  constructor(private app: App) {
    super('customize-screen');
    this.look = structuredClone(app.save.get().avatar);
    this.note = h('div', { class: 'row-note lock-note' });
    const tabs: TabDef[] = [
      { id: 'body', label: 'Body', build: () => this.rows(['body', 'head', 'hair'], [['skin', 'Skin tone', SKIN_TONES], ['hair', 'Hair colour', PALETTE_COLORS]]) },
      { id: 'torso', label: 'Torso', build: () => this.rows(['torso'], [['torso', 'Main colour', PALETTE_COLORS], ['accent', 'Accent colour', PALETTE_COLORS]]) },
      { id: 'legs', label: 'Legs', build: () => this.rows(['legs'], [['legs', 'Colour', PALETTE_COLORS], ['boots', 'Boots', PALETTE_COLORS]]) },
      { id: 'gear', label: 'Gear', build: () => this.rows(['helmet', 'backpack'], [['helmet', 'Helmet colour', PALETTE_COLORS], ['backpack', 'Backpack colour', PALETTE_COLORS]]) },
      { id: 'pattern', label: 'Pattern', build: () => this.rows(['pattern'], [['pattern', 'Pattern colour', PALETTE_COLORS]]) },
      { id: 'profile', label: 'Tag', build: () => this.profileTab() },
      { id: 'emotes', label: 'Emotes', build: () => this.emotesTab() },
    ];
    this.tabs = new TabView(tabs);
    this.tabs.onChange = () => app.nav.refresh();
    const panel = h('div', { class: 'cust-panel' }, h('div', { class: 'screen-title', text: 'Customise' }), this.tabs.el, this.note);
    const stage = h('div', { class: 'cust-stage' }, h('div', { class: 'cust-hint', text: 'Drag or use the right stick to rotate' }));
    stage.addEventListener('pointerdown', (e) => {
      this.dragX = e.clientX;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (this.dragX === null) return;
      this.menu()!.previewYaw -= (e.clientX - this.dragX) * 0.012;
      this.dragX = e.clientX;
    });
    const end = (): void => void (this.dragX = null);
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
    this.el.append(panel, stage);
  }

  private menu(): MenuState | null {
    const s = this.app.current;
    return s instanceof MenuState ? s : null;
  }

  private refreshPreview(): void {
    const sv = this.app.save.get();
    this.menu()?.setAvatar(this.look, sv.loadout.primary, sv.weapons[sv.loadout.primary].camo);
    this.updateNote();
  }

  /** Locked selections preview only; owned ones are saved immediately. */
  private lockedSelections(): { cat: PartCategory; id: string }[] {
    const s = this.app.save.get();
    const out: { cat: PartCategory; id: string }[] = [];
    for (const cat of Object.keys(PART_OPTIONS) as PartCategory[]) {
      const id = partUnlockId(cat, this.look[LOOK_FIELD[cat]] as string);
      if (!owns(s, id)) out.push({ cat, id });
    }
    return out;
  }

  private commit(): void {
    const locked = this.lockedSelections();
    const saved = this.app.save.get().avatar;
    const toSave = structuredClone(this.look);
    for (const l of locked) (toSave as unknown as Record<string, unknown>)[LOOK_FIELD[l.cat]] = saved[LOOK_FIELD[l.cat]];
    this.app.save.update((d) => void (d.avatar = sanitizeLook(toSave)));
  }

  private updateNote(): void {
    const locked = this.lockedSelections();
    this.note.replaceChildren();
    if (!locked.length) return;
    const s = this.app.save.get();
    const ctx = unlockContext(s);
    for (const l of locked) {
      const item = unlockById(l.id);
      if (!item) continue;
      const st = unlockState(item, ctx);
      const line = h('div', { class: 'lock-line', text: `🔒 ${item.name}: ${describeReq(item)} (preview only)` });
      if (st === 'buyable' || st === 'free') {
        const b = button(st === 'free' ? 'Claim' : `Unlock · ${item.req.price} cr`, () => this.buy(l.id), { class: 'small primary' });
        line.append(b);
      }
      this.note.append(line);
    }
  }

  private buy(id: string): void {
    let ok = false;
    let msg = '';
    this.app.save.update((d) => {
      const r = buyUnlock(d, id);
      ok = r.ok;
      msg = r.ok ? `Unlocked ${r.item.name}` : r.reason;
    });
    this.app.toasts.show(msg, ok ? 'ok' : 'warn');
    if (ok) this.commit();
    this.tabs.rebuild(['body', 'torso', 'legs', 'gear', 'pattern', 'profile', 'emotes'][this.tabs.index]!);
    this.updateNote();
    this.app.nav.refresh();
  }

  private rows(cats: PartCategory[], colors: [keyof AvatarColors, string, readonly string[]][]): HTMLElement {
    const s = this.app.save.get();
    const wrap = h('div', { class: 'rows' });
    for (const cat of cats) {
      const field = LOOK_FIELD[cat];
      const opts = PART_OPTIONS[cat].map((o) => ({ value: o.value, label: `${owns(s, partUnlockId(cat, o.value)) ? '' : '🔒 '}${o.name}` }));
      wrap.append(
        choice(cat[0]!.toUpperCase() + cat.slice(1), opts, () => this.look[field] as string, (v) => {
          (this.look as unknown as Record<string, unknown>)[field] = v;
          this.refreshPreview();
          this.commit();
        }),
      );
    }
    for (const [key, label, palette] of colors) wrap.append(this.swatches(label, palette, key));
    return wrap;
  }

  private swatches(label: string, palette: readonly string[], key: keyof AvatarColors): HTMLElement {
    const row = h('div', { class: 'swatch-row', attrs: { 'data-wrap': '' } });
    const render = (): void => {
      for (const el of Array.from(row.children) as HTMLElement[]) el.classList.toggle('sel', el.dataset.color === this.look.colors[key]);
    };
    for (const c of palette) {
      const sw = h('button', { class: 'swatch', focus: true, style: { background: c }, attrs: { 'aria-label': c } });
      sw.dataset.color = c;
      sw.addEventListener('click', () => {
        this.look.colors[key] = c;
        render();
        this.refreshPreview();
        this.commit();
      });
      row.append(sw);
    }
    render();
    return section(label, row);
  }

  private profileTab(): HTMLElement {
    const s = this.app.save.get();
    const name = h('input', { class: 'text-input', attrs: { type: 'text', maxlength: '16', value: s.profile.name, 'aria-label': 'Callsign' } }) as HTMLInputElement;
    name.addEventListener('change', () => this.app.save.update((d) => void (d.profile.name = name.value.trim() || d.profile.name)));
    const random = button('Random callsign', () => {
      const n = `${ADJ[Math.floor(Math.random() * ADJ.length)]}${NOUN[Math.floor(Math.random() * NOUN.length)]}${Math.floor(Math.random() * 90 + 10)}`;
      name.value = n;
      this.app.save.update((d) => void (d.profile.name = n));
    }, { class: 'small' });
    const titles = TAGS.filter((t) => owns(s, `tag:${t.id}`)).map((t) => ({ value: t.id, label: t.id }));
    const emblems = EMBLEMS.filter((e) => owns(s, `emblem:${e.id}`)).map((e) => ({ value: e.id, label: e.id[0]!.toUpperCase() + e.id.slice(1) }));
    const preview = h('div', { class: 'tag-preview' });
    const renderTag = (): void => {
      const p = this.app.save.get().profile;
      preview.innerHTML = `${emblemSvg(p.tag.emblem, 26, p.tag.color)}<b>${p.name.replace(/[<>&]/g, '')}</b><span style="color:${p.tag.color}">${p.tag.title}</span>`;
    };
    renderTag();
    this.unsubs.push(this.app.save.subscribe(renderTag));
    const colorRow = h('div', { class: 'swatch-row', attrs: { 'data-wrap': '' } });
    for (const c of PALETTE_COLORS) {
      const sw = h('button', { class: 'swatch', focus: true, style: { background: c } });
      sw.addEventListener('click', () => this.app.save.update((d) => void (d.profile.tag.color = c)));
      colorRow.append(sw);
    }
    return h(
      'div',
      { class: 'rows' },
      preview,
      h('div', { class: 'row' }, h('span', { class: 'row-label', text: 'Callsign' }), h('span', { class: 'row-right' }, name, random)),
      choice('Title', titles, () => this.app.save.get().profile.tag.title, (v) => this.app.save.update((d) => void (d.profile.tag.title = v))),
      choice('Emblem', emblems, () => this.app.save.get().profile.tag.emblem, (v) => this.app.save.update((d) => void (d.profile.tag.emblem = v))),
      section('Tag colour', colorRow),
      h('div', { class: 'row-note', text: 'More titles and emblems unlock with levels and in the Store.' }),
    );
  }

  private emotesTab(): HTMLElement {
    const s = this.app.save.get();
    const owned = EMOTES.filter((e) => owns(s, `emote:${e.id}`));
    const opts = [{ value: '', label: 'Empty' }, ...owned.map((e) => ({ value: e.id, label: e.name }))];
    const wrap = h('div', { class: 'rows' });
    const slots = ['D-pad right', 'D-pad down', 'D-pad left', 'Menu only'];
    slots.forEach((label, i) => {
      wrap.append(
        choice(`Slot ${i + 1} (${label})`, opts, () => this.app.save.get().emotes[i] ?? '', (v) => {
          this.app.save.update((d) => void (d.emotes[i] = v));
          if (v) this.menu()?.emote(v);
        }),
      );
    });
    const prev = h('div', { class: 'emote-grid', attrs: { 'data-wrap': '' } });
    for (const e of EMOTES) {
      const has = owns(s, `emote:${e.id}`);
      prev.append(button(`${has ? '' : '🔒 '}${e.name}`, () => this.menu()?.emote(e.id), { class: 'small' }));
    }
    wrap.append(section('Preview', prev));
    return wrap;
  }

  override onShow(): void {
    this.menu()?.setFraming('customize');
    this.app.input.state.consumeLook();
    this.refreshPreview();
  }

  override onHide(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    // drop locked previews, keep owned changes
    this.commit();
    const m = this.menu();
    if (m) {
      m.setFraming('menu');
      const sv = this.app.save.get();
      m.setAvatar(sv.avatar, sv.loadout.primary, sv.weapons[sv.loadout.primary].camo);
    }
  }

  override update(): void {
    const look = this.app.input.state.consumeLook();
    const m = this.menu();
    if (m && look.x) m.previewYaw += look.x * 1.5;
  }

  override initialFocus(): HTMLElement | null {
    return this.el.querySelector<HTMLElement>('.tab-panel.active [data-focus]');
  }

  override onTab(dir: -1 | 1): void {
    this.tabs.cycle(dir);
    this.app.nav.setRoot(this.el, this.initialFocus());
  }

  override hints(): Hint[] {
    return [
      { btn: 'LB/RB', label: 'Section' },
      { btn: 'A', label: 'Select' },
      { btn: 'B', label: 'Done' },
    ];
  }
}
