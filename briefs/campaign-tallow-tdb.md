status: open

# campaign J8 TD-b: per-site throw length, the team controller (Opus 5.5)

RULED (Campaign Build 2026-10-26 ~09:05): gate (b). Branch feature/tallow-throw-tdb already exists at the base sha.
Gate (the lead ticks one and fills the sha):
- [ ] (a) as planned (J8-J9-PLAN section 5 / 7): the kit-flag fold (`coopKit` into Player's `kitMoves`, framework STATE
  item 7) is merged into origin/feature/mission-engine AND the engine is merged into origin/feature/tallow-throw.
- [x] (b) lead ruling: TD-b runs ahead of the fold (its hunks are disjoint from the fold's offer gate, below), base
  origin/feature/tallow-throw as it is.
Base: origin/feature/tallow-throw at sha 45239952a5c7f912d935aa199241e1c82e707a7d (PR T; carries TD-a 9c9a89be8 via 45239952a). Cut from that exact
sha even if the branch moves. New branch: feature/tallow-throw-tdb (the lead merges it into feature/tallow-throw).
Lead: Night Shift | Campaign Build. Read `git show origin/master:docs/systems/agent-preamble.md` ("Cloud sessions"
replaces the folder rules) and the code hard rules in `git show origin/master:CLAUDE.md` first.
Plan: `docs/missions/slices/J8-J9-PLAN.md` on origin/feature/mission-engine: A4, A24, section 6 row TD and "TD per-site
throw length", section 14 "The long throw". Line numbers below are on 45239952a; if your base carries the fold, find the
same code by the quoted text.

## Only these files
- `src/game/teamController.ts`: the constructor (site registration), a new `dispose()`, a new public field
  `lastThrowDist`, `requestThrow` (`:957-995`), and the header comment line `:83`. Nothing else: not the offer gate
  (`:784-786`, `flags.coopKit` / the fold's flag), not the kit hooks, not `begin` / `runThrow`.
- `src/game/teamMoves.ts`: the "partner throw" block only (`:206-275`: a new `clearThrowSites`) and the `kind === 'throw'`
  case of `checkTeamRequest` (`:126-135`).
- `src/game/gameState.ts`: exactly one line in `dispose()` (step 3), only if the lead ticks it here: [x] yes.
- `tests/throwSites.test.ts` (extend; one TD-a case flips, step 5).
Not yours: `src/world/mapDef.ts`, `src/config/movement.ts` (`TEAM` stays: never edit `throwDist` / `throwTime`),
`throwArc` / `throwArcVy` / `throwKoHit` / `throwRoom`, `src/net/**`, any map file, `tests/tallowWharf/helpers.ts`
(G2's analytic replica of `requestThrow`, `:245`), the changelog fragment (the lead's).

## Why (Q23, M2, tallow-fixes A24)
Michael's "Mix of both" (M2) approves a 5.8 m throw over a 4.9 m gap at two Tallow spots (C4 pawn loft -> reading room,
C5 arcade roof -> W3 roof). TD-a (merged) gave the pure part: `MapLayout.throwSites`, `setThrowSites`, `throwDistAt`,
and a length on `throwLanding` / `throwLandingOk`, with the host's check following the site. Nothing calls
`setThrowSites` yet, so the game still throws 3.2 m everywhere: at the widened Tallow gaps the runner's own room check
finds no floor 3.2 m out and refuses. TD-b wires it: the team controller registers the map's sites (host and client both
build the same map, so no wire change), the runner's landing, floor probe and arc use the site's length, and the host
tolerates the edge where its view of the thrower disagrees with the runner's. Every map without sites (Marlow Yard, the
campus, the rest) keeps 3.2 m exactly.

## What to build
1. **Read first:** `src/game/teamMoves.ts:100-140`, `:206-320`; `src/game/teamController.ts:75-135` (fields, the
   `land` scratch `:120`, the constructor `:129`), `:326-339` (`kitSync`: the "headless test may have no world" pattern,
   `this.g.world?.level ?? null`), `:848-856` (`if (o.toss) this.requestThrow(o.mate)`), `:945-995` (`throwRoomUp`,
   `requestThrow`), `:1097-1105` (`begin`, throw), `:1207-1222` (`runThrow`); `src/net/coopHost.ts:1185-1190` (the host
   runs `checkTeamRequest`; the client never does); `src/game/gameState.ts:626` (`this.team = new TeamController(this)`,
   `world` is set before it) and `dispose()` (`:1180-1240`); `tests/kit/registry.test.ts:74-89` (`fakeGame`: a floor at
   y 0 under every downward ray, `net.teamRequest` recorded into `asked`); `tests/hangDown.test.ts:90`
   (`new TeamController({} as GameState)`: no world at all); `tests/throwSites.test.ts` (TD-a's cases);
   `src/net/interp.ts:27`, `:35` (`SNAP_MIN` 2 m, `SNAP_SPEED` 25 m/s) and `src/net/coopHost.ts:73` (`SNAP_HZ` 15).
2. **Registration (host and client).** In `teamMoves.ts`, next to `setThrowSites`:
   `export function clearThrowSites(list: readonly ThrowSite[]): void` that sets the module list to null only when the
   stored list is `list` (identity), with a one-line comment (a new controller may start before the old one is
   disposed, a bench hand-off for example: the old dispose must not clear the new map's sites). In `TeamController`: a
   private readonly field `sites: readonly ThrowSite[] | null` and a constructor body that reads
   `g.world?.layout?.throwSites ?? null` (a test's fake GameState may have no world: `{}` must not throw), stores it
   (an empty list as null, as `setThrowSites` does) and calls `setThrowSites(this.sites)`. It always calls it, also with
   null, so a map with no sites overwrites a previous map's list. `import type { ThrowSite } from '../world/mapDef'`.
   Setup time only.
3. **Dispose.** `dispose(): void` on `TeamController`: `if (this.sites) clearThrowSites(this.sites);` (clears only the
   sites this controller set). If the lead ticked the `gameState.ts` line above: one line `this.team.dispose();` in
   `GameState.dispose()` right after `this.gadgets.dispose();`. If not ticked: write the method, do not call it, and
   say so in the report (the constructor's overwrite is then the only reset).
4. **`requestThrow` (the runner's side, `:957-995`).** The direction first, then the length, then the landing:
   ```ts
   // (tallow-fixes A24) the direction first (runner -> thrower, or the thrower's yaw under 5 cm), then the site's length
   throwLanding(c.pos.x, c.pos.z, m.pos.x, m.pos.z, m.yaw, this.land);
   const dist = throwDistAt(m.pos.x, m.pos.z, this.land.dx, this.land.dz);
   this.lastThrowDist = dist;
   const l = throwLanding(c.pos.x, c.pos.z, m.pos.x, m.pos.z, m.yaw, this.land, dist);
   ```
   The floor probe, the head room and the 8-leg arc already read `l`, so they follow; change nothing else in the method.
   `lastThrowDist = 0` is a public field beside `lastThrowRoom` with the comment "(tallow-fixes A24) the last throw's
   length (tests, e2e)": the wharf e2e (slice E8) reads it on the host page. No allocation: the same `this.land` out
   object twice. Add `throwDistAt` to the `./teamMoves` import. Header comment `:83`: "landing `TEAM.throwDist` m past
   them (a throw site's length at a named site, tallow-fixes A24), crouched."
5. **The host's band at a site (`checkTeamRequest`, throw case).** The host's view of the thrower lags the runner's, so at
   the 1.0 m reach edge or the 0.9 cosine edge the runner may throw 3.2 while the host computes 5.8. The bands (2.2-4.2
   and 4.8-6.8) do not overlap, so today that throw is denied. At a site the host also accepts the standard band (a
   standard throw is harmless anywhere):
   ```ts
   const dist = throwDistAt(r.b.x, r.b.z, l.x - r.b.x, l.z - r.b.z); // (tallow-fixes A24) a throw site's length, else the standard
   // (TD-b) at a site the host also takes the standard band: its view of the thrower lags the runner's (reach / facing edge)
   if (!throwLandingOk(r.b.x, r.b.y, r.b.z, l.x, l.y, l.z, dist) && (dist === TEAM.throwDist || !throwLandingOk(r.b.x, r.b.y, r.b.z, l.x, l.y, l.z))) return 'noTarget';
   ```
   Keep the order and the other denials. The reverse edge (the runner throws 5.8, the host sees no site) stays a denial
   ('noTarget', a polite refusal, the runner retries on the mark) unless the lead ticks: [ ] also accept a site's band
   when the thrower is within `THROW_SITE_REACH + 0.25` and the cosine is at least 0.85 (then add two optional params
   `reach = THROW_SITE_REACH, cos = THROW_SITE_COS` to `throwDistAt`, the host calls it with the looser pair after the
   strict one fails, and a test covers it). Not ticked: a test pins the denial (step 7).
6. **The arc at 5.8 m (fixed `TEAM.throwTime`).** No change to `throwArc`, `throwTime` or the apex (plan: a per-site
   flight time is a later change, risk "The long throw"). Work out and put in the report: the horizontal flight at a
   site (the runner starts up to `TEAM.throwReach` 1.6 m behind the thrower: 5.8 + 1.3 = 7.1 m in 1.0 s, at most 7.4 m/s;
   standard 4.5-4.8 m/s), that it stays under `SNAP_SPEED` 25 m/s and that one snapshot step (1 / 15 s, about 0.49 m)
   stays under `SNAP_MIN` 2 m, so the partner's view interpolates instead of snapping; that `throwKoHit`'s per-step
   check (7.4 m/s x 1/60 s = 0.12 m) stays inside `throwKoReach` 0.7 m; and that nothing else in `src/` assumes the throw
   is 3.2 m (`git grep -n "throwDist"`: `src/anim/studioPairs.ts:290-310` and `ctcourseGreybox.ts:408-409` are Marlow
   Yard / studio, no sites: unchanged). If any of these fails, stop and report (`status: blocked`).
7. **Tests** (`tests/throwSites.test.ts`, keep its `afterEach(() => setThrowSites(null))`; a local `fakeGame` copied
   from `tests/kit/registry.test.ts:74-89` with `world: { level: {}, layout: { throwSites } }`; call the private method as
   `(tm as unknown as { requestThrow(m: unknown): void }).requestThrow(mate)`):
   - construction: a controller on a world with one site `{ x: 0, z: 0, dx: 0, dz: 1, dist: 5.8 }` makes
     `throwDistAt(0, 0, 0, 1)` 5.8; one on a world with no `throwSites`, with `{ level: {} }`, and
     `new TeamController({} as never)` give `TEAM.throwDist` (and do not throw);
   - dispose: controller A (site list S1) then controller B (a different list S2) is built; `A.dispose()` leaves S2 set
     (B's spot still gets B's length); `B.dispose()` clears it; a controller built with no sites disposes harmlessly;
   - `requestThrow`: the mate (thrower) at (0, 0, 0), the runner (`controller.pos`) at (0, 0, -1.3): with the site, the
     recorded `teamRequest` landing (`asked[0]`, the last two numbers) is (0, 5.8) and `lastThrowDist` 5.8; without
     sites (0, 3.2); runner on the +x side (-1.3, 0, 0), so the throw runs +x against the +z site: 3.2; runner within
     5 cm of the thrower and the mate's `yaw` 0 (the yaw fallback faces +z): 5.8. If the fake's floor ray refuses a case
     (`lastThrowRoom` not 'ok'), adjust the fake, never the code;
   - host band: the TD-a case `:89-92` "the standard along +x denied" flips (the lead's TD-b rule): with the site
     `{ x: 0, z: 0, dx: 1, dz: 0, dist: 5.8 }`, a claimed landing 3.2 along +x is now allowed (null), 5.8 allowed, 7.0
     and 2.0 denied 'noTarget', 3.2 along +z (off-facing) allowed, 5.8 along +z denied; with no sites 5.8 along +x
     denied (unchanged). Retitle the case. If the reverse-edge box in step 5 is not ticked: a thrower 1.1 m from the site
     claiming 5.8 along its facing is denied 'noTarget' (pinned);
   - the arc: from (0, 0, -1.3) to (0, 0, 5.8), the mean horizontal speed over `TEAM.throwTime` is under `SNAP_SPEED`
     (import from `src/net/interp`; a test may import it) and `throwArc` at `TEAM.throwTime` ends on the landing.
   Every other existing case in `tests/throwSites.test.ts` and `tests/teamMoves.test.ts` passes unchanged.
   Hard rules that bite: no allocation in `requestThrow` / `checkTeamRequest` (no new objects, closures, arrays); strict
   TS (`import type`, `noUncheckedIndexedAccess`); hyphens, not em dashes; no reference-game names.

## Checks (cloud: tsc and these vitest files only; no e2e, no GPU, no npm run check)
- `npm run typecheck:fast`
- `npx vitest run tests/throwSites.test.ts tests/teamMoves.test.ts tests/kit/registry.test.ts tests/kit/pullUp.test.ts tests/kit/shutter.test.ts tests/hangDown.test.ts tests/teamClimb.test.ts tests/missionFlags.test.ts tests/ctcourse/a5Substation.test.ts tests/ctcourse/a8Strongroom.test.ts tests/ctcourseGreybox.test.ts tests/tallowWharf/w2.test.ts --maxWorkers=2`
  (the six after the first two build a `TeamController` on a fake game: the constructor change must not break them; the
  last four are the throw users, unchanged: no map in your base has sites yet)
- `npx eslint src/game/teamController.ts src/game/teamMoves.ts tests/throwSites.test.ts` (+ `src/game/gameState.ts` if
  step 3's line is in)
- Pending PC run (the lead requests it on PR T's head): laptop `e2e-coop e2e-netmove e2e-ctcourse
  e2e-sectorops:wharf-tgc e2e-sectorops:wharf-tkl`.

## Done
- Checks green. The diff touches only the files above; in `teamController.ts` only the constructor, `dispose`,
  `lastThrowDist`, `requestThrow` and the `:83` comment; in `teamMoves.ts` only `clearThrowSites` and the throw case.
- With no sites every result equals today's (3.2 m landing, 2.2-4.2 m band); at a site the runner lands the site's
  length and the host accepts that and the standard band.
- Commits on feature/tallow-throw-tdb prefixed `tallow TD-b:`, each ending with the trailer
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"; `git add <file>` per file, never `-A`. Never merge,
  rebase, force-push, or push to feature/tallow-throw or feature/mission-engine.
- Size: about 110 changed lines (about 30 in `src/`, 80 in the test), 1.5 h.

## Report (append below, then set line 1 to `status: done feature/tallow-throw-tdb <sha>`)
Commits; each function / field added or changed with its signature; whether step 3's `gameState.ts` line went in; the
step 6 numbers (flight speed, snapshot step, KO step, the `throwDist` grep); test counts per file; check results; every
deviation with its reason; "pending PC run" for the laptop suites. A question the brief cannot settle:
`status: blocked <reason>`.
