# sector-batch - brief

Owner: Night Shift | Sector Ops Build. Status: current.

Job lead: Night Shift | Sector Ops Build. Branch `feature/sector-batch` in `C:/NightShift/Mobile-Coop-sector-batch`,
from origin/master b81c4945 (train 96). FOLDED-PLAN (origin/feature/menu `docs/orchestrator/FOLDED-PLAN.md:179`) job
J18, "Sector Ops batch: stars fill lower (row 12), Perfect label, menu stars, solo-route data check, door light at 15%,
visual-gate fixes, warehouseOps S3 crawl duct". Sources: Sector Ops CONFORMANCE M7 M12 M15-M17 L15 L18 V13-V15 V17
(`docs/conformance-sector-ops/CONFORMANCE.md:121-155`), Guard AI B10 (`docs/conformance-guard-ai/CONFORMANCE.md:60`),
Player R20 (`docs/conformance-player/CONFORMANCE.md:59`). Depended on J1 (PR #433, `feature/sector-ops-docs`): merged
in train 99 (origin/master 01aa415c).
Gate: affected-e2e + checker. Question: Q20 (answered). Sector Ops is at the walk cap (3 unwalked): new player-facing
behaviour builds dark behind a flag; rule fixes to shipped features ship as fixes (G355; RULES "Walk pacing").

## The ask
1. Stars: a clear on a harder tier fills every easier star too (M7, B10; ROADMAP row 12 then, G331). Today
   `markCompletedIn` adds only the cleared tier (`src/save/sectorRecord.ts:52-58`) and `starsOf` reads it as is
   (`:67-71`): a Perfectionist clear shows one star, not four.
2. Perfect: the Sector Ops result shows "Perfect" when the run had no kill and no alarm (M15, G146). Today the only top
   label is Ghost (no kills, never spotted: `src/game/sectors.ts:861-866`; banner `src/game/modes/sectorMode.ts:1011`).
3. Main-menu stars: the counter beside Sector Ops reads the old map (`starsFor('warehouseOps')`, `src/main.ts:164-166`)
   and its line says "the Warehouse in sections" (`:257`). It shows Saltmarsh Park's (M16).
4. Solo-route data check: a test that every Saltmarsh Park section with team doors keeps a declared route past them
   that no team door blocks (M17, G280). Today `checkSectors` checks a bolt's side and a pair gate's switches only
   (`src/game/sectors.ts:548-571`); `SectorRoute` has no solo mark (`:73-78`).
5. Door light at 15%: one door threshold for light (L15, G41). Most of G41's 15% is built: a stick-driven door under
   `DOOR.driveShut` 0.15 keeps `open` 0, shut to the body, light and sight (`src/world/doors.ts:51-53`, `drive()` :253;
   `docs/systems/ai.md:11-13`, `docs/systems/movement.md:30`), and a peek crack never moves `open`
   (`tests/doors.test.ts:23-31`). Left: the light field's own cut for a swinging leaf, `DOOR_SHUT` 0.05
   (`src/world/lightField.ts:29`), read by the field (`:443`), the bake's shut flags (`src/world/bakedLamps.ts:584`) and
   the torch shadow set (`src/world/torchShadowSet.ts:191`). At 0.15 it changes only the first 5-15% of an ordinary open
   or close (about a tenth of a second) and makes the two thresholds one number.
6. Downed with nobody to revive (M12, Q20): after 30 s the player is out and waits for the next section door; the team
   plays on. Today an operator out restarts the section for everyone (`src/net/coopHost.ts:571-581` ->
   `src/game/modes/sectorMode.ts:1333-1338`).
7. Visual-gate fixes (V13, V14, V15, V17) and the fog re-shoot (L18), inside the visual-gate job (origin/feature/visual-gate
   07eefea0, not on master): the so-corner rig misses the F5b wedge (`scripts/visual-gate/viewpoints.mjs:671-693`);
   campus views have no `wall` region (`:256-452`); the recorded baseline is an error run (visual-baselines f3682c92);
   the gate runs over its 180 s target (VG7 196.1 / 176.9 / 183.2 s); the campus fog fix has no GPU after-shots
   (`docs/sector-redesign/checks/fog-triage.md:52` "Findings: pending").
8. warehouseOps S3 crawl duct (P R20): dropped. Michael froze the old map (Q26) and no recorded word of his unfreezes it
   (A22).

Not in this job: guard sight and sound through a door at 15% (G41's other two thirds: Guard AI, `src/ai/doorGate.ts`,
J15; A10); dog kills counting as kills (J15, guard-rules); the bible 5.9 C6 / level-design 9.4 text for Q20 (the J2
fold, #442 G385, and Marlow Build for level-design); parity cards at Low and per campus section in a required suite
(V3, V4, Q27: J11); the F5b haze fix itself (polish list, lr16-8 triage A3); the campus greybox v2 data (J17, which
calls this job's solo-route check from its own lanes).

## Michael said (verbatim)
- G331 (2026-10-25 ~09:45, ROADMAP "Decided", level-design framework (1)): "Fixed difficulties per op, keep star
  system. Completing a higher difficulty also considers the lower tiers completed also."
- G146 (2026-10-18, D-23 research, R-15): "No kills + no alarms + all primary objectives."
- Q20 (2026-10-25 ~16:50, folded plan, the other 30): "30 seconds then death and wait until next section door"
  (folded as G385 on feature/fold-j2, PR #442).
- G280 (2026-10-23 ~00:45): "true 2-player pathways that cannot be used solo, but doesnt break solo play".
- G41 (2026-10-17, STEALTH-02): "Close behind them" (the decision carries "one 15% threshold for light, sound and
  sight").
- G316 (2026-10-23 ~18:08-18:20): "Must be realistic depiction of light." and "Also, there was still guards torches
  showing through walls/doors, and their torches also need to be diffused and not so sharp."
- G355 (2026-10-25, walk cap): "What do you recommend? All current maps/features should be revised once documentation
  work has been completed".

## Michael picked
- Q26 old warehouse map (2026-10-25 ~16:50): "Freeze it" (no more work on warehouseOps; G390 on #442).
- Q27 meter against picture (~16:50): "Yes, every release (Recommended)" (G391 on #442).
- Q28 look baseline (~16:50): "Me, with your OK (Recommended)" (the orchestrator accepts a deliberate look change only
  with Michael's sign-off on record; G391).
- Q9 dog kill (~16:40): "Kill + lose score (Recommended)" (J15 makes a dead dog a kill, so Perfect goes with it).
- G355 walk cap: "Yes (Recommended)" (the cap limits switch-on only; rule fixes to shipped features are allowed).

## Rules this job answers to
VISION 4 rule 1 (light parity: one door threshold for the field, the bake and the torch set), rule 3 (a perfect rating
is always possible); VISION 2 Sector Ops row (stars, a higher clear fills the lower; revive syringes, no lives); G188,
G280, G331, G146, G41, G385; RULES "Walk pacing", "A job" (Opus writes `src/net` code; two Opus checkers on a
`src/net` PR); CLAUDE.md flags (unfinished work dark in `src/core/flags.ts`), hot paths (nothing allocated per tick).

## Assumed decisions (G358 "Assume and log")
- A1 Walk cap. Stars fill, Perfect, the menu stars and door light at 15% ship live as rule fixes to shipped features
  (G355). The out-and-wait rule (ask 6) is a new co-op play state and builds dark behind `flags.sectorOutWait`
  (`?sectoroutwait=1`), owner Night Shift | Sector Ops Build, switch-on at Michael's next co-op Sector Ops walk (target
  2026-10-28). Undo: put a fix behind a flag, or default the flag on.
- A2 Stars are derived on read: `starsOf` fills every tier up to the hardest one in `done`. `done` and the best times
  stay as cleared (a Perfectionist clear records a Perfectionist time only). Old saves get the fill; no save shape
  change, no `SAVE_VERSION` bump. The co-op client, the op list (`missionsScreen.ts:100`) and the lobby row
  (`coopUi.ts:612`) all read `starsOf`, so no `src/net` edit. Undo: the old `starsOf` body.
- A3 Perfect = no lethal kill on the run's line (knock-outs are not kills, A4 of feature/sector-ops; a dead dog counts
  once J15 lands) and the run's alarm stage still 0 at the extraction (`SectorRun.alarm`; a section restart puts it
  back to the section's start, as built); every primary objective = the op is complete (the line is shown only at the
  extraction). Kills stay on the line through a restart, so a kill in a restarted attempt still costs Perfect. Undo:
  derive Perfect from every section's marks (`NO_KILLS | NO_ALARMS`).
- A4 Display: the line reads "... Spotted 0  ·  PERFECT  ·  GHOST" (each when earned); the extraction banner's subtitle
  is "PERFECT", "GHOST" or "PERFECT  ·  GHOST"; the briefing adds "No kills and no alarm: Perfect."; no score bonus for
  Perfect (Ghost keeps +2000). The co-op client gets the host's line and banner as now. Undo: the strings.
- A5 The main-menu counter shows Saltmarsh Park's stars (`campusOps`, the Sector Ops map, G328), not the best op's; the
  line reads "Saltmarsh Park in sections". Undo: `'warehouseOps'` and the old line at `src/main.ts:164`, `:257`.
- A6 The solo-route check is geometric over the data as it is: a section with team doors (pair gates, bolts) passes when
  at least one of its declared routes has no leg crossing a team door's leaf (found through the map's door anchors,
  widened 0.3 m each side, at the leaf's floor). No `solo: true` mark is added, so no map data file changes (J17's P0
  splits `campusSectors.ts`). A plain bolt counts as a team door. Undo: add the mark to `SectorRoute` and require it.
- A7 The check is a new pure module and a campusOps-only test; it is not wired into `checkSectors` (warehouseOps is
  frozen, and `sectors.ts:548-571` is also edited by guard-rules). J17's v2 lanes call the same function. Undo: one
  `out.push(...)` line in `checkSectors` once warehouseOps passes or is skipped there.
- A8 If a live Saltmarsh Park section fails the check, the builder stops and reports; the lead sends it to the
  orchestrator as a G280 break (a route or data fix belongs to J17 or its own fix PR). No data edit in this job.
- A9 The check does not judge co-op traversal moves on a route (routes do not mark them); the LD 11.6 lip tests
  (`tests/helpers/soloJumpReach.ts`) and J17's lane tests cover those.
- A10 Door light only: `DOOR_SHUT` becomes 0.15 for the light field, the bake's shut flags and the torch shadow set
  (one constant, so the meter, the picture and the torch light agree), equal to `DOOR.driveShut` (a test pins them).
  The peek crack and the stick-driven door already keep `open` 0 and are unchanged. The only part of G41 not at 15%,
  sent to the orchestrator for Guard AI (J15): guard sight and the hearing wall ray hit the door's collision body
  (`SIGHT` / `HEARING` include `G.STATIC`, the door's membership: `src/physics/groups.ts:35-37`, `:61-62`), which goes
  at the first frame of an ordinary open (`Doors.open`, `src/world/doors.ts:224`), so on a hand or guard open sight and
  sound pass from 0%, not 15%. `DOOR_GATE.pass` 0.5 (`src/ai/doorGate.ts`) is a guard walking through, not sight, and
  stays. The thermal ghost's "fully shut" (`src/vfx/thermalGhost.ts:24`, a vision effect) is unchanged. The docs that
  call the light cut 0.05 or the 15% "not built" are corrected in the same slice: `docs/systems/lighting.md:26-27`,
  `docs/systems/ai.md:12-13`, `docs/systems/world-and-characters.md:41-47`, and `docs/level-design.md:351-352` (an
  engine fact in Section 12: CLAUDE.md has the code change update it and list the map decisions that relied on it; the
  list goes to Marlow Build). Undo: 0.05 and the old doc lines.
- A11 No GPU look run and no walk item for the door change: only the first 15% of an ordinary swing changes (about a
  tenth of a second of a hand or guard open or close); a crack and a stick-driven door were already dark, and the
  gate's door rigs shoot shut doors. Undo: a rig run with the leaf at 0.1.
- A12 Q20 as built (G385): a downed player not revived within 30 s (`REVIVE_WINDOW`, unchanged) or with no syringe left
  is out; the team plays on; when the connector's cycle completes (its far door unlocks) every out player comes back on
  the connector's checkpoint slots. Everyone else down, or solo, restarts the section as now (G188). Undo: flag off.
- A13 With the flag, an out player is not counted at the connector or the extraction (A20 of feature/sector-ops keeps
  counting a downed player whose window runs). In the last section an out player stays out and the extraction ends the
  op without him. Undo: count him (the team could not leave without him: the bug A20 guards against).
- A14 Coming back at the door costs no syringe and no revive count. A player still downed (window running) outside the
  connector when its cycle completes also comes back there; his window stops. Undo: leave him (A20 already stops the
  cycle while he is down outside, so this case needs him inside or out).
- A15 The out player's HUD reads "OUT - wait for the checkpoint" on the host and the client (the connector is the next
  checkpoint); the camera stays where it is. A spectator view of the team goes on the polish list. Undo: the text.
- A16 Three PRs: PR A `feature/sector-batch` (slices B1-B2, fixes, one checker), PR B `feature/sector-batch-out`
  (slice B4, `src/net`: two Opus checkers and the co-op suites), so the net review never holds the fixes, and PR C
  `feature/sector-batch-light` (slice B3, A23, one checker). The last of the three to land carries
  `Job-done: sector-batch`. Undo: one PR.
- A17 B4 is built by Opus (RULES "A job": Opus writes `src/net` code) from a strict brief like the Sonnet ones.
- A18 The visual-gate fixes are a slice of the visual-gate job: branch `feature/sector-batch-vg` cut from
  origin/feature/visual-gate, merged back by the lead, landing with that job's stacked PRs (its A33), not in PR A or B.
  V13 re-places the so-corner leak quad onto the haze wedge seen in new PNGs (F5b stays `known`, unfixed); P7 must
  then read red. V14 adds a `wall` region to one view per campus section (bounds null until VG8). V15 is one more full
  `--rules-only --record` run on master. L18 is P1 (v4.96.0 vs v4.97.0) plus a master shoot of the three F8 views,
  written into fog-triage "Findings"; Marlow's floods stay Marlow Build's call.
- A19 V15's accept: G391 (Q28) asks Michael's OK on record for a deliberate look change. The initial baseline is not a
  look change, so the orchestrator accepts it as "initial" (visual-gate A9) and logs it for Michael's next look. Undo:
  remove the accept record on `visual-baselines`.
- A20 V17: if the V15 record run's wall time is over 180 s, the PLAN 7 ladder step that keeps every F-target view and
  every parity card is applied (the other campus views trimmed to one per section); moving parity into a separate
  required suite is J11's (V3, V4, Q27). Undo: restore the views.
- A21 The so-corner rig stands on warehouseOps: a test reading the frozen map is not work on it (Q26 holds).
- A22 The warehouseOps S3 crawl duct (P R20, `src/world/maps/warehouseS3.ts:355-378`) is dropped by Q26 "Freeze it".
  Undo: if Michael unfreezes the map, a duct job (crouch-walk or a short end), Sector Ops.
- A23 (plan check 1) B3 is cut from origin/master, not from `feature/sector-batch` (b81c4945), and is its own PR C: on
  b81c4945 the G41 bullet `docs/systems/lighting.md:26-27` sits right above the G45 bullet that #433 changed on master
  (:28-31, train 99), and a branch from b81c4945 that edits :26-27 conflicts with master (checked with
  `git merge-file`). The other PR A files have no master change next to B1 / B2's lines. Undo: B3 back into PR A once
  `feature/sector-batch` is cut again from a master that has #433.
