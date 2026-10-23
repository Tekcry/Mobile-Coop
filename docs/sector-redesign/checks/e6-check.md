# E6 check - EW10 security desk (checker: Opus, 2026-10-23)

Commit checked: bdd8b23b (base b550cc2a). Read-only: nothing edited but this report.

## Verdict: FIX (one blocking item)

tsc clean. vitest `sectorDesk`, `sectors`, `sectorRestart`, `coopFix`, `cameraCue`, `jammer`: 6 files, 122 tests pass.
One blocking bug: a desk in any section after the first is disabled when the players arrive through the connector, and
stays disabled until a restart. Everything else holds.

## Blocking

**1. A section-1+ desk is dead after a connector change.** `src/game/modes/sectorMode.ts:464` (`deskApply`) and `:440`
(`useDesk`) gate on `this.run.index`. A connector fires `CONN_LOAD` at `connectorLoadAt` 1.5 s (`sectors.ts:477, :662`),
while `run.index` is still the previous section; `run.advance()` (`index++`) only runs on `CONN_UNLOCK_FAR` at 3 s
(`sectors.ts:739, :788`). So `loadSection(prev + 1)` (`sectorMode.ts:659 -> :517`) calls `deskApply` with the old index:
the new section's console is set disabled, the old section's console enabled. Nothing calls `deskApply` again on
`beginSection`, so the new desk stays off (host and, via the mirrored `on`, the client) until a restart
(`:787`, which loads with the right index). The unit tests only exercise section 0 (`tests/sectorDesk.test.ts:237, :308`).
In the window 1.5-3 s `useDesk` also accepts the unloaded previous section's desk (harmless: its cameras are dead).
- Fix: keep the loaded section in the mode, e.g. `private deskSec = -1`, set `this.deskSec = s ? i : -1` at the top of
  `loadSection` and `-1` in `unloadSection`, and use `deskSec` instead of `run.index` in `deskApply` and `useDesk`.
  (Calling `deskApply()` from `beginSection` alone also fixes the enable, not the `useDesk` window.)
- Done looks like: a unit test drives the connector (or `connEvents(CONN_UNLOAD | CONN_LOAD)` then
  `CONN_UNLOCK_FAR`) from section 0 to 1 and asserts desk 1's item is enabled and `useDesk(1)` returns
  `DESK_USED_LOOP`, and desk 0's item is disabled.

## Judged

**Co-op (S5): robust, no protocol field needed.** `deskSync` (`src/net/coopClient.ts:372`) looks each desk up by item id
(`desk-<i>`), not by label, so a label shared with another switch cannot cross-wire. The host resends items whenever
any id/on/label changes (`coopHost.ts:1104-1112`, the signature includes the label) and every 2 s regardless
(`ITEMS_EVERY`), so a use, a loop end and a restart reach the client in the next snapshot, and a late joiner gets the
state within 2 s (before that it has no items at all, so nothing to desync against). `c.desk` is sticky and
`applyJam` is idempotent, so the order of `snap` vs `sector` messages does not matter. The host sends `label.slice(0,24)`;
the longest desk label is 18 chars. The client has no SectorMode (puppet), so no duplicate desk items. Detection is
host-side (`securitySystem.ts:115`, `c.sees`); the client only follows for LED / cue / meter display, and follows
within one snapshot. Labels, LED (`securityView.ts:70`) and cue (`cameraCue.ts:208`) all key off `mode !== 'online'`,
so looped and off read the same on both pages. One residual exposure, shared with every existing mirrored item: the
`MAX_ITEMS` 128 cap (`coopHost.ts:1058`) drops non-`c-` items past 128; a dropped desk item reads as `DESK_NONE` on
the client (Polish 1).

**Operator gate (S2/S3): no hard lock.** Alive, not KO'd, within 2.5 m. The live cap is 32 (`sectors.ts:486`), so a
real operator always spawns. The one soft lock: an operator still pending because a player is within 7 m of his slot
(`sectorMode.ts:685`) holds the console while that player stands at it, and the refusal says "Take him out first" with
nobody there. It clears when the players step 7 m away (he spawns at his post). Only happens if a section's start or
connector is within 7 m of the operator's slot; flag for the S4 placement (Polish 2).

**applyJam (`ctDevices.ts:908-919`): unchanged with no desk.** With `desk` 0, `want` is `off` when blind else `online`;
the off branch fires only from `online` (looped is unreachable), the on branch only turns `off` back to `online` when
`camOff` has it, and a destroyed camera only drops from `camOff` - the same transitions as before. Jammer + desk: a
jammed looped camera goes off (in `camOff`) and returns to looped after the reboot; a loop that ends while jammed stays
off until the reboot then goes online. Restart: unload + load reset the desks and `deskApply` puts cameras and labels
back (host), the client follows from the labels; `repair` still handles shot cameras.

**Hot path / rules.** `applyJam` and `SectorDesks.step` allocate nothing; `setDesk` only on change; `deskSync` once per
items snapshot; `debug().desks` allocates but is debug only. `operatorAtPost` uses `hyp2`. No `src/net` import from
single-player code; the new client import is `src/net -> src/game` (allowed). No wire change, `PROTOCOL_VERSION`
untouched, correct.

## Polish (not blocking)
1. Desk items can fall past the `MAX_ITEMS` 128 cap on a big map (as bolts and keypads can). When S4 places a desk, add
   an assert in that map's test that its interactable count stays under 128, or give desk items priority in
   `coopHost.items()`.
2. S3 pending operator: either assert in `checkDesks` / the S4 map test that the operator's slot is >= 7 m from the
   section's start and connector checkpoint, or show a different refusal line when the operator is pending.
3. A client's refused use (manned) gets no line (S7: host feed only); the hold just ends. Consider a per-player feed later.
4. `src/security/data.ts:3` imports a type from `src/game/sectorDesks` (type-only, but security -> game layering).
   Moving `SecurityDesk` into `security/data.ts` would keep the direction clean.

## Fix round

Fixer: Opus, 2026-10-23, on bdd8b23b. Nothing committed.

- **Blocking 1 fixed.** `src/game/modes/sectorMode.ts`: new `private deskSec = -1` (the loaded section), set to
  `s ? i : -1` at the top of `loadSection` (before its `deskApply`) and to -1 in `unloadSection` (before its
  `deskApply`). `deskApply` and `useDesk` gate on `deskSec` instead of `run.index`, so `CONN_LOAD` makes the new
  section's desk live at once and the 1.5-3 s window no longer accepts the unloaded section's desk. With no section
  loaded every desk refuses (`DESK_REFUSE_BAD`).
- **Polish 2 done (one line + a constant).** A manned refusal while the operator has no spawned guard (still pending)
  feeds `DESK_LOCKED_LINE` "The console is locked from the operator's chair." (`src/game/sectorDesks.ts`); a spawned
  operator at his post still gets `DESK_MANNED_LINE`.
- Tests (`tests/sectorDesk.test.ts`): new "a connector change from section 0 to 1 makes desk 1 live and desk 0 dead"
  drives `run.objectiveDone()` then `run.step` through the connector, feeding each step's events to `connEvents`
  (`beginSection` stubbed: the stub game has no section kit). At `CONN_LOAD` (run.index still 0) desk 1 is enabled,
  desk 0 disabled; after `CONN_UNLOCK_FAR` the same, `useDesk(0)` -> `DESK_REFUSE_BAD`, `useDesk(1)` -> `DESK_USED_LOOP`.
  The pending-operator test asserts the neutral line. The restart test now expects a refusal between unload and load,
  then loads before using.
- Checks: `npx tsc --noEmit -p .` clean; vitest `sectorDesk`, `sectors`, `sectorRestart`: 3 files, 53 tests pass;
  eslint on the 3 changed files clean.
