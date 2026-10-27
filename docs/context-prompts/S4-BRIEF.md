# Context prompts - S4 brief: the prompt view
Owner: Night Shift | Player Build. Status: current.

Strict Opus brief for the Sonnet 5.5 builder of slice S4 (PR P3). Build exactly this: every file, name, number and test
is fixed here. Anything this brief does not settle goes back to the lead as a question; do not widen it. Prototype mode
(G421, G422): every number is a starting value, not tuned.

## 0. Read first
- `docs/systems/agent-preamble.md` on origin/master (the whole text). Job: `ctx-p3`, worktree
  `C:/NightShift/Mobile-Coop-ctx-p3`, branch `feature/context-prompts-p3`, cut from the tip of
  `origin/feature/context-prompts-p1` (S1's types are there; P1 is not on master yet).
- On that branch: `docs/context-prompts/BRIEF.md` (Michael's words; his picks: pick 3 "Only the one you face", so only
  the focused target shows anything and nothing else is marked; pick 1 "Y at doors and hatches"), `PLAN.md` sections 4
  and 5 and the S4 row of section 8, and `src/game/contextPrompts.ts` (`CtxPromptSink`, `CtxPromptModel`, `CtxRow`,
  `CtxKind`, `CTX_FOCUS`, the slot constants).
- The code S4 builds on: `src/ui/hud/worldPrompts.ts`, `src/ui/hud/hud.ts`, `src/ui/prompts.ts` (`verbPromptHtml`,
  `promptHtml`, `keyLabels`, `padButtons`), `src/styles.css` (`.hud-world`, `.wp-*`, `.glyph`, `.hud-interact
  .hold-ring`), `scripts/e2e-pad.mjs` (the vent section ~711-783 is the pattern for the new step).
- G6 (CLAUDE.md): no reference-game name anywhere in code, CSS, tests or comments. Michael's quote is the only place one
  appears, and S4 quotes nothing.

## 1. What S4 builds (one paragraph)
The view half of the seam. S3 (built in parallel on `feature/context-prompts-p2`) refills the model every fixed step
and calls `hud.ctxPrompts?.update(model)`. S4 implements that sink: a cluster on the focused target (the `.wp-mark`
diamond at the model's anchor, one row per offered button under it: `[A] Open · hold Bash`, `[Y] Peek · hold Optic
cable`, `[RT] Knock out · hold Kill`, `[LT] Shield`), placed every frame by projecting the anchor, clamped to the screen
like today's world prompts, pushed clear of the other world prompts, fading in over `CTX_FOCUS.fade` (0.15 s) when a
target gains the focus and out when it loses it, with a ring round the glyph that fills while a hold is under way. The
glyphs come from the existing prompt code (every device variant emitted, the body class picks one), so they swap at
once between pad and keyboard. With the flag off nothing ever feeds the view, so nothing shows and the old box
(`.hud-ctx`, `ContextMenuView`) and the centre use prompt (`Hud.setInteract`) are untouched.

## 2. Files
S4 owns exactly these (new *):
| File | Change | ~Lines |
| --- | --- | --- |
| *`src/ui/hud/promptLayout.ts` | pure layout: clamp, overlap push, the two-cluster fade state, row text and width | 140 |
| *`src/ui/hud/contextPromptView.ts` | `ContextPromptView implements CtxPromptSink` (DOM, no Babylon) | 240 |
| `src/ui/hud/worldPrompts.ts` | `flush(p?)`, the shared push through `promptLayout`, the cluster hook, G6 comment | +50 / -30 |
| `src/ui/hud/hud.ts` | import, the `ctxPrompts` field, two constructor lines | +8 |
| `src/styles.css` | the cluster block; two G6 comment edits | +95 |
| *`tests/promptLayout.test.ts` | the pure module's tests (section 7) | 170 |
| `scripts/e2e-pad.mjs` | one new section (section 8) | +75 |

Total ~760 (PLAN ~740).

S4 must not touch: `src/game/gameState.ts`, `src/game/contextProviders.ts` and every other S3 / S5 file,
`src/game/contextPrompts.ts` and `src/game/contextJump.ts` (S1 / S2, read only), `src/core/flags.ts`,
`src/ui/hud/contextMenuView.ts`, `src/game/contextMenu.ts`, `src/ui/prompts.ts` (use it as it is), any other test or
e2e script, any doc (S6 writes the docs; the lead writes STATE).

## 3. The seam (S1 / S3 / S4)
- `ContextPromptView.update(model: CtxPromptModel): void` is the sink S3 calls once per fixed step (only with the flag
  on). It applies text, row visibility, the ring and the focus change. It never projects.
- Placement needs the camera, which only `GameState` has. `GameState` already has a public `project(x, y, z): boolean`
  (writes percent of the view into `scr`, false when behind the camera or more than 5 % off screen) and a public
  `readonly scr = { x, y }`. S4 defines the matching structural type `CtxProjector` (section 4) and makes
  `WorldPrompts.flush(p?: CtxProjector)` place the clusters when `p` is given.
- The one line outside S4's files: in `GameState.updateCoverHud` (~4171) `w.flush();` becomes `w.flush(this);`. The
  builder does not make it. The lead makes it in the commit that merges P2 into this branch (PLAN: S4's e2e runs on a
  head that contains P2). Until then `flush()` without an argument places no cluster, and an unplaced cluster stays
  hidden (`.off`, section 5), so nothing can show at the screen corner.
- The HUD hook: S4 declares `readonly ctxPrompts: ContextPromptView` on `Hud`. If S3's branch declared
  `ctxPrompts?: CtxPromptSink` on `Hud`, the lead's merge keeps S4's line. S3's `this.hud.ctxPrompts?.update(...)`
  compiles against either (no type-aware lint rule in `eslint.config.js`).

## 4. `src/ui/hud/promptLayout.ts`
Pure: no DOM, no Babylon, and no allocation in any function below except `newBox`, `newCtxFade` and `ctxHoldText`.
Header comment: what it is, `(context-prompts S4, PLAN section 5)`, pure and tested by `tests/promptLayout.test.ts`.

```ts
import { CTX_FOCUS, type CtxKind } from '../../game/contextPrompts';

/** World point to percent of the view (`GameState` matches it structurally: `project` writes `scr`). */
export interface CtxProjector {
  project(x: number, y: number, z: number): boolean;
  readonly scr: { readonly x: number; readonly y: number };
}

/** Today's world-prompt clamp (percent of the view): labels stay readable at the screen edges. */
export const WP_CLAMP = { x0: 8, x1: 92, y0: 10, y1: 97 } as const;
/** Today's overlap estimate: label width per character (vw), the glyph / icon padding (vw), the row height (vh). */
export const WP_OVERLAP = { charVw: 1.25, padVw: 4, minDy: 7 } as const;
/** The cluster: its rows start this far under the marker (vh); each row is this tall (vh). Starting values. */
export const CTX_ROWS_TOP = 1.2;
export const CTX_ROW_VH = 3.2;
/** The ring's fill steps (a hold's 0..1 rounded to 1 / 40, as `Hud.setInteract`). */
export const RING_STEPS = 40;
/** `--p` per ring step, built once ('0deg' .. '360deg'). */
export const RING_P: readonly string[]; // built once at module load: `${i * 9}deg` for i 0..RING_STEPS

export function clampX(x: number): number; // Math.max(WP_CLAMP.x0, Math.min(WP_CLAMP.x1, x))
export function clampY(y: number): number; // the same with y0 / y1
export function roundPos(v: number): number; // Math.round(v * 10) / 10 (today's transform rounding)

/** One prompt on screen for the overlap pass: anchor (vw, vh), extent below it (vh), width in characters. */
export interface PromptBox { on: boolean; x: number; y: number; h: number; chars: number; pinned: boolean }
export function newBox(): PromptBox; // { on: false, x: 0, y: 0, h: 0, chars: 0, pinned: false }
```

`pushApart(b: readonly PromptBox[], n: number): void` - today's `WorldPrompts.flush` loop, generalised. For each pair
`i < j < n` with both `on`:
- vertical test: skip unless `a.y <= b.y + b.h + minDy && b.y <= a.y + a.h + minDy` (with `h` 0 this is today's
  `|dy| <= 7`);
- `dx = b.x - a.x`, `gap = (a.chars + b.chars) * charVw * 0.5 + padVw`; skip when `Math.abs(dx) >= gap`;
- `sgn = dx >= 0 ? 1 : -1`, `need = gap - Math.abs(dx)`;
- neither pinned or both pinned: `a.x -= need / 2 * sgn; b.x += need / 2 * sgn` (today's rule);
- only `a` pinned: `b.x += need * sgn`; only `b` pinned: `a.x -= need * sgn`.
No clamp after the push (today's behaviour).

The cluster's numbers:
- `ctxHoldText(tapLabel: string, holdLabel: string): string` - `''` when `holdLabel` is `''`; `'hold ' + holdLabel`
  when `tapLabel` is `''`; else `' · hold ' + holdLabel` (a middle dot U+00B7 between spaces).
- `ctxRowChars(tapLabel: string, holdLabel: string): number` - `tapLabel.length + (holdLabel === '' ? 0 :
  holdLabel.length + (tapLabel === '' ? 5 : 8))` (the lengths of `'hold '` and `' · hold '`).
- `ctxClusterH(rows: number): number` - `rows <= 0 ? 0 : CTX_ROWS_TOP + rows * CTX_ROW_VH`.

The fade (two clusters, so the old target's cluster fades out where it was while the new one fades in):

```ts
export interface CtxFade {
  /** The cluster holding the focus (-1 none). */
  cur: number;
  /** Per cluster (2): the target it shows, and when it began fading out (s, -1 not fading). */
  readonly kind: CtxKind[];
  readonly ref: number[];
  readonly outAt: number[];
}
export function newCtxFade(): CtxFade; // { cur: -1, kind: ['none', 'none'], ref: [-1, -1], outAt: [-1, -1] }
/** Still drawn: holds the focus, or faded out less than `CTX_FOCUS.fade` s ago. */
export function fadeShown(s: CtxFade, i: number, now: number): boolean;
// i === s.cur || (s.outAt[i]! >= 0 && now - s.outAt[i]! < CTX_FOCUS.fade)
/** The focus is (kind, ref) at `now` (s). True when the clusters changed. */
export function fadeFocus(s: CtxFade, kind: CtxKind, ref: number, now: number): boolean;
```
`fadeFocus` rules, in order:
1. `kind === 'none'`: if `cur >= 0`, set `outAt[cur] = now`, `cur = -1`, return true; else return false.
2. `cur >= 0` and `kind[cur] === kind && ref[cur] === ref`: return false.
3. Take-back: a cluster `i !== cur` with `kind[i] === kind && ref[i] === ref && fadeShown(s, i, now)` is chosen (it
   fades back in where it is, no jump).
4. Else: `cur >= 0` gives `1 - cur`; `cur < 0` gives the cluster with the smaller `outAt` (`outAt[0] <= outAt[1] ? 0 :
   1`; -1 counts as smallest).
5. Then: if `cur >= 0`, `outAt[cur] = now`; `cur = chosen`, `kind[chosen] = kind`, `ref[chosen] = ref`,
   `outAt[chosen] = -1`; return true.

No distance fade: the focused target is always in reach (doors and gaps 1.6 m, items 1.8 m, the takedown offer's own
reach), so the fade is the focus change only (Doubt 1).

## 5. `src/ui/hud/contextPromptView.ts`
Header comment: `(context-prompts S4, PLAN section 5; BRIEF A3, A10)`; what it draws; that only the focused target
shows (Michael's pick 3), the cluster that lost the focus only finishes its 0.15 s fade; no allocation per step or frame
except a transform string when a rounded position changed (as `WorldPrompts`).

Imports: `h` from `../dom`; `keyLabels`, `padButtons`, `promptHtml`, `verbPromptHtml` from `../prompts`; types
`CtxKind`, `CtxPromptModel`, `CtxPromptSink`, `CtxSlot` and the values `CTX_FOCUS`, `CTX_SLOTS` from
`../../game/contextPrompts`; the layout module.

DOM, built once in the constructor `constructor(layer: HTMLElement)`, two clusters appended to `layer` (the
`.hud-world` element):
```html
<div class="ctxp off" data-kind="none">            <!-- style --ctx-fade: `${CTX_FOCUS.fade}s`, set once -->
  <i class="wp-mark"></i>
  <div class="ctxp-rows">
    <div class="ctxp-row" data-slot="0">           <!-- slots 0..3: A, Y, RT, LT, in that order -->
      <span class="ctxp-g"><i class="hold-ring"></i><span class="ctxp-gl"><!-- glyph html --></span></span>
      <span class="ctxp-tap"></span><span class="ctxp-hold"></span>
    </div>
    ...
  </div>
</div>
```
Per cluster the view keeps (plain fields or fixed arrays of 4, made in the constructor): the element and its row,
glyph, tap and hold elements; cached `shown[4]`, `tap[4]`, `hold[4]`, `ringK[4]` (-1); `kindShown`; `chars`, `rows`
(shown row count); the anchor `ax, ay, az`; the written position `sx, sy` (-1); `placed` (false). Labels are written
with `textContent`, never `innerHTML` (an item label can carry a player's name: "Revive <name>").

Glyph per slot (`slotGlyph(slot)`, called only when bindings change):
| Slot | Glyph |
| --- | --- |
| 0 `CTX_A` | `verbPromptHtml('interact', keyLabels.interact)` |
| 1 `CTX_Y` | `verbPromptHtml('traverse', keyLabels.traverse)` (the jump verb's glyph; a remapped jump moves it, A24) |
| 2 `CTX_RT` | `promptHtml('RT')` (key label LMB) |
| 3 `CTX_LT` | `promptHtml('LT')` (key label RMB) |
The view caches `keyLabels.interact`, `keyLabels.traverse`, `padButtons.interact`, `padButtons.traverse`; `update`
compares the four each call (primitive compares, no allocation) and on any difference rewrites the `.ctxp-gl` of slots
0 and 1 in both clusters. Built once in the constructor for all four slots.

`update(m: CtxPromptModel): void` (per fixed step):
1. `this.m = m`; the binding check above.
2. If `m.version === this.ver` return; else `this.ver = m.version`.
3. `now = performance.now() / 1000`. If `fadeFocus(this.fade, m.kind, m.ref, now)`: for both clusters toggle `.on` to
   `i === fade.cur`; on the new current cluster, unless it was a take-back (rule 3: it already showed this target), set
   `placed = false` and add `.off` (it shows only once `place` projected it at the new target), and write `dataset.kind = m.kind` when it differs from `kindShown`. Toggle `.ctx-guard` on `layer`
   to `cur >= 0 && (m.kind === 'held' || m.kind === 'guard' || m.kind === 'hostage')` (only when it changes).
4. If `fade.cur < 0` return. Else sync the current cluster's 4 rows from `m.rows[slot]` and `m.shows(slot)`:
   - `shown` changed: toggle `.shown`;
   - `tapLabel` changed: write `.ctxp-tap` text;
   - `holdLabel` changed or the pair state changed: write `.ctxp-hold` text `ctxHoldText(tapLabel, holdLabel)` (allocates
     only on a change) and toggle `.pair` to `tapLabel !== '' && holdLabel !== ''`;
   - ring: `k = m.holdSlot === slot ? Math.round(m.holdK * RING_STEPS) : -1`; when `k !== ringK[slot]`: toggle
     `.hold` to `k > 0`, and when `k > 0` `row.style.setProperty('--p', RING_P[k]!)`.
   - When any `shown` or label changed: recompute `rows` (count of shown) and `chars` (max `ctxRowChars` over shown
     rows).
5. Nothing else. No closures, no arrays, no template strings in this path except `ctxHoldText` on a change.

`place(p: CtxProjector, b0: PromptBox, b1: PromptBox): void` (per frame, from `WorldPrompts.flush`):
- If `this.m` is null: both boxes `on = false`, return.
- `now = performance.now() / 1000`. For cluster `i` (box `b0` / `b1`): if `!fadeShown(fade, i, now)` then `box.on =
  false` and continue. If `i === fade.cur` copy `m.x, m.y, m.z` into the cluster's anchor (the faded-out cluster keeps
  its last anchor). If `!p.project(ax, ay, az)`: `box.on = false`, add `.off` (when not already) and continue. Else
  remove `.off` (when set), `placed = true`, and fill the box: `on = true`, `x = clampX(p.scr.x)`, `y =
  clampY(p.scr.y)`, `h = ctxClusterH(rows)`, `chars`, `pinned = true`.

`write(b0: PromptBox, b1: PromptBox): void` (per frame, after the push): for each cluster whose box is `on`: `x =
roundPos(box.x)`, `y = roundPos(box.y)`; when either differs from `sx, sy`, store them and set
`el.style.transform = \`translate(${x}vw, ${y}vh)\``.

`foldsTakedown(): boolean` - the `.ctx-guard` state (the cluster names the guard, so the old `takedown` world prompt
is folded into it, PLAN section 5).

`shownKind(): CtxKind` - `fade.cur >= 0 ? fade.kind[fade.cur]! : 'none'` (tests, tools).

## 6. `worldPrompts.ts`, `hud.ts`, `styles.css`
`src/ui/hud/worldPrompts.ts`:
- Line 4's comment becomes `/** Prompts drawn on the world surface they act on. */` (G6).
- The constants `CHAR_VW`, `PAD_VW`, `MIN_DY` go (now `WP_OVERLAP` in `promptLayout.ts`); `set` clamps with
  `clampX` / `clampY` (same numbers).
- New fields: `ctx: ContextPromptView | null = null` (`import type`), and `private readonly boxes: PromptBox[]`, 8
  boxes from `newBox()` made in the constructor (0-5 the prompt ids in `PROMPT_IDS` order, 6-7 the clusters).
- `flush(p?: CtxProjector): void`, index loops only (no `for...of`):
  1. For `i` 0-5: box `on = !!item.key`, `x`, `y` from the item, `h = 0`, `chars = item.key.length`, `pinned =
     false`. If `this.ctx?.foldsTakedown()`, the `takedown` box is `on = false`.
  2. If `this.ctx && p` call `this.ctx.place(p, boxes[6], boxes[7])`; else boxes 6 and 7 `on = false`.
  3. `pushApart(boxes, 8)`.
  4. Copy boxes 0-5 back into the items' `x`, `y`, then today's transform write (rounded with `roundPos`, written only
     when moved).
  5. If `this.ctx && p` call `this.ctx.write(boxes[6], boxes[7])`.
  With only the old prompts on screen the result is exactly today's (the test in section 7 pins it).

`src/ui/hud/hud.ts`: `import { ContextPromptView } from './contextPromptView';`; after the `world` field:
`/** (context-prompts S4) The context prompts on the focused target (PLAN section 5): S3 feeds the model every step
(flag on only); hidden until fed. */ readonly ctxPrompts: ContextPromptView;`; after `this.world = new
WorldPrompts(parent);`: `this.ctxPrompts = new ContextPromptView(this.world.el);` and `this.world.ctx =
this.ctxPrompts;`. Nothing else: `--hud-scale` is already set on the world layer (`setAccess`, hud.ts ~171), and
`setVisible` / `dispose` already cover the world layer the clusters live in. The old box (`this.ctx`,
`ContextMenuView`) and `setInteract` are not touched.

`src/styles.css`: one block right after the `.wp-move .wp-body` rule (~1951), the existing look (the `.wp-body` pill,
`.wp-mark`, the centre prompt's ring), no new image or icon:
```css
/* (context-prompts S4) the context prompts on the focused target: the marker at the anchor, one row per button under
   it (PLAN section 5). Fades over --ctx-fade (CTX_FOCUS.fade); text in vh times the HUD size setting. */
.ctxp { position: absolute; left: 0; top: 0; will-change: transform, opacity; opacity: 0; visibility: hidden;
  transition: opacity var(--ctx-fade, 0.15s) linear, visibility 0s linear var(--ctx-fade, 0.15s);
  font-size: calc(2.2 * var(--vh) * var(--hud-scale, 1)); }
.ctxp.on { opacity: 1; visibility: visible; transition: opacity var(--ctx-fade, 0.15s) linear, visibility 0s; }
.ctxp.off { visibility: hidden; transition: none; }
.ctxp-rows { position: absolute; left: 50%; top: calc(1.2 * var(--vh)); transform: translateX(-50%); display: flex;
  flex-direction: column; align-items: center; gap: calc(0.4 * var(--vh)); }
.ctxp-row { --p: 0deg; display: none; align-items: center; gap: 0.35em; white-space: nowrap; font-weight: 800;
  letter-spacing: 0.04em; text-transform: uppercase; color: #e6f4ff; text-shadow: 0 1px 2px #000;
  background: rgba(10, 13, 18, 0.45); padding: 0.2em 0.7em 0.2em 0.3em; border-radius: 999px; }
.ctxp-row.shown { display: flex; }
.ctxp-g { position: relative; display: inline-flex; align-items: center; }
.ctxp .glyph { font-size: 0.8em; min-width: 2em; height: 2em; padding: 0 0.5em; border-radius: 1em; }
.ctxp .glyph.round { width: 2em; padding: 0; }
.ctxp-row .hold-ring { display: none; position: absolute; left: 50%; top: 50%; width: 2.2em; height: 2.2em;
  margin: -1.1em 0 0 -1.1em; border-radius: 50%;
  background: conic-gradient(#4fdc7c var(--p), rgba(255, 255, 255, 0.18) 0);
  -webkit-mask: radial-gradient(circle, transparent 0.85em, #000 0.95em);
  mask: radial-gradient(circle, transparent 0.85em, #000 0.95em); }
.ctxp-row.hold .hold-ring { display: block; }
.ctxp-row.pair:not(.hold) .ctxp-hold { opacity: 0.55; }
.hud-world.ctx-guard .wp-takedown { display: none; }
```
Write it in the file's normal one-declaration-per-line format. `.ctxp .glyph` sets no `display` (the body class picks
the device variant). G6, comments only: the two comments that name another game lose the name (the vignette comment
~2299 drops its bracketed name; the Loadout comment ~2859 reads `(the gear screen)`). Grep the diff for the name
before each commit.

## 7. `tests/promptLayout.test.ts` (vitest, node; header comment as the other test files)
- clamp: `clampX(3)` 8, `clampX(50)` 50, `clampX(99)` 92; `clampY(2)` 10, `clampY(99)` 97; `roundPos(43.3125)` 43.3.
- push, today's numbers: boxes "Vault" (chars 5) and "Take cover" (chars 10), both at x 50, y 50, h 0, unpinned: x
  become 43.3125 and 56.6875 (gap 13.375).
- push, far apart: the same pair at x 30 and 70: unchanged. Same x, y 50 and 58 (|dy| 8 > 7): unchanged; y 50 and 57:
  pushed.
- push, pinned cluster: cluster (chars 15, h `ctxClusterH(1)`, pinned) and "Vault" (chars 5) at x 50, y 50: cluster x
  stays 50, Vault x 66.5 (gap 16.5). Swapped order (Vault first): Vault x 33.5, cluster 50.
- push, the cluster's height: cluster at y 40 with 3 rows (`h` 10.8, spans to 50.8) and "Vault" at y 57 (57 <= 50.8 +
  7): pushed; at y 58.5: unchanged.
- push skips boxes with `on` false; `n` limits the pairs.
- text: `ctxHoldText('Open', 'Bash')` `' · hold Bash'`; `ctxHoldText('', 'Kill')` `'hold Kill'`;
  `ctxHoldText('Lights off', '')` `''`; `ctxRowChars('Open', 'Bash')` 16; `ctxRowChars('', 'Kill')` 9;
  `ctxRowChars('Shield', '')` 6; `ctxClusterH(0)` 0, `ctxClusterH(2)` 7.6.
- `RING_P`: 41 entries, `RING_P[0]` `'0deg'`, `RING_P[40]` `'360deg'`.
- fade (`f = CTX_FOCUS.fade`), each case on a fresh `newCtxFade()`:
  - none to door 3 at t 0: true, cur 0; door 3 again at 0.5: false.
  - door 3 at 0, door 4 at 1: cur 1; at `1 + f / 2` both shown; at `1 + f` only cluster 1.
  - door 3 at 0, none at 2: true, cur -1; cluster 0 shown at `2 + f / 2`, not at `2 + f`; door 3 again at `2 + f / 2`:
    cur 0 (take-back, rule 3).
  - door 3 at 0, door 4 at 1, door 3 at `1 + f / 3`: cur 0 (take-back of the fading cluster).
  - door 3 at 0, door 4 at 1, door 5 at `1 + f / 3`: cur 0 (rule 4: the other cluster, reassigned), `kind[0]` 'door',
    `ref[0]` 5.
  - door 3 at 0, door 4 at 1, none at 2, door 6 at 5: cur 0 (`outAt` 1 < 2, rule 4).
- No allocation: `pushApart` and `fadeFocus` / `fadeShown` run 10,000 times on the same objects with no new box or
  state (assert the same array and box identities after; no heap measure).

## 8. The e2e step (`scripts/e2e-pad.mjs`)
A new section right before `console.log('remap (step 18, D7) ...')`, in the vent section's shape (own `launch`, manual
loop, `try` / `finally` closing the browser):
```js
console.log('context prompts (context-prompts S4): the cluster on a door, the pad glyph, the hold ring, the key label');
```
- `launch({ url, params: 'autostart=warehouse&mode=clear&ctxprompts=1' })`, wait for `window.__app?.current?.enemyMgr`
  (60 s).
- Setup in one `evaluate`: `a.loop.manual = true`, `g.target.health.invulnerable = true`, `g.mode.pending.length = 0`,
  `g.enemyMgr.clear()`, `window.__pad.connect()`; `const d = g.world.doors.nearest(-0.95, 12, 0.5)`;
  `g.world.doors.close(d, () => false)`; teleport to `(-0.95, 0, 11.2)` yaw 0, `cam.yaw = 0`, `cam.pitch = 0` (the
  door spot of e2e-stealth-ai's `doors` scenario); a View press (`P.set(8, 1)`, 2 steps, `P.set(8, 0)`, 2 steps) so the
  pad is the last device; step 0.5 s (`stepHeadless(1 / 60, 120)` x 30). Then `await frames(S.page, 3)` (a rendered
  frame updates the camera matrix the projection reads) and step 6 more.
- Read (one `evaluate`): `const c = document.querySelector('.ctxp.on')`; `kind = c?.dataset.kind`; `off =
  c?.classList.contains('off')`; the A row `c.querySelector('.ctxp-row[data-slot="0"]')`: `shown`, its `.ctxp-tap` and
  `.ctxp-hold` text; `getComputedStyle` display of its `.g-xbox` and `.g-key`; the transform parsed from
  `c.style.transform` (`/translate\(([\d.]+)vw, ([\d.]+)vh\)/`); `box = !!document.querySelector('.hud-ctx.show')`;
  `pad = document.body.classList.contains('input-gamepad')`.
- Assert (each message carries the read values):
  1. `pad` and `kind === 'door'` and `!off`: "the cluster shows on the faced door (pad mode)".
  2. the A row shown, tap text `/open/i`, hold text `/bash/i`: "`[A] Open · hold Bash`".
  3. `.g-xbox` display not `'none'`, `.g-key` display `'none'`: "the pad glyph shows".
  4. x in [8, 92] and y in [10, 97]: "placed on screen, clamped".
  5. `!box`: "the old box never shows with the flag on".
- Hold ring: `P.set(0, 1)`, step 12 (0.2 s, under `CTX_HOLD` 0.35 s); read the A row: class `hold` and
  `style.getPropertyValue('--p')` not `''` and not `'0deg'`. Then `P.set(0, 0)`, step 4 (the release is a tap: the door
  opens; not asserted here, S3's suites own the actions). Assert 6: "the ring fills while A is held".
- Key label: `await S.page.keyboard.press('ShiftLeft')` (run: harmless standing still), step 2. Read: body has
  `input-kbm`; the `.ctxp.on` A row's `.g-key` display not `'none'` and its text `'E'`; `.g-xbox` display `'none'`.
  Assert 7: "the glyphs swap to the key label on a key press".
- Walk away: teleport to `(-0.95, 0, 7)`, yaw `Math.PI`, `cam.yaw = Math.PI`, step 0.5 s. Assert 8: no `.ctxp.on`
  ("nothing shows away from the door").
This step needs P2 (S3's providers feed the model); it runs only on a head that contains P2 and the seam line
(section 3). e2e builds are not preview builds, so every other e2e step keeps the flag off and the old box.

## 9. Checks, commits, report
- Sub-steps, each committed and pushed (path-limited `git add`): (1) `promptLayout.ts` + its test; (2)
  `contextPromptView.ts`, `worldPrompts.ts`, `hud.ts`, `styles.css`; (3) the e2e step.
- Per sub-step: `npm run typecheck:fast`; `npx vitest run tests/promptLayout.test.ts tests/contextPrompts.test.ts
  tests/objectivePopup.test.ts` (the last reads `hud.ts` source: keep `setObjective`, `showObjective` and the popup
  lines as they are); `npx eslint <your files>`. No full `npm run check`, no e2e from the builder.
- e2e (the lead, after merging P2 and adding the seam line): `e2e-pad` and the PR's `affected-e2e` (`e2e-desktop` per
  PLAN) through the laptop queue. The seam line puts `src/game` in P3's diff: the lead also requests `e2e-coop` +
  `e2e-netmove` before the checker passes (RULES "Test tiers").
- Look sign-off (PLAN section 5): three screenshots in the PR body (a door, a guard from behind, a hold item with the
  ring part filled); the lead gets them from `/preview/` after the merge (no new screenshot machinery in this slice).
- Report: `C:/NightShift/scratch/ctcore/cp-s4-REPORT.md` (built, numbers used, files, commits, skipped, tests,
  results, what Michael should try). Final message short: done / not done, check results, open items.

## 10. Model and checker
- Builder: Sonnet 5.5, from this brief only.
- Checker: one fresh Opus checker on the P3 head after the merge: reads this brief, PLAN section 5 and the diff;
  reruns tsc and the three vitest files; checks the e2e verdicts; checks no allocation in `update` / `place` / `write` /
  `flush` (no closures, iterators, arrays or template strings per call except the transform on a move and
  `ctxHoldText` on a label change), that only the focused target shows, that the flag-off path shows nothing new and
  leaves `.hud-ctx` / `setInteract` alone, and G6 over the diff. Verdict as a commit status (agent preamble).

## 11. Doubts
1. "Fade at ~3 m": PLAN has no distance fade. It fades on the focus change over `CTX_FOCUS.fade` (0.15 s), and the
   focused target is always in reach (1.6-1.8 m, the takedown offer's reach), so a 3 m fade would never act. This
   brief builds the time fade only. If a distance fade is wanted, it is a new `CTX_FOCUS` number and one opacity term.
2. The seam needs one line outside S4 (`w.flush()` to `w.flush(this)` in `GameState.updateCoverHud`), made by the lead
   in the P2 merge. That puts `src/game` in P3's diff and adds the `e2e-coop` + `e2e-netmove` gate. The other way is
   for S3 to own it, but S3's head has no `flush(p)` to call, so it cannot compile there.
3. `hud.ts`: if S3 also declared `ctxPrompts?: CtxPromptSink` there, the merge conflicts on that one line; keep S4's.
4. Off screen: `GameState.project` returns false past 5 % outside the view, and the cluster hides there, as today's
   world prompts do. PLAN's "clamped to the screen edge as worldPrompts does today" is read as today's behaviour: clamp
   8-92 / 10-97 inside the view, hidden outside it. No edge arrow is built.
5. RT and LT glyphs are not remap-aware (`padButtons` has no fire or aim entry), the same as every prompt today.
6. The old `takedown` world prompt is hidden by CSS while the cluster names a guard (`.ctx-guard`) and left out of the
   push. In a team move or offer (no cluster until S5) it still shows, so row 43 keeps a prompt until S5 folds it. If
   S3 also gates it in `gameState.ts`, the two agree.
7. The cluster is pinned in the overlap push (the other prompt moves the whole gap), so the prompt stays on the thing it
   acts on. Today's prompts still split the gap between themselves.
8. The existing world prompts keep their 11 px text (they do not use `--hud-scale`); only the new cluster follows the
   HUD size setting. Making them match is tuning, not this slice.
9. The e2e uses Warehouse's door at (-0.95, 12) from e2e-stealth-ai and expects S3's door labels to contain "Open" and
   "Bash" (PLAN row 15). If S3 words them differently, the regex follows S3, not this brief.
10. The ring step count (40) and the row height (3.2 vh) are starting values; the overlap widths are estimates from
    label lengths (today's method), not measured text.
