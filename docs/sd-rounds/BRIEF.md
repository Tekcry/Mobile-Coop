# sd-rounds - limited suppressor ammo

Branch `feature/sd-rounds`, base origin/master 8e5dbd83 (4.70.0). Brief: `scratch/ctcore/briefs/spare-7-sd-rounds.md`.

## Michael's words
ROADMAP Decided "Stealth over shooting" (2026-10-23 ~10:10): "(7) gunfire alerts the section, limited suppressor ammo,
scarcer ammo later". Theme: "reward stealth over shooting as sections get harder". Not this job: "gunfire alerts the
section" (guard-ai, `src/ai`) and "scarcer ammo later" (sector-redesign map data).

## Goal
A limited count of quiet rounds per suppressed gun. At 0 the gun is loud. No wire change (PROTOCOL_VERSION stays 31), no save change.

## Assumed decisions
- A1 "Suppressor ammo" = a limited count of quiet (subsonic) rounds per suppressed gun, separate from the magazine. Each
  suppressed shot spends one; at 0 the gun still fires but LOUD (its open noise), so guard-ai's section alert applies.
  Undo: `SD_ROUNDS` entries to `Infinity` (or delete the table) - every gun quiet for ever as before.
- A2 Starting values: rifle 60, pistolSd 45 quiet rounds; spent noise stat rifle 1.0 (28 m), pistolSd 0.8 (22.4 m).
  Undo: the constants in `src/weapons/sdRounds.ts`.
- A3 Ammo pickups (`addAmmo(fraction)`) restore quiet rounds at the same fraction of the start count, capped at the start
  count (not 2x like reserve). Undo: drop the `addSd` call in `addAmmo`.
- A4 HUD: "SD n" in the weapon box's extra row, red at 5 or fewer; hidden for an open gun or infinite ammo. A one-off
  warn feed line "Suppressed rounds out: shots are loud" when the count reaches 0. Undo: remove the span / the hook.
- A5 A section checkpoint restart restores the count with the rest of the loadout (LoadoutSnapshot). No save change, no
  wire change (PF.quiet already carries quiet / loud per shot).
- A6 (builder) `addSd` is also a no-op when the slot's own `sd` is not finite (an unlimited slot stays unlimited), matching
  the brief's test "sd Infinity unchanged" for a gun that has a finite start count. Undo: drop the `isFinite(s.sd)` guard.
