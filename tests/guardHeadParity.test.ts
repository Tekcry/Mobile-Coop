/**
 * guard-render S3a: the sim head (`src/ai/guardHead.ts`) against the rig's head node. The head hit volume comes from
 * the sim; the rig is the reference it was fitted to. NullEngine, one rig per enemy kind, two root yaws.
 *
 * The harness mirrors `Enemy`: the body moves through a `MotionDriver` the way `Enemy.move` drives it (desired velocity
 * to a goal, the face yaw when given, aiming = face && armed, the calm or aimed tuning), and the rig gets the `RigPose`
 * exactly as `Enemy.frame` builds it (gait clock, motion state, body-frame acceleration, stride class, dash). The sim head
 * gets what `Enemy.syncHitboxes` gives it (the velocity in the guard's frame, the gait clock, the eased lean, the emote
 * weight copy `poseW`).
 *
 * Bounds (3D distance, m): T1 steady upright <= 0.05, T2 steady posed <= 0.08, T3 transitions every frame <= 0.12 and
 * back under the steady bound 0.3 s after the last change (an input change, the end of a start, stop, stepped turn or
 * pivot of the driver, or (S3a fix 2) the driver reaching its pace: acceleration under 0.2 m/s^2).
 * Only combinations the game produces are tested (S3a fix, finding 4):
 * - a high-cover lean is always away from the wall side (`Enemy.decide` 'inCover': `coverWallSide` is the side away
 *   from the nearest edge, `coverPeek = -edge.side`), and the guard walks towards the edge he leans past;
 * - low cover never leans (`coverPeek` is set for high cover only); its peek is standing up (the T1 aim poses);
 * - only `usesCover` kinds take cover (grunt, sniper, officer here; not the heavy, not the melee runner).
 * `GUARD_HEAD_PRINT=1` prints each case's mean rig head root-local offset (side, up, forward) next to the sim's and the
 * worst errors, and skips the assertions (the table to fit from; `GUARD_HEAD_OUT=<file>` writes it to a file).
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { GuardCqMode } from '../src/game/closeQuarters';
import { GRAB } from '../src/game/takedown';
import { CT } from '../src/config/movement';
import { ARMED, COVER, FREE, T1, T2, T3, YAWS, held, peekCycle, run, setup, upright, walk, wallStill, wallWalk, type Env, type Sc } from './helpers/guardHeadHarness';

const PRINT = process.env.GUARD_HEAD_PRINT === '1';
/** Debugging: `GUARD_HEAD_FRAMES=<file>` writes every sampled frame of the cases whose title matches `GUARD_HEAD_FILTER`
 *  (case, yaw, t, rig side / up / forward, sim side / up / forward, speed, gait clock, lean, motion state). */
const FRAMES = process.env.GUARD_HEAD_FRAMES;
const FILTER = new RegExp(process.env.GUARD_HEAD_FILTER ?? '.');
const frames: string[] = [];

// Written exceptions (S3a fix round; measured worst errors in docs/archive/guard-render/STATE.md "S3a fix round"). Each is a rig
// motion the sim has no state for (it never sees the feet); the bound is the measured worst rounded up, not a target.
/** Walking along the wall leaning out (the walk to the edge): the rig's hips sit 0.7 m out on the outer foot
 *  (`PEEK_HIP`), and its head rides a once-a-stride 10-17 cm sawtooth set by where the foot planner plants the feet,
 *  not locked to the gait clock (a per-kind phase-binned fit still leaves 5-9 cm). The sim gives the mean and the first
 *  harmonic (`WALL_LEAN_MOVE`): measured 0.054-0.167 m. */
const LEAN_WALK = 'moving lean: foot-planner sawtooth, measured 0.054-0.167 m';
/** The whole peek walk: as above, and the first step of the leaning walk from rest dips the rig's head up to 25 cm
 *  below the steady fit (~0.5 s after the start, while the driver still gets up to pace). Measured 0.111-0.289 m every
 *  frame; (S3a fix 2) settled (0.3 s after the walk reaches its pace, the leaning walk's sawtooth): 0.050-0.087 m. */
const PEEK_START = 'first leaning step dips 25 cm, measured 0.111-0.289 m; settled 0.050-0.087 m';
/** A walk backwards from rest: the rig's head dips 12 cm 0.6-1.6 s into the walk and settles by ~2.5 s (the T1 back
 *  walks pass after a 3 s settle). Measured 0.118-0.129 m (S3a fix 2, the refitted `MOVE`); settled (at pace)
 *  0.083-0.105 m. */
const BACK_START = 'backpedal start dip, measured 0.118-0.129 m; settled 0.083-0.105 m';

/** (S3a fix 3) A fast turning hold (3 rad/s, radius 0.25 m): he swings round her at 1.1-1.4 m/s, over the walk cap's
 *  pace, through the facing stride's sideways-slip band (`HELD_MOVE` doc), and the rig's body twists with the turn (the
 *  sim has no yaw-rate term). Measured 0.079-0.145 m. */
const TURN_ARC = 'fast hold arc: slip band and turn twist, measured 0.079-0.145 m';
/** (S3a fix 3) A 180 at her turn cap: he swings round her at 2.4-2.9 m/s for 0.4 s; the rig's body lags its root up to
 *  14 cm sideways and 18 cm forward (the feet planted, no yaw-rate term in the sim), and after a left turn its head dips
 *  10 cm for ~0.6 s (the feet catching up). Measured 0.120-0.255 m every frame; settled 0.012-0.113 m. */
const TURN_CAP = '180 at the turn cap: body lag and dip, measured 0.120-0.255 m; settled 0.012-0.113 m';

const SCENARIOS: Sc[] = [
  // T1: steady upright
  upright('idle', 0.2, 0, 0),
  upright('walk 1.4', 0.2, 0, 0, (c) => walk(c, 0, 1.4, false)),
  upright('walk pace', 0.2, 0, 0, (c, d) => walk(c, 0, d.walkSpeed, false)),
  upright('run', 0.2, 0, 0, (c, d) => walk(c, 0, d.runSpeed, false)),
  upright('aim -0.3', 1, -0.3, 0),
  upright('aim 0', 1, 0, 0),
  upright('aim 0.3', 1, 0.3, 0),
  upright('crouch idle', 0.2, 0, 1),
  upright('crouch walk 1', 0.2, 0, 1, (c) => walk(c, 0, 1, false)),
  upright('crouch aim', 1, 0, 1),
  // (S3a fix, finding 2) strafe and backpedal: aiming with the facing held (`Enemy.decide` 'attack', the cover walks)
  upright('strafe L aim', 1, 0, 0, (c, d) => walk(c, -90, d.walkSpeed, true), ARMED),
  upright('strafe R aim', 1, 0, 0, (c, d) => walk(c, 90, d.walkSpeed, true), ARMED),
  upright('backpedal aim', 1, 0, 0, (c, d) => walk(c, 180, d.walkSpeed, true), ARMED, 3),
  upright('strafe R aim slow p0.3', 1, 0.3, 0, (c, d) => walk(c, 90, d.walkSpeed * 0.55, true), ARMED),
  upright('diag back-L aim', 1, 0, 0, (c, d) => walk(c, -135, d.walkSpeed, true), ARMED, 3),
  // the patrol's look-around walk (`calmDecide`: `face` the look yaw, not aiming; aim 0.2): any direction
  upright('look walk L', 0.2, 0, 0, (c, d) => walk(c, -90, d.walkSpeed, true)),
  upright('look walk R', 0.2, 0, 0, (c, d) => walk(c, 90, d.walkSpeed, true)),
  upright('look walk back', 0.2, 0, 0, (c, d) => walk(c, 180, d.walkSpeed, true), FREE, 3),
  // T2: steady posed
  wallStill('wall flat -1', -1, 0),
  wallStill('wall flat 1', 1, 0),
  // the lean is away from the wall side (finding 4: the old -1 / -1 and 1 / 1 cases never happen)
  wallStill('wall lean R (ws -1)', -1, 1),
  wallStill('wall lean L (ws 1)', 1, -1),
  // (S3a fix, finding 1) walking along the wall: leaning out towards the edge, both sides; back to the cover point;
  // the no-edge side step (`coverPeek` 0, either way)
  { ...wallWalk('wall walk lean R (ws -1)', -1, 1, 1), except: { bound: 0.17, why: LEAN_WALK } },
  { ...wallWalk('wall walk lean L (ws 1)', 1, -1, -1), except: { bound: 0.17, why: LEAN_WALK } },
  wallWalk('wall walk back L (ws -1)', -1, 0, -1),
  wallWalk('wall walk back R (ws 1)', 1, 0, 1),
  wallWalk('wall walk out R (ws -1)', -1, 0, 1),
  wallWalk('wall walk out L (ws 1)', 1, 0, -1),
  ...(['seized', 'seizedLethal', 'hostage', 'ko', 'interrogate'] as GuardCqMode[]).map(held),
  // (S3a fix 2) a hostage walked by the operator: `holdAt` gives him a velocity, the rig runs its own gait (phase -1)
  // under the held pose. The game caps the hold at `GRAB.speedCap` = 0.75 m/s (src/game/takedown.ts, applied as the
  // operator's `speedCap` in `takedownController`): a straight 1.2 m/s walk cannot happen, that case is only a bound
  // check of `HELD_MOVE` above the cap (a turning hold swings him faster than she walks, below).
  { id: 'hostage walked 1.2 (bound check, over the cap)', tier: 2, kinds: FREE, settle: 1.5, len: 1.5, held: 'hostage', heldMove: { deg: 0, speed: 1.2 }, step: () => {} },
  { id: 'hostage walked 0.6', tier: 2, kinds: FREE, settle: 1.5, len: 1.5, held: 'hostage', heldMove: { deg: 0, speed: 0.6 }, step: () => {} },
  { id: 'hostage walked side 0.6', tier: 2, kinds: FREE, settle: 1.5, len: 1.5, held: 'hostage', heldMove: { deg: 90, speed: 0.6 }, step: () => {} },
  // (S3a fix 3) diagonally: 45 deg, and 60 deg on the facing / velocity stride boundary (cos 60 = 0.5000000000000001:
  // the rig's stride test and the sim's `heldFacing` agree bit for bit)
  { id: 'hostage walked diag 45 0.6', tier: 2, kinds: FREE, settle: 1.5, len: 1.5, held: 'hostage', heldMove: { deg: 45, speed: 0.6 }, step: () => {} },
  { id: 'hostage walked diag 60 0.6', tier: 2, kinds: FREE, settle: 1.5, len: 1.5, held: 'hostage', heldMove: { deg: 60, speed: 0.6 }, step: () => {} },
  // (S3a fix 3) a turning hold: the operator walks at the cap and turns, he swings round her on the hold offset
  // (`GRAB.hold` 0.32 ahead, `GRAB.side` -0.1: 0.335 m from her). A walking arc (1.5 rad/s, radius 0.5 m) both ways,
  // a fast arc (3 rad/s, exception), and a 180 at her free-movement turn cap (`CT.turnRate` 7.85 rad/s, not aiming:
  // `MotionDriver` faceTravel; his swing ~2.6 m/s for 0.4 s, the transient as T3, exception)
  { id: 'hostage turning arc R', tier: 2, kinds: FREE, settle: 1.5, len: 1.5, held: 'hostage', heldMove: { deg: 0, speed: GRAB.speedCap, turn: { rate: 1.5 } }, step: () => {} },
  { id: 'hostage turning arc L', tier: 2, kinds: FREE, settle: 1.5, len: 1.5, held: 'hostage', heldMove: { deg: 0, speed: GRAB.speedCap, turn: { rate: -1.5 } }, step: () => {} },
  { id: 'hostage turning arc R 3', tier: 2, kinds: FREE, settle: 1.5, len: 1.5, held: 'hostage', heldMove: { deg: 0, speed: GRAB.speedCap, turn: { rate: 3 } }, except: { bound: 0.15, why: TURN_ARC }, step: () => {} },
  { id: 'hostage turning arc L 3', tier: 2, kinds: FREE, settle: 1.5, len: 1.5, held: 'hostage', heldMove: { deg: 0, speed: GRAB.speedCap, turn: { rate: -3 } }, except: { bound: 0.15, why: TURN_ARC }, step: () => {} },
  { id: 'hostage turn 180 R at the cap', tier: 3, kinds: FREE, settle: 1.5, len: 2, held: 'hostage', steady: T2, except: { bound: 0.26, steady: 0.12, why: TURN_CAP }, heldMove: { deg: 0, speed: GRAB.speedCap, turn: { rate: CT.turnRate, from: 0.3, to: 0.3 + Math.PI / CT.turnRate } }, step: () => {} },
  { id: 'hostage turn 180 L at the cap', tier: 3, kinds: FREE, settle: 1.5, len: 2, held: 'hostage', steady: T2, except: { bound: 0.26, steady: 0.12, why: TURN_CAP }, heldMove: { deg: 0, speed: GRAB.speedCap, turn: { rate: -CT.turnRate, from: 0.3, to: 0.3 + Math.PI / CT.turnRate } }, step: () => {} },
  { id: 'blind', tier: 2, kinds: FREE, settle: 1, len: 1, blind: true, step: (c) => { c.aim = 0.2; } },
  // (S3a fix, finding 3) blinded, then seized: the seize replaces the flashbang's emote (`beginTakedown`), the rig shows
  // the held pose only
  { id: 'blind + seized', tier: 2, kinds: FREE, settle: 1.5, len: 1, blind: true, held: 'seized', holdAt: -1, delay: 0.25, step: (c) => { c.aim = 0.2; } },
  { id: 'climb', tier: 2, kinds: FREE, settle: 1, len: 1, step: (c) => { c.climb = true; c.aim = 0; } },
  // T3: transitions, every frame
  { id: 'crouch down-up', tier: 3, kinds: FREE, settle: 1, len: 3, steady: T1, step: (c, t) => { c.wantCrouch = t >= 0.5 && t < 1.5 ? 1 : 0; } },
  {
    id: 'wall lean 0-1-0 (ws 1)',
    tier: 3,
    kinds: COVER,
    settle: 1,
    len: 3,
    steady: T2,
    step: (c, t) => {
      c.wall = true;
      c.wallSide = 1;
      c.aim = 1;
      c.peek = t >= 0.5 && t < 1.5 ? -1 : 0;
    },
  },
  { ...peekCycle('peek walk cycle (ws -1)', -1), except: { bound: 0.29, steady: 0.09, why: PEEK_START } },
  { ...peekCycle('peek walk cycle (ws 1)', 1), except: { bound: 0.29, steady: 0.09, why: PEEK_START } },
  { id: 'seize start', tier: 3, kinds: FREE, settle: 0.5, len: 1.5, held: 'seized', holdAt: 0.3, delay: 0.25, steady: T2, step: () => {} },
  { id: 'blind then seize', tier: 3, kinds: FREE, settle: 0.5, len: 1.5, blind: true, held: 'seized', holdAt: 0.3, delay: 0.25, steady: T2, step: (c) => { c.aim = 0.2; } },
  { id: 'release', tier: 3, kinds: FREE, settle: 1, len: 1.5, held: 'hostage', releaseAt: 0.3, steady: T1, step: (c) => { c.aim = 0.2; } },
  { id: 'walk start-stop', tier: 3, kinds: FREE, settle: 1, len: 3.5, steady: T1, step: (c, t, d) => { c.aim = 0.2; if (t >= 0.3 && t < 2) walk(c, 0, d.walkSpeed, false); } },
  { id: 'backpedal start', tier: 3, kinds: ARMED, settle: 0.5, len: 3.5, steady: T1, except: { bound: 0.13, steady: 0.11, why: BACK_START }, step: (c, t, d) => { c.aim = 1; if (t >= 0.3) walk(c, 180, d.walkSpeed, true); } },
  { id: 'strafe start-stop', tier: 3, kinds: ARMED, settle: 1, len: 3.5, steady: T1, step: (c, t, d) => { c.aim = 1; if (t >= 0.3 && t < 2) walk(c, 90, d.walkSpeed, true); } },
];
describe('guard head: sim against the rig head node (NullEngine)', () => {
  let env: Env | undefined;
  const lines: string[] = [];
  const random = Math.random;

  for (const sc of SCENARIOS) {
    const tierBound = sc.tier === 1 ? T1 : sc.tier === 2 ? T2 : T3;
    for (const kind of sc.kinds) {
      const ex = sc.except;
      const bound = ex ? ex.bound : tierBound;
      const title = `T${sc.tier} ${sc.id}: ${kind}${ex ? ` (exception <= ${ex.bound} m: ${ex.why})` : ''}`;
      it(title, async () => {
        env ??= await setup();
        let seed = 12345;
        // the seeded Math.random the other guard rig harnesses use (the rig's idle variation)
        Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
        try {
          for (const yaw of YAWS) {
            seed = 12345;
            const dump = FRAMES !== undefined && FILTER.test(title);
            const r = run(kind, yaw, sc, env, dump ? (fr) => frames.push([title, yaw, fr.t.toFixed(4), ...[...fr.rig, ...fr.sim].map((v) => v.toFixed(4)), fr.inp.speed.toFixed(3), fr.inp.phase.toFixed(3), fr.inp.lean.toFixed(3), fr.state].join('\t')) : undefined);
            if (PRINT) {
              lines.push(`T${sc.tier} ${sc.id.padEnd(26)} ${kind.padEnd(7)} yaw ${String(yaw).padEnd(4)} rig (${r.off.map((v) => v.toFixed(3)).join(' ')}) sim (${r.pred.map((v) => v.toFixed(3)).join(' ')}) err ${r.worst.toFixed(3)} steady ${r.worstSteady.toFixed(3)}`);
              continue;
            }
            expect(r.worst, `${title} yaw ${yaw}`).toBeLessThanOrEqual(bound);
            if (sc.tier === 3) expect(r.worstSteady, `${title} yaw ${yaw} steady`).toBeLessThanOrEqual(ex?.steady ?? sc.steady ?? T2);
          }
        } finally {
          Math.random = random;
        }
      }, 120000);
    }
  }

  it('prints the table (GUARD_HEAD_PRINT=1)', () => {
    if (FRAMES !== undefined) writeFileSync(FRAMES, `${frames.join('\n')}\n`);
    if (!PRINT) return;
    // GUARD_HEAD_OUT=<file>: the table to a file (the reporter may hold console output back)
    const file = process.env.GUARD_HEAD_OUT;
    if (file) writeFileSync(file, `${lines.join('\n')}\n`);
    else console.info(`\n${lines.join('\n')}`);
  });
});
