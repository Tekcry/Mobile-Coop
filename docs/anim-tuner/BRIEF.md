# anim-tuner - brief

Job lead: "Night Shift | Course Ready Build" (desktop), started by the orchestrator 2026-10-20. Branch
`feature/anim-tuner` cut from `origin/feature/ct-prototype` at dedcfcc5 (4.17.0), folder `C:/NightShift/Mobile-Coop-anim-tuner`.
PR to master (minor). Movement-related: ranks with movement, behind CT Core on the desktop heavy.lock.

## The ask
Michael (2026-10-20, via the orchestrator): "Yes add the sliders as another task to be built. Doesn't have to look pretty,
just functional. Build fast".

Goal: an in-game slider panel so Michael can fix crab-looking animation himself while moving, and the values come back to us.
- Where: the debug overlay (F3) "Tune" panel (`src/ui/debugOverlay.ts` `buildTune`), extended or a sibling panel.
  Mouse-driven plain HTML sliders, no styling work. Dev aid, available in any build (Michael uses /preview/).
- A state picker: idle, walk, jog, run, crouch walk / sneak / crouch idle, low ready, aiming (standing / crouched), back
  to wall (idle / slide / peek), climbing (ladder / pipe / ledge), vent / crawl / hang, hold (grab). Defaults to the
  current state, with an auto-follow toggle.
- Per state, sliders for the numbers that exist in code (a multiplier or offset where a value is a literal): foot width /
  track, knee in-out, elbow tuck, arm swing amount and its growth with speed, forward lean, step length, crouch depth,
  wall gap, head turn, peek lean, body distance from the wall / pipe, hand and foot reach offsets, knee lift, hand
  spacing for shimmy, gap to the guard.
- Gun hold per weapon (rifle, pistol) and per state (low ready, aiming, crouched aiming): position fwd / up / side vs
  shoulder and eye, cant, low-ready muzzle pitch, stock depth, support-elbow tuck, head drop to the sights; a small
  marker where the barrel points.
- Live: changes apply instantly; the F3 anti-crab readout stays visible beside it.
- Save: IndexedDB (not localStorage); Export downloads `anim-tune-<date>.json` (every changed value, its default, a
  timestamped change log); Reset per slider and per state. A later job folds the values into the defaults.
- Hot paths must not allocate: tuned values are read from preallocated objects.

## Limits
- CT Core builds slice 3 in `src/anim` and `src/player` in parallel: edits there are small hooks only (a multiplier
  read); the panel and the tuning tables live in new files. Merge feature/ct-prototype before the PR.
- Prototype loop: one Opus implementer, one Opus check, at most one fix round. Fast over polished.

## Assumed decisions
(see STATE.md / the implementer report)
