# guard-ai-j16 G1 + G2: report
Owner: Guard AI Build. Status: current.

Builder: Opus 5.5, 2026-10-27. Branch `feature/guard-ai-j16` from ef5889a44. Commits: G1 e3a9273d2, G2 87a43fc36.
Nothing is wired: no existing source file changed. The only edit to an existing file is PLAN section 1's new sentence
(plan check 1, item 4).

## G1: occluder shapes (`src/ai/guardOccluders.ts`, `tests/guardOccluders.test.ts`)
- `putGuard` (:129), `putDog` (:147), `putBody` (:167) write one capsule each into the Sector Ops contract
  (`world/charOccluders.ts`, unchanged). Inputs are read from the characters' own fields through the structural types
  `GuardOccSrc` (:43), `DogOccSrc` (:55) and `BodyOccSrc` (:65). The capsule goes through the module scratch `S` (:93),
  and the private `put` (:110) writes `cap` / `owner` exactly as `CharOccluders.add` does, so no double crosses a call.
- Shapes (A9): guard a = feet + `footLift`, b = `simHead`, r = `occR`. Dog: a = the rump, `dogBack` behind the feet
  along its yaw; b = the sim head's x / z; both ends at feet y + `DOG_BODY_Y`; r = `dogR`. Body: a = `lie` (the pelvis,
  already `lieLift` off the floor), b = a + `occReach` along `headYaw` (level), r = `occR`.
- Owner keys: `occKey(OCC_KIND.guard | dog | body, num)` (A7). Cull: feet (or the pelvis) within `FILL.reach` 30 m,
  measured horizontally, of any of the `n` `pin` slots (`nearQ` :98). Returns: the slot; `OCC_FAR` (-2, :37) when
  beyond reach (not written, not overflow); -1 when the contract is full (`OCC.max`).
- Per-spawn helpers (they allocate, so call them once, never per step): `guardOccR(build, scale)` (:77) is
  `hitVolumes(proportions(build, 1.75 x scale)).bodyR`, as hitboxes.ts:39-44 builds the hit capsule.
  `bodyOccR(p)` (:83) is `lieLift(p)`; `bodyOccReach(p)` (:88) is `headReach(p)`.
- Constants, `GUARD_OCC` (:34):
  - `footLift` = `FILL.footLift` (0.25): a guard's foot end sits where a player's does, so both kinds cast the same
    floor gap.
  - `dogR` 0.15: the dog's trunk. At `DOG_BODY_Y` 0.52 it spans about 0.37-0.67 m, against a 0.62 m shoulder.
  - `dogBack` = `DOG_BODY` / 2 (0.39): the rump. The model's body node is centred over the feet.

## G2: the notice rule (`src/ai/shadowNotice.ts`, `tests/shadowNotice.test.ts`)
- `noticeInto(cues, slot, out)` (:84) looks at slot `slot`'s footprints and finds the nearest point (horizontal, from
  the guard's feet) that passes every gate: footprint speed >= `moving`, contrast >= `contrast`, `near` <= distance <=
  `range`, and |angle| <= `half`, where the angle is `atan2` of the offset turned by -yaw. That equals `atan2(dx, dz)
  - yaw` wrapped, the guard's `P_ANGLE`, so it needs no `wrapAngle` import. It returns the point's index in the slot
  (footprint x `CUE.points` + point), or -1. Ties keep the first. The footprint's source (lamp or moon) is never read.
- Input: `NOTICE_IN` (:53): feet x, z and yaw at `NI_X` / `NI_Z` / `NI_YAW`. Output: `out` (`NOTICE_OUT` 7 slots,
  :61-68): point x, y, z, contrast, speed, distance and angle, all logged for A11. `out` is written only on a hit.
- `NoticeCues` (:71) is `Pick<ShadowCues, 'count' | 'pts' | 'speed'>`; the real `ShadowCues` fits it (a compile-time
  check in the test).
- `SHADOW_NOTICE` (:41), each number's reason (also in the code comment):
  - `enabled` true: switches the whole cue (A5's undo).
  - `contrast` 0.40: the shadow takes 40 % or more of the light at the point (the field gives 0..0.85). Fainter ones
    are lost in the lamp falloff. This is the first knob if the walk finds dim shadows noticed (A1).
  - `moving` 0.3 m/s: "a moving shadow" (A2). A walking player's shadow tip moves at least his own speed, so a full
    sneak (0.8 m/s) passes. A still player reads exactly 0 (ShadowCues keeps the far point in doubles). A swinging
    pendant moves a still player's shadow, so it counts.
  - `near` 1 m and `range` 10 m (A3): under 1 m the shadow is at his feet, and `closeRange` 1.8 m already notices a
    moving body; past 10 m a floor shadow is a smudge.
  - `half` = `PERCEPTION.focusHalf` (27.5 deg): the focused cone only, no peripheral vision (A3).
  - `meter` 0.35 (A5): above `suspicious` 0.3, below `HEARING.turnMax` 0.45 and `investigate` 0.6, and under the
    break point 0.15 + 0.09 x 2.4 = 0.366, so he calms after the last cue.
  - `slack` 0.2 m: for G3's ray (`losClear` slack), so the floor under the point never blocks it (A4).
- Plan check 1, item 4: PLAN section 1 gained one sentence. The drain starts at once only without a real glimpse in the
  last `hold` (1.2 s). After a glimpse the meter holds first: at rate 0 he still calms (2.31 s < 2.4 s); sub-leak
  glimpses after the hold (3.42 s) can outlast the look, and that is sight's doing. The test is "the drain after the
  last cue" (tests/shadowNotice.test.ts:306): `stepMeter` brute-forced over sub-leak patterns and glimpse ages.

## Tests and results
- `npm run typecheck:fast`: clean.
- `npx vitest run tests/guardOccluders.test.ts tests/shadowNotice.test.ts tests/shadowCues.test.ts
  tests/charOccluders.test.ts tests/charOccluderFill.test.ts`: 5 files, 64 tests, all pass (guardOccluders 11,
  shadowNotice 15).
- Allocation (`tests/helpers/allocPerCall.ts` `bytesPerCall`, the method `charOccluderFill.test.ts` uses): every
  writer read 0.0 B per call: all writers together (36 capsules, one culled), and `putGuard`, `putDog` and `putBody`
  alone. The control (a vector per call) read 96 B. Two `noticeInto` calls read 0.0 B per iteration, against an object
  control of 32 B. Each test asserts < `HEAP_NUMBER` (16 B) and a control above it.
- Purity: a source grep in each test (no Babylon, rig, quality, governor, charShadowSet, net or ui import; the imports
  listed exactly).

## For the checker
- Dog shape: the PLAN says "rump to `simHead` at `DOG_BODY_Y`". I read that as a level capsule with both ends at
  `DOG_BODY_Y`, b at the sim head's x / z ("dog lies along its yaw"). The real head centre is about 0.28 m higher. To
  use the full head point instead, change one line (`S[4]`, :158).
- Body shape follows A9 literally: pelvis to `headReach`. The legs (about the hip height on the other side of the
  pelvis) are not covered, and the capsule ends r past the head's top. Both are open to the walk.
- `putX` culls before the full check, so a far character is `OCC_FAR`, never counted as overflow (as `fillVictims`
  culls first).
- `guardOccluders.ts` imports `FILL` / `FILL_IN` from `src/game/charOccluderFill.ts`, as the PLAN says. That module
  pulls in `player/wallController` → `speedTune` → the tune registry at load. These are Babylon-free and
  enemyManager already loads them, but it is a heavier import graph than the module itself needs.

## For G3 (wiring)
- `Enemy` fits `DogOccSrc` today (`num`, `pos`, `yaw`, `simHead`). It fits `GuardOccSrc` once G3 adds
  `readonly occR = guardOccR(def.build, def.scale)` at spawn. `Body` needs `num` (A7), `occR = bodyOccR(rig.p)` and
  `occReach = bodyOccReach(rig.p)`, set with the lie.
- `fillOccluders` overflow: count `=== -1` only; `OCC_FAR` is a normal skip. Skip dead, carried and hidden
  characters before calling.
- `Enemy.num` is a global counter (`nextId++`), and `occKey` keeps its low 16 bits. Two characters collide only after
  65,536 spawns in one session. Say so in the G3 brief if a long session could get there.
- The cue: write `NOTICE_IN` (feet x, z, yaw), call `noticeInto(cues, cues.slotOf(id), this.cueOut)`, where `cueOut`
  is a member `Float64Array(NOTICE_OUT)`. Cast the ray to (`out[NO_X]`, `out[NO_Y]`, `out[NO_Z]`); `NO_Y` is the floor
  + 0.05. Use `SHADOW_NOTICE.slack` and `SHADOW_NOTICE.meter`. Compare the nearest across players by `out[NO_DIST]`.
  With `cueOut` as one buffer, keep a second buffer or copy the best player's point before the next call: a miss
  leaves `out` unchanged, but a later hit overwrites it.
- The drain test here covers only the meter arithmetic (`stepMeter`). The PLAN's 30 s `alertState`-stepped test is
  still G3's.
- Plan check fold-ins still open: 1 (`AiContext` reads `chars` / `cues` through the manager), 2 (the 'suspicious'
  bark), 3 (`orderSlot`), 5 (the carried-body hand-off), 6 (`shadowLook` after the `perceive` tail; the `maxRays`
  budget) and 7 (the G5 brief).
