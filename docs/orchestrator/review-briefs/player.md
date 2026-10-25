# Conformance review: Player Build (plan only, no code)

Michael (G355): "All current maps/features should be revised once documentation work has been completed". No src, test, map or config change.

## Docs
origin/master after #398, #402, #404 land (until then read `C:/NightShift/Mobile-Coop-doc-polish-l`).

## Scope
Every live map players move on: `ctcourse`, `campusOps`, `warehouseOps`; Tallow Wharf from `git show origin/feature/mission-engine:src/world/maps/tallowWharf.ts`.
- Movement and traversal: `src/player/` (movement.ts, traversal.ts, wallController.ts, splitJump.ts, opticCable.ts), `src/config/movement.ts`, `src/input/`; `docs/systems/movement.md`, `input-and-loop.md`.
- Animation: `src/anim/`, mocap; `docs/anim-fix-pass/` (AF0-AF6, unwalked).
- Takedowns, grabs, carry: `src/game/takedown*.ts`, grabMenu.ts, bodyCarry.ts; `docs/systems/takedowns.md`.
- Co-op player: `src/net/` player parts (remoteAvatar.ts, remotePlayer.ts, hangHold.ts, throwKo.ts, clientCarry.ts), `src/game/teamController.ts`, the co-op kit (`src/game/kit/` on feature/mission-engine); open #384, #388 (coop-real), #389 (client-intel).
- Guard models: `src/ai/guardBody.ts`, guardHead.ts, guardHelmet.ts, enemyRig.ts; `docs/guard-models/`; #375 gm-flip.

## Compare against
- `docs/VISION.md` 1 (pad first), 3 (G181 / G192 wheel, G210 / G243 trained operator, G264 mocap, G293 kit), 4 rules 1 (character shadows, G352), 7, 10.
- `docs/design-bible.md` 4 (verbs), 5.3, 5.4, 5.6 (helmet model per tier, G350), 5.9, 5.12 (5.12.1-5.12.2), 5.17 (D1-D8).
- `docs/level-design.md` 11.8-11.9 (kit bands, `sizes.coop_lip`; open item 1: `TEAM.ladderGrab` 4.1 m vs G57 4.5 m), 12.1.
- `docs/RULES.md` "A job" (look videos), "Definition of done" (animation standard).
- DECISIONS G25-G36 (starting values, G356), G308, G327.

## Output
`docs/conformance-player/CONFORMANCE.md`:
1. Gap table, hard-rule breaks first: item | rule (doc + section / G) | current state with file:line | gap | fix size S/M/L | needs Michael?
   S under 2 h, M 2-6 h, L over 6 h or its own job. "Needs Michael" = a missing or conflicting decision, or a fix that loosens a Michael-only rule; give native multiple-choice options.
2. "Checked, conforms": one line per scope item with no gap.
3. Unwalked features in the area (walk cap, RULES "Walk pacing").

## Where
Branch `feature/conformance-player` off origin/master, worktree `C:/NightShift/Mobile-Coop-conformance-player`. Commit and push each section; fragment `changes/feature-conformance-player.md` (`kind: patch`); a docs-only PR to master, "Conformance review: Player (plan only)". One fresh Opus checker (re-finds every file:line, checks each citation, looks for missed scope items) posts `checker`. Message the orchestrator with the PR number.

## Deadline
One session. Push a partial table every hour.
