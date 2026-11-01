import type { Scene } from '../core/babylon';
import { CHAMBER_SET_LABEL, CHAMBER_SETS, chamberEntriesOf, type ChamberSet } from '../anim/chamber'; // (mixamo-retarget Toggle)
import { STAGE_LIGHT_RANGE, CHAMBER, CHAMBER_ENTRIES, CHAMBER_LIGHT, CHAMBER_PAIR, CHAMBER_RIGS, CHAMBER_SPEED, CHAMBER_WEAPONS, TURN_RATES, loadChamberCaptures, stageLightScale, chamberCapturesLoaded, chamberEntry, chamberKey, whenChamberCaptures, type ChamberSnap, type ChamberWeapon } from '../anim/chamber';
import { keyClip, keyFrame, keyRank, keyReadout } from '../anim/keyTimeline';
import { FREE_VIEW, type FreeMode } from '../player/freeView';
import { ChamberOverlay } from './chamberOverlay';
import type { PanelKit } from './tuneSnapshots';
import { footSlideTenths, footSlideText, footSlideWarn, loopKeyed, loopKeyedPick, plainLoop, plainWords, type LoopKeyed } from './tunerLayout';
import { TUNER_KEY_BACK, TUNER_KEY_FWD, TUNER_PLAY_KEY } from './tunerMouse';

/** What the chamber section drives in the tuner panel (`AnimTunePanel`). */
export interface ChamberPanelApi {
  /** The freeze (time scale 0) on / off, and whether it is on. */
  freeze(on: boolean): void;
  frozen(): boolean;
  /** The game speed (the loop's time scale; 0.1-2x in the chamber) and its value. */
  setSpeed(v: number): void;
  speed(): number;
  setFreeMode(m: FreeMode): void;
  /** The pad is editing this control, or the mouse holds it (its value must not be rewritten under it). */
  busy(el: HTMLElement): boolean;
  /** (tuner-ui) A camera snap that holds (the panel's View tab owns the snaps). */
  lock(s: ChamberSnap): void;
  /** (tuner-ui) A loop was picked: the tuner shows the groups it plays through. */
  picked(id: string): void;
  /** (marlow-bays item 14) Save the tuner's own settings (the stage light goes with them). */
  saveUi(): void;
  /** (mixamo-retarget Toggle) The game's Animation source (Options > Gameplay; saved with the settings), null: no host. */
  animSource(): string | null;
  setAnimSource(s: string): void;
}

/** (marlow-bays T1a) The pad's and the keys' names for the playback bar (the hint and the button titles). */
export const PLAYBAR_KEYS = { play: TUNER_PLAY_KEY, back: TUNER_KEY_BACK, fwd: TUNER_KEY_FWD } as const;

/**
 * (anim-studio) The Loop player block at the top of the tuner's View tab, shown only inside the Test Chamber
 * (`CHAMBER.active`): the loop list, mirror, the guard figure, the turntable, and the viewing aids (skeleton, feet, ghost
 * poses). (tuner-ui) Plain labels; picking a loop sets the tuner's state to match (`api.picked`); the camera snaps moved
 * to the View tab's camera block (they work outside the chamber too) and hold. Every control carries a `data-pad` key.
 * Draws the viewing aids (`ChamberOverlay`).
 * (marlow-bays T1a, item 16) The transport is the playback bar (`bar`), docked over every tab by the panel: play /
 * pause, key back / forward (a keyed clip by its keys, a pair by its frames), the time scrub and its readout, the speed
 * and the gun every armed loop plays with (the panel adds "Loop on the spot" to it).
 */
export class ChamberPanel {
  readonly el: HTMLDivElement;
  /** (T1a, item 16) The playback bar (the panel docks it under the tabs; hidden outside the chamber). */
  readonly bar: HTMLDivElement;
  readonly overlay = new ChamberOverlay();
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
  /** (marlow-bays item 14) "Stage light": the chamber's following lights and ambient. */
  private stageIn: HTMLInputElement;
  private stageVal: HTMLSpanElement;
  /** (marlow-bays item 11) "Keyed": the loop's state as its keyed clip (ticked) or procedural. */
  private keyedBox: HTMLInputElement;
  /** (mixamo-retarget Toggle) The Loop list's set filter and the game's Animation source. */
  private setSel: HTMLSelectElement;
  private srcSel: HTMLSelectElement;
  private readonly keyedOut: LoopKeyed = { on: false, other: '' };
  private shown = false;
  /** (I9 fix round) The lazy captures were asked for (the Loop list refills once they land; cleared after a failed load). */
  private capWait = false;
  private nextRead = 0;
  /** (tuner-clarity S4) The Now playing line (the panel sets its text: one computation, shown in both places). */
  private readonly playingEl: HTMLDivElement;

  constructor(kit: PanelKit, private readonly api: ChamberPanelApi) {
    const el = (this.el = document.createElement('div'));
    el.className = 'anim-tune-chamber tt-block';
    el.dataset.padSec = 'chamber';
    el.hidden = true;
    const h = document.createElement('b');
    h.textContent = 'Loop player';
    h.className = 'tt-h';
    const note = document.createElement('div');
    note.className = 'tt-note';
    note.textContent = 'Pick a loop: its sliders show in the other tabs. Pairs play both roles on one clock.';
    // (tuner-clarity S4) the Now playing line, the same text as the panel's header
    const playing = (this.playingEl = document.createElement('div'));
    playing.className = 'chamber-playing tt-note';
    // the loop list (labels on the options; value = the entry id)
    const b1 = kit.bar();
    this.entrySel = kit.sel(b1, 'Loop', CHAMBER_ENTRIES.map((e) => e.id), (v) => this.pickEntry(v), 'st:entry', 'chamber-entry');
    for (const o of Array.from(this.entrySel.options)) o.textContent = plainLoop(o.value, chamberEntry(o.value).label);
    // (marlow-bays item 11) the state's keyed clip or its procedural loop, one tick (no hunting the list)
    this.keyedBox = kit.check(b1, 'Keyed', false, (v) => this.setKeyed(v), 'st:keyed', 'chamber-keyed');
    this.keyedBox.title = 'Ticked: this state plays its keyed clip. Clear: the procedural state.';
    // (mixamo-retarget Toggle) the animation-set filter on the Loop list (Hand-made / CMU / Mixamo / All), and the game's
    // Animation source (the same setting as Options > Gameplay): compare one move across the three sets
    const b0 = kit.bar();
    this.setSel = kit.sel(b0, 'Set', CHAMBER_SETS, (v) => this.setSet(v as ChamberSet), 'st:set', 'chamber-set');
    for (const o of Array.from(this.setSel.options)) o.textContent = CHAMBER_SET_LABEL[o.value as ChamberSet];
    this.setSel.value = 'all';
    this.srcSel = kit.sel(b0, 'Animation source', ['hand', 'cmu', 'mixamo'], (v) => this.api.setAnimSource(v), 'st:source', 'chamber-source');
    for (const o of Array.from(this.srcSel.options)) o.textContent = CHAMBER_SET_LABEL[o.value as ChamberSet];
    this.srcSel.value = this.api.animSource() ?? 'cmu';
    this.srcSel.disabled = this.api.animSource() === null;
    // --- (T1a, item 16) the playback bar: every tab
    const bar = (this.bar = document.createElement('div'));
    bar.className = 'anim-tune-playbar';
    bar.dataset.padSec = 'playbar';
    bar.hidden = true;
    const p1 = kit.bar();
    this.playBtn = kit.btn('Pause', () => this.playPause(), 'pb:play', 'chamber-play');
    this.playBtn.title = `Play / pause (${PLAYBAR_KEYS.play}, pad: right stick up)`;
    this.backBtn = kit.btn('◀ Key', () => this.stepKey(-1), 'pb:back', 'chamber-back');
    this.backBtn.title = `One key back (${PLAYBAR_KEYS.back}, pad: right stick left)`;
    this.fwdBtn = kit.btn('Key ▶', () => this.stepKey(1), 'pb:fwd', 'chamber-fwd');
    this.fwdBtn.title = `One key forward (${PLAYBAR_KEYS.fwd}, pad: right stick right)`;
    p1.append(this.playBtn, this.backBtn, this.fwdBtn);
    // (T1a, item 19) the gun every armed loop plays with
    this.weaponSel = kit.sel(p1, 'Gun', CHAMBER_WEAPONS, (v) => this.setWeapon(v as ChamberWeapon), 'pb:weapon', 'chamber-weapon');
    for (const o of Array.from(this.weaponSel.options)) o.textContent = plainWords(o.value);
    this.weaponSel.value = CHAMBER.weapon;
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
      r.className = 'chamber-scrub';
      r.dataset.pad = 'pb:scrub';
      r.addEventListener('input', () => {
        this.api.freeze(true);
        CHAMBER.seek = Number(r.value);
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
      r.min = String(CHAMBER_SPEED.min);
      r.max = String(CHAMBER_SPEED.max);
      r.step = String(CHAMBER_SPEED.step);
      r.value = '1';
      r.className = 'chamber-speed';
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
    this.readout.className = 'chamber-readout tt-note';
    // (track C request) the planted feet's slide this contact, under the readout; amber over FOOT_SLIDE_WARN
    this.slideLine = document.createElement('div');
    this.slideLine.className = 'chamber-slide tt-note';
    this.slideLine.hidden = true;
    bar.append(p1, p2, this.readout, this.slideLine);
    // --- the rest of the Loop player (View tab)
    const b4 = kit.bar();
    this.mirrorBox = kit.check(b4, 'Mirror', false, (v) => (CHAMBER.mirror = v), 'st:mirror', 'chamber-mirror');
    kit.check(b4, 'Guard', false, (v) => (CHAMBER.guard = v), 'st:guard', 'chamber-guard');
    const b5 = kit.bar();
    this.turnBox = kit.check(b5, 'Turntable', false, (v) => this.setTurntable(v), 'st:turn', 'chamber-turn');
    const rate = kit.sel(b5, 'Turn speed', TURN_RATES, (v) => (CHAMBER.turnRate = Number(v)), 'st:rate', 'chamber-rate');
    for (const o of Array.from(rate.options)) o.textContent = `${o.value}°/s`;
    rate.value = String(CHAMBER.turnRate);
    // (marlow-bays item 29 phase 2) the viewing aids: off by default, in the panel's More ("View aids", `aids`)
    const b6 = (this.aids = kit.bar());
    this.aidBoxes = [
      kit.check(b6, 'Skeleton', CHAMBER.skeleton, (v) => (CHAMBER.skeleton = v), 'st:skel', 'chamber-skel'),
      kit.check(b6, 'Feet', CHAMBER.feet, (v) => (CHAMBER.feet = v), 'st:feet', 'chamber-feet'),
      kit.check(b6, 'Ghost poses', CHAMBER.onion, (v) => (CHAMBER.onion = v), 'st:onion', 'chamber-onion'),
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
      r.value = String(CHAMBER_LIGHT.scale);
      r.className = 'chamber-stage-light';
      r.dataset.pad = 'st:stage';
      r.title = 'Stage light: the lights that follow her (key, fill, rim) and the ambient on her';
      this.stageVal = document.createElement('span');
      this.stageVal.className = 'tt-val';
      this.stageVal.textContent = `${CHAMBER_LIGHT.scale}×`;
      r.addEventListener('input', () => this.setStage(Number(r.value)));
      r.addEventListener('change', () => {
        r.blur();
        this.api.saveUi();
      });
      l.append('Stage light', r, this.stageVal);
      b7.append(l);
    }
    el.append(h, note, playing, b0, b1, b4, b5, b7);
    // (test hook) e2e and the console drive the chamber through this
    (window as unknown as { __chamber: unknown }).__chamber = {
      state: () => ({ ...CHAMBER }),
      entries: () => CHAMBER_ENTRIES.map((e) => e.id),
      // (mixamo-retarget I9 fix round) batch 2's lazy captures: in yet, and a wait for them (the loop count after)
      capturesLoaded: () => chamberCapturesLoaded(),
      loadCaptures: () =>
        loadChamberCaptures().then(() => {
          if (chamberCapturesLoaded()) this.refreshEntries();
          return CHAMBER_ENTRIES.length;
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
        CHAMBER.seek = v;
      },
      mirror: (on: boolean) => this.setBox(this.mirrorBox, on),
      // (tuner-ui) root motion is "Loop on the spot" off
      rootMotion: (on: boolean) => this.setSpot(!on),
      spot: (on: boolean) => this.setSpot(on),
      speed: (v: number) => this.api.setSpeed(v),
      snap: (s: ChamberSnap) => this.api.lock(s),
      // (T1a, item 19) the gun pick, as the bar's list sets it
      weapon: (w: ChamberWeapon) => this.setWeapon(w),
      // (anim-studio-2) a pair's roles and clock, a traversal loop's progress
      pair: () => ({ ...CHAMBER_PAIR }),
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
      keyedState: () => ({ checked: this.keyedBox.checked, disabled: this.keyedBox.disabled, entry: CHAMBER.entry }),
      // (T1a) the playback bar's readout and whether it shows
      readout: () => ({ text: this.readout.textContent ?? '', shown: !this.bar.hidden }),
      // (tuner-clarity S4) the Loop player's Now playing line
      playing: () => this.playingEl.textContent ?? '',
      // (item 29 phase 2) the view aids and the foot slide line
      aids: () => ({ skeleton: CHAMBER.skeleton, feet: CHAMBER.feet, onion: CHAMBER.onion, inMore: !!this.aids.closest('.anim-tune-more') }),
      slide: () => ({ text: this.slideLine.textContent ?? '', shown: !this.slideLine.hidden, warn: this.slideLine.classList.contains('warn') }),
    };
  }

  /** (I9 fix round) The Loop list's options from `CHAMBER_ENTRIES` again (after the lazy captures joined it), under the
   *  Set filter (Toggle) so a picked set keeps showing only its loops. */
  private refreshEntries(): void {
    this.setSet(this.setSel.value as ChamberSet);
    if (chamberEntriesOf(this.setSel.value as ChamberSet).includes(CHAMBER.entry)) this.entrySel.value = CHAMBER.entry;
  }

  /** (tuner-clarity S4) The Now playing text (the panel's one computation). */
  setPlaying(text: string): void {
    if (this.playingEl.textContent !== text) this.playingEl.textContent = text;
  }

  /** Show or hide the section with the chamber (and on showing, the controls from the state). */
  sync(): void {
    const on = CHAMBER.active;
    this.shown = on;
    this.el.hidden = !on;
    this.bar.hidden = !on;
    if (!on) {
      this.overlay.clear();
      return;
    }
    // (mixamo-retarget I9 fix round; I9 polish) batch 2's captures load once as the Chamber opens: the Loop list refills
    // when they land, also when they landed before this first sync; after a failed load the next sync asks again
    if (!this.capWait) {
      this.capWait = true;
      void whenChamberCaptures(() => this.refreshEntries(), () => {
        this.capWait = false;
      });
    }
    if (this.entrySel.value !== CHAMBER.entry) this.entrySel.value = CHAMBER.entry;
    this.mirrorBox.checked = CHAMBER.mirror;
    this.turnBox.checked = CHAMBER.turntable;
    // (the chamber resets its switches on entry: the boxes show what is drawn)
    this.aidBoxes[0]!.checked = CHAMBER.skeleton;
    this.aidBoxes[1]!.checked = CHAMBER.feet;
    this.aidBoxes[2]!.checked = CHAMBER.onion;
    this.weaponSel.value = CHAMBER.weapon;
    // (mixamo-retarget Toggle) the game's Animation source (App sets the host after the panel is built)
    const src = this.api.animSource();
    this.srcSel.disabled = src === null;
    if (src !== null && this.srcSel.value !== src) this.srcSel.value = src;
    this.showStage();
    this.showKeyed();
    this.nextRead = 0;
  }

  /**
   * (track C request) The foot slide line from her rig's optional `footSlide` ({ l, r } cm this contact; absent before
   * track C's S4: the line hides). The text is set only when a rounded value changes (no per-frame allocation).
   */
  private showSlide(): void {
    const fs = (CHAMBER_RIGS[0] as { footSlide?: { l: number; r: number } } | undefined)?.footSlide;
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
    if (CHAMBER.active !== this.shown) this.sync();
    if (!CHAMBER.active) return;
    // (tuner-ui) a held camera snap stops the turntable
    if (FREE_VIEW.lock && CHAMBER.turntable) {
      CHAMBER.turntable = false;
      this.turnBox.checked = false;
    }
    FREE_VIEW.spin = CHAMBER.turntable ? (CHAMBER.turnRate * Math.PI) / 180 : 0;
    this.overlay.frame(nowMs, scene);
    this.showSlide();
    if (nowMs < this.nextRead) return;
    this.nextRead = nowMs + 100;
    const e = chamberEntry(CHAMBER.entry);
    const keyed = e.kind === 'keyed';
    const pair = e.kind === 'pair';
    // (anim-studio-2) a pair is on the chamber's own clock (scrub and step); a traversal loop is the game's physics (no)
    const inPlace = pair || (keyed && !(CHAMBER.rootMotion && e.circle && !(e.guard && CHAMBER.guard)));
    const frozen = this.api.frozen();
    const play = frozen ? 'Play' : 'Pause';
    if (this.playBtn.textContent !== play) this.playBtn.textContent = play;
    this.backBtn.disabled = this.fwdBtn.disabled = this.scrub.disabled = !inPlace;
    this.mirrorBox.disabled = !keyed && !(pair && !e.team);
    this.showKeyed();
    if (this.weaponSel.value !== CHAMBER.weapon) this.weaponSel.value = CHAMBER.weapon;
    const t = this.readText(e, inPlace);
    if (this.readout.textContent !== t) this.readout.textContent = t;
    if (!this.api.busy(this.scrub)) this.scrub.value = String(CHAMBER.phase);
    const sp = this.api.speed();
    if (!this.api.busy(this.speedIn)) this.speedIn.value = String(sp);
    this.speedVal.textContent = `${Number(sp.toFixed(2))}×`;
  }

  /** The bar's readout: the loop, then its key ("jog - key 2 of 8 (mirror of 6), frame 4"), a pair's roles, a loop's step. */
  private readText(e: ReturnType<typeof chamberEntry>, inPlace: boolean): string {
    const n = CHAMBER.frames;
    const p = CHAMBER_PAIR;
    const name = plainLoop(e.id, e.label);
    if (e.team) return `${name} | frame ${chamberKey(CHAMBER.phase, n) + 1}/${n} | A ${plainWords(p.aState)}${p.k > 0 ? `, contact ${p.k.toFixed(2)}` : ''} | B ${plainWords(p.bState)}`;
    if (e.trav) return `${name} | ${plainWords(p.travPhase)}, step ${p.travStep + 1}/${e.trav.steps.length}, loop ${p.travLoops}`;
    if (e.clip) {
      const c = keyClip(e.clip.name);
      const moving = inPlace ? '' : ' (moving: loop on the spot to step keys)';
      if (c && CHAMBER.key >= 0) {
        if (CHAMBER.onKey) return `${keyReadout(c, CHAMBER.key)}${moving}`;
        return `${c.name} - between keys (nearest key ${keyRank(c, CHAMBER.key) + 1}, frame ${keyFrame(c, CHAMBER.key)}), frame ${Math.round(CHAMBER.phase * n) % n}${moving}`;
      }
      return `${name} | frame ${chamberKey(CHAMBER.phase, n) + 1}/${n}${moving}`;
    }
    // (marlow-bays item 24, track A) a guard loop: the guard puppet's live gait (with its own gun)
    if (e.kind === 'guard') return `${name} | live gait, guard puppet`;
    return e.kind === 'state' ? `${name} | live gait${e.drawn ? `, ${CHAMBER.weapon}` : ''}` : name;
  }

  /** The panel closed: the aids go (the chamber itself keeps playing). */
  panelClosed(): void {
    this.overlay.clear();
    this.shown = false;
  }

  /** (marlow-bays item 14) The Stage light scale (clamped). */
  setStage(v: number): void {
    CHAMBER_LIGHT.scale = stageLightScale(v);
    this.showStage();
  }

  private showStage(): void {
    if (!this.api.busy(this.stageIn)) this.stageIn.value = String(CHAMBER_LIGHT.scale);
    this.stageVal.textContent = `${Number(CHAMBER_LIGHT.scale.toFixed(2))}×`;
  }

  /** (Toggle) Show only one animation set's loops in the Loop list ('all': the whole list); the loop playing stays. */
  private setSet(set: ChamberSet): void {
    const ids = chamberEntriesOf(set);
    const cur = this.entrySel.value;
    this.entrySel.replaceChildren();
    for (const id of ids) {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = plainLoop(id, chamberEntry(id).label);
      this.entrySel.append(o);
    }
    if (ids.includes(cur)) this.entrySel.value = cur;
  }

  /** (marlow-bays item 13) Play a loop picked elsewhere (a state picked in a tab's list); the list follows. */
  play(id: string): void {
    this.setEntry(id);
  }

  /** (marlow-bays item 13) "Loop on the spot" flipped from the playback bar, its key or the pad (every tab). */
  toggleSpot(): boolean {
    this.setSpot(!CHAMBER.spot);
    return CHAMBER.spot;
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
    CHAMBER.keyStep = dir < 0 ? -1 : 1;
  }

  /**
   * (T1a, item 15) The Keys tab's pick: clip `clip` plays in place (loop on the spot) paused on its key `key` (0-based,
   * the mirrored half's keys after the own keys). The loop list follows.
   */
  showKey(clip: string, key: number): void {
    const id = `keyed:${clip}`;
    if (chamberEntry(id).id !== id) return;
    if (!CHAMBER.spot) this.setSpot(true);
    if (CHAMBER.entry !== id) this.setEntry(id);
    this.api.freeze(true);
    CHAMBER.seekKey = Math.max(0, key);
  }

  /** (T1a, item 19) The gun every armed loop plays with (the bar's list, a weapon picked in a tab). */
  setWeapon(w: ChamberWeapon): void {
    if (w !== 'rifle' && w !== 'pistol') return;
    CHAMBER.weapon = w;
    if (this.weaponSel.value !== w) this.weaponSel.value = w;
    this.nextRead = 0;
  }

  private pickEntry(v: string): void {
    CHAMBER.entry = chamberEntry(v).id;
    this.nextRead = 0;
    this.showKeyed();
    this.api.picked(CHAMBER.entry);
  }

  private setEntry(id: string): void {
    const e = chamberEntry(id);
    this.entrySel.value = e.id;
    this.pickEntry(e.id);
  }

  /** (marlow-bays item 11) The Keyed box: the same loop as its keyed clip (on) or its procedural state (off). */
  private setKeyed(on: boolean): void {
    const next = loopKeyedPick(CHAMBER.entry, on);
    if (next !== CHAMBER.entry) this.setEntry(next);
    else this.showKeyed();
  }

  /** The Keyed box from the loop playing: ticked on a keyed clip; greyed with no other form (off, pairs, traversal,
   *  the keyed-only clips). */
  private showKeyed(): void {
    const k = loopKeyed(CHAMBER.entry, this.keyedOut);
    if (this.keyedBox.checked !== k.on) this.keyedBox.checked = k.on;
    const dis = k.other === '';
    if (this.keyedBox.disabled !== dis) this.keyedBox.disabled = dis;
  }

  private setBox(box: HTMLInputElement, on: boolean): void {
    box.checked = on;
    if (box === this.mirrorBox) CHAMBER.mirror = on;
  }

  /** (tuner-ui) On the spot: a state on the treadmill, a keyed clip in place (root motion off); else both move. */
  private setSpot(v: boolean): void {
    CHAMBER.spot = v;
    CHAMBER.rootMotion = !v;
  }

  private setTurntable(v: boolean): void {
    CHAMBER.turntable = v;
    if (v) FREE_VIEW.lock = '';
    if (v && FREE_VIEW.mode !== 'orbit') this.api.setFreeMode('orbit');
  }
}
