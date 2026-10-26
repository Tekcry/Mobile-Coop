# campus-greybox S5 - build report (lane `feature/campus-greybox-s5`)

Owner: Night Shift | Sector Ops Build. Status: current.

Builders: P1-P3 by an earlier cloud builder (old account, pushed 3c600cc1, 9ea8a93d, af3c46b3; the brief was reopened at the
22:50 swap); P4 and this report by Night Shift | Cloud Builder 1 (Opus), 2026-10-25, who resumed from af3c46b3, re-ran every
check green on it before building, and did not re-audit P1-P3 item by item beyond their tests. Brief:
`docs/campus-greybox/briefs/S5.md` (P1-P4; TAG-5 waits for #317 and is out of scope). Base 024c7c172 (job branch after
V2-SEED). Guard-rules PR1 (J15) is not on master: per job BRIEF A27 no section `gear: 'helmet'` is written; `'armour'` stands
on the response team and the keyholders.

Checks per sub-step (cloud: unit tests only): `npm run typecheck:fast` and
`npx vitest run tests/campusV2.test.ts tests/campusV2S5*.test.ts tests/campusS5.test.ts tests/campusS5Dress.test.ts
tests/campusRuntimeNav.test.ts --maxWorkers=2`; eslint on the touched files. No e2e, GPU, level-measure or screenshot run here:
each is listed under "Pending PC runs".

**Final head results:** typecheck clean; eslint clean; the slice set 11 files, **115 / 115 pass**:
`campusV2S5.test.ts` 11, `campusV2S5Lights.test.ts` 6, `campusV2S5Sync.test.ts` 7, `campusV2S5Guards.test.ts` 13,
`campusV2S5Coop.test.ts` 20, `campusV2S5Graph.test.ts` 6, `campusV2S5Screen.test.ts` 1 (S5 v2: 64); v1 unchanged and green:
`campusS5.test.ts` 29, `campusS5Dress.test.ts` 10, `campusV2.test.ts` 9, `campusRuntimeNav.test.ts` 3.

Line numbers below are on the final head (`src/world/maps/campusV2/s5.ts` 865 lines).

## P1 Shell re-cut (3c600cc1)

**Files:** `s5.ts`, `s5Dress.ts`, `tests/campusV2S5.test.ts` (new), the graph `graph/v2/campusOps-S5.json`, the fragment.

**Built:** `S5_V2_COPY = false` (s5Data.ts:241); the `S5_LIGHTS` block (s5.ts:409, PROVISIONAL / TODO(light-realism) header)
and `buildCampusS5` draws every lamp from it (s5.ts:613 onwards). Ground: the screens passage (the x -38 partition gone, the
2.2 noLedge timber screen z 21..29, two 1.2 settles; `S5_BOX.screen`, `settles`), the hall's alcove (the old west passage open
to the hall), the back hall x -37..-33 with the anteroom side door (-37, 34) and the kitchen door (-33, 36.5), the anteroom
8.8 x 6.3 with the 3.0 glazed screen and the kept 1.6 sash (sill 0.5), the open strongroom day gate (-43, 38.5), the shaft
moved north (x -40.5..-38.5, z 38.5..40.5) with its door (-39.5, 38.5) and ladder, the kitchen 7 m on centre lines, the lobby
doors off each other's line (-30.5, 26.5) / (-27.5, 32), the 2.4 hall stair in two flights of 13 risers with a 2.0 landing
(`S5_HALL_FLIGHTS` s5.ts:260), the control room's garden door (-56, 22), the well's cleaning ladder, the plant-room flue
ladder and hatch, the kitchen smoke hatch with its 0.2 kerb. L1: the closed landing strip, kp-arch moved to (-38, 35.5), the
cage over the shaft with pg-arch's opening z 39..40.2, the free-standing row, wall shelving and plan chest, the rooflight
(hatch + wired glass) and its ladder, the boardroom <-> CEO door (-53, 30). Roofs: the 0.2 coping at x -32 z 30..33 (CR9-s5),
the 0.2 gutter kerb on z 44 (CR8-s5), both hatch holes, the well rim gate over the cleaning ladder, the west rappel
(-56.15, 31), the bulkhead's two wired-glass lights. Grounds: 1.2 hedges, the 1.2 balustrade with its two gaps, the deck.
Rooms `S5_ROOMS` (s5.ts:272; `s5-vest` dropped).

**Tests:** `campusV2S5.test.ts` P1 cases (hall and screens passage; back hall, anteroom, strongroom, shaft; kitchen and wing;
hall stair; grounds; L1; roof and low roof; nav flood sealed; rooms) plus the copy marker / dress case.

**Assumptions used:** P3 (shaft ladder on the cage's west strip), P4 (flue ladder under the hatch), B2, B3.

## P2 Devices and light (9ea8a93d)

**Files:** `s5.ts`, `s5Data.ts`, `tests/campusV2S5Lights.test.ts` (new), `tests/campusV2S5Sync.test.ts` (new), the graph.

**Built:** pg-hoist (CR7) as a pair gate on the hoist door (-46, 36, 4.2), keys (-45.85, 38.4) and (-44.0, 32.15) (s5Data.ts:201
`pairGates`, A24); no rappel anchor at the sill (A25); pg-arch on the cage's west face, key b as built (P5); the shaft beams and
panel moved with the shaft (s5.ts:302, :308); the house board on the back landing (circuits 83 + 88, 45 s) and the garden board
on the moved kitchen wall (84, 30 s) (`S5_BOARDS` s5.ts:320); kp-arch at (-38, 35.5) (s5Data.ts:198); new circuits 150-157
(`S5_GROUPS` s5.ts:58) and 17 switches (`S5_SWITCHES` s5.ts:366); the lamps of section 0.5 (as-built kept, the strongroom lamp
moved 1 m north and warm, the plan additions, the room fittings; P6 the reading lamp with no desk box). Graph: `s5-arch ->
s5-well` `rappel` -> `drop` with the brief's reason and note "BUILT P2 (job BRIEF A24, A25)" (the validator accepts it: no
fallback needed, R4).

**Tests:** `campusV2S5Lights.test.ts` 6 (the block is the one source; no as-built lamp removed or dimmed; additions and room
fittings; switches and groups; the two boards; dark by reason), `campusV2S5Sync.test.ts` 7, `CR7 device` in
`campusV2S5.test.ts`.

**Assumptions used:** P1, P2, P5, P6, B1.

## P3 26 guards and routes (af3c46b3)

**Files:** `s5Data.ts`, `tests/campusV2S5Guards.test.ts` (new), the graph notes.

**Guard table as built** (`S5_GUARDS` s5Data.ts:39; index = number - 1 up to #24, #28 = 24, #34 = 25):

| # | kind | role | zone | slot (x, y, z) | yaw | route / post | waits | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | grunt | response | ctl | (-55, 0, 19.5) | 90 | - | | dormant, armour |
| 2 | grunt | response | ctl | (-55, 0, 22.4) | 90 | - | | dormant, armour |
| 3 | grunt | response | ctl | (-55, 0, 25.4) | 90 | - | | dormant, armour |
| 4 | grunt | response | hall | (-41.5, 0, 23.5) | 109 | (-41.5, 23.5) (-53, 28.4) | 4 / 4 | armour (P7) |
| 5 | grunt | handler | garden | (-63, 0, 23.5) | 0 | (-63, 23.5) (-63, 40.5) | loop 44 | |
| 6 | dog | dog | garden | (-62, 0, 23.5) | 0 | (-62, 23.5) (-62, 40.5) | loop 44 | |
| 7 | grunt | handler | terrace | (-36, 0, 47) | -90 | (-36, 47) (-53, 47) | loop 44 | |
| 8 | dog | dog | terrace | (-36, 0, 46) | -90 | (-36, 46) (-53, 46) | loop 44 | |
| 9 | officer | posted | token | (-44.5, 0, 37) | 180 | post | | keyholder, armour |
| 10 | officer | posted | token | (-41.5, 0, 37) | 180 | post | | keyholder, armour |
| 11 | officer | escort | ante | (-45, 0, 33) | 90 | (-45, 33) (-39.5, 37.4) (-38, 33.5) | 4 / 4 / 4 | |
| 12 | officer | door | hall | (-41.5, 0, 19.6) | -123 | - | | |
| 13 | grunt | gallery | gal-w | (-48.5, 4.2, 19.6) | 0 | (-48.5, 19.6) (-48.5, 28.4) | 5 / 5 | |
| 14 | grunt | gallery | gal-e | (-39.5, 4.2, 28.4) | 180 | (-39.5, 28.4) (-39.5, 19.6) | 5 / 5 | |
| 15 | officer | post | board | (-53, 4.2, 24) | 90 | - | | dormant |
| 16 | officer | post | ceo | (-51.6, 4.2, 30.8) | 0 | - | | |
| 17 | grunt | post | ceo | (-51.6, 4.2, 32) | 180 | - | | |
| 18 | grunt | patrol | archive | (-42.4, 4.2, 34) | 0 | (-42.4, 34) (-42.4, 42.3) (-45.2, 42.3) (-42.4, 42.3) | 4 / 0 / 4 / 0 | P8 |
| 19 | grunt | marksman | roof | (-40, 8.4, 43) | 0 | (-40, 43) (-39, 43) | 12 / 12 | |
| 20 | grunt | gate | terrace | (-44, 0, 50.7) | 0 | (-44, 50.7) (-47.8, 57.6) (-48.1, 62.2) (-47.5, 57.6) | 6 / 0 / 6 / 0 | |
| 21 | grunt | patrol | wing | (-29, 0, 42.5) | 180 | (-29, 42.5) (-29, 23.5) | 3 / 3 | |
| 22 | officer | post | lobby | (-28.8, 0, 30.8) | 90 | - | | |
| 23 | grunt | driver | lane | (-31.4, 0, 53.5) | -90 | - | | |
| 24 | officer | tour | back | (-35, 0, 19.6) | 0 | (-35, 19.6) (-35, 37) | 3 / 3 | |
| 28 | officer | audit | token | (-42.5, 0, 33.4) | 0 | post | | P9 |
| 34 | grunt | sentry | lane | (-43.5, 0, 57.4) | 180 | - | | P10 |

Routes (`S5_ROUTES` s5Data.ts:112): "The screens passage, the side door and the garden", "The hall front, the anteroom hall door
and the kitchen", "The service stair, the archive and the light well"; armoured bypasses `S5_ARMOURED` (s5Data.ts:155).

**Tests:** `campusV2S5Guards.test.ts` 13 (kinds, dogs and handlers, checkSectors / checkSectorGuards, table points, cycles,
nav, reach, the dormant rule and 26 + 6 <= 32, M8 isolation, routes on the analytic and runtime grids, floors, armoured
bypasses, door separation).

**Assumptions used:** P7, P8, P9, P10.

## P4 Co-op lips, CR7, K4, LD 15 tests, graph keys (5c57c05f, this builder)

**Files:** `s5.ts` (lips), `s5Data.ts` (`coopLips`), `tests/campusV2S5Coop.test.ts`, `tests/campusV2S5Graph.test.ts`,
`tests/campusV2S5Screen.test.ts` (new), the graph, the fragment. `git diff --stat af3c46b3..5c57c05f`: those files only.

**Built:**
- `S5_COOP_LIPS` (s5.ts:173-198) exactly as briefed: CR8-s5 (s5.ts:174-181), CR9-s5 (:182-189), CR10-s5 (:190-197); ids
  `-s5`, section 4. `S5_LIP_SEGMENTS` (s5.ts:200-203) `{ 'CR8-s5': { a: [-32, 44.15], b: [-26, 44.15] } }` (A17). The lips'
  pieces were built at P1 (the gutter kerb, the coping, the smoke hatch's west kerb; not noLedge). `S5_PARTS.coopLips =
  S5_COOP_LIPS` (s5Data.ts:232), so `CAMPUS_COOP_LIPS` (`campusLips.ts`) carries them with the flag on.
- Graph (`docs/sector-redesign/graph/v2/campusOps-S5.json`): guard keys "1".."4" on every guarded space, all equal: hall 3,
  ante 4, arch 1, kitchen 1, garden 2, roof 1, lawn 5, ctl 3, gal 2, board 1, ceo 2, lobby 1 = **26 at every key** (was 17 on
  key "1" only); `"unavoidable"` added to `s5-ante`'s tags; the gal / board / ceo / ctl notes' "note only" guards now
  "counted here, BUILT P4" (ctl: #4 now starts in the hall, P7); the three `coop_boost` link notes start "BUILT P4 (s5.ts:...,
  S5_COOP_LIPS ...; s5Data.ts:232)"; the meta note "S5 PLAN ... Proposed, not built" -> "S5 v2 greybox BUILT P1-P4 ...; targets
  stay declared, measured in greybox (V6)". No space or link note says PLAN (tested); no target says measured; ids, links and
  `syncs` unchanged.

**Tests (`campusV2S5Coop.test.ts`, 20):**
- As briefed: the three lips' data, `S5_PARTS.coopLips`, each once in the campus list, 4.4 over each boost floor, boosts on
  nav, each lip on its own not-noLedge piece; CR8-s5's boost 1.5 m east of the kitchen back door (P11).
- Per lip: rule 1 (`soloJumpThreats` / `soloTopLandingThreats`, 0.5 m margin; CR8-s5 as its segment) []; rule 2 (nothing
  solo-standable 1.2 or higher over the boost floor within 4 m in plan) []; rule 3 (nothing 0.3-1.7 within 1 m of the wall
  under the lip, boost side) []; rule 5 (open sky over the lip's hangable run to 1.8 over it) []. CR10-s5: the hatch open from
  the kitchen floor to the sky.
- Exactly one canHang ledge per lip (CR8-s5 x -31.8..-26 at 4.4; CR9-s5 z 30..33 at 8.6; CR10-s5 z 41.475..42.525 at 4.4) and
  none elsewhere on the kerbs, the coping and the hatch rims.
- `LD 11.8 unplanned lips`: every canHang ledge in the footprint with a true drop (top over the surface 0.4 m out) of
  2.6-4.6 m is one of the three lips or on a solo-reached surface (none found); the low roof, garden walls, boathouse, van and
  four chimneys noLedge.
- `CR7 two players only`: with pg-hoist shut no anchor stands at the hoist door (none within 1.5 m of the sill; every archive
  cell within 2.5 m, 16 facings, no `reach()`); archive -> well has a nav path only over the roof (masking the roof storey
  removes it); the solo route passes the rooflight ladder and the cleaning ladder: **15.2 m plan, ~24.3 s** (walk at 1.3 m/s
  plus 4.2 + 8.4 m of ladder; D:70-72 says ~29 s; the rope ~6 s); the well floor reaches the anteroom and the archive only by a
  ladder; the sash open, unbreakable, sill 0.5; the well -> #9 sight line clear, **3.87 m** (a roll landing's noise 5 m).
- `K4`: with the cones of #9, #10, #28 (ground) and pg-arch and pg-hoist shut, no path start -> the token (-43, 42.6); without
  the cones one; the hall door and side door cells inside a cone. **Recorded angles (R1):** the sash (-46, 35.5) is 45 deg off
  #9's facing, 72 off #10's, 59 off #28's; the shaft door (-39.5, 38.5) is 107 off #9's, 127 off #10's, 30 off #28's (#28
  faces the shaft door: the CR6 approach is in his view; the brief's R1 expected the sash 56 deg off #9).

**Tests (`campusV2S5Graph.test.ts`, 6):** every space area holds a walkable cell on its storey (24 spaces); 22 door /
pair_gate links each have a door anchor within 0.6 m on their floor (the `s5-ante -> s5-strong` door link is the open day gate:
asserted to have no anchor, SY:49); the sums per key from `S5_GUARDS` by the A16-A17 rule equal the graph (26 / 26 / 26 / 26)
and `s5-ante` is unavoidable; no PLAN note; solo past the team doors (pg-arch, pg-hoist and the armoured hall door shut, every
lip top solid: start -> the token by the side door -> the extract box); light at the vantages on the real `LightField` (baked
in node over S5, doors shut, as `tests/campusS2.test.ts` LR16g):

| Point | Level |
| --- | --- |
| vantage s5-kitchen / s5-hall from s5-back (-35, 0.9, 35) | 1.00 |
| vantage s5-arch / s5-garden from s5-roof (-44, 9.3, 31) | 0.25 |
| vantage s5-ante from s5-well (-48, 0.9, 36) | 0.14 |
| vantage s5-roof from s5-core-r (-35, 9.3, 41) | 1.00 |
| vantage s5-lawn from s5-lowroof (-29, 5.1, 31) | 0.25 |
| hide spots (-68.5, 0, 19.5) / (-27.2, 0, 21) / (-54.5, 0, 42) | 0.14 / 0.88 / 0.73 |
| hide spots (-40, 4.2, 43.2) / (-46, 8.4, 30) / (-67, 0, 56) | 0.38 / 0.25 / 0.25 |
| dark: the well / the low roof's north kerb (-29, 43.4) / the roof behind chimney (-53, 22) | 0.14 / 0.25 / 0.25 (< 0.28) |

The back hall (the s5-kitchen and s5-hall vantage) reads 1.00 at its centre: the new back-hall fitting (151) lights it; it is
"lit; dark once the players cut its circuit" (section 0.5 rule 4), reported, never dimmed. Three hide spots read over the
shadow line (the plant room 0.88, the drawing room 0.73, the archive corner 0.38): lit by the P2 room fittings, dark once
their circuits are cut. For the lead / J10.

**Screen cap (`campusV2S5Screen.test.ts`, 1):** 10 985 walkable points on every level, 32 facings: worst **7** (cap 12) at
(-50.25, 3.0, 62.75) facing 158 (the boathouse top: #5, #6, #7, #8, #20, #23, #34); the roof's north-west corner reaches **6**
(-54.25, 8.4, 43.75 facing 56: #7, #8, #19, #20, #23, #34) against D:148-150's expected 8; none over 12.

**Validator** (`node scripts/level-validate.mjs docs/sector-redesign/graph/v2/campusOps-S{1..5}.json`): **0 errors, 141
warnings**, no ERROR names an `s5-` space. S5 WARN kinds: 12 ceilings, 6 core sizes, 5 custom classes, 1 control room (as
D:196-198), the guard bands now 28 lines (7 encounter spaces x 4 keys; the plan's 7 were key "1" only: same kind, more keys),
and **one new kind for the lead: `s5-ante: unknown tag 'unavoidable'`** (this validator does not know the A18 tag yet; S4
reported the same on `s4-cc`). The two `s4-cc -> s5-lobby` link WARNs belong to the S4 file. The P2 `drop` link raises no
ERR or new WARN (R4 not needed). `--require-measured` is the lead's EXIT-5 after J12.

**Deviations:** none from the lips' data. Two readings of the brief, each undone by one edit in the test:
- The door-link check skips `s5-ante -> s5-strong` (the open day gate has no door anchor by SY:49; the Sync test asserts it).
- "Solo past the team doors ... by the side door": the armoured hall door is also shut so the only way in is the side door.

## Sync nodes (SYNC.md 9eb7b9c6, SY:48-53): ids and device positions match

| Sync id | src | Device |
| --- | --- | --- |
| sync-s5-fob (reserved) | s5Data.ts:31 (comment; Penhale not posted) | - |
| sync-s5-strongkey (reserved) | s5.ts:93 (`S5_DOORS.dayGate` (-43, 38.5)), s5.ts:764 (the open gap) | no door anchor |
| sync-s5-rota | s5Data.ts:199-200 | rota board (-26.15, 1.5, 37.0), grants s5-arch |
| sync-s5-kparch | s5Data.ts:197-198 | kp-arch (-38, 35.5) on L1, code s5-arch |
| sync-s5-houseboard | s5.ts:323-324 | house board (-32.15, 4.2, 35), [83, 88], 45 s |
| sync-s5-gardenboard | s5.ts:321-322 | garden board (-32.85, 0, 40), [84], 30 s |

## Dress (R5)

The flag-on build dresses (`campusV2S5.test.ts` copy-marker case). `S5_HERO_LOG` on the final head lists refusals, none fatal:
`H5:rollingStack` scale 0.720 outside 0.8-1.25 (the shelving's depth); `vaultFrame` (no catalogue frame entry); two
`F:monitorWall` skins (back through the box by 0.104 / 0.004 m); three `K:wallCupboards` (rule V); `F:depositWall` (K5 near
#8's / #9's takedown spots, K1 / C near the screens-passage route legs 10-12, K11 near ladder 126, K4 near an alarm);
`H5:depositFace` (K3 near door 125, rule V); `F:timeLockPanel` (rule V); `F:vaultLeaf` (K1 near route leg 10); three
`K:portraitFrame` (K3 near door 99). For the art pass (not this lane's files beyond `s5Dress.ts`).

## Assumptions (brief section 9) and undo

P1-P11 and B1-B3 as written in the brief, each undone by one edit in the lane's files; AS3 retired (A14), AS1 replaced by P1.
None added by this builder.

## Findings for the lead

- K4 / R1: the sash is 45 deg off #9's facing (brief expected 56) and the shaft door 30 deg off #28's: J13 / V6 should measure
  the CR6 / CR7 approaches; the fix, if one is needed, is the lead's (facings), not a moved window.
- The solo well route measures ~24 s by this test's estimate (D:70-72 ~29 s): still well over the rope's ~6 s.
- The roof's north-west corner sees 6 guards, not D:148-150's 8 (under the cap either way).
- Light: the back hall and three hide spots read lit from the P2 room fittings (R3: real gaps, J10 / the lead).
- Validator: the `unknown tag 'unavoidable'` WARN waits for J12's validator.
- The graph's P1-era "BUILT P1 (s5.ts:...)" line refs were written before P2 added lines; they are left as written.

## Pending PC runs (not run in the cloud)

- Laptop per lane PR (lead requests, `E2E_GPU=1`): `e2e-sectorops:1` .. `:6` with default flags (the live map unchanged), and
  the PR's `affected-e2e`.
- The lead's measured validator / level-measure pass and V6 `--require-measured` (EXIT-5 after J12); J13 route-runs on the
  v2 build (the K4 and CR7 approaches above).
- Any screenshot or look check of the v2 greybox with `?campusv2=5`.

S5 v2 data pushed at 5c57c05f.
