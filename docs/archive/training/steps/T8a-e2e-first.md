# Step T8a - e2e-bunker: bays B1-B5 (Block D)

Model: implementer opus, checker opus (two pages over the net). Deps: T7b (Block C done). Runs e2e-coop and e2e-netmove.

## Read
- FEATURES.md "Drills" paragraph, section 11 (per-player coverage), rows placed in B1-B5
- BAYS.md section 0 (Drills), B1-B5 "Sequence" and "Co-op split and gate"
- scripts/e2e-course.mjs (T1b / T1c two-page pattern), scripts/e2e-bunker.mjs (T6 / T7b sections),
  scripts/e2e-lib.mjs 83-110, 194-271; scripts/run-e2e.mjs 20-60
- The bot partner's API (loco 20, `scripts/e2e-bot.mjs` and its doc section) - TM made it available

## Task (decisions)
1. Grow `scripts/e2e-bunker.mjs` into the course suite: two pages `?net=local&autostart=bunker&mode=course` (host P1,
   client P2), or the host plus the bot partner where scripting a second page is clumsy. Teleports to debug points are
   allowed between drills; the drill itself is always performed by real input (pad buttons, sticks, keys), never by
   calling the tick function (D30).
2. Per bay B1-B5, one `section(...)` each (`--only=B3` runs one; it starts at that bay with `Start at bay N`):
   - every drill of the bay done by the players it names; the HUD tick columns on both pages agree with the host's
     state within 0.5 s; the airlock refuses before the last drill and names it, then cycles;
   - every gate in its form today, acted once by the host and once by the client where the gate allows;
   - the near door stays locked after the cycle; both pages agree on door and light state;
   - one verb per bay posed on the partner's page within 10 cm of the owner (the e2e-netmove limit);
   - B4: brace, boost, human ladder between the two players; the timed sluice; the boost-and-ladder pull-up now form.
3. A forced restart in B5: both players downed; both respawn in A4; B5's drills keep their ticks only for drills done
   before the restart (TUNE: keep them, logged as an assumption if the code prefers reset); B5's squad respawns; MB is on.
4. Register `e2e-bunker` in run-e2e REQUIRED and COVERS (src/world/maps/bunker*, src/game/course, courseMode, courseHud).

## Checks
`timeout 900 npm run check`; `node scripts/run-e2e.mjs e2e-bunker e2e-course e2e-coop e2e-netmove`.

## Commit
"training T8a: e2e-bunker bays B1-B5". Docs: docs/systems/testing-tools.md (the suite), LOG, STATE.
