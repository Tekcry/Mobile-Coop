# coop-real - PLAN-CHECK (fresh Opus, 2026-10-24)

Checked PLAN / BRIEF / STATE at 436ecaf4 (HEAD is now e735dc8a, H2 landed; finding 6 applies to it).

## Verdict: PASS WITH FIXES
Every wanted case has a slice, and the input line holds as written. Fix 1-5 and 9 before C1 / C2 are briefed: as specified,
the generic sweep passes every row, P6a / P6b are swapped, and the rejoin path skips Michael's Rejoin row.

## Findings (PLAN line -> fix)
1. Watchdog passes every row (PLAN:38-46). The hash holds guard pos 0.25 m and players `mv.m`, and the event tap takes any type
   ('bark', and 'takedown' phase start fires before anything reaches the host). Those move within 3 s anyway, so a dead row
   passes, which is exactly how P6 passed. Fix: a row-kind -> expected-key table (door -> that door's open / target; grab / ko /
   team takedown -> that guard's ko | taken | hostage on the host; body -> carried / hidden; unbolt -> gate / lock; switch ->
   lamp group). Fallback: diff keys minus the keys that moved in an equal control window just before the row. Local-only kinds
   (peek, optic) expect the acting page's own flag; "client row must move the HOST hash" false-fails them.
2. The sweep's sources miss the world prompts (PLAN:47). 'takedown' ("Takedown" / "Grab" / "Held", gameState.ts:3423-3435),
   'drop', 'jumpTo', 'coop', 'state' and 'vault' (ui/hud/worldPrompts.ts:5, test reader `label()` :115) sit outside
   `ctxMenu`, and P6's "takedown option" may be one of them. Fix: read `ctxMenu.opts` + every WorldPrompts label + `team.prompt`,
   and run each with its bound input.
3. A sweep at fixed stops in the idle state never sees P6-class rows (PLAN:47-49). Fix: at each stop, scan yaw in 8 stick steps.
   Sweep each page while the partner is idle / holding the checker / carrying a body / crouched offering. A missing prompt
   (P6b) needs an explicit presence assert: the watchdog only sees rows that exist.
4. P6a / P6b are swapped (PLAN:59 vs BRIEF table). Fix: P6a = host holds, client runs the takedown (host guard ko / taken within
   PROMPT_S). P6b = client holds, host is offered "Team takedown" (presence) and runs it (effect).
5. Rejoin goes through autostart, not Michael's path (PLAN:60 B3 / B4). A reload or new page on the boot URL runs
   `autoLocalCourse` (coopUi.ts:855-881), which auto-rejoins by token or shows "Room full". The main menu "Rejoin <code>"
   (coopUi.ts:892; record in sessionStorage, rejoin.ts:5, 30) is never reached. Fix: B3 reloads `?net=local&netsim=typical&netdrop=8`
   without autostart and picks "Rejoin <code>" by pad. B4 (a new tab has no sessionStorage) joins by the menu's Join / code path
   by pad.
6. The hidden page is not a real background tab (e2e-lib.mjs:21). Every suite gets `--disable-background-timer-throttling`,
   `--disable-renderer-backgrounding` and `--disable-backgrounding-occluded-windows`, so a hidden client keeps full-rate timers.
   Fix: H1 adds a `launch` option that drops these three for this suite, and the probe runs with and without them. With
   `hideAutomation`, also probe whether the bgTick worker alone drives the hidden host: bgTick.ts:11 yields to `stepHeadless`,
   so the pump hides the worker path Michael actually runs.
7. B2-B4 lack preconditions (PLAN:60). Fix: before the drop, assert the host's `__course.debug().checkpoint` is L1 and the host
   is > 10 m into A2; otherwise "> 10 m from the lounge" can pass trivially. After placement, assert the client walks 2 m by stick
   (host puppet within 0.5 m) and a client door row moves the host's door (R7 "no way to return, game broken").
8. The S2 host leg goes vacuous after F1 (PLAN:59): both shoot the apron flood, and once F1 lands the host hits a dead lamp. Fix:
   the client shoots the apron flood (group 11) and the host a yard bulkhead (12). Assert `readLamps` for that lamp on both
   pages within PROMPT_S.
9. KNOWN BUG can hide new failures (PLAN:52, 62). `knownBug(id, slice, fn)` swallows any throw in fn: a walkTo timeout, a harness
   error or a new regression. Fix: `knownBug(id, slice, { expect: /<assert text>/ }, fn)`, where only a matching ASSERT counts
   and any other throw fails the run; setup runs outside fn with its own asserts. M1 marks only a failure seen on 2 laptop runs
   (fixed `netseed`) that maps to one of the five.
10. Sweep finds outside the five have no mark, and cases cascade (PLAN:62, 67). H2 already put e2e-coop-real in REQUIRED, so an
    unmarked T1 find turns it red. Fix: `knownBug('T1-<row>', '<owner>:<ROADMAP item>')` plus a TRIAGE.md line; K2 rejects a mark
    with no slice or owner item. Cascade: A1 has no placed corpse (a1Gate.ts:250-257 'body' entries are light probes), so a
    marked P6 leaves the body case with no body. Fix: after a restart, the host knocks out the checker himself (solo grab +
    knock out by input).
11. The input line needs enforcing (PLAN:61). Fix: every `page.evaluate` goes through lib `read(page, fn)` (read-only) or a
    `drive*` helper (pad / keys / mouse / lifecycle). K1 greps for `.evaluate(` outside lib.mjs, for
    `moveHost|moveClient|setDamage`, for `stepHeadless` outside the pump, and for imports from scripts/e2e-ctcourse/*
    (a1Gate's route teleports).
12. No desktop e2e (CLAUDE.md "Heavy-usage throughput") vs the H1 smoke + probe and C1 / C2 iteration (PLAN:57-60). Closed-loop
    input cannot be written blind, and laptop round trips are not in the ~7 h. Fix: before H1, ask the orchestrator for a dev
    lane (desktop GPU, JOBS=1, heavy2.lock, CPU < 50%). Otherwise budget dev runs as laptop `--env` requests.
13. Gates are lists, not pass / fail (PLAN:57, 59, 60). Fix: H1 = probe table in STATE + smoke (both boot under netsim; client
    `walkTo` 6 m to <= 0.3 m in <= 8 s; one `pickRow` moves its expected key). C1 / C2 = one laptop run where every case reaches
    its final assert (pass, or fail at that assert), with no setup timeout and part <= 120 s. F = its mark removed, other marks
    unchanged.
14. Wall time is low (PLAN:92). e2e-ctcourse:1 takes 150 s by teleports (e2e-times.json). A pair boot is ~20-25 s, each pause
    restart 8-10 s, and B3 / B4 each reload the map (~20 s) and wait up to 30 s. Estimate: part 1 ~160 s, part 2 ~190 s
    (~6 min serial). Fix: three parts <= 2 min each (1: P6 + P7 + body; 2: sweep + S2 + doors / unbolt; 3: R7 B1-B4). They run
    on parallel slots, so the suite's wall time is its longest part. Reset e2e-times.json from run 1.
15. PROMPT_S = 3 s is right for instant rows (typical = 40 +- 20 ms one-way, reliable, netSim.ts:20-22). Fix: start the window
    after the row's hold time or the takedown's finishing strike, and give takedown kinds 6 s.
16. P7 (PLAN:50-51): the shooter page must also count 0 `remoteShot` (an echo). Optional: count `AudioEngine.out` sfx voices in the
    0.5 s window to catch a double from another path.
17. C1 on Sonnet (PLAN:59): the sweep semantics and the bug-vs-harness call need judgement. Fix: move the sweep loop + the
    expected-key table (1-3) into H1 (Opus). C1 then becomes scripted cases from a strict brief (coordinates, row labels,
    expected keys), which suits Sonnet.
18. Run 1 (PLAN:86) adds `e2e-netmove`: PR A changes src/net/localTransport.ts (CLAUDE.md "Heavy-usage throughput", src/net PRs).

## File claims vs #317 coop4 (draft, head d0f574cb)
| Slice | File #317 also edits | #317 hunks near ours |
| --- | --- | --- |
| F1 | src/net/coopClient.ts (+110), src/net/coopHost.ts (+268), docs/systems/coop.md (+111) | client 203-220 (onRay 188-197); host 228-299, 1251-1299 (lampTx 202, onLampShot 1314) |
| F2 | src/net/session.ts (+86), src/net/coopUi.ts (+10), src/net/joinWatch.ts (+10) | session 130-421 (drop / held slot 142-302); coopUi 877 (autoLocalCourse) |
| F3 | coopHost.ts / coopClient.ts (only if needed) | as F1 |
| F4 | src/net/remoteAvatar.ts (+4) | 221 |
| H1 | none (localTransport.ts is free) | - |
| H2 (done) | scripts/run-e2e.mjs, docs/systems/testing-tools.md | trivial train merge |

Free of #317: localTransport.ts, src/core/rejoin.ts, src/game/spawnSlots.ts, courseMode.ts, takedownController.ts,
assistTakedown.ts, remoteShots.ts, gameAudio.ts, tests/rejoin.test.ts, tests/coopWalkFixes.test.ts. C1 / C2 import
scripts/e2e-net-lib.mjs (#317 +82): use only `until` / `waitSim` / `setSimPages`.
Order: PR B and #317 never share a train. #317 waits on the campus map + guard-ai chain (ROADMAP:51), so PR B goes first and
coop4 rebases onto it; tell the Guard AI lead which hunks PR B touches. Split so the free half can ride any train:
F1a = courseMode.ts + test, F1b = coopClient / coopHost. F2a = localTransport / rejoin.ts / spawnSlots, F2b = session / coopUi /
joinWatch. F4 stays in remoteShots / gameAudio. If #317 is train-ready first, F1b / F2b / F3 rebase onto it.

## Slice sizes (estimated lines)
H1 ~1.0-1.2k (entry 150, lib ~900, probe 150, transport 10). With 17 it reaches ~1.4k: split H1a (boot, pump, drive helpers,
probe, netdrop) / H1b (hash, expected-key table, sweep, taps, `knownBug`). H2 78 (done). C1 ~500-700. C2 ~600-900.
F1 ~200-300. F2 ~200-500. F3 / F4 ~100-200. None is over 1.5k.

## Feasibility
- Backgrounding: CDP `frozen` is real (B2), and the probe should also try freezing after `bringToFront` of the host. Desktop
  "hidden" needs fix 6. The test drops through localTransport, not Trystero, so F2's fix must not be localTransport-only.
- Real input: `__pad` and `fakePointerLock` are already used by e2e-pad / e2e-mouse. `walkTo` on the client reads its own
  predicted pos.
- Wall time: 14. Sonnet C1: 17.
