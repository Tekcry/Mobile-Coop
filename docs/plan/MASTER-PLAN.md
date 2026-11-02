# Night Shift - master plan (phases and gates)
Owner: the orchestrator. Status: current (planning run 2026-11-02; re-planned at every gate).

From master brief section 7, adapted to what the planning run found in the code, the docs and the research. Each phase:
goal, work, deliverables, exit gate (measurable), not allowed yet. Estimates in sessions come after Phase 2 gives a
real pace; each gate re-estimates. The live state is the control panel issue; open decisions are in
`DECISIONS-QUEUE.md`, risks in `RISKS.md`, scope in `SCOPE.md`.

## Phase 0 - Clean-up (done 2026-11-02)
Stages A-J merged (#728-#731, #734-#747, #750), the co-op relay fix (#748, Phase 2 item 1 done early), the diagnostics
log (#749), branch purge (N14). Playthrough bugs are in `docs/backlog.md` item 32, tagged to phases below.

## Phase 1 - Vision lock and foundation decisions (docs only)
- **Settled in the planning run (2026-11-02):** D1 provisional, D11, D13 provisional, D14, D15a, P1 (done), P3, P6,
  P7 (N30-N37).
- **Work:** vision v3 from v2 plus the Steam release, Friend's Pass, local split-screen, the formula (brief section 3),
  the story-first rule (play wins a tie), music as identity, the reuse rule, the Target tier, same abilities (N34),
  Hitman-style interaction and staff (N37) and the Hazelight lessons (`docs/research/hazelight-2026-11/README.md`);
  the ending, both characters' arcs and the hints Mission 1 plants (N36); the short new `RULES.md` and
  `DECISIONS.md` (with N1-N37, D8, D20 and the C1-C19 results); `MISSION-TEMPLATE.md` replacing the level standard
  and map spec (needs Michael's approval, CLAUDE.md); a "superseded" note atop each stale research and level doc, and
  the reference-game names redacted from the research notes (G6); a "Made in the repo" section in the credits files
  (P2).
- **Decisions in the vision v3 round:** D15b (sonic identity and 3 reference tracks), P4 (music as pillar 6 by name),
  the ending candidate.
- **Exit:** Michael approves vision v3 and the scope tiers in one native question round.
- **Not allowed yet:** code, art, music.

## Phase 2 - Technical foundation spike ("can we ship this?"), time-boxed
- **Before it starts:** kill criteria with real numbers, agreed with Michael (for example: stay on Babylon if
  split-screen holds 60 fps at the target preset on a mid-range PC and a Friend's Pass build joins a full-game host
  across two networks; otherwise the Godot option comes back to him with a cost estimate).
- **Work:** (1) internet co-op: done in Phase 0; add short-lived relay logins before release (D22). (2) Transport: the
  interface exists (`src/net/transport.ts`, Trystero and same-device transports); add an in-page loopback for
  split-screen. (3) Electron build in CI, a Playwright smoke test inside it, saves through a Platform layer.
  (4) Steamworks proof on Valve's test app 480 (pick the binding: the maintained steamworks.js fork or
  steamworks-ffi-node): init, overlay with launch flags, an achievement, a cloud save. (4b) Friend's Pass proof: a
  join-only, no-achievements build joins a full-game host over the internet. (5) Split-screen proof in the Test
  Chamber: two viewports, two pads, per-player HUD, frame time; also the cost of a small partner view online (D7). (6) Performance proof: realistic light count, 2
  players, Electron, WebGL2 (WebGPU for comparison), mid-range and lowest supported PC, Steam Deck if one is available.
  (7) Draft the email to Valve about the Demo-type Friend's Pass app and its fee (Michael sends it).
- **Decisions:** D1 final, D2, D3, D4, D6; D5 email sent.
- **Exit:** the kill criteria pass, each proof has a written result with numbers.
- **Not allowed yet:** new gameplay features.

## Phase 3 - Core feel ("the first 30 seconds")
- **Work (Test Chamber only):** movement and camera sign-off on the Mixamo character (fixes the Mixamo-on test
  failures and the joining side's broken partner animations); light readability (picture lifted, meter and guards
  agree); night vision toned down; guard perception fixed so hiding works and guards search the last place they saw
  you; level bounds; prop pushing per frame (backlog 33). A "stealth gym" of 4-6 tiny rooms: dark lane, lit pool with
  a switch, one patrolling guard, one stationary guard, a noisy floor, a door.
- **Decisions:** D27 (thermal through doors), D28 (wall lean-out, turn-and-aim from a wall), D29 (thermal palette).
- **Exit:** Michael and his partner play the gym and tick `FEEL-CHECKLIST.md`; no unexplained detection in 20 minutes.
- **Not allowed yet:** mission content, art beyond the greybox standard.

## Phase 4 - Co-op toolkit ("the first 3 minutes")
- **Work:** the minimum co-op loop as Test Chamber gym rooms, one move per room, greybox only (`SCOPE.md` Must list);
  the ledge relay reaching 4.5 m (C8); pings, compass bar, partner state readouts (downed impossible to miss);
  checkpoints and the rating skeleton; gear choice with EMP back in the list, the grenade and sticky cam fixed; local
  split-screen made real (D6) and the online layout decided (D7); the adaptive music system tuned with placeholder
  stems (brief 11.1); context actions and world tricks (N37) as gym rooms; the "both ready" ring for two-person actions.
- **Each move passes:** fun twice, multi-use, readable with pings only, swap (`PLAYTEST-KIT.md`). Cut or park a move
  that fails twice; expect to cut about a quarter.
- **Decisions:** D7, D9, D10, D26.
- **Exit:** the kept move list signed off by Michael; the cut list recorded with reasons.

## Phase 5 - Mission framework and tools
- **Work:** D18 on code evidence (Sector Ops engine about 5,850 lines vs course engine about 5,550), then remove the
  unused engine and Tallow Wharf (its failing tests go with it); mission data (3-5 steps, objective chain with intel
  used, optional objective, up to 2 signposted rules, checkpoints, both-player extraction, percent rating); level
  tools (D19); the validator keeps only checks that catch real problems; playtest telemetry to a local file;
  unarmed staff with routines and reactions, and overheard conversations that open opportunities (N37).
- **Decisions:** D18, D19, D25.
- **Exit:** a dummy 3-room mission runs start to finish with rating, checkpoints and telemetry.

## Phase 6 - Marlow Yard prologue rebuild
- Teaches each kept team move on its own, in a fixed order, each step leaning more on the partner; the weak final
  section redesigned. Paper first (beat chart, top-down plan), Michael's one-click sign-off, greybox, pair tests.
- **Exit:** a fresh pair finishes it without help in the target time and can name every move.

## Phase 7 - Mission 1 vertical slice (the go / no-go)
- The `MISSION-TEMPLATE.md` pipeline; at least 3 playtest rounds; then a lighting pass, a first art pass on Mission 1
  only, a sound pass, banter and the music direction test (two generated directions, blind playtest, Michael picks).
- **Exit (all, measured):** 3+ fresh pairs finish in 20-30 min with nobody idle over 60 s; every detection explainable;
  fun 4/5 or better per area and an unprompted retell; no stall over 2 minutes; a Friend's Pass build joins a
  full-game host by room code across two networks; performance budget met in Electron; the cost of Mission 1 recorded.
- **Decisions:** D12, D13 final, D15 pick, D16, D30. If it fails: iterate or cut scope; no production on a slice that is
  not fun.

## Phase 8 - Steam presence (right after the slice passes)
- Steamworks account, fees, tax and bank details (researched then, Australian rules); the game app and the Friend's
  Pass app (once Valve confirms D5); store page "Coming Soon" with art from in-game renders, a trailer from the slice,
  the AI disclosure; Steam Playtest for outside pairs. **Decisions:** D23, D24 before the page goes live.

## Phase 9 - Production (missions 2 to N)
- One mission at a time through the template; paper and greybox of mission N+1 may overlap art of mission N, never
  more. At most one new mission toy per mission, used 3+ times. Re-plan the campaign size at the halfway point.

## Phase 10 - Content complete, beta and polish
- Full campaign playable; Steam Playtest pairs; accessibility and options (D17); glyphs and remapping; performance on
  the minimum spec and the Deck; achievements, cloud saves, rich presence; localisation decided with costs; the release
  relay (D22); the Mixamo terms re-checked.

## Phase 11 - Demo, Next Fest and launch
- Demo build (likely Marlow Yard and part of Mission 1), Next Fest if the timing works, launch build, checklist,
  day-one patch plan.

## Phase 12 - After launch
- Fixes and quality patches; parked ideas reconsidered only when sales and reviews say so.
