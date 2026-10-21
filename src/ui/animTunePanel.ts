import { Vector3, type Scene, type TransformNode } from '../core/babylon';
import {
  TUNE_BODY,
  TUNE_CAM,
  TUNE_CAM_CUR,
  TUNE_CUR,
  TUNE_GUN,
  TUNE_HOOKS,
  TUNE_LOCAL,
  TUNE_LOG,
  TUNE_STATE,
  tunablesFor,
  tuneChanged,
  tuneClearLog,
  tuneExport,
  tuneExportName,
  tuneGet,
  tuneGroupChanged,
  TUNE_FLAGS,
  tuneImport,
  tuneLoad,
  tuneMax,
  tuneMin,
  tuneNotes,
  tuneReset,
  tuneResetAll,
  tuneResetGroup,
  tuneSet,
  tuneSnapshot,
} from '../anim/tune';
import { isTuneGroup, TUNE_REGISTRY_HOOKS, TUNE_SECTIONS, type TuneSection } from '../anim/tuneRegistry';
import { FREE_DEMOS, FREE_IN, FREE_MODES, FREE_VIEW, GAME_SPEED, freeAxis, freeTimeScale, type FreeDemo, type FreeMode, type FreeSnap } from '../player/freeView';
import { PAD } from '../input/gamepadMapping';
import { loadAnimTune, loadAnimTuneUi, saveAnimTune, saveAnimTuneUi } from '../save/animTuneStore';
import { download } from './fileOut';
import { FINE_STEP, TunePadCtl } from './animTunePad';
import { projectPoint } from './overlayProject';
import { TuneSnapshotsUi, type PanelKit } from './tuneSnapshots';
import { StudioPanel } from './studioPanel';
import { STUDIO, STUDIO_LIGHT, STUDIO_SPEED, studioEntry } from '../anim/studio';
import { promptHtml, type PromptButton } from './prompts';
import { TUNER_MOUSE_KEY, TUNER_MOUSE_LABEL, TUNER_SPOT_KEY, TunerMouseCtl, type TunerMouseMode } from './tunerMouse';
import { emptyTarget, rowKeyParts, tuneTarget, type RigJoint } from './tunerTarget';
import {
  bodyCarry,
  buildTabs,
  cycleTab,
  DropNav,
  groupForPath,
  groupPath,
  levelCount,
  levelName,
  levelOptions,
  loopGroups,
  plainGroupWord,
  plainLabel,
  plainSection,
  plainUnit,
  plainWords,
  sharedPrefix,
  tabOfSection,
  TUNER_SIZES,
  tunerScale,
  valueText,
  loopForGroup,
  type BodyCarry,
  type LoopGroups,
  type TunerSize,
  type TunerTab,
} from './tunerLayout';

/** What the barrel marker and (marlow-bays item 10) the selection marker read from the local player's rig (typed
 *  loosely: no player import; the joints are `CharacterRig`'s nodes). */
export type TuneRigView = {
  heldWeapon: TransformNode | null;
  gunSpan: { z1: number; bore: number };
} & Partial<Record<RigJoint, TransformNode>>;

/** (marlow-bays item 9) The keyboard and mouse source as the tuner's mouse mode drives it (`core/app.ts` sets it). */
export interface TuneMouseHost {
  /** The drag view on (the pointer free, a left drag on the scene is the look) or off (play's own pointer lock). */
  setFree(on: boolean): void;
  locked(): boolean;
  dragging(): boolean;
}

/** The loop the time controls drive (the debug overlay sets it: `GameLoop`). */
export interface TuneLoopView {
  timeScale: number;
  stepHeadless?(seconds: number): void;
}

/** (tuner-camera; tuner-ui) One registered section: its pickers (one per level of its group ids) and rows. */
interface Section {
  reg: TuneSection;
  /** The hidden picker of every group id (the old `anim-tune-pick-<id>`: tests and the console set it). */
  pick: HTMLSelectElement;
  /** One hidden select per level (the visible drop-down buttons read them). */
  levels: HTMLSelectElement[];
  rows: HTMLDivElement;
  wrap: HTMLDivElement;
  group: string;
  prefix: number;
}

/** The rendered camera the barrel marker projects through (a FreeCamera: vertical FOV, Euler rotation). */
interface MarkerCam {
  position: Vector3;
  rotation: Vector3;
  fov: number;
  minZ: number;
}

/** How far out along the barrel the marker's end dot sits (m). */
const MARK_DIST = 12;
const SAVE_DELAY = 400;
/** (pass 3) Follow switches group once the new state has held this long (ms): a brief state never rebuilds the rows. */
const FOLLOW_HOLD_MS = 300;
/** (fix round) No pad poll for this long (ms): the free view's pad input is cleared (a disconnected pad). */
const PAD_STALE_MS = 250;
/** One sim step (the step-frame button). */
const STEP_S = 1 / 60;
const FREE_LABEL: Record<FreeMode, string> = { off: 'Off (game camera)', orbit: 'Orbit her', fly: 'Fly' };
const SNAPS: readonly FreeSnap[] = ['front', 'side', 'back', 'top'];

/** (tuner-ui) The panel's look: explicit colours on every control (no browser default shows through), readable on dark. */
const CSS = `
.anim-tune{--tt-bg:rgba(8,12,16,0.94);--tt-fg:#e2edf5;--tt-dim:#93a4b1;--tt-acc:#8fd3ff;--tt-warn:#ffc040;--tt-ctl:#22303c;--tt-in:#0b1218;--tt-line:rgba(255,255,255,0.24);
position:fixed;top:4px;right:4px;z-index:150;display:flex;flex-direction:column;box-sizing:border-box;background:var(--tt-bg);color:var(--tt-fg);
font-family:ui-monospace,Menlo,Consolas,monospace;line-height:1.35;border-radius:4px;padding:0.3em 0.45em;pointer-events:auto;overscroll-behavior:contain}
.anim-tune[hidden]{display:none!important}
.anim-tune [hidden]{display:none!important}
.anim-tune *{box-sizing:border-box}
.anim-tune button,.anim-tune input,.anim-tune select,.anim-tune textarea{font:inherit;color:var(--tt-fg);-webkit-text-fill-color:var(--tt-fg)}
.anim-tune .tt-btn{-webkit-appearance:none;appearance:none;background:var(--tt-ctl);border:1px solid var(--tt-line);border-radius:3px;padding:0.1em 0.55em;min-height:2em;cursor:pointer;text-align:left}
.anim-tune .tt-btn:disabled{opacity:0.45;cursor:default}
.anim-tune .tt-btn.on{background:#2d5a78}
.anim-tune input[type=number],.anim-tune input[type=text],.anim-tune input[type=search],.anim-tune textarea{-webkit-appearance:none;appearance:none;background:var(--tt-in);border:1px solid var(--tt-line);border-radius:2px;min-height:1.9em;padding:0 0.3em}
.anim-tune input[type=checkbox]{accent-color:#4fa3d9;width:1.15em;height:1.15em;margin:0 0.35em 0 0;flex:none}
.anim-tune input[type=range]{accent-color:#4fa3d9;width:100%;min-width:0;height:1.9em;margin:0;background:transparent}
.anim-tune .tt-head{display:flex;align-items:center;gap:0.3em;flex:none}
.anim-tune .tt-title{flex:1;color:var(--tt-acc);font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.anim-tune .anim-tune-pad{color:var(--tt-warn);font-size:0.9em;white-space:nowrap}
.anim-tune .anim-tune-tabs{display:flex;align-items:center;gap:0.2em;flex:none;overflow-x:auto;margin:0.25em 0;padding-bottom:0.1em;scrollbar-width:thin}
.anim-tune .tt-tab{flex:none;min-height:1.9em;padding:0.1em 0.5em;background:var(--tt-ctl);border:1px solid var(--tt-line);border-radius:3px 3px 0 0;cursor:pointer;white-space:nowrap;-webkit-appearance:none;appearance:none}
.anim-tune .tt-tab.active{background:#2d5a78;border-color:var(--tt-acc);font-weight:bold;box-shadow:inset 0 -3px 0 #ffe600}
.anim-tune .tt-row.tt-sel{background-color:rgba(255,230,0,0.14);box-shadow:inset 4px 0 0 #ffe600}
.anim-tune .tt-row.tt-sel .tt-name{color:#fff6a0;font-weight:bold}
.anim-tune .anim-tune-sel{color:#ffe600;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.anim-tune .anim-tune-mouse{min-height:1.7em;font-size:0.85em;white-space:nowrap}
.anim-tune.tt-gamecam{pointer-events:none;opacity:0.85}
.anim-tune.tt-gamecam .anim-tune-mouse{pointer-events:auto}
.anim-tune .tt-bump{flex:none}
.anim-tune .anim-tune-body{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0.1em 0.15em}
.anim-tune .tt-bar{display:flex;flex-wrap:wrap;gap:0.3em;align-items:center;margin:0.25em 0}
.anim-tune .tt-field{display:flex;align-items:center;gap:0.35em;min-height:2em}
.anim-tune .tt-grow{flex:1;min-width:10em}
.anim-tune .tt-h{display:block;color:var(--tt-acc);margin:0.35em 0 0.1em}
.anim-tune .tt-block{border:1px solid rgba(143,211,255,0.3);border-radius:3px;padding:0.15em 0.4em;margin:0.25em 0}
.anim-tune .tt-note{color:var(--tt-dim);font-size:0.85em}
.anim-tune .tt-val{min-width:3.5em;color:var(--tt-fg)}
.anim-tune .tt-drop{display:inline-flex;justify-content:space-between;align-items:center;gap:0.5em;min-width:7.5em;max-width:16em}
.anim-tune .tt-drop span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.anim-tune .tt-drop::after{content:'▾';color:var(--tt-acc)}
.anim-tune .anim-tune-drop-list{position:absolute;z-index:3;background:#0d171f;border:1px solid var(--tt-acc);border-radius:3px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.6)}
.anim-tune .tt-opt{padding:0.2em 0.6em;min-height:1.9em;display:flex;align-items:center;cursor:pointer;white-space:nowrap}
.anim-tune .tt-opt.cur::before{content:'✓';color:var(--tt-acc);margin-right:0.4em}
.anim-tune .tt-opt.hi{background:rgba(255,192,64,0.25);outline:1px solid var(--tt-warn)}
.anim-tune .tt-row{display:grid;grid-template-columns:minmax(5.5em,36%) minmax(3em,1fr) 4.6em 1.6em 1.6em;align-items:center;gap:0.3em;min-height:2em;border-radius:2px}
.anim-tune .tt-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.anim-tune .anim-tune-num{width:100%;min-width:0;font-weight:bold;text-align:right}
.anim-tune .anim-tune-num.chg{color:var(--tt-warn);-webkit-text-fill-color:var(--tt-warn)}
.anim-tune .tt-unit{color:var(--tt-dim)}
.anim-tune .tt-x{-webkit-appearance:none;appearance:none;background:none;border:none;padding:0;min-height:1.8em;cursor:pointer;color:var(--tt-dim);-webkit-text-fill-color:var(--tt-dim)}
.anim-tune .anim-tune-hint{color:#8a98a4;font-size:0.8em;margin:-0.15em 0 0.15em 0.2em}
.anim-tune .anim-tune-menu{display:none;flex-direction:column;gap:0.15em;margin:0.2em 0;padding:0.2em;border:1px solid var(--tt-warn);flex:none}
.anim-tune .anim-tune-info{flex:none;color:var(--tt-dim);font-size:0.9em;padding:0.15em 0;border-top:1px solid var(--tt-line)}
.anim-tune .anim-tune-hints{flex:none;color:var(--tt-warn);font-size:0.9em;padding:0.25em 0 0.15em;border-top:1px solid rgba(255,192,64,0.4);display:flex;flex-wrap:wrap;gap:0.2em 0.7em;align-items:center;min-height:2.2em}
.anim-tune .anim-tune-hints .tt-h1{display:inline-flex;align-items:center;gap:0.25em;white-space:nowrap}
.anim-tune .anim-tune-hints .glyph{height:1.55em;min-width:1.55em;font-size:0.85em}
.anim-tune .anim-tune-hints .glyph.round{width:1.55em}
.anim-tune .tt-pad,.anim-tune .tt-keys{display:contents}
body.input-gamepad .anim-tune .tt-keys{display:none}
body:not(.input-gamepad) .anim-tune .tt-pad{display:none}
body:not(.input-gamepad) .anim-tune .tt-bump{display:none}
.anim-tune .tt-focus{outline:2px solid var(--tt-warn)!important;background-color:rgba(255,192,64,0.16)!important}
.anim-tune .tt-edit{outline:2px solid #60ff80!important;background-color:rgba(96,255,128,0.16)!important}
.anim-tune textarea{width:100%;height:8em}
`;

let cssDone = false;
function injectCss(): void {
  if (cssDone || typeof document === 'undefined') return;
  cssDone = true;
  const s = document.createElement('style');
  s.dataset.tuner = 'ui';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/** A pad glyph for the hint strip (every pad style; CSS shows the one in use). */
function padGlyph(b: PromptButton | 'DPAD' | 'VIEW' | 'R3' | 'LSTICK'): string {
  if (b === 'DPAD' || b === 'VIEW' || b === 'R3' || b === 'LSTICK') {
    const t = b === 'DPAD' ? ['D-pad', 'D-pad', 'D-pad'] : b === 'VIEW' ? ['View', 'Create', '−'] : b === 'R3' ? ['R3', 'R3', 'RS'] : ['L stick', 'L stick', 'L stick'];
    return `<span class="glyph g-pad g-xbox pill">${t[0]}</span><span class="glyph g-pad g-ps pill">${t[1]}</span><span class="glyph g-pad g-nin pill">${t[2]}</span>`;
  }
  return promptHtml(b).replace(/<span class="glyph g-key">[^<]*<\/span>/, '');
}

/** One hint: the glyphs, then the words. */
function hint(glyphs: (PromptButton | 'DPAD' | 'VIEW' | 'R3' | 'LSTICK')[], words: string): string {
  return `<span class="tt-h1">${glyphs.map(padGlyph).join('')}<span>${words}</span></span>`;
}

/**
 * (anim-tuner; tuner-ui layout pass) The animation tuner panel (F3 > Anim, Pause > Animation tuner, Settings > Graphics,
 * docked in the Anim Studio). Tabs across the top (LB / RB, or a click): View, Body, Hands & feet, Weapon, Stepping,
 * Weight, Camera, Keys, Co-op, then any section a later file registers, then Settings (`tunerLayout.ts`). A tab shows
 * one thing at a time: a drop-down list for the part (when the tab holds more than one section), one for the state (and
 * one per further level of its group ids: weapon then state, clip then key), then that group's sliders, each with its
 * value always shown. Every list opens as a visible drop-down (A or a click; D-pad moves, A picks, B backs out). The
 * hint strip is reserved space at the bottom (pad glyphs with a pad, keys otherwise). Reset per slider (X, or x), per
 * group and all; Export downloads `anim-tune-<date>.json`; the values save to the tuner's own IndexedDB store.
 *
 * Pad (`TunePadCtl`, map in `docs/anim-tuner/STATE.md` "Pad map"): LB / RB tabs, D-pad rows, A open / pick / edit, B back,
 * X reset row, Y the more menu, View hands the pad to the game (or the free view) and back, Menu closes. With "Pause game
 * while tuning" on (default) the game holds still while the panel has the pad (not in the Anim Studio, where the loop
 * player's Play / Pause rules, nor in co-op). While the pause menu is open the menus get the pad. The barrel marker is a
 * 2D overlay (no scene meshes).
 */
export class AnimTunePanel {
  readonly el: HTMLDivElement;
  private open = false;
  private folded = false;
  private body: HTMLDivElement;
  private tabBar: HTMLDivElement;
  private foldBtn: HTMLButtonElement;
  private shareOut: HTMLTextAreaElement;
  /** Told when the panel opens or closes (the overlay's Anim button state). */
  onOpenChange: ((open: boolean) => void) | null = null;
  private follow = true;
  private followBox: HTMLInputElement;
  private markerBox: HTMLInputElement;
  /** A slider is held (mouse or touch): follow never rebuilds the rows under it. */
  private pressing = false;
  /** Follow's pending state per section and since when (ms): it switches once the state has held FOLLOW_HOLD_MS. */
  private cand: string[] = [];
  private candAt: number[] = [];
  private changedOnly = false;
  private marker = false;
  private now: HTMLDivElement;
  private info: HTMLDivElement;
  private sections: Section[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private scene: Scene | null = null;
  private nextInfo = 0;
  private nextDrops = 0;
  /** The local player's rig (set by the debug overlay). */
  rig: (() => TuneRigView | null) | null = null;
  /** (tuner-camera) The loop the time controls drive (set by the debug overlay). */
  loop: TuneLoopView | null = null;
  // --- tabs (tuner-ui)
  private tabs: TunerTab[] = [];
  private tabIdx = 0;
  private readonly tabEls = new Map<string, HTMLDivElement>();
  private readonly tabBtns = new Map<string, HTMLButtonElement>();
  /** The part (section id) each multi-section tab shows, and its part picker. */
  private readonly partOf = new Map<string, string>();
  private readonly partSel = new Map<string, HTMLSelectElement>();
  // --- drop-down lists (tuner-ui)
  private readonly dropSel = new WeakMap<HTMLElement, HTMLSelectElement>();
  private readonly dropBtns: HTMLButtonElement[] = [];
  private readonly drop = new DropNav();
  private dropBtn: HTMLButtonElement | null = null;
  private dropList: HTMLDivElement;
  // --- pad
  private readonly pad = new TunePadCtl();
  private padLine: HTMLSpanElement;
  private hint: HTMLDivElement;
  private hintKey = '';
  /** The focused control's `data-pad` key, its index in the focus list, the element and its mark. */
  private padKey = '';
  private padIdx = 0;
  private padEl: HTMLElement | null = null;
  private padMark: HTMLElement | null = null;
  /** Edit mode: the slider and its value before the edit. */
  private edit: { el: HTMLInputElement; orig: number } | null = null;
  /** Left stick adjust carried between frames (value units, below one step). */
  private stickAcc = 0;
  /** The section the focus was last in (LT / RT, Reset group). */
  private lastSec = 0;
  /** The Y menu, the focus key before it opened, Reset all armed (A again confirms). */
  private menu: HTMLDivElement;
  private menuOpen = false;
  private menuBack = '';
  private confirmAll = false;
  private readonly rowShow = new WeakMap<HTMLElement, () => void>();
  private readonly changeEv = new Event('change');
  private readonly inputEv = new Event('input');
  // --- time and free view
  private freeSel: HTMLSelectElement;
  /** (pass 2) The game speed slider (0.1-1x) and its value. */
  private speedIn: HTMLInputElement;
  private speedVal: HTMLSpanElement;
  private stepBtn: HTMLButtonElement;
  private coopNote: HTMLDivElement;
  private lockLine: HTMLSpanElement;
  private unlockBtn: HTMLButtonElement;
  private readonly snapBtns = new Map<FreeSnap, HTMLButtonElement>();
  /** (pass 2) Whether a co-op session runs (set by the app): the time controls are off then. */
  coop: (() => boolean) | null = null;
  /** (tuner-ui) Whether the pause menu is open (set by the app): the menus get the pad meanwhile. */
  menuPaused: (() => boolean) | null = null;
  private coopOn = false;
  /** (fix round) When the pad was last polled (ms): the free view's pad input clears once it goes stale. */
  private lastPoll = 0;
  /** (pass 2) The bypass held by pad (R3) and by key (Backquote). */
  private padBypass = false;
  private keyBypass = false;
  /** (pass 2) The search text (lower case; '' = every row). */
  private search = '';
  private fileIn: HTMLInputElement;
  private readonly rowNum = new WeakMap<HTMLElement, HTMLInputElement>();
  private hudBox: HTMLInputElement;
  /** (tuner-ui) "Pause game while tuning" (the old "freeze on View", on by default). */
  private freezeBox: HTMLInputElement;
  private pauseBtn: HTMLButtonElement;
  private sizeSel: HTMLSelectElement;
  private size: TunerSize = 'S';
  /** The game is frozen (time scale 0), by the tuner holding the pad (auto) or by Pause; the running scale to go back to. */
  private frozen = false;
  private autoFrozen = false;
  private tuneWant = false;
  private runScale = 1;
  // --- barrel marker (2D overlay)
  private markCanvas: HTMLCanvasElement | null = null;
  private markRectAt = 0;
  private markW = 0;
  private markH = 0;
  private readonly markA = new Vector3();
  private readonly markB = new Vector3();
  private readonly markDir = new Vector3();
  private readonly markSA = { x: 0, y: 0, z: 0 };
  private readonly markSB = { x: 0, y: 0, z: 0 };
  // --- (marlow-bays item 9) the mouse mode (drag view / game camera) with keyboard and mouse
  mouseHost: TuneMouseHost | null = null;
  private readonly mouseCtl = new TunerMouseCtl();
  private mouseBtn: HTMLButtonElement;
  // --- (marlow-bays item 13) "Loop on the spot" in the header (the studio), and a loop picked from a tab's state list
  private spotBtn: HTMLButtonElement;
  private loopFromTab = false;
  // --- (marlow-bays item 10) the selected row (its pad key), its target on the body and the scene marker
  private selKey = '';
  /** The pad focus last taken as the selection. */
  private selPadKey = '';
  private selSec = '';
  private selRow: HTMLElement | null = null;
  private selLine: HTMLDivElement | null = null;
  private readonly selTarget = emptyTarget();
  /** The selection marker as last drawn (overlay pixels; the test hook). */
  private readonly selMark = { shown: false, ax: 0, ay: 0, bx: 0, by: 0 };
  // --- (anim-studio) snapshots (undo / redo, A/B, presets) and the studio section
  private readonly snaps: TuneSnapshotsUi;
  readonly studioUi: StudioPanel;
  /** The game speed slider's top: 1x, 2x inside the studio. */
  private speedMax: number = GAME_SPEED.max;
  private readonly loopOut: LoopGroups = { body: '', clip: '', team: '', trav: '', step: '', weight: '' };
  private readonly carryOut: BodyCarry = { joint: '', ik: '', handState: '', gunState: '', step: '', weight: '' };
  /** (tuner-ui) The Anim Studio was on at the last look: leaving it turns follow back on (a loop pick turned it off). */
  private wasStudio = false;

  constructor() {
    injectCss();
    const el = (this.el = document.createElement('div'));
    el.className = 'anim-tune';
    el.hidden = true;
    // (pass 2) the panel's own pointer / touch / wheel input never reaches the game, the menus' focus or the look
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'wheel', 'touchstart', 'touchmove', 'touchend', 'contextmenu']) {
      el.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
    }
    const kit: PanelKit = { btn: (l, f, k, c) => this.mkBtn(l, f, k, c), check: (p, l, on, f, k, c) => this.mkCheck(p, l, on, f, k, c), sel: (p, l, o, f, k, c) => this.mkSel(p, l, o, f, k, c), bar: () => this.mkBar() };
    this.snaps = new TuneSnapshotsUi(kit, { rebuild: () => this.rebuildAll(), info: (t) => this.flashInfo(t) });
    this.studioUi = new StudioPanel(kit, {
      freeze: (on) => {
        if (on !== this.frozen) this.setFrozen(on);
      },
      frozen: () => this.frozen,
      setSpeed: (v) => this.setTimeScale(v),
      speed: () => this.runScale,
      setFreeMode: (m) => this.setFreeMode(m),
      busy: (e) => this.edit?.el === e || document.activeElement === e,
      lock: (s) => this.lockSnap(s),
      picked: (id) => this.applyLoop(id),
      saveUi: () => this.saveUi(),
    });
    // header: title, the pad line, fold, close (folded, the panel is this one line)
    const head = document.createElement('div');
    head.className = 'tt-head';
    const title = document.createElement('span');
    title.className = 'tt-title';
    title.textContent = 'Animation tuner';
    this.padLine = document.createElement('span');
    this.padLine.className = 'anim-tune-pad';
    this.foldBtn = this.mkBtn('_', () => this.setFolded(!this.folded), 'fold', 'anim-tune-fold');
    this.foldBtn.title = 'Fold';
    delete this.foldBtn.dataset.pad;
    const close = this.mkBtn('×', () => this.hide(), 'close', 'anim-tune-close');
    close.title = 'Close';
    delete close.dataset.pad;
    // (marlow-bays item 9) the mouse mode, shown and toggled (also the key)
    this.mouseBtn = this.mkBtn(TUNER_MOUSE_LABEL.drag, () => this.toggleMouse(), 'mouse', 'anim-tune-mouse');
    this.mouseBtn.title = `Mouse mode (${TUNER_MOUSE_KEY}): drag view (drag the scene to turn the camera, wheel zooms, the panel takes clicks) or game camera (mouse look; the panel ignores the mouse)`;
    delete this.mouseBtn.dataset.pad;
    // (marlow-bays item 13) loop on the spot from every tab (the studio only; also the key and L3)
    this.spotBtn = this.mkBtn('On the spot: on', () => this.toggleSpot(), 'spot', 'anim-tune-spot');
    this.spotBtn.title = `Loop on the spot (${TUNER_SPOT_KEY}, pad L3): a moving state runs in place, or off: she really moves`;
    delete this.spotBtn.dataset.pad;
    this.spotBtn.hidden = true;
    head.append(title, this.padLine, this.spotBtn, this.mouseBtn, this.foldBtn, close);
    this.tabBar = document.createElement('div');
    this.tabBar.className = 'anim-tune-tabs';
    // (pass 2) the Y menu: the rarer actions, by pad
    const menu = (this.menu = document.createElement('div'));
    menu.className = 'anim-tune-menu';
    const body = (this.body = document.createElement('div'));
    body.className = 'anim-tune-body';
    body.addEventListener('scroll', () => this.closeDrop(), { passive: true });
    // (marlow-bays item 10) a press or a focus in a slider row selects it (the mouse and the keys; the pad selects by
    // its focus)
    const pickFrom = (ev: Event): void => {
      const row = (ev.target as Element | null)?.closest?.('[data-pad-row]');
      const key = row?.querySelector<HTMLElement>('input[type=range][data-pad]')?.dataset.pad;
      if (key && key !== this.selKey) this.pickRow(key);
    };
    body.addEventListener('pointerdown', pickFrom, true);
    body.addEventListener('focusin', pickFrom);
    // --- View tab: the loop player (studio), the camera, time
    const view = this.tabEl('view');
    const cam = this.block(view, 'Camera');
    const cb = this.mkBar();
    this.freeSel = this.mkSel(cb, 'Free view', FREE_MODES, (v) => this.setFreeMode(v as FreeMode), 'free', 'anim-tune-free');
    for (const o of Array.from(this.freeSel.options)) o.textContent = FREE_LABEL[o.value as FreeMode];
    const sb = this.mkBar();
    for (const s of SNAPS) {
      const b = this.mkBtn(plainWords(s), () => this.lockSnap(s), `snap:${s}`, `anim-tune-snap-${s} studio-snap-${s}`);
      this.snapBtns.set(s, b);
      sb.append(b);
    }
    this.unlockBtn = this.mkBtn('Unlock', () => this.unlockSnap(), 'unlock', 'anim-tune-unlock');
    this.lockLine = document.createElement('span');
    this.lockLine.className = 'tt-note anim-tune-lock';
    sb.append(this.unlockBtn, this.lockLine);
    const db = this.mkBar();
    const demo = this.mkSel(db, 'Fly demo', FREE_DEMOS, (v) => (FREE_VIEW.demo = v as FreeDemo), 'demo', 'anim-tune-demo');
    for (const o of Array.from(demo.options)) o.textContent = plainWords(o.value);
    this.hudBox = this.mkCheck(db, 'Hide HUD', false, (v) => document.body.classList.toggle('tune-hide-hud', v), 'hidehud', 'anim-tune-hidehud');
    cam.append(cb, sb, db);
    const time = this.block(view, 'Time');
    const tb = this.mkBar();
    this.pauseBtn = this.mkBtn('Pause', () => this.setFrozen(!this.frozen), 'pause', 'anim-tune-pause');
    this.stepBtn = this.mkBtn('Step', () => this.stepFrame(), 'step', 'anim-tune-step');
    tb.append(this.pauseBtn, this.stepBtn);
    {
      // (pass 2) the game speed: slow motion in normal play and in the free view (the loop's time scale; local only)
      const l = document.createElement('label');
      l.className = 'tt-field tt-grow';
      const r = (this.speedIn = document.createElement('input'));
      r.type = 'range';
      r.min = String(GAME_SPEED.min);
      r.max = String(GAME_SPEED.max);
      r.step = String(GAME_SPEED.step);
      r.value = '1';
      r.className = 'anim-tune-speed';
      r.dataset.pad = 'speed';
      this.speedVal = document.createElement('span');
      this.speedVal.className = 'tt-val';
      this.speedVal.textContent = '1×';
      r.addEventListener('input', () => this.setTimeScale(Number(r.value)));
      r.addEventListener('change', () => r.blur());
      l.append('Game speed', r, this.speedVal);
      tb.append(l);
    }
    this.coopNote = document.createElement('div');
    this.coopNote.className = 'anim-tune-coop tt-note';
    this.coopNote.hidden = true;
    this.coopNote.textContent = 'Co-op: game speed, pause and step are off.';
    time.append(tb, this.coopNote);
    view.prepend(this.studioUi.el);
    // --- Settings tab
    const set = this.tabEl('settings');
    const panelB = this.block(set, 'Panel');
    const pb = this.mkBar();
    this.sizeSel = this.mkSel(pb, 'Size', TUNER_SIZES, (v) => this.setSize(v as TunerSize, true), 'size', 'anim-tune-size');
    for (const o of Array.from(this.sizeSel.options)) o.textContent = o.value === 'S' ? 'Small' : o.value === 'M' ? 'Medium' : 'Large';
    this.freezeBox = this.mkCheck(pb, 'Pause game while tuning', true, () => {
      this.saveUi();
      this.syncTuneFreeze();
    }, 'freezeview', 'anim-tune-freezeview anim-tune-pausetuning');
    const pb2 = this.mkBar();
    this.followBox = this.mkCheck(pb2, 'Follow my state', true, (v) => this.setFollow(v), 'follow', 'anim-tune-follow');
    this.mkCheck(pb2, 'Changed only', false, (v) => {
      this.changedOnly = v;
      this.rebuildAll();
    }, 'changed', 'anim-tune-changed');
    const pb3 = this.mkBar();
    this.mkCheck(pb3, 'Wide ranges', false, (v) => {
      TUNE_FLAGS.wide = v;
      this.rebuildAll();
    }, 'wide', 'anim-tune-wide');
    this.markerBox = this.mkCheck(pb3, 'Barrel line', false, (v) => {
      this.marker = v;
      if (!v) this.clearMarker();
    }, 'marker', 'anim-tune-marker');
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Find a slider';
    search.className = 'anim-tune-search tt-grow';
    search.addEventListener('input', () => {
      this.search = search.value.trim().toLowerCase();
      this.rebuildAll();
    });
    const pb4 = this.mkBar();
    pb4.append(search);
    panelB.append(pb, pb2, pb3, pb4);
    const snapB = this.block(set, 'Undo and presets');
    snapB.append(this.snaps.bar, this.snaps.pbar);
    const fileB = this.block(set, 'Files');
    const fb = this.mkBar();
    const fileIn = (this.fileIn = document.createElement('input'));
    fileIn.type = 'file';
    fileIn.accept = '.json,application/json';
    fileIn.hidden = true;
    fileIn.className = 'anim-tune-file';
    fileIn.addEventListener('change', () => void this.importFile());
    fb.append(
      this.mkBtn('Export', () => this.exportFile(), 'export', 'anim-tune-export'),
      this.mkBtn('Share / Copy', () => void this.shareFile(), 'share', 'anim-tune-share'),
      this.mkBtn('Import', () => this.importPick(), 'import', 'anim-tune-import'),
      fileIn,
    );
    const fb2 = this.mkBar();
    fb2.append(
      this.mkBtn('Reset all', () => {
        if (!confirm('Reset every animation value to its default?')) return;
        tuneResetAll();
        this.rebuildAll();
      }, 'resetall', 'anim-tune-resetall'),
      this.mkBtn('Clear change log', () => tuneClearLog(), 'clearlog', 'anim-tune-clearlog'),
    );
    this.shareOut = document.createElement('textarea');
    this.shareOut.readOnly = true;
    this.shareOut.hidden = true;
    this.shareOut.className = 'anim-tune-json';
    this.shareOut.addEventListener('focus', () => this.shareOut.select());
    fileB.append(fb, fb2, this.shareOut);
    // the Y menu's items
    const mItem = (label: string, fn: () => void, key: string): void => {
      const b = this.mkBtn(label, fn, key);
      menu.append(b);
    };
    mItem('Undo', () => this.menuDo(() => this.snaps.undo()), 'm:undo');
    mItem('Redo', () => this.menuDo(() => this.snaps.redo()), 'm:redo');
    mItem('Store A', () => this.menuDo(() => this.snaps.abStore('A')), 'm:abA');
    mItem('Store B', () => this.menuDo(() => this.snaps.abStore('B')), 'm:abB');
    mItem('Flip A / B', () => this.menuDo(() => this.snaps.abToggle()), 'm:ab');
    mItem('Reset this group', () => this.menuDo(() => this.resetFocusedGroup()), 'm:resetgroup');
    mItem('Reset all (A twice)', () => this.armResetAll(), 'm:resetall');
    mItem('Export file', () => this.menuDo(() => this.exportFile()), 'm:export');
    mItem('Share / Copy', () => this.menuDo(() => void this.shareFile()), 'm:share');
    mItem('Import file', () => this.menuDo(() => this.importPick()), 'm:import');
    mItem('Clear change log', () => this.menuDo(() => tuneClearLog()), 'm:clearlog');
    // (anim-studio) Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) while the panel is open and no text box has the keys: undo / redo;
    // taken before the game's keyboard (Z is the knockout)
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open) return;
        // (tuner-ui) an open list takes the arrows, Enter and Esc
        if (this.drop.open && this.dropKey(e)) return;
        if (!(e.ctrlKey || e.metaKey) || (e.code !== 'KeyZ' && e.code !== 'KeyY')) return;
        const a = document.activeElement as HTMLInputElement | null;
        if (a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && (a.type === 'text' || a.type === 'search' || a.type === 'number')))) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.repeat) return;
        if (e.code === 'KeyY' || e.shiftKey) this.snaps.redo();
        else this.snaps.undo();
      },
      true,
    );
    // (tuner-ui) a click outside an open list closes it (nothing changes)
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (!this.drop.open) return;
        const t = e.target as Node | null;
        if (t && (this.dropList.contains(t) || this.dropBtn?.contains(t))) return;
        this.dropBack();
      },
      true,
    );
    // (marlow-bays item 9) the mouse mode key while the panel is open (the game never sees it)
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open || (e.code !== TUNER_MOUSE_KEY && !(e.code === TUNER_SPOT_KEY && STUDIO.active))) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.repeat) return;
        if (e.code === TUNER_MOUSE_KEY) this.toggleMouse();
        else this.toggleSpot();
      },
      true,
    );
    // (pass 2) Backquote held: the bypass (the untuned animation and camera) while the panel is open
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' && this.open && !e.repeat) this.setKeyBypass(true);
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Backquote') this.setKeyBypass(false);
    });
    window.addEventListener('blur', () => this.setKeyBypass(false));
    window.addEventListener('resize', () => this.applySize());
    // (fix round) a pad disconnect never leaves the free view's sticks held
    window.addEventListener('gamepaddisconnected', () => this.clearFreeIn());
    // the mouse wheel zooms the orbit (the panel's own wheel stops at the panel)
    window.addEventListener(
      'wheel',
      (e) => {
        if (!this.open || e.deltaY === 0) return;
        // (marlow-bays item 9) drag view: the wheel on the scene zooms, starting the orbit from the game view if it is off
        if (FREE_VIEW.mode === 'off' && this.mouseCtl.free && e.target === this.scene?.getEngine().getRenderingCanvas()) this.setFreeMode('orbit', false);
        if (FREE_VIEW.mode === 'orbit') FREE_IN.wheel += e.deltaY < 0 ? 1 : -1;
      },
      { passive: true },
    );
    this.now = document.createElement('div');
    this.info = document.createElement('div');
    const infoEl = document.createElement('div');
    infoEl.className = 'anim-tune-info';
    const selLine = (this.selLine = document.createElement('div'));
    selLine.className = 'anim-tune-sel';
    selLine.hidden = true;
    infoEl.append(selLine, this.now, this.info);
    // (tuner-ui) the hints: reserved space at the bottom, never over a row
    this.hint = document.createElement('div');
    this.hint.className = 'anim-tune-hints';
    this.dropList = document.createElement('div');
    this.dropList.className = 'anim-tune-drop-list';
    this.dropList.hidden = true;
    el.append(head, this.tabBar, menu, body, infoEl, this.hint, this.dropList);
    // (tuner-camera) every registered section, in registration order, into its tab
    for (const r of TUNE_SECTIONS) this.addSection(r, false);
    TUNE_REGISTRY_HOOKS.added = (r) => this.addSection(r, true);
    this.buildTabBar();
    this.setTab(this.tabs.findIndex((t) => t.id === 'body'), false);
    document.body.appendChild(el);
    this.applySize();
    TUNE_HOOKS.changed = () => {
      this.scheduleSave();
      // (anim-studio) an undo step, and the onion skin's cached keys are stale
      this.snaps.note(performance.now());
      STUDIO.poseVer++;
    };
    // load the saved values (skipped if a slider already moved); the undo history starts from what loaded
    void loadAnimTune().then((s) => {
      if (s && TUNE_LOG.length === 0 && tuneChanged().length === 0) {
        tuneLoad(s);
        this.rebuildAll();
        this.snaps.reset();
      }
    });
    // (tuner-ui) the panel's own settings
    void loadAnimTuneUi().then((u) => {
      if (!u || typeof u !== 'object') return;
      const o = u as { size?: unknown; pauseTuning?: unknown; stageLight?: unknown };
      if (o.size === 'S' || o.size === 'M' || o.size === 'L') this.setSize(o.size, false);
      if (typeof o.pauseTuning === 'boolean') this.freezeBox.checked = o.pauseTuning;
      if (typeof o.stageLight === 'number') this.studioUi.setStage(o.stageLight);
    });
    // (test hook) e2e and the console read and set values through this
    (window as unknown as { __animTune: unknown }).__animTune = {
      body: TUNE_BODY,
      gun: TUNE_GUN,
      cur: TUNE_CUR,
      local: TUNE_LOCAL,
      state: TUNE_STATE,
      // (tuner-camera) the camera values, the free view, the time controls and the sections
      cam: TUNE_CAM,
      camCur: TUNE_CAM_CUR,
      sections: () => TUNE_SECTIONS.map((x) => x.id),
      free: (m: FreeMode) => this.setFreeMode(m),
      freeState: () => ({ mode: FREE_VIEW.mode, demo: FREE_VIEW.demo, pad: this.pad.mode, folded: this.folded, lock: FREE_VIEW.lock }),
      demo: (d: FreeDemo) => (FREE_VIEW.demo = d),
      freeze: (on: boolean) => this.setFrozen(on),
      speed: (v: number) => this.setTimeScale(v),
      bypass: (on: boolean) => this.setKeyBypass(on),
      flags: TUNE_FLAGS,
      importJson: (data: unknown, name?: string) => {
        const r = tuneImport(data, name);
        this.rebuildAll();
        return r;
      },
      step: () => this.stepFrame(),
      marker: (on: boolean) => {
        if (this.markerBox.checked !== on) this.markerBox.click();
      },
      get: tuneGet,
      set: (g: string, id: string, v: number) => {
        const ok = tuneSet(g, id, v);
        this.rebuildAll();
        return ok;
      },
      changed: tuneChanged,
      exportJson: () => tuneExport(),
      log: TUNE_LOG,
      // (anim-studio) snapshots: undo / redo (`settle` closes the open run now), A/B, presets
      settle: () => this.snaps.history.settle(performance.now(), true),
      undo: () => this.snaps.undo(),
      redo: () => this.snaps.redo(),
      undoCount: () => this.snaps.history.undoCount,
      abStore: (slot: 'A' | 'B') => this.snaps.abStore(slot),
      abToggle: () => this.snaps.abToggle(),
      presetSave: (name: string) => this.snaps.save(name),
      presetLoad: (name: string) => this.snaps.load(name),
      presetDelete: (name: string) => this.snaps.del(name),
      presets: () => this.snaps.presets.map((p) => p.name),
      presetsLoaded: () => this.snaps.loaded,
      timeScale: () => (this.loop ? this.loop.timeScale : 1),
      // (tuner-ui) tabs, size, the camera lock, a section's shown group
      tabs: () => this.tabs.map((t) => t.id),
      tab: (id: string) => this.setTab(this.tabs.findIndex((t) => t.id === id)),
      size: (s: TunerSize) => this.setSize(s, false),
      lock: (s: FreeSnap) => this.lockSnap(s),
      unlock: () => this.unlockSnap(),
      group: (sec: string) => this.sections.find((s) => s.reg.id === sec)?.group ?? '',
      // (marlow-bays item 9) the mouse mode
      mouse: () => ({ mode: this.mouseCtl.mode, free: this.mouseCtl.free, locked: this.mouseHost?.locked() ?? false, dragging: this.mouseHost?.dragging() ?? false, button: this.mouseBtn.textContent ?? '' }),
      mouseMode: (m: TunerMouseMode) => {
        if (m !== this.mouseCtl.mode) this.toggleMouse();
      },
      // (marlow-bays item 10) the selected row, its target and the scene marker
      select: (key: string) => this.pickRow(key),
      selected: () => ({
        key: this.selKey,
        section: this.selSec,
        kind: this.selTarget.kind,
        a: this.selTarget.a,
        b: this.selTarget.b,
        label: this.selTarget.label,
        row: !!this.selRow?.isConnected && this.selRow.classList.contains('tt-sel'),
        line: this.selLine?.textContent ?? '',
        mark: { ...this.selMark },
      }),
      // (tuner-pad) the pad mode, the focused control and its edit state
      pad: () => {
        const e = this.padEl;
        const s = this.sections[this.lastSec];
        return {
          mode: this.pad.mode,
          key: this.padKey,
          group: e?.dataset.group ?? '',
          id: e?.dataset.id ?? '',
          editing: !!this.edit,
          menu: this.menuOpen,
          section: s?.reg.id ?? '',
          sectionGroup: s?.group ?? '',
          frozen: this.frozen,
          tab: this.tabs[this.tabIdx]?.id ?? '',
          list: this.drop.open,
          listIndex: this.drop.index,
          listLength: this.drop.count,
          hint: this.hint.textContent ?? '',
        };
      },
    };
    this.setPadLine();
  }

  // ------------------------------------------------------------------------------------------
  // Control makers (every control has explicit colours from the panel's CSS)
  // ------------------------------------------------------------------------------------------

  private mkBtn(label: string, fn: () => void, key: string, cls = ''): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = cls ? `tt-btn ${cls}` : 'tt-btn';
    b.dataset.pad = key;
    b.addEventListener('click', () => {
      fn();
      // (the keys stay the game's: WASD and Space never press a panel button)
      b.blur();
    });
    return b;
  }

  private mkCheck(parent: HTMLElement, label: string, on: boolean, fn: (v: boolean) => void, key: string, cls: string): HTMLInputElement {
    const l = document.createElement('label');
    l.className = 'tt-field';
    const c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = on;
    c.className = cls;
    c.dataset.pad = key;
    c.addEventListener('change', () => {
      fn(c.checked);
      // (pass 3) the keys stay the game's
      c.blur();
    });
    l.append(c, label);
    parent.append(l);
    return c;
  }

  /**
   * (tuner-ui) A drop-down: a hidden native select holds the choices and the value (code and tests read and set it as
   * before); a button shows the choice and opens the panel's own list (A or a click; the D-pad or arrows move, A /
   * Enter / a click picks, B / Esc backs out).
   */
  private mkSel(parent: HTMLElement, label: string, opts: readonly (string | number)[], fn: (v: string) => void, key: string, cls: string): HTMLSelectElement {
    const l = document.createElement('label');
    l.className = 'tt-field';
    const c = document.createElement('select');
    c.className = cls;
    c.hidden = true;
    for (const v of opts) {
      const o = document.createElement('option');
      o.value = String(v);
      o.textContent = String(v);
      c.append(o);
    }
    c.addEventListener('change', () => {
      fn(c.value);
      this.refreshDrop(b);
    });
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tt-btn tt-drop ${cls}-btn`;
    b.dataset.pad = key;
    b.append(document.createElement('span'));
    b.addEventListener('click', () => {
      if (this.drop.open && this.dropBtn === b) this.dropBack();
      else this.openDrop(b);
      b.blur();
    });
    this.dropSel.set(b, c);
    this.dropBtns.push(b);
    if (label) l.append(label);
    l.append(c, b);
    parent.append(l);
    this.refreshDrop(b);
    return c;
  }

  private mkBar(): HTMLDivElement {
    const b = document.createElement('div');
    b.className = 'tt-bar';
    return b;
  }

  /** A titled block inside a tab. */
  private block(parent: HTMLElement, title: string): HTMLDivElement {
    const d = document.createElement('div');
    d.className = 'tt-block';
    const h = document.createElement('b');
    h.className = 'tt-h';
    h.textContent = title;
    d.append(h);
    parent.append(d);
    return d;
  }

  /** The drop-down button shows its select's choice (and greys out with it). */
  private refreshDrop(b: HTMLButtonElement): void {
    const s = this.dropSel.get(b);
    if (!s) return;
    const t = s.selectedOptions[0]?.textContent ?? '-';
    const span = b.firstElementChild as HTMLElement | null;
    if (span && span.textContent !== t) span.textContent = t;
    if (b.disabled !== s.disabled) b.disabled = s.disabled;
  }

  // ------------------------------------------------------------------------------------------
  // The drop-down list
  // ------------------------------------------------------------------------------------------

  private openDrop(b: HTMLButtonElement): void {
    const s = this.dropSel.get(b);
    if (!s || s.disabled || !s.options.length) return;
    this.closeDrop();
    const list = this.dropList;
    list.replaceChildren();
    for (let i = 0; i < s.options.length; i++) {
      const o = document.createElement('div');
      o.className = i === s.selectedIndex ? 'tt-opt cur' : 'tt-opt';
      o.textContent = s.options[i]!.textContent;
      o.addEventListener('click', () => this.dropPick(i));
      list.append(o);
    }
    this.drop.openAt(Math.max(0, s.selectedIndex), s.options.length);
    this.dropBtn = b;
    list.hidden = false;
    // under the button (above it when there is no room), inside the panel
    const pr = this.el.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    const below = pr.bottom - br.bottom - 6;
    const above = br.top - pr.top - 6;
    const roomBelow = below >= Math.min(160, above);
    const maxH = Math.max(80, roomBelow ? below : above);
    list.style.maxHeight = `${maxH}px`;
    list.style.left = `${Math.max(2, br.left - pr.left)}px`;
    list.style.minWidth = `${Math.max(br.width, 120)}px`;
    list.style.maxWidth = `${Math.max(120, pr.right - br.left - 4)}px`;
    if (roomBelow) {
      list.style.top = `${br.bottom - pr.top + 2}px`;
      list.style.bottom = '';
    } else {
      list.style.top = '';
      list.style.bottom = `${pr.bottom - br.top + 2}px`;
    }
    this.markDrop();
    this.setHint();
  }

  /** The highlight on the list's current row (kept in view). */
  private markDrop(): void {
    const kids = this.dropList.children;
    for (let i = 0; i < kids.length; i++) kids[i]!.classList.toggle('hi', i === this.drop.index);
    (kids[this.drop.index] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  }

  private dropMove(d: number): void {
    this.drop.move(d);
    this.markDrop();
  }

  /** Pick a choice (`i`, else the highlighted one): the select changes (its handler runs), the list closes, and by pad the
   *  focus steps on (the next picker, or the first slider). */
  private dropPick(i?: number): void {
    const b = this.dropBtn;
    const s = b ? this.dropSel.get(b) : undefined;
    const idx = i ?? this.drop.pick();
    this.closeDrop();
    if (!b || !s) return;
    if (idx !== s.selectedIndex) {
      s.selectedIndex = idx;
      s.dispatchEvent(this.changeEv);
    }
    this.refreshDrop(b);
    this.stepOn(b.dataset.pad ?? '');
  }

  /** B / Esc / a click outside: the list closes, nothing changes. */
  private dropBack(): void {
    this.drop.back();
    this.closeDrop();
  }

  private closeDrop(): void {
    if (!this.drop.open && this.dropList.hidden) return;
    this.drop.open = false;
    this.dropBtn = null;
    this.dropList.hidden = true;
    this.dropList.replaceChildren();
    this.setHint();
  }

  /** The keyboard on an open list: arrows move, Enter picks, Esc backs out. True: taken. */
  private dropKey(e: KeyboardEvent): boolean {
    const k = e.key;
    if (k !== 'ArrowUp' && k !== 'ArrowDown' && k !== 'Enter' && k !== 'Escape') return false;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (k === 'ArrowUp') this.dropMove(-1);
    else if (k === 'ArrowDown') this.dropMove(1);
    else if (k === 'Enter') this.dropPick();
    else this.dropBack();
    return true;
  }

  /** After a pick by pad: one step on (a part: its first picker; a level: the next level, or the first slider). */
  private stepOn(key: string): void {
    let next = '';
    if (key.startsWith('part:')) {
      const sid = this.partOf.get(key.slice(5));
      if (sid) next = `lv:${sid}:0`;
    } else if (key.startsWith('lv:')) {
      const [, sid, k] = key.split(':');
      const sec = this.sections.find((s) => s.reg.id === sid);
      if (sec) {
        const n = Number(k) + 1;
        next = n < sec.levels.length && !sec.levels[n]!.disabled ? `lv:${sid}:${n}` : (sec.rows.querySelector<HTMLElement>('[data-pad]')?.dataset.pad ?? '');
      }
    }
    if (next) this.padKey = next;
    this.markPadFocus();
  }

  // ------------------------------------------------------------------------------------------
  // Tabs and sections
  // ------------------------------------------------------------------------------------------

  /** A tab's container (made on first use, hidden unless active). */
  private tabEl(id: string): HTMLDivElement {
    let t = this.tabEls.get(id);
    if (!t) {
      t = document.createElement('div');
      t.className = `anim-tune-tab anim-tune-tab-${id.replace(/[^a-z0-9_-]/gi, '-')}`;
      t.dataset.tab = id;
      t.hidden = true;
      this.tabEls.set(id, t);
      this.body.append(t);
    }
    return t;
  }

  /** The tab bar from the registered sections (`tunerLayout.buildTabs`), the LB / RB glyphs at its ends. */
  private buildTabBar(): void {
    const cur = this.tabs[this.tabIdx]?.id;
    this.tabs = buildTabs(
      this.sections.map((s) => s.reg.id),
      (id) => this.sections.find((s) => s.reg.id === id)?.reg.label ?? id,
    );
    const bar = this.tabBar;
    bar.replaceChildren();
    const lb = document.createElement('span');
    lb.className = 'tt-bump';
    lb.innerHTML = padGlyph('LB');
    bar.append(lb);
    for (let i = 0; i < this.tabs.length; i++) {
      const t = this.tabs[i]!;
      let b = this.tabBtns.get(t.id);
      if (!b) {
        b = document.createElement('button');
        b.type = 'button';
        b.className = 'tt-tab';
        b.dataset.tabBtn = t.id;
        b.textContent = t.label;
        const id = t.id;
        b.addEventListener('click', () => {
          this.setTab(this.tabs.findIndex((x) => x.id === id));
          b?.blur();
        });
        this.tabBtns.set(t.id, b);
      }
      bar.append(b);
      // the part picker of a tab with more than one section
      this.syncPartPicker(t);
    }
    const rb = document.createElement('span');
    rb.className = 'tt-bump';
    rb.innerHTML = padGlyph('RB');
    bar.append(rb);
    // Settings last in the body too (a later section's tab before it)
    const set = this.tabEls.get('settings');
    if (set) this.body.append(set);
    if (cur) {
      const i = this.tabs.findIndex((t) => t.id === cur);
      if (i >= 0) this.tabIdx = i;
    }
    this.showTab();
  }

  /** A multi-section tab's part picker: made on first need, its choices the tab's sections in order. */
  private syncPartPicker(t: TunerTab): void {
    if (t.sections.length < 2) return;
    const tabEl = this.tabEl(t.id);
    let sel = this.partSel.get(t.id);
    if (!sel) {
      const bar = this.mkBar();
      bar.classList.add('anim-tune-partbar');
      sel = this.mkSel(bar, 'Part', [], (v) => this.setPart(t.id, v), `part:${t.id}`, `anim-tune-part-${t.id}`);
      tabEl.prepend(bar);
      this.partSel.set(t.id, sel);
    }
    const want = t.sections.join(',');
    if (sel.dataset.opts !== want) {
      sel.dataset.opts = want;
      sel.replaceChildren();
      for (const id of t.sections) {
        const o = document.createElement('option');
        o.value = id;
        o.textContent = plainSection(id, this.sections.find((s) => s.reg.id === id)?.reg.label ?? id);
        sel.append(o);
      }
    }
    if (!this.partOf.has(t.id)) this.partOf.set(t.id, t.sections[0]!);
    sel.value = this.partOf.get(t.id)!;
    this.showParts(t.id);
    for (const b of this.dropBtns) if (this.dropSel.get(b) === sel) this.refreshDrop(b);
  }

  /** Switch a tab's part (section). */
  private setPart(tabId: string, sid: string): void {
    this.partOf.set(tabId, sid);
    const sel = this.partSel.get(tabId);
    if (sel && sel.value !== sid) sel.value = sid;
    this.showParts(tabId);
    const k = this.sections.findIndex((s) => s.reg.id === sid);
    if (k >= 0) this.lastSec = k;
    this.markPadFocus();
    this.refreshSel();
  }

  /** Only the tab's chosen part shows. */
  private showParts(tabId: string): void {
    const t = this.tabs.find((x) => x.id === tabId);
    if (!t) return;
    const part = t.sections.length > 1 ? this.partOf.get(tabId) : t.sections[0];
    for (const id of t.sections) {
      const s = this.sections.find((x) => x.reg.id === id);
      if (s) s.wrap.hidden = id !== part;
    }
  }

  /** Show tab `i` (LB / RB or a click): one tab's content at a time; the pad focus on its first control. */
  private setTab(i: number, focus = true): void {
    if (i < 0 || i >= this.tabs.length) return;
    this.closeDrop();
    if (this.menuOpen) this.closeMenu();
    if (this.edit) this.endEdit(false);
    this.tabIdx = i;
    this.showTab();
    if (focus) {
      this.padKey = '';
      this.padIdx = 0;
      const first = this.padItems()[0];
      this.padKey = first?.dataset.pad ?? '';
    }
    const t = this.tabs[i]!;
    const sid = t.sections.length > 1 ? this.partOf.get(t.id) : t.sections[0];
    const k = this.sections.findIndex((s) => s.reg.id === sid);
    if (k >= 0) this.lastSec = k;
    this.markPadFocus();
    this.refreshSel();
  }

  private showTab(): void {
    const cur = this.tabs[this.tabIdx]?.id;
    for (const [id, el] of this.tabEls) el.hidden = id !== cur;
    for (const [id, b] of this.tabBtns) b.classList.toggle('active', id === cur);
    const b = cur ? this.tabBtns.get(cur) : undefined;
    if (b && this.open) b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.body.scrollTop = 0;
  }

  private addSection(reg: TuneSection, rebuildBar: boolean): void {
    const kind = reg.id;
    const groups = reg.groups;
    const first = groups[0] ?? '';
    const tabId = tabOfSection(kind);
    const wrap = document.createElement('div');
    wrap.dataset.padSec = kind;
    wrap.className = `anim-tune-sec anim-tune-sec-${kind}`;
    if (reg.note) {
      const n = document.createElement('div');
      n.className = 'anim-tune-note tt-note';
      n.textContent = reg.note;
      wrap.append(n);
    }
    const prefix = sharedPrefix(groups);
    const nLev = levelCount(groups, prefix);
    const head = this.mkBar();
    // the hidden picker of every group id (tests, the console)
    const pick = document.createElement('select');
    pick.className = `anim-tune-pick-${kind}`;
    pick.hidden = true;
    for (const g of groups) {
      const o = document.createElement('option');
      o.value = g;
      o.textContent = g;
      pick.append(o);
    }
    pick.value = first;
    head.append(pick);
    const rows = document.createElement('div');
    rows.className = `anim-tune-rows-${kind}`;
    rows.style.display = 'grid';
    rows.style.gap = '1px';
    const sec: Section = { reg, pick, levels: [], rows, wrap, group: first, prefix };
    for (let k = 0; k < nLev; k++) {
      const lv = k;
      sec.levels.push(this.mkSel(head, levelName(kind, k), [], (v) => this.pickLevel(sec, lv, v), `lv:${kind}:${k}`, `anim-tune-level anim-tune-level-${kind}-${k}`));
    }
    head.append(this.mkBtn('Reset group', () => {
      tuneResetGroup(sec.group);
      this.rebuildAll();
    }, `rg:${kind}`, 'anim-tune-resetgroup'));
    pick.addEventListener('change', () => {
      // (pass 3) a manual pick turns follow off (else the next state change would take it away again)
      this.setFollow(false);
      sec.group = pick.value;
      this.rebuild(sec);
    });
    wrap.append(head, rows);
    this.tabEl(tabId).append(wrap);
    this.sections.push(sec);
    this.cand.push('');
    this.candAt.push(0);
    this.rebuild(sec);
    if (rebuildBar) this.buildTabBar();
  }

  /** A level picked: the group under the new path (follow off, as any manual pick). (fix round) A state picked on the
   *  Body part carries to the sections keyed by the same state (`carryBody`); a pick in any other section stays local. */
  private pickLevel(sec: Section, level: number, v: string): void {
    const path = groupPath(sec.group, sec.prefix);
    path[level] = v;
    const g = groupForPath(sec.reg.groups, sec.prefix, path);
    if (!g) return;
    this.setFollow(false);
    sec.group = g;
    this.rebuild(sec);
    if (sec.reg.id === 'body') this.carryBody(g);
    // (marlow-bays item 13) in the studio a state picked here plays its loop (the tab and its part stay)
    if (STUDIO.active) {
      const id = loopForGroup(sec.reg.id, g, STUDIO.entry);
      if (id && studioEntry(id).id === id) {
        this.loopFromTab = true;
        try {
          this.studioUi.play(id);
        } finally {
          this.loopFromTab = false;
        }
      }
    }
  }

  /** (fix round) A body state onto Joints, Limb reach, Hands & feet, Gun in hand, the gun hold (where it maps), Stepping
   *  and Weight; each section keeps its other levels (the weapon) and only takes a group it has. */
  private carryBody(b: string): void {
    const c = bodyCarry(b, this.carryOut);
    this.showGroup('joint', c.joint);
    this.showGroup('ik', c.ik);
    this.showLast('hand', c.handState);
    this.showLast('weapon', c.handState);
    this.showLast('gun', c.gunState);
    this.showGroup('step', c.step);
    this.showGroup('weight', c.weight);
  }

  /** (fix round) A section's last level set to `seg` (the other levels kept), when it has that group. */
  private showLast(sid: string, seg: string): void {
    if (!seg) return;
    const sec = this.sections.find((s) => s.reg.id === sid);
    if (!sec) return;
    const path = groupPath(sec.group, sec.prefix);
    path[path.length - 1] = seg;
    const g = groupForPath(sec.reg.groups, sec.prefix, path);
    const gp = g ? groupPath(g, sec.prefix) : [];
    if (g && gp[gp.length - 1] === seg) this.showGroup(sid, g);
  }

  /** The level pickers' choices for the section's group (plain words; a changed group marked with a dot). */
  private fillLevels(sec: Section): void {
    const groups = sec.reg.groups;
    const path = groupPath(sec.group, sec.prefix);
    const last = sec.levels.length - 1;
    for (let k = 0; k < sec.levels.length; k++) {
      const sel = sec.levels[k]!;
      const opts = levelOptions(groups, sec.prefix, path, k);
      sel.replaceChildren();
      for (const seg of opts) {
        const o = document.createElement('option');
        o.value = seg;
        let t = plainGroupWord(sec.reg.id, k, seg);
        if (sec.reg.id.startsWith('team_') && (seg === 'a' || seg === 'b')) {
          const note = sec.reg.notes?.(`${groups[0]!.split('.').slice(0, sec.prefix).join('.')}.${seg}`, '')[0];
          if (note) t = note.replace(/^([AB]) /, 'Role $1: ');
        }
        if (k === last) {
          const p = path.slice(0, k);
          p.push(seg);
          const g = groupForPath(groups, sec.prefix, p);
          if (g && tuneGroupChanged(g)) t += ' •';
        }
        o.textContent = t;
        sel.append(o);
      }
      sel.disabled = opts.length === 0;
      if (path[k] !== undefined) sel.value = path[k]!;
    }
    for (const b of this.dropBtns) {
      const s = this.dropSel.get(b);
      if (s && sec.levels.includes(s)) this.refreshDrop(b);
    }
  }

  private rebuildAll(): void {
    for (const s of this.sections) this.rebuild(s);
  }

  /** The slider rows of one section's group and its pickers (the pad's focus mark is put back on). */
  private rebuild(sec: Section): void {
    this.buildRows(sec);
    this.fillLevels(sec);
    this.markPadFocus();
  }

  private buildRows(sec: Section): void {
    sec.rows.replaceChildren();
    if (sec.pick.value !== sec.group) sec.pick.value = sec.group;
    const group = sec.group;
    const q = this.search;
    const kind = sec.reg.id;
    const list = tunablesFor(group).filter(
      (t) => (!this.changedOnly || tuneGet(group, t.id) !== t.def) && (!q || t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || plainLabel(kind, t.id, t.label).toLowerCase().includes(q)),
    );
    if (!list.length) {
      const none = document.createElement('div');
      none.className = 'tt-note';
      none.textContent = q ? 'No slider matches the search.' : this.changedOnly ? 'Nothing changed here.' : 'No sliders.';
      sec.rows.append(none);
      return;
    }
    for (const t of list) {
      const row = document.createElement('div');
      row.dataset.padRow = '1';
      row.className = 'tt-row';
      row.title = `${t.label} (${t.id}, default ${t.def} ${t.unit})`;
      const name = document.createElement('span');
      name.className = 'tt-name';
      name.textContent = plainLabel(kind, t.id, t.label);
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(tuneMin(t));
      input.max = String(tuneMax(t));
      input.step = String(t.step);
      input.dataset.group = group;
      input.dataset.id = t.id;
      input.dataset.pad = `s:${kind}:${t.id}`;
      // (pass 2) the value as a number field: type a value (clamped to the active range), Enter applies
      const val = document.createElement('input');
      val.type = 'number';
      val.step = 'any';
      val.className = 'anim-tune-num';
      // (typing: the field keeps what is typed until Enter or blur; otherwise it shows the value)
      val.addEventListener('input', () => (val.dataset.typing = '1'));
      val.addEventListener('change', () => {
        delete val.dataset.typing;
        const v = Number(val.value);
        if (val.value.trim() !== '' && Number.isFinite(v)) tuneSet(group, t.id, v);
        show();
      });
      val.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') val.blur();
      });
      this.rowNum.set(input, val);
      const unit = document.createElement('span');
      unit.className = 'tt-unit';
      unit.textContent = plainUnit(t.unit);
      const x = document.createElement('button');
      x.type = 'button';
      x.textContent = '×';
      x.title = 'Back to default';
      x.className = 'tt-x';
      const show = (): void => {
        const v = tuneGet(group, t.id);
        input.value = String(v);
        if (val.dataset.typing !== '1') val.value = valueText(v, t.step);
        val.classList.toggle('chg', v !== t.def);
      };
      this.rowShow.set(input, show);
      show();
      input.addEventListener('input', () => {
        tuneSet(group, t.id, Number(input.value));
        show();
      });
      // (the slider lets go of the keyboard, so the arrow keys and Space stay the game's)
      input.addEventListener('change', () => input.blur());
      // (pass 3) held: follow waits; released: the keys go back to the game
      input.addEventListener('pointerdown', () => (this.pressing = true));
      input.addEventListener('touchstart', () => (this.pressing = true), { passive: true });
      const release = (): void => {
        this.pressing = false;
        input.blur();
      };
      for (const ev of ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'lostpointercapture']) input.addEventListener(ev, release);
      x.addEventListener('click', (e) => {
        e.preventDefault();
        tuneReset(group, t.id);
        show();
      });
      row.append(name, input, val, unit, x);
      sec.rows.append(row);
      // (pass 3) the real-world target, (tuner-camera) the game's value today: small grey lines under the slider
      for (const note of tuneNotes(group, t.id)) {
        const hl = document.createElement('div');
        hl.className = note.startsWith('today:') ? 'anim-tune-hint anim-tune-today' : 'anim-tune-hint';
        hl.textContent = note;
        sec.rows.append(hl);
      }
    }
    // (marlow-bays item 10) the rows are new: the selected one is marked again
    this.refreshSel();
  }

  /** (tuner-ui) Show a section on a group (if it has it). */
  private showGroup(sid: string, g: string): void {
    if (!g || !isTuneGroup(g)) return;
    const sec = this.sections.find((s) => s.reg.id === sid);
    if (!sec || !sec.reg.groups.includes(g) || sec.group === g) return;
    sec.group = g;
    this.rebuild(sec);
  }

  /**
   * (tuner-ui) A loop picked in the Anim Studio: every section shows the group that loop plays through (the body
   * state, its joints, reach, hands and gun for the weapon in the picker, stepping, weight, the keyed clip's keys, the
   * co-op move's role A, the climb move), and follow goes off (an in-place clip stands, so follow would show idle). Off:
   * follow comes back on.
   */
  private applyLoop(id: string): void {
    if (id === 'off') {
      this.setFollow(true);
      return;
    }
    const lg = loopGroups(id, this.loopOut);
    this.setFollow(false);
    const b = lg.body;
    if (b) {
      this.showGroup('body', b);
      this.carryBody(b);
    }
    // the loop's own gait wins (the crouch run's stepping)
    this.showGroup('step', lg.step);
    this.showGroup('weight', lg.weight);
    if (lg.clip) {
      const keys = this.sections.find((s) => s.reg.id === 'keys');
      if (keys) {
        const g = groupForPath(keys.reg.groups, keys.prefix, [lg.clip, '0']);
        if (g && groupPath(g, keys.prefix)[0] === lg.clip) this.showGroup('keys', g);
      }
    }
    if (lg.team) {
      const sid = `team_${lg.team.split('.')[1]}`;
      this.showGroup(sid, lg.team);
      if (this.sections.some((s) => s.reg.id === sid)) this.setPart('coop', sid);
    }
    if (lg.trav) {
      this.showGroup('trav', lg.trav);
      if (!b && !this.loopFromTab) this.setPart('body', 'trav');
    } else if (b && !this.loopFromTab) this.setPart('body', 'body');
  }

  private setFollow(v: boolean): void {
    this.follow = v;
    this.followBox.checked = v;
    if (v) this.syncFollow(true);
  }

  /** A slider or picker of the panel is in use (follow must not rebuild it away). */
  private busy(): boolean {
    const a = document.activeElement;
    // (tuner-pad) the pad tuning too: the rows stay under the pad's focus
    return this.pressing || this.drop.open || this.pad.mode === 'tuner' || (!!a && this.el.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT'));
  }

  /**
   * Follow the local player's current state (when on): a new state takes over once it has held FOLLOW_HOLD_MS, never
   * while a slider is held or focused (`force`: now, as on opening).
   */
  private syncFollow(force = false): void {
    if (!this.follow) return;
    if (!force && this.busy()) return;
    const now = performance.now();
    for (let k = 0; k < this.sections.length; k++) {
      const s = this.sections[k]!;
      const cur = s.reg.select?.(TUNE_STATE) ?? null;
      if (!cur) continue;
      if (force) {
        this.cand[k] = '';
        if (s.group !== cur) {
          s.group = cur;
          this.rebuild(s);
        }
        continue;
      }
      if (cur === s.group) {
        this.cand[k] = '';
        continue;
      }
      if (this.cand[k] !== cur) {
        this.cand[k] = cur;
        this.candAt[k] = now;
      } else if (now - this.candAt[k]! >= FOLLOW_HOLD_MS) {
        this.cand[k] = '';
        s.group = cur;
        this.rebuild(s);
      }
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void saveAnimTune(tuneSnapshot());
    }, SAVE_DELAY);
  }

  private saveUi(): void {
    // (marlow-bays item 14) the Anim Studio's Stage light goes with the panel's own settings
    void saveAnimTuneUi({ size: this.size, pauseTuning: this.freezeBox.checked, stageLight: STUDIO_LIGHT.scale });
  }

  /** (tuner-ui) The panel size (S / M / L) scaled to the screen (`tunerLayout.tunerScale`). */
  private setSize(s: TunerSize, save: boolean): void {
    this.size = s;
    if (this.sizeSel.value !== s) this.sizeSel.value = s;
    for (const b of this.dropBtns) if (this.dropSel.get(b) === this.sizeSel) this.refreshDrop(b);
    this.applySize();
    if (save) this.saveUi();
  }

  private applySize(): void {
    if (typeof window === 'undefined') return;
    const sc = tunerScale(this.size, window.innerWidth, window.innerHeight);
    this.el.style.fontSize = `${sc.font}px`;
    this.el.style.width = `${sc.width}px`;
    this.el.style.maxHeight = `${sc.height}px`;
    this.closeDrop();
  }

  private exportFile(): void {
    const now = new Date();
    const blob = new Blob([JSON.stringify(tuneExport(now), null, 2)], { type: 'application/json' });
    download(blob, tuneExportName(now));
  }

  /** The Anim tool button: open or close. Returns whether it is open now. */
  toggle(): boolean {
    if (this.open) this.hide();
    else this.show();
    return this.open;
  }

  /** (tuner-ui) Out of the Anim Studio: follow is back on. */
  private studioLeft(): void {
    if (this.wasStudio && !STUDIO.active) this.setFollow(true);
    this.wasStudio = STUDIO.active;
  }

  /** Open (F3 > Anim, Pause or Settings): stays open over play until closed. */
  show(): void {
    this.open = true;
    this.studioLeft();
    // (fix round) the co-op lock is read live (a fold or a close never leaves it stale)
    this.refreshCoop();
    this.el.hidden = false;
    this.applySize();
    // (anim-studio) in the studio the loop player shows, and the pad starts on the loop list in the View tab
    this.studioUi.sync();
    if (STUDIO.active) this.setTab(this.tabs.findIndex((t) => t.id === 'view'), false);
    // (tuner-pad) opening takes the pad focus (once the press that opened it is released)
    this.pad.open();
    this.edit = null;
    this.stickAcc = 0;
    this.syncFollow(true);
    const first = this.padItems()[0];
    this.padKey = STUDIO.active ? 'st:entry' : (first?.dataset.pad ?? '');
    this.setPadLine();
    this.markPadFocus();
    this.syncTuneFreeze();
    // (marlow-bays item 9) open: the pointer free (drag view) by default
    this.mouseCtl.setOpen(true);
    this.applyMouse();
    this.refreshSel();
    this.onOpenChange?.(true);
  }

  hide(): void {
    // (tuner-camera) closing ends the free view, the freeze and the slow motion, and shows the HUD
    this.setFreeMode('off');
    if (this.hudBox.checked) {
      this.hudBox.checked = false;
      document.body.classList.remove('tune-hide-hud');
    }
    this.closeDrop();
    if (this.frozen) this.setFrozen(false);
    this.tuneWant = false;
    if (this.runScale !== 1) this.setTimeScale(1);
    if (this.menuOpen) this.closeMenu();
    this.edit = null;
    this.open = false;
    this.padBypass = this.keyBypass = false;
    this.applyBypass();
    this.el.hidden = true;
    this.pad.close();
    this.markPadFocus();
    this.clearMarker();
    this.selMark.shown = false;
    this.studioUi.panelClosed();
    // (marlow-bays item 9) closed: play's own pointer lock again
    this.mouseCtl.setOpen(false);
    this.applyMouse();
    this.onOpenChange?.(false);
  }

  // ------------------------------------------------------------------------------------------
  // Pad
  // ------------------------------------------------------------------------------------------

  /**
   * (tuner-pad) The gamepad source's hook, every poll (seconds): returns true while the pad is the tuner's (the game and
   * the menus then get none of it). No allocation unless the focus, a value or the mode changes.
   */
  padPoll(pad: Gamepad, now: number, dt: number): boolean {
    this.lastPoll = performance.now();
    // (tuner-ui) the pause menu is open: the menus get the pad (every held button stays swallowed once it closes)
    if (this.open && this.menuPaused?.()) {
      this.pad.hold();
      this.clearFreeIn();
      return false;
    }
    let mask = 0;
    const btns = pad.buttons;
    const n = Math.min(btns.length, 17);
    for (let i = 0; i < n; i++) {
      const b = btns[i]!;
      if (b.pressed || b.value > 0.5) mask |= 1 << i;
    }
    const o = this.pad.update(mask, pad.axes[0] ?? 0, now, dt);
    if (!this.open) return o.consume;
    // (pass 2) R3 held: the bypass
    if (o.bypass !== this.padBypass) {
      this.padBypass = o.bypass;
      this.applyBypass();
    }
    // (tuner-camera) the free view's pad input while it has the pad
    if (this.pad.mode === 'free' && !o.toggled && !o.freeOff && !o.close) this.padFree(pad);
    else this.clearFreeIn();
    if (o.close) {
      this.hide();
      return true;
    }
    if (o.freeOff) {
      this.setFreeMode('off');
      return true;
    }
    // (marlow-bays item 13) L3: loop on the spot (the tuner or the free view has the pad)
    if (o.spot && STUDIO.active) this.toggleSpot();
    if (o.toggled) {
      this.onPadToggled();
      return o.consume;
    }
    if (this.pad.mode !== 'tuner') return o.consume;
    // (tuner-ui) an open list: the D-pad moves, A picks, B backs out
    if (this.drop.open) {
      if (o.nav !== 0) this.dropMove(o.nav);
      if (o.select) this.dropPick();
      else if (o.back) this.dropBack();
      return o.consume;
    }
    if (this.edit) {
      if (o.select) this.endEdit(false);
      else if (o.back) this.endEdit(true);
      else {
        if (o.reset) this.padReset();
        if (o.adjust !== 0) this.padAdjust(o.adjust, o.fine);
        if (o.stick === 0) this.stickAcc = 0;
        else this.padStick(o.stick, o.fine);
      }
      return o.consume;
    }
    if (o.menu) {
      if (this.menuOpen) this.closeMenu();
      else this.openMenu();
      return o.consume;
    }
    if (o.back) {
      if (this.menuOpen) this.closeMenu();
      else this.backStep();
      return o.consume;
    }
    if (o.nav !== 0) this.padNav(o.nav);
    if (!this.menuOpen) {
      if (o.section !== 0) this.setTab(cycleTab(this.tabIdx, o.section, this.tabs.length));
      if (o.group !== 0) this.padGroup(o.group);
      if (o.reset) this.padReset();
    }
    if (o.select) this.padSelect();
    return o.consume;
  }

  /** View moved the pad: to the tuner (the panel unfolds; the game holds still with "Pause game while tuning"), to the
   *  game (an automatic pause ends) or to the free view (the panel folds). */
  private onPadToggled(): void {
    this.refreshCoop();
    this.stickAcc = 0;
    this.edit = null;
    this.closeDrop();
    if (this.menuOpen) this.closeMenu();
    const m = this.pad.mode;
    if (m === 'tuner') this.setFolded(false);
    else if (m === 'free') this.setFolded(true);
    this.syncTuneFreeze();
    this.setPadLine();
    this.markPadFocus();
  }

  /**
   * (tuner-ui) "Pause game while tuning": the game holds still while the panel has the pad (a pad in use, the panel in
   * the tuner mode); not in the Anim Studio (the loop player's Play / Pause rules), co-op or under the pause menu. Edge
   * triggered: a Resume by hand meanwhile stays.
   */
  private syncTuneFreeze(): void {
    const want =
      this.open &&
      this.pad.mode === 'tuner' &&
      this.freezeBox.checked &&
      !STUDIO.active &&
      !this.coopOn &&
      !(this.menuPaused?.() ?? false) &&
      document.body.classList.contains('input-gamepad');
    if (want === this.tuneWant) return;
    this.tuneWant = want;
    if (want) {
      if (!this.frozen) this.setFrozen(true, true);
    } else if (this.autoFrozen) this.setFrozen(false);
  }

  private setPadLine(): void {
    const m = this.pad.mode;
    let t = m === 'game' ? 'Pad: game' : m === 'free' ? 'Pad: camera' : m === 'tuner' ? 'Pad: tuner' : '';
    if (this.frozen) t += ' · paused';
    if (TUNE_FLAGS.bypass) t += ' · untuned';
    this.padLine.textContent = t;
    this.setHint();
  }

  /** The hints for what the pad (or the keyboard and mouse) does now, in the reserved strip at the bottom. */
  private setHint(): void {
    const m = this.pad.mode;
    let pad: string;
    let keys: string;
    if (m === 'game') {
      pad = hint(['VIEW'], 'back to the tuner') + hint(['START'], 'pause menu');
      keys = 'Click the panel to tune. ` held: untuned.';
    } else if (m === 'free') {
      pad =
        FREE_VIEW.mode === 'orbit'
          ? hint(['LSTICK'], 'move her') + hint([], 'Right stick: orbit') + hint(['LT', 'RT'], 'zoom') + hint(['B'], 'camera off') + hint(['VIEW'], 'panel')
          : hint(['LSTICK'], 'fly') + hint([], 'Right stick: look') + hint(['LB', 'RB'], 'down / up') + hint(['B'], 'camera off') + hint(['VIEW'], 'panel');
      keys = 'WASD: move. Mouse: look. Wheel: zoom.';
    } else if (this.drop.open) {
      pad = hint(['DPAD'], 'move') + hint(['A'], 'pick') + hint(['B'], 'back');
      keys = 'Arrows: move. Enter or click: pick. Esc: back.';
    } else if (this.edit) {
      pad = hint(['DPAD'], 'change (hold: faster)') + hint(['LSTICK'], 'fast') + hint(['LT'], 'fine') + hint(['A'], 'keep') + hint(['B'], 'undo') + hint(['X'], 'default');
      keys = 'Type a value and press Enter.';
    } else if (this.menuOpen) {
      pad = hint(['DPAD'], 'move') + hint(['A'], 'choose') + hint(['B'], 'close');
      keys = 'Click an item.';
    } else {
      pad = hint(['LB', 'RB'], 'tab') + hint(['DPAD'], 'move') + hint(['A'], 'open / edit') + hint(['B'], 'back') + hint(['X'], 'reset') + hint(['Y'], 'more') + hint(['VIEW'], 'game') + hint(['START'], 'close');
      keys = 'Click a tab, a list or a slider. Type a value, Enter. Ctrl+Z: undo. ` held: untuned.';
    }
    const k = `${m}|${pad}|${keys}`;
    if (k === this.hintKey) return;
    this.hintKey = k;
    this.hint.innerHTML = m === 'off' ? '' : `<span class="tt-pad">${pad}</span><span class="tt-keys"><span>${keys}</span></span>`;
  }

  /** The focusable controls of the active tab (the menu's while it is open), in order, that show now. */
  private padItems(): HTMLElement[] {
    const root = this.menuOpen ? this.menu : this.tabEls.get(this.tabs[this.tabIdx]?.id ?? '');
    const out: HTMLElement[] = [];
    if (!root) return out;
    for (const e of Array.from(root.querySelectorAll<HTMLElement>('[data-pad]'))) if (e.offsetParent !== null && !(e as HTMLButtonElement).disabled) out.push(e);
    return out;
  }

  /** Mark the pad's focused control (only while the pad is the tuner's), keeping the focus by its key across rebuilds. */
  private markPadFocus(): void {
    if (this.padMark) {
      this.padMark.classList.remove('tt-focus', 'tt-edit');
      this.padMark = null;
    }
    if (!this.open || this.pad.mode !== 'tuner') {
      this.padEl = null;
      this.setHint();
      return;
    }
    const items = this.padItems();
    if (!items.length) {
      this.padEl = null;
      this.setHint();
      return;
    }
    let i = this.padKey ? items.findIndex((e) => e.dataset.pad === this.padKey) : -1;
    if (i < 0) i = Math.max(0, Math.min(items.length - 1, this.padIdx));
    const e = items[i]!;
    this.padIdx = i;
    this.padEl = e;
    this.padKey = e.dataset.pad ?? '';
    const mark = e.closest<HTMLElement>('[data-pad-row]') ?? e.closest<HTMLElement>('label') ?? e;
    mark.classList.add(this.edit ? 'tt-edit' : 'tt-focus');
    mark.scrollIntoView({ block: 'nearest' });
    this.padMark = mark;
    const sid = e.closest<HTMLElement>('[data-pad-sec]')?.dataset.padSec;
    const k = this.sections.findIndex((s) => s.reg.id === sid);
    if (k >= 0) this.lastSec = k;
    // (marlow-bays item 10) the pad's focus moved onto a slider: that row is selected (a rebuild keeps a mouse pick)
    if (this.padKey.startsWith('s:') && this.padKey !== this.selPadKey) {
      this.selPadKey = this.padKey;
      this.selKey = this.padKey;
      this.refreshSel();
    }
    this.setHint();
  }

  /** D-pad: the previous / next control (wraps). */
  private padNav(d: number): void {
    const items = this.padItems();
    if (!items.length) return;
    const at = this.padEl ? items.indexOf(this.padEl) : -1;
    const i = ((at < 0 ? this.padIdx : at) + d + items.length) % items.length;
    this.padKey = items[i]!.dataset.pad ?? '';
    this.padIdx = i;
    this.disarmResetAll();
    this.markPadFocus();
  }

  /** (tuner-ui) B with nothing open: from a slider back to its section's state picker (one step back). */
  private backStep(): void {
    const key = this.padKey;
    if (!key.startsWith('s:')) return;
    const sid = key.split(':')[1] ?? '';
    const sec = this.sections.find((s) => s.reg.id === sid);
    if (!sec) return;
    this.padKey = `lv:${sid}:${sec.levels.length - 1}`;
    this.markPadFocus();
  }

  /** LT / RT: the focused section's previous / next choice at its last level (follow off, as a manual pick); the same
   *  slider stays focused when the new group has it. */
  private padGroup(d: number): void {
    const sec = this.sections[this.lastSec];
    if (!sec) return;
    const k = sec.levels.length - 1;
    const path = groupPath(sec.group, sec.prefix);
    const opts = levelOptions(sec.reg.groups, sec.prefix, path, k);
    if (opts.length < 2) return;
    const at = Math.max(0, opts.indexOf(path[k] ?? ''));
    this.pickLevel(sec, k, opts[(at + d + opts.length) % opts.length]!);
  }

  /** X: the focused slider back to its default. */
  private padReset(): void {
    const e = this.padEl;
    if (!(e instanceof HTMLInputElement) || e.type !== 'range' || !e.dataset.group) return;
    tuneReset(e.dataset.group, e.dataset.id ?? '');
    this.rowShow.get(e)?.();
  }

  /** A: open a list, start editing a slider, press a button or tick a box. */
  private padSelect(): void {
    const e = this.padEl;
    if (!e || (e as HTMLInputElement).disabled) return;
    const key = e.dataset.pad ?? '';
    if (key === 'resetall' || key === 'm:resetall') {
      this.armResetAll();
      return;
    }
    if (e instanceof HTMLButtonElement && this.dropSel.has(e)) {
      this.openDrop(e);
      return;
    }
    if (e instanceof HTMLInputElement && e.type === 'range') {
      this.edit = { el: e, orig: e.dataset.group ? tuneGet(e.dataset.group, e.dataset.id ?? '') : Number(e.value) };
      this.pad.editing = true;
      this.stickAcc = 0;
      // (pass 2) a keyboard can type the value into the row's number field meanwhile
      const num = this.rowNum.get(e);
      if (num) {
        num.focus({ preventScroll: true });
        num.select();
      }
      this.markPadFocus();
      return;
    }
    e.click();
    this.markPadFocus();
  }

  /** A keeps the edit, B puts the value back. */
  private endEdit(cancel: boolean): void {
    const ed = this.edit;
    if (!ed) return;
    this.edit = null;
    this.pad.editing = false;
    if (cancel) {
      const e = ed.el;
      if (e.dataset.group) {
        tuneSet(e.dataset.group, e.dataset.id ?? '', ed.orig);
        this.rowShow.get(e)?.();
      } else {
        e.value = String(ed.orig);
        e.dispatchEvent(this.inputEv);
      }
    }
    // a value typed meanwhile applies on A (B drops it)
    const num = this.rowNum.get(ed.el);
    if (num) {
      if (num.dataset.typing === '1') {
        if (cancel) {
          delete num.dataset.typing;
          this.rowShow.get(ed.el)?.();
        } else num.dispatchEvent(this.changeEv);
      }
      if (document.activeElement === num) num.blur();
    }
    this.markPadFocus();
  }

  /** Editing: `steps` steps of the slider (a fifth of one with LT held). */
  private padAdjust(steps: number, fine: boolean): void {
    const e = this.edit?.el;
    if (!e) return;
    const unit = (Number(e.step) || 1) * (fine ? FINE_STEP : 1);
    const g = e.dataset.group;
    if (!g) {
      // a plain range (the game speed, the loop's time): through its own input handler
      e.value = String(Math.max(Number(e.min), Math.min(Number(e.max), Number(e.value) + steps * unit)));
      e.dispatchEvent(this.inputEv);
      return;
    }
    const id = e.dataset.id ?? '';
    tuneSet(g, id, tuneGet(g, id) + steps * unit);
    this.rowShow.get(e)?.();
  }

  /** Editing a slider: the left stick, a share of its range per frame, applied in whole (fine) steps. */
  private padStick(share: number, fine: boolean): void {
    const e = this.edit?.el;
    if (!e) return;
    const unit = (Number(e.step) || 1) * (fine ? FINE_STEP : 1);
    this.stickAcc += share * (Number(e.max) - Number(e.min));
    const steps = Math.trunc(this.stickAcc / unit);
    if (steps !== 0) {
      this.stickAcc -= steps * unit;
      this.padAdjust(steps, fine);
    }
  }

  private openMenu(): void {
    this.menuBack = this.padKey;
    this.menuOpen = true;
    this.menu.style.display = 'flex';
    this.padKey = 'm:undo';
    this.disarmResetAll();
    this.markPadFocus();
  }

  private closeMenu(): void {
    this.menuOpen = false;
    this.menu.style.display = 'none';
    this.padKey = this.menuBack;
    this.disarmResetAll();
    this.markPadFocus();
  }

  /** A menu action, then the menu closes. */
  private menuDo(fn: () => void): void {
    fn();
    if (this.menuOpen) this.closeMenu();
  }

  /** Reset all by pad: the first A arms it, the second resets (the mouse button keeps its confirm dialog). */
  private armResetAll(): void {
    if (!this.confirmAll) {
      this.confirmAll = true;
      this.info.textContent = 'Reset all: press A again to reset every value';
      return;
    }
    this.confirmAll = false;
    tuneResetAll();
    this.rebuildAll();
    this.info.textContent = 'Every value reset.';
    if (this.menuOpen) this.closeMenu();
  }

  private disarmResetAll(): void {
    this.confirmAll = false;
  }

  /** (anim-studio) A short line in the info row (undo, A/B, presets), held 2.5 s before the counts come back. */
  private flashInfo(text: string): void {
    this.info.textContent = text;
    this.nextInfo = performance.now() + 2500;
  }

  private resetFocusedGroup(): void {
    const s = this.sections[this.lastSec];
    if (!s) return;
    tuneResetGroup(s.group);
    this.rebuildAll();
  }

  /** (tuner-camera) The pad's sticks, triggers, bumpers and D-pad into the free view's input. No allocation. */
  private padFree(pad: Gamepad): void {
    const ax = pad.axes;
    const b = pad.buttons;
    FREE_IN.lx = freeAxis(ax[0] ?? 0);
    FREE_IN.ly = -freeAxis(ax[1] ?? 0);
    FREE_IN.rx = freeAxis(ax[2] ?? 0);
    FREE_IN.ry = -freeAxis(ax[3] ?? 0);
    FREE_IN.zoom = (b[PAD.RT]?.value ?? 0) - (b[PAD.LT]?.value ?? 0);
    FREE_IN.rise = (b[PAD.RB]?.pressed ? 1 : 0) - (b[PAD.LB]?.pressed ? 1 : 0);
    FREE_IN.nudge = (b[PAD.UP]?.pressed ? 1 : 0) - (b[PAD.DOWN]?.pressed ? 1 : 0);
  }

  private clearFreeIn(): void {
    FREE_IN.lx = FREE_IN.ly = FREE_IN.rx = FREE_IN.ry = FREE_IN.zoom = FREE_IN.rise = FREE_IN.nudge = 0;
  }

  // ------------------------------------------------------------------------------------------
  // Free view, camera lock and time
  // ------------------------------------------------------------------------------------------

  /**
   * (tuner-camera) Free view off / orbit / fly: the game reads FREE_VIEW each frame. `takePad` (default): the pad goes to
   * the free view and the panel folds; a held snap keeps the pad on the panel. Off or fly ends a held snap.
   */
  setFreeMode(m: FreeMode, takePad = true): void {
    const was = FREE_VIEW.mode;
    FREE_VIEW.mode = m;
    if (m !== 'orbit') FREE_VIEW.lock = '';
    if (this.freeSel.value !== m) this.freeSel.value = m;
    for (const b of this.dropBtns) if (this.dropSel.get(b) === this.freeSel) this.refreshDrop(b);
    this.clearFreeIn();
    FREE_IN.wheel = 0;
    this.pad.setFree(m !== 'off', takePad);
    if (m !== 'off' && was === 'off' && this.pad.mode === 'free') this.setFolded(true);
    if (m === 'off' && was !== 'off') this.setFolded(false);
    this.showLock();
    this.setPadLine();
    this.markPadFocus();
  }

  /** (tuner-ui) A camera snap that holds: the orbit keeps this angle to her facing until Unlock or another snap. The pad
   *  stays on the panel (View hands it to the camera). */
  private lockSnap(s: FreeSnap): void {
    FREE_VIEW.lock = s;
    FREE_VIEW.snap = s;
    if (FREE_VIEW.mode !== 'orbit') this.setFreeMode('orbit', false);
    FREE_VIEW.lock = s;
    this.showLock();
  }

  private unlockSnap(): void {
    FREE_VIEW.lock = '';
    this.showLock();
  }

  private showLock(): void {
    const l = FREE_VIEW.lock;
    this.lockLine.textContent = l ? `Locked: ${plainWords(l)}` : FREE_VIEW.mode === 'orbit' ? 'Not locked' : '';
    this.unlockBtn.disabled = !l;
    for (const [s, b] of this.snapBtns) b.classList.toggle('on', s === l);
  }

  /** (tuner-camera) Slow motion: the running time scale (the fixed step stays). Frozen, it applies on resume. */
  private setTimeScale(v: number): void {
    this.refreshCoop();
    const s = this.coopOn ? 1 : freeTimeScale(v, this.speedMax);
    this.runScale = s;
    if (this.loop && !this.frozen) this.loop.timeScale = s;
    this.showSpeed();
  }

  private showSpeed(): void {
    const s = String(Number(this.runScale.toFixed(2)));
    if (this.speedIn.value !== s && this.edit?.el !== this.speedIn) this.speedIn.value = s;
    this.speedVal.textContent = `${s}×`;
  }

  /** (fix round) Read the co-op state now (setCoop is a no-op when it has not changed). */
  private refreshCoop(): void {
    this.setCoop(this.coop?.() ?? false);
  }

  /** (pass 2) Co-op: the time controls are off (never on the wire; the local sim drives the session). */
  private setCoop(on: boolean): void {
    if (on === this.coopOn) return;
    this.coopOn = on;
    this.coopNote.hidden = !on;
    this.speedIn.disabled = this.pauseBtn.disabled = this.stepBtn.disabled = this.freezeBox.disabled = on;
    if (on) {
      if (this.frozen) this.setFrozen(false);
      this.setTimeScale(1);
    }
  }

  /** (pass 2) The bypass: every section reads identity while R3 or Backquote is held. */
  private setKeyBypass(on: boolean): void {
    if (on === this.keyBypass) return;
    this.keyBypass = on;
    this.applyBypass();
  }

  private applyBypass(): void {
    TUNE_FLAGS.bypass = this.open && (this.padBypass || this.keyBypass);
    this.setPadLine();
  }

  /** (pass 2) Import: the file picker (a pad press may not count as a user gesture for it: then use the mouse). */
  private importPick(): void {
    this.fileIn.value = '';
    this.fileIn.click();
  }

  private async importFile(): Promise<void> {
    const f = this.fileIn.files?.[0];
    if (!f) return;
    let data: unknown;
    try {
      data = JSON.parse(await f.text());
    } catch {
      this.info.textContent = `Import refused: ${f.name} is not JSON.`;
      return;
    }
    const r = tuneImport(data, f.name);
    this.rebuildAll();
    this.info.textContent = r.ok ? `Imported ${f.name}: ${r.applied} values${r.pending ? `, ${r.pending} kept for later sections` : ''}.` : `Import refused: ${r.error}.`;
    this.nextInfo = performance.now() + 4000;
  }

  /** (pass 2) Freeze: time scale 0 (the sim stops, rendering, the camera tuning and the free view go on). `auto`: by the
   *  tuner holding the pad (giving the pad back resumes). */
  setFrozen(on: boolean, auto = false): void {
    if (on) this.refreshCoop();
    const lp = this.loop;
    if (!lp || (on && this.coopOn)) return;
    if (on) {
      if (!this.frozen && lp.timeScale > 0) this.runScale = freeTimeScale(lp.timeScale, this.speedMax);
      lp.timeScale = 0;
      this.frozen = true;
      this.autoFrozen = auto;
    } else {
      if (this.frozen) lp.timeScale = this.runScale;
      this.frozen = false;
      this.autoFrozen = false;
    }
    this.pauseBtn.textContent = this.frozen ? 'Resume' : 'Pause';
    this.setPadLine();
  }

  /** (pass 2) One sim step (1/60 s) on a frozen game (freezes it first). */
  private stepFrame(): void {
    this.refreshCoop();
    if (this.coopOn) return;
    if (!this.frozen) this.setFrozen(true);
    this.loop?.stepHeadless?.(STEP_S);
  }

  /** Folded: only the header bar shows (a short phone screen). */
  setFolded(v: boolean): void {
    this.folded = v;
    this.body.hidden = this.tabBar.hidden = v;
    this.closeDrop();
    this.foldBtn.textContent = v ? '+' : '_';
  }

  /**
   * Share / Copy the export: the share sheet with the file where the browser can share files, else the clipboard, else
   * the JSON in a text box to select by hand. Each step feature-detected and guarded.
   */
  private async shareFile(): Promise<void> {
    const now = new Date();
    const json = JSON.stringify(tuneExport(now), null, 2);
    const name = tuneExportName(now);
    this.shareOut.hidden = true;
    try {
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (typeof File !== 'undefined' && typeof nav.share === 'function' && nav.canShare) {
        const file = new File([json], name, { type: 'application/json' });
        if (nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: name });
          this.info.textContent = 'Shared.';
          return;
        }
      }
    } catch (e) {
      // the user closing the share sheet is not a failure worth a fallback
      if (e instanceof Error && e.name === 'AbortError') return;
    }
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(json);
        this.info.textContent = 'Copied to the clipboard.';
        return;
      }
    } catch {
      // fall through to the text box
    }
    this.shareOut.value = json;
    this.shareOut.hidden = false;
    this.shareOut.focus();
    this.shareOut.select();
  }

  get isOpen(): boolean {
    return this.open;
  }

  setScene(scene: Scene | null): void {
    this.clearMarker();
    this.scene = scene;
  }

  /** Every frame (driven by the debug overlay whether or not it is shown). */
  frame(nowMs: number): void {
    if (!this.open) return;
    // (fix round) every frame, folded or not: one property read
    this.refreshCoop();
    if (this.wasStudio !== STUDIO.active) this.studioLeft();
    // (fix round) the free view's pad input stops when the pad stops being polled (a disconnect)
    if (FREE_VIEW.mode !== 'off' && performance.now() - this.lastPoll > PAD_STALE_MS) this.clearFreeIn();
    this.syncFollow();
    // a level load (or a slow beat's end) resets the loop's time scale: the freeze is over, the speed back to 1
    const lp = this.loop;
    if (this.frozen && lp && lp.timeScale !== 0) {
      this.frozen = this.autoFrozen = false;
      this.tuneWant = false;
      this.pauseBtn.textContent = 'Pause';
      this.setPadLine();
    }
    // (tuner-ui) pause while tuning follows the input device and the pause menu
    this.syncTuneFreeze();
    // (anim-studio) the game speed may go to 2x inside the studio only (back to 1x at most on leaving it)
    const mx = STUDIO.active ? STUDIO_SPEED.max : GAME_SPEED.max;
    if (mx !== this.speedMax) {
      this.speedMax = mx;
      this.speedIn.max = String(mx);
      if (this.runScale > mx) this.setTimeScale(mx);
    }
    if (!this.frozen && lp && lp.timeScale !== this.runScale) {
      this.runScale = freeTimeScale(lp.timeScale, this.speedMax);
      this.showSpeed();
    }
    this.snaps.frame(nowMs);
    this.studioUi.frame(nowMs, this.scene);
    this.showSpot();
    if (!this.folded && nowMs >= this.nextDrops) {
      // the drop-down buttons follow their selects (a value set in code: the studio, presets)
      this.nextDrops = nowMs + 250;
      for (const b of this.dropBtns) if (b.offsetParent !== null) this.refreshDrop(b);
      this.showLock();
    }
    if (!this.folded && nowMs >= this.nextInfo) {
      this.nextInfo = nowMs + 250;
      const gun = TUNE_STATE.gun ? plainWords(TUNE_STATE.gun.replace('.', ' ')) : 'Unarmed';
      this.now.textContent = `Now: ${TUNE_STATE.body ? plainWords(TUNE_STATE.body) : '-'} · ${gun}${this.follow ? '' : ' · follow off'}${this.frozen ? ' · paused' : ''}`;
      if (!this.confirmAll) this.info.textContent = `${tuneChanged().length} changed`;
    }
    // (marlow-bays item 10) the barrel and the selection share the overlay
    const k = this.selTarget.kind;
    if (this.marker || k === 'joint' || k === 'body' || k === 'weapon') this.drawMarker(nowMs);
    else if (this.selMark.shown || (this.markCanvas && !this.markCanvas.hidden)) {
      this.selMark.shown = false;
      this.clearMarker();
    }
  }

  // ------------------------------------------------------------------------------------------
  // (marlow-bays item 9) The mouse mode
  // ------------------------------------------------------------------------------------------

  /** (marlow-bays item 13) Loop on the spot on / off (the header button, its key, L3; the studio only). */
  private toggleSpot(): void {
    if (!STUDIO.active) return;
    const on = this.studioUi.toggleSpot();
    this.showSpot();
    this.flashInfo(on ? 'Loop on the spot: a moving state runs in place' : 'Loop on the spot off: she moves');
  }

  /** The header button follows the studio and the switch (cheap compares, every frame). */
  private showSpot(): void {
    const b = this.spotBtn;
    const hide = !STUDIO.active;
    if (b.hidden !== hide) b.hidden = hide;
    if (hide) return;
    const t = STUDIO.spot ? 'On the spot: on' : 'On the spot: off';
    if (b.textContent !== t) b.textContent = t;
    if (b.classList.contains('on') !== STUDIO.spot) b.classList.toggle('on', STUDIO.spot);
  }

  /** The key or the header button: drag view <-> game camera. */
  private toggleMouse(): void {
    this.mouseCtl.toggle();
    this.applyMouse();
    this.flashInfo(this.mouseCtl.mode === 'drag' ? `Drag view: drag the scene to turn the camera, the wheel zooms (${TUNER_MOUSE_KEY}: game camera)` : `Game camera: mouse look (${TUNER_MOUSE_KEY} or Esc: back to the panel)`);
  }

  /** The mode onto the mouse source, the panel's pointer events and the button. */
  private applyMouse(): void {
    this.mouseHost?.setFree(this.mouseCtl.free);
    this.el.classList.toggle('tt-gamecam', !this.mouseCtl.panelMouse);
    const t = TUNER_MOUSE_LABEL[this.mouseCtl.mode];
    if (this.mouseBtn.textContent !== t) this.mouseBtn.textContent = t;
    this.mouseBtn.classList.toggle('on', this.mouseCtl.open && this.mouseCtl.mode === 'game');
  }

  /** The pointer lock was lost in play (Esc, alt-tab): in game camera the panel takes the mouse back (no pause). */
  mouseLockLost(): boolean {
    const handled = this.mouseCtl.lockLost();
    if (handled) {
      this.applyMouse();
      this.flashInfo('Drag view (the mouse capture ended)');
    }
    return handled;
  }

  // ------------------------------------------------------------------------------------------
  // (marlow-bays item 10) The selection: the row being edited, its target, the "Selected" line
  // ------------------------------------------------------------------------------------------

  private pickRow(key: string): void {
    this.selKey = key;
    this.refreshSel();
  }

  /**
   * The selection from the tab shown: the picked row when it is in the shown part, else the part as a whole; the row
   * marked (`tt-sel`), the target for the scene marker, the "Selected" line. Only on a change of tab, part, rows or
   * pick (DOM work, never per frame).
   */
  private refreshSel(): void {
    const line = this.selLine;
    if (!line) return;
    const t = this.tabs[this.tabIdx];
    const sid = t ? ((t.sections.length > 1 ? this.partOf.get(t.id) : undefined) ?? t.sections[0] ?? '') : '';
    const parts = rowKeyParts(this.selKey);
    const id = parts && parts.section === sid ? parts.id : '';
    this.selSec = sid;
    tuneTarget(sid, id, this.selTarget);
    let row: HTMLElement | null = null;
    if (id) {
      const inp = this.el.querySelector<HTMLElement>(`input[data-pad="${globalThis.CSS.escape(this.selKey)}"]`);
      row = inp?.closest<HTMLElement>('[data-pad-row]') ?? null;
    }
    if (row !== this.selRow) {
      this.selRow?.classList.remove('tt-sel');
      this.selRow = row;
    }
    row?.classList.add('tt-sel');
    const sec = this.sections.find((s) => s.reg.id === sid);
    if (!sec || this.selTarget.kind === 'none') {
      line.textContent = '';
      line.hidden = true;
      return;
    }
    const state = sec.group ? plainWords(sec.group.split('.').slice(1).join(' ')) : '';
    const what = row?.querySelector('.tt-name')?.textContent ?? 'whole part';
    line.hidden = false;
    line.textContent = `▶ ${sec.reg.label}${state ? ` · ${state}` : ''} · ${what} → ${this.selTarget.label}`;
  }

  // ------------------------------------------------------------------------------------------
  // Barrel marker: a 2D overlay over the game canvas (no scene meshes)
  // ------------------------------------------------------------------------------------------

  private clearMarker(): void {
    const c = this.markCanvas;
    if (!c) return;
    c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
    c.hidden = true;
  }

  /** Project a world point through the rendered camera (vertical FOV, Euler yaw / pitch; the shake's roll ignored) to
   *  overlay pixels: out.z is the view depth (m). No allocation. */
  private project(cam: MarkerCam, p: Vector3, out: { x: number; y: number; z: number }): void {
    projectPoint(cam, p.x, p.y, p.z, this.markW, this.markH, out);
  }

  /** The barrel ray: the muzzle to MARK_DIST m out along the bore, drawn on the overlay. Hidden with no weapon or with
   *  the muzzle behind the camera; the far end is clipped to the near plane. */
  private drawMarker(nowMs: number): void {
    const scene = this.scene;
    const rig = this.rig?.();
    const w = rig?.heldWeapon;
    const cam = scene?.activeCamera as unknown as MarkerCam | null | undefined;
    let c = this.markCanvas;
    if (!c) {
      c = this.markCanvas = document.createElement('canvas');
      c.className = 'anim-tune-marker-overlay';
      c.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:140;';
      document.body.appendChild(c);
    }
    const g = c.getContext('2d');
    if (!g) return;
    // follow the game canvas's place and size (checked twice a second)
    if (scene && nowMs >= this.markRectAt) {
      this.markRectAt = nowMs + 500;
      const gc = scene.getEngine().getRenderingCanvas();
      if (gc) {
        const r = gc.getBoundingClientRect();
        c.style.left = `${r.left}px`;
        c.style.top = `${r.top}px`;
        c.style.width = `${r.width}px`;
        c.style.height = `${r.height}px`;
        const W = Math.max(1, Math.round(r.width));
        const H = Math.max(1, Math.round(r.height));
        if (c.width !== W || c.height !== H) {
          c.width = W;
          c.height = H;
        }
        this.markW = W;
        this.markH = H;
      }
    }
    c.hidden = false;
    g.clearRect(0, 0, c.width, c.height);
    this.selMark.shown = false;
    if (!scene || !rig || !cam || !cam.rotation || !(this.markW > 0)) return;
    this.drawSel(g, rig, cam, nowMs);
    if (!this.marker || !w) return;
    const m = w.getWorldMatrix();
    Vector3.TransformCoordinatesFromFloatsToRef(0, rig.gunSpan.bore, rig.gunSpan.z1, m, this.markA);
    Vector3.TransformNormalFromFloatsToRef(0, 0, 1, m, this.markDir);
    this.markDir.normalize();
    this.markA.addToRef(this.markDir.scaleInPlace(MARK_DIST), this.markB);
    const near = Math.max(0.05, cam.minZ);
    const a = this.markSA;
    const b = this.markSB;
    this.project(cam, this.markA, a);
    if (a.z <= near) return;
    this.project(cam, this.markB, b);
    if (b.z <= near) {
      // clip the far end to the near plane along the bore
      const f = (a.z - near) / Math.max(1e-6, a.z - b.z);
      this.markB.set(this.markA.x + (this.markB.x - this.markA.x) * f, this.markA.y + (this.markB.y - this.markA.y) * f, this.markA.z + (this.markB.z - this.markA.z) * f);
      this.project(cam, this.markB, b);
    }
    g.strokeStyle = 'rgb(255,51,230)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.stroke();
    g.fillStyle = 'rgb(255,51,230)';
    g.beginPath();
    g.arc(b.x, b.y, 4, 0, Math.PI * 2);
    g.fill();
  }

  /**
   * (marlow-bays item 10) The selection marker: the selected row's joint(s), bone, whole body or weapon on the local
   * player's rig, drawn on the overlay (always on top): a pulsing yellow ring with a black edge (it reads on light and
   * dark), the bone as a thick line, and the target's name. A dev visual: nothing reads it back but the test hook. No
   * allocation (the points go through the preallocated vectors).
   */
  private drawSel(g: CanvasRenderingContext2D, rig: TuneRigView, cam: MarkerCam, nowMs: number): void {
    const t = this.selTarget;
    const sm = this.selMark;
    const near = Math.max(0.05, cam.minZ);
    const a = this.markSA;
    const b = this.markSB;
    let hasB = false;
    if (t.kind === 'weapon') {
      const w = rig.heldWeapon;
      if (!w) return;
      const m = w.getWorldMatrix();
      Vector3.TransformCoordinatesFromFloatsToRef(0, 0, 0, m, this.markA);
      Vector3.TransformCoordinatesFromFloatsToRef(0, rig.gunSpan.bore, rig.gunSpan.z1, m, this.markB);
      hasB = true;
    } else if (t.kind === 'joint' || t.kind === 'body') {
      const na = t.a ? rig[t.a] : undefined;
      if (!na) return;
      this.markA.copyFrom(na.getAbsolutePosition());
      const nb = t.b ? rig[t.b] : undefined;
      if (nb) {
        this.markB.copyFrom(nb.getAbsolutePosition());
        hasB = true;
      }
    } else return;
    this.project(cam, this.markA, a);
    if (a.z <= near) return;
    if (hasB) {
      this.project(cam, this.markB, b);
      if (b.z <= near) hasB = false;
    }
    const line = hasB && (t.line || t.kind === 'weapon');
    const r = 8 + 2 * Math.sin(nowMs * 0.008);
    g.lineCap = 'round';
    if (line) {
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.strokeStyle = 'rgba(0,0,0,0.85)';
      g.lineWidth = 8;
      g.stroke();
      g.strokeStyle = '#ffe600';
      g.lineWidth = 4;
      g.stroke();
    }
    this.selRing(g, a.x, a.y, r);
    if (hasB && !line) this.selRing(g, b.x, b.y, r);
    g.font = 'bold 13px ui-monospace,Menlo,Consolas,monospace';
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(0,0,0,0.9)';
    g.strokeText(t.label, a.x + r + 6, a.y - r - 4);
    g.fillStyle = '#ffe600';
    g.fillText(t.label, a.x + r + 6, a.y - r - 4);
    sm.shown = true;
    sm.ax = a.x;
    sm.ay = a.y;
    sm.bx = hasB ? b.x : a.x;
    sm.by = hasB ? b.y : a.y;
  }

  private selRing(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(0,0,0,0.85)';
    g.lineWidth = 6;
    g.stroke();
    g.strokeStyle = '#ffe600';
    g.lineWidth = 3;
    g.stroke();
    g.beginPath();
    g.arc(x, y, 2.5, 0, Math.PI * 2);
    g.fillStyle = '#ffe600';
    g.fill();
  }
}
