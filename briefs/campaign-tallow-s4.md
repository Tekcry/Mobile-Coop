status: open

# campaign J9 S4: the wharf e2e walks both shutters (Sonnet 5.5)

RELEASED 2026-10-26 ~19:20 by the lead: base is engine member (d) with S3 merged in (the engine now reaches master as
4 stacked members, BRIEF A29; feature/tallow-shutters is retired). The members were cut from the engine, so E8's commit
subject is not in `git log`; its content is (check `boltAt`).
Gate (all must be in your base; step 1 checks them):
1. **S3** (origin/feature/tallow-s3, the map places both shutters) merged into feature/mission-d-wharf (merge 0adfd8dee), on top of S1, S2,
   S2 fix1 and S1's late hunks A and B (all in (d)).
2. **E8** (origin/feature/tallow-e8) in your base: its content is in (d) (cut from the engine after PR G2). E8 edits the same script: you build on E8's version and keep every E8 line (the
   site throw, `boltAt`, the A30 lines, the R8 polish). E8 leaves the three shutter `SKIP` lines for you.
3. **J7 PR F** and the wharf triage fix are in the engine (E8's own gate), so in your base.
The kit flag is `coopKit` (`?coopkit=1`; lead ruling ~09:50: no kitMoves fold for Campaign): the URLs keep `coopkit=1`.
Base: origin/feature/mission-d-wharf at sha `0adfd8deef75efb251ae9eef0b9f270554bef01b`. New branch: feature/tallow-s4 (the lead merges it into
feature/mission-d-wharf, PR #583). Lead: Night Shift | Campaign Build. Read `git show origin/master:docs/systems/agent-preamble.md`
("Cloud sessions" replaces the folder rules) and the code hard rules in `git show origin/master:CLAUDE.md` first.
Cloud: skip the desktop worktree path and its guard; guard on the branch name only (`test "$(git rev-parse --abbrev-ref
HEAD)" = feature/tallow-s4`) before every commit, per agent-preamble "Cloud sessions". The CPU wait rule does not apply in
the cloud. Cloud builders cannot run the e2e: you change the script, prove every scripted spot clear in the built map
(step 9), and the lead runs the laptop suites. Plan: `docs/missions/slices/J8-J9-PLAN.md` on the engine: section 6 row S4
and "S4 e2e", A15, A18, A27, section 10 "J9 gate"; `docs/tallowWharf-map/SPEC.md` rows C2 / C8 (`:303`, `:308`, `:361`,
`:366`) and `:334` (TGC never needs shed two's shutter). This brief wins where they differ.

## Only these files
- `scripts/e2e-sectorops-wharf.mjs`.
- A temporary audit test (step 9) you run and delete; never committed.
Not yours: every `src/` file, every map and test file, other `scripts/e2e-*.mjs`, `e2e-lib.mjs` / `e2e-net-lib.mjs`, the
changelog fragment (the lead's). If a step needs a `src/` change to pass, stop and report it.

## Why
The J9 gate: the e2e walks both shutters on both missions with real pad input (no SKIP, no teleport across a shutter),
the guard notice prints, and a section restart with a shutter held leaves both curtains shut with no lift run (A27). The
script today prints `SKIP: shutter ...` three times and teleports past both openings (lines below are on 0a5ef5e04,
blob d66abd21 = the engine's; E8 moves them, find by text): TGC W1 `:443`, TGC W4 `:554`, TKL W4 `:658`.

## Roles and geometry (read first; numbers from the base, confirm them)
- `src/game/kit/shutter.ts` (all): the holder stands `holdSpot` 0.45 off the plane, lift offered within `liftReach` 1.0,
  grip 0.4 s + lift 1.2 s to `shutterHold`; the crawler must be crouched, within `crawlReach` 1.0 of the plane, at least
  `laneMin` 0.6 along from the holder, ends `crawlOut` 0.7 past the plane; a holder's release waits while anyone is under.
  `shutterLocal(d, x, z)`: `across` = (x - d.x) sin yaw + (z - d.z) cos yaw (+ = the normal's side).
- W1 C2 `w1-shutter` (22, 0, 58), yaw 0: hall side z < 58 (across -), passage side z > 58. The hall back door
  `w1-hall-back` (30, 0, 58) is W1 bolt 1, unbolted from the passage side (`tallowWharfSectors.ts` `W1_BOLTS`).
- W4 C8 `w4-shutter` (92, 0, 28), yaw 0: shed two z < 28 (across -), the apron / back lane z > 28 (wall 0.6 thick).
- Roles (SPEC C2 / C8 "B holds, A crawls, then A lifts the bar for B"): the **client holds, the host crawls** in TGC W1
  and TKL W4 (the host page does items, so the host draws the W1 bar; in TKL the host is the jetty pull's holder after
  crawling through). TGC W4 (off TGC's route per SPEC `:334`, walked for gate coverage): after the objective the **host
  holds from shed two and the client crawls in from the apron**, so the pair leaves through shed two to the jetty.
- The co-op press is `RB` (`BTN.RB`); read in `src/game/gameState.ts` how `coopPressed` reaches
  `TeamController.fixedUpdate` (edge or level) and release the button as soon as the state leaves `'none'`.
- `src/world/shutterDoor.ts`: `world.shutters` (`ShutterDoors`; its private `slots` read at runtime as `.slots`:
  `spec.id`, `open`, `bottom`; `navClosures`); `world.lightDoors`. `src/game/stealthSystems.ts` `noticeOpenShutters` (which
  enemy fields it reads: position, yaw, `alerted`) and the fix1 look point; `src/ai/enemy.ts` `hear()` (`meter`,
  `stimulus[0..1]`, `hasStimulus`, `heard`).

## What to change
1. **Gate checks** (stop with `status: blocked <which>` if one fails): `grep -c
   "SKIP: shutter" scripts/e2e-sectorops-wharf.mjs` is 3; the script has `boltAt`; `grep -n "placeShutter(b, SHUTTER)"
   src/world/maps/tallowWharfW1.ts` and `grep -n "placeShutter(b, W4_SHUTTER)" src/world/maps/tallowWharfW4.ts`;
   `grep -n "resetKit" src/game/teamController.ts`; `grep -n "world.armDoors(this.nav)" src/game/gameState.ts`; `grep -n
   "coopKit" src/core/flags.ts` (if the flag is gone, stop: the lead re-rules the URL).
2. **Readers and helpers** (beside the existing ones, about 90 lines):
   - `shutterState(P, id)`: from page P, the device (`g.team.devices.list` entry with that id: `phase`, `open`, `user`,
     `visible`, `opens`, `noticed`) and the curtain slot (`world.shutters.slots`: `open`, `bottom`).
   - `side(id, x, z)`: the `across` of a point (sign and value) from the spec (`world.map` or the device's x / z / yaw).
   - `walkTo(P, x, z, what, timeout = 12000)`: pad walk on page P (copy the axis pattern of `scripts/e2e-move.mjs:172`):
     every ~100 ms set `cam.yaw` toward the target (yaw = atan2(dx, dz), the script's convention) with `__pad.axis(1, -1)`
     until within 0.35 m; always zero the axis in `finally`. The host must then see the client there (remote feet).
   - `loneWalk(id, x, z, yaw, what)`: the host alone placed at (x, z) facing the shutter, walks into it for 1.5 s sim
     (axis forward), axis zeroed; assert the host is grounded and still on his side with `|across| >= 0.2`; print
     `<what>: a lone player walking into the closed shutter stays on his side (across <v>)`.
   - `shutterCross(c)`: `c = { id, holder: 'client' | 'host', hold: [x, z, yaw], crawl: [x, z, yaw], during?: async fn }`.
     padReady both; place the holder at `hold` and the crawler at `crawl` (both on the near side: this placement is the
     only move before the crawl); the holder `holdUntil(RB, state === 'shutterOffer')`, then `until` its state is
     `'shutterHold'` (6 s); **both pages** show the device at its gap and the curtain open (`open >= 0.85`, slot `bottom
     >= 0.75`); `await c.during?.()` (the notice check); the crawler `crouch`es, `holdUntil(RB, state === 'crawlUnder')`,
     then `until` its state is `'none'` and its feet are on the far side with `|across| >= 0.5` (host reads; the client's
     own page for a client crawler too); the holder still on the near side; the holder lets go (`holdUntil(RB, state !==
     'shutterHold')`), then `until` both pages show phase `'closed'`, `open` 0, slot `open` 0 and `bottom` 0 (4 s). Print
     one line: `<id>: <holder> held, <crawler> crawled through (across <v>), both curtains at the gap then shut`.
   - `shuttersBack(what)` (A27 and the lead's P1 add): on both pages every shutter device phase `'closed'`, `open` 0, `user`
     `''`, `visible` false, slot `open` 0 / `bottom` 0, and `team.state === 'none'` (8 s wait); then for 3 s sim, sampled
     every 100 ms on the host: every shutter's `noticed === -1`, and no live guard has `heard` with his `stimulus` within
     1.5 m of a shutter's (x, z); record the host's largest shutter `open` in those 3 s and print it. Print `<what>: both
     curtains shut on host and client, no lift run, no guard noticed a shutter for 3 s (largest open seen <v>)`.
   - `noticeCheck(id, k, at)`: the live, not alerted guard of slot `k` of the live section (the first slot from `k` whose
     feet are within 1 m of the shutter's floor) is placed at `at` (`e.pos` x / z; keep his y), facing the shutter (the yaw
     field `noticeOpenShutters` reads), his `heard` false, `hasStimulus` false, `meter` 0; every other live guard within
     12 m (plan) of the shutter is turned to face directly away from it (the facing rule fails; nobody else can take the
     one notice per opening). Returns the guard's id. Guards stay frozen (the setup's `enemyMgr.update` stub); the notice
     runs in `stealth.fixedUpdate` on the host, which the setup does not stub.
3. **World wiring** (after `SEC = await readSectors()`; S1 check-a P1, left to this e2e): on the host `world.shutters` has
   2 slots with ids `['w1-shutter', 'w4-shutter']` and `navClosures.length` 2; on the client `navClosures.length` 0 (no
   grid on a client); on both pages `world.lightDoors.length === world.doors.list.length + 2` and two shutter devices.
   Print one line.
4. **TGC W1 (C2)**, replacing the `SKIP: shutter w1-shutter` line; the walk goes **after** `W1: the exit opens` and before
   `cross(0, 'W1 connector')` (the shutter is the section's forced exit, SPEC `:226`):
   - `loneWalk('w1-shutter', 22, 56.8, 0, 'W1 C2')`.
   - Notice: `g = await noticeCheck('w1-shutter', 0, [22, 53])` (4.6 m from the shutter, hall side: the -normal side,
     where the pre-fix look point was wrong); then 1.5 s sim with the shutter shut: the host device's `opens` unchanged and
     `noticed` -1.
   - `shutterCross({ id: 'w1-shutter', holder: 'client', hold: [21.2, 57.4, 0], crawl: [22.8, 57.3, 0], during })`, where
     `during` waits up to 4 s for the host device's `noticed === opens` and then asserts guard `g` has `heard` true, his
     `stimulus` within 0.05 m of (22, 57.4) (0.6 m off the plane on **his** side, S2 fix1) and `meter` > 0; print `W1
     notice: guard <id> heard the held shutter at (<x>, <z>), on his own side (hall); shut: no notice`.
   - The bar: `const bb = await boltAt(0, 30, 58)` (E8's reader), assert `bb.k === 1`, `useBolt(0, bb.k)` (the host is
     already in the passage; useBolt's spot is on the passage side, so no shutter is crossed), open the door on both pages
     (the E8 pawn-door lines' pattern), then the client walks through: `walkTo(B, 30, 56.8, ...)`, `walkTo(B, 30, 59.3,
     ...)` (step 9 proves the legs clear; add a waypoint if not).
   - Before `cross(0, ...)`: assert both players' feet z > 58.3 (the host by the crawl, the client by the door). Print
     `W1 C2: the host crawled, drew the bar, the client came through the back door; no teleport across the shutter`.
5. **TGC W2 (A27 cheap check):** right after `restarted(1, cp2, 'W2 protected restart', 1)` (keep E8's banner recount
   there), `await shuttersBack('TGC W2 restart')`.
6. **TGC W4 (C8)**, replacing the `SKIP: shutter w4-shutter` line: after `mirror('W4')` and before `extract(...)` (the
   objective is done in shed three; the host is on the shed side, the client on the apron): `shutterCross({ id:
   'w4-shutter', holder: 'host', hold: [91.2, 27.4, 0], crawl: [92.8, 28.7, PI] })` (the host's `moveHost` from shed three
   to shed two stays on the shed side, through the fire door's side of the wall). Assert both feet z < 27.9 before
   `extract`. Comment: off TGC's route (SPEC `:334`), walked so both shutters are walked on this mission.
7. **TKL W4 (C8 and the A27 restart)**, replacing the `SKIP: shutter w4-shutter` line, before the jetty pull:
   - `loneWalk('w4-shutter', 92, 29.4, PI, 'W4 C8')`.
   - **Held restart (A27):** the client lifts and holds (`hold: [91.2, 28.7, PI]`, until `'shutterHold'` and both pages at
     the gap; no crawl); the host kills a W4 guard with `down(0, false, 'W4 guard 0')` (No kills); `restarted(3,
     SEC[2].conn.cp, 'W4 rule restart (shutter held)', 2)` (TKL's W3 restart was the first); then `await
     shuttersBack('TKL W4 restart with the shutter held')`; `holdOver(...)`. Print `A27: the section restart dropped the
     held shutter on host and client and ended the hold`.
   - Notice: `g = await noticeCheck('w4-shutter', 0, [92, 23])` (shed two, the -normal side); the 1.5 s shut check.
   - `shutterCross({ id: 'w4-shutter', holder: 'client', hold: [91.2, 28.7, PI], crawl: [92.8, 28.8, PI], during })`, the
     `during` as W1's with the stimulus at (92, 27.4); print `W4 notice: ...` (shed two). Then the pull as today (the host
     on the jetty top came through shed two and its canal door; the client's canal-bed spot is not across a shutter).
8. **Header** (lines 1-11): the shutter clause becomes "the shutters are walked for real (J9 S4): a lone walk stopped,
   hold and crawl with pad input, the W1 bar drawn by the one through, a frozen guard's notice of a held shutter, and A27
   (a restart with the shutter held drops it on both pages)"; keep "guards are frozen" and add "the notice still runs".
9. **Spot audit (static, the only proof a cloud builder can give).** A temporary `tests/tallowWharf/_s4spots.test.ts`
   (run it, copy its printed table into the report, delete it before committing) using `builtWharf` / `solidOf` from
   `tests/tallowWharf/helpers.ts`: for each point, no collide box overlaps the standing body (radius 0.3, feet + 0.1 to
   + 1.7; for the crawl end, + 0.1 to + 0.8) and a walkable top lies within 0.3 m under the feet; for each walk leg, the
   body swept every 0.1 m is clear; for each guard sight line (eye feet + 1.6 to the look point (x, 0.45, z)), sampled
   every 0.05 m and stopped 0.3 m short, no collide box. Points: W1 lone start (22, 56.8); holder (21.2, 57.4); crawler
   (22.8, 57.3); crawl end (22.8, 58.7); guard (22, 53) and his line; the bar spot (30, 58.8); the walk legs (21.2, 57.55)
   -> (30, 56.8) -> (30, 59.3). W4: lone start (92, 29.4); lane holder (91.2, 28.7); lane crawler (92.8, 28.8); crawl end
   (92.8, 27.3); shed holder (91.2, 27.4); apron crawler (92.8, 28.7) and its end (92.8, 27.3); guard (92, 23) and his
   line. The curtains are physics bodies, not builder boxes, so the opening reads as air (that is right for the crawl). A
   point that fails (a G1 / G4 stack, desk or hide-spot box): move it to the nearest clear point within 0.5 m that keeps
   its purpose (holder within `liftReach`, crawler within `crawlReach` and 0.6 m along from the holder, guard within 9 m
   and facing), say so, rerun.

## If it fails on the laptop (for the triage agent; do not pre-empt in code)
- `shuttersBack` after the TKL held restart sees a notice or a guard heard at a shutter: likely **S1 late checker B
  polish P1**: after a team-rule restart the host's `syncShutters` (`shutter.ts:463-473`) follows the client's stale
  `MoveState` (still `brace` + SHUTTER_SUB) for about one network trip, so the shutter reopens and can be noticed. The
  "largest open seen" line shows it. A `src/` fix (the lead routes it), not a script change.
- The restart line fails on `phase === 'objective'` in W4: report the phase; the lead decides whether TKL W4's kill
  restart is legal there.
- The notice fails with another guard's stimulus set: a guard outside 12 m qualified; widen the turn-away radius.

## Checks (cloud: no e2e, no GPU, no npm run check)
- `node --check scripts/e2e-sectorops-wharf.mjs`
- `npx eslint scripts/e2e-sectorops-wharf.mjs` (if the repo's eslint config skips `scripts/`, say so)
- A dry read: walk the new TGC and TKL flows top to bottom against the base's code and list, per new assert, the field it
  reads and the file:line it comes from (the report's table); `grep -c "SKIP: shutter"` is 0; no `place(`, `moveHost(` or
  `moveClient(` puts a player on the far side of a shutter before that player crawled or came through the W1 door.
- `npm run typecheck:fast` (no `src/` change: a base sanity check)
- `npx vitest run tests/tallowWharf/_s4spots.test.ts --maxWorkers=2`, then delete the file
- `npx vitest run tests/tallowWharf/ tests/shutterWiring.test.ts tests/shutterNotice.test.ts --maxWorkers=2` (base
  sanity: green before you start; a red one is a base problem, report it, do not fix it)
- Pending PC run (the lead requests it on PR S's head): laptop `e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl
  e2e-sectorops:mission e2e-coop e2e-netmove e2e-ctcourse` + the affected set (plan section 8, PR S). Done on the laptop
  when both wharf suites are green with no SKIP, both notice lines, the A27 line and the `shuttersBack` lines print.

## Done
- Checks green; the diff is the one script; every E8 line kept; no SKIP left for a shutter; every step above done or
  reported.
- Commits on feature/tallow-s4 prefixed `tallow S4:`, trailer "Co-Authored-By: Claude Sonnet 5.5
  <noreply@anthropic.com>"; `git add scripts/e2e-sectorops-wharf.mjs` only, never `-A`. Never merge, rebase, force-push,
  or push to feature/mission-d-wharf or any other mission-* branch.
- Size: about 240 changed lines, 2.5 h.

## Report (append below, then set line 1 to `status: done feature/tallow-s4 <sha>`)
Commits; the gate check results; how `coopPressed` is read (edge or level) and how the script presses; the dry-read table
(assert, field, file:line); the spot-audit table (point, clear or moved, by how much); the enemy fields used for the
notice (position, yaw, `heard`, `stimulus`); check results; every deviation with its reason; "pending PC run" with the
suite list.

## Lead rulings (Campaign Build, 2026-10-26, before release)
1. Keep the W4 shutter walk on Three Grey Coats. The J9 gate says both shutters on both missions; SPEC :334 (Three Grey
   Coats never routes through it) stays true for play: label that walk a device check in the log line, not a route.
2. The W4 kill restart on Two-Key Ledger is legal: its rule is `noKills`, scope mission, and any kill restarts the
   current section at its checkpoint (two-key-ledger BEAT.md:13-18). Keep it as the A27 held-shutter restart.
3. Frozen guards are enough for the J9 gate ("the notice check prints"): assert the hear point is on the guard's own
   side. Whether he walks there is Guard AI's behaviour and its own suites.
