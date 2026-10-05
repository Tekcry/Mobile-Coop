import { WEAPONS, type WeaponDef } from '../../weapons/weaponDefs';
import { dps, type EffectiveStats } from '../../weapons/weaponStats';
import { h } from '../dom';

const MAXV = (() => {
  const all = Object.values(WEAPONS);
  return {
    dmg: Math.max(...all.map((w) => w.damage * w.pellets)) * 1.3,
    dps: Math.max(...all.map((w) => (w.damage * w.pellets * w.rpm) / 60)) * 1.3,
    range: Math.max(...all.map((w) => w.falloffEnd)),
    mag: Math.max(...all.map((w) => w.magSize)) * 1.5,
  };
})();

export function statBars(def: WeaponDef, st: EffectiveStats, base?: EffectiveStats): HTMLElement {
  const row = (label: string, v: number, b: number | undefined, text: string): HTMLElement => {
    const pct = Math.max(0.04, Math.min(1, v));
    const bp = b === undefined ? pct : Math.max(0.04, Math.min(1, b));
    return h(
      'div',
      { class: 'sbar' },
      h('span', { class: 'sbar-label', text: label }),
      h('span', { class: 'sbar-track' }, h('i', { class: 'sbar-base', style: { width: `${Math.min(pct, bp) * 100}%` } }), h('i', { class: 'sbar-up', style: { width: `${pct * 100}%` } })),
      h('span', { class: 'sbar-val', text }),
    );
  };
  const handling = (s: EffectiveStats): number => 1 - Math.min(1, s.recoilPitch / 6);
  return h(
    'div',
    { class: 'sbars' },
    row('Damage', (st.damage * def.pellets) / MAXV.dmg, base && (base.damage * def.pellets) / MAXV.dmg, `${Math.round(st.damage)}${def.pellets > 1 ? `×${def.pellets}` : ''}`),
    row('DPS', dps(def, st) / MAXV.dps, base && dps(def, base) / MAXV.dps, String(Math.round(dps(def, st)))),
    row('Range', def.falloffEnd / MAXV.range, undefined, `${def.falloffEnd} m`),
    row('Magazine', st.magSize / MAXV.mag, base && base.magSize / MAXV.mag, String(st.magSize)),
    row('Handling', handling(st), base && handling(base), `${Math.round(handling(st) * 100)}`),
    row('Reload', 1 - st.reloadTime / 3.5, base && 1 - base.reloadTime / 3.5, `${st.reloadTime.toFixed(1)} s`),
  );
}
