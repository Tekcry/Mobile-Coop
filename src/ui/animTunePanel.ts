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
import { TUNE_REGISTRY_HOOKS, TUNE_SECTIONS, type TuneSection } from '../anim/tuneRegistry';
import { FREE_DEMOS, FREE_IN, FREE_MODES, FREE_VIEW, GAME_SPEED, freeAxis, freeTimeScale, type FreeDemo, type FreeMode } from '../player/freeView';
import { PAD } from '../input/gamepadMapping';
import { loadAnimTune, saveAnimTune } from '../save/animTuneStore';
import { download } from './fileOut';
import { FINE_STEP, TunePadCtl } from './animTunePad';
import { projectPoint } from './overlayProject';
import { TuneSnapshotsUi, type PanelKit } from './tuneSnapshots';
import { StudioPanel } from './studioPanel';
import { STUDIO, STUDIO_SPEED } from '../anim/studio';

/** What the barrel marker reads from the local player's rig (typed loosely: no player import). */
export interface TuneRigView {
  heldWeapon: TransformNode | null;
  gunSpan: { z1: number; bore: number };
}

/** The loop the time controls drive (the debug overlay sets it: `GameLoop`). */
export interface TuneLoopView {
  timeScale: number;
  stepHeadless?(seconds: number): void;
}

/** (tuner-camera) One registered section's picker and rows (`anim/tuneRegistry.ts`). */
interface Section {
  reg: TuneSection;
  pick: HTMLSelectElement;
  rows: HTMLDivElement;
  group: string;
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
const BTN_CSS = 'font:inherit;color:#cfe;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.25);border-radius:3px;padding:2px 6px;min-height:28px;min-width:28px;';
const SEL_CSS = 'font:inherit;color:#cfe;background:#123;border:1px solid rgba(255,255,255,0.25);min-height:28px;';
const LBL_CSS = 'display:flex;align-items:center;gap:2px;min-height:28px;';
const MARK_FOCUS = '2px solid #ffc040';
const MARK_EDIT = '2px solid #60ff80';

/**
 * (anim-tuner) The animation tuner panel (F3 > Anim, Pause > Animation tuner, Settings > Graphics): every registered
 * section (Body, Gun, Camera, Speed, then any a later file adds; `anim/tuneRegistry.ts`), each a group picker that
 * follows the local player's state while "follow" is on and plain range sliders. Reset per slider, per group and all;
 * Export downloads `anim-tune-<date>.json`; the values save to the tuner's own IndexedDB store (debounced). Sits top
 * right. A dev aid: plain HTML, no styling work. Touch: 28 px rows, the panel's pointer, touch and wheel events stop at
 * the panel, it folds to its header bar, scrolls within the screen and is at most 45 % wide.
 *
 * (pass 2, tuner-camera) Every control is reachable by pad (`TunePadCtl`, map in `docs/anim-tuner/STATE.md` "Pad map"):
 * the D-pad walks a focus list of every control, A selects (a slider or dropdown enters edit mode: left / right or the
 * stick adjust, LT fine, A keeps, B restores), X resets the row, Y opens a menu of the rarer actions, LB / RB jump
 * between sections, LT / RT switch the focused section's state, View swaps the pad between tuner and game and freezes
 * the game on the way back (time scale 0, rendering on), Menu closes. Free view (orbit / fly), a demo loop, slow motion,
 * pause / step and hide HUD sit in the tools. The barrel marker is a 2D overlay (no scene meshes).
 */
export class AnimTunePanel {
  readonly el: HTMLDivElement;
  private open = false;
  private folded = false;
  private body: HTMLDivElement;
  private foldBtn: HTMLButtonElement;
  private shareOut: HTMLTextAreaElement;
  /** Told when the panel opens or closes (the overlay's Anim button state). */
  onOpenChange: ((open: boolean) => void) | null = null;
  private follow = true;
  private followBox: HTMLInputElement;
  private changedBox: HTMLInputElement;
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
  /** The local player's rig (set by the debug overlay). */
  rig: (() => TuneRigView | null) | null = null;
  /** (tuner-camera) The loop the time controls drive (set by the debug overlay). */
  loop: TuneLoopView | null = null;
  // --- pad
  private readonly pad = new TunePadCtl();
  private padLine: HTMLDivElement;
  private hint: HTMLDivElement;
  /** The focused control's `data-pad` key, its index in the focus list, the element and its mark. */
  private padKey = '';
  private padIdx = 0;
  private padEl: HTMLElement | null = null;
  private padMark: HTMLElement | null = null;
  /** Edit mode: the slider or dropdown and its value (a slider) or index (a dropdown) before the edit. */
  private edit: { el: HTMLInputElement | HTMLSelectElement; orig: number } | null = null;
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
  /** (pass 2) Whether a co-op session runs (set by the app): the time controls are off then. */
  coop: (() => boolean) | null = null;
  private coopOn = false;
  /** (fix round) When the pad was last polled (ms): the free view's pad input clears once it goes stale. */
  private lastPoll = 0;
  /** (pass 2) The bypass held by pad (R3) and by key (Backquote). */
  private padBypass = false;
  private keyBypass = false;
  /** (pass 2) The search text (lower case; '' = every row). */
  private search = '';
  private wideBox: HTMLInputElement;
  private fileIn: HTMLInputElement;
  private readonly rowNum = new WeakMap<HTMLElement, HTMLInputElement>();
  private hudBox: HTMLInputElement;
  private freezeBox: HTMLInputElement;
  private pauseBtn: HTMLButtonElement;
  /** The game is frozen (time scale 0), by View (auto: View back resumes) or by Pause; the running scale to go back to. */
  private frozen = false;
  private autoFrozen = false;
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
  // --- (anim-studio) snapshots (undo / redo, A/B, presets) and the studio section
  private readonly snaps: TuneSnapshotsUi;
  readonly studioUi: StudioPanel;
  /** The game speed slider's top: 1x, 2x inside the studio. */
  private speedMax: number = GAME_SPEED.max;

  constructor() {
    const el = (this.el = document.createElement('div'));
    el.className = 'anim-tune';
    el.hidden = true;
    el.style.cssText =
      'position:fixed;top:4px;right:4px;z-index:150;width:min(340px,45vw);max-height:calc(100vh - 8px);overflow-y:auto;' +
      'overscroll-behavior:contain;pointer-events:auto;box-sizing:border-box;' +
      'background:rgba(0,0,0,0.72);color:#cfe;font:10px/1.35 ui-monospace,Menlo,Consolas,monospace;padding:4px 6px 0;border-radius:4px;';
    // (pass 2) the panel's own pointer / touch / wheel input never reaches the game, the menus' focus or the look
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'wheel', 'touchstart', 'touchmove', 'touchend', 'contextmenu']) {
      el.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
    }
    const mkBtn = (label: string, fn: () => void, key: string, cls = ''): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (cls) b.className = cls;
      b.dataset.pad = key;
      b.style.cssText = BTN_CSS;
      b.addEventListener('click', () => {
        fn();
        // (the keys stay the game's: WASD and Space never press a panel button)
        b.blur();
      });
      return b;
    };
    const mkCheck = (parent: HTMLElement, label: string, on: boolean, fn: (v: boolean) => void, key: string, cls: string): HTMLInputElement => {
      const l = document.createElement('label');
      l.style.cssText = LBL_CSS;
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
    };
    const mkSel = (parent: HTMLElement, label: string, opts: readonly (string | number)[], fn: (v: string) => void, key: string, cls: string): HTMLSelectElement => {
      const l = document.createElement('label');
      l.style.cssText = LBL_CSS;
      const c = document.createElement('select');
      c.className = cls;
      c.dataset.pad = key;
      c.style.cssText = SEL_CSS;
      for (const v of opts) {
        const o = document.createElement('option');
        o.value = String(v);
        o.textContent = String(v);
        c.append(o);
      }
      c.addEventListener('change', () => {
        fn(c.value);
        c.blur();
      });
      l.append(label, c);
      parent.append(l);
      return c;
    };
    const mkBar = (): HTMLDivElement => {
      const b = document.createElement('div');
      b.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;align-items:center;margin:3px 0;';
      return b;
    };
    // (anim-studio) the makers for the snapshots bars and the studio section
    const kit: PanelKit = { btn: mkBtn, check: mkCheck, sel: mkSel, bar: mkBar };
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
    });
    // header bar: title, fold, close (folded, the panel is this one line)
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:4px;';
    const title = document.createElement('b');
    title.textContent = 'Animation tuner';
    title.style.cssText = 'flex:1;color:#8fd3ff;';
    this.foldBtn = mkBtn('_', () => this.setFolded(!this.folded), 'fold', 'anim-tune-fold');
    this.foldBtn.title = 'fold / unfold';
    const close = mkBtn('x', () => this.hide(), 'close', 'anim-tune-close');
    close.title = 'close';
    head.append(title, this.foldBtn, close);
    this.padLine = document.createElement('div');
    this.padLine.className = 'anim-tune-pad';
    this.padLine.style.cssText = 'color:#ffc040;margin:2px 0;';
    // (pass 2) the Y menu: the rarer actions, by pad (the mouse has them in the tools bar)
    const menu = (this.menu = document.createElement('div'));
    menu.className = 'anim-tune-menu';
    // (display, not the hidden attribute: an inline display would override it)
    menu.style.cssText = 'display:none;flex-direction:column;gap:2px;margin:3px 0;padding:3px;border:1px solid #ffc040;';
    const body = (this.body = document.createElement('div'));
    const tools = document.createElement('div');
    tools.dataset.padSec = 'tools';
    const bar = mkBar();
    this.followBox = mkCheck(bar, 'follow', true, (v) => this.setFollow(v), 'follow', 'anim-tune-follow');
    this.changedBox = mkCheck(bar, 'changed only', false, (v) => {
      this.changedOnly = v;
      this.rebuildAll();
    }, 'changed', 'anim-tune-changed');
    this.markerBox = mkCheck(bar, 'barrel marker', false, (v) => {
      this.marker = v;
      if (!v) this.clearMarker();
    }, 'marker', 'anim-tune-marker');
    bar.append(
      mkBtn('Export', () => this.exportFile(), 'export', 'anim-tune-export'),
      mkBtn('Share / Copy', () => void this.shareFile(), 'share', 'anim-tune-share'),
      mkBtn('Reset all', () => {
        if (!confirm('Reset every animation tuning value to its default?')) return;
        tuneResetAll();
        this.rebuildAll();
      }, 'resetall'),
      mkBtn('Clear log', () => tuneClearLog(), 'clearlog'),
    );
    // (pass 2) time: pause / resume, one step, freeze when View hands the pad to the tuner, slow motion
    const tbar = mkBar();
    this.pauseBtn = mkBtn('Pause', () => this.setFrozen(!this.frozen), 'pause', 'anim-tune-pause');
    this.stepBtn = mkBtn('Step', () => this.stepFrame(), 'step', 'anim-tune-step');
    tbar.append(this.pauseBtn, this.stepBtn);
    this.freezeBox = mkCheck(tbar, 'freeze on View', true, () => this.setHint(), 'freezeview', 'anim-tune-freezeview');
    {
      // (pass 2) the game speed: slow motion in normal play and in the free view (the loop's time scale; local only)
      const l = document.createElement('label');
      l.style.cssText = LBL_CSS + 'flex:1;min-width:120px;';
      const r = (this.speedIn = document.createElement('input'));
      r.type = 'range';
      r.min = String(GAME_SPEED.min);
      r.max = String(GAME_SPEED.max);
      r.step = String(GAME_SPEED.step);
      r.value = '1';
      r.className = 'anim-tune-speed';
      r.dataset.pad = 'speed';
      r.style.cssText = 'flex:1;min-width:0;height:28px;margin:0;';
      this.speedVal = document.createElement('span');
      this.speedVal.textContent = '1x';
      r.addEventListener('input', () => this.setTimeScale(Number(r.value)));
      r.addEventListener('change', () => r.blur());
      l.append('game speed', r, this.speedVal);
      tbar.append(l);
    }
    this.coopNote = document.createElement('div');
    this.coopNote.className = 'anim-tune-coop';
    this.coopNote.hidden = true;
    this.coopNote.textContent = 'Co-op session: game speed, pause and step are off (the local sim drives the session).';
    this.coopNote.style.cssText = 'color:#d9a066;font-size:9px;width:100%;';
    tbar.append(this.coopNote);
    // (pass 2) wide ranges, import, search
    const sbar = mkBar();
    this.wideBox = mkCheck(sbar, 'wide ranges (x2)', false, (v) => {
      TUNE_FLAGS.wide = v;
      this.rebuildAll();
    }, 'wide', 'anim-tune-wide');
    sbar.append(mkBtn('Import', () => this.importPick(), 'import', 'anim-tune-import'));
    const fileIn = (this.fileIn = document.createElement('input'));
    fileIn.type = 'file';
    fileIn.accept = '.json,application/json';
    fileIn.hidden = true;
    fileIn.className = 'anim-tune-file';
    fileIn.addEventListener('change', () => void this.importFile());
    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'search sliders';
    search.className = 'anim-tune-search';
    search.style.cssText = 'font:inherit;color:#cfe;background:#123;border:1px solid rgba(255,255,255,0.25);min-height:24px;flex:1;min-width:80px;';
    search.addEventListener('input', () => {
      this.search = search.value.trim().toLowerCase();
      this.rebuildAll();
    });
    sbar.append(search, fileIn);
    // (tuner-camera) free view, demo loop, hide HUD
    const fbar = mkBar();
    this.freeSel = mkSel(fbar, 'free view', FREE_MODES, (v) => this.setFreeMode(v as FreeMode), 'free', 'anim-tune-free');
    mkSel(fbar, 'demo', FREE_DEMOS, (v) => (FREE_VIEW.demo = v as FreeDemo), 'demo', 'anim-tune-demo');
    this.hudBox = mkCheck(fbar, 'hide HUD', false, (v) => document.body.classList.toggle('tune-hide-hud', v), 'hidehud', 'anim-tune-hidehud');
    tools.append(bar, tbar, fbar, sbar, this.snaps.bar, this.snaps.pbar);
    // the Y menu's items
    const mItem = (label: string, fn: () => void, key: string): HTMLButtonElement => {
      const b = mkBtn(label, fn, key);
      b.style.textAlign = 'left';
      menu.append(b);
      return b;
    };
    mItem('Export', () => this.menuDo(() => this.exportFile()), 'm:export');
    mItem('Share / Copy', () => this.menuDo(() => void this.shareFile()), 'm:share');
    mItem('Reset group (the focused section)', () => this.menuDo(() => this.resetFocusedGroup()), 'm:resetgroup');
    mItem('Reset all (A twice)', () => this.armResetAll(), 'm:resetall');
    mItem('Clear log', () => this.menuDo(() => tuneClearLog()), 'm:clearlog');
    mItem('Import a JSON export (file picker)', () => this.menuDo(() => this.importPick()), 'm:import');
    mItem('Wide ranges (toggle)', () => this.wideBox.click(), 'm:wide');
    mItem('Changed only (toggle)', () => this.changedBox.click(), 'm:changed');
    mItem('Barrel marker (toggle)', () => this.markerBox.click(), 'm:marker');
    // (anim-studio) snapshots by pad
    mItem('Undo', () => this.menuDo(() => this.snaps.undo()), 'm:undo');
    mItem('Redo', () => this.menuDo(() => this.snaps.redo()), 'm:redo');
    mItem('Store A', () => this.menuDo(() => this.snaps.abStore('A')), 'm:abA');
    mItem('Store B', () => this.menuDo(() => this.snaps.abStore('B')), 'm:abB');
    mItem('A/B (flip)', () => this.menuDo(() => this.snaps.abToggle()), 'm:ab');
    // (anim-studio) Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) while the panel is open and no text box has the keys: undo / redo;
    // taken before the game's keyboard (Z is the knockout)
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.open || !(e.ctrlKey || e.metaKey) || (e.code !== 'KeyZ' && e.code !== 'KeyY')) return;
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
    // (pass 2) Backquote held: the bypass (the untuned animation and camera) while the panel is open
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backquote' && this.open && !e.repeat) this.setKeyBypass(true);
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Backquote') this.setKeyBypass(false);
    });
    window.addEventListener('blur', () => this.setKeyBypass(false));
    // (fix round) a pad disconnect never leaves the free view's sticks held
    window.addEventListener('gamepaddisconnected', () => this.clearFreeIn());
    // the mouse wheel zooms the orbit (the panel's own wheel stops at the panel)
    window.addEventListener(
      'wheel',
      (e) => {
        if (this.open && FREE_VIEW.mode === 'orbit' && e.deltaY !== 0) FREE_IN.wheel += e.deltaY < 0 ? 1 : -1;
      },
      { passive: true },
    );
    this.now = document.createElement('div');
    this.now.style.color = '#8fd3ff';
    this.info = document.createElement('div');
    this.info.style.cssText = 'color:#9ab;margin-bottom:2px;';
    this.shareOut = document.createElement('textarea');
    this.shareOut.readOnly = true;
    this.shareOut.hidden = true;
    this.shareOut.className = 'anim-tune-json';
    this.shareOut.style.cssText = 'width:100%;height:120px;box-sizing:border-box;font:inherit;color:#cfe;background:#012;';
    this.shareOut.addEventListener('focus', () => this.shareOut.select());
    body.append(this.studioUi.el, tools, this.shareOut, this.now, this.info);
    // (pass 2) the pad map for the current mode, at the bottom of the panel
    this.hint = document.createElement('div');
    this.hint.className = 'anim-tune-hints';
    this.hint.style.cssText = 'position:sticky;bottom:0;background:rgba(0,0,0,0.92);color:#ffc040;padding:3px 0 4px;margin-top:4px;border-top:1px solid rgba(255,192,64,0.4);';
    el.append(head, this.padLine, menu, body, this.hint);
    // (tuner-camera) every registered section, in registration order (Body, Gun, Camera, then any a later file adds)
    for (const r of TUNE_SECTIONS) this.addSection(r);
    TUNE_REGISTRY_HOOKS.added = (r) => this.addSection(r);
    document.body.appendChild(el);
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
      freeState: () => ({ mode: FREE_VIEW.mode, demo: FREE_VIEW.demo, pad: this.pad.mode, folded: this.folded }),
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
        };
      },
    };
    this.setPadLine();
  }

  private addSection(reg: TuneSection): void {
    const kind = reg.id;
    const groups = reg.groups;
    const first = groups[0] ?? '';
    const wrap = document.createElement('div');
    wrap.dataset.padSec = kind;
    const h = document.createElement('b');
    h.textContent = reg.label;
    h.style.cssText = 'display:block;margin-top:5px;color:#8fd3ff;';
    wrap.append(h);
    if (reg.note) {
      const n = document.createElement('div');
      n.className = 'anim-tune-note';
      n.textContent = reg.note;
      n.style.cssText = 'color:#d9a066;font-size:9px;margin:1px 0;';
      wrap.append(n);
    }
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;gap:4px;align-items:center;margin:2px 0;';
    const pick = document.createElement('select');
    pick.className = `anim-tune-pick-${kind}`;
    pick.dataset.pad = `pick:${kind}`;
    pick.style.cssText = SEL_CSS + 'max-width:60%;';
    for (const g of groups) {
      const o = document.createElement('option');
      o.value = g;
      o.textContent = g;
      pick.append(o);
    }
    pick.value = first;
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Reset group';
    reset.dataset.pad = `rg:${kind}`;
    reset.style.cssText = BTN_CSS;
    const rows = document.createElement('div');
    rows.className = `anim-tune-rows-${kind}`;
    rows.style.cssText = 'display:grid;gap:1px;';
    const sec: Section = { reg, pick, rows, group: first };
    pick.addEventListener('change', () => {
      // (pass 3) a manual pick turns follow off (else the next state change would take it away again)
      this.setFollow(false);
      sec.group = pick.value;
      this.rebuild(sec);
      pick.blur();
    });
    reset.addEventListener('click', () => {
      tuneResetGroup(sec.group);
      this.rebuildAll();
      reset.blur();
    });
    head.append(pick, reset);
    wrap.append(head, rows);
    this.body.append(wrap);
    this.sections.push(sec);
    this.cand.push('');
    this.candAt.push(0);
    this.rebuild(sec);
  }

  private rebuildAll(): void {
    for (const s of this.sections) this.rebuild(s);
  }

  /** The slider rows of one section's group (the pad's focus mark is put back on). */
  private rebuild(sec: Section): void {
    this.buildRows(sec);
    this.markPadFocus();
  }

  private buildRows(sec: Section): void {
    sec.rows.replaceChildren();
    if (sec.pick.value !== sec.group) sec.pick.value = sec.group;
    for (const o of Array.from(sec.pick.options)) {
      const g = o.value;
      o.textContent = tuneGroupChanged(g) ? `${g} *` : g;
    }
    const group = sec.group;
    const q = this.search;
    const list = tunablesFor(group).filter((t) => (!this.changedOnly || tuneGet(group, t.id) !== t.def) && (!q || t.label.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)));
    if (!list.length) {
      const none = document.createElement('div');
      none.style.color = '#9ab';
      none.textContent = q ? '(no slider matches the search)' : this.changedOnly ? '(nothing changed in this group)' : '(no sliders)';
      sec.rows.append(none);
      return;
    }
    for (const t of list) {
      const row = document.createElement('label');
      row.dataset.padRow = '1';
      row.style.cssText = 'display:grid;grid-template-columns:minmax(64px,34%) 1fr 52px 24px;align-items:center;gap:3px;min-height:28px;';
      row.title = `${t.id} (${t.kind}, default ${t.def} ${t.unit}): ${t.hook}`;
      const name = document.createElement('span');
      name.textContent = t.label;
      name.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(tuneMin(t));
      input.max = String(tuneMax(t));
      input.step = String(t.step);
      input.dataset.group = group;
      input.dataset.id = t.id;
      input.dataset.pad = `s:${sec.reg.id}:${t.id}`;
      input.style.cssText = 'width:100%;min-width:0;height:28px;margin:0;';
      // (pass 2) the value as a number field: type a value (clamped to the active range), Enter applies
      const val = document.createElement('input');
      val.type = 'number';
      val.step = 'any';
      val.className = 'anim-tune-num';
      val.style.cssText = 'font:inherit;font-weight:bold;color:#cfe;background:#012;border:1px solid rgba(255,255,255,0.2);width:100%;min-width:0;box-sizing:border-box;min-height:22px;';
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
      const x = document.createElement('button');
      x.type = 'button';
      x.textContent = 'x';
      x.title = 'reset';
      x.style.cssText = 'font:inherit;color:#cfe;background:none;border:none;padding:0;cursor:pointer;min-height:28px;min-width:24px;';
      const show = (): void => {
        const v = tuneGet(group, t.id);
        input.value = String(v);
        if (val.dataset.typing !== '1') val.value = String(v);
        val.style.color = v !== t.def ? '#ffc040' : '';
        this.markPick(sec);
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
      row.append(name, input, val, x);
      sec.rows.append(row);
      // (pass 3) the real-world target, (tuner-camera) the game's value today: small grey lines under the slider
      for (const note of tuneNotes(group, t.id)) {
        const hl = document.createElement('div');
        hl.className = note.startsWith('today:') ? 'anim-tune-hint anim-tune-today' : 'anim-tune-hint';
        hl.textContent = note;
        hl.style.cssText = 'color:#8a98a4;font-size:9px;margin:-2px 0 2px 2px;';
        sec.rows.append(hl);
      }
    }
  }

  private markPick(sec: Section): void {
    const o = Array.from(sec.pick.options).find((x) => x.value === sec.group);
    if (o) o.textContent = tuneGroupChanged(sec.group) ? `${sec.group} *` : sec.group;
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
    return this.pressing || this.pad.mode === 'tuner' || (!!a && this.el.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT'));
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
        s.group = cur;
        this.rebuild(s);
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

  /** Open (F3 > Anim, Pause or Settings): stays open over play until closed. */
  show(): void {
    this.open = true;
    // (fix round) the co-op lock is read live (a fold or a close never leaves it stale)
    this.refreshCoop();
    this.el.hidden = false;
    // (anim-studio) in the studio the studio section shows, and the pad starts on the loop list
    this.studioUi.sync();
    if (STUDIO.active) this.padKey = 'st:entry';
    // (tuner-pad) opening takes the pad focus (once the press that opened it is released)
    this.pad.open();
    this.edit = null;
    this.stickAcc = 0;
    this.setPadLine();
    this.syncFollow(true);
    this.markPadFocus();
    this.onOpenChange?.(true);
  }

  hide(): void {
    // (tuner-camera) closing ends the free view, the freeze and the slow motion, and shows the HUD
    this.setFreeMode('off');
    if (this.hudBox.checked) {
      this.hudBox.checked = false;
      document.body.classList.remove('tune-hide-hud');
    }
    if (this.frozen) this.setFrozen(false);
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
    this.studioUi.panelClosed();
    this.onOpenChange?.(false);
  }

  // ------------------------------------------------------------------------------------------
  // Pad (pass 2: every control by pad)
  // ------------------------------------------------------------------------------------------

  /**
   * (tuner-pad) The gamepad source's hook, every poll (seconds): returns true while the pad is the tuner's (the game and
   * the menus then get none of it). No allocation unless the focus, a value or the mode changes.
   */
  padPoll(pad: Gamepad, now: number, dt: number): boolean {
    this.lastPoll = performance.now();
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
    if (o.toggled) {
      this.onPadToggled();
      return o.consume;
    }
    if (this.pad.mode !== 'tuner') return o.consume;
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
      return o.consume;
    }
    if (o.nav !== 0) this.padNav(o.nav);
    if (!this.menuOpen) {
      if (o.section !== 0) this.padSection(o.section);
      if (o.group !== 0) this.padGroup(o.group);
      if (o.reset) this.padReset();
    }
    if (o.select) this.padSelect();
    return o.consume;
  }

  /** View moved the pad: to the tuner (the panel opens, and freezes the game when "freeze on View" is ticked), to the
   *  game (an automatic freeze ends) or to the free view (the panel folds). */
  private onPadToggled(): void {
    this.refreshCoop();
    this.stickAcc = 0;
    this.edit = null;
    if (this.menuOpen) this.closeMenu();
    const m = this.pad.mode;
    if (m === 'tuner') {
      this.setFolded(false);
      if (this.freezeBox.checked && !this.frozen && !this.coopOn) this.setFrozen(true, true);
    } else if (m === 'game') {
      if (this.autoFrozen) this.setFrozen(false);
    } else if (m === 'free') this.setFolded(true);
    this.setPadLine();
    this.markPadFocus();
  }

  private setPadLine(): void {
    const m = this.pad.mode;
    this.padLine.textContent =
      m === 'game'
        ? 'PAD: game (View: back to the tuner)'
        : m === 'free'
          ? `PAD: free view (${FREE_VIEW.mode})`
          : m === 'tuner'
            ? `PAD: tuner${this.frozen ? '  (frozen)' : ''}`
            : '';
    if (TUNE_FLAGS.bypass) this.padLine.textContent += '  BYPASS (untuned)';
    this.setHint();
  }

  /** The pad map for the current mode, in the strip at the bottom of the panel. */
  private setHint(): void {
    const m = this.pad.mode;
    const view = FREE_VIEW.mode === 'off' ? 'game' : 'free view';
    let t: string;
    if (m === 'game') t = `View: tuner${this.freezeBox.checked ? ' (freezes the game)' : ''}  |  Menu: pauses the game`;
    else if (m === 'free')
      t =
        FREE_VIEW.mode === 'orbit'
          ? 'Left stick: move the player  Right stick: orbit  LT / RT: zoom  D-pad up / down: height  R3 held: bypass  B: free view off  View: panel  Menu: close'
          : 'Left stick: fly  Right stick: look  LB / RB: down / up  R3 held: bypass  B: free view off  View: panel  Menu: close';
    else if (this.edit)
      t =
        this.edit.el instanceof HTMLSelectElement
          ? 'EDIT  D-pad left / right: choose  A: keep  B: cancel'
          : 'EDIT  D-pad left / right: step (hold: repeat, x5 after 1 s)  Left stick: fast  LT held: fine  A: keep  B: cancel  X: default';
    else if (this.menuOpen) t = 'MORE  D-pad: move  A: choose  B / Y: close';
    else t = `D-pad: move  A: select / edit  B: back  X: reset row  Y: more (undo, redo, A/B)  LB / RB: section${STUDIO.active ? ' (Studio first)' : ''}  LT / RT: state  R3 held: bypass  View: ${view}  Menu: close`;
    this.hint.textContent = m === 'off' ? '' : `PAD  ${t}`;
  }

  /** The focusable controls (the menu's while it is open), in order, that show now. */
  private padItems(): HTMLElement[] {
    const root = this.menuOpen ? this.menu : this.el;
    const out: HTMLElement[] = [];
    for (const e of Array.from(root.querySelectorAll<HTMLElement>('[data-pad]'))) if (e.offsetParent !== null) out.push(e);
    return out;
  }

  /** Mark the pad's focused control (only while the pad is the tuner's), keeping the focus by its key across rebuilds. */
  private markPadFocus(): void {
    if (this.padMark) {
      this.padMark.style.outline = '';
      this.padMark.style.background = '';
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
    let i = this.padKey ? items.findIndex((e) => e.dataset.pad === this.padKey) : items.findIndex((e) => e.matches('input[type=range][data-id]'));
    if (i < 0) i = Math.max(0, Math.min(items.length - 1, this.padIdx));
    const e = items[i]!;
    this.padIdx = i;
    this.padEl = e;
    this.padKey = e.dataset.pad ?? '';
    const mark = e.closest<HTMLElement>('[data-pad-row]') ?? e.closest<HTMLElement>('label') ?? e;
    mark.style.outline = this.edit ? MARK_EDIT : MARK_FOCUS;
    mark.style.background = this.edit ? 'rgba(96,255,128,0.18)' : 'rgba(255,192,64,0.18)';
    mark.scrollIntoView({ block: 'nearest' });
    this.padMark = mark;
    const sid = e.closest<HTMLElement>('[data-pad-sec]')?.dataset.padSec;
    const k = this.sections.findIndex((s) => s.reg.id === sid);
    if (k >= 0) this.lastSec = k;
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

  /** LB / RB: jump to the previous / next section (the tools first, then each section's picker). */
  private padSection(d: number): void {
    // (anim-studio) the studio section first while it shows
    const ids = [...(this.studioUi.el.hidden ? [] : ['studio']), 'tools', ...this.sections.map((s) => s.reg.id)];
    const cur = this.padEl?.closest<HTMLElement>('[data-pad-sec]')?.dataset.padSec ?? 'tools';
    const k = Math.max(0, ids.indexOf(cur));
    const next = ids[(k + d + ids.length) % ids.length]!;
    this.padKey = next === 'studio' ? 'st:entry' : next === 'tools' ? 'follow' : `pick:${next}`;
    this.disarmResetAll();
    this.markPadFocus();
  }

  /** LT / RT: the focused section's previous / next state group (follow off, as a manual pick); the same slider stays
   *  focused when the new group has it. */
  private padGroup(d: number): void {
    const sec = this.sections[this.lastSec];
    if (!sec) return;
    const opts = sec.pick.options;
    let at = 0;
    for (let i = 0; i < opts.length; i++) if (opts[i]!.value === sec.group) at = i;
    const next = opts[(at + d + opts.length) % opts.length];
    if (!next) return;
    this.setFollow(false);
    sec.group = next.value;
    this.rebuild(sec);
  }

  /** X: the focused slider back to its default. */
  private padReset(): void {
    const e = this.padEl;
    if (!(e instanceof HTMLInputElement) || e.type !== 'range') return;
    tuneReset(e.dataset.group ?? '', e.dataset.id ?? '');
    this.rowShow.get(e)?.();
  }

  /** A: press a button, tick a box, or start editing a slider or dropdown. */
  private padSelect(): void {
    const e = this.padEl;
    if (!e || (e as HTMLInputElement).disabled) return;
    const key = e.dataset.pad ?? '';
    if (key === 'resetall' || key === 'm:resetall') {
      this.armResetAll();
      return;
    }
    if ((e instanceof HTMLInputElement && e.type === 'range') || e instanceof HTMLSelectElement) {
      this.edit = { el: e, orig: e instanceof HTMLSelectElement ? e.selectedIndex : e.dataset.group ? tuneGet(e.dataset.group, e.dataset.id ?? '') : Number(e.value) };
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

  /** A keeps the edit, B puts the value (or the choice) back. */
  private endEdit(cancel: boolean): void {
    const ed = this.edit;
    if (!ed) return;
    this.edit = null;
    this.pad.editing = false;
    if (cancel) {
      const e = ed.el;
      if (e instanceof HTMLSelectElement) {
        if (e.selectedIndex !== ed.orig) {
          e.selectedIndex = ed.orig;
          e.dispatchEvent(this.changeEv);
        }
      } else if (e.dataset.group) {
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

  /** Editing: `steps` steps (a slider: its step, a fifth of it with LT held; a dropdown: options). */
  private padAdjust(steps: number, fine: boolean): void {
    const e = this.edit?.el;
    if (!e) return;
    if (e instanceof HTMLSelectElement) {
      const i = Math.max(0, Math.min(e.options.length - 1, e.selectedIndex + steps));
      if (i !== e.selectedIndex) {
        e.selectedIndex = i;
        e.dispatchEvent(this.changeEv);
        this.markPadFocus();
      }
      return;
    }
    const unit = (Number(e.step) || 1) * (fine ? FINE_STEP : 1);
    const g = e.dataset.group;
    if (!g) {
      // a plain range (the game speed): through its own input handler
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
    if (!(e instanceof HTMLInputElement)) return;
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
    this.padKey = 'm:export';
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
    this.info.textContent = 'every value reset';
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
  // Free view and time
  // ------------------------------------------------------------------------------------------

  /** (tuner-camera) Free view off / orbit / fly: the game reads FREE_VIEW each frame; the pad goes to it and the panel folds. */
  setFreeMode(m: FreeMode): void {
    const was = FREE_VIEW.mode;
    FREE_VIEW.mode = m;
    if (this.freeSel.value !== m) this.freeSel.value = m;
    this.clearFreeIn();
    FREE_IN.wheel = 0;
    this.pad.setFree(m !== 'off');
    if (m !== 'off' && was === 'off' && this.pad.mode === 'free') this.setFolded(true);
    if (m === 'off' && was !== 'off') this.setFolded(false);
    this.setPadLine();
    this.markPadFocus();
  }

  /** (tuner-camera) Slow motion: the running time scale (1, 0.5, 0.25, 0.1; the fixed step stays). Frozen, it applies
   *  on resume. */
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
    this.speedVal.textContent = `${s}x`;
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
      this.info.textContent = `import refused: ${f.name} is not JSON`;
      return;
    }
    const r = tuneImport(data, f.name);
    this.rebuildAll();
    this.info.textContent = r.ok ? `imported ${f.name}: ${r.applied} values${r.pending ? `, ${r.pending} kept for sections not loaded yet` : ''}` : `import refused: ${r.error}`;
    this.nextInfo = performance.now() + 4000;
  }

  /** (pass 2) Freeze: time scale 0 (the sim stops, rendering, the camera tuning and the free view go on). `auto`: by View
   *  (View back resumes). */
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
    this.body.hidden = v;
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
          this.info.textContent = 'shared';
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
        this.info.textContent = 'copied to the clipboard';
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
    // (fix round) the free view's pad input stops when the pad stops being polled (a disconnect)
    if (FREE_VIEW.mode !== 'off' && performance.now() - this.lastPoll > PAD_STALE_MS) this.clearFreeIn();
    this.syncFollow();
    // a level load (or a slow beat's end) resets the loop's time scale: the freeze is over, the speed back to 1
    const lp = this.loop;
    if (this.frozen && lp && lp.timeScale !== 0) {
      this.frozen = this.autoFrozen = false;
      this.pauseBtn.textContent = 'Pause';
      this.setPadLine();
    }
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
    if (!this.folded && nowMs >= this.nextInfo) {
      this.nextInfo = nowMs + 250;
      this.now.textContent = `now: ${TUNE_STATE.body || '-'}  /  ${TUNE_STATE.gun || 'unarmed'}  /  ${TUNE_STATE.cam || '-'}${this.follow ? '' : '  (follow off)'}${this.frozen ? '  FROZEN' : ''}`;
      if (!this.confirmAll) this.info.textContent = `${tuneChanged().length} changed, ${TUNE_LOG.length} log entries`;
    }
    if (this.marker) this.drawMarker(nowMs);
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
    if (!scene || !rig || !w || !cam || !cam.rotation || !(this.markW > 0)) return;
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
}
