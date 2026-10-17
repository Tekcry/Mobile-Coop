# Step 11 - shot-director (Block C)
A pure, Babylon-free director for the cinematic menu background (SPEC 8.1-8.3, MD15). Deps: 10. Model: Opus 5.5 /
Opus 5.5. Local only.

## Read
- SPEC.md 8 (all), 6 (reduced motion); DECISIONS MD15, MD17; FINDINGS.md "What reads best".
- `src/world/menuScene.ts` (`MenuState`, framings, sway, `update`), `docs/systems/conventions.md` hot-path rules.

## Task
1. `src/world/menuShots.ts` (no Babylon import): `ShotDef { id, setup, durS, move: { kind: 'push'|'dolly'|'tilt'|
   'crane'|'static', amount }, light?: string, phone: boolean, solo: boolean }`, the table S1-S7 from SPEC 8.1.
2. `createDirector({ shots, seed, phone, reducedMotion, context: 'title'|'main'|'loadout'|'lobby' })` returns an
   object with `update(dtS)` and readable fields `shot`, `t` (0-1), `fade` (0-1 crossfade alpha), `next`. No
   allocation in `update`.
3. Order: S1 first on title and main, then a seeded shuffle of the context's shots without immediate repeats; 1.6 s
   crossfade inside the outgoing shot's last 1.6 s; a 0.4 s cut to black when `light` differs. Loadout = S6 only,
   lobby = S7 only, title = S1 only.
4. Reduced motion: one static hold of the first shot, `t` fixed at 0, never changes.
5. Phone: only shots with `phone: true` (S1, S2; S6 for loadout; S7 lobby).
6. Debug hooks parsed in `menuScene.ts` (not applied yet): `?menuShot=<id>` forces a shot; `?menuClock=fast` runs
   the director at 8x.

## Tests
- `tests/menuShots.test.ts`: deterministic sequence for a seed; S1 first; no immediate repeats across 50 shots;
  durations within 10-16 s; fade windows; cut-to-black when light differs; reduced motion static; phone filtering;
  `update` performs no allocation (measure with a tight loop and `process.memoryUsage` delta below a small bound).

## Checks
- `npm run check`; `npm test -- menuShots`.

## Commit
"menu-ui 11: pure shot director for the cinematic menu background"
Then LOG, STATE, CHANGELOG, docs/systems/world-and-characters.md (menu stage section).
