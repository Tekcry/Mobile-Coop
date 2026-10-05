import type { App } from '../../core/app';
import { levelInfo } from '../../progression/profile';
import { h } from '../dom';
import { emblemSvg } from '../../cosmetics/catalog';

/** Level, XP bar, credits and tag. Re-renders on save changes. */
export function profileBadge(app: App): HTMLElement {
  const el = h('div', { class: 'badge' });
  const render = (): void => {
    const s = app.save.get();
    const li = levelInfo(s);
    const pct = li.need ? Math.round((li.into / li.need) * 100) : 100;
    el.innerHTML = '';
    el.append(
      h('div', { class: 'badge-top' }, h('span', { class: 'badge-level', text: String(li.level) }), h('span', { class: 'badge-emblem', html: emblemSvg(s.profile.tag.emblem, 22, s.profile.tag.color) }), h('div', { class: 'badge-name' },
        h('b', { text: s.profile.name }),
        h('span', { class: 'badge-tag', text: s.profile.tag.title, style: { color: s.profile.tag.color } }),
      )),
      h('div', { class: 'xpbar' }, h('div', { class: 'xpfill', style: { width: `${pct}%` } })),
      h('div', { class: 'badge-meta' }, h('span', { text: li.need ? `${li.into} / ${li.need} XP` : 'MAX LEVEL' }), h('span', { class: 'credits', text: `${s.profile.credits} cr` })),
    );
  };
  render();
  app.save.subscribe(render);
  return el;
}
