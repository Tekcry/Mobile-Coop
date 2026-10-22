# Slice 0 - client hold noise (ENGINE-ANSWERS Q12, SPEC N4)

Status: done, uncommitted (the job lead commits).

## Built
A client's noisy hold now makes the same guard noise on the host as the host's own hold: at its first moment and
every `HOLD_NOISE_PULSE` (0.5 s) while it runs, `enemyMgr.hear(item.pos, item.holdNoise)` at the item. The host's own
hold path (`gameState.ts`) is unchanged.

How:
- Host -> client: a snapshot item carries the hold's radius as `NetItem.hn` (only when the item is a noisy hold:
  `holdTime > 0` and `holdNoise`). The client sets `holdNoise` on its mirrored item, so its own noise meter
  (`GameState.eventNoise`) now reads the hold as the host's does (`enemyMgr` is null on a client, so nothing else runs).
- Client -> host: the existing `use` message gains `pulse?: true` (one noise pulse, not the finished use). The client
  watches its mirrored noisy holds once per fixed step (`HoldPulseWatch`, `coopClient.fixedUpdate`) with the same
  `holdNoisePulse(prev, next)` rule, so both the plain hold and the context menu hold row pulse.
- Host: `use` with `pulse` goes to `onHoldPulse`: sender alive, item live (enabled, not done), a hold with
  `holdNoise`, inside the `use` reach (item reach + 0.75 m, 2 m of height: now one shared `inUseReach`, which
  `onUse` also uses), and at least `HOLD_PULSE_MIN_GAP` (0.3 s) since that client's last accepted pulse. A failed pulse
  is dropped with no violation count.
- Wire: inside the unmerged `PROTOCOL_VERSION` 30 (no new bump); the 30 note in `protocol.ts` names it. A 29 host would
  read a pulse as the finished use, which the version check at `hello` already prevents.

No line in `courseMode.ts` is needed: it already sets `it.holdNoise = dv.holdNoise` on the host's hold devices
(`courseMode.ts:287`), and the host's `items()` now forwards it.

## Files
- `src/net/holdPulse.ts` (new, pure, Babylon-free): `HoldPulseWatch`, `hostHoldPulse`, `inUseReach`, `HOLD_PULSE_MIN_GAP`.
- `src/net/protocol.ts`: `NetItem.hn?`, `use.pulse?`, their parsing, the v30 note.
- `src/net/coopHost.ts`: `items()` sends `hn`; `use` with `pulse` -> `onHoldPulse`; `onUse` reach via `inUseReach`; `holdPulseAt` map.
- `src/net/coopClient.ts`: mirrored item gets `holdNoise` and joins the watch; removed items leave it; the watch steps in `fixedUpdate`; cleared on dispose.
- `tests/marlowHoldNoise.test.ts` (new, 10 tests).

## Assumptions (Michael asleep)
- H1: a new pure module `src/net/holdPulse.ts` holds the logic so it is unit-testable without a `CoopHost` (no test
  builds one). Undo: inline it into `coopHost.ts` / `coopClient.ts`.
- H2: reuse `use` with a `pulse` flag rather than a new message (brief: prefer an existing message). Undo: a `hpulse`
  message with the same host check.
- H3: the client's own noise meter now shows its noisy hold (mirrored `holdNoise`), matching the host player. Undo: set
  only the watch, not `it.holdNoise`, in `syncItems`.
- H4: the host takes at most one pulse per client per 0.3 s (pulse 0.5 s, room for jitter); a pulse out of reach is
  dropped silently, not a violation (a hold can end on the reach edge).

## Numbers
`HOLD_NOISE_PULSE` 0.5 s and the radius are the existing `config/noise.ts` values / the device's own `holdNoise`;
`hn` clamped 0-30 m on parse; host gap 0.3 s.

## Checks
- `npx tsc --noEmit`: clean.
- `npx eslint` on the 5 touched files: clean.
- `npx vitest run tests/marlowHoldNoise.test.ts tests/net.test.ts tests/rejoin.test.ts tests/moveState.test.ts tests/holdNoise.test.ts`: 111 passed.
- `tests/marlowN4Hold.test.ts`, `tests/sectorBolt.test.ts` (interactables): pass. `tests/ctcourseGreybox.test.ts` has
  10 failures (boostWall, hangPlate, jamRelay geometry) from other agents' working-tree map changes; it imports no
  `src/net` code.
- Not run: e2e. Suites to run: `e2e-coop` and `e2e-netmove` (src/net changed), plus `e2e-ctcourse`.

## Open
- SPEC N4 / section 14 and PLAN 0d still say N4 ships without `holdNoise`; the job lead can now give A6's drive panel
  a `holdNoise` in the course data and drop that note (the "once N4's client pulse lands" lines at SPEC :580, :1152).
- `docs/systems/coop.md` does not yet mention the pulse (one line for the job lead's docs pass).

## Michael should try
Co-op Marlow Yard with a noisy hold device (once its data has `holdNoise`): the client holds it beside a calm guard
and the guard reacts, as when the host holds it.
