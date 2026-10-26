# piano-knife: state
Owner: Night Shift | Player Build. Status: current.

## Resume
- Job: knife kill animations (paired, Michael ~19:45) + intro pose for the piano escape scene (ROADMAP Now row 20, main
  focus). Player's part only; Campaign (`feature/piano-escape`) owns scene, map `thornbeckMill`, intro camera, music, EMP,
  the `pianoEscape` flag and the scene switch in `src/game/pianoScene.ts`.
- Branch `feature/piano-knife` in `C:/NightShift/Mobile-Coop-piano-knife`, base master 1b58989ed.
- Docs: `BRIEF.md` (Michael's words, picks, A1-A15), `PLAN.md` (today with file:line, design, claims, slices, PB map,
  Campaign answered), `S1-BRIEF.md` (the next slice, full), `CLIP-LIST.md` (6 Mixamo downloads; 2 in, 4 coming),
  this file.
- Phase: plan fix round 1 applied (plan check FIX, 8 items + polish; Campaign answers; paired kill). No code.
- Slices: S1 paired knife kill core on stand-ins (Opus ~1200, two Opus checkers) | S3 co-op (Opus
  ~800, two Opus checkers, after #599) | S2 real clips + CMU 18-23 check (Opus ~450, after the Mixamo sign-in) | S4a
  empty-pistol slide (Sonnet ~200 + Blender GLB) | S4b intro pose (Opus ~400). Old S5 dropped (no ledges); no slash (Michael ~20:05); palm strike off in the scene from S1.
- Campaign blockers: PB1 + PB5 (S1) and PB4 (S3) block Campaign S4, so S1 then S3 first.
- Can start now: S1 and S4a (2 builders). Blocked: S3 on S1 and #599; S2 on Michael's Mixamo sign-in and S1; S4b on
  S4a.
- Every `src/game` / `src/player` slice: the lead requests `e2e-coop` + `e2e-netmove` as the checker gate.
- Briefs one slice ahead only (ROADMAP Decided ~19:22): S3's full brief is written when S1 is in review.
- Key pointers: `src/game/takedownController.ts:227` (start), `:670-723` (run), `:727` (frameUpdate), `:761-794`
  (grab hands IK), `:812-846` (finish), `:57-82` (`TakedownVictim`); menu `src/game/gameState.ts:1518-1525`; graph hook
  `src/anim/animGraph.ts:2119`; studio pair precedent `src/game/studioStage.ts:515-540`; victim `src/ai/enemy.ts:835`;
  co-op `src/net/coopClient.ts:208-210, :508, :1188-1200`, `src/net/coopHost.ts:888-937` (noise :933), `:1752`,
  `src/player/moveState.ts:65-67`.

## For the orchestrator
- Mixamo: the 6 CLIP-LIST clips (Horizontal dropped): 2 in, the rest coming; nothing before S2 waits on them.
- To Campaign: timings (BRIEF A15), the `setKnifeScene` call for `pianoScene.ts` (PLAN 2.1), the co-op split (PLAN 3).

Next: the orchestrator passes the fix round to the plan checker (or signs off); then the lead starts S1 (from
`S1-BRIEF.md`) and S4a in parallel.

## Done
- 2026-10-26: BRIEF, PLAN, CLIP-LIST, STATE written (Opus planner).
- 2026-10-26: plan fix round 1 (Opus fixer): check items 1-8 + polish, Campaign answers, paired kill, S1-BRIEF.
- 2026-10-26 ~20:15 (Campaign, Michael): map is now `thornbeckMill` (Thornbeck Mill, timber grain mill, thunderstorm);
  knife and night vision only; 12-16 guards sweeping in PAIRS, paired knife kills on the sweeping pairs (S3 double kill
  matters more); gantries / ladders may add a rail-side kill or a crouched kill behind grain sacks: approach list
  follows Michael's approval of Campaign's new page.
- 2026-10-26 ~22:00 (S2, Opus builder, parts A + B on `feature/piano-knife-s2`): real Mixamo knife pairs wired (six
  clips in `clips/mixamo/piano/`, CMU 18-23: no fit); each row plays its attacker clip's window at natural speed; one
  fit run + one focused try; KNOWN_MISS 5.5-9.7 cm on all rows, corner grip / guard left palm ~17 cm over the 10 cm
  ceiling (lead's call). Timings for Campaign: contact 1.05 s, limp 1.57 s, free 1.87 s from the press. Report
  `C:/NightShift/scratch/ctcore/pk-s2-REPORT.md`; no PR.
