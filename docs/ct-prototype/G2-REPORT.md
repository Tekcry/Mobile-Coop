# G2 report: aiming and weapons (2026-10-20)

Slice G2 of the footage audit (`docs/ct-prototype/audit/AUDIT-AIM.md`, 19 rows). Michael: "Footage wins" over the
earlier draw timings. Nothing committed (the job lead commits). No wire change (PROTOCOL_VERSION 24): remotes pose
through the same graph, slot placement and draw clip from MoveState.

## Per row
| # | item | status | old -> new (replaces) | files |
| --- | --- | --- | --- | --- |
| 1 | Rifle draw | done | DRAW_TIME_PRIMARY 0.4 -> 0.3 (F1a / G103); DRAW_RAISE {from 0.5, time 0.45} -> {0.3, 0.25} (F6): the raise starts at the press, no chest hold; swap clip back-slot hand keys: pocket at 0.8 -> 0.65, hRY held at 1.32 after it; the draw turns through new keys: round the right side, muzzle up at the right shoulder, then down onto the line | `weapons/drawState.ts`, `weapons/weaponCarry.ts`, `anim/clips/actions.ts`, `weapons/backDiag.ts`, `weapons/weaponModel.ts` |
| 2 | Holster | done | HOLSTER_TIME 0.55 -> 0.15 (G103, A2.1); CARRY.lowerTime 0.55 -> 0.2 (G103: weld and shoulders let go with the gun); the holster turn goes muzzle DOWN beside the right hip, twists flat and swings into the sling (never up) | same |
| 3 | Back sling | done (game side) | centre slot vertical, muzzle up -> diagonal: bore 0.66 rad (38 deg) from straight down toward the left, gun flat on the back plate (right side in), grip at chest (0.12, 0.0); REACH backC [0.08, 1.26, -0.12] -> [0.14, 1.2, -0.12] (anim-cleanup / D1). Side slots (backL/backR) unchanged | `weapons/backDiag.ts` (new, pure), `weapons/weaponModel.ts` `place` / `travel`, `anim/clips/actions.ts` |
| 4 | Rigid aimed upper body | done | AIM_CHEST.pitch 0.75 -> 1 (BC note 2); new hips 0.35 (clamp 0.35 rad), pelvis back 0.08 m per rad; spine gets the rest (the rig's chest = 0.4 pelvis + spine, so the audit's 0.65 would have left 0.86); HUNCH.aim 0.05 -> 0.1 off a wall (0.05 at a wall: rig.test edge jerk). Head: no change needed, the rig already world-stabilises it at 0.98x the aim (the audit's 1.2x read missed that) | `anim/animGraph.ts` |
| 5 | Pistol hold | done | PISTOL_REACH {x -0.07, y 0.015, z 0.1} -> {-0.09, -0.06, 0.2} (feature/weapons); the sight line held 0.06 m under the eye (new `sightDrop`: the weld used to cancel any y offset); chest forward 0.08 rad over the raised pistol; no head roll and no neck dip for a pistol (new `stockWeld`) | `anim/animGraph.ts`, `player/characterRig.ts` |
| 6 | Aim framing | not done | camera.ts is the camera slice's | - |
| 7 | Pistol draw | done | DRAW_TIME_SIDEARM 0.3 -> 0.5 (F1a); the pistol's draw now raises with its travel (it waited for the whole clip at the compressed ready: ~0.8 s); adsInTime follows (0.45 s) | `weapons/drawState.ts`, `player/player.ts` |
| 8 | Scope | out of scope | - | - |
| 9 | Aim press turn rate | not done | `movement.ts` is not in this slice | - |
| 10 | Shoulder swap arc | not done | camera.ts | - |
| 11 | Recoil | done | weapon flip 0.12 -> 0.02 rad, wpZ 0.05 -> 0.015 m, spine 0.05 -> 0.01, pelvis 0.015 -> 0.003 (`RECOIL`); rifle recoilPitch 1 -> 0.6 (`config/weapons.json`); shot shake 0.04 -> 0 for rifle / pistol (sniper / shotgun keep theirs). The camera's ADS kick factor (shoulderCamera) untouched | `anim/animGraph.ts`, `weapons/playerWeapons.ts`, `config/weapons.json` |
| 12 | Aim look rate | none (as the audit) | - | - |
| 13 | Swap while holstered | done | a settled holstered swap now only changes the selection (no reach clip) | `weapons/playerWeapons.ts` |
| 14 | Pistol holster at the hip | not done | the holster shell is baked into Wren's leg kit mesh; moving only the gun would leave the shell empty on the thigh. Needs a Blender anchor (leg_kit.py, scripts/operators) | - |
| 15 | Swap while aimed | not done (kept 0.9 s) | never in the footage; the render shows no muzzle-up arc now (the holster half uses row 2's turn) | - |
| 16 | Reload while holstered | done | the queued reload (A43) draws straight to the compressed ready (`player.reloadQueued`) | `player/player.ts`, `weapons/playerWeapons.ts` |
| 17 | Ready carry | done via rows 1 / 16 | the low ready is no longer on the draw path | - |
| 18 | ADS walk bob | measured, no fix | new sheets `aimwalk` / `aimstrafe` (anim-sheet): in the OTS view head and gun hold still (< ~2 % of the frame) | `scripts/anim-sheet.mjs` |
| 19 | Crouched ADS | kept | - | - |
| EXTRA-NEW 23 | Own muzzle flash | not done | low confidence (one clip); `vfx.ts` is not in this slice | - |
| EXTRA-OLD 10 | Reticle ring | not done | `src/ui/hud` is not in this slice | - |

## Tests changed and why
- `tests/backDiag.test.ts` (new): the sling frame (down-left, flat on the back), key frames right-handed, the grip lands
  on the blade, the draw sweep never points up-left (behind the head), the holster never points the muzzle up.
- `tests/drawState.test.ts`: two literals assumed the 0.55 s holster; now relative to HOLSTER_TIME (0.15, footage).
- `scripts/e2e-anim.mjs`: raise window 0.3-1.0 -> 0.12-0.6 s, lower 0.3-0.7 -> 0.1-0.4 s (CT: muzzle up then ~0.2 s onto
  the line; instant holster). The draw / holster continuity check (pose channels <= 0.1, wpPitch 0.14) is unchanged.
- `scripts/e2e-weapons-carry.mjs`: the centre back gun is checked against the diagonal axis (0.66 rad) instead of the
  spine; side slots unchanged.
- Not edited (off limits), for the job lead: `e2e-netmove.mjs` 241 comment and `e2e-ct.mjs` 341 comment still say 0.55 s
  holster (both only wait longer than needed).

## Verified
`npx tsc --noEmit`, eslint on the changed files, vitest backDiag / drawState / anim / animAudit / carry / handHold / net /
netSim / readyHands / rig / tactical / weapons / weaponMesh / weaponNames: all pass. GPU sheets (two rounds) in
`docs/ct-prototype/shots/g2/`. e2e not run (job lead).

## What still differs from CT
- Draw press to settled about 0.4 s (CT about 0.55 s): our hand reaches the gun inside the 0.125 s overlay fade, so the
  reach-over-the-shoulder phase is shorter than CT's.
- Our rifle is 0.93 m (CT's is compact): the sling angle is 38 deg (CT about 45 deg) and the muzzle ends just past the
  left hip, close to the left forearm on a back swing (no clip seen in walk-back; e2e-weapons-carry ignores arms).
- In the pistol OTS view the slung stock shows at the bottom of the frame at the right shoulder (round 1 had it beside
  the head; lowered 11 cm in round 2).
- The pistol arms are straighter than CT's compact hold (z 0.2 may be too far: try 0.15).
- Pistol holster still mid-thigh (row 14); Wren's back plate socket is empty (the gun no longer uses it).

## What Michael should try
Aim / holster repeatedly with the rifle (watch the over-the-shoulder draw in the OTS view); switch to the pistol on the
wheel while holstered (no movement) and aim; aim 60 deg down at the floor (the body tilts as one block); fire a burst
(no flip); walk aimed.

## Fix round 1 (independent check: one BLOCK; e2e-anim sprint holster)
- BLOCK fixed: a draw reversed mid-holster (aim released and pressed again within ~0.13 s) took the keyed diagonal draw
  turn, which starts from the slung frame: the rifle snapped through the torso and swept ~360 deg. `WeaponModel.beginTravel`
  now records `trFromSlot` (the gun was in that slot); `backDiag.useDiagTurn` keys every centre holster but a draw only
  from the slot; a reversal slerps from where the gun is. Test: `tests/backDiagTravel.test.ts` (NullEngine: the way back
  turns <= 0.35 rad a frame and about the way it came; with the old rule it jumped 1.71 rad).
- e2e-anim "draw / holster to the back mount continuous" (sprint holster wpPitch): the swap clip's 0.5 rad wpPitch dip is
  flat for a back-to-back holster / draw (the travel places the gun; the dip only moved the channel), and CARRY.lowerTime
  0.2 -> 0.3 s. Now max 0.093 per frame (< 0.1). e2e-anim lower window comment updated (0.30 s measured).
- e2e-weapons-carry "the hand reaches both slots" on gun-to-gun swaps: REACH.backC [0.14, 1.2, -0.12] -> [0.16, 1.34, -0.1]
  (over the right shoulder to the slung stock, CT's reach); an outgoing centre gun is let go at its slung grip
  (`SLUNG_GRIP_C` [0.14, 1.2, -0.12]); a swap to a travelled slot reaches the next gun by 0.47 (was 0.5). Now 5-7 / 13 cm.
- Stock against the jaw in the holster / swap: measured (NullEngine probe) >= 0.19 m stock-to-head centre over the whole
  holster (>= 6 cm clear of the helmet); no change.
- PISTOL_REACH.z 0.2 -> 0.15 (the arms were nearly straight; CT's hold is compact; elbows now bent in aimpistol-side).
- remoteAvatar's stale "0.4 s holster" comment fixed.
- Ran (heavy lock, `npx vite build`; `npm run build`'s typecheck fails only in G4's attachController / attachGrips):
  `E2E_PORT=4193 node scripts/run-e2e.mjs --serial`: e2e-anim ok, e2e-weapons-carry ok; e2e-clip FAIL on "ladder down +
  slide: the knees never knock through each other (8.4 cm)", a traversal / legs assert (G1 / G4 files) that runs before
  the gun clearance part, so e2e-clip's gun checks are not verified this round. Re-rendered draw / holster / swap /
  aimpistol in `shots/g2`.
