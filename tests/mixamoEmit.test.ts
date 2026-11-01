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
interface Recipe { slug: string; kind: string; file: string; title: string; note?: string; travel: string; pack?: string | null; place?: string; mirror?: boolean; inPlace: boolean | string; channels: string[]; chamber: { body: string; move?: string; crouch?: boolean; circle?: boolean } }
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
  emitTurn: (d: Inter, rig: Rig, rec: { slug: string; turnDeg: number }) => Out;
  faceTake: (d: Inter, take: Take, seg: number[]) => Inter & { travel: { headingDeg: number; bodyTurnedDeg: number; facesBack: boolean } };
  emitRecipe: (d: Inter, rig: Rig, rec: Recipe) => Res;
  sourceRow: (rec: Recipe, res: Res) => string;
  writeKeyedBlock: (text: string, rows: Record<string, string>, o?: { keep?: boolean }) => string;
  rowTitle: (rec: Partial<Recipe>) => string;
  modulePath: (rec: Partial<Recipe>, dir?: string) => string;
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
  // (mixamo-retarget I6) the locomotion set
  walking: 'gait', jogging: 'gait', running: 'gait', fast_run: 'gait', start_walking: 'timed', stop_walking: 'timed', run_to_stop: 'timed',
  right_turn: 'turn', left_turn: 'turn', walking_left_turn: 'turn', walking_left_turn_mirror: 'turn', left_strafe_walking: 'gait',
  right_strafe_walking: 'gait', crouched_sneaking_left: 'gait', crouched_sneaking_right: 'gait', walking_backwards: 'loop', run_backwards: 'loop',
  // (mixamo-retarget I9) batch 2: the keyed clips of BATCH2-PLAN "(1) Clip table" (its 15 channel clips wait for I11)
  ...Object.fromEntries(Object.entries({
    gait: 'pistol_walk pistol_run pistol_walk_backward pistol_strafe pistol_strafe_2 pistol_run_backward pistol_walk_arc pistol_walk_arc_2 pistol_run_arc pistol_run_arc_2 pistol_walk_backward_arc pistol_walk_backward_arc_2 pistol_run_backward_arc pistol_run_backward_arc_2 '
      + 'rifle_walk_forward rifle_run_forward rifle_sprint_forward rifle_walk_backward rifle_walk_left rifle_walk_right rifle_walk_crouching_forward rifle_walk_forward_left rifle_walk_forward_right rifle_walk_backward_left rifle_walk_backward_right '
      + 'rifle_walk_crouching_backward rifle_walk_crouching_left rifle_walk_crouching_right rifle_walk_crouching_forward_left rifle_walk_crouching_forward_right rifle_walk_crouching_backward_left rifle_walk_crouching_backward_right '
      + 'rifle_run_forward_left rifle_run_forward_right rifle_run_left rifle_run_right rifle_run_backward rifle_run_backward_left rifle_run_backward_right rifle_sprint_forward_left rifle_sprint_forward_right rifle_sprint_left rifle_sprint_right '
      + 'rifle_sprint_backward rifle_sprint_backward_left rifle_sprint_backward_right shooter_walking shooter_rifle_run shooter_walking_backwards shooter_run_backwards shooter_strafe shooter_strafe_2 '
      + 'aa_left_cover_sneak aa_right_cover_sneak aa_walking aa_running aa_crouched_sneaking_left aa_crouched_sneaking_right',
    loop: 'pistol_idle pistol_kneeling_idle rifle_idle rifle_idle_aiming rifle_idle_crouching rifle_idle_crouching_aiming rifle_jump_loop shooter_rifle_aiming_idle aa_idle aa_idle_2 aa_idle_3 aa_idle_4 aa_idle_5 '
      + 'crouch_look_around_corner looking_around cover_idle taking_cover_idle',
    timed: 'pistol_stand_to_kneel pistol_kneel_to_stand pistol_jump pistol_jump_2 rifle_jump_up rifle_jump_down rifle_death_from_the_front rifle_death_from_the_back rifle_death_from_right rifle_death_from_front_headshot '
      + 'rifle_death_from_back_headshot rifle_death_crouching_headshot_front shooter_start_walking shooter_stop_walking shooter_start_walking_backwards shooter_walk_backwards_stop shooter_firing_rifle shooter_jump_forward '
      + 'shooter_jump_backward shooter_walking_to_dying aa_stand_to_cover aa_stand_to_cover_2 aa_cover_to_stand aa_cover_to_stand_2 aa_jumping_up aa_run_to_stop stand_cover_to_look aa_left_turn aa_right_turn',
    turn: 'rifle_turn_90_left rifle_turn_90_right rifle_crouching_turn_90_left rifle_crouching_turn_90_right',
  }).flatMap(([k, v]) => v.split(' ').map((slug) => [slug, k]))),
  // (piano-knife S2) the knife kills' clips (`place` knife, `clips/mixamo/knife/`, loaded lazily)
  stabbing: 'timed', standing_melee_attack_downward: 'timed', falling_forward_death: 'timed', dying: 'timed', falling_back_death: 'timed',
};
/** (I9) The batch 2 clips with a game slot (BATCH2-PLAN "(1)"; wired by I10 / I13): their modules are `place` game. */
const GAME_B2 = new Set(('pistol_idle pistol_walk pistol_run pistol_walk_backward pistol_strafe pistol_strafe_2 rifle_idle rifle_idle_aiming rifle_walk_forward rifle_run_forward rifle_sprint_forward rifle_walk_backward '
  + 'rifle_walk_left rifle_walk_right rifle_walk_crouching_forward rifle_turn_90_left rifle_turn_90_right rifle_crouching_turn_90_left rifle_crouching_turn_90_right aa_left_cover_sneak aa_right_cover_sneak '
  + 'crouch_look_around_corner cover_idle stand_cover_to_look').split(' '));
/** (piano-knife S2) The knife kills' clips: `place` knife. */
const KNIFE = new Set(['stabbing', 'standing_melee_attack_downward', 'falling_forward_death', 'dying', 'falling_back_death']);

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const bad = (slug: string, patch: Record<string, unknown>): unknown => {
  const j = clone(RECIPES);
  Object.assign(j.clips[slug]!, patch);
  return j;
};

describe('mixamoEmit: recipes', () => {
  it('the committed recipes are valid: the keyed slugs with the plan\'s kinds', () => {
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
    expect(() => E.validateRecipes(bad('cross_punch', { chamber: { body: 'boxing' } }))).toThrow(/body boxing is not a body state/);
    expect(() => E.validateRecipes(bad('cross_punch', { chamber: { body: 'idle', move: 'fwd' } }))).toThrow(/only a gait moves/);
    expect(() => E.validateRecipes(bad('cross_punch', { trim: [2, 1] }))).toThrow(/trim/);
    expect(() => E.validateRecipes(bad('cross_punch', { speed: 3 }))).toThrow(/unknown field speed/);
    expect(() => E.validateRecipes({ version: 2, clips: {} })).toThrow(/version: 1/);
    // (mixamo-retarget I6) the gait bands and the locomotion slots
    expect(() => E.validateRecipes(bad('jogging', { gait: 'trot' }))).toThrow(/jogging: gait band from walk, jog, run/);
    expect(() => E.validateRecipes(bad('start_walking', { slot: 'walk' }))).toThrow(/slot walk takes a gait recipe/);
    expect(() => E.validateRecipes(bad('walking', { slot: 'hop' }))).toThrow(/no such slot/);
    expect(() => E.validateRecipes(bad('right_turn', { turnDeg: undefined }))).toThrow(/a turn names turnDeg/);
    expect(() => E.validateRecipes(bad('walking', { turnDeg: 90 }))).toThrow(/turnDeg is a turn's/);
    expect(() => E.validateRecipes(bad('left_strafe_walking', { gait: 'walk' }))).toThrow(/sideways gait/);
    expect(() => E.validateRecipes(bad('left_strafe_walking', { travel: '+x' }))).toThrow(/strafeL travels -x/);
    expect(() => E.validateRecipes(bad('walking', { cycles: 1.5 }))).toThrow(/cycles/);
    expect(() => E.validateRecipes(bad('right_turn', { slot: 'strafeR' }))).toThrow(/slot strafeR takes a gait recipe/);
    // (I7) the recipe options: travel -z / auto, mirror, place, pack files
    expect(() => E.validateRecipes(bad('pistol_strafe', { gait: 'strafe' }))).toThrow(/travel auto gait names its forward band/);
    expect(() => E.validateRecipes(bad('rifle_walk_backward', { gait: 'strafe' }))).toThrow(/sideways gait/);
    expect(() => E.validateRecipes(bad('cross_punch', { mirror: 'yes' }))).toThrow(/mirror must be a boolean/);
    expect(() => E.validateRecipes(bad('cross_punch', { place: 'menu' }))).toThrow(/place from game \/ chamber \/ knife/);
    expect(() => E.validateRecipes(bad('rifle_idle', { title: 'Pro Rifle Pack: idle' }))).toThrow(/title "Pro Rifle Pack: idle" != "idle"/);
    expect(() => E.validateRecipes(bad('rifle_idle', { file: 'pack-sword/idle.fbx' }))).toThrow(/no site name|slugs to sword_idle/);
  });

  it('(I7) a recipe as loaded: its pack, place game by default, no mirror; the row title and the module folder', () => {
    const rs = E.loadRecipes();
    const by = (slug: string): Recipe => rs.find((r) => r.slug === slug)!;
    expect(by('rifle_walk_forward')).toMatchObject({ pack: 'pack-rifle', place: 'game', mirror: false, title: 'walk forward' });
    expect(by('walking')).toMatchObject({ pack: null, place: 'game' });
    expect(E.rowTitle(by('rifle_walk_forward'))).toBe('Pro Rifle Pack: walk forward');
    expect(E.rowTitle(by('pistol_strafe_2'))).toBe('Pistol/Handgun Locomotion Pack: pistol strafe (2)');
    expect(E.rowTitle(by('walking_left_turn_mirror'))).toBe('Walking Left Turn (Mirror = right turn)');
    expect(E.rowTitle(by('kneel_down'))).toBe('Kneel Down');
    expect(E.modulePath(by('aa_idle'), 'D').replace(/\\/g, '/')).toBe('D/chamber/aa_idle.ts');
    expect(E.modulePath(by('rifle_idle'), 'D').replace(/\\/g, '/')).toBe('D/rifle_idle.ts');
    // (piano-knife S2) a knife kill clip sits in `knife/`
    expect(E.modulePath(by('stabbing'), 'D').replace(/\\/g, '/')).toBe('D/knife/stabbing.ts');
    // batch 2: a pack file, a place named or a game slot; the rest of batch 2 is Test Chamber only (piano-knife S2: the
    // knife kills' clips are place knife)
    for (const r of rs) if (r.pack || RECIPES.clips[r.slug]!.place || GAME_B2.has(r.slug)) expect(r.place, r.slug).toBe(GAME_B2.has(r.slug) ? 'game' : KNIFE.has(r.slug) ? 'knife' : 'chamber');
    for (const slug of KNIFE) expect(by(slug).place, slug).toBe('knife');
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

  it('(I6) turn: by the yaw turned, from the turn start to turnDeg of the monotone root yaw', () => {
    const n = 61; // 1 s turning 120 deg right after 0.25 s still
    const yaw = (k: number): number => (k < 15 ? 0 : Math.min(1, (k - 15) / 40) * (120 * Math.PI) / 180);
    const out = E.emitTurn(inter(n, false, () => 0, { root: Array.from({ length: n }, (_, k) => [0, 0, yaw(k)]) }), rig, { slug: 'test_turn', turnDeg: 90 });
    expect(out.report.turnedDeg as number).toBeCloseTo(90, 0);
    expect(out.seconds).toBeGreaterThan(0.45);
    expect(out.seconds).toBeLessThan(0.6);
    expect(out.def.frames).toBeGreaterThanOrEqual(16);
    expect(out.def.feet).toBeUndefined();
  });

  it('(I6) faceTake: a sideways loop faces the take (its reverse when the chest faces away), travelling along x', () => {
    const n = 60;
    const along = (): Inter => inter(n, true, () => 0, { root: Array.from({ length: n }, (_, k) => [0, (1.2 * k) / n, 0]), cycleDistance: 1.2 });
    const take = (chestYaw: number): Take => {
      const t = takeOf(121, (s, i) => (s === 'root' ? [-i / 100, 0.9, 0] : [0, 0, 0]));
      t.quat.set('thorax', Array.from({ length: 121 }, () => [0, Math.sin(chestYaw / 2), 0, Math.cos(chestYaw / 2)]));
      return t;
    };
    const L = E.faceTake(along(), take(0), [0, 120]);
    expect(L.travel.headingDeg).toBeCloseTo(-90, 3);
    expect(L.travel.facesBack).toBe(false);
    const last = L.root[n - 1]!;
    expect(last[0]!).toBeCloseTo(-1.2 * (n - 1) / n, 4);
    expect(last[1]!).toBeCloseTo(0, 4);
    // the chest turned round: the take faces away from its rest facing, so -x travel is the body's right
    const B = E.faceTake(along(), take(Math.PI * 0.9), [0, 120]);
    expect(B.travel.facesBack).toBe(true);
    expect(B.travel.headingDeg).toBeCloseTo(90, 3);
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
const MODULES = {
  ...import.meta.glob('../src/anim/clips/mixamo/*.ts', { eager: true }),
  // (I9) the Test Chamber only clips
  ...import.meta.glob('../src/anim/clips/mixamo/chamber/*.ts', { eager: true }),
  // (piano-knife S2) the knife kills' clips
  ...import.meta.glob('../src/anim/clips/mixamo/knife/*.ts', { eager: true }),
} as Record<string, Record<string, unknown>>;
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
      const first = readFileSync(p.replace(/^\.\.\//, ''), 'utf8').split('\n')[0]!;
      // (I7) the folder follows the recipe's place
      expect(p.includes('/mixamo/chamber/'), slug).toBe(RECIPES.clips[slug]!.place === 'chamber');
      expect(p.includes('/mixamo/knife/'), slug).toBe(RECIPES.clips[slug]!.place === 'knife');
      expect(first).toMatch(/GENERATED.*Do not edit/);
      const row = MOCAP_SOURCES[clip.name]!;
      expect(row.source).toBe('mixamo');
      const r = RECIPES.clips[slug]!;
      expect(row.title).toBe(E.rowTitle(r));
      expect(row.take).toBe(RECIPES.clips[slug]!.file);
      expect(row.chamber.kind).toBe('keyed');
    }
  });

  it('loops and gaits close, planted feet fall back at the stride, one-shots export their seconds', () => {
    const K = 1.68 / 1.75;
    for (const [p, mod] of keyedMods) {
      const slug = /\/([a-z0-9_]+)\.ts$/.exec(p)![1]!;
      const clip = mod[`MOCAP_${slug.toUpperCase()}`] as KeyedClip;
      const st = MOCAP_SOURCES[clip.name]!.chamber;
      if (st.kind !== 'keyed') throw new Error(slug);
      const N = clip.frames;
      if (PLAN_KINDS[slug] === 'timed') {
        const secs = mod[`MOCAP_${slug.toUpperCase()}_SECONDS`] as number;
        expect(secs, slug).toBeGreaterThan(0.2);
        expect(st.cycle).toBeCloseTo(secs, 3);
        continue;
      }
      if (PLAN_KINDS[slug] === 'turn') {
        // (I6) played by the yaw turned: no seconds constant; the row cycles over the take's seconds
        expect(mod[`MOCAP_${slug.toUpperCase()}_SECONDS`], slug).toBeUndefined();
        expect(st.cycle, slug).toBeGreaterThan(0.3);
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
      // (I6) a sideways cycle's planted foot falls back along its travel axis
      const [ux, uz] = clip.travel === '+x' ? [1, 0] : clip.travel === '-x' ? [-1, 0] : clip.travel === '-z' ? [0, -1] : [0, 1];
      for (let s = 0; s < 2; s++) for (let i = 0; i < N; i++) {
        const j = (i + 1) % N;
        if (!clip.feet[i * 10 + s * 5 + 4] || !clip.feet[j * 10 + s * 5 + 4]) continue;
        const dz = clip.feet[j * 10 + s * 5 + 2]! - clip.feet[i * 10 + s * 5 + 2]!;
        const dx = clip.feet[j * 10 + s * 5]! - clip.feet[i * 10 + s * 5]!;
        errs.push(Math.hypot(dz + (uz * clip.stride) / N, dx + (ux * clip.stride) / N) * K * 100);
      }
      errs.sort((a, b) => a - b);
      expect(errs.length, slug).toBeGreaterThan(0);
      expect(errs[errs.length >> 1]!, `${slug}: planted foot vs the root, median cm/frame`).toBeLessThan(1);
      // the Chamber walks it at its own pace: a gait's row moves forward over its cycle
      // (the sideways ones: the right on the treadmill, the left in place, as the CMU strafes)
      // (I7) a backward one backs along the treadmill
      expect(st.move ?? 'none', slug).toBe(clip.travel === 'z' ? 'fwd' : clip.travel === '+x' ? 'side' : clip.travel === '-z' ? 'back' : 'none');
    }
  });
});
