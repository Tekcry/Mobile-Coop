# J14 Marlow Yard re-plan - brief
Owner: Marlow Build. Status: current.

Plan only: `graph.json`, `replan-plan.svg`, `validate-run.txt`, `REPLAN.md` (Michael's one-click page), `STATE.md`. No
src, test, map, script or config change. The build job starts after Michael approves `REPLAN.md`.

## Michael said
All 2026-10-25, ROADMAP "Decided" on origin/feature/menu. These override every older rule.
- Q5 (~16:40), Marlow strict rules: "all are retries in marlow yard, as its a training exercise."
- Q6 (~16:40), campaign start: "coop lobby. Marlow Yard is mission 1, which is training"; then "Tallow stays Mission 1"
  (Marlow Yard is a Mission 0 / training prologue before it).
- Q11 (~16:50), Marlow guards: "Only the logical amount required to test the specific movement/game mechanic required.
  Doesn't necessarily always need a guard."
- Q24 (~16:50), Marlow side routes: "Close all side routes, force all sections. Only keep a side route when training
  against enemies later in the training, same design rules as a campaign mission area"
- Q25 (~16:50), shutter hold and vent unlock: "Wherever they slot into the training yard logically"
- Q29 (~16:50), co-op check: "marlow yard in particular is an isolated training level which forces training of each
  individual coop move and coop gameplay, and does not need the same checks"
- Co-op kit (~18:05): "Deadweight,Drop Catch,Chimney Pair,Swing Pass" and Plank Bridge "Add it" (all five join the kit,
  on top of G293's boost, throw, human ladder / pull-up, shutter / door hold, rope, vent unlock).
- Timed drills (~10:45): "Marlow can use timed drills, it must force players into situations as a way of training
  them."

## Michael picked
- Q2 (~16:40) dark spots from lights left off: "Never" (every light works; darkness only from cover, cut power and shot
  lamps).
- Q18 (~16:50) drill pointer: "Keep as built (Recommended)".
- ~11:55 (1) a failed Marlow timed drill: "Retry the drill only" (the drill resets in place, no checkpoint reload).
- ~11:55 (3) Marlow "later sections": "After every move taught" (the splits come once each kit move was taught alone).
- ~11:20 (3) Marlow downed: "Campaign rule" (30 s revive, at most twice, both down = checkpoint). Unchanged here.

## What the plan does (detail: graph.json, replan-plan.svg)
- One forced route through A1-A7: every side route closed. A8 is the one late area that keeps side routes, for training
  against guards (Q24).
- 16 lessons, each on its own, in order: boost, human ladder, shutter, timed light cut, plank bridge, vent unlock, jam
  relay, camera loop, deadweight, synced takedown, chimney pair, swing pass, throw, rope, hang-down, drop catch. Then
  A7 split paths with a synced hack and A8 the graduation (everything combined).
- Guards only where the lesson needs eyes or ears: A1 0, A2 1, A3 0 (one camera), A4 3, A5 1, A6 1, A7 1, A8 3 (10 in all; REPLAN's
  "12 in all" is a sum slip, the per-set counts are built: J14 PLAN A15).
- No strict rule and no send-back anywhere (Q5). A failed drill retries in place; spotted in A1-A7 retries that
  station; in A8 guards react as on a mission and being caught retries that step in place; downed is the campaign rule.
- Every light works (Q2); the plan re-lamps the A6 sump and the A8 vestibule.

## Assumptions (each with its undo)
- A1. Spotted in a teaching set (A1-A7) retries that station from its start mark, guards and devices reset (Q5 plus
  ~11:55 "Retry the drill only"). This replaces the built A2 "back to the start of the set" and the A3 camera's send-back
  to the west lobby. Undo: retry from the set's holding room instead (a constant per set).
- A2. In A8 the guards react as they would on a mission (suspicion, search, break line of sight, re-hide), because Q24
  says its side routes follow "the same design rules as a campaign mission area"; if the pair is caught, or a timed step
  runs out, that step retries in place (Q5 "all are retries"; REPLAN A8 row, as Michael approved it ~19:16). "Caught":
  J14 PLAN A14. Undo: A8 spotted = retry at once, like A1-A7.
- A3. The five new kit moves are not built yet. Their stations (5 plank, 9 deadweight, 11 chimney, 12 swing,
  16 drop catch) are built dark with each move and open when it ships; until then that station's crossing is a plain
  door. LOOSENS Q29 for that time (a move not yet built is not trained). Undo: hold the whole re-plan's switch-on until
  all five moves exist.
- A4. Where the five new moves go, by Q25's rule ("Wherever they slot into the training yard logically"): plank bridge
  over an open pit in the A2 carriage shed (the shunter notices a board left in the light), deadweight on a
  counterweighted lift grille in the A4 goods shed, chimney pair up a 1 m gap at the A5 substation's 6 m wall, swing
  pass over an open 3.5 m cable trench in A5 (too wide for the throw), drop catch into the A6 drive pit after the
  hang-down. Undo: move any station to another set; graph and SVG change only.
- A5. Human ladder and pull-up count as one kit move (G293 lists them as one, "human ladder / pull-up"); A1 teaches the
  ladder and has no separate pull-up station. LOOSENS Q29 if Michael counts them as two moves. Undo: add a pull-up
  station on A1's yard side.
- A6. Drop catch is forced by noise, not damage: the engine has no fall damage, only a loud heavy landing above 4.5 m
  (`src/player/movement.ts` LANDING, validator note). If a heavy landing does not alert the A6 attendant, the drop is not
  forced. Undo: the build job checks the noise first; if it is silent, the pit gets a rule (a heavy landing retries the
  station).
- A7. A8 keeps 3 guards (the training cap of 3 per set, level-design 4.9 [Training], and Q11) even though Q24 gives it
  campaign-area route rules. LOOSENS Q24 if "same design rules" was meant to include campaign guard counts. Undo: raise
  A8 to the campaign band once the set's cap is lifted (a Michael call).
- A8. With 18 stations the co-op run may pass the 15-20 min target (G272). Measured at the walk. Undo: shorten repeated
  steps (the A6 practised boost, the A8 board drill) before cutting a lesson.
- A9. The Training-profile text of PR #443 (one forced route, guards per move, no strict rule, no campaign co-op checks)
  is the standard here; #443 merged in 4.103.3 (master `docs/level-design.md:39-60`). Undo: none needed.
- A10. The five new moves have no validator kind yet; graph.json draws each with the nearest kind and a `move` field
  (validate-run.txt). Undo: when Marlow Build adds the kinds, swap them in; nothing else changes.
- A11. The A1 gate checker stays as a seated role-player who cannot see or hear (grab and questioning practice); he is
  not counted as a guard. Undo: remove him (A1 then has no person at all).
- A12. No shield-led alarm team in Marlow Yard (Guard AI J15 A14 dropped by Marlow Build ~19:10): guards are Normal,
  armed (G279, G298), only those each lesson needs (Q11), failures retry (Q5); a late enemy section teaching alarm
  response uses plain armed guards (campaign Q12 "armed only", Marlow = training prologue Q6). The 10 guards above are
  the whole count; no alarm team is added on top. Undo: Guard AI restores the team in Marlow's alarm config.
