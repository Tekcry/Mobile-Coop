# piano-knife S4a: empty pistol (slide locked back)
Owner: Night Shift | Player Build. Status: history (the piano scene was removed in cleanup stage E; the knife kills are every map's lethal takedown, `docs/systems/takedowns.md`). Builder: Sonnet 5.5 from this brief. Checker: one Opus (render
code and the weapon pipeline; no AI or `src/net` file, RULES "The loop"). Branch `feature/piano-knife-s4a` in
`C:/NightShift/Mobile-Coop-piano-knife-s4a`, cut from origin/master at build start (6845009d9 when written); PR base
`master`. Est. ~200 lines plus the rebuilt `pistolSd.glb`. Runs parallel with S1 (no shared file).

Read first: `BRIEF.md` (A11, A12, A13), `PLAN.md` section 1 "Intro pose pieces" (last two bullets), 2.7 and S4a / S4b
in section 4. Prototype mode: the one number below (`SLIDE_LOCK_BACK`) is a starting value; no tuning, one test set.
Every design choice is made here; if something below does not match the code, stop and report to the lead, do not
improvise.

## Goal
Michael's scene opens on the operator holding an EMPTY pistol (~19:20: "showing them holding an empty pistol, calmly
breathing"); an empty pistol shows it by its slide locked back. Today the `pistolSd` GLB joins the slide into the body
(only the magazine is its own mesh), so nothing can move it. This slice rebuilds the pistol with the slide (and the
parts that ride on it) as a third mesh `pistolSd-slide` and adds `WeaponModel.slideLock(on)`, which moves it back
0.02 m along the bore. Nothing calls `slideLock` yet: S4b's `introPose` will (map `thornbeckMill`, scene `'piano'`).
With the slide forward (the default) the gun looks exactly as today everywhere.

## Out of scope (do not build)
No caller of `slideLock` (S4b), no intro pose, no `introPose`, no breathing, no wall, no co-op or MoveState bit (S4b
decides how the remote pistol gets it, G400). No `flags.ts` edit (nothing ships visible: the slide stays forward
until S4b calls it). No change to the rifle or knife GLB, `weapons.json`, the proxy parts, hand points, muzzle, carry
slots or `src/weapons/knifeModel.ts` (S1 edits it). No `--render` run, no new renders. No slide animation on firing
or reloading.

## Setup (once)
1. If the worktree is missing: `git -C C:/NightShift/Mobile-Coop fetch origin master` then
   `git -C C:/NightShift/Mobile-Coop worktree add -b feature/piano-knife-s4a C:/NightShift/Mobile-Coop-piano-knife-s4a origin/master`,
   then `npm ci` in it (600 s timeout).
2. Guard before every write (Git Bash):
   `cd /c/NightShift/Mobile-Coop-piano-knife-s4a && test "$(git rev-parse --abbrev-ref HEAD)" = feature/piano-knife-s4a && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-piano-knife-s4a"`
3. Commit and push each step below on its own (`git add <the step's files>`, never `-A` or `.`;
   `git push origin feature/piano-knife-s4a`). Never commit anything under `build/` (gitignored: the Blender outputs,
   PNG textures, `.blend`).

## Files and exact behaviour
Weapon frame (the pipeline's and the game's): metres, +X right, +Y up, +Z along the bore toward the muzzle
(`scripts/weapons/py/wlib.py:1-8`). The GLB's mesh coordinates read back in the game ARE the weapon frame (the writer
stores (-x, y, z), the reader mirrors x back), so "back" is -Z.

1. `scripts/weapons/py/wlib.py` (step 1)
   - Under `is_mag` (:456-459) add:
     ```python
     SLIDE_PARTS = ('slide', 'extractor', 'rear-sight', 'front-sight')


     def is_slide(name):
         """(piano-knife S4a) Slide parts (their own mesh in the GLB: an empty pistol locks the slide back). Exact base
         names: 'slide-stop' and 'slide-stop-pin' are frame parts, the barrel hood stays with the barrel."""
         return name.split('.')[0] in SLIDE_PARTS
     ```
   - `join_all` (:462): right after the two `wmag` lines (:479-480), the same for the slide:
     ```python
             # (piano-knife S4a) the slide tag survives the join the same way
             st = me.attributes.get('wslide') or me.attributes.new('wslide', 'INT', 'POINT')
             st.data.foreach_set('value', [1 if is_slide(o.name) else 0] * len(me.vertices))
     ```
   - `write_glb` (:656): read `wslide` beside `vmag` (:674-676):
     ```python
         vslide = np.zeros(len(me.vertices), np.int32)
         if me.attributes.get('wslide') is not None:
             me.attributes['wslide'].data.foreach_get('value', vslide)
     ```
     and replace the group split (:685-689) with:
     ```python
         # (anim-cleanup) the magazine's triangles (every corner tagged) are a mesh of their own: `<name>-mag`;
         # (piano-knife S4a) the slide's likewise: `<name>-slide`. A triangle with any untagged corner stays in the body.
         t3 = tri.reshape(-1, 3)
         tmag = vmag[vi[t3]].min(1) > 0
         tslide = (vslide[vi[t3]].min(1) > 0) & ~tmag
         groups = [(name, t3[~tmag & ~tslide].ravel())]
         if tmag.any():
             groups.append((f'{name}-mag', t3[tmag].ravel()))
         if tslide.any():
             groups.append((f'{name}-slide', t3[tslide].ravel()))
     ```
     Per-mesh triangle counts in the returned stats: initialise `stats = {'vertices': 0, 'triangles': 0,
     'meshTriangles': {}}` and inside the loop add `stats['meshTriangles'][gname] = int(idx.shape[0] // 3)`.
     Nothing else in the writer changes (mesh order: body, mag, slide). The rifle has no part with those names, so its
     output would be unchanged; it is not rebuilt.

2. `scripts/weapons/py/build_weapon.py` (step 1): after `parts = [...]` (:34) add
   `split = {'mag': [n for n in parts if W.is_mag(n)], 'slide': [n for n in parts if W.is_slide(n)]}` and put
   `'split': split` into the `report` dict (:41-42) right after `'partBounds': part_bounds`. Module docstring: one
   line after line 7 ("...renders as WebP into --render."): "The magazine and, for a pistol, the slide are meshes of
   their own in the GLB (`<id>-mag`, `<id>-slide`: wlib.write_glb); the report's `split` names their parts."

3. The rebuild (step 2; desktop, one Blender run under `heavy.lock`; the lead authorises exactly this one run). One Git
   Bash command, 600 s timeout, from the S4a worktree, take / run / release in the same shell:
   ```
   cd /c/NightShift/Mobile-Coop-piano-knife-s4a && node scripts/heavy-lock.mjs take C:/NightShift/heavy.lock "Night Shift | Player Build | piano-knife S4a" --pid "$(cat /proc/$$/winpid)" && { npm run weapons:build -- pistolSd; rc=$?; node scripts/heavy-lock.mjs release C:/NightShift/heavy.lock "Night Shift | Player Build | piano-knife S4a"; exit $rc; }
   ```
   - `take` exit 1 = the lock is held: never break it; wait with a Monitor until-loop on
     `node scripts/heavy-lock.mjs check C:/NightShift/heavy.lock` (exit 0 = free) and run the command again.
   - Blender is the pinned 5.2.2, always `-b` (`build.mjs` passes it); no `--render` (its holster check needs a leg kit
     file that is not on this desktop). It writes `src/weapons/assets/pistolSd.glb` and `src/weapons/assets/pistolSd.json`
     (the build report); the rest stays in `build/weapons/pistolSd/`.
   - Expected report: `triangles` 9776 (unchanged: the split happens only at write), `glb.meshes`
     `["pistolSd", "pistolSd-mag", "pistolSd-slide"]`, `split.slide` `["slide", "extractor", "rear-sight",
     "front-sight"]`, `split.mag` `["mag-plate", "mag"]`. A failed run, a different triangle count or a missing
     `pistolSd-slide` stops the slice: report to the lead with the log tail, no second Blender run without the lead.
   - The run drops the old report's `holster` block (the `--render` check). Carry it over unchanged (same geometry) with
     one command from the worktree:
     ```
     MSYS_NO_PATHCONV=1 node -e "const fs=require('fs');const cp=require('child_process');const old=JSON.parse(cp.execSync('git show origin/master:src/weapons/assets/pistolSd.json'));const p='src/weapons/assets/pistolSd.json';const r=JSON.parse(fs.readFileSync(p,'utf8'));r.holster=old.holster;r.holsterFrom='origin/master build before piano-knife S4a (same geometry; not rerun)';fs.writeFileSync(p,JSON.stringify(r,null,1))"
     ```
   - Commit only `src/weapons/assets/pistolSd.glb` and `src/weapons/assets/pistolSd.json`.

4. `src/weapons/weaponMesh.ts` (step 3)
   - `WeaponAsset` (:20-25): add `/** (piano-knife S4a) The slide as its own mesh (`<id>-slide` in the file), when the
     weapon has one. */ slide: Mesh | null;`.
   - `build` (:43): `const gs = model.meshes.find((x) => x.name === `${id}-slide`) ?? null;` beside `gm`;
     `const slide = gs ? sourceMesh(scene, gs, `wpn-mesh-${id}-slide-src`) : null;` beside `mag`; return
     `{ source, mag, slide, material: mat }`.
   - `loadWeaponMesh` (:102): the `ready` parameter becomes `(m: Mesh, mag: Mesh | null, slide: Mesh | null) => void`.
     After the `mag` block (:113-122):
     ```ts
     let slide: Mesh | null = null;
     if (a.slide) {
       slide = new Mesh(`wpn-mesh-${id}-slide`, scene);
       a.slide.geometry!.applyToMesh(slide);
       slide.material = a.material;
       // (piano-knife S4a) a child of the body mesh, so the tuner's gun transform on the body (tuneVisual) carries it
       slide.parent = m;
       slide.isPickable = false;
       slide.receiveShadows = true;
       slide.rotationQuaternion = Quaternion.Identity();
     }
     ready(m, mag, slide);
     ```
     No other change in this file. `knifeModel.ts`'s one-argument callback stays valid (do not edit it).

5. `src/weapons/weaponModel.ts` (step 3)
   - Export, near the top constants (after `CARRY_GAP`, :29):
     ```ts
     /**
      * (piano-knife S4a) How far an empty pistol's slide sits back when locked open (m, along -z of the weapon frame).
      * Starting value (prototype mode): the slide is 0.182 m long (`pistolSd.json` partBounds.slide).
      */
     export const SLIDE_LOCK_BACK = 0.02;
     ```
   - The constructor's `loadWeaponMesh` call (:171): the callback becomes
     `(m, mag, slide) => this.useMesh(m, mag, slide, opts.caster)`.
   - `useMesh` (:186) becomes `private useMesh(m: Mesh, mag: Mesh | null, slide: Mesh | null, caster?: (m:
     AbstractMesh) => void): void`; after the mag lines add `this.slideMesh = slide;` and
     `if (slide) { caster?.(slide); this.placeSlide(); }`.
   - After `magSeated` (:241-250) add:
     ```ts
     /** (piano-knife S4a) The slide mesh (a child of the baked mesh; null: no baked mesh or no separate slide). */
     slideMesh: Mesh | null = null;
     private slideBack = false;

     /** (piano-knife S4a) The slide is locked back (set by slideLock; kept across a late mesh load). */
     get slideLocked(): boolean {
       return this.slideBack;
     }

     /**
      * (piano-knife S4a) An empty pistol: the slide locked back `SLIDE_LOCK_BACK` (on) or forward (off). Render only
      * (the muzzle, grip points and extents are untouched); applied when the mesh arrives if it is not in yet. A gun
      * without a separate slide ignores it. No allocation.
      */
     slideLock(on: boolean): void {
       this.slideBack = on;
       this.placeSlide();
     }

     private placeSlide(): void {
       const s = this.slideMesh;
       if (!s) return;
       s.position.set(0, 0, this.slideBack ? -SLIDE_LOCK_BACK : 0);
     }
     ```
   - `tunedMeshes` doc comment (:799): append "(the slide rides on the baked mesh as its child)". No code change there.
   - `dispose` (:806): before `this.mesh?.dispose();` add `this.slideMesh?.dispose();`.

6. `tests/weaponMesh.test.ts` (step 3): the magazine case (:21-27) becomes
   ```ts
   it('the guns carry their magazine as a mesh of its own (a reload pulls it: anim-cleanup), the pistol its slide too (piano-knife S4a)', () => {
     const want: Record<string, string[]> = { rifle: ['rifle', 'rifle-mag'], pistolSd: ['pistolSd', 'pistolSd-mag', 'pistolSd-slide'] };
     for (const id of ['rifle', 'pistolSd'].filter((x) => built.includes(x as never))) {
       const glb = readFileSync(`src/weapons/assets/${id}.glb`);
       const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString('utf8')) as { meshes: { name: string }[] };
       expect(json.meshes.map((m) => m.name)).toEqual(want[id]);
     }
   });
   ```

7. `tests/pistolSlide.test.ts` (new, step 3). One file, two `describe`s.
   - Helper (top of file): `readGlb(path)` returns `{ json, bin }`: `json` = the JSON chunk
     (`buf.subarray(20, 20 + buf.readUInt32LE(12))`), `bin` = the BIN chunk's data
     (`binStart = 20 + jsonLen + 8`, `buf.subarray(binStart)`); `positions(json, bin, meshName)` returns a
     `Float32Array` of that mesh's first primitive's POSITION (accessor `bufferView`'s `byteOffset` plus the
     accessor's `byteOffset ?? 0`, `count * 3` floats; copy the bytes into a new `Float32Array`, do not alias an
     unaligned buffer). GLB y and z are the weapon frame's y and z.
   - `describe('pistolSd GLB: the slide is its own mesh (piano-knife S4a)')`, reading
     `src/weapons/assets/pistolSd.glb` and `src/weapons/assets/pistolSd.json`:
     1. meshes are exactly `['pistolSd', 'pistolSd-mag', 'pistolSd-slide']`.
     2. the slide mesh's POSITION accessor `min` / `max`: y within [0.0205, 0.0545], z within [-0.031, 0.1525] (the
        slide and its sights, nothing of the frame, barrel or suppressor).
     3. the slide mesh has at least 200 triangles (its indices accessor `count / 3`).
     4. the body mesh has no vertex with y > 0.0500 and z < 0.1525 (the slide top and sights left the body; the
        barrel hood tops out at 0.0494, the suppressor starts at z 0.157).
     5. the report: `split.slide` equals `['slide', 'extractor', 'rear-sight', 'front-sight']`, `split.mag` equals
        `['mag-plate', 'mag']`, `glb.meshes` equals the list in case 1, `triangles` at most `TRI_BUDGET.pistolSd`.
   - `describe('WeaponModel.slideLock (piano-knife S4a)')`, NullEngine as `tests/animGear.test.ts:251-267` (dynamic
     imports of `NullEngine`, `Scene` and `Mesh` from `../src/core/babylon`, `PartLibrary`, `WeaponModel`,
     `DEFAULT_WEAPON_COLORS`, `SLIDE_LOCK_BACK`, `WEAPONS`); the model is built WITHOUT `{ mesh: true }` (no fetch), on
     a plain `TransformNode` parent; the private `useMesh` is reached through
     `(p as unknown as { useMesh(m: Mesh, mag: Mesh | null, slide: Mesh | null): void }).useMesh(...)`, with the slide
     parented to the body mesh first, as `loadWeaponMesh` does.
     1. `SLIDE_LOCK_BACK` > 0 and at most 0.25 x the slide's length from the report
        (`partBounds.slide[1][2] - partBounds.slide[0][2]`).
     2. locked before the mesh arrives: `slideLock(true)`, then `useMesh(body, null, slide)`: `slide.position` is
        (0, 0, -SLIDE_LOCK_BACK) exactly; `slideLocked` true.
     3. `slideLock(false)`: position (0, 0, 0), `slideLocked` false; `slideLock(true)` again: z = -SLIDE_LOCK_BACK.
     4. a fresh model, `useMesh(body, null, slide)` with no lock: position (0, 0, 0) (today's look).
     5. a rifle model with no slide mesh: `slideLock(true)` does not throw and `slideMesh` stays null.
     6. `dispose()` disposes the slide mesh (`slide.isDisposed()` true).

8. `docs/systems/world-and-characters.md` (step 4): in the "Wren's hands" bullet (:135-138), after "...moved by the
   reload clips (`reloadClipFor`);" insert "the pistol's slide is a separate `<id>-slide` mesh (a child of the gun's
   mesh) that `WeaponModel.slideLock(on)` locks back `SLIDE_LOCK_BACK` 0.02 m for an empty gun (piano-knife S4a; the
   piano intro calls it);".

## Claims (files)
- New: `tests/pistolSlide.test.ts`.
- Edited: `scripts/weapons/py/wlib.py`, `scripts/weapons/py/build_weapon.py`, `src/weapons/weaponMesh.ts`,
  `src/weapons/weaponModel.ts`, `src/weapons/assets/pistolSd.glb` (rebuilt), `src/weapons/assets/pistolSd.json`
  (rebuilt report), `tests/weaponMesh.test.ts`, `docs/systems/world-and-characters.md`.
- Changed from PLAN section 3: the split lives in `wlib.py` (`join_all` / `write_glb`), not `build_weapon.py` (which
  only adds `split` to the report); `pistolSd.json`, `tests/weaponMesh.test.ts`, `tests/pistolSlide.test.ts` and the
  one doc line are added. The lead updates PLAN section 3.
- Not touched: everything in "Out of scope"; the S1 files (`knifeKill.ts`, `knifePair.ts`, `killDrive.ts`,
  `takedownController.ts`, `gameState.ts`, `enemy.ts`, `animGraph.ts`, `knifeModel.ts`, studio files);
  `docs/knife-kills/*` (was `docs/piano-knife/`) (the job branch's). Wire: none. Save paths: none. Maps: none. Flags: none.

## Tests (one closest set, run once; a red test gets one fix and one rerun)
- `tests/pistolSlide.test.ts` (item 7) and `tests/weaponMesh.test.ts` (item 6).
- Existing, must stay green: `tests/animGear.test.ts`, `tests/animN3b.test.ts`, `tests/enemyGunMerge.test.ts`.
- If GLB case 4 or case 2 fails, the join merged a few slide and frame vertices: report the offending vertex count and
  positions to the lead; do not widen the bounds and do not rerun Blender.

## Checks
- `npm run typecheck:fast`
- `npx vitest run tests/pistolSlide.test.ts tests/weaponMesh.test.ts tests/animGear.test.ts tests/animN3b.test.ts
  tests/enemyGunMerge.test.ts`
- Laptop: the PR head's `affected-e2e`, and the lead requests `e2e-weapons-carry` (the carry clip and hand-point
  suite) as the checker gate: `node scripts/laptop-queue/request.mjs --sha <full head sha> --pr <n> --suites
  "e2e-weapons-carry" --set pk-s4a-carry --requester "Night Shift | Player Build"`. With the slide forward it must
  read exactly as before.
- One Opus checker. It confirms: only the claimed files changed; nothing under `build/` and no PNG or `.blend`
  committed; the rifle and knife GLBs untouched; `pistolSd.json` `triangles` 9776 and `points` / `bounds` /
  `partBounds` equal to origin/master's; nothing calls `slideLock` yet; the slide is a child of the baked mesh (so
  `tuneVisual` carries it); `useMesh` applies a lock set before the load; `e2e-weapons-carry` green.

## PR
`gh pr create --base master --head feature/piano-knife-s4a --title "piano-knife S4a: empty pistol slide (separate
slide mesh, slideLock)"`. The body is the report: what was built, `SLIDE_LOCK_BACK` 0.02, the rebuild's numbers
(triangles, per-mesh triangles from `glb.meshTriangles`, GLB bytes, built seconds), files, commits, tests and
results, "nothing calls slideLock until S4b", and the attribution lines your session gives. Size note: ~200 lines plus
the binary GLB.

## Size
| Part | Lines |
|---|---|
| `wlib.py` + `build_weapon.py` | ~30 |
| `weaponMesh.ts` + `weaponModel.ts` | ~45 |
| `tests/pistolSlide.test.ts` + `weaponMesh.test.ts` edit | ~110 |
| `pistolSd.json` (report: `split`, `meshTriangles`, `holsterFrom`, rebuilt numbers) + doc line | ~20 |
| Total | ~205 + the GLB (~3 MB) |

## Done looks like
- `src/weapons/assets/pistolSd.glb` holds three meshes; in game and in the menu the pistol looks exactly as before.
- `weaponModel.slideLock(true)` on the player's pistol slides the slide, sights and extractor back 2 cm, uncovering
  the barrel hood: an empty gun. `slideLock(false)` puts it back. S4b can call it from `introPose` with no further
  pipeline work.

## Doubts
1. The baked ambient occlusion was baked with the slide forward, so with the slide back a thin dark band may show on
   the frame rail where the slide sat. Polish list, after Michael plays.
2. Holstering a gun with its slide locked back pokes the slide 2 cm out of the holster's rear. S4b owns the call:
   recommended, `introPose(false)` (play starts) also calls `slideLock(false)`, so in play the holstered pistol (A13)
   looks as today.
3. Co-op (G400): `slideLock` is local render state. S4b decides how the partner's screen gets it (both screens run
   Campaign's intro, so each can call it on the remote avatar's pistol; no wire change expected).
