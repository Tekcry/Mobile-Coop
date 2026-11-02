import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ALL_GROUPS,
  BODY_FIELDS,
  BODY_GROUPS,
  GUN_FIELDS,
  GUN_GROUPS,
  TUNABLES,
  TUNE_BODY,
  TUNE_CUR,
  TUNE_EXPORT_MAGIC,
  TUNE_GUN,
  TUNE_IDENTITY,
  TUNE_LOCAL,
  TUNE_LOG,
  TUNE_STATE,
  selectBodyGroup,
  selectGunGroup,
  tunablesFor,
  tuneBegin,
  tuneChanged,
  tuneEnd,
  tuneExport,
  tuneExportName,
  tuneGet,
  tuneHint,
  tuneKeyedLean,
  tuneLoad,
  tuneReset,
  tuneResetAll,
  tuneResetGroup,
  tuneRoot,
  tuneSet,
  tuneSim,
  tuneSnapshot,
  type TuneRigIn,
} from '../src/anim/tune';
import { stepLength } from '../src/anim/motion';
import { loadAnimTune, resetAnimTuneDb, saveAnimTune } from '../src/save/animTuneStore';

const T0 = Date.UTC(2026, 9, 20, 12, 0, 0);

function target(x = 0, y = 0, z = 0): TuneRigIn['reachL'] {
  return { x, y, z, w: 1 };
}
function rig(armed = false, hook = 0): TuneRigIn {
  return { heldWeapon: armed ? {} : null, reachL: { ...target(1, 2, 3), hook }, reachR: target(-1, 2, 3), plantL: target(0.2, 0, 0.1), plantR: target(-0.2, 0, 0.1), root: { rotation: { y: 0 } } };
}
function pose(o: Partial<Parameters<typeof selectBodyGroup>[0]> = {}): Parameters<typeof selectBodyGroup>[0] {
  return { speed: 0, crouch: 0, aim: 0, ...o };
}

beforeEach(() => {
  tuneLoad({ version: 1, values: {}, log: [] });
});

describe('anim tuner table', () => {
  it('every default is identity (mul 1, add 0) and every group starts at its defaults', () => {
    for (const t of TUNABLES) expect(t.def).toBe(t.kind === 'mul' ? 1 : 0);
    for (const t of TUNABLES) expect(t.min <= t.def && t.def <= t.max).toBe(true);
    for (const g of BODY_GROUPS) for (const f of BODY_FIELDS) expect(TUNE_BODY[g][f]).toBe(TUNE_IDENTITY[f]);
    for (const g of GUN_GROUPS) for (const f of GUN_FIELDS) expect(TUNE_GUN[g][f]).toBe(TUNE_IDENTITY[f]);
    for (const f of BODY_FIELDS) expect(TUNE_CUR[f]).toBe(TUNE_IDENTITY[f]);
    expect(TUNE_CUR.armSwingK).toBe(1);
    expect(tuneChanged()).toEqual([]);
  });

  it('every group named in the brief has at least one slider; every slider names a real group', () => {
    for (const g of ALL_GROUPS) expect(tunablesFor(g).length).toBeGreaterThan(0);
    for (const t of TUNABLES) for (const g of t.groups) expect(ALL_GROUPS).toContain(g);
  });

  it('set clamps to the range, rejects a slider the group does not have, and reset restores the default', () => {
    expect(tuneSet('walk', 'trackMul', 1.4, T0)).toBe(true);
    expect(tuneGet('walk', 'trackMul')).toBe(1.4);
    expect(TUNE_BODY.walk.trackMul).toBe(1.4);
    expect(tuneGet('jog', 'trackMul')).toBe(1);
    tuneSet('walk', 'trackMul', 99, T0 + 5000);
    expect(tuneGet('walk', 'trackMul')).toBe(2);
    expect(tuneSet('walk', 'wallGapAdd', 0.05)).toBe(false);
    expect(tuneSet('rifle.aim', 'trackMul', 0.5)).toBe(false);
    tuneReset('walk', 'trackMul');
    expect(tuneGet('walk', 'trackMul')).toBe(1);
  });

  it('reset per group touches that group only; reset all clears everything', () => {
    tuneSet('walk', 'trackMul', 0.8, T0);
    tuneSet('walk', 'leanAdd', 0.1, T0);
    tuneSet('run', 'leanAdd', 0.2, T0);
    tuneSet('pistol.aim', 'gunCant', 0.3, T0);
    tuneResetGroup('walk');
    expect(tuneGet('walk', 'trackMul')).toBe(1);
    expect(tuneGet('walk', 'leanAdd')).toBe(0);
    expect(tuneGet('run', 'leanAdd')).toBe(0.2);
    expect(tuneGet('pistol.aim', 'gunCant')).toBe(0.3);
    tuneResetAll();
    expect(tuneChanged()).toEqual([]);
  });

  it('the change log records time, group, id, from and to; a drag of one slider is one entry', () => {
    tuneSet('walk', 'kneeOutMul', 1.1, T0);
    tuneSet('walk', 'kneeOutMul', 1.2, T0 + 100);
    tuneSet('walk', 'kneeOutMul', 1.3, T0 + 200);
    tuneSet('sneak', 'pelvisYAdd', -0.05, T0 + 300);
    tuneSet('walk', 'kneeOutMul', 1.5, T0 + 5000);
    expect(TUNE_LOG).toEqual([
      { t: new Date(T0).toISOString(), group: 'walk', id: 'kneeOutMul', from: 1, to: 1.3 },
      { t: new Date(T0 + 300).toISOString(), group: 'sneak', id: 'pelvisYAdd', from: 0, to: -0.05 },
      { t: new Date(T0 + 5000).toISOString(), group: 'walk', id: 'kneeOutMul', from: 1.3, to: 1.5 },
    ]);
  });

  it('the export holds every changed value with its default and the log; the file is anim-tune-<date>.json', () => {
    tuneSet('ledge', 'handOutAdd', 0.06, T0);
    tuneSet('rifle.lowReady', 'gunPitch', -0.1, T0 + 2000);
    const e = tuneExport(new Date(T0 + 3000));
    expect(e.magic).toBe(TUNE_EXPORT_MAGIC);
    expect(e.version).toBe(2); // (marlow-bays T1a: the rows' version)
    expect(e.exported).toBe(new Date(T0 + 3000).toISOString());
    expect(e.changed.map((c) => [c.group, c.id, c.value, c.default])).toEqual([
      ['ledge', 'handOutAdd', 0.06, 0],
      ['rifle.lowReady', 'gunPitch', -0.1, 0],
    ]);
    expect(e.log).toHaveLength(2);
    expect(e.log[1]).toMatchObject({ group: 'rifle.lowReady', id: 'gunPitch', from: 0, to: -0.1 });
    expect(JSON.parse(JSON.stringify(e))).toEqual(e);
    expect(tuneExportName(new Date(2026, 9, 5, 23, 59))).toBe('anim-tune-2026-10-05.json');
  });

  it('a snapshot loads back (values and log); junk in it is skipped', () => {
    tuneSet('wallPeek', 'peekLeanMul', 1.6, T0);
    const snap = tuneSnapshot();
    tuneResetAll();
    tuneLoad(JSON.parse(JSON.stringify(snap)));
    expect(tuneGet('wallPeek', 'peekLeanMul')).toBe(1.6);
    expect(TUNE_LOG.length).toBeGreaterThan(0);
    tuneLoad({ version: 1, values: { nope: { trackMul: 2 }, walk: { nope: 3, trackMul: 'x', kneeOutMul: 1.2 } }, log: [{ group: 'nope' }] });
    expect(tuneGet('walk', 'kneeOutMul')).toBe(1.2);
    expect(tuneGet('wallPeek', 'peekLeanMul')).toBe(1);
    expect(TUNE_LOG).toEqual([]);
    tuneLoad(null);
    tuneLoad('junk');
  });
});

describe('anim tuner state selection', () => {
  it('picks the body group from the pose', () => {
    const cases: [Partial<Parameters<typeof selectBodyGroup>[0]>, boolean, boolean, string | null][] = [
      [{}, false, false, 'idle'],
      [{ speed: 1.4 }, false, false, 'walk'],
      [{ speed: 3 }, false, false, 'jog'],
      [{ speed: 4.5 }, false, false, 'run'],
      [{}, false, true, 'lowReady'],
      [{ speed: 1.4 }, false, true, 'walk'],
      [{ crouch: 1 }, false, false, 'crouchIdle'],
      [{ crouch: 1, speed: 0.8 }, false, false, 'sneak'],
      [{ crouch: 1, speed: 1.8 }, false, false, 'crouchWalk'],
      [{ aim: 1, speed: 1 }, false, true, 'aim'],
      [{ aim: 1, crouch: 1 }, false, true, 'aimCrouch'],
      [{ wall: true }, false, false, 'wallIdle'],
      [{ wall: true, speed: 0.8 }, false, false, 'wallSlide'],
      [{ wall: true, lean: 0.2 }, false, true, 'wallPeek'],
      [{ traverse: 'climb' }, false, false, 'ladder'],
      [{ traverse: 'pipeClimb' }, false, false, 'pipe'],
      [{ traverse: 'pipeInv' }, false, false, 'pipe'],
      [{ traverse: 'hang' }, true, false, 'ledge'],
      [{ traverse: 'hang' }, false, false, 'hang'],
      [{ traverse: 'crawl' }, false, false, 'crawl'],
      [{ traverse: 'ventDrop' }, false, false, 'vent'],
      [{ traverse: 'crawlOut' }, false, false, 'vent'],
      [{ traverse: 'vault' }, false, false, null],
      [{ grounded: false }, false, false, null],
      [{ grounded: false, speed: 4.5 }, false, false, null],
      [{ grounded: false, traverse: 'climb' }, false, false, 'ladder'],
      [{ grounded: true }, false, false, 'idle'],
      [{ bend: 0.3, speed: 0.5 }, false, true, 'hold'],
      // (N4b train-8 fix) a team holder's brace (the bend from the team pose) is not a hold or a carry
      [{ bend: 0.22, bendDrop: -0.05, crouch: 1, traverse: 'brace' }, false, false, null],
      [{ bend: 0.3, traverse: 'brace', carryBody: true }, false, false, null],
    ];
    for (const [p, ledge, armed, want] of cases) expect([p, selectBodyGroup(pose(p), ledge, armed)]).toEqual([p, want]);
  });

  it('picks the gun group by weapon mass and stance', () => {
    expect(selectGunGroup(pose(), false)).toBeNull();
    expect(selectGunGroup(pose(), true)).toBe('rifle.lowReady');
    expect(selectGunGroup(pose({ weight: 0.7 }), true)).toBe('pistol.lowReady');
    expect(selectGunGroup(pose({ aim: 1 }), true)).toBe('rifle.aim');
    expect(selectGunGroup(pose({ aim: 1, crouch: 1, weight: 0.7 }), true)).toBe('pistol.aimCrouch');
  });
});

describe('anim tuner window', () => {
  it('tuneBegin loads the selected groups into TUNE_CUR; tuneEnd puts identity back and the grip targets back', () => {
    tuneSet('ledge', 'handOutAdd', 0.1, T0);
    tuneSet('ledge', 'handUpAdd', 0.05, T0);
    tuneSet('ledge', 'kneeOutMul', 1.5, T0);
    const r = rig(false, 1);
    const p = { ...pose({ traverse: 'hang' }), lookYaw: 0.4 };
    tuneBegin(p, r);
    expect(TUNE_STATE.body).toBe('ledge');
    expect(TUNE_STATE.gun).toBe('');
    expect(TUNE_CUR.kneeOutMul).toBe(1.5);
    expect(TUNE_LOCAL.kneeOutMul).toBe(1.5);
    // facing +z: the body's right is +x, so the left hand moves to -x, the right to +x, both up
    expect(r.reachL.x).toBeCloseTo(0.9, 9);
    expect(r.reachR.x).toBeCloseTo(-0.9, 9);
    expect(r.reachL.y).toBeCloseTo(2.05, 9);
    expect(p.lookYaw).toBe(0.4);
    tuneEnd(r);
    expect(r.reachL).toMatchObject({ x: 1, y: 2, z: 3 });
    expect(r.reachR).toMatchObject({ x: -1, y: 2, z: 3 });
    for (const f of BODY_FIELDS) expect(TUNE_CUR[f]).toBe(TUNE_IDENTITY[f]);
    expect(TUNE_LOCAL.kneeOutMul).toBe(1.5);
  });

  it('the gun group comes in on top of the body group; head turn and peek lean scale the pose', () => {
    tuneSet('wallPeek', 'peekLeanMul', 2, T0);
    tuneSet('wallPeek', 'headTurnMul', 0.5, T0);
    tuneSet('rifle.lowReady', 'gunCant', 0.2, T0);
    const r = rig(true);
    const p = { ...pose({ wall: true, lean: 0.2 }), lookYaw: 0.6 };
    tuneBegin(p, r);
    expect(TUNE_STATE.body).toBe('wallPeek');
    expect(TUNE_STATE.gun).toBe('rifle.lowReady');
    expect(TUNE_CUR.gunCant).toBe(0.2);
    expect(p.lean).toBeCloseTo(0.4, 9);
    expect(p.lookYaw).toBeCloseTo(0.3, 9);
    tuneEnd(r);
    expect(TUNE_CUR.gunCant).toBe(0);
  });

  it('the arm swing grows with speed; the stride applies only inside tuneSim', () => {
    tuneSet('walk', 'armSwingMul', 1.2, T0);
    tuneSet('walk', 'armSwingGrow', 0.1, T0);
    tuneSet('walk', 'strideMul', 1.25, T0);
    const r = rig();
    const base = stepLength(1.5);
    tuneBegin(pose({ speed: 1.5 }), r);
    expect(TUNE_CUR.armSwingK).toBeCloseTo(1.35, 9);
    expect(stepLength(1.5)).toBeCloseTo(base * 1.25, 9);
    tuneEnd(r);
    expect(stepLength(1.5)).toBe(base);
    tuneSim(true);
    expect(stepLength(1.5)).toBeCloseTo(base * 1.25, 9);
    tuneSim(false);
    expect(stepLength(1.5)).toBe(base);
  });

  it('the root offset and keyed lean are no-ops at identity and move as set', () => {
    const pos = { x: 1, y: 2, z: 3 };
    tuneRoot(pos, 0.5);
    expect(pos).toEqual({ x: 1, y: 2, z: 3 });
    const q = new Float64Array([0, 0, 0, 1, 0, 0, 0, 1]);
    tuneKeyedLean(q);
    expect(Array.from(q)).toEqual([0, 0, 0, 1, 0, 0, 0, 1]);
    tuneSet('ladder', 'bodyFwdAdd', 0.1, T0);
    tuneSet('ladder', 'leanAdd', 0.2, T0);
    const r = rig();
    tuneBegin(pose({ traverse: 'climb' }), r);
    tuneKeyedLean(q);
    expect(q[4]).toBeCloseTo(Math.sin(0.1), 9);
    expect(q[7]).toBeCloseTo(Math.cos(0.1), 9);
    expect(q[3]).toBe(1);
    tuneEnd(r);
    tuneRoot(pos, 0);
    expect(pos.z).toBeCloseTo(3.1, 9);
  });

  it('tuneBegin and tuneEnd allocate nothing that grows: a long run keeps the targets exact', () => {
    tuneSet('pipe', 'footUpAdd', 0.03, T0);
    const r = rig();
    for (let i = 0; i < 10000; i++) {
      tuneBegin(pose({ traverse: 'pipeClimb' }), r);
      tuneEnd(r);
    }
    expect(r.plantL).toMatchObject({ x: 0.2, y: 0, z: 0.1 });
  });
});

describe('anim tuner store', () => {
  it('saves to and loads from its own IndexedDB database', async () => {
    resetAnimTuneDb();
    tuneSet('crouchWalk', 'pelvisYAdd', -0.04, T0);
    expect(await saveAnimTune(tuneSnapshot())).toBe(true);
    tuneResetAll();
    tuneLoad(await loadAnimTune());
    expect(tuneGet('crouchWalk', 'pelvisYAdd')).toBe(-0.04);
  });
});

describe('anim tuner hooks in the graph', () => {
  it('only the local window changes the graph output: track x trackMul, pelvis + pelvisYAdd, spine + leanAdd, lift x kneeLiftMul', async () => {
    const { AnimGraph, defaultInput } = await import('../src/anim/animGraph');
    const { proportions } = await import('../src/player/proportions');
    const a = new AnimGraph(proportions());
    const b = new AnimGraph(proportions());
    const ia = defaultInput();
    const ib = defaultInput();
    ia.speed = ib.speed = 1.4;
    ia.localZ = ib.localZ = 1;
    tuneSet('walk', 'trackMul', 1.5, T0);
    tuneSet('walk', 'pelvisYAdd', -0.03, T0);
    tuneSet('walk', 'leanAdd', 0.1, T0);
    tuneSet('walk', 'kneeLiftMul', 1.4, T0);
    const r = rig();
    for (let k = 0; k < 90; k++) {
      a.update(1 / 60, ia);
      tuneBegin(pose({ speed: 1.4 }), r);
      b.update(1 / 60, ib);
      tuneEnd(r);
    }
    expect(b.out.stance.rX / a.out.stance.rX).toBeCloseTo(1.5, 6);
    expect(b.out.pelvis.y - a.out.pelvis.y).toBeCloseTo(-0.03, 6);
    expect(b.out.spine.pitch - a.out.spine.pitch).toBeCloseTo(0.1, 6);
    expect(b.out.gait.liftH / a.out.gait.liftH).toBeCloseTo(1.4, 6);
    // and outside the window the same graph is untouched
    a.update(1 / 60, ia);
    b.update(1 / 60, ib);
    expect(b.out.stance.rX).toBe(a.out.stance.rX);
  });
});

describe('anim tuner pass 2 knobs (CT Core: the stiff walk)', () => {
  it('trunk counter-rotation scales the keyed spine and chest yaw about the clip mean (and the gait clips spine yaw)', async () => {
    const { sampleKeyed, newKeyedPose } = await import('../src/anim/keyed');
    const { KEYED_WALK } = await import('../src/anim/clips/keyed/walk');
    // the yaw (twist about y) of a joint's deviation from the mean, q * conj(m)
    const yawDev = (q: Float64Array, m: Float32Array, s: number): number => {
      const [qx, qy, qz, qw] = [q[s]!, q[s + 1]!, q[s + 2]!, q[s + 3]!];
      const [mx, my, mz, mw] = [-m[s]!, -m[s + 1]!, -m[s + 2]!, m[s + 3]!];
      let dy = qw * my - qx * mz + qy * mw + qz * mx;
      let dw = qw * mw - qx * mx - qy * my - qz * mz;
      if (dw < 0) {
        dy = -dy;
        dw = -dw;
      }
      return 2 * Math.atan2(dy, dw);
    };
    tuneSet('walk', 'trunkTwistMul', 2, T0);
    const r = rig();
    let checked = 0;
    for (const ph of [0.1, 0.3, 0.6, 0.85]) {
      const a = sampleKeyed(KEYED_WALK, ph, 1, newKeyedPose());
      tuneBegin(pose({ speed: 1.4 }), r);
      const b = sampleKeyed(KEYED_WALK, ph, 1, newKeyedPose());
      tuneEnd(r);
      for (const s of [4, 8]) {
        const ya = yawDev(a.q, KEYED_WALK.meanQ, s);
        if (Math.abs(ya) < 1e-3) continue;
        expect(yawDev(b.q, KEYED_WALK.meanQ, s) / ya).toBeCloseTo(2, 3);
        checked++;
      }
      // the pelvis and neck are untouched
      for (const s of [0, 12]) for (let c = 0; c < 4; c++) expect(b.q[s + c]).toBeCloseTo(a.q[s + c]!, 12);
    }
    expect(checked).toBeGreaterThan(2);
    // identity outside the window: exactly the same sample
    expect(Array.from(sampleKeyed(KEYED_WALK, 0.3, 1, newKeyedPose()).q)).toEqual(Array.from(sampleKeyed(KEYED_WALK, 0.3, 1, newKeyedPose()).q));
    // the procedural gait blend: tuneMoveTwist scales the spine yaw channel only
    const { tuneMoveTwist } = await import('../src/anim/tune');
    const { CH, newPose } = await import('../src/anim/pose');
    const p = newPose();
    p[CH.spYaw] = 0.05;
    p[CH.pelYaw] = 0.04;
    tuneBegin(pose({ speed: 1.4 }), r);
    tuneMoveTwist(p);
    tuneEnd(r);
    expect(p[CH.spYaw]).toBeCloseTo(0.1, 6);
    expect(p[CH.pelYaw]).toBeCloseTo(0.04, 6);
    tuneMoveTwist(p);
    expect(p[CH.spYaw]).toBeCloseTo(0.1, 6);
  });

  it('stance knee flex bends the planted knees: the hips sit lower on the real rig', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/player/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const make = (): InstanceType<typeof CharacterRig> => {
      const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      rg.carrier = true;
      return rg;
    };
    tuneSet('walk', 'kneeFlexAdd', 0.06, T0);
    const run = (tuned: boolean): number => {
      const rg = make();
      const rp = { speed: 1.4, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
      let y = 0;
      let n = 0;
      for (let k = 0; k < 150; k++) {
        rg.root.position.z += rp.speed / 60;
        if (tuned) tuneBegin(rp, rg);
        rg.animate(1 / 60, rp);
        if (tuned) tuneEnd(rg);
        if (k >= 90) {
          y += rg.hips.getAbsolutePosition().y;
          n++;
        }
      }
      rg.dispose();
      return y / n;
    };
    const base = run(false);
    const bent = run(true);
    expect(base - bent).toBeGreaterThan(0.015);
    expect(TUNE_CUR.kneeFlexAdd).toBe(0);
  });
});

describe('anim tuner pass 3', () => {
  it('the gap to the guard is visual: the local rig root moves back and sideways in the hold; gameplay reads nothing', async () => {
    tuneSet('hold', 'guardGapAdd', 0.1, T0);
    tuneSet('hold', 'guardSideAdd', 0.05, T0);
    const r = rig(true);
    tuneBegin(pose({ bend: 0.3 }), r);
    tuneEnd(r);
    // facing +z: forward (0, 1), right (1, 0): back 0.1 along z, 0.05 to her left (-x)
    const pos = { x: 0, y: 0, z: 0 };
    tuneRoot(pos, 0);
    expect(pos.x).toBeCloseTo(-0.05, 9);
    expect(pos.z).toBeCloseTo(-0.1, 9);
    expect(pos.y).toBe(0);
    // the takedown controller (gameplay) never imports the tuner
    const fs = await import('node:fs');
    expect(fs.readFileSync('src/game/takedownController.ts', 'utf8')).not.toMatch(/anim\/tune|TUNE_/);
  });

  it('target hints sit on the walk, jog and run sliders only; every default stays identity', () => {
    for (const g of ['walk', 'jog', 'run'] as const) {
      for (const id of ['armSwingMul', 'kneeFlexAdd', 'kneeLiftMul', 'trunkTwistMul', 'pelvisYAdd', 'strideMul'] as const) {
        expect(tunablesFor(g).some((t) => t.id === id)).toBe(true);
        expect(tuneHint(g, id)).toMatch(/^target at /);
      }
    }
    expect(tuneHint('sneak', 'armSwingMul')).toBe('');
    expect(tuneHint('rifle.aim', 'gunPitch')).toBe('');
    for (const t of TUNABLES) expect(t.def).toBe(t.kind === 'mul' ? 1 : 0);
  });
});
