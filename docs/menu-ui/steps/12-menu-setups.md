# Step 12 - menu-setups (Block C)
Build setups S1-S7 on the menu stage from the mock patch, drive them with the director, and give the title screen its
silhouette. Deps: 11. Model: Opus 5.5 / Opus 5.5. GPU checks on Michael's PC (`E2E_GPU=1`, port 4195).

## Read
- SPEC.md 8.1, 8.3, 7.2; DECISIONS MD15; FINDINGS.md (all: what reads best, animation problems, how scenes were
  built); `docs/menu-ui/menu-mock.patch` (reference only: never `git apply` it as is).
- `src/world/menuScene.ts`, the light rig and `lightCone` helpers it uses, `src/vfx` Weather (rain), the operator rig
  pose inputs (`RigPose`, grips) used by the patch; `docs/systems/performance.md` menu numbers if any.

## Task
1. `src/world/menuSets.ts`: builders for S1 door peek, S2 wall edge with blinds gobo, S3 inverted pipe, S4 rappel in
   rain, S5 roof ledge with searchlight, S6 armory studio (today's loadout stage), S7 wall / door stack with a partner
   in the next operator colour. Primitive set pieces, hard spot lights (shadow casters first), visible beams, the
   tri-lens glow. All built once at menu start (or lazily during S1) so a shot change never builds geometry.
2. Poses: holstered only (no aim from attached states until locomotion step 25); no akimbo holstered crouch (use the
   ready crouch on S5). Idle breathing and one small authored motion per shot (head turn, glance).
3. Camera moves from the director (`push`, `dolly`, `tilt`, `crane`, `static`), applied with the framing offset that
   keeps the menu list readable (operator right of centre on main, left-centre on title).
4. Crossfade: render-only fade through a full-screen quad or the post stack exposure; cut-to-black variant.
5. Title screen uses S1 with the operator as a rim-lit silhouette (key light off, rim on).
6. Phone list (S1, S2, S6, S7): no rain, no volumetric beams, governor applies.
7. `scripts/menu-sheet.mjs`: contact sheet of S1-S7 at 1920x1080 and the phone look, using `?menuShot=`.
8. Remove `DevMenuScreen` (`?menuDemo=1`) from step 02 if nothing else needs it (keep the e2e coverage on real screens).

## Tests
- e2e-menus: `?menuShot=S3` reports S3 through the debug hook; `?menuClock=fast` changes shot within 3 s; the menu
  stays navigable during a crossfade; reduced motion holds S1.
- smoke and e2e-desktop still boot to the menu; e2e-coop lobby shows S7.
- GPU (PC): `E2E_GPU=1 node scripts/menu-sheet.mjs`; judge silhouettes against FINDINGS "What reads best".

## Checks
- `npm run check`; `npm run build && npm run e2e:quick`; `node scripts/run-e2e.mjs e2e-menus smoke e2e-desktop
  e2e-coop`; the contact sheet.

## Commit
"menu-ui 12: cinematic menu stage setups S1-S7 driven by the shot director"
Then LOG, STATE, CHANGELOG, TESTING (desktop: shot changes; phone: two shots), world-and-characters.md.
