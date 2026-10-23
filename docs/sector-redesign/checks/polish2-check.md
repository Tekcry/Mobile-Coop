# Polish batch 2 check (feature/sector-redesign-polish2, 7a731dfe vs eb6d63c4)

Checker: fresh Opus. Diff read in full; the build report is `checks/polish2-build.md`.

## Verdict: PASS

No blocking items.

## 1. Walk 1: lamp reach probe

- `src/world/lights.ts:457-490` `lampReachProbe`: it decides "only through the mount reach" the same way `lightOnRay`
  does (`lights.ts:510-535`). It uses the same padded fixture box (`FIXTURE_PAD`) and the same `rayBox`, and for bulbs the
  same closest-point test. It returns 0 when the round enters the box, so an ordinary lamp shot is unchanged. It does not
  allocate: it writes into `out` and uses `hyp3`.
- The three callers run the same test: the same function, the same segment and the same static mask.
  - `src/game/stealthSystems.ts:524-534` `shotRay` (host and solo) uses `G.STATIC`.
  - `src/net/coopClient.ts:516-519` `lampRay` uses `G.STATIC`. It runs before the send, so the client never asks for a
    lamp the host would refuse.
  - `src/net/coopHost.ts:1003-1008` `onLampShot` uses `MASK.WORLD`, which is `G.STATIC` (`src/physics/groups.ts:31`).
  - The host rebuilds the landing as `o + d * min(dist, range)`. The client sent `dist = len` and the full direction
    (JSON doubles, `protocol.ts:732-755`), so the landing matches to about 1e-15 m. No desync.
  - Allocation: all ends are preallocated vectors (`reachA` / `reachB`, and the host's `lampA` / `lampB`, which are
    overwritten afterwards). `Ballistics.clear` does not allocate (`src/weapons/ballistics.ts:75-80`). No closures.
- Wire: no change. `PROTOCOL_VERSION` is untouched.
- Single player: `stealthSystems.ts` imports only `../world/lights`, and `lights.ts` imports nothing from `src/net`.
- A landing under a lamp with a clear line up still breaks it. On the S1 lane floodlight (pillar r 0.15 to 6.0 m,
  `campusS1.ts:221`), the 4.72 e2e round lands at (9.15, 5.73, -65.99). The probe starts about 2.6 cm off the pole and
  rises to 5.89 with nothing above it. The soffit case is refused (`tests/perception.test.ts:402-428`).
- Host-only edge case, not blocking: `lampShotOk`'s +0.3 m rounding fallback (`lampSync.ts:144-145`) still probes from the
  claimed landing. The client never sends such a shot itself, because its own segment already hit.

## 2. Art P3: skinReach (`src/world/campusArt/keepouts.ts:749-777`)

- It is justified for the current data. Each flagged case was a box-hull false positive:
  - **S2 `receptionCounter`.** The cam-turnstile ray ends on the counter's own face, and the skin sits 1 cm proud. The
    greybox already decides that ray.
  - **S4 `basketRun` vs `las-tray`.** From the `hero-s4.glb` steel mesh, the hanger rods are 2 cm rods at local x ±0.01,
    z ±0.49 (the basket's side edges at mid-unit). On B-cage they stand at about x 17.51 / 18.49, z 40.27. `las-tray` runs
    at z 40.4, y 4.7 / 5.3 (`campusS4.ts:150`), so the beam passes about 0.12 m clear of the rods. That is inside the
    0.3 m K9 tube but does not touch them, and the rods are visual only. No gameplay effect.
- Both exemptions are broader than these two cases. See polish 1 and 2.
- Cost: `checkDressing` runs only from tests and `CampusDresser.check()`, not at load, so load time (P1) is unaffected.

## 3. Art P4: split gaps (`src/world/maps/campusDress.ts:100-102`)

The dressing output is unchanged for the current data. In the old lazy version, the gaps were first computed when S1's
dresser built its keepouts (`dresser.ts:41`, read in `buildKeepouts` at `keepouts.ts:415`). That happens on S1's first
`add` / `base`, which is before S1's `write()`, so the gaps already came from the bare greybox. The change only removes
the order dependence for a future dresser that writes before it queries. The render, gameplay and dress tests are green.

## 4. Tests

- `npx tsc --noEmit`: clean.
- Each file was run on its own under an `sr-slot` lock.

| File | Passed |
| --- | --- |
| perception | 31 |
| sectorLampSync | 13 |
| lights | 10 |
| enemyLightsOut | 4 |
| campusArtKit | 13 |
| campusDressRules | 25 |
| coopTorches | 12 |
| campusArtGameplay | 53 |
| campusArtLight | 5 |
| campusArtRender | 3 |
| campusS1Dress | 13 |
| campusS2Dress | 12 |
| campusS3Dress | 12 |
| campusS4Dress | 13 |
| campusS5Dress | 6 |

The S1-S5 dress tests were added because `checkDressing` now runs `skinReach`. `sectorLampSync` is the only vitest file
for co-op lamp shots.

The new perception test is meaningful. It covers the near-face probe (clear of the wall), a box entry (no probe), and the
S5 soffit (the probe runs into the lintel). No test drives the callers end to end, because that needs Havok.

## Polish (not blocking)

1. **K8 skip is whole-ray** (`keepouts.ts:763`). Any ray that touches the piece is skipped, so an overhang that crosses a
   ray before the ray reaches the piece would pass the gate. Done looks like: skip only when the hull entry along the ray
   is within about 2 cm of the piece's entry.
2. **K9 skip is the whole plan footprint at every height** (`keepouts.ts:772`). A rod standing in a beam over its own
   basket, or a laser over a genset at stack height, would pass the gate. Done looks like: measure K9 against the listed
   overhang's real parts (rod lines, stack cylinder), or name an exemption per laser and prop with a real clearance
   (for example, rods 5 cm or more from the beam).
3. **No test for the caller probe.** Add a `sectorLampSync`-level test with a stub `ballistics.clear` that refuses, to
   assert that `onLampShot` drops the shot and that `lampRay` does not send.

## e2e for the laptop (logic only, `E2E_JOBS=1`)

- `e2e-sectorops:1`: the co-op client's lamp shot (`scripts/e2e-sectorops.mjs:801-868`, walk 4.72 S2).
- `e2e-coop`: `src/net` client and host changed.
- `e2e-stealth-ai`: the host and solo lamp shots through `shotRay`.
- `e2e-stealth`
