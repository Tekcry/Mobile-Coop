# Guard AI - brief (job guard-ai, Night Shift | Guard AI Build)

Branch `feature/guard-ai`, folder `C:/NightShift/Mobile-Coop-guard-ai`, cut from master ffade187 (4.64.0) with
`origin/feature/g44-above` merged (#169, guards see poorly above, green, train 16). Started 2026-10-23 ~02:00 Sydney.
Plan base: `docs/reviews/guards-review.md` on `origin/feature/menu` (the 2026-10-20 review: noise reaches every guard,
all walk over, aimless patrols, speeds backwards).

## Michael's words (verbatim, ROADMAP "Decided", 2026-10-23)
- **M1** Guard AI (~01:30): "also note that right now every guard hears when things break or someone gets shot which is
  unrealistic. if they are within range they should hear it, depending on whether they are near something noisey, and
  if they see a guard get killed or find one dead/knocked out they should wake them up (if knocked out), report them
  dead, and become cautious. the only way to clear the cautious guards should be to eliminate any that are aware of what
  happened, but if they were knocked out the caution can be limited. if its a broken or distrupted light, one or two
  people should investigate (if only one is nearby then only one investigates), but they should return back to normal
  after investigating the light and general vicinity of the light. guards that get alerted should alert other guards,
  either by voice proximity or radio., but not everyone should be alerted at once. any guards in a highly secure zone
  should not leave their post or area if they are protecting something of high value or a security door that shouldnt
  be accessed, but they should still be able to be distracted at least. always want to improve enemy ai in general,
  making them smarter, work together, flank, use cover to hide and report, they should be smart and tactical, not just
  rush the player, but any reinforcements must be aggressive. ask me questions if needed"
- **M2** Builder (~01:35): "New session" (Night Shift | Guard AI Build).
- **M3** KO caution (~01:35): "Timed, then search ends" (the woken guard and the one who woke him search, stay cautious a
  few minutes, then normal).
- **M4** Reinforcements (~01:35): "After a raised alarm" (alarm panel hit or a radio report that gets through; killing the
  caller first stops it).
- **M5** Radio (~01:35): "Own section, staggered" (voice range first, then that section over a few seconds; other
  sections stay normal).
- **M6** Cameras (~01:37): "cameras should also see dead or knocked out guards, and report to other nearby guards to
  investigate if so."

Related standing decisions: G240 cameras keep IR everywhere (cutting lights beats guards and the light meter, never
cameras; Answers 3 ~01:25). G11 impromptu search pairs. G44 guards see poorly above (#169). G143 no randomness in
patrols. G190 guard pairs are the double-takedown beat. Every map's guards are armed (Answers 3).

## The asks, as testable goals
1. Hearing by range with masking: a noise reaches a guard only within its range, cut by walls, and less near a noisy
   thing (machinery, generator, vent). Not every guard hears a break or a shot.
2. Witnessed kill or found body: the guard wakes a knocked-out guard, reports a dead one (radio), turns cautious.
3. Caution: after a death it clears only when every guard aware of it is eliminated; after a knockout it is timed
   (the woken guard and the waker search, stay cautious a few minutes, then normal).
4. Broken or disrupted light: one or two guards investigate (one if only one is near), check the light and its area,
   return to normal.
5. Alerts spread by voice range first, then radio to the guard's own section, staggered over a few seconds; never
   everyone at once; other sections stay normal.
6. Reinforcements only after a raised alarm (panel, or a radio report that gets through; killing the caller first
   stops it); reinforcements are aggressive.
7. High-security posts (high-value item, security door) hold their post or area, but can still be distracted.
8. Tactical guards: work together, flank, use cover, hide and report, no rushing the player.
9. Cameras (IR, G240) see dead or knocked-out guards and send nearby guards to investigate.

## Ownership and limits
- Mine: behaviour in `src/ai/*` (perception, alertState, enemy.ts, enemyManager.ts hearing, squads, radio, posts,
  reinforcements) and the camera-to-guard reports in the security system.
- Not mine: map data. Course Ready (sector-redesign, research campus, up to 24 guards per section; `ENGINE.md` on
  `origin/feature/sector-redesign` lists the data shapes they need: squads, posts, zones, reinforcements) and Menu Notes
  (marlow-final: `src/game/course/*`, `courseMode.ts`, `ctDevices.ts`, `securityRoom.ts`, `src/world/kit|props|lighting`).
  Data shapes are agreed with them by message. CT Core owns the mocap anim files.
- Protocol: marlow-final has 30, sector-redesign 31; this job takes 32 only if guard state must go on the wire.
- Pure logic in Babylon-free modules with Vitest; hot paths allocate nothing.
- Tests: e2e-stealth-ai, e2e-stealth, e2e-takedown, e2e-coop, e2e-netmove, e2e-ct-warehouse, e2e-sectorops, e2e-ctcourse
  as each slice touches them, all `E2E_GPU=1`, run by Character Build on the laptop (message: branch, commit, suites).

## Assumed decisions (Michael asleep; each with how to undo)
- **A1** M1-M6 are the brief; the review's shortlist (one investigator, paces, barks) is folded in where it serves them.
  Undo: drop the slice.
(More are logged in PLAN.md and STATE.md as they are taken.)
