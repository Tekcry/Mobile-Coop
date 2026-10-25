# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-25 ~19:15 SAVE (5-hour 94% at 19:13, ~2%/min: 100% ~19:17; resets 23:20. Weekly 81%). Plain English, brief dot points.**
- Account swap at 18:30: all 7 sessions up (4 desktop leads started by the orchestrator once Michael typed in the desktop app: starts are refused over Remote Control, STATE "Known").
- CPU: desktop still ~100% (desktop e2e Chrome, Defender, Plex scanner). Hold PARTLY lifted 18:40: each lead max 2 builder agents, tsc / single vitest only, no Blender / build / hand e2e. Lift fully when CPU < 80%; Michael told Plex pause and a Defender exclusion for C:/NightShift would help (his call).
- Trains: train 97 green 43/43 (4.103.2 releasing). Train-ready labelled: #432, #436, #437, #443. #372 mission framework: big-pr added (checker PASS ab90a071), train-ready after its CI. #445 Test Runner J20 PR-C (checker PASS). #446 Guard AI J6 hot-path (2 checkers running). #442 J2 fold: checker FIX; orchestrator fix agent running (relaunch from feature/fold-j2 head if no PASS: it must also fold Decided "Near-instant map loads", "Mixamo", "Free assets" incl. the CLAUDE.md "No external art" rewrite). #317 coop4 conflicts (hand-merge in train per Guard AI notes). auto-train had two gh TLS timeouts ~18:46-18:50 (network blip; recovered).
- New Michael decisions today ~18:50-19:05 (ROADMAP Decided): near-instant loads (map-ready, Sector Ops); Mixamo allowed; free assets with commercial licences allowed (CC0, CC-BY credited, royalty-free like Mixamo); Michael pre-approves every Mixamo clip Player Build asks for (STATE "How Michael works"): the orchestrator downloads them in the browser pane (Michael signed in to Mixamo there) into C:/NightShift/scratch/mixamo/clips/ (pane saves as *.tmp in C:/Users/Micha/Downloads; rename on move).
- Mixamo: 21 clips downloaded and checked (Wren's Mixamo auto-rig, not Y Bot); Player Build job mixamo-retarget (feature/mixamo-retarget) starts its first slice. Wren exports for Michael: C:/NightShift/scratch/mixamo/Wren-for-Mixamo.fbx and Wren-hero-coloured-for-Mixamo.fbx.
- Owed to Michael: Marlow Yard re-plan one click (J14, origin/feature/marlow-replan docs/marlow-replan/REPLAN.md 252db7e49; asked at 19:15, fill "Michael's pick" there and tell Marlow Build); Sector Ops loading-wait question (45 s assumed); guard model look picks (#375).
- Ordering: J15 guard-rules PR1 (Guard AI) before Sector Ops J17 edits to campusS4Data.ts / campusS5Data.ts. Marlow shield-led alarm team DROPPED (J15 A14).
- Running orchestrator agents: J2 fold fix agent (above). Cron recreated each boot from STATE "Cron prompt".
