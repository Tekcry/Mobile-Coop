# LR16-6 check A (Opus, fresh): correctness and CT faithfulness

Branch `feature/sector-redesign-lr16-6` @ 543cb6da (base 6e53e036), read in a detached worktree. Authority read: G100,
G102, G181, G45 (DECISIONS), bible Goggle modes and L15, CT measure s.4 Thermal / Mode cycle, LR16-0 audit rows 16-17 and
the LR16-6 bullet, the build report.

## Verdict: FIX (1 must-fix)

The core is right: G100 is an instant cut with the label on any change, G102 draws a posed dim-blue figure only through a
fully shut leaf, never through a wall or glass, gameplay untouched, nothing on the wire. One block, a co-op parity gap:
bodies on the client never cool, so the two peers show different figures behind the same door (the client reads a dead
guard as a live one). One strong should-fix, not blocking (CLAUDE.md: cosmetic): Sector Ops guards behind a shut door are
render-frozen, so their figure is a statue.

## Must-fix

1. **Co-op client: bodies never cool, so a body behind a shut door shows forever (host: ~30 s).** `gameState.ts:2582`
   `paintHeat` stamps bodies from `this.enemyMgr?.bodies` only; the client has no enemy manager (`gameState.ts:662`), and
   its kept bodies (`coopClient.ts:713-724`, `Ragdoll` on the puppet's rig, still in `LIVE_RIGS` until `dropBody`) keep the
   full `bodyEmit` 0.85. `DoorGhosts` now runs on the client (the slice's own change: `LIVE_RIGS`), so `ghostWarm` passes for
   every kept body for good, and the two peers show different figures behind the same door. The build report's rule ("a
   body for its first ~30 s") holds on the host only. Fix (also fixes the client's main-pass body cooling):
   - `coopClient.ts`: `private readonly keptAt = new Map<string, number>();`; after `this.kept.set(e.enemy, r);` (:724)
     `this.keptAt.set(e.enemy, this.time);`; `this.keptAt.delete(id)` in `dropBody` (:1085); `this.keptAt.clear()` next
     to `this.kept.clear()` (:1144); and
     `stampBodies(f: number): void { for (const [id, r] of this.kept) { r.rig.bodyFrame = f; r.rig.bodyAge = this.time - (this.keptAt.get(id) ?? this.time); } }`
     wired as `g.bodyStamp = (f) => this.stampBodies(f)` where the client attaches to the game (null it on dispose).
   - `gameState.ts`: field `bodyStamp: ((frame: number) => void) | null = null;` and in `paintHeat` after the host bodies
     block (:2590): `if (on && !bodies) this.bodyStamp?.(f);`.
   - Unit: a client-stamped rig past half `coolTime` reads `ghostWarm` false.

## Should-fix (not blocking; before Michael tries the TESTING.md line)

2. **Sector Ops: a guard behind a shut door is render-frozen, so his figure is his last pose sliding with his root.** The
   guard freeze treats a closed door as an occluder (`sectorGuardFreezeView.ts` header), so every guard that qualifies for
   a door figure is a frozen one, and `animTierView.ts:104-107` skips his solve entirely while his root is disabled. The
   report admits "the pose is the last solved one"; `TESTING.md` asks Michael to see "a dim blue figure in his pose ...
   moves as he moves" in Sector Ops, which a walking guard will fail (a mid-stride statue gliding). Fix:
   - `characterRig.ts`: `ghostFrame = -1;` next to `standIn` (render only).
   - `doorGhosts.ts` `consider`: before `return this.fig.add(r, this);` set `r.ghostFrame = this.scene.getFrameId();`.
   - `animTierView.ts:104`: `const frozen = !rig.root.isEnabled(false) && rig.ghostFrame < this.scene.getFrameId() - 1;`
     (a ghosted guard solves at his normal tier, one frame behind; at most `THERMAL.doorMax` 8 rigs, CPU only, nothing
     drawn but the figure). The thaw re-plant path is unchanged.
   - Unit: a disabled-root rig with a fresh `ghostFrame` animates; without it, it stays frozen. GPU shot: a guard walking
     behind a shut door in Sector Ops.

## Checked and sound

- **G100** (instant cut, no flip; G181 wheel picks, one button toggles, flip / sound on on / off only): `VisionState` has
  no flip; `renderVision` resets the label timer on any change of `v.mode` (`visionShown`), so a wheel switch with the
  goggles on now flashes the label; `v.mode` is `'off'` while off, so a wheel pick with goggles off does nothing visible.
  Sound unchanged.
- **G102 / G45 qualification**: `LIVE_RIGS` minus `self` (identity with `this.player.rig`, right on host and client) and
  `standIn`; `ghostWarm` >= 0.5 x `bodyEmit` (8/16 shows, 7/16 not, tested); 14 m horizontal; floor line camera -> hips
  crossing a leaf with `open` 0 only (a cracked door shows the real body); rays `G.STATIC | G.GLASS` (walls, floors, other
  shut leaves are `G.STATIC` via `doorMembership`, so two doors in series block; any glass pane blocks: G45 "thermal never
  sees through glass"); the own leaf skipped by the 0.2 m gaps (leaf body 0.1 thick). Props / crates are not blockers but
  the normal depth test lets them and the player cover the figure. Matches CT s.4 ("closed wooden door ... dim blue
  silhouette ... soft"; "no case of seeing through a solid wall or glass").
- **Figure placement**: `doorPlaneFactor` maths checked (den = |D| sin, step front / |den| before the crossing); sizes
  scale with f so the screen size is kept; head copied before the warp (the rig's cached position is not moved).
  0.06 m clears the hinged leaf (0.025 half) and the kit slide leaf (0.022 half).
- **Look**: 0.62 display luma after dividing out exposure 1.08 (`scene.imageProcessingConfiguration` is the pipeline's
  config); test pins heat < the 3rd stop, blue > 0.7, red < 0.1, green < 0.15: CT's deep blue / blue rim band.
- **Gameplay never reads graphics state**: the rays are `PhysicsEngine.raycastToRef` queries through `Ballistics.ray`
  (read-only, no body touched, render frame only); `DoorGhosts` writes only its own meshes and material; `standIn` is read
  only by `DoorGhosts`; `visionIsolation` passes. Meter and perception untouched.
- **Co-op**: no wire or protocol change; each peer walks its own `LIVE_RIGS`; `enemyPuppet.ts:120` sets `standIn` in the
  quadruped branch right after the rig is hidden, mirroring `enemy.ts:444`; a dog puppet's rig is disposed on `die`
  (leaves `LIVE_RIGS`). Doors on the client follow `syncDoors`, so `open` 0 means shut on both.
- **e2e thermal leg**: `node --check` clean; APIs it uses exist (`nav.cellOf / isWalkable / height`, `post.visionKind`,
  `controller.teleport`, `vision.set / selected / toggle`, `doors.setOpen`); the player's and guards' rigs are already
  disabled by the earlier leg (`e2e-darkness.mjs:294-295`), which the ghost does not need. Logic sound; see polish 1.
- **Runs**: `npx tsc --noEmit` clean. `vitest --maxWorkers=2` (slot lock): thermalThroughDoor, doorGhosts, vision,
  nightVision, visionIsolation, enemyGunMerge, enemyLightsOut, enemyManagerDespawn, net, netSim, coopGuardCarry,
  coopTorches, coopGuardAi, coopFix, coopWalkFixes: 15 files, 190 passed. No e2e / build / GPU.

## Polish

1. e2e colour read: the screen centre is the camera's pivot (the player's head height, `CAMERA.pivotStand`) with the
   0.15 m shoulder offset, so at the guard the 24 px square sits ~0.18 m to the side at head / neck height: coverage of the
   figure is maybe a quarter, and `ghost[2] - none[2] > 40` is marginal. Read at the projected chest of the guard
   (`Vector3.Project` of the hips-neck midpoint) or set `cam.pitch` ~ -0.1 for the read.
2. `Ballistics.ray` allocates a `RayHit` and 1-2 `Vector3` per call (`ballistics.ts:115-122`), 2 calls per candidate per
   frame: the report's "no per-frame allocation" is not true. Pass `hitDistance` instead (allocation-free):
   first ray blocked when `hitDistance(a, b, m) < Distance(a, b) - 1e-3`, second when `< Distance(a, b) - BODY_SLACK`.
3. `thermalGhost.ts` `doorPlaneFactor`: a crossing behind the camera (t <= 0) returns the 0.02 floor instead of 1; add
   `if (t <= 0) return 1;`. Practically unreachable (needs a joint on the camera side farther from the line than the camera).
4. A co-op puppet not yet placed (`enemyPuppet.ts:386`, rig at its build pose until the first sample) can be ghosted for a
   frame; skip `!p.placed` puppets (e.g. set `standIn` until placed) if it is ever seen.
5. Test: the stub ray answers both rays alike; add a case where only the body-side ray hits within `BODY_SLACK` of the body
   (still shows) and one where it hits well short (blocked). `vi.spyOn(Math, 'random')` is never restored.
6. Vault doors (prop leaf, `leaf: 'slide'` anchor) are thick: the figure 0.06 m off the line sits inside the leaf and is
   hidden. A fine outcome for a steel vault; say so in `lighting.md`.
7. The figure material's first compile is a possible one-off hitch (report notes it); prewarm with the other vision
   materials if the spike log shows it.
