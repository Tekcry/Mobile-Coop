# piano-knife: state
Owner: Night Shift | Player Build. Status: current.

## Resume
- Job: knife kill animations + intro pose for the piano escape scene (ROADMAP Now row 20, main focus). Player's part
  only; Campaign (`feature/piano-escape`) owns scene, map, intro camera, music, EMP and the `pianoEscape` flag.
- Branch `feature/piano-knife` in `C:/NightShift/Mobile-Coop-piano-knife`, base master 1b58989ed.
- Docs: `BRIEF.md` (Michael's words, picks, A1-A13), `PLAN.md` (today with file:line, design, claims, slices, S1 full
  brief in section 5, Campaign needs in section 6), `CLIP-LIST.md` (7 Mixamo downloads), this file.
- Phase: plan written; not yet passed by a fresh Opus plan checker. No code.
- Slices: S1 knife kill core solo (Opus ~850) | S2 knife clips + contact measure (Opus ~450) | S3 co-op wire (Opus
  ~750, two Opus checkers) | S4a empty-pistol slide (Sonnet ~200 + Blender GLB) | S4b intro pose (Opus ~400) | S5 more
  approaches + RT knife slash (Opus ~700, two Opus checkers).
- Can start now without downloads or Campaign answers: S1 (placeholder clips: Cross Punch + Pro Rifle Pack deaths,
  `PIANO_MAP_ID` placeholder `'piano'`) and S4a.
- Blocked: S2 on CLIP-LIST K1 / V1-V3; S4b on I1 and S4a; S5 on S2, S3 and Campaign's approach list (PLAN Q-C4).
- Key pointers: `src/game/takedownController.ts:240-290` (start), `:670-760` (run), `:812-846` (finish); menu
  `src/game/gameState.ts:1518-1525`; graph hook `src/anim/animGraph.ts:2119`; studio pair precedent
  `src/game/studioStage.ts:515-540`; victim `src/ai/enemy.ts:835`; co-op `src/net/coopHost.ts:888-937, 1752`,
  `src/net/coopClient.ts:1188-1200`, `src/player/moveState.ts:65-67`.
- Open for Campaign (PLAN section 6): Q-C1 map id + start hook, Q-C2 flag name, Q-C3 guard count / types, Q-C4
  approach types, Q-C5 intro operators / wall spot / length / close-up, Q-C6 knife shown all scene or only in kills,
  Q-C7 "every guard down" rule and bodies.
- Gate rule (BRIEF A1): knife kills only when `pianoEscape` is on AND the map is the piano map; host refuses `td`
  kind `knife` otherwise; clips load only from `setKnifeScene(true)`.

Next: a fresh Opus plan checker reads BRIEF + PLAN; on PASS the orchestrator asks Michael to download CLIP-LIST and the lead starts S1 and S4a in parallel.

## Done
- 2026-10-26: BRIEF, PLAN, CLIP-LIST, STATE written (Opus planner).
