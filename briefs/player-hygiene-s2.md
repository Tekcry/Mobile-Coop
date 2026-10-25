status: done feature/player-hygiene-s2 d2b3ef89156427386e4cd262b10aef3fcb19eb87

# Brief: player-hygiene S2 - Pad poll makes no per-frame garbage, behaviour bit-identical (Player Build)

Lead: Night Shift | Player Build, 2026-10-26. Opus builder (BRIEF A9: a runtime input hot-path rewrite). Job J6
player-hygiene, slice S2 (BRIEF row H2, the pad half). Three input files; nothing may play or feel different. Unit
tests only.

## Read first
- Plan: `git show origin/feature/player-hygiene:docs/player-hygiene/PLAN.md` ("How it works today" H2 "Pad poll",
  "Design" H2 the Pad sentence, "Slices" S2, Risks). Brief: `git show origin/feature/player-hygiene:docs/player-hygiene/BRIEF.md`
  (A1 the 16 B goal, A2 `navigator.getGamepads()` is outside the claim, A3 allocations in other modules stay for J21).
- `tests/helpers/allocPerCall.ts` (`bytesPerCall`, `HEAP_NUMBER` = 16, `inputs`, `sink`; the measured loop must not
  allocate), `tests/helpers/animSkeletonIdentity.ts` (the cyrb53 float64 hasher).
- The S1 brief and test as the pattern: `git show origin/cloud-queue:briefs/player-hygiene-s1.md`,
  `git show origin/feature/player-hygiene-s1:tests/playerStepAlloc.test.ts` (fixture write flag, `REFACTORED` gate,
  the `sampled` heap-profile helper at :442-478).
- `tests/input.test.ts` (the `snap` helper :11-14 and every `mapPad` assertion: unchanged and green after).

## Base and branch
- Base `origin/master` at `2a937eb6b5650bb46c9dee8bdd02a63f82a50cd3`. New branch `feature/player-hygiene-s2` from it;
  push `origin feature/player-hygiene-s2` only (no force, no master merge, no rebase, no other branch). `npm ci` once.
- The plan docs are not on master: read them with `git show` as above.
- Gate (PLAN Risks; J19 PLAN :394-400 on origin/feature/player-batch-j19): S2 lands before J19 S6 (both edit the
  action-name list at `gamepadSource.ts:143-147`; S6 later deletes `'dash'` from it). J19 S6 is not briefed or built:
  nothing blocks S2.
- Overlap, checked 2026-10-26 with `git diff --stat origin/master...<ref>`: `feature/mixamo-source-wire` (68c15083),
  `feature/mixamo-on` (b0e0a4d5), `feature/mixamo-i9` (3f0f7852), `feature/player-batch-j19` (b5f62145, docs only) and
  `feature/coop4` (f720d29e) touch none of S2's files; no other recent remote branch has a net diff in them.

## Files (only these)
- `src/input/gamepadSource.ts`
- `src/input/gamepadMapping.ts`
- `src/input/stickMath.ts`
- `tests/padPollAlloc.test.ts` (new)
- `tests/fixtures/player-hygiene-s2.json` (new, written by the test)
- `changes/feature-player-hygiene-s2.md` (new fragment, `changes/README.md`)
Nothing else. Not `src/input/inputState.ts`, `src/input/padBinds.ts`, `src/input/navRepeat.ts`,
`src/input/actions.ts`, `src/editor/pad.ts`, `src/core/mathx.ts` (a wire path), `src/core/settings.ts`. An allocation
found in another module goes in the report (A3), not fixed.

## What is there now (master 2a937eb6; re-found)
`src/input/gamepadSource.ts`:
- `:11` `NAV_DIRS` array; `:30` `known = new Map<number, string>()` (`connected` reads `known.size` `:64-66`); `:32`
  `repeaters` Map; `:33` `lastTimestamps = new Map<number, number>()`; `:41` `table`; `:53` `padHook`.
- `:60-61` the connect / disconnect listeners call `this.scan()` (cold).
- `:68-74` `pads()`: `Array.from(navigator.getGamepads())` (a copy every call), `[]` when missing, `try/catch`.
- `:76-98` `scan()`: `new Set<number>()` `:77`; for-of over `this.pads()` `:78`; `for (const [i, id] of this.known)`
  `:87` (Map iterator + entry arrays), deleting the current entry inside the loop; disconnect order = Map insertion
  order; `onDisconnect`, `releaseSource`, stick reset when the active pad goes.
- `:100-171` `poll(now, dt)`: `this.scan()` `:101` then `this.pads()` again `:102` (two copies per poll); for-of
  `:104`; `lastTimestamps.get/set` `:106-108`; `p.buttons.some((b) => b.pressed)` `:109`; `pads.find((p) => p?.connected)`
  `:116`; `pads[this.activeIndex]` `:120`; table rebuild on a bindings change `:125-128` (cold); capture `:129-132`
  and hook `:133-136` (both leave the poll; out of scope, see Build 6); `:137` `mapPad({ buttons: pad.buttons.map((b)
  => b.value || (b.pressed ? 1 : 0)), axes: pad.axes }, s, this.table)` (a closure, an array, a snapshot literal, then
  everything `mapPad` makes); `:143-147` a 27-name array literal iterated with for-of every poll, `:148-149`
  `this.state.set(SRC, a, frame.buttons[a] === true)`; `:151-153` `for (const d of NAV_DIRS)` with
  `this.repeaters.get(d)!.update(frame.buttons[d] === true, now)`; `:154-170` move, look smoothing, stick, trigger (no
  allocation in this file).
- `:175-190` `takenByHook` (already index loops), `:216-241` `pollCapture` (a closure `down` `:218`: menus only, leave),
  `:243-258` `rumble` (cold, uses `pads()`).
`src/input/gamepadMapping.ts`:
- `:25-29` `PadSnapshot { buttons: readonly number[]; axes: readonly number[] }`; `:39-50` `PadFrame`.
- `:136-173` `mapPad(p, t, table = GAME_BINDINGS)`: closures `b`, `ax` `:137-138` (`p.buttons[i] ?? 0`, `p.axes[i] ?? 0`);
  `out = {}` `:139`; `for (const [i, a] of table / UI_BINDINGS / CTX_BINDINGS)` with destructuring `:141-143`;
  `applyAxisDeadzone` for LT / RT `:145-146` (returns a number: fine); `:147`, `:149` fire / ads; `:152`
  `applyCurve(applyRadialDeadzone(ax(0), ax(1), t.deadzoneLeft), 'linear')`; `:153-154` `rsd`, `rs`; `:155-157`
  `move`, `look`, `stick` literals (`move.y = -ls.y`, `look.y = t.invertY ? rs.y : -rs.y`, `stick.y = -rsd.y`);
  `:160-168` the left stick's menu directions; `:170-171` `active` from `Object.keys(out).length > 0 || ...`; `:172` the
  frame literal.
- Callers: `gamepadSource.ts:137`; tests `input.test.ts`, `padBinds.test.ts`, `animTunePad.test.ts:134`,
  `opticCoop.test.ts:324`, `:342` (they read `buttons.x` with `toBe(true)` / `toBeUndefined()` and `toMatchObject`: a
  `false` in the wrapper's record would break `toBeUndefined`).
`src/input/stickMath.ts`:
- `:8-13` `applyRadialDeadzone(x, y, inner, outer = 0.98)` returns `{ x: 0, y: 0 }` or `{ x: (x / mag) * t, y: (y / mag) * t }`;
  `:27-32` `applyCurve(v, curve)` likewise (`CURVE_EXP` `:24`). Callers: `gamepadMapping.ts:152-154`,
  `src/editor/pad.ts:70-71` (editor, keeps the wrapper), tests `input.test.ts`, `routeRunProgress.test.ts:76`, `:95`.
Outside (A3, report only): `InputState.setMove` makes a `{ x, y }` literal when the stick is off centre and iterates
`moveBySource.values()` (`src/input/inputState.ts:96-117`).

## Build (behaviour bit-identical: same arithmetic, same order)
Commit 1 (parity record, no src change): the test below and its fixture recorded on the UNCHANGED code
(`PH_S2_WRITE=1 npx vitest run tests/padPollAlloc.test.ts`), then a plain run passes against it. Commit 2: the
refactor. The test file and fixture do not change between the two commits (if the refactor seems to need a fixture
change, it is not bit-identical: fix the code).

`stickMath.ts`:
1. `applyRadialDeadzoneTo(x, y, inner, outer, out: Vec2): Vec2` and `applyCurveTo(v: Vec2, curve, out: Vec2): Vec2` with
   the exact expressions of today written into `out` (the dead-zone / zero branch sets `out.x = 0; out.y = 0`). Read
   `v.x`, `v.y` into locals before writing `out` (alias-safe when `out === v`). The old functions become thin wrappers:
   `applyRadialDeadzone(x, y, inner, outer = 0.98)` returns `applyRadialDeadzoneTo(x, y, inner, outer, { x: 0, y: 0 })`;
   same for `applyCurve`. Signatures and results unchanged.
`gamepadMapping.ts`:
2. `mapPadInto(p: PadSnapshot, t: PadTuning, table, f: PadFrameBuf): void` (or returning `f`), the same arithmetic and
   order as `mapPad` today: `p.buttons[i] ?? 0` / `p.axes[i] ?? 0` written inline (no closures), index loops over
   `table`, `UI_BINDINGS`, `CTX_BINDINGS` (`const e = table[k]!; if ((p.buttons[e[0]] ?? 0) > BTN_THRESHOLD) set(e[1])`),
   `ls` / `rsd` / `rs` into three member-of-frame scratch `Vec2`s via the `...To` forms (`rsd` and `rs` distinct:
   `stick` reads `rsd`, `look` reads `rs`; the outer edge is the wrappers' 0.98, a module constant), then `f.move.x =
   ls.x; f.move.y = -ls.y;` and the same for `look` and `stick` (keep the unary minus: it gives -0 exactly as today),
   `f.fireAnalog = rt`, `f.active = anySet || f.move.x !== 0 || ... || lt > 0 || rt > 0` in today's order.
3. The buttons record: `PadFrameBuf extends PadFrame` adds `readonly setList: ButtonAction[]` (capacity
   `BUTTON_ACTIONS.length`) and `setCount: number`; an exported `newPadFrame(): PadFrameBuf` builds it. At the start of
   `mapPadInto`, `for (k < f.setCount) f.buttons[f.setList[k]!] = false; f.setCount = 0;`. Setting an action: if
   `f.buttons[a] !== true`, `f.buttons[a] = true; f.setList[f.setCount++] = a`. `anySet` is `f.setCount > 0` (today
   `Object.keys(out).length > 0`: true exactly when one assignment happened). This clears whatever the last call set,
   so a rebinding between calls cannot leave a stale action.
4. `mapPad(p, t, table = GAME_BINDINGS)` becomes the wrapper: `const f = newPadFrame(); mapPadInto(p, t, table, f);`
   then a fresh `buttons` record holding only the true actions, filled from `setList[0 .. setCount)` (the same keys in
   the same insertion order as today's `out`), and a fresh frame literal `{ buttons, move: f.move, look: f.look,
   stick: f.stick, fireAnalog: f.fireAnalog, active: f.active }`. Every existing test reads it unchanged.
`gamepadSource.ts`:
5. One `getGamepads()` read per poll: `pads()` returns `navigator.getGamepads()` itself (no `Array.from`; read-only
   use), the same `try/catch`, and a module `const NO_PADS: readonly (Gamepad | null)[] = []` when missing.
   `scan(pads)` takes the array; `poll` reads it once and passes it; the two listeners and `rumble` call
   `this.scan(this.pads())` / `this.pads()` as before (cold). (In the browser the two reads today fall in the same
   task; with the test's stub both return the same array.)
6. `scan`: no `Set`, no Map iteration. A member `seenAt: number[]` stamped with a member scan counter (`seenAt[p.index]
   = this.scanN` after `this.scanN++` at the start; `seen.has(i)` becomes `this.seenAt[i] === this.scanN`), and a
   member `knownOrder: number[]` mirroring `known`'s keys in insertion order (pushed where `known.set` runs; on a
   disconnect remove it by shifting the tail down by hand, no `splice`). The disconnect loop walks `knownOrder` by
   index (stepping back one after a removal) with the same body and the same order of `onDisconnect` calls. Keep
   `known` (the `connected` getter, `has`, `get` for the id). Index loop over `pads`.
7. `poll`: index loops; `p.buttons.some(...)` -> an index loop over `p.buttons` with the same first-pressed rule;
   `pads.find(...)` -> the first index whose `p && p.connected`; `lastTimestamps` may become a member `number[]`
   indexed by pad index read with `?? 0` (same values). Snapshot: a member `{ buttons: number[], axes }` whose
   `buttons` array is refilled by index with `b.value || (b.pressed ? 1 : 0)` and whose length equals
   `pad.buttons.length` (resize only when it changes: a pad change, cold); `axes = pad.axes` (a reference, as today).
   Then `mapPadInto(snap, s, this.table, this.frame)` into a member `newPadFrame()`.
8. The 27 names: a module `const PAD_ACTIONS = [...] as const` (same names, same order), an index loop. `NAV_DIRS`: an
   index loop (`this.repeaters.get(NAV_DIRS[i]!)!`, as `takenByHook` already does).
9. Leave `pollCapture` (its closure runs only while a capture is armed in the menus), `takenByHook`, `rumble`, the
   constructor and the listeners as they are. Comments in the house style with a `(player-hygiene S2)` tag on each
   member group; fix any comment the change makes wrong.

## Test `tests/padPollAlloc.test.ts` (new)
- Header comment: (a) (b) (c) below, the fixture path, `PH_S2_WRITE=1` rewrites the fixture (only ever on the
  pre-refactor code), and the refactor flag: `import * as gm from '../src/input/gamepadMapping'` and
  `const REFACTORED = typeof (gm as unknown as Record<string, unknown>).mapPadInto === 'function'` (the test file never
  changes between the commits; before the refactor the Into checks are skipped and the readings only logged).
- Hasher as `tests/helpers/animSkeletonIdentity.ts` over each value's float64 bit pattern, -0 kept distinct (the
  arithmetic is the same, so the signs are). Fixture `{ stick: {name: {n, hash, last}}, map: {name: {n, hash, last}},
  poll: {name: {steps, hash, last}} }`; compare `last`, `n` / `steps`, `hash` per name; write in `afterAll` when
  `PH_S2_WRITE`.
- (a) Sweeps against the fixture (on commit 2 both the wrappers and the `...Into` forms are checked):
  - `stick`: `applyRadialDeadzone` over a grid (x, y in -1..1 by 0.05 plus 0, -0, +-1e-7, values on and either side of
    each `inner`), `inner` 0 / 0.08 / 0.15 / 0.3, `outer` default / 1 / 0.9; `applyCurve` over the same outputs for each
    of the four curves. Hash x, y.
  - `map`: `mapPad` over every single button 0..16 at 1, the double-bound buttons (LS, RS), all pressed, analog values
    0.3 / 0.5 / 0.51, triggers 0.05 / 0.35 / 0.36 / 0.9 against `triggerDeadzone` 0 / 0.05 / 0.2, an axes grid with the
    0.55 menu threshold and |x| = |y| ties, tunings (dead zones 0 / 0.12 / 0.15 / 0.3, the four curves, `invertY` both),
    and two tables (`GAME_BINDINGS`, and `padBindTable` of a remapped `defaultPadBinds()` as `tests/padBinds.test.ts`).
    Per case hash, for each name in `BUTTON_ACTIONS`, `buttons[a] === true`; `Object.keys(buttons).join(',')` (as char
    codes; the wrapper's key set and order); move, look, stick x / y; `fireAnalog`; `active`. On commit 2 the same
    sweep through ONE reused `newPadFrame()` for every case via `mapPadInto` (proves the clearing), its `Object.keys`
    term replaced by the true actions in `setList` order, equals the same hash.
  - `poll`: a `GamepadSource` on stubs: `vi.stubGlobal('window', { addEventListener() {} })` and
    `vi.stubGlobal('navigator', { getGamepads: () => PADS })` (restore in `afterAll`); fake pads `{ index, id,
    connected, timestamp, buttons: { pressed, value, touched }[17], axes: number[4] }` (an xbox id and a "DualSense"
    id); a real `InputState`; a settings stub `{ gamepad: { deadzoneLeft, deadzoneRight, triggerDeadzone, curve,
    invertY, lookSensitivityX, lookSensitivityY, adsMultiplier, vibration }, pad: defaultPadBinds() }`; events
    recording connect / disconnect / active. A scripted run of about 200 polls at fixed `now` / `dt` steps: pad 0
    appears, presses A, fire and aim triggers, a stick sweep, a D-pad down held through the nav repeat, full right-stick
    deflection held (the look acceleration), `adsActive` on, `settings.pad` swapped for a remap (the table rebuild),
    pad 1 with a newer timestamp pressing a button (takes over, `style` changes), pad 0 disconnecting (released). Per
    poll hash every `BUTTON_ACTIONS` `down` / `pressed` / `released`, `move`, `consumeLook()` x / y, `stick`,
    `fireAnalog`, `gs.style`, `gs.connected`, and the event counts.
- (b) `bytesPerCall` (A1, A2), `{ n: 1000, warm: 20000 }`, logged with `console.info` (bytes and, when over 16 B, the
  `sampled` profile's allocators): `GamepadSource.poll` with a no-allocation stub `InputState` (`set`, `tap`, `setMove`,
  `addLook`, `releaseSource` writing into preallocated arrays / fields, a `stick` object) cast in, states: at rest
  (sticks in the dead zone), stick pushed with fire and aim held, D-pad down held (repeating), right stick at full
  deflection; and `mapPadInto` alone on a pushed snapshot. Inputs fixed outside the loop (no double arithmetic in it).
  When `REFACTORED`: assert every reading `<= HEAP_NUMBER`. Before: log only. Also log (never assert) one `poll`
  reading with the real `InputState` and name its allocator (`inputState.ts:98`, `:102`; A3).
- If a reading stays over 16 B after the refactor, find it (`ALLOC_TRACE=1`, the profile); if it is outside the three
  files (A3), do not fix it: list file:line and bytes in the report, and for that state assert `<=` the measured ceiling
  rounded up to a multiple of 16 with a comment naming the allocator. Everything inside the three files must read clean.

## Run (unit tests only: no e2e, no GPU, no `npm run check`, no dev server; every command with a timeout)
`npm run typecheck:fast`;
`npx eslint src/input/gamepadSource.ts src/input/gamepadMapping.ts src/input/stickMath.ts tests/padPollAlloc.test.ts`;
`npx vitest run tests/padPollAlloc.test.ts tests/input.test.ts tests/padBinds.test.ts tests/animTunePad.test.ts tests/opticCoop.test.ts tests/routeRunProgress.test.ts tests/changesFragments.test.ts`
(add `--maxWorkers=2` on a small box). Run `tests/padPollAlloc.test.ts` on commit 1 (record, then a plain pass) and
on commit 2 three times in a row.

## Rules
- CLAUDE.md hot paths: no closures, iterators, literals or temporary arrays / vectors on a per-poll line; `hyp2` /
  `hyp3`, never `Math.hypot`. Strict TS (`noUncheckedIndexedAccess`), `import type` for type-only imports.
- No wire change, no `PROTOCOL_VERSION` change, no flag (G355: a fix to a shipped feature). Do not touch
  `src/core/mathx.ts` (a wire path: `scripts/merge-train.mjs:331` `wirePaths`, protocol.ts imports it).
- G22 stays: Menu / Start cancels a capture (`CAPTURE_CANCEL_BTN`, the capture path is untouched).

## Done when
- Commit 1 (test + fixture on unchanged code) then commit 2 (refactor); test and fixture identical in both.
- Every sweep and the poll run equal the fixture after the refactor, through the wrappers and the `...Into` forms;
  every reading `<= HEAP_NUMBER` (or the documented outside-allocator ceiling); the test passes 3 runs in a row.
- `grep -nE "Array\.from|new Set|\.some\(|\.find\(|\.map\(|Object\.keys|for \(const .* of" src/input/gamepadSource.ts src/input/gamepadMapping.ts src/input/stickMath.ts`
  shows nothing on the poll path (`poll`, `scan`, `mapPadInto`, the `...To` forms); anything left is in a wrapper, the
  constructor, `pollCapture`, `rumble` or `detectPadStyle`, named in the report.
- tsc and eslint clean; the vitest files above pass; `git diff --stat 2a937eb6b` lists only the six files above.
- `changes/feature-player-hygiene-s2.md`: line 1 `# Pad reading makes no per-frame garbage`, line 2 `kind: patch`, one
  or two `- ` bullets (no behaviour change; the controller read each frame reuses its records instead of making new
  ones; proved bit-identical against a recording made before the change).
- Commits with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `origin feature/player-hygiene-s2`.
  Then append `## Report` here and set line 1 to `status: done feature/player-hygiene-s2 <sha>`; commit, push
  `cloud-queue`.
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.

## Report (fill in)
- Branch, both commit shas.
- What changed, with file:line per Build item.
- Tests: names and counts per file; the three runs of `tests/padPollAlloc.test.ts`.
- Readings per state, `bytesPerCall` B per call, before -> after; the real-`InputState` reading and its allocator.
- Any outside allocator (A3) with file:line and bytes; any ceiling asserted instead of 16 B and why.
- Deviations from this brief, each with the reason.
- Pending PC run: e2e-pad, e2e-mouse, e2e-move, e2e-menus (the affected set for `src/input/`), plus e2e-coop and
  e2e-netmove only if the lead asks.

### Report (Night Shift | Cloud Builder 3, built by an Opus 5.5 agent, 2026-10-25 ~23:55Z)
Branch `feature/player-hygiene-s2` from 2a937eb6b. No blocker.

**Commits:**
- Commit 1, 9288ce34: the test and fixture, recorded with `PH_S2_WRITE=1` on unchanged master, then a plain pass
  (37 / 37).
- Commit 2, d2b3ef891: the refactor and the fragment.
- `git diff 9288ce34 HEAD -- tests/` is empty. `git diff --stat 2a937eb6b` lists the six allowed files only.

**What changed:**
- `src/input/stickMath.ts`:
  - `RADIAL_OUTER = 0.98` (`:5`).
  - `applyRadialDeadzoneTo` (`:16`) and `applyCurveTo` (`:49`) write into `out`. The curve form reads `v.x` / `v.y`
    into locals first, so `out === v` is safe. The old functions are thin wrappers.
  - The curve exponent is read through `CURVE_EXP_BY`, a Map built from `CURVE_EXP` (`:41`).
- `src/input/gamepadMapping.ts`:
  - `mapPad` (`:137`) is a wrapper returning the same keys in the same order.
  - `PadFrameBuf` (`:150`) holds every action as false, plus `setList` / `setCount` and three stick scratch vectors.
    `newPadFrame` is at `:161`.
  - `mapPadInto` (`:191`) clears the actions it set last call, reads in bounds only, and computes `active` from
    `setCount`.
- `src/input/gamepadSource.ts`:
  - `NO_PADS` (`:13`) and `PAD_ACTIONS` (`:17`).
  - Members `knownOrder`, `seenAt`, `scanN`, `lastTimestamps` (a number array), `snap` and `frame` (`:43-53`).
  - `pads()` returns the browser list with no copy (`:89`).
  - `scan(pads)` uses no Set or Map iterator (`:97`).
  - `poll` reads the list once and uses index loops (`:129`).
  - A reused snapshot feeds `mapPadInto` (`:187`); `anyPressed` is at `:307`.
- `changes/feature-player-hygiene-s2.md`: `kind: patch`.

**Readings** (`bytesPerCall`, B per call, before -> after):

| State | Before | After |
| --- | --- | --- |
| Poll at rest | 2280 | 15.7 |
| Poll pushed, fire and aim | 2472 | 15.7 |
| Poll D-pad down held (repeating) | 2416 | 15.7 |
| Poll right stick full | 2416 | 15.7 |
| `mapPad` -> `mapPadInto` alone | 1856 | 0.0 |

- The 15.7 B is the test loop boxing the `now` it passes to `poll`: A1's 16 B allowance. The sampled profile finds no
  allocation in the three files in any stub state.
- The real-`InputState` poll (logged only) reads 2848 -> 87.7-119.7.

**Outside allocators (A3, not fixed):**
- `src/input/inputState.ts:98` makes a `{x, y}` literal, and `:102` makes a Map values iterator: 87.7 B when V8
  inlines `setMove` into `poll`.
- When V8 does not inline `setMove`, the reading is 119.7 B: about 32 B more, from the two doubles `poll` passes to it.
  This clears with J21's `inputState.ts` fix.
- No ceiling above 16 B is asserted.

**Tests:**
- The brief's vitest line passes: 7 files, 138 tests (`padPollAlloc` 37, `input` 28, `padBinds` 6, `animTunePad` 11,
  `opticCoop` 26, `routeRunProgress` 29, `changesFragments` 1).
- `padPollAlloc` on commit 2 passed three runs in a row with the same readings. I re-ran the brief's line and it
  passed.
- `npm run typecheck:fast` exit 0; eslint on the four files clean.
- The grep check finds two hits, both off the per-poll path: `NAV_DIRS.map` in a member initialiser, and
  `Object.entries` when `stickMath` loads.

**Deviations** (each needed for 16 B with the test frozen):
1. **In-bounds reads.** `mapPadInto` reads `p.buttons` / `p.axes` only within their length, for example
   `i < nb ? (btn[i] ?? 0) : 0`. The value is the same as `?? 0` for any input. Once V8 has seen one out-of-bounds
   read at a load, it boxes every fractional value loaded there: 80 B per call.
2. **Curve exponent through a Map.** `CURVE_EXP[curve]` with a varying curve copied its fractional number every call:
   16 B once two curves had been seen.
3. **Loops and set-once.**
   - The three binding loops are one index loop over table, `UI_BINDINGS`, `CTX_BINDINGS`, in that order.
   - The menu stick sets at most one direction, chosen by a ternary (only one can be true).
   - The set-once is written inline at four places. A helper at nine call sites ran V8 out of inlining budget, and the
     doubles passed to `applyAxisDeadzone` boxed.
4. `PadFrameBuf` also carries the three stick scratch vectors. `PAD_ACTIONS` uses `satisfies readonly
   ButtonAction[]`. The "Interact always" comment moved to `PAD_ACTIONS`.

**Pending PC run:** e2e-pad, e2e-mouse, e2e-move, e2e-menus (plus e2e-coop and e2e-netmove if the lead asks).
