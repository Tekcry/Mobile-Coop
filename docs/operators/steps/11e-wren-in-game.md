# Step 11e - Wren is the player character (both players)

Model: Opus 5.5, High effort. Run by the orchestrator's step loop (RULES.md "Step loop"). After steps 11c (master
merged) and 11d (game runtime). Scope set by D31 / master G123 (Michael, 2026-10-18): "I want wren in to replace the
existing character anyway; before the prototype is done" and, until Moth is finished, "Both play as Wren".

## Objective

Wren replaces the player character for the local player AND the co-op partner. The old player body leaves the player
path (no dev switch). Guards keep their current bodies (realistic guards come later, G68). Gameplay does not change.

## Read (only these, plus the common files)

- Master's docs/DECISIONS.md: G38, G68-G75, G93, G123 and the G numbers this run adds. CLAUDE.md "Hard rules".
- `docs/archive/operators-runtime/SURVEY.md` and `DESIGN.md`, LOG.md steps 11c and 11d.
- docs/systems/world-and-characters.md, docs/systems/performance.md, docs/systems/testing-tools.md.

## Do

1. Wren is the body for every player: solo, local co-op player, remote partner. Remove the old player body from the
   player path (keep it only if guards or a parked system still use the shared code; never for players).
2. Gameplay must not change (G38; gameplay never reads graphics state): same capsule, collision, speeds, perception,
   noise and camera height for every player. Hit volumes and light-meter samples follow Wren's body; light parity holds
   (what the player sees, the light meter and guard perception agree).
3. Apply the shared-body proportion fixes (G72).
4. Every animation works on Wren: walk, crouch, back-to-wall, ladders, ledges, takedowns, weapon carry with rifle and
   pistolSd, goggles on the brow / over the eyes per G73. Remote partners pose from MoveState as before; no new
   bandwidth.
5. Hero LOD for menus and close cameras (D21), LOD0-2 in play.
6. Measure and note Wren's download size and load time (ART-10's file-size limit is decided on this branch).
7. Record in master's docs/DECISIONS.md: G123 (quoted above, replaces G70's "after the prototype, behind a dev switch")
   and the operators run's still-current decisions from G161 on, each quoting Michael; docs/operators/DECISIONS.md
   points there. Update docs/systems/world-and-characters.md and CHANGELOG (Unreleased, one minor step per G93).

## Checks

- `npm run check` passes.
- e2e suites pass: e2e-move, e2e-traverse, e2e-anchors, e2e-wall, e2e-anim, e2e-netmove, e2e-coop, e2e-bunker,
  e2e-course (known flaky: e2e-coop, e2e-netmove, e2e-darkness, e2e-weapons-carry, e2e-pad, e2e-foley, e2e-bunker;
  a failure elsewhere counts only if it also fails a solo rerun). Then the full `npm run e2e`.
- GPU on this PC (E2E_GPU=1): perf budgets, contact sheets, anim audit, screenshots of Wren in game for both players
  into `docs/operators/mockups/wren/ingame/`.
- `npm run operators:check -- wren` unchanged.

## Finish

The orchestrator commits, pushes and opens the PR feature/operators -> master (never merges). Report: PR link,
conflicts and resolutions (11c), what changed for players, test results, open items for Michael, in-game screenshots.
