# throw-ko - partner throw onto a guard knocks him out (spare job 3)

Branch `feature/throw-ko` from origin/master d140e097 (4.66.0). CT Core Build spare job, 2026-10-23. Head ad7956f8.

## What
In co-op, when one player throws the partner (the standing partner throw, CT prototype B4) and the thrown player comes
down on a guard, the guard is knocked out.
- The host decides the hit.
- The joiner sees the guard drop through the existing guard state sync.
- Credit and the feed use the existing kill event (`onKill` -> `e: 'kill'`).
- No wire change; `PROTOCOL_VERSION` is unchanged.

## CT reference followed
- `docs/ct-research/levels-digest.md`, co-op move table, row "Partner throw": "Landing on a guard knocks him out".
- The same file, the bomb-room beat (~481-483): the partner is thrown over the beam onto a lured guard, "knockout on
  landing" (throw-onto-guard is ONE SOURCE). The level tallies list "partner throw as an attack".
- `docs/ct-research/kit-design-digest.md` ~329: players remember "throwing the partner over a laser or into a guard".

## How
- `src/game/teamMoves.ts` (pure):
  - `throwArcVy(t, y0, y1)` gives the arc's vertical speed (below 0 means descending).
  - `throwKoHit(fx, fy, fz, vy, gx, gy, gz)` is true when the feet are descending, within `TEAM.throwKoReach` (0.7 m)
    across of the guard, and 0.3 to 1.7 m over his feet (`throwKoLow` to `throwKoHigh`): the falling body lands on his
    head or shoulders.
- `src/config/movement.ts`: `TEAM.throwKoReach`, `throwKoLow` and `throwKoHigh` (starting values).
- `src/net/throwKo.ts`: `ThrowKo`, the host's tracker.
  - `start()` runs at the throw's `tstart`: it records the flight from the thrown player's feet, as the host has them, to
    the bounded landing, from host time t0.
  - `step()` runs every host fixed step: it replays `throwArc` and hands the first guard hit to the host. A guard must be
    alive and not seized.
  - One guard per throw. Tracking ends at the landing or when the thrown player is downed. No allocation per step.
- `src/net/coopHost.ts`: the `throwKo` field, `start` in `onTeamMove`'s throw branch, `step` in `fixedUpdate` beside
  `runStrikes`, and `throwKnockOut`, which calls `Enemy.knockOut` with a melee hit (attackerId 'local' for the host, the
  client's id otherwise, `takedown: 'throw'`) and then `enemyMgr.hear` at `STRIKE.noise`: the elbow strike's knockout
  path. The SecWire encode block was not touched.
- `src/ai` is untouched: only its public API (`Enemy.knockOut`, `EnemyManager.hear`) is called.

## Assumptions (undo)
- A1: The host decides on the arc it replays from its own start time, not the thrown player's streamed position. The
  host's own throws match exactly; a joiner's throw lands one-way latency later on the joiner's screen, so the guard may
  drop a few frames early there. Undo: read the thrown player's live feet in `ThrowKo.step` (`g.player.position` for the
  host, `RemotePlayer.feet` for a client).
- A2: The hit zone is the guard's hips to head top (0.3 to 1.7 m over his feet), within 0.7 m across, descending only.
  Hit: a guard on the landing, up to about 1 m short of it, or about 0.35 m off its line. Missed: a guard 1.4 m past the
  landing, 1.2 m beside it, or under the rising half of the arc. Tune: the three `TEAM.throwKo*` values.
- A3: One guard per throw, the first the body comes down on. Undo: remove the stop-on-hit in `ThrowKo.step`.
- A4: Any guard kind can be knocked out this way, dogs included, as with the palm strike (G42 / G155). Seized guards are
  not targets. Undo: filter in `ThrowKo.step` or in the host callback.
- A5: The knockout makes the elbow strike's noise (`STRIKE.noise`) at the thrown player's feet and counts as a non-lethal
  melee takedown. Undo: the hit fields and the `hear` call in `CoopHost.throwKnockOut`.
- A6: The throw is not aimed at guards and its room check is unchanged: a guard never refuses a throw (CT's throw is a
  fixed distance).

## Tests
- Unit, `tests/throwKo.test.ts` (13 pass): the pure decision (descending only, band and reach edges, the band follows the
  guard's floor height, `throwArcVy` matches a finite difference of `throwArc`); the host tracker (a guard on the landing
  is knocked out once; just off the line or a step short too; one guard per throw; guards past the landing, under the
  rising half or beside it stay standing; dead or seized guards are not targets; a thrown player downed in the air takes
  nobody down; tracking ends at the landing; two thrown players at once).
- `tests/teamMoves.test.ts` passes. tsc and eslint are clean on the touched files.
- e2e (desktop second lane, heavy2.lock, port 4192, `E2E_GPU=1 E2E_JOBS=1`, commit ad7956f8): build OK, e2e-coop OK
  (82 s), e2e-netmove OK (179 s). Neither suite drives the partner throw (only e2e-ctcourse station 4 does, with no
  guard), so the throw-onto-guard check is the unit-level host test.

## Open items
- No e2e throws onto a live guard (e2e-ctcourse station 4 has none): a later test chore.
- e2e-ctcourse not run (the slice tier names it for `src/game` / `src/net`); its throw station is unaffected unless a
  guard stands on the landing.
- Reach and band are starting values; Michael's playtest decides.

## Changelog line
- Co-op partner throw onto a guard (throw-ko): the guard the thrown player comes down on is knocked out
  (host-authoritative, no wire change).
