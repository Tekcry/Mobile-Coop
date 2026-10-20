# anim-tuner - state

## Now
anim-tuner merged as 4.20.0 (PR #56). tuner-pad (pad control) PR open from feature/tuner-pad.

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

## Pad map
While the panel has the pad ("PAD: tuner"; the strip at the bottom of the panel shows the map for the current mode).
`src/ui/animTunePad.ts` (`TunePadCtl`, pure, `tests/animTunePad.test.ts`); `src/ui/animTunePanel.ts` applies it.

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
