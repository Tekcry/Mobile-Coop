# CT core feel job - state (resume point)

Updated 2026-10-19 14:15 Sydney (slice A on /ct/, origin/master merged).

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
- Michael's playtest 2 notes and approved plan: `PLAYTEST-2.md`.

## Slice A (playtest 2) - DONE 2026-10-19 (report `A-PLAYTEST2.md`, e9fd03c6)
The walking bob is NOT fixed (rig `pelvisDrop`, leg geometry): it moves to B+C.

## Master merged (bccc96cf, 2026-10-19 14:00: anim-cleanup #12, phone-launch #13, menu #11)
Clean merge; check green (1751 unit tests). Slice A's wall reach 0.5 m: wall-entry teleports in e2e-netmove, e2e-mouse,
e2e-stealth-ai, anim-audit, anim-sheet moved 0.85 -> 0.75 m out (mouse, stealth-ai pass). Co-op test waits are owned by
**Character Build** (laptop, untilSim, PR #15 process audit): do not edit e2e-ctcourse / e2e-net-lib waits; tell the
orchestrator first if e2e-ctcourse must change. Findings sent to it: ctcourse station 2 is a wall-clock wait (the host
reaches the hang after 12 s at ~280 ms SwiftShader frames; with 30 s and a 900 s cap the whole course passes, 728 s);
netmove "stacked on one wall" (0.62 m along, 0.41 m apart) repeats, same lag. When #15 lands: take its e2e-mouse /
e2e-pad and re-apply 0.75 only where a wall entry is left. Tests per slice after #15: e2e:quick + e2e-ctcourse, plus
coop and netmove when src/net, src/player or src/game change.
Versions (G183): master sets the version per PR; never bump package.json here.

## Next
1. Scanner rule (Michael): no HP cost when the partner never started; 10 HP stays for a late or abandoned hack.
2. Slices **B+C**, with the walking bob from slice A: ADS against the CT footage (aim view unchanged
   when crouched for every weapon; upper body tight, not wrist-only tilting; arms less outstretched; natural pistol
   aim); legs in line with the body walking, running and turning; crouch hands and legs from the CT references.
3. Then **D+E** (re-check against anim-cleanup first; Michael played without it): rifle and pistol holstering; hanging
   shimmy with wider, slower hands; vertical pipe climb (legs swing upside down, hands backwards); ledge climb-up onto
   the knees, not floating.
4. Later, not now: goggle surround redesign, weapon wheel restyle (bigger, not just boxes, original), menu items.

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
