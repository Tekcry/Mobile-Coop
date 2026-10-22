# anim-natural N0 - audit pass 2

Branch `feature/anim-natural` at a9c86cd4 (master 4.53.0 merged). Read-only for the game: only
`scripts/anim-natural/audit.mjs` and `docs/anim-natural/**` changed. Desktop GPU (`E2E_GPU=1`, port 4189, headless),
2026-10-22 13:41-14:00 and the rerun 14:09-14:16 (one fix round), under `heavy.lock`.

## What changed in the helper

- `--pass=2` runs only pass 2's rows (`node scripts/anim-natural/audit.mjs <studio|proving|all> --pass=2`); `all` runs
  both groups; `--only=` still picks rows by name. Each metrics entry now carries `pass` and `row` (the COVERAGE #).
- Metrics format unchanged, two keys added: `lean` (torso pitch and shoulder-roll ranges, deg: the hit flinch, rolls,
  landings) and `seen` (the motion states and traversals the capture went through: did the scenario do its move).
  Pairs add `b` (role B, or the hold pair's guard) beside role A's numbers.
- Co-op pairs (73-78): the camera is fixed on the bounds of both puppets over one whole cycle (centre and extent,
  from the station's south side, sun-side 3/4, capped at 7 m with a wider lens so it stays inside the studio room);
  played in real time (not scrubbed) so the numbers run; the stage lights are moved onto the puppets and light their
  meshes; Wren's slung guns (she is hidden at the viewing spot) are switched off for the pair.
- Proving: the camera takes the sun side of each scenario's two mirror sides (`NAT_SUN=0` restores pass 1's), plus an
  audit-only key light from the camera on her meshes only (`NAT_KEY`, default 6; 0 = off). Placement finders for a free
  high wall, a wall end and the shed door (as `scripts/anim-audit.mjs`). New inputs per row: aim yaw (`cy`), fire, crouch
  and co-op held, and an `every` code line per step.
- Fixed: pass 1's `fixed` turn camera was placed from the spawn, not the teleport spot (it stood ~15 m away, behind
  the cover garden); now from the teleport spot.
- Row 79: `CharacterRig.hit(strength, side)` (to `AnimGraph.hitReact`) is the real method and pass 1 did call it; the
  flinch it plays is simply too small to see (below).
- Row 7: the pass 1 turn-in-place could not turn: standing holstered, the body holds its facing while the camera orbits
  (`src/anim/motion.ts`, by design), and the pulled-back stick at the slowest speed walks backwards. The turn on the spot
  exists only aimed (strafe-locked to the aim): pass 2 swings the aim 90 / 180 deg; at low ready the body does not follow.

- Rerun changes: the game camera is snapped to the start yaw (as anim-audit's `tp`); a `back` camera (corridors,
  doorways); the door peek starts from the menu's Stealth open pick (`g.stealthPick`) and closes with the stick pulled
  back; the interrogation is picked through `takedown.menuPick`; the strike faces the guard and taps `altFire`; the wall
  edges push the stick the other way (`toEnd = -end`); pair labels print each puppet's figure LOD and camera distance;
  `NAT_DUMP=<dir>` writes each proving row's raw 60 Hz samples. The proving whiff strike row is gone (no whiff exists).

## Finding about the light (not animation)

The Proving and Warehouse sheets are not back-lit: Wren's suit renders as a near-flat black silhouette from the sun side
too (pass 2 checked both sides). With the audit key light the limbs read. A note for the visual pass, not a slice item.

## Per-row scores (1 = broken, 5 = believable)

| # | Animation | Score | Sheet(s) | Read |
| --- | --- | --- | --- | --- |
| 7 | Turn on the spot (aimed) | 2 | `turn-in-place-aim90`, `-aim180` (+ `-top`), `-lowready90` | 90 deg in 0.28 s in two steps; each planted foot swivels 51 deg and slides 4.3-5.1 cm (the top plot fans about mid-foot); shoulders lead 14-46 deg, pelvis locked to the root |
| 10 | Tense sneak | 3 | `tense-sneak` | Counter-rotation good (7.5 / 3.3 deg, corr -0.99); knife hand parked (1.1 cm), head 0 deg |
| 12 | Crouch run | 2 | `crouch-run`, `crouch-run-keyed` | In play the arms are the jog swing (21.8 cm), trunk 5 / 6 deg, head 0 deg; the studio keyed clip (rerun, framed) is better, hands low in front with a small swing (3), but play does not use it |
| 16 | Low ready walk / jog / run | 2 | `lowready-walk / -jog / -run` | Arms locked to the gun (wrist range 0.6 / 1.8 / 11 cm), head 0 deg, side sway 1.2-1.7 cm. Run: the pelvis really swings +-25 deg (rerun raw rows -24 .. +25, shoulders against it) with ~20 deg snaps in 0.05 s at each step; not a measurement error (the side camera hides yaw) |
| 24 | Wall block | 3 | `wall-block` | Rifle swings to muzzle-up (69 deg) at the wall, stalls 0.42 s mid-swing |
| 25 | Fire, recoil | 1 | `fire-rifle`, `fire-pistol` | 1 s of fire: gun 0.12 m/s, wrists 1.4 cm, trunk 0 deg: no kick in the body at all |
| 30 | Knife in hand | 3 | `knife-in-hand` | Fist closed on the knife; the walk swings it like an empty hand (22.6 cm) |
| 32 | Jammer | 2 | `jammer` | = pistol aim still: 0 deg trunk; no pose of its own |
| 40 | Door peek | 3 | `door-peek` | Rerun (the Stealth open pick, camera behind): she steps to the latch side, a hand to the frame, holds, steps back; the leaf crack is not visible from behind |
| 43 | Hostage hold still | 2 | `hold-still`, `pair-hold_idle` | Trunk 0.0 deg in play and in the studio clip (rerun side-on: she stands behind him, still) |
| 44 | Hostage walk back (clip) | 2 | `pair-hold_back` | Studio clip: trunk 0.1 deg, feet slide 22-32 cm on the spot |
| 45 | Choke (clip) | 3 | `pair-hold_choke` | Rerun side-on: she sits back and lowers him to the floor; her trunk yaw 0.0 deg throughout, the lowering reads; the guard over-lit by the stage light |
| 46 | Knife kill | 3 | `knife-kill`, `pair-hold_knife` | Strike and lowering read; trunk turns as a block (corr +0.81); Wren dark, the guard bright |
| 47 | Interrogate | 2 | `interrogate` | Rerun (`takedown.menuPick`): her free hand goes to his jaw (left wrist 12 cm up and across); trunk, head and stance do not move (0.0 deg) |
| 58 | Split brace | 2 | `split-brace` | Rerun (camera along the corridor): a clean double jump into the split, then a T-pose: both arms straight out level for 1.6 s, trunk still; the drop reads |
| 61 | Mantle | 2 | `mantle` | 0.9 m block climbed in a squat with the hands at the sides (wrists 3-7 cm): no hand plant |
| 62 | Step up | 3 | `step-up` | Reads; quick |
| 63 | Climb up | 3 | `climb-up` | Hang, knee up, crouch on top: reads |
| 64 | Drop | 2 | `drop-ledge`, `drop-hang` | 2.6 m drop-down in one fixed half squat (no air or landing pose); from the pipe hang straight to a crouch |
| 65 | Hop | 3 | `hop` | Tucked hop over the 1.5 m gap between the hang blocks; arms whip (27.6 m/s) |
| 66 | Roll | 2 | `roll` | An airborne somersault (feet overhead off the ground at 0.47-0.6 s), wrists 28 m/s, slung rifle swings 106 deg |
| 67 | Wall kick | 3 | `wall-kick` | Foot to the wall, reach, hang: reads |
| 70 | Dash slide | deleted | `dash-slide-driven` | Michael 2026-10-22: "Delete them" (`pose.slide` was never set in play; driven it was a knee-drop lunge) |
| 72 | Doorway sweep | deleted | `door-sweep-driven` | Michael 2026-10-22: "Delete them" (`pose.check` was never set in play; driven: shoulders 5.9 deg) |
| 73 | Leg-up | 2 | `pair-boost` | B half-squats with the hands at the hips; A rises straight up 2 m in ~0.4 s with no push; B trunk 0.0 deg |
| 74 | Ledge relay | 3 | `pair-relay` | Both hang and climb side by side; reads |
| 75 | Partner throw | 2 | `pair-throw` | B stands still (trunk 0.0, hands 0 m/s) while A is thrown |
| 76 | Hang-down | 2 | `pair-hang` | B squats with the hands at the hips while A hangs head-down beside him: no grip on A's legs |
| 77 | Two-person rope | 2 | `pair-rope` | B squats on top with the hands at the hips, not on the rope; A climbs |
| 78 | Revive | 3 | `pair-revive` | A kneels at B and helps him up; reads |
| 79 | Hit flinch | 1 | `hit-flinch-2`, `hit-flinch-aim` | Invisible: shoulders 0.9 deg, torso pitch 0.2 deg (aiming 0.2 / 0.6) |
| 80 | Downed | 3 | `pair-revive` (role B) | Solo has no pose; B lies on his side, still |

## New ranked fixes (AUDIT.md fix list 23-36)

1. Hit flinch invisible (79): a real additive hit layer (chest 6-10 deg away from the hit, head snap, shoulder drop,
   half step). **N4** (`animGraph.hitReact`, CT Core).
2. No recoil in the body (25): per-shot kick through arms and shoulder. **N3**.
3. Co-op holders are statues with the hands off the contact (73, 75-77). **N4** (co-op team moves).
4. Mantle without a hand plant; 2.6 m drop with no air or land pose (61, 64). **N4** (`clips/traverse.ts`).
5. Aimed turn on the spot swivels planted feet 51 deg (7). **N1**.
6. Roll is an airborne somersault (66). **N4** (traversal).
7. Low ready gaits: arms and head locked (16). **N2**.
8. Holds still: trunk 0.0 deg (43, 44). **N4** (closeQuarters).
9. Crouch run = jog arms (12). **N2**.
10. Wall block: muzzle-up swing with a 0.42 s stall (24). **N3**.
11. Dead channels `pose.slide` / `pose.check` (70, 72): Michael 2026-10-22 "Delete them"; another agent removes the code.
12. Low ready run: pelvis yaw +-25 deg with ~20 deg snaps in 0.05 s at each step (16; rerun). **N2**.
13. Split brace: a T-pose, arms level and straight, trunk still (58; rerun). **N4** (traversal).
14. Studio: the hold pairs' guard is over-lit by the stage light; the pair puppets' vanish was not reproduced (see below).
    **N4** (studio tool, low).

## Rerun findings (14:09-14:16)

- Low ready run pelvis: real. The raw 60 Hz rows (NAT_DUMP) swing the pelvis -24 .. +25 deg with the shoulders against
  it, snapping ~20 deg in 0.05 s at each step; the free run swings 5 deg. **N2** (new fix 35).
- Split brace: a T-pose (both arms level, straight, for the whole brace) and a still trunk. **N4** traversal (fix 36).
- Pair puppets vanishing: not reproduced in the rerun (both puppets on LOD 1 at 7-8 m from the camera in every tile,
  labels now print `lod@distance`). It happened only in the first runs, where the audit camera stood 9.3 m away and,
  once, right after a seek of the pair clock. Likely cause: the figure's LOD band switch at that distance
  (`OperatorFigure.update` -> `pickLod`, a band not yet shown) or the seek jump, not the loop wrap itself; not seen
  at the studio's own viewing distance. Not a slice item unless Michael sees it in the studio.

## Not captured, and why

| Row | Why | Next |
| --- | --- | --- |
| 29 Hand swap, 39 peek aim | Both stick signs tried (one fix round): she slides along the wall but the aim at the end steps her off the wall and turns her round instead of the open-side lean-out, so the hand swap never runs | Drive it as `scripts/anim-audit.mjs`'s `wall` open rows do (its `tp` resets the gait clock, gear 3; maybe the aim must come while the stick is held toward the end) |
| 49 Elbow strike | No whiff exists (`StrikeController` starts only with a guard in reach); with the Warehouse guard, faced, a KBM `altFire` tap still started nothing | Check what blocks it with a calm guard in reach (`takedown.offer` or the context menu may own the press) |
| 31 Launcher | Not in the game (weapons.json has the rifle and pistol only) | When a launcher lands |
| 80 Downed (solo) | Solo has no downed pose | Covered by the revive pair's role B |
| 70, 72 | Deleted (Michael 2026-10-22) | - |
