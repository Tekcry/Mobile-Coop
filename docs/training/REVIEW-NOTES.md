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
- T5: e2e-anchors now covers `bunker` and fails on three pre-T5 anchors (every Deep anchor passes): B3 zipline 42 "offered false engaged true" (another anchor wins the prompt at the suite's approach point, 0.7 m behind the cable's high end), B3 kick-through window 43 front / back "offered false engaged false" (a rope-only window: no floor on either side for the suite's approach), window 85 back "offered false engaged true". Not weakened; for the T5 checker / T3 owner.
- T5: voxelFit bunker area bound 166 x 162 (A39; T9a sizes the grid).

