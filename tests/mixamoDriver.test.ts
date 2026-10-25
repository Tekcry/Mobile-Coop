// mixamo-retarget M1: the dump driver (scripts/mocap/mixamo.mjs) - slugs of the 21 downloaded files (PLAN "Clip map"),
// the skip rule, the manifest and the Blender call. Blender itself is mocked.
import { describe, expect, it } from 'vitest';
import path from 'node:path';
// @ts-expect-error - plain ESM script without types
import { blenderArgs, dumpAll, listClips, PACK_NAME, planDumps, slugOf } from '../scripts/mocap/mixamo.mjs';
// @ts-expect-error - plain ESM script without types
import { dupPairs, markDups, poseDistance, slugTail } from '../scripts/mocap/mixamoDup.mjs';

/** The 21 files as downloaded (2026-10-25 19:00-19:12) and their Clip map slugs. */
const CLIP_MAP: [string, string][] = [
  ['Hanging Idle.fbx', 'hanging_idle'],
  ['Braced Hang Shimmy Left.fbx', 'braced_hang_shimmy_left'],
  ['Braced Hang Shimmy Right.fbx', 'braced_hang_shimmy_right'],
  ['Freehang Climb.fbx', 'freehang_climb'],
  ['Braced Hang To Crouch.fbx', 'braced_hang_to_crouch'],
  ['Climbing Ladder.fbx', 'climbing_ladder'],
  ['Climbing Ladder To Standing.fbx', 'climbing_ladder_to_standing'],
  ['Crouch To Stand.fbx', 'crouch_to_stand'],
  ['Stand To Crouch.fbx', 'stand_to_crouch'],
  ['Crouched Walking.fbx', 'crouched_walking'],
  ['Crawling Hands And Knees.fbx', 'crawling_hands_and_knees'],
  ['Crawling Prone.fbx', 'crawling_prone'],
  ['Kneeling Pull Up (partner haul).fbx', 'kneeling_pull_up'],
  ['Pulling Up To A Ledge.fbx', 'pulling_up_to_a_ledge'],
  ['Lifting Heavy Object (shutter).fbx', 'lifting_heavy_object'],
  ['Carry Body Walking.fbx', 'carry_body_walking'],
  ['Carry Body Idle.fbx', 'carry_body_idle'],
  ['Kneel Down (lay body).fbx', 'kneel_down'],
  ['Elbow Strike.fbx', 'elbow_strike'],
  ['Cross Punch.fbx', 'cross_punch'],
  ['Standing Idle.fbx', 'standing_idle'],
];

const DIR = 'C:/fake/clips';
const OUT = 'C:/fake/out';

/** A folder entry as `readdirSync(..., { withFileTypes: true })` gives it. */
const dirent = (name: string, dir: boolean) => ({ name, isDirectory: () => dir });

/**
 * (I7) A mocked readdir over `files` relative to DIR (`pack-rifle/idle.fbx`): the root gives its files as plain names
 * plus a folder entry per subfolder; a subfolder gives its own entries (a deeper path becomes a nested folder entry).
 */
function tree(files: string[], extra: string[] = []) {
  return (dir: string) => {
    const rel = path.relative(DIR, dir).split(path.sep).join('/');
    const pre = rel ? `${rel}/` : '';
    const out: (string | ReturnType<typeof dirent>)[] = [];
    const dirs = new Set<string>();
    for (const f of [...files, ...extra]) {
      if (!f.startsWith(pre)) continue;
      const rest = f.slice(pre.length);
      const i = rest.indexOf('/');
      if (i < 0) out.push(rel ? dirent(rest, false) : rest);
      else dirs.add(rest.slice(0, i));
    }
    for (const d of dirs) out.push(dirent(d, true));
    return out;
  };
}

/** An in-memory file system: FBX mtimes and hashes, dumps written by the mocked Blender. */
function fakeFs(files: string[]) {
  const mtimes = new Map<string, number>();
  const dumps = new Map<string, { sha256: string; frames: number; fps: number }>();
  const written = new Map<string, string>();
  for (const f of files) mtimes.set(path.join(DIR, f), 100);
  const io = {
    exists: (p: string) => dumps.has(p),
    mtime: (p: string) => mtimes.get(p) ?? 0,
    readDump: (p: string) => {
      const d = dumps.get(p);
      if (!d) throw new Error(`no dump ${p}`);
      return d;
    },
    hash: (p: string) => `sha-${path.basename(p)}`,
  };
  const runs: { exe: string; argv: string[]; jobs: { fbx: string; out: string; slug: string; sha256: string }[] }[] = [];
  const deps = {
    io,
    readdir: tree(files, ['notes.txt']),
    writeFile: (p: string, s: string) => written.set(p, s),
    mkdir: () => undefined,
    findBlender: () => ({ exe: 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' }),
    runBlender: async (exe: string, argv: string[]) => {
      const jobsFile = argv[argv.indexOf('--jobs') + 1]!;
      const jobs = JSON.parse(written.get(jobsFile)!);
      runs.push({ exe, argv, jobs });
      for (const j of jobs) {
        dumps.set(j.out, { sha256: j.sha256, frames: 30, fps: 30 });
        mtimes.set(j.out, 200);
      }
    },
  };
  return { io, deps, runs, written, dumps, mtimes };
}

describe('mixamo dump driver (M1)', () => {
  it('slugs the 21 downloaded files to the Clip map slugs', () => {
    for (const [file, slug] of CLIP_MAP) expect(slugOf(file).slug, file).toBe(slug);
    expect(slugOf('Kneel Down (lay body).fbx').note).toBe('lay body');
    expect(slugOf('Hanging Idle.fbx').note).toBeNull();
    // (mixamo-retarget I6) the site's Mirror box: another take of the same title
    expect(slugOf('Walking Left Turn (Mirror = right turn).fbx')).toEqual({ slug: 'walking_left_turn_mirror', note: 'Mirror = right turn' });
    expect(slugOf('Walking Left Turn.fbx').slug).toBe('walking_left_turn');
    const clips = listClips(DIR, { readdir: () => CLIP_MAP.map(([f]) => f) });
    expect(clips).toHaveLength(21);
    expect(new Set(clips.map((c: { slug: string }) => c.slug)).size).toBe(21);
  });

  it('stops on two files with the same slug', () => {
    expect(() => listClips(DIR, { readdir: () => ['Standing Idle.fbx', 'Standing  Idle (take two).fbx'] })).toThrow(/both slug/);
    expect(() => slugOf('(only a note).fbx')).toThrow(/no letters/);
  });

  it('dumps every clip once, then keeps dumps that are newer with the same hash', async () => {
    const files = CLIP_MAP.map(([f]) => f);
    const fs = fakeFs(files);
    const first = await dumpAll({ dir: DIR, outDir: OUT, deps: fs.deps });
    expect(first.ran).toHaveLength(21);
    expect(fs.runs).toHaveLength(1);
    const run = fs.runs[0]!;
    // File names with spaces / parentheses travel in the jobs file, one Blender call, no shell string.
    expect(run.argv).toEqual(blenderArgs(path.join(OUT, 'jobs.json')));
    expect(run.argv.slice(0, 5)).toEqual(['-b', '--factory-startup', '-noaudio', '--python-exit-code', '1']);
    expect(run.jobs.map((j) => j.fbx)).toContain(path.join(DIR, 'Kneel Down (lay body).fbx'));
    expect(run.jobs.find((j) => j.slug === 'kneel_down')!.out).toBe(path.join(OUT, 'raw', 'kneel_down.json'));

    const manifest = JSON.parse(fs.written.get(path.join(OUT, 'manifest.json'))!);
    expect(manifest.version).toBe(1);
    expect(manifest.clips).toHaveLength(21);
    expect(manifest.clips[0]).toMatchObject({ frames: 30, fps: 30 });

    const second = await dumpAll({ dir: DIR, outDir: OUT, deps: fs.deps });
    expect(second.ran).toHaveLength(0);
    expect(fs.runs).toHaveLength(1);
    expect(second.manifest.clips).toHaveLength(21);
  });

  it('redumps a clip whose FBX changed or is newer, and everything on --force', () => {
    const files = ['Standing Idle.fbx', 'Cross Punch.fbx'];
    const fs = fakeFs(files);
    const idle = path.join(OUT, 'raw', 'standing_idle.json');
    const punch = path.join(OUT, 'raw', 'cross_punch.json');
    fs.dumps.set(idle, { sha256: 'sha-Standing Idle.fbx', frames: 1, fps: 30 });
    fs.mtimes.set(idle, 200);
    fs.dumps.set(punch, { sha256: 'stale', frames: 1, fps: 30 });
    fs.mtimes.set(punch, 200);
    const clips = listClips(DIR, { readdir: () => files });
    const plan = planDumps(clips, OUT, { io: fs.io });
    expect(plan.map((c: { slug: string; skip: boolean }) => [c.slug, c.skip])).toEqual([
      ['cross_punch', false],
      ['standing_idle', true],
    ]);
    fs.mtimes.set(path.join(DIR, 'Standing Idle.fbx'), 300);
    expect(planDumps(clips, OUT, { io: fs.io }).every((c: { skip: boolean }) => !c.skip)).toBe(true);
    fs.mtimes.set(path.join(DIR, 'Standing Idle.fbx'), 100);
    expect(planDumps(clips, OUT, { io: fs.io, force: true }).every((c: { skip: boolean }) => !c.skip)).toBe(true);
  });

  it('(I6) --only dumps those files alone and the manifest keeps its other entries', async () => {
    const fs = fakeFs(['Standing Idle.fbx', 'Cross Punch.fbx', 'Walking.fbx', 'Box Jump.fbx']);
    const mPath = path.join(OUT, 'manifest.json');
    fs.dumps.set(mPath, { clips: [{ file: 'Standing Idle.fbx', slug: 'standing_idle' }, { file: 'Cross Punch.fbx', slug: 'cross_punch' }] } as never);
    const r = await dumpAll({ dir: DIR, outDir: OUT, only: ['walking'], deps: fs.deps });
    expect(r.ran.map((c: { slug: string }) => c.slug)).toEqual(['walking']);
    expect(fs.runs[0]!.jobs.map((j) => j.slug)).toEqual(['walking']);
    const m = JSON.parse(fs.written.get(mPath)!);
    expect(m.clips.map((c: { slug: string }) => c.slug)).toEqual(['cross_punch', 'standing_idle', 'walking']);
    await expect(dumpAll({ dir: DIR, outDir: OUT, only: ['walking', 'nope'], deps: fs.deps })).rejects.toThrow(/no file for nope/);
  });

  it('a dry run plans without calling Blender or writing', async () => {
    const fs = fakeFs(['Standing Idle.fbx']);
    const r = await dumpAll({ dir: DIR, outDir: OUT, dry: true, deps: fs.deps });
    expect(r.planned).toHaveLength(1);
    expect(fs.runs).toHaveLength(0);
    expect(fs.written.size).toBe(0);
  });
});

/**
 * (I7) The 161 files in C:/NightShift/scratch/mixamo/clips/ (listed 2026-10-26): 55 root files (batch 1, I6 and the 17
 * singles of batch 2 B + C) and 106 in the four pack folders, with their slugs (BATCH2-PLAN "(1) Clip table").
 */
const REAL_CLIPS: [string, string][] = [
  ['Box Jump.fbx', 'box_jump'], ['Braced Hang Shimmy Left.fbx', 'braced_hang_shimmy_left'],
  ['Braced Hang Shimmy Right.fbx', 'braced_hang_shimmy_right'], ['Braced Hang To Crouch.fbx', 'braced_hang_to_crouch'],
  ['Carry Body Idle.fbx', 'carry_body_idle'], ['Carry Body Walking.fbx', 'carry_body_walking'],
  ['Climbing A Rope.fbx', 'climbing_a_rope'], ['Climbing Ladder To Standing.fbx', 'climbing_ladder_to_standing'],
  ['Climbing Ladder.fbx', 'climbing_ladder'], ['Climbing Up Wall.fbx', 'climbing_up_wall'],
  ['Cover Idle (standing cover against object).fbx', 'cover_idle'],
  ['Crawling Hands And Knees.fbx', 'crawling_hands_and_knees'], ['Crawling Prone.fbx', 'crawling_prone'],
  ['Cross Punch.fbx', 'cross_punch'], ['Crouch Look Around Corner.fbx', 'crouch_look_around_corner'],
  ['Crouch To Stand.fbx', 'crouch_to_stand'], ['Crouched Sneaking Left.fbx', 'crouched_sneaking_left'],
  ['Crouched Sneaking Right.fbx', 'crouched_sneaking_right'], ['Crouched Walking.fbx', 'crouched_walking'],
  ['Drawing Gun (pistol from lower back).fbx', 'drawing_gun'], ['Elbow Strike.fbx', 'elbow_strike'],
  ['Falling To Landing.fbx', 'falling_to_landing'], ['Fast Run.fbx', 'fast_run'],
  ['Freehang Climb.fbx', 'freehang_climb'], ['Grenade Throw.fbx', 'grenade_throw'],
  ['Hanging Idle.fbx', 'hanging_idle'], ['Jogging.fbx', 'jogging'], ['Kneel Down (lay body).fbx', 'kneel_down'],
  ['Kneeling Pull Up (partner haul).fbx', 'kneeling_pull_up'], ['Left Strafe Walking.fbx', 'left_strafe_walking'],
  ['Left Turn.fbx', 'left_turn'], ['Lifting Heavy Object (shutter).fbx', 'lifting_heavy_object'],
  ['Looking Around.fbx', 'looking_around'], ['Pistol Aim (aim to holster).fbx', 'pistol_aim'],
  ['Pulling Up To A Ledge.fbx', 'pulling_up_to_a_ledge'], ['Reloading (rifle).fbx', 'reloading'],
  ['Rifle Pull Out.fbx', 'rifle_pull_out'], ['Rifle Put Away.fbx', 'rifle_put_away'],
  ['Right Strafe Walking.fbx', 'right_strafe_walking'], ['Right Turn.fbx', 'right_turn'],
  ['Run Backwards.fbx', 'run_backwards'], ['Run To Stop.fbx', 'run_to_stop'], ['Running.fbx', 'running'],
  ['Stand Cover To Look.fbx', 'stand_cover_to_look'], ['Stand To Crouch.fbx', 'stand_to_crouch'],
  ['Stand To Roll.fbx', 'stand_to_roll'], ['Standing Idle.fbx', 'standing_idle'],
  ['Start Walking.fbx', 'start_walking'], ['Stop Walking.fbx', 'stop_walking'],
  ['Taking Cover Idle (rifle).fbx', 'taking_cover_idle'], ['Vault Over Box.fbx', 'vault_over_box'],
  ['Walking Backwards.fbx', 'walking_backwards'],
  ['Walking Left Turn (Mirror = right turn).fbx', 'walking_left_turn_mirror'],
  ['Walking Left Turn.fbx', 'walking_left_turn'], ['Walking.fbx', 'walking'],
  ['pack-action-adventure/cover to stand (2).fbx', 'aa_cover_to_stand_2'],
  ['pack-action-adventure/cover to stand.fbx', 'aa_cover_to_stand'],
  ['pack-action-adventure/crouched sneaking left.fbx', 'aa_crouched_sneaking_left'],
  ['pack-action-adventure/crouched sneaking right.fbx', 'aa_crouched_sneaking_right'],
  ['pack-action-adventure/falling idle.fbx', 'aa_falling_idle'],
  ['pack-action-adventure/falling to roll.fbx', 'aa_falling_to_roll'],
  ['pack-action-adventure/hard landing.fbx', 'aa_hard_landing'], ['pack-action-adventure/idle (2).fbx', 'aa_idle_2'],
  ['pack-action-adventure/idle (3).fbx', 'aa_idle_3'], ['pack-action-adventure/idle (4).fbx', 'aa_idle_4'],
  ['pack-action-adventure/idle (5).fbx', 'aa_idle_5'], ['pack-action-adventure/idle.fbx', 'aa_idle'],
  ['pack-action-adventure/jumping up.fbx', 'aa_jumping_up'],
  ['pack-action-adventure/left cover sneak.fbx', 'aa_left_cover_sneak'],
  ['pack-action-adventure/left turn.fbx', 'aa_left_turn'],
  ['pack-action-adventure/right cover sneak.fbx', 'aa_right_cover_sneak'],
  ['pack-action-adventure/right turn.fbx', 'aa_right_turn'],
  ['pack-action-adventure/run to stop.fbx', 'aa_run_to_stop'], ['pack-action-adventure/running.fbx', 'aa_running'],
  ['pack-action-adventure/stand to cover (2).fbx', 'aa_stand_to_cover_2'],
  ['pack-action-adventure/stand to cover.fbx', 'aa_stand_to_cover'],
  ['pack-action-adventure/walking.fbx', 'aa_walking'], ['pack-pistol/pistol idle.fbx', 'pistol_idle'],
  ['pack-pistol/pistol jump (2).fbx', 'pistol_jump_2'], ['pack-pistol/pistol jump.fbx', 'pistol_jump'],
  ['pack-pistol/pistol kneel to stand.fbx', 'pistol_kneel_to_stand'],
  ['pack-pistol/pistol kneeling idle.fbx', 'pistol_kneeling_idle'],
  ['pack-pistol/pistol run arc (2).fbx', 'pistol_run_arc_2'], ['pack-pistol/pistol run arc.fbx', 'pistol_run_arc'],
  ['pack-pistol/pistol run backward arc (2).fbx', 'pistol_run_backward_arc_2'],
  ['pack-pistol/pistol run backward arc.fbx', 'pistol_run_backward_arc'],
  ['pack-pistol/pistol run backward.fbx', 'pistol_run_backward'], ['pack-pistol/pistol run.fbx', 'pistol_run'],
  ['pack-pistol/pistol stand to kneel.fbx', 'pistol_stand_to_kneel'],
  ['pack-pistol/pistol strafe (2).fbx', 'pistol_strafe_2'], ['pack-pistol/pistol strafe.fbx', 'pistol_strafe'],
  ['pack-pistol/pistol walk arc (2).fbx', 'pistol_walk_arc_2'], ['pack-pistol/pistol walk arc.fbx', 'pistol_walk_arc'],
  ['pack-pistol/pistol walk backward arc (2).fbx', 'pistol_walk_backward_arc_2'],
  ['pack-pistol/pistol walk backward arc.fbx', 'pistol_walk_backward_arc'],
  ['pack-pistol/pistol walk backward.fbx', 'pistol_walk_backward'], ['pack-pistol/pistol walk.fbx', 'pistol_walk'],
  ['pack-rifle/crouching turn 90 left.fbx', 'rifle_crouching_turn_90_left'],
  ['pack-rifle/crouching turn 90 right.fbx', 'rifle_crouching_turn_90_right'],
  ['pack-rifle/death crouching headshot front.fbx', 'rifle_death_crouching_headshot_front'],
  ['pack-rifle/death from back headshot.fbx', 'rifle_death_from_back_headshot'],
  ['pack-rifle/death from front headshot.fbx', 'rifle_death_from_front_headshot'],
  ['pack-rifle/death from right.fbx', 'rifle_death_from_right'],
  ['pack-rifle/death from the back.fbx', 'rifle_death_from_the_back'],
  ['pack-rifle/death from the front.fbx', 'rifle_death_from_the_front'],
  ['pack-rifle/idle aiming.fbx', 'rifle_idle_aiming'],
  ['pack-rifle/idle crouching aiming.fbx', 'rifle_idle_crouching_aiming'],
  ['pack-rifle/idle crouching.fbx', 'rifle_idle_crouching'], ['pack-rifle/idle.fbx', 'rifle_idle'],
  ['pack-rifle/jump down.fbx', 'rifle_jump_down'], ['pack-rifle/jump loop.fbx', 'rifle_jump_loop'],
  ['pack-rifle/jump up.fbx', 'rifle_jump_up'], ['pack-rifle/run backward left.fbx', 'rifle_run_backward_left'],
  ['pack-rifle/run backward right.fbx', 'rifle_run_backward_right'],
  ['pack-rifle/run backward.fbx', 'rifle_run_backward'], ['pack-rifle/run forward left.fbx', 'rifle_run_forward_left'],
  ['pack-rifle/run forward right.fbx', 'rifle_run_forward_right'], ['pack-rifle/run forward.fbx', 'rifle_run_forward'],
  ['pack-rifle/run left.fbx', 'rifle_run_left'], ['pack-rifle/run right.fbx', 'rifle_run_right'],
  ['pack-rifle/sprint backward left.fbx', 'rifle_sprint_backward_left'],
  ['pack-rifle/sprint backward right.fbx', 'rifle_sprint_backward_right'],
  ['pack-rifle/sprint backward.fbx', 'rifle_sprint_backward'],
  ['pack-rifle/sprint forward left.fbx', 'rifle_sprint_forward_left'],
  ['pack-rifle/sprint forward right.fbx', 'rifle_sprint_forward_right'],
  ['pack-rifle/sprint forward.fbx', 'rifle_sprint_forward'], ['pack-rifle/sprint left.fbx', 'rifle_sprint_left'],
  ['pack-rifle/sprint right.fbx', 'rifle_sprint_right'], ['pack-rifle/turn 90 left.fbx', 'rifle_turn_90_left'],
  ['pack-rifle/turn 90 right.fbx', 'rifle_turn_90_right'],
  ['pack-rifle/walk backward left.fbx', 'rifle_walk_backward_left'],
  ['pack-rifle/walk backward right.fbx', 'rifle_walk_backward_right'],
  ['pack-rifle/walk backward.fbx', 'rifle_walk_backward'],
  ['pack-rifle/walk crouching backward left.fbx', 'rifle_walk_crouching_backward_left'],
  ['pack-rifle/walk crouching backward right.fbx', 'rifle_walk_crouching_backward_right'],
  ['pack-rifle/walk crouching backward.fbx', 'rifle_walk_crouching_backward'],
  ['pack-rifle/walk crouching forward left.fbx', 'rifle_walk_crouching_forward_left'],
  ['pack-rifle/walk crouching forward right.fbx', 'rifle_walk_crouching_forward_right'],
  ['pack-rifle/walk crouching forward.fbx', 'rifle_walk_crouching_forward'],
  ['pack-rifle/walk crouching left.fbx', 'rifle_walk_crouching_left'],
  ['pack-rifle/walk crouching right.fbx', 'rifle_walk_crouching_right'],
  ['pack-rifle/walk forward left.fbx', 'rifle_walk_forward_left'],
  ['pack-rifle/walk forward right.fbx', 'rifle_walk_forward_right'],
  ['pack-rifle/walk forward.fbx', 'rifle_walk_forward'], ['pack-rifle/walk left.fbx', 'rifle_walk_left'],
  ['pack-rifle/walk right.fbx', 'rifle_walk_right'], ['pack-shooter/firing rifle.fbx', 'shooter_firing_rifle'],
  ['pack-shooter/jump backward.fbx', 'shooter_jump_backward'],
  ['pack-shooter/jump forward.fbx', 'shooter_jump_forward'],
  ['pack-shooter/rifle aiming idle.fbx', 'shooter_rifle_aiming_idle'],
  ['pack-shooter/rifle run.fbx', 'shooter_rifle_run'], ['pack-shooter/run backwards.fbx', 'shooter_run_backwards'],
  ['pack-shooter/start walking backwards.fbx', 'shooter_start_walking_backwards'],
  ['pack-shooter/start walking.fbx', 'shooter_start_walking'],
  ['pack-shooter/stop walking.fbx', 'shooter_stop_walking'], ['pack-shooter/strafe (2).fbx', 'shooter_strafe_2'],
  ['pack-shooter/strafe.fbx', 'shooter_strafe'],
  ['pack-shooter/walk backwards stop.fbx', 'shooter_walk_backwards_stop'],
  ['pack-shooter/walking backwards.fbx', 'shooter_walking_backwards'],
  ['pack-shooter/walking to dying.fbx', 'shooter_walking_to_dying'], ['pack-shooter/walking.fbx', 'shooter_walking'],
];

/** The I6 slug rule, frozen: every root file must keep its slug (no batch 1 or I6 module renames). */
function i6Slug(file: string) {
  const base = file.replace(/\.fbx$/i, '');
  const notes = [...base.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]!.trim()).filter(Boolean);
  const slug = base.replace(/\([^)]*\)/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return notes.some((n) => /^mirror\b/i.test(n)) ? `${slug}_mirror` : slug;
}

type Clip = { file: string; slug: string; note: string | null; pack: string | null; title: string; fbx: string };

describe('mixamo dump driver: pack folders (I7)', () => {
  it('slugs the 161 real files uniquely to the Clip table slugs, root slugs unchanged', () => {
    expect(REAL_CLIPS).toHaveLength(161);
    const clips: Clip[] = listClips(DIR, { readdir: tree(REAL_CLIPS.map(([f]) => f)) });
    expect(clips.map((c) => [c.file, c.slug])).toEqual([...REAL_CLIPS].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
    expect(new Set(clips.map((c) => c.slug)).size).toBe(161);
    const root = clips.filter((c) => !c.pack);
    expect(root).toHaveLength(55);
    for (const c of root) expect(c.slug, c.file).toBe(i6Slug(c.file));
    const per = (p: string) => clips.filter((c) => c.pack === p).length;
    expect([per('pack-pistol'), per('pack-rifle'), per('pack-shooter'), per('pack-action-adventure')]).toEqual([20, 49, 15, 22]);
  });

  it('pack prefix, (n) twins and the Mirror rule', () => {
    expect(slugOf('pack-rifle/idle.fbx').slug).toBe('rifle_idle');
    expect(slugOf('idle.fbx', 'pack-rifle').slug).toBe('rifle_idle');
    // a slug that already starts with the prefix keeps it once
    expect(slugOf('pack-pistol/pistol idle.fbx').slug).toBe('pistol_idle');
    expect(slugOf('pack-shooter/rifle run.fbx').slug).toBe('shooter_rifle_run');
    expect(slugOf('pack-action-adventure/walking.fbx').slug).toBe('aa_walking');
    expect(slugOf('pack-action-adventure/idle (3).fbx')).toEqual({ slug: 'aa_idle_3', note: '3' });
    expect(slugOf('pack-pistol/pistol walk backward arc (2).fbx').slug).toBe('pistol_walk_backward_arc_2');
    expect(slugOf('pack-rifle/walk left (Mirror = right).fbx').slug).toBe('rifle_walk_left_mirror');
    // an unknown pack: its folder name less "pack-"
    expect(slugOf('pack-sword-and-shield/slash.fbx').slug).toBe('sword_and_shield_slash');
    // root files: a digits-only note now numbers the twin; other notes still drop
    expect(slugOf('Idle (2).fbx').slug).toBe('idle_2');
    expect(slugOf('Reloading (rifle).fbx')).toEqual({ slug: 'reloading', note: 'rifle' });
    expect(slugOf('Walking Left Turn (Mirror = right turn).fbx').slug).toBe('walking_left_turn_mirror');
  });

  it('lists the root and one level of pack-* folders only, with pack and title', () => {
    const files = ['Walking.fbx', 'pack-action-adventure/walking.fbx', 'pack-rifle/walk forward.fbx', 'pack-rifle/idle (2).fbx'];
    const extra = ['readme.txt', 'old/Walking.fbx', 'pack-rifle/notes.txt', 'pack-rifle/deeper/idle.fbx'];
    const clips: Clip[] = listClips(DIR, { readdir: tree(files, extra) });
    expect(clips.map((c) => c.file)).toEqual(['Walking.fbx', 'pack-action-adventure/walking.fbx', 'pack-rifle/idle (2).fbx', 'pack-rifle/walk forward.fbx']);
    expect(clips.map((c) => c.slug)).toEqual(['walking', 'aa_walking', 'rifle_idle_2', 'rifle_walk_forward']);
    expect(clips[0]).toMatchObject({ pack: null, title: 'Walking', fbx: path.join(DIR, 'Walking.fbx') });
    expect(clips[3]).toMatchObject({ pack: 'pack-rifle', title: 'Pro Rifle Pack: walk forward', fbx: path.join(DIR, 'pack-rifle/walk forward.fbx') });
    expect(clips[2]!.title).toBe('Pro Rifle Pack: idle');
    expect(PACK_NAME).toEqual({
      'pack-pistol': 'Pistol/Handgun Locomotion Pack',
      'pack-rifle': 'Pro Rifle Pack',
      'pack-shooter': 'Shooter Pack',
      'pack-action-adventure': 'Action Adventure Pack',
    });
  });

  it('stops on two pack files with the same slug, naming both', () => {
    const readdir = tree(['pack-rifle/idle (2).fbx', 'pack-rifle/idle 2.fbx']);
    expect(() => listClips(DIR, { readdir })).toThrow(/"pack-rifle\/idle 2\.fbx" and "pack-rifle\/idle \(2\)\.fbx" both slug to "rifle_idle_2"/);
  });

  it('dumps pack files flat by slug, the manifest records file, pack and title, and unchanged files are kept', async () => {
    const files = ['Standing Idle.fbx', 'pack-rifle/walk forward.fbx', 'pack-pistol/pistol strafe (2).fbx'];
    const fs = fakeFs(files);
    const first = await dumpAll({ dir: DIR, outDir: OUT, deps: fs.deps });
    expect(first.ran).toHaveLength(3);
    const job = fs.runs[0]!.jobs.find((j) => j.slug === 'rifle_walk_forward')!;
    expect(job).toMatchObject({ fbx: path.join(DIR, 'pack-rifle/walk forward.fbx'), out: path.join(OUT, 'raw', 'rifle_walk_forward.json') });
    const m = JSON.parse(fs.written.get(path.join(OUT, 'manifest.json'))!);
    expect(m.clips.map((c: { file: string; slug: string; pack: string | null; title: string }) => [c.file, c.slug, c.pack, c.title])).toEqual([
      ['Standing Idle.fbx', 'standing_idle', null, 'Standing Idle'],
      ['pack-pistol/pistol strafe (2).fbx', 'pistol_strafe_2', 'pack-pistol', 'Pistol/Handgun Locomotion Pack: pistol strafe'],
      ['pack-rifle/walk forward.fbx', 'rifle_walk_forward', 'pack-rifle', 'Pro Rifle Pack: walk forward'],
    ]);
    const second = await dumpAll({ dir: DIR, outDir: OUT, deps: fs.deps });
    expect(second.ran).toHaveLength(0);
    // a changed pack file alone is redumped; --only takes a pack slug
    fs.mtimes.set(path.join(DIR, 'pack-rifle/walk forward.fbx'), 300);
    const third = await dumpAll({ dir: DIR, outDir: OUT, deps: fs.deps });
    expect(third.ran.map((c: Clip) => c.slug)).toEqual(['rifle_walk_forward']);
    const only = await dumpAll({ dir: DIR, outDir: OUT, only: ['pistol_strafe_2'], force: true, deps: fs.deps });
    expect(only.ran.map((c: Clip) => c.slug)).toEqual(['pistol_strafe_2']);
  });
});

describe('mixamo duplicate check (I7, scripts/mocap/mixamoDup.mjs)', () => {
  type Tk = { frames: number; pos: Map<string, number[][]> };
  /** A synthetic take: two slots, the root walking +z at `speed` from `start`, a hand swinging by `swing` metres. */
  const take = (frames: number, start: number[], speed = 1, swing = 0.1): Tk => ({
    frames,
    pos: new Map([
      ['root', Array.from({ length: frames }, (_, i) => [start[0]!, 0.9, start[2]! + (speed * i) / 120])],
      ['lhand', Array.from({ length: frames }, (_, i) => [start[0]! - 0.3, 1, start[2]! + (speed * i) / 120 + swing * Math.sin(i / 10)])],
    ]),
  });

  it('pairs a pack clip with the root clip (else the first) of the same slug tail', () => {
    expect(slugTail('aa_walking', 'pack-action-adventure')).toBe('walking');
    expect(slugTail('pistol_idle', 'pack-pistol')).toBe('idle');
    expect(slugTail('walking', null)).toBe('walking');
    const clips = [
      { slug: 'walking', pack: null }, { slug: 'aa_walking', pack: 'pack-action-adventure' }, { slug: 'shooter_walking', pack: 'pack-shooter' },
      { slug: 'rifle_idle', pack: 'pack-rifle' }, { slug: 'aa_idle', pack: 'pack-action-adventure' }, { slug: 'standing_idle', pack: null },
    ];
    expect(dupPairs(clips)).toEqual([['walking', 'aa_walking'], ['walking', 'shooter_walking'], ['aa_idle', 'rifle_idle']]);
  });

  it('measures after aligning the start roots, and marks dupOf under 1 cm with the same length', () => {
    expect(poseDistance(take(121, [0, 0, 0]), take(121, [3, 0, -2]))).toBeCloseTo(0, 9);
    expect(poseDistance(take(121, [0, 0, 0]), take(121, [0, 0, 0], 1, 0.15))).toBeCloseTo(0.05, 3);
    const takes: Record<string, Tk> = {
      walking: take(121, [0, 0, 0]), aa_walking: take(121, [1, 0, 1], 1, 0.104), // 4 mm: the same motion
      running: take(121, [0, 0, 0], 3), aa_running: take(121, [0, 0, 0], 3, 0.2), // 10 cm: another take
      run_to_stop: take(121, [0, 0, 0]), aa_run_to_stop: take(141, [0, 0, 0]), // same pose path, 5 frames longer at 30 fps
    };
    const manifest = { clips: Object.keys(takes).map((slug) => ({ slug, pack: slug.startsWith('aa_') ? 'pack-action-adventure' : null, dupOf: 'stale' })) };
    const { pairs } = markDups(manifest, { load: (s: string) => takes[s]! });
    const row = (s: string) => manifest.clips.find((c) => c.slug === s) as { dupOf?: string; dupCm?: number };
    expect(row('aa_walking')).toMatchObject({ dupOf: 'walking', dupCm: 0.4 });
    expect(row('aa_running').dupOf).toBeUndefined();
    expect(row('aa_running').dupCm).toBeCloseTo(10, 0);
    expect(row('aa_run_to_stop').dupOf).toBeUndefined();
    expect(row('walking').dupOf, 'a stale mark on a root clip is cleared').toBeUndefined();
    expect(pairs.filter((p: { dup: boolean }) => p.dup)).toHaveLength(1);
  });
});
