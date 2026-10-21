# anim-gear - brief (marlow-bays item 22, track B)

Job lead: Night Shift | CT Core Build. Branch `feature/anim-gear` in `C:/NightShift/Mobile-Coop-anim-gear`, cut from
`feature/anim-joints` 9c083d60 (J2, PR #90, not merged yet: it builds on J2's row tables). Master is merged in once #90
lands. Its own PR.

## The ask (marlow-bays BRIEF item 22, Michael ~17:30, "Are any of these cheap/fast additions?", he chose all four)
"Gear offsets (track B, after J2): sliders that move worn gear (holster, pouches, sling, the gun on her back, goggles)
per socket, per state where useful, baked into the base table; the partner sees them. Fixes clipping without a model
change."

## Routing (orchestrator)
- Holster (`rig.thighMount`, data `WREN_HOLSTER`), the gun on her back (`rig.backMount`, `WREN_BACK_MOUNT`, slots
  backL / backC / backR) and the sling (`rig.slingBack` / `rig.slingHip` nodes, `WREN_SLING`): applied in
  `src/player/characterRig.ts` where the rig reads them; no `src/operators` edit.
- Grenade pouches: `src/weapons/carrySlots.ts` (`GRENADE_POUCHES`) is ours for this; minimal, named in the PR body.
- Goggles: NOT in this PR. Track C's hook (`GOGGLE_OFFSET` / `setGoggleOffset` in `src/operators/runtime/goggle.ts`,
  read per rig by `CharacterRig.goggleFrame()` inside the animate window) reaches master with T3; worn goggles only
  (LOD1 / LOD2 move the lens only; no stowed vertices yet). A small follow-up after T3.

## Assumed decisions (Michael asleep: best judgement, undo by telling the orchestrator)
- G-A1: A tuner section "Gear" (registry, so track A's panel shows it): one group per socket (`gear.holster`,
  `gear.backL`, `gear.backC`, `gear.backR`, `gear.slingBack`, `gear.slingHip`, `gear.pouches`), sliders x / y / z (m,
  the socket's own frame) and pitch / yaw / roll (deg), identity 0. "Per state where useful": a crouched variant per
  socket (`gear.<socket>.crouch`, applied over the standing one by the rig's crouch amount), since the thigh and the
  belt fold when crouched; no per-state rows beyond that.
- G-A2: They bake into the base table `src/anim/animBase.ts` under a new key `gear` (keyed by socket id and param id;
  offsets add), read by every Wren rig (the partner too), as J1 does; the tuner values are deltas on it.
- G-A3: Visual only: carry slots' gameplay (what is carried, draw times) unchanged; the weapon draw / holster hands
  follow the moved socket because they read the same mount.

## Limits
Hard rules in CLAUDE.md (no allocation per frame; gameplay never reads these). Tests: `npm run check`, named suites on
the desktop under `C:/NightShift/heavy.lock` (port 4191); the full e2e on the laptop first. Usage: check `get_usage`
before each agent; at 97% or more pause at a clean commit and tell the orchestrator.
