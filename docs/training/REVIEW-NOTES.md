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
