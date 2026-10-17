/**
 * The weapon lab: a debug screen for judging the gun sounds by ear (`?weaponlab=1`). Pick a gun, then fire a single
 * shot, a three-round burst or a second of automatic fire (at the gun's real rate), suppressed or not, as the player
 * or as a guard near, mid or far. Reloads, dry fire and the brass on each floor are buttons; "Old synth" swaps in the
 * previous synthesised sounds for an A/B, and "Footstep" plays a running step for a level reference.
 */
import type { App } from '../../core/app';
import { h } from '../../ui/dom';
import { Screen } from '../../ui/screen';
import { button, section } from '../../ui/widgets';
import { WEAPON_IDS, WEAPONS, type WeaponId } from '../../weapons/weaponDefs';
import type { Surface } from '../../world/surfaces';
import { gunOf } from './guns';

type Mode = 'single' | 'burst' | 'auto';
/**
 * The CT kit (G76; `CAMPAIGN_ARSENAL` in `src/config/arsenal.ts`): the rifle (issued suppressed) and the suppressed pistol.
 */
const CAMPAIGN: readonly WeaponId[] = ['rifle', 'pistolSd'];
const SURFACES: Surface[] = ['concrete', 'metal', 'grate', 'wood', 'gravel', 'carpet'];
/** Listening distances (m): 0 is the player's own gun. */
const DISTANCES: [number, string][] = [
  [0, 'Player'],
  [6, 'Guard 6 m'],
  [18, 'Guard 18 m'],
  [40, 'Guard 40 m'],
];

export class WeaponLabScreen extends Screen {
  override modal = false;
  private gun: WeaponId = 'pistolSd';
  private mode: Mode = 'single';
  private suppressed = false;
  private synth = false;
  private dist = 0;
  private surface: Surface = 'concrete';
  /** Shots still to fire in the current burst or auto run, and the time to the next. */
  private left = 0;
  private t = 0;
  private status = h('pre', { class: 'lab-status', text: 'Press Fire (the first press starts the audio).' });
  private gunBtns = new Map<WeaponId, HTMLButtonElement>();
  private modeBtns = new Map<Mode, HTMLButtonElement>();
  private distBtns = new Map<number, HTMLButtonElement>();
  private surfBtns = new Map<Surface, HTMLButtonElement>();
  private sdBtn: HTMLButtonElement;
  private synthBtn: HTMLButtonElement;

  constructor(private app: App) {
    super('weapon-lab');
    // the CT kit (G76): every gun there is
    const campaignRow = h('div', { class: 'lab-row lab-gun' });
    for (const id of [...CAMPAIGN, ...WEAPON_IDS.filter((w) => !CAMPAIGN.includes(w))]) {
      const b = button(WEAPONS[id].name, () => this.setGun(id), { class: 'subtle', sub: WEAPONS[id].class });
      this.gunBtns.set(id, b);
      campaignRow.append(b);
    }
    const modeRow = h('div', { class: 'lab-row' });
    for (const [m, label] of [
      ['single', 'Single'],
      ['burst', 'Burst (3)'],
      ['auto', 'Auto (1 s)'],
    ] as [Mode, string][]) {
      const b = button(label, () => this.setMode(m), { class: 'subtle' });
      this.modeBtns.set(m, b);
      modeRow.append(b);
    }
    const distRow = h('div', { class: 'lab-row' });
    for (const [d, label] of DISTANCES) {
      const b = button(label, () => this.setDist(d), { class: 'subtle' });
      this.distBtns.set(d, b);
      distRow.append(b);
    }
    const surfRow = h('div', { class: 'lab-row' });
    for (const s of SURFACES) {
      const b = button(s[0]!.toUpperCase() + s.slice(1), () => this.setSurface(s), { class: 'subtle' });
      this.surfBtns.set(s, b);
      surfRow.append(b);
    }
    this.sdBtn = button('Suppressed', () => this.toggle('sd'), { class: 'subtle', sub: 'As with a suppressor fitted' });
    this.synthBtn = button('Old synth', () => this.toggle('synth'), { class: 'subtle', sub: 'A/B against the previous sounds' });
    const fire = button('Fire', () => this.fire(), { class: 'primary', autofocus: true, sub: 'Single, burst or auto' });
    const handling = h(
      'div',
      { class: 'lab-row' },
      button('Reload', () => this.reload(false), { class: 'subtle', sub: 'A round still chambered' }),
      button('Empty reload', () => this.reload(true), { class: 'subtle', sub: 'Slide or charging handle' }),
      button('Dry fire', () => this.ensure() && (this.synth || !this.app.weaponAudio.dry()) && this.app.sfx.dryFire(), { class: 'subtle' }),
      button('Brass', () => this.brass(), { class: 'subtle', sub: 'On the floor below' }),
      button('Footstep', () => this.ensure() && this.app.foley.step(this.surface, 'run', 3, 1), { class: 'subtle', sub: 'A running step, for level' }),
    );
    this.el.append(
      h('div', { class: 'screen-title', text: 'Weapon lab: gun sounds' }),
      this.status,
      section('Campaign arsenal', campaignRow),
      section('Fire', h('div', { class: 'lab-row' }, fire, this.sdBtn, this.synthBtn), modeRow, distRow),
      section(
        'Handling and brass',
        handling,
        surfRow,
        h('div', {
          class: 'row-note',
          text: 'Real CC0 recordings (The Free Firearm Sound Library; OpenGameArt reloads). Suppressed shots, brass and the crossbow are made from them offline. Tell Claude what to change (a gun that sounds wrong, levels, the suppressor, the brass).',
        }),
      ),
    );
    this.mark();
  }

  private ensure(): boolean {
    const ctx = this.app.audio.ensure();
    if (!ctx) return false;
    void ctx.resume();
    return true;
  }

  private setGun(id: WeaponId): void {
    this.gun = id;
    this.mark();
  }

  private setMode(m: Mode): void {
    this.mode = m;
    this.mark();
  }

  private setDist(d: number): void {
    this.dist = d;
    this.mark();
  }

  private setSurface(s: Surface): void {
    this.surface = s;
    this.mark();
  }

  private toggle(k: 'sd' | 'synth'): void {
    if (k === 'sd') this.suppressed = !this.suppressed;
    else this.synth = !this.synth;
    this.mark();
  }

  private fire(): void {
    if (!this.ensure()) return;
    const def = WEAPONS[this.gun];
    this.left = this.mode === 'single' ? 1 : this.mode === 'burst' ? 3 : Math.max(1, Math.round(def.rpm / 60));
    this.t = 0;
  }

  /** The suppressed pistol (`pistolSd`) has its suppressor built in. */
  private get sd(): boolean {
    return this.suppressed || this.gun === 'pistolSd';
  }

  private shoot(): void {
    const def = WEAPONS[this.gun];
    const wa = this.app.weaponAudio;
    if (this.dist <= 0) {
      if (this.synth || !wa.shot(this.gun, this.sd, this.surface)) this.app.sfx.gunshot(def.class, 1, 0.12);
      return;
    }
    // a guard at that distance, a little to the right (the engine's distance law at range 70)
    const level = 1 / (1 + (this.dist / 17.5) ** 2);
    if (this.synth || !wa.remoteShot(this.gun, this.dist, level, 0.3, this.sd)) this.app.sfx.gunshot(def.class, level, 0.3, this.dist);
  }

  private reload(empty: boolean): void {
    if (!this.ensure()) return;
    const def = WEAPONS[this.gun];
    const t = def.reloadTime * (empty ? 1.25 : 1);
    if (this.synth || !this.app.weaponAudio.reload(this.gun, t, empty, Math.min(4, def.magSize))) this.app.sfx.reload(t);
  }

  private brass(): void {
    if (!this.ensure()) return;
    const c = gunOf(this.gun).casing;
    this.app.weaponAudio.casing(c === 'none' ? 'rifle' : c, this.surface);
  }

  private mark(): void {
    for (const [k, b] of this.gunBtns) b.classList.toggle('lab-on', k === this.gun);
    for (const [k, b] of this.modeBtns) b.classList.toggle('lab-on', k === this.mode);
    for (const [k, b] of this.distBtns) b.classList.toggle('lab-on', k === this.dist);
    for (const [k, b] of this.surfBtns) b.classList.toggle('lab-on', k === this.surface);
    this.sdBtn.classList.toggle('lab-on', this.sd);
    this.synthBtn.classList.toggle('lab-on', this.synth);
  }

  override onHide(): void {
    this.left = 0;
  }

  override update(dt: number): void {
    const st = this.app.weaponAudio.stats;
    const def = WEAPONS[this.gun];
    this.status.textContent = `${def.name} (${def.class}, ${def.fireMode} ${def.rpm} rpm)${this.sd ? ', suppressed' : ''}${this.synth ? ' (old synth)' : ''}, ${this.dist ? `guard at ${this.dist} m` : 'player'}, brass on ${this.surface}   sprite ${st.loaded ? `ready (${st.decodeMs} ms, shift ${(st.shift * 1000).toFixed(0)} ms)` : st.failed ? 'FAILED' : 'loading'}   shots ${st.shots + st.remote}`;
    if (this.left <= 0) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.t += 60 / def.rpm;
    this.left--;
    this.shoot();
  }
}
