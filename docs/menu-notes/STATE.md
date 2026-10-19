# Menu notes - state

## Now (2026-10-19 23:55, PR #27 open, branch frozen for the orchestrator's merge)
PR https://github.com/Tekcry/Mobile-Coop/pull/27 "menu-notes: Michael's walk-test menu notes" is open. Laptop runner on
4ae2d2f2: `npm run check` PASS (66 s, 1810 unit tests); full `npm run e2e` PASS, all 31 suites ok, 1388 s (E2E_JOBS=1,
E2E_SUITE_TIMEOUT=900). After 4ae2d2f2: master 4.7.4 / 4.7.5 merged in (CHANGELOG conflict only; master's changes are
docs and tests/lightField.test.ts) and this STATE. The orchestrator reviews, adds the 4.8.0 version commit and merges:
no pushes to feature/menu-notes until it says the PR is merged.

History: c626147a's full run (600 s cap) failed only on load and the cap; solo reruns passed (git log of this file).

## Next
1. After the orchestrator says #27 is merged: the boot-time check (orchestrator ask) on a new follow-up branch from
   master, when the desktop heavy.lock is free (CT Core first). The slice 2 gate holds the menu until the hero, weapons
   and shaders are ready. Measure boot-to-menu under software GL on master (with the gate) and at v4.7.5 (before it)
   with `E2E_PORT=4191 node scripts/menu-boot-time.mjs 3`, serving each dist/ on 4191 in turn. If the gate adds more
   than a few seconds per page, make the e2e helpers wait on `window.__app.current.bootGate` instead of a fixed time
   (a follow-up PR, not a blocker).
2. Clean-up: `git worktree remove --force C:/NightShift/Mobile-Coop-menu-notes-shots` (scratch worktree for GPU shots;
   remove its node_modules junction first with `cmd /c rmdir` so the real node_modules is not touched). Then STOP.

## Open
- Slice 3 visuals not yet seen (GPU pending): W1 / W2 framing, H2-H4 pistol vs plate (one-word switch in menuSets.ts),
  H5 holster, T1 / T2 face framing, the skinned hand near the magazine, no proxy parts or lone magazine.

## Polish list (non-blocking)
- Load gate: a long gfx-high shader compile with no bytes arriving could hit the 12 s stall in menu-boot-shots; operator files fetched outside loadModel are not counted in the MB line; tick() allocates per frame during the gate; readCounted peaks at about twice the file size (preallocate from Content-Length).
- The loadout and lobby stage still compiles its shaders on the first visit.
- Pad-only player in a browser that blocks autoplay hears no title music until a key or click (Chromium limit).
- menuPoses test: use PLAYER_HEIGHT, hyp3, note that the guard is pose-independent, add forearm samples.
- A hold change between void shots glides (0.1-0.45 s) during the crossfade; snap on a shot change if it shows.

## Done
- 2026-10-19: master 4.7.3-4.7.5 merged; orchestrator CT Core items (4ae2d2f2: no Default shoulder row, Controls lists the CT trigger and mouse verbs; player.ts still reads defaultShoulder, left to CT Core); laptop check + full e2e PASS on 4ae2d2f2; PR #27 opened.
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
