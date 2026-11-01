import { beforeEach, describe, expect, it } from 'vitest';
import {
  BODY_SECTION,
  TUNE_BODY,
  TUNE_CAM_CUR,
  TUNE_CUR,
  TUNE_EXPORT_MAGIC,
  TUNE_FLAGS,
  TUNE_IDENTITY,
  TUNE_LOG,
  TUNE_STATE,
  tunable,
  tuneBegin,
  tuneCamStep,
  tuneEnd,
  tuneExport,
  tuneGet,
  tuneImport,
  tuneLoad,
  tuneMax,
  tuneMin,
  tuneSectionEase,
  tuneSet,
  tuneSnapshot,
  type TuneRigIn,
} from '../src/anim/tune';
import { registerTuneSection, TUNE_SECTIONS, tuneSectionLoad, WIDE_MUL_FLOOR } from '../src/anim/tuneRegistry';
import { SPEED_SECTION, speedAttachMul, speedGlideMul, speedGroupFor, speedPaceMul, speedToday, speedWallMul } from '../src/player/speedTune';
import { GEARS } from '../src/config/movement';
import { WALL } from '../src/player/wallController';

const T0 = Date.UTC(2026, 9, 21, 15, 0, 0);
const target = (x = 0, y = 0, z = 0): TuneRigIn['reachL'] => ({ x, y, z, w: 1 });
const rig = (): TuneRigIn => ({ heldWeapon: null, reachL: target(1, 2, 3), reachR: target(-1, 2, 3), plantL: target(0.2, 0, 0.1), plantR: target(-0.2, 0, 0.1), root: { rotation: { y: 0 } } });

beforeEach(() => {
  TUNE_FLAGS.bypass = false;
  TUNE_FLAGS.wide = false;
  tuneLoad({ version: 1, values: {}, log: [] });
  for (const s of TUNE_SECTIONS) tuneSectionLoad(s, null);
});

describe('smooth state changes (registry ease)', () => {
  it('Body eases a group change over dt; dt 0 applies at once; identity stays bit-exact', () => {
    tuneSet('walk', 'leanAdd', 0.2, T0);
    const r = rig();
    tuneBegin({ speed: 1.4, crouch: 0, aim: 0 }, r, 1 / 60);
    expect(TUNE_STATE.body).toBe('walk');
    expect(TUNE_CUR.leanAdd).toBeGreaterThan(0);
    expect(TUNE_CUR.leanAdd).toBeLessThan(0.2);
    tuneEnd(r);
    for (let i = 0; i < 120; i++) {
      tuneBegin({ speed: 1.4, crouch: 0, aim: 0 }, r, 1 / 60);
      tuneEnd(r);
    }
    expect(BODY_SECTION.cur.leanAdd).toBe(0.2);
    // dt 0: at once (the older callers and the frozen frame)
    tuneBegin({ speed: 0, crouch: 0, aim: 0 }, r);
    expect(TUNE_CUR.leanAdd).toBe(0);
    tuneEnd(r);
    // identity in, identity out: every field exactly its default
    tuneBegin({ speed: 3, crouch: 0, aim: 0 }, r, 1 / 60);
    for (const k of Object.keys(TUNE_IDENTITY) as (keyof typeof TUNE_IDENTITY)[]) if (k !== 'armSwingK') expect(Object.is(TUNE_CUR[k], TUNE_IDENTITY[k])).toBe(true);
    tuneEnd(r);
  });

  it('a section with tau 0 snaps; a value within 1e-6 lands exactly', () => {
    const sec = registerTuneSection({
      id: 'easeTest',
      label: 'x',
      groups: ['ease.a'],
      tunables: [{ id: 'k', label: 'k', kind: 'mul', def: 1, min: 0, max: 2, step: 0.01, unit: 'x', groups: ['ease.a'], hook: '' }],
    });
    tuneSet('ease.a', 'k', 1.5, T0);
    tuneSectionEase(sec, 'ease.a', 1 / 60);
    expect(sec.cur.k).toBe(1.5);
    const slow = registerTuneSection({
      id: 'easeTest2',
      label: 'x',
      groups: ['ease.b'],
      tau: 0.1,
      tunables: [{ id: 'k', label: 'k', kind: 'mul', def: 1, min: 0, max: 2, step: 0.01, unit: 'x', groups: ['ease.b'], hook: '' }],
    });
    tuneSet('ease.b', 'k', 1.5, T0);
    for (let i = 0; i < 400; i++) tuneSectionEase(slow, 'ease.b', 1 / 60);
    expect(slow.cur.k).toBe(1.5);
  });
});

describe('bypass', () => {
  it('every section reads identity while held (body, camera, speed, tuneSectionLoad); release returns to the tune', () => {
    tuneSet('walk', 'leanAdd', 0.2, T0);
    tuneSet('cam.explore', 'camBoomAdd', 1, T0);
    tuneSet('spd.stand', 'walkMul', 1.5, T0);
    TUNE_STATE.gun = '';
    TUNE_FLAGS.bypass = true;
    const r = rig();
    tuneBegin({ speed: 1.4, crouch: 0, aim: 0 }, r, 1 / 60);
    expect(TUNE_CUR.leanAdd).toBe(0);
    tuneEnd(r);
    tuneCamStep(null, 0, 0, 0, 1 / 60);
    expect(TUNE_CAM_CUR.camBoomAdd).toBe(0);
    expect(speedPaceMul(GEARS.stand[2], false)).toBe(1);
    tuneSectionLoad(SPEED_SECTION, 'spd.stand');
    expect(SPEED_SECTION.cur.walkMul).toBe(1);
    TUNE_FLAGS.bypass = false;
    tuneBegin({ speed: 1.4, crouch: 0, aim: 0 }, r);
    expect(TUNE_CUR.leanAdd).toBe(0.2);
    tuneEnd(r);
    expect(speedPaceMul(GEARS.stand[2], false)).toBe(1.5);
    // the stored values never changed
    expect(TUNE_BODY.walk.leanAdd).toBe(0.2);
  });
});

describe('wide ranges', () => {
  it('double every range around its default while on; set clamps to the active range; a load clamps to the active range', () => {
    const t = tunable('leanAdd');
    expect([tuneMin(t), tuneMax(t)]).toEqual([t.min, t.max]);
    tuneSet('walk', 'leanAdd', 0.7, T0);
    expect(tuneGet('walk', 'leanAdd')).toBe(t.max);
    TUNE_FLAGS.wide = true;
    expect([tuneMin(t), tuneMax(t)]).toEqual([t.def - 2 * (t.def - t.min), t.def + 2 * (t.max - t.def)]);
    tuneSet('walk', 'leanAdd', 0.7, T0 + 5000);
    expect(tuneGet('walk', 'leanAdd')).toBe(0.7);
    const snap: unknown = JSON.parse(JSON.stringify(tuneSnapshot()));
    // (fix round) wide on, the wide value loads; wide off, a load clamps it back to the normal range
    tuneLoad(snap);
    expect(tuneGet('walk', 'leanAdd')).toBe(0.7);
    TUNE_FLAGS.wide = false;
    tuneLoad(snap);
    expect(tuneGet('walk', 'leanAdd')).toBe(t.max);
  });

  it('(fix round) a multiplier never goes below its floor: never negative, 0.05 or its own lower positive minimum', () => {
    TUNE_FLAGS.wide = true;
    for (const s of TUNE_SECTIONS) {
      for (const t of s.tunables) {
        if (t.kind !== 'mul') continue;
        const lo = tuneMin(t);
        expect(lo).toBeGreaterThanOrEqual(0);
        if (t.min > 0) expect(lo).toBeGreaterThan(0);
        expect(lo).toBeLessThanOrEqual(t.min);
      }
    }
    expect(tuneMin(tunable('camBlendMul'))).toBe(WIDE_MUL_FLOOR);
    expect(tuneMin(tunable('camFollowMul'))).toBe(WIDE_MUL_FLOOR);
    expect(tuneMin(tunable('kneeOutMul'))).toBe(0);
    tuneSet('cam.explore', 'camBoomRateMul', -5, T0);
    expect(tuneGet('cam.explore', 'camBoomRateMul')).toBe(WIDE_MUL_FLOOR);
    // an add slider still doubles both ways
    const a = tunable('leanAdd');
    expect(tuneMin(a)).toBe(a.def - 2 * (a.def - a.min));
  });

  it('(fix round) a bad saved or imported value is clamped to the normal range on load', () => {
    tuneLoad({ version: 1, values: { 'cam.explore': { camBoomRateMul: -1.8, camZoomMul: 9 }, 'spd.stand': { walkMul: -0.4 } }, log: [] });
    expect(tuneGet('cam.explore', 'camBoomRateMul')).toBe(tunable('camBoomRateMul').min);
    expect(tuneGet('spd.stand', 'walkMul')).toBe(0.3);
    const r = tuneImport({ magic: TUNE_EXPORT_MAGIC, version: 1, changed: [{ group: 'spd.aim', id: 'glideFwdMul', value: -2 }], log: [] });
    expect(r.ok).toBe(true);
    expect(tuneGet('spd.aim', 'glideFwdMul')).toBe(0.3);
  });
});

describe('fix round: no prototype keys', () => {
  it('import and load skip __proto__ / constructor / prototype', () => {
    const r = tuneImport({
      magic: TUNE_EXPORT_MAGIC,
      version: 1,
      changed: [
        { group: '__proto__', id: 'polluted', value: 1 },
        { group: 'later.y', id: 'constructor', value: 1 },
        { group: 'prototype', id: 'x', value: 1 },
      ],
      log: [],
    });
    expect(r).toEqual({ ok: true, error: '', applied: 0, pending: 0 });
    tuneLoad(JSON.parse('{"version":1,"values":{"__proto__":{"polluted":1},"later.z":{"__proto__":1}},"log":[]}'));
    expect(({} as Record<string, unknown>).polluted).toBe(undefined);
    expect(Object.keys(tuneSnapshot().values)).toEqual(['later.z']);
  });
});

describe('fix round: gameplay reads the game view, wherever it is placed', () => {
  it('the sticky-cam view and photo mode write gamePos after they place the camera', async () => {
    const fs = await import('node:fs');
    const gad = fs.readFileSync('src/game/gadgetSystem.ts', 'utf8');
    const at = gad.indexOf("camera.rotation.set(-c.pitch, c.yaw, 0);");
    expect(at).toBeGreaterThan(0);
    expect(gad.indexOf('g.player.cam.gamePos.copyFrom(camera.position);', at)).toBeGreaterThan(at);
    const gs = fs.readFileSync('src/game/gameState.ts', 'utf8');
    expect(gs).toMatch(/if \(this\.photo\) \{[\s\S]{0,200}gamePos\.copyFrom\(this\.player\.cam\.camera\.position\)/);
  });

  it('the panel reads co-op live before any freeze, step, speed or View change', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/ui/animTunePanel.ts', 'utf8');
    // (G1) `show()` asks the gate and calls `reveal()`, which holds the body
    for (const head of ['  reveal(): void {', '  private onPadToggled(): void {', '  private setTimeScale(v: number): void {', '  setFrozen(on: boolean, auto = false): void {', '  private stepFrame(): void {', '  frame(nowMs: number): void {']) {
      const i = src.indexOf(head);
      expect(i).toBeGreaterThan(0);
      expect(src.slice(i, i + 400)).toMatch(/refreshCoop\(\)/);
    }
  });
});

describe('import', () => {
  it('applies an export, keeps unknown sections pending, logs an import entry; wrong magic or version is refused', () => {
    tuneSet('walk', 'trackMul', 1.2, T0);
    tuneSet('cam.wall', 'camSideAdd', 0.1, T0);
    const e = JSON.parse(JSON.stringify(tuneExport(new Date(T0)))) as ReturnType<typeof tuneExport>;
    e.changed.push({ group: 'later.x', id: 'q', label: 'q', kind: 'add', unit: 'm', value: 0.3, default: 0 });
    tuneSet('walk', 'kneeOutMul', 1.4, T0);
    const r = tuneImport(e, 'anim-tune-2026-10-21.json', T0 + 1000);
    expect(r).toEqual({ ok: true, error: '', applied: 2, pending: 1 });
    expect(tuneGet('walk', 'trackMul')).toBe(1.2);
    expect(tuneGet('cam.wall', 'camSideAdd')).toBe(0.1);
    // the import replaces the values: what was not in the file is back to its default
    expect(tuneGet('walk', 'kneeOutMul')).toBe(1);
    expect(TUNE_LOG[TUNE_LOG.length - 1]).toMatchObject({ group: 'import', id: 'anim-tune-2026-10-21.json', to: 3 });
    // the pending value survives a save and lands when its section registers
    const snap: unknown = JSON.parse(JSON.stringify(tuneSnapshot()));
    tuneLoad(snap);
    const late = registerTuneSection({
      id: 'laterSec',
      label: 'later',
      groups: ['later.x'],
      tunables: [{ id: 'q', label: 'q', kind: 'add', def: 0, min: -1, max: 1, step: 0.01, unit: 'm', groups: ['later.x'], hook: '' }],
    });
    expect(late.values['later.x']!.q).toBe(0.3);
    expect(tuneImport({ magic: 'nope', version: 1, changed: [] }).ok).toBe(false);
    expect(tuneImport({ magic: TUNE_EXPORT_MAGIC, version: 3, changed: [] }).error).toMatch(/version/); // (T1a: 2 is the rows' version)
    expect(tuneImport('junk').ok).toBe(false);
    // a refused import changes nothing
    expect(tuneGet('walk', 'trackMul')).toBe(1.2);
  });
});

describe('speed section', () => {
  it('is identity at default, interpolates the curve points, scales the glide by direction, and follows the body group', () => {
    for (const g of SPEED_SECTION.groups) for (const k of SPEED_SECTION.keys) expect(SPEED_SECTION.values[g]![k]).toBe(1);
    for (const v of [0, 0.5, 1, 2, 3.5, 5]) {
      expect(speedPaceMul(v, false)).toBe(1);
      expect(speedPaceMul(v, true)).toBe(1);
    }
    expect(speedGlideMul(1, 0)).toBe(1);
    expect(speedWallMul(true)).toBe(1);
    expect(speedAttachMul('ladder')).toBe(1);
    tuneSet('spd.stand', 'walkMul', 1.5, T0);
    expect(speedPaceMul(GEARS.stand[2], false)).toBe(1.5);
    // half way from walk (1.5) to jog (1)
    expect(speedPaceMul((GEARS.stand[2] + GEARS.stand[3]) / 2, false)).toBeCloseTo(1.25, 9);
    expect(speedPaceMul(GEARS.stand[2], true)).toBe(1);
    tuneSet('spd.aim', 'glideStrafeMul', 2, T0);
    expect(speedGlideMul(0, 1)).toBe(1);
    expect(speedGlideMul(1, 0)).toBeCloseTo(2, 9);
    tuneSet('spd.climb', 'crawlMul', 0.5, T0);
    expect(speedAttachMul('duct')).toBe(0.5);
    expect(speedAttachMul('zipline')).toBe(1);
    expect(speedGroupFor('aimCrouch')).toBe('spd.aim');
    expect(speedGroupFor('wallSlide')).toBe('spd.wall');
    expect(speedGroupFor('ledge')).toBe('spd.climb');
    expect(speedGroupFor('jog')).toBe('spd.stand');
    expect(speedGroupFor('')).toBe(null);
    expect(speedToday('spd.wall', 'slideStandMul')).toBe(`${WALL.slideStand} m/s`);
    expect(SPEED_SECTION.note).toMatch(/tests and e2e use the defaults/);
    expect(TUNE_SECTIONS.map((s) => s.id).indexOf('speed')).toBeGreaterThan(2);
  });
});
