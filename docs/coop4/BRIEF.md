# coop4 - Sector Ops up to 4 co-op players (Marlow Yard stays 2)

Job lead: coop4 (new lead). Branch `feature/coop4`, worktree `C:/NightShift/Mobile-Coop-coop4`, cut from master a10382bc (4.89.x, `PROTOCOL_VERSION` 49). Plan: `docs/coop4/PLAN.md`. Guard AI side: `docs/coop4/briefs/AI.md` (Guard AI Build, branch `feature/guard-ai-coop4`).

## The ask (Michael's words)
- 2026-10-23 ~10:25: "make a note to increase sector ops to 4 player coop after the redesigned map is completed. marlow yard stays at 2." (ROADMAP "Waiting / decided" line 77.)
- Roadmap entry (ROADMAP lines 50-52, "Next: Sector Ops 4-player co-op"): Sector Ops up to 4 co-op players; Marlow Yard stays 2; net layer to N clients (per-client ids, join / rejoin, protocol bump), the single-partner code to teammates (team moves, revive, HUD markers, light sync, objectives, restarts), Sector Ops team doors / guard counts / alarms rebalanced for 3-4, 4-browser co-op suites on the laptop. Overturns G2 / G50 for Sector Ops only.
- 2026-10-24 ~15:10 (via the orchestrator): "if you ever run out of tasks, start making progress on the next feature/task."
- G280 (team doors, Michael 2026-10-23 ~00:45): "true 2-player pathways that cannot be used solo, but doesnt break solo play". Kept as is: a team door still needs 2 players working together, any 2 of the team.

## Goal
A Sector Ops op (both Sector Ops maps: `campusOps`, `warehouseOps`) is playable end to end by 1, 2, 3 or 4 players on the existing host-authoritative co-op, with join, leave, late join and rejoin in any slot, every co-op system working for any pair of teammates, and the sections tuned for 3-4. Marlow Yard (Course mode, `ctcourse`) stays exactly 2 players and behaves exactly as today.

## Limits
- Sector Ops only. Course mode (Marlow Yard, the campaign) keeps `COURSE_MAX` 2, P1 / P2, its HUD table and results; no file in `src/game/course/`, `src/game/modes/courseMode.ts` or `src/world/maps/ctcourse*` changes (every checker greps the diff).
- Prototype first (CLAUDE.md "Current goal"): the basics to play and test 3-4; no feel tuning, no new art. Cosmetic gaps go on the polish list in `docs/coop4/STATE.md`.
- Host-authoritative, no host migration, no dedicated server, no runtime network dependency beyond today's (Trystero / Nostr signalling, `?net=local` for tests).
- Single player never imports `src/net` statically; the new slot model lives in `src/game/playerSlots.ts` (pure, Babylon-free, net-free).
- A wire change does not bump `PROTOCOL_VERSION` by hand: the train build bumps it once; tests read the constant.
- Guard AI (perception, intruder slots, hearing, radio, response teams over N players) is Guard AI Build's slice in `src/ai` only (brief `docs/coop4/briefs/AI.md`); no other coop4 slice edits `src/ai`. Sector Ops numbers (how many guards, syringes, reinforcements) stay coop4's; Guard AI gives the hook and a default.
- No spectator camera, no new team moves, no 3- or 4-person devices.
- Gates met (orchestrator 2026-10-24): sector-redesign (campus) merged, campus detail art merged (#226), guard-ai chain landed.

## Decisions G2 / G48 / G50 after this job
- G2 (2-player campaign) kept: the campaign (Marlow Yard) is exactly 2 players.
- G50 (2 players maximum) overturned for Sector Ops only (Michael 2026-10-23 ~10:25); kept for the campaign. New G entry at the merge (orchestrator).
- G48 (no bot partner) kept everywhere.
- Docs to update at the merge: CLAUDE.md line 8, `docs/systems/coop.md` lines 6-7 and 29-32, bible 5.9 (co-op player count), `docs/DECISIONS.md` (new G).

## Questions for Michael (M)
Only one real gap; the job carries on with the default.

- **M1. One operator out at 3-4 players.** Today an operator who goes down with no syringe left, or whose 30 s revive window runs out, restarts the whole section for everyone (`SectorMode.onPlayerOut`, sectorMode.ts:1323). With 4 players this restarts three players for one player's loss. Options: (a) keep the rule: one out restarts the section; (b) the out player waits until the team reaches the next connector, then comes back at that checkpoint; the section restarts only when everyone is down or out. **Default if unanswered: (a)**, no new code. (b) is about half a day: an out state, a follow camera on a teammate, return at the next checkpoint.
  - **ANSWERED (Michael 2026-10-24 ~15:35, via the orchestrator): "Wait for connector" = (b).** At 3-4 players an operator who is out waits (follow view on a teammate) and comes back at the next connector checkpoint; the section restarts only when every connected operator is down or out. At 1-2 players the rule is unchanged (one out restarts the section). Slice OUT in PLAN. New G entry at the merge.

## Assumed decisions (A) with how to undo
- **A1. Cap.** Sector Ops takes up to 4 players on both maps (`SECTOR_MAX` 4, `capacity('sector')`); Course stays `COURSE_MAX` 2; the legacy modes stay `COOP_MAX` 4. Undo: `SECTOR_MAX = 2`.
- **A2. Team size 1-4.** Solo Sector Ops stays playable (G280); 2, 3 and 4 all start from the lobby. Undo: none needed.
- **A3. Team doors and pair devices stay two-person.** Pair bolts, pair gates, scanner pairs and pair plates need 2 different players, any 2 of the team (the code already takes any mate). No 3- or 4-person devices. Undo: none (new devices would be map data later).
- **A4. Revive.** Any teammate revives a downed player (the existing `revive-<id>` item). The syringe pool is per team: preset + 1 per player beyond 2 (rookie 3/4/5, normal 2/3/4, realistic and perfectionist 1/2/3), counted from the team size when the op starts; a late joiner does not change it. Undo: `SECTOR.syringeExtra = 0`.
- **A5. Operator out.** Superseded by M1 (b): at 3-4 players the out operator waits and returns at the next connector; 1-2 players unchanged. Undo: `SECTOR.outWaitsMin = 99` (the team size from which an out operator waits).
- **A6. Everyone down** restarts the section at its checkpoint (unchanged).
- **A7. Connector and extraction.** Every connected player, downed ones included, must be inside to cycle (A20 of sector-ops, unchanged, now over N). A held (dropped) player does not count and does not block. Undo: none.
- **A8. Guard counts.** The placed guard lists stay as they are. Map data may tag up to 2 extra guards per section `minPlayers: 3` or `4` (`SquadSlot.minPlayers`), spawned only when the team size at the section's load is at least that. They are drawn from posts the team doors and split routes make too easy with 4. Undo: remove the tags (or `flags.sectorGuards`).
- **A9. Alarms.** `alarmMax` 3 is unchanged. Reinforcements per stage = the section's `perStage` + 1 per player beyond 2, within `SECTOR.maxAlive` 32 and `MAX_ENEMIES` 32. How they search comes from Guard AI's response-team hook. Undo: `SECTOR.reinforcePerExtra = 0`.
- **A10. Team size for scaling.** The players in the session (connected plus held) when a section loads, or restarts. A late joiner counts from the next section load. Undo: none.
- **A11. Jammer.** Each player has their own pistol jammer (5 s use, 5 s cooldown, stand-still rule). Up to 4 jams run at once; the wire carries one entry per slot. Undo: none.
- **A12. Crates.** Each player uses each crate once (the ledger is already per id). Undo: none.
- **A13. Section rating.** Marks and grants stay per team. A synced takedown is two takedowns by two different players within `SYNC_WINDOW`, any pair; a third in the window starts a new pair. `SYNCED_PAID_MAX` is unchanged. Undo: none.
- **A14. Spawns.** Slot 0 (host) stands on the area's point; slots 1-3 take the first free ring spot beside it (`besideSpot`: right, left, back, ...; 0.9 m apart, open line, on a floor). No new map data; `start2` / `checkpoint2` stay slot 1 only. Undo: add per-slot points later.
- **A15. Teammate markers.** The CT partner beacon (G135) is slot 0 blue, slot 1 red (unchanged), slot 2 amber, slot 3 violet. The goggle glow keeps `GOGGLE_COLOURS` by slot (green, cyan, magenta, warm white). Minimap ally dots take the beacon colour. Pings keep the player's tag colour. No name plates (not CT). Undo: the `BEACON` table.
- **A16. No free spectator.** A downed player keeps their own view as now; an OUT player (M1 b) gets a follow view on a living teammate (cycle with the existing switch-target input), no free camera. Undo: none.
- **A17. Late join.** A player may join a running op into any free slot (as for 2 today): the match loads, the host places them at the current checkpoint on their slot (`joinSpawn`), or beside the host during a connector cycle or extraction, with the section's loadout. Undo: refuse joins while `phase === 'playing'` for `sector`.
- **A18. Rejoin.** A dropped player's slot, colour and place are held for `REJOIN_HOLD_S` (600 s). Their rejoin token takes them back. A tokenless hello in a full room with two or more slots held is refused ("Room is full"). Undo: none.
- **A19. Slot rules.** The host is slot 0. A joiner gets the lowest free slot. Slots never move during a match. At each match start the host compacts them (lowest free, in the current order), so a Campaign match always has slots 0 and 1. Undo: none.
- **A20. Team moves.** Pairs only, any two players. A player offering (braced, holding a rope, hang-down, throw, relay) serves one partner at a time: the host denies a second claimant with `taken`. Two pairs may run moves at the same time. Undo: none.
- **A21. Watching another pair's team move.** A third player sees the pair posed from the wire (the climber from its phase, the holder in the offer pose; hands may not meet). Visual only, on the polish list; slice T1 is optional after the playtest. Undo: T1.
- **A22. Friendly fire** stays off in Sector Ops (course only, unchanged).
- **A23. Wording.** One-to-one lines keep "partner" (a move or a door has one partner). The lobby and room texts say "players" / "teammates", with the mode's cap. Undo: strings.
- **A24. Topology and bandwidth.** Logically a star through the host: clients send only to the host (`toHost`); Trystero's full-mesh signalling stays (client-to-client channels carry only presence). The host sends one broadcast snapshot at 15 Hz to every client, with no per-client deltas or interest filtering at 4. Estimate at 4 players and 24-32 guards: about 3.5-4.5 KB per snapshot, about 55-70 KB/s per client, about 1.3-1.7 Mbit/s host upload in total, plus item and lamp bursts every 2 s. Undo: per-client interest filtering if the N1 measurement fails its budget.
- **A25. Guard AI.** Perception, intruders and hunting over 4 players are Guard AI Build's (`docs/coop4/briefs/AI.md`). coop4 provides the player list (`TeamRef`: slot 0-3 and MoveState) and calls its team-size hook. Undo: none.
- **A26. Tests.** "4-browser" means four pages of one headless browser over `?net=local` (`hostAndJoin(url, 4)`), on the laptop GPU queue. These are new parts 7-8 of `e2e-sectorops` (the suite that owns the area) and a lobby block in `e2e-coop`. Undo: none.
- **A27. Marlow Yard untouched.** Zero diff in course files. Shared code (`ctDevices.ts`, `sectionRating.ts`, protocol) keeps the course's 2-slot output identical, and `e2e-ctcourse` / `e2e-course` / `e2e-section-rating` run on every slice that touches shared code. Undo: none.

## Risks
- Marlow Yard: shared `CtDevices` (the jam wire), `SyncedDetector` (courseMarks) and the lobby. These are guarded by A27, unit tests that pin the 2-slot output, and the course suites.
- Laptop load: 4 Sector Ops pages in one browser take several minutes to load. The 4-page parts run in a slot alone with `E2E_LOAD_MS=240000`.
- Hot files shared with other jobs: `gameState.ts` (every job), `characterRig.ts` (Player Build rig-pose-audit), campus map files. The hunks are small; conflicts are resolved in the train.
- Render cost: 4 operators on screen plus extra guards (A8) against the 24-guard budget (guard-render). A8 caps the extra guards at 2 per section; the GPU check is in the test plan.
