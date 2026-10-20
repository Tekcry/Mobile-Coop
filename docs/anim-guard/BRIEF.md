# anim-guard - brief

Job lead: "Night Shift | Course Ready Build" (desktop), started by the orchestrator 2026-10-20 (piece 3 of the
animation rework). Branch `feature/anim-guard` cut from `origin/feature/anim-rig` (00b654cd), folder
`C:/NightShift/Mobile-Coop-anim-guard`. PR base: `feature/ct-prototype` once #39 is in.

## The ask
Key the guard's side of Wren's hold from `docs/anim-rework/BRIEF.md` "Holding a guard": stumbling back under the hold
(feet dragging, short catching steps), the hands up at her arm, the choke sag lowered to the floor, and the knife-kill
collapse (short, not gratuitous). Keyed by hand from real movement, never traced. Not wired into the game (slice 6).

## Scope
New files only: `scripts/anim-keys/keys/guard-*.json`, `src/anim/clips/keyed/guard*.ts`, their tests, sheets in
`docs/anim-rework/shots/guard/`, docs in `docs/anim-guard/`.

## Done
The clips bake; a sheet of each in `docs/anim-rework/shots/guard/`; unit tests that they sample; `npm run check` passes.

## Assumed decisions
(none yet)
