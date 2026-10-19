# Sector Ops and the prototype menu - brief

Set by the orchestrator, 2026-10-19. Branch `feature/sector-ops` (off master 884c195, 4.6.2; master 4.6.4 merged in), folder
`C:/NightShift/Mobile-Coop-sector-ops`. Job format: BRIEF (this file), PLAN, STATE (CLAUDE.md "Sessions" once PR #15
merges). Prototype effort only: no refining, no art pass (the goal rule).

## Michael's words (2026-10-19)
"There should only be Deniable Ops (dont use this name - research splinter cell conviction deniable ops mode and
recreate a quick prototype for this chaos theory type game which is slower, but include sector progression. Allowing
for ghost completion as well (not requiring kills) Keep it simple as a solo/coop test for movement and gunplay. I dont
want to spend a lot of time on it, but i will use it as my playground for testing updates etc without a coop partner.).
Also Co-Op, which will feature the actual campaign starting with the training bunker only for now (also being able to
change mode to deniable ops too). Ask questions as needed."

## Michael's answers
- **M1:** the campaign's "training bunker" is **Marlow Yard** (`ctcourse`, Course mode), the CT training course.
- **M2:** Sector Ops uses the **Warehouse**, "but expand it into multiple sections that allow a sandbox for the players
  to get through. must become increasingly difficult, and include lasers, cameras etc. Keep it prototype effort only
  for now."
- **M3:** a sector is completed by **its objective, then its exit**. Kills are optional, so a ghost run (no kills, never
  seen) is always possible.
- **M4:** the mode is named **Sector Ops** (never "Deniable Ops" or any Splinter Cell name, CLAUDE.md "No Splinter Cell IP").
- **M5** (2026-10-19, via the orchestrator): "split existing, but maximise guards on duty per section (clear the previous
  section once through it), hence i was thinking maybe add new sections to allow an adjoining room or hallway that can
  load the next area. I would want an many guards as possible patrolling in each section. Im not opposed to a quick
  prototype level with 5 different sections, all related to the map but different to eachother (section 1 is external
  courtyard, breaking in. section 2 making way through lobby or service entrance. section 3 making way through offices or
  warehouse - these are all only examples. base of off existing deniable ops missions but to suit chaos theory style
  gameplay. conviction was meant for action mainly)"
- **M5b** (2026-10-19, via the orchestrator): "Research deniable ops and create a comprehensive plan before building if it
  will result in an easier build." Michael approves the plan before slice 2 starts.
- **M6** (2026-10-19, via the orchestrator): aim for 20-25 patrolling guards per section, then measure. `MAX_ALIVE = 12`
  (G46, FU-11) is an unmeasured placeholder: raise it for Sector Ops only (a per-mode cap, other modes unchanged). A
  `perf.mjs` run on the Sector Ops map with a section's full guard count is "pending PC run"; the count is adjusted from
  it. Software-GL tests run each section with fewer guards through a test flag.

## Goal
1. **Main menu: only Sector Ops and Co-op**, plus Loadout, Settings and Feedback.
   - Missions, Training and Free Roam leave the menu but stay reachable behind `?legacy=1`. Nothing is deleted.
2. **Sector Ops**, solo or co-op, is Michael's playground for movement and gunplay. The Warehouse is expanded into
   3-4 sectors in a row.
   - Each sector has one objective: a hack, a grab or a download, from what exists.
   - Then the sector's exit opens and the next sector starts.
   - Difficulty rises sector by sector: more guards, then cameras, then lasers, then tighter light.
   - Being spotted raises the alarm. Pick a rule from the research (reinforcements, as in Conviction's Hunter, or an
     alarm stage) and log it as an A-decision.
   - The run ends at the last exit, with a short result: time, kills, times spotted, and "Ghost" when none of either.
3. **Co-op is the campaign.**
   - The lobby's campaign is Marlow Yard in Course mode, its only entry for now, and the default.
   - The host can switch the session's mode to Sector Ops.
   - Room-code play works for two players. Fix the stale "Fallow bunker is the co-op tutorial" text.

## Research first (short)
Read about Splinter Cell: Conviction's Deniable Ops: its Hunter and Infiltration modes, the sector structure, what
detection does, and how a sector unlocks the next. Write 10-15 lines in `docs/sector-ops/PLAN.md`: what we take, and
what we change for Chaos Theory pace (slower, light and shadow first, ghosting rewarded). No names, maps or text from
the game.

## Build on what exists (no new systems where one exists)
- **Lasers, cameras, jammer, alarm stage:** `src/game/ctDevices.ts` and `src/security/camera` (Marlow Yard's devices).
- **Alarm reinforcements:** in the parked `src/game/modes/clearMode.ts`. Copy the rule into the new mode; don't
  un-park Hunter.
- **Objectives and the result:** `src/game/missions.ts` / `infiltrationMode.ts` (objectives, extraction) and
  `src/game/modes/score.ts`.
- **Course gates and doors** (exit locks): `src/game/course/`.
- **The Warehouse:** `src/world/maps/warehouse.ts`. Sectors can be new map sections, or Warehouse areas gated in
  order. Pick the cheaper one and log it.
- **Menus:** `src/main.ts` (main menu entries), `src/net/coopUi.ts` (lobby: modes and maps; only reached through the
  dynamic import behind `flags.coop`), `src/world/maps/listed.ts`.

## Limits
- Follow `docs/level-design.md` where it applies to the Warehouse sections, at prototype depth: placeholder geometry
  is fine, and its exceptions are logged.
- Hard rules: light parity (bible 5.1), gameplay never reads graphics state, no hot-path allocation, Babylon only
  through `src/core/babylon.ts`, single player never imports `src/net` statically.
- Tests (CLAUDE.md test tiers):
  - Extend the owning suites, with no new suite unless none fits: the menu in e2e-menus; Sector Ops one solo walk
    through every sector, objective then exit, plus one ghost check.
  - Co-op Sector Ops only via a room-code join in e2e-coop, and only after the co-op test fix job (feature/coop-tests)
    merges. Ask the orchestrator first, because that job owns e2e-coop.
- Machines: heavy runs only with `C:/NightShift/heavy.lock` (desktop) and headless only: no visible windows, no
  pointer capture.
- Versions: don't bump `package.json`. CHANGELOG under "Unreleased - Sector Ops".

## Done looks like
- Michael opens the game: the main menu shows Sector Ops and Co-op (plus Loadout, Settings, Feedback).
- Sector Ops runs solo through every Warehouse sector to the result, and can be ghosted.
- Co-op hosts Marlow Yard by room code, or switches to Sector Ops.
- One PR to master. The orchestrator runs the full e2e and merges it.

## Assumed decisions (job lead; each with how to undo)
- **A1 (first cut, superseded by M5):** slice 2's first cut is four sectors on a copy of the Warehouse
  (`warehouseOps`), gated in order by exit zones, no new geometry. It ships on this branch as the mode's skeleton and is
  rebuilt to the five-section plan (`PLAN.md`) once Michael approves it. Undo: `src/world/maps/warehouseSectors.ts`.
- **A2 (gating, first cut):** a sector's guards spawn when it starts; its exit is a zone that opens after the objective.
  The plan replaces it with connectors (`PLAN.md` section 3).
- **A3 (alarm):** CT's alarm stage (G125, 3 stages, never ends the run) plus Hunter's reinforcement rule: a guard's alarm
  or a camera at full awareness raises the stage by one; each stage sends 2 guards in, hunting, from the section's
  entry. Undo: `SectorMode.onAlarm` returns false.
- **A4 (Ghost):** Ghost = 0 kills and 0 times spotted (guard detections plus camera alarms). Knock-outs do not break
  it; a Ghost run scores +2000. Undo: count `knockouts` in `SectorMode.result`.
- **A5 (lives):** 3 lives; a down respawns at the sector's start (the connector in the plan). Undo: `SECTOR.lives`.
- **A6 (suite):** a new required suite `e2e-sectorops`, since e2e-modes went to LEGACY in #15 (the orchestrator agreed).
- **A7 (test hook):** `window.__play(map, mode, difficulty)` starts a match; e2e-pad uses it for the free-roam match the
  main menu no longer offers. Undo: drop the hook and the e2e-pad line.
- **A8 (lobby):** a map set by a test or dev tab that the lobby's list leaves out (Course on courselab) stays listed for
  that room, so e2e-course keeps working.
- **A9 (co-op Sector Ops):** two players (like the course); the client mirrors cameras and lasers from a `sector`
  message (protocol 23); objectives, markers and banners use the existing item and event mirror.

## Level-design exceptions (prototype depth, logged)
- No map spec, scale sheet or light plan for `warehouseOps`; placeholder geometry; camera and laser placement by eye,
  lines of sight not audited.
