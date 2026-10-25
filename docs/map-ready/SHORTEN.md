# map-ready: shorten the wait to 20 s (S8)
Owner: Night Shift | Sector Ops Build. Status: current.

S8's plan (`PLAN.md` S8, `briefs/S8.md`; BRIEF A2 cap 20 s, A12 the aim, A13 "plus a job to shorten it", A17, A19).
Planner: Opus 5.5, 2026-10-26, on `feature/map-ready` 3a18a7bb5 with S1 (`feature/map-ready-s1` b95911c04) and S2
(`feature/map-ready-s2` a85f3db93, checker PASS) read. A plan, no code. Its build slices: S14, S15, S16 (briefs in
`briefs/`).

Deviation from `briefs/S8.md` (the lead's call, 2026-10-26): written on `feature/map-ready` and before its two input
tables exist. S1's baseline (`research/baseline.md`) and S2's flag-on measure are still pending laptop runs, so the
per-map seconds in section 1 are the measured V12 / LR16 numbers already in git, and the first slice (S14) adds the
per-shader log that fills the table on the same laptop run. Section 4 says what happens if the run disagrees.

## 1. Where the first-ever Epic seconds go
The cap counts from the end of `World.create` (A2), so the PC lamp bake of Marlow Yard and warehouse (inside
`World.create`, awaited) and the shipped campus bake are not in it; they only lengthen the total (A17 covers them).
What the cap sees on a first-ever (fresh browser profile) Epic load: the player's play LODs arriving (18 MB, KTX2
transcode), then the `shaders` step, the probe and the warm frames.

| Map | First-ever Epic, measured so far | Gap to 20 s | Source |
| --- | --- | --- | --- |
| campusOps | one Epic body variant compiles in 36.7 / 43.5 / 38.8 s (three browsers at once, laptop RTX 4090, D3D11, cold) | 17-24 s (one variant) | `src/player/bodyEffectRecovery.ts:24-25`; CONFORMANCE V12 (`docs/conformance-sector-ops/CONFORMANCE.md:150`) |
| ctcourse (Marlow Yard) | same body variants (Wren, partner, guards); not timed alone | at least 9 s (estimate) | the campus numbers apply: the body shader is the lamp plugin's, the same on every map (`tests/pluginCode.test.ts`, S10) |
| warehouse | one Epic body variant 29.3 s solo | 9.3 s (one variant) | V12 (feature/sector-redesign-polish f87c37d8 `docs/sector-redesign/STATE.md:335`) |

Pending laptop run (S1 baseline, S2 measure, S14 log): `World.create` s, each gate step's s, `loadPrograms`, the
programs still compiling after a cap hit, per map. S14's log adds each shader's compile ms, its kind (body, guard,
level, weapon, post, other) and how many compiled at once.

Why one variant takes 30-44 s (`feature/sector-redesign-polish:docs/sector-redesign/checks/lr16-lightbake-triage.md`):
LR16 made the body's Epic fragment shader about 5-6x bigger (fetch sites ~30 -> ~163; ~1520 if fxc unrolls the lamp
loop). On ANGLE D3D11 the HLSL compiler (fxc) runs on the CPU. The pre-LR16 body variant compiled in under 8 s
(master passed with the old 8 s body watchdog). Two causes stand out in the code:
- `texture(lampVis, ...)` (implicit derivatives) inside the 24-slot lamp loop that has `break` / `continue`
  (`src/world/bakedLamps.ts:1044`, `:1046`, `:1682`, `:1684`): a gradient read in a loop with a varying trip count
  makes fxc try to unroll it, with the door loops and the char-shadow PCSS (8-tap blocker + 16-tap filter,
  `src/world/charShadows.ts:148`, `:160`) inside each slot. `lampVis` has no mip levels (`bakedLamps.ts:339`,
  `RawTexture3D(..., generateMipMaps false, ...)`), so `textureLod(lampVis, uvw, 0.0)` reads the same texels.
- The torch loop with its own PCSS and door test (`src/world/torchShadowSet.ts:349`, `:361`, `:368`).

A second cost is in S2's gate itself: `gateCompileAll` (`src/game/gameState.ts` on S2, the `shaders` step) awaits each
group before starting the next (the player's body and weapons, then the level, then each guard one at a time, then the
rest). With `KHR_parallel_shader_compile` (Babylon 9.29 uses it whenever the browser has it:
`Engines/thinEngine.functions.js:92`; nothing in `src/` turns it off) the browser can compile several programs at once,
so a serial gate pays the sum of the long variants (the player's body, then the guards' `GUARDFIG` variant, then the
level's lamp variant) instead of the longest one. How much the browser overlaps is measured, not assumed (S14).

## 2. Candidate cuts
| Cut | Saves (first-ever Epic) | Measured or estimated | Risk | Look or rule |
| --- | --- | --- | --- | --- |
| A. Every compile group started at once in priority order (no wait between groups); the level group starts at `quality` + `content`, not after the bodies | the gate's `shaders` time from the sum of the long variants to about the longest one: est. 10-30 s on campus | estimated (S14 measures in-flight overlap) | the player's body may queue behind other programs if the browser's compile pool is small (S14's log shows it; the serial order stays as `?compileorder=serial`) | none |
| B. The body lamp loop without forced unrolling: `textureLod(..., 0.0)` on `lampVis` in the loops (same texels), then, only if needed, loop trip counts read from a uniform (same counts) | the body variant from 29-44 s toward the pre-LR16 class (< 8 s); est. 15-30 s | estimated (S15 measures each step on the laptop) | an fxc compile failure on a restructure (the nsGrid2 X3504 / X3696 history); a float-level picture change | none intended: the same math and texels; any visible diff stops the slice for Michael's sign-off |
| C. A lobby shader warm: the briefing / co-op lobby compiles the match's body, guard and weapon variants with the match's defines, kept by S10 into the match | the rest of the compile, when the player stays in the briefing or lobby at least that long | estimated | the warm's defines must equal the match's exactly (else a wasted compile); lobby frame cost | beyond Michael's Q3 option 1 text ("the lobby loads the map's files, textures and sounds"; A19 "a first-ever shader compile starts at Start"): a new A-line (A20) for Michael |
| D. Fewer Epic body variants (one key for every LOD and character kind) | one long compile per kind instead of several | needs S14's log (how many body keys a load makes) | defines unified by padding bones / influencers | none |
| E. The Marlow Yard / warehouse PC lamp bake in the lobby or the manifest (A17) | 0 s of the cap (the bake is inside `World.create`, before the cap clock); only the total | measured single thread: ctcourse 34.6 s, warehouse 14.3 s (`lr16-lightbake-triage.md`), on `hardwareConcurrency - 4` workers | none new | none |
| F. `KHR_parallel_shader_compile` | already on (Babylon default); its value comes through A | measured in code | none | none |

S2's priority order is in already (not a candidate); A keeps its order and drops only the waits.

## 3. The chosen cuts (build slices)
| Slice | What | Model | Size | Cloud | Expected after it (first-ever Epic, campus, laptop) |
| --- | --- | --- | --- | --- | --- |
| S14 | Compile log (per shader ms, kind, in-flight count) + cut A (parallel priority compile, `?compileorder=serial` keeps S2's order) | Opus 5.5 | ~650 | yes (tsc + vitest; GPU run pending) | gate `shaders` ~ the longest variant: est. 30-44 s, still over 20 s; the log names the long poles |
| S15 | Cut B: the body lamp loop without forced unrolling, step by step, each step timed on the laptop with S14's log | Opus 5.5 | ~350 | no (each step must compile on ANGLE D3D11) | body variant est. 8-15 s; reveal est. 12-18 s after `World.create`: under 20 s with `capHit` false (estimate) |
| S16 | Cut C: lobby shader warm (only if a first-ever Epic load still hits the cap after S14 + S15, and A20 is accepted) | Opus 5.5 | ~600 | no (needs S10, S11 and a GPU proof) | a Start after the warm finished: no compile at Start (repeat-load class) |

Cut D becomes a slice (S17) only if S14's log shows more than one Epic body key per character kind on a load; cut E
stays A17's rule (a bake over 2 s on a first load joins the manifest; S14's run reports `World.create` seconds).
Briefs: `briefs/S14.md`, `briefs/S15.md`, `briefs/S16.md`. Claims and order: PLAN S8 and section 1.

Order against W3-W4: S14 needs S1 + S2 (its base: `feature/map-ready-s2` until the lead merges S1 / S2 into
`feature/map-ready`); it edits `gameState.ts` in functions S3, S5 and S11 do not touch (S3 / S5 / S11 do not claim
`gameState.ts`). S15 runs in parallel with S14 (disjoint files); its laptop timing needs S14 merged in. S16 after S10,
S11, S14 and S15 and only on its trigger. The after-S11 laptop run then re-measures every map against 20 s (Q2).

## 4. If 20 s is not reached
- After S14 + S15 the lead's laptop alone run (S1's script, `--gated`, cold) gives the first-ever Epic reveal per map.
  If a map still hits the cap, the lead sends the numbers to the orchestrator for Michael (Q2), with the options: S16
  (lobby warm, A20), or an Epic look change on bodies (for example the character-shadow PCSS on bodies only: a look
  change, his sign-off), or keep the cap with the far parts finishing in play. Never a silent miss.
- If S15's first step already brings the body variant under ~8 s, its later steps are not built (logged in S15's
  report).
- V12's held body-shader slice has no owner in `docs/ROADMAP.md` (origin/feature/menu, 2026-10-26): S15 is that slice.
  The lead tells the orchestrator so CONFORMANCE V12 points at map-ready S15 (A13).
