# LR16-5b build: swinging pendants on Marlow Yard (ctcourse only)

Scope (Michael M14, `BRIEF.md:61`): hanging lamps sway when shot nearby or bumped; the swinging lamp keeps a
character-shadow slot; meter and guards follow through the registry. Brief: `docs/sector-redesign/briefs/LR16-5b.md`
(origin/feature/sector-redesign-polish). Branch `feature/sector-redesign-lr16-5b`, base lr16int 4ebcecbd (LR16-1 +
LR16-5 merged). Builder: Opus 5.5.

## Changes (file:line at the branch head)
- NEW `src/world/lampSway.ts` (pure, no Babylon):
  - `SWAY` (:25, each value with its reason), `SWAY_RETIRE` 0.002 m, `SWAY_PENDANTS` (:89, 9 rows: 5 marlow-final, 4
    pre-marlow-final; the base matches the 4).
  - `SwaySet` (:110): per pendant the rest fixture centre / half size, `len` (mean claimed hanger length), `w`, `wd`, a
    Float64Array ring (`slots` 4 x t, A, h, cos h, sin h), `off` / `env` / `last`, the hangers (`HANGER_STRIDE` 7).
    `tick` (:202): off = sum A e^-(dt / tau) sin(wd dt) (cos h, sin h), swy = |off|^2 / 2L; a pendant with nothing live
    is skipped after one write of 0. `scan` (:251, placement only: the envelope sum and the slot, a free one else the
    smallest envelope). `kick` (:296: minGap, A = min(v / w, maxAmp - E), < minAmp dropped, `onKick`). `apply` (:312,
    verbatim). `shotProbe` / `shotKicks` / `shotKick` / `shotKickOne` (:329-:380), `blastKick` (:383), `bumpKick` (:402,
    at the last tick's time `time[0]`). Doubles between the private steps go through the `tmp` slots (0 B a call).
  - `claimHangers` (:449): thin (< `CANON_MIN_THICK`), vertical (> 0.3 m, no pitch) boxes centred in the fixture plan +
    0.1 m with the bottom 0..0.25 m above the fixture top; hidden only when 2+ are found. `applyMapSway` (:478).
- `src/world/lights.ts`: `LightDef.swx / swy / swz` (:55-61), `LightInit` omits them (:84), `lightTerm` reads rest +
  offset (:113, so `contribution` does), `add` sets 0 (:195), `sway` / `swayVersion` (:172-174), `tickSway` (:302, snaps to
  the 60 Hz step like `tickFlicker`, bumps `swayVersion` never `version`), `swayImpulse`. `lightOnRay` unchanged (rest).
- `src/world/lightField.ts` `lampInto` (:295-297): lx / ly / lz = P + l.swx / swy / swz; visibility read unchanged.
- `src/world/bakedLamps.ts`: `rest` + `moving` (:160-162, filled in the constructor), `indexOfIds` (:498, LR16-5's
  bake index, shared with `writeFlicker`), `writeSway` (:518: t0 xyz and `spheres` = rest + offset, `moving` from the
  envelope > `SWAY.still`), folded into `frame`'s one `data.update` (:400).
- `src/world/world.ts`: `applyMapSway(b, map.id)` after `applyMapFlicker`, before `b.build` (:236); `lamps.writeSway()`
  first in `frame` (:725), before `charShadows.frame`.
- `src/world/charShadows.ts`: `CharShadowLamps.moving?` (:46), passed to the picker (:310).
- `src/world/charShadowSet.ts` `LampSlotPicker`: `update(..., moving)` (:227): a held swinging lamp scores -1, a
  swinging newcomer `d x hold` (:262); `refreshEvery` (:310) `max(base, 1) x governor` while its lamp swings.
- `src/world/lightRig.ts`: pendants skipped in the static fixture buffer (:191); `buildSway` (:240, two thin-instanced
  boxes: bodies with the bulb material and their own colour buffer, hangers with the body material; dynamic buffers,
  `alwaysSelectAsActiveMesh`); `drawSway` (:268, preallocated Matrix / Quaternion / Vector3; on `swayVersion` moves,
  :508); `paintBulbs` copies the pendants' colours; `place` adds the offset (:686); `dispose`.
- `src/vfx/volLights.ts` (:35-37): the haze position + offset (assumption 4).
- `src/net/protocol.ts`: `PROTOCOL_VERSION` 38 -> 39 (:20, history line :18); `NetEvent` `sway` (:155); parse (:329: id
  an integer 0..LAMP_MAX-1, t 0..1e7, a 0..`SWAY.maxAmp`, h -pi..pi; anything else dropped).
- `src/net/lampSync.ts`: `SWAY_TARGET` `sw-` / `swayTargetId` (:126-136), `swayShotOk` (:163, the light is a pendant,
  the round left within 2 m of the chest).
- `src/net/coopHost.ts`: `sway.onKick` -> `push({ e: 'sway' })` (:202, cleared on dispose); `shot` `sw-` -> `onSwayShot`
  (:551, :1026: draw, weapon, TickLimiter 4/s, `swayShotOk`, the claimed segment clear of static geometry within
  `LAMP_LOS_SLACK`, then `shotKickOne` at `this.time`).
- `src/net/coopClient.ts`: `weapons.onRay` chained with `swayRay` whenever the map has pendants (:139, any mode;
  sector keeps `lampRay` first); `swayRay` (:544: per pendant `shotKicks`, one `shot` at `sw-<id>`, minGap per pendant
  on this page); `onEvent` `sway` -> `swayImpulse` (:732).
- `src/game/gameState.ts`: solo + host hooks made once (:721-737): our rounds (`weapons.onRay`), the guards' rounds
  (`em.onEnemyShot`) -> `shotKick`, blasts (`explosions.onExplode`) -> `blastKick`, all on `simNow()` (:1584);
  `updateLight` ticks `tickSway` after `tickFlicker` (:1544) and at `LIGHT.playerHz` `swayBumps` (:1596: local, remote
  and live guard heads into a preallocated Float32Array, `MAX_SWAY_HEADS` 40, :270; `bumpKick` at the tick's time, :1625).
- Tests: NEW `tests/lampSway.test.ts`; PROTOCOL asserts 38 -> 39 in crateWire, jammer, jammerFixes, moveState, net,
  rejoin, sectorLampSync, sectorStep3; net.test's version gate (:398-405) now refuses 38 and admits 39.
- Docs: `docs/systems/lighting.md` (moving lights: swinging pendants), `docs/systems/coop.md` (protocol 39),
  `TESTING.md` (swinging pendants item), `changes/feature-sector-redesign-lr16-5b.md`.

## Protocol
`PROTOCOL_VERSION` 38 -> 39 (lead decision: +1 from the branch; the merge-train build renumbers wire versions at train
time). Per-frame wire: none. Sway is not re-sent on a rejoin (it decays in ~15 s).

## Tests run (desktop, single files, `--maxWorkers=2`, slot lock)
| File | Tests | Result |
| --- | --- | --- |
| tests/lampSway.test.ts (NEW) | 13 | pass (alloc: tickSway 0.0, shotKick 0.0, blastKick 0.0, bumpKick 0.0 B a call) |
| tests/lampFlicker.test.ts | 20 | pass |
| tests/lightField.test.ts | 17 | pass |
| tests/charShadowSet.test.ts | 25 | pass |
| tests/lampFalloff.test.ts | 12 | pass |
| tests/crateWire.test.ts | 9 | pass |
| tests/sectorLampSync.test.ts | 11 | pass |
| tests/jammer.test.ts | 39 | pass |
| tests/jammerFixes.test.ts | 10 | pass |
| tests/moveState.test.ts | 16 | pass |
| tests/net.test.ts | 73 | pass (after the version-gate test moved to 38 / 39) |
| tests/rejoin.test.ts | 13 | pass |
| tests/sectorStep3.test.ts | 7 | pass |

Total 265 tests in 13 files. Not run (brief / lead rules): `npm run check`, e2e, GPU.

`npx tsc --noEmit`: clean. `npx eslint` on every touched file: clean.

## Assumptions
1. Kick hooks live in `GameState` for solo AND host (non-puppet), not chained again in `CoopHost` (the brief splits
   them: host in `coopHost`, solo in `gameState`); `CoopHost` only forwards `onKick`. One place, no double kick on the
   host. Undo: move the three hooks into `CoopHost.hookCombat` behind `!net` in GameState.
2. The client wires `swayRay` in every mode with pendants (Marlow is played in Course mode, where the client had no
   `onRay`), not only Sector Ops.
3. Host check for `sw-`: a separate per-client TickLimiter (4/s, like `lt-`) plus the per-pendant `minGap`; the claimed
   segment must reach its end (static ray within `LAMP_LOS_SLACK` 0.6 m) instead of a line to the fitting (a graze
   passes beside it).
4. The volumetric haze (`volLights.ts`) and the pooled Babylon light (`LightRig.place`, the no-bake path) also read
   rest + offset: picture parity, 3 adds each. Not in the brief's file list.
5. Ring retirement is evaluated, never stored: a kick under `SWAY_RETIRE` contributes 0 and its slot is free at the
   next placement (decided at that kick's own t0), so a client whose clock is behind gets the same ring.
6. A shot-out or switched-off pendant still swings (its fitting dark): the brief's "a shot-out pendant swings dark".
7. The shot / blast / bump tests use the pendant where it hangs now (rest + offset), the host's page only; a client
   only uses it to decide whether to ask.
8. The pendant's heading convention: (cos h, sin h) on (x, z); h = atan2(dz, dx).
9. Hangers drawn square at their thinnest side (0.04 m rods, 0.02 m cables).
10. Head bumps are kicked at the last `tickSway` time (snapped to the 60 Hz step; `updateLight` samples them right
    after the tick), so `bumpKick` takes no time argument (no boxed double).

## Open items
- A dropped `ev` batch entry (the host queue past `MAX_EVENTS * 2`) loses a kick on the client: that client's ring
  differs until the swing decays (visual and its own meter only; the host's guards are unaffected).
- Ring replacement (5th live kick in a firefight): the weakest kick (<= maxAmp / 4) drops out at once, a small pop.
- Cross-engine determinism (a Chrome host, a Firefox client): `Math.exp / sin / cos` may differ in the last ulp; the
  offsets agree to ~1e-16 m, not bit for bit.
- `writeSway` and the rig's `drawSway` are Babylon-side: their no-allocation is by construction (typed arrays,
  preallocated Matrix / Quaternion / Vector3), not measured by a unit test.
- The marlow-final rows (A4 aisle 2 / mezzanine, A2 shed strip) are untested until the master merge (5 expected).

## GPU / perf checks owed (laptop, after merge; BelowNormal, heavy.lock, `E2E_PORT`)
1. Perf: `MAP=ctcourse MODE=course node scripts/perf.mjs --json` on base and branch; kick all pendants every 2 s via
   `window.__app.current.world.level.lights.swayImpulse(id, t, 0.25, h)`: frame p95 delta <= 0.3 ms, no budget miss.
2. `node scripts/run-e2e.mjs e2e-ctcourse` and `e2e-lightbake` (textures <= 16; the parity probe also under a
   mid-swing pendant: meter vs readback within the probe's tolerance).
3. Shots: S2 on this base (A4 aisle 2 on master): fitting and rods swing as one, the pool and a guard's shadow sway;
   co-op two tabs in step; a shot-out pendant swings dark.

## For the checkers (src/net touched)
- Net / determinism: host `kick` -> `onKick` -> `push({ e: 'sway' })` -> client `swayImpulse` -> `apply` gives the same
  ring (placement decided at each kick's own t0, `scan` never mutates); `tickSway` snapping; future kicks on a lagging
  client; `onSwayShot` checks (limiter, origin, static segment) and that a client cannot push A past the cap (the host
  computes A; the parse clamps a to `SWAY.maxAmp`); the client's `onRay` chain in Course mode (Marlow) and Sector Ops.
- Parity / render: every reader at rest + offset (`lightTerm`, `lampInto`, t0 + `spheres` via `writeSway` before
  `charShadows.frame`, one upload a frame, rig bodies / hangers, pooled light, haze); visibility and `lightOnRay` at
  rest; the picker's hold and per-frame refresh while `moving`; the hidden hangers on ctcourse only (canonical set
  unchanged; the ctcourse voxel cache key may change once if the voxel layer held the 4 cm rods: not checked).
