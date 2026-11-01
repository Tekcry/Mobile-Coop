# piano-knife S1: paired knife kill core (solo / host, stand-in clips)
Owner: Night Shift | Player Build. Status: history (the piano scene was removed in cleanup stage E; the knife kills are every map's lethal takedown, `docs/systems/takedowns.md`). Builder: Opus. Checkers: two independent Opus (`src/ai/enemy.ts`
is an AI file, RULES "The loop"). Base: origin/master at build start. Est. ~1200 lines with tests.

Read first: `BRIEF.md` (A1, A2, A3, A5, A6, A8, A14, A15) and `PLAN.md` sections 1-2. Prototype mode: the numbers below
are starting values; no tuning passes.

## Goal
With the knife switch on (Campaign's piano scene), a solo player's or the host's takedown on a human guard is one press
to a paired knife kill: knife in hand from the press, the guard gripped and attached to the attacker for the whole
move, a stab, a buckle, his hands on the attacker's arm, a dead body, 1.2 m of noise. With the switch off every
takedown is exactly today's. Runs fully on clips already in the repo (Mixamo downloads are blocked until Michael signs
in). Campaign PB5 and PB1 (plus the PB2 and PB3 rows); they block Campaign S4.

## Out of scope (do not build)
Co-op: no `src/net` edit, no `EnemyPuppet` edit, no MoveState bits, no `td` kind (S3). No knife slash anywhere
(Michael ~20:05). No real knife clips or CMU check (S2). No intro pose or slide (S4). No `flags.ts` edit and
no `pianoScene.ts` edit (Campaign writes the two `setKnifeScene` calls). No scoring change.

## Files and exact behaviour
1. `src/game/knifeKill.ts` (new; pure, no Babylon import, no allocation after load)
   - `PIANO_SCENE = 'piano'`, `PIANO_MAP_ID = 'thornbeckMill'`.
   - `knifeSceneOn(flagOn: boolean, scene: string | undefined, live: boolean): boolean` returns
     `flagOn && live && scene === PIANO_SCENE`.
   - `KNIFE = { noise: 1.2, blendIn: 0.12, blendOut: 0.15, gripIn: 0.45, stabIn: 0.12, victimHandsIn: 0.1,
     release: 0.15, bucklePitch: 0.35, buckleRise: 0.06, buckleDecay: 0.4, contactTol: 0.03 }` (s, rad, m).
   - `KNIFE_KILL_IDS = ['behind', 'behindLow', 'corner', 'front'] as const` (wire-stable order for S3; at most 8).
   - `KnifeKillRow { id, attacker: string, victim: string, seconds, contact, victimFrom, limp, standoff, side, yawOff,
     grip: 'mouth' | 'shoulder', target: 'kidney' | 'neck' | 'chest' }` (clip ids are `mocapSources` keys).
   - `KNIFE_KILLS` (index = id order):
     | id | attacker | victim | seconds | contact | limp | standoff | side | yawOff | grip | target |
     |---|---|---|---|---|---|---|---|---|---|---|
     | behind | mocap_cross_punch | mocap_rifle_death_from_the_back | 1.3 | 0.45 | 0.8 | 0.55 | 0 | 0 | mouth | kidney |
     | behindLow | mocap_crouch_to_stand | mocap_rifle_death_from_the_back | 1.3 | 0.45 | 0.8 | 0.55 | 0 | 0 | mouth | kidney |
     | corner | mocap_cross_punch | mocap_rifle_death_from_right | 1.3 | 0.45 | 0.8 | 0.55 | 0 | 0 | shoulder | neck |
     | front | mocap_cross_punch | mocap_rifle_death_from_the_front | 1.3 | 0.45 | 0.8 | 0.55 | 0 | pi | shoulder | chest |
     `victimFrom` 0 on every row.
   - Palm strike off (A10, Michael ~20:05 "Palm strike knockout disabled, only knife kills, and no slashing, only
     animations with the guard"): while the switch is on, `gameState.ts:2191-2192` passes no strike start to `StrikeController` (RT tap,
     RT hold and altFire do nothing) and `takedownController` takes no non-lethal path (no knockout, no grab row); every
     takedown is the paired knife kill. Switch off = today. Tests in `tests/knifeTakedown.test.ts`: switch on, RT tap /
     hold / altFire start no strike and knock nobody out; switch off, unchanged.
   - `pickKnifeKill(kind: TakedownKind, crouched: boolean): number`: `behind` -> crouched ? 1 : 0; `corner`,
     `overCover` -> 2; `front`, `side` -> 3; every other kind -> -1.
   - `loadKnifeClips(): Promise<void>` (dynamic `import()` of the six clip modules into a module table, once; a second
     call returns the same promise), `knifeClipsReady(): boolean`, `knifeClip(row: number, victim: boolean)` (resolved
     clip by row index, no lookup by name on the hot path).
   - `buckleAt(sinceContact: number): number`: 0 before contact, eases to 1 over `buckleRise`, back to 0 over
     `buckleDecay`.

2. `src/anim/killDrive.ts` (new; pure, allocation-free per call)
   - `KillDrive { clip, phase, w, mirror, buckle, bucklePitch }`, `newKillDrive()` (allocates its scratch pose once),
     `killDriveTargets(d, o)`: sample `clip` at `phase` (0..1) into the scratch pose, mix into `o.keyed` by `w` (as
     `mixKeyed`), raise `o.keyW` / `o.keyArmW` to at least `w`, then add `buckle * bucklePitch` to spine (40%) and chest
     (60%) pitch. Feet planted (pace 0). Never reads `keyedOk`.
   - `src/anim/animGraph.ts`: `kill: KillDrive | null = null` beside `drive`, and one line right after the studio hook
     (:2119): `if (this.kill !== null) killDriveTargets(this.kill, o);`. `notePlaying` unchanged.

3. `src/weapons/knifeModel.ts`: `tipWorld(out: Vector3): Vector3` (blade tip in world space from the node and the
   GLB's blade length; allocation-free). Nothing else changes.

4. `src/game/knifePair.ts` (new; render-frame helpers, allocation-free, preallocated scratch). One place for the
   pairing, used by the controller now and by S3's remote poses later.
   - `victimRoot(row, ax, ay, az, ayaw, k, fromX, fromZ, fromYaw, out)`: the row spot is the attacker's root plus
     `standoff` forward and `side` right in his frame, facing `ayaw + yawOff`; `k` (0..1, eased over the grab) blends
     from where the guard stood (`from*`) to the row spot. For a corner kill this pulls him round to the attacker's
     side of the corner (Campaign PB3).
   - `attackerHands(row, ph, sinceContact, attackerRig, victimRig, knife, wGrip)`: left hand (`reachL`) on the grip
     mark (mouth: head + 0.09 m forward, 0.07 m down, as the interrogation jaw hold `takedownController.ts:776-781`;
     shoulder: `holdHandTargets`' shoulder point), weight `wGrip`; right hand (`reachR`) from a wind-up point 0.25 m back
     along the attacker's facing to the row's target bone over the last `stabIn` before contact, the knife tip (not the
     wrist) on the target from contact to `limp`, out over `release`.
   - `victimHands(row, sinceContact, attackerRig, victimRig)`: the guard's `reachL` / `reachR` on the attacker's left
     forearm at 0.40 and 0.75 of elbow to wrist, in over `victimHandsIn` before contact, held to `limp`, out over
     `release`.
   - `contactErrors(attackerRig, victimRig, knife, out)`: grip palm, knife tip and both guard palms to their marks
     (m). For tests and S2's measure script.
   - First check `solveArm` (`characterRig.ts:3843`) runs `reachL` / `reachR` on a guard's rig. If a guard's update
     skips it, add the smallest hook in `enemy.ts` and say so in the PR; no rig rewrite.

5. `src/game/takedownController.ts`
   - `knife = false`; `setKnifeScene(on: boolean)`: sets it; on true starts `loadKnifeClips()` (not awaited).
   - Per active: `kr` (row, -1 off), `kt` (s since the clip started), and a short tail after `finish` so the attacker's
     clip plays to its end before he is free (no new offer until then).
   - `start` (:227): when `knife` and the victim is not quadruped: `lethal = true`, `decided = true`, no grab (one
     press, no tap / hold; Campaign PB5); `kr = o.e.knifeVictim && knifeClipsReady() ? pickKnifeKill(plan.kind,
     c.crouched) : -1`; `g.weapons.knife.show(true)`. The start event carries `lethal: true` and `knife: true`.
   - Run step (:670-723), when `kr >= 0`: the approach as today. From the grab (the last `gripIn` share of the
     approach) to `limp`, every step: `holdAt` from `victimRoot` with the attacker's current root and yaw (not a stored
     point). After the approach: `kt += dt`, `ph = kt / row.seconds`; attacker `rig.graph.kill` at `ph`, `w` eased in
     over `blendIn`; victim `e.knifeVictim(clip, victimFrom + ph * (1 - victimFrom), buckleAt(kt - contact * seconds))`.
     `blowPh` stays -1; `pose.melee` is never set. At `ph >= limp`: `finish()`.
   - `frameUpdate` (:727): when `kr >= 0`, re-place the victim's rig root from the attacker's rendered root
     (`victimRoot`), then `attackerHands` and `victimHands`, so render interpolation cannot pull them apart.
   - `finish` (:812): for a knife row: no `killWarp` tail; `applyDamage` as today (lethal); noise `KNIFE.noise` (not
     `NOISE_STRIKE`); the done event carries `knife: true`; `done.byKind.knife` counted; the hands release over
     `release` and the ragdoll takes the last pose; the attacker's drive runs on to 1 and blends out over `blendOut`,
     then `knife.show(false)` and `rig.graph.kill = null`.
   - Damage to the attacker: before contact, `abort()` as today; after contact, `finish()` at once.
   - `abort` (:849): clears both drives, all four hand weights, hides the knife.
   - `kr === -1` with the switch on: today's move, lethal forced, knife shown from the press to the end.

6. `src/game/takedownController.ts` `TakedownVictim` (:57-82): add optional
   `knifeVictim?(clip: KeyedClip | null, ph: number, buckle: number): void`. `EnemyPuppet` is not edited, so a co-op
   client's puppets fall to the -1 path until S3.

7. `src/ai/enemy.ts` (beside `beginTakedown` :835): `knifeVictim(clip, ph, buckle)` sets or clears his rig graph's
   `kill` drive (allocated once per enemy on first use), his struggle emote off while it plays; cleared in `die`
   (:2345) once the ragdoll has taken the pose. Tell Guard AI in the PR body (one line).

8. `src/game/gameState.ts` (:1518-1525 only): with `td.knife` on, no grab row; the `'ko'` row is offered with
   `TD_LABEL[kind]`. `ctxRun` unchanged (the controller forces the kill).

9. `src/anim/studio.ts` + `src/game/studioStage.ts`: one pair row per `KNIFE_KILLS` row (`pair: knife <id>`) that runs
   Wren and a guard rig on one clock through `KillDrive` and `knifePair` (same code as the game), looping with 0.5 s
   rest, the knife shown. For the look video.

10. `docs/art-credits.md`: the "Used by" cells of `cross_punch` (:71), `crouch_to_stand` and the three rifle deaths
    (:154 and neighbours) add "piano knife kill stand-in (piano-knife S1)". `docs/systems/takedowns.md`: a short
    "Knife kills (piano scene)" section (gate, rows, pairing, contact rule, noise, body).

## Tests (one closest set, run once; a red test gets one fix and one rerun)
- `tests/knifeKill.test.ts`: gate truth table over every `MAPS` and `DEV_MAPS` entry (read `scene` as
  `(m as { scene?: string }).scene`) x flag x live, true only for `scene: 'piano'` with both on, plus a synthetic
  `{ id: 'thornbeckMill', scene: 'piano' }`; `pickKnifeKill` over every `TakedownKind` x crouched; every row: `seconds`
  in 1.0-1.5, `0 < contact < limp < 1`, both clips are `mocapSources` keys; `KNIFE_KILL_IDS.length <= 8`; `buckleAt`
  0 before contact, at most 1, 0 after rise + decay.
- `tests/killDrive.test.ts`: identity at `w` 0 and `buckle` 0; buckle touches spine and chest pitch only; 1000 calls
  allocate nothing (`tests/helpers/allocPerCall`).
- `tests/knifePair.test.ts` (headless rigs, the harness `tests/mixamoTraverse.test.ts` uses): each row sampled at
  1/60 s with the attacker walking 0.3 m/s and turning 0.5 rad/s through the move (proves attached, not placed once):
  grip palm within 3 cm from the end of the grab to `limp`; knife tip within 3 cm of the target from contact to
  `limp`; each guard palm within 3 cm of its forearm mark from contact to `limp`; the guard's root at the row offset
  within 1 mm from the end of the grab to `limp`; the corner row ends on the attacker's side.
- `tests/knifeTakedown.test.ts` (the fake-game controller harness of `tests/takedownAlloc.test.ts` /
  `tests/hangDownTakedown.test.ts`): switch off = today's event sequence and noise for behind, corner and front;
  switch on = one press, no grab, lethal done event with `knife: true`, `hear` radius 1.2, victim dead; a victim
  without `knifeVictim` = the -1 path (lethal, knife shown); switch on before the clips resolve = the -1 path; damage
  before contact aborts and releases; damage after contact finishes; knife hidden and both drives null at the end.
- Existing, must stay green: `tests/takedown.test.ts`, `tests/takedownAlloc.test.ts` (add: a knife run allocates
  nothing per step), `tests/mocapGuards.test.ts`, `tests/grabMenu.test.ts` (add: switch on = no grab row),
  `tests/mocapSources.test.ts`, `tests/dualTakedown.test.ts`, `tests/elbowStrike.test.ts`.

## Checks
- `npm run typecheck:fast`
- `npx vitest run tests/knifeKill.test.ts tests/killDrive.test.ts tests/knifePair.test.ts tests/knifeTakedown.test.ts
  tests/takedown.test.ts tests/takedownAlloc.test.ts tests/mocapGuards.test.ts tests/grabMenu.test.ts
  tests/mocapSources.test.ts tests/dualTakedown.test.ts tests/elbowStrike.test.ts`
- Laptop: the PR head's `affected-e2e`; the lead requests `e2e-coop` + `e2e-netmove` (`request.mjs`; `src/game`,
  RULES test table) and the checkers pass only when they are green.
- Two independent Opus checkers. Each confirms: switch off changes nothing; no `src/net` import or edit; nothing
  allocates per step or frame; `pose.melee` never set on a knife row; the contact test samples every frame, not only
  contact.
- Look video (laptop GPU queue): the Studio rows `knife behind` and `knife corner`.

## Done looks like
- The four Studio knife rows play Wren and a guard as one move: his left hand on the guard's mouth or shoulder, the
  guard moving with him, the knife going in at contact, the guard buckling with his hands on Wren's forearm, then
  falling.
- In a headless run with the switch on, every takedown kind ends in a knife kill at 1.2 m noise; with it off, the
  existing takedown tests and event sequences are unchanged.
- Campaign can call `takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, true))` from `pianoScene.ts`
  and get PB5 + PB1.
