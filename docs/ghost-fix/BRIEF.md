# ghost-fix - brief

Job lead: "Night Shift | Course Ready Build" (desktop), started by the orchestrator 2026-10-20. Branch
`feature/ghost-fix`, folder `C:/NightShift/Mobile-Coop-ghost-fix`, cut from master 4.13.0 (51af5ffb).

## The ask
Michael (2026-10-20 12:30, verbatim): "The graphics have also had ghosting too, set to epic preset". Where: "I think it
was when aiming/holstering".

## Goal
No ghost trails on the arms and weapon when drawing, aiming and holstering at Epic (and High). GPU evidence: before /
after frame strips of a draw and a holster at Epic (port 4189, `E2E_GPU=1`, headless) in `docs/ghost-fix/shots/`.

## Limits
- A patch. CT Core owns `src/player`, `src/anim`, `src/ui`: minimal edits there, and tell CT Core in one line.
- Movement stays first priority on the desktop lock.

## Michael's answers
(none yet)

## Assumed decisions
(none yet)
