/**
 * The music lab: a debug screen for Michael's ears (`?musiclab=1`, or Settings > Audio > Music lab with `?debug=1`).
 * The motif picker comes first. It drives the same `Music` object the game uses, and exports a 60 s WAV rendered
 * offline so the score can be heard on a phone or in headphones away from the PC.
 */
import type { App } from '../../core/app';
import { h } from '../../ui/dom';
import { shareOrDownload } from '../../ui/fileOut';
import { Screen } from '../../ui/screen';
import { button, section } from '../../ui/widgets';
import { STEMS, type MusicState, type Stem } from './conductor';
import { CANDIDATES, type Take } from './candidates';
import type { ExportKind } from './offline';
import { encodeWav } from './wav';

const STATE_BUTTONS: { state: MusicState; label: string; sub: string }[] = [
  { state: 'calm', label: 'Calm', sub: 'Near-silent air' },
  { state: 'combat', label: 'Combat', sub: '168 BPM break' },
];

export class MusicLabScreen extends Screen {
  override modal = false;
  private status = h('pre', { class: 'lab-status', text: 'Tap a button to start the audio.' });
  private exportNote = h('div', { class: 'row-note', text: '' });
  private stateBtns = new Map<MusicState, HTMLButtonElement>();
  private seedLabel = h('span', { class: 'lab-val' });
  private nudgeLabel = h('span', { class: 'lab-val' });
  private since = 0;

  constructor(private app: App) {
    super('music-lab');
    const m = app.music;
    // every button starts the music engine first (the first tap is also the audio unlock)
    const go = (fn: () => void): void => {
      m.start();
      void m.whenReady().then(fn);
    };
    // the motif picker (V1): each candidate on a bell, as the Alert hook and as the menu opening
    const picker: HTMLElement[] = [];
    for (const c of CANDIDATES) {
      const first = c.id === CANDIDATES[0]!.id;
      const take = (label: string, t: Take | 'all', primary = false): HTMLButtonElement =>
        button(label, () => go(() => void m.playCandidate(c.id, t)), { class: primary ? 'primary' : '', autofocus: primary && first });
      picker.push(
        h('div', { class: 'row-note', text: `${c.id} - ${c.name}: ${c.notes}. ${c.about}` }),
        h(
          'div',
          { class: 'lab-row' },
          take(`Play ${c.id}`, 'all', true),
          take(`${c.id} sneak`, 'sneak'),
          take(`${c.id} break`, 'break'),
          take(`${c.id} noir`, 'noir'),
          button(`${c.id} 60 s WAV`, () => go(() => void this.export(`cand${c.id}`)), { class: 'subtle' }),
        ),
      );
    }

    const stateRow = h('div', { class: 'lab-row' });
    for (const s of STATE_BUTTONS) {
      const b = button(s.label, () => go(() => this.setState(s.state)), { sub: s.sub });
      this.stateBtns.set(s.state, b);
      stateRow.append(b);
    }
    stateRow.append(
      button('Stop', () => {
        m.stop();
        this.markState(null);
      }, { class: 'subtle' }),
    );

    const seedRow = h(
      'div',
      { class: 'lab-row' },
      h('span', { class: 'lab-key', text: 'Seed' }),
      button('-', () => this.seed(-1), { class: 'subtle lab-step' }),
      this.seedLabel,
      button('+', () => this.seed(1), { class: 'subtle lab-step' }),
      button('Random', () => this.seed(0), { class: 'subtle' }),
    );
    const nudgeRow = h(
      'div',
      { class: 'lab-row' },
      h('span', { class: 'lab-key', text: 'Tempo' }),
      button('-', () => this.nudge(-2), { class: 'subtle lab-step' }),
      this.nudgeLabel,
      button('+', () => this.nudge(2), { class: 'subtle lab-step' }),
    );

    const stemRow = h('div', { class: 'lab-row' });
    for (const s of STEMS) {
      const b = button(s, () => {
        m.setStemMuted(s, !m.isStemMuted(s));
        b.classList.toggle('lab-muted', m.isStemMuted(s));
      }, { class: 'subtle lab-stem' });
      b.title = `Mute ${s}`;
      stemRow.append(b);
    }

    const exp = (label: string, kind: ExportKind): HTMLButtonElement => button(label, () => go(() => void this.export(kind)));

    this.el.append(
      h('div', { class: 'screen-title', text: 'Music lab' }),
      this.status,
      section('Motif picker', ...picker, h('div', { class: 'row-note', text: 'D to H are new figures built around the tritone. Play runs sneak (84 BPM downtempo), break (168 breakbeat) and noir (70, the menu opening) back to back. Pick one, or ask for more. Does any remind you of a known theme? Tell Claude and it gets rewritten.' })),
      section('State', stateRow),
      section('Seed and tempo', seedRow, nudgeRow),
      section('Mute stems', stemRow),
      section('Export', h('div', { class: 'lab-row' }, exp('Calm 60 s WAV', 'calm'), exp('Combat 60 s WAV', 'combat'), exp('Motif WAV', 'motif')), this.exportNote),
    );
    this.refresh();
  }

  private setState(s: MusicState): void {
    this.app.music.setState(s);
    this.markState(s);
  }

  private markState(s: MusicState | null): void {
    for (const [k, b] of this.stateBtns) b.classList.toggle('lab-on', k === s);
  }

  private seed(dir: number): void {
    const m = this.app.music;
    m.setSeed(dir === 0 ? Math.floor(Math.random() * 100000) : Math.max(0, m.getSeed() + dir));
    this.refresh();
  }

  private nudge(d: number): void {
    const m = this.app.music;
    m.setBpmNudge(Math.max(-8, Math.min(8, m.getBpmNudge() + d)));
    this.refresh();
  }

  private async export(kind: ExportKind): Promise<void> {
    const m = this.app.music;
    const muted = STEMS.filter((s: Stem) => m.isStemMuted(s));
    const seconds = kind === 'motif' ? 22 : 60;
    this.exportNote.textContent = `Rendering ${seconds} s of ${kind}…`;
    try {
      const r = await m.renderExport(kind, seconds, muted);
      if (!r) {
        this.exportNote.textContent = 'The library is not ready yet.';
        return;
      }
      const wav = encodeWav([r.left, r.right], r.rate);
      const name = `night-shift-${kind}-seed${m.getSeed()}.wav`;
      shareOrDownload(new Blob([wav as BlobPart], { type: 'audio/wav' }), name, 'Night Shift music');
      this.exportNote.textContent = `${name}: peak ${r.peakDb.toFixed(1)} dBFS, RMS ${r.rmsDb.toFixed(1)} dBFS, up to ${r.peakVoices} voices.`;
    } catch (e) {
      this.exportNote.textContent = `Export failed: ${(e as Error).message}`;
    }
  }

  private refresh(): void {
    const m = this.app.music;
    this.seedLabel.textContent = String(m.getSeed());
    const n = m.getBpmNudge();
    this.nudgeLabel.textContent = `${n >= 0 ? '+' : ''}${n} BPM`;
  }

  override update(dt: number): void {
    this.since += dt;
    if (this.since < 0.25) return;
    this.since = 0;
    const m = this.app.music;
    const st = m.stats();
    if (!m.ready) {
      this.status.textContent = m.progress > 0 ? `Rendering the sound library… ${Math.round(m.progress * 100)}%` : 'Tap a button to start the audio.';
      return;
    }
    const lines = [`library ${Math.round(m.renderMs)} ms  state ${m.state}  tempo ${m.tempo() ? m.tempo().toFixed(0) + ' BPM' : 'free'}`];
    if (st) lines.push(`voices ${st.active} now, ${st.peak} peak (cap 24)  played ${st.played}  stolen ${st.stolen}  refused ${st.refused}  late ${st.late}`);
    this.status.textContent = lines.join('\n');
  }
}
