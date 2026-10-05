import type { App } from '../../core/app';
import { buyUnlock, unlockContext } from '../../progression/profile';
import { describeReq, UNLOCKS, unlockState, type UnlockKind } from '../../progression/unlocks';
import { h } from '../dom';
import { Screen } from '../screen';
import type { Hint } from '../prompts';
import { button, TabView } from '../widgets';
import { profileBadge } from './profileBadge';

const GROUPS: { id: string; label: string; kinds: UnlockKind[] }[] = [
  { id: 'weapons', label: 'Weapons', kinds: ['weapon'] },
  { id: 'attachments', label: 'Attachments', kinds: ['attachment'] },
  { id: 'gear', label: 'Gear', kinds: ['part', 'pattern', 'color'] },
  { id: 'camos', label: 'Camos', kinds: ['camo'] },
  { id: 'extras', label: 'Emotes & Tags', kinds: ['emote', 'tag'] },
];

/** Unlock table browser: requirements, state, buy with credits. */
export class StoreScreen extends Screen {
  private tabs: TabView;

  constructor(private app: App) {
    super('store-screen');
    this.tabs = new TabView(GROUPS.map((g) => ({ id: g.id, label: g.label, build: () => this.buildGroup(g.kinds) })));
    this.tabs.onChange = () => app.nav.refresh();
    this.el.append(h('div', { class: 'screen-head' }, h('div', { class: 'screen-title', text: 'Store' }), profileBadge(app)), this.tabs.el);
  }

  private buildGroup(kinds: UnlockKind[]): HTMLElement {
    const s = this.app.save.get();
    const ctx = unlockContext(s);
    const items = UNLOCKS.filter((u) => kinds.includes(u.kind)).sort((a, b) => (a.req.level ?? 0) - (b.req.level ?? 0));
    const grid = h('div', { class: 'store-grid' });
    for (const it of items) {
      const st = unlockState(it, ctx);
      const price = it.req.price ?? 0;
      const label = st === 'owned' ? 'Owned' : st === 'locked' ? describeReq(it) : st === 'free' ? 'Claim' : `Buy · ${price} cr`;
      const b = button(label, () => this.buy(it.id), {
        blocked: st === 'owned' ? 'Already owned' : st === 'locked' ? `Requires ${describeReq(it)}` : st === 'buyable' && s.profile.credits < price ? 'Not enough credits' : undefined,
        class: st === 'owned' ? 'owned small' : 'small',
      });
      b.dataset.key = it.id;
      grid.append(h('div', { class: `store-item ${st}` }, h('div', { class: 'store-name', text: it.name }), h('div', { class: 'store-kind', text: it.kind }), b));
    }
    if (!items.length) grid.append(h('div', { class: 'row-note', text: 'Nothing here yet.' }));
    return grid;
  }

  private buy(id: string): void {
    let msg = '';
    let ok = false;
    this.app.save.update((d) => {
      const r = buyUnlock(d, id);
      ok = r.ok;
      msg = r.ok ? `Unlocked ${r.item.name}` : r.reason;
    });
    this.app.toasts.show(msg, ok ? 'ok' : 'warn');
    const tab = GROUPS[this.tabs.index]!.id;
    this.tabs.rebuild(tab);
    const el = this.el.querySelector<HTMLElement>(`[data-key="${id}"]`);
    this.app.nav.setRoot(this.el, el);
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
      { btn: 'LB/RB', label: 'Category' },
      { btn: 'A', label: 'Buy' },
      { btn: 'B', label: 'Back' },
    ];
  }
}
