# Piano GA4 - GuardActor: report
Owner: Night Shift | Guard AI Build. Status: built, not merged (no PR opened, as asked).

Branch `feature/guard-ai-piano-actor`. Code head `1669395f9` (this report is the one commit on top of it).
Commits: `b6fac4b9d` path module + tests, `84f48ab4f` GuardActor + Vfx flash life + tests, `1669395f9` changelog.

## Files
| File | Lines | What |
| --- | --- | --- |
| `src/ai/guardActorPath.ts` | 106 | Pure, Babylon-free path: measure once, sample by distance, no allocation per call |
| `src/ai/guardActor.ts` | 297 | The actor (Babylon through `src/core/babylon.ts` only) |
| `src/vfx/vfx.ts` | +7 / -3 | `muzzleFlash(pos, size, life = 0.05)`; one shared flash `Color4` (was a new one per shot) |
| `tests/guardActorPath.test.ts` | 90 | 8 tests |
| `tests/guardActor.test.ts` | 210 | 9 tests (NullEngine) |
| `changes/feature-guard-ai-piano-actor.md` | 3 | `kind: patch`, one line |

`src/ai/enemy.ts` is untouched (nothing needed exporting). `docs/INDEX.md` lists `ai/` as one folder row, no single
files, so no line was added (per the brief's "if").

## API (Campaign codes against this)
```ts
// src/ai/guardActorPath.ts
interface ActorPath { readonly pts: readonly number[]; readonly n: number; readonly cum: Float64Array; readonly heading: Float64Array; readonly length: number }
interface PathSample { x: number; z: number; heading: number } // heading: yaw, 0 = +Z, atan2(dx, dz)
function emptyPathSample(): PathSample;
function actorPath(pts: readonly number[]): ActorPath;          // flat x0, z0, x1, z1, ...; throws on empty / odd / non-finite
function pathLength(path: ActorPath): number;
function sample(path: ActorPath, dist: number, out: PathSample): PathSample; // clamps to the ends; returns out

// src/ai/guardActor.ts
interface GuardActorOpts {
  speed?: number;                               // m/s, default def.walkSpeed (grunt 0.9)
  rate?: number;                                // playback rate, default 1
  yaw?: number;                                 // start facing, default the first leg's heading
  y?: number;                                   // fixed ground y, default 0 (with nav: the heightAt hint)
  nav?: Pick<NavGrid, 'heightAt'> | null;       // follow the nav height as a guard does
  vfx?: Pick<Vfx, 'muzzleFlash'> | null;        // muzzle flash on fire (null: none)
  look?: number;                                // guard figure look seed (GuardBody.setLook), default 0
  name?: string;                                // mesh name prefix, default actor-<n>
}
class GuardActor {
  constructor(scene: Scene, world: World, def: EnemyDef, path: readonly number[], opts?: GuardActorOpts);
  readonly def: EnemyDef;
  get done(): boolean;            // reached the end and stopped (idles aimed)
  get pos(): Readonly<Vector3>;   // feet, world
  get yaw(): number;
  get travelled(): number;        // m along the path
  get length(): number;           // path length
  get playRate(): number;
  get isDisposed(): boolean;
  setRate(r: number): void;       // 0.3 intro, 1 after; 0 holds the pose
  aimAt(x: number, y: number, z: number): void;  // held while walking and standing
  step(dt: number): void;         // real seconds; advances dt * rate of his own time
  fire(): boolean;                // false while not re-armed (60 / rpm of his own time) or no gun
  muzzle(out: Vector3): Vector3;  // the drawn gun's muzzle (WeaponModel.muzzleWorld): tracer origin
  dispose(): void;
}
```
Campaign wiring sketch: build the four at intro start with `rate: 0.3`, `vfx: gameState.vfx`, `aimAt` the players; call
`step(realDt)` per render frame; call `fire()` on the shot timetable and draw the tracer from `muzzle(out)`; at the
EMP, `dispose()` them and spawn the real guards on their spots.

## How it moves
- Look: `buildEnemyRig` (rig, merged gun, guard figure behind `flags.guardModels`, the same `world.addShadowCaster`
  registration). The rig is posed as `Enemy.frame` poses a drawn, firing guard: `aim = GUARD_AIM.fire` (1), the kick
  after a shot (falls at 8/s of his time), `ready = false`, `swap = -1`, gait phase / motion state / accel from the
  driver, `stride: 'velocity'`. The rig solves every frame (`rig.animate(t, rp, t)`, no anim tier: a few cinematic
  actors).
- Walk: a `MotionDriver` stepped with `aiming = true`, `ENEMY_MOTION`, as `Enemy.move` does with a face yaw: the yaw
  is the aim point's (strafe-locked), else the travel heading. The desired velocity is the path heading times the pace;
  the distance along the path advances by the driver's root speed (its weighted start, stride swell and stop), and the
  pose reads that speed along the path heading.
- Stop: the pace eases down as `sqrt(2 * 1.0 * remaining)` (1.0 m/s^2 = half `ENEMY_MOTION.decelMax`), zero inside
  3 cm of the end, so the driver's own stop lands on the end point; `done` once within 3 cm and the driver is below
  0.02 m/s. Measured: ends within 5 cm of the end point (test bound).
- Fire: `fireT = 60 / rpm` of his own time (grunt: 0.143 s; 0.476 s real at 0.3x); the flash is `Vfx.muzzleFlash` at
  the gun muzzle, size 0.2 (0.3 heavy) as `Enemy.shoot`, life `0.05 / rate` (rate floored at 0.05 for the life).
- Not a guard: no `EnemyManager`, no hit volumes, perception, hearing, occupancy, nav cells, wire, score, barks or
  alarms. Nothing on the wire; each machine builds its own.
- Hot path: `step`, `fire`, `muzzle` allocate nothing (scratch fields, `hyp2`, indexed loops; `sample` writes the
  caller's object). `rig.animate` is the guards' own per-frame path.

## Tests (all pass)
- `npx vitest run tests/guardActorPath.test.ts`: 8 - length, start (and before it), mid-leg, a corner, past the end,
  one-point path, repeated points (no NaN heading), writes into the caller object / rejects bad data.
- `npx vitest run tests/guardActor.test.ts`: 9 - constructs from a grunt def (casters registered, on the first point,
  muzzle at chest height ahead); fixed y and nav height; rate 0.3 covers 0.28-0.32x the distance of rate 1 over the same
  real 3 s at cruise, the same actor time gives the same walk within 3%, `setRate(1)` takes at once; stops on the end
  of an L path at 0.3x with `done` and stays put, facing the aim point within 0.1 rad; one-point path is done at once
  and holds its yaw; `fire` re-arm in his own time at rate 1 and 0.3 and the flash life; the real `Vfx` flash lasts
  0.05 s at rate 1 and ~0.17 s at 0.3; `dispose` leaves the scene's mesh and node counts as before and every caster it
  registered disposed; source check: no `src/net` import, no `EnemyManager`, no `Math.hypot`, no direct `@babylonjs`
  import, the path module imports nothing.
- Also run: `tests/levelLitMaterial.test.ts` (builds a real `Vfx`), `tests/changesFragments.test.ts`. `npm run
  typecheck:fast` clean.

## Assumptions (A entries)
- **A1 Height:** fixed `y` (default 0) unless the caller passes `nav` (`heightAt`, followed as `Enemy.move` does).
  World has no nav of its own (the NavGrid lives in GameState), so the brief's "from world nav" became an option.
  Undo: make `nav` required and drop `y`.
- **A2 Extra options** beyond the brief's three: `y`, `nav`, `vfx`, `look`, `name` (the flash needs a `Vfx`; the
  figure needs a look seed). Undo: remove them from `GuardActorOpts`.
- **A3 Rifle raised at build:** the constructor runs 30 pose frames (0.5 s at 60 Hz, build time) so the first frame
  drawn has the rifle up instead of rising over his first half second. Undo: `SETTLE_FRAMES = 1`.
- **A4 `Vfx.muzzleFlash` life parameter:** added to `src/vfx/vfx.ts` (default 0.05 s: every existing caller
  unchanged) so the flash plays at the actor's rate; the per-shot `new Color4` became one shared constant (same
  colour; the instance buffer copies it at render) so `fire` allocates nothing. Undo: revert the vfx.ts hunk and drop
  the third argument in `GuardActor.fire`.
- **A5 Stop profile:** 1.0 m/s^2 ease-down and a 3 cm arrive band (constants `STOP_DECEL`, `ARRIVE` at the top of
  guardActor.ts). Undo / tune: those two constants.
- **A6 Extra getters** `travelled`, `length`, `playRate`, `yaw`, `isDisposed` (tests and Campaign's timing). Harmless
  to drop.
- **A7 Dog:** the constructor throws for a quadruped def (no dog body in the actor). Melee kinds build but never fire.

## Open items
- Not checked on the GPU: the walk, aimed upper body, feet and stop are the real guard's code paths, but nobody has
  watched an actor in a render. Campaign's S2 swap is the first visual check (a GPU look shot of the four actors at
  0.3x would settle it).
- `flags.guardModels` on (the guard figure) is not covered by the NullEngine test (it needs the GLB mocks of
  `guardLampCasters.test.ts`); the figure is built and disposed through the same `buildEnemyRig` / `GuardBody.dispose`
  as a guard's.
- Corners are taken as the polyline turns (the pace dips through the driver's lag); no corner rounding. Intro paths
  with sharp turns may want an extra point or two.
- No PR opened (as asked). Nothing on master calls GuardActor yet; no flag needed.
