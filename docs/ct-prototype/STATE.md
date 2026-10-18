# CT core feel job - state (resume point)

Updated 2026-10-18.

## Current goal (Michael, 2026-10-19; master CLAUDE.md "Current goal", PR #6) - overrides slower wording below
A fully functional 2-player co-op training level, playable end to end, as soon as possible:
- Wren as the character for both players, with basic animations.
- Basic weapons: Blender scratch builds, realistic at a glance but quick (feature/weapons, laptop session; the
  existing weapon carry stands in until they merge, do not wait for them).
- All co-op moves and the required CT moves; lights and shadows working (light parity).
- Pure CT (G1, `docs/ct-research`, G124-G160) except Michael's recorded decisions, including the Blacklist-style
  selection wheel for weapons, gadgets and vision modes, no time slow (G179).
- A visual pass comes last, to make it prettier.

No refining (feel tuning, animation polish, perf tuning, detail art) until Michael has playtested the core loop.
Checkers block only on broken or unplayable work; cosmetic notes go on `POLISH.md`. At most 1 fix round per slice
unless broken. Quick e2e per slice (`npm run e2e:quick`, one test run at a time on this PC: a timing failure under
load is load first), the full e2e at the PR. The Opus leg fix only if it breaks play or looks obviously broken.

## Overnight run (Michael, 2026-10-19, "no stop until told")
- Per slice: build, an independent check (blocks only on broken / unplayable), at most 1 fix round, `npm run check`,
  `npm run e2e:quick`, commit, push, `git push origin feature/ct-prototype:ct-movement`. Time box about 90 min.
- A decision that is genuinely Michael's: write it as a question in `WALKTHROUGH.md`, take the simplest reversible
  option, carry on.
- By 09:30 Sydney: the best playable state on ct-movement, with `WALKTHROUGH.md` (how to start, what to try, known
  broken, open questions, polish list). From 09:30 until Michael says otherwise: do NOT push ct-movement; push
  feature/ct-prototype only.

- Job docs created (RULES, FEEL-PLAN, STATE, LOG, OWNER-NOTES, DECISIONS). The job plan is `FEEL-PLAN.md`; `PLAN.md`
  is the research's whole prototype plan (from master).
- Research in (2026-10-18): CT co-op research merged to master (PR #4, a22a9c0) and merged into this branch. Read from
  master now (`docs/DECISIONS.md` G124-G160, `docs/ct-research/`); the research folder paths in the start prompt are
  superseded. Applied to this job (`FEEL-PLAN.md`): G159 manual camera, G137 strict corner peek (tighten the wall-peek
  camera), G160 tense sneak crouch, G155 one-hit palm strike on every guard (no heavies or dogs), G135 per-player
  goggle lamp colour, G152 held jammer (kit work after core feel unless it touches the pistol draw), G150 core feel
  first, G158 Sonnet medium implementers. The "findings for Michael to confirm" list is not decisions.
- Step 0 code review: done (`REVIEW.md`); Michael's picks in `DECISIONS.md`.
- A2.1 (cleanup + camera rewrite) built and committed (`A2-CAMERA.md`). STOPPED for Michael to play the camera.
- A1.1 turn follow and A3 wall, doors, pad built (`A1-TURN.md`, `A3-WALL-DOORS.md`), on /ct/, awaiting Michael's play. Next: A4 strike and grab; A5 goggles;
  then phase 2, the co-op training bunker B0-B8 (`FEEL-PLAN.md`, G177). One stop per slice while Michael is awake;
  overnight runs only when he says. Every slice also pushed to `ct-movement` (`/ct/`).
- Playtest checklist (Michael's verdicts and notes, saved in its db collection `notes`, read with ArtifactData list): https://claude.ai/artifact/RA6bgQpeq1xALCXLviRLNp . Movement A1-A5 built once (prototype pass) and feature/menu merged (7078807), all on /ct/. Phase 2: B0 survey done (`B0-BUNKER-SURVEY.md`), Michael picked a fresh compact level; B1 spec and greybox built (`B1-CTCOURSE.md`), on /ct/, awaiting Michael's walk test; next B2 leg-up and CT relay. Open: strike button RT vs LT (Michael to say what CT used).
- Wren: feature/operators has no PR yet; posture waits.
- Open from M1 (see `M1.md`, "Open for the core feel job"): rerun e2e-netmove, e2e-pad, e2e-mouse alone; frozen stance
  not on the wire; Settings "Sprint hold / toggle" row (menu job), stale `.tac-gear` CSS, unused `sprintHold`.
