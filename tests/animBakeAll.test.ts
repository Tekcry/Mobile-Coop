// (anim-bake-all, BA-A1..A4) The generic base table at run time: the registry composes the base table's `sections` key
// with the tuner's values into every section's effective values (`eff`), rebuilt on an edit, a load, an import or a base
// load; every consumer reads them (the Body / Gun / Camera / Weight eases, Speed, Stepping's planner rows, the move
// sections); the bypass reads the base alone. Untuned (no `sections` key) everything is bit-identical to the tuner's
// own values.
import { afterEach, describe, expect, it } from 'vitest';
import '../src/player/weightTune';
import '../src/anim/tuneV2Sections';
import '../src/anim/moveTune';
import { ANIM_BASE } from '../src/anim/animBase';
import { TUNE_SECTIONS, TUNE_FLAGS, tuneBaseLoad, tuneEffGet, tuneLoad, tuneImport, tuneResetAll, tuneSectionEase, tuneSet, tuneSnapshot, TUNE_EXPORT_MAGIC } from '../src/anim/tuneRegistry';
import { BODY_SECTION, CAM_SECTION, GUN_SECTION, TUNE_CUR, TUNE_LOCAL, tuneBegin, tuneEnd, tuneSim, type TuneRigIn } from '../src/anim/tune';
import { speedAttachMul, speedGlideMul, speedPaceMul } from '../src/player/speedTune';
import { WEIGHT_SECTION, weightSim, weightSimEnd } from '../src/player/weightTune';
import { WEIGHT_MOVE } from '../src/anim/weight';
import { SP, stepGet, stepResetAll, stepRowGet, stepSet } from '../src/anim/tuneStep';
import { moveTuneRoot, moveTuneSelect } from '../src/anim/moveTune';
import { animBaseLoad, animBaseNow } from '../src/anim/tuneJointsRig';

afterEach(() => {
  TUNE_FLAGS.bypass = false;
  tuneBaseLoad(ANIM_BASE.sections);
  tuneResetAll();
  stepResetAll();
  moveTuneSelect('', 0, 'none', false);
});

const target = (): { x: number; y: number; z: number; w: number } => ({ x: 0, y: 0, z: 0, w: 0 });
const rig = (): TuneRigIn => ({ heldWeapon: null, reachL: target(), reachR: target(), plantL: target(), plantR: target(), root: { rotation: { y: 0 } } });

describe('anim-bake-all: untuned, the generic table changes nothing', () => {
  it('the generated table has no sections key; every section\'s base is identity and eff is values, bit for bit', () => {
    expect(ANIM_BASE.sections).toBeUndefined();
    tuneSet('cam.explore', 'camFovAdd', 3);
    tuneSet('spd.aim', 'glideFwdMul', 1.2);
    for (const s of TUNE_SECTIONS) {
      for (const g of s.groups) {
        for (const t of s.tunables) {
          expect(Object.is((s.base[g] as Record<string, number>)[t.id], t.def), `${s.id} ${g} ${t.id} base`).toBe(true);
          expect(Object.is((s.eff[g] as Record<string, number>)[t.id], (s.values[g] as Record<string, number>)[t.id]), `${s.id} ${g} ${t.id} eff`).toBe(true);
        }
      }
    }
    // the consumers read exactly 1 / 0 at default
    tuneResetAll();
    expect(speedPaceMul(2.5, false)).toBe(1);
    expect(speedGlideMul(0.3, 0.7)).toBe(1);
    expect(stepRowGet(1, SP.stride1)).toBe(1);
  });
});

describe('anim-bake-all: base composed with the tuner (eff), rebuilt on an edit, a load, an import, a base load', () => {
  it('Camera (BA-A4): camFovAdd adds to the base (a delta on the FOV setting), camZoomMul multiplies; the bypass reads the base', () => {
    expect(tuneBaseLoad({ cam: { 'cam.explore': { camFovAdd: -4 }, 'cam.aimRifle': { camZoomMul: 0.9, camBlendMul: 1.5 } } })).toEqual([]);
    expect(tuneEffGet('cam.explore', 'camFovAdd')).toBe(-4);
    tuneSet('cam.explore', 'camFovAdd', 2);
    expect(tuneEffGet('cam.explore', 'camFovAdd')).toBe(-2);
    tuneSet('cam.aimRifle', 'camZoomMul', 0.5);
    expect(tuneEffGet('cam.aimRifle', 'camZoomMul')).toBeCloseTo(0.45, 12);
    tuneSectionEase(CAM_SECTION, 'cam.explore', 0);
    expect(CAM_SECTION.cur.camFovAdd).toBe(-2);
    TUNE_FLAGS.bypass = true;
    tuneSectionEase(CAM_SECTION, 'cam.explore', 0.016);
    expect(CAM_SECTION.cur.camFovAdd).toBe(-4);
    TUNE_FLAGS.bypass = false;
    tuneSectionEase(CAM_SECTION, null, 0);
    expect(CAM_SECTION.cur.camFovAdd).toBe(0);
    // the panel, save and export keep the tuner's own value
    expect(tuneSnapshot().values['cam.explore']).toEqual({ camFovAdd: 2 });
  });

  it('a save load and an import rebuild eff; a base load after them too', () => {
    tuneBaseLoad({ gun: { 'rifle.aim': { gunUp: 0.01 } } });
    tuneLoad({ version: 2, values: { 'rifle.aim': { gunUp: 0.02 } }, log: [] });
    expect(tuneEffGet('rifle.aim', 'gunUp')).toBeCloseTo(0.03, 12);
    const r = tuneImport({ magic: TUNE_EXPORT_MAGIC, version: 2, exported: '', changed: [{ group: 'rifle.aim', id: 'gunUp', value: -0.01 }], log: [] });
    expect(r.ok).toBe(true);
    expect(tuneEffGet('rifle.aim', 'gunUp')).toBe(0);
    tuneBaseLoad({ gun: { 'rifle.aim': { gunUp: 0.05 } } });
    expect(tuneEffGet('rifle.aim', 'gunUp')).toBeCloseTo(0.04, 12);
    tuneSectionEase(GUN_SECTION, 'rifle.aim', 0);
    expect(GUN_SECTION.cur.gunUp).toBeCloseTo(0.04, 12);
  });

  it('an unknown group or slider of a registered section is skipped and named; a section registering later picks its rows up', () => {
    expect(tuneBaseLoad({ cam: { 'cam.nope': { camFovAdd: 1 }, 'cam.explore': { nope: 1, camZoomMul: 0.5 } }, later: { 'later.g': { x: 1 } } }).sort()).toEqual(['cam.cam.explore.camZoomMul', 'cam.cam.explore.nope', 'cam.cam.nope.camFovAdd']);
    // camZoomMul is an aim-groups slider, not cam.explore's
    expect(tuneEffGet('cam.explore', 'camZoomMul')).toBe(1);
  });

  it('Body strideMul (BA-A2): each moving state its own base value, into TUNE_LOCAL and the motion step (tuneSim)', () => {
    tuneBaseLoad({ body: { walk: { strideMul: 1.2 }, jog: { strideMul: 0.9 } } });
    tuneSectionEase(BODY_SECTION, 'walk', 0);
    expect(BODY_SECTION.cur.strideMul).toBe(1.2);
    const r = rig();
    tuneBegin({ speed: 1.4, crouch: 0, aim: 0 }, r, 0);
    tuneEnd(r);
    expect(TUNE_LOCAL.strideMul).toBe(1.2);
    tuneSim(true);
    expect(TUNE_CUR.strideMul).toBe(1.2);
    tuneSim(false);
    tuneBegin({ speed: 3, crouch: 0, aim: 0 }, r, 0);
    tuneEnd(r);
    expect(TUNE_LOCAL.strideMul).toBe(0.9);
    tuneSet('jog', 'strideMul', 1.1);
    tuneBegin({ speed: 3, crouch: 0, aim: 0 }, r, 0);
    tuneEnd(r);
    expect(TUNE_LOCAL.strideMul).toBeCloseTo(0.99, 12);
  });

  it('Speed (gameplay): the base composes into the glide, pace, attach multipliers; the bypass reads the base alone', () => {
    tuneBaseLoad({ speed: { 'spd.aim': { glideFwdMul: 1.1 }, 'spd.climb': { ladderMul: 1.25 }, 'spd.stand': { runMul: 1.2 } } });
    expect(speedGlideMul(0, 1)).toBeCloseTo(1.1, 12);
    expect(speedAttachMul('ladder')).toBe(1.25);
    tuneSet('spd.climb', 'ladderMul', 0.8);
    expect(speedAttachMul('ladder')).toBe(1);
    TUNE_FLAGS.bypass = true;
    expect(speedAttachMul('ladder')).toBe(1.25);
    expect(speedGlideMul(0, 1)).toBeCloseTo(1.1, 12);
    TUNE_FLAGS.bypass = false;
    expect(speedPaceMul(100, false)).toBe(1.2);
  });

  it('Stepping: the planner rows are base x tuner (every planner reads them); stepGet stays the tuner\'s value', () => {
    tuneBaseLoad({ step: { 'step.walk': { stride1: 1.2, lift: 0.5 } } });
    expect(stepRowGet(1, SP.stride1)).toBe(1.2);
    expect(stepGet(1, SP.stride1)).toBe(1);
    stepSet(1, SP.stride1, 1.5);
    expect(stepRowGet(1, SP.stride1)).toBeCloseTo(1.8, 12);
    tuneBaseLoad(undefined);
    expect(stepRowGet(1, SP.stride1)).toBe(1.5);
    expect(stepRowGet(1, SP.lift)).toBe(1);
  });

  it('Weight: the momentum values (weightSim) and the eased layer values are base composed with the tuner', () => {
    tuneBaseLoad({ weight: { 'weight.walk': { stopSettle: 0.4, chestDampMul: 0.8 } } });
    weightSim(false, false, 0);
    expect(WEIGHT_MOVE.stopSettle).toBe(0.4);
    weightSimEnd();
    TUNE_FLAGS.bypass = true;
    weightSim(false, false, 0);
    expect(WEIGHT_MOVE.stopSettle).toBe(0.4);
    weightSimEnd();
    TUNE_FLAGS.bypass = false;
    tuneSectionEase(WEIGHT_SECTION, 'weight.walk', 0);
    expect(WEIGHT_SECTION.cur.chestDampMul).toBe(0.8);
  });

  it('Moves (BA-A3): a traversal group\'s base offset moves the local rig root; the bypass reads the base only when the group has one', () => {
    tuneBaseLoad({ trav: { 'trav.vault': { bodyFwd: 0.1 } } });
    expect(moveTuneSelect('', 0, 'vault', false)).toBe('trav.vault');
    const pos = { x: 0, y: 0, z: 0 };
    const rot = { y: 0 };
    moveTuneRoot(pos, rot);
    expect(pos.z).toBeCloseTo(0.1, 12);
    TUNE_FLAGS.bypass = true;
    expect(moveTuneSelect('', 0, 'vault', false)).toBe('trav.vault');
    expect(moveTuneSelect('', 0, 'mantle', false)).toBe('');
    TUNE_FLAGS.bypass = false;
    tuneBaseLoad(undefined);
    TUNE_FLAGS.bypass = true;
    expect(moveTuneSelect('', 0, 'vault', false)).toBe('');
  });

  it('the dev hook\'s animBaseLoad loads the sections key with the rest', () => {
    const b = animBaseNow();
    b.sections = { cam: { 'cam.wall': { camFovAdd: 5 } } };
    expect(animBaseLoad(b)).toEqual([]);
    expect(tuneEffGet('cam.wall', 'camFovAdd')).toBe(5);
    animBaseLoad(ANIM_BASE);
    expect(tuneEffGet('cam.wall', 'camFovAdd')).toBe(0);
  });
});
