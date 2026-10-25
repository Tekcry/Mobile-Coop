# Account handoff

Rules (docs/RULES.md on origin/master, "Swaps and context"): Michael swaps at 100% of whichever meter caps first.
At ~92% the orchestrator refreshes the block below (replace it, do not stack blocks) and gives Michael only the
orchestrator boot line (PROMPTS.md section 1). Every save prints that boot line, even when no swap is planned (Michael
2026-10-24 ~23:20, after an unplanned swap left him without it). Each save block lists the running orchestrator checkers
and fix agents; the next orchestrator relaunches them first. At 100% with all saved: "Safe to log out of the desktop and
laptop". In the new account the orchestrator prints every other boot line (PROMPTS.md) in one message. Older blocks, the
retired account ledger and the old per-session prompts: archive/HANDOFF-history.md.

## State at the switch
**2026-10-25 ~20:30 SAVE (5-hour 85% at 20:28, ~1.8%/min: 100% ~20:36; resets 00:40. Weekly 14%). Plain English, brief dot points.**
- Account swap at ~19:40 went fine: orchestrator re-booted; 4 desktop leads + Cloud Builder 1 started by the orchestrator; Michael pasted Test Runner and Guard AI on the laptop.
- TOP PRIORITY (Michael ~20:10): "getting new mixamo animations in so I can fine tune". Player Build: all 21 clips dumped and adapted onto Wren (feature/mixamo-retarget); M3 / M4 / M5 builders + checker running; ONE PR with all clips tunable in Anim Studio (in-game dark behind `mixamo`). big-pr approved by the orchestrator ~20:50 (~4k counted lines): label the PR `big-pr` if Player Build could not. ETA (after a spine bone-map fix round) PR ~21:40, train-ready ~22:40. Test Runner re-files its laptop requests first in line. HOLD: Guard AI files no new alone runs until the orchestrator sends "Mixamo laptop run done, re-file your alone runs" (ROADMAP "Hold to release"; send it the moment the verdict posts, or at the latest when this is read if the PR has its verdict).
- Mixamo fast-track is a by-hand re-file on the laptop-queue branch (Test Runner SAVE 55, feature/flake-fix c13c1af15): if no Test Runner is up when the Mixamo PR requests land (~21:15), the orchestrator does the re-file per SAVE 55.
- Laptop SSH link set up (STATE "Known"): next swap, start Guard AI and Test Runner yourself (start_session target ssh) once Michael has added the SSH connection in the desktop app; else print their boot lines.
- Trains: train 99 released (green 43/43); train 100 (#451) in laptop tests. #442 J2 fold: merged with master, CLAUDE.md free-assets rule rewritten (G407), checker PASS on 001e5fcd, train-ready labelled 20:29. #438 Guard AI G327: checker posted by the orchestrator. Post statuses / labels as LONE commands (STATE "Known").
- Michael decisions this window (all in ROADMAP Decided, all relayed): Marlow re-plan "Approve as drawn" (REPLAN "Michael's pick" filled); map-ready "keep costly parts" + 20 s load cap; relay lip 4.6 m; Teale KO restarts section; Marlow 12 guards + 1.4 m chimney; Tallow throw gaps "mix" + night-lit rooms; one lamp datasheet download OK.
- OPEN question from Michael (~20:28, unanswered): "Will it be faster/more efficient if we focus on one level build at a time? ... what's the eta if we focus fully on [Marlow Yard] vs parallel?" Marlow Build ETAs (20:45): as now walk-ready 10-28 (kit stations live 10-30/31); Marlow first on laptop queue + CPU + co-op kit right after Mixamo: walk-ready 10-27 evening (kit stations 10-29); the laptop e2e queue is the main limit. Next orchestrator: read Marlow's numbers, answer him with native multiple choice (focus Marlow vs keep parallel).
- CPU: desktop ~100% all window (leads' builders, desktop e2e worker, Defender ~20%); Michael told the Defender exclusion / Plex pause would help (his call).
- Owed to Michael: guard model look picks (#375); Sector Ops J10 datasheet licence (one click): the RAB ALEDS3T datasheet terms bar commercial use of the file; OK to use only 5 ground-brightness numbers (0/3/6/9/12 m) from it, file never shipped or committed ("Yes, numbers only (Recommended)" / "No, find a fully free one")? J10 carries on with the estimate meanwhile; relay the answer to Sector Ops. Plain folder C:/NightShift/Mobile-Coop was on feature/operators; put back on master 20:30.
- Running orchestrator agents: none. One-shot cron 22:33 (release Guard AI hold) dies with this session: re-check it at boot.
