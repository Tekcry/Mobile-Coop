# tuner-clarity PLAN (Opus planner, 2026-10-25)

Goal: BRIEF.md items 1-5. Tool only: no animation value, clip, default or look changes (A6). Branch feature/tuner-clarity.

## 1. How it works today
**Tabs, parts, rows.** Tabs are fixed in `src/ui/tunerLayout.ts:13-23`; each registered section goes to a tab through
`SECTION_TAB` (:26-46, `buildTabs` :87). A tab with several sections (Body: Body, Joints, Limb reach, Climb and vault,
Holds, Strike) shows them through the part picker. Inside a section the rows fold in groups named by the row's scene
target label (`src/ui/animTunePanel.ts:1975-2034`, `tuneTarget` in `src/ui/tunerTarget.ts:143`). Sections register in
`src/anim/tuneRegistry.ts` (`registerTuneSection`): Body / Gun / Camera in `src/anim/tune.ts:362-394` (sliders
`TUNABLES` :148-199), Joints / Hands & feet / Limb reach / Gun in hand / Stepping / Gear in `tuneV2Sections.ts`, Keys in
`tuneKeys.ts:97`, Climb `moveTune.ts:127`, Co-op `team_*` `moveTune.ts:102`, Holds `cqGait.ts:97`, Strike
`strikeBody.ts:148`, Clip speed `tuneClipSpeed.ts:56`, guards `tuneGuard.ts:91-110`.

**Why ankle / shin sit in "Full body" on Keys.** `tunerTarget.ts keyRow` (:116-137) knows the trunk and arm fields only;
every `legL_*` / `legR_*` (and every `handL_*` finger) falls to `body(out, 'Whole body (key)')` (:136), so the panel puts
them in one "Whole body" fold group. `plainLabel` has no leg words (`tunerLayout.ts:505-562`): leg rows show the raw
registry label ("L leg hipPitch delta").

**Why ankle twist and shin twist cannot be keyed.** A key's leg channel is `legd`, 7 values a side: hip pitch, yaw, roll,
knee, ankle pitch, ankle roll, toe (`src/anim/keyed.ts:253-285` `KEYED_LEGD` 14, `KD`, `LEGD_FIELDS`, `LEGD_SIGN`;
key fields `tuneKeysFile.ts:51,105-110`). The rig turns the knee by pitch only and the ankle by pitch and roll only
(`src/player/characterRig.ts:3497-3500` `keyedLegDeltas`). There is no yaw slot for the ankle or the shin anywhere.
No generated clip carries `legd` yet (`src/anim/clips/keyed/*.ts`, `scripts/anim-keys/keys/*.json`: none), so the channel
can widen with no data migration.

**Which rows reach motion capture.** The graph samples one locomotion set per frame (`src/anim/mocap.ts:204-243`
`LOCO`, switched by `?mocap=0/1` then the tuner's More > Panel "Mocap locomotion" box, `src/core/app.ts:139-147`,
`animTunePanel.ts:819`; on by default). Motion capture plays only: holstered standing walk / jog / run / sprint
(`animGraph.ts:2252-2291` `speedSet`), start, stop and turns (`MocapSlots`, `mocap.ts:314`), the crouched sneak band
(`crouchSet`, `animGraph.ts:1949-1952`) and the aimed strafe (`keyedDrawnSet` :2338-2357). Everything else is hand-made
(hand-keyed clips `clips/keyed/*` or graph code): drawn moves (:2308 always `HAND_KEYED_SET`), idle, crouch walk / run,
walls, climbs, holds, co-op, guards, and every Anim Studio "Keyed" loop (`studioDrive.ts:64-83` sets `keyMocap` 0).
- Hand-made only: Keys (offset tables attach only to clips loaded from `./clips/keyed/*.ts`, `tuneKeys.ts:46-53`;
  `sampleKeyed` adds `keyOff`, `keyed.ts:794`). Body sliders whose `MOCAP_LAYERS` weight is 0 (`mocap.ts:82-102`): arm
  swing and its growth (`armSwing`), shoulder twist (`trunkTwist`, `tune.ts:939`), lean (`keyLean`, `tune.ts:886`),
  elbows out (`elbowOut`, `characterRig.ts:2952`); plant drop on Weight (`weightLoad`, `animGraph.ts:2589`).
  Stepping mostly: on the mocap share the clip places the steps (`MOCAP_FEET`, `mocap.ts:563`, `animGraph.ts:2720-2765`).
- Both: Joints (`jointOffsets` after the clip legs, `characterRig.ts:2749`; ankles also on the mocap share :2783),
  Hands & feet (foot IK targets in `solveLegWorld` :4499-4505, hands after the arm pose :4047), Limb reach, Gun in hand.
- "Hands & feet foot turn": Hands & feet has foot forward / up / out only (`tuneHands.ts:54`); the foot turn is Joints
  `ankleL_y` / `ankleR_y` "Left / Right ankle turn" (Body tab > Joints; a tap on her foot opens it, `animTunePanel.ts:2177`).

**The per-frame share.** In `AnimGraph.update` (`animGraph.ts:1888-1974`): `keyW` is the keyed share of the body; of it
`o.keyMocap` (:1966, standing holstered gait and slots), `mcK` (:1971, the crouched capture, private) and
`o.keyStrafe x keyW` (:1968) are motion capture; the rest of `keyW` is hand-keyed; `1 - keyW` is graph code. Nothing
exposes this to the panel. The panel's "Now:" line (`animTunePanel.ts:3385-3391`, every 250 ms) names the body state
and gun only. The existing greying (`src/ui/tunerEffect.ts`, probe `tests/helpers/tuneEffectProbe.ts`) has modes
keyed / procedural / armed; its probe never turns the mocap switch on, so "procedural" there means the hand-keyed set,
while in the game the same state plays motion capture.

## 2. Design
**(a) One reach table: `src/ui/tunerReach.ts` (new, pure).** `type Reach = 'mocap' | 'keyed' | 'both' | 'none'`, words
in one table `REACH_WORDS` (A2: "Motion capture", "Hand-made", "Both", "Not playing now"; 'none' shows no tag).
`rowReach(section, group, id): Reach` from code facts, in this order:
1. `SECTION_RULE: Record<string, Rule>` covers every registered section (team_* and guard* by prefix):
   `keys` -> keyed; `cam`, `gear` -> none; `trav`, `cq`, `strike`, `clip`, `draw` (src/weapons/drawTune.ts:20), `team_*`, guard* -> keyed (moves with no capture;
   guards never play the keyed sets, `keyedOk` false); `joint`, `ik`, `hand`, `weapon`, `gun`, `speed` -> after-blend;
   `body` -> layer; `step`, `weight` -> probe.
2. The row's state: `rowState(section, group)` (last group segment; gait rows map back through `BODY_STEP` /
   `BODY_WEIGHT` in `tunerLayout.ts:759-760`). `MOCAP_STATE_OF: Record<LocoSlot, BodyGroup>` maps every clip field of
   `LocoClipSet` (walk, jog, run, sprint -> run, turnInPlace -> idle, turnMoveL/R, start, stop -> walk, crouchWalk -> sneak,
   strafeL/R -> aim). Typed as a Record so a new slot fails `tsc`. A state not in it: every rule gives keyed.
   A hand / weapon / joint / gun row with a gun (`hand.rifle.walk`) is the drawn set: keyed, except `aim` (strafe).
3. after-blend -> both. layer -> `BODY_LAYER: Record<BodyField, keyof MocapLayers | null>` (armSwingMul, armSwingGrow:
   armSwing; trunkTwistMul: trunkTwist; leanAdd: keyLean; elbowOutAdd: elbowOut; the rest null): weight 0 -> keyed, else
   both (A5: labelled, never hidden). probe -> `NO_EFFECT[state].mocap` from the probe: dead -> keyed, else both.
`rowNow(reach, row state, now)` adds the live "Not playing now": reach keyed while the playing state is the row's state
and the capture share >= 0.9, or reach mocap with share <= 0.1. It merges with the probe greying (`sliderEffect`), which
gains a `mocap` mode and plain reasons (no "procedural" / "keyed" jargon in shown text; mode ids stay for the e2e hook).
Tab and part notes: `reachSummary(rows)` -> "This part changes: Both" / "Hand-made only" / "Mostly both; 4 sliders
hand-made only". Tests fail when a section has no rule, a Body field has no layer entry (tsc), a slot has no state (tsc),
a layer-derived keyed / both disagrees with the probe's mocap loop, or a mocap clip ever gets a `keyOff`.

**(b) Now playing (A3).** `AnimGraph` gets `readonly playing: GraphPlaying` (new type in `src/anim/nowPlaying.ts`:
`mocap`, `keyed`, `code` 0..1 shares, `move` small int from `MOVE_IDS`, `clip: KeyedClip | null`), written at the end of
`update` after the studio drive (:1981), numbers and one reference only, inline (no double arguments: the graph's boxing
notes :2023-2026, `mocap.ts:533-534`). mocap = `keyMocap + mcK + keyW x keyStrafe`; keyed = `keyW - mocap`; code =
`1 - keyW`; move = the strongest of the slot weights (`wStart`, `wStop`, `wTurn` spot / move), crouch capture, strafe,
else the speed set's nearer clip (walk / jog / run / sprint, kept as an index in `speedSet`). Drive on: mocap 0,
clip = the drive's clip. `tune.ts tuneEnd(rig)` copies `rig.graph?.playing` into the module struct `NOW_PLAYING`
(`TuneRigIn` gains an optional `graph`; player.ts:572 already calls it for the local player, also Wren in the studio).
`nowPlayingKey(np, bodyIdx, switchOn)` -> one integer (share in 10 % steps, move, source); `nowPlayingText(...)` builds
"Now playing: motion-capture walk" / "Now playing: hand-made crouch walk" / "Now playing: mix, 70% motion-capture walk,
30% hand-made" / "... (motion capture off)" / studio clip "hand-made walk clip". The panel reads the key every frame it
is open and rebuilds the text only when the key changes and has held 300 ms (no flicker at band edges). Allocation-free
per frame; a string only on a change. Shown under the tab bar (`.anim-tune-playing`, one line, ellipsis, full text in
`title`; hidden when folded) and in the Studio's Loop player block (`.studio-playing`). Guards (Who: Guard): "Now
playing (guard): hand-made <loop>".

**(c) Warning on an edit that changes nothing on screen (A4).** `editWarning(section, group, id, now): string` in
`tunerReach.ts`, '' when the edit shows. Cases: the row's state is not playing ("You are editing Jog; she is walking.
Speed up, or pick Jog in the Anim Studio."); reach keyed while capture plays ("Not on screen: motion capture is playing
the walk. Keys change the hand-made walk only. To change it now: Body tab > Joints, Walk."); Stepping on the capture
("motion capture places the steps now"). `WORKS_INSTEAD` names where the working setting lives per family: Keys trunk ->
Joints Hips / Spine / Chest / Neck / Head; Keys arms -> Joints arms or Hands & feet; Keys legs -> Joints thigh / knee /
"Left ankle turn" AND Hands & feet foot forward / out (both named, A8); Body arm swing / twist / lean -> none exists, "turn Motion capture off in More > Panel to see it".
The panel shows it for 5 s in a strip under the edited row (`.tt-warn`) and in a header strip (`.anim-tune-warn`),
on every slider input, number entry and Keys key-tool edit. More > Panel gets "Warn when an edit changes nothing" (on;
saved as `clarityWarn` in the tuner's `ui` record, additive).

**(d) Keys Legs part and twists.** Data: `legd` grows to 9 a side (`KEYED_LEGD` 18, `KEYED_LEGD_SIDE` 9, `KD.ankleYaw` 7,
`KD.shinTwist` 8; `LEGD_FIELDS` and `LEGD_SIGN` appended; `LEGD_NEG` adds both: twists mirror like `hipYaw`). Key fields
append `legL_ankleYaw`, `legL_shinTwist`, `legR_ankleYaw`, `legR_shinTwist` in a loop after every older field (older
indexes unchanged); anatomical sense "+ toes out" / "+ shin turned out" on both sides. `tuneKeys.ts` replaces its literal
14s with `KEYED_LEGD`. Rig: knee `RotationYawPitchRoll(shinTwist, knee, 0)`, ankle `(ankleYaw, anklePitch, ankleRoll)`;
on a planted leg the shin twist folds into the foot's turn about the shin axis and the ankle point stays on its plant
(the foot turns on the floor, nothing slides). Zero deltas: the `any` test skips the side, bit-identical.
Bake: `key_clip.py LEGD_FIELDS` / `LEGD_SIGN` and the `build.mjs` channel note extended; `apply-tune.mjs` already writes
`legX.d.<field>` generically (`tuneKeysFile.ts:274`). Save / export: new ids in the existing records, additive; old saves
load (missing ids = 0); key JSON gains two optional fields that read 0 when absent. Panel: `keyRow` maps `leg[LR]_*` to
one target label per leg ("Left leg (key)", markers on hip / knee / ankle / toe by field) and `hand[LR]_*` to "Left /
Right fingers (key)"; "Whole body" leaves the Keys tab. `plainLabel` leg words: Thigh forward, Knee turned out, Thigh
out, Knee bend, Toes up, Sole in, Toes bend, Foot twist (toes out), Shin twist, Leg from the key.

**(e) A1 note.** A fixed note at the top of the Keys tab (`.anim-tune-keys-mocap`, separate from the existing hint, which
e2e-studio asserts verbatim): "Keys change the hand-made moves only. Motion-capture moves are changed in Body > Joints, Hands & feet and Limb reach." The Keys readout adds "(motion capture plays this in the game)" for walk, jog,
run, sneak and glide_strafe (the clips whose state has a capture). The More > Panel box is relabelled "Motion capture for walk, jog, run, sneak and aimed strafe (off = hand-made)", class unchanged.

**(f) Plan checker fixes (fresh Opus plan checker, 2026-10-25 ~16:00).**
- S1 / S3 interface: S3 does not import `nowPlaying.ts`. `tunerReach.ts` defines its own plain input
  `ReachNow = { state: BodyGroup | null; mocapShare: number; switchOn: boolean }` used by `rowNow` and `editWarning`;
  S4 fills it from `NOW_PLAYING`.
- S2 bit-identity: game poses are unaffected because no clip carries `legd` and `keyedLegDeltas` runs only when
  `hasLegd` is set (`characterRig.ts:2747`). S2 adds a golden captured on pre-S2 code for an old-channels-only edit
  (`legL_knee` + `legL_hipYaw`, swing and planted, new channels 0) that stays bit-identical through the new compose
  and the planted fold; `tests/animSkeletonIdentity.test.ts` and `tests/animSkeletonRig.test.ts` join S2's checks.
- S2 shin twist order: twist after the knee delta (`knee *= Rx(knee) * Ry(twist)`; Babylon `RotationYawPitchRoll` is
  qY.qX, so not `(shinTwist, knee, 0)`); test: a shin twist on a bent swinging leg keeps the ankle point within 1 mm.
- S2 layout: the old field loop stays on the first 7 fields; the 4 twist ids are appended in a new loop after
  `handR` / `legR_w`; `LEGD_IX` built from all 9. A text test checks `key_clip.py` `LEGD_FIELDS` / `LEGD_SIGN` match
  `keyed.ts`.
- S3: derive the slot type inside `tunerReach.ts` from the `KeyedClip | null` fields of `LocoClipSet` (`mocap.ts` is not
  claimed). `BODY_STEP` / `BODY_WEIGHT` are many-to-one: a row is Both if any mapped state has a capture and the probe
  shows an effect. Keep `mocap` out of the `tunerEffect.test.ts` `EFFECT_MODES` loop (time budget).
- S1: record the nearer-clip index only from the holstered `speedSet` call, not the drawn call (:2308). `nowPlaying.ts`
  keeps its own plain words (no src/ui import); they count as part of A2's one table.

## 3. Claims
| Slice | Files (only these) |
| --- | --- |
| S1 | `src/anim/nowPlaying.ts` (new), `src/anim/animGraph.ts`, `src/anim/tune.ts`, `tests/nowPlaying.test.ts` (new) |
| S2 | `src/anim/keyed.ts`, `src/anim/tuneKeysFile.ts`, `src/anim/tuneKeys.ts`, `src/player/characterRig.ts`, `scripts/anim-keys/py/key_clip.py`, `scripts/anim-keys/build.mjs`, `tests/animSkeletonRows.test.ts`, `tests/keyLegTwist.test.ts` (new) |
| S3 | `src/ui/tunerReach.ts` (new), `src/ui/tunerEffect.ts`, `src/ui/tunerTarget.ts`, `src/ui/tunerLayout.ts`, `tests/helpers/tuneEffectProbe.ts`, `tests/tunerEffect.test.ts`, `tests/tunerReach.test.ts` (new), `tests/tunerReachProbe.test.ts` (new), `tests/marlowT1a.test.ts` |
| S4 | `src/ui/animTunePanel.ts`, `src/ui/studioPanel.ts`, `scripts/e2e-studio.mjs`, `scripts/e2e-tuner-phone.mjs` |
| S5 | `docs/systems/ui.md`, `docs/systems/world-and-characters.md`, `docs/systems/testing-tools.md`, `changes/feature-tuner-clarity.md`, `docs/tuner-clarity/STATE.md` |
- Save paths: IndexedDB `shoulder-strike` tuner store (`src/save/animTuneStore.ts`, file untouched): tune record gains
  four Keys slider ids (additive); `ui` record gains `clarityWarn` (additive, absent = on). Export shape unchanged
  (`tuneExport` values map). Key JSON: optional `legX.d.ankleYaw` / `shinTwist`. Generated clips: `legd` 18 a frame;
  none carries `legd` today, so nothing to migrate. No `src/save` edit.
- Wire paths: none (tuner values and `NOW_PLAYING` stay local; no `PROTOCOL_VERSION` bump). Maps: none.
- Flags: none. The tuner is a dev tool behind F3 / the studio, nothing ships half done at merge, the graph field is
  display-only (nothing reads it back) and the wider `legd` is inert at zero; A4 gives the panel its own off switch.
- Not touched: any clip, `MOCAP_LAYERS`, defaults, the base table, the bake ledger (A6).

## 4. Slices
| Slice | Model | Size | Depends | Own checks |
| --- | --- | --- | --- | --- |
| S1 Now playing source | Opus | ~220 lines, 3 h | - | `npx vitest run tests/nowPlaying.test.ts tests/mocapSwitch.test.ts tests/mocapSimParity.test.ts tests/guardTune.test.ts`; `npm run typecheck:fast` |
| S2 Keys leg twists | Opus | ~200 lines, 3 h | - | `npx vitest run tests/animSkeletonRows.test.ts tests/keyLegTwist.test.ts tests/tuneKeys.test.ts tests/tuneKeysEdit.test.ts tests/tuneKeysTools.test.ts tests/mocapSwitch.test.ts`; typecheck |
| S3 Reach table + probe | Opus | ~420 lines, 4 h | - | `npx vitest run tests/tunerReach.test.ts tests/tunerReachProbe.test.ts tests/tunerEffect.test.ts tests/marlowT1a.test.ts tests/tunerLayout.test.ts tests/marlowT2.test.ts`; typecheck |
| S4 Panel and studio wiring | Sonnet (strict Opus brief) | ~380 lines, 4 h | S1, S3 merged on the branch (S2 for the e2e twist check) | `npx vitest run tests/tunerV3.test.ts tests/tunerPhone.test.ts tests/animStudio*.test.ts`; typecheck; `npm run build`; e2e on the laptop queue |
| S5 Docs and fragment | Haiku | ~60 lines, 0.5 h | S4's final strings | CI `check` |
Order: S1, S2, S3 in parallel now (no shared file). S4 after S1 and S3 land. S5 beside S4, finished after it. One
Opus checker for S1-S3 (animation and reach facts), one for S4 + S5. Total ~1.3k changed lines: one PR. If S3's probe
or S4 grows past the ~1.5k cap, S2 leaves as its own PR (it stands alone).
S1 notes: `speedSet` keeps the nearer clip as a private int field; the slot weights are public on `MocapSlots`.
S2 notes: verify the left / right signs by test (both feet turn toes out for +), not by reading axes.
S3 notes: the probe gains a `mocap` loop (`setMocapLocomotion(true)`, holstered, walk / jog / run / sneak 0.8 m/s) over
Body, Stepping, Weight, Hands & feet place rows and six Joints rows (both knees, ankles, elbows); its own test file
with a 600 s timeout so `tunerEffect.test.ts` keeps its budget. `NO_EFFECT` gains `mocap` lists from it.
S4 notes: every new string comes from `tunerReach.ts` / `nowPlaying.ts`; badges are `<span class="tt-reach tt-reach-
<reach>">` inside `.tt-name` (words plus colour, never colour alone; not interactive); notes are `.tt-note` lines;
dev hook `__animTune.playing()` (text, shares, move) and `__animTune.warn()` (shown text); `effect()` keeps its shape.

## 5. Test plan
Unit (CI): S1 graph shares and move for switch on / off at 1.4, 3.0, 4.0, 6 m/s, a sneak at 0.8, drawn walk, aimed
strafe, a turn on the spot, a ladder and a studio drive; `NOW_PLAYING` copied only through `tuneEnd`; 0 extra bytes per
`update` (`tests/helpers/allocPerCall.ts`); text and key in 10 % steps. S2 swing foot yaw turns by the delta, a planted
ankle stays within 1 mm of its plant while the toe turns, mirror and sign table, zero deltas bit-identical, key export
writes `legL.d.ankleYaw`. S3 the coverage tests in 2(a) plus `editWarning` cases and leg / finger target labels.
e2e-studio (extend, keep selectors `.anim-tune-sec-keys .tt-grp`, `.anim-tune-rows-*`, `.anim-tune-keys-hint` text,
`__animTune.effect()` shape, `.studio-keyed`): `state:walk` -> `.anim-tune-playing` says "motion-capture walk"; Keyed
ticked -> "hand-made walk"; Mocap box off -> "(motion capture off)"; the effect mode after unticking Keyed is now
`mocap`, and line 743's regex follows the new plain reason; Body > Arm swing badge "Hand-made"; a Keys edit on walk
while the capture plays shows `.anim-tune-warn` naming Joints; Keys tab has "Left leg" / "Right leg" groups, no
"Whole body"; `legL_ankleYaw` on `key.walk.1` turns `ankleL` with `keyed:walk` playing.
e2e-tuner-phone (extend): the Now playing line shows in drawer and sheet, inside the panel width, below the tabs (the
`tab.top < 80` and folded-sheet `top > vh - 140` checks hold); badges are not touch targets (the size sweep's selector
list stays as it is). Affected suites by folder also run: `anim-audit`, `e2e-anim`, `e2e-clip`, `e2e-move`,
`e2e-weapons-carry`, `e2e-pad`, `e2e-desktop`, `e2e-menus`, ...; S2 touches `src/player`, so the lead requests
`e2e-coop` + `e2e-netmove` for the checker gate (RULES "Test tiers").

## 6. Risks and assumptions
- The probe may show more Body or Stepping rows dead on the capture than the layer table says (for example Foot width
  or Knee lift under clip feet). Then the label says Hand-made: that is the truth the tool must show, not a bug.
- Allocation: the graph has boxed doubles before; S1 writes fields inline and the alloc test guards it.
- Planted shin twist on a foot already turned by Joints ankle turn: compose order is the S2 builder's to prove by test.
- The probe adds run time; it gets its own file and timeout.
- Proposed assumptions for the BRIEF:
  - A8. Michael's fix was Joints "Left / Right ankle turn" (opened by a tap on her foot) or Hands & feet foot forward /
    out; Hands & feet has foot position only. The warning names both. Undo: change the `WORKS_INSTEAD` text.
  - A9. Keys legs get one part per leg ("Left leg", "Right leg"), and the fingers leave "Whole body" too ("Left / Right
    fingers"), so the Keys tab has no "Whole body" part. Undo: one "Legs" label in `keyRow`.
  - A10. Rows of states with no capture (climbs, walls, holds, co-op, guards, drawn moves) say "Hand-made"; camera and
    gear show no tag. Undo: the `SECTION_RULE` table.
  - A11. "Not playing now" marks a row only for its own state; editing another state's row raises the warning, not a
    tag on every row. Undo: `rowNow` checks the source only.
  - A12. The tuner's "Mocap locomotion" box is relabelled "Motion capture for walk, jog, run, sneak and aimed strafe (off = hand-made)", same
    behaviour. Undo: the label string.

## 7. Docs
`docs/systems/ui.md` (tuner v3 bullets: reach tags, Now playing, the warning, Keys Legs / Fingers parts, the A1 note,
`tunerReach.ts`), `docs/systems/world-and-characters.md:415` (`legd` 9 a side with ankle yaw and shin twist),
`docs/systems/testing-tools.md` (e2e-studio and e2e-tuner-phone lines, the reach probe test). Fragment
`changes/feature-tuner-clarity.md`, `kind: minor`: it adds tool features (a new key channel, panel lines) though the
game's look is unchanged.
