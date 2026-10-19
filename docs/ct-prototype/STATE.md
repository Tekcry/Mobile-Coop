# CT core feel job - state (resume point)

Updated 2026-10-19 11:45 Sydney (before Michael clears the orchestrator conversation).

## Resume
New local session, Opus, medium effort:
```
CT core feel job: RESUME. Work only in C:\NightShift\Mobile-Coop-ct-prototype on feature/ct-prototype (git pull --ff-only). Read CLAUDE.md, docs/ct-prototype/RULES.md and STATE.md, then carry on from STATE "Next". Report to "Night Shift | Orchestrator". No em dashes.
```
Job plan: `FEEL-PLAN.md`. Decisions: `DECISIONS.md` (job) and `docs/DECISIONS.md` G179-G181 (this job's G entries).
Log of every slice: `LOG.md`. Polish list (not worked on until Michael says): `POLISH.md`.

## Rules that bind now (details in RULES.md)
- Current goal (master CLAUDE.md): a fully playable 2-player co-op training level, pure CT except Michael's decisions;
  no refining before Michael playtests; checkers block only on broken / unplayable work.
- Report to the session **"Night Shift | Orchestrator"** (master PR #10): message it when a slice starts, finishes
  (with /ct/ pushed), a PR opens, Michael is needed, or you are blocked. Only it edits `docs/ROADMAP.md`. Michael
  answers questions on its dashboard; it forwards them.
- **One heavy slot** on the desktop: before any `npm run check`, full vitest, build, e2e or GPU shot, check
  `C:\NightShift\heavy.lock`; if present wait (re-check every few minutes) and do light work; if absent write
  "CT Core Build | <job> | <time>", run, delete it after. At 11:45 the orchestrator held it (anim-cleanup full e2e on
  port 4192, expected done about 12:45) and will message when it frees it.
- Per slice: implementer (Sonnet medium; Opus for network-sync-heavy or stuck work), independent read-only check,
  at most 1 fix round, `npm run check` and the slice's e2e (one suite at a time, port 4193), commit (all changed paths
  after the off-limits check), push feature/ct-prototype, then `git push origin feature/ct-prototype:ct-movement`
  (/ct/) unless the orchestrator / Michael has frozen /ct/.
- Do not touch arms / hands / solveArm / wrists / grips / AIM_POCKET / weaponPivot / draw-holster mounts / READY_HANDS
  until feature/anim-cleanup is in master (Character Build session owns them).

## Where things stand
- Master has all overnight work: PR #9 merged (2e141075): movement A1-A5, posture P1-P1c, playtest 1 fixes F1a / F1b,
  CT training course `ctcourse` B1-B8 (all 8 stations with real co-op moves, revive, finish), T1 / T2 test clean-up.
  Protocol 22. /ct/ was moved by the orchestrator to 7e6229d for Michael's playtest 2.
- Branch after #9: docs-only commits (STATE, RULES: orchestrator reporting and heavy slot). Master also has PR #10
  (CLAUDE.md "Orchestrator"): merge origin/master into this branch after slice A (docs only).
- Michael's playtest 2 notes and approved plan: `PLAYTEST-2.md`.

## Slice A (playtest 2) - IN PROGRESS, uncommitted
A Sonnet implementer was mid-run at 11:45 (an e2e runner on port 4193). Scope (PLAYTEST-2.md, slice A): D-pad up / down
= walk speed with speed 2 the slowest; ADS sensitivity 0.3 of explore; corner peek inverted; chosen shoulder carried
into aiming and back to the follow camera; no upward flick on a shoulder swap; back-to-wall snap from about 0.5 m with
no slide; own footsteps scaled to the noise meter (much quieter); no camera bob.
Uncommitted files in the working tree at 11:45: scripts/e2e-move.mjs, scripts/e2e-wall.mjs, src/anim/animGraph.ts,
src/audio/gameAudio.ts, src/config/movement.ts, src/core/settings.ts, src/game/gameState.ts, src/player/movement.ts,
src/player/speedGears.ts, src/player/wallController.ts, tests/analogGear.test.ts, tests/animAudit.test.ts,
tests/speedGears.test.ts, tests/wallController.test.ts, new tests/stepVolume.test.ts. No report yet
(`A-PLAYTEST2.md` not written). If the session ends before the agent hands back: keep these edits, read the diff,
finish what is missing from the scope list (peek inversion, shoulder carry and swap flick live in
shoulderCamera.ts / camera config and were not yet touched at 11:45), write `A-PLAYTEST2.md`, wait for the heavy slot,
run `npm run check` and e2e smoke, move, wall, pad, foley one at a time, independent check, commit, push branch and /ct/
(if not frozen), then message the orchestrator.

## Next
1. Finish slice A (above), push, report to the orchestrator.
2. Merge origin/master (PR #10, docs) into the branch.
3. When the orchestrator says feature/anim-cleanup is in master: merge origin/master (expect overlaps in characterRig.ts,
   animGraph.ts, src/weapons/*, remoteAvatar.ts), then slices **B+C**: ADS against the CT footage (aim view unchanged
   when crouched for every weapon; upper body tight, not wrist-only tilting; arms less outstretched; natural pistol
   aim); legs in line with the body walking, running and turning; crouch hands and legs from the CT references.
4. Then **D+E** (re-check against anim-cleanup first; Michael played without it): rifle and pistol holstering; hanging
   shimmy with wider, slower hands; vertical pipe climb (legs swing upside down, hands backwards); ledge climb-up onto
   the knees, not floating.
5. Later, not now: goggle surround redesign, weapon wheel restyle (bigger, not just boxes, original), menu items.

## Open questions for Michael (sent to the orchestrator's dashboard)
1. Selection wheel button: LB hold (now) or a D-pad hold as in his screenshot?
2. A lethal / non-lethal centre switch on the wheel (not built; LT knockout / RT lethal covers it)?
3. With a gun drawn A reloads, so doors and the grab menu need a holster first: keep (CT) or interact on A always?
4. Scanners: the finisher pays 10 HP if the partner never starts: keep or no cost?

## Known issues worth remembering
- T1 possible bugs: ledge-grab / ledge "Hang" / rappel world prompts read empty; keyboard Space then hold E does not
  start a vent unscrew in the harness.
- e2e-coop known flaky (X-tap shape like ctcourse's fixed draw); e2e-kestrel and e2e-camera-bounds level U pre-existing.
- Full `npm run e2e` at 2 jobs is load-sensitive: rerun failures alone before reading into them.
- Throw, hang-down and rope have no bespoke animations; goggle looks need a GPU review.
