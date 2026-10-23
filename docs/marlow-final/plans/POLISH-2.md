# marlow-polish: polish batch 2 (builder briefs)

Planner: Opus, 2026-10-23, on `feature/marlow-polish` head 1bde5328. Docs only; no code was changed to write this.
Sources: `slices/POLISH-check.md`, `slices/S-e2e-fix4.md`, the polish / should-fix parts of `slices/S34-check.md`,
`S567-check.md`, `S8-check.md`, `S8-dress-check.md`, `S3-7-dress-check.md`, `S10-check.md`, STATE "Open for you",
`docs/section-rating/STATE.md`.

## What is already done (do not redo)
- POLISH-check items 1 (protocol 42 comment) and 2 (`ratedSynced` reset), and the A3 step-3/4 lure flake: 1bde5328.
- S10 should-fix (`Vector3.Down()` per ricochet): gone. S8 polish 4 (A8-13 register text): says ON now. S8-dress polish 2
  (6.5 m wording) and polish 4 (the client lens-follow case is in `tests/laserPanels.test.ts`). S3-7 S2 (`bandSamples` assert):
  dropped. S567 polish 3 (A5 leaf clip): the switchgear ends at z 44.6. A6 stair rail (S567 polish 2): built in A6-19.
- Not touched: STATE "Open for you" (A5 / A3 solo crossings, camera range), W5 A2 re-walk. They wait for Michael.

## Finding: the rejoin duplicate has no live path today
POLISH-check item 3 needs one `GameState` with a second `CoopClient`. That does not happen. `GameState.create`
(`src/game/gameState.ts:853-866`) builds a new `GameState` on every start and attaches the net once. A rejoin from the main
menu (`coopUi.ts:198`) is a new start, so `sectionRatings` begins empty. A dropped link inside a match keeps the same
`CoopClient`, and `sawSector` / `ratedBay` stay set. The e2e rejoin paths (`scripts/e2e-section-rating.mjs:219`, `:358`) are
of the first kind. So slice 1 is insurance (one line per section by construction). Its real value is e2e coverage of the
`rh` rebuild, which section-rating STATE lists as open ("the rh rebuild is unit-tested on the wire only, not in e2e").

## Rules for every builder in this batch
- The location and branch guard before every write:
  `cd /c/NightShift/Mobile-Coop-marlow-polish && test "$(git rev-parse --abbrev-ref HEAD)" = feature/marlow-polish && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-marlow-polish"`
- Read `docs/systems/agent-preamble.md` first. Never commit, push, stash, reset or checkout. Edit only the files your slice
  owns (listed below). Other builders may be editing other files in this worktree at the same time.
- A `tsc` error in a file you do not own: note it in your report, do not fix it.
- Do not touch `changes/feature-marlow-polish.md` (shared by every slice). Put your draft line in the report; the lead appends it.
- Must not change in any slice: the wire shape (no new or renamed field on any message), `PROTOCOL_VERSION` 42
  (`src/net/protocol.ts:20`), the save shape (rating records, `SectorRun.marks`, any localStorage key), grants, cards and top-ups.
  No number in an existing test is edited to make it pass. If one fails, stop and report it.
- No e2e runs here (laptop only; the lead sends one request after the batch, see the end of this page). No `npm run dev`,
  `preview` or watch mode. Put a timeout on every command.
- Report: `docs/marlow-final/slices/P2-<n>.md`. It covers what you built, the files and line ranges, the tests added, the
  check results, anything skipped, and the draft changes line. Final message: done / not done, the results, open items.

## Slice P2-1: rating lines one per section, and the rejoin rebuild in e2e
**Model: Opus** (src/net), effort high.

**Goal.** Each section's rating line goes into the results list at most once on every page, by construction. The co-op
rejoin e2e proves that a rejoined client's list matches the host's: the `rt` line, and for Marlow also the `rh` history.

**Owns:** `src/game/rating/sectionRating.ts`, `src/net/coopClient.ts`, `src/game/modes/courseMode.ts`,
`src/game/modes/sectorMode.ts`, `tests/ratingRejoin.test.ts` (new), `scripts/e2e-section-rating.mjs`.

**Change.**
1. `src/game/rating/sectionRating.ts`: after `emptyGrant` (`:136-138`), add a pure, allocation-free helper
   `export function putRating<T extends { sectionId: string }>(list: T[], v: T): void`. It replaces the entry with the same
   `sectionId` in place, or pushes `v`. Write a one-line doc comment. Import no UI type (the generic keeps `ratingCard.ts`
   out of this file).
2. Replace every `sectionRatings.push(...)` with `putRating(g.sectionRatings, ...)` (7 sites, all of them):
   - `src/net/coopClient.ts:786` (the `rh` loop in `onSector`'s first-message branch, `:781-795`), `:792` (the first `rt`),
     `:825` (`takeRating`);
   - `src/game/modes/courseMode.ts:1158` (the `rh` loop in `mirrorRating`, `:1142-1161`), `:1161` (the `rt` line), `:756`
     (host `rateSet`);
   - `src/game/modes/sectorMode.ts:1019` (host `rate`).
   The order of calls stays the same: `rh` history first, then `rt`. Nothing else in these functions changes: the
   `sawSector` / `ratedBay === -2` first-message rules, no card and no top-up on the first message, `ratingSeq`, and
   `window.__sectionRating`.
3. `scripts/e2e-section-rating.mjs`, Sector Ops co-op part (`:131-236`): after the "took no new rating" assert (`:234`), assert
   the rejoined client's `window.__app.current.sectionRatings.map((r) => r.sectionId)` equals the host's, with no repeats.
   Today that is one line: section 1.
4. Same file, Marlow co-op part (`:306-368`):
   - Before the rejoin, after the "top-up is not repeated" assert (`:355`), rate A3 as well. Use the host's seal, the same
     call as `:340`: `st.seal(st.airById.get(st.currentBay.exit)); m.handle()`.
   - Then wait until the client's `window.__sectionRating.last.sectionId === 'A3'` (60 s, as `:342`).
   - After the "no rating card" assert (`:368`), assert two things. First, the client's `sectionRatings` ids equal
     `['A2', 'A3']` and equal the host's list. Second, each line's `marks` equals the host's line for the same id. A2 now
     comes from `rh`, A3 from `rt`.
   - Do not assert grants.

**Tests to add: `tests/ratingRejoin.test.ts` (new).**
- `putRating` appends new ids in order. A repeated id replaces the entry in place: same length, same index, new
  marks / synced / grant.
- A rejoin without a reload, simulated: apply the first-message sequence twice to one list. That sequence is `ratingViewsFromRh(rh,
  rt.sec, defs)` through `putRating`, then `ratingViewFromWire(rt, defs)` through `putRating`, with 3 defs, `rh` rating 0 and 1,
  and `rt` on 1. The list equals the one-pass list: ids [s0, s1], index order.
- A teeth case: the same sequence twice with plain `push` gives 4 lines. This shows the test bites.

**Verify.**
- `npx tsc --noEmit -p tsconfig.json`
- `npx vitest run tests/ratingRejoin.test.ts tests/ratingWire.test.ts tests/courseMarks.test.ts tests/sectorRatingHost.test.ts tests/sectionRating.test.ts tests/ratingRecord.test.ts tests/net.test.ts tests/netSim.test.ts`
- `node --check scripts/e2e-section-rating.mjs`
- e2e (laptop request): `e2e-section-rating`, `e2e-coop`.

**Done looks like:** the 7 sites go through `putRating`, the new test passes and bites, both e2e rejoin parts assert the
client list, and the wire / protocol / save shape are untouched (`git diff --stat` shows only the owned files).

## Slice P2-2: e2e for the client's ricochet sparks (A3, e2e-ctcourse:2)
**Model: Sonnet** (e2e test only), effort medium.

**Goal.** Cover POLISH-check item 4 in e2e: the client's own round off the bulletproof camera plays the sparks on the client
page, stays local, and leaves the camera online. The suite that owns the bulletproof camera is `e2e-ctcourse` part 2
(A3 + A4, `scripts/e2e-ctcourse.mjs:41`). Its armoured-camera step is A3 1b.

**Owns:** `scripts/e2e-ctcourse/a3OfficeRange.mjs` only.

**Change** (insert after the host's two-shot assert at `:212`, before the kill at `:213`):
1. On the client (`GB`), in one `evaluate`:
   - Read `g.ctDev.ricochets`, the count of active particles (`g.vfx.particles.filter((p) => p.active).length`; the field is TS
     private, readable at runtime) and the host's `security.ricochets` (from a separate `GA` read before).
   - Call `g.weapons.onRay(a, b)` with `a` / `b` on the camera's axis through its housing: the same points as `:208`, from the
     client's mirrored camera `cam-a3-hall` (`CAM` `:28`). Use `g.player.position.constructor` for the vectors.
   - Use `onRay`, not a real trigger pull. `onRay` is the hook `CoopClient` installs at attach (`src/net/coopClient.ts:200-207`).
     A real round makes noise the cleaner can hear, and the host resolves it, which would disturb the steps after 1b.
   - Return the counters after the call.
2. Assert:
   - The client's `ctDev.ricochets` rose by exactly 1, and its active particles rose (at least 1).
   - On the host (`GA`), `cam-a3-hall` is still `online` and `security.ricochets` is unchanged by the client's call. This
     shows the effect is local: nothing goes on the wire.
3. A teeth case in the same step: a second `onRay` on a ray 1.5 m under the housing (same x / z, `y - 1.5`) leaves
   `ctDev.ricochets` unchanged.
4. Optional, same file (S34 polish "asserted on the client page only"): next to `:185` (`L2-far`) and `:446` (`L3-near`), also
   assert the door is unlocked on the host. `GA((i) => !window.__app.current.world.doors.list[i].anchor.locked, await doorIndex(id))`.

**Must not change:** every existing assert, wait and position in the file. No `waitSim` is added before `:213` (the calls are
instant). There is no src change; if one looks needed, stop and report it.

**Tests:** this is the test. No vitest file changes (the pick is covered by `tests/securityCameraE8.test.ts`).

**Verify.**
- `node --check scripts/e2e-ctcourse/a3OfficeRange.mjs`
- `npx tsc --noEmit -p tsconfig.json` (unchanged, a sanity check)
- e2e (laptop request): `e2e-ctcourse:2`.

**Done looks like:** A3 1b has a client ricochet assert with a teeth case, and the host is unchanged by the call.

## Slice P2-3: collision rails on the A4 and A8 open stair sides (players no longer step off the flights)
**Model: Sonnet** (world data + tests), effort medium.

**Goal.** The drawn rails on A4's two stairs (open south side) and A8's public stair (both sides) also hold a body, as A6's
staff stair does since S3-7 dressing (A6-19). Sources: S34-check A4 polish 4, S3-7-dress polish 2, S8-check polish 10. This
is not a Michael decision. SPEC P13 (open edges) covers the co-op lip spans only, and these flights are not lips. The 16.10
item 4 rule ("stairs without handrails") applies, and A6 already took the invisible-rail option. Undo: drop the new
`kit.handrail` calls.

**Owns:** `src/world/maps/ctcourseSets/a4GoodsShed.ts`, `src/world/maps/ctcourseSets/a8Strongroom.ts`,
`tests/ctcourse/a4GoodsShed.test.ts`, `tests/ctcourse/a8Strongroom.test.ts`.

**Pattern to copy.** `A6_STAIR_RAIL` (`a6PumpHouse.ts:144-147`) and its build (`a6PumpHouse.ts:621-646`): `kit.handrail` in
stepped segments of 0.55 m, on a line 0.05 m outside the flight's open edge. The box never narrows the 1.2 m flight. The
segments run from the third tread to the head (the foot stays open to step on), each standing 1.1 m over the walking line
at its high end. The boxes are invisible and `noLedge`. Tests: `tests/ctcourse/a6PumpHouse.test.ts:817-860` (geometry, no
gap, the flight and an edge lane 0.3 m in open, step-off blocked, a no-rail teeth case) and `:907-912` (`soloJumpThreats`
still empty and still bites).

**Change.**
1. A4:
   - Export `A4_STAIR_RAIL` beside `A4_STAIR` (`a4GoodsShed.ts:93`): the z line `A4_STAIR.z0 - 0.05`, `seg` 0.55, `h` 1.1.
   - In A4-17 (`:658-718`), beside the visual rails (`:697-712`), add the segments for both flights (west rising east from
     x 80.3, east rising west from x 111.7). Start at the third tread and run to the deck face (x 86 / 106).
   - Each top segment must meet the deck's rail end (`kit.handrail` at `:246-247`, ending at z `A4_STAIR.z0 - 0.1`) with no
     body-width gap.
   - Update the A4-17 tally text and the header line (`:30-32`): "the stairs' rails ... with the open side's collision rail
     (kit.handrail, invisible noLedge)".
   - The visual rails stay where they are.
2. A8:
   - Export `A8_STAIR_RAIL` beside `A8_PUBLIC_STAIR` (`a8Strongroom.ts:163`): x lines `ps.x0 - 0.05` and `ps.x1 + 0.05`,
     `seg` 0.55, `h` 1.1.
   - In A8-19 (`:944-966`), add the segments on both sides, rising north, from the third tread (z 67.3 + 2 x 0.285) to the
     gallery (z 75), where they meet the balustrade's ends at x 130.5 / 131.7 (A8-2 `:342-358`).
   - Update the A8-19 tally text (drop "no collision: the flight's open sides stay open") and the header (`:40`).
   - The office stair is walled on both sides: leave it as it is.

**Must not change:**
- No greybox box moves, no lamp, no circuit, no guard route or post, no device.
- Every existing assert stays as written, except two titles / selections that describe the old state:
  - the A8 test title at `:1849` ("visual: the open sides stay open");
  - the "every other dressing box is a visual skin" selection at `:1455`. Exempt the rail boxes there the way A6 exempts
    `rail`, and assert them invisible + `noLedge`.
- These must still hold with the rails in:
  - A8-D14's lane on the east side of the flight (x 132.25, `a8Strongroom.test.ts:505`, the 20.6 m / 12.1 s walk, numbers
    unchanged);
  - N2's W1 leg past the stair's foot;
  - every A4 guard leg (D1, D2, including D2's stair nav).

**Tests to add** (in each set's test file, in the dressing describe, as A6's):
- Geometry: segment count, length, line 0.05 m outside the flight, box face never inside the flight, each top at least 1.1 m
  over the walking line, no gap between segments or at the head (the deck rail in A4, the balustrade ends in A8), invisible,
  `noLedge`.
- Walkable: a body (`MOVEMENT.radius`) clears the flight's centre line and an edge lane 0.3 m in, for the whole flight, and the
  foot's first two treads from the open side.
- Step-off blocked: a body 0.1 m outside the open edge at the walking line hits the rail from the third tread up. The same
  probe without the rail boxes hits nothing (the teeth case).
- Lips: A4's deck-edge `soloJumpThreats` (`:296`, `:1210`) stays `[]` with the rails in the solid list, and the crate still
  bites. In A8, `soloJumpThreats` for the gallery's co-op lip is `[]` with the rails in, and a crate case bites.
- Lanes: in A8, `bodyHits` is clear along x 132.25 from z 62 to 75 and along N2's W1 leg. In A4, the strip south of the west
  stair (x 80.3-86, z 44.2-46.4) stays walkable.

**Verify.**
- `npx tsc --noEmit -p tsconfig.json`
- `npx vitest run tests/ctcourse/a4GoodsShed.test.ts tests/ctcourse/a8Strongroom.test.ts tests/ctcourse/a6PumpHouse.test.ts tests/ctcourse.test.ts tests/ctcourseLight.test.ts tests/facilityKit.test.ts`
- If `ctcourseLight` or a `*.light.json` check fails, stop and report. Do not regenerate the bake; the rails are under
  `CANON_MIN_THICK` as A6's are.
- e2e (laptop request): `e2e-ctcourse:2` (A4: D2's stair walk), `e2e-ctcourse:4` (A8: the grille approach, the public stair).

**Done looks like:** neither set's open flight can be stepped off from the third tread up. The flights, the feet and the
named lanes stay open. All existing A4 / A8 asserts pass unchanged except the two named titles / selections.

## Slice P2-4 (spare, only for an idle builder): teeth for two dressing clearance tests
**Model: Sonnet** (tests only), effort low.

**Goal.** S3-7-dress polish 4: the A7 cage clearances and A6's "stays off the marks" test expect `skinsIn(...)` / overlaps to
be empty. A wrong window would pass silently. Add one planted skin per test that must be found.

**Owns:** `tests/ctcourse/a7DataHall.test.ts`, `tests/ctcourse/a6PumpHouse.test.ts`.

**Change.**
- `a7DataHall.test.ts:1060-1077`: for each `toEqual([])` window (the ready-lamp line, the hack spots, the door openings, the
  lenses), run the same query over the dressing plus one planted 0.03 m skin inside the window, and expect it found.
- `a6PumpHouse.test.ts:989`: the same for the marks / devices / switches / lamps / plate-column checks.
- Plant the skins in the test's own list. Never touch the set file.

**Must not change:** the set files, every existing expectation.

**Verify:** `npx vitest run tests/ctcourse/a7DataHall.test.ts tests/ctcourse/a6PumpHouse.test.ts`. No e2e.

## Parallel groups and order
- **All four can run at once.** Their owned files do not overlap:
  - P2-1: rating / net / modes / `e2e-section-rating.mjs`;
  - P2-2: `a3OfficeRange.mjs`;
  - P2-3: A4 / A8 set files and their tests;
  - P2-4: A6 / A7 tests.
- P2-3 runs `a6PumpHouse.test.ts` read-only while P2-4 edits it. A failure there that comes from P2-4's work in progress is
  not P2-3's.
- Checkers (CLAUDE.md "one fresh checker per batch of related slices"):
  - one Opus checker for P2-1 (`src/net`);
  - one Sonnet checker for P2-2, P2-3 and P2-4 together (e2e, data, tests).
  - One fix round per slice. A Sonnet slice that fails gets its fix round from Opus.
- After the batch, one laptop request on the merged head: `e2e-section-rating`, `e2e-coop`, `e2e-ctcourse:2`,
  `e2e-ctcourse:4` (E2E_GPU=1, E2E_JOBS=1).

## Seen, not in this batch
- A6 interlock lamp (S3-7-dress polish 3): the radio says "The interlock is green" but no red / green lamp is drawn by the L6
  door (housing only, `a6PumpHouse.ts:741-746`). This needs a flag-driven prop device: `ctDevices` reads `shared(flag)`, then
  `facilityProps.setDevice` (`propRender.ts:248`). Player-visible, a good batch 3 slice (Opus: `ctDevices` + props render).
- A2's east stair rails are visual only (A2-17, same class as P2-3). Add them if the lead wants all flights consistent.
- e2e honesty: the A3 host presses office 1's switch from 18.8 m (`a3OfficeRange.mjs:394` / `:423`), and the A4 host presses
  the floor switch from about 26 m. Both sit next to timing-sensitive lure steps, so leave them until those suites are quiet.
