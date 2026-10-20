import { beforeEach, describe, expect, it } from 'vitest';
import {
  ALL_GROUPS,
  CAM_FIELDS,
  CAM_GROUPS,
  TUNE_BODY,
  TUNE_CAM,
  TUNE_CAM_CUR,
  TUNE_CAM_IDENTITY,
  TUNE_LOG,
  TUNE_STATE,
  isTuneGroup,
  selectCamGroup,
  tunable,
  tunablesFor,
  tuneCamStep,
  tuneExport,
  tuneGet,
  tuneLoad,
  tuneNotes,
  tuneResetAll,
  tuneSet,
  tuneSnapshot,
  tuneToday,
} from '../src/anim/tune';
import { registerTuneSection, TUNE_SECTIONS, tuneSectionLoad } from '../src/anim/tuneRegistry';
import { ATTACH_FRAMING, CAMERA } from '../src/config/camera';

const T0 = Date.UTC(2026, 9, 21, 12, 0, 0);

const settle = (attach: string | null, peek: number, ads: number, crouch: number): void => {
  for (let i = 0; i < 600; i++) tuneCamStep(attach, peek, ads, crouch, 1 / 60);
};

beforeEach(() => {
  tuneLoad({ version: 1, values: {}, log: [] });
  TUNE_STATE.body = '';
  TUNE_STATE.gun = '';
  settle(null, 0, 0, 0);
});

describe('anim tuner camera (tuner-camera)', () => {
  it('camera defaults are identity: every group, the current values and a step at identity stay exactly 0 / 1', () => {
    for (const f of CAM_FIELDS) expect(TUNE_CAM_IDENTITY[f]).toBe(tunable(f).kind === 'mul' ? 1 : 0);
    for (const g of CAM_GROUPS) for (const f of CAM_FIELDS) expect(TUNE_CAM[g][f]).toBe(TUNE_CAM_IDENTITY[f]);
    settle(null, 0, 0, 0);
    for (const f of CAM_FIELDS) expect(Object.is(TUNE_CAM_CUR[f], TUNE_CAM_IDENTITY[f])).toBe(true);
    for (const g of CAM_GROUPS) expect(tunablesFor(g).length).toBeGreaterThan(0);
  });

  it('picks the camera group from the camera state', () => {
    expect(selectCamGroup(null, 0, 0, 0, 'idle', '')).toBe('cam.explore');
    expect(selectCamGroup(null, 0, 0, 1, 'sneak', '')).toBe('cam.exploreCrouch');
    expect(selectCamGroup(null, 0, 0, 0, 'lowReady', 'rifle.lowReady')).toBe('cam.lowReady');
    expect(selectCamGroup(null, 0, 1, 0, 'aim', 'rifle.aim')).toBe('cam.aimRifle');
    expect(selectCamGroup(null, 0, 1, 1, 'aimCrouch', 'pistol.aimCrouch')).toBe('cam.aimPistol');
    expect(selectCamGroup('wall', 0, 0, 0, 'wallIdle', '')).toBe('cam.wall');
    expect(selectCamGroup('wall', 0.4, 0, 0, 'wallPeek', '')).toBe('cam.peek');
    expect(selectCamGroup('ladder', 0, 0, 0, 'ladder', '')).toBe('cam.climb');
    expect(selectCamGroup('hang', 0, 0, 0, 'ledge', '')).toBe('cam.climb');
    expect(selectCamGroup('duct', 0, 0, 1, 'crawl', '')).toBe('cam.vent');
    expect(selectCamGroup(null, 0, 0, 1, 'crawl', '')).toBe('cam.vent');
    expect(selectCamGroup(null, 0, 1, 0, 'hold', 'pistol.aim')).toBe('cam.hold');
  });

  it('the current values ease to the state group and back; TUNE_STATE.cam follows; paused nothing moves', () => {
    tuneSet('cam.aimRifle', 'camBoomAdd', 0.5, T0);
    TUNE_STATE.gun = 'rifle.aim';
    tuneCamStep(null, 0, 1, 0, 1 / 60);
    expect(TUNE_STATE.cam).toBe('cam.aimRifle');
    expect(TUNE_CAM_CUR.camBoomAdd).toBeGreaterThan(0);
    expect(TUNE_CAM_CUR.camBoomAdd).toBeLessThan(0.5);
    settle(null, 0, 1, 0);
    expect(TUNE_CAM_CUR.camBoomAdd).toBe(0.5);
    TUNE_STATE.gun = '';
    settle(null, 0, 0, 0);
    expect(TUNE_STATE.cam).toBe('cam.explore');
    expect(TUNE_CAM_CUR.camBoomAdd).toBe(0);
    tuneSet('cam.explore', 'camFovAdd', 10, T0);
    tuneCamStep(null, 0, 0, 0, 0);
    expect(TUNE_CAM_CUR.camFovAdd).toBe(0);
  });

  it('the export holds the camera values; a snapshot round trips them; an older body / gun snapshot still loads', () => {
    tuneSet('cam.wall', 'camSideAdd', 0.2, T0);
    tuneSet('walk', 'trackMul', 1.2, T0 + 2000);
    const e = tuneExport(new Date(T0 + 3000));
    expect(e.changed.map((c) => [c.group, c.id, c.value, c.default])).toEqual([
      ['walk', 'trackMul', 1.2, 1],
      ['cam.wall', 'camSideAdd', 0.2, 0],
    ]);
    const snap: unknown = JSON.parse(JSON.stringify(tuneSnapshot()));
    tuneResetAll();
    tuneLoad(snap);
    expect(tuneGet('cam.wall', 'camSideAdd')).toBe(0.2);
    expect(tuneGet('walk', 'trackMul')).toBe(1.2);
    // a snapshot saved before the camera section (body and gun keys only)
    tuneLoad({
      version: 1,
      values: { walk: { kneeOutMul: 1.3 }, 'rifle.aim': { gunPitch: 0.1 } },
      log: [{ t: new Date(T0).toISOString(), group: 'walk', id: 'kneeOutMul', from: 1, to: 1.3 }],
    });
    expect(tuneGet('walk', 'kneeOutMul')).toBe(1.3);
    expect(tuneGet('rifle.aim', 'gunPitch')).toBe(0.1);
    expect(tuneGet('cam.wall', 'camSideAdd')).toBe(0);
    expect(TUNE_LOG).toHaveLength(1);
  });

  it('the values shown as today come from config/camera.ts', () => {
    expect(tuneToday('cam.explore', 'camSideAdd')).toBe(`${CAMERA.shoulderHip} m`);
    expect(tuneToday('cam.explore', 'camFovAdd')).toMatch(/^86 deg/);
    expect(tuneToday('cam.aimRifle', 'camBoomAdd')).toBe(`${CAMERA.boomAds} m`);
    expect(tuneToday('cam.vent', 'camBoomAdd')).toBe(`${ATTACH_FRAMING.duct.boom} m`);
    expect(tuneToday('cam.hold', 'camBlendMul')).toBe('');
    expect(tuneNotes('cam.explore', 'camSideAdd')).toEqual([`today: ${CAMERA.shoulderHip} m`]);
    expect(tuneNotes('walk', 'strideMul')[0]).toMatch(/^target at /);
  });
});

describe('anim tuner section registry (tuner-camera)', () => {
  it('Body, Gun and Camera are registered in that order; the old exports alias the registry objects', () => {
    expect(TUNE_SECTIONS.slice(0, 3).map((s) => s.id)).toEqual(['body', 'gun', 'cam']);
    expect(TUNE_SECTIONS[0]!.values).toBe(TUNE_BODY);
    expect(TUNE_SECTIONS[2]!.cur).toBe(TUNE_CAM_CUR);
    expect(ALL_GROUPS.every((g) => isTuneGroup(g))).toBe(true);
  });

  it('a section registered from another file gets set, export, the log and saves, and loads values saved before it registered', () => {
    tuneLoad({ version: 1, values: { 'test.late': { reachMul: 1.5 } }, log: [] });
    const sec = registerTuneSection({
      id: 'testSec',
      label: 'Test',
      groups: ['test.a', 'test.late'],
      tunables: [
        { id: 'reachMul', label: 'reach', kind: 'mul', def: 1, min: 0, max: 2, step: 0.01, unit: 'x', groups: ['test.a', 'test.late'], hook: 'test' },
        { id: 'liftAdd', label: 'lift', kind: 'add', def: 0, min: -1, max: 1, step: 0.01, unit: 'm', groups: ['test.a'], hook: 'test' },
      ],
      select: (s) => s.testKey || null,
    });
    expect(TUNE_SECTIONS[TUNE_SECTIONS.length - 1]).toBe(sec);
    expect(sec.values['test.late']!.reachMul).toBe(1.5);
    expect(tunablesFor('test.late').map((t) => t.id)).toEqual(['reachMul']);
    expect(tuneSet('test.a', 'liftAdd', 0.25, T0)).toBe(true);
    expect(tuneSet('test.late', 'liftAdd', 0.25, T0)).toBe(false);
    expect(sec.values['test.a']!.liftAdd).toBe(0.25);
    expect(tuneExport().changed.some((c) => c.group === 'test.a' && c.id === 'liftAdd' && c.value === 0.25)).toBe(true);
    expect(TUNE_LOG.some((c) => c.group === 'test.a')).toBe(true);
    // the hot path's copy: the same object, no allocation
    const cur = sec.cur;
    tuneSectionLoad(sec, 'test.a');
    expect(sec.cur).toBe(cur);
    expect(cur.liftAdd).toBe(0.25);
    tuneSectionLoad(sec, null);
    expect(cur.liftAdd).toBe(0);
    expect(sec.select?.({ testKey: 'test.a' })).toBe('test.a');
    const snap: unknown = JSON.parse(JSON.stringify(tuneSnapshot()));
    tuneResetAll();
    expect(sec.values['test.a']!.liftAdd).toBe(0);
    tuneLoad(snap);
    expect(sec.values['test.a']!.liftAdd).toBe(0.25);
    expect(() => registerTuneSection({ id: 'testSec2', label: 'x', groups: ['walk'], tunables: [] })).toThrow();
    expect(() => registerTuneSection({ id: 'testSec', label: 'x', groups: ['test.b'], tunables: [] })).toThrow();
  });
});
