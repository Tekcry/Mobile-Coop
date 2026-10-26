status: claimed Night Shift | Cloud Builder 2 2026-10-26T03:22:08Z

# campaign J8 E8: the wharf e2e follows J8's geometry (Sonnet 5.5)

Released 2026-10-26 ~14:25 by the lead: every gate below is met (gate 2: TD-a + TD-b are in your base through tallow-throw 6c4219cd2; their code equals PR T head 34e92c991).
Gate (all must be in your base; step 1 checks them):
1. PR G2's branch origin/feature/tallow-fixes-2 with **G2 and G4 merged in**; its base, PR G1's
   origin/feature/tallow-fixes, carries LP, D0, G0 and **G0b** (the layout's `throwSites` from the section throws that
   set `dist`), MB, G1 and G3.
2. **PR T (TD-a + TD-b)** merged into origin/feature/mission-engine and the engine merged into feature/tallow-fixes-2:
   without TD-b the host's runner throws 3.2 m at the widened pawn gap, finds no floor and refuses ("No floor to land
   on there"), so the pawn throw cannot pass.
3. **J7 PR F** (origin/feature/mission-rules-hud: R6, R6 polish, R7, R8) merged into the engine and from there into
   your base.
4. **The wharf triage fix** (origin/feature/mission-engine-gb6fix2, head 21eb573bd when this brief was written; the lead
   names the final head: 820101ecd) merged into the engine (or PR F) and from there into your base: it fixes the
   suite's section read after the match starts, the TKL key posts read as [x, z], Teale's respawn wait after the W2
   restart, the step-event waits, the client's mission mirror rows, and the pull-up holder's band (`src/game/kit/pullUp.ts`,
   the TKL W2 pull failure). E8 builds on that fixed script, never on the broken one.
Base: origin/feature/tallow-fixes-2 at sha 2de5701c0aae18e8cfe987878df8d7791e847f43 (G1 + G2 + G4 merged; tsc + 413 tests). New branch: feature/tallow-e8 (the lead merges it into
feature/tallow-fixes-2). Lead: Night Shift | Campaign Build. Read `git show origin/master:docs/systems/agent-preamble.md`
("Cloud sessions" replaces the folder rules) and the code hard rules in `git show origin/master:CLAUDE.md` first.
Plan: `docs/missions/slices/J8-J9-PLAN.md` on the engine: section 6 row E8 and "E8 e2e follows", A29, A30 (its Tests
line), section 8 (PR G2's laptop set). LP's numbers: `docs/tallow-fixes/briefs/G2.md` steps 1, 3, 9 and "Done looks
like"; `docs/tallow-fixes/briefs/G4.md` last lines; `docs/tallow-fixes/EGRESS.md` sections 1-2 (its rows E1-E10 are
egress rows, not this slice).

## Only these files
- `scripts/e2e-sectorops-wharf.mjs`.
- A temporary audit test (step 8) you run and delete; never committed.
Not yours: every `src/` file, every map file, `tests/**` (committed), `scripts/e2e-*.mjs` other than this one, the
changelog fragment (the lead's). Do not touch the three shutter `SKIP` lines or add a shutter move (that is J9's S4).

## Why
G2 cut the pawn loft back and widened the C4 west gap to 4.9 m (a 5.8 m site throw, M2); A29 removed the clock-mender's
bolt, so the later W2 bolts moved down one slot; A30 bolts the W3 roof bulkhead's foot door in Two-Key Ledger only. The
wharf e2e still throws from the old pawn spot onto the old stage and unbolts the pawn door as W2 bolt 3, and it checks
nothing of A30. G4 changed no jetty geometry (EGRESS E4; G4 brief: "the jetty pull (`W4_PULL`) is unchanged"), so the
jetty pull stays. Cloud builders cannot run the e2e: you change the script, prove every scripted spot is clear in the
built map (step 8), and the lead runs the laptop suites.

## What to change
1. **Gate checks** (stop with `status: blocked <which>` if one fails): `git merge-base --is-ancestor <triage head> HEAD`;
   `git log --oneline -- src/game/teamController.ts | grep "tallow TD-b"`; `grep -c "pg.a.at\[" scripts/e2e-sectorops-wharf.mjs`
   is 0; the script has `readSectors` (R7) and `objLineIs` / `fieldRows` (R8); `src/world/maps/tallowWharfSectors.ts`'s
   `W2_BOLTS` has `w2-pawn-taking-in` at index 2 and `W3_BOLTS` ends with the `w3-bulkhead-foot` entry with
   `missions: ['twoKeyLedger']`; `grep -n "throwSites" src/world/maps/tallowWharf.ts` finds the layout line (G0b);
   `grep -n "lastThrowDist" src/game/teamController.ts` finds TD-b's field.
2. **Read first:** the script (all); `src/game/sectorTeamDoors.ts` `boltInfo()` (`id, sec, k, door, at, side, shut,
   locked`); `src/world/doors.ts` `DoorState` (`cx`, `cz`, `anchor.hinge`, `anchor.locked`; use the base's field names);
   `src/world/maps/tallowWharfSectors.ts` (`W2_BOLTS`, `W3_BOLTS`, `WHARF_SECTORS`); `src/world/maps/tallowWharfW2.ts`
   (`THROW_PAWN`, `W2.doors`); `src/world/mapDef.ts` `ThrowSite`; `src/game/teamController.ts` `lastThrowDist`;
   `src/core/flags.ts` (which co-op kit flag and URL parameter exist in your base).
3. **The pawn throw** (TGC W2; today `toss({ id: 'w2-throw-pawn', thrower: [50.5, LOFT + 0.1, 69.6], runner:
   [50.5, LOFT + 0.1, 68.3], stage: [49, 72.5, 52, 73.5] })`, "TGC W2 throw" block):
   - Read the site on the host page after the match starts: `window.__app.current.world.layout.throwSites`, the one
     within 1.0 m of (51.2, 67.2). Assert it exists with `dist` 5.8 and (dx, dz) within 0.01 of (0, 1) (the throw
     direction runner -> thrower, +z). Thrower = [s.x, LOFT + 0.1, s.z]; runner = 1.3 m back along -(dx, dz). The stage
     box is G2's `[50.2, 72.5, 52.2, 73.5]` (a named constant with a comment citing G2 step 3; not on the page). No
     fallback to old numbers: a missing site is a failed assert.
   - `toss` gains an optional `c.dist`: when set, after `moveClient` wait until the host sees the client within 0.15 m
     of the thrower spot (the site needs the thrower within 1.0 m and the throw within about 25 degrees of its facing; a
     0.4 m error at 1.3 m is 17 degrees), and after the landing assert the host's `team.lastThrowDist` is within 0.01 of
     `c.dist` and the landing's plan distance from the thrower spot is within `c.dist` +- 1. Print both.
   - Call it with `dist: 5.8`. The landing check keeps `LOFT` (the stage is at 4.5).
4. **The pawn taking-in door's bolt** (today `const pb = await useBolt(1, 3);`): A29 removed W2 slot 2, so the door is
   W2 bolt **2** (EGRESS section 2, "W2 2 (was 3)"). Add a reader `boltAt(sec, x, z)` (the host's `boltInfo()` entry of
   that section whose `at` is within 0.3 m of (x, z)) and use it with (51.2, 67.45) (G2's `w2-pawn-taking-in`); assert
   its `k` is 2, print it, then `useBolt(1, b.k)`. The door open lines after it stay.
5. **A30, Two-Key Ledger** ("TKL W3 keypad and broken rule", right after `cross(1, 'W2 connector')` and `mirror('W2')`):
   `boltAt(2, 112.5, 68)` exists with `k` 4, `shut` true and `locked` true on the host; on the client page the door at
   the same index (`world.doors.list[b.door]`, both pages build the same map) has `anchor.locked` true (wait up to 8 s
   with `until`). Print `A30 TKL: W3 bolt 4 (the bulkhead foot) shut, its door locked on host and client`.
6. **A30, Three Grey Coats** ("TGC W3", after the W3 banner check): no `boltInfo()` entry has `sec` 2 and `k` 4, and none
   sits at (112.5, 68); on both pages the foot door (the `world.doors.list` entry whose centre is within 1.0 m of
   (112.5, 68) and whose `anchor.hinge.y` is under 1, so not the roof leaf at 8.4) has `anchor.locked` false. Print
   `A30 TGC: no W3 bolt 4, the bulkhead foot door unlocked on host and client`.
7. **Unchanged, checked only:** the TKL W2 pull `w2-pull-east` (holder [73.5, LOFT + 0.1, 59.35], partner
   [73.5, 0.1, 58.3]) and the TKL W4 jetty pull `w4-pull-jetty` (holder [73.5, 0.1, 6.35], partner [73.5, -4.3, 5.3]):
   G2 does not move the walkway's east lip and G4 builds no jetty geometry. Step 8 proves the spots clear.
8. **Spot audit (static, the only proof a cloud builder can give).** A temporary `tests/tallowWharf/_e8spots.test.ts`
   (run it, copy its printed table into the report, delete it before committing) that imports the built map from
   `tests/tallowWharf/helpers.ts` (`builtWharf`, `solidOf`; use the names your base exports) and, for every hard-coded
   point the script teleports a player to or uses an item from, checks: no collide box of the solid set overlaps the
   standing body (radius 0.3, feet + 0.1 to + 1.7) and a walkable top lies within 0.3 m under the feet. The list: W1
   leg-up spot (4, 0, 13.5) and the host 0.8 m behind it (4, 0, 12.7); (22, 0, 41); the tally-book use point
   (3.6, 4.5, 50.6); (18.75, 0, 7.75); the pawn thrower and runner (step 3); the W2 pull holder and partner; the
   walkway spot (61, 4.5, 60.5); the W3 keypad use point (112, 0, 51.1); the ledger use point (101, 0, 61.5); the chute
   leg-up spot (97.1, 0, 53.2) and the host 0.8 m behind it (97.1, 0, 54.0); the coal-yard spot (x the script computes,
   0, 48.5) using the base's `tkl-4-yard` box; (90, 0, 46); the strongroom key posts from `WHARF_SECTORS[2].pairGates[0]`;
   the W4 clerestory leg-up spot (79, 0, 29.2) and the host behind it (79, 0, 30.0); the W4 objective use point
   (75.5, 0, 15); the jetty pull holder and partner; each section's connector and extraction box centre from
   `WHARF_SECTORS`. A point that fails (a G1-G4 desk, cover box, stack or the moved fire escape on it): move it to the
   nearest clear point within 1.0 m that keeps its purpose (in reach of the item, in the overhear box), say so, and
   rerun. Visual-only boxes (`collide` false, the desks of LIGHT.md rule 7) do not count.
9. **R8 checker polish** (lead notes, R8 PASS; lines on PR F's head, find them by text): (a) after
   `restarted(1, cp2, 'W2 protected restart', 1)`, recount the client's `SECTION RESTART` banners: still exactly one;
   (b) the "Teale asked" wait (`until(A, (sid) => ... 'tgc-3' ...)`) uses `stepDone('tgc-3')`; (c) a comment at the two
   `currentIs` calls after the restarts (`READING_LINE`, `MOVED_LINE`): the Objectives row check is what gives the line
   check its teeth; (d) `fieldRows`: after Resume, also wait until the page's game is no longer menu-paused (read the
   field name in `src/game/gameState.ts`, for example `menuPaused`) before returning. Lead ruling ~09:05: E8 keeps these
   (J7 PR F's polish, done here because E8 owns the script next).
10. **The co-op kit URL:** if your base's `src/core/flags.ts` has the kit-flag fold's flag and no `coopKit`, change both
    URLs' `coopkit=1` (host and client, `join(...)` in `run`) to the fold's URL parameter as `flags.ts` reads it;
    otherwise leave `coopkit=1`.
11. **Header comment** (lines 1-11): one clause each for the long pawn throw (a site throw, tallow-fixes A24, TD-b) and
    the A30 bulkhead lines.

## Checks (cloud: no e2e, no GPU, no npm run check)
- `node --check scripts/e2e-sectorops-wharf.mjs`
- `npx eslint scripts/e2e-sectorops-wharf.mjs` (if the repo's eslint config skips `scripts/`, say so)
- `npm run typecheck:fast` (no `src/` change: a base sanity check)
- `npx vitest run tests/tallowWharf/_e8spots.test.ts --maxWorkers=2`, then delete the file
- `npx vitest run tests/tallowWharf/ tests/throwSites.test.ts --maxWorkers=2` (the base's map tests: green before you
  start; a red one is a base problem, report it, do not fix it)
- Pending PC run (the lead requests it on PR G2's head): laptop `e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl
  e2e-sectorops:mission e2e-coop e2e-netmove` + the affected set. Done on the laptop when both wharf suites are green,
  the pawn line prints `lastThrowDist 5.8` and the two A30 lines print.
- **Laptop hold (lead ruling ~09:05):** no `e2e-sectorops:wharf-tgc` / `:wharf-tkl` set is queued on any PR G2 head
  until PR T (with TD-b) and E8 are both merged into it. Before that the wharf suites fail by design: the old
  `useBolt(1, 3)` hits the wrong door after A29 and the pawn throw is refused without TD-b. Wasted laptop time.

## Done
- Checks green; the diff is the one script; no SKIP line changed; every step above done or reported.
- Commits on feature/tallow-e8 prefixed `tallow E8:`, trailer "Co-Authored-By: Claude Opus 5.5
  <noreply@anthropic.com>"; `git add scripts/e2e-sectorops-wharf.mjs` only, never `-A`. Never merge, rebase,
  force-push, or push to feature/tallow-fixes-2 or feature/mission-engine.
- Size: about 90 changed lines, 1.5 h.

## Report (append below, then set line 1 to `status: done feature/tallow-e8 <sha>`)
Commits; the gate check results (step 1, with the triage head found); the pawn site as read (x, z, dx, dz, dist); the
bolt indexes found (W2 pawn door, W3 foot); the spot-audit table (point, clear or moved, by how much); whether step 9 and
step 10 were done; check results; every deviation with its reason; "pending PC run" with the suite list.
