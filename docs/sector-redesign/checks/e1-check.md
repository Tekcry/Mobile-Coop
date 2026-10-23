# E1 check - EW5 Sector keypads with codes from intel (checker: Opus 5.5, 2026-10-23)

Commit 34973765 on `feature/sector-redesign-e1`, diff vs 95097957. Read-only check.

## Verdict: PASS

No blocking findings. No broken or unplayable path, no host-authority or parity break.

## Tests run
- `npx tsc --noEmit -p .`: exit 0.
- `npx vitest run tests/sectorKeypad.test.ts tests/sectors.test.ts tests/sectorRestart.test.ts tests/sectorSlice0.test.ts tests/sectorBolt.test.ts tests/navClosure.test.ts tests/net.test.ts`: 7 files, 148 tests pass.

## Correctness
- Lock until the code is held: `findKeypads` (sectorMode.ts ~286-301) locks the door, shuts its nav closure and adds the
  keypad item; `enterCode` (~318-332) goes through `SectorCodes.useKeypad`, which refuses without `has(code)`
  (sectorKeypads.ts ~73-78). Refusal resets the hold. OK.
- Grants: board `onUse` -> `grant` once, item off in `learned`; overhear `hear` accumulates while inside, resets on
  leave, grants once; objective via `objectiveDone(run.index, this.granted)` before the stats line (~499). All three go
  through `learned` (subtitle + `radioLine` + labels). OK.
- Restart (A50): `rekey` runs right after `rebolt` and before `unloadSection` (~660). Section codes dropped, intel reset,
  opened keypads re-locked and nav re-closed, boards re-enabled, `secT = 0` so the locks go out at once.
  `SectionStartState.apply` skips locked doors (sectorReset.ts:63), so it cannot undo the re-lock. OK.
- Bolt `navClose` refactor: identical maths and guard (`door && g.nav`, same `BOLT_NAV_*`, same `b.at`, `setClosed(true)`),
  returns -1 as before. sectorBolt + navClosure tests pass. The e2e-sectorops part 2 door probe reads `boltInfo()` /
  `useBolt` only; neither changed, and no map has `keypads` / `intel` yet, so the probe still holds.

## Co-op host authority / parity
- The client has no `SectorMode`/`SectorCodes`; its keypad / board use arrives as `use` and goes through
  `CoopHost.onUse` (coopHost.ts:592-607: alive, enabled, reach + 0.75, height 2), then the host's `onUse`. A client
  cannot grant itself a code.
- Unlock reaches the client through `lk` (every locked door, sectorMode.ts ~781-782) on the forced sector send.
  Item labels ("Keypad - code needed" 20 chars, "Enter code") ride the item list (`label.slice(0, 24)`), and `intel` is
  in `ITEM_KINDS` (protocol.ts:120). OK.
- `src/net` edit: `NetHooks.radioLine?` is an optional method on the interface in gameState.ts (no new import;
  gameState imports from net are type-only as before), sectorMode calls `g.net?.radioLine?.()`, so single player has
  no static src/net import. `feed` already exists on the wire as `{ e: 'feed'; text: string }` (protocol.ts:127),
  parsed with `safeText(v.text, 60)` (protocol.ts:326); `INTEL_LINE_MAX` 60 matches and is enforced by
  `checkSectorCodes`. No `PROTOCOL_VERSION` bump needed (still 31). `feed` had no sender before this commit.

## Hot paths
- `overhearStep` per tick: reuses `this.refs` via `playerRefsInto`, plain index loops, `inOverhear` uses the same
  tuple destructuring as the existing per-tick `inZone`; no per-tick allocation. `objectiveDone` reuses `this.granted`.
  `codes()` / `debug()` allocate but are debug only.

## Strict TS / text
- Strict TS clean. UI strings "Enter code", "Keypad - code needed", "Locked - find the code", "Code accepted", "Read"
  and the test / example lines contain no reference-game names and are voiceable (G82). Map lines stay the map
  writer's responsibility, capped at 60 chars.

## Assumptions
- K1 (1 s hold unlocks, does not open): accept. Matches the bolt ("Unbolted - open the door"), keeps the door a
  separate, noisy-or-quiet player choice.
- K3 (overhear ignores whether the talking pair is alive): recommend fixing before the S2 campus data lands. As built,
  KO or kill the coffee pair (#5-6) and stand at the kitchen 4 s: the code is "overheard" from bodies. The board is
  the intended fallback, so gating loses nothing. Minimal fix:
  1. `sectors.ts` overhear variant: add `readonly talkers?: readonly number[]` (indices into this section's `guards`).
  2. `sectorMode.ts`: add `k: number` to `Pending` (`loadSection` pushes `k`, reinforcements -1); keep
     `private readonly slotEnemy: (Enemy | null)[] = []`, cleared in `loadSection` / unload, set in the spawn loop
     (`if (p.k >= 0) this.slotEnemy[p.k] = e`).
  3. `overhearStep`, before the player loop:
     `if (n.talkers) { let ok = true; for (let i = 0; i < n.talkers.length && ok; i++) { const e = this.slotEnemy[n.talkers[i]!]; ok = !!e && e.alive; } if (!ok) { this.codes.hear(sec, k, dt, false); continue; } }`
     (optionally also require the guard unalerted). `checkSectorCodes`: refuse a `talkers` index outside `guards`.
     Not spawned yet (cap) counts as not talking, which is correct.
- K4 (restart re-locks even when the code was held from an earlier section): accept. Same as `rebolt`, a clean retry;
  the label already reads "Enter code", so the cost is one 1 s hold.
- K5 (client gets a feed line, host a subtitle): fix now, one line. coopClient.ts:566, in `case 'feed'`, replace
  `g.hud.feedItem(e.text);` with `g.hud.barks.say('lantern', e.text, true);`. Safe because `radioLine` is the only
  `feed` sender. If a non-radio `feed` sender is ever added, give the event a flag instead.

## Polish (non-blocking)
- A client whose keypad use is refused gets no "Locked - find the code" line (the host only tells `local`). The label
  already says "Keypad - code needed", so this is minor; a per-player event would need a wire change, so leave it.
- The `intel` item kind draws a document folder lying flat at `at`; a wall "handover board" at y 5.6 will look like a
  floating folder. Map builders should put `at` on a desk / shelf surface, or a later slice adds a wall-board visual.
- Test gaps: the mode-level overhear path (`overhearStep` with stub refs, including a dead player not counting), the
  objective grant through `objectiveDone`, and a client-id `by` on the keypad are only covered at `SectorCodes` level.
- `PlayerRef.target.alive` likely stays true for a downed co-op player; a downed player in the zone still "hears".
  Acceptable.
