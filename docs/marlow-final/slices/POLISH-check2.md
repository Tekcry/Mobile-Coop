# marlow-polish: second checker (independent Opus)

Head 1bde5328, branch feature/marlow-polish. Scope: the polish commits 80389110, 24992aa7, 9de24cd9, 1bde5328
(`git diff 795d2dc9^2..1bde5328`), the merge of origin/feature/section-rating excluded.

## Verdict: PASS

No blockers: no broken work, no wire mismatch, no hard-rule break.

## Checks run
- `npx tsc --noEmit -p tsconfig.json`: clean.
- Vitest, single files: ratingWire 12/12, marlowWalkS10 6/6, polishBatch 9/9, securityCameraE8 9/9, net 73/73,
  sectorItemScope 5/5.
- No e2e, no `npm run check` (per brief).

## Findings by item
1. **Sector `rh` late join** (sectorMode.ts:1297, protocol.ts:529, validate.ts:276, coopClient.ts:786).
   - Wire: `rh` is optional and parsed through the course's `courseRh` (clamped -1..RH_HI, capped RH_MAX). A 42 peer
     without this change drops it (sectorExtra builds `out` from known fields), and a host without it sends none:
     both pairings behave as before. PROTOCOL stays 42 (unreleased; master 40 is gated by the version check). OK.
   - Host sends `rh` only once `rt.sec >= 0`, from `run.marks` (never re-rated, never reset in place) and
     `ratedSynced` written in the same `rate()` call: the two cannot drift. A full restart goes back to the lobby (new
     mode). OK.
   - Client: applied only on the first `sector` message (`sawSector`), the `rt` section skipped and pushed last, as
     the course's `mirrorRating` does. Later messages, a section restart and repeated sends cannot duplicate lines; a
     reloaded rejoiner starts with an empty `sectionRatings`. Order matches the host's (sections rate in index order).
     No grant or card. OK.
2. **Client ricochet** (ctDevices.ts:334, coopClient.ts:202-208, camera.ts `nearestHousing`).
   - Client-only (`role` check); the host's `onRicochet` is local and never on the wire, so no double sparks. The
     closure is made once; `ricochetRay` allocates nothing (scratch `ricoAt`/`ricoDown`). `nearestHousing` is the
     host's old loop moved verbatim; `shotRay` behaviour unchanged (polishBatch / E8 / S10 tests pass).
   - Chains after the Sector lamp ray; for Marlow Yard `g.ctDev` is read per shot, so the course mirror made later is
     picked up. OK.
3. **ratedSynced reset** (sectorMode.ts:231, 270): built from `run.marks` in the constructor, same lifetime. OK.
4. **A3 step-4 reorder** (a3OfficeRange.mjs:283-311). Every assertion kept, none loosened: the door-shut assert and
   its diagnostic are moved, not changed; the dark-corridor checks on both pages, the dark send-back and the client's
   `level <= 0.24` at the seen spot (the camera sees in the dark) still run; step 4's "calm" wait and step 7's lure are
   untouched. `moveClient` waits until the host sees the client at the target, so a send-back hold cannot leave it
   outside silently. Race safety improved: the client's exposure at the send-back spot now starts right after the cut
   (the 3.5 s wait moved before it).

## Polish list (non-blocking)
1. a3OfficeRange.mjs:305-309: the send-back spot BACK (77.8, 10.75) is outside the shut L2 far door, about 2 m from
   the corridor switch (78.6, 12.7) the lure draws the cleaner to. The client still stands there for the camera's
   detection time plus the send-back hold. The window is now about 3.5 s shorter than before, not gone; if the
   "A3 calm" timeout recurs, this is the remaining exposure. Done looks like: the trace shows the cleaner never at the
   west lobby while a player stands at BACK.
2. a3OfficeRange.mjs:299: the 3.5 s wait for step 2's hold is likely redundant (`moveClient` at :288 already waited
   for the host to see the client in the L2 room). Harmless; it only delays the cut.
3. sectorMode.ts:1297: `packRated` allocates a small array per `sector` send (every 0.5 s and on change), next to the
   existing `lk` / `dn` / `rt` allocations. Not a hot loop; a kept array would match the conventions.
4. No unit test covers the host side (`netExtra` emits `rh` only after the first rating) or the client's
   `onSector` first-message path end to end; the pure parts (`packRated`, `courseRh` in sectorExtra,
   `ratingViewsFromRh`) are tested.
5. coopClient.ts:160 and :208 both null `g.weapons.onRay` on dispose (harmless duplicate).

## Compared with POLISH-check.md
Agrees with POLISH-check.md (PASS, same wire reading inside 42, same idempotency and ricochet findings); its polish 1-2 are done in 1bde5328; this check adds the A3 step-4 reorder (assertions intact, residual exposure at BACK) which that range did not include.
