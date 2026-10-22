# anim-tuner - state

## Now
anim-tuner merged as 4.20.0 (PR #56). tuner-pad (pad control) PR open from feature/tuner-pad.
(2026-10-22, marlow-bays item 24, track A, `feature/guard-tune` off tuner v3) Guard tuning built, not committed by the
implementer: the "Who" list (Wren / Guard) in the Body, Stepping and Weight tabs' what-row; the sections Guard joints
(`guard.joint.<row>`), Guard stepping (`guard.step.<gait>`), Guard weight (`guard.weight.<row>`; rows idle, walk, run,
aim, crouch, cover) registered from `src/anim/tuneGuard.ts`; every guard rig reads them over the generated guard base
table `src/anim/animBaseGuard.ts` (`rig.guardRows` in `buildEnemyRig`), Wren never; the Anim Studio's guard puppet
(a grunt's real rig, no AI) plays `guard:<loop>` loops on the spot. The bake writes the guard table (BAKE.md). Detail:
`docs/systems/ui.md` (item 24 bullet). Pending: GPU / visual check on Michael's PC; Michael's playtest.

## Next
1. The orchestrator merges tuner-pad on its tests + CI.
2. Michael tunes and exports `anim-tune-<date>.json`; a later job folds the values into the defaults.

## Open (polish list, CHECK.md)
- The panel and its DB are built at every boot. (The barrel marker's per-frame Babylon allocation is gone: it is a 2D
  overlay since tuner-camera pass 2.)
- e2e-ctcourse ran past 600 s on the desktop during the e2e:quick (laptop runs 240 s): watch the next full run.

## Done
- 2026-10-20/21: implementer pass 1-3, check PASS, review fixes, master 4.19.1 merge (hooks re-applied, glideTwistMul), merged as 4.20.0 (#56); tuner-pad: pad control (D-pad pick / nudge, LB / RB state, Y reset, A export, B close, View hands the pad to the game), check + e2e-menus green.
- 2026-10-20: worktree and branch from dedcfcc5; BRIEF.
- 2026-10-21 (tuner-camera): the section registry (`src/anim/tuneRegistry.ts`); Body, Gun and a new Camera section on
  it (`CAMERA.md`). Free view wired but off (second pass).
- 2026-10-21 (tuner-camera pass 2): free view on (orbit / fly, demo loop, hide HUD), Speed section, freeze / pause /
  step and a game speed slider, every control by pad (edit mode, Y menu, the map below), smooth state changes (section
  `tau`), import, wide ranges, typed values, bypass, slider search, the barrel marker as a 2D overlay (`CAMERA.md`,
  "Pass 2").
- 2026-10-22 (marlow-bays item 30, branch feature/key-tools off feature/tuner-v3): the Keys tab's key tools (Wave,
  Apply to keys, Smooth between in a "Key tools" fold; Compare with the studio ghost and the values line;
  `ui/tunerKeyTools.ts`, `anim/tuneKeysTools.ts`) and the exact preview (30e: `tuneKeys.ts` `build` on the bake's
  curve, `anim/tuneKeysCurve.ts`; the S4b fixture: pelvis and trunk exact, arms 0.07-0.70 cm between keys). Docs:
  `docs/systems/ui.md` (Keys tab), BAKE.md. Not done: the curve view (Michael left it out); the arms' last 0.7 cm
  (needs the shoulder / elbow channels re-keyed with location, a TS port of key_clip.py `fk`).

## Section registry (for other jobs)
`src/anim/tuneRegistry.ts` (pure, Babylon-free). A section is a set of sliders over a set of state groups. Every
registered section gets, with no code of its own: the panel's group picker, follow, per-slider / group / all reset,
"changed only", search, the IndexedDB save, Export and Import JSON, the change log, wide ranges, the bypass and pad
control (the D-pad walks every control, LB / RB jump between sections, LT / RT switch the focused section's group).
Sections show in registration order: Body, Gun, Camera, Speed (`src/player/speedTune.ts`, registered from its own
file), then yours.

**Register from a new file.** Call `registerTuneSection` at module load and import that file once from the code that
reads the values (so it registers before the first frame; a section that registers after the panel is built is added
to the panel at once through `TUNE_REGISTRY_HOOKS.added`).
- `id`: unique section id (panel classes `anim-tune-pick-<id>`, `anim-tune-rows-<id>`).
- `label`: the panel heading.
- `groups`: the state groups, in picker order. Group ids are global (saves and exports key by group id): prefix them
  (`hand.`, `foot.`, ...). A duplicate id or group throws.
- `tunables`: the sliders (`id`, `label`, `kind` 'mul' | 'add', `def` 1 or 0 (identity), `min`, `max`, `step`, `unit`,
  `groups`, `hook` = the code value it changes). A slider id is unique within its section.
- `select(state)`: optional, for follow: the group the game is in now, or null. `state` is the shared bag
  `TUNE_STATE_BAG` (`body`, `gun`, `cam` today); your selection code writes its own key there each frame.
- `notes(group, id)`: optional grey lines under a slider (targets, today's value).
- `cur`: optional, your own current-values object (else one is made at the defaults).
- `tau`: optional ease time constant (s) for `tuneSectionEase` (0 or absent: at once). Body and Gun use 0.1, Camera 0.125.
- `note`: optional grey line under the heading (the Speed section's "gameplay, local only" warning).

**Read it in a hot path without allocating.** The returned section holds preallocated objects: `values[group][field]`
(the live slider values) and `cur` (one object, every field). Either read `sec.values[g].field` directly, or once per
frame call `tuneSectionLoad(sec, group | null)` (a copy loop into `cur`; null = the defaults) and read `sec.cur.field`.
Do the group selection with plain comparisons (no closures, maps or arrays per frame). At the defaults every value is
+0 / x1, so the game is unchanged. To ease a state change instead of popping, call `tuneSectionEase(sec, group | null,
dt)` once per frame instead of `tuneSectionLoad` (it moves `cur` with the section's `tau`; dt 0, tau 0 or the bypass
apply at once; a value equal to its target is never touched and one within 1e-6 lands on it, so identity stays
bit-exact). Both read identity while `TUNE_FLAGS.bypass` is set (R3 / Backquote held), so a section that reads
`values[g]` directly must check `TUNE_FLAGS.bypass` itself (the Speed section does).

**Save and export.** Values are saved (debounced) to the tuner's own IndexedDB database as `{ values: { <group>:
{ <slider>: value } }, log }`, only values off their default; the export adds every changed value with its default and
the change log. The existing body / gun keys are unchanged, so older saves load as before. Saved values for a section
that has not registered yet are kept and applied when it registers (and kept in the next save meanwhile). Import
(`tuneImport(json, name)`, the panel's Import button and Y menu) takes an export back: every value to its default, then
the file's values (unknown sections kept pending, as with saves), one "import" log entry, saved; a wrong magic or
version is refused and changes nothing. Saves, imports and slider moves clamp to the active range (`tuneMin` /
`tuneMax`), so a value set with "wide ranges" on comes back clamped after a reload with it off; a multiplier's wide
minimum never drops below `WIDE_MUL_FLOOR` (0.05, or its own lower positive minimum; never negative).

**Example** (`src/anim/handTune.ts`):
```ts
import { registerTuneSection, TUNE_STATE_BAG, tuneSectionLoad } from './tuneRegistry';

export const HAND_SECTION = registerTuneSection({
  id: 'hand',
  label: 'Hands',
  groups: ['hand.idle', 'hand.grip'],
  tunables: [
    { id: 'fingerCurlMul', label: 'finger curl', kind: 'mul', def: 1, min: 0, max: 2, step: 0.05, unit: 'x', groups: ['hand.idle', 'hand.grip'], hook: 'handPose: curl' },
  ],
  select: (s) => s.hand || null,
});

// per frame, in the hand solver (no allocation)
export function handTuneFrame(gripping: boolean): void {
  const g = gripping ? 'hand.grip' : 'hand.idle';
  TUNE_STATE_BAG.hand = g;
  tuneSectionLoad(HAND_SECTION, g);
}
// then: curl *= HAND_SECTION.cur.fingerCurlMul
```
Other entry points: `tuneSet` / `tuneGet` / `tuneReset*` / `tuneChanged` / `tuneExport` / `tuneImport` / `tuneSnapshot` /
`tuneLoad` take any registered group; `TUNE_SECTIONS` lists the sections; `TUNE_FLAGS` holds `bypass` and `wide`.
Tests: `tests/animTuneCamera.test.ts` (registry block), `tests/animTunePass2.test.ts` (ease, bypass, wide, import, Speed).

## Bake (anim-bake)
`node scripts/anim-tune-bake.mjs <anim-tune-YYYY-MM-DD.json> [--dry-run] [--only section,...] [--allow-shared]` writes
an export's values into the code defaults. Always `--dry-run` first (the diff and a table: section, group, slider, value,
result, target; nothing written). A real run writes the source files, the Keys section's key JSONs (the apply-tune
functions) and the ledger `src/anim/tuneBakeLog.json`, then prints the rebake command per key clip (Blender is never
run). Sections for `--only`: body, gun, cam, speed, joint, hand, ik, weapon, step, gear, keys, weight, guardJoint,
guardStep, guardWeight (item 24: the guard rows go into the guard base table `src/anim/animBaseGuard.ts`). Detail:
`BAKE.md`.
(marlow-bays T1a) The Keys rows also write the new key fields (`head`, `armX.twist`, `armX.twistUpper`, `armX.sh`,
the pelvis `dx / dy / dz`) and a clip whose Mirror box is off with its halves edited apart is written in full
(`mirror: false`, every key); the rebake then writes the clip channels `fore`, `head`, `sh`. A version 1 export (before
the own rows of the shared states) is read with each new row given its old row's value, as the tuner's import does.
(marlow-bays item 23) Key timing: the Keys tab's "◀ Earlier" / "Later ▶" (one bake frame, 1/48 of the cycle) and time
slider slide the picked key in its clip, previewed live, between its neighbours (key 1 fixed; Mirror on moves the mirror
key with it). The bake writes the key's `phase` and `src/anim/tuneKeysMeta.ts`, then prints the clip's rebake. No new
pad button: they are Keys tab controls in its D-pad order.
(marlow-bays item 25) Add / delete keys: the Keys tab's "+ Add key" (a key midway to the next, posed as the clip plays
there; Mirror on: in the own half, mirrored by the bake) and "Delete key" (never key 1, at least 4 keys a cycle). State
as sliders (`del` per key, `key.<clip>.a<s>` with `at` + the fields, 8 per clip; no store version bump), live at once,
undoable. The bake rewrites the key file's key list and `tuneKeysMeta.ts` and prints the rebake. No new pad button.
- **Identity after bake.** The code value moves (x the slider for a `mul`, + it for an `add`, in the code's unit); the
  slider's default stays identity. The tuner's own save still holds the old values: reset the sliders the table reports
  "baked" (keep the manual ones), then export again. The ledger keeps `group|id=value` of every baked value: a later
  export that still carries one reports it "already baked" and never bakes it twice.
- **Shared targets.** A rule's groups are the groups that read one code value. Baked when every one of them has the same
  value; otherwise "manual: shared target" with the value per group (Michael or a job lead picks, or a later job adds a
  per-state table). `--allow-shared` bakes a shared value when exactly one group changed and warns that it changes every
  state reading it. A slider and group baked through several rules bakes only when all of them do.
- **Manual: no code target.** The slider has no code value to absorb it (the Joints, Hands & feet, IK and Weapon tables,
  the Weight layers' amounts, clip-data sliders); the table lists it with the reason.
- **A new section** (PR #71's `moveTune.ts`) needs only its rules or manual entries in `src/anim/tuneBakeTable.ts`, and
  its file in `BAKE_CATALOGUE_MODULES` (or `BAKE_OTHER_SECTION_FILES` with a `DECLARED_SECTIONS` entry when plain Node
  cannot load it). `tests/animTuneBake.test.ts` imports every file that calls `registerTuneSection` and fails until the
  file is listed and every slider and group is covered.

## Pad map
(marlow-bays item 29, tuner v3, 2026-10-22: the current map; the tuner-ui table after it is history where it differs.)
One layout for every input: the pad, keyboard / mouse and touch see the same panel (only the hint glyphs change);
`src/ui/animTunePad.ts` (`TunePadCtl`, pure) reads the pad, `src/ui/animTunePanel.ts` applies it.

| Control | What it does |
| --- | --- |
| Left stick up / down | Move through the list (analogue: the further and the longer, the faster it repeats); in an open list, move the highlight |
| Left stick left / right | Change the focused value (analogue; held, it speeds up) |
| D-pad (optional) | Up / down rows, left / right one step of the value (held: repeats, x5 after 1 s); on a State / Move picker left / right step its choice (CT Core #90's padGroup, at the group's own level) |
| A | Open a list (Part, State, Weapon, Clip, Key, Loop), pick, press a button, tick a box, open / fold a group or More |
| B | Back out: close a list (nothing changes) or the quick menu; from a slider to its State list |
| X | Reset the focused slider |
| Y | The quick menu (Undo, Redo, Store A / B, Flip A / B, Reset this group, Reset all (A twice), Export, Share / Copy, Import, Clear change log) |
| LB / RB | Previous / next tab (wraps) |
| Right stick | Always the camera (orbit her; no mode switch). Under a held snap it turns the held angle; the View tab's "Around her" / "Camera tilt" sliders follow it |
| RT / LT | Zoom in / out |
| L3 | Loop on the spot on / off (Anim Studio; F8 on the keyboard) |
| R3 (held) | Untuned (the bypass; Backquote on the keyboard) |
| View | Hand the pad to the game and back ("Pause game while tuning" holds the game while the tuner has it) |
| Menu (Start) | Close the panel |

No edit mode: the focused slider is the one the stick changes. No UI click sound in the tuner. Keys in the studio: F9
play / pause, F1 / F2 a key back / forward, F8 on the spot, F4 the mouse mode. (Phase 2) The View tab's Side snap
pressed again swaps to her other side ("Side (right)" / "Side (left)").

### tuner-ui map (history)
(tuner-ui, 2026-10-21; replaced by the v3 map above.) While the panel has the pad ("Pad:
tuner"); the hint strip at the bottom of the panel (reserved space, never over a row) shows the map for the moment, with
pad glyphs when a pad is in use and key / mouse help otherwise. `src/ui/animTunePad.ts` (`TunePadCtl`, pure);
`src/ui/animTunePanel.ts` applies it; the pure layout is `src/ui/tunerLayout.ts`.

| Button | Panel | An open list | Editing a slider |
| --- | --- | --- | --- |
| LB / RB | Previous / next tab (wraps): View, Body, Hands & feet, Weapon, Stepping, Weight, Camera, Keys, Co-op, (later sections), Settings | - | - |
| D-pad | Rows: up / left the previous control, down / right the next (repeats when held, wraps); never changes a value | Up / down: move the highlight | Left / right: one step (held: repeats, x5 after 1 s) |
| A | Open a list (Part, State, Weapon, Clip, Key, Loop, ...), start editing a slider, press a button, tick a box | Pick: the choice applies, the focus steps on (the next list, or the first slider) | Keep |
| B | Back: from a slider to its State list; closes the Y menu | Back out: nothing changes | Undo the edit |
| X | Reset the focused slider to its default | - | Set the default |
| Y | The more menu: Undo, Redo, Store A, Store B, Flip A / B, Pin / unpin this slider (T2), Show every part (T2), Reset this group, Reset all (A twice), Export file, Share / Copy, Import file, Clear change log | - | - |
| LT / RT | Previous / next choice of the focused section's last list (the state; on Co-op the role) | - | LT held: fine steps (a fifth) |
| Left stick X | - | - | Fast adjust |
| R3 (held) | Untuned (bypass; Backquote on the keyboard) | Same | Same |
| L3 | (marlow-bays item 13, Anim Studio) "Loop on the spot" on / off (F8 on the keyboard; also with the free view) | Same | Same |
| Right stick left / right | (marlow-bays T1a, Anim Studio) One key back / forward (a flick past 0.6; repeats while held, 0.4 s then every 0.15 s; F1 / F2 on the keyboard). The tuner mode only: in the free view the right stick stays the camera's | Same | Same |
| Right stick up | (T1a, Anim Studio) Play / pause (a flick; F9 on the keyboard) | Same | Same |
| View | Swap the pad between the tuner and the game (or the free camera while it is on). With "Pause game while tuning" (Settings, on by default) the game holds still while the tuner has the pad, and runs while the game has it | Closes the list | Ends the edit (kept) |
| Menu (Start) | Close the panel | Close | Close |

(marlow-bays T1a) In the Anim Studio the playback bar (Play / Pause, ◀ Key, Key ▶, Gun, On the spot, Time, Speed) sits
under the tabs on every tab and comes first in the D-pad order (a tab change still focuses the tab's own first control).
Keys while the panel is open in the studio (reserved, never bindable): F9 play / pause, F1 / F2 one key back / forward,
F8 on the spot, F4 the mouse mode (any time). Nothing else in the map changed: every button above keeps its job.

(marlow-bays T2) The part strip over the tab (no new button): after the playback bar the D-pad reaches the part list
(the body map's pad form: A opens it, up / down move, A picks, and the focus goes to the part's first slider; "All
parts" shows every part again), then each pinned / recent chip (A goes to its slider: its tab, part and group, the
focus on it), then the tab's own controls. A tab change and opening the panel still focus the tab's own first control.
A row group's header ("Right elbow 3") is a control in the D-pad order: A folds or opens it. Y menu > Pin / unpin this
slider pins the focused slider; Show every part clears the part. The map and a click on her in the scene are the
mouse's (the drag view: a click without a drag picks the nearest joint or bone).

While the pause menu is open the menus get the pad (held buttons stay swallowed when it closes). A camera snap (View tab:
Front / Side / Back / Top) holds and keeps the pad on the panel; the free view "Orbit her" / "Fly" from its list gives
the pad to the camera as before (B ends it). Keyboard and mouse: a click on a tab, a list or a slider; an open list takes
the arrows, Enter and Esc; type a value and press Enter; Ctrl+Z / Ctrl+Y.

### Pass 2 map (history)
| Button | Panel | Editing a slider or dropdown |
| --- | --- | --- |
| D-pad | Move the focus through every control (up / left back, down / right on; repeats when held, wraps). Never changes a value. | Left / right: one step (held: repeats, x5 after 1 s); a dropdown: the previous / next choice (live) |
| Left stick X | - | Fast adjust (full tilt crosses the range in 2 s) |
| A | Select: press a button, tick a box, start editing a slider or dropdown | Keep the edit |
| B | Back: close the Y menu | Cancel: the value (or choice) comes back |
| X | Reset the focused slider to its default | Set the default |
| Y | Open / close the menu: Export, Share / Copy, Reset group, Reset all (A twice), Clear log, Import, Changed only, Barrel marker, Wide ranges, (anim-studio) Undo, Redo, Store A, Store B, A/B (flip) | - |
| LB / RB | Jump to the previous / next section ((anim-studio) Studio first inside the studio, then tools, Body, Gun, Camera, Speed, ...) | - |
| LT / RT | The focused section's previous / next state group (follow off) | LT held: fine steps (a fifth) |
| R3 (held) | Bypass: the untuned animation, camera and speed (also Backquote on the keyboard) | Same |
| View | Give the pad to the game (or to the free view while it is on); press again to take it back. Back to the panel freezes the game when "freeze on View" is ticked (on by default); View to the game resumes it | Ends the edit (kept) |
| Menu (Start) | Close the panel | Close the panel |

Free view ("PAD: free view"): left stick moves the player (orbit) or flies (fly); right stick orbits / looks; LT / RT
zoom (orbit); LB / RB down / up (fly); D-pad up / down the orbit height; R3 held bypass; B turns the free view off (the
pad comes back to the panel); View the panel (the panel folds while the free view has the pad); Menu closes.
"PAD: game": everything is the game's except View. Keyboard, mouse and touch work the panel as before; the search box
and the number fields are for the keyboard (the pad skips the search box).

(anim-studio) The snapshots bars (tools: Undo, Redo, Store A, Store B, A/B; preset picker, Save, Load, Delete) and the
Studio section (inside the studio: the loop list, Play / Pause, "< key" / "key >", scrub, speed, mirror, root motion,
guard, turntable and its rate, skeleton, feet, onion skin, Front / Side / Back / Top) are ordinary controls: the D-pad
reaches each, A presses / ticks / edits (the scrub and speed sliders and the dropdowns in edit mode as any slider).
Delete takes A twice. Opening the panel in the studio puts the focus on the loop list. A camera snap or the turntable
turns the orbit free view on (the pad goes to it; View back to the panel). The preset name box is the keyboard's (the
pad skips it; Save with it empty takes the next "preset N"). Keyboard: Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo while
the panel is open and no text box has the keys.

(anim-studio-2) The loop list's pairs (`pair:<move>`) and traversal loops (`trav:<move>`) are picked like any entry (the
D-pad to the list, A, left / right); a pair takes the scrub and the key steps (one 30 fps frame), a traversal loop does
not (the game's physics). The Co-op sections (one per team move) and Traversal moves are ordinary registry sections:
LB / RB reaches them, and on a Co-op section LT / RT switches role A / role B / contact (the strip says so). Keyboard
and mouse as any section.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for anim-tuner. Folder C:/NightShift/Mobile-Coop-anim-tuner, branch
feature/anim-tuner (PR to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-tuner && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-tuner && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-tuner"
Read CLAUDE.md, docs/anim-tuner/BRIEF.md and this STATE.md; carry on from "Next". Report to "Night Shift | Orchestrator", then STOP.
```

## Plan after tuner-camera (orchestrator / Michael, 2026-10-21)
1. Anim Studio PR 1: a stage (main menu and Pause dev entry; floor grid, key / rim lights, Wren on a turntable, an
   optional guard), the loop player (any clip or state, in place or on a circle; speed 0.1-2x, pause, scrub, step,
   mirror, root motion), viewing aids (skeleton overlay, foot contacts and trails, onion skin, the crab readout,
   front / side / top snaps), snapshots (undo / redo, A/B compare, named presets). Copy state to state: not wanted.
2. Anim Studio PR 2: two-character co-op moves (both operators synced, role A / B sections, contact offsets, the
   guard for holds) and a traversal prop rig at the level-design Section 12 sizes, tuned per move.
3. Bake script `scripts/anim-tune-bake.mjs`: an export written into the code defaults (sliders back to identity), dry
   run diff, tests on a sample export.
