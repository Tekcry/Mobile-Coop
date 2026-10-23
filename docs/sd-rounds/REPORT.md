# sd-rounds report (spare job 7, limited suppressor ammo)

## What
Suppressed guns (rifle, Hush 9 SD) carry a limited count of quiet rounds (rifle 60, pistol 45), separate from the magazine.
Each suppressed shot spends one. At 0 the gun still fires but loud: open audio bank, full flash, noise from `sdOpenNoise`
(rifle 1.0 = 28 m, pistol 0.8 = 22.4 m), so guards and guard-ai's section alert hear it. Ammo pickups refill quiet rounds
(capped at the start count), a checkpoint restart restores them, infinite ammo never spends them. HUD shows "SD n" (red at 5
or fewer, hidden for an open gun) and a one-off warn feed line at 0. Co-op: PF.quiet already carries quiet / loud, no
protocol change (stays 31), no save change.

## Why
ROADMAP Decided "Stealth over shooting" (2026-10-23): limited suppressor ammo. Assumed decisions A1-A5 and their undo are in
BRIEF.md.

## Files
New: `src/weapons/sdRounds.ts`, `tests/sdRounds.test.ts`, `docs/sd-rounds/{BRIEF,REPORT}.md`, `changes/feature-sd-rounds.md`.
Edited: `src/weapons/playerWeapons.ts` (one `sd` field on WeaponSlot, hooks, lastShotNoise / lastShotQuiet),
`src/weapons/loadoutSnapshot.ts`, `src/game/gameState.ts`, `src/audio/gameAudio.ts`, `src/net/netShared.ts`,
`src/net/coopHost.ts`, `src/ui/hud/hud.ts`, `src/styles.css`, `tests/sectorRestart.test.ts`, `scripts/e2e-weapon-audio.mjs`,
`docs/systems/combat.md`, `TESTING.md`.

## Tests (desktop, 2026-10-23)
- vitest sdRounds + sectorRestart + weapons + missions: 4 files, 40 tests pass (15 s).
- `tsc --noEmit -p .`: clean (52 s). eslint on changed ts files: clean (38 s; the .mjs is ignored by config).
- `npm run build`: 220 s.
- e2e-combat (GPU, 4192, JOBS=1): ok 13 s.
- e2e-weapon-audio: ok 32 s, including the new quiet-round asserts (60 -> 57 spent, spent gun is open and heard at 28 m).
  The suite was already failing on master at "a reload plays the handling": the reload is X held 0.4 s since anim-rework S1,
  not A. Fixed in the script (X hold; the first X down after the shots is not read as a hold, so it is held twice). No assert
  loosened.

## Open items
- guard-ai item 7 may later edit gameState onShot; this job's hunk there is the one `n` line + hook. PR #208 also touches
  WeaponSlot in playerWeapons.ts: expect a trivial merge there (one added line).
- Why the first X hold after fire is ignored in the e2e was not investigated (real play unaffected as far as seen).

## Changelog
changes/feature-sd-rounds.md: "Limited suppressor ammo".
