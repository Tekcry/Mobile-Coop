# Notes collected for REVIEW.md (built at T9)

- **QUESTION FOR MICHAEL (T5c, D41 / A51): boost skips geometry cannot close.** A co-op boost reaches lips to 4.5
  (`TEAM.boostMax`, frozen). Where a boost could skip an element, BAYS v2 now raises the lip above 4.5, screens it
  (flush 2.4 `noLedge`) or cages the ladder head. Three spots cannot be closed that way: B3 WJ1 (lip 3.4) and WJ2
  (lip 3.2), because a wall-jump lip (2.7-3.8) is always inside boost reach; and B4 W2 (4.25 / 4.4), because the boost
  reaches everything the human ladder reaches. Today the drill tick holds them (the airlock refuses until the wall
  jump / human ladder is ticked, D30). Options: (a) keep the tick as the backstop there; (b) a course rule: a boost
  works only at marked boost spots (B4 W1, OP, B9's gap) - a code change in the course framework, no tuning change.
- Exceptions E5-E10 (SPEC) need Michael's confirmation; E1-E4 were approved in D10.
- Co-op light state is not synced to clients on the base branch (src/net/coopHost.ts has no light state; 2026-10-13
  grep). T1b adds a minimal light list to the `course` message as a stand-in for First Playable S7a / bible L10.
- `scripts/plan-svg.mjs` does not exist on the base branch; T2 creates it (template rule).
- T0: B6 supply duct entry moved onto a plant platform (feet 2.2) in A5's service passage; B3 duct one-way (spec change requests, LOG.md T0).
- T0: animation per character is over its scaled budget on the cloud VM at baseline (0.105 vs 0.067 ms): pre-existing, confirm on the PC.
- T1b: A6 revised: the dev solo flag lets one player cycle airlocks and both halves of pair gates (D21); drills still need real verbs (D30). The T1a checker had read RULES as ticks-only.
- T1b: e2e-course timed out once in a 2-job e2e:quick beside heavy suites (moveHost 5 s wait); passed serially twice; wait raised to 15 s.
- T1c: e2e-course "host: lever ... client sees the lock change" took 1323 ms (limit 500) once under 2 parallel jobs on the cloud VM; passed serially. Logged as flaky (timing under load).
- Block A end: pre-existing failures (identical on feature/kestrel per RULES): e2e-kestrel ("camera rays along the tour"), e2e-camera-bounds level U.
- Block A end: e2e-stealth ("standing: the view follows every bit of look input") and e2e-feedback ("the free camera flies") failed once in a 2-job full run on the cloud VM and passed serially: input timing under load.
- Block A end: perf trend allocations 11882 KB/s vs T0 11163 (+6%) on the cloud VM, over the 11520 budget; check on the PC with E2E_GPU=1.
- T2: spec change: B2 walkway east doors B2-exit-n/s locked and opened by the opposite lane's lever (closes a gate bypass); glass walls are invisible collision boxes (block bullets, sight probes and light like a wall), no glass mesh yet (no translucent box in the builder).
- T2: e2e-course timed out once in a 2-job run ("host sees the client at 11, 2.4", older airlock section) and passed on its own: same timing-under-load pattern as T1b / T1c.
- T2 PC shot: Lane S ladder rails stand 0.4 m clear of the ladder-head landing's face (visual gap only).
- T3 SPEC CONFLICT (human ladder): `TEAM.ladderGrab` 4.1 (+0.2 slack, teamController.ts:306) caps the human ladder's grip at 4.3 over the floor, but W2's lip is 4.4 (BAYS, level-design 11.3 co-op lips 4.3-4.5, and > `WALL_JUMP.maxUp` + 0.5): the B4 step 2 human-ladder drill cannot reach W2. Not changed (tuning tables frozen; 4.3 fails the strict solo margin and float rounding). Needs a decision before T7a: W2 at 4.25-4.3, or the human ladder's reach. See LOG "Spec change requests (T3)".
- T3: A4 floor at y 10.4 (outlet platform), not 6 (A32): T4 must land A4's far door on B5's entry landing at local 4.4.
- T3: B3 fan pit hood (A31) and the duct at 4.15 m (not 7): spec numbers changed.
- T3: voxelFit height bound for the bunker raised to 40 m (A34): T9a must size the bunker's voxel grid (the course is about 162 x 158 m; the 110 x 110 area bound will fail once T4 / T5 build out).
- T4 spec change (A36): B5 cable gallery shortened to x 2..24 (ladder at x 23.3, not by SR) because A4's door lands on a 4.4 landing on the north wall; landing screened from the gallery (no free high route). Michael: is the 13 m dash from SR to the gallery ladder acceptable for the breaker player's escape?
- T4 spec change (A36): B6 corridor L leg dead-ends (beams and PIR guard a dead end); exit keypad door from SV's nook; S6 at z -8; S6 mid landing 3.0.
- T4 (A37): B6 now-form gates AND per door, so readers are single flag gates; egress / records exit are pickups releasing reader levels. S6 top door one-way via bolt; relock after both pass needs a new gate kind (T7a).
- T4 (A36): voxelFit bunker area bound now the course plan 164 x 160 (T9a sizes the voxel grid).
- T5 spec changes (A39-A43): B7 inverted takedown over the annex roof edge; B7-O / B7-R stops for the window and the ledge pull; WM 4.9, parapet 0.9; B8 CS a convenience gate, CS / scaffold moved; B9 deck and cabin depths, stair towers, bridge to the wall. Michael: are the vaultable catwalk rail (A43) and the downpipe route onto the parapet (A40) acceptable?
- T5: e2e-anchors now covers `bunker`. The first run failed on B3 zipline 42 (the suite's 0.7 m approach landed 4 mm off G3), B3's rope-only kick-through window 43 (no floor on either side) and B7 window 85 (it opened onto the timber stair: a Deep anchor that did not pass). Checker fixes: window 85 moved into the lobby; the suite now takes the first zipline stand within reach whose floor is 1.5-2.6 under the cable, and works a rope-only window from the rope that passes it (hook on, lower, "Kick through", the glass breaks). All bunker anchors pass.
- T5: voxelFit bunker area bound 166 x 162 (A39; T9a sizes the grid).

- T5: spec change: B9 staff tunnel door moved from BAYS (x 40, z 0) to the plot floor's east wall at z 5 (it was inside the SE stair tower); B9-REINF at (43.2, 5.6). Sniper scaffold at z 18..22 (BAYS 20..24) to clear the catwalk stair door.
- T5 / T7b: guards' path queries use a 3000-expansion limit (src/ai/enemy.ts ~:953, 1362, 1403); every storey-changing path in B7-B9 needs 1510-17954 expansions, so cross-storey patrols / searches / chases get no path. T7b must fix it (storey-local route legs meeting at stair doors, or a higher limit only for storey-changing queries, checked on the other maps).
- Block B self-review (docs/training/BLOCK-B-REVIEW.md): register 24 built / 24 changed (logged) / 3 partial / 0 missing. Level-design 16.10 gaps for T5b / T9: handrails on the B7 stair and stairwell, B9 tower flights and B8 catwalk stair (16.2.4); B7 parapet 0.9 vs 16.5.3's 1.1 (needed for the ledge pull band); B7 roof hatch cover; about 10 built elements without a register row (B3 hood, B5 entry landing, SR second door, B7 downpipe, B9 pier ...); E-B3-2's reason out of date.
- Block B end: e2e-course's 500 ms host lock-sync assert fails under 2-job load in most full runs (821-1323 ms) and passes serially: T8a should make the limit load-aware or measure in sim time.
- Walk blocker (2026-10-13): Michael sees a black 3D view (UI and minimap fine) on his PC, even with `&fullbright=1`. Software GL renders the bunker at every preset. Suspect: GPU memory at medium and above. The bunker's 3D textures are a voxel brick pool of 512x512x760 (R8, ~200 MB) plus a 980x141x880 R8 volume (~120 MB) and others, against Warehouse's 512x512x248. At `gfx=min` they shrink to 512x512x32 and 359x103x359. Walk workaround: `&gfx=min`. Root cause and the fix (grid sizing, A34 / T9a) need the PC's console.
- T5b check (E2E_JOBS=2, e2e:quick): e2e-feedback "free camera flies (0.42 m)" failed under 2-job load and passed
  serially (flaky; T5b does not touch it). e2e-coop "everyone ready" and e2e-netmove failed under load and passed
  serially (known flaky).
- T5b fixes: e2e-course's 500 ms host lock-sync assert (the mains lamp group, 727 ms) failed once more under
  E2E_JOBS=2 and passed serially (as logged at Block B end; T8a). The client-blocked walk checks in e2e-course and
  e2e-bunker were flaky for a different reason, now fixed: the client was teleported onto the host, and the client
  page's partner hit capsule (PvpTarget hit boxes, G.ENEMY, which the player collides with) pinned him. The host
  now steps clear first. Open question: the client is body-blocked by the host's capsule but the host walks through
  the client (asymmetric); decide whether partners should block each other.
- T5b fixes (round 2): e2e-bunker's client join (the 60 s wait, e2e-bunker.mjs ~:112) timed out under e2e:quick with
  E2E_JOBS=2 and passed serially (flaky under load; not fixed).
- T5b fixes (round 2): e2e-course's "host sees the client at 11, 2.4" wait (moveClient, e2e-course.mjs ~:135) timed out
  once under E2E_JOBS=2 and passed serially (flaky under load; not fixed).
- T5b2 (D49) for Michael: walking dead-centre into a standing partner stops short of him (0.52 m apart, the two
  radii 0.59, e2e-bunker); a walker that hits off-centre slides round the partner's round capsule on contact. That is
  accepted physics, not a bug: e2e-bunker bounds it from the walk trace (never closer than the two radii less 0.08 m,
  never past him).
- T5b2 fixes: a teleported partner (bay start, checkpoint reset, respawn) slid through every point between the two spots
  for one snapshot interval (about 50 ms), and its blocker with him, shoving other players. Fixed at the root: the
  snapshot interpolation snaps jumps over 2 m made at over 25 m/s, or across a gap of over 0.3 s in the states (a stalled sender: the first e2e run showed a standing partner gliding 2.6 m over 2 s; also enemy puppets) that land further than max(2 m, sqrt(2) x the speed before the gap x the gap) from where that velocity would carry the partner (fix round 3: a runner turning a corner early in a stall no longer pops; a moving partner teleported during a stall within that bound slides instead of snapping), and the blocker parks 3 frames after
  a 0.6 m+ jump. e2e-bunker replays the buffered states at 60 fps and checks the blocker is never solid between.
- T5b2 fixes (E2E_JOBS=2): e2e-netmove (cover joints within 10 cm, twice) and e2e-coop ("client takedown offered on the
  host's guard", once) failed under load and passed serially (known flaky). The e2e-bunker startup timeout did not recur.
- T5b2 final check: e2e-netmove failed 4 of 6 runs on the T5b2 tree; the same cover-joints check also fails at base 4cae63f (1 of 3 serial runs), so it is pre-existing. With a stall of 0.4 s or more, a snapped moving partner steps back from the extrapolated spot to the old state, then jumps to the new one (hold-then-snap design; minor). A reversal or a speed change (walk to sprint) during a stall over 0.3 s can still snap; the blocker parks, nobody is shoved.
- T5c (BAYS v2) route / gate changes for Michael's review (LOG "Spec change requests (T5c)"; A50-A60): B2 one lane, no
  lever gates; B3 no split, two rope stages, twin ducts; B4 Phase 5 bay off the line; B6 shared duct start, locked
  reception inner door, L-leg to the mantrap; B7 no split; every bay's coordinates new (BAYS 0.1).
- T5c fix round 1 (checker FAIL): B4 W1 screened from VG and W2's south edge screened (R1 bypass closed); B3 landing
  edges 2.4 screens; retry rule (A61: B3 RL1 / W5 return routes and gates, self-closing grilles and louvres, B2 RL2 and
  re-glazing panes, B5 / B8 re-lamping) and guard relief (A62) - new course features T5d / T5e must build; A50 reworded
  (single-file at any length with waiting spots); A51 rewritten (geometry first: B3 casing 4.6, B2 pit -1.0 and portal
  sump, caged ladders at B2 G1 and B6 AH); B5-G1 route 25.6 m / 38 s; B6 stair landing; B8 firing-line door; B1 L1-9.
- T5c fix round 2 (checker FAIL): return gates are one-way single-occupancy turnstiles (A61, new course feature
  for T5d); B3 rope net NR under G5's rope point (ML only by sideways + unhook), RL1 replaced by ML -> NR -> G5, CR
  window rope-only, CR substructure solid; B2 L1 and portal sill 4.5 -> 5.0 (boost); relief doors (A62); lamp-shot
  drills restored in B2 / B7 / B9 and a greyed B7 whistle line; v1 "(both)" rows now marked "placed" (friendly fire,
  ghost tier, ADS spread, medkits, gadget wheel, CCTV, ...: LOG "Spec change requests (T5c fix round 2)") - confirm.
- T5c fix round 3 (checker FAIL; rope stages fitted to the engine's rope code as it stands, no tuning change): B3 RP1
  hangs from the hoist beam on HP's north face (top x 4.8, z 0.8), reaches ML (x 6.3) at the `RAPPEL` 1.5 m sideways limit
  and unhooks onto ML (T5e: ML's west edge is a full-height screen with a one-way return gate to NR), rope end at ML's floor; NR lowered to y 8.8 (ML lip 4.8 over it: a rope bottom-out
  lands heavy, no damage); RP2 hangs from a davit head on CR's west wall (x 9, facing west) into a 0.9 m well, the
  only place the engine offers the kick through CR's window. Drill coverage changes from v1 - confirm:
  - CCTV is now P2-only: B6 operator loops CAM1-4 (objective 15); P1 has no CCTV drill (B8 / B9 cameras placed).
  - IR beams: v1 "B6 (both)" is now the runner P1 crossing them (placed, not ticked); P2 turns them off (objective 16).
  - Self-use medkits are placed (A4, A6, A8, B9: use when hurt), not a drill for either player.
- T5d (Upper v2) left for T7a / T6: (1) RL2's one-way single-occupancy return turnstile (A61) is a locked door on G2
  (`B2-rl2`); until T7a builds the rotor a player who leaves G2 without the hang cannot go back up (the hang objective
  is still ticked only by the real verb). (2) The two glazed practice panes do not re-glaze (A54, A61). (3) L2-G1..3
  and the re-lamp rule are T6 / T7a (objective 4a is listed only). (4) DS light switch K4 and the strike post are not
  devices yet. (5) e2e-bunker's client-use check moved from B2's lane lever (gone in v2) to B6's card A pickup.
  (6) Interim: A2's far door opens onto a 2 m passage to the v1 B3 door at x 84; T5e removes it and moves B3 to (65, 46).
  (7) Objectives are `CourseDef.objectives` entries (names in BAYS order), not drills, so the airlocks still cycle
  with nothing open until T7a.
- T5e (B3, A3, B4, A4 rebuilt to v2; cloud). T5c open items closed: (1) walk-off from HS: the rope column (x 3..5.95,
  z 0..3.8 over NR) is closed north and east by full-height glass to y 23.0; ML's west screen carries a return gate to NR
  (the RP1 retry). (2) Ladders moved out of the rope kick volumes: NR's to (4.4, 3.3), RF's to (6.4, 1.9) facing a hatch pier (an unhook after a kick-out, z 2.5, can drop through the hatch into RF: the ladder returns)
  (test: no ladder in either swept volume). (3) Wording fixed here, in A61 and BAYS; heavy landing recovery is ~0.7 s,
  not 0.6 (corrected in fix round 1: `playerController.ts` landT = min(0.7, 0.15 + (v - 3) * 0.08), floored at
  `LANDING.heavyRecovery` 0.6; falls >= 4.5 m land at >= 12.7 m/s, so 0.7; STATE's "~0.7 s" was right); register rows E-B3-10..12 added (renumbered from duplicate E-B3-7..9 in fix round 2).
  Left for T7a (SHAFT_ELEMENTS, `final: false`): W5's turnstile and ML's return gate are locked doors (`B3-w5`,
  `B3-mlr`); NR's turnstile is an open gap (a way back only); CR's window is a breakable pane, not the sprung rope-only
  pane (RF lowered to 4.5 so its sill is 5.0 over RF: no boost in); RF's hatch is an open manhole (RF is a dead end);
  duct grilles / louvres are plain duct ends; B4's rail gate is an opening; the Phase 5 float shaft is not built.
  Interim (A71): B4 v2's offset (66, 14) lies inside the v1 B5, so B4 stands at (93, 30), A4 at its v1 place and a 2 m
  passage joins A3 to C1 until T5f. For Michael: NT2 (y 2.0) overhangs the fan guard's west half, so the guard is
  climbed from x 9.5..12 (2.5 m); the zipline rider's feet pass 0.1 over NT2's 2.0 west screen.
  Fix round 1 (checker): RP2 could leave the body overlapping the well's north screen (z 2.9..3.0) with the fan pit
  behind it (a push-out into the pit skips CR..fence). Moved within the windows: RP2 and the CR window z 1.5 -> 1.8,
  the well / RF north screen to z 3.65..3.75 (RF, ML, DB, DH run to 3.75; DH's rope gap z 1.3..2.2). New test 'rope
  catchers': every rope / cable position plus kick-out plus capsule radius settles over its catcher (fails on the old
  geometry); R2 graph gains G5 -> RF by rope 1 (an unhook over ML's hatch). Flaky (load): e2e-bunker under
  E2E_JOBS=2 failed once on "the partner teleported across the host's spot is never solid" and once on the client-join
  timeout; both passed serially.
- T5e final check: ML's waiting spot (x 6.1..8.1, z 0..2) overlaps the open hatch hole (x 6..6.8, z 1.5..2.9) until T7a fits the walkable lid; a waiting player can drop 9.1 m into RF and climb back (nuisance, not a skip). A4's wall medkit was missing (added in T5f).
- T5f (B5, A5, B6, S6, A6 rebuilt to v2; B4 / A4 moved to v2, A71 interim removed; cloud). Left for T6 / T7a / T7b
  (PLANT2_ELEMENTS, `final: false`): B5 L1-L4 circuits, HB1-6 / CG1-3 lamps, EM / PIR fittings and the A61 re-lamp (one
  mains work lamp now, non-breakable); the CG switch is not built (MB only); B6 cameras, beams, PIR, iris, panel and
  fault are mount points (`BUNKER_DEVICES`); guards, cards and relief (`RELIEF_DOORS`, A62: visual leaves with spawn
  points, no anchor) are T7b; S6's relock gate is T7a. Interim (A74): v1 Deep moved by (+17.5, -29) so v1 B7's A6 door
  meets v2 A6; BUNKER_BOUNDS grew to x -1..181, z -86..103 (nav grid about +30%, trend only) and voxelFit's bunker area
  bound now derives from BUNKER_BOUNDS; T5g restores v2 Deep. Numbers moved within windows (A75, BAYS updated). For
  Michael: EL's south edge is a 2.4 screen, not the BAYS balustrade (R2: a vault off it skipped the stair).
- T5f checks: e2e-bunker "timed out waiting for client in the Fallow course" under e2e:quick (E2E_JOBS=2) again; passed serially (load flake, recurring). Vitest 5 s timeouts (lightField allocation, voxelFit Warehouse) once while e2e ran alongside; passed on rerun.
- T5g (B7, A7, B8, A8, B9, L9 rebuilt to v2 at the BAYS 0.1 offsets; A74 interim undone; cloud). Left for T6 / T7a / T7b
  (DEEP_ELEMENTS, `final: false`): B7 guards, L7 circuits and re-lamp, the store code (now the desk-drawer pickup),
  greyed whistle / drag lines; B8 guards and the live-fire trigger, L8 circuits and gantry re-lamp, dummies / barrels /
  CAM-R as data, greyed V3 / Phase 6 / backlog lines; B9 guards and dog, CAM-P1 / P2, desk, beam, PIR, alarm and
  reinforcements as mount points (`DEEP_DEVICES`), L9 circuits with the P3 switch in the duct door, greyed Phase 5
  line, the key pair as two switches until Sync. Relief doors (`DEEP_RELIEF_DOORS`, A62) are visual leaves with spawns.
  Numbers moved within windows: A76 (BAYS rows synced); bounds A77. For Michael: B8's CS now runs along the dark walk's
  east end (x 50..58) because a 4.0 m stair does not fit in 6 m; the cage closes the dark walk at x 50, so the dark walk
  (z 12..16 under CW) rejoins the lanes before x 50 and the far end is reached past the scaffold (z 0..12).
- T5g check: e2e-course "lamp group goes off in 1033 ms (limit 500)" under e2e:quick (E2E_JOBS=2), passed serially (the known lock-sync load flake, T8a). Advisory: the B8 firing slot (0.6 m) may admit a kinematic vault on a diagonal approach (vault rays pass the slot); it skips nothing (the glass door is beside it) - close the slot to 1.0..1.4 or add a 0.4 m kick-panel ledge if it shows up in walk 2. Stair widths B7 1.5, CS 1.6, towers 1.7 are under A50's 1.8 (B5 / B6 precedent; two capsules still pass). No e2e walks B1 to L9 end to end yet (unit reachability only; T8b).
