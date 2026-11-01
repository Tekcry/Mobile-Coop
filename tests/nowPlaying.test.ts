/**
 * (tuner-clarity S1, PLAN 5) The Now playing source: the graph's `playing` (motion-capture, hand-keyed and graph-code
 * shares, the move, the chamber clip) with the switch on and off across the gaits, the sneak, the drawn walk, the aimed
 * strafe, a turn on the spot, a ladder and a chamber drive; `NOW_PLAYING` written only through `tuneEnd`; no allocation
 * per frame; the line's text and key in 10 % steps.
 * (mixamo-retarget M5) The capture's source in the line ("motion-capture (CMU) walk", "motion-capture (Mixamo) hang", from
 * `mocapSources.ts`), the traversal clip field (`playing.trav`, the graph's `TRAVERSE_CLIP`), both in the key, no
 * allocation with a traversal playing.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setMixamo } from '../src/anim/mixamo';
import { setMocapLocomotion } from '../src/anim/mocap';
import { AnimGraph, defaultInput, type AnimInput, type RigTargets, type TraverseKind } from '../src/anim/animGraph';
import { newChamberDrive } from '../src/anim/chamberDrive';
import { KEYED_WALK } from '../src/anim/clips/keyed/walk';
import { KEYED_CROUCH_WALK } from '../src/anim/clips/keyed/crouch_walk';
import { MOCAP_WALK } from '../src/anim/clips/mocap/walk';
import { CLIMB, HANG } from '../src/anim/clips/traverse';
import type { Clip } from '../src/anim/clip';
import { copyPlaying, moveSourceTag, MOVE_IDS, newGraphPlaying, NOW_PLAYING, nowPlayingGuardText, nowPlayingKey, nowPlayingText, type GraphPlaying } from '../src/anim/nowPlaying';
import { MOCAP_SOURCE_NAMES, mocapSource, mocapSourceTag, mocapSourceTagWord } from '../src/anim/mocapSources';
import { BODY_GROUPS, tuneEnd, type BodyGroup, type TuneRigIn } from '../src/anim/tune';
import { proportions } from '../src/player/proportions';
import { bytesPerCall, inputs, sink } from './helpers/allocPerCall';

// (one-game) the Mixamo captures are on at load by default now; this file pins the hand-made state: `?mixamo=0`
setMixamo(false);

const DT = 1 / 120;

interface Case {
  speed: number;
  crouch?: number;
  drawn?: boolean;
  raise?: number;
  localX?: number;
  yawRate?: number;
  traverse?: TraverseKind;
  /** Seconds standing still first (a turn on the spot). */
  still?: number;
  seconds?: number;
}

function input(c: Case): AnimInput {
  const i = defaultInput();
  i.keyedOk = true;
  i.ready = true;
  i.armed = !!c.drawn;
  i.keyedDrawn = !!c.drawn;
  i.raise = c.raise ?? 0;
  i.crouch = c.crouch ?? 0;
  i.localX = c.localX ?? 0;
  i.localZ = c.localX !== undefined && Math.abs(c.localX) > 0.99 ? 0 : 1;
  i.traverse = c.traverse ?? 'none';
  return i;
}

/** A fresh graph run through the case with the switch `on`; the graph after its last frame. */
function run(c: Case, on: boolean, g = new AnimGraph(proportions('average', 1.68))): AnimGraph {
  setMocapLocomotion(on);
  const i = input(c);
  const still = Math.round((c.still ?? 0) / DT);
  const n = Math.round((c.seconds ?? 3) / DT);
  for (let k = 0; k < still; k++) {
    i.speed = 0;
    i.yawRate = 0;
    g.update(DT, i);
  }
  for (let k = 0; k < n; k++) {
    i.speed = c.speed;
    i.yawRate = c.yawRate ?? 0;
    g.update(DT, i);
  }
  return g;
}

function expectShares(p: GraphPlaying, name: string): void {
  expect(p.mocap, `${name}: mocap`).toBeGreaterThanOrEqual(0);
  expect(p.keyed, `${name}: keyed`).toBeGreaterThanOrEqual(-1e-9);
  expect(p.code, `${name}: code`).toBeGreaterThanOrEqual(-1e-9);
  expect(p.mocap + p.keyed + p.code, `${name}: the shares sum to 1`).toBeCloseTo(1, 9);
}

const fmt = (p: GraphPlaying): string => `m ${p.mocap.toFixed(2)} k ${p.keyed.toFixed(2)} c ${p.code.toFixed(2)} move ${p.move}`;

afterEach(() => setMocapLocomotion(false));

describe('now playing: the graph shares and move', () => {
  const GAITS: [number, number, number][] = [
    // speed, move on, move off (the hand-keyed set has no sprint: its run is the top)
    [1.4, MOVE_IDS.walk, MOVE_IDS.walk],
    [3.0, MOVE_IDS.jog, MOVE_IDS.jog],
    [4.0, MOVE_IDS.run, MOVE_IDS.run],
    [6.0, MOVE_IDS.sprint, MOVE_IDS.run],
  ];
  it.each(GAITS)('holstered at %f m/s: all capture on, all hand-keyed off', (speed, moveOn, moveOff) => {
    const on = run({ speed }, true).playing;
    expectShares(on, `on ${speed}`);
    expect(on.mocap, `on ${speed}: ${fmt(on)}`).toBeGreaterThan(0.99);
    expect(on.move).toBe(moveOn);
    expect(on.clip).toBeNull();
    const off = run({ speed }, false).playing;
    expectShares(off, `off ${speed}`);
    expect(off.mocap).toBe(0);
    expect(off.keyed, `off ${speed}: ${fmt(off)}`).toBeGreaterThan(0.99);
    expect(off.move).toBe(moveOff);
  });

  it('a sneak at 0.8 m/s: the crouched capture on, hand-keyed off', () => {
    const on = run({ speed: 0.8, crouch: 1 }, true).playing;
    expectShares(on, 'sneak on');
    expect(on.mocap, fmt(on)).toBeGreaterThan(0.9);
    expect(on.move).toBe(MOVE_IDS.sneak);
    const off = run({ speed: 0.8, crouch: 1 }, false).playing;
    expectShares(off, 'sneak off');
    expect(off.mocap).toBe(0);
    expect(off.keyed, fmt(off)).toBeGreaterThan(0.5);
  });

  it('a drawn walk is hand-keyed with the switch on or off (the drawn legs never play the capture)', () => {
    for (const on of [true, false]) {
      const g = run({ speed: 1.4, drawn: true }, on);
      const p = g.playing;
      expectShares(p, `drawn ${on}`);
      expect(p.mocap, `drawn ${on}: ${fmt(p)}`).toBeLessThan(1e-9);
      expect(p.keyed, fmt(p)).toBeGreaterThan(0.5);
    }
  });

  it('the drawn call never writes the nearer clip: a drawn run reads the holstered call (the drawn legs at another pace)', () => {
    // holstered the speed set's nearer clip follows the pace; drawn at a run the holstered call still runs (its share 0)
    // at the same pace, so the move reads the holstered call's clip, which the drawn call (always the hand-keyed set: no
    // sprint) would have written as the run at 6 m/s
    const p = run({ speed: 6, drawn: true }, true).playing;
    expect(p.mocap).toBeLessThan(1e-9);
    expect(p.move, fmt(p)).toBe(MOVE_IDS.sprint);
  });

  it('an aimed strafe: the strafe capture on, hand-keyed off', () => {
    const on = run({ speed: 0.7, drawn: true, raise: 1, localX: 1 }, true).playing;
    expectShares(on, 'strafe on');
    expect(on.mocap, fmt(on)).toBeGreaterThan(0.9);
    expect(on.move).toBe(MOVE_IDS.strafe);
    const off = run({ speed: 0.7, drawn: true, raise: 1, localX: 1 }, false).playing;
    expectShares(off, 'strafe off');
    expect(off.mocap).toBe(0);
  });

  it('a turn on the spot: the turn capture on, none off', () => {
    const c: Case = { speed: 0, yawRate: 3, still: 1, seconds: 1 };
    const on = run(c, true).playing;
    expectShares(on, 'turn on');
    expect(on.mocap, fmt(on)).toBeGreaterThan(0.9);
    expect(on.move).toBe(MOVE_IDS.turnSpot);
    const off = run(c, false).playing;
    expectShares(off, 'turn off');
    expect(off.mocap).toBe(0);
  });

  it('a ladder is graph code with the switch on or off', () => {
    for (const on of [true, false]) {
      const p = run({ speed: 0.5, traverse: 'climb' }, on).playing;
      expectShares(p, `ladder ${on}`);
      expect(p.mocap).toBe(0);
      expect(p.code, fmt(p)).toBeGreaterThan(0.99);
    }
  });

  it('(M5) the traversal clip the graph plays is in `trav`; none on foot or under a chamber clip', () => {
    // the hand-made clips today (I2 swaps Mixamo captures into the same table: the field follows)
    expect(run({ speed: 0.5, traverse: 'climb' }, true).playing.trav).toBe(CLIMB);
    expect(run({ speed: 0, traverse: 'hang' }, true).playing.trav).toBe(HANG);
    const g = run({ speed: 0, traverse: 'climbUp' }, true);
    expect(g.playing.trav?.name, 'a team climb-up (no ledge grips) plays its own clip').toMatch(/climb/);
    expect(run({ speed: 1.4 }, true).playing.trav).toBeNull();
    // the field goes back to null when the traversal ends
    const h = run({ speed: 0.5, traverse: 'climb' }, true);
    const back = run({ speed: 1.4 }, true, h).playing;
    expect(back.trav).toBeNull();
    // a chamber drive with a clip: its clip, no traversal
    const d = newChamberDrive();
    d.clip = KEYED_WALK;
    h.drive = d;
    expect(run({ speed: 0.5, traverse: 'climb' }, true, h).playing.trav).toBeNull();
  });

  it('a chamber drive plays its clip: no capture, the clip named, with the switch on', () => {
    const g = new AnimGraph(proportions('average', 1.68));
    const d = newChamberDrive();
    d.clip = KEYED_WALK;
    d.pace = 1.4;
    d.cycle = 1.1;
    g.drive = d;
    const p = run({ speed: 1.4 }, true, g).playing;
    expectShares(p, 'chamber');
    expect(p.mocap).toBe(0);
    expect(p.keyed).toBe(1);
    expect(p.move).toBe(MOVE_IDS.clip);
    expect(p.clip).toBe(KEYED_WALK);
    // the drive taken off: the graph's own source again
    g.drive = null;
    const q = run({ speed: 1.4 }, true, g).playing;
    expect(q.clip).toBeNull();
    expect(q.mocap, fmt(q)).toBeGreaterThan(0.99);
  });

  it('playing is the same object every frame', () => {
    const g = new AnimGraph(proportions('average', 1.68));
    const p = g.playing;
    run({ speed: 1.4 }, true, g);
    expect(g.playing).toBe(p);
  });
});

/** A rig the tuning window takes (no grips shifted: tuneEnd only restores what tuneBegin moved). */
function fakeRig(graph?: AnimGraph): TuneRigIn {
  const t = () => ({ x: 0, y: 0, z: 0, w: 0 });
  return { heldWeapon: null, reachL: t(), reachR: t(), plantL: t(), plantR: t(), root: { rotation: { y: 0 } }, ...(graph ? { graph } : {}) };
}

describe('now playing: NOW_PLAYING', () => {
  it('is written only through tuneEnd (a graph update leaves it; tuneEnd copies the rig graph`s)', () => {
    const before = newGraphPlaying();
    copyPlaying(NOW_PLAYING, before);
    const g = run({ speed: 1.4 }, true);
    expect(NOW_PLAYING).toEqual(before);
    tuneEnd(fakeRig());
    expect(NOW_PLAYING, 'a rig without a graph copies nothing').toEqual(before);
    tuneEnd(fakeRig(g));
    expect(NOW_PLAYING).toEqual(g.playing);
    expect(NOW_PLAYING).not.toBe(g.playing);
    expect(NOW_PLAYING.mocap).toBeGreaterThan(0.99);
  });

  it('no source file but tune.ts writes it', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (p.endsWith('.ts')) files.push(p);
      }
    };
    walk('src');
    const writers: string[] = [];
    for (const f of files) {
      const s = readFileSync(f, 'utf8');
      if (!s.includes('NOW_PLAYING')) continue;
      // an assignment to a field, or the struct passed as a copy's destination
      if (/NOW_PLAYING\.\w+\s*=[^=]/.test(s) || /copyPlaying\([^)]*,\s*NOW_PLAYING\s*\)/.test(s)) writers.push(f.replace(/\\/g, '/'));
    }
    expect(writers).toEqual(['src/anim/tune.ts']);
  });
});

describe('now playing: no allocation', () => {
  it('the graph`s note, the copy and the key leave 0 bytes a frame (switch on with slots, strafe, chamber drive)', async () => {
    const N = 2000;
    const g = new AnimGraph(proportions('average', 1.68));
    const SPD = inputs(N, (k) => 1.2 + 2.5 * (0.5 + 0.5 * Math.sin(k * 0.004)));
    const YR = inputs(N, (k) => (k % 400 < 40 ? 3 : 0));
    const AF = inputs(N, (k) => (k % 300 < 20 ? -4 : 0.5));
    const i = input({ speed: 1.4 });
    setMocapLocomotion(true);
    const note = g as unknown as { notePlaying(o: RigTargets): void };
    const rig = fakeRig(g);
    // the whole frame: the graph, its note again, the tuning window's copy and the panel's key
    const frame = (n: number): void => {
      for (let k = 0; k < n; k++) {
        i.speed = SPD[k]!;
        i.yawRate = YR[k]!;
        i.accelFwd = AF[k]!;
        g.update(DT, i);
      }
    };
    const noteOnly = (n: number): void => {
      for (let k = 0; k < n; k++) {
        note.notePlaying(g.out);
        tuneEnd(rig);
        sink[0] = nowPlayingKey(NOW_PLAYING, k & 15, (k & 1) === 0);
      }
    };
    frame(N);
    const live = await bytesPerCall(noteOnly, 0);
    // a chamber drive (the clip's name hashed into the key)
    const d = newChamberDrive();
    d.clip = KEYED_CROUCH_WALK;
    g.drive = d;
    frame(N);
    const drive = await bytesPerCall(noteOnly, 0);
    g.drive = null;
    // the aimed strafe
    const s = input({ speed: 0.7, drawn: true, raise: 1, localX: 1 });
    s.speed = 0.7;
    for (let k = 0; k < 600; k++) g.update(DT, s);
    expect(g.playing.move, `${fmt(g.playing)} ks ${g.out.keyStrafe} kw ${g.out.keyW}`).toBe(MOVE_IDS.strafe);
    const strafe = await bytesPerCall(noteOnly, 0);
    // (M5) a ladder: the traversal clip in the note, the copy and the key (its name hashed, its source looked up)
    const c = input({ speed: 0.5, traverse: 'climb' });
    c.speed = 0.5;
    for (let k = 0; k < 120; k++) g.update(DT, c);
    expect(g.playing.trav).toBe(CLIMB);
    const climb = await bytesPerCall(noteOnly, 0);
    console.info(`now playing bytes per frame: live ${live.toFixed(1)}, drive ${drive.toFixed(1)}, strafe ${strafe.toFixed(1)}, climb ${climb.toFixed(1)}`);
    expect(live).toBe(0);
    expect(drive).toBe(0);
    expect(strafe).toBe(0);
    expect(climb).toBe(0);
  }, 120_000);
});

describe('now playing: the line and its key', () => {
  const np = (mocap: number, move: number, clip: GraphPlaying['clip'] = null, trav: Clip | null = null): GraphPlaying => ({ mocap, keyed: 1 - mocap, code: 0, move, clip, trav });
  const IX = (b: BodyGroup): number => BODY_GROUPS.indexOf(b);
  // the switch on: the mocap set's sources noted (the line names a capture only with the switch on)
  beforeEach(() => setMocapLocomotion(true));
  /** A traversal capture as I2 will play one: a channel clip whose name has a source row (a CMU row's name stands in for
   *  the Mixamo rows M4 adds; the real Mixamo rows are checked below once they exist). */
  const capTrav = { ...HANG, name: 'mocap_walk' } as Clip;

  it('names the source and the move in plain words', () => {
    expect(nowPlayingText(np(1, MOVE_IDS.walk), 'walk', true)).toBe('Now playing: motion-capture (CMU) walk');
    expect(nowPlayingText(np(1, MOVE_IDS.sneak), 'sneak', true)).toBe('Now playing: motion-capture (CMU) sneak');
    expect(nowPlayingText(np(1, MOVE_IDS.strafe), 'aim', true)).toBe('Now playing: motion-capture (CMU) aimed strafe');
    expect(nowPlayingText(np(0, MOVE_IDS.walk), 'crouchWalk', true)).toBe('Now playing: hand-made crouch walk');
    expect(nowPlayingText(np(0.7, MOVE_IDS.walk), 'walk', true)).toBe('Now playing: mix, 70% motion-capture (CMU) walk, 30% hand-made');
    expect(nowPlayingText(np(0, MOVE_IDS.walk), 'walk', false)).toBe('Now playing: hand-made walk (motion capture off)');
    expect(nowPlayingText(np(0, MOVE_IDS.clip, KEYED_WALK), 'walk', true)).toBe('Now playing: hand-made walk clip');
    expect(nowPlayingText(np(0, MOVE_IDS.clip, KEYED_CROUCH_WALK), 'walk', false)).toBe('Now playing: hand-made crouch walk clip');
    expect(nowPlayingText(np(0, MOVE_IDS.clip, MOCAP_WALK), 'walk', true)).toBe('Now playing: motion-capture (CMU) walk clip');
    expect(nowPlayingText(np(0, MOVE_IDS.run), '', true)).toBe('Now playing: hand-made run');
    expect(nowPlayingGuardText('walk')).toBe('Now playing (guard): hand-made walk');
  });

  it('(M5) every captured move names its source; a traversal capture its source and the state', () => {
    for (const m of [MOVE_IDS.walk, MOVE_IDS.jog, MOVE_IDS.run, MOVE_IDS.sprint, MOVE_IDS.start, MOVE_IDS.stop, MOVE_IDS.turnSpot, MOVE_IDS.turnMove, MOVE_IDS.sneak, MOVE_IDS.strafe]) {
      expect(moveSourceTag(m), `move ${m}`).toBe(1);
      expect(nowPlayingText(np(1, m), 'walk', true), `move ${m}`).toMatch(/^Now playing: motion-capture \(CMU\) [a-z ]+$/);
    }
    expect(moveSourceTag(MOVE_IDS.clip)).toBe(0);
    // a hand-made traversal clip: the hand-made line as before
    expect(nowPlayingText(np(0, MOVE_IDS.walk, null, HANG), 'ledge', true)).toBe('Now playing: hand-made ledge hang');
    expect(nowPlayingText(np(0, MOVE_IDS.walk, null, CLIMB), 'ladder', false)).toBe('Now playing: hand-made ladder climb (motion capture off)');
    // a traversal capture: its source, the state's word (else the clip's)
    expect(nowPlayingText(np(0, MOVE_IDS.walk, null, capTrav), 'hang', true)).toBe('Now playing: motion-capture (CMU) hang');
    expect(nowPlayingText(np(0, MOVE_IDS.walk, null, capTrav), '', true)).toBe('Now playing: motion-capture (CMU) walk');
    // the source words
    expect([mocapSourceTagWord(0), mocapSourceTagWord(1), mocapSourceTagWord(2)]).toEqual(['', 'CMU', 'Mixamo']);
    // every Mixamo row (none until M3 / M4 land) reads "(Mixamo)" as a traversal or a chamber clip
    for (const name of MOCAP_SOURCE_NAMES) {
      const r = mocapSource(name)!;
      const w = r.source === 'mixamo' ? 'Mixamo' : 'CMU';
      expect(mocapSourceTag(name), name).toBe(r.source === 'mixamo' ? 2 : 1);
      const fake = { ...HANG, name } as Clip;
      expect(nowPlayingText(np(0, MOVE_IDS.walk, null, fake), 'ledge', true), name).toBe(`Now playing: motion-capture (${w}) ledge hang`);
    }
  });

  it('every body state has a word (no raw ids in the line)', () => {
    for (const b of BODY_GROUPS) {
      const t = nowPlayingText(np(0, MOVE_IDS.walk), b, true);
      expect(t, b).toMatch(/^Now playing: hand-made [a-z -]+$/);
    }
  });

  it('rounds the capture share to 10 % steps in the text and the key', () => {
    expect(nowPlayingText(np(0.96, MOVE_IDS.jog), 'jog', true)).toBe('Now playing: motion-capture (CMU) jog');
    expect(nowPlayingText(np(0.94, MOVE_IDS.jog), 'jog', true)).toBe('Now playing: mix, 90% motion-capture (CMU) jog, 10% hand-made');
    expect(nowPlayingText(np(0.04, MOVE_IDS.jog), 'jog', true)).toBe('Now playing: hand-made jog');
    expect(nowPlayingText(np(0.06, MOVE_IDS.jog), 'jog', true)).toBe('Now playing: mix, 10% motion-capture (CMU) jog, 90% hand-made');
    const w = IX('walk');
    expect(nowPlayingKey(np(0.71, 0), w, true)).toBe(nowPlayingKey(np(0.69, 0), w, true));
    expect(nowPlayingKey(np(0.64, 0), w, true)).not.toBe(nowPlayingKey(np(0.66, 0), w, true));
  });

  it('one key, one text: the key changes whenever the text would, across shares, moves, states, the switch and clips', () => {
    const texts = new Map<number, string>();
    const clips = [null, KEYED_WALK, KEYED_CROUCH_WALK, MOCAP_WALK];
    // (M5) the traversal clip: none, hand-made ones, a capture
    const travs: (Clip | null)[] = [null, HANG, CLIMB, capTrav];
    let n = 0;
    for (let s = 0; s <= 20; s++) {
      for (const move of Object.values(MOVE_IDS)) {
        for (const b of ['', ...BODY_GROUPS] as const) {
          for (const on of [true, false]) {
            for (const c of clips) {
              for (const tr of travs) {
                if (tr !== null && (c !== null || s % 5 !== 0)) continue; // (the traversal on a sample: the count stays small)
                const p = np(s / 20, move, c, tr);
                const key = nowPlayingKey(p, b === '' ? -1 : IX(b), on);
                expect(Number.isInteger(key) && key >= 0 && key < 2 ** 28, `key ${key} a small integer`).toBe(true);
                const t = nowPlayingText(p, b, on);
                const seen = texts.get(key);
                if (seen !== undefined) expect(t, `key ${key}`).toBe(seen);
                else texts.set(key, t);
                n++;
              }
            }
          }
        }
      }
    }
    expect(n).toBeGreaterThan(1000);
    // distinct inputs give distinct keys where the text differs: the shares, the switch, the clip
    expect(nowPlayingKey(np(0, 0), IX('walk'), true)).not.toBe(nowPlayingKey(np(0, 0), IX('walk'), false));
    expect(nowPlayingKey(np(0, MOVE_IDS.clip, KEYED_WALK), 0, true)).not.toBe(nowPlayingKey(np(0, MOVE_IDS.clip, KEYED_CROUCH_WALK), 0, true));
    expect(nowPlayingKey(np(1, MOVE_IDS.walk), 1, true)).not.toBe(nowPlayingKey(np(1, MOVE_IDS.jog), 1, true));
    // (M5) the traversal clip and its source: a capture's key differs from the hand-made clip's
    expect(nowPlayingKey(np(0, MOVE_IDS.walk, null, HANG), IX('hang'), true)).not.toBe(nowPlayingKey(np(0, MOVE_IDS.walk, null, capTrav), IX('hang'), true));
    expect(nowPlayingKey(np(0, MOVE_IDS.walk, null, HANG), IX('hang'), true)).not.toBe(nowPlayingKey(np(0, MOVE_IDS.walk), IX('hang'), true));
  });
});
