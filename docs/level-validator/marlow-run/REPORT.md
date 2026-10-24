# Marlow Yard (ctcourse) - first validator run (V7 REPORT)

V7, 2026-10-24. Branch `feature/level-validator-v7`, cut from `feature/level-validator-v6` (4ccb6aea). Graph:
`docs/marlow-final/graph/ctcourse.json`, written AS BUILT from `src/world/maps/ctcourse.ts` and
`src/world/maps/ctcourseSets/*.ts` (where the code and `docs/marlow-final/SPEC.md` differ, the code wins and the
difference is listed below). Command (default metrics `docs/design/metrics.json`):

```
node scripts/level-validate.mjs docs/marlow-final/graph/ctcourse.json
```

Result: **49 errors, 81 warnings, 8 infos, exit 1.** No schema or parse error: every ERR is a design finding or a
by-design consequence of the course format, listed below. No change to the map.

## Summary

- **Graph:**
  - 55 spaces: 8 encounter, 7 holding rooms (checkpoints), 1 start, 1 exfil.
  - 85 links, of which 7 are spine links (the holding rooms' far doors): 7 `coop_boost`, 3 `human_ladder`, 1 `team_rope`,
    4 `pair_gate`, 6 `drop`, 25 `opening`, 18 `door`, 15 `double_door`, 5 `open_stair`, 1 `fire_stair`.
  - 3 splits (`a4`, `a7`, `a8`).
  - `area` boxes on every space, `vantage.at` on 7 of 8 encounters, link `at` where a pair has 2+ openings; every
    coordinate cites its code line in `note`.
- **Worst three findings:**
  1. **A2: the high route skips the neck.** Two of the three A2 guards stand on the staging deck, which is the high
     route. The deck gives no way down into the neck, so the neck has no high approach. The walk482 X2b closures also
     made SPEC's secret route (the cabin back door along road 1's cess) and the loop round the west rake into dead
     pockets, so A2's routes never cross.
  2. **A8 is one peak, on single doors.** The security office has 1 approach: the gallery door. Its stair is one-way
     out. Hall, gallery and office are three high beats in a row, then two more in the lobby, with no release. The
     gallery leg of the split starts only with the leg-up. SPEC's drop takedown onto N2 has no drop line: the only open
     gallery edges are x 109 and the stair head, and N2 walks x 126-133.
  3. **Light and view targets.** 7 of 8 encounters miss the 0.4-0.6 shadow band, because the sets are "lit by default,
     players make the dark" (SPEC 7, P4). 6 of 8 entry vantages see under 70% of their space: A2, A4 room, A5, A7 and
     the A8 office look through a lane, a slot, a gateway or a door. All are estimates, pending V6.
- **Other notable findings:**
  - The A1 wall top is a co-op-only standing surface. A player downed there can only be revived from the wall top.
  - The A7 split legs are about 16.5 s and 36.9 s (hand count, 55% apart; SPEC says about 45 s each).
  - A3 and A4 have no co-op link: the jam relay, the console loop and the dual takedown have no graph kind.
- **Interior redundancy** (hand check, airlock doors left out): A1, A3, A4 and A8 have only 1 edge-disjoint route
  through the set.
- **Split `a4`** (main aisle vs back aisle) passes: legs 17 s and 20 s, partner reach under 15 s.
- **`scripts/level-measure.mjs`** is not on this base: measure pending.

## Modelling choices (deviations from the brief and the schema, each reversible)

1. **Holding rooms are spaces** (the brief), each the `exit` + `checkpoint` of the set before it.
   - The spine link is the holding room's far door into the next set's first space, so `a1-hold-l1` sits in section A1.
   - SPEC 12 calls each holding room the next set's checkpoint. The tag is info only, so its section does not change
     any check.
   - Consequence: every section's entry-to-exit redundancy check (M3) runs through one sliding door and reports 1
     route (8 ERR).
   - Undo: write the holding rooms as spine links (graph-schema lead decision 3, the campus convention). The real
     interior counts are under "Interior redundancy".
2. **Service corridors and the plant room are not spaces.** `facility.ts:694-698` builds them as a closed void (SPEC 5:
   closed to players, behind locked doors that never open). The instructor gallery is out of bounds (sight only).
3. **Encounter = a play space with guards on the route** (the campus rule V5f-3, `campus-run/REPORT.md`).
   - Camera-only spaces are typed connector, with the camera in `note`: the A3 corridor, the A4 main aisle and the A8
     vault lobby.
   - A3 office 2 is typed connector: a private_office, a "no" class, 5.7 m wide. The cleaner and its estimates are in
     its note.
   - A1 has no encounter: its checker is passive (`a1Gate.ts:218`; `rated` false, `ctcourse.ts:107`).
4. **Co-op moves with no schema kind:**
   - **Partner throw** (A5, A8 beam curtains): written `coop_boost` with no `level_change` (2 WARN).
   - **Hang-down** (A6): written `drop` (lead decision 2).
   - **Synced-hack doors** (the A7 cage doors, the L7 near door, the A8 vault door): written `pair_gate` (team doors by
     function: flag gates on a scanner pair).
   - **No link at all:** the jam relay (A3), alternating isolation (A2), the console loop and the dual takedown (A4),
     and jam-and-pass (A5 / A8 beam panels). Where one helps a split, it is named in an `assist` reason.
5. **Heights use collision, not dressing.** The hall roof is 10 m (`HALL_H`, `types.ts:110`). The A2 roof ties (7 m)
   and the A4 eaves (7.5 m) are visual skins, left out.
6. **Leg pace (A4).** Leg a's three links carry `time_s` at run pace (3.0 m/s), per SPEC a4-floor "Main aisle: move
   fast while the cameras are looped" (`a4GoodsShed.ts:401`). Leg b's links carry length / 1.3.
7. **`a4-secroom.vantage.from` names `a3-hold-l3`**, a space in the previous section: the vantage is L3's glass slot.
8. **Rounding** (campus convention): sizes and opening widths are rounded down to the 0.5 m grid, with the clear value
   in `note`. Lengths are the polyline from the space middle through the cited door point to the next middle, rounded
   to 0.5 (computed by a scratch generator, not committed).
9. **Not run:** `scripts/level-measure.mjs` does not exist on this base, so measure is pending.

## ERR / WARN / INFO counts by rule

| Rule | ERR | WARN | INFO | Notes |
| --- | --- | --- | --- | --- |
| Dimensions (class min, fire stair) | 2 | 66 | | 45 custom classes, 7 ceilings, 3 class max, 10 opening widths, 5 stair widths |
| Level change missing | | 2 | | The throw has no lip (schema gap) |
| No softlock (checkReach) | 4 | | | 1 real (A1 wall top), 3 progress gates (team doors) |
| Approaches / route kinds | 14 | 1 | | Plus the "secret in 0 of 8" WARN |
| Declared targets (shadow, vantage) | 13 | | 8 | 8 INFO pending V6 |
| Dead ends | 2 | | | |
| Routes cross | 1 | | | |
| Redundancy (M3) | 8 | | | All through the airlock doors (choice 1) |
| Co-op coverage per section | 2 | | | Coverage 4 of 8 encounters passes |
| Splits | 2 | | | Both validator gaps; hand times below |
| Guard band | | 7 | | Below the band (Michael 2026-10-24: no upper limit) |
| Pacing | 1 | 1 | | |
| **Total** | **49** | **81** | **8** | |

## Every ERR, with its set, code line and a suggested fix

| # | Set | Line | Code | Suggested fix |
| --- | --- | --- | --- | --- |
| 1 | A4 | `a4-secroom: 6 x 6 m below security_room minimum 5.5 x 7` | `types.ts:98`, `a4GoodsShed.ts:81` (6.6 m box) | Accept: SPEC sized it 6.6 m for the camera floor. Or stretch the box to z 20.6 under the gallery and shorten the passage. |
| 2 | A8 | `link a8-office -> a8-lobby-outer (fire_stair): width 1.2 m below 1.3 m` | `a8Strongroom.ts:180`, `:421-432` | Widen the office flight to 1.3 m (stairwell z 68.15-71.25 has room). |
| 3 | A1 | `a1-walltop: reached only through co-op links (coop_boost)` | `ctcourseGreybox.ts:244-248`, `a1Gate.ts:139` | Add the wall top to SPEC 12's revive list (a reviver must stand on the 0.6 m top) or make the top unstandable (a coping ridge). |
| 4 | A7 | `a7-cage: reached only through co-op links (pair_gate)` | `a7DataHall.ts:323-334` | By design: the merge point opens on the synced hack. Accept with a justification line (validator: exempt a team door's far side once its gate is the set's objective). |
| 5 | A7 | `a7-hold-l7: reached only through co-op links (pair_gate)` | `a7DataHall.ts:101`, `:334` | By design: the L7 door is on the sync. Accept as 4. |
| 6 | A8 | `a8-vault: reached only through co-op links (pair_gate)` | `a8Strongroom.ts:442`, `:496` | By design (the finale's time locks). Accept as 4. |
| 7 | A2 | `a2-neck: no high approach` | `a2CarriageShed.ts:257-264` (screens 1.2 on x 35-62) | Open a 1-2 m gap in the staging screen over the neck with a drop (4.4 m) or a ladder behind the watchers, or record that the staging bypasses the neck on purpose (SPEC "avoided by the staging"). |
| 8 | A2 | `a2-neck: shadow_pct 0.05 outside 0.4-0.6` | `a2CarriageShed.ts:274-277` | Lighting model (SPEC 7, P4): the 0.4-0.6 band assumes a dark level. Michael's P4 ruling decides; until then, declare the isolated state (0.85) and justify. |
| 9 | A2 | `a2-neck: vantage sees_pct 0.3 below 0.7` | `a2CarriageShed.ts:342` | Move the vantage to the van ends at x 45.5 (gap 2/3) or open a sight gap in the west rake's neck closure. |
| 10 | A4 | `a4-secroom: 1 approaches (need 3+)` | `facility.ts:172`, `a4GoodsShed.ts:231-237` | By design (the airlock door is the spine; the passage door is the other). Accept: a security room is the route's one short return (SPEC A4). |
| 11 | A4 | `a4-secroom: approaches use 1 route kind(s) (need 2+)` | as 10 | As 10. |
| 12 | A4 | `a4-secroom: no high approach` | as 10 | As 10. |
| 13 | A4 | `a4-secroom: no loud approach` | as 10 | As 10. |
| 14 | A4 | `a4-secroom: shadow_pct 0 outside 0.4-0.6` | `a4GoodsShed.ts:360` | As 8 (the switch by the L3 door darkens it). |
| 15 | A4 | `a4-secroom: vantage sees_pct 0.4 below 0.7` | `facility.ts:74` (L3 glass slot) | Widen L3's glass slot (0.5 m) or accept the door view (0.8 open). |
| 16 | A4 | `a4-dock: shadow_pct 0.1 outside 0.4-0.6` | `a4GoodsShed.ts:361` | As 8 (the dispatch switch cuts group 41). |
| 17 | A5 | `a5-inner: no high approach` | `a5Substation.ts:66-78` (6 m noLedge wall), `:296-307` | By design (a security wall, the throw is the way over). Accept, or declare the throw as the high route. |
| 18 | A5 | `a5-inner: shadow_pct 0.3 outside 0.4-0.6` | `a5Substation.ts:332-338` | As 8; close to the band (the pen pockets). |
| 19 | A5 | `a5-inner: vantage sees_pct 0.35 below 0.7` | `a5Substation.ts:386` | Accept the gateway view, or add a high slot in the inner wall at the drums. |
| 20 | A6 | `a6-floor: vantage sees_pct 0.6 below 0.7` | `a6PumpHouse.ts:119`, `:363` | Lower the kerb's east half to 0.9 m or move the vantage to the kerb's west end (x 49). Estimate: V6 may pass it. |
| 21 | A7 | `a7-hall: 2 approaches (need 3+)` | `a7DataHall.ts:287`, `:324` | Add a third way in: a door from the plant corridor into the hall's south aisle (x 78-84) or one from the riser block. |
| 22 | A7 | `a7-hall: approaches use 1 route kind(s) (need 2+)` | as 21 | As 21: make the new door the loud one (the corridor under cam2). |
| 23 | A7 | `a7-hall: no high approach` | `a7DataHall.ts:255-258` (4.0 slab, noLedge) | Accept (a 4 m data hall has no high route), or a raised floor void. |
| 24 | A7 | `a7-hall: no loud approach` | as 21 | As 22. |
| 25 | A7 | `a7-hall: shadow_pct 0.2 outside 0.4-0.6` | `a7DataHall.ts:360-364` | As 8 (aisle-end switch group 71 is the lure). |
| 26 | A7 | `a7-hall: vantage sees_pct 0.3 below 0.7` | `a7DataHall.ts:146-147`, `:419` | Glaze the lobby's whole east wall, or accept the fire plan as the overview (SPEC "both glazed lobby doors and the fire plan"). |
| 27 | A8 | `a8-hall: shadow_pct 0.3 outside 0.4-0.6` | `a8Strongroom.ts:514-516` | As 8; the board isolation is the designed dark. |
| 28 | A8 | `a8-office: 1 approaches (need 3+)` | `a8Strongroom.ts:411-412`, `:426` | Make the stairwell two-way (a request-to-enter at the foot) and add a door from the gallery's north run behind the office, or accept the office as a side room of the gallery leg. |
| 29 | A8 | `a8-office: approaches use 1 route kind(s) (need 2+)` | as 28 | As 28. |
| 30 | A8 | `a8-office: no shadow approach` | as 28 | As 28. |
| 31 | A8 | `a8-office: no loud approach` | as 28 | As 28. |
| 32 | A8 | `a8-office: shadow_pct 0 outside 0.4-0.6` | `a8Strongroom.ts:518` | As 8 (switch by its door). |
| 33 | A8 | `a8-office: vantage sees_pct 0.5 below 0.7` | `a8Strongroom.ts:411` | A glazed panel beside the office door, or accept. |
| 34 | A1 | `a1-cabin: dead end (one way out) not tagged reward or objective` | `a1Gate.ts:175-194` | Tag it `reward` (the checker's interrogation lines, G206) if Michael agrees; it is a 3 m side room off the route. |
| 35 | A4 | `a4-dispatch: dead end (one way out) not tagged reward or objective` | `a4GoodsShed.ts:289-307` | Accept (a lure destination and hide corner, not on a route), or a back door to the west-stair strip (z 44). |
| 36 | A2 | `section A2: routes never cross (secret and loud / shadow / high share no space)` | `a2CarriageShed.ts:70-72`, `:217-222` | Shorten the south-cess closure (x 45.5-46, z 0.25-3.7) to leave a 1.2 m crawl gap, so the cabin back door's cess route reaches the neck again (SPEC's secret route). |
| 37 | A1 | `section A1: 1 independent route(s) from entry 'a1-lounge' to exit 'a1-hold-l1'` | `a1Gate.ts:167` | Airlock format (choice 1). Interior: the lounge has one door. Accept (the start room). |
| 38 | A2 | `section A2: 1 independent route(s) ...` | `types.ts:140-141` | Airlock format; interior has 3 (2 solo). Accept. |
| 39 | A3 | `section A3: 1 independent route(s) ...` | `a3OfficeRange.ts:13-14`, `:95-102` | Real inside the set too: the offices route rejoins the corridor 5 m short of the camera (A3-D3 removed office 3's east-lobby door). Accept for the jam-relay teach, or restore a door with a second camera. |
| 40 | A4 | `section A4: 1 independent route(s) ...` | `a4GoodsShed.ts:231-237` | Real inside the set: the security room's passage door is the only way to the floor. Accept (SPEC: the route's one short return). |
| 41 | A5 | `section A5: 1 independent route(s) ...` | `types.ts:143-144` | Airlock format; interior 2 (1 solo: the gateway). Accept. |
| 42 | A6 | `section A6: 1 independent route(s) ...` | `types.ts:144-145` | Airlock format; interior 2. Accept. |
| 43 | A7 | `section A7: 1 independent route(s) ...` | `types.ts:145-146` | Airlock format; interior 2 (1 solo). Accept. |
| 44 | A8 | `section A8: 1 independent route(s) from entry 'a8-vestibule' to exit 'a8-dock'` | `a8Strongroom.ts:442`, `facility.ts:204` | Real inside the set: everything ends at the one vault door. Accept (the finale). |
| 45 | A3 | `section A3 has no co-op link` | `a3OfficeRange.ts:212-237` | Schema gap: the jam relay is the co-op move. Add a kind (e.g. `jam_relay`) or accept with a justification line. |
| 46 | A4 | `section A4 has no co-op link` | `a4GoodsShed.ts:325-327`, `:380-382` | Schema gap: the console loop and the dual takedown. As 45. |
| 47 | A7 | `split a7: legs never rejoin (no space both a7-hall and a7-pod lead to)` | `a7DataHall.ts:323-334` | Validator gap: the merge is through the team doors (co-op links), and the rejoin search uses solo links only. Hand times below. Fix the validator, or type the cage doors `door`. |
| 48 | A8 | `split a8 leg a: no solo link leads into a8-gallery` | `a8Strongroom.ts:155-156`, `:372` | Validator gap: leg a starts with the leg-up (co-op), and the only solo way up (the public stair) is in leg b's space. Let a co-op link with `time_s` enter a leg. Hand times below. |
| 49 | A8 | `pacing: three high beats (4+) in a row: a8-hall, a8-gallery, a8-office` | `a8Strongroom.ts` (whole set) | Tensions are estimates from SPEC 9 (A8 = 5). Add a release inside A8 (a dark, unwatched beat in the office stairwell), or rule that the graduation set is one peak. |

## WARN lines (81), grouped

- **`room_class custom` (45).** Every space with no sheet class, each justified in its `note`: holding rooms (7, an
  airlock lobby); decks and wall tops (7: a1-walltop, a2-staging, a4-mezz, a6-gallery, a6-bridge, a8-gallery, the
  a5-trench strip); shed floors and set zones under the yard class's 14 m (21); small rooms (10). Fix: sheet classes for
  airlocks and deck walkways (campus asks the same). The 45: a1-lounge, a1-apron, a1-cabin, a1-walltop, a1-yard,
  a1-hold-l1, a2-west, a2-cabin, a2-neck, a2-staging, a2-east, a2-hold-l2, a3-west-lobby, a3-east-lobby, a3-hold-l3,
  a4-passage, a4-mouth, a4-back-aisle, a4-east-lane, a4-main-aisle, a4-dock, a4-dispatch, a4-aisle2, a4-mezz,
  a4-hold-l4, a5-apron, a5-inner, a5-switchroom, a5-trench, a5-hold-l5, a6-sump, a6-cage, a6-gallery, a6-bridge,
  a6-hold-l6, a7-lobby, a7-pod, a7-cage, a7-hold-l7, a8-vestibule, a8-gallery, a8-lobby-outer, a8-lobby-inner,
  a8-vault, a8-dock.
- **Ceilings (7)**, all as built: a1-cabin 2.5 and a2-cabin 2.5 (site huts); a4-dispatch 2.9; a6-floor 10 (over the
  plant_room class's 6); a7-corridor 3.5 (over the corridor class's 3.0); a7-pod 2.6 and a7-cage 2.4 (the lid).
- **Class maximum (3).** a3-office1-3 are 5.5 x 8 against the private_office maximum of 7.
- **Opening widths outside 2.5-3.5 (10):** A2 lanes 2.4 m (written 2.0, `a2CarriageShed.ts:93-95`); A4 main aisle
  mouths 8.4; A5 gateway 6 and the trench gap 1.85; A6 gallery to bridge 5; A8 vestibule columns 17, beam curtain 11,
  vault back 7.7. Fix: an "open boundary" link kind with no width band.
- **Open stairs under 2.4 m (5).** Every deck stair is 1.2 m (`coopDeck`, `A4_STAIR`, `A8_PUBLIC_STAIR`). Fix: widen to
  2.4, or treat a service stair as `fire_stair` (1.3 m minimum, which would then ERR at 1.2).
- **Level change missing (2).** The two partner throws (schema gap: no throw kind).
- **Guard band (7).** Every encounter is below its band: A4 1-2 against 3-6, A5-A8 1-2 against 6-10. The cap is
  SET_GUARDS_MAX 3 per set (`types.ts:191`, `MAX_ALIVE` 12). Michael's "as many as realistically possible"
  (2026-10-24) needs the cap raised first.
- **`secret approach in 0 of 8 guarded encounter spaces`.** The set secret routes (A2 cabin back door, A3 offices, A5
  switchroom back door) enter connector or utility spaces, not encounters; A2's no longer reaches the neck (ERR 36).
- **`pacing: no release (1-2) after the peak at a7-corridor before a7-cage`.** Estimates; the pod (3) sits between them.

## INFO lines (8)

`pending V6 (no measured values)` for each encounter: a2-neck, a4-secroom, a4-dock, a5-inner, a6-floor, a7-hall,
a8-hall, a8-office.

## Splits: times (validator for a4, by hand for a7 and a8)

Pace: `length` / 1.3 m/s unless the link has `time_s`. Lengths are from the graph.

| Split | Leg a | Leg b | Parity | Reach | Notes |
| --- | --- | --- | --- | --- | --- |
| a4 | mouth -> east lane -> main aisle -> dock: 14.5 + 16 + 19.5 m at run pace = **17 s** | mouth -> back aisle -> dock: 11 + 15 m = **20 s** | 15% (pass) | under 15 s (pass) | Assist: the console loop (`a4GoodsShed.ts:326-327`). Overwatch: a4-mezz (B's mezzanine variant). |
| a7 | lobby -> hall (11.5 m) -> cage west door (10 m) = **16.5 s** | lobby -> corridor (19 m) -> pod (20.5 m) -> cage east door (8.5 m) = **36.9 s** | 55% apart (would ERR) | Through the hall and lobby about 10 s | SPEC says each path is about 45 s. The hall leg is short; it waits on the technician's 40 s round. Fix: lengthen the hall leg (enter the hall at its north-west, the riser side) or declare the wait as `time_s`. |
| a8 | leg-up (6 s) + gallery -> office (21.5 m) + office stair (23.5 m) = **40.6 s** | hall -> grille 17 m = 13.1 s; with the board detour (jam spot (118, 67.2) -> board (126.4, 76.5) -> grille (133, 62), 28.5 m) about **22 s**, plus up to the 25 s isolation wait | 46% on walking alone; inside 20% once B's wait at the board is counted | Gallery to hall by the open-edge drop or the public stair: under 15 s | The sync window is set by the 60 s camera loop (`a8Strongroom.ts:99`). |

## Interior redundancy (airlock doors left out)

Edge-disjoint paths from the set's first room to its last room before the holding room. "Solo" leaves out co-op links.

| Set | From -> to | All links | Solo links |
| --- | --- | --- | --- |
| A1 | lounge -> yard | 1 | 1 |
| A2 | west -> east | 3 | 2 |
| A3 | west lobby -> east lobby | 1 | 1 |
| A4 | security room -> dock | 1 | 1 |
| A5 | apron -> trench | 2 | 1 |
| A6 | sump -> floor | 2 | 2 |
| A7 | lobby -> pod | 2 | 1 |
| A8 | vestibule -> vault | 1 | 0 |

## Verdict per set

OK: only by-design or modelling ERRs, which need a justification line in the set doc. Patch: real fixes inside the set
box. Re-plan: a layout change.

| Set | Verdict | Why |
| --- | --- | --- |
| A1 Gate | Patch | The wall top is a co-op-only surface (revive list or an unstandable top); the cabin dead end (tag `reward` or accept). The rest is the airlock format. |
| A2 Carriage Shed | Patch | The neck has no high approach and the guards stand on the high route; X2b's closures killed the secret route (routes never cross); the vantage sees 0.3. Fix: a screen gap or a drop over the neck, and a crawl gap in the south-cess closure. |
| A3 Office Range | OK | No encounter. The single route is the jam-relay teach by design (A3-D2 / D3). It needs a co-op kind for the relay (schema). |
| A4 Goods Shed | Patch | The security room is 6 x 6 with 1 approach (by design: accept with a justification); the dock's shadow target; the dispatch dead end; no co-op kind for the console or the dual takedown. Split a4 passes. |
| A5 Substation | OK | No high approach (a security wall: the throw is the way over); the gateway-only vantage and shadow 0.3 are estimates. Justify; V6 measures them. |
| A6 Pump House | OK | Only the vantage estimate (0.6) fails; V6 may pass it, or lower the kerb's east half. |
| A7 Data Hall | Patch | The hall has 2 approaches of one kind; the split legs are 55% apart (hand count); the merge is through team doors (validator gap). Fix: a third, loud way into the hall and a longer hall leg. |
| A8 Strongroom | Patch | The office has one way in; the 1.2 m fire stair; five high beats in a row; the SPEC drop takedown onto N2 has no drop line. Fix: a two-way office stair or a second office door, a 1.3 m flight, and a release beat. |

No set needs a re-plan. Most ERRs come from the course format: one-door airlocks, teach sets and lit-by-default light.
Michael's rulings on P4 (lighting) and on the airlock exemption decide whether they become justifications or fixes.

## Graph vs SPEC (the code wins; each difference)

1. **Guards: 14, SPEC 12** (11 perceiving). A2 has 3: the shunter plus two staging overwatch guards a2-watch-w / -e at
   (48, 4.4, 17.9) and (54, 4.4, 17.9), leash 0 (walk482 X2b, `a2CarriageShed.ts:65-68`, `:297-303`). Being seen in A2
   fails the set (`SPOT_FAIL`, `ctcourse.ts:59-61`). SPEC A2 has one guard and no fail rule.
2. **A2 neck closures** (walk482 X2b, `a2CarriageShed.ts:70-72`, `:216-222`): four 0.5 m boards at the rakes' neck ends
   close the south cess (to 2.5 m) and the north walkway (to 4.4 m). SPEC's secret route ("the cabin's back door onto
   road 1's cess, behind the south rake") no longer reaches the neck; SPEC's loop round the west rake is gone; the loop
   round road 2's van between the two lanes remains.
3. **A2 rakes:** one 10 m van per road per rake, x 36-46 and x 56-66 (`a2CarriageShed.ts:94`); SPEC x 30-46 and 56-68.
   Road 2's east wheel stop is not built (walk482 X3, `:138-139`).
4. **A1 leg-up mark:** at (10.8, 6), 0.9 m off the wall (`a1Gate.ts:55`, `WALL_STANDOFF` `ctcourseGreybox.ts:38`); SPEC
   (11.2, 6). The vehicle gate is dressing only (A1-D3, `a1Gate.ts:294`). The wall's far face also carries the lip, so a
   leg-up from the yard side works too (not in SPEC).
5. **A3 camera range:** `A3_CAMERA_RANGE` = 14 (`a3OfficeRange.ts:64`). SPEC and the register row A3-2 (`:237`) say 17.
6. **A3 office 3:** its corridor door is at x 91.4-92.6 (A3-D2, `a3OfficeRange.ts:95-102`), 5 m from the east lobby,
   not SPEC's 3 m; it has no door to the east lobby (A3-D3, `:13-14`), so the offices route rejoins the corridor under
   the camera.
7. **A4 shutter and dispatch office:** the dock roller shutter moved to z 35.0-37.8 (`a4GoodsShed.ts:152`). The
   dispatch office has no lamp.
8. **A5 positions:** drums at x 62.1-64.3, z 29.4-33.0 (A5-D1, `a5Substation.ts:107`; SPEC x 60-63, z 29-33); pen 1 at
   z 24.3-29.3 against the south wall (A5-D4; SPEC z 25-30); pen 2 at z 40.5-45.5 (A5-D5; SPEC z 40-46).
9. **A5 switchroom and ceiling:** the switchroom has a second, back door on its north face (A5-C2,
   `a5Substation.ts:308-313`), so it is a loop and the secret route's way in (SPEC: one door). The set is open to the
   10 m roof (ambient top `HALL_H` - 0.1, `:347`); SPEC says a 6 m set ceiling. Only the inner wall stops at 6 m.
10. **A6 positions:** pump 3 at x 46 (A6-D3, `a6PumpHouse.ts:114`; SPEC x 45). The gallery's east screen is split for
    the bridge (A6-D4, `:103-104`).
11. **A7 camera, cage and racks:** a7-cam1 is on the north wall at (86.5, 71.5) with a 4 m aim (`a7DataHall.ts:27-29`,
    `:133`), not over T1's approach at the north-east corner; a solid 1.75 m cabinet stands in the cage between the
    terminals (`:87-93`); racks stand only west of the cage, plus row 1's east part (`:113-118`); the lobby is 9.9 m deep
    in z (SPEC 6 m).
12. **A8 security office and stair:** the office is x 134-144 (`a8Strongroom.ts:396`; SPEC x 134-142). The office stair
    is an enclosed flight x 134.5-142.2, z 70-71.2, rising east, with a locked foot door that has an egress bar (`:180`,
    `:421-432`); SPEC x 142-145, z 68-77, one flight south. A player cannot climb back up from the lobby.
13. **A8 time locks:** 12 m apart (`a8Strongroom.ts:132-133`); SPEC 13.6 m.
14. **A8 grille:** the request-to-exit gate is on (`A8_RTE_GATE_ON`, `:116`).
15. **A8 counters:** the main run starts at x 114 (A8-D2).
16. **A8 drop takedown:** SPEC's "A drops from the gallery onto N2" has no drop line. The 1.2 m solid balustrade
    (noLedge) is open only at x 109, z 66-70.5 and at the stair head (`:365-372`), and N2's loop is x 126.4-133.2
    (`:78`).
17. **A8 beam release:** the beam curtain's release is removed (A8-D4); the beams drop on a8-sync (`:455`).
18. **Facility:** walls are 0.5 m, not SPEC's 0.45 (`facility.ts:56-58`); house circuits are groups 90-98
    (`facility.ts:77-80`; SPEC 7 says groups 1 and 2); L4's east door is built locked and opens by A4's push bar
    (`facility.ts:81-87`).
19. **Holding room checkpoints:** SPEC 12 makes each holding room the next set's checkpoint; the graph tags it on the
    holding room, in the section before (modelling choice 1).

## Measure

`scripts/level-measure.mjs` is not on this base (4ccb6aea): **measure pending.** Every `shadow_pct`, `sees_pct`,
`los_break_s` and link `time_s` in the graph is a hand estimate, marked "ESTIMATE ... pending V6" in its note. `area`
boxes are on every space and `vantage.at` on 7 of 8 encounters, so V6 can measure the graph as it stands.
`a4-secroom`'s vantage point is the L3 glass slot, a point in the previous section.

## Checks

- `node scripts/level-validate.mjs docs/marlow-final/graph/ctcourse.json`: no schema / parse error; 49 ERR, 81 WARN,
  8 INFO, exit 1 (design findings).
- `npx vitest run tests/levelValidate.test.ts --maxWorkers=2`: 86 / 86 pass.
