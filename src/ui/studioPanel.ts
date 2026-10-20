import type { Scene } from '../core/babylon';
import { STUDIO, STUDIO_ENTRIES, STUDIO_PAIR, STUDIO_SPEED, TURN_RATES, studioEntry, studioKey, type StudioSnap } from '../anim/studio';
import { FREE_VIEW, type FreeMode } from '../player/freeView';
import { StudioOverlay } from './studioOverlay';
import type { PanelKit } from './tuneSnapshots';

/** What the studio section drives in the tuner panel (`AnimTunePanel`). */
export interface StudioPanelApi {
  /** The freeze (time scale 0) on / off, and whether it is on. */
  freeze(on: boolean): void;
  frozen(): boolean;
  /** The game speed (the loop's time scale; 0.1-2x in the studio) and its value. */
  setSpeed(v: number): void;
  speed(): number;
  setFreeMode(m: FreeMode): void;
  /** The pad is editing this control, or the mouse holds it (its value must not be rewritten under it). */
  busy(el: HTMLElement): boolean;
}

/**
 * (anim-studio) The "Studio" section at the top of the tuner panel, shown only inside the Anim Studio (`STUDIO.active`):
 * the loop player (the list, play / pause, a key back / forward, scrub, speed, mirror, root motion), the guard figure,
 * the turntable, the viewing aids (skeleton, feet, onion skin) and the camera snaps. Every control carries a `data-pad`
 * key (the pad's focus list, LB / RB lands on the list first). Draws the viewing aids (`StudioOverlay`).
 */
export class StudioPanel {
  readonly el: HTMLDivElement;
  readonly overlay = new StudioOverlay();
  private entrySel: HTMLSelectElement;
  private playBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private fwdBtn: HTMLButtonElement;
  private scrub: HTMLInputElement;
  private readout: HTMLSpanElement;
  private speedIn: HTMLInputElement;
  private speedVal: HTMLSpanElement;
  private mirrorBox: HTMLInputElement;
  private rootBox: HTMLInputElement;
  private shown = false;
  private nextRead = 0;

  constructor(kit: PanelKit, private readonly api: StudioPanelApi) {
    const el = (this.el = document.createElement('div'));
    el.className = 'anim-tune-studio';
    el.dataset.padSec = 'studio';
    el.hidden = true;
    el.style.cssText = 'border:1px solid rgba(143,211,255,0.35);border-radius:3px;padding:2px 4px;margin:3px 0;';
    const h = document.createElement('b');
    h.textContent = 'Studio';
    h.style.cssText = 'display:block;color:#8fd3ff;';
    const note = document.createElement('div');
    note.textContent = 'Loop player: a state walks a 2 m circle; a keyed clip plays in place (treadmill feet) or with root motion on the circle. Pairs: both operators (or Wren and the guard) on one clock; tune each role in its Co-op section (your own role is live in real play, the partner always plays the defaults). Traversal: Wren walks to a prop and plays the move, again and again.';
    note.style.cssText = 'color:#8a98a4;font-size:9px;';
    // the loop list (labels on the options; value = the entry id)
    const b1 = kit.bar();
    this.entrySel = kit.sel(b1, 'loop', STUDIO_ENTRIES.map((e) => e.id), (v) => this.pickEntry(v), 'st:entry', 'studio-entry');
    for (const o of Array.from(this.entrySel.options)) o.textContent = studioEntry(o.value).label;
    this.entrySel.style.maxWidth = '170px';
    this.playBtn = kit.btn('Pause', () => this.api.freeze(!this.api.frozen()), 'st:play', 'studio-play');
    this.backBtn = kit.btn('< key', () => this.step(-1), 'st:back', 'studio-back');
    this.fwdBtn = kit.btn('key >', () => this.step(1), 'st:fwd', 'studio-fwd');
    b1.append(this.playBtn, this.backBtn, this.fwdBtn);
    // scrub and the readout
    const b2 = kit.bar();
    {
      const l = document.createElement('label');
      l.style.cssText = 'display:flex;align-items:center;gap:2px;min-height:28px;flex:1;min-width:120px;';
      const r = (this.scrub = document.createElement('input'));
      r.type = 'range';
      r.min = '0';
      r.max = '0.999';
      r.step = '0.001';
      r.value = '0';
      r.className = 'studio-scrub';
      r.dataset.pad = 'st:scrub';
      r.style.cssText = 'flex:1;min-width:0;height:28px;margin:0;';
      r.addEventListener('input', () => {
        this.api.freeze(true);
        STUDIO.seek = Number(r.value);
      });
      r.addEventListener('change', () => r.blur());
      this.readout = document.createElement('span');
      this.readout.className = 'studio-readout';
      this.readout.style.cssText = 'min-width:96px;';
      l.append('scrub', r, this.readout);
      b2.append(l);
    }
    // speed (the game speed: 0.1-2x here)
    {
      const l = document.createElement('label');
      l.style.cssText = 'display:flex;align-items:center;gap:2px;min-height:28px;flex:1;min-width:120px;';
      const r = (this.speedIn = document.createElement('input'));
      r.type = 'range';
      r.min = String(STUDIO_SPEED.min);
      r.max = String(STUDIO_SPEED.max);
      r.step = String(STUDIO_SPEED.step);
      r.value = '1';
      r.className = 'studio-speed';
      r.dataset.pad = 'st:speed';
      r.style.cssText = 'flex:1;min-width:0;height:28px;margin:0;';
      this.speedVal = document.createElement('span');
      this.speedVal.textContent = '1x';
      r.addEventListener('input', () => this.api.setSpeed(Number(r.value)));
      r.addEventListener('change', () => r.blur());
      l.append('speed', r, this.speedVal);
      b2.append(l);
    }
    const b3 = kit.bar();
    this.mirrorBox = kit.check(b3, 'mirror', false, (v) => (STUDIO.mirror = v), 'st:mirror', 'studio-mirror');
    this.rootBox = kit.check(b3, 'root motion', false, (v) => (STUDIO.rootMotion = v), 'st:root', 'studio-root');
    kit.check(b3, 'guard', false, (v) => (STUDIO.guard = v), 'st:guard', 'studio-guard');
    kit.check(b3, 'turntable', false, (v) => this.setTurntable(v), 'st:turn', 'studio-turn');
    const rate = kit.sel(b3, 'deg/s', TURN_RATES, (v) => (STUDIO.turnRate = Number(v)), 'st:rate', 'studio-rate');
    rate.value = String(STUDIO.turnRate);
    const b4 = kit.bar();
    kit.check(b4, 'skeleton', true, (v) => (STUDIO.skeleton = v), 'st:skel', 'studio-skel');
    kit.check(b4, 'feet', true, (v) => (STUDIO.feet = v), 'st:feet', 'studio-feet');
    kit.check(b4, 'onion skin', false, (v) => (STUDIO.onion = v), 'st:onion', 'studio-onion');
    const b5 = kit.bar();
    b5.append('view');
    for (const s of ['front', 'side', 'back', 'top'] as const) b5.append(kit.btn(s[0]!.toUpperCase() + s.slice(1), () => this.snap(s), `st:${s}`, `studio-snap-${s}`));
    el.append(h, note, b1, b2, b3, b4, b5);
    // (test hook) e2e and the console drive the studio through this
    (window as unknown as { __studio: unknown }).__studio = {
      state: () => ({ ...STUDIO }),
      entries: () => STUDIO_ENTRIES.map((e) => e.id),
      pick: (id: string) => this.setEntry(id),
      play: () => this.api.freeze(false),
      pause: () => this.api.freeze(true),
      frozen: () => this.api.frozen(),
      step: (dir: number) => this.step(dir),
      seek: (v: number) => {
        this.api.freeze(true);
        STUDIO.seek = v;
      },
      mirror: (on: boolean) => this.setBox(this.mirrorBox, on),
      rootMotion: (on: boolean) => this.setBox(this.rootBox, on),
      speed: (v: number) => this.api.setSpeed(v),
      snap: (s: StudioSnap) => this.snap(s),
      // (anim-studio-2) a pair's roles and clock, a traversal loop's progress
      pair: () => ({ ...STUDIO_PAIR }),
    };
  }

  /** Show or hide the section with the studio (and on showing, the controls from the state). */
  sync(): void {
    const on = STUDIO.active;
    this.shown = on;
    this.el.hidden = !on;
    if (!on) {
      this.overlay.clear();
      return;
    }
    if (this.entrySel.value !== STUDIO.entry) this.entrySel.value = STUDIO.entry;
    this.mirrorBox.checked = STUDIO.mirror;
    this.rootBox.checked = STUDIO.rootMotion;
    this.nextRead = 0;
  }

  /** Every frame while the panel is open. */
  frame(nowMs: number, scene: Scene | null): void {
    if (STUDIO.active !== this.shown) this.sync();
    if (!STUDIO.active) return;
    FREE_VIEW.spin = STUDIO.turntable ? (STUDIO.turnRate * Math.PI) / 180 : 0;
    this.overlay.frame(nowMs, scene);
    if (nowMs < this.nextRead) return;
    this.nextRead = nowMs + 100;
    const e = studioEntry(STUDIO.entry);
    const keyed = e.kind === 'keyed';
    const pair = e.kind === 'pair';
    // (anim-studio-2) a pair is on the studio's own clock (scrub and step); a traversal loop is the game's physics (no)
    const inPlace = pair || (keyed && !(STUDIO.rootMotion && e.circle && !(e.guard && STUDIO.guard)));
    const frozen = this.api.frozen();
    const play = frozen ? 'Play' : 'Pause';
    if (this.playBtn.textContent !== play) this.playBtn.textContent = play;
    this.backBtn.disabled = this.fwdBtn.disabled = this.scrub.disabled = !inPlace;
    this.mirrorBox.disabled = !keyed && !(pair && !e.team);
    this.rootBox.disabled = !keyed || !e.circle;
    const n = STUDIO.frames;
    const p = STUDIO_PAIR;
    const at = n > 0 ? `${e.team ? 'frame' : 'key'} ${studioKey(STUDIO.phase, n)}/${n} ${STUDIO.phase.toFixed(3)}${inPlace ? '' : ' (root)'}` : '';
    this.readout.textContent = e.team
      ? `${at} | A ${p.aState}${p.aGroup ? ` [${p.aGroup}]` : ''}${p.k > 0 ? ` contact ${p.k.toFixed(2)}` : ''} | B ${p.bState}${p.bGroup ? ` [${p.bGroup}]` : ''}`
      : e.trav
        ? `${p.travPhase} step ${p.travStep + 1}/${e.trav.steps.length} loop ${p.travLoops} | ${p.attach || p.traverse || 'free'} | tune: ${e.trav.tune}`
        : n > 0
          ? at
          : e.kind === 'state'
            ? 'state (no keys)'
            : '-';
    if (!this.api.busy(this.scrub)) this.scrub.value = String(STUDIO.phase);
    const sp = this.api.speed();
    if (!this.api.busy(this.speedIn)) this.speedIn.value = String(sp);
    this.speedVal.textContent = `${Number(sp.toFixed(2))}x`;
  }

  /** The panel closed: the aids go (the studio itself keeps playing). */
  panelClosed(): void {
    this.overlay.clear();
    this.shown = false;
  }

  private pickEntry(v: string): void {
    STUDIO.entry = studioEntry(v).id;
    this.nextRead = 0;
  }

  private setEntry(id: string): void {
    const e = studioEntry(id);
    this.entrySel.value = e.id;
    this.pickEntry(e.id);
  }

  /** One key back / forward (freezes first). */
  private step(dir: number): void {
    this.api.freeze(true);
    STUDIO.step = dir < 0 ? -1 : 1;
  }

  private setBox(box: HTMLInputElement, on: boolean): void {
    box.checked = on;
    if (box === this.mirrorBox) STUDIO.mirror = on;
    else if (box === this.rootBox) STUDIO.rootMotion = on;
  }

  private setTurntable(v: boolean): void {
    STUDIO.turntable = v;
    if (v && FREE_VIEW.mode !== 'orbit') this.api.setFreeMode('orbit');
  }

  /** A camera snap (the orbit free view comes on for it). */
  private snap(s: StudioSnap): void {
    FREE_VIEW.snap = s;
    if (FREE_VIEW.mode !== 'orbit') this.api.setFreeMode('orbit');
  }
}
