# ghost-fix - state

## Now
Fixed; PR to master (patch). Waiting for its test tier.

## Done
- 2026-10-20: worktree from master 4.13.0; DIAGNOSIS.md: at Epic (Babylon's TAA, the only preset with it), the aim
  depth-of-field ray called `getDirection` on the camera before the render, so Babylon saw a moving camera as still and
  TAA never reset its history while aiming; and the TAA history had no clamp, so fast arms and guns left copies.
- Fix: `gameState.ts` uses the camera's own `forward` (no matrix read before the render); `postStack.ts`
  `taa.clampHistory = true`. GPU strips at Epic (`scripts/ghost-strip.mjs`): before, 17 draw frames moving but seen as
  still (`-m`) and heavy trails; after, every moving frame seen as moving (`Mm`), no trails. Contact sheets in
  `shots/` (per-frame PNGs left out of git, 329 MB). `npm run check` passed.

## Open
- High / Ultra use the custom TAAU (clamps and reprojects); not affected by this path. A hand look at Epic on the PC.

## Resume prompt
```
You are "Night Shift | Course Ready Build", job lead for ghost-fix. Folder C:/NightShift/Mobile-Coop-ghost-fix, branch
feature/ghost-fix. Branch guard before every write:
cd /c/NightShift/Mobile-Coop-ghost-fix && test "$(git rev-parse --abbrev-ref HEAD)" = feature/ghost-fix && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-ghost-fix"
Read CLAUDE.md, docs/ROADMAP.md, docs/ghost-fix/BRIEF.md and this STATE.md; carry on from "Now".
```
