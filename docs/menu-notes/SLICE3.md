# Menu notes - slice 3 (notes 5 and 6)

Branch `feature/menu-notes`, 2026-10-19. Prototype effort. No GPU run in this slice (the desktop `heavy.lock` was held by
another job): every visual result below is "pending PC run".

## Michael's notes
- 5: "The hand clips the magazine in the menu idle stance."
- 6: "Bring the rifle and pistol into the main menu, with holding and idle poses."

## What I found
- **The void had no weapon in the hands.** Slice 6 holstered the loadout weapon (the rifle on the back plate mount) and
  hid it in the title / main-menu void. The hiding was leaky: `holster()` calls `setVisible(true)` after `weaponLight()`
  hid the node, and the Blender magazine is its own mesh that `renderMeshes` never listed.
- **The idle stance in the void had the arms hanging.** Wren stood with empty hands at her sides, next to the magazine
  pouches on her carrier and belt (the H3 / H4 macros). The likeliest reading of note 5 is that hanging hand against a
  magazine pouch. I could not confirm it visually (no GPU).
- **The held rifle is clean in the rig maths.** In the loadout / lobby stage hold (low ready, aim 0.05), Wren's support
  palm sits on the weapons.json foregrip under the launcher tube (weapon z 0.24) with her own solved `tube` hold. Her
  wrist, palm, knuckles and first finger joints stay 6.2 cm clear of the rifle magazine (`partBounds` mag and mag-plate,
  z 0.066-0.158). No shared grip definition needs a change, so CT Core's files are untouched.

## Decisions (undo in brackets)
- **S3-1 A weapon in her hands in every void shot.** This answers note 6, and note 5 too: no shot has a hanging hand by
  the pouches any more. Each hero shot names its `hold` (`menuSets.ts`). The other weapon goes to its carry slot.
  [Undo: delete the `hold` fields; `cinematicFrame` then holds the rifle in every shot. To get slice 6's empty hands
  back, restore `setHolstered` from git.]
- **S3-2 How the shots split** (both weapons are seen):
  - rifle at low ready, pistol in the thigh holster: T1, T2, H1, H5 (the holster shot shows the pistol in it), H6, W1;
  - pistol at low ready, rifle on the back plate mount: H2, H3, H4, so her front plate and pouches read past the gun;
  - pistol at compressed ready: W2.
- **S3-3 Two new weapon shots join the main deck**:
  - W1 shows the rifle at low ready, low from her right front on the ejection side. It arcs in along the receiver while
    the key slides down the gun.
  - W2 shows the pistol at compressed ready from her left, the lit goggle above it. It tilts and pushes down from the
    goggle to the pistol.
  - Both run 12 s, 30 degree lens. The deck is now T2 plus 8 shots. [Undo: remove W1 / W2 from `SHOTS` and `HERO_SHOTS`.]
- **S3-4 The poses are the rig's own ready positions, chosen as menu-only data** (`src/world/menuPoses.ts`): the
  `carry` weights, the weapon weight (rifle 1, pistol 0.7, as `classWeight`) and aim 0.05. The hands IK onto the
  weapons.json grips with her solved holds. The shared anim clips, `animGraph.ts` and `characterRig.ts` are unchanged.
- **S3-5 Idle sway**:
  - slice 6's slow root yaw drift stays;
  - a weapon breath is added: aim pitch with amplitude 0.014 rad (rifle) / 0.018 rad (pistol), plus a smaller second
    wave so it never reads as a loop;
  - the rig's own breathing idle runs underneath.
- **S3-6 Visibility**: the Blender meshes show in the void. Until a mesh has loaded, its proxy parts stay hidden in the
  void (they look broken in close-up). The stage shows everything as before.
- **S3-7 The stage is unchanged**: the loadout and the lobby show the loadout weapon in her hands, and the second model
  is out of sight there.
- **S3-8 The second model** is the other weapon id (`pistolSd` beside the rifle, the rifle beside a pistol primary).
  It is built with `{ mesh: true }` and no attachments. The menu has nothing that names a saved secondary.

## Files
- New: `src/world/menuPoses.ts` (pure: holds, `menuPoseInput`, `applyMenuPose`), `tests/menuPoses.test.ts`, this file.
- Changed:
  - `src/world/menuScene.ts`: the second model, `setHoldMode`, `weaponLight` rewritten, the void's pose input, and the
    debug hooks `weaponsReady` / `weaponHold`;
  - `src/world/menuSets.ts`: `hold` on `HeroShot`, holds on H2-H6, W1 and W2;
  - `src/world/menuShots.ts`: W1 and W2 in `SHOTS`;
  - `tests/menuShots.test.ts`: the deck test counts the deck (n = 8) instead of assuming 6;
  - `scripts/e2e-menus.mjs`: one regex, the main-menu shot id may be W1 / W2;
  - `scripts/menu-shots6.mjs`: W1 and W2, and it waits for the weapon meshes.
- Not touched: CT Core's files, the screens, `src/main.ts`, `src/audio/**`.
- `tests/__snapshots__/visionIsolation.test.ts.snap` shows as modified (line endings only, as in slice 6). It is not
  mine: leave it out of the commit.

## Tests
- `tests/menuPoses.test.ts` (3 tests) runs on the real rig maths (NullEngine, Wren's build, `WREN_HANDS`, holster and
  back mount, both weapons):
  - The sway stays small and smooth (under 0.1 deg per frame), and one reused input object means no allocation.
  - Every hero shot names a known hold, and the main deck shows both the long gun and the pistol in her hands.
  - For each pose (the stage loadout idle, rifle, pistol, pistolLow), over 3 s of sway:
    - the trigger palm stays within 2 cm of its grip hold point and the support palm within 2 cm of its foregrip / cup
      hold point (bible 5.12.2 weapon grip under 2 cm);
    - for the rifle, the support hand (wrist, palm, knuckles, first finger joints) stays more than 3 cm from the
      magazine bounds. Measured: 6.2 cm. This is the note 5 guard;
    - the muzzle sits where the ready position puts it. Low ready: the muzzle more than 25 cm down and forward of the
      grip. Compressed: forward, less than 34 degrees down, the grip at the chest.
- Results:
  - `npx vitest run tests/menuShots.test.ts tests/menuPoses.test.ts tests/readyHands.test.ts tests/handHold.test.ts`:
    30 passed.
  - `npm run check`: passed. Lint has 0 errors and 41 warnings, all existing `no-console` warnings in scripts. Tests:
    156 files, 1749 passed, 1 skipped. The build passed.
- Not run (the job lead's runner): `smoke`, `e2e-menus`.

## GPU contact sheets (for the job lead, desktop only, when `C:/NightShift/heavy.lock` is free)
Take the lock first. Free port 4189, then build and serve `dist/`:
```
cd /c/NightShift/Mobile-Coop-menu-notes
npm run build
node node_modules/vite/bin/vite.js preview --port 4189 --strictPort --host 127.0.0.1 &
```
1. Void hero shots, frozen mid-pass, hero LOD, high preset. They come out as `docs/menu-notes/shots/s3-*.png`:
   ```
   E2E_GPU=1 E2E_PORT=4189 SHOT_GFX=high SHOT_PREFIX=s3 node scripts/menu-shots6.mjs docs/menu-notes/shots T2,H1,H2,H3,H4,H5,H6,W1,W2
   ```
   Extra moments of the weapon shots (the start and end of each pass):
   ```
   E2E_GPU=1 E2E_PORT=4189 SHOT_GFX=high SHOT_PREFIX=s3-w node scripts/menu-shots6.mjs docs/menu-notes/shots W1,W2
   ```
   (`menu-shots6.mjs` freezes each at `menuT=0.5`. For other moments, open
   `http://127.0.0.1:4189/?menuShot=W1&menuT=0.1&gfx=high` and `menuT=0.9`, and the same for W2.)
2. The loadout stage hold, the note 5 check on the stage: front, her left side (support hand and magazine), her right
   side:
   ```
   E2E_GPU=1 E2E_PORT=4189 node scripts/rig-shot.mjs docs/menu-notes/shots/s3-stage-front.png 3.1416
   E2E_GPU=1 E2E_PORT=4189 node scripts/rig-shot.mjs docs/menu-notes/shots/s3-stage-left.png 2.4
   E2E_GPU=1 E2E_PORT=4189 node scripts/rig-shot.mjs docs/menu-notes/shots/s3-stage-right.png 3.9
   ```
3. Stop the preview server, free port 4189 and release the lock.

What to look at in the sheets:
- **W1**: the support hand under the launcher tube, ahead of the magazine. The rifle's muzzle is down and across, and
  the stock is in the shoulder pocket.
- **W2**: both hands on the pistol at the chest, the goggle lit above.
- **H2-H4**: the pistol low ready must not hide the plate and pouches. If it does, switch that shot's hold to `'rifle'`
  (one word in `menuSets.ts`).
- **H5**: the pistol sits in the holster.
- **H6**: the rifle is in her hands, the back plate clear.
- **T1 / T2**: no muzzle or stock poking into the face framing.
- **Every shot**: no hand hanging by a pouch, no proxy parts.

## What Michael should look at
- The main menu: Wren now holds the rifle (low ready) or the pistol (low or compressed ready) in every shot, with a
  slow breath in the gun. Two new shots, W1 rifle and W2 pistol, join the cycle. Check the pistol sits in the holster
  in the thigh shot (H5).
- Note 5: look for any hand through a magazine, on the gun or on her pouches, in the main menu and in Loadout.
- If H2-H4 read worse with a gun in front, it is a one-word change per shot.

## Open
- Every visual check is pending the PC GPU run above (framing of W1 / W2, occlusion in H2-H4).
- If Michael meant a different clip for note 5 (it is not found in the rig maths), the GPU sheets will show it. Any fix
  to a shared grip would go to CT Core as a written note.
