# Menu notes - state

## Now
All notes and M1-M4 built. Full `npm run e2e` on the PR head, then the PR to master.

## Next
GPU contact sheets for slices 2 and 3 when the desktop heavy.lock is free (commands in SLICE3.md), then the end step
(PLAN.md).

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
