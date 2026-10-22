# partner-seed report

## What
A co-op partner rig first seen walking slower than about 0.3 m/s (60 Hz; 1.2 m/s at 240 Hz) played a start one-shot with
the mocap switch on, because `RemoteAvatar` eased its speed up from 0. Now, on the first placement and after a shown
teleport (jump over SNAP_MIN 2 m and faster than SNAP_SPEED 25 m/s), the eased speed is seeded from the owner's
MoveState speed (clamped 0..12) and the stride heading from the from->to direction of the sample. No wire change.

## Files
- `src/net/remoteSeed.ts` (new, pure): `easeRemoteSpeed`, `isShownTeleport`, `seedHeading`, `REMOTE_SPEED_MAX`.
- `src/net/remoteAvatar.ts`: `justPlaced` flag, reseed in the speed / heading block of `update`.
- `tests/remoteAvatarSeed.test.ts` (8 tests), `changes/feature-partner-seed.md`.

## Tests
- vitest tests/remoteAvatarSeed.test.ts: 8 passed. tsc --noEmit and eslint on the changed files: clean.
- The unit test drives the pure helpers off a SnapshotBuffer; no test builds a full RemoteAvatar (needs a World).
- e2e-coop / e2e-netmove (E2E_GPU=1, laptop, Character Build, 5fa702d2 with master 4.68.0): e2e-coop ok 95 s, e2e-netmove ok 179 s (max joint error 7.6 cm, drawn 0.5 cm).

## Open items
- Seeding only applies when a MoveState is present; a state with no `mv` keeps the old ease from 0.

## Changelog line
Partner rig first seen walking slowly no longer plays a start one-shot: its eased speed and stride heading are seeded
from the first state and after a teleport.
