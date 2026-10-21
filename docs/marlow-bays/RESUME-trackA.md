# Track A (Night Shift | Course Ready Build) - resume

Written 2026-10-22 ~09:10 before a context clear. Read CLAUDE.md, docs/ROADMAP.md, docs/marlow-bays/BRIEF.md (items
24, 29, 30 and "Tracks") and this file. Report to "Night Shift | Orchestrator".

## Open jobs

| Job | Branch / worktree | Head | State | Next |
| --- | --- | --- | --- | --- |
| Item 29 tuner v3 | `feature/tuner-v3`, `C:/NightShift/Mobile-Coop-tuner-v3` | 2dcc601e (master 4.48.0 merged) | PR Tekcry/Mobile-Coop#97. Check ok; laptop full e2e 33/34 ok; e2e-lightbake failed once ("gfx=epic&voxels=1: the lamp plugin is on every PBR material (16 / 17)"), solo rerun queued on the laptop (Character Build) | If the solo rerun passes: tell the orchestrator #97 is green (he merges). If it fails again: find the PBR material in the voxel path that misses the lamp plugin (v3 may have added one, e.g. studio / touch / highlight; compare with master) and fix |
| Item 24 guard tuning | `feature/guard-tune`, `C:/NightShift/Mobile-Coop-guard-tune` | 0b90228c (v3 2dcc601e merged) | Built; checker's two findings fixed; tsc, vitest 2602, e2e-studio and e2e-anim pass. PR body written: `C:/Users/Micha/AppData/Local/Temp/claude/C--NightShift-Mobile-Coop-locomotion/b14cab22-8c21-46cf-aa89-f269d5441600/scratchpad/pr24.md` (scratch; text also below) | After #97 merges: merge origin/master, open the PR to master (`gh pr create --base master --head feature/guard-tune`), ask Character Build for check + full e2e |
| Item 30 key tools + exact preview | `feature/key-tools`, `C:/NightShift/Mobile-Coop-key-tools` | 3e191b2f (from v3 2dcc601e), pushed | Built, all five: a "Key tools" fold in the Keys tab (Wave: channel / amount / timing, Fill keys; Apply to ticked keys, sets not adds; Smooth between From / to, smoothstep of the bake poses; Compare: ghost skeleton + diff line, off by default) and 30e (key file loads on first edit; Bezier fields on Blender's curve, trunk re-keyed in channel frames, arms as FK; vs fixture: pelvis 0.0005 cm, trunk 0.000 deg, arms between keys 0.07-0.70 cm, at keys < 0.02 cm). tsc, vitest 2605, e2e-studio, e2e-tuner-phone pass. Three old test bounds loosened to float noise (tuneKeys.test.ts midpoint range, unedited key 0.002 deg; tuneKeysEdit.test.ts 2e-5): the checker should judge those | One fresh Opus checker (also on the loosened bounds and "added keys now carry small curve deltas"), one fix round; after #97 merges: merge master, PR (name the tuneKeys.ts exact-preview change for Menu Notes), Character Build full e2e; tell Menu Notes |

Merged tonight (track A): #81 coop-torches 4.34.0, #82 T 4.35.0, #83 T1a 4.36.0, #86 T2 4.39.0, #87 item 23 4.40.0,
#89 items 26 / 26b 4.41.0, #91 item 25 4.43.0.

## Item 24 PR body (summary)
Guard tuning: a Who list (Wren / Guard) in the v3 what-row (Body, Stepping, Weight tabs); a guard puppet in the studio
(real grunt rig, no AI); rows `guard.joint.<row>`, `guard.step.<gait>`, `guard.weight.<row>` (`src/anim/tuneGuard.ts`);
generated `src/anim/animBaseGuard.ts` baked by `src/anim/tuneBakeGuard.ts`; `src/ai/enemyRig.ts:18`
`rig.guardRows = true;` the one flag line; Wren's Stepping rows no longer reach guards; VIP / dummy / carried body read
an identity stepping table; guards untuned bit-identical. Edits marked "(item 24, track A)" in tuneJoints.ts,
characterRig.ts, tuneStep.ts, footPlanner.ts, player.ts. Checker's two findings fixed.

## Rules carried
- One checker per slice, one fix round; full e2e on the laptop first (Character Build, E2E_JOBS=2); the desktop runs a
  full e2e only at E2E_JOBS=1 when the laptop is busy; named suites wherever free. Version set at merge (G183).
- Desktop heavy lock: take it atomically, `( set -o noclobber; echo "<session> | <job> | <time>" > C:/NightShift/heavy.lock )`,
  retry if it exists, never overwrite, delete only if it still names you; each e2e its own `E2E_PORT`.
- Usage: check `get_usage` before each agent; pause at 97% at a clean commit and tell the orchestrator; the orchestrator
  sets how many agents run at once.
- Track A owns `src/ui/tuner*`, `src/ui/studio*`, `src/anim/studio.ts`, `src/anim/tuneKeys*`, `scripts/anim-keys/*`.
  Keep at merge: CT Core's `key_clip.py:481` ankle-frame fix (feature/anim-run-half), padGroup / backStep / fillLevels,
  `.debug-tune[hidden]` style, Reset baked (button under More), Menu Notes' `studio.ts` skeleton_test lines. New sliders
  from CT Core / Menu Notes (naturalness pass, docs/anim-natural/BRIEF.md) arrive through the registry and must bake.
- Michael's tuner rules: one layout for every input (only hint glyphs follow the input), layout from viewport size only,
  no search / recent / pins / body map, plain-English labels, subtle highlight with an off switch.
- Tell Menu Notes (track C) when key-file / tuneKeys PRs open and land.
