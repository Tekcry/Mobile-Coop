status: done feature/tallow-g0 55514bad68bd47cb7cd76661f3014a651407d8ff

# campaign J8 G0: shared Tallow data, night floor, medkits, level-and-drop check (Sonnet 5.5)

Base: origin/feature/mission-engine e3798754461005ecd7e95803842138850646d111 (cut from that exact sha even if the branch
has moved). New branch: feature/tallow-g0. Lead: Night Shift | Campaign Build. Read
`git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions" replaces the folder rules) and the code hard
rules in `git show origin/master:CLAUDE.md` first. Plan: `docs/missions/slices/J8-J9-PLAN.md` on the base (A3, A8,
A28, section 6 "G0 shared", section 16 "Brief G0"); this brief wins where they differ.

## Only these files
- `src/world/maps/tallowWharf.ts`
- `src/world/maps/tallowWharfKit.ts`
- `tests/tallowWharf/shell.test.ts`
- `tests/tallowWharf/helpers.ts` (add the one new function of step 5 and its imports; change nothing else in it)
- `tests/tallowWharf/levelGap.test.ts` (new)
Do not edit any section file (`tallowWharfW1.ts` .. `tallowWharfW4.ts`), `tallowWharfSectors.ts`,
`tallowWharfMissions.ts`, `tests/helpers/soloJumpReach.ts` (about 17 users) or any file outside the list. No changelog
fragment (the lead writes it).

Not in this brief (later, "G0b", after TD-a is merged into the J8 branch): `WharfThrow.dist?` and the layout's
`throwSites`. Do not add them.

## Why
Tallow Wharf (campaign Mission 1) must meet the level standard before its greybox exit. Michael picked "Never" for dark
spots (every light works; darkness only from cover, cut circuits and shot lamps) and "Australian standards" for light
levels; G98: medkit stations in every map; Q23 / M2: two Tallow throw gaps must force co-op, which the repo's jump
helpers cannot prove because they skip every top at or above the target and every `noLedge` top over the mantle.

## What to build
1. **Night floor (A3).** Read first: `src/world/maps/campusOps.ts` theme block (:92-110),
   `src/world/maps/campusS1.ts:316-319`, `src/world/lights.ts` `zoneAt` (:211-233: the smallest zone containing a point
   wins), `src/world/lightBake.ts:81-90` (a zone's value is the fill as authored; the moon is added on top where it
   reaches), `git show origin/feature/light-realism:docs/light-realism/research/bands.md` sections 2 and 4. Fact: Tallow's
   theme (`tallowWharf.ts:79-81`: `sunIntensity` 0.16, `ambient` 0.3, `lightLevel` 0.3) already equals the campus theme,
   so the theme values do not change. The campus's night floor is the standby fill, an `ambientZone` at **0.14** over
   the whole section (SPEC LR7; bands.md: moon 0.104 + standby 0.14 = 0.244 on open ground; a cut circuit drops a space
   to 0.14 and reads dark). Tallow has no ambient zone, so a cut circuit falls back to 0.3 and cannot read dark. In
   `buildShell` (`tallowWharf.ts:31`) add one map-wide zone:
   `b.ambientZone(WHARF_BOUNDS.minX, WHARF_BOUNDS.maxX, WHARF_BOUNDS.minZ, WHARF_BOUNDS.maxZ, 0.14, Y.canalBed - 1, MASS_TOP + 1);`
   with the comment "night floor as the campus (Q2 'Never', G329, light-realism research 2 and 4, J8 A3): the standby
   fill 0.14 under the moon, so a cut circuit reads dark; a smaller room zone (LP's transit fill) wins inside it". Leave
   every theme value as it is. If any of the facts above is not what you find, stop and report (do not invent a value).
2. `tallowWharfKit.ts`: on `WharfSection` add an optional
   `medkits?: { pos: Vector3; yaw: number }[];` with a doc comment ("G98 wall stations, each with a real reason; hold
   0.6 s, +40, single use, level-design 12.1; `yaw` faces the room; J8 A8: one per section"). Optional, so `W1`-`W4`
   compile untouched. `emptySection` returns `medkits: []`.
3. `tallowWharf.ts` layout (the object returned at :90): `medkitWalls: SECTIONS.flatMap((s) => s.medkits ?? []),`
   (setup time, not a hot path).
4. `tests/tallowWharf/shell.test.ts` (new `it`s; every existing test passes unchanged):
   - Tallow's theme `sunIntensity`, `ambient` and `lightLevel` equal `campusOps`'s (read both `MapDef`s; do not type
     the numbers);
   - `builtWharf().b.lights.zoneAt(x, 1, z)` is 0.14 at the centre of each `SECTION_BOX` and at a canal-steps point
     (no smaller zone exists yet);
   - `builtWharf().layout.medkitWalls` deep-equals `[W1, W2, W3, W4].flatMap((s) => s.medkits ?? [])` (empty today).
5. **The level-and-drop gap check** (PLAN A28 and section 6 G0; Fix round 2, check fix 2). In
   `tests/tallowWharf/helpers.ts` add
   `export function soloLevelThreats(solid: readonly BoxPiece[], q: CoopTop, skip: (p: BoxPiece) => boolean = () => false, extra = 0.2, edges: { noLedge: boolean } = { noLedge: true }): string[]`,
   a twin of `soloTopLandingThreats` (`tests/helpers/soloJumpReach.ts:158-206`, read the whole file) that:
   - keeps only tops **at or above** the co-op top: `t >= q.top - 0.05` (the existing helpers cover the lower ones);
     skips `t <= 0.3` and `skip(p)`; needs depth to stand on (`Math.min(p.s[0], p.s[2]) >= LEDGE.climbDepth`) and
     crouch room over the take-off spot (as the existing helper samples it);
   - has **no** mantle skip (no `p.noLedge && t > MANTLE` line: tops at these heights are reached by stairs, ladders
     and drops, and all of W2 is `noLedge`);
   - reach: `soloTopLandingReach(t, q.top) + extra`, and, only when `edges.noLedge` is false (a stage edge a hand can
     take), also `soloJumpReach(t, q.top) + extra` (the in-air grab); the larger reach applies;
   - flight: from the take-off sample point to the nearest point of `q`, follow the jump's arc (horizontal speed
     `SOLO_TOP_SPEED`, feet height `t + LEAP.vy * s - 0.5 * G * s * s` over time `s`, `G = -GRAVITY.y` from
     `src/physics/havok`), sampling the body at feet +0.1 / +0.9 / +1.7 m; a piece blocks the flight only if its top
     is more than `vaultMax` (1.25, `scripts/kestrel/facts.json` `traverse.vaultMax.value`, import it as
     soloJumpReach.ts imports facts) above the take-off **or** it is deep enough to stand on
     (`Math.min(s[0], s[2]) >= LEDGE.climbDepth`); so a vaultable parapet or railing never blocks, a thin `noLedge`
     screen 1.9 m over the take-off does;
   - returns strings in the same form as `soloTopLandingThreats` (top height, plan centre, distance, reach).
   Import `soloTopLandingReach`, `soloJumpReach`, `SOLO_TOP_SPEED`, `CoopTop` from `../helpers/soloJumpReach`, `LEAP` and
   `MOVEMENT` from `src/config/movement`, `LEDGE` from `src/world/anchors`; re-declare small local copies of that file's
   private `top`, `inside` and `BODY` (do not export or edit them there). No closures or allocations in an inner loop
   beyond what the existing helper does (it is a test helper, not a hot path; keep it readable).
6. `tests/tallowWharf/levelGap.test.ts` (new), synthetic `BoxPiece`s (build them through a `LevelBuilder` or literal
   pieces as `shell.test.ts` does), a co-op stage 1.0 m deep at top 4.5:
   - first assert the model numbers this check rests on (to 0.02): `soloTopLandingReach(4.5, 4.5)` 3.36,
     `soloTopLandingReach(8.4, 4.5)` 4.88, `soloJumpReach(4.5, 4.5)` 4.64; if any differs, stop and report the real
     values (the PLAN section 2 table is built on them);
   - a level top (4.5) 3.5 m from the stage is reported, 3.6 m is not (3.36 + 0.2);
   - an 8.4 top 5.0 m away is reported, 5.1 m is not (4.88 + 0.2);
   - a 1.1 m railing on the take-off top between them does not block; a 1.9 m `noLedge` screen 0.2 m thick does;
   - with `edges: { noLedge: false }` a level top 4.8 m away is reported (4.64 + 0.2), and with the default it is not;
   - a top below the stage (4.0) is never reported by this helper (that is `soloTopLandingThreats`' job).

## Checks (cloud: tsc and these vitest files only; no e2e, no GPU, no npm run check)
- `npm run typecheck:fast`
- `npx vitest run tests/tallowWharf/ --maxWorkers=2` (every Tallow test green, the new ones included)
- `npx eslint src/world/maps/tallowWharf.ts src/world/maps/tallowWharfKit.ts tests/tallowWharf/shell.test.ts tests/tallowWharf/helpers.ts tests/tallowWharf/levelGap.test.ts`
- Pending PC run (write it in the report as pending; the lead requests it on PR G1): laptop `e2e-sectorops:wharf-tgc
  e2e-sectorops:wharf-tkl e2e-sectorops:mission` (the night floor changes Tallow's light levels).

## Done
- All checks green; the diff touches only the five files; no theme value changed; `throwSites` / `WharfThrow.dist`
  not added.
- Commits on feature/tallow-g0 prefixed `tallow G0:` (steps 1-4 one commit, steps 5-6 another), each ending with the
  trailer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"; `git add <file>` per file, never `-A`. Never merge, rebase, force-push, or push to feature/mission-engine.

## Report (append below, then set line 1 to `status: done feature/tallow-g0 <sha>`)
What changed per file, the model numbers step 6 found, test counts per file, check results, every deviation with its
reason, "pending PC run" for the laptop suites. A question the brief cannot settle: `status: blocked <reason>`.

### Report (Night Shift | Cloud Builder 2, 2026-10-25)
Commits: 152da9c8 `tallow G0:` steps 1-4, 55514bad steps 5-6, on feature/tallow-g0 from e3798754.
- Facts checked first, all as the brief says: Tallow's theme sunIntensity 0.16 / ambient 0.3 / lightLevel 0.3 equal
  campusOps's; campus S1 zone 0.14; `zoneAt` smallest zone wins; the bake reads zones as authored; bands.md 2 and 4
  (moon 0.104 + standby 0.14 = 0.244; a cut circuit at 0.14 reads dark). Tallow had no ambient zone.
- `src/world/maps/tallowWharf.ts`: `buildShell` adds `b.ambientZone(W.minX, W.maxX, W.minZ, W.maxZ, 0.14, Y.canalBed - 1,
  MASS_TOP + 1)` with the brief's comment (`W` is buildShell's `WHARF_BOUNDS`; `Y` imported from the kit); layout
  `medkitWalls: SECTIONS.flatMap((s) => s.medkits ?? [])`. No theme value changed.
- `src/world/maps/tallowWharfKit.ts`: `WharfSection.medkits?` with the doc comment; `emptySection` returns `medkits: []`.
- `tests/tallowWharf/shell.test.ts`: new describe, 3 `it`s (theme equals campusOps's, read from both MapDefs; zoneAt 0.14
  at each SECTION_BOX centre (y 1) and at the first spawn on the canal steps; medkitWalls deep-equals the sections').
- `tests/tallowWharf/helpers.ts`: `soloLevelThreats` (+ imports `LEAP`, `GRAVITY`, the soloJumpReach exports, facts.json
  for vaultMax 1.25; local copies of `top` / `inside` / `BODY`). As the brief: tops t >= q.top - 0.05, no mantle skip,
  landing reach and (edges.noLedge false) the grab reach, the larger + extra; the flight along the arc at +0.1 / +0.9
  / +1.7, blocked only by pieces over t + 1.25 or deep enough to stand on. One addition: the flight skips samples
  inside `q`'s own plan box (the landing; otherwise the stage itself would block a drop landing with the feet just
  under its top). Nothing else in helpers.ts changed.
- `tests/tallowWharf/levelGap.test.ts` (new, 6 tests): model numbers within 0.02 of 3.36 / 4.88 / 4.64 (pass: none
  differs); level 3.5 reported / 3.6 not; 8.4 at 5.0 / 5.1; railing 1.1 m does not block, 1.9 m noLedge screen 0.2
  thick does; grab edge 4.8 m only with edges.noLedge false; a 4.0 top never.
- Checks: typecheck:fast clean; eslint (5 files) clean; `npx vitest run tests/tallowWharf/` 7 files, 141 passed (shell
  18, levelGap 6, the rest unchanged). Diff: only the five files; throwSites / WharfThrow.dist not added.
- Pending PC run: laptop `e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl e2e-sectorops:mission` (the night floor
  changes Tallow's light levels).
