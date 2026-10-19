# Menu notes - state

## Now (2026-10-19 21:55, stopped for Michael's account switch)
Every note and M1-M4 is built and committed; PR head c626147a (docs) / 048c9d89 (last code). The PR is NOT open yet.
Full `npm run e2e` on c626147a (desktop, E2E_JOBS=2, port 4191, 600 s default cap): 25 suites ok; failed e2e-ctcourse,
e2e-netmove, e2e-coop (all killed at the 600 s cap), e2e-ct ("climbing at gear 4 rattles"), e2e-stealth ("the view
follows every bit of look input"), e2e-pad (KNOWN FLAKY, "the locked row toasts its reason"). `npm run check` passed.
Solo reruns (jobs=1): e2e-netmove ok 248 s, e2e-coop ok 207 s, e2e-pad ok 191 s, e2e-ct ok 58 s, e2e-stealth ok 29 s;
e2e-ctcourse reached station 8 and was killed at 601 s (the default cap). The release checklist (TESTING.md) says the
full run uses `E2E_SUITE_TIMEOUT=900` (ctcourse alone is ~650 s). The ctcourse rerun with the 900 s cap was started and
STOPPED at station 5 for the account switch: not finished. heavy.lock released, port 4191 freed.

## Next
1. Take the desktop heavy.lock (CT Core first; free port 4191), `npm run build`, then
   `E2E_PORT=4191 E2E_SUITE_TIMEOUT=900 node scripts/run-e2e.mjs e2e-ctcourse --jobs=1` (about 11 min).
2. Boot time check (orchestrator ask): the slice 2 gate holds the menu until the hero, weapons and shaders are ready.
   Measure boot-to-menu under software GL on this branch and on master with `E2E_PORT=4191 node
   scripts/menu-boot-time.mjs 3` (serve each dist/ on 4191 in turn; master from a detached worktree, e.g.
   C:/NightShift/Mobile-Coop-menu-notes-shots, which has a node_modules junction). If the gate adds more than a few
   seconds per page, make the e2e helpers wait on `window.__app.current.bootGate` instead of a fixed time.
3. If ctcourse passes: open the PR "menu-notes: Michael's walk-test menu notes" to master (body: the notes, M1-M4,
   A1-A3, checks with the solo-rerun evidence, the GPU sheets in docs/menu-notes/shots/), report to the orchestrator,
   STOP. Don't set the version.
4. Clean-up: `git worktree remove --force C:/NightShift/Mobile-Coop-menu-notes-shots` (scratch worktree for GPU shots;
   remove its node_modules junction first with `cmd /c rmdir` so the real node_modules is not touched).

## Open
- Slice 1 logic e2e running on the laptop runner (c999919f, check passed there, 213 s).
- Slice 3 visuals not yet seen (GPU pending): W1 / W2 framing, H2-H4 pistol vs plate (one-word switch in menuSets.ts),
  H5 holster, T1 / T2 face framing, the skinned hand near the magazine, no proxy parts or lone magazine.

## Polish list (non-blocking)
- Load gate: a long gfx-high shader compile with no bytes arriving could hit the 12 s stall in menu-boot-shots; operator files fetched outside loadModel are not counted in the MB line; tick() allocates per frame during the gate; readCounted peaks at about twice the file size (preallocate from Content-Length).
- The loadout and lobby stage still compiles its shaders on the first visit.
- Pad-only player in a browser that blocks autoplay hears no title music until a key or click (Chromium limit).
- menuPoses test: use PLAYER_HEIGHT, hyp3, note that the guard is pose-independent, add forearm samples.
- A hold change between void shots glides (0.1-0.45 s) during the crossfade; snap on a shot change if it shows.

## Done
- 2026-10-19: slice 4b (8 tactical candidates, sheet), Michael picked X5 (M4); slice 4c (M3: flicker in full darkness before the menu, skip A3; checker fix: Enter leak after a mouse start); slice 4d (X5 live as W3, candidates removed, green spill light removed = the forehead glow, menu-only). GPU sheet sheet-s4cd.png.
- 2026-10-19: master 4.7.0 merged (44a0cb82).
- 2026-10-19: worktree, BRIEF / PLAN / STATE.
- 2026-10-19: slice 1 (c999919f): title music, Back on the main menu does nothing (A1), one Controls place (A2). Checker PASS.
- 2026-10-19: slice 2: load screen gate (menuGate.ts, stall timeout with MB progress, launch title after the hero is drawn), hero LOD confirmed (no fix; the swap was load order), read-back heroLod. Checker 2 fixes, fix round, recheck PASS.
- 2026-10-19: slice 4a (M1, M2): dark title (stage max 0/255 on the GPU), the press strikes the goggle flicker then the lights; wordmark-only boot, the prompt fades in when the gate opens. Checker PASS; fix round (wordmark check measured block width, not the letters; e2e wait on the fade).
- 2026-10-19: slice 3: rifle and pistol in the void shots (menuPoses.ts, W1 / W2), magazine leak and hand guard. Checker PASS (code); visuals pending.

## Resume prompt
```
Night Shift | Menu Notes Build: RESUME. Folder C:/NightShift/Mobile-Coop-menu-notes, branch feature/menu-notes (branch
guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/menu-notes/BRIEF.md,
PLAN.md and this STATE.md, and continue from "Now" with the loop in docs/systems/session-method.md. Report to
"Night Shift | Orchestrator". Opus, high effort.
```
