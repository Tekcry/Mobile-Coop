# Conformance review: Guard AI (plan only)

Owner: Night Shift | Guard AI Build. Brief: `docs/orchestrator/review-briefs/guard-ai.md` (origin/feature/menu).
Base: origin/master 829a9332 (4.102.0). Plan only (G355): no src, test, map, script or config change.
Tallow Wharf read on origin/feature/mission-engine 00b6cde9 ("ME:"); #317 on origin/feature/coop4 24ba2e51 ("C4:").

Status: DRAFT for the checker. 39 gaps: 7 hard-rule breaks, 9 Michael questions. Full rows (every file:line, the fix
detail and the evidence) are in the four parts: `parts/A-patrols.md` (patrols, lookouts, pairs, density),
`parts/B-archetypes.md` (archetypes, helmets, dogs, kills), `parts/C-perception.md` (light, shadows, anim tier,
cameras), `parts/D-response.md` (hearing, radio, alarms, co-op, #317). This file is the folded table; the parts win
on detail.

Sizes: S under 2 h, M 2-6 h, L over 6 h or its own job. Totals: 22 S, 13 M, 4 L.

## 1. Gap table

### 1a. Hard-rule breaks
| ID | Item | Rule | Current state | Gap / fix | Size | Owner | Michael? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | Guards do not read character shadows | VISION 4.1; G352; bible P1, 5.1 L11; CLAUDE.md "one lighting system" | Shadows render only (`src/world/charShadows.ts:8`, `src/world/torchShadows.ts:12`); light field has no character term (`src/world/lightField.ts:229-249`); perception reads `p.light` (`src/ai/enemy.ts:2447`) | Sim-only character occluder feed, bodies and `fieldLight` read the same field, lamp set per sample point (never the camera or preset), tests. Split in 1d | L (own job, ROADMAP row 11) | Sector Ops (meter), Guard AI (perception), Player (operator volumes) | No (C3 shapes it) |
| C2 | Off-view guard with shadow in view animates at 1/4 rate | VISION 4.10; G327; ROADMAP Decided 2026-10-25 ~08:50 | master: seen = camera pass only (`src/ai/animTierView.ts:89`, `src/ai/animTier.ts:65`). Built on #360's branch (31b3353da), 396 commits behind; measure not run | Finish #360 (paused to row 6): measure + look, report, two checkers, train merge | M | Guard AI | No |
| B1 | Tallow Wharf places two dogs | CLAUDE.md "never loosen" level-design; level-design 4.10 [Campaign]; G155 | ME: `src/world/maps/tallowWharfSectors.ts:148,168`, `dogs: 1` `:366,:390`; `checkSectorGuards` not mode-aware (`src/game/sectors.ts:581-597`) | Replace with human posts before SPEC sign-off; mode-aware guard check rejects campaign dogs | S | Campaign (data), Guard AI (check) | No |
| D1 | Guard shots and bites allocate | CLAUDE.md hot paths; `docs/systems/conventions.md:31-34` | `src/ai/enemy.ts:3721-3740` (2 `new Vector3`, chained math, `for...of`), `:3178-3187` (clones) | Scratch vectors, index loop | S | Guard AI | No |
| D2 | Manager tick closures and temp arrays | as D1 | `src/ai/enemyManager.ts:3499` (`some` closure), `:3533-3536` (filter + map), `:695` (`for...of` per ring point) | Index loops, reused buffer | S | Guard AI | No |
| D3 | #317 switches 4-player Sector Ops on live | CLAUDE.md "ships dark behind its flag"; G355; G308 | C4: `src/net/protocol.ts:42-44` `capacity('sector')` 4, no gating flag (`src/core/flags.ts:51-52` is dev only) | `coop4` flag, default off, holds the cap at 2 | S | Guard AI (#317) | Yes, Q7 |
| A1 | Campus guard counts below signed-off counts | VISION 4.9; G328, G332, G362 | S1-S5 hold 8 / 12 / 16 / 20 / 24 (`src/world/maps/campusSectors.ts:33-216`, `campusS4Data.ts:35-71`, `campusS5Data.ts:33-74`) vs 15 / 18 / 20 / 25 / 26 | Data only; AI already allows 26 under 32 (`src/game/sectors.ts:508`) | L | Sector Ops (campus greybox, row 9) | No |

### 1b. Other gaps, Guard AI owned
| ID | Item | Rule | Current state | Gap / fix | Size | Michael? |
| --- | --- | --- | --- | --- | --- | --- |
| A3 | No lookout type on high routes | G335; Decided 2026-10-25 ~09:45 (6); level-design 3.6, 4.2 | `PostDef` has no lookout (`src/ai/posts.ts:20-29`); S5 roof marksman has no post and may be sent off the roof (`posts.ts:91-93`) | Plan first (G335), then a perched post that radios and turns, never leaves; maps place them | L | Yes, Q1 |
| B12 | Civilians not built | bible 5.7; G353; level-design 13 | No civilian kind (`src/ai/enemyDefs.ts:7-8`); Tallow Wharf staff are armed grunts (ME `tallowWharfSectors.ts:86,96`) | Unarmed kind that flees and raises the alarm; kill = section restart; co-op; tests | L | Yes, Q5 |
| A2 | No tag for 3-4 player extra guards | G331, G362 | `SectorGuard` / `GuardSlotTags` untagged (`src/game/sectors.ts:81-102`, `src/ai/guardAiData.ts:84-104`); `sectorMode` spawns all (`src/game/modes/sectorMode.ts:704-705`) | Tag, load filter, cap check at 32, tests; data from Sector Ops | M | No |
| A4 | Pairs check on each other once per loop | G335; level-design 4.2, 4.4 | Missing-partner check only in the meeting window (`src/ai/pairs.ts:31-32,317-338`) | Walk-together partner check (out of sight N s -> look) in the G335 plan | M | No |
| A5 | Posted (static) pairs never build | G335; level-design 4.2 | `buildPair` skips non-loop pairs (`src/ai/enemyManager.ts:2135-2141`); all 4 Tallow Wharf pairs posted (ME `tallowWharfSectors.ts:114-178`) | Posted-pair mode in `PairMeet`; test covers non-route pairs | M | No |
| B2 | Helmets by difficulty not built | G338, G341, G350; bible 5.6 | Gear from slot tag, section and stage only (`src/ai/enemyManager.ts:2012-2015`, `src/ai/gear.ts:30-35`); `DifficultyDef` has no helmet rule (`src/ai/archetypes.ts:176-193`); helmet always knocks off (`gear.ts:138-143`) | Realistic+ always helmeted, Perfectionist locked; host and puppet; tests per tier | M | No |
| B6 | Dog release at an alarm stage is a stub | G297; level-design 4.11 | `src/game/sectorStage.ts:35-38,261-262` records `dogsReleased`; nothing reads it | Release off heel to last seen, then search; host and client | M | No |
| C5 | No per-detection cause record | bible P5; VISION 4.8; G330 | Count only (`src/ui/screens/resultsScreen.ts:13`), debug line (`src/game/gameState.ts:762`) | Fixed-size cause record per detection, overlay + route-run log | M | No |
| D5 | One guard alarm per section load | bible 5.7 (each alarm adds a level); G125 | `alarmRaised` set once (`src/ai/enemyManager.ts:809-811`), cleared only on load / restart | New alarm allowed once the last response is in, up to level 3 | M | No |
| D6 | No per-area alarm stages | G291; MF Split Shift / Code Relay BEAT.md | One stage, alarm and radio net (`src/ai/enemyManager.ts:1022-1028`, `:249`, `:364`) | Area id on stage, alarm, response (with Campaign's EN2), after prototype sign-off | M | No |
| D7 | `em.missionOrder` hook missing | MF BEAT.md; ME `docs/missions/STATE.md:43` | ME raises `missionEvent`, nothing in `src/ai` listens; blocks exist (`Enemy.sendTo` `src/ai/enemy.ts:1260`, `resetBreaker` `:1407`) | Build at prototype sign-off; fix ME STATE's stale lines | M | No |
| B5 | Dog kill rewards score | G348; G127 | `src/game/modes/score.ts:3` dog kill +120 | Penalty per Q4 | S | Yes, Q4 |
| C3 | Is a cast shadow a detection cue? | G352 (silent on it); bible P5 | Not decided (`docs/systems/ai.md:44-45`) | Decides C1's scope | S / M | Yes, Q2 |
| C4 | Bark says "I heard something." after a sighting | bible P5; VISION 4.8 | `src/ai/enemy.ts:2044-2045`, `src/ai/barks.ts:56,191-193` | Line sets by cause (append-only `BARK_EVENTS`) | S | No |
| B8 | Alarm-stage helmet at stage 3, bible says 2 | bible 5.7; G155, G350 | `src/ai/gear.ts:29-35` | Helmet at stage 2, test | S | No |
| B13 | Sector guard check accepts a placed riot shield | G307 (3); level-design 4.10 | `src/game/sectors.ts:581-597`; `tests/sectors.test.ts:248` | Enforcer rule in `checkSectorGuards`, flip test | S | No |
| D10 | Per-player LKP built, bible says open | bible 5.9 C5 (`docs/design-bible.md:680,1199`); G139 | `src/ai/intruders.ts:1-18` | Record the decision | S | Yes, Q8 |
| C6 | #360 pointers stale | ROADMAP row 14; G327 | #360 body / HELD comment; `docs/guard-ai/BRIEF.md:630-634` (A183) | Retitle or replace #360, close A183, row 14 pointer -> feature/guard-ai-t1-anim-tier | S | No |
| A6, B15, C7, D11 | `docs/systems/ai.md` stale | systems docs follow code | `ai.md:37-41` (G335 "not built"), `:21-22,724` (no G359), `:740-742` (tags "not read"), `:18` (G45 glass), `:51` (2.2 vs 1.8 m), `:276,727,735` (modes), `:353-355` (alarm rule); `src/game/sectors.ts:84-90` comments | One doc pass | S | No |

### 1c. Gaps owned by other leads (found here)
| ID | Item | Rule | Current state | Fix | Size | Owner | Michael? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D4 | Campaign room takes 1-4 once #317 lands | G2; VISION 4.7 | ME: campaign runs in sector mode (`src/world/maps/index.ts:17`); `players: [2]` data only (`src/game/mission/missionDef.ts:185`) | Room cap from the mission, not the net mode | M | Campaign + Guard AI (#317) | No |
| D8 | No map defines noisy sources | G299; bible P2, 5.2 S2 | Masking built (`src/ai/hearing.ts:67-86`), no `noisy` on any map; no switch link; bible's `noiseZones` not in code | Sources per map, switch link, bible field name | M | Map leads (data), Guard AI (switch link) | No |
| D9 | Sound meter has no ambient marker | bible 5.2 S4; G61 | `src/game/gameState.ts:3460`, `src/ui/hud/hud.ts:336-349` | Marker from `ambientDb` at the player | M | HUD (to assign) | No |
| B4 | Dogs can still be taken down | G348; bible 5.4, 5.8 | `src/game/takedownController.ts:342` (hang-down only excluded), `src/game/gameState.ts:1437-1438`; `scripts/e2e-enemies.mjs:226` asserts it | `find` null for a quadruped (co-op assist too); flip the e2e | S | Player | No |
| B3 | S4 / S5 helmeted on Rookie / Normal pre-alarm | G350; bible 5.6 | `src/world/maps/campusS4Data.ts:191-192`, `campusS5Data.ts:174-175`, `both` tags | After B2: drop section helmet, `both` -> `armour` | S | Sector Ops | No |
| B10 | Higher star clear does not fill lower | G331 | `src/save/sectorRecord.ts:52-54` | Fill every preset at or below (ROADMAP row 12) | S | Sector Ops | No |
| B14 | Campus graphs lack `unavoidable` tags | level-design 4.12; G303 | K1-K4 placed; no tag in `docs/sector-redesign/graph/campusOps-S*.json` | Tag S1, S2, S4, S5 | S | Sector Ops | No |
| B7 | Campaign response teams lead with a riot shield | G155; level-design 4.10 | ME: `sectorMode.ts:973`, `perStage: 2` (`tallowWharfSectors.ts:321`) | Per Q6 | S | Campaign | Yes, Q6 |
| B11 | Killing the interrogation target strands `tgc-3` | G353, G145 | ME: `tallowWharfMissions.ts:73`, `missionRunner.ts:418-431` | Protected until done; death = section restart | S | Campaign | No |
| B9 | warehouseOps has no dogs or late armour | VISION 2 vs level-design profile | `src/world/maps/warehouseSectors.ts:40-180` | Per Q9 | S | Sector Ops | Yes, Q9 |

### 1d. G352 owner split (agreed proposal, for Sector Ops to confirm)
- Sector Ops: the meter and the light field (`src/world/lightField.ts` `totalAt` :229, `bodyLevel` :240;
  `src/world/lights.ts:142` `Occluder`; the meter sample `src/game/gameState.ts:1660-1701`; HUD `:2784`; the gameplay
  lamp-set rule; `docs/systems/lighting.md:240-245`; `tests/lightField.test.ts`).
- Guard AI: perception and the guard, dog and body occluders (`src/ai/enemy.ts:237-239`, `:2447`, `:2509`;
  `src/ai/enemyManager.ts:3666-3675`; `src/ai/hitboxes.ts`; `src/ai/guardHead.ts:926`; `src/ai/bodyLie.ts`;
  `docs/systems/ai.md:44-45`; `tests/perception.test.ts`, `tests/coopPerception.test.ts`).
- Player: operator volumes from the sim body (`src/player/playerVolumes.ts:538`).
- Shared, one PR each, Sector Ops first: a new pure contract `src/world/charOccluders.ts` (fixed typed arrays) and
  `src/game/gameState.ts:1660-1701`.

### 1e. Questions for Michael (native multiple choice; recommended first)
| Q | Gap | Question | Options |
| --- | --- | --- | --- |
| Q1 | A3 | Where may a "vent" lookout stand (guards cannot stand in a crawl vent)? | (1) Where he overlooks the vent's run or exit (2) Pipes, catwalks and roofs only (3) A crouched in-vent lookout |
| Q2 | C3 | Can a guard notice a player's cast shadow? | (1) No: shadows only darken, as CT (2) Faint cue: suspicion only (3) Full cue: counts as a glimpse |
| Q3 | C2 note | G327 "full rate" vs bible "counts as seen": a shadow-seen guard past 22 m solves every 2nd frame, as an on-screen far guard | (1) Counts as seen (every 2nd past 22 m) (2) Every frame |
| Q4 | B5 | Penalty for killing a dog? | (1) Counts as a kill, scores nothing (2) Counts as a kill and costs score (3) Counts as a kill only, as today |
| Q5 | B12 | When is the civilian archetype built? | (1) Before Tallow Wharf's greybox exit; its staff become civilians (2) After Mission 1; staff stay armed guards |
| Q6 | B7 | Do campaign alarm response teams carry riot shields? | (1) No, armed guards only, as CT (2) Yes, as Sector Ops |
| Q7 | D3 | When does 4-player Sector Ops switch on? | (1) Merge dark behind a flag, switch on after the campus walk (2) Merge live now |
| Q8 | D10 | One last known position per player? | (1) Yes, per player, as built (2) One shared position |
| Q9 | B9 | Must the old warehouseOps map get dogs and late armour? | (1) No, the rule is the campus's (2) Yes, a dog and late armour |

### 1f. #317 coop4 readiness (for ROADMAP row 16)
- Draft, `big-pr`, head 24ba2e51, CONFLICTING, 606 commits behind master. Only status on the head:
  `laptop-e2e/coop4-fix7` success (AI6 block, 1/1). Full regular and alone sets were green on 3f1c946f, before the
  4.95.0 master merge.
- G308: Marlow Yard stays 2 (C4 `protocol.ts:40,44`), Sector Ops 4 (`:42,44`). Campaign breaks through D4.
- Flag: none gates 4 players (D3). `players` (C4 `src/core/flags.ts:51-52,131`) is dev / tests only.
- src/net rule holds: no static `src/net` import outside `src/net`; co-op by dynamic import behind `flags.coop`
  (`src/main.ts:326-327`); #317 changes no file in `src/ai`.
- protocol.ts vs master: one hunk (keep master's `PROTOCOL_VERSION`, take C4's room-cap comment). Also conflicting:
  `src/net/coopHost.ts` (2 hunks), `docs/systems/coop.md` (3), `docs/systems/testing-tools.md` (1).
- protocol.ts vs #388 coop-real: no conflict (#388 does not touch it); overlap only `scripts/run-e2e.mjs` and
  `testing-tools.md`, one hunk each.
- Verdict: not ready for release at row 6. First D3 (dark flag) and D4 (campaign room cap), then the train-side
  conflict resolution, a full laptop set on the resolved head, then two Opus checkers.

## 2. Checked, conforms
- G44 poor sight above, lookouts need no special case (pitch from the guard's own eye): `src/ai/perception.ts:159-163`, `src/ai/enemy.ts:2428-2431`.
- Fixed patrols, no randomness that defeats planning (VISION 4.8, G143): deterministic glance seed `src/ai/patrol.ts:72`, seeded combat RNG `src/ai/squadRoles.ts:649-689`; the only live `Math.random` is a 0.22-0.30 s think jitter, `src/ai/enemy.ts:389,2336`.
- Missing partner triggers a search and a radio call: `src/ai/enemyManager.ts:2207-2222`; paired searches kept (G180): `src/ai/incidents.ts:20,82,450`.
- Caps: Sector Ops 32 (G332) `src/game/sectors.ts:508`; campaign 32 (G359) ME `src/game/modes/sectorMode.ts:328`; Marlow Yard 12 `src/ai/enemyManager.ts:83`.
- Spacing and isolation (G190): `tests/campusS1.test.ts:560-575`.
- No heavies in the campaign or Sector Ops (G155): `src/game/sectors.ts:586`.
- Every guard armed (G298): `src/game/sectors.ts:593`; Marlow Yard normal armed guards, no response team (G279): `src/game/stealthSystems.ts:588`.
- Sector Ops dogs with handlers (G348): `src/world/maps/campusS4Data.ts:39`, `src/game/sectors.ts:587-591`; gas knocks a dog out `src/game/gadgetSystem.ts:400-413`; dogs can be distracted `src/ai/enemyManager.ts:2850`.
- Riot shields only in Sector Ops response teams; late armour S4 / S5 only (G307): `src/ai/gear.ts:162`, `campusS4Data.ts:47`.
- No mission forces a kill (VISION 4.4, G127): shields / armour / helmets ignore takedowns, gas and sleep bolts `src/ai/gear.ts:6-7,137`; unavoidable K1-K4 have takedown spots `src/world/maps/campusSectors.ts:70`.
- Perfect rating possible (VISION 4.3, G146): a knockout is not a kill `src/game/rating/sectionRating.ts:83`; "alarm" is one rated state `:84`.
- Meter and perception read one light value (VISION 4.1 except C1): `src/game/gameState.ts:1690-1691`, `src/ai/enemy.ts:2447`; one preset-independent field `src/world/lightBake.ts:3`.
- AI reads no graphics state (VISION 4.10): no `src/ai` import of presets, quality, governor or shadows; LOD imports only load models `src/ai/guardBody.ts:26-27`.
- AI sim independent of the anim tier: hit volume and muzzle from the sim `src/ai/enemy.ts:4038-4041`, `:3693-3694`.
- Cameras see by IR, faint red grid shown (G240, G222): `src/security/camera.ts:106`, `src/game/ctDevices.ts:383-387`.
- Hearing from the noise model only (G299): `src/game/gameState.ts:2078-2079`, walls by collision ray `src/ai/enemyManager.ts:2738-2741`.
- Radio: voice first, own section staggered, killing the caller stops it (G300): `src/ai/radioNet.ts:221-231,315-339`.
- KO caution timed; death caution until every aware guard is out (G299, G300): `src/ai/awareness.ts:37-41`, `:197`.
- No AI countdown closes a route (VISION 4.6, G334): `src/ai/alarm.ts:75-147`, `src/ai/sweepTeam.ts:8-9`.
- Downed players never finished, not perceived (G126, G349): `src/ai/enemy.ts:2394-2396`.
- Checkpoint restart is a full AI reset (G312): `src/ai/enemyManager.ts:1876-1902`.
- Targeting per player (G139): `src/ai/targetPick.ts:63-86`.
- Team doors are walls for guards (G280): `src/ai/lockedDoors.ts:36-39`.
- `src/ai` never imports `src/net`; no `Math.hypot` in `src/ai` (CLAUDE.md): grep empty.
- No bot partner (G48): grep of `src/ai`, `src/game/modes` empty.

## 3. Per map: archetypes present vs allowed
Allowed (VISION 2, level-design 4.10): Training - normal armed guards. Campaign - no heavies or dogs; armour and
Rookie / Normal helmets with the alarm stages; helmets by difficulty. Sector Ops - armed guards, dogs, riot shields in
response teams only, late armour, helmets by difficulty. Full table with file:line: `parts/B-archetypes.md`.

| Map / section | Placed | Gear | Response | vs allowed |
| --- | --- | --- | --- | --- |
| `ctcourse` (Marlow Yard) | 13 grunt, 1 officer | none | none | Conforms |
| `campusOps` S1 | 4 grunt, 4 officer | none | shield + grunt per stage | Conforms; B2; count short (A1) |
| `campusOps` S2 | 6 grunt, 6 officer | none | as S1 | Conforms; B2; A1 |
| `campusOps` S3 | 8 grunt, 8 officer | none | as S1 | Conforms; B2; A1 |
| `campusOps` S4 | 10 grunt, 9 officer, 1 dog | section helmet; helmet + armour tags | as S1; dog release stub (B6) | Dog and armour conform; B3; A1 |
| `campusOps` S5 | 14 grunt, 8 officer, 2 dogs | as S4 | as S4 | as S4 |
| `warehouseOps` 1-3 | 5+3, 6+2, 6+3 grunt + officer | none | as S1 | Q9 (B9) |
| Tallow Wharf W1-W2 (ME) | 9 and 10 grunt | none | shield + grunt per stage | B7; B12 (W2 staff) |
| Tallow Wharf W3-W4 (ME) | 9 grunt + 1 dog, 11 grunt + 1 dog | none | as W1 | Dogs not allowed (B1); B7; B12 |

No live map places a heavy, runner, sniper, drone operator or placed riot shield.

## Notes for other leads
- Sector Ops: `docs/systems/lighting.md:221` says Low / Medium have 0 character-shadow lamps, code and `:46` say 1.
  Bible P1 "any preset agree" vs L11 "fewer lamps' shadows" needs one wording once C1 is built. Riot shields from S1
  (code) vs bible 5.7 "later sections": confirm.
- Campaign: Tallow Wharf uses Sector Ops' syringe revive instead of 30 s twice (G126); ME `sectorMission.ts:150`
  one-chance `fail` vs section restart (G290, G353).
- Not verified: whether Sector Ops' No kills counts kills the players did not make; Tallow Wharf cameras; the co-op
  client takedown path for dogs (`src/net/enemyPuppet.ts`); possible patrol-clock drift for guards held back near a
  player (`src/game/modes/sectorMode.ts:127,882`).
