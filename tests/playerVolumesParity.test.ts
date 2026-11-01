/**
 * rig-pose-fix S1: the sim player body (`src/player/playerVolumes.ts`) against Wren's rig (NullEngine, the harness
 * `tests/helpers/playerBodyHarness.ts`: the rig driven as `Player.frameUpdate` drives it). The hit volumes, perception
 * points and the wall head sample come from the sim; the rig is the reference it was fitted to.
 *
 * Bounds (3D distance per joint, every sampled frame, m; mocap ON, the game's default set):
 * - T1 free and still (on and off the knots: crouch, kneel, raise, pitch): <= 0.04;
 * - T1 free and moving (steady pace): <= 0.08 (the gait's bob and sway ride on the fitted mean: the mocap jog's);
 * - T2 posed, steady (the wall, the side-on crouch, the peek, the slide; the traversal families): <= 0.08, with the
 *   written exception below (a cyclic family is fitted as its cycle's mean);
 * - T3 transitions (crouch, start, peek in), every frame: <= 0.16 (the run's CT start is the worst).
 * Mocap OFF (the developer rollback `?mocap=0`) is not held to these: its holstered run and crouched sneak lean
 * differently (measured in docs/rig-pose-audit/S1-REPORT.md).
 * `PLAYER_BODY_PRINT=1` prints each case's worst and mean error per joint and skips the assertions; with
 * `PLAYER_BODY_MOCAP=0` it measures the hand-keyed set (the residual of the other set, docs/rig-pose-audit/S1-REPORT.md).
 */
import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import { runScenario, setupEnv, sweepScenarios, TRAV_PHASED, type PEnv, type PSc } from './helpers/playerBodyHarness';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

const PRINT = process.env.PLAYER_BODY_PRINT === '1';
const MOCAP = process.env.PLAYER_BODY_MOCAP !== '0';
const YAWS = [0.7, -2.3];
const T1 = 0.04;
const T1M = 0.08;
const T2 = 0.08;
const T3 = 0.16;

interface Case extends PSc {
  tier: 1 | 2 | 3;
  /** A written exception: a looser bound and why (the measured worst in the reason). */
  except?: { bound: number; why: string };
}

// Written exceptions (measured worst on mocap ON in docs/rig-pose-audit/S1-REPORT.md). The model has no state for these.
/** A ledge hang swings on its pendulum (`AttachGrips.cadence`, not on the wire): the cycle's mean leaves the swing.
 *  Measured 0.140 m (the head). */
const HANG = 'ledge hang pendulum about the cycle mean, measured 0.140 m';

const c = (x: Omit<Case, 'settle' | 'len'> & Partial<Pick<Case, 'settle' | 'len'>>): Case => ({ settle: 1.5, len: 1, ...x });

function cases(): Case[] {
  const L: Case[] = [];
  // T1 / T2: every knot of the fit (the sweep's scenarios), then off-knot states
  for (const s of sweepScenarios(MOCAP)) {
    const tier = s.wall || s.trav ? 2 : 1;
    const except = s.trav?.kind === 'hang' ? { bound: 0.15, why: HANG } : undefined;
    L.push({ ...s, id: `knot ${s.id}`, tier, except });
  }
  L.push(c({ id: 'free c0.4 holstered', tier: 1, crouch: 0, crouchFix: 0.4 }));
  L.push(c({ id: 'free c0.6 low ready', tier: 1, crouch: 1, crouchFix: 0.6, drawn: true }));
  L.push(c({ id: 'raised c0.3 p0.1', tier: 1, crouch: 0, crouchFix: 0.3, drawn: true, raise: 1, pitch: 0.1 }));
  L.push(c({ id: 'raised half (r 0.5)', tier: 1, crouch: 0, drawn: true, raise: 0.5, pitch: -0.2 }));
  L.push(c({ id: 'kneel raised p-0.35', tier: 1, crouch: 1, drawn: true, raise: 1, pitch: -0.35 }));
  L.push(c({ id: 'walk 1.1 holstered', tier: 1, crouch: 0, move: { deg: 0, speed: 1.1 }, settle: 2, len: 1.5 }));
  L.push(c({ id: 'jog 2.5 holstered', tier: 1, crouch: 0, move: { deg: 0, speed: 2.5 }, settle: 2, len: 1.5 }));
  L.push(c({ id: 'run 3.5 low ready', tier: 1, crouch: 0, drawn: true, move: { deg: 0, speed: 3.5 }, settle: 2, len: 1.5 }));
  L.push(c({ id: 'sneak 1.5 crouched', tier: 1, crouch: 1, move: { deg: 0, speed: 1.5 }, settle: 2, len: 1.5 }));
  L.push(c({ id: 'aimed strafe diag 0.8', tier: 1, crouch: 0, drawn: true, raise: 1, move: { deg: 45, speed: 0.8 }, settle: 2, len: 1.5 }));
  L.push(c({ id: 'aimed crouch back 1.2', tier: 1, crouch: 1, drawn: true, raise: 1, move: { deg: 160, speed: 1.2 }, settle: 2, len: 1.5 }));
  // the wall: the left side (mirrored), off-knot peek, a crouch knot between, sliding while drawn
  for (const side of [1, -1]) {
    L.push(c({ id: `wall flat s${side}`, tier: 2, crouch: 0, wall: { side } }));
    L.push(c({ id: `wall side-on s${side}`, tier: 2, crouch: 1, wall: { side } }));
    L.push(c({ id: `wall peek s${side}`, tier: 2, crouch: 0, wall: { side, peek: 1 } }));
    L.push(c({ id: `wall crouch peek s${side}`, tier: 2, crouch: 1, wall: { side, peek: 1 } }));
    L.push(c({ id: `wall drawn peek s${side}`, tier: 2, crouch: 0, drawn: true, wall: { side, peek: 1 } }));
    L.push(c({ id: `wall slide s${side}`, tier: 2, crouch: 0, wall: { side, slide: 0.3 } }));
    L.push(c({ id: `wall crouch slide s${side}`, tier: 2, crouch: 1, wall: { side, slide: 0.45 } }));
  }
  L.push(c({ id: 'wall peek 0.3', tier: 2, crouch: 0, wall: { side: 1, peekFix: 0.3 } }));
  L.push(c({ id: 'wall c0.75 peek 0.7', tier: 2, crouch: 1, crouchFix: 0.75, wall: { side: -1, peekFix: 0.7 } }));
  // the traversal families off the knots
  for (const k of TRAV_PHASED) L.push(c({ id: `trav ${k} t0.4`, tier: 2, crouch: 0, trav: { kind: k, t: 0.4 }, settle: 0.6, len: 0.3 }));
  // T3: transitions, every frame
  L.push({ id: 'crouch down', tier: 3, settle: 0.5, len: 1, crouch: 1 });
  L.push({ id: 'walk start', tier: 3, settle: 0.5, len: 1.5, crouch: 0, move: { deg: 0, speed: 1.4 } });
  L.push({ id: 'run start', tier: 3, settle: 0.3, len: 1.5, crouch: 0, move: { deg: 0, speed: 4 } });
  L.push({ id: 'peek in', tier: 3, settle: 0.5, len: 1, crouch: 0, wall: { side: 1, peek: 1 } });
  L.push({ id: 'crouch peek in', tier: 3, settle: 0.8, len: 1, crouch: 1, wall: { side: -1, peek: 1 } });
  return L;
}

describe('player body: sim against Wren\'s rig (NullEngine)', () => {
  let env: PEnv | undefined;
  const lines: string[] = [];
  for (const cs of cases()) {
    const tierBound = cs.tier === 1 ? (cs.move ? T1M : T1) : cs.tier === 2 ? T2 : T3;
    const bound = cs.except?.bound ?? tierBound;
    it(`T${cs.tier} ${cs.id}${cs.except ? ` (exception <= ${cs.except.bound} m: ${cs.except.why})` : ''}`, async () => {
      env ??= await setupEnv();
      for (const yaw of YAWS) {
        const r = runScenario(env, { ...cs, mocap: MOCAP }, yaw);
        if (PRINT) {
          lines.push(`T${cs.tier} ${cs.id.padEnd(30)} yaw ${String(yaw).padEnd(4)} worst ${Array.from(r.worst, (v) => v.toFixed(3)).join(' ')} mean ${Array.from(r.mean, (v) => v.toFixed(3)).join(' ')}`);
          continue;
        }
        for (let j = 0; j < 4; j++) expect(r.worst[j], `${cs.id} yaw ${yaw} joint ${j}`).toBeLessThanOrEqual(bound);
      }
    }, 60000);
  }
  it('prints the residuals (PLAYER_BODY_PRINT=1)', () => {
    if (!PRINT) return;
    // PLAYER_BODY_OUT=<file>: the table to a file (the reporter may hold console output back)
    const file = process.env.PLAYER_BODY_OUT;
    if (file) writeFileSync(file, `${lines.join('\n')}\n`);
    else console.info(`\n${lines.join('\n')}`);
  });
});
