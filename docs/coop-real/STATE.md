# coop-real - STATE

## Now
2026-10-25 ~18:15 triage 3 (Opus; triage 2 lost at the swap, its desktop repro never reported; no local run: desktop CPU 100%). c1b-logs (desktop, 92edc3e5, smoke) failed twice: (1) host `aimAt` by mouse 100 deg: HARNESS, the cursor ran off the 960 px viewport (moves past the edge reach the page as nothing); fixed: `mouseAim` lifts the mouse at the edge (back button held while it re-centres, no look) (ffb7f02a). (2) client `pickRow` "Open door" 3 presses lost: the client's LOBBY SCREEN sat over the running match (ScreenManager takes every button edge); same cause as c2 run 1 (leg-up RB lost, B1 setup `top` = lobby) and probe 1 / 2. Source not found by reading (startGame clears the screens; only `adopt` / `backToLobby` push the lobby): `bootPair` now taps every screen push / pop / clear (pass-through log) and fails the boot with that log when a screen stays over either match 8 sim s (no skip). If the log shows a game path: T1 line + KNOWN BUG by the lead. c1b laptop :1 / :2 logs are on the laptop only (no PR comment: request had no --pr); likely the same two causes (P7 host mouse aims). c2 d2f1d940 rerun: route "rows: []" at L1-near: HARNESS, the host stood 1.4 m +- 0.3 off the door (rows need <= 1.6 m); B1 walk2m aimed into L1 through the closed door. Fixed on feature/coop-real-c2 fc6d52c7 (openDoor steps to 1.0 m; doorRow 1.0 m; yard spots), c2 merged feature/coop-real (lib). Queued: coop-real-c1c 20261025T071507-night-shift-player-b-ffb7f02a-2f7a (smoke :1 :2 at ffb7f02a), coop-real-c2b 20261025T071514-night-shift-player-b-fc6d52c7-60be (:3 at fc6d52c7). Next: read both; a boot failure "the client page has ... lobby-screen" = read its screen log.
2026-10-25 ~09:00 triage 2 (Opus, running): c1b at 92edc3e5 FAILED 0/3 (laptop logs only; smoke rerun with logs queued as set coop-real-c1b-logs, --pr 388). Desktop repro running now: build + `e2e-coop-real:smoke` on 4189 under heavy2.lock; then :1, :2, fix the harness, queue set coop-real-c1c (--pr 388). No fix committed yet. If cut off: rerun the smoke locally (scratchpad run.sh pattern: lock + CPU gate, E2E_GPU=1, port 4189) and read its log.
2026-10-25 triage (Opus): probe 6204d95f: no headless mechanism hides or freezes a tab (B1 provisional `spoofHidden`, B2 none; next probe rows minimize / minimize+frozen / Debugger.pause; H1-REPORT "Lifecycle probe"). Smoke / :1 / :2 failures were harness bugs (host boot 120 s autostart wait, mouse look blocked under a held button, door walk, pickRow / trigger presses lost, KBM faceTo creep, stop 3 in the door's clearance), fixed; only mark S2 (as briefed). Rerun queued: set coop-real-c1b.
2026-10-25 ~00:12: cr-h1 MERGED here (6204d95f: code done, node --check + localTransport vitest pass). Probe + smoke NOT RUN on the
desktop (CPU 77-100%): queued on the laptop (set cr-h1-probe, e2e-coop-real:probe + :smoke at 6204d95f); its PROBE lines
decide B1 / B2 (expected hideBehind / CDP frozen) before C2. C1 builder (Sonnet, briefs/C1.md) starts on this branch.
2026-10-25 ~00:05 SAVE: F1a feature/cr-f1a 144190a0 + F1b feature/cr-f1b dadacd58 (cloud build, 2 Opus checkers PASS WITH
FIXES, fix round done, `checker` status posted; laptop sets cr-f1a / cr-f1b queued). Follow-ups: restart-in-flight lamp
guard, lamp-shot round-count authority, Course onRay install-order test. #317 overlap only coop.md :469. RUNNING at the
save: the Opus H1 finisher on feature/cr-h1 (relaunch from H1-REPORT.md if PROBE_RESULT / SMOKE_RESULT are still placeholders).
2026-10-24 ~23:00 (overnight, no swap). Group 1: H2 + H2b done; H1a / H1b code on feature/cr-h1 (c7241fdd + swap
WIP), an Opus finisher runs the probe + smoke and fills H1-REPORT.md. C1 brief done (briefs/C1.md, c6c70d94; A10).
F1a / F1b on the cloud queue (A11). Next: merge cr-h1 into coop-real, then group 2: C1 (Sonnet from the brief; check its
lib names against H1-REPORT) ∥ C2 (Opus). H1b follow-up from the C1 brief: the sweep must re-collect rows after each
run and leave modal views (else Bash door / Optic cable / Open door stealth read dead); untested lib paths: co-op
pause restart, ADS before fire, pad RT tap knockout. Desktop dev lane approved (orchestrator ~22:20): heavy2.lock per run, CPU < ~60% at start, 1 pair, E2E_GPU=1, port
4189, BelowNormal, development only (verdicts via the laptop queue). H2b done (part 3 registered). None for Michael (A1-A9 assumed, BRIEF.md).

## Known before the run
- S2 is a sure KNOWN BUG on master: Course mode never sends a client lamp round (coopClient.ts:188-197, coopHost.ts:202).
- P6, P7 have fixes on master (coop-walk-fixes, train 30) never proven by input; R7 placement fixed (4.85.0), the drop
  itself not. The suite decides which marks they get.
- Open PR #317 coop4 (Guard AI, draft) edits src/net widely: PR B goes first (never the same train); if #317 is
  train-ready first, F1b / F2b / F3 rebase onto feature/coop4. Never merge master in.

## Done
- 2026-10-24: BRIEF, PLAN, STATE.
- 2026-10-24: H2 runner wiring (e735dc8a). Plan check PASS WITH FIXES (d626f05c).
- 2026-10-24: Plan check applied: H1 -> H1a / H1b, three parts, C1 scripted cases, KNOWN BUG with `expect`, F1 / F2 split
  into a / b halves, run 1 doubled (seeded) + e2e-netmove, gates from finding 13.

## Resume prompt
```
Night Shift | Player Build - coop-real: RESUME (Opus, medium effort; clear only past ~50% context).
Folder C:/NightShift/Mobile-Coop-coop-real, branch feature/coop-real. Guard before every write:
cd /c/NightShift/Mobile-Coop-coop-real && test "$(git rev-parse --abbrev-ref HEAD)" = feature/coop-real && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-coop-real"
Read CLAUDE.md "Sessions" / "Hard rules", then docs/coop-real/STATE.md, BRIEF.md, PLAN.md (only these).
Do the "Now" line: run PLAN's parallel group next in order, each agent from docs/systems/agent-preamble.md with its
slice row, the "Code this builds on" pointers and BRIEF "The input line". One fresh Opus checker per batch (K1, K2) in
parallel with the laptop request on the same commit (PLAN "Laptop queue requests"). Failures become KNOWN BUG marks
(M1) pointing at F1-F4; dead prompts outside the five go to TRIAGE.md and their owners. Update STATE after each group;
PR A after K1 + run 1, PR B (fixes) stacked; message the orchestrator only when a PR opens / is train-ready or blocked.
```
