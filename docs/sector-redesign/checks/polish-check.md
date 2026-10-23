# Polish batch check (fresh Opus checker, 2026-10-23)

Diff `2ea83182..21480f2d` (base: p3 + posts + E2 + E10), builder report `polish-batch.md` (10 done, 11 skipped).

## Verdict: PASS

No broken or unplayable work. No wire change: `PROTOCOL_VERSION` stays 35 (no message shape touched; `eventQueueKeeps`
is host-side queue policy only).

## Runs
- `npx tsc --noEmit`: clean (exit 0).
- `npx vitest run tests/polishBatch.test.ts tests/campusS4.test.ts tests/campusS5.test.ts tests/net.test.ts
  tests/crateWire.test.ts tests/campusRuntimeNav.test.ts`: 6 files, 163 tests, all pass.
- No e2e run (lead's call): `src/net` changed -> e2e-coop + e2e-netmove; S4 / S5 data -> e2e-sectorops.

## Findings by focus area
- **Event queue (`protocol.ts:124`, `coopHost.ts:298`)**: append-only, so no reorder; the flush (`coopHost.ts:1151`)
  still splices `MAX_EVENTS` per snapshot, so an over-cap crate event goes in a later `ev` message, in order. Growth
  is bounded: crate pushes come only from a fill (`coopHost.ts:850`, once per player per crate) and the rejoin replay
  (`coopHost.ts:373`, one per used crate). Non-crate events past the cap drop as before.
- **Host LOS (`coopHost.ts:962`, `:1005`)**: `MASK.HOST_LOS` = static + armour bit. Matches the client's
  `PLAYER_SHOT` on the glass bits (clear panes pass both, armoured stop both); props / hitboxes stay out of the host
  check as before. Armoured door leaves already carry `G.STATIC`.
- **Partner tracer (`remoteAvatar.ts:604`)**: `MASK.WORLD | G.GLASS_ARMOURED`: stops where the round stops. Cosmetic only.
- **New masks**: `BLAST` / `GADGET_FLIGHT` = static + `G.GLASS`. `G.GLASS` is carried only by `BoxPiece` panes
  (`levelBuilder.ts:378`), not breakable windows or open sashes, so window kick-ins, the CR7 sash and gadgets through
  open windows are unaffected. Exposure ray now `MASK.SIGHT`, the same mask as `perception.ts:81`, the camera rays and
  the recon drone: HUD exposure and guard sight agree (light parity holds; the light meter reads the bake, unchanged).
- **`segmentHousingT` (`camera.ts:152`)**: allocation-free slab test, returns the entry t (0 when starting inside),
  -1 on a miss; `segmentHitsHousing` wraps it so `securityCamera.test.ts` keeps its meaning. `shotRay` picks the
  smallest t. No `Math.hypot`.
- **Door peek floor gap (`doorPeek.ts:137`)**: the only game caller (`gameState.ts:2669`) passes `pl.position.y`, the
  same reference the door menu gate uses (`gameState.ts:1417`, 1.2). The default `NaN` makes the check false, so the
  old `doorPeek.test.ts` calls without `py` behave as before.
- **S4 tanks 2.0 noLedge (`campusS4.ts:469`)**: no e2e leg, route or test uses the tank top (grep of `scripts/`,
  `tests/`, sector docs). The yard handler lane (x 35.3) is beside them, unchanged.
- **S5 sash 0.5 (`campusS5.ts:517`, `:520`)**: hole and anchor agree (0.5..2.05; `windowAt` cy 1.275, h 1.55). Vault
  still offered (`anchors.ts:747`, up 0.3..1.3; h > 0.9). No guard data, spawn or route lies in the well
  (-50..-46, 34..38). `e2e-sectorops` CR7 leg (around line 2685) uses the rope, not a guard path through the well.

## Polish list (not blocking)
1. `docs/sector-redesign/briefs/ART-S4.md:39` fuelTank fit is 3.0 x 1.6 x 4.0 and `SLICE4.md:98` still says tanks
   1.6: update both to 2.0 so the H4 art fits the new collision.
2. Host `hostCrackOk` (`doorPeek.ts:146`, used at `coopHost.ts:650`) has no floor gap: a modified client could crack a
   door from a walkway above. Cosmetic; add `py` there if it ever matters.
3. The light well is now off the guards' nav flood: a guard sent to investigate a noise in the well cannot reach it, so
   the well is a safe pocket. Matches L11's intent; note it for the playtest.
4. `explosions.ts:63` still allocates (`e.pos.add(new Vector3(...))`) per target per blast; pre-existing, not a hot loop.
