import 'fake-indexeddb/auto';
import { readdirSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import '../src/anim/tune';
import { TUNE_HOOKS, tuneGet, tuneResetAll, tuneSet } from '../src/anim/tuneRegistry';
import {
  STUDIO,
  STUDIO_ENTRIES,
  STUDIO_RADIUS,
  STUDIO_RIGS,
  studioAdvance,
  studioEntry,
  studioInput,
  studioKey,
  studioReset,
  studioScrub,
  studioSpeed,
  studioStepPhase,
  type StudioInputOut,
  CLIP_BODY,
  captureClip,
  studioBodyPin,
} from '../src/anim/studio';
import { MOCAP_SOURCE_NAMES, mocapSource } from '../src/anim/mocapSources';
import { MOCAP_LAYERS } from '../src/anim/mocap';
import { MOCAP_WALK } from '../src/anim/clips/mocap/walk';
import { travEntry } from '../src/anim/studioTraversal';
import { loopGroups, plainLoop } from '../src/ui/tunerLayout';
import { TUNE_CUR } from '../src/anim/tune';
import { newStudioDrive, studioDriveTargets, studioFeet, treadmillFoot, wrap01, type StudioFoot, type TreadOut } from '../src/anim/studioDrive';
import { emptyTargets } from '../src/anim/animGraph';
import { newKeyedPose, sampleKeyed } from '../src/anim/keyed';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
import { KEYED_GLIDE_STRAFE } from '../src/anim/clips/keyed/glide_strafe';
import { stickMagFor } from '../src/player/speedGears';
import {
  HISTORY_MERGE_MS,
  TuneAB,
  TuneHistory,
  presetAutoName,
  presetDelete,
  presetFile,
  presetParse,
  presetPut,
  tuneApplyValues,
  tuneValues,
  tuneValuesEqual,
} from '../src/anim/tuneHistory';
import { loadAnimTunePresets, resetAnimTuneDb, saveAnimTunePresets } from '../src/save/animTuneStore';
import { FREE_CFG, freeSnap, freeTimeScale } from '../src/player/freeView';

afterEach(() => {
  TUNE_HOOKS.changed = null;
  tuneResetAll();
  studioReset();
});

describe('anim studio: the loop list', () => {
  it('has every keyed clip of src/anim/clips/keyed and the procedural states, ids unique', () => {
    const files = readdirSync('src/anim/clips/keyed').filter((f) => f.endsWith('.ts')).map((f) => f.slice(0, -3));
    // (mixamo-retarget M5) the motion captures are keyed loops too (their own group, below)
    const keyed = STUDIO_ENTRIES.filter((e) => e.kind === 'keyed' && mocapSource(e.clip!.name) === null);
    expect(keyed.map((e) => e.clip!.name).sort()).toEqual(files.sort());
    for (const e of keyed) expect(e.id).toBe(`keyed:${e.clip!.name}`);
    const states = STUDIO_ENTRIES.filter((e) => e.kind === 'state').map((e) => e.id);
    for (const s of ['idle', 'walk', 'jog', 'run', 'crouchIdle', 'sneak', 'crouchWalk', 'lowReady', 'aimFwd', 'aimStrafe', 'aimBack']) expect(states).toContain(`state:${s}`);
    const ids = STUDIO_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(STUDIO_ENTRIES[0]!.id).toBe('off');
    expect(studioEntry('nope').id).toBe('off');
    // every moving keyed clip has a cycle from its step and pace; the guard clips are marked
    for (const e of keyed) expect(e.cycle).toBeGreaterThan(0.2);
    expect(studioEntry('keyed:walk').cycle).toBeCloseTo(1.0, 5);
    expect(keyed.filter((e) => e.guard).map((e) => e.clip!.name).every((n) => n.startsWith('guard_'))).toBe(true);
  });

  it('(mixamo-retarget M5) a "motion capture" group: every capture with its source in the label, picked up from its row', () => {
    const ids = STUDIO_ENTRIES.map((e) => e.id);
    const capIdx: number[] = [];
    let keyedCaps = 0;
    let travCaps = 0;
    for (const name of MOCAP_SOURCE_NAMES) {
      const r = mocapSource(name)!;
      const word = r.source === 'cmu' ? 'CMU' : 'Mixamo';
      const st = r.studio;
      if (st.kind === 'keyed') {
        // a keyed capture: through keyed() (`keyed:<clip name>`), its module's own clip, its cycle, the state it tunes in
        const e = studioEntry(`keyed:${name}`);
        expect(e.id, `${name} is in the loop list`).toBe(`keyed:${name}`);
        expect(e.kind).toBe('keyed');
        expect(e.clip).toBe(captureClip(name));
        expect(e.clip!.name).toBe(name);
        expect(e.label).toBe(`motion capture (${word}): ${name.slice(6).split('_').join(' ')}`);
        expect(plainLoop(e.id, e.label)).toBe(`Motion capture (${word}): ${name.slice(6).split('_').join(' ')}`);
        expect(e.cycle).toBeCloseTo(st.cycle, 9);
        if ((st.move ?? 'none') !== 'none') expect(e.pace, `${name}: its own stride over its cycle`).toBeCloseTo((e.clip!.stride * 1.68) / 1.75 / st.cycle, 9);
        else expect(e.pace).toBe(0);
        expect([e.crouch, e.drawn, e.aim]).toEqual([st.crouch ?? false, st.drawn ?? false, st.aim ?? false]);
        expect(CLIP_BODY[name]).toBe(st.body);
        expect(studioBodyPin(e), `${name}: the Studio pins the state the game plays it in`).toBe(st.body);
        expect(loopGroups(e.id).body).toBe(st.body);
        capIdx.push(ids.indexOf(e.id));
        keyedCaps++;
      } else {
        // a channel capture: its prop's traversal loop under its own id, the source in the label
        const id = `${st.loop}/${name.slice(6)}`;
        const e = studioEntry(id);
        expect(e.id, `${name} is in the loop list`).toBe(id);
        expect(e.kind).toBe('trav');
        expect(e.trav!.prop).toBe(travEntry(st.loop)!.prop);
        expect(e.label.startsWith(`motion capture (${word}): `)).toBe(true);
        expect(loopGroups(id).body).toBe(loopGroups(st.loop).body);
        capIdx.push(ids.indexOf(e.id));
        travCaps++;
      }
    }
    // the CMU captures today (12 modules in clips/mocap); Mixamo rows as M3 / M4 add them
    expect(keyedCaps).toBeGreaterThanOrEqual(12);
    expect(STUDIO_ENTRIES.filter((e) => e.label.startsWith('motion capture')).length).toBe(keyedCaps + travCaps);
    // one group: together, after the hand-keyed clips, before the pairs
    const first = Math.min(...capIdx);
    expect(Math.max(...capIdx) - first + 1).toBe(capIdx.length);
    expect(STUDIO_ENTRIES[first - 1]!.kind).toBe('keyed');
    expect(mocapSource(STUDIO_ENTRIES[first - 1]!.clip!.name)).toBeNull();
    expect(STUDIO_ENTRIES[first + capIdx.length]!.kind).toBe('pair');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('(M5) a capture plays on the drive as the game plays it: the mocap share and its layer scales; a hand-made clip not', () => {
    const o = emptyTargets();
    const d = newStudioDrive();
    d.clip = MOCAP_WALK;
    studioDriveTargets(d, o, 1 / 60);
    expect(o.keyMocap).toBe(1);
    // the arm swing slider is off the capture (MOCAP_LAYERS.armSwing 0), as in the game; on a hand-made clip it applies
    expect(MOCAP_LAYERS.armSwing).toBe(0);
    tuneSet('walk', 'armSwingMul', 2);
    const pose = newKeyedPose();
    const was = TUNE_CUR.armSwingK;
    TUNE_CUR.armSwingK = 2;
    try {
      d.phase = 0.25;
      d.held = true;
      studioDriveTargets(d, o, 0);
      sampleKeyed(MOCAP_WALK, 0.25, 1, pose, null);
      const raw = Array.from(pose.arm);
      const got = Array.from(o.keyed.arm);
      sampleKeyed(MOCAP_WALK, 0.25, 1, pose, MOCAP_LAYERS);
      expect(got).toEqual(Array.from(pose.arm));
      expect(got).not.toEqual(raw);
      d.clip = KEYED_WALK;
      studioDriveTargets(d, o, 0);
      expect(o.keyMocap).toBe(0);
      sampleKeyed(KEYED_WALK, 0.25, 1, pose, null);
      expect(Array.from(o.keyed.arm)).toEqual(Array.from(pose.arm));
    } finally {
      TUNE_CUR.armSwingK = was;
    }
  });

  it('studio state resets to its defaults (inactive, idle, no rigs)', () => {
    STUDIO.active = true;
    STUDIO.entry = 'keyed:run';
    STUDIO.mirror = true;
    STUDIO.turntable = true;
    STUDIO_RIGS.push({} as never);
    studioReset();
    expect(STUDIO.active).toBe(false);
    expect(STUDIO.entry).toBe('state:idle');
    expect(STUDIO.mirror).toBe(false);
    expect(STUDIO.turntable).toBe(false);
    expect(Number.isNaN(STUDIO.seek)).toBe(true);
    expect(STUDIO_RIGS.length).toBe(0);
  });
});

describe('anim studio: phase maths', () => {
  it('speed, advance, scrub and wrap', () => {
    expect(studioSpeed(3)).toBe(2);
    expect(studioSpeed(0)).toBe(0.1);
    expect(studioSpeed(Number.NaN)).toBe(1);
    expect(studioAdvance(0, 0.5, 1)).toBeCloseTo(0.5, 9);
    expect(studioAdvance(0.75, 0.5, 1)).toBeCloseTo(0.25, 9);
    expect(studioAdvance(0.2, 0.1, 1, 2)).toBeCloseTo(0.4, 9);
    expect(studioAdvance(0.3, 0, 1)).toBe(0.3);
    expect(studioScrub(-1)).toBe(0);
    expect(studioScrub(2)).toBeLessThan(1);
    expect(wrap01(-0.25)).toBeCloseTo(0.75, 9);
    expect(wrap01(1)).toBe(0);
  });

  it('step: one key forward / back, wrapping; between keys to the next one in that direction', () => {
    expect(studioStepPhase(0, 32, 1)).toBeCloseTo(1 / 32, 9);
    expect(studioStepPhase(0, 32, -1)).toBeCloseTo(31 / 32, 9);
    expect(studioStepPhase(31 / 32, 32, 1)).toBe(0);
    expect(studioStepPhase(10.4 / 32, 32, 1)).toBeCloseTo(11 / 32, 9);
    expect(studioStepPhase(10.4 / 32, 32, -1)).toBeCloseTo(10 / 32, 9);
    expect(studioKey(10.4 / 32, 32)).toBe(10);
    expect(studioKey(31.8 / 32, 32)).toBe(0);
  });

  it('the drive in place advances by dt / cycle (dt 0 holds), full keyed weight, the clip sampled at the phase', () => {
    const d = newStudioDrive();
    d.clip = KEYED_WALK;
    d.cycle = 1;
    const o = emptyTargets();
    studioDriveTargets(d, o, 0.25);
    expect(d.phase).toBeCloseTo(0.25, 9);
    expect(o.keyW).toBe(1);
    expect(o.keyArmW).toBe(1);
    expect(o.keyTrunk).toBe(1);
    expect(o.gait.phase).toBeCloseTo(0.25, 9);
    expect(o.gait.duty).toBe(KEYED_WALK.duty);
    const ref = sampleKeyed(KEYED_WALK, 0.25, 1, newKeyedPose());
    for (let i = 0; i < 3; i++) expect(o.keyed.pel[i]).toBeCloseTo(ref.pel[i]!, 9);
    studioDriveTargets(d, o, 0);
    expect(d.phase).toBeCloseTo(0.25, 9);
    // root motion: the graph's gait clock
    d.inPlace = false;
    o.gait.phase = 0.6;
    studioDriveTargets(d, o, 0.1);
    expect(d.phase).toBeCloseTo(0.6, 9);
    // off: nothing written
    d.clip = null;
    o.keyW = 0;
    studioDriveTargets(d, o, 0.1);
    expect(o.keyW).toBe(0);
  });

  it('mirror: the pose mirrored, sampled half a cycle on', () => {
    const d = newStudioDrive();
    d.clip = KEYED_GLIDE_STRAFE;
    d.mirror = true;
    d.phase = 0.1;
    const o = emptyTargets();
    studioDriveTargets(d, o, 0);
    const ref = sampleKeyed(KEYED_GLIDE_STRAFE, 0.6, 1, newKeyedPose());
    expect(o.keyed.pel[0]).toBeCloseTo(-ref.pel[0]!, 9);
    expect(o.keyed.pel[1]).toBeCloseTo(ref.pel[1]!, 9);
    // the trunk's yaw flips (y and z of each quaternion negated)
    expect(o.keyed.q[5]).toBeCloseTo(-ref.q[5]!, 9);
    expect(o.keyed.q[4]).toBeCloseTo(ref.q[4]!, 9);
  });

  it('treadmill feet: the planted foot slides back under the body, the swing arcs forward and lifts', () => {
    const d = newStudioDrive();
    d.clip = KEYED_WALK;
    d.pace = 1.4;
    d.cycle = 1;
    const a: TreadOut = { x: 0, z: 0, lift: 0, contact: false, swing: 0 };
    d.phase = 0;
    treadmillFoot(d, -1, 1, a);
    expect(a.contact).toBe(true);
    const z0 = a.z;
    expect(a.x).toBeCloseTo(-KEYED_WALK.half, 9);
    d.phase = KEYED_WALK.duty * 0.5;
    treadmillFoot(d, -1, 1, a);
    expect(a.contact).toBe(true);
    expect(a.z).toBeLessThan(z0);
    d.phase = KEYED_WALK.duty + (1 - KEYED_WALK.duty) / 2;
    treadmillFoot(d, -1, 1, a);
    expect(a.contact).toBe(false);
    expect(a.lift).toBeGreaterThan(0.5 * KEYED_WALK.liftH);
    // the right foot half a cycle later
    d.phase = 0.5;
    treadmillFoot(d, 1, 1, a);
    expect(a.contact).toBe(true);
    expect(a.z).toBeCloseTo(z0, 9);
    expect(a.x).toBeCloseTo(KEYED_WALK.half, 9);
    // a side clip mirrored travels the other way
    d.dirX = 1;
    d.dirZ = 0;
    d.phase = 0;
    treadmillFoot(d, -1, 1, a);
    const sx = a.x;
    d.mirror = true;
    treadmillFoot(d, -1, 1, a);
    expect(a.x + KEYED_WALK.half).toBeCloseTo(-(sx + KEYED_WALK.half), 9);
    // a still clip: both feet down at the track
    d.pace = 0;
    d.mirror = false;
    d.phase = 0.7;
    treadmillFoot(d, 1, 1, a);
    expect(a.contact).toBe(true);
    expect(a.lift).toBe(0);
  });

  it('studioFeet writes the planner feet under the root in place only; a heel strike lands once', () => {
    const foot = (): StudioFoot => ({ x: 0, y: 0, z: 0, yaw: 0, contact: false, swing: -1, pitch: 0, landed: false, init: false });
    const pl = { L: foot(), R: foot() };
    const d = newStudioDrive();
    d.clip = KEYED_WALK;
    d.pace = 1.4;
    d.cycle = 1;
    d.inPlace = false;
    studioFeet(d, pl, 5, 0, 5, 0, 1);
    expect(pl.L.x).toBe(0);
    d.inPlace = true;
    d.phase = 0.99;
    studioFeet(d, pl, 5, 1, 5, 0, 1);
    expect(pl.L.contact).toBe(false);
    d.phase = 0.001;
    studioFeet(d, pl, 5, 1, 5, 0, 1);
    expect(pl.L.contact && pl.L.landed).toBe(true);
    expect(pl.L.x).toBeCloseTo(5 - KEYED_WALK.half, 6);
    expect(pl.L.y).toBe(1);
    studioFeet(d, pl, 5, 1, 5, 0, 1);
    expect(pl.L.landed).toBe(false);
  });

  it('synthesised input: a state walks the circle, a keyed clip only with root motion', () => {
    const o: StudioInputOut = { x: 0, y: 0, turn: 0, ads: false, crouch: false, drawn: false };
    studioInput(studioEntry('state:walk'), false, o);
    expect(o.y).toBeCloseTo(stickMagFor(1.4, false), 9);
    expect(o.turn).toBeCloseTo(1.4 / STUDIO_RADIUS, 9);
    studioInput(studioEntry('state:aimStrafe'), false, o);
    expect(o.x).toBeGreaterThan(0);
    expect(o.ads && o.drawn).toBe(true);
    studioInput(studioEntry('state:sneak'), false, o);
    expect(o.crouch).toBe(true);
    studioInput(studioEntry('keyed:walk'), false, o);
    expect(o.x === 0 && o.y === 0 && o.turn === 0).toBe(true);
    studioInput(studioEntry('keyed:walk'), true, o);
    expect(o.y).toBeGreaterThan(0);
    // a keyed crouch clip stands (its pelvis offset is from the standing rest)
    studioInput(studioEntry('keyed:sneak'), true, o);
    expect(o.crouch).toBe(false);
    // in place only (no circle): no move even with root motion
    studioInput(studioEntry('keyed:wall_slide'), true, o);
    expect(o.x === 0 && o.y === 0).toBe(true);
  });
});

describe('anim studio: the drive on the real rig', () => {
  it('a keyed sneak in place: the hips drop by its pelvis offset, the feet step on the treadmill; off: the rig as before', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { defaultLook } = await import('../src/cosmetics/avatarLook');
    const scene = new Scene(new NullEngine());
    const lib = new PartLibrary(scene);
    const rp = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing' as const };
    const run = (drive: boolean): { hips: number; zMin: number; zMax: number; swings: number; landed: number } => {
      const rg = new CharacterRig(scene, (shape, hex, slot) => lib.instance(shape, hex, slot), defaultLook());
      rg.carrier = true;
      const e = studioEntry('keyed:sneak');
      const d = newStudioDrive();
      d.clip = e.clip;
      d.cycle = e.cycle;
      d.pace = e.pace;
      d.crouch = true;
      if (drive) rg.graph.drive = d;
      let hips = 0;
      let n = 0;
      let zMin = Infinity;
      let zMax = -Infinity;
      let swings = 0;
      let landed = 0;
      for (let k = 0; k < 180; k++) {
        rg.animate(1 / 60, rp);
        if (k < 60) continue;
        hips += rg.hips.getAbsolutePosition().y;
        n++;
        const L = rg.planner.L;
        zMin = Math.min(zMin, L.z);
        zMax = Math.max(zMax, L.z);
        if (!L.contact) swings++;
        if (L.landed) landed++;
      }
      rg.dispose();
      return { hips: hips / n, zMin, zMax, swings, landed };
    };
    const off = run(false);
    const on = run(true);
    expect(off.hips - on.hips).toBeGreaterThan(0.15);
    expect(on.zMax - on.zMin).toBeGreaterThan(0.2);
    expect(on.swings).toBeGreaterThan(10);
    expect(on.landed).toBeGreaterThanOrEqual(2);
    expect(off.zMax - off.zMin).toBeLessThan(0.05);
  });
});

describe('anim studio: snapshots', () => {
  const G = 'walk';
  const ID = 'trackMul';

  it('undo / redo: a drag is one step, undo puts it back, redo again; applying is not a new step', () => {
    const h = new TuneHistory();
    TUNE_HOOKS.changed = () => h.note(now);
    let now = 1000;
    h.reset();
    tuneSet(G, ID, 1.1, now);
    now += 100;
    tuneSet(G, ID, 1.2, now);
    h.settle(now);
    expect(h.undoCount).toBe(1); // still open (pending)
    now += HISTORY_MERGE_MS + 1;
    h.settle(now);
    expect(h.undoCount).toBe(1);
    expect(h.undo(now)).toBe(true);
    expect(tuneGet(G, ID)).toBe(1);
    expect(h.undoCount).toBe(0);
    expect(h.redoCount).toBe(1);
    expect(h.redo(now)).toBe(true);
    expect(tuneGet(G, ID)).toBe(1.2);
    expect(h.redoCount).toBe(0);
    expect(h.undoCount).toBe(1);
    // a new change after an undo clears the redo
    h.undo(now);
    now += 10;
    tuneSet(G, ID, 0.9, now);
    h.settle(now, true);
    expect(h.redoCount).toBe(0);
    expect(h.undo(now)).toBe(true);
    expect(tuneGet(G, ID)).toBe(1);
    expect(h.undo(now)).toBe(false);
  });

  it('values: changed only; apply sets every value (missing ones to default); equality', () => {
    tuneSet(G, ID, 1.3);
    const m = tuneValues();
    expect(m).toEqual({ [G]: { [ID]: 1.3 } });
    tuneSet(G, 'kneeOutMul', 1.5);
    expect(tuneValuesEqual(m, tuneValues())).toBe(false);
    expect(tuneApplyValues(m)).toBe(1);
    expect(tuneGet(G, 'kneeOutMul')).toBe(1);
    expect(tuneValuesEqual(m, tuneValues())).toBe(true);
  });

  it('A/B: store both, flip shows the other; edits while on A stay in A', () => {
    const ab = new TuneAB();
    expect(ab.toggle()).toBe('');
    tuneSet(G, ID, 1.2);
    ab.store('A');
    tuneSet(G, ID, 0.8);
    ab.store('B');
    expect(ab.toggle()).toBe('A');
    expect(tuneGet(G, ID)).toBe(1.2);
    tuneSet(G, ID, 1.25);
    expect(ab.toggle()).toBe('B');
    expect(tuneGet(G, ID)).toBe(0.8);
    expect(ab.toggle()).toBe('A');
    expect(tuneGet(G, ID)).toBe(1.25);
  });

  it('presets: put replaces by name, auto names, delete, parse skips bad entries', () => {
    let list = presetPut([], 'walk wide', { walk: { trackMul: 1.2 } });
    list = presetPut(list, '  walk   wide ', { walk: { trackMul: 1.3 } });
    expect(list.length).toBe(1);
    expect(list[0]!.values.walk!.trackMul).toBe(1.3);
    expect(presetAutoName(list)).toBe('preset 1');
    list = presetPut(list, presetAutoName(list), {});
    expect(presetAutoName(list)).toBe('preset 2');
    expect(presetParse(presetFile(list))).toEqual(list);
    expect(presetDelete(list, 'walk wide').map((p) => p.name)).toEqual(['preset 1']);
    expect(presetParse({ version: 3, presets: list })).toEqual([]); // (T1a: version 2 is the rows' version)
    expect(presetParse(null)).toEqual([]);
    const bad = JSON.parse('{"version":1,"presets":[{"name":"x","values":{"__proto__":{"a":1},"walk":{"trackMul":"no","kneeOutMul":1.1}}},{"name":"","values":{}},{"name":"x","values":{}},"junk"]}');
    const p = presetParse(bad);
    expect(p.length).toBe(1);
    expect(p[0]!.values).toEqual({ walk: { kneeOutMul: 1.1 } });
    expect(Object.prototype.hasOwnProperty.call(p[0]!.values, '__proto__')).toBe(false);
  });

  it('presets save to and load from the tuner store (key presets, beside the values)', async () => {
    resetAnimTuneDb();
    const list = presetPut([], 'a', { walk: { trackMul: 1.15 } });
    expect(await saveAnimTunePresets(presetFile(list))).toBe(true);
    resetAnimTuneDb();
    const back = presetParse(await loadAnimTunePresets());
    expect(back).toEqual(list);
    tuneApplyValues(back[0]!.values);
    expect(tuneGet('walk', 'trackMul')).toBe(1.15);
  });
});

describe('anim studio: free view aids', () => {
  it('camera snaps look at the body from the front, side, back and above', () => {
    const o = { yaw: 0, pitch: 0 };
    freeSnap('front', 0.3, o);
    expect(o.yaw).toBeCloseTo(0.3 + Math.PI, 9);
    freeSnap('side', 0.3, o);
    expect(o.yaw).toBeCloseTo(0.3 - Math.PI / 2, 9);
    freeSnap('back', 0.3, o);
    expect(o.yaw).toBeCloseTo(0.3, 9);
    freeSnap('top', 0.3, o);
    expect(o.pitch).toBe(-FREE_CFG.pitchMax);
  });

  it('the game speed goes above 1x only with the studio maximum', () => {
    expect(freeTimeScale(1.8)).toBe(1);
    expect(freeTimeScale(1.8, 2)).toBe(1.8);
    expect(freeTimeScale(5, 2)).toBe(2);
  });
});
