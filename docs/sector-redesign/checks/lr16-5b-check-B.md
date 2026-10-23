# LR16-5b check B: swinging pendants on Marlow Yard (ctcourse only)

Checker B (Opus 5.5, fresh, independent of checker A). Commit `feature/sector-redesign-lr16-5b` @ 6cf7713d, base lr16int
4ebcecbd (`git diff 4ebcecbd 6cf7713d`). Brief `docs/sector-redesign/briefs/LR16-5b.md`, build report
`docs/sector-redesign/checks/lr16-5b-build.md`. File:line at 6cf7713d.

## Verdict: PASS

No broken, unsafe or parity-breaking work. Every finding below is polish.

## Runs (desktop, own detached worktree, slot lock, `--maxWorkers=2`)
- `npx tsc --noEmit`: clean. `npx eslint` on the 15 touched files: clean.
- vitest, 13 files, 265 tests, all pass: lampSway (13), charShadowSet, lightField, lampFlicker, lampFalloff, net, sectorLampSync,
  crateWire, jammer, jammerFixes, moveState, rejoin, sectorStep3.
- No e2e, no GPU, no `npm run check` (per the brief).

## Parity / render: every reader at rest + offset
| Reader | Where | Result |
| --- | --- | --- |
| `lightTerm` (so `contribution`, the unbaked / no-bake meter) | lights.ts:113-115 | rest + sw*. OK |
| `LightField.lampInto` (meter, guards) | lightField.ts:295-297 | P + sw*; door test uses the swung lx/ly/lz, as the shader's `nsDoorBlocks(t0.xyz, ...)`. OK |
| Shader lamp loop (t0) | `writeSway` bakedLamps.ts:518-545 writes t0 xyz + `spheres`; GLSL reads `t0.xyz - lp` (:1281), vis by world point (:1294). No GLSL change. OK |
| One upload a frame | `writeSway` only sets `swayDirty`; `frame()` folds it into the single `data.update` (bakedLamps.ts:400-405). `update()` rewrites colour texels (o+1) only, never t0, so a lamp switch does not snap t0 to rest. OK |
| Order | world.ts:725 `writeSway` before `charShadows.frame` (:727) and `lamps.frame` (:729). OK |
| Capsules / char-shadow fit | read t0 / `spheres` (charShadows.ts:333-336, :476-479). OK |
| Rig fitting + hangers | `drawSway` lightRig.ts:268-311: body at rest + offset, hanger top fixed, bottom + offset (same yaw/pitch maths as `buildFittings` links, verified). Static fixture buffer skips pendants (:191). OK |
| Pooled light | `place` lightRig.ts:686 rest + offset (only re-placed at picks: polish 6). OK |
| Haze | volLights.ts:35-37, called per frame (postStack.ts:476). OK |

- Visibility (`visInto`, shader `lampVis`) stays the rest bake, and both the meter and the shader read it at the receiver
  point, so picture, meter and guards agree (no parity break). The mismatch is only against reality: static-geometry
  shadows do not sweep under a swinging lamp (character shadows do). Worst lamp offset:
  `sqrt(maxAmp^2 + swy^2)`, `swy = maxAmp^2 / 2L`: base rods L 2.38 m -> 0.250 m (swy 0.013); marlow-final A2 strip
  L 0.93 m -> 0.252 m (swy 0.034). Inside the audit's 0.3 m.
- `lightOnRay` at rest (lights.ts:573): a perception/gameplay mismatch, not a light-parity one. The base pendant's hit
  box is half 0.11 + `FIXTURE_PAD` 0.06 = 0.17 m across the strip (`PENDANT` sz 0.22, ctcourse.ts:67). A drawn fitting
  offset > 0.17 m sits outside its own hit box: a round at the visible fitting misses, and one into the air at rest
  shoots it out. Needs an envelope > 0.17 m: one round through the centre gives A = 0.35 / 2.03 = 0.172 m (outside for
  ~0.06 s); a grenade within ~3.0 m (A >= 0.17, capped 0.25) keeps it outside at the swing's peaks for ~1.9 s. Brief
  allows it ("keeps the rest pose (<= 0.25 m)"). Polish 1.

## Character shadows (M14)
- `LampSlotPicker.update` (charShadowSet.ts:262): a held swinging lamp scores -1 (keeps its slot), but only after the
  reach test (`d < limit`), so a swinging lamp out of reach still drops. A swinging newcomer competes at `d x hold`.
- `refreshEvery` (:308-311) returns `max(base,1) x governor` while its lamp moves: every frame on High, the tier base on
  Low / Medium, as briefed. `mv` is the same frame's array (`update` then `refreshEvery` in `CharShadows.frame`).
- `moving` (bakedLamps.ts) is all zeros on other maps, so the picker behaves exactly as before there.
- `moving[i]` is refreshed on every `swayVersion` move, and the settle tick writes 0 offsets (one last move), so it
  always returns to 0.

## Other maps unchanged
- `SWAY_PENDANTS` has only `ctcourse`; `applyMapSway` sets `reg.sway = null` elsewhere. Rods are hidden only on a match
  with 2+ claimed hangers. Both `lightShapes.ts:24` (canonical set) and `levelVoxels.ts:162` already skip thin and
  hidden boxes, so the canonical hash is unchanged (test asserts ctcourse; campusOps / warehouseOps / warehouse untouched).
  The ctcourse rods are `collide: false` (ctcourseBunker.ts:80): hiding them changes no collision.
- `swx/swy/swz` = 0 on every other light: `l.x + 0 === l.x` bit for bit; every LightDef comes from `add` (tsc).

## Perf / allocation
- `tickSway` / `SwaySet.tick`, `shotKick`, `shotKickOne`, `blastKick`, `bumpKick`: typed-array scratch (`tmp`, `time`),
  `hyp2` / `hyp3`, no closures, no iterators; the alloc test measures 0 B a call. `writeSway`, `drawSway`: preallocated
  Matrix / Quaternion / Vector3, typed arrays (by construction). `swayBumps`: preallocated Float32Array, `remotePlayers()`
  returns a kept array on host and solo. Hooks are closures made once at load.
- No pendant moving: `tickSway` is a round plus n quiet-flag checks; `writeSway` one compare; `bakedLamps.frame` one
  bool; picker one byte read per candidate. ~0. (Polish 5: on non-ctcourse maps `drawSway` is called each frame and
  returns at once.)
- Moving: <= 9 pendants x 4 slots x (exp + sin) a fixed step; texels folded into the existing upload; the char-shadow
  slot of a swinging lamp re-renders every frame for up to ~16 s (envelope > 0.01): the laptop perf check owed covers it.

## Kick ring
- Cap holds: `kick` caps A at `maxAmp - E(t0)` where E includes the slot it replaces, and all envelopes decay at one
  rate, so `|off| <= sum env <= maxAmp` always (the 20 s / 1 ms test confirms).
- 5th kick: replaces the smallest live envelope (<= maxAmp / 4 = 0.0625 m), an instant pop of that kick's current offset;
  once E is near the cap new kicks fall under `minAmp` and are dropped, so replacement only happens with headroom.
- 0.002 m retire: a jump <= 0.002 m, invisible. Retirement is evaluated at placement only (`scan` never mutates), so
  the host and the client rings stay equal.

## GameState hooks (solo / host)
- Made once, `!this.puppet` (gameState.ts:719-739), after the `onRay` assignment at :692 and before the security chain at
  :757 (which chains `prevRay`): nothing overwrites them. `CoopHost.hookCombat` chains `onEnemyShot` / `onExplode` with
  `prev*` (coopHost.ts:263, :271) and does not kick itself: one kick per round / blast on the host. A client's `boom`
  event calls its own `onExplode` (coopClient.ts:614) but a puppet has no sway hook: no double kick there either.
- Clocks: solo `this.time`, host `CoopHost.simTime() === this.time`, used by both GameState (`simNow`) and `onSwayShot`.

## Net (sanity)
- `PROTOCOL_VERSION` 39 with its history line; every test asserting it updated; net.test's gate refuses 38 / admits 39.
- `sway` event parse (protocol.ts:329): integer id in 0..LAMP_MAX-1, t / a / h clamped (`num`), garbage dropped. Wire is
  JSON, so doubles round-trip exactly: the client's ring equals the host's.
- `sw-` shot: `swayTargetId` strict digits, `onSwayShot` (coopHost.ts:1026): alive, draw, weapon, 4/s limiter, origin
  within 2 m of the chest (violation counted), static segment within `LAMP_LOS_SLACK`, then the host's own probe and
  cap. A client cannot raise A past the host's cap. Client `swayRay` per-pendant `minGap`, no local kick.
- src/net reached only from src/net; world / game import `type SwaySet` or world modules only. No static net import added.

## Polish list (none blocking)
1. lights.ts:573 `lightOnRay` tests the rest box: a swung fitting (> 0.17 m on the base pendants, after a near grenade)
   can be visibly missed / shot in empty air. Fix: centre the `rayBox` at `l.x + l.swx, l.y + f.oy + l.swy, l.z + l.swz`
   (host and client agree since the ring is deterministic; the client's lag adds < 0.04 m).
2. protocol.ts:126 `eventQueueKeeps` can drop a `sway` event when the host queue is past 96 (a firefight's tracers): that
   client's pendant differs from the host's (its picture + meter vs the host's guards) until it settles (<= 16 s). Fix:
   `|| e.e === 'sway'` beside `crate` (kicks are at most ~5/s per pendant).
3. Rejoin / late join: no re-send of live kicks (<= 16 s divergence). Optional: re-send the live ring on `restore`.
4. Client phase jump: a kick lands ~one-way latency after its t, so the swing starts mid-phase: a step of up to
   `A sin(wd x latency)` (~0.035 m at 100 ms on the rods). Optional ease-in on the client.
5. lightRig.ts:271 / :508: on maps without pendants `swayV` stays -1, so `drawSway` is called (and returns) every frame.
   Set `this.swayV = this.reg.swayVersion` before the early return, or start it at 0.
6. lightRig.ts:613 `follow` re-places only flashlights between picks: on the pooled-light path (cheap / `?baked=0`, not
   the game default) a pendant's Babylon light steps at 4 Hz (PICK_INTERVAL 0.25 s) while the meter is continuous.
   Fix: also `place` slots whose light is a pendant while `swayVersion` moves.
7. gameState.ts:267-270: `MAX_SWAY_HEADS` was inserted under `SHOT_NOISE`'s JSDoc, so that doc now sits on the wrong
   constant. Move the new const above the "Gunshot noise radius" comment.
8. Ring replacement pop (<= 0.0625 m) in a long firefight: known (build report); acceptable.
9. Brief/design note: static-geometry shadows (rest vis bake) do not sweep under a swinging lamp; only character
   shadows do. Parity holds; a visual-pass item if Michael notices it.
