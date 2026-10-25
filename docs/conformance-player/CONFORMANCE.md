# Conformance review: Player Build (plan only)

Michael (G355): "All current maps/features should be revised once documentation work has been completed". Plan only:
no src, test, map, script or config change. Brief: `docs/orchestrator/review-briefs/player.md` on origin/feature/menu.
Docs read from origin/master 829a933 (4.102.0, after #407). Authority order: `CLAUDE.md` (G86).

Scope: movement and traversal, input, animation and mocap, takedowns / grabs / carry, the co-op player and kit, guard
models; maps `ctcourse`, `campusOps`, `warehouseOps` and Tallow Wharf (origin/feature/mission-engine).

Fix sizes: S under 2 h, M 2-6 h, L over 6 h or its own job. "Needs Michael" = a missing or conflicting decision, or a
fix that loosens a Michael-only rule.

## 1. Gap table (hard-rule breaks first)

In progress.

## 2. Checked, conforms

In progress.

## 3. Unwalked features in the area

ROADMAP "Waiting on Michael" (origin/feature/menu), Player / animation: last walk 4.72-4.73 (2026-10-23 ~13:55);
unwalked: AF0-AF6 animation fix pass (4.84.0), optic cable partner view, client body carry. Count 3: AT CAP. The cap
limits switch-on only (RULES "Walk pacing", G355). Also waiting: #375 gm-flip look picks then a one-click OK (guard
models on by default).
