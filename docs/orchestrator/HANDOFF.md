# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-26 ~14:10 SAVE (5-hour meter 77% at 14:09, ~1.9%/min: 92% ~14:17, 100% ~14:21; weekly 47%, resets 29 Oct. Boot: list_sessions + ListAgents FIRST; start only missing titles; switch every desktop session to bypassPermissions at boot (STATE "How Michael works").)**
- Releases: 4.111.0 (train 118) shipped ~13:59 after the lost-verdict stall (FIXES F1-F3). Train 119 (4.112.0, #536, head 91e62d45, 11 members: #481 #488 #489 #501 #505 #506 #507 #512 #513 #517 #519) CI + laptop running at the save.
- Train-ready not in 119: #521 (Campaign C1, missed by 27 s). Fixes waiting on laptop: #531 runner armed, #537 seeded guard timing (Guard AI), #494 Animation source, #457. Checker posted, waiting on affected / gates: #530 validator C (big-pr), #532 headset (Player), #518, #516, #514, #487, #317, #498, #522 (stacked on #521), Saltmarsh v2 stacks #523-#529 and #533-#535 (leads retarget each to master as its parent lands). S3 six-piece stack in checking (Sector Ops).
- Michael today: every dark feature flag ON in /preview/ (Now 0d, Player, cloud brief player-preview-flags, priority top; mixamo on too, the stored Animation source setting wins once #494 lands); fixes first (ROADMAP Decided 14:00); bypass permissions on all 7 sessions (he switched the laptop two himself).
- Fix tracker: docs/orchestrator/FIXES.md (F1-F26, cron reads it every run). Key: F1-F3 laptop-queue-8 Opus checker on e714c6e3 (PR after #507 merges); F4 e2e-pad is BROKEN since train 112 (not flaky), F5 netmove races: Player feature/player-flake-fix; F6 lightField + F8 J20 PR-B (prb2) building; F7 ctcourse Marlow (4 causes, triage done); laptop-queue-9 (F12 F16 F18-F20 F23) and -10 (F9-F11 F14 F15 F22 F24 F26) planning (Test Runner).
- Sessions at the save: Player, Marlow, Sector Ops, Campaign (desktop, bypass, started 13:23), Guard AI and Test Runner (laptop, bypass), Cloud Builders 1-3 (cloud; start more with repository "Tekcry/Mobile-Coop"). CPU hold RELEASED 14:09 ("go: start builders" sent, CPU 65%). Running orchestrator agents: none. Cron: 10-min check (session-only, recreate from STATE; it now reads FIXES.md).
- Walk card owed for 4.108.0-4.112.0 (Mixamo body carry, Campus per-section v2 switch, guard repeat alarms, robot pair, map-ready, pad hygiene): not written yet; write it after 4.112.0 ships, the preview now shows every dark feature once 0d lands.
