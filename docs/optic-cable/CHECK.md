# Optic cable - checker (spare job 15)

Verdict: **PASS**

Reviewed `git diff f16600f5...HEAD` at head 50cc944a (branch feature/optic-cable) against ct-toolkit 3.2, G97 and the
CLAUDE.md hard rules. Read-only review; no source changes.

## Hard rules
- Gameplay never reads graphics state: the gap check is `ballistics.hitDistance(..., MASK.WORLD)` (physics ray,
  `src/game/opticSystem.ts:70`); the tip is placed from the door anchor (`opticPlace`). The camera write in
  `frameUpdate` also sets `cam.gamePos` / `cam.forward`, the same precedent as the sticky cam (`gadgetSystem.ts:617`);
  only the ping reads it. OK.
- Light parity: the body is a real crouched, still body (override `crouch`, `noise: 'crouched'`); no light or tip body. OK.
- Hot path: `fixedUpdate` / `frameUpdate` / `look` allocate nothing (members `a`, `b`, `dir`, `ov`, `place` reused). OK.
- Babylon only through `src/core/babylon.ts`; `player/opticCable.ts` and `config/tools.ts` are Babylon-free with tests. OK.
- `src/net` untouched; the view is local, the body replicates as an ordinary crouch. Host sim / partner / client
  paths unchanged. OK.
- Exits: hurt, door target != 0, death, a foreign controller override all abort to retract; respawn and studio
  teleport call `optic.reset()` (same two places as `doorPeek.reset()`); the override is cleared whenever the core is
  idle; the shoulder camera rewrites position / rotation / fov / minZ every frame, so the view restores the frame the
  core leaves `view`. Pause (co-op sim runs on): the view holds, no lock. Look is zeroed only while active. OK.
- Old DoorOpt flow: only the `optic` case changed (`gameState.ts` door pick); open / stealth / bash untouched;
  `doorMenuCandidate` and `aside` gain `optic.active`. OK.

## Required fixes
None.

## Polish / open list
1. `Door.seal` (`src/world/anchors.ts:125`) is never read from map files (no `seal` tag parsing); only scripts set it.
2. Gap check is one ray at tip height + pad, not the spec's sphere cast under the leaf (`opticSystem.ts:59-70`);
   `Math.sqrt` at `opticSystem.ts:63` could be `hyp2` (pick-time only, not a hot path).
3. No camera ease back on retract (snaps to the shoulder camera); no feed vignette beyond `post.setFeed`.
4. Partner sees a plain crouch (no MoveState `optic` mode / kneel-over-the-wire pose: wire change, open).
5. Hatches, panels, grilles (map tag `optic`) not built.
6. Exit does not `input.releaseAll()` (sticky cam does): leaving with S held keeps walking back after the 0.6 s retract.

## Tests (one at a time)
- `npx vitest run tests/opticCable.test.ts`: 12 passed
- `npx vitest run tests/doorMenu.test.ts`: 3 passed
- `npx vitest run tests/anchors.test.ts`: 18 passed
- `npx vitest run tests/doors.test.ts`: 9 passed
- `npx tsc --noEmit -p .`: clean
- eslint on `src/game/opticSystem.ts`, `src/player/opticCable.ts`, `src/config/tools.ts`: clean
- e2e not rerun (brief: e2e-stealth-ai passed with E2E_GPU=1 on 50cc944a).
