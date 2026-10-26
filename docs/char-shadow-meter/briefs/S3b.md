# char-shadow-meter S3b brief: the cue fill, allocation-gated
Owner: Night Shift | Sector Ops Build. Status: current.

Job char-shadow-meter (J16), PLAN S3b (:141), S3b done (:166-168), section 2 `ShadowCues` (:109-130); the required
item of `checks/s1-s3-check.md` ("Required in S3b": a 4-player fill with the real field allocates 5264 B, ~69 B a
field call, ~19 calls a player). Q14 "A faint cue" (G379): data only, Guard AI decides. Written 2026-10-25 on
`feature/char-shadow-meter` d39a40af1; file:line re-found there.

The PLAN gives S3b gameState.ts only; the check makes the allocation part an S1-file change. This brief takes the
check's zero-boxing option (a typed point input on the field) and splits S3b in two. Both Opus 5.5 (S3's builder if
free); one fresh Opus checker for both, with S4 / S5 in PR B. Guard before every write, as in `briefs/S2.md`, with
the slice's own folder and branch. Commit and push each step, path-limited. Hot-path rules: `briefs/S2.md` section
"Hot-path rules" (no allocation even un-inlined; doubles through typed-array slots, lightField.ts:203-205 `pushLv`).

## S3b-1: typed point input on the field (~140 lines, parallel with S2)
- Worktree / branch: `C:/NightShift/Mobile-Coop-char-shadow-meter-s3b`, `feature/char-shadow-meter-s3b`, from
  `origin/feature/char-shadow-meter` (d39a40af1 or newer). If #459 (A1) takes another lightField.ts fix, the lead
  merges it into the job branch and this branch merges the job branch before its checker.
- Owned: `src/world/lightField.ts` (additive members only), `src/world/shadowCues.ts` (`CueField` and the three call
  sites :210, :230, :233), `tests/lightField.test.ts`, `tests/shadowCues.test.ts`. Never touch: `src/game/**`,
  `src/world/charOccluders.ts`, `src/core/flags.ts`, `docs/systems/**`, `scripts/**`, S2's files.
- Interface (additive; every existing call keeps its bytes):
  ```ts
  // src/world/lightField.ts
  /** (S3b) The point the Q calls read: x, y, z. */
  readonly qp = new Float64Array(3);
  /** (S3b) The Q calls' level. */
  readonly qr = new Float64Array(1);
  sourcesQ(ids: Int32Array, lv: Float32Array, max: number, occluded?: Occluder): number;           // = sourcesInto at qp
  sourceQ(id: number, occluded?: Occluder): void;                                                 // = sourceAt at qp -> qr[0]
  totalQ(occluded: Occluder | undefined, chars: CharOccluders | null, skip: number): void;        // = totalAt at qp -> qr[0]
  // src/world/shadowCues.ts: CueField becomes { qp, qr, sourcesQ, sourceQ, totalQ } (LightField still fits it)
  ```
  The Q bodies read `qp` into locals and call the existing private steps (`totalInto` :325, `moonInto` :553,
  `lampInto` :484, `dynTermInto` :629, `columnInto`, `pushRes` :376); results go to `qr[0]`, never `return` a double.
- Steps and tests:
  1. Q members. `tests/lightField.test.ts`: on 500 random points, each Q result equals its plain call to the bit
     (with and without a contract, every set member id, -1 the moon). `npx vitest run tests/lightField.test.ts
     --maxWorkers=2`.
  2. `shadowCues.ts` through the Q path (write `qp[0..2]`, call, read `qr[0]`); `tests/shadowCues.test.ts`: the
     `FakeField` (:29) and the spy (:373) gain the Q members over their existing maths, every existing case unchanged
     and green; the `fieldFits` check (:15) stays. New case, the check's scene with the real `LightField` (2 lamps plus
     the moon, 4 players): every player 2-3 footprints, near-point contrast > 0, and `bytesPerCall` of one fill
     (tests/helpers/allocPerCall.ts) **<= 2432 B** (half of 5264; target 0), printed. A reading over it: stop and
     report with `ALLOC_TRACE=1`, do not loosen. `npx vitest run tests/shadowCues.test.ts tests/lightField.test.ts
     tests/charOccluders.test.ts --maxWorkers=2`; `npm run typecheck:fast`.
  3. Report `docs/char-shadow-meter/checks/s3b-build.md` (both parts; this part's readings: plain vs Q per call, the
     fill before / after).

## S3b-2: the cue fill in GameState (~35 lines, after S2)
- Branch: the job branch `feature/char-shadow-meter` in its worktree, after the lead has merged S2 (`-s2`) and
  S3b-1 (`-s3b`) into it. Owned: `src/game/gameState.ts` only.
- `readonly shadowCues: ShadowCues | null`, built next to S2's `charOccluders` when `this.charOccluders &&
  !this.puppet` (gameState.ts:538, :549): `new ShadowCues(world.lightField, world.level.lights.lights,
  world.lightField.bake?.moon.dir ?? null)` (lightField.ts:139: the gameplay bake, never `world.lamps`, the picture).
  Null with the flag off and on a client.
- Fill at the 10 Hz tick in `updateLight`, right after the flag-on meter loop (S2):
  `this.shadowCues.fill(occ, this.charRefs, this.charKeys, this.charN, CUE_DT, this.lightOccluder)` with module
  `const CUE_DT = 1 / LIGHT.playerHz` (a constant already boxed once; no per-call box). Players in `playerRefsInto`
  order, slot 0 the host / solo player (PLAN section 2).
- Tests: `npm run typecheck:fast`; `npx vitest run tests/shadowCues.test.ts tests/charOccluderFill.test.ts
  --maxWorkers=2`. Hand probe (laptop alone slot or desktop under `heavy.lock`, when the lead says): flag off,
  `__app.current.shadowCues` null in solo, host and client; `?charlight=1` solo or host under a lamp: `version` rises
  ~10 a second, `count[0] > 0`; a client stays null. The e2e-coop assertions of this are S4's (it owns
  scripts/e2e-coop.mjs). Note for S4: e2e-stealth-ai's meter pin (scripts/e2e-stealth-ai.mjs:127-129) replaces
  `updateLight`, so the cues stop filling while pinned.
- Laptop at PR B: affected-e2e (automatic) plus `request.mjs --suites "e2e-coop,e2e-netmove"` (src/game gate), with
  S4's suites.

## Not in S3b
Contrast with other characters' shadows (s1-s3-check polish 2) and the `glf` test formatter (polish 3): the lead's
polish list. Guard perception of the cue: Guard AI (PLAN section 6).
