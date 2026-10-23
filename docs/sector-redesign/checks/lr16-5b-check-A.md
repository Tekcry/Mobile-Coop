# LR16-5b check A: swinging pendants on Marlow Yard

Checker A (Opus 5.5, fresh, 2026-10-23). Commit `feature/sector-redesign-lr16-5b` @ 6cf7713d, base lr16int 4ebcecbd
(`git diff 4ebcecbd 6cf7713d`, 28 files). Brief `docs/sector-redesign/briefs/LR16-5b.md`, build report
`docs/sector-redesign/checks/lr16-5b-build.md`. Detached worktree, slot lock, desktop.

## Verdict: PASS

Nothing broken, unsafe or parity-breaking. The one determinism gap found (ring replacement on a lagging client, P1) is
bounded, cosmetic and inside the audit's 0.3 m tolerance; it goes on the polish list with its minimal fix.

## Runs (own)
- `npx tsc --noEmit`: clean.
- `npx eslint` on the 15 touched src / test files: clean.
- `npx vitest run --maxWorkers=2`: lampSway, lampFlicker, lightField, charShadowSet, lampFalloff, net, crateWire,
  sectorLampSync, jammer, jammerFixes, moveState, rejoin, sectorStep3 + one scratch file (below, not committed):
  14 files, 267 tests, all pass.
- Scratch stress test (deleted after): 20 pendants x 4000 steps of random shots / blasts / bumps on a host `SwaySet`,
  every kick through `JSON` + `parseMessage` into a client registry ticking 0.2 s behind with events 0.1 s late. After
  all events arrive, host and client offsets are `toBe`-equal at every later step (x, y, z). During the run, at the same
  snapped times: 44-74 % of samples differ, max 0.077-0.092 m, with `SWAY.slots` 4; with slots forced to 64 the max
  drops to 0.0021 m (the retire threshold). So the difference is the ring replacement (P1), nothing else.

## Net / determinism (brief emphasis)
- Kick path: `SwaySet.kick` (`lampSway.ts:296`) places and calls `onKick` synchronously; `CoopHost` (`coopHost.ts:202`)
  pushes `{ e: 'sway' }` in placement order; the client's `onEvent` (`coopClient.ts:730`) -> `swayImpulse` -> `apply`
  (`lampSway.ts:312`) runs the same `scan` / `place` at the kick's own t0. `t`, `a`, `h` are doubles through JSON
  (shortest round trip, exact); `cos h` / `sin h` recomputed from the same `h`. Same ring, same slot order, same sum
  order: bit-identical once a page has every kick (confirmed above).
- Clock: host kicks use `CoopHost.time` (= `simTime()`, `coopHost.ts:1242`) from GameState hooks and `onSwayShot`;
  bumps use the snapped tick time. Out-of-order t0 between a bump (snapped up to +1/120 s) and a shot is harmless: the
  client applies the same sequence. Future kicks on a lagging client: `dt < 0` keeps the slot live with no
  contribution (`lampSway.ts:220`), and `scan` counts it as `A` on both pages (`:263`).
- `tickSway` (`lights.ts:302`) snaps to `FLICKER_STEP_HZ` 60 like `tickFlicker`; 30 vs 60 Hz agree at shared steps
  (existing test) and repeated calls inside one step do not bump `swayVersion`.
- Host `sw-` check (`coopHost.ts:1026`): alive, `swayTargetId` (`^[0-9]{1,4}$`, < LAMP_MAX), draw, weapon, a per-client
  `TickLimiter` (4/s), origin within `LAMP_SHOT_ORIGIN` 2 m of the chest (`swayShotOk`), the claimed segment clear of
  static geometry to `len - LAMP_LOS_SLACK`, then the host's OWN `shotProbe` on its own offsets. The client never
  supplies an amplitude or heading; direction is normalised and `dist` clamped 0..300 by the `shot` parse
  (`protocol.ts:745`). Worst a cheat can do: fabricate up to 4 kicks/s on pendants within its line of fire, each capped by
  `maxAmp - E` and `minGap`. No gameplay advantage (sway makes no noise, guards ignore it); same trust as the `lt-` path.
- Event parse (`protocol.ts:329`): non-integer / out-of-range id rejected; NaN, Infinity, strings rejected (`num`);
  finite out-of-range t / a / h clamped (t 0..1e7, a 0..0.25, h -pi..pi). `a` 0 is ignored by `apply`; an unknown id
  is ignored. Only the host's `ev` is accepted (`session.ts:237`).
- PROTOCOL 38 -> 39 with its history line; all 8 test files that assert it updated; `net.test.ts` gate refuses 38 and
  admits 39. No assertion on the number left in `scripts/` or `e2e/`.
- Solo: no static `src/net` import added (`gameState.ts` imports `type SwaySet` from `world/lampSway`; net imports world,
  never the reverse; `lampSway.ts` deps are world / voxel / core only).
- Client hook (`coopClient.ts:139`) chains after the Sector `lampRay`; puppets have no other `onRay` (GameState sets it
  only for non-puppets), so nothing is lost. `swayRay` (`:544`) uses the page's own `minGap` throttle.
- Blasts: a client's grenade reaches `explosions.explode` on the host (`coopHost.ts:557`), so `onExplode` -> `blastKick`
  covers host, client and guard grenades; `hookCombat`'s chains keep the GameState sway hooks.
- Dropped events and rejoin: see P2 / P3.

## Parity
- Meter / guards: `LightField.lampInto` (`lightField.ts:295`) and `lightTerm` (`lights.ts:113`, so `contribution` and
  `dynamicInto`) read rest + offset; `enemy.ts:177/1291` and `enemyManager.ts:953` read `totalAt` / `levelAt`, the same
  path. Picture: t0 + `spheres` via `writeSway` before `charShadows.frame`, folded into `BakedLamps.frame`'s one upload;
  `update()` on a registry change rewrites the colour texel only, never t0. Rig bodies / hangers, haze, pooled light
  follow.
- Rest-position exceptions, all safe: visibility (`visInto`) at the receiver point on both meter and shader; the lamp grid
  (`lampGrid`) built from rest data is the same table for meter (`lightField.ts:161`) and shader (`bakedLamps.ts:226`),
  so both truncate alike; `lightOnRay` at rest on both host and client, so `lt-` validation agrees.
- Per-frame allocation: `tick`, `scan`, `place`, `shotProbe`, `blastKick`, `bumpKick` use typed scratch only (alloc test
  0 B); `writeSway` and `drawSway` use preallocated typed arrays / Matrix / Quaternion / Vector3 (checked by reading;
  `drawSway` maths verified: axis = (dx, dy, dz) / len under Babylon's row-vector YawPitchRoll); `swayBumps` writes a
  preallocated Float32Array and `remotePlayers()` is the host's kept array. The `{ e: 'sway' }` object is per accepted
  kick (<= 5/s a pendant), not per frame.

## Must-fix findings
None.

## Polish list
1. P1 - ring replacement breaks "bit-identical at shared times" on a lagging client (`lampSway.ts:275`). With 4 live
   kicks (common in a firefight: a kick lives ~24 s down to `SWAY_RETIRE`), a new kick at t_new replaces the weakest one
   on both rings; a client whose clock is behind t_new when the event lands loses that kick's contribution early, so for
   the clock lag (ClockSync jitter, tens of ms) its offset differs from what the host showed at the same sim time, up to
   ~0.06-0.09 m (scratch test). Both pages agree again from t_new; each page's own picture and meter still agree. Also the
   source of the host-side "small pop" the build report lists. Minimal fix: in `kick`, when `scan` finds no free slot,
   drop the kick (`return false`, no event) instead of replacing; `apply` keeps `place`. Then only retired slots
   (< 0.002 m) are reused and the residual gap is < 0.0021 m. Add a test with 5+ kicks and a client ticking behind.
2. P2 - dropped `sway` events (`protocol.ts:125`): past `MAX_EVENTS * 2` (96) the queue drops a kick and that client's
   ring diverges until the swing decays (build report open item). Minimal fix: `|| e.e === 'sway'` beside `'crate'`
   (bounded: <= 9 pendants x 5/s).
3. P3 - rejoin / late join mid-swing: the client starts with an empty ring, so for up to ~16 s (visible) it shows less
   swing than the host and later kicks may sit in different slots. A client's ring can then also hold a kick the host
   has replaced, so its sum can pass `maxAmp` by up to one replaced kick (~0.06 m). Options: re-send live ring entries on
   `restore`, or cap the summed envelope in `apply`.
4. P4 - `apply` never caps the summed envelope: a misbehaving host could send 4 x 0.25 m in phase (1 m). Host is
   trusted; a one-line cap (`min(a, maxAmp - E)` in `apply` only when that would not change an in-sync ring) is optional.
5. P5 - no-bake fallback: the pooled Babylon light (`lightRig.ts:608` `follow`) re-places a pendant only at a re-pick
   (`PICK_INTERVAL`), while `lightTerm` moves every step; and `dynamicInto`'s occluder / door test start at rest. Only
   when the bake is absent; add `|| swayVersion moved` to `follow`'s place for pendants.
6. P6 - a shot-out test (`lightOnRay`, client `lampRay`, host `lampShotOk`) and any collision on the hidden hangers stay
   at rest while the fitting is drawn up to 0.25 m away: a round can miss the drawn lamp and still shoot it out.
7. P7 - `BakedLamps.frame` returns early in volume mode (`bakedLamps.ts:379`, Kestrel editor only) before the
   `swayDirty` fold; harmless (the editor has no pendants kicked) but the flag stays set.
8. P8 - build report claim "a client whose clock is behind gets the same ring" (assumption 5) is true of the ring once
   all kicks arrive, not of the offsets during the lag window (see P1); reword when P1 is fixed or left.
9. P9 - the ctcourse voxel cache key may change once (hidden 4 cm rods), unverified by the build; check on the laptop
   GPU run with the perf / e2e-lightbake items already owed.
