# piano-knife S4b: intro pose (empty pistol, back to the bins, calm breath)
Owner: Night Shift | Player Build. Status: current. Builder: Opus. Checkers: two independent Opus (`src/net/remoteAvatar.ts`
and a MoveState bit, RULES "The loop"). Branch `feature/piano-knife-s4b` in `C:/NightShift/Mobile-Coop-piano-knife-s4b`,
cut from origin/master once #614 (with S2 #620 merged into it) and #623 are on master; PR base `master`. Not stacked on
`feature/piano-knife-s4a`: S4b needs both S4a's `slideLock` and S2's `breathing_idle` clip, and no branch has both.
Est. ~430 lines with tests.

Read first: `BRIEF.md` (A11, A12, A13; "Michael said" ~19:20 and Q39 / G400), `PLAN.md` 2.7 and section 4 S4b,
`S4a-BRIEF.md` (Doubts 2 and 3). Prototype mode: every number below is a starting value; no tuning, one test set. Every
design choice is made here; if something below does not match the code, stop and report to the lead, do not improvise.
Line numbers are origin/master 6717cb6a1 (before #614 / #623): find the quoted anchor text, the numbers will have moved.

## Goal
Michael ~19:20: "a black screen, slowly fading in to the characters upper chest, zooming out slowly, showing them holding
an empty pistol, calmly breathing". Campaign owns the camera, fade, actors and the EMP; this slice gives Campaign one call,
`GameState.introPose(on, variant)`: the operator's back on the nearest high face (W1, the grain bins), the pistol out at
low ready in both hands, its slide locked back (S4a), one calm breath every 4 s on the trunk taken from the captured
Breathing Idle, the hero LOD while the intro runs. `introPose(false)` (the cut to play) takes the operator off the wall,
holsters the pistol and puts the slide forward (lead decision: the slide goes forward when holstered, A13). In co-op each
page calls it for its own operator only; the partner's screen poses him from his MoveState (G400), so both players look
the same everywhere. Map `thornbeckMill`, scene `'piano'`; Campaign's spots (4.0, 4.6) and (4.0, 6.0), backs to W1 (face
x 4.5), facing west (`thornbeckMill.ts` start / start2 on `feature/piano-escape-s4`).

## Out of scope (do not build)
No `pianoScene.ts`, `pianoIntro*.ts`, map, camera, fade, music or EMP edit (Campaign wires the two calls). No
`flags.ts` edit: nothing calls `introPose` outside Campaign's scene (flag `pianoEscape`) and the Anim Studio rows. No new
wire field and no `PROTOCOL_VERSION` bump. No keyed trunk drive, no shoulder / clavicle breath, no head motion from the
clip. No change to `BREATH` (the procedural idle breath elsewhere), `slideLock` itself, the GLB, `knifeKill.ts`, the S1 /
S2 files, `mocapSources.ts`, `mixamo-clips.json` or the clip module. No re-emit.

## Changed from PLAN 2.7 (the lead updates PLAN)
1. Not a held keyed trunk drive. The rig applies a keyed pelvis offset and trunk absolutely by weight
   (`characterRig.ts:2398-2417`, `:2588` `keyedTrunk`), so the take would pull the body off the flat-back wall stance, and
   in any 2-4 s window of it the pelvis wanders 5-17 cm sideways and the head turns 5-7 deg at the seam (measured, below).
   S4b takes only the breath: the take's spine + chest pitch about the window's mean, added where the procedural breath
   already goes (`animGraph.ts:1541`, `+ breath`). Arms stay on the gun, the wall stance stays.
2. The ~4 s window. The take's breaths are 2.0-2.4 s (spine + chest pitch minima at 2.80, 4.84, 6.89, 9.33 s), so a 4 s
   window holds two quick breaths. S4b plays one breath, 4.592-6.838 s (frames 92-137 of 199 at even phases over the
   9.933 s loop; seam spine 0.37 deg, chest 0.69 deg, pelvis 0.04 cm; spine + chest pitch 5.7 deg peak to peak, its
   seam 0.017 rad, so 0.050 rad and 0.0085 rad after `gain` 0.5), over
   4.0 s (0.56x): one calm breath every 4 s (A11). The alternative, 4.043-7.587 s at 1x (two breaths, seam spine 0.00 /
   chest 0.85 deg), is one tuner slider away (window start, cycle).
3. The "standing_idle until I1" fallback is gone (I1 is in, S2). Until the lazy clip module resolves (first intro
   frame), a sine at the same 4 s cycle stands in.

## Setup (once)
1. Start check (Git Bash): `git -C C:/NightShift/Mobile-Coop fetch origin master && git -C C:/NightShift/Mobile-Coop cat-file -e origin/master:src/anim/clips/mixamo/piano/breathing_idle.ts && git -C C:/NightShift/Mobile-Coop show origin/master:src/weapons/weaponModel.ts | grep -q "slideLock(on: boolean)"`.
   Exit non-zero: stop and tell the lead (#614 / #620 / #623 not all on master yet).
2. `git -C C:/NightShift/Mobile-Coop worktree add -b feature/piano-knife-s4b C:/NightShift/Mobile-Coop-piano-knife-s4b origin/master`,
   then `npm ci` in it (600 s timeout).
3. Guard before every write:
   `cd /c/NightShift/Mobile-Coop-piano-knife-s4b && test "$(git rev-parse --abbrev-ref HEAD)" = feature/piano-knife-s4b && test "$(git rev-parse --show-toplevel)" = "C:/NightShift/Mobile-Coop-piano-knife-s4b"`
4. Commit and push each step on its own (`git add <the step's files>`, never `-A` or `.`;
   `git push origin feature/piano-knife-s4b`).

## Files and exact behaviour
Step 1: the breath, the wall bit, the graph (pure / anim / player).

1. `src/anim/introBreath.ts` (new; pure, no Babylon; no allocation per call after the clip loads)
   - `export type IntroVariant = 'stand' | 'mirror' | 'crouch';` `export const INTRO_VARIANTS = ['stand', 'mirror', 'crouch'] as const;`
     (stand: back flat, pistol right hand; mirror: the same with the pistol in the left hand; crouch: the game's crouched
     wall stance, pistol in both hands).
   - `export const BREATH_TAKE_S = 9.933;` (one loop period of `MOCAP_BREATHING_IDLE`; `mocapSources` studio cycle).
   - `export const INTRO_BREATH = { from: 4.592, len: 2.246, cycle: 4.0, gain: 0.5, amp: 0.012, fade: 0.4 };` with a doc
     comment: one breath of the take, `from` .. `from + len` s (Changed from PLAN item 2), played over `cycle` s; `gain`
     scales its spine + chest pitch about the window mean (rad, added to the graph's spine pitch); `amp` (rad) the sine
     that stands in until the clip loads; `fade` (s) the intro breath in / out.
   - Tuner section, as `strikeBody.ts:188-216`: `INTRO_GROUPS = ['intro.pose'] as const`; `INTRO_TUNABLES`:
     `{ id: 'breathGain', label: 'Intro: breath depth', kind: 'mul', def: 1, min: 0, max: 3, step: 0.05, unit: 'x', ... hook: 'introBreath.ts INTRO_BREATH.gain' }`,
     `{ id: 'cycleMul', label: 'Intro: breath cycle', kind: 'mul', def: 1, min: 0.5, max: 2, step: 0.05, unit: 'x', ... hook: 'INTRO_BREATH.cycle (s per breath)' }`,
     `{ id: 'fromAdd', label: 'Intro: window start', kind: 'add', def: 0, min: -4.5, max: 2.5, step: 0.05, unit: 's', ... hook: 'INTRO_BREATH.from (s into Breathing Idle)' }`;
     `export const INTRO_SIM = { on: false };` `export const INTRO_SECTION = registerTuneSection({ id: 'intro', label: 'Intro pose', note: 'The piano intro (piano-knife S4b): the captured breath on the trunk. Every Wren rig (the local player and a remote partner).', groups: INTRO_GROUPS, tunables: INTRO_TUNABLES, select: () => (INTRO_SIM.on ? 'intro.pose' : null) });`
     Values read from `INTRO_SECTION.eff['intro.pose']`, the defaults under `TUNE_FLAGS.bypass`.
   - `loadIntroBreath(): Promise<void>`: once, `import('./clips/mixamo/piano/breathing_idle')` and keep
     `MOCAP_BREATHING_IDLE` in a module variable; a second call returns the same promise. `introBreathClip(): KeyedClip | null`
     starts the load on its first call and returns the clip or null.
   - `introBreath(t: number): number` (rad; `t` s since the intro started, >= 0). `cycle = INTRO_BREATH.cycle * cycleMul`,
     `u = (t % cycle) / cycle`. No clip: `Math.sin(u * 2 * Math.PI) * INTRO_BREATH.amp`. Clip: `from = INTRO_BREATH.from + fromAdd`;
     `sampleKeyed(clip, wrap01((from + u * INTRO_BREATH.len) / BREATH_TAKE_S), 1, scratch, null)` (`wrap01` inline:
     `x - Math.floor(x)`; do not import `studioDrive.ts`) into a module scratch
     pose (`newKeyedPose()` once); `trunk = pitch(q, KQ.spine) + pitch(q, KQ.chest)` with
     `pitch = atan2(2 (w x + y z), 1 - 2 (x^2 + y^2))` on the (x, y, z, w) at that offset; return
     `(trunk - mean) * INTRO_BREATH.gain * breathGain`. `mean`: the average `trunk` over 64 even samples of the window,
     computed into a module number when the clip first resolves and again only when `from` changes (no allocation). Sign
     as sampled (no flip); the look video decides.

2. `src/player/wallController.ts`
   - `WALL_SUB` (:154): add `intro: 32` and change the comment to "(A3: the lean bit 32 is gone with the lean-out;
     piano-knife S4b uses 32 for the intro pose.)".
   - `WallCore`: `/** (piano-knife S4b) The piano intro pose holds this wall (IntroPose): WALL_SUB.intro; introLeft: the
     mirror variant, the weapon in the left hand. */ intro = false; introLeft = false;`
   - `sub()` (:695): OR in `(this.intro ? WALL_SUB.intro : 0)`.
   - `leftHand` (:652): `return (this.intro && this.introLeft && this.active) || (this.phase === 'on' && wallLeftHand(this.sub()));`
     (so `localMoveState.ts:105` sends `WALL_SUB.leftHand` and `wallStep`'s `weapons.handLeft` puts the gun in the left
     hand with no edit there).
   - `update` (:483), active branch: wrap the three leave checks (from `if (i.leave) return this.leave('action');` :520 to
     the end of the hold-mode block) and the crouch toggle block in `if (!this.intro) { ... }` with the comment
     "(piano-knife S4b) the intro pose holds the wall: no button, aim, crouch or hold-mode release leaves it
     (`IntroPose.set(false)` does)". The settle and slide code is unchanged (the intro input is blank: no slide).

3. `src/player/moveState.ts`
   - `MovePose` (:284): `/** (piano-knife S4b) The piano intro pose (WALL_SUB.intro 32): both hands on the low-ready gun,
     the captured breath, the slide locked back. */ intro: boolean;`; `emptyMovePose` `intro: false`.
   - `poseFromMoveState`: `out.intro = false;` with the other resets; in `case 'wall'`: `out.intro = (mv.sub & 32) !== 0;`
     and the left hand (:339) becomes `out.leftHand = (mv.sub & 128) !== 0 && (mv.sub & (4 | 32)) !== 0;` (the open-left
     hand at a left edge, or the mirror intro). `sanitizeMoveState` already keeps a wall `sub` 0..0xff.

4. `src/anim/animGraph.ts`
   - `AnimInput` (after `wall: boolean;` :149): `/** (piano-knife S4b) The piano intro pose (back to a wall, IntroPose /
     WALL_SUB.intro): the gun stays at low ready in both hands (no wall tuck, no hang) and the trunk takes the captured
     breath (introBreath). */ intro: boolean;` `defaultInput` `intro: false,` after `wall: false,` (:258).
   - Fields beside `breathPh` (:940): `/** (piano-knife S4b) Seconds into the intro pose and its weight 0..1. */ private introT = 0; private introW = 0;`
   - The breath (:1516-1520): keep `breathT` / `breathW` / `breathPh`; replace the `const breath = ...` line with
     ```ts
     // (piano-knife S4b) the intro pose: the captured breath (introBreath), in from the intro's start with no stillness
     // gate, on a clock from the intro's start on every rig (owner and remote copy alike, as the brace's breath :791)
     this.introW = approach(this.introW, i.intro ? 1 : 0, INTRO_BREATH.fade, dt);
     this.introT = i.intro || this.introW > 1e-4 ? this.introT + dt : 0;
     const breathP = Math.sin(this.breathPh) * BREATH.amp * this.breathW;
     const breath = (this.introW > 1e-4 ? breathP + (introBreath(this.introT) - breathP) * this.introW : breathP) * (1 - raise);
     ```
   - The wall tuck (:1609) `atWall ? 1 : 0` -> `atWall && !i.intro ? 1 : 0`; the step-in compress (:1622)
     `const enterK = atWall && !i.intro ? ... : 0`; the hang (:1725) `const wallHang = atWall && !i.intro ? ... : 0`,
     each with `// (piano-knife S4b) not in the intro pose: the pistol at low ready in both hands`.
   - Import `INTRO_BREATH, introBreath` from `./introBreath`. Nothing else in the graph changes.

5. `src/player/characterRig.ts`: `RigPose` (beside `wall?: boolean;`): `/** (piano-knife S4b) The piano intro pose. */
   intro?: boolean;`; the input copy (after `i.wall = s.wall ?? false;` :1845): `i.intro = s.intro ?? false;`.

6. `src/player/player.ts`: `PlayerPose` (:34) `/** (piano-knife S4b) The piano intro pose (set by back-to-wall from
   WallCore.intro). */ intro: boolean;`; the `pose` literal (:158) `intro: false`; after `rp.wall = cp.wall;` (:473)
   `rp.intro = cp.intro;`.

Step 2: the call, the remote, the Studio.

7. `src/game/introPose.ts` (new; no Babylon import)
   ```ts
   export interface IntroPoseHost {
     /** The back-to-wall core (made on first use, as wallStep). */
     wall(): WallCore;
     readonly player: { readonly position: { x: number; y: number; z: number }; readonly alive: boolean; readonly stance: { base: 'holstered' | 'lowReady'; holster(): void } };
     /** The loadout's pistol model, or null. */
     pistol(): { slideLock(on: boolean): void } | null;
     /** The player camera as a close-up camera (the hero LOD) on / off. */
     closeUp(on: boolean): void;
   }
   ```
   `export class IntroPose { on = false; variant: IntroVariant = 'stand'; constructor(private readonly host: IntroPoseHost) {} set(on: boolean, variant: IntroVariant = 'stand'): boolean }`:
   - `set(true, v)`: if `!player.alive` return false. `w = host.wall()`, `p = player.position`;
     `k = w.find(p.x, p.y, p.z, 0, 0, 0, 0, true, -1)` (the nearest high face whose body line is within `WALL.reach`
     0.5 m; any facing); `k < 0`: return false, nothing changed. Else `w.enter(k, p.x, p.z, v === 'crouch', 0, 0)`;
     `w.intro = true`; `w.introLeft = v === 'mirror'`; `player.stance.base = 'lowReady'` (the draw runs in the 0-3 s
     black); `host.pistol()?.slideLock(true)`; `host.closeUp(true)`; `void loadIntroBreath()`; `INTRO_SIM.on = true`;
     `this.on = true; this.variant = v`; return true. Called again while on: the same (re-enters; harmless).
   - `set(false)`: if `!this.on` return false. `w.intro = w.introLeft = false`; `w.leave('intro')`;
     `player.stance.holster()`; `host.pistol()?.slideLock(false)`; `host.closeUp(false)`; `INTRO_SIM.on = false`;
     `this.on = false`; return true. Leaving keeps the wall's stance (`wallStep`'s crouch carry-over, :3456-3459).

8. `src/game/gameState.ts`
   - `wallStep` (:3414): the `this.wallCore ??= new WallCore(segs, buildWallLinks(segs), COVER_STANDOFF)` moves into
     `private wallCoreOf(): WallCore` (same expression), called there.
   - After `pose.wall = w.active;` (:3461): `pose.intro = w.active && w.intro; // (piano-knife S4b)`.
   - A field and a method (near `studioTeleport` :3602):
     ```ts
     private introCtl: IntroPose | null = null;
     /**
      * (piano-knife S4b) The piano intro pose (Campaign's pianoScene: on at the intro's start, off at the cut; the Anim
      * Studio's intro rows): back to the nearest high face, the pistol at low ready with its slide locked back, the
      * captured breath, the hero LOD. False: no high face within reach (nothing changed) or already off.
      */
     introPose(on: boolean, variant: IntroVariant = 'stand'): boolean {
       const c = (this.introCtl ??= new IntroPose({
         wall: () => this.wallCoreOf(),
         player: this.player,
         pistol: () => { const i = this.weapons.sidearmIndex; return i >= 0 ? this.weapons.slots[i]!.model : null; },
         closeUp: (o) => setCloseCamera(this.player.cam.camera, o),
       }));
       return c.set(on, variant);
     }
     ```
     (`setCloseCamera` from `../operators/runtime/figure`; render side only, every operator body in the scene, the
     partner's too.)
   - The studio host (:996-1023): `introPose: (on, v) => g.introPose(on, v),`.

9. `src/net/remoteAvatar.ts` (two lines of logic; G400)
   - The rig pose literal (:756): `intro: mp.intro,` after `wall: mp.wall,` (:791).
   - A field `private introSlide = false;` and, right after `const mp = ...` (:561):
     ```ts
     // (piano-knife S4b) the partner's intro pose: his empty pistol's slide locked back while WALL_SUB.intro is on, as his own
     if (mp.intro !== this.introSlide) {
       this.introSlide = mp.intro;
       if (this.weapon) this.models.get(this.weapon)?.slideLock(mp.intro);
     }
     ```
   The partner's pose, breath and left-hand gun then come from the same graph code and the existing `leftHand` path
   (`:676`); the hero LOD from the local close-up camera. Nothing else in `src/net`.

10. `src/anim/studio.ts` + `src/game/studioStage.ts` (Michael's standing rule: every clip used has a Studio row and stays
    tunable; `mocap_breathing_idle` keeps its motion-capture row from S2)
    - `StudioEntry`: optional `/** (piano-knife S4b) The piano intro pose's variant (IntroPose at the platform's back-to-wall face). */ intro?: IntroVariant;`
    - After `state('crouchAimFwd', ...)` (:173): `{ ...state('intro', 'piano intro (stand)', 0, 'none', false, true), intro: 'stand' }`,
      the same for `introMirror` / `'piano intro (mirror)'` / `'mirror'` and `introCrouch` / `'piano intro (crouch)'` /
      `'crouch'` (crouch `true`).
    - `studioWeaponFor` (:490): `return e.intro ? 'pistol' : e.drawn ? weapon : '';`
    - `StudioHost`: `/** (piano-knife S4b) GameState.introPose. */ introPose(on: boolean, variant: IntroVariant): boolean;`
    - `studioStage.ts`: `const STUDIO_INTRO = { x: 1.5, z: 7.55, yaw: Math.PI };` (the climbing platform's south face,
      z 8, x 0-3, 3 m high: `STUDIO_PROPS.platform`, "the back-to-wall wall"). A field `private introOn = false;`. In
      `configure`, inside `if (clipChanged)` first: `if (this.introOn) { this.host.introPose(false, 'stand'); this.introOn = false; }`;
      after the Wren-back-to-the-middle block: `if (e.intro) { this.host.teleport(STUDIO_INTRO.x, 0, STUDIO_INTRO.z, STUDIO_INTRO.yaw); this.away = true; this.introOn = this.host.introPose(true, e.intro); }`.
      `dispose`: `if (this.introOn) this.host.introPose(false, 'stand');` before `this.detach()`.

Step 3: tests, docs.

11. `tests/introPose.test.ts` (new) and `tests/animStudio.test.ts` (one case), below.
12. `docs/systems/movement.md`: after the "Open-side hand" bullet (:312) add: "- Piano intro pose (piano-knife S4b):
    `GameState.introPose(on, variant)` (`game/introPose.ts`) puts the operator's back on the nearest high face within
    reach, the pistol at low ready in both hands (no wall tuck or hang), slide locked back, one breath of the captured
    Breathing Idle every 4 s on the trunk (`anim/introBreath.ts`, tuner section "Intro pose"), the hero LOD; off: off the
    wall, holstered, slide forward. Remotes from `WALL_SUB.intro` (32; mirror: `leftHand`)." `changes/feature-piano-knife-s4b.md`
    (`kind: patch`, three lines: the intro pose for the piano scene, dark until Campaign calls it).

## Tests (one closest set, run once; a red test gets one fix and one rerun)
`tests/introPose.test.ts`, four `describe`s; the very first test in the file is the `introBreath` stand-in check below
(before anything starts the clip's load):
- `IntroPose`: a real `WallCore([seg], buildWallLinks([seg]), COVER_STANDOFF)` over one synthetic high `CoverSegment`
  (W1's face: `ax 4.5, az 3, bx 4.5, bz 7.5, tx 0, tz 1, nx -1, nz 0, len 4.5, y 0, height 2.8, low false, depth 2,
  nextA -1, nextB -1, id 0, piece 0`) and a fake host (records `closeUp` calls, a fake pistol with `slideLock`, a stance
  with `base` and a `holster` spy). (1) At (4.0, 0, 4.6) `set(true, 'stand')` is true; the core is active on seg 0,
  `sub() & WALL_SUB.intro` set, crouch bit clear, `leftHand` false; base `'lowReady'`; the pistol locked; `closeUp(true)`
  once; `INTRO_SIM.on`. 120 `update(1/60, emptyWallInput() with toggle false and leave true)` later it is still active
  (the pin). `set(false)`: phase `'leaving'`, `intro` false, `holster` called, the pistol unlocked, `closeUp(false)`,
  `INTRO_SIM.on` false; a second `set(false)` is false. (2) At (4.0, 0, 6.0) `'mirror'`: `leftHand` true. (3) `'crouch'`:
  `crouch` true and the crouch bit set. (4) At (2.5, 0, 4.6) (2 m off): false, and the core, stance, pistol and close-up
  untouched.
- Wire: `WALL_SUB.intro === 32` and shares no bit with the other `WALL_SUB` values; `poseFromMoveState` on
  `{ m: 'wall', sub: 32 }` gives `intro` true and `leftHand` false; `32 | 128` gives `leftHand` true; `128` alone false
  (unchanged); `{ m: 'ground', sub: 32 }` gives `intro` false; `packMoveState` -> `sanitizeMoveState` keeps a wall
  `sub` of `1 | 32 | 128`. The owner's word for the mirror: `wc.sub() | (wc.leftHand ? WALL_SUB.leftHand : 0)` (as
  `localMoveState.ts:105`) from case (2) decodes to `intro` and `leftHand` true.
- `introBreath`: first, synchronously, `introBreath(1.0)` equals `INTRO_BREATH.amp` within 1e-9 (the stand-in, clip not
  resolved). After `await loadIntroBreath()`: `introBreathClip()!.name === 'mocap_breathing_idle'`; `BREATH_TAKE_S` equals
  `mocapSource('mocap_breathing_idle')!.studio.cycle`; `from >= 0` and `from + len <= BREATH_TAKE_S`; periodic
  (`introBreath(t)` equals `introBreath(t + INTRO_BREATH.cycle)` within 1e-9 for t 0..8 step 0.05); mean over 200 samples
  of one cycle within 0.002 rad of 0; peak to peak 0.01-0.08 rad; the seam `|introBreath(cycle - 1e-3) - introBreath(0)|`
  under 0.012 rad (0.0085 measured); `tuneSet('intro.pose', 'breathGain', 2)` doubles a sample (then `tuneResetAll()`); allocation:
  `bytesPerCall` over `introBreath((i % 400) * 0.01)` at most `HEAP_NUMBER` per call (as `tests/analogGear.test.ts:150`).
- Graph (`new AnimGraph(proportions())`, `defaultInput()` with `wall: true, wallSide: -1, armed: true,
  weight: classWeight('pistol')`, 1/60 s steps, two graphs side by side, `intro` false on one and true on the other,
  the clip loaded in `beforeAll`): after 2 s still, `o.offGrip` under 0.2 without the intro (the wall hang) and over
  0.99 with it (both hands); from 0.5 s to 1.9 s (before `BREATH.still`) the difference of the two graphs'
  `o.spine.pitch` varies by over 0.004 rad (the intro's breath with no stillness gate).
- `tests/animStudio.test.ts`: the rows `state:intro`, `state:introMirror`, `state:introCrouch` exist, drawn, with
  `intro` `'stand'` / `'mirror'` / `'crouch'`; `studioWeaponFor` gives `'pistol'` for each whatever the pick;
  `studioInput` on `state:introCrouch` asks crouch.
- Existing, must stay green: `tests/wallController.test.ts`, `tests/moveState.test.ts`, `tests/net.test.ts`,
  `tests/poseParity.test.ts`, `tests/playerVolumes.test.ts`, `tests/anim.test.ts`, `tests/animBakeAll.test.ts`,
  `tests/studioCapturesLazy.test.ts`, `tests/pistolSlide.test.ts`, `tests/protocolConst.test.ts`.

## Checks
- `npm run typecheck:fast`
- `npx vitest run tests/introPose.test.ts tests/animStudio.test.ts tests/wallController.test.ts tests/moveState.test.ts
  tests/net.test.ts tests/poseParity.test.ts tests/playerVolumes.test.ts tests/anim.test.ts tests/animBakeAll.test.ts
  tests/studioCapturesLazy.test.ts tests/pistolSlide.test.ts tests/protocolConst.test.ts`
- Laptop: the PR head's `affected-e2e`. The diff touches `src/net`, so it runs exactly the co-op group (`e2e-coop` +
  `e2e-netmove` + `e2e-ctcourse`), which covers the `src/player` gate (`e2e-coop` + `e2e-netmove`); if
  `--affected origin/master --list` names anything else, the lead requests `e2e-coop` + `e2e-netmove` (`request.mjs`,
  set `pk-s4b-coop`). The checkers pass only when it is green.
- Two independent Opus checkers. Each confirms: nothing changes with `intro` false (the graph's three wall sites and the
  breath are bit-identical then; `WallCore.sub()` unchanged while `intro` is false); bit 32 is set only while
  `introPose` holds a wall; no new wire field, no `PROTOCOL_VERSION` change; `introBreath` and the graph add no per-frame
  allocation; the remote locks the partner's slide only from the bit; `introPose(false)` holsters, unlocks and drops
  the close-up.
- Look video (laptop GPU queue): the Studio rows `state:intro` and `state:introMirror`, a chest close-up and a pull-back
  (Wren's back on the platform face, both hands on the pistol, slide back, a slow breath). In the scene once Campaign
  wires the calls.

## Claims (files)
- New: `src/anim/introBreath.ts`, `src/game/introPose.ts`, `tests/introPose.test.ts`, `changes/feature-piano-knife-s4b.md`.
- Edited: `src/player/wallController.ts`, `src/player/moveState.ts`, `src/anim/animGraph.ts`,
  `src/player/characterRig.ts`, `src/player/player.ts`, `src/game/gameState.ts` (`wallStep` two lines, `introPose`, the
  studio host line), `src/net/remoteAvatar.ts`, `src/anim/studio.ts`, `src/game/studioStage.ts`,
  `tests/animStudio.test.ts`, `docs/systems/movement.md`.
- Wire: `WALL_SUB.intro` 32 in the existing `wall` `sub` byte (no new field, no bump). Save paths: none. Maps: none.
  Flags: none. Not touched: everything in "Out of scope", `src/game/localMoveState.ts` (the bit rides `wc.sub()` and
  `wc.leftHand`), `docs/piano-knife/*` (the job branch's).
- Changed from PLAN section 3: adds `src/anim/introBreath.ts`, `src/game/introPose.ts`, `src/player/wallController.ts`,
  `characterRig.ts`, `player.ts`, the studio files and `movement.md`. The lead updates PLAN 3.

## PR
`gh pr create --base master --head feature/piano-knife-s4b --title "Piano scene: intro pose (empty pistol, back to the bins, calm breath) (dark, piano-knife S4b)"`.
Body: what was built, the numbers used (`INTRO_BREATH`), the window (Changed from PLAN 2), the wire bit, files, commits,
tests and results, the two calls Campaign makes (below), the attribution lines your session gives. Size note.

For Campaign (PR body and the lead's message): in `pianoScene.ts` `onIntro` (their `TODO(knife S4b)` line)
`g.introPose(true, variant)` for the local operator only, and `g.introPose(false)` in `cut()`; it returns false when no
high face is within reach of the spot (Campaign's spots are 0.5 m from W1's face: fine). Do not call `setCloseCamera`
for the intro camera as well.

## Questions for Campaign (via the lead; the defaults hold until answered, no code waits)
1. Which variant for which operator? Default: `'stand'` for the operator on `start` (solo and host), `'mirror'` for the
   one on `start2` (side by side they frame symmetrically); `'crouch'` is there if they want the partner low.
2. At the cut `introPose(false)` takes the operator off the bins (free standing, pistol holstered). Default: yes; the
   alternative (stay on the wall at the cut) is a one-line change.

## Size
| Part | Lines |
|---|---|
| `introBreath.ts` | ~95 |
| `introPose.ts` + `gameState.ts` | ~75 |
| `wallController.ts` + `moveState.ts` + `animGraph.ts` + `characterRig.ts` + `player.ts` | ~45 |
| `remoteAvatar.ts` | ~8 |
| Studio files | ~25 |
| Tests | ~170 |
| Docs + fragment | ~12 |
| Total | ~430 |

## Done looks like
- Studio row "piano intro (stand)": Wren's back flat on the platform face, the pistol low in both hands, the slide back
  2 cm, one slow breath every 4 s at the chest; "(mirror)" the same with the gun in her left hand; "(crouch)" the
  crouched wall stance with the gun in both hands. The tuner's "Intro pose" section changes the depth, the cycle and the
  window live.
- In a two-tab run, an operator in the intro pose shows the same pose, gun hand and locked slide on the partner's page.
- With `introPose` never called, every wall, breath and MoveState is exactly today's.

## Doubts
1. One breath slowed to 0.56x may read floaty; the two-breath window at 1x is the alternative (Changed from PLAN 2). Walk
   note, tuner sliders.
2. The breath is spine + chest pitch only (no shoulder rise); a shoulder layer is polish.
3. The partner's breath clock starts when his intro bit arrives, about the link latency (0.1-0.2 s) behind his own
   screen: the same pose, a small phase lag (as the brace breath, `animGraph.ts:791`). A wire phase only if Michael sees it.
4. The crouch variant is the game's crouched wall stance (side-on, kneeling), not flat-backed.
5. S4a Doubt 1 (the baked AO band under the slide) shows in the close-up; polish list.
6. The hero LOD (55 MB) loads at the intro's start on each page; under `?gfx=min` (e2e) LOD2.
