/**
 * (context-prompts S4, `docs/context-prompts/PLAN.md` section 5; BRIEF A3, A10) The context prompts on the thing they act
 * on: a marker at the focused target's anchor and one row per offered button under it (`[A] Open · hold Bash`), with a
 * ring round the glyph that fills while a hold is under way. Only the focused target shows (Michael's pick 3, "Only the
 * one you face"); the cluster that lost the focus only finishes its short fade (`CTX_FOCUS.fade`). The glyphs come from
 * `../prompts` (every device variant emitted, the body class picks one). DOM only, no Babylon: `update` applies the
 * model each fixed step (S3 calls it, flag on only); `place` and `write` run each frame from `WorldPrompts.flush`, which
 * owns the overlap push (`promptLayout.ts`). Nothing allocates per step or frame except a transform string when a
 * rounded position changed (as `WorldPrompts`) and the hold text when a label changed.
 */
import { h } from '../dom';
import { keyLabels, padButtons, promptHtml, verbPromptHtml } from '../prompts';
import { CTX_FOCUS, CTX_SLOTS, type CtxKind, type CtxPromptModel, type CtxPromptSink, type CtxSlot } from '../../game/contextPrompts';
import {
  clampX,
  clampY,
  ctxClusterH,
  ctxHoldText,
  ctxRowChars,
  fadeFocus,
  fadeShown,
  newCtxFade,
  RING_P,
  RING_STEPS,
  roundPos,
  type CtxFade,
  type CtxProjector,
  type PromptBox,
} from './promptLayout';

/** The glyph of a slot: A the interact verb, Y the jump verb (a remapped jump moves it), RT and LT the triggers. */
function slotGlyph(slot: number): string {
  switch (slot) {
    case 0:
      return verbPromptHtml('interact', keyLabels.interact);
    case 1:
      return verbPromptHtml('traverse', keyLabels.traverse);
    case 2:
      return promptHtml('RT');
    default:
      return promptHtml('LT');
  }
}

/** One cluster: its elements, what it last wrote, and where its target is. */
class Cluster {
  readonly el: HTMLElement;
  readonly row: HTMLElement[] = [];
  readonly gl: HTMLElement[] = [];
  readonly tapEl: HTMLElement[] = [];
  readonly holdEl: HTMLElement[] = [];
  readonly shown: boolean[] = [];
  readonly tap: string[] = [];
  readonly hold: string[] = [];
  readonly ringK: number[] = [];
  kindShown: CtxKind = 'none';
  /** Shown rows and the widest one (characters), for the overlap push. */
  chars = 0;
  rows = 0;
  /** The target's anchor (world metres): the faded-out cluster keeps its last one. */
  ax = 0;
  ay = 0;
  az = 0;
  /** The transform last written (percent of the view). */
  sx = -1;
  sy = -1;
  /** Projected at its current target at least once; hidden (`.off`) until then and when off screen. */
  placed = false;
  off = true;

  constructor() {
    const rows = h('div', { class: 'ctxp-rows' });
    for (let s = 0; s < CTX_SLOTS; s++) {
      const gl = h('span', { class: 'ctxp-gl', html: slotGlyph(s) });
      const ring = h('i', { class: 'hold-ring' });
      const tapEl = h('span', { class: 'ctxp-tap' });
      const holdEl = h('span', { class: 'ctxp-hold' });
      const row = h('div', { class: 'ctxp-row', data: { slot: String(s) } }, h('span', { class: 'ctxp-g' }, ring, gl), tapEl, holdEl);
      rows.appendChild(row);
      this.row.push(row);
      this.gl.push(gl);
      this.tapEl.push(tapEl);
      this.holdEl.push(holdEl);
      this.shown.push(false);
      this.tap.push('');
      this.hold.push('');
      this.ringK.push(-1);
    }
    this.el = h('div', { class: 'ctxp off', data: { kind: 'none' } }, h('i', { class: 'wp-mark' }), rows);
    this.el.style.setProperty('--ctx-fade', `${CTX_FOCUS.fade}s`);
  }
}

export class ContextPromptView implements CtxPromptSink {
  private readonly layer: HTMLElement;
  private readonly cl: Cluster[] = [new Cluster(), new Cluster()];
  private readonly fade: CtxFade = newCtxFade();
  private m: CtxPromptModel | null = null;
  private ver = -1;
  /** The cluster names a guard (held, takedown offer or hostage): the old takedown prompt is folded into it. */
  private guard = false;
  // the bindings the glyphs were built from
  private kInteract: string;
  private kTraverse: string;
  private bInteract: number;
  private bTraverse: number;

  constructor(layer: HTMLElement) {
    this.layer = layer;
    layer.appendChild(this.cl[0]!.el);
    layer.appendChild(this.cl[1]!.el);
    this.kInteract = keyLabels.interact;
    this.kTraverse = keyLabels.traverse;
    this.bInteract = padButtons.interact;
    this.bTraverse = padButtons.traverse;
  }

  /** Apply the model (each fixed step): the focus change, the rows' text and visibility, the hold ring. Never projects. */
  update(m: CtxPromptModel): void {
    this.m = m;
    if (
      keyLabels.interact !== this.kInteract ||
      keyLabels.traverse !== this.kTraverse ||
      padButtons.interact !== this.bInteract ||
      padButtons.traverse !== this.bTraverse
    ) {
      this.kInteract = keyLabels.interact;
      this.kTraverse = keyLabels.traverse;
      this.bInteract = padButtons.interact;
      this.bTraverse = padButtons.traverse;
      for (let i = 0; i < 2; i++) {
        const c = this.cl[i]!;
        c.gl[0]!.innerHTML = slotGlyph(0);
        c.gl[1]!.innerHTML = slotGlyph(1);
      }
    }
    if (m.version === this.ver) return;
    this.ver = m.version;
    const f = this.fade;
    const now = performance.now() / 1000;
    const back = m.kind !== 'none' && (this.showsTarget(0, m, now) || this.showsTarget(1, m, now));
    if (fadeFocus(f, m.kind, m.ref, now)) {
      for (let i = 0; i < 2; i++) this.cl[i]!.el.classList.toggle('on', i === f.cur);
      if (f.cur >= 0) {
        const c = this.cl[f.cur]!;
        if (!back) {
          // a new target: hidden until `place` has projected it
          c.placed = false;
          if (!c.off) {
            c.off = true;
            c.el.classList.add('off');
          }
        }
        if (c.kindShown !== m.kind) {
          c.kindShown = m.kind;
          c.el.dataset.kind = m.kind;
        }
      }
      const g = f.cur >= 0 && (m.kind === 'held' || m.kind === 'guard' || m.kind === 'hostage');
      if (g !== this.guard) {
        this.guard = g;
        this.layer.classList.toggle('ctx-guard', g);
      }
    }
    if (f.cur < 0) return;
    this.sync(this.cl[f.cur]!, m);
  }

  /** Cluster `i` already draws this very target (a take-back: it fades back in where it is). */
  private showsTarget(i: number, m: CtxPromptModel, now: number): boolean {
    const f = this.fade;
    return i !== f.cur && f.kind[i] === m.kind && f.ref[i] === m.ref && fadeShown(f, i, now);
  }

  // the current cluster's four rows from the model
  private sync(c: Cluster, m: CtxPromptModel): void {
    let dirty = false;
    for (let s = 0; s < CTX_SLOTS; s++) {
      const r = m.rows[s]!;
      const on = m.shows(s as CtxSlot);
      if (on !== c.shown[s]) {
        c.shown[s] = on;
        c.row[s]!.classList.toggle('shown', on);
        dirty = true;
      }
      const tapChanged = r.tapLabel !== c.tap[s];
      const holdChanged = r.holdLabel !== c.hold[s];
      if (tapChanged || holdChanged) {
        const pairWas = c.tap[s] !== '' && c.hold[s] !== '';
        c.tap[s] = r.tapLabel;
        c.hold[s] = r.holdLabel;
        if (tapChanged) c.tapEl[s]!.textContent = r.tapLabel;
        const pair = r.tapLabel !== '' && r.holdLabel !== '';
        if (holdChanged || pair !== pairWas) c.holdEl[s]!.textContent = ctxHoldText(r.tapLabel, r.holdLabel);
        if (pair !== pairWas) c.row[s]!.classList.toggle('pair', pair);
        dirty = true;
      }
      const k = m.holdSlot === s ? Math.round(m.holdK * RING_STEPS) : -1;
      if (k !== c.ringK[s]) {
        c.ringK[s] = k;
        c.row[s]!.classList.toggle('hold', k > 0);
        if (k > 0) c.row[s]!.style.setProperty('--p', RING_P[k]!);
      }
    }
    if (!dirty) return;
    let rows = 0;
    let chars = 0;
    for (let s = 0; s < CTX_SLOTS; s++) {
      if (!c.shown[s]) continue;
      rows++;
      const n = ctxRowChars(c.tap[s]!, c.hold[s]!);
      if (n > chars) chars = n;
    }
    c.rows = rows;
    c.chars = chars;
  }

  /** Each frame, from `WorldPrompts.flush`: project the clusters' anchors and fill their boxes for the overlap push. */
  place(p: CtxProjector, b0: PromptBox, b1: PromptBox): void {
    const m = this.m;
    if (!m) {
      b0.on = false;
      b1.on = false;
      return;
    }
    const now = performance.now() / 1000;
    const f = this.fade;
    for (let i = 0; i < 2; i++) {
      const c = this.cl[i]!;
      const box = i === 0 ? b0 : b1;
      if (!fadeShown(f, i, now)) {
        box.on = false;
        continue;
      }
      if (i === f.cur) {
        c.ax = m.x;
        c.ay = m.y;
        c.az = m.z;
      }
      if (!p.project(c.ax, c.ay, c.az)) {
        box.on = false;
        if (!c.off) {
          c.off = true;
          c.el.classList.add('off');
        }
        continue;
      }
      if (c.off) {
        c.off = false;
        c.el.classList.remove('off');
      }
      c.placed = true;
      box.on = true;
      box.x = clampX(p.scr.x);
      box.y = clampY(p.scr.y);
      box.h = ctxClusterH(c.rows);
      box.chars = c.chars;
      box.pinned = true;
    }
  }

  /** Each frame after the push: write the clusters' transforms when their rounded position moved. */
  write(b0: PromptBox, b1: PromptBox): void {
    for (let i = 0; i < 2; i++) {
      const box = i === 0 ? b0 : b1;
      if (!box.on) continue;
      const c = this.cl[i]!;
      const x = roundPos(box.x);
      const y = roundPos(box.y);
      if (x === c.sx && y === c.sy) continue;
      c.sx = x;
      c.sy = y;
      c.el.style.transform = `translate(${x}vw, ${y}vh)`;
    }
  }

  /** The cluster names a guard, so the old takedown world prompt is folded into it (PLAN section 5). */
  foldsTakedown(): boolean {
    return this.guard;
  }

  /** The kind the focused cluster shows ('none' when none holds the focus), for tests and tools. */
  shownKind(): CtxKind {
    return this.fade.cur >= 0 ? this.fade.kind[this.fade.cur]! : 'none';
  }
}
