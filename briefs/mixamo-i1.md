status: open
priority: top

# Brief: mixamo I1 - Mixamo standing idle (and crouched walk if it measures) on Wren behind `?mixamo=1` (Player Build)

Lead: Night Shift | Player Build, 2026-10-25 ~22:45. Opus builder. Job mixamo-retarget, slice I1 (Michael's top
priority: Mixamo animations in the game). Flag default OFF; off = byte-identical. Unit tests only.

## Read first
- Plan: `git show origin/feature/mixamo-retarget:docs/mixamo-retarget/PLAN.md` ("Clip map" rows 8 and 15, "I1", "Flag",
  "Switch-on (A1)", "Claims"). Brief: `docs/mixamo-retarget/BRIEF.md` on the base (A1 walk cap, A2 one rollback, A8 what
  it replaces). `docs/mixamo-retarget/M3-REPORT.md` (the keyed clips: `standing_idle` loop 6 s, `crouched_walking` gait
  1.133 s). `docs/mixamo-retarget/STATE.md`.
- `src/anim/mixamo.ts` (I2's switch and resolved table: copy its pattern), `tests/mixamoTraverse.test.ts` (I2's tests:
  copy the off-identity and allocation shapes), `tests/mocapSwitch.test.ts` (the identity pin), `tests/mocapCrouch.test.ts`,
  `tests/helpers/mocapMeasure.ts`, `tests/helpers/allocPerCall.ts`, `tests/helpers/animSkeletonIdentity.ts`.

## Base and branch
- Base `origin/feature/mixamo-i2` at `4184e40f6da917a9f6f7eea18b55a308c79ef9bb` (I2 on top of
  `feature/mixamo-retarget` 3754df04, PR #452, which carries a master merge). It has the `mixamo` flag and
  `src/anim/mixamo.ts`. New branch `feature/mixamo-i1` from that sha; push `origin feature/mixamo-i1` only. No rebase,
  no master merge, no other branch, no force. `npm ci` once.
- If `origin/feature/mixamo-i2` has moved past 4184e40f when you start, still base on 4184e40f (the lead merges).

## Files (only these)
- `src/anim/mixamo.ts` (add your own block; I2's lines stay as they are)
- `src/anim/animGraph.ts` (the keyed idle only, below)
- `src/anim/mocap.ts` (the crouch-walk slot only, below)
- `tests/mixamoSwitch.test.ts` (new)
- `changes/feature-mixamo-i1.md` (new fragment, `changes/README.md`)
Nothing else. Not `src/core/flags.ts` (I2 added the flag: reuse `flags.mixamo`), not `src/player/*`, not the clip
modules (`src/anim/clips/mixamo/*.ts` are GENERATED), not `src/anim/mocapSources.ts`, `nowPlaying.ts`, `studio.ts`.

### Off limits: I2's hunks in `src/anim/animGraph.ts`
`git diff origin/feature/mixamo-retarget...origin/feature/mixamo-i2 -- src/anim/animGraph.ts` has these hunks (new-side
lines on the base): `@@ -40,7 +40,7 @@`, `@@ -56,6 +56,7 @@` (line 59, the `from './mixamo'` import), `@@ -710,6
+711,15 @@`, `@@ -1259,9 +1269,14 @@`, `@@ -1290,7 +1305,17 @@`, `@@ -2885,6 +2910,141 @@` (`mixamoTrav` and its
helpers, ~2910-3050). Do not edit any of those lines. Add your import as its OWN new line (do not extend line 59); add
your members as a new group, not inside I2's.

## What is there now (4184e40f; re-found)
`src/anim/animGraph.ts`:
- `:52` `import { KEYED_IDLE } from './clips/keyed/idle';` `:3134` `export const KEYED_IDLE_PERIOD = 12;`
- `:733` `private idleT = Math.random() * 4;` `:1081` `this.idleT += dt;` (never wrapped).
- `:919` `private mOn` (the "Mocap locomotion" switch on this rig), `:924` `private mS: LocoClipSet`, `:1066-1068`
  set each frame from `LOCO.mocap && i.mocapOk` / `LOCO.set`.
- `:2093` the keyed gate `onFoot` needs `this.wrenReady` (`:3055`): the keyed set (and so the idle below) only ever
  plays on Wren rigs (the player, the partner, the Studio rig). Guards never reach it (`keyedOk` off).
- `:1986` `const mcC = this.mOn ? this.mS.crouchWalk : null;` -> `crouchSet(..., mcC)` `:1989`; `:2221` `crouchSet`
  puts `mc` in place of the sneak, posed by `MOCAP_CROUCH_POSE`; `:2535` the drawn path reads `this.mS.crouchWalk`.
- `:2157` `private keyedSet(...)`: `:2172` `if (needIdle) sampleKeyed(KEYED_IDLE, this.idleT / KEYED_IDLE_PERIOD, 1,
  this.kB);` then the idle's head scan from `kB.q` (`:2175`), the mix (`:2177-2179`), `:2180-2181`
  `half += (KEYED_IDLE.half - half) * idleShare; kneeOut += (KEYED_IDLE.kneeOut - kneeOut) * idleShare;`. This block
  (`:2157-2212`) is yours; I2 never touches it.
`src/anim/mocap.ts`: `:128` `interface LocoClipSet` (`:149` `readonly crouchWalk`), `:157` `HAND_KEYED_SET`
(`crouchWalk: null` `:171`), `:177` `MOCAP_SET` (`crouchWalk: MOCAP_CROUCH_WALK` `:191`, CMU 136_09), `:208` `LOCO`,
`:211-216` `setMocapLocomotion` (sets `LOCO.set`, calls `noteMoveSources(LOCO.set)` for the Now playing source),
`:244-247` `applyMocapSwitch` (compares `LOCO.set !== (on ? MOCAP_SET : HAND_KEYED_SET)`).
`src/anim/mixamo.ts` (I2): `MIXAMO_ON` (per slug), `MIXAMO` `{ on, studio }`, `resolveMixamo()` (rebuilds `WREN_TRAV`
once per change), `setMixamo(on)`, and at the end `setMixamo(flags.mixamo === true);`.
`src/core/flags.ts:56` `mixamo: boolean | null;`, `:133` `mixamo: onOffFlag(params.get('mixamo'))` (already there).
Clips: `src/anim/clips/mixamo/standing_idle.ts` exports `MOCAP_STANDING_IDLE` (loop, 120 frames, 6 s of take: its
header says frames 0-180 at 30 fps); `crouched_walking.ts` exports `MOCAP_CROUCHED_WALKING` (gait, 48 frames, 1.133 s,
1.66 m/s, feet + stride).

## Build
1. `mixamo.ts`, a new block tagged `(mixamo-retarget I1)`:
   - `MIXAMO_ON` gains `standing_idle` and `crouched_walking` (values from step 4; add the two rows after I2's rows,
     do not reorder I2's).
   - `export const STANDING_IDLE_SECONDS = 6;` (the loop's take seconds, header frames 0-180 at 30 fps; comment it).
   - `export const WREN_KEYED: { idle: KeyedClip; idlePeriod: number; crouchWalk: KeyedClip | null } = { idle:
     KEYED_IDLE, idlePeriod: KEYED_IDLE_PERIOD, crouchWalk: null };` the same object always, rewritten by a new
     `resolveMixamoKeyed()` called at the end of `resolveMixamo()` (one added call line; that is the only edit inside
     I2's function). Flag on and `MIXAMO_ON.standing_idle`: `idle = MOCAP_STANDING_IDLE`, `idlePeriod =
     STANDING_IDLE_SECONDS`; else `KEYED_IDLE` / `KEYED_IDLE_PERIOD`. Flag on and `MIXAMO_ON.crouched_walking`:
     `crouchWalk = MOCAP_CROUCHED_WALKING`, else null; then call `setMocapCrouchWalk(WREN_KEYED.crouchWalk)` (step 3).
     Import `KEYED_IDLE_PERIOD` from `./animGraph` only if that makes no import cycle at load; otherwise move nothing
     and define `const KEYED_IDLE_PERIOD_S = 12` in `mixamo.ts` with a comment pointing at `animGraph.ts:3134`, and a
     test asserting the two are equal.
   - A2: the idle follows only the `mixamo` flag; the crouched walk is a locomotion clip, so it also needs the
     "Mocap locomotion" switch (it plays only through `LOCO.set`, step 3).
2. `animGraph.ts` (keyed idle only): a new own import line `import { WREN_KEYED } from './mixamo'; // (mixamo-retarget
   I1)`. In `keyedSet`: `:2172` samples `WREN_KEYED.idle` at `this.idleT / WREN_KEYED.idlePeriod`; `:2180-2181` use
   `WREN_KEYED.idle.half` / `.kneeOut` (the same sampler, its `half` / `kneeOut`, PLAN I1). Read the table by reference
   (a module const), no per-frame lookup, no branch on the flag in the graph. With the flag off the object holds
   `KEYED_IDLE` / 12, so the arithmetic is the same doubles in the same order: byte-identical. Leave `:1015` (the
   procedural idle) and every other `KEYED_IDLE` use alone.
3. `mocap.ts` (crouch-walk slot only, PLAN Claims "crouch-walk slot, I1"): `mocap.ts` must NOT import `mixamo.ts`
   (mixamo imports mocap). Add, once at load, a second set `const MOCAP_SET_MX: { -readonly [K in keyof LocoClipSet]:
   LocoClipSet[K] } = { ...MOCAP_SET };` (identical to `MOCAP_SET`), `let mocapActive: LocoClipSet = MOCAP_SET;` and
   `export function setMocapCrouchWalk(c: KeyedClip | null): void` that sets `MOCAP_SET_MX.crouchWalk = c ??
   MOCAP_SET.crouchWalk` and `mocapActive = c ? MOCAP_SET_MX : MOCAP_SET`, then, if `LOCO.mocap`,
   `setMocapLocomotion(true)`.
   `setMocapLocomotion` and `applyMocapSwitch` use `mocapActive` where they now name `MOCAP_SET` for the ON set
   (`:213`, `:246`). `MOCAP_SET` itself is unchanged (tests import it). `noteMoveSources(LOCO.set)` then labels the
   crouched walk Mixamo by itself (M5's table has `mocap_crouched_walking`). Allocation: none per frame (once per change).
4. A8 measure (in the test, headless, as `tests/mocapCrouch.test.ts` / `tests/helpers/mocapMeasure.ts` measure the CMU
   crouch walk): `crouched_walking` vs `MOCAP_CROUCH_WALK` on Wren's rig at the sneak pace on the mocap switch: planted
   foot slide, pose continuity (largest bone step a frame), knee / elbow ranges (e2e-anim limits). If the Mixamo clip is
   at least as good on every measure, `MIXAMO_ON.crouched_walking = true`; else `false` (it stays Studio only, A8) and
   the test still records both readings. `standing_idle` vs `KEYED_IDLE` the same way at a standstill (continuity
   across the loop seam, knee / elbow ranges; no slide: feet planted), `true` only if at least as good. Settle both
   yourself from the numbers; write them in the report.
5. Switch-on (A1): `MIXAMO_ON` rows true for the clips that pass; the flag's default stays OFF (`flags.ts` untouched).

## Test `tests/mixamoSwitch.test.ts` (new)
Header comment listing (a)-(e). `afterEach` restores `setMixamo(false)` and `setMocapLocomotion(false)`.
- (a) Off identity: a graph run through the idle (standstill 14 s, past the 12 s period), a crouched sneak and a walk
  with the flag never touched, vs one after `setMixamo(true)` then `setMixamo(false)`: every `RigTargets` field
  bit-identical each frame (float64 bit hash as `animSkeletonIdentity.ts`). Also the anim-skeleton identity fixture
  (`tests/helpers/animSkeletonIdentity.ts`, as `tests/mocapSwitch.test.ts` uses it) equals its fixture with the flag
  off. Same with the mocap switch on and the flag off (crouch walk = CMU).
- (b) On: `WREN_KEYED.idle === MOCAP_STANDING_IDLE` and `idlePeriod === 6` when `MIXAMO_ON.standing_idle`; the graph's
  keyed pose at a standstill differs from the off run; with `MIXAMO_ON.standing_idle = false` it is identical to off.
  Crouch walk: on + mocap switch on + `MIXAMO_ON.crouched_walking` -> `LOCO.set.crouchWalk === MOCAP_CROUCHED_WALKING`;
  mocap switch off -> `HAND_KEYED_SET` (A2); the row false -> CMU.
- (c) A guard graph (not `wrenReady`) is bit-identical with the flag on (as `mixamoTraverse.test.ts` "a guard graph").
- (d) Headless measures (A8, step 4) with `console.info` of each reading and the assert that sets the rows: idle seam
  continuity (largest bone step across phase 1 -> 0 under the e2e-anim pose-continuity limit), knee / elbow ranges in
  limits; crouch walk slide, continuity, ranges vs the CMU clip.
- (e) No allocation per frame with the flag on (idle and crouched sneak), `bytesPerCall` as `mixamoTraverse.test.ts`
  `:233`; flipping the flag allocates only in `resolveMixamo` (not per frame).

## Run (unit tests only: no e2e, no GPU, no anim-audit, no `npm run check`, no dev server; every command with a timeout)
`npm run typecheck`;
`npx eslint src/anim/mixamo.ts src/anim/animGraph.ts src/anim/mocap.ts tests/mixamoSwitch.test.ts`;
`npx vitest run tests/mixamoSwitch.test.ts tests/mixamoTraverse.test.ts tests/mocapSwitch.test.ts tests/mocapCrouch.test.ts tests/mocapGuards.test.ts tests/animSkeletonIdentity.test.ts tests/mocapSources.test.ts tests/nowPlaying.test.ts tests/animStudio.test.ts tests/changesFragments.test.ts`
(add `--maxWorkers=2` on a small box). Pending PC run (not yours): `affected-e2e` for `src/anim` (with `anim-audit`,
`e2e-weapons-carry`), `e2e-anim`, `e2e-move`, `e2e-clip`, and the look video.

## Rules
- CLAUDE.md hot paths: nothing allocated per frame (no closures, iterators, literals, temporary vectors); the graph reads
  the resolved table by reference. Strict TS (`noUncheckedIndexedAccess`), `import type` for type-only imports.
- No wire change, no `PROTOCOL_VERSION` change, no new flag, no `src/player` file. Comments in the house style with a
  `(mixamo-retarget I1)` tag.

## Done when
- Flag off: (a) passes (bit-identical, identity fixture unchanged). Flag on: idle (and crouch walk if it passed A8) play
  on Wren only; (b)-(e) pass.
- tsc and eslint clean; the vitest files above pass; `git diff --stat 4184e40f6` lists only the five files above, and
  `git diff 4184e40f6 -- src/anim/animGraph.ts` touches none of I2's hunk lines listed above.
- `changes/feature-mixamo-i1.md`: line 1 `# Mixamo standing idle on Wren (behind ?mixamo=1)`, line 2 `kind: minor`,
  one or two `- ` bullets (the Mixamo standing idle replaces the hand-made idle on Wren with `?mixamo=1`; the crouched
  walk too only if it measured as well; default off).
- Commits with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `origin feature/mixamo-i1`. Then
  append `## Report` here (what changed with file:line, test names and counts, the A8 readings for both clips and the
  `MIXAMO_ON` values you set, deviations) and set line 1 to `status: done feature/mixamo-i1 <sha>`; commit, push
  `cloud-queue`. `briefs/mixamo-i3.md` starts from your branch.
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.
