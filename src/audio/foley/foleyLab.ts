/**
 * The foley lab: a debug screen for judging the movement sounds by ear (`?foleylab=1`). Pick a surface and a gait and
 * the steps loop at that gait's cadence, left and right; the landings and moves play on a button. "Old synth" swaps
 * in the previous synthesised steps for an A/B.
 */
import type { App } from '../../core/app';
import { h } from '../../ui/dom';
import { Screen } from '../../ui/screen';
import { button, section } from '../../ui/widgets';
import type { Surface } from '../../world/surfaces';
import { GAITS, type FoleyMove, type Gait } from './steps';

const SURFACES: Surface[] = ['concrete', 'metal', 'grate', 'wood', 'gravel', 'carpet'];
const GAIT_LIST: Gait[] = ['crouch', 'walk', 'run', 'sprint'];
/** Seconds per step at each gait (the rig's cadence at the gait's pace). */
const CADENCE: Record<Gait, number> = { crouch: 0.56, walk: 0.55, run: 0.37, sprint: 0.27 };
const MOVES: [FoleyMove, number, string][] = [['vault', 0.7, 'Vault'], ['mantle', 1, 'Mantle'], ['hop', 0.5, 'Hop'], ['roll', 0.62, 'Roll']];

export class FoleyLabScreen extends Screen {
  override modal = false;
  private surface: Surface = 'concrete';
  private gait: Gait = 'walk';
  private walking = false;
  private synth = false;
  private t = 0;
  private side = 1;
  private status = h('pre', { class: 'lab-status', text: 'Press Walk to start (the first press starts the audio).' });
  private surfBtns = new Map<Surface, HTMLButtonElement>();
  private gaitBtns = new Map<Gait, HTMLButtonElement>();
  private walkBtn: HTMLButtonElement;
  private synthBtn: HTMLButtonElement;

  constructor(private app: App) {
    super('foley-lab');
    const surfRow = h('div', { class: 'lab-row' });
    for (const s of SURFACES) {
      const b = button(s[0]!.toUpperCase() + s.slice(1), () => this.setSurface(s), { class: 'subtle' });
      this.surfBtns.set(s, b);
      surfRow.append(b);
    }
    const gaitRow = h('div', { class: 'lab-row' });
    for (const g of GAIT_LIST) {
      const b = button(g[0]!.toUpperCase() + g.slice(1), () => this.setGait(g), { class: 'subtle' });
      this.gaitBtns.set(g, b);
      gaitRow.append(b);
    }
    this.walkBtn = button('Walk', () => this.toggleWalk(), { class: 'primary', autofocus: true, sub: 'Loop steps, left and right' });
    this.synthBtn = button('Old synth', () => this.toggleSynth(), { class: 'subtle', sub: 'A/B against the previous steps' });
    const moveRow = h(
      'div',
      { class: 'lab-row' },
      button('Soft landing', () => this.ensure() && this.app.foley.landing(this.surface, 'soft'), { class: 'subtle' }),
      button('Heavy landing', () => this.ensure() && this.app.foley.landing(this.surface, 'heavy'), { class: 'subtle' }),
      ...MOVES.map(([k, d, label]) => button(label, () => this.ensure() && this.app.foley.move(this.surface, k, d), { class: 'subtle' })),
    );
    this.el.append(
      h('div', { class: 'screen-title', text: 'Foley lab: movement sounds' }),
      this.status,
      section('Steps', h('div', { class: 'lab-row' }, this.walkBtn, this.synthBtn), surfRow, gaitRow),
      section('Landings and moves', moveRow, h('div', { class: 'row-note', text: 'Real CC0 recordings (Kenney Impact Sounds and RPG Audio): heel and toe from separate takes, random pitch and level, light gear rustle. Tell Claude what to change (level, surface, gait, a sound that is off).' })),
    );
    this.mark();
  }

  private ensure(): boolean {
    const ctx = this.app.audio.ensure();
    if (!ctx) return false;
    void ctx.resume();
    return true;
  }

  private setSurface(s: Surface): void {
    this.surface = s;
    this.mark();
  }

  private setGait(g: Gait): void {
    this.gait = g;
    this.mark();
  }

  private toggleWalk(): void {
    this.walking = this.ensure() && !this.walking;
    this.t = 0;
    this.mark();
  }

  private toggleSynth(): void {
    this.synth = !this.synth;
    this.mark();
  }

  private mark(): void {
    for (const [k, b] of this.surfBtns) b.classList.toggle('lab-on', k === this.surface);
    for (const [k, b] of this.gaitBtns) b.classList.toggle('lab-on', k === this.gait);
    this.walkBtn.classList.toggle('lab-on', this.walking);
    this.synthBtn.classList.toggle('lab-on', this.synth);
  }

  override onHide(): void {
    this.walking = false;
  }

  override update(dt: number): void {
    const st = this.app.foley.stats;
    this.status.textContent = `${this.walking ? 'Walking' : 'Stopped'}: ${this.surface}, ${this.gait}${this.synth ? ' (old synth)' : ''}   sprite ${st.loaded ? `ready (${st.decodeMs} ms, shift ${(st.shift * 1000).toFixed(0)} ms)` : st.failed ? 'FAILED' : 'loading'}   steps ${st.steps}`;
    if (!this.walking) return;
    this.t -= dt;
    if (this.t > 0) return;
    this.t += CADENCE[this.gait];
    this.side = -this.side;
    const speed = GAITS[this.gait].top * 0.85;
    if (this.synth || !this.app.foley.step(this.surface, this.gait, speed, this.side)) this.app.sfx.footstep(this.gait === 'crouch' ? 0.5 : 1, 0, this.surface);
  }
}
