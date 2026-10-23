# E5 - EW9 alarm-stage extras (engine + data shape)

Branch feature/sector-redesign-e5 (from 95097957). Engine, data shape and tests only: no map data, no campus files,
no `src/ai` behaviour, no protocol change.

## Data shape
`SectorDef.stageActions?: readonly SectorStageAction[]` (`src/game/sectorStage.ts`), one entry per stage:

| Field | Meaning |
| --- | --- |
| `stage: 1 \| 2 \| 3` | the alarm stage that sets it off (`STAGE_MAX` = `SECTOR.alarmMax`) |
| `lightsFull?: number[]` | light groups forced on (`LightRegistry.setGroup(g, true)`; shot lamps stay out) |
| `lockDoors?: [x, z][]` | lockdown doors by doorway centre (`Doors.nearest` 1.2 m): shut, locked, and shut on the guards' nav grid (bolt-sized closure) |
| `responseRoute?: [x, z][]` | 2+ points: that stage's reinforcements spawn at point 0 (instead of `reinforce`) with the route as their patrol |
| `releaseDogs?: boolean` | stub: sets `SectorStageRun.dogsReleased`; the release behaviour is guard-ai's |

Paste-ready (S2, SPEC: bridge card door locks at stage 2, NE stair roof route open; positions are placeholders):
```ts
stageActions: [
  { stage: 1, lightsFull: [3, 4] },
  { stage: 2, lockDoors: [[12.0, -41.5]], responseRoute: [[30, -60], [22, -52], [14, -44]] },
  { stage: 3, releaseDogs: true },
],
```
S5 response team: `{ stage: 1, responseRoute: [[controlX, controlZ], ...] }` (stage 1 spawns from the control room).

## Checks
- `checkSectors(defs, nav?)` now also runs `checkStageActions`: stage 1..3, one entry per stage, route 2+ points,
  groups >= 0, no lockdown door within 1.2 m of a connector near / far / seal door (this or the previous section's) or
  a team door.
- With `nav = { nav: NavGrid, doorAt }` (`doorFinder(lay anchors.doors)` builds `doorAt`): every lockdown door must be
  found, and with ALL the section's lockdown doors shut, start -> objective, previous checkpoint -> objective and
  objective -> exit centre must keep a nav path wherever one exists unlocked. Closures are opened again after.
  Map tests call it with their analytic nav (as campusS1.test builds).

## Runtime (`src/game/modes/sectorMode.ts`, small hunks)
- `start`: `findStageDoors` builds `SectorStageRun` (doors found once, nav closures on `g.nav`, host / solo).
- `raised`: on a stage rise, `stageActions(from, stage)`; reinforcement slots come from `reinforceSlot` (same slot as
  before when there is no route; `reinforced` counts slots queued).
- `beginSection`: actions for stages 0..`run.alarm` (the carried stage) apply before the start state is taken.
- `unloadSection` (cycle and restart): `release()` unlocks every lockdown door and opens its nav closure.
- Restart (A50): release -> `startState.apply` puts lamps back -> `beginSection` reapplies the start stage's actions.
- Co-op: lights move the registry version (slice L lamp sync); locks reach the client in `lk` (`secT = 0` on change).
- `debug().lockdown`: lockdown doors locked now.

## Assumptions
- S1 A section entered at stage N starts with the actions of stages 1..N (S2 entered at stage 2 starts locked down).
  Undo: drop the `stageActions(0, this.run.alarm)` line in `beginSection`.
- S2 The engine has no alarm decay (`run.alarm` only rises until a restart), so lockdown doors stay locked until the
  restart or the section unloads; the softlock check guarantees another way.
- S3 Reinforcements stay alerted (they hunt first); the response route is their spawn point and patrol (walked once
  they calm). Following the route while alerted is guard-ai's (GA6).
- S4 The softlock check is the guards' nav grid: a leg with no nav path even unlocked (a climb) is not judged; all of a
  section's lockdown doors are shut together (the worst case).
- S5 `lightsFull` does not relight shot lamps or end a jam early (setGroup's rules).

## Tests
- New `tests/sectorStageActions.test.ts` (11): data checks, nav softlock reject / pass, lights forced on at the stage,
  lockdown door shut + nav closed, missing door, dogs stub, response route on the slots (and the mode's spawner hands
  `route` to `setPatrol`), restart undo, carried-stage restart, Warehouse Ops unchanged.
- `npx tsc --noEmit -p .` clean; vitest sectorStageActions + sectors + sectorRestart + sectorSlice0 + navClosure:
  5 files, 58 passed; eslint on the 4 changed files clean. No e2e, no build.

## Files
- new `src/game/sectorStage.ts`, `tests/sectorStageActions.test.ts`, this report
- `src/game/sectors.ts` (field, `checkSectors` optional `nav`), `src/game/modes/sectorMode.ts`
- `changes/feature-sector-redesign.md` (one line)
