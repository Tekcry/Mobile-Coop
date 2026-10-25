# Menu notes - slice 4b (M1: tactical shot mock-ups)

Branch `feature/menu-notes`, 2026-10-19. Prototype effort. A mock-up for Michael to pick from: nothing here is in the
live menu. The first view (T1 / T2 goggle close-up, slice 4a) is unchanged.

Michael (M1): "Can you mock up new tactical shots for the main menu."

## The sheet
`docs/menu-notes/shots/sheet-s4b-candidates.png` (2 x 4, labelled), single frames `docs/menu-notes/shots/s4b-X1.png` ..
`s4b-X8.png`. GPU (ANGLE D3D11, `E2E_GPU=1`), `gfx=high`, the hero LOD, the Blender weapons, 1920 x 1080, the real 4.7.0
main menu over it, each frozen mid-pass (`menuT=0.5`).

| Id | Shot | Pose (rig's own inputs) | Set pieces | View |
| --- | --- | --- | --- | --- |
| X1 | Crouched at a corner, rifle low, the light spilling round the wall edge | crouch 1, rifle low ready | dark wall on her right, edge just ahead | Fair: reads as cover; torso hunched, legs lost in the dark |
| X2 | Back to a wall, rifle in hands, raking light on the wall | wall stance (`wall`, side 1), rifle | wall behind her | Weak: reads as standing; the wall shows only as a lit curve |
| X3 | Low ready in a doorway, silhouetted against a lit room | rifle low ready | door frame, side walls, a self-lit room behind | Good: clear, original, CT mood |
| X4 | Goggle in near-profile, head and shoulders, rimmed from behind | rifle low ready (out of frame) | none | Good: strong goggle accent; the face is masked (mannequin-ish) |
| X5 | On the sights: rifle shouldered, aiming into the dark | aim 1 (shouldered on the aim line) | none | Best: reads instantly as tactical; the gun runs under the menu list |
| X6 | Crouched at the edge of an overhead light pool | crouch 1, rifle low ready | dark floor, a faint visible beam | Good: light-and-shadow pillar; she is small and mostly goggles |
| X7 | Full figure, rifle at high ready, against a lit doorway | carry high | a self-lit doorway far behind | Good: clean silhouette; the doorway glow shows the spot's round falloff |
| X8 | Over her left shoulder, pistol ready, a lit doorway ahead | pistol compressed ready | a self-lit doorway far ahead | Weak: the rifle on her back mount fills the frame, no pistol or goggle seen |

Dropped during iteration: a magazine check (a frozen `reload` moment). The support hand hung open above the receiver,
not on a magazine, so it failed the believable-hand rule; X5 (on the sights) took its slot.

## How it works
- `src/world/menuPoses.ts`: `MenuPoseExtra` (crouch, wall, lean, look, a frozen reload / check moment, carry and aim
  overrides), applied by `applyMenuPose(out, hold, t, extra?)`. Every field resets when absent, so a live shot after a
  candidate is the plain standing idle (tested). Only the rig's existing `RigPose` inputs: no shared clip, graph or
  rig file changed. The rig's one-knee kneel is off in `POSTURE` (CT has none), so "kneeling" is its two-foot squat.
- `src/world/menuSets.ts`: `HeroShot.pose` and `HeroShot.props`, `MenuProp` (a dark box, optionally self-lit, or a
  visible beam of one of the shot's lights) and `CANDIDATE_HERO_SHOTS` X1-X8 (camera pass, lens, lights, as the other
  hero shots).
- `src/world/menuShots.ts`: `CANDIDATES` (ShotDefs with no context). The director never puts them in a cycle; only
  `?menuShot=X1` etc. finds them (after `SHOTS`).
- `src/world/menuScene.ts`: registers the candidate sets; builds a candidate's props the first time it shows (debug path
  only) and enables only the active set's props; a wall shot holds the body still (no yaw sway).
- `scripts/menu-shots6.mjs`: X1-X8 in its list.

View one live: `http://127.0.0.1:4189/?menuShot=X5&gfx=high` (add `&menuT=0.5` to freeze).

## Promote a pick into the deck
1. Move its row from `CANDIDATES` into `SHOTS` (`src/world/menuShots.ts`) with `contexts: ['main']`.
2. Move its hero shot from `CANDIDATE_HERO_SHOTS` into `HERO_SHOTS` (`src/world/menuSets.ts`). If it has `props`,
   build them once at menu start (today they build lazily on first show, fine for a debug path, a small hitch in the
   live cycle): move `buildProps` calls into the constructor.
3. Update the deck count in `tests/menuShots.test.ts` / `tests/menuPoses.test.ts` (the deck test counts SHOTS; the
   pose test wants every HERO_SHOTS hold known).
4. Polish before it ships: X1 legs and wall read, X2 needs a real wall-stance arm pose, X7 / X3 room panels want a soft
   gradient instead of the spot's hard round falloff, X8 needs the back-mounted rifle out of the lens or a new angle.
   Unpicked candidates can stay as debug shots or be deleted with their rows.

## Files
- Changed: `src/world/menuPoses.ts`, `src/world/menuSets.ts`, `src/world/menuShots.ts`, `src/world/menuScene.ts`,
  `scripts/menu-shots6.mjs`, `tests/menuShots.test.ts` (one test: candidates out of the deck, forceable, pose reset).
- New: this file, `docs/menu-notes/shots/s4b-X1..X8.png`, `docs/menu-notes/shots/sheet-s4b-candidates.png`.
- Not touched: CT Core's files (`animGraph.ts`, `actions.ts`, `traverse.ts`, `attachController.ts`, `remoteAvatar.ts`),
  `characterRig.ts`, the screens.
- `tests/__snapshots__/visionIsolation.test.ts.snap` may show as modified (line endings only, as before): not mine.

## Results
- 4 GPU passes (desktop `heavy.lock` taken and released each time, port 4189 freed after each).
- `npm run check`: pass. Lint 0 errors / 41 warnings (the existing script `no-console`), 161 files, 1800 passed /
  1 skipped, build ok.
- Not run: e2e (the live menu is unchanged; only debug-param shots were added).

## What Michael should look at
The sheet. Pick any number of X1-X8 (or none); only the picks get built into the deck and polished.
