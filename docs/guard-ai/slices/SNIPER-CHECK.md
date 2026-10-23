# Sniper fix check (fresh Opus checker, 2026-10-24)

Branch `feature/guard-ai-sniper`, fix 63c7a676 + report c2ec8ded, off master cacd0c7e. Read-only check; this file is
the only write. Verdict: **PASS**.

## 1. Root cause: confirmed on real Havok
- Babylon `HavokPlugin._populateHitData` sets `result.shape = this._shapes.get(hitData[1][0])`. A throwaway probe
  (real WASM, NullEngine, the level-wall pattern from `LevelBuilder.build`: container membership `G.STATIC`, child box at
  the default; deleted after the run) printed:
  - child default membership `-1`, container `-1`; after `container.filterMembershipMask = G.STATIC` it reads `1`;
    once the container is set on a body it reads `1065353216` (0x3F800000), and `-1` after a step.
  - a ray at the wall: `hit true`, `r.shape` undefined, `r.body.shape.filterMembershipMask` `-1`, old expression
    `isArmoured((r.shape ?? r.body?.shape)?.filterMembershipMask ?? 0)` = **true** on `ENEMY_SHOT`, `PLAYER_SHOT`,
    `G.GLASS_ARMOURED` alone and `G.GLASS` alone.
  - a plain pane (child and container `G.GLASS`) is not hit by the shot masks, so child filters apply in queries.
- So every plain level wall read as armour. `tests/armourFireStatic.test.ts` builds the same pattern and its first case
  (`armouredFirst` false at a plain wall) would fail on the old read (the probe's old expression is true on that mask).
  The test does use real Havok (bundled WASM, `HavokPlugin`, a stepped scene).
- Aside (pre-existing, out of scope): the level's child boxes keep the default filter (all bits), so the level's static
  geometry is a member of every group, the armour bit included. A ray on a mask without `G.STATIC` (for example
  `G.GLASS` alone) still hits plain walls. Harmless for this fix (armour is now the body mark); worth knowing for future
  mask work.

## 2. Is every armoured thing marked
| Source | Built by | Marked |
| --- | --- | --- |
| Armoured panes (S4 arm-noc, `b.glass(..., { armoured: true })`) | `LevelBuilder.buildGlass` (one body per kind x armour) | yes |
| Armoured door leaves (S4 arm-mantrap; S5 arm-front `campusS5.ts:444`, arm-ante `:512`) | `Doors.addBody` (only door body builder; re-added on every close) | yes |
| Bulletproof cameras (E8, S4 / S5 / Marlow) | `SecuritySystem.shotRay` geometric housing test, no physics body, no armour bit | not needed, unaffected |
| Enforcer riot shield (S12 / S13) | `gearParts.ts` render part; armour / helmets via hit parts | not physics armour, unaffected |
| Breakables, fences, props, hitboxes | `G.STATIC` / `G.FENCE` / `G.PROP` / hitbox bits, never the armour bit | n/a |

No other `new PhysicsBody` in `src` sets `G.GLASS_ARMOURED`; no code reads hit-shape filter bits any more
(`grep "shape ?? \| r.shape\|shape?.filter"` empty). `RayHit.armoured` readers: `impactFx`, `PlayerWeapons` penetration.
Nothing loses armour.

## 3. Penetration side effect: a real restoration
- Pre-E10 `playerWeapons.ts`: "penetration: through thin world geometry", gated only on `!target && !prop`.
- E10 (4c8ad94c, 2026-10-23 12:43) added `!h.armoured` and the shape-bits read in the same commit. E10's spec
  (`docs/sector-redesign/BRIEF.md` A-E10-2/3, `checks/e10-armour.md`) stops penetration on armour only; it says a plain
  0.1 leaf is penetrable. `git log -S` shows the shape-bits read exists only from 4c8ad94c; Babylon 9.29 / Havok 1.3.14
  unchanged since before it, so the -1 readback was latent from E10's first day (no Havok change), and S16 (7ba485e9)
  made the AI read it.
- So since E10 player rounds never penetrated plain level walls, and (not in the triage report) every plain-wall impact
  took the armour look: sparks only, no dust, chip or decal (`impactFx`). The fix restores both.
- No unit test or e2e asserts no penetration or no decal at a plain wall (grep of `tests/` and `scripts/` for
  penetrat / armoured / decal). Co-op: host LOS for client hits is `MASK.HOST_LOS` (was `G.STATIC` before), so a
  penetration hit in co-op was already rejected before E10; unchanged by this fix.

## 4. Hot path and lifetime
- `isArmouredBody`: null checks + `WeakSet.has`, no allocation; `markArmoured` runs at build time only.
- Marks follow body objects: `Doors.removeBody` disposes, `addBody` builds and marks a new body each close; a level
  reload rebuilds the glass bodies through `buildGlass` (marked again); the `WeakSet` drops disposed bodies. No pooled
  armoured body. Host and client both build the same map, so both mark.

## Tests run (laptop, agent)
- `npx vitest run tests/armourFireStatic.test.ts`: 3/3 pass.
- `npx vitest run tests/armourFire.test.ts`: 9/9 pass.
- `npx vitest run tests/armourFireWiring.test.ts tests/armour.test.ts`: 22/22 pass.
- Havok probe (temporary test file, removed; working tree clean after).
- No e2e (rule).

## Notes
- The static test's third case is a source-text check (exact strings in `levelBuilder.ts` / `doors.ts`); it will need
  updating on any rewording. Acceptable as a wiring guard.
- The triage report's side-effect line should also mention the restored plain-wall impact dust / decals.
