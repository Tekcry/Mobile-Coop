// (mixamo-retarget M3) The keyed emitter for the Mixamo clips (scripts/mocap/mixamoEmit.mjs): the recipes, the duplicate
// last frame, the moving-span trim, the three emit kinds on synthetic intermediates (gait, loop, timed; a gait with no
// strikes falls back to a loop), the source-row block writer, and every committed module under src/anim/clips/mixamo/
// (built through keyedClip at import, header, row, loops close, planted feet fall back at the stride, one-shot seconds).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs build script without types
import * as emitMod from '../scripts/mocap/mixamoEmit.mjs';
// @ts-expect-error plain .mjs build script without types
import * as retargetMod from '../scripts/mocap/retarget.mjs';
import type { KeyedClip } from '../src/anim/keyed';
import { MOCAP_SOURCES } from '../src/anim/mocapSources';

type V = number[];
type Rig = { names: string[]; parent: Record<string, string | null>; bind: Record<string, V>; height: number; leg: number };
interface Recipe { slug: string; kind: string; file: string; title: string; note?: string; travel: string; inPlace: boolean | string; channels: string[]; studio: { body: string; move?: string; crouch?: boolean; circle?: boolean } }
interface Def { name: string; frames: number; pel: number[]; q: number[]; arm: number[]; head?: number[]; feet?: number[]; stride?: number; duty: number; half: number }
interface Out { def: Def; seconds: number; report: Record<string, unknown> }
interface Res { out: Out; kind: string; fallback: string | null }
interface Take { frames: number; fps: number; pos: Map<string, V[]>; quat: Map<string, V[]> }
interface Inter {
  slot: string; loop: boolean; frames: number; fps: number; joints: string[]; pel: V[]; rot: V[][]; pos: V[][]; root: V[]; contact: number[][];
  events: { frame: number; foot: string; type: string }[]; cycleDistance: number | null; source: { take: string; frames120: number[]; seconds: number[] };
}
const E = emitMod as {
  validateRecipes: (json: unknown, o?: { groups?: string[] }) => Recipe[];
  loadRecipes: () => Recipe[];
  dupLast: (t: Take) => { dup: boolean; deg: number; cm: number };
  movingSpan: (t: Take) => { a: number; b: number; thr: number; peak: number };
  emitLoop: (d: Inter, rig: Rig, name: string) => Out;
  emitTimed: (d: Inter, rig: Rig, name: string) => Out;
  emitRecipe: (d: Inter, rig: Rig, rec: Recipe) => Res;
  sourceRow: (rec: Recipe, res: Res) => string;
  writeKeyedBlock: (text: string, rows: Record<string, string>, o?: { keep?: boolean }) => string;
  TRIM: { margin: number };
  LOOP_FPS: number;
  ONESHOT_FPS: number;
};
const RT = retargetMod as { wrenRig: () => Rig };

const RECIPES = JSON.parse(readFileSync('scripts/mocap/data/mixamo-clips.json', 'utf8')) as { version: number; clips: Record<string, Omit<Recipe, 'slug'>> };
const PLAN_KINDS: Record<string, string> = {
  crouched_walking: 'gait', carry_body_walking: 'gait', crawling_prone: 'gait', standing_idle: 'loop', carry_body_idle: 'loop',
  crouch_to_stand: 'timed', stand_to_crouch: 'timed', elbow_strike: 'timed', cross_punch: 'timed', kneel_down: 'timed',
  kneeling_pull_up: 'timed', pulling_up_to_a_ledge: 'timed', lifting_heavy_object: 'timed',
};

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const bad = (slug: string, patch: Record<string, unknown>): unknown => {
  const j = clone(RECIPES);
  Object.assign(j.clips[slug]!, patch);
  return j;
};

describe('mixamoEmit: recipes', () => {
  it('the committed recipes are valid: the 12 keyed slugs with the plan\'s kinds', () => {
    const rs = E.loadRecipes();
    expect(Object.fromEntries(rs.map((r) => [r.slug, r.kind]))).toEqual(PLAN_KINDS);
    // (I4) the stance changes write no head channel (the neck stepped 26-30 deg at the shot's fade with it)
    for (const r of rs) if (r.slug !== 'stand_to_crouch' && r.slug !== 'crouch_to_stand') expect(r.channels).toContain('head');
  });

  it('a wrong recipe is refused with its reason', () => {
    expect(() => E.validateRecipes(bad('standing_idle', { kind: 'spin' }))).toThrow(/standing_idle: kind spin/);
    expect(() => E.validateRecipes(bad('standing_idle', { file: 'Standing Idle 2.fbx' }))).toThrow(/slugs to standing_idle_2/);
    expect(() => E.validateRecipes(bad('kneel_down', { note: undefined }))).toThrow(/kneel_down: note/);
    expect(() => E.validateRecipes(bad('standing_idle', { inPlace: false }))).toThrow(/a loop is in place/);
    expect(() => E.validateRecipes(bad('crouched_walking', { travel: 'none' }))).toThrow(/a gait travels/);
    expect(() => E.validateRecipes(bad('cross_punch', { studio: { body: 'boxing' } }))).toThrow(/body boxing is not a body state/);
    expect(() => E.validateRecipes(bad('cross_punch', { studio: { body: 'idle', move: 'fwd' } }))).toThrow(/only a gait moves/);
    expect(() => E.validateRecipes(bad('cross_punch', { trim: [2, 1] }))).toThrow(/trim/);
    expect(() => E.validateRecipes(bad('cross_punch', { speed: 3 }))).toThrow(/unknown field speed/);
    expect(() => E.validateRecipes({ version: 2, clips: {} })).toThrow(/version: 1/);
  });
});

/** A synthetic take: `pos` / `quat` per slot at 120 fps, from per-frame functions. */
function takeOf(n: number, posAt: (slot: string, i: number) => V, quatAt: (slot: string, i: number) => V = () => [0, 0, 0, 1]): Take {
  const slots = ['root', 'head', 'lradius', 'rradius', 'lhand', 'rhand', 'ltibia', 'rtibia', 'lfoot', 'rfoot'];
  const pos = new Map<string, V[]>(), quat = new Map<string, V[]>();
  for (const s of slots) {
    pos.set(s, Array.from({ length: n }, (_, i) => posAt(s, i)));
    quat.set(s, Array.from({ length: n }, (_, i) => quatAt(s, i)));
  }
  return { frames: n, fps: 120, pos, quat };
}

describe('mixamoEmit: duplicate last frame and trim', () => {
  it('a loop whose last frame repeats its first (travel allowed) is a duplicate; a changed pose is not', () => {
    const turn = (deg: number): V => [Math.sin((deg * Math.PI) / 360), 0, 0, Math.cos((deg * Math.PI) / 360)];
    const walk = takeOf(121, (_s, i) => [0, 1, i * 0.01], (s, i) => (s === 'lradius' ? turn(30 * Math.sin((2 * Math.PI * i) / 120)) : [0, 0, 0, 1]));
    expect(E.dupLast(walk).dup).toBe(true);
    const open = takeOf(121, () => [0, 1, 0], (s, i) => (s === 'lradius' ? turn(i / 4) : [0, 0, 0, 1]));
    const r = E.dupLast(open);
    expect(r.dup).toBe(false);
    expect(r.deg).toBeCloseTo(30, 0);
    const sink = takeOf(121, (_s, i) => [0, 1 - i * 0.001, 0]);
    expect(E.dupLast(sink)).toMatchObject({ dup: false, cm: 12 });
  });

  it('a one-shot is trimmed to its moving span with the margin', () => {
    // still, then the hands move 2 m over frames 240-480 (2 of the 10 trim joints), then still again (720 frames at 120 fps)
    const t = takeOf(720, (s, i) => {
      const u = Math.min(1, Math.max(0, (i - 240) / 240));
      return s.endsWith('hand') ? [0, 1, 2 * (u * u * (3 - 2 * u))] : [0, 1, 0];
    });
    const sp = E.movingSpan(t);
    const m = E.TRIM.margin * 120;
    expect(sp.a).toBeGreaterThanOrEqual(240 - m - 2);
    expect(sp.a).toBeLessThanOrEqual(240 + 40 - m);
    expect(sp.b).toBeGreaterThanOrEqual(480 - 40 + m);
    expect(sp.b).toBeLessThanOrEqual(480 + m + 2);
    // nothing moving: the whole take
    expect(E.movingSpan(takeOf(100, () => [0, 1, 0]))).toMatchObject({ a: 0, b: 99 });
  });
});

describe('mixamoEmit: the emit kinds on synthetic intermediates', () => {
  const rig = RT.wrenRig();
  const I: V = [0, 0, 0, 1];
  /** An intermediate: identity rotations, the pelvis bobbing `bob(k)` metres over its bind height. */
  function inter(n: number, loop: boolean, bob: (k: number) => number, o: Partial<Inter> = {}): Inter {
    const pb = rig.bind.pelvis!;
    return {
      slot: 'mixamo_test', loop, frames: n, fps: 60, joints: rig.names,
      pel: Array.from({ length: n }, (_, k) => [pb[0]!, pb[1]! + bob(k), pb[2]!]),
      rot: Array.from({ length: n }, () => rig.names.map(() => [...I])),
      pos: Array.from({ length: n }, () => rig.names.map((j) => [...rig.bind[j]!])),
      root: Array.from({ length: n }, () => [0, 0, 0]),
      contact: Array.from({ length: n }, () => [1, 1]),
      events: [], cycleDistance: loop ? 0 : null,
      source: { take: 'test', frames120: [24, 24 + 2 * (n - 1)], seconds: [0.2, 0.2 + (n - 1) / 60] },
      ...o,
    };
  }
  const K = 1.68 / 1.75;
  const bob = (n: number) => (k: number): number => 0.05 * Math.sin((2 * Math.PI * k) / n);

  it('loop: even phases at LOOP_FPS, the closing frame dropped, so frame N-1 runs on into frame 0', () => {
    const n = 120; // 2 s at 60 fps
    const out = E.emitLoop(inter(n, true, bob(n)), rig, 'test_loop');
    const N = 2 * E.LOOP_FPS;
    expect(out.def.name).toBe('mocap_test_loop');
    expect(out.def.frames).toBe(N);
    expect(out.def.pel.length).toBe(3 * N);
    expect(out.def.q.length).toBe(16 * N);
    expect(out.def.feet).toBeUndefined();
    expect(out.seconds).toBe(2);
    for (let i = 0; i < N; i++) expect(out.def.pel[3 * i + 1]!).toBeCloseTo((0.05 * Math.sin((2 * Math.PI * i) / N)) / K, 4);
  });

  it('timed: progress over its own seconds at ONESHOT_FPS, first and last frames kept', () => {
    const n = 91; // 1.5 s
    const out = E.emitTimed(inter(n, false, (k) => -0.3 * (k / (n - 1))), rig, 'test_once');
    const N = 1.5 * E.ONESHOT_FPS + 1;
    expect(out.def.frames).toBe(N);
    expect(out.seconds).toBeCloseTo(1.5, 6);
    expect(out.def.pel[1]!).toBeCloseTo(0, 6);
    expect(out.def.pel[3 * (N - 1) + 1]!).toBeCloseTo(-0.3 / K, 4);
  });

  const rec = (kind: string, slug: string): Recipe => ({ ...(RECIPES.clips[slug] as Omit<Recipe, 'slug'>), slug, kind });

  it('gait: strike-warped, clip feet falling back at the stride; a gait without strikes falls back to a loop', () => {
    const n = 60; // a 1 s cycle travelling 1.2 m
    const contact = Array.from({ length: n }, (_, k) => [k < 36 ? 1 : 0, k >= 30 || k < 6 ? 1 : 0]);
    const d = inter(n, true, () => 0, {
      contact, cycleDistance: 1.2,
      root: Array.from({ length: n }, (_, k) => [0, (1.2 * k) / n, 0]),
      events: [{ frame: 0, foot: 'L', type: 'strike' }, { frame: 30, foot: 'R', type: 'strike' }, { frame: 36, foot: 'L', type: 'off' }, { frame: 6, foot: 'R', type: 'off' }],
    });
    const g = E.emitRecipe(d, rig, rec('gait', 'crouched_walking'));
    expect(g.kind).toBe('gait');
    expect(g.fallback).toBeNull();
    expect(g.out.def.frames).toBe(48);
    expect(g.out.def.feet!.length).toBe(480);
    expect(g.out.def.stride!).toBeCloseTo(1.2 / K, 4);
    expect(g.out.seconds).toBe(1);
    // no strikes: a loop with its travel and no clip feet, flagged
    const f = E.emitRecipe({ ...d, events: [] }, rig, rec('gait', 'crawling_prone'));
    expect(f.kind).toBe('loop');
    expect(f.fallback).toMatch(/no gait cycle/);
    expect(f.out.def.feet).toBeUndefined();
    expect(E.sourceRow(rec('gait', 'crawling_prone'), f)).not.toMatch(/move:/);
  });
});

describe('mixamoEmit: the source rows', () => {
  const TEXT = ['a', '  // @mixamo-keyed-begin (M3)', '  mocap_old: { x },', '  mocap_zed: { z },', '  // @mixamo-keyed-end', 'b'].join('\n');
  it('rewrites only the keyed block, rows sorted, one a line; a partial run keeps the others', () => {
    expect(E.writeKeyedBlock(TEXT, { mocap_b: '  mocap_b: { b },', mocap_a: '  mocap_a: { a },' }).split('\n')).toEqual(
      ['a', '  // @mixamo-keyed-begin (M3)', '  mocap_a: { a },', '  mocap_b: { b },', '  // @mixamo-keyed-end', 'b']);
    expect(E.writeKeyedBlock(TEXT, { mocap_old: '  mocap_old: { new },' }, { keep: true }).split('\n')).toEqual(
      ['a', '  // @mixamo-keyed-begin (M3)', '  mocap_old: { new },', '  mocap_zed: { z },', '  // @mixamo-keyed-end', 'b']);
    expect(E.writeKeyedBlock(TEXT.replace(/\n/g, '\r\n'), {})).toBe(['a', '  // @mixamo-keyed-begin (M3)', '  // @mixamo-keyed-end', 'b'].join('\r\n'));
    expect(() => E.writeKeyedBlock('no markers', {})).toThrow(/marker block/);
  });
});

/** The committed modules (each built through keyedClip when imported). */
const MODULES = import.meta.glob('../src/anim/clips/mixamo/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;
const keyedMods = Object.entries(MODULES).filter(([p]) => !/\/trav_[^/]+$/.test(p));

describe('mixamoEmit: the committed keyed modules', () => {
  it('one module per recipe, each a built KeyedClip named mocap_<slug> with a generated header and its row', () => {
    const slugs = keyedMods.map(([p]) => /\/([a-z0-9_]+)\.ts$/.exec(p)![1]!).sort();
    expect(slugs).toEqual(Object.keys(PLAN_KINDS).sort());
    for (const [p, mod] of keyedMods) {
      const slug = /\/([a-z0-9_]+)\.ts$/.exec(p)![1]!;
      const clip = mod[`MOCAP_${slug.toUpperCase()}`] as KeyedClip;
      expect(clip.pel, slug).toBeInstanceOf(Float32Array);
      expect(clip.name).toBe(`mocap_${slug}`);
      const first = readFileSync(`src/anim/clips/mixamo/${slug}.ts`, 'utf8').split('\n')[0]!;
      expect(first).toMatch(/GENERATED.*Do not edit/);
      const row = MOCAP_SOURCES[clip.name]!;
      expect(row.source).toBe('mixamo');
      expect(row.title).toBe(RECIPES.clips[slug]!.title);
      expect(row.take).toBe(RECIPES.clips[slug]!.file);
      expect(row.studio.kind).toBe('keyed');
    }
  });

  it('loops and gaits close, planted feet fall back at the stride, one-shots export their seconds', () => {
    const K = 1.68 / 1.75;
    for (const [p, mod] of keyedMods) {
      const slug = /\/([a-z0-9_]+)\.ts$/.exec(p)![1]!;
      const clip = mod[`MOCAP_${slug.toUpperCase()}`] as KeyedClip;
      const st = MOCAP_SOURCES[clip.name]!.studio;
      if (st.kind !== 'keyed') throw new Error(slug);
      const N = clip.frames;
      if (PLAN_KINDS[slug] === 'timed') {
        const secs = mod[`MOCAP_${slug.toUpperCase()}_SECONDS`] as number;
        expect(secs, slug).toBeGreaterThan(0.2);
        expect(st.cycle).toBeCloseTo(secs, 3);
        continue;
      }
      // closure: the step from the last frame to frame 0 (pelvis and arm points) against the clip's own steps
      const step = (i: number, j: number): number => {
        let s = 0;
        for (let c = 0; c < 3; c++) s += (clip.pel[3 * i + c]! - clip.pel[3 * j + c]!) ** 2;
        for (let c = 0; c < 12; c++) s += (clip.arm[12 * i + c]! - clip.arm[12 * j + c]!) ** 2;
        return Math.sqrt(s);
      };
      const steps = Array.from({ length: N - 1 }, (_, i) => step(i, i + 1)).sort((a, b) => a - b);
      const seam = step(N - 1, 0);
      expect(seam, `${slug}: seam ${seam} vs max ${steps[N - 2]}`).toBeLessThanOrEqual(Math.max(1.5 * steps[N - 2]!, 0.005));
      if (!clip.feet) continue;
      // planted frames fall back by stride / N a frame (the root moves stride per cycle)
      const errs: number[] = [];
      for (let s = 0; s < 2; s++) for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        if (!clip.feet[i * 10 + s * 5 + 4] || !clip.feet[j * 10 + s * 5 + 4]) continue;
        const dz = clip.feet[j * 10 + s * 5 + 2]! - clip.feet[i * 10 + s * 5 + 2]!;
        errs.push(Math.abs(dz + clip.stride / N) * K * 100);
      }
      errs.sort((a, b) => a - b);
      expect(errs.length, slug).toBeGreaterThan(0);
      expect(errs[errs.length >> 1]!, `${slug}: planted foot vs the root, median cm/frame`).toBeLessThan(1);
      // the Studio walks it at its own pace: a gait's row moves forward over its cycle
      expect(st.move, slug).toBe('fwd');
    }
  });
});
