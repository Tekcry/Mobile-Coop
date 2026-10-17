# Step 11e - Wren in the game behind `?operator=wren`

Model: Opus 5.5, High effort. Run by the orchestrator's step loop (RULES.md "Step loop"). After step 11d (D30).

## Objective

Wren replaces the voxel player body in the game when `?operator=wren` is set (default off until Michael switches it
on): solo player, menus and close-up cameras (hero LOD, D21), co-op remote bodies. Visuals, light parity and desktop
performance checked on the GPU.

## Read (only these, plus the common files)

- `docs/operators-runtime/SURVEY.md` and `DESIGN.md` (step 11d), LOG.md step 11d. DECISIONS D21, D28-D30 and the
  locomotion integration notes (A36-A41, A62; the pistol-mag reload draw, D28) by grep.
- CLAUDE.md "Hard rules" and "Definition of done"; docs/systems/performance.md; docs/systems/testing-tools.md.

## Do

1. Wire the runtime into the player body creation behind the `?operator=wren` dev switch (its own module; flags only
   if the survey shows that is the project's way). The voxel body stays the default and the fallback.
2. Hero LOD in the main menu and registered close-up cameras; LOD0-2 in play by distance.
3. Co-op remote players use the same runtime (through `src/net`'s dynamic import only).
4. Goggle states: stowed on the brow by default, in use when the game's night vision is on (if the game has that state;
   otherwise stowed, and record the hook).
5. An e2e suite (or an extension of the player suite) that boots `?autostart=<map>&mode=<mode>&operator=wren`, checks
   the body loads, animates with the rig, swaps LOD and disposes; GPU contact sheet of Wren in the game (E2E_GPU=1).
6. GPU checks on this PC: desktop performance budgets (docs/systems/performance.md, SPEC 6.4 costs), light parity
   (the light meter, guard perception and what is seen agree in lit and dark spots), no network requests, no console
   errors. Screenshots into `docs/operators/mockups/wren/ingame/`.
7. Docs: docs/systems (world-and-characters.md or a new operators section), TESTING.md desktop checklist line,
   OWNER-NOTES (how Michael tries it: the URL), LOG.

## Checks

- `npm run check` and `npm run e2e:quick` pass; the full `npm run e2e` passes before the commit.
- Perf budgets pass on the GPU with `?operator=wren`; light parity holds.
- `npm run operators:check -- wren` unchanged.

## Finish

As RULES.md "Step loop"; commit "operators: step 11e - Wren in the game". Then ask Michael whether to switch Wren on by
default and Moth's direction (D24) before step 12.
