# anim-bake-targets - brief

Job lead: Night Shift | CT Core Build. Branch `feature/anim-bake-targets` in `C:/NightShift/Mobile-Coop-anim-bake-targets`,
cut from `feature/anim-bake-1022` 7655fbcf (PR #96, not merged yet: it needs that bake's ledger and export). Master is
merged in once #96 lands. Its own PR.

## The ask (orchestrator, 2026-10-22 ~01:10)
"Leaving 13 of Michael's values 'manual' isn't good enough. They'd live only in his browser, not for the partner, other
devices or the build ... give each a code target so the bake writes it, as J1 did for Joints: per-state values in the
base table for trackMul, elbowOutAdd, armSwingMul and kneeLiftMul, a lowReady elbowPoleMul, and tuckMul per gun state
(split the shared value into six, each defaulting to today's value so nothing changes untuned). Then re-run the dry
run: 0 manual for this export. Rule from here: any slider the tuner shows must be bakeable; one that isn't is a bug."

The 13 in Michael's export (`docs/anim-tuner/exports/anim-tune-2026-10-22.json`): body trackMul 0.05 (idle, walk, jog,
run), elbowOutAdd 0.03 (idle, walk, jog), armSwingMul 1.7 (jog) / 1.6 (run), kneeLiftMul 1.55 (run), elbowPoleMul 2.25
(lowReady); gun tuckMul 0.75 (rifle.lowReady), 0 (pistol.lowReady).

## Assumed decisions (Michael asleep; undo by telling the orchestrator)
- BT-A1: The Body section's sliders that have no code value get a base-table key `body` (row = the Body group id, param
  = the slider id; `mul` sliders multiply, `add` sliders add), read by every Wren rig with the tuner's live values on top
  (as J1's A2). Guards never read it (Wren's rows never touch guards).
- BT-A2: tuckMul becomes six named constants, one per gun state (rifle / pistol x lowReady / aim / aimCrouch), each
  today's value, so an untuned build is bit-identical; the bake writes each per state.
- BT-A3: Every Body slider the bake now lists as "manual: no code target" moves to the `body` base key, not only the
  five in this export, so the rule "every slider bakes" holds for the Body section.

## Limits
CLAUDE.md hard rules (no per-frame allocation; gameplay never reads these). Identity tests green untuned. Tests: check
and named suites on the desktop under `C:/NightShift/heavy.lock` (port 4191, `E2E_JOBS=1`); the full e2e on the laptop
first. Usage: check `get_usage` before each agent; pause at 97%.
