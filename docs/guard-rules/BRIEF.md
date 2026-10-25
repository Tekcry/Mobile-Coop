# guard-rules: brief
Owner: Guard AI Build. Status: current.

Lead: Night Shift | Guard AI Build. Started: 2026-10-25. Base: master 2148ec969. Planner: Opus 5.5.
Job: FOLDED-PLAN J15 (`docs/orchestrator/FOLDED-PLAN.md` section 4 on origin/feature/menu). Plan: `docs/guard-rules/PLAN.md`.

## Michael said
- 2026-10-25 ~10:20, chat (helmets, asked again after the docs audit): "Base it off difficulty, harder difficulties
  always have helmets, and hardest difficulty you can't shoot the helmet off."

## Michael picked
- 2026-10-25 ~09:45 Q (level-design framework conflicts, item 6): static lookouts on some high routes and paired patrols
  that check on each other -> picked: "Add both" (G335).
- 2026-10-25 ~09:45 Q (item 4, helmets) -> picked: "Keep CT way" (superseded by his ~10:20 words above and ~11:20 (4)).
- 2026-10-25 ~10:45 Q (campaign helmets) -> picked: "Same rule" (G341).
- 2026-10-25 ~11:20 Q (2) Sector Ops dogs -> picked: "Penalty for killing, can be knocked out with gas, no takedown, or
  can be distracted" (G348).
- 2026-10-25 ~11:20 Q (4) which difficulties are "harder" -> picked: "Realistic + Perfectionist" (G350).
- 2026-10-25 ~11:20 Q (9) walk cap -> picked: "Yes (Recommended)" (G355: the walk cap limits switch-on only; rule fixes
  to shipped features are fixes).
- 2026-10-25 ~16:40 Q9 "Penalty for killing a guard dog" -> picked: "Kill + lose score (Recommended)" (option: it counts
  as a kill, so no Perfect, and costs score).
- 2026-10-25 ~16:50 Q12 "Do campaign alarm teams carry riot shields?" -> picked: "No, armed only (Recommended)".
- 2026-10-25 ~16:50 Q13 "Where may a "vent" lookout stand?" -> picked: "Overlooking it (Recommended)" (option: where he
  overlooks the vent run or exit).
- 2026-10-25 ~17:00 the folded plan -> picked: "Sign off, start (Recommended)".

## Goal
Guards follow Michael's rules: helmets by difficulty (Realistic and Perfectionist always, Perfectionist's never shot off
while the second headshot still kills, Rookie / Normal only from the alarm stages), riot shields only in later Sector
Ops response teams and never in the campaign, dogs never taken down and a dog kill counts as a kill and costs score (a
gas knock-out costs nothing); then the G335 additions: lookouts on high routes, pairs that check on each other, posted
pairs, plus the rule gaps the review found (repeat alarms, barks by cause, dog release, placed-shield check).

## Limits
- Covers (FOLDED-PLAN J15): Guard AI conformance A3 A4 A5 B2 B3 B4 B5 B6 B7 B8 B13 B16 C4 D5; Player R1-R5; Sector Ops
  M8-M10. Nothing else.
- Out of scope: dogs out of Tallow Wharf and the mode-aware campaign guard check (J7, break 10); campus guard counts,
  3-4 player tags and new campus guards (J17); per-area alarms, noise zones (J26); civilians (J25); character shadows
  in perception (J16); the per-detection cause log (J13); hot-path hygiene in `src/ai` (J6). Gas knockout and dog
  distraction are already built (`docs/systems/takedowns.md:18-21`: gas knocks every enemy out; dogs keep `Enemy.hear`,
  `docs/systems/ai.md:71-72`): no work.
- Rules that hold: G146 (Perfect = no kills, no alarms), G155 / G341 (campaign: no dogs, no heavies, CT alarm-stage
  gear), G297 / G307 (Sector Ops: dogs, late armour, riot shields only in response teams), G335, G338, G348, G350,
  G355; VISION 4 rules 4 (no forced kill) and 8 (fixed patrols, explainable detections); CLAUDE.md hot paths and flags.
- Rule fixes to shipped features ship on (G355); new behaviour ships dark behind its flag (PLAN "Flags").
- Areas touched and their unwalked count (ROADMAP "Unwalked", cap 3): Guard AI 5, AT CAP (the three new flags stay off
  until walks bring it under); Sector Ops 3, AT CAP (data only, fixes); Player / animation 3, AT CAP (dog takedown
  removal is a fix).

## Answers (M) and assumptions (A)
- M1 2026-10-25 ~16:40 (Q9): a dog kill counts as a kill (breaks No kills and Perfect) and costs score.
- M2 2026-10-25 ~16:50 (Q12): campaign alarm response teams are armed guards only, no riot shield.
- M3 2026-10-25 ~16:50 (Q13): a lookout on a vent route stands where he overlooks the vent run or its exit.
- M4 2026-10-25 ~11:20 (4) and ~10:45: helmets: Realistic and Perfectionist always, Perfectionist cannot be shot off,
  Rookie / Normal only from the alarm stages; the same in the campaign and Sector Ops.
- M5 2026-10-25 ~11:20 (2): dogs: no takedown of any kind, gas knocks out, can be distracted, a kill carries a penalty.
- A1: difficulty helmets apply in `SectorMode` only (Sector Ops, and the campaign, which runs on it); Marlow Yard and the
  parked modes keep today's gear. Weighed: Marlow Yard is the campaign's training prologue (Q6, ROADMAP row 18) and
  takes "Difficulty: As campaign" (VISION 2), but bible 5.6 / G341 name the campaign and Sector Ops, and Marlow's drills
  set their guards one by one (Q11: only the guards a drill needs), so its gear stays Marlow Build's. Undo: call the
  same switch from `courseMode` (one line).
- A2: on Perfectionist every helmet is locked, whatever gave it (difficulty, stage, the shield lead): it is never shot
  off (G350, Michael's words) and it still soaks only the first headshot, so the second headshot kills (G307 (2), bible
  5.6 `docs/design-bible.md:506-507`). `gearHit`: head + locked helmet not yet hit = no damage, the knock-off stagger,
  no knock-off, the soak recorded on the guard (`GuardGear.helmetSoaked`); head + locked helmet already hit = the bare
  head rule (the caller kills); the helmet stays on and the `AL_HELMET` bit never clears. Keeps both recorded rules, so
  no guard is bullet-proof. Undo: `GEAR.lockHelmets` false (the first headshot knocks it off again, as on Realistic).
- A3: alarm stage 2 gives every living guard a helmet as well as armour (bible 5.7 "Level 2: more guards wear helmets
  and armour"; the code already gives stage armour to every guard); with A2 the second headshot still kills them. Undo:
  `GEAR_BY_STAGE[2].helmet` false.
- A4: Sector Ops riot shields lead the response from S4 and S5 only (the sections with late armour, the dogs and all
  bulletproof cameras); S1-S3 and the frozen warehouseOps get armed guards only, by the new default. The orchestrator's
  J1 fix of bible 5.7 settles the sections; the data follows it. Undo: `shieldTeams: true` on any `SectorDef`.
- A5: a dog kill (`!e.ko`) scores the dog's old reward reversed: -120 base, x1.1 per tier above 1 as every kill, no
  headshot bonus (score may go below 0 in the run; the stored record already clamps at 0,
  `src/progression/profile.ts:108`). A gas knock-out (G348) costs nothing: it keeps today's knock-out score and does not
  break No kills (`onEnemyKilled` runs for knock-outs too and scores before its `e.ko` check,
  `src/game/modes/sectorMode.ts:1311-1319`). Undo: `KILL_BASE.dog` back to 120 in `src/game/modes/score.ts`.
- A6: dogs keep their `takedownSpot` data (the scan skips dogs, so it is unused); dropping it from the type and the
  campus tests is Sector Ops' (J17). Undo: none needed.
- A7 (D5): in `SectorMode` only (Sector Ops and the campaign, where bible 5.7's levels apply), a new guard alarm may be
  raised once the last one's response is in: its newest response team has a member searching, or 60 s after the alarm,
  whichever is first; at most 3 guard alarms per section load (the stage cap 3 holds anyway). `alarmRaised` stays set
  for its readers (calm area, carry); a new lock gates new raises. Marlow Yard (`courseMode`) keeps one guard alarm per
  load (Q11: only the guards a drill needs; no Marlow change in this job); its per-set reset is J26's per-area alarms.
  Undo: `ALARM_REPEAT.enabled` false (one alarm per load everywhere).
- A8 (C4): a rise to investigating says a sight line ("Thought I saw something.") or a sound line ("I heard
  something.") by what drove it; two bark events are appended to `BARK_EVENTS` (`heard`, and `spotCall` for the
  lookout's radio line): a wire change the train's protocol bump covers. Undo: map both back to `investigate`.
- A9 (A3 lookout): a lookout is a post with `lookout: true`, leash at most 1 m, read as a high-security post (never sent,
  never leaves his perch for a search, an alarm panel or combat; a lure turns him in place). When he grows suspicious by
  sight he radios once (`spotCall`, at most every 20 s) and the incident board sends the nearest calm guard within
  `INCIDENT.callR` 25 m to the spot. The radio reports a `noise` incident (the investigate kind,
  `src/ai/incidents.ts:36`); `docs/systems/ai.md` notes it is a radioed sighting, not a sound, for the guard sheet and
  J13's cause log. G44 is unchanged. Map placement: the S5 roof marksman becomes a lookout here (he exists and stands
  on the S5 high route); new lookouts on S1-S3 high routes come with J17's guards, Tallow's with Campaign. Undo: flag `lookouts` off (the post reads as no post, today's behaviour).
- A10 (A4 pair check): a pair that was walking together (within 4 m) notices his partner gone (down, held, despawned)
  3 s later, outside the meeting window as well, and goes to look (the existing `missing` path). Pairs on separate
  loops keep the meeting-window check. Undo: flag `guardPairs` off.
- A11 (A5 posted pairs): two posted guards named as a pair within `PAIRS.meetMax` 6 m talk on a fixed 40 s clock (the
  first 12 s of each period is the window, from build time: no randomness, G143) and check on each other as A10.
  Undo: flag `guardPairs` off (skipped with the warning, as today).
- A12 (B6): a released dog leaves its handler's heel, runs to the shared last known position (none: round its handler)
  and searches it, then heels again on a living handler. Host only; the client sees the snapshot. Undo: flag
  `dogRelease` off (the stage records it, as today).
- A13: campaign response teams lose the shield lead by the new `shieldTeams` default (false) once the campaign branch
  takes master; J7's "no shield lead" item needs no other code. Campaign data must not set `shieldTeams` (M2).
- A14: Marlow Yard drops its shield-led alarm team (Marlow Build, 2026-10-25 ~19:15, answering via the orchestrator):
  VISION's Marlow guards are "Normal, armed" (G279, G298), Q11 (only the guards a lesson needs), Q5 (a Marlow failure is
  a retry, so an alarm has no escalation to train), and Marlow Yard is the campaign's training prologue (Q6), so Q12's
  "armed only" holds there too. S1 passes `false` as the new `shield` argument at `src/game/stealthSystems.ts:594`
  (`responseTeam(1, RESPONSE.liveTeam, this.teamKinds, false)`). Undo: drop that `false`. Marlow Build logs the same
  rule as a J14 assumption.
- A15: helmets never come from map data: `checkSectorGuards` fails a slot `gear` (`GuardSlotTags.gear`,
  `src/ai/guardAiData.ts:98`) or a section `gear` (`src/game/sectors.ts:125`) of `'helmet'` or `'both'` (helmets
  come from difficulty and the alarm stage, G350; `'armour'` stays for late armour, G307 (13)). Guard AI's S1
  validator lands first; Sector Ops' J17 campus data follows and must pass it. Undo: drop the two checks.

## Questions for Michael (one click each, asked by day)
None. (Q1 on Perfectionist helmets was withdrawn in the plan fix round: A2 keeps both recorded rules.)

## Sign-off needed
No (no map layout or look change; the S5 marksman keeps his spot).
