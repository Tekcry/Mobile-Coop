import { Color3, CreateLineSystem, CreateSphere, StandardMaterial, Vector3, type LinesMesh, type Mesh, type Scene, type TransformNode } from '../core/babylon';
import {
  BODY_GROUPS,
  GUN_GROUPS,
  TUNE_BODY,
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
  tuneHint,
  tuneLoad,
  tuneReset,
  tuneResetAll,
  tuneResetGroup,
  tuneSet,
  tuneSnapshot,
  type TuneGroup,
} from '../anim/tune';
import { loadAnimTune, saveAnimTune } from '../save/animTuneStore';
import { download } from './fileOut';

/** What the barrel marker reads from the local player's rig (typed loosely: no player import). */
export interface TuneRigView {
  heldWeapon: TransformNode | null;
  gunSpan: { z1: number; bore: number };
}

interface Section {
  pick: HTMLSelectElement;
  rows: HTMLDivElement;
  group: TuneGroup;
  kind: 'body' | 'gun';
}

/** How far out along the barrel the marker ball sits (m). */
const MARK_DIST = 12;
const SAVE_DELAY = 400;
/** (pass 3) Follow switches group once the new state has held this long (ms): a brief state never rebuilds the rows. */
const FOLLOW_HOLD_MS = 300;

/**
 * (anim-tuner) The animation tuner panel (F3 > Anim): a body-state section and a gun-hold section, each a group picker
 * (following the local player's current state while "follow" is on) and plain range sliders over `anim/tune.ts`. Reset
 * per slider, per group and all; Export downloads `anim-tune-<date>.json`; the values save to the tuner's own IndexedDB
 * store (debounced). A barrel marker (a line and a ball out along the held weapon's bore) shows where the muzzle points.
 * Sits top right, clear of the overlay's anti-crab readout (top left). A dev aid: plain HTML, no styling work.
 * (pass 2) Opens from F3 > Anim, Pause > Animation tuner (dev) or Settings > Graphics > Animation tuner (dev), and stays
 * open over play until its close button: no F3 needed (pad and phone). Touch: 28 px rows, the panel's pointer, touch and
 * wheel events stop at the panel, it folds to its header bar, scrolls within the screen and is at most 45 % wide.
 * Share / Copy hands the export to the share sheet, else the clipboard, else a text box to select.
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
  private followBox: HTMLInputElement | null = null;
  /** A slider is held (mouse or touch): follow never rebuilds the rows under it. */
  private pressing = false;
  /** Follow's pending state per section and since when (ms): it switches once the state has held FOLLOW_HOLD_MS. */
  private cand: string[] = ['', ''];
  private candAt: number[] = [0, 0];
  private changedOnly = false;
  private marker = false;
  private now: HTMLDivElement;
  private info: HTMLDivElement;
  private sections: Section[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private scene: Scene | null = null;
  private line: LinesMesh | null = null;
  private ball: Mesh | null = null;
  private readonly lineA = new Vector3();
  private readonly lineB = new Vector3();
  private readonly lineDir = new Vector3();
  private readonly linePts: Vector3[][] = [[this.lineA, this.lineB]];
  private nextInfo = 0;
  /** The local player's rig (set by the debug overlay). */
  rig: (() => TuneRigView | null) | null = null;

  constructor() {
    const el = (this.el = document.createElement('div'));
    el.className = 'anim-tune';
    el.hidden = true;
    el.style.cssText =
      'position:fixed;top:4px;right:4px;z-index:150;width:min(340px,45vw);max-height:calc(100vh - 8px);overflow-y:auto;' +
      'overscroll-behavior:contain;pointer-events:auto;box-sizing:border-box;' +
      'background:rgba(0,0,0,0.72);color:#cfe;font:10px/1.35 ui-monospace,Menlo,Consolas,monospace;padding:4px 6px;border-radius:4px;';
    // (pass 2) the panel's own pointer / touch / wheel input never reaches the game, the menus' focus or the look
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'click', 'wheel', 'touchstart', 'touchmove', 'touchend', 'contextmenu']) {
      el.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
    }
    const mkBtn = (label: string, fn: () => void, cls = ''): HTMLButtonElement => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (cls) b.className = cls;
      b.style.cssText = 'font:inherit;color:#cfe;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.25);border-radius:3px;padding:2px 6px;min-height:28px;min-width:28px;';
      b.addEventListener('click', () => {
        fn();
        // (the keys stay the game's: WASD and Space never press a panel button)
        b.blur();
      });
      return b;
    };
    // header bar: title, fold, close (folded, the panel is this one line)
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:4px;';
    const title = document.createElement('b');
    title.textContent = 'Animation tuner';
    title.style.cssText = 'flex:1;color:#8fd3ff;';
    this.foldBtn = mkBtn('_', () => this.setFolded(!this.folded), 'anim-tune-fold');
    this.foldBtn.title = 'fold / unfold';
    const close = mkBtn('x', () => this.hide(), 'anim-tune-close');
    close.title = 'close';
    head.append(title, this.foldBtn, close);
    const body = (this.body = document.createElement('div'));
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px;margin:3px 0;';
    const btn = (label: string, fn: () => void, cls = ''): HTMLButtonElement => {
      const b = mkBtn(label, fn, cls);
      bar.append(b);
      return b;
    };
    const check = (label: string, on: boolean, fn: (v: boolean) => void, cls: string): HTMLInputElement => {
      const l = document.createElement('label');
      l.style.cssText = 'display:flex;align-items:center;gap:2px;min-height:28px;';
      const c = document.createElement('input');
      c.type = 'checkbox';
      c.checked = on;
      c.className = cls;
      c.addEventListener('change', () => {
        fn(c.checked);
        // (pass 3) the keys stay the game's
        c.blur();
      });
      l.append(c, label);
      bar.append(l);
      return c;
    };
    this.followBox = check('follow', true, (v) => this.setFollow(v), 'anim-tune-follow');
    check('changed only', false, (v) => {
      this.changedOnly = v;
      this.rebuildAll();
    }, 'anim-tune-changed');
    check('barrel marker', false, (v) => {
      this.marker = v;
      if (!v) this.clearMarker();
    }, 'anim-tune-marker');
    btn('Export', () => this.exportFile(), 'anim-tune-export');
    btn('Share / Copy', () => void this.shareFile(), 'anim-tune-share');
    btn('Reset all', () => {
      if (!confirm('Reset every animation tuning value to its default?')) return;
      tuneResetAll();
      this.rebuildAll();
    });
    btn('Clear log', () => tuneClearLog());
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
    body.append(bar, this.shareOut, this.now, this.info);
    el.append(head, body);
    this.addSection('body', 'Body state', BODY_GROUPS, 'idle');
    this.addSection('gun', 'Gun hold (weapon x state)', GUN_GROUPS, 'rifle.lowReady');
    document.body.appendChild(el);
    TUNE_HOOKS.changed = () => this.scheduleSave();
    // load the saved values (skipped if a slider already moved)
    void loadAnimTune().then((s) => {
      if (s && TUNE_LOG.length === 0 && tuneChanged().length === 0) {
        tuneLoad(s);
        this.rebuildAll();
      }
    });
    // (test hook) e2e and the console read and set values through this
    (window as unknown as { __animTune: unknown }).__animTune = {
      body: TUNE_BODY,
      gun: TUNE_GUN,
      cur: TUNE_CUR,
      local: TUNE_LOCAL,
      state: TUNE_STATE,
      get: tuneGet,
      set: (g: TuneGroup, id: Parameters<typeof tuneSet>[1], v: number) => {
        const ok = tuneSet(g, id, v);
        this.rebuildAll();
        return ok;
      },
      changed: tuneChanged,
      exportJson: () => tuneExport(),
      log: TUNE_LOG,
    };
  }

  private addSection(kind: 'body' | 'gun', title: string, groups: readonly TuneGroup[], first: TuneGroup): void {
    const h = document.createElement('b');
    h.textContent = title;
    h.style.cssText = 'display:block;margin-top:5px;color:#8fd3ff;';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;gap:4px;align-items:center;margin:2px 0;';
    const pick = document.createElement('select');
    pick.className = `anim-tune-pick-${kind}`;
    pick.style.cssText = 'font:inherit;color:#cfe;background:#123;border:1px solid rgba(255,255,255,0.25);min-height:28px;max-width:60%;';
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
    reset.style.cssText = 'font:inherit;color:#cfe;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.25);border-radius:3px;padding:1px 5px;min-height:28px;';
    const rows = document.createElement('div');
    rows.className = `anim-tune-rows-${kind}`;
    rows.style.cssText = 'display:grid;gap:1px;';
    const sec: Section = { pick, rows, group: first, kind };
    pick.addEventListener('change', () => {
      // (pass 3) a manual pick turns follow off (else the next state change would take it away again)
      this.setFollow(false);
      sec.group = pick.value as TuneGroup;
      this.rebuild(sec);
      pick.blur();
    });
    reset.addEventListener('click', () => {
      tuneResetGroup(sec.group);
      this.rebuildAll();
    });
    head.append(pick, reset);
    this.body.append(h, head, rows);
    this.sections.push(sec);
    this.rebuild(sec);
  }

  private rebuildAll(): void {
    for (const s of this.sections) this.rebuild(s);
  }

  /** The slider rows of one section's group. */
  private rebuild(sec: Section): void {
    sec.rows.replaceChildren();
    if (sec.pick.value !== sec.group) sec.pick.value = sec.group;
    for (const o of Array.from(sec.pick.options)) {
      const g = o.value as TuneGroup;
      o.textContent = tuneGroupChanged(g) ? `${g} *` : g;
    }
    const group = sec.group;
    const list = tunablesFor(group).filter((t) => !this.changedOnly || tuneGet(group, t.id) !== t.def);
    if (!list.length) {
      const none = document.createElement('div');
      none.style.color = '#9ab';
      none.textContent = this.changedOnly ? '(nothing changed in this group)' : '(no sliders)';
      sec.rows.append(none);
      return;
    }
    for (const t of list) {
      const row = document.createElement('label');
      row.style.cssText = 'display:grid;grid-template-columns:minmax(64px,36%) 1fr 40px 24px;align-items:center;gap:3px;min-height:28px;';
      row.title = `${t.id} (${t.kind}, default ${t.def} ${t.unit}): ${t.hook}`;
      const name = document.createElement('span');
      name.textContent = t.label;
      name.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(t.min);
      input.max = String(t.max);
      input.step = String(t.step);
      input.dataset.group = group;
      input.dataset.id = t.id;
      input.style.cssText = 'width:100%;min-width:0;height:28px;margin:0;';
      const val = document.createElement('b');
      const x = document.createElement('button');
      x.type = 'button';
      x.textContent = 'x';
      x.title = 'reset';
      x.style.cssText = 'font:inherit;color:#cfe;background:none;border:none;padding:0;cursor:pointer;min-height:28px;min-width:24px;';
      const show = (): void => {
        const v = tuneGet(group, t.id);
        input.value = String(v);
        val.textContent = String(v);
        val.style.color = v !== t.def ? '#ffc040' : '';
      };
      show();
      input.addEventListener('input', () => {
        tuneSet(group, t.id, Number(input.value));
        show();
        this.markPick(sec);
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
      for (const t of ['pointerup', 'pointercancel', 'touchend', 'touchcancel', 'lostpointercapture']) input.addEventListener(t, release);
      x.addEventListener('click', (e) => {
        e.preventDefault();
        tuneReset(group, t.id);
        show();
        this.markPick(sec);
      });
      row.append(name, input, val, x);
      sec.rows.append(row);
      // (pass 3) the real-world target, a small grey line under the slider
      const hint = tuneHint(group, t.id);
      if (hint) {
        const hl = document.createElement('div');
        hl.className = 'anim-tune-hint';
        hl.textContent = hint;
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
    if (this.followBox) this.followBox.checked = v;
    if (v) this.syncFollow(true);
  }

  /** A slider or picker of the panel has the focus (follow must not rebuild it away). */
  private editing(): boolean {
    const a = document.activeElement;
    return this.pressing || (!!a && this.el.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'SELECT'));
  }

  /**
   * Follow the local player's current state (when on): a new state takes over once it has held FOLLOW_HOLD_MS, never
   * while a slider is held or focused (`force`: now, as on opening).
   */
  private syncFollow(force = false): void {
    if (!this.follow) return;
    if (!force && this.editing()) return;
    const now = performance.now();
    for (let k = 0; k < this.sections.length; k++) {
      const s = this.sections[k]!;
      const cur = s.kind === 'body' ? TUNE_STATE.body : TUNE_STATE.gun;
      if (!cur) continue;
      if (force) {
        this.cand[k] = '';
        if (cur !== s.group || force) {
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
    this.el.hidden = false;
    this.syncFollow(true);
    this.onOpenChange?.(true);
  }

  hide(): void {
    this.open = false;
    this.el.hidden = true;
    this.clearMarker();
    this.onOpenChange?.(false);
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
    this.syncFollow();
    if (!this.folded && nowMs >= this.nextInfo) {
      this.nextInfo = nowMs + 250;
      this.now.textContent = `now: ${TUNE_STATE.body || '-'}  /  ${TUNE_STATE.gun || 'unarmed'}${this.follow ? '' : '  (follow off)'}`;
      this.info.textContent = `${tuneChanged().length} changed, ${TUNE_LOG.length} log entries`;
    }
    if (this.marker) this.drawMarker();
  }

  private clearMarker(): void {
    this.line?.dispose();
    this.line = null;
    this.ball?.dispose(false, true);
    this.ball = null;
  }

  /** The barrel ray: a line from the muzzle MARK_DIST m out along the bore, and a ball at its end. No allocation once made. */
  private drawMarker(): void {
    const scene = this.scene;
    const rig = this.rig?.();
    const w = rig?.heldWeapon;
    if (!scene || !rig || !w) {
      if (this.line) this.line.isVisible = false;
      if (this.ball) this.ball.isVisible = false;
      return;
    }
    const m = w.getWorldMatrix();
    Vector3.TransformCoordinatesFromFloatsToRef(0, rig.gunSpan.bore, rig.gunSpan.z1, m, this.lineA);
    Vector3.TransformNormalFromFloatsToRef(0, 0, 1, m, this.lineDir);
    this.lineDir.normalize();
    this.lineA.addToRef(this.lineDir.scaleInPlace(MARK_DIST), this.lineB);
    if (!this.line) {
      this.line = CreateLineSystem('anim-tune-barrel', { lines: this.linePts, updatable: true }, scene);
      this.line.color = new Color3(1, 0.2, 0.9);
      this.line.isPickable = false;
      this.line.renderingGroupId = 2;
    } else CreateLineSystem('anim-tune-barrel', { lines: this.linePts, instance: this.line }, scene);
    if (!this.ball) {
      this.ball = CreateSphere('anim-tune-barrel-end', { diameter: 0.08, segments: 6 }, scene);
      const mat = new StandardMaterial('anim-tune-barrel-mat', scene);
      mat.emissiveColor = new Color3(1, 0.2, 0.9);
      mat.disableLighting = true;
      this.ball.material = mat;
      this.ball.isPickable = false;
      this.ball.renderingGroupId = 2;
    }
    this.line.isVisible = true;
    this.ball.isVisible = true;
    this.ball.position.copyFrom(this.lineB);
  }
}
