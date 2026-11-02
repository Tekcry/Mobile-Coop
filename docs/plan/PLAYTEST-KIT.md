# Night Shift - playtest kit
Owner: the orchestrator. Status: current.

How every playtest runs, from the Phase 3 gym to the Steam Playtest (master brief section 9, with the measures from
`docs/ct-research/levels-digest.md` and `docs/level-design.md` that still hold). Testers show where the design fails;
they do not set the vision.

## Who
- **Michael and his partner:** every build that changes play.
- **Fresh pairs:** people who have never played that mission. A pair is "fresh" once per mission. At least 3 fresh
  pairs per gate (Phase 6 prologue, Phase 7 slice). Recruit early.
- **Steam Playtest pairs:** from Phase 8.

## Before the session (the orchestrator gives Michael this list each time)
1. Both players open the build named in the walk-through; the main menu shows the same version label for both.
2. Host and join by room code; both note the connection readout (direct, via relay, failed).
3. Recording on both screens (OBS or similar), voice only if both agree.
4. One observer per pair if possible (Michael, when he is not playing). The observer has this sheet.
5. Say nothing about how to play. Answer only "the game will tell you".

## During: observer sheet (one row per area; print or copy into a note)

| Area | Minutes in it | Longest idle, P1 / P2 (s) | Detections (explained? Y/N each) | "Where do we go?" moments (count, longest) | Talks + pings (count) | Laughs / "wow" | Moves that failed, and why | Fun 1-5, P1 / P2 |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |
| | | | | | | | | |
| | | | | | | | | |

Also note: moments one player did nothing because the other was busy; partner lost or separated; a downed partner
missed; anything the players said out loud about the story or the characters.

## After the session (5 questions, each player separately, then together)
1. What was the best moment? (Retell test: can they tell it without prompting?)
2. What was the most confusing moment?
3. When did you wait for your partner?
4. Fun 1-5 for each area.
5. What would you cut?

Then save the files: both recordings, the diagnostics log from each player (Main menu or Pause > Feedback >
Diagnostics log > Copy log), and the telemetry file once Phase 5 builds it.

## Gym tests (Phase 3 feel, Phase 4 co-op moves)
Per move or per gym room, measure and record:
- **Fun twice:** still fun the second time.
- **Multi-use:** 2+ purposes shown in the room.
- **Readable:** a new pair works it out with pings only, no voice.
- **Swap:** either player can start it.
- Failed handshakes per move; sync attempts per success; idle seconds per beat (target under 30 s in a gym room).
- Test every two-person action on pad and on keyboard and mouse.
- Partner colours told apart at about 20 m in the darkest spot; a revive works on every co-op surface; a guard who
  sees one player does not know where the other is.

## Red flags (any one means the area goes into the next fix round)
- Anyone idle more than 60 s.
- A "where do we go?" stall longer than 2 minutes.
- A detection the players cannot explain afterwards.
- An area cleared in silence (no talk, no pings): the co-op is not working there.
- An unearned alert (guards bumping into each other, a guard seeing through cover).
- From telemetry (Phase 5 on): one route used in over 80% of runs; median time over 2x the beat chart.
- A move nobody uses, or a move one player can do alone where two were meant.

## Acting on results
- Fix the top 3 issues per round, then test again. A blocker is fixed whatever its rank.
- Never redesign from one pair's opinion alone unless it is a blocker.
- Expect completion time to drop by a third to a half as a pair learns a mission; a careful pair takes about 2.5-5x a
  perfect run.
- Each round's results go in one short note in the mission's folder; the top 3 go on the control panel.
