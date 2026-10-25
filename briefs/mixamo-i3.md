status: open
priority: top

# Brief: mixamo I3 - Mixamo stand-to-crouch / crouch-to-stand on Wren's stance changes behind `?mixamo=1` (Player Build)

Lead: Night Shift | Player Build, 2026-10-25 ~22:46. Opus builder. Job mixamo-retarget, slice I3 (Michael's top
priority: Mixamo animations in the game). Flag default OFF; off = byte-identical. Unit tests only.

**Start after `briefs/mixamo-i1.md` is done; base on its branch.** I1 and I3 edit the same lines (`MIXAMO_ON` and the
resolve block in `src/anim/mixamo.ts`, the keyed block of `src/anim/animGraph.ts`, the import lines), so I3 is
serialised after I1 (PLAN I3: "Serialised after I1 if both edit the same graph block"). If `briefs/mixamo-i1.md` line 1
is not `status: done feature/mixamo-i1 <sha>` when you would claim this, leave this brief open and take another.

## Read first
- Plan: `git show origin/feature/mixamo-retarget:docs/mixamo-retarget/PLAN.md` ("Clip map" rows 6 and 7, "I3", "Flag",
  "Switch-on (A1)", "Claims"). `docs/mixamo-retarget/BRIEF.md` (A1, A2: stance clips follow only the `mixamo` flag, A8).
  `docs/mixamo-retarget/M3-REPORT.md` (crouch_to_stand timed 88 frames / 2.167 s, pelvis from -47 cm; stand_to_crouch
  104 frames / 2.583 s, pelvis to -54 cm; "Stance changes keep the take's crouch depth, not the game's crouch height
  (I3 maps them onto the stance clock)").
- `briefs/mixamo-i1.md` and its `## Report` (what I1 added: `WREN_KEYED`, `resolveMixamoKeyed`, its test shapes).
- `src/anim/keyed.ts` `:487` `sampleKeyed(clip, phase, amp, out, L?)`, `:864` `mixKeyed(a, b, t, out, edits?)`.

## Base and branch
- Base: `origin/feature/mixamo-i1` at the sha in `briefs/mixamo-i1.md` line 1 (`status: done feature/mixamo-i1 <sha>`).
  It sits on `origin/feature/mixamo-i2` 4184e40f6da917a9f6f7eea18b55a308c79ef9bb (I2: the `mixamo` flag,
  `src/anim/mixamo.ts`). New branch `feature/mixamo-i3` from that sha; push `origin feature/mixamo-i3` only. No rebase,
  no master merge, no other branch, no force. `npm ci` once.
- Line numbers below are on 4184e40f; I1 adds a few lines in `animGraph.ts` (an import line, `keyedSet` `:2172` /
  `:2180-2181` edited in place), so re-find each by its text on the I1 head before editing.

## Files (only these)
- `src/anim/mixamo.ts` (add your own block after I1's)
- `src/anim/animGraph.ts` (the keyed block, below)
- `tests/mixamoStance.test.ts` (new)
- `changes/feature-mixamo-i3.md` (new fragment, `changes/README.md`)
Nothing else. Not `src/core/flags.ts` (reuse `flags.mixamo`), not `src/player/*` (the stance clock stays the
controller's), not `src/config/movement.ts`, not the clip modules (GENERATED), not `mocap.ts`, `mocapSources.ts`,
`nowPlaying.ts`, `studio.ts`.

### Off limits: I2's and I1's hunks
- I2's in `animGraph.ts` (`git diff origin/feature/mixamo-retarget...origin/feature/mixamo-i2 -- src/anim/animGraph.ts`;
  new-side lines on 4184e40f): `@@ -40,7 +40,7 @@`, `@@ -56,6 +56,7 @@` (line 59, I2's `from './mixamo'` import),
  `@@ -710,6 +711,15 @@`, `@@ -1259,9 +1269,14 @@`, `@@ -1290,7 +1305,17 @@`, `@@ -2885,6 +2910,141 @@`
  (`mixamoTrav` and helpers). Do not edit those lines.
- I1's lines (`git diff origin/feature/mixamo-i2...origin/feature/mixamo-i1`): leave them as they are; add your import
  as its own new line, your `MIXAMO_ON` rows after I1's, your resolve call as one added line at the end of
  `resolveMixamo()` (after I1's), your members as a new group.

## What is there now (4184e40f; re-found; re-find on the I1 head)
- Stance clock: `src/player/playerController.ts:735-742` `updateStance`: `crouchK` moves linearly to its target at
  `1 / MOVEMENT.crouchTime` (down) or `1 / MOVEMENT.standTime` (up); `crouchBlend = easeInOut(crouchK)`.
  `src/config/movement.ts:126` `crouchTime: 0.25`, `:128` `standTime: 0.3` (the player's MOVEMENT; verify the block).
  `:578` `mi.crouch = this.crouchBlend` -> the graph's `AnimInput.crouch` (`animGraph.ts:87`, "0 standing .. 1 crouched
  (eased by the controller)"). Remote players get the same from `crouchStep` (`playerVolumes.ts:106`).
- `animGraph.ts` keyed block (Wren only: `:2093` `onFoot` needs `this.wrenReady`): `:1976` `this.kCk = o.keyW > 0 ?
  crouchK : 0;` (`crouchK = clamp(i.crouch, 0, 1)` `:1156`); `:1987-1990` `crouchSet` into `kCr`; `:1991`
  `this.keyedSet(ph, ..., still / (loco + still), o)` (inside, `:2200-2209` mixes `kCr` over the standing keyed pose by
  `kCk`); `:1992-1994` the drawn share `dS` (`keyedDrawnSet`); `:1997` `if (this.kCk > 0) o.keyed.pel[1] =
  o.keyed.pel[1]! - this.kCk * pose[CH.pelY]!;` (the crouched clips' height is the crouch's whole depth); `:1999`
  `o.kneeRest`; `:2000` the wall set (`keyWallS`).
- `:1184` `wantKneel` (the procedural kneel on a crouched stop) and `:1187` its `kStep` by `MOVEMENT.standTime` /
  `kneelTime`: untouched.
- Clips: `src/anim/clips/mixamo/stand_to_crouch.ts` `MOCAP_STAND_TO_CROUCH: KeyedClip | null` (one-shot by progress,
  104 frames), `MOCAP_STAND_TO_CROUCH_SECONDS = 2.58333`; `crouch_to_stand.ts` `MOCAP_CROUCH_TO_STAND: KeyedClip |
  null` (88 frames), `MOCAP_CROUCH_TO_STAND_SECONDS = 2.16667`.

## Build
1. `mixamo.ts`, a new block tagged `(mixamo-retarget I3)`:
   - `MIXAMO_ON` gains `stand_to_crouch` and `crouch_to_stand` (values from step 4).
   - `export const WREN_STANCE: { down: KeyedClip | null; up: KeyedClip | null } = { down: null, up: null };` the same
     object always, rewritten by `resolveMixamoStance()` called as one added line at the end of `resolveMixamo()`:
     flag on and the row true -> the clip (null if the module's clip is null), else null. Flag only (A2: stance clips do
     not follow "Mocap locomotion").
   - `export const STANCE_SHOT = { edge: 0.15, flip: 0.08 } as const;` with a comment: `edge` the share of the stance
     blend over which the shot fades in at its start and out at its end; `flip` (s) the cross-fade when the stance
     reverses mid-change.
2. The clock (resolved here; do not ask): the shot plays BY PROGRESS on the game's stance blend, never on its own
   seconds. Going down `p = crouchK`, going up `p = 1 - crouchK` (`crouchK` = the graph's clamped `i.crouch`, the eased
   `crouchBlend`), so the whole take spans the game's 0.25 s crouch / 0.3 s stand and the game's timing never changes
   (the stance is never faster or slower than today; the camera, collision and audio keep their clock). Clamp `p` to
   `[0, 1]` and check how `sampleKeyed` treats a one-shot at phase 1 (clamp to `1 - 1e-6` if it wraps).
3. `animGraph.ts` (keyed block only), a new member group tagged `(mixamo-retarget I3)`: `stDir` (+1 down, -1 up, 0
   none), `stPrev` (last frame's `crouchK`), `stFlip` (0..1 cross-fade to the new direction), two `KeyedPose` members
   (`kSt`, `kSt2`) built once like `kB`. Each frame in the keyed block, after `:1991` `keyedSet(...)` and before
   `:1997`:
   - Direction: `crouchK > stPrev + 1e-6` -> down, `< stPrev - 1e-6` -> up, else keep; at `crouchK <= 0` or `>= 1` the
     shot ends (`stDir = 0`). A reversal mid-change starts `stFlip` at 0 and raises it at `dt / STANCE_SHOT.flip`,
     mixing the old direction's sample (`kSt2`) into the new (`kSt`) so no frame pops.
   - Weight `w = smoothstep(min(crouchK, 1 - crouchK) / STANCE_SHOT.edge) * stillShare * (1 - dS) * (1 - this.keyWallS)`,
     where `stillShare` is the same `still / (loco + still)` passed to `keyedSet` (moving keeps today's blend: the shot
     is an in-place stand / crouch), `dS` the drawn share (the drawn stance stays as today, PLAN I3), and 0 when
     `i.kneel`, when the direction's clip is null, or when `WREN_STANCE.down === null && WREN_STANCE.up === null` (then
     skip the whole block: no sample, no write = byte-identical).
   - Sample the direction's clip at `p` into `kSt` (`sampleKeyed(clip, p, 1, kSt)`), then `mixKeyed(o.keyed, kSt, w,
     o.keyed)` with the pelvis height kept: save `o.keyed.pel[1]` before and restore it after (the take's crouch depth,
     -47 / -54 cm, is not the game's; the game's height stays from the existing blend and `:1997`). Everything else
     (pelvis x / z, the trunk and neck rotations, arms, head) comes from the shot by `w`.
   - `stPrev = crouchK` at the end. No allocation, no closure, no per-frame lookup (read `WREN_STANCE` by reference).
4. A8 (headless, in the test): over a stand -> crouch -> stand cycle at a standstill on Wren's rig, measure pose
   continuity (largest bone step a frame), knee / elbow ranges and planted-foot slide with the shot vs today's blend.
   `MIXAMO_ON` row true only if at least as good on every measure; else false (Studio only) with both readings in the
   report. Settle it yourself from the numbers.
5. Switch-on (A1): the rows that pass are true; the flag's default stays OFF.

## Test `tests/mixamoStance.test.ts` (new)
Header comment listing (a)-(e). `afterEach` `setMixamo(false)`.
- (a) Off identity: a graph through stand -> crouch (0.25 s) -> hold -> stand (0.3 s) -> walk, with the `crouch` input
  driven as `updateStance` drives it (linear `crouchK` + `easeInOut`), flag never touched vs after `setMixamo(true)`
  then `setMixamo(false)`: every `RigTargets` field bit-identical each frame (float64 bit hash as
  `tests/helpers/animSkeletonIdentity.ts`). With the flag on and both rows false: identical too.
- (b) On: `WREN_STANCE.down === MOCAP_STAND_TO_CROUCH` (row true); the keyed pose mid-change differs from off; at
  `crouchK` 0 and 1 (settled) it equals off exactly (w = 0); moving (walk + crouch press) it equals off; drawn (`dS` 1)
  it equals off.
- (c) Timing: the stance takes the same frames on and off (the crouch input is the game's; the shot never changes it);
  `p` reaches 1 exactly when the blend does.
- (d) No pop: the largest bone step a frame over a full change, and over a reversal at mid-change (crouch press, then a
  stand press at `crouchK` 0.5), stays under e2e-anim's pose-continuity limit (as `mixamoTraverse.test.ts` "no pop");
  plus the A8 readings of step 4 with `console.info`.
- (e) A guard graph (not `wrenReady`) is bit-identical with the flag on; no allocation per frame with the flag on
  through a stance change (`bytesPerCall` as `mixamoTraverse.test.ts` `:233`).

## Run (unit tests only: no e2e, no GPU, no anim-audit, no `npm run check`, no dev server; every command with a timeout)
`npm run typecheck`;
`npx eslint src/anim/mixamo.ts src/anim/animGraph.ts tests/mixamoStance.test.ts`;
`npx vitest run tests/mixamoStance.test.ts tests/mixamoSwitch.test.ts tests/mixamoTraverse.test.ts tests/mocapSwitch.test.ts tests/mocapCrouch.test.ts tests/crouchPops.test.ts tests/crouchEntryRig.test.ts tests/mocapGuards.test.ts tests/animSkeletonIdentity.test.ts tests/changesFragments.test.ts`
(add `--maxWorkers=2` on a small box). Pending PC run (not yours): `affected-e2e` for `src/anim`, `e2e-anim`,
`e2e-move`, `e2e-stealth`, `anim-audit`, and the look video.

## Rules
- CLAUDE.md hot paths: nothing allocated per frame (no closures, iterators, literals, temporary vectors); the graph reads
  the resolved table by reference. Strict TS (`noUncheckedIndexedAccess`), `import type` for type-only imports.
- No wire change, no `PROTOCOL_VERSION` change, no new flag, no `src/player` file, the stance clock unchanged. Comments
  in the house style with a `(mixamo-retarget I3)` tag.

## Done when
- Flag off: (a) passes (bit-identical). Flag on: the shots play on Wren's still, holstered stance changes only, on the
  game's stance clock; (b)-(e) pass.
- tsc and eslint clean; the vitest files above pass; `git diff --stat <I1 sha>` lists only the four files above, and
  the diff touches none of I2's or I1's lines.
- `changes/feature-mixamo-i3.md`: line 1 `# Mixamo crouch and stand-up on Wren (behind ?mixamo=1)`, line 2 `kind: minor`,
  one or two `- ` bullets (standing still, crouching down and standing up play the Mixamo captures on the game's own
  stance timing with `?mixamo=1`; default off).
- Commits with trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; push `origin feature/mixamo-i3`. Then
  append `## Report` here (what changed with file:line, test names and counts, the A8 readings and the `MIXAMO_ON`
  values you set, deviations) and set line 1 to `status: done feature/mixamo-i3 <sha>`; commit, push `cloud-queue`.
- A question you cannot settle from this brief: line 1 `status: blocked <one-line reason>`, evidence under `## Report`,
  push, move on. The lead answers by editing this brief.
