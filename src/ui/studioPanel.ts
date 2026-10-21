import type { Scene } from '../core/babylon';
import { STAGE_LIGHT_RANGE, STUDIO, STUDIO_ENTRIES, STUDIO_LIGHT, STUDIO_PAIR, STUDIO_SPEED, TURN_RATES, stageLightScale, studioEntry, studioKey, type StudioSnap } from '../anim/studio';
import { FREE_VIEW, type FreeMode } from '../player/freeView';
import { StudioOverlay } from './studioOverlay';
import type { PanelKit } from './tuneSnapshots';
import { loopKeyed, loopKeyedPick, plainLoop, plainWords, type LoopKeyed } from './tunerLayout';

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
  /** (tuner-ui) A camera snap that holds (the panel's View tab owns the snaps). */
  lock(s: StudioSnap): void;
  /** (tuner-ui) A loop was picked: the tuner shows the groups it plays through. */
  picked(id: string): void;
  /** (marlow-bays item 14) Save the tuner's own settings (the stage light goes with them). */
  saveUi(): void;
}

/**
 * (anim-studio) The Loop player block at the top of the tuner's View tab, shown only inside the Anim Studio
 * (`STUDIO.active`): the loop list, play / pause, a key back / forward, the time and speed sliders, loop on the spot (or
 * move on the circle), mirror, the guard figure, the turntable, and the viewing aids (skeleton, feet, ghost poses).
 * (tuner-ui) Plain labels; picking a loop sets the tuner's state to match (`api.picked`); the camera snaps moved to the
 * View tab's camera block (they work outside the studio too) and hold. Every control carries a `data-pad` key. Draws
 * the viewing aids (`StudioOverlay`).
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
  private spotBox: HTMLInputElement;
  private turnBox: HTMLInputElement;
  /** (marlow-bays item 14) "Stage light": the studio's following lights and ambient. */
  private stageIn: HTMLInputElement;
  private stageVal: HTMLSpanElement;
  /** (marlow-bays item 11) "Keyed": the loop's state as its keyed clip (ticked) or procedural. */
  private keyedBox: HTMLInputElement;
  private readonly keyedOut: LoopKeyed = { on: false, other: '' };
  private shown = false;
  private nextRead = 0;

  constructor(kit: PanelKit, private readonly api: StudioPanelApi) {
    const el = (this.el = document.createElement('div'));
    el.className = 'anim-tune-studio tt-block';
    el.dataset.padSec = 'studio';
    el.hidden = true;
    const h = document.createElement('b');
    h.textContent = 'Loop player';
    h.className = 'tt-h';
    const note = document.createElement('div');
    note.className = 'tt-note';
    note.textContent = 'Pick a loop: its sliders show in the other tabs. Pairs play both roles on one clock.';
    // the loop list (labels on the options; value = the entry id)
    const b1 = kit.bar();
    this.entrySel = kit.sel(b1, 'Loop', STUDIO_ENTRIES.map((e) => e.id), (v) => this.pickEntry(v), 'st:entry', 'studio-entry');
    for (const o of Array.from(this.entrySel.options)) o.textContent = plainLoop(o.value, studioEntry(o.value).label);
    // (marlow-bays item 11) the state's keyed clip or its procedural loop, one tick (no hunting the list)
    this.keyedBox = kit.check(b1, 'Keyed', false, (v) => this.setKeyed(v), 'st:keyed', 'studio-keyed');
    this.keyedBox.title = 'Ticked: this state plays its keyed clip. Clear: the procedural state.';
    const b2 = kit.bar();
    this.playBtn = kit.btn('Pause', () => this.api.freeze(!this.api.frozen()), 'st:play', 'studio-play');
    this.backBtn = kit.btn('◀ Key', () => this.step(-1), 'st:back', 'studio-back');
    this.fwdBtn = kit.btn('Key ▶', () => this.step(1), 'st:fwd', 'studio-fwd');
    b2.append(this.playBtn, this.backBtn, this.fwdBtn);
    // time (scrub) and the readout
    const b3 = kit.bar();
    {
      const l = document.createElement('label');
      l.className = 'tt-field tt-grow';
      const r = (this.scrub = document.createElement('input'));
      r.type = 'range';
      r.min = '0';
      r.max = '0.999';
      r.step = '0.001';
      r.value = '0';
      r.className = 'studio-scrub';
      r.dataset.pad = 'st:scrub';
      r.addEventListener('input', () => {
        this.api.freeze(true);
        STUDIO.seek = Number(r.value);
      });
      r.addEventListener('change', () => r.blur());
      this.readout = document.createElement('span');
      this.readout.className = 'studio-readout tt-val';
      l.append('Time', r, this.readout);
      b3.append(l);
    }
    // speed (the game speed: 0.1-2x here)
    {
      const l = document.createElement('label');
      l.className = 'tt-field tt-grow';
      const r = (this.speedIn = document.createElement('input'));
      r.type = 'range';
      r.min = String(STUDIO_SPEED.min);
      r.max = String(STUDIO_SPEED.max);
      r.step = String(STUDIO_SPEED.step);
      r.value = '1';
      r.className = 'studio-speed';
      r.dataset.pad = 'st:speed';
      this.speedVal = document.createElement('span');
      this.speedVal.className = 'tt-val';
      this.speedVal.textContent = '1×';
      r.addEventListener('input', () => this.api.setSpeed(Number(r.value)));
      r.addEventListener('change', () => r.blur());
      l.append('Speed', r, this.speedVal);
      b3.append(l);
    }
    const b4 = kit.bar();
    // (tuner-ui) on the spot (a state on a treadmill, a clip in place) or along the 2 m circle
    this.spotBox = kit.check(b4, 'Loop on the spot', STUDIO.spot, (v) => this.setSpot(v), 'st:spot', 'studio-spot');
    this.mirrorBox = kit.check(b4, 'Mirror', false, (v) => (STUDIO.mirror = v), 'st:mirror', 'studio-mirror');
    kit.check(b4, 'Guard', false, (v) => (STUDIO.guard = v), 'st:guard', 'studio-guard');
    const b5 = kit.bar();
    this.turnBox = kit.check(b5, 'Turntable', false, (v) => this.setTurntable(v), 'st:turn', 'studio-turn');
    const rate = kit.sel(b5, 'Turn speed', TURN_RATES, (v) => (STUDIO.turnRate = Number(v)), 'st:rate', 'studio-rate');
    for (const o of Array.from(rate.options)) o.textContent = `${o.value}°/s`;
    rate.value = String(STUDIO.turnRate);
    const b6 = kit.bar();
    kit.check(b6, 'Skeleton', true, (v) => (STUDIO.skeleton = v), 'st:skel', 'studio-skel');
    kit.check(b6, 'Feet', true, (v) => (STUDIO.feet = v), 'st:feet', 'studio-feet');
    kit.check(b6, 'Ghost poses', false, (v) => (STUDIO.onion = v), 'st:onion', 'studio-onion');
    // (marlow-bays item 14) the stage lights that follow her (key, fill, rim, ambient): 0 off .. 2x, 1 bright
    const b7 = kit.bar();
    {
      const l = document.createElement('label');
      l.className = 'tt-field tt-grow';
      const r = (this.stageIn = document.createElement('input'));
      r.type = 'range';
      r.min = String(STAGE_LIGHT_RANGE.min);
      r.max = String(STAGE_LIGHT_RANGE.max);
      r.step = String(STAGE_LIGHT_RANGE.step);
      r.value = String(STUDIO_LIGHT.scale);
      r.className = 'studio-stage-light';
      r.dataset.pad = 'st:stage';
      r.title = 'Stage light: the lights that follow her (key, fill, rim) and the ambient on her';
      this.stageVal = document.createElement('span');
      this.stageVal.className = 'tt-val';
      this.stageVal.textContent = `${STUDIO_LIGHT.scale}×`;
      r.addEventListener('input', () => this.setStage(Number(r.value)));
      r.addEventListener('change', () => {
        r.blur();
        this.api.saveUi();
      });
      l.append('Stage light', r, this.stageVal);
      b7.append(l);
    }
    el.append(h, note, b1, b2, b3, b4, b5, b6, b7);
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
      // (tuner-ui) root motion is "Loop on the spot" off
      rootMotion: (on: boolean) => this.setBox(this.spotBox, !on),
      spot: (on: boolean) => this.setBox(this.spotBox, on),
      speed: (v: number) => this.api.setSpeed(v),
      snap: (s: StudioSnap) => this.api.lock(s),
      // (anim-studio-2) a pair's roles and clock, a traversal loop's progress
      pair: () => ({ ...STUDIO_PAIR }),
      // (marlow-bays item 14) the Stage light slider (as the slider would set it)
      stageLight: (v: number) => {
        this.stageIn.value = String(v);
        this.stageIn.dispatchEvent(new Event('input'));
        this.stageIn.dispatchEvent(new Event('change'));
      },
      // (marlow-bays item 11) the Keyed box: tick it (as a click would), and its state
      keyed: (on: boolean) => {
        if (!this.keyedBox.disabled && this.keyedBox.checked !== on) this.keyedBox.click();
      },
      keyedState: () => ({ checked: this.keyedBox.checked, disabled: this.keyedBox.disabled, entry: STUDIO.entry }),
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
    this.spotBox.checked = STUDIO.spot;
    this.turnBox.checked = STUDIO.turntable;
    this.showStage();
    this.showKeyed();
    this.nextRead = 0;
  }

  /** Every frame while the panel is open. */
  frame(nowMs: number, scene: Scene | null): void {
    if (STUDIO.active !== this.shown) this.sync();
    if (!STUDIO.active) return;
    // (tuner-ui) a held camera snap stops the turntable
    if (FREE_VIEW.lock && STUDIO.turntable) {
      STUDIO.turntable = false;
      this.turnBox.checked = false;
    }
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
    // (tuner-ui) on the spot: a moving state (treadmill) or a clip that can walk the circle
    this.spotBox.disabled = !((e.kind === 'state' && e.pace > 0) || (keyed && e.circle));
    this.showKeyed();
    const n = STUDIO.frames;
    const p = STUDIO_PAIR;
    const at = n > 0 ? `${e.team ? 'frame' : 'key'} ${studioKey(STUDIO.phase, n) + 1}/${n}${inPlace ? '' : ' (moving)'}` : '';
    this.readout.textContent = e.team
      ? `${at} | A ${plainWords(p.aState)}${p.k > 0 ? `, contact ${p.k.toFixed(2)}` : ''} | B ${plainWords(p.bState)}`
      : e.trav
        ? `${plainWords(p.travPhase)}, step ${p.travStep + 1}/${e.trav.steps.length}, loop ${p.travLoops}`
        : n > 0
          ? at
          : e.kind === 'state'
            ? 'live gait'
            : '-';
    if (!this.api.busy(this.scrub)) this.scrub.value = String(STUDIO.phase);
    const sp = this.api.speed();
    if (!this.api.busy(this.speedIn)) this.speedIn.value = String(sp);
    this.speedVal.textContent = `${Number(sp.toFixed(2))}×`;
  }

  /** The panel closed: the aids go (the studio itself keeps playing). */
  panelClosed(): void {
    this.overlay.clear();
    this.shown = false;
  }

  /** (marlow-bays item 14) The Stage light scale (clamped). */
  setStage(v: number): void {
    STUDIO_LIGHT.scale = stageLightScale(v);
    this.showStage();
  }

  private showStage(): void {
    if (!this.api.busy(this.stageIn)) this.stageIn.value = String(STUDIO_LIGHT.scale);
    this.stageVal.textContent = `${Number(STUDIO_LIGHT.scale.toFixed(2))}×`;
  }

  /** (marlow-bays item 13) Play a loop picked elsewhere (a state picked in a tab's list); the list follows. */
  play(id: string): void {
    this.setEntry(id);
  }

  /** (marlow-bays item 13) "Loop on the spot" flipped from the panel's header, its key or the pad (every tab). */
  toggleSpot(): boolean {
    this.setBox(this.spotBox, !STUDIO.spot);
    return STUDIO.spot;
  }

  private pickEntry(v: string): void {
    STUDIO.entry = studioEntry(v).id;
    this.nextRead = 0;
    this.showKeyed();
    this.api.picked(STUDIO.entry);
  }

  private setEntry(id: string): void {
    const e = studioEntry(id);
    this.entrySel.value = e.id;
    this.pickEntry(e.id);
  }

  /** (marlow-bays item 11) The Keyed box: the same loop as its keyed clip (on) or its procedural state (off). */
  private setKeyed(on: boolean): void {
    const next = loopKeyedPick(STUDIO.entry, on);
    if (next !== STUDIO.entry) this.setEntry(next);
    else this.showKeyed();
  }

  /** The Keyed box from the loop playing: ticked on a keyed clip; greyed with no other form (off, pairs, traversal,
   *  the keyed-only clips). */
  private showKeyed(): void {
    const k = loopKeyed(STUDIO.entry, this.keyedOut);
    if (this.keyedBox.checked !== k.on) this.keyedBox.checked = k.on;
    const dis = k.other === '';
    if (this.keyedBox.disabled !== dis) this.keyedBox.disabled = dis;
  }

  /** One key back / forward (freezes first). */
  private step(dir: number): void {
    this.api.freeze(true);
    STUDIO.step = dir < 0 ? -1 : 1;
  }

  private setBox(box: HTMLInputElement, on: boolean): void {
    box.checked = on;
    if (box === this.mirrorBox) STUDIO.mirror = on;
    else if (box === this.spotBox) this.setSpot(on);
  }

  /** (tuner-ui) On the spot: a state on the treadmill, a keyed clip in place (root motion off); else both move. */
  private setSpot(v: boolean): void {
    STUDIO.spot = v;
    STUDIO.rootMotion = !v;
  }

  private setTurntable(v: boolean): void {
    STUDIO.turntable = v;
    if (v) FREE_VIEW.lock = '';
    if (v && FREE_VIEW.mode !== 'orbit') this.api.setFreeMode('orbit');
  }
}
