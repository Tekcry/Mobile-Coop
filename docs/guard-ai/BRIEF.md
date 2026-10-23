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
cameras; Answers 3 ~01:25). G11 impromptu search pairs. G44 guards see poorly above (#169). Bible "No randomness that
defeats planning. Patrol cycles are fixed per map" (G143 is the per-run randomised codes / items / rooms). G190 room to
manoeuvre beats guard count. Every map's guards are armed (Answers 3).

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
- **A2** A completed dead-body radio report makes the section cautious (held) but does not raise the alarm or bring
  reinforcements; only an alarm panel or a completed "contact, send backup" command call does (M4 read literally; CT
  counts a seen body as an alarm, research C1). Undo: `ALARM_ON_BODY_REPORT = true`.
- **A3** "Eliminate any that are aware" counts knocked out as eliminated until he is woken; a woken aware guard brings the
  hold back. Undo: count only dead.
- **A4** KO caution: the waker and the woken guard search 60 s round the spot, then stay cautious 180 s, then normal
  (M3 "a few minutes"). Undo: the `CAUTION` table.
- **A5** Sector Ops cameras and lasers that see a player keep raising the alarm (they are the security system's alarm,
  like a panel); camera body sightings only send guards (M6). Undo: route camera / laser alarms through a command call.
- **A6** "Own section" (M5) = the live Sector Ops section (`SectorDef`); other maps are one section unless
  `MapLayout.guardAi.zones` splits them. Radio reaches the whole live section, staggered by distance, max 4.5 s.
- **A7** Choices (investigator, radio order, roles) are by path distance then guard key, never random (G143); combat
  variation uses a seeded RNG per guard per incident in place of `Math.random`. Undo: none needed (replayable).
- **A8** Cautious music: the held caution does not hold the Cautious music (G67) for its whole length; music follows the
  existing alert levels. Undo: map caution to the music tier.
- **A9** Paces: patrol 1.1 (unchanged, keeps the Sector pace checks), cautious patrol 0.95, investigate 0.85, search 0.75
  x walkSpeed; runs only between covers, to a panel, or for aggressive profiles. The slow search pace and calm turn
  apply to calm searches only (a body, a call, a pair); a search that follows combat keeps 1.3 and the aimed turn
  (S2 fix round 2, `Enemy.combatSearch`). Undo: `enemy.ts` pace table.
- **A10** Posted high-security guards: a distraction pulls them to the edge of their leash circle (which map authors size
  so the edge is off the choke), they look, then return facing their post; they never join a search or run to a panel
  outside the leash. Undo: `highSecurity: false` on the slot.
- **A12** A lured posted guard looks toward the lure for at least 5 s at his leash edge (sweep <= +-0.6 rad, so he
  faces away from the choke) before walking back; Course Ready's K4 solo clear (two single takedowns) relies on it.
  Undo: the post look time in the `POST` table (tell Course Ready).
- **A13** (S3) Loud alerts (a hit, gunfire close by, the end of a flashbang, spawned alerted) take the same voice shout
  and 2.5 s contact call as a sighting, instead of the old instant 22 m fan-out: taking out a guard who was just shot
  at also stops his call. Undo: in `Enemy.onLevel` (src/ai/enemy.ts, the `netOn` branch) route `loudAlert || gunfire`
  to an immediate `radioCall` completion (hold 0).
- **A11** Sector Ops tour guards that are melee-only conflict with "every map's guards are armed" (Answers 3): map data,
  passed to Course Ready, not changed here.

## Stealth over shooting (ROADMAP Decided 2026-10-23 ~10:10; plan S11-S15, `research/stealth-over-shooting.md`)
Michael's theme, verbatim: "reward stealth over shooting as sections get harder"; on alarms: "dont add cameras, that
doesnt make sense". A32-A34 are S10's (on `feature/guard-ai-s10`).
- **A35** (S12) Helmet: the first bullet to the head knocks it off (no damage, stagger 0.9 s, then the normal hit path:
  combat on the shot's origin, contact call); the next head hit kills as today. Takedowns, grabs, sleep bolts, melee
  and explosions ignore the helmet. Undo: `GEAR.helmetHits` 1 -> 0 (`src/ai/gear.ts`).
- **A36** (S12) Body armour: a bullet to the body deals no damage and staggers 0.5 s, at most once per 1.5 s (no
  stun-lock); head hits follow the helmet rule. Item 13 "torso shots only stagger" is read literally for every armour,
  including the alarm-stage armour (CT's stage armour halves chest damage instead). Undo: `GEAR.armourMult` 0 -> 0.5.
- **A37** (S13) Gear by alarm stage, Sector Ops: stage 1 a response team only, stage 2 + armour, stage 3 + helmets
  (CT's order, research C4). Every living guard of the live section gets it at once (no suit-up beat), later spawns at
  spawn; it carries over sections with the stage and a restart drops it with the stage. Other live maps: the one alarm
  is stage 1. No camera is added or changed. Undo: the `GEAR_BY_STAGE` table.
- **A38** (S13) A response team is the stage's `perStage` guards led by a shield guard (`enforcer`, always helmeted),
  the rest armed guards: same count, so the live cap holds. Outside Sector Ops the team is shield + 2 guards (in place
  of grunt, grunt, heavy; G155). `validateGuardAi` rejects an `enforcer` in a section's guard list. Undo:
  `RESPONSE.shieldLead = false`.
- **A39** (S13) Sweep: after the LKP search (60 s) a response team walks the section's route points and posts (thinned
  to 8 m, nearest the LKP first, each once, then again), shield first, the rest 2.5 m behind, 6 s at each; teams of
  different stages start at different points. Never calm, never leaves; only a section unload or restart ends it.
  Undo: `SWEEP.enabled = false` (they search the LKP for good, S6).
- **A40** (S14) "Raise alert" (item 6) means section caution, not an alarm stage (A2 kept). A missed check-in: the
  caller radios "not answering" (2.5 s x reaction, cut if he goes down); on delivery the section is cautious 180 s
  (timed); the S5b pair search is unchanged; a dead find promotes it to the S4 held caution. Found bodies: S4 as
  built. Undo: `MISSING.sectionCaution = false`.
- **A41** (S14) Gunfire (item 7): hearing stays by range (M1, S1). A calm guard who hears a loud (unsuppressed) shot
  radios "shots fired" (one call per shots incident, cuttable); on delivery the section is cautious 120 s (a later loud
  shot refreshes it) and the board sends a pair instead of one. Suppressed shots stay local. No alarm from shots (M4).
  Undo: `SHOTS.sectionCall = false`.
- **A42** (S15) A breaker cut is a fault: one witness (never two) walks at patrol pace to the switch and flips it back
  (2 s), no ring check, suspicious at most, back to his route. A second cut of the same circuit within 60 s is
  tampering: the S2 light incident at the switch. Shot lamps stay dark for good (never relit). Undo:
  `BREAKER.reset = false` (the S2 light incident for every cut).
- **A43** (S15) Late discovery: a dark fixture nobody saw go is noticed by a calm guard who later has it in view
  (`lightInView`) within 12 m; he reacts as a witness would (shot: investigates; cut: the reset walk). Undo:
  `LATE.enabled = false`.
- **A44** (S9) Protocol 32 carries S9's barks and caution plus `AL_HELMET` 32, `AL_ARMOUR` 64 and a `deflect`
  hit-confirm kind; until S9 lands the client sees no gear (the rules still apply on the host). The client puppet builds
  the enforcer shield by kind (no wire change for that). Undo: drop the bits (host-only gear).
- **A45** (S12, S13) Gear art is placeholder parts (a dome on the head node, torso plates, the enforcer's box shield,
  the dome as the dropped helmet); real meshes are a Character Build / art hand-off for the visual pass (in-repo
  Blender, headless). Undo: not needed.
- **A46** (S14) A co-op client's suppressed shot is heard at `SHOT_NOISE x weapon noise` as in solo (9.8 m), not the
  fixed 14 m (`coopHost.ts`). Undo: restore `SHOT_NOISE * 0.5` there.
