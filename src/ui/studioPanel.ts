import type { Scene } from '../core/babylon';
import { STAGE_LIGHT_RANGE, STUDIO, STUDIO_ENTRIES, STUDIO_LIGHT, STUDIO_PAIR, STUDIO_RIGS, STUDIO_SPEED, STUDIO_WEAPONS, TURN_RATES, loadStudioCaptures, stageLightScale, studioCapturesLoaded, studioEntry, studioKey, whenStudioCaptures, type StudioSnap, type StudioWeapon } from '../anim/studio';
import { keyClip, keyFrame, keyRank, keyReadout } from '../anim/keyTimeline';
import { FREE_VIEW, type FreeMode } from '../player/freeView';
import { StudioOverlay } from './studioOverlay';
import type { PanelKit } from './tuneSnapshots';
import { footSlideTenths, footSlideText, footSlideWarn, loopKeyed, loopKeyedPick, plainLoop, plainWords, type LoopKeyed } from './tunerLayout';
import { TUNER_KEY_BACK, TUNER_KEY_FWD, TUNER_PLAY_KEY } from './tunerMouse';

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

/** (marlow-bays T1a) The pad's and the keys' names for the playback bar (the hint and the button titles). */
export const PLAYBAR_KEYS = { play: TUNER_PLAY_KEY, back: TUNER_KEY_BACK, fwd: TUNER_KEY_FWD } as const;

/**
 * (anim-studio) The Loop player block at the top of the tuner's View tab, shown only inside the Anim Studio
 * (`STUDIO.active`): the loop list, mirror, the guard figure, the turntable, and the viewing aids (skeleton, feet, ghost
 * poses). (tuner-ui) Plain labels; picking a loop sets the tuner's state to match (`api.picked`); the camera snaps moved
 * to the View tab's camera block (they work outside the studio too) and hold. Every control carries a `data-pad` key.
 * Draws the viewing aids (`StudioOverlay`).
 * (marlow-bays T1a, item 16) The transport is the playback bar (`bar`), docked over every tab by the panel: play /
 * pause, key back / forward (a keyed clip by its keys, a pair by its frames), the time scrub and its readout, the speed
 * and the gun every armed loop plays with (the panel adds "Loop on the spot" to it).
 */
export class StudioPanel {
  readonly el: HTMLDivElement;
  /** (T1a, item 16) The playback bar (the panel docks it under the tabs; hidden outside the studio). */
  readonly bar: HTMLDivElement;
  readonly overlay = new StudioOverlay();
  /** (marlow-bays item 29 phase 2) The viewing aids' bar (skeleton, feet, ghost poses): the panel puts it in More. */
  readonly aids: HTMLDivElement;
  private readonly aidBoxes: HTMLInputElement[];
  /** (track C request) "Foot slide L 0.0 cm  R 0.0 cm" from her rig's `footSlide` (hidden while the rig has none). */
  private slideLine: HTMLDivElement;
  /** The shown values in tenths of a cm (NaN: nothing shown yet). */
  private slideL = Number.NaN;
  private slideR = Number.NaN;
  private entrySel: HTMLSelectElement;
  private playBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private fwdBtn: HTMLButtonElement;
  private scrub: HTMLInputElement;
  private readout: HTMLSpanElement;
  private speedIn: HTMLInputElement;
  private speedVal: HTMLSpanElement;
  private weaponSel: HTMLSelectElement;
  private mirrorBox: HTMLInputElement;
  private turnBox: HTMLInputElement;
  /** (marlow-bays item 14) "Stage light": the studio's following lights and ambient. */
  private stageIn: HTMLInputElement;
  private stageVal: HTMLSpanElement;
  /** (marlow-bays item 11) "Keyed": the loop's state as its keyed clip (ticked) or procedural. */
  private keyedBox: HTMLInputElement;
  private readonly keyedOut: LoopKeyed = { on: false, other: '' };
  private shown = false;
  /** (I9 fix round) The lazy captures were asked for (the Loop list refills once they land; cleared after a failed load). */
  private capWait = false;
  private nextRead = 0;
  /** (tuner-clarity S4) The Now playing line (the panel sets its text: one computation, shown in both places). */
  private readonly playingEl: HTMLDivElement;

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
    // (tuner-clarity S4) the Now playing line, the same text as the panel's header
    const playing = (this.playingEl = document.createElement('div'));
    playing.className = 'studio-playing tt-note';
    // the loop list (labels on the options; value = the entry id)
    const b1 = kit.bar();
    this.entrySel = kit.sel(b1, 'Loop', STUDIO_ENTRIES.map((e) => e.id), (v) => this.pickEntry(v), 'st:entry', 'studio-entry');
    for (const o of Array.from(this.entrySel.options)) o.textContent = plainLoop(o.value, studioEntry(o.value).label);
    // (marlow-bays item 11) the state's keyed clip or its procedural loop, one tick (no hunting the list)
    this.keyedBox = kit.check(b1, 'Keyed', false, (v) => this.setKeyed(v), 'st:keyed', 'studio-keyed');
    this.keyedBox.title = 'Ticked: this state plays its keyed clip. Clear: the procedural state.';
    // --- (T1a, item 16) the playback bar: every tab
    const bar = (this.bar = document.createElement('div'));
    bar.className = 'anim-tune-playbar';
    bar.dataset.padSec = 'playbar';
    bar.hidden = true;
    const p1 = kit.bar();
    this.playBtn = kit.btn('Pause', () => this.playPause(), 'pb:play', 'studio-play');
    this.playBtn.title = `Play / pause (${PLAYBAR_KEYS.play}, pad: right stick up)`;
    this.backBtn = kit.btn('◀ Key', () => this.stepKey(-1), 'pb:back', 'studio-back');
    this.backBtn.title = `One key back (${PLAYBAR_KEYS.back}, pad: right stick left)`;
    this.fwdBtn = kit.btn('Key ▶', () => this.stepKey(1), 'pb:fwd', 'studio-fwd');
    this.fwdBtn.title = `One key forward (${PLAYBAR_KEYS.fwd}, pad: right stick right)`;
    p1.append(this.playBtn, this.backBtn, this.fwdBtn);
    // (T1a, item 19) the gun every armed loop plays with
    this.weaponSel = kit.sel(p1, 'Gun', STUDIO_WEAPONS, (v) => this.setWeapon(v as StudioWeapon), 'pb:weapon', 'studio-weapon');
    for (const o of Array.from(this.weaponSel.options)) o.textContent = plainWords(o.value);
    this.weaponSel.value = STUDIO.weapon;
    // time (scrub) and the readout
    const p2 = kit.bar();
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
      r.dataset.pad = 'pb:scrub';
      r.addEventListener('input', () => {
        this.api.freeze(true);
        STUDIO.seek = Number(r.value);
      });
      r.addEventListener('change', () => r.blur());
      l.append('Time', r);
      p2.append(l);
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
      r.dataset.pad = 'pb:speed';
      this.speedVal = document.createElement('span');
      this.speedVal.className = 'tt-val';
      this.speedVal.textContent = '1×';
      r.addEventListener('input', () => this.api.setSpeed(Number(r.value)));
      r.addEventListener('change', () => r.blur());
      l.append('Speed', r, this.speedVal);
      p2.append(l);
    }
    this.readout = document.createElement('div');
    this.readout.className = 'studio-readout tt-note';
    // (track C request) the planted feet's slide this contact, under the readout; amber over FOOT_SLIDE_WARN
    this.slideLine = document.createElement('div');
    this.slideLine.className = 'studio-slide tt-note';
    this.slideLine.hidden = true;
    bar.append(p1, p2, this.readout, this.slideLine);
    // --- the rest of the Loop player (View tab)
    const b4 = kit.bar();
    this.mirrorBox = kit.check(b4, 'Mirror', false, (v) => (STUDIO.mirror = v), 'st:mirror', 'studio-mirror');
    kit.check(b4, 'Guard', false, (v) => (STUDIO.guard = v), 'st:guard', 'studio-guard');
    const b5 = kit.bar();
    this.turnBox = kit.check(b5, 'Turntable', false, (v) => this.setTurntable(v), 'st:turn', 'studio-turn');
    const rate = kit.sel(b5, 'Turn speed', TURN_RATES, (v) => (STUDIO.turnRate = Number(v)), 'st:rate', 'studio-rate');
    for (const o of Array.from(rate.options)) o.textContent = `${o.value}°/s`;
    rate.value = String(STUDIO.turnRate);
    // (marlow-bays item 29 phase 2) the viewing aids: off by default, in the panel's More ("View aids", `aids`)
    const b6 = (this.aids = kit.bar());
    this.aidBoxes = [
      kit.check(b6, 'Skeleton', STUDIO.skeleton, (v) => (STUDIO.skeleton = v), 'st:skel', 'studio-skel'),
      kit.check(b6, 'Feet', STUDIO.feet, (v) => (STUDIO.feet = v), 'st:feet', 'studio-feet'),
      kit.check(b6, 'Ghost poses', STUDIO.onion, (v) => (STUDIO.onion = v), 'st:onion', 'studio-onion'),
    ];
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
    el.append(h, note, playing, b1, b4, b5, b7);
    // (test hook) e2e and the console drive the studio through this
    (window as unknown as { __studio: unknown }).__studio = {
      state: () => ({ ...STUDIO }),
      entries: () => STUDIO_ENTRIES.map((e) => e.id),
      // (mixamo-retarget I9 fix round) batch 2's lazy captures: in yet, and a wait for them (the loop count after)
      capturesLoaded: () => studioCapturesLoaded(),
      loadCaptures: () =>
        loadStudioCaptures().then(() => {
          if (studioCapturesLoaded()) this.refreshEntries();
          return STUDIO_ENTRIES.length;
        }),
      pick: (id: string) => this.setEntry(id),
      play: () => this.api.freeze(false),
      pause: () => this.api.freeze(true),
      frozen: () => this.api.frozen(),
      // (T1a) one key back / forward (a keyed clip by its keys, a pair by its frames), as the bar's buttons
      step: (dir: number) => this.stepKey(dir),
      // (T1a, item 15) a clip paused on one of its keys (as the Keys tab's pick)
      showKey: (clip: string, key: number) => this.showKey(clip, key),
      seek: (v: number) => {
        this.api.freeze(true);
        STUDIO.seek = v;
      },
      mirror: (on: boolean) => this.setBox(this.mirrorBox, on),
      // (tuner-ui) root motion is "Loop on the spot" off
      rootMotion: (on: boolean) => this.setSpot(!on),
      spot: (on: boolean) => this.setSpot(on),
      speed: (v: number) => this.api.setSpeed(v),
      snap: (s: StudioSnap) => this.api.lock(s),
      // (T1a, item 19) the gun pick, as the bar's list sets it
      weapon: (w: StudioWeapon) => this.setWeapon(w),
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
      // (T1a) the playback bar's readout and whether it shows
      readout: () => ({ text: this.readout.textContent ?? '', shown: !this.bar.hidden }),
      // (tuner-clarity S4) the Loop player's Now playing line
      playing: () => this.playingEl.textContent ?? '',
      // (item 29 phase 2) the view aids and the foot slide line
      aids: () => ({ skeleton: STUDIO.skeleton, feet: STUDIO.feet, onion: STUDIO.onion, inMore: !!this.aids.closest('.anim-tune-more') }),
      slide: () => ({ text: this.slideLine.textContent ?? '', shown: !this.slideLine.hidden, warn: this.slideLine.classList.contains('warn') }),
    };
  }

  /** (I9 fix round) The Loop list's options from `STUDIO_ENTRIES` again (after the lazy captures joined it). */
  private refreshEntries(): void {
    const s = this.entrySel;
    s.replaceChildren();
    for (const e of STUDIO_ENTRIES) {
      const o = document.createElement('option');
      o.value = e.id;
      o.textContent = plainLoop(e.id, e.label);
      s.append(o);
    }
    s.value = STUDIO.entry;
  }

  /** (tuner-clarity S4) The Now playing text (the panel's one computation). */
  setPlaying(text: string): void {
    if (this.playingEl.textContent !== text) this.playingEl.textContent = text;
  }

  /** Show or hide the section with the studio (and on showing, the controls from the state). */
  sync(): void {
    const on = STUDIO.active;
    this.shown = on;
    this.el.hidden = !on;
    this.bar.hidden = !on;
    if (!on) {
      this.overlay.clear();
      return;
    }
    // (mixamo-retarget I9 fix round; I9 polish) batch 2's captures load once as the Studio opens: the Loop list refills
    // when they land, also when they landed before this first sync; after a failed load the next sync asks again
    if (!this.capWait) {
      this.capWait = true;
      void whenStudioCaptures(() => this.refreshEntries(), () => {
        this.capWait = false;
      });
    }
    if (this.entrySel.value !== STUDIO.entry) this.entrySel.value = STUDIO.entry;
    this.mirrorBox.checked = STUDIO.mirror;
    this.turnBox.checked = STUDIO.turntable;
    // (the studio resets its switches on entry: the boxes show what is drawn)
    this.aidBoxes[0]!.checked = STUDIO.skeleton;
    this.aidBoxes[1]!.checked = STUDIO.feet;
    this.aidBoxes[2]!.checked = STUDIO.onion;
    this.weaponSel.value = STUDIO.weapon;
    this.showStage();
    this.showKeyed();
    this.nextRead = 0;
  }

  /**
   * (track C request) The foot slide line from her rig's optional `footSlide` ({ l, r } cm this contact; absent before
   * track C's S4: the line hides). The text is set only when a rounded value changes (no per-frame allocation).
   */
  private showSlide(): void {
    const fs = (STUDIO_RIGS[0] as { footSlide?: { l: number; r: number } } | undefined)?.footSlide;
    if (!fs) {
      if (!this.slideLine.hidden) this.slideLine.hidden = true;
      this.slideL = this.slideR = Number.NaN;
      return;
    }
    if (this.slideLine.hidden) this.slideLine.hidden = false;
    const l = footSlideTenths(fs.l ?? 0);
    const r = footSlideTenths(fs.r ?? 0);
    if (l === this.slideL && r === this.slideR) return;
    this.slideL = l;
    this.slideR = r;
    this.slideLine.textContent = footSlideText(l, r);
    this.slideLine.classList.toggle('warn', footSlideWarn(l, r));
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
    this.showSlide();
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
    this.showKeyed();
    if (this.weaponSel.value !== STUDIO.weapon) this.weaponSel.value = STUDIO.weapon;
    const t = this.readText(e, inPlace);
    if (this.readout.textContent !== t) this.readout.textContent = t;
    if (!this.api.busy(this.scrub)) this.scrub.value = String(STUDIO.phase);
    const sp = this.api.speed();
    if (!this.api.busy(this.speedIn)) this.speedIn.value = String(sp);
    this.speedVal.textContent = `${Number(sp.toFixed(2))}×`;
  }

  /** The bar's readout: the loop, then its key ("jog - key 2 of 8 (mirror of 6), frame 4"), a pair's roles, a loop's step. */
  private readText(e: ReturnType<typeof studioEntry>, inPlace: boolean): string {
    const n = STUDIO.frames;
    const p = STUDIO_PAIR;
    const name = plainLoop(e.id, e.label);
    if (e.team) return `${name} | frame ${studioKey(STUDIO.phase, n) + 1}/${n} | A ${plainWords(p.aState)}${p.k > 0 ? `, contact ${p.k.toFixed(2)}` : ''} | B ${plainWords(p.bState)}`;
    if (e.trav) return `${name} | ${plainWords(p.travPhase)}, step ${p.travStep + 1}/${e.trav.steps.length}, loop ${p.travLoops}`;
    if (e.clip) {
      const c = keyClip(e.clip.name);
      const moving = inPlace ? '' : ' (moving: loop on the spot to step keys)';
      if (c && STUDIO.key >= 0) {
        if (STUDIO.onKey) return `${keyReadout(c, STUDIO.key)}${moving}`;
        return `${c.name} - between keys (nearest key ${keyRank(c, STUDIO.key) + 1}, frame ${keyFrame(c, STUDIO.key)}), frame ${Math.round(STUDIO.phase * n) % n}${moving}`;
      }
      return `${name} | frame ${studioKey(STUDIO.phase, n) + 1}/${n}${moving}`;
    }
    // (marlow-bays item 24, track A) a guard loop: the guard puppet's live gait (with its own gun)
    if (e.kind === 'guard') return `${name} | live gait, guard puppet`;
    return e.kind === 'state' ? `${name} | live gait${e.drawn ? `, ${STUDIO.weapon}` : ''}` : name;
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

  /** (marlow-bays item 13) "Loop on the spot" flipped from the playback bar, its key or the pad (every tab). */
  toggleSpot(): boolean {
    this.setSpot(!STUDIO.spot);
    return STUDIO.spot;
  }

  /** (T1a, item 16) Play / pause (the bar, F9, the pad's right stick up). */
  playPause(): void {
    this.api.freeze(!this.api.frozen());
  }

  /**
   * (T1a, item 15) One key back / forward (freezes first): a keyed clip steps to its next key (the mirrored half too), a
   * pair one frame. The bar, F1 / F2, the pad's right stick, the Keys tab's buttons.
   */
  stepKey(dir: number): void {
    this.api.freeze(true);
    STUDIO.keyStep = dir < 0 ? -1 : 1;
  }

  /**
   * (T1a, item 15) The Keys tab's pick: clip `clip` plays in place (loop on the spot) paused on its key `key` (0-based,
   * the mirrored half's keys after the own keys). The loop list follows.
   */
  showKey(clip: string, key: number): void {
    const id = `keyed:${clip}`;
    if (studioEntry(id).id !== id) return;
    if (!STUDIO.spot) this.setSpot(true);
    if (STUDIO.entry !== id) this.setEntry(id);
    this.api.freeze(true);
    STUDIO.seekKey = Math.max(0, key);
  }

  /** (T1a, item 19) The gun every armed loop plays with (the bar's list, a weapon picked in a tab). */
  setWeapon(w: StudioWeapon): void {
    if (w !== 'rifle' && w !== 'pistol') return;
    STUDIO.weapon = w;
    if (this.weaponSel.value !== w) this.weaponSel.value = w;
    this.nextRead = 0;
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

  private setBox(box: HTMLInputElement, on: boolean): void {
    box.checked = on;
    if (box === this.mirrorBox) STUDIO.mirror = on;
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
