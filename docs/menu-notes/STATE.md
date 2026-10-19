# Menu notes - state

## Now
Slice 2 (notes 2, 4): load screen held until the menu stage, the hero and the weapon meshes are ready; hero LOD check.

## Next
GPU contact sheets for slices 2 and 3 when the desktop heavy.lock is free (commands in SLICE3.md), then the end step
(PLAN.md).

## Open
- Slice 1 logic e2e running on the laptop runner (c999919f, check passed there, 213 s).
- Slice 3 visuals not yet seen (GPU pending): W1 / W2 framing, H2-H4 pistol vs plate (one-word switch in menuSets.ts),
  H5 holster, T1 / T2 face framing, the skinned hand near the magazine, no proxy parts or lone magazine.

## Polish list (non-blocking)
- Pad-only player in a browser that blocks autoplay hears no title music until a key or click (Chromium limit).
- menuPoses test: use PLAYER_HEIGHT, hyp3, note that the guard is pose-independent, add forearm samples.
- A hold change between void shots glides (0.1-0.45 s) during the crossfade; snap on a shot change if it shows.

## Done
- 2026-10-19: worktree, BRIEF / PLAN / STATE.
- 2026-10-19: slice 1 (c999919f): title music, Back on the main menu does nothing (A1), one Controls place (A2). Checker PASS.
- 2026-10-19: slice 3: rifle and pistol in the void shots (menuPoses.ts, W1 / W2), magazine leak and hand guard. Checker PASS (code); visuals pending.

## Resume prompt
```
Night Shift | Menu Notes Build: RESUME. Folder C:/NightShift/Mobile-Coop-menu-notes, branch feature/menu-notes (branch
guard from CLAUDE.md before every write). Read CLAUDE.md "Sessions", docs/ROADMAP.md, then docs/menu-notes/BRIEF.md,
PLAN.md and this STATE.md, and continue from "Now" with the loop in docs/systems/session-method.md. Report to
"Night Shift | Orchestrator". Opus, high effort.
```
