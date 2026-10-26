# Guard AI J16: character shadows in guard perception (brief)
Owner: Guard AI Build. Status: current.

Lead: Guard AI Build. Started: 2026-10-27. Base: master 1b20393c7. Job: FOLDED-PLAN J16 (origin/feature/menu
`docs/orchestrator/FOLDED-PLAN.md` row J16), the perception half. Sector Ops owns the meter half
(`docs/char-shadow-meter/`, on master); its hand-off to Guard AI is that PLAN's section 6.

## Michael said
- 2026-10-23 ~14:42, chat (G315), on real-time character shadows: "yes i want to include this system now as its one of
  the main focus of the game".
- 2026-10-25 ~11:20-11:35, re-audit answers, item 6, character shadows: "Meter and guards read them" (G352).
- 2026-10-25 ~16:50, folded plan answers, Q14 guards and your cast shadow: "A faint cue" (G379).

## Michael picked
- 2026-10-25 ~16:50 Q14 (FOLDED-PLAN section 2): "Guards and your cast shadow?" -> picked: "A faint cue" (from "No,
  shadows only darken, as CT" / "A faint cue" / "Counts as seeing you").
- The Guard AI review's longer text for that option (not Michael's words, the option he picked): "Faint cue: a moving
  shadow in his focus cone raises suspicion only, never detection".

## Goal
With `charShadowLight` on, guards, dogs and bodies cast the same character shadows in the light the guards read as the
meter and the picture do, and a guard who cannot see a player but sees that player's moving shadow in front of him
grows suspicious and looks at it: a small rise, never a sighting, never a walk over, from the shadow alone.

## Limits
- Out of scope: the meter, the contract, the light field, `ShadowCues` and its fill, the picture, settings text and the
  parity card (Sector Ops: S3b-2, S4, S5); the operator's capsule (Player: `fillOperator`); lamp levels (J10).
- Rules that hold: G352, G379, VISION hard rule 1 (light parity; a cast shadow is a faint cue, never a sighting);
  CLAUDE.md: gameplay never reads graphics state (no mesh, rig, shadow map, preset or governor), hot paths allocate
  nothing (`hyp2` / `hyp3`, no closures), strict TS, unfinished work dark behind its flag; co-op: host only, no wire or
  save change; two Opus checkers on every AI PR (RULES "A job").
- Flag: `charShadowLight` (src/core/flags.ts:106, :287; owner Sector Ops Build). Off: every path is today's. Note:
  `darkFlag` turns it on by default on /preview/ builds (flags.ts:195-201), so the cue is live there once wired.
- Areas touched and their unwalked count (ROADMAP on feature/menu, "Waiting on Michael"): Guard AI 5 (at cap), Lighting
  3 (at cap), Sector Ops 3 (at cap). Built dark; switch-on waits for Michael's walk (G355).
- Main focus (Michael 2026-10-26 ~19:40): the piano escape scene comes first for every lead it touches; this job takes
  spare capacity.

## Answers (M) and assumptions (A)
- M: none yet.
- A1 What counts: a footprint point (`ShadowCues.pts`) with contrast >= 0.40 (the field gives 0..0.85). Undo:
  `SHADOW_NOTICE.contrast` in src/ai/shadowNotice.ts.
- A2 Moving only (the picked option's "a moving shadow"): the footprint's `speed` >= 0.3 m/s. A still player under a
  swinging pendant has a moving shadow and counts. Undo: `SHADOW_NOTICE.moving` 0 (still shadows count too).
- A3 Where: the focused cone only (|angle| <= `PERCEPTION.focusHalf`, 27.5 deg), 1-10 m horizontal from the guard; no
  peripheral vision. Undo: `SHADOW_NOTICE.half` / `.near` / `.range`.
- A4 One line-of-sight ray (`losClear`, slack 0.2) from his eye to the nearest qualifying point per think, counted in
  `PERCEIVE.maxRays` at 3+ players. No light test at the floor point beyond Sector Ops' `CUE.minLevel` 0.08 at the
  chest. Undo: drop the ray (tests say which cases then pass through walls) or raise `CUE.minLevel` (Sector Ops).
- A5 How much: the reaction is `hearTurn`'s (enemy.ts:1367): meter floor 0.35 (`PERCEPTION.suspicious` 0.3 + 0.05;
  below hearing's `turnMax` 0.45 and `investigate` 0.6), stimulus at the point, `turnT = ALERT.hearLook` 2.4 s. No
  `heard`, incident, board report, bark, `lastKnown`, `sawOnce` or target change. Undo: `SHADOW_NOTICE.enabled` false.
- A6 Who: a guard not alerted, not passive, not a dog, at unaware / cooldown / suspicious with no incident task; only
  for a live player whose sight rate this think is <= `PERCEPTION.leak` (he does not see him). Undo: the gate list in
  `Enemy.shadowLook` (one function).
- A7 Owner keys: guards and dogs `occKey(kind, Enemy.num)`, bodies `occKey(OCC_KIND.body, Body.num)` (a new numeric id),
  not list indexes, so a list change between the fill and a sample never makes a body shadow itself. Undo: internal.
- A8 A carried body adds no capsule of its own: its carrier lives in src/game (`StealthSystems.carry`) and src/net
  (`CoopHost.carries`), out of src/ai's reach, and the carrier's player capsule already spans the shoulder load; it goes
  to Player's `fillOperator` (the operator's shape while carrying). Undo: a `carriedInto` hook in G4a.
- A9 Shapes: guard a = feet + 0.25 m, b = `Enemy.simHead` (crouch, lean, wall from `guardHead`), r = the hit capsule's
  `bodyR` (`hitVolumes`, cached per guard); dog from rump to `simHead` at `DOG_BODY_Y`, r 0.15; lying body from the
  pelvis (`Body.lie`) along `headYaw` by `headReach`, r = `lieLift`. Cull and order as the interim fill (`FILL.reach`
  30 m from any player, list order). Undo: G4a's one line back to `fillVictims`.
- A10 Co-op client: keeps `fillVictims` for its puppets (no better sim source there); no cue (no `EnemyManager`,
  `shadowCues` null). Nothing new on the wire.
- A11 Explainable: the decision is one pure function over logged inputs (point, contrast, speed, angle, distance, ray);
  each guard keeps his last reaction (`cueT`, `cueX`, `cueZ`, `cueSlot`) for the debug probe and the e2e. No HUD change:
  the existing white arc shows it. Undo: none needed.

## Questions for Michael (one click each, asked by day)
- None. Q14 is answered; A1-A6 are the numbers of the picked option, tuned at the walk.

## Sign-off needed
No (no map, layout or look).
