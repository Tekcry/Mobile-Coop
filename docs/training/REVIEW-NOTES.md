# Notes collected for REVIEW.md (built at T9)

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
