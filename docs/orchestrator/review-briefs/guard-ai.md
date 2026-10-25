# Conformance review: Guard AI Build (plan only, no code)

Michael (G355): "All current maps/features should be revised once documentation work has been completed". No src, test, map or config change.

## Docs
origin/master after #407 (and #400) land (until then read `C:/NightShift/Mobile-Coop-doc-polish-l`).

## Scope
`src/ai/` on every live map (`ctcourse`, `campusOps`, `warehouseOps`, Tallow Wharf on feature/mission-engine), and `src/config/enemies.json`; `docs/systems/ai.md`, `docs/guard-ai/`; open #387, #360, #317 (coop4).
- Lookouts on high routes, paired patrols (G335): pairs.ts, patrol.ts, posts.ts, squadRoles.ts; G44 base rule (perception.ts `pitchFactor`).
- Helmets by tier (G338, G341, G350): guardHelmet.ts, helmetDrops.ts, enemyManager.ts (alarm-stage helmets today).
- Dogs (G348): dogHead.ts, dogModel.ts, takedown and gas paths; kill penalty.
- Shadow reading (G352) with Sector Ops lighting: perception.ts, lightCheck.ts, awareness.ts; anim tier `animTier.ts`, `animTierView.ts` (G327; wip/guard-ai-t1-shadow).
- Hearing, radio, response (G299, G300): hearing.ts, radioNet.ts, response.ts, alarm.ts, sweepTeam.ts.
- Archetypes per mode (heavies, dogs, riot shields, armour): archetypes.ts, enemyDefs.ts, guardShield.ts.

## Compare against
- `docs/VISION.md` 2 (Guards row), 3 (G240, G298, G335, G299), 4 rules 1, 3, 4, 8, 9, 10.
- `docs/design-bible.md` 5.7 (P5), 5.6 (helmets, the rule's owner), 5.2 (sound), 5.1 (perception parity).
- `docs/level-design.md` 3.6, 4.1-4.12 (4.10 archetypes per mode, 4.12 unavoidable), 5.5.
- DECISIONS G11, G44, G143, G155, G180, G297, G307, G327, G332, G335, G348, G350, G352, G353 (civilian kill), G359.

With Sector Ops: agree one owner per side of G352 (meter: Sector Ops; perception: Guard AI) and list the shared files.

## Output
`docs/conformance-guard-ai/CONFORMANCE.md`:
1. Gap table, hard-rule breaks first: item | rule (doc + section / G) | current state with file:line | gap | fix size S/M/L | needs Michael?
   S under 2 h, M 2-6 h, L over 6 h or its own job. "Needs Michael" = a missing or conflicting decision, or a fix that loosens a Michael-only rule; give native multiple-choice options.
2. "Checked, conforms": one line per scope item with no gap.
3. Per map: archetypes present vs the mode's allowed list.

## Where
Branch `feature/conformance-guard-ai` off origin/master, worktree `C:/NightShift/Mobile-Coop-conformance-guard-ai` (laptop). Commit and push each section; fragment `changes/feature-conformance-guard-ai.md` (`kind: patch`); a docs-only PR to master, "Conformance review: Guard AI (plan only)". One fresh Opus checker (re-finds every file:line, checks each citation, looks for missed scope items) posts `checker`. Message the orchestrator with the PR number.

## Deadline
One session. Push a partial table every hour.
