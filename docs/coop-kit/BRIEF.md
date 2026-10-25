# coop-kit: brief
Owner: Night Shift | Player Build. Status: current (job doc; archived by `Job-done: coop-kit`).

Lead: Night Shift | Player Build. Started: 2026-10-25 ~18:20. Base: master 2148ec969. Job: FOLDED-PLAN J24 (co-op kit:
shoulder stand, rope descent; conformance P R32, P R34), widened at ~18:10 by the lead's note to the five moves Michael
added to the kit (below). Planner: Opus 5.5.

## Michael said
- 2026-10-17 (LEVEL-06, G57): "Ladder reaches 4.5 m"
- 2026-10-18 (relayed from the main session, G180): "Pure ct, if it had it, we will use it."
- 2026-10-18 (chat, G151): "Anywhere with room"
- 2026-10-20 13:30 (G210): "the ct movement is getting worse. Can you ignore CT movement references."
- 2026-10-22 ~10:40 (N0 answers, G243): "Research what is believable and realistic. Can I fine tune the whole animation
  speed in anim tuner?"
- 2026-10-24 ~22:50 (G293, with the kit pick below): "If it's ready before I'm awake, continue to make progress" and
  "Any other creative coop ideas"
- 2026-10-25 ~16:50 (folded plan Q39, partner animation over the network): "yes players must look exact in everyones
  games"

## Michael picked
- 2026-10-24 ~22:50 (native multiple choice, G293) the campaign co-op traversal kit: "boost up a wall, throw over a gap,
  human ladder / pull-up, hold a shutter or door, rope brace / descent, vent unlock for the partner" (as recorded in
  `docs/DECISIONS.md` G293 and bible 5.9 C4).
- 2026-10-25 ~17:00 Q: the folded conformance plan -> picked: "Sign off, start (Recommended)" (ROADMAP Decided).
- 2026-10-25 ~18:05 Q: "Do any proposed moves join the kit now?" (`docs/missions/prototypes/coop-kit/SIGNOFF.md` on
  origin/feature/mission-framework, PR #372) -> all five join: "Deadweight,Drop Catch,Chimney Pair,Swing Pass" and
  Plank Bridge "Add it" (as recorded in ROADMAP Decided on origin/feature/menu, ~18:05).

## Goal
Part 1: two players can do the CT shoulder stand (one stands on the partner's shoulders to reach a 4.5 m lip, or stays
up and aims the pistol) and can rappel down the two-person rope as well as climb it. Part 2: Deadweight, Drop Catch,
Chimney Pair, Swing Pass and Plank Bridge are playable kit moves. Every move ships dark behind its flag id, with both
players' poses exact on both screens (Q39) and a look video, and switches on when Michael accepts it on a walk.

## Limits
- Out of scope: map placement of the moves (Tallow Wharf uses only the six approved moves; Marlow Yard's teaching sets
  are Marlow's J14 re-plan); the level validator's code (`scripts/level-validate.mjs`, Marlow Build); the pull-up and
  shutter poses Player owes Marlow (resume-ct-core: pull and shutter clips): this job only names the files it shares
  with them; the ledge relay's reach (A5); guard reactions beyond naming the hooks Guard AI owns (Plank Bridge, a lifted
  grate).
- Rules that hold: CLAUDE.md hard rules (no static `src/net` import, hot paths allocate nothing, `hyp2` / `hyp3`, flags
  for unfinished work); G57 (one 4.3-4.5 m band for boost and human ladder), G151 (anywhere with room, a prompt naming
  the move), G180 (pure CT mechanics), G210 / bible 5.12 (real-world trained-operator animation, the 5.12.2 realism
  standard, paired moves within 3 cm at contact on host and client), G243 (real-world research sets timings; per-clip
  speed slider in the tuner), G10 (numbers are starting values), Q39 (partner animation exact on every page), bible 5.9
  C3-C4, level-design 11.8-11.9 and 12.
- `docs/design/scale-sheet.md` and `docs/level-design.md` are Marlow Build's and change only with Michael's approval:
  the rope descent line follows G293 (approved), the human-ladder reach lines follow G57 (approved) as a 12.1 engine-fact
  change; Marlow Build reviews both in the PRs that ship the code (PLAN slices A1, B1).
- Areas touched and their unwalked count: Player / animation 3 (AT CAP: AF0-AF6, optic cable partner view, client body
  carry; CONFORMANCE section 3). Everything here ships dark; switch-on waits for Michael's walk (G288, G355).

## Answers (M) and assumptions (A)
- M1 2026-10-25 ~18:05: the five proposed kit moves join the kit (Michael picked, above).
- A1: The "human ladder" of G57 and bible 5.9 C3 is CT's shoulder stand (`docs/ct-research/levels-digest.md:41`: one
  stands on the partner's shoulders to reach a high point; the rider can use weapons), a separate move from the ledge
  relay (bible C3 lists both; the relay keeps wire kind `ladder`, `src/game/teamMoves.ts:11`). Mission-engine
  `docs/missions/PLAN.md` row 106 maps the human ladder to the relay: the orchestrator fixes that row (R32). Undo: drop
  slices B1 / B2.
- A2: One reach number (G57 "one band"): the stand reaches a lip whose grip is at most `TEAM.boostMax` 4.5 m over the
  base's floor; `TEAM.ladderGrab` (4.1, read by nothing on master) is deleted rather than raised. The last 0.8 m comes
  from the base pressing the rider's feet up from the shoulders (the real-world two-person wall assist), starting values
  from the B2 research (G10, G243). Undo: restore `ladderGrab` as its own constant.
- A3: The stand is a free move (G151) like the leg-up: a standing player facing a wall within `TEAM.standWall` (~0.9 m)
  offers it with the Co-op action; CT's authored-spot rule (levels-digest :46) yields to G151. Undo: offer only at map
  marks.
- A4: The rider on the shoulders may aim and fire the pistol (CT; bible line 512 "human ladder top"; the host already
  allows it: `hostHandsFree` treats `stacked` sub 1 as free, `src/net/validate.ts:242`). Undo: keep the rider's hands
  busy in `gameState.ts` and `validate.ts`.
- A5: `TEAM.relayMax` stays 4.6. It measures the hanging partner's feet over the climber's floor
  (`teamMoves.ts:63-64`; `tests/animStudio2.test.ts:376` subtracts `LEDGE.minDrop`), not a lip, so capping it at 4.5 (the
  R32 fix column) would not bring the relay into G57's lip band and G57 does not name the relay. Scale sheet line 56
  calls it a lip height: reported to Marlow Build to reword, not edited here. Undo: set `relayMax` 4.5 in slice B1.
- A6: Rope descent uses today's rope offer (a standing player facing a drop, `teamController.ts:772-801`). A partner
  standing beside the holder (same floor +-0.4 m, within `TEAM.ropeReach`) takes it to rappel down; one at the foot still
  climbs. The host tells the two apart by height on the existing `tmove` / `tstart` kind `rope`: no wire shape change.
  Reaching the floor with the stick down ends it (the holder is freed by the existing `tend` `drop`). Undo: drop A1 / A2.
- A7: CT's holder steers the rope sideways (levels-digest :40); G180 keeps it, so it is a later small slice A3 after the
  descent, not dropped. Undo: drop A3.
- A8: One list flag `kitMoves` (`?kitmoves=stand,descent,...`; `all` = every id), default empty; each move id switches
  on alone when Michael accepts its walk item (the walk cap counts moves, not the kit). Campaign's `coopKit`
  (`?coopkit=1`, pull-up and shutter, on origin/feature/mission-engine-flg-gb6) stays Campaign's; the orchestrator may
  fold it into `kitMoves`. Undo: one boolean flag per move.
- A9: Animation follows the real-world technique of trained operators (G210), researched with sources written into each
  animation slice's report (G243 style); timings never under bible 5.12.2 minimums; each move gets tuner rows
  (`src/anim/moveTune.ts`) so Michael can tune it. No CT footage is traced.
- A10: The stand's wire: one new `tmove` / `tstart` kind `stand`; MoveState reuses the existing `stacked` mode (sub 1 =
  rider on top, sub 2 = base; `src/player/moveState.ts:46-50`, `:456-458`), so remotes pose from MoveState and the train
  bumps `PROTOCOL_VERSION`. Undo: revert B1's protocol lines.
- A11: Part 2 moves plug into Campaign's kit registry (`src/game/kit/registry.ts`, one file per move, wire kinds through
  `TEAM_KINDS`) once Campaign's mission-engine kit PR (KIT0 + NET) is on master; none starts before it. Undo: build them
  on the built-in rail as part 1.
- A12: Michael's 18:05 pick adds the five moves to the kit list of level-design 11.9 and the scale sheet's kit bands;
  each part 2 PR carries its band row and graph kind as doc lines for Marlow Build's review, and Marlow's validator slice
  adds the kinds to `scripts/level-validate.mjs`. Undo: drop the doc lines; the moves stay off maps.
- A13: The game has no fall damage (`teamMoves.ts:294`), so Drop Catch's gain is the silent, roll-free landing from above
  the hard-landing band (the SIGNOFF row: "The landing is silent"). Undo: add fall harm in a separate job (a Michael
  question).

## Questions for Michael (one click each, asked by day)
- none (no assumption above loosens a Michael-only rule).

## Sign-off needed
no (no map or layout; each animation PR carries a 1-2 min look video and every move switches on only at his walk).
