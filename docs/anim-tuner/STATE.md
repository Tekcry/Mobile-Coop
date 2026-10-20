# anim-tuner - state

## Now
anim-tuner merged as 4.20.0 (PR #56). tuner-pad (pad control) PR open from feature/tuner-pad.

## Next
1. The orchestrator merges tuner-pad on its tests + CI.
2. Michael tunes and exports `anim-tune-<date>.json`; a later job folds the values into the defaults.

## Open (polish list, CHECK.md)
- The barrel marker allocates inside Babylon each frame while ticked; the panel and its DB are built at every boot.
- e2e-ctcourse ran past 600 s on the desktop during the e2e:quick (laptop runs 240 s): watch the next full run.

## Done
- 2026-10-20/21: implementer pass 1-3, check PASS, review fixes, master 4.19.1 merge (hooks re-applied, glideTwistMul), merged as 4.20.0 (#56); tuner-pad: pad control (D-pad pick / nudge, LB / RB state, Y reset, A export, B close, View hands the pad to the game), check + e2e-menus green.
- 2026-10-20: worktree and branch from dedcfcc5; BRIEF.
- 2026-10-21 (tuner-camera): the section registry (`src/anim/tuneRegistry.ts`); Body, Gun and a new Camera section on
  it (`CAMERA.md`). Free view wired but off (second pass).

## Section registry (for other jobs)
`src/anim/tuneRegistry.ts` (pure, Babylon-free). A section is a set of sliders over a set of state groups. Every
registered section gets, with no code of its own: the panel's group picker, follow, per-slider / group / all reset,
"changed only", the IndexedDB save, the Export JSON, the change log and pad control (D-pad picks across every
section's rows, LB / RB switch the focused section's group). Sections show in registration order: Body, Gun, Camera,
then yours.

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

**Read it in a hot path without allocating.** The returned section holds preallocated objects: `values[group][field]`
(the live slider values) and `cur` (one object, every field). Either read `sec.values[g].field` directly, or once per
frame call `tuneSectionLoad(sec, group | null)` (a copy loop into `cur`; null = the defaults) and read `sec.cur.field`.
Do the group selection with plain comparisons (no closures, maps or arrays per frame). At the defaults every value is
+0 / x1, so the game is unchanged.

**Save and export.** Values are saved (debounced) to the tuner's own IndexedDB database as `{ values: { <group>:
{ <slider>: value } }, log }`, only values off their default; the export adds every changed value with its default and
the change log. The existing body / gun keys are unchanged, so older saves load as before. Saved values for a section
that has not registered yet are kept and applied when it registers (and kept in the next save meanwhile).

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
Other entry points: `tuneSet` / `tuneGet` / `tuneReset*` / `tuneChanged` / `tuneExport` / `tuneSnapshot` / `tuneLoad`
take any registered group; `TUNE_SECTIONS` lists the sections. Tests: `tests/animTuneCamera.test.ts` (registry block).

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for anim-tuner. Folder C:/NightShift/Mobile-Coop-anim-tuner, branch
feature/anim-tuner (PR to master). Branch guard before every write:
cd /c/NightShift/Mobile-Coop-anim-tuner && test "$(git rev-parse --abbrev-ref HEAD)" = feature/anim-tuner && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-anim-tuner"
Read CLAUDE.md, docs/anim-tuner/BRIEF.md and this STATE.md; carry on from "Next". Report to "Night Shift | Orchestrator", then STOP.
```
