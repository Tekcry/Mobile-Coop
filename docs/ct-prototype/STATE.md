# CT core feel job - state (resume point)

Updated 2026-10-19 13:40 Sydney (slice A done and on /ct/).

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
  "CT Core Build | <job> | <time>", run, delete it after. The orchestrator messages when it holds or frees it.
- Per slice: implementer (Sonnet medium; Opus for network-sync-heavy or stuck work), independent read-only check,
  at most 1 fix round, `npm run check` and the slice's e2e (one suite at a time, port 4193), commit (all changed paths
  after the off-limits check), push feature/ct-prototype, then `git push origin feature/ct-prototype:ct-movement`
  (/ct/) unless the orchestrator / Michael has frozen /ct/.
- anim-cleanup is in master (PR #12): the arm / hand freeze lifts once master is merged here.

## Where things stand
- Master has all overnight work: PR #9 merged (2e141075): movement A1-A5, posture P1-P1c, playtest 1 fixes F1a / F1b,
  CT training course `ctcourse` B1-B8 (all 8 stations with real co-op moves, revive, finish), T1 / T2 test clean-up.
  Protocol 22. /ct/ was moved by the orchestrator to 7e6229d for Michael's playtest 2.
- Branch after #9: docs-only commits (STATE, RULES: orchestrator reporting and heavy slot). Master also has PR #10
  (CLAUDE.md "Orchestrator"): merge origin/master into this branch after slice A (docs only).
- Michael's playtest 2 notes and approved plan: `PLAYTEST-2.md`.

## Slice A (playtest 2) - DONE 2026-10-19 (report `A-PLAYTEST2.md`)
Committed and pushed to the branch and /ct/. Check green, smoke / move / wall / pad / foley pass. The walking bob is NOT
fixed (rig `pelvisDrop`, leg geometry): it moves to B+C. e2e-ctcourse passes stations 1-6 on this branch (the station 2
legUp hang the orchestrator saw on master bd59f32 does not happen here) and then hits the 600 s suite cap at station 7:
rerun with `E2E_SUITE_TIMEOUT=900` after the master merge; if station 2 hangs after the merge, it came from master
(anim-cleanup or phone-launch) and gets its own slice.

## Next
1. Merge origin/master (anim-cleanup PR #12 b08cc176, phone-launch PR #13, PR #10 docs; expect overlaps in
   characterRig.ts, animGraph.ts (slice A's `sightPos` swap fix vs anim-cleanup's shoulder swap), src/weapons/*,
   remoteAvatar.ts). Then check, e2e-ctcourse (900 s cap), e2e-netmove (holster budget 550 ms from master).
2. Scanner rule (Michael): no HP cost when the partner never started; 10 HP stays for a late or abandoned hack.
3. Slices **B+C** (the arm / hand freeze ends with anim-cleanup in master), with the walking bob from slice A: ADS against the CT footage (aim view unchanged
   when crouched for every weapon; upper body tight, not wrist-only tilting; arms less outstretched; natural pistol
   aim); legs in line with the body walking, running and turning; crouch hands and legs from the CT references.
4. Then **D+E** (re-check against anim-cleanup first; Michael played without it): rifle and pistol holstering; hanging
   shimmy with wider, slower hands; vertical pipe climb (legs swing upside down, hands backwards); ledge climb-up onto
   the knees, not floating.
5. Later, not now: goggle surround redesign, weapon wheel restyle (bigger, not just boxes, original), menu items.

## Answered (Michael via the orchestrator, 2026-10-19; DECISIONS.md)
Wheel stays LB hold; no lethal / non-lethal switch; gun drawn, A reloads (kept); scanners: no HP cost when the partner
never started, 10 HP stays for a late or abandoned hack. **To do in a later slice** (light code plus tests: station 6
in the ctcourse scanner logic).
- e2e-netmove's holster budget (400 ms) is stale against HOLSTER_TIME 0.55; the fix comes with the master merge
  (feature/anim-cleanup). Expect that failure until then.

## Known issues worth remembering
- T1 possible bugs: ledge-grab / ledge "Hang" / rappel world prompts read empty; keyboard Space then hold E does not
  start a vent unscrew in the harness.
- e2e-coop known flaky (X-tap shape like ctcourse's fixed draw); e2e-kestrel and e2e-camera-bounds level U pre-existing.
- Full `npm run e2e` at 2 jobs is load-sensitive: rerun failures alone before reading into them.
- Throw, hang-down and rope have no bespoke animations; goggle looks need a GPU review.
