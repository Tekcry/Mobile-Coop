/**
 * The music lab: a debug screen for Michael's ears (`?musiclab=1`, or Settings > Audio > Music lab with `?debug=1`).
 * V3 sketch picker: three contrasting 60 s loops, each as calm, caution and alert stems, crossfaded live while they play.
 * The stems are pre-rendered offline (`npm run music:render`) and bundled; nothing here is synthesised.
 */
import type { App } from '../../core/app';
import { h } from '../../ui/dom';
import { Screen } from '../../ui/screen';
import { button, section, slider } from '../../ui/widgets';
import manifest from '../../assets/music/sketches/sketches.json';
import { SketchPlayer, type SketchFiles } from './sketchPlayer';
import { STATE_GAINS, threatGains, type StemGains, type ThreatState } from './stemMix';

const FILES = import.meta.glob('../../assets/music/sketches/*.mp3', { query: '?url', import: 'default', eager: true }) as Record<string, string>;

interface Entry {
  id: string;
  name: string;
  bpm: number;
  bars: number;
  loop: number;
  about: string;
  stems: Record<'calm' | 'caution' | 'alert', { file: string; bytes: number }>;
}

const SKETCHES = manifest.sketches as Entry[];

function files(e: Entry): SketchFiles {
  const url = (f: string): string => {
    const u = FILES[`../../assets/music/sketches/${f}`];
    if (!u) throw new Error(`missing stem ${f}`);
    return u;
  };
  return { pad: manifest.pad, loop: e.loop, urls: [url(e.stems.calm.file), url(e.stems.caution.file), url(e.stems.alert.file)] };
}

const STATES: { s: ThreatState; label: string; sub: string }[] = [
  { s: 'calm', label: 'Calm', sub: 'Calm stem' },
  { s: 'caution', label: 'Caution', sub: '+ caution stem' },
  { s: 'alert', label: 'Alert', sub: '+ alert stem' },
  { s: 'evasion', label: 'Evasion', sub: 'Alert thinned' },
];

/** The scripted ladder (s at each state): the whole arc in about 75 s, for listening away from the controls. */
const DEMO: [ThreatState, number][] = [['calm', 12], ['caution', 14], ['alert', 18], ['evasion', 12], ['caution', 8], ['calm', 12]];

export class MusicLabScreen extends Screen {
  override modal = false;
  private player: SketchPlayer | null = null;
  private status = h('pre', { class: 'lab-status', text: 'Tap a sketch to start the audio.' });
  private sketchBtns = new Map<string, HTMLButtonElement>();
  private stateBtns = new Map<ThreatState, HTMLButtonElement>();
  private current: Entry | null = null;
  private threat = 0;
  /** The gains last asked for (a state, the slider or a solo), reapplied when a sketch finishes loading. */
  private target: StemGains = STATE_GAINS.calm;
  private loading = false;
  private demo = -1;
  private demoLeft = 0;
  private since = 0;
  private tempo = 1;

  constructor(private app: App) {
    super('music-lab');
    const picker: HTMLElement[] = [];
    for (const e of SKETCHES) {
      const b = button(`Play ${e.id}`, () => void this.play(e), { class: 'primary', sub: `${e.name}, ${e.bpm} BPM`, autofocus: e.id === 'A' });
      this.sketchBtns.set(e.id, b);
      picker.push(h('div', { class: 'row-note', text: `${e.id} - ${e.name}: ${e.about}` }), h('div', { class: 'lab-row' }, b));
    }

    const stateRow = h('div', { class: 'lab-row' });
    for (const s of STATES) {
      const b = button(s.label, () => this.setState(s.s), { sub: s.sub });
      this.stateBtns.set(s.s, b);
      stateRow.append(b);
    }
    stateRow.append(button('Stop', () => this.stop(), { class: 'subtle' }));

    const soloRow = h(
      'div',
      { class: 'lab-row' },
      h('span', { class: 'lab-key', text: 'Solo' }),
      ...(['calm', 'caution', 'alert'] as const).map((s, i) =>
        button(s[0]!.toUpperCase() + s.slice(1), () => this.solo(i), { class: 'subtle lab-stem' }),
      ),
    );

    this.el.append(
      h('div', { class: 'screen-title', text: 'Music lab: V3 sketches' }),
      this.status,
      section('Sketch picker', ...picker, h('div', { class: 'row-note', text: 'Each sketch is a 60 s loop made only from recorded CC0 sounds, in three stacked stems. Play one, then move the threat (the Tempo slider speeds the loop up or down live, and the pitch moves with it): the stems crossfade live (up fast, down slowly). Pick one, or tell Claude what to change. Does any remind you of a known track? Say so and it gets rewritten.' })),
      section(
        'Threat',
        stateRow,
        slider('Threat', { min: 0, max: 1, step: 0.05, get: () => this.threat, set: (v) => this.setThreat(v), format: (v) => `${Math.round(v * 100)}%` }),
        slider('Tempo', { min: 0.7, max: 1.4, step: 0.01, get: () => this.tempo, set: (v) => this.setTempo(v), format: (v) => `${Math.round(v * 100)}%${this.current ? ' (' + Math.round(this.current.bpm * v) + ' BPM)' : ''}` }),
        h('div', { class: 'lab-row' }, button('Play the ladder', () => this.startDemo(), { sub: 'Calm, caution, alert, evasion, back to calm (75 s)' })),
      ),
      section('Hear one stem', soloRow, h('div', { class: 'row-note', text: 'Solo plays one stem alone (for judging it); any threat button returns to the stack.' })),
    );
  }

  private ensure(): SketchPlayer | null {
    if (this.player) return this.player;
    const ctx = this.app.audio.ensure();
    if (!ctx) return null;
    void ctx.resume();
    // straight to the output, not through the game's music bus and compressor: the lab hears the stems as rendered
    this.player = new SketchPlayer(ctx, ctx.destination);
    this.player.setRate(this.tempo);
    return this.player;
  }

  private async play(e: Entry): Promise<void> {
    const p = this.ensure();
    if (!p) return;
    this.current = e;
    for (const [id, b] of this.sketchBtns) b.classList.toggle('lab-on', id === e.id);
    this.status.textContent = `Loading ${e.id} - ${e.name}…`;
    this.loading = true;
    await p.play(files(e), this.target);
    this.loading = false;
    // a state picked while it was loading wins
    p.setGains(this.target, 0.05);
  }

  private setState(s: ThreatState): void {
    this.demo = -1;
    this.applyState(s);
  }

  private applyState(s: ThreatState): void {
    this.threat = s === 'calm' ? 0 : s === 'caution' ? 0.5 : s === 'alert' ? 1 : 0.75;
    this.target = STATE_GAINS[s];
    this.player?.setGains(this.target);
    this.markState(s);
    this.el.querySelector('.row-slider')?.dispatchEvent(new Event('widget-refresh'));
  }

  private setTempo(v: number): void {
    this.tempo = v;
    this.player?.setRate(v);
  }

  private setThreat(v: number): void {
    this.demo = -1;
    this.threat = v;
    this.target = threatGains(v);
    this.player?.setGains(this.target, 0.3);
    this.markState(null);
  }

  private solo(i: number): void {
    this.demo = -1;
    this.target = [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0];
    this.player?.setGains(this.target, 0.3);
    this.markState(null);
  }

  private startDemo(): void {
    if (!this.current) void this.play(SKETCHES[0]!);
    this.demo = 0;
    this.demoLeft = DEMO[0]![1];
    this.applyState(DEMO[0]![0]);
  }

  private stop(): void {
    this.demo = -1;
    this.player?.stop();
    for (const b of this.sketchBtns.values()) b.classList.remove('lab-on');
    this.markState(null);
    this.current = null;
  }

  private markState(s: ThreatState | null): void {
    for (const [k, b] of this.stateBtns) b.classList.toggle('lab-on', k === s);
  }

  override onHide(): void {
    this.stop();
  }

  override update(dt: number): void {
    if (this.demo >= 0) {
      this.demoLeft -= dt;
      if (this.demoLeft <= 0) {
        this.demo++;
        const step = DEMO[this.demo];
        if (step) {
          this.demoLeft = step[1];
          this.applyState(step[0]);
        } else this.demo = -1;
      }
    }
    this.since += dt;
    if (this.since < 0.25) return;
    this.since = 0;
    const p = this.player;
    if (!p || !this.current) return;
    const st = p.stats;
    const g = p.gainsNow.map((x) => x.toFixed(2)).join(' / ');
    this.status.textContent = [
      `${this.current.id} - ${this.current.name}  ${this.current.bpm} BPM  loop ${this.current.loop.toFixed(1)} s  ${this.loading ? 'loading' : p.playing ? 'playing' : 'stopped'}`,
      `stems calm / caution / alert ${g}${this.demo >= 0 ? `  ladder: ${DEMO[this.demo]![0]} (${Math.ceil(this.demoLeft)} s)` : ''}`,
      `load ${Math.round(st.decodeMs)} ms  files ${(st.fileBytes / 1e6).toFixed(2)} MB  decoded ${(st.pcmBytes / 1e6).toFixed(1)} MB`,
    ].join('\n');
  }
}
