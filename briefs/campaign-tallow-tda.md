status: open

# campaign J8 TD-a: per-site throw length, pure part (Opus 5.5)

Base: origin/feature/mission-engine e3798754461005ecd7e95803842138850646d111 (cut from that exact sha even if the branch
has moved). New branch: feature/tallow-throw-tda. Lead: Night Shift | Campaign Build. Read
`git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions" replaces the folder rules) and the code hard
rules in `git show origin/master:CLAUDE.md` first.

## Only these files
- `src/game/teamMoves.ts`: the throw functions only (`throwLanding`, `throwLandingOk`, the new site list and
  `throwDistAt`, and the `kind === 'throw'` case inside `checkTeamRequest`). No other function, type or line.
- `src/world/mapDef.ts`: the new `ThrowSite` type and `MapLayout.throwSites` only.
- `tests/teamMoves.test.ts` (only if a line must change; every existing case stays as it is).
- `tests/throwSites.test.ts` (new).
Not yours: `src/game/teamController.ts` (that is TD-b, later), `src/config/movement.ts` (`TEAM` stays as it is), any map
file, `src/net/**`, the changelog fragment (the lead writes it). Never edit `TEAM.throwDist`.

## Why (J8-J9 PLAN, origin/feature/mission-engine docs/missions/slices/J8-J9-PLAN.md, A4 / A24, section 6 TD)
Michael (Q23): Tallow's throw gaps must force co-op. A standard throw lands `TEAM.throwDist` 3.2 m past the thrower, so
the widest gap it clears (2.6 m) is always solo-jumpable. Michael's ~20:45 pick "Mix of both" (M2) approves a longer
throw at two named Tallow spots only (5.8 m over a 4.9 m gap). The game's length stays in the map: a map layout may
list throw sites (thrower spot, facing, length); a throw launched at a site lands the site's length. Every map with no
sites (Marlow Yard, the campus, everything else) keeps 3.2 m exactly. No wire change: both peers build the same map.
This slice is the pure, Babylon-free part. Nothing in the game calls `setThrowSites` yet (TD-b, later, wires the team
controller), so the game's behaviour is unchanged by this branch.

## What to build
1. `mapDef.ts`: 
   ```ts
   /** (tallow-fixes A24, Q23, M2) A throw site: a throw offered within `THROW_SITE_REACH` of (x, z) and launched along
    *  the unit facing (dx, dz) (within `THROW_SITE_COS`) lands `dist` m past the thrower instead of `TEAM.throwDist`. */
   export interface ThrowSite { x: number; z: number; dx: number; dz: number; dist: number }
   ```
   and on `MapLayout` an optional `throwSites?: readonly ThrowSite[];` with a doc comment citing Q23 and tallow-fixes
   A24 ("named spots only; no sites = the standard throw everywhere").
2. `teamMoves.ts` (in the "partner throw" block, after `throwLandingOk` or before `throwLanding`):
   - `export const THROW_SITE_REACH = 1.0;` and `export const THROW_SITE_COS = 0.9;` (each with a one-line comment).
   - A module-level `let throwSites: readonly ThrowSite[] | null = null;` (import the type with `import type` from
     `'../world/mapDef'`) and `export function setThrowSites(list: readonly ThrowSite[] | null): void` (an empty list
     is stored as null). Setup time only.
   - `export function throwDistAt(bx: number, bz: number, dx: number, dz: number): number`: pure and allocation-free
     (an index loop, `hyp2` from `../core/mathx`, no `for...of`, closures, arrays or `Math.hypot`). (dx, dz) is the
     throw direction and need not be unit: its length under 1e-6 returns `TEAM.throwDist`. A site qualifies when
     `hyp2(bx - s.x, bz - s.z) <= THROW_SITE_REACH` and the cosine between (s.dx, s.dz) and (dx, dz) (divide by both
     lengths) is `>= THROW_SITE_COS`. Of the qualifying sites the nearest to (bx, bz) wins and its `dist` is returned;
     none (or no list) returns `TEAM.throwDist`.
   - `throwLanding(ax, az, bx, bz, yaw, out, dist: number = TEAM.throwDist)`: the landing is `dist` past the thrower
     (replace both `TEAM.throwDist` uses inside it); update its doc comment.
   - `throwLandingOk(bx, by, bz, lx, ly, lz, dist: number = TEAM.throwDist)`: the band is `dist - 1 .. dist + 1`; the
     height rule (`TEAM.throwDrop`) unchanged; update its doc comment.
   - `checkTeamRequest`, throw case only: after the `!l` check, `const dist = throwDistAt(r.b.x, r.b.z, l.x - r.b.x,
     l.z - r.b.z);` and pass `dist` to `throwLandingOk`. Keep the order of the existing checks and denials.
   - Leave `throwArc`, `throwArcVy`, `throwKoHit`, `throwRoom` and `TEAM.throwTime` untouched.
   Hard rules that bite: hot paths allocate nothing; strict TS (`import type`, `noUncheckedIndexedAccess`: `list[i]!`
   after a bounds-checked loop); hyphens, not em dashes, in comments; no reference-game names.
3. `tests/throwSites.test.ts` (new, `afterEach(() => setThrowSites(null))`), with one site
   `{ x: 0, z: 0, dx: 1, dz: 0, dist: 5.8 }` unless a case says otherwise:
   - no sites: `throwDistAt` is `TEAM.throwDist` at the site spot in every direction;
   - a site: at (0, 0) facing (1, 0) gives 5.8; 0.9 m from the spot gives 5.8; 1.1 m away gives `TEAM.throwDist`;
     facing (0, 1) gives `TEAM.throwDist`; 20 degrees off gives 5.8, 30 degrees off gives `TEAM.throwDist`; a non-unit
     direction (2, 0) gives 5.8; a zero direction gives `TEAM.throwDist`;
   - two sites 3 m apart with different lengths: each spot gets its own length; `setThrowSites([])` and
     `setThrowSites(null)` both mean no sites;
   - `throwLanding` with `dist` 5.8 lands 5.8 past the thrower along runner -> thrower; without `dist` it lands
     `TEAM.throwDist` past (as today);
   - `throwLandingOk(..., 5.8)` accepts 4.85 and 6.75 m and a 0.9 m drop; refuses 3.2 m, 7.0 m and a 1.1 m drop;
   - `checkTeamRequest` (build the request as `tests/teamMoves.test.ts`'s `toss` helper does, thrower at the origin
     offering `THROW_SUB`, runner in reach on -x): with the site set, a landing claimed 5.8 m along +x is allowed
     (null) and one claimed `TEAM.throwDist` along +x is denied `'noTarget'`; a landing claimed `TEAM.throwDist` along
     +z (not the site's facing) is allowed; with no sites, `TEAM.throwDist` along +x is allowed and 5.8 is
     `'noTarget'`.
4. `tests/teamMoves.test.ts`: every existing throw case must pass unchanged (no sites set). Add nothing unless needed.

## Checks (cloud: tsc and these vitest files only; no e2e, no GPU, no npm run check)
- `npm run typecheck:fast`
- `npx vitest run tests/teamMoves.test.ts tests/throwSites.test.ts tests/ctcourse/a5Substation.test.ts tests/ctcourse/a8Strongroom.test.ts tests/ctcourseGreybox.test.ts tests/tallowWharf/w2.test.ts --maxWorkers=2`
  (the four after the first two are Marlow Yard's and Tallow's throw users: they must pass unchanged; no sites exist yet)
- `npx eslint src/game/teamMoves.ts src/world/mapDef.ts tests/throwSites.test.ts tests/teamMoves.test.ts`
- Pending PC run (write it in the report as pending; the lead requests it once TD-b joins in PR T): laptop
  `e2e-coop e2e-netmove e2e-ctcourse e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl`.

## Done
- All checks above green; the diff touches only the four files and, in `teamMoves.ts`, only the throw functions and
  the throw case of `checkTeamRequest`.
- With no sites every result equals today's (3.2 m landing, 2.2-4.2 m band).
- Commits on feature/tallow-throw-tda prefixed `tallow TD-a:`, each ending with the trailer
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"; `git add <file>` per file, never `-A`. Never merge,
  rebase, force-push, or push to feature/mission-engine.
- Coordination (for the lead, not the builder): the kit-flag fold (coopKit into Player's kitMoves) also edits
  `teamMoves.ts`; it is not in the engine and the lead does not merge it while this branch is open (PLAN section 5).
  If you find `origin/feature/mission-engine` has moved past the base with commits that touch `teamMoves.ts`, build
  on the base sha anyway and say so in the report.

## Report (append below, then set line 1 to `status: done feature/tallow-throw-tda <sha>`)
What changed (functions and signatures), the test cases with counts per file, check results, any deviation with its
reason, and "pending PC run" for the laptop suites. A question the brief cannot settle: `status: blocked <reason>`.
