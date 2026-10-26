// mixamo-retarget M1: the dump driver (scripts/mocap/mixamo.mjs) - slugs of the 21 downloaded files (PLAN "Clip map"),
// the skip rule, the manifest and the Blender call. Blender itself is mocked.
import { describe, expect, it } from 'vitest';
import path from 'node:path';
// @ts-expect-error - plain ESM script without types
import { blenderArgs, dumpAll, listClips, planDumps, slugOf } from '../scripts/mocap/mixamo.mjs';

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
    readdir: () => [...files, 'notes.txt'],
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
    expect(() => listClips(DIR, { readdir: () => ['Standing Idle.fbx', 'Standing  Idle (2).fbx'] })).toThrow(/both slug/);
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
