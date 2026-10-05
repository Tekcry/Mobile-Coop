import type { SessionReport } from '../../progression/profile';
import { h } from '../dom';

/** Rewards breakdown shown inside the results screen. */
export function rewardsPanel(r: SessionReport): HTMLElement {
  const lines = h('div', { class: 'reward-lines' });
  for (const l of r.rewards.lines) {
    lines.append(h('div', { class: 'reward-line' }, h('span', { text: l.label }), h('b', { text: `+${l.xp} XP` }), h('span', { class: 'credits', text: `+${l.credits} cr` })));
  }
  if (r.levelUpCredits) lines.append(h('div', { class: 'reward-line' }, h('span', { text: `Level-up bonus` }), h('b', { text: '' }), h('span', { class: 'credits', text: `+${r.levelUpCredits} cr` })));
  const pctBefore = r.before.need ? r.before.into / r.before.need : 1;
  const pctAfter = r.after.need ? r.after.into / r.after.need : 1;
  const fill = h('div', { class: 'xpfill', style: { width: `${(r.levelUps ? 0 : pctBefore) * 100}%` } });
  requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = `${pctAfter * 100}%`)));
  const extra: HTMLElement[] = [];
  if (r.levelUps) extra.push(h('div', { class: 'reward-big', text: `LEVEL UP!  ${r.before.level} → ${r.after.level}` }));
  for (const m of r.masteryUps) extra.push(h('div', { class: 'reward-note', text: `${m.weapon.toUpperCase()} mastery ${m.level}` }));
  for (const g of r.granted) extra.push(h('div', { class: 'reward-note', text: `Unlocked: ${g.name}` }));
  if (r.nowBuyable.length) extra.push(h('div', { class: 'reward-note', text: `New in the Store: ${r.nowBuyable.map((u) => u.name).join(', ')}` }));
  return h(
    'div',
    { class: 'rewards' },
    lines,
    h('div', { class: 'reward-total' }, h('b', { text: `+${r.rewards.xp} XP` }), h('span', { class: 'credits', text: `+${r.rewards.credits + r.levelUpCredits} cr` })),
    h('div', { class: 'reward-level' }, h('span', { text: `Lv ${r.after.level}` }), h('div', { class: 'xpbar' }, fill)),
    ...extra,
  );
}
