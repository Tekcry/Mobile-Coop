/**
 * (mixamo-retarget I2) The Mixamo traversal captures on Wren (`src/anim/mixamo.ts`, the graph's `mixamoTrav`):
 * - off (the flag's default, no Chamber pick): every slot hand-made and the graph bit-identical to a graph that never saw
 *   the switch, after the flag or a Chamber pick was on and is cleared again; a guard's graph identical with the flag on;
 * - on: Wren's graph picks the capture of each slot `MIXAMO_ON` lets play (hanging idle, the shimmy by the pendulum's
 *   side, ladder, vent crawl, the lip climb-up to the crouch then the free-hang stand-up end, the ladder top-out; one
 *   kept off plays its hand-made clip); a team or drainpipe climb-up, a pipe hang on the move and a guard keep the
 *   hand-made clips; `playing.trav` names the capture;
 * - headless on Wren's rig driven as attachController drives it (AttachGrips on a lip / ladder): the palms stay on their
 *   grips (rig.gripError) and the soles on their plants as well as on the hand-made clips (bible 5.12.2 #2, within 1 cm);
 * - the Chamber's pick (`trav:<loop>/<slug>`) plays that capture with the flag off, and clears.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { MIXAMO, MIXAMO_ON, MIXAMO_TRAV, mixamoChamberEntry, setMixamo, setMixamoChamber, WREN_TRAV } from '../src/anim/mixamo';
import { AnimGraph, defaultInput, type AnimInput, type TraverseKind } from '../src/anim/animGraph';
import { CLIMB, CLIMB_UP, CLIMB_UP_CROUCH_K, CLIMB_UP_TEAM, CRAWL, HANG } from '../src/anim/clips/traverse';
import { proportions } from '../src/player/proportions';
import { flags, onOffFlag } from '../src/core/flags';
import { CHAMBER_ENTRIES } from '../src/anim/chamber';
import type { RigPose } from '../src/player/characterRig';
import type { Ladder, Ledge } from '../src/world/anchors';
import type { Pose } from '../src/anim/pose';
import type { Clip } from '../src/anim/clip';

/** MIXAMO_ON as shipped (a test that lets every capture on puts it back). */
const ON0 = { ...MIXAMO_ON };
/** Every capture let on (the graph's capture paths measured whatever MIXAMO_ON ships; put back after each test). */
const allOn = (): void => {
  for (const slug of Object.keys(MIXAMO_ON)) MIXAMO_ON[slug] = true;
};

afterEach(() => {
  Object.assign(MIXAMO_ON, ON0);
  setMixamo(false);
  setMixamoChamber('');
});

const DT = 1 / 60;
const clip = (slug: string) => MIXAMO_TRAV[slug]!.clip;

/** One graph frame's input: the traversal kind, its clock, the pace along the anchor. */
type Frame = { trav: TraverseKind; t: number; speed?: number; ledge?: boolean };
/** A hang (sway), a shimmy right then left, a pipe hang moving, the lip climb-up, a ladder and its top-out, the vent crawl. */
function sequence(): Frame[] {
  const f: Frame[] = [];
  for (let n = 0; n < 60; n++) f.push({ trav: 'hang', t: 0.02 * Math.sin(n * 0.1) + 0.001 });
  for (let n = 0; n < 60; n++) f.push({ trav: 'hang', t: -0.12, speed: 0.5 });
  for (let n = 0; n < 60; n++) f.push({ trav: 'hang', t: 0.12, speed: 0.5 });
  for (let n = 0; n <= 78; n++) f.push({ trav: 'climbUp', t: n / 78, ledge: true });
  for (let n = 0; n < 30; n++) f.push({ trav: 'none', t: 0 });
  for (let n = 0; n < 60; n++) f.push({ trav: 'hang', t: 0, speed: 0.6 });
  for (let n = 0; n < 30; n++) f.push({ trav: 'none', t: 0 });
  for (let n = 0; n < 60; n++) f.push({ trav: 'climb', t: (n * 0.03) % 1 });
  for (let n = 0; n <= 51; n++) f.push({ trav: 'climbUp', t: (n / 51) * CLIMB_UP_CROUCH_K, ledge: true });
  for (let n = 0; n < 60; n++) f.push({ trav: 'crawl', t: (n * 0.02) % 1 });
  for (let n = 0; n <= 40; n++) f.push({ trav: 'climbUp', t: n / 40, ledge: false });
  return f;
}

/** Run the sequence on a fresh graph (Wren or a guard): every frame's pose and its traversal clip's name. */
function runGraph(wren: boolean): { pose: number[]; trav: string[] } {
  return seeded(() => runGraphSeeded(wren));
}

/** `f` with the graph's own randomness (idle fidgets) seeded, so two runs compare bit for bit. */
function seeded<T>(f: () => T): T {
  const random = Math.random;
  let seed = 4242;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    return f();
  } finally {
    Math.random = random;
  }
}

function runGraphSeeded(wren: boolean): { pose: number[]; trav: string[] } {
  const g = new AnimGraph(proportions('average', 1.68));
  g.wrenReady = wren;
  const i: AnimInput = defaultInput();
  i.grounded = false;
  const pose: number[] = [];
  const trav: string[] = [];
  for (const fr of sequence()) {
    i.traverse = fr.trav;
    i.traverseT = fr.t;
    i.speed = fr.speed ?? 0;
    i.ledgeClimb = fr.ledge ?? false;
    i.grounded = fr.trav === 'none';
    g.update(DT, i);
    for (let c = 0; c < g.pose.length; c++) pose.push(g.pose[c]!);
    trav.push(g.playing.trav?.name ?? '');
  }
  return { pose, trav };
}

function differ(a: number[], b: number[]): number {
  let n = 0;
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k] && !(Number.isNaN(a[k]) && Number.isNaN(b[k]))) n++;
  return n + Math.abs(a.length - b.length);
}

/** The sequence's frame ranges by name (indices into `sequence()`). */
const AT = { idle: 59, shimR: 119, shimL: 179, climbCrouch: 180 + 58, climbStand: 180 + 74, pipe: 180 + 79 + 30 + 59, ladder: 180 + 79 + 30 + 60 + 30 + 59, topOut: 180 + 79 + 30 + 60 + 30 + 60 + 40, crawl: 180 + 79 + 30 + 60 + 30 + 60 + 52 + 59, team: 180 + 79 + 30 + 60 + 30 + 60 + 52 + 60 + 30 };

describe('mixamo I2: the switch and the resolved Wren table', () => {
  it('the flag reads ?mixamo=0/1 (absent: null = on by default, one-game) and the table starts filled', () => {
    expect(onOffFlag('1')).toBe(true);
    expect(onOffFlag('0')).toBe(false);
    expect(flags.mixamo).toBeNull();
    expect(MIXAMO.on).toBe(true);
    expect(WREN_TRAV.any).toBe(true);
    // (and off: setMixamo(false), what ?mixamo=0 does, leaves the table hand-made)
    setMixamo(false);
    expect(MIXAMO.on).toBe(false);
    expect(WREN_TRAV.any).toBe(false);
    for (const [k, v] of Object.entries(WREN_TRAV)) if (k !== 'any' && k !== 'hold' && k !== 'stand') expect(v, k).toBeNull();
  });

  it('on: every capture MIXAMO_ON lets play fills its slot; one switched off stays hand-made', () => {
    setMixamo(true);
    expect(WREN_TRAV.any).toBe(true);
    for (const [slug, r] of Object.entries(MIXAMO_TRAV)) expect(WREN_TRAV[r.slot], slug).toBe(MIXAMO_ON[slug] ? r.clip : null);
    // (the afterEach puts MIXAMO_ON back)
    expect(WREN_TRAV.hangIdle).not.toBeNull();
    MIXAMO_ON.hanging_idle = false;
    setMixamo(true);
    expect(WREN_TRAV.hangIdle).toBeNull();
  });

  it('the Chamber pick: a capture loop plays its capture with the flag off, any other entry clears it', () => {
    const ids = CHAMBER_ENTRIES.filter((e) => e.kind === 'trav' && /^trav:[^/]+\//.test(e.id)).map((e) => e.id);
    expect(ids.length).toBe(Object.keys(MIXAMO_TRAV).length);
    for (const id of ids) {
      const slug = id.split('/')[1]!;
      mixamoChamberEntry(id);
      expect(MIXAMO.chamber, id).toBe(slug);
      const r = MIXAMO_TRAV[slug]!;
      expect(WREN_TRAV[r.slot], id).toBe(r.clip);
      // only its slot (the free-hang climb is a whole climb-up: its crouch part too)
      const filled = Object.entries(WREN_TRAV).filter(([k, v]) => k !== 'any' && k !== 'hold' && k !== 'stand' && v !== null).map(([k]) => k).sort();
      expect(filled, id).toEqual(slug === 'freehang_climb' ? ['climbUpCrouch', 'climbUpStand'] : [r.slot]);
    }
    mixamoChamberEntry('trav:ledge');
    expect(MIXAMO.chamber).toBe('');
    expect(WREN_TRAV.any).toBe(false);
    mixamoChamberEntry('trav:ledge/hanging_idle');
    mixamoChamberEntry('');
    expect(WREN_TRAV.any).toBe(false);
  });

  it('the capture loops say what they play (no "until I2" text) and each shimmy goes its own way', () => {
    for (const e of CHAMBER_ENTRIES.filter((x) => x.kind === 'trav' && x.id.includes('/'))) {
      expect(e.trav!.tune, e.id).toMatch(/this capture plays/);
      expect(e.trav!.tune, e.id).toMatch(/\?mixamo=1/);
      // one MIXAMO_ON keeps out of matches says so
      expect(/stays hand-made/.test(e.trav!.tune), e.id).toBe(!MIXAMO_ON[e.id.split('/')[1]!]);
    }
    const sideOf = (id: string): number => CHAMBER_ENTRIES.find((e) => e.id === id)!.trav!.steps.reduce((s, st) => s + (st.x ?? 0) * st.dur, 0);
    expect(sideOf('trav:ledge/braced_hang_shimmy_left')).toBeLessThan(0);
    expect(sideOf('trav:ledge/braced_hang_shimmy_right')).toBeGreaterThan(0);
  });
});

describe('mixamo I2: the graph', () => {
  it('off: bit-identical to a graph that never saw the switch, after the flag and a Chamber pick were on and cleared', () => {
    const base = runGraph(true);
    expect(new Set(base.trav)).toEqual(new Set(['hang', 'climbUp', '', 'climb', 'crawl', CLIMB_UP_TEAM.name]));
    setMixamo(true);
    const on = runGraph(true);
    expect(differ(base.pose, on.pose)).toBeGreaterThan(0);
    setMixamo(false);
    expect(differ(base.pose, runGraph(true).pose)).toBe(0);
    setMixamoChamber('freehang_climb');
    expect(differ(base.pose, runGraph(true).pose)).toBeGreaterThan(0);
    setMixamoChamber('');
    expect(differ(base.pose, runGraph(true).pose)).toBe(0);
  });

  it('a guard graph (not wrenReady) is bit-identical with the flag on: the hand-made table', () => {
    const off = runGraph(false);
    setMixamo(true);
    const on = runGraph(false);
    expect(differ(off.pose, on.pose)).toBe(0);
    expect(on.trav).toEqual(off.trav);
  });

  it('on: Wren picks the capture of each slot MIXAMO_ON lets play; team climb-up and a moving pipe hang stay hand-made', () => {
    // a capture MIXAMO_ON keeps off plays its hand-made clip (mixamo.ts: the reach / plant measures below)
    const name = (slug: string, hand: string): string => (MIXAMO_ON[slug] ? clip(slug).name : hand);
    const want = (on: boolean): void => {
      setMixamo(true);
      const r = runGraph(true);
      expect(r.trav[AT.idle]).toBe(name('hanging_idle', HANG.name));
      // the hips trail the hands: a swing to the left (traverseT < 0) is a shimmy to the right
      expect(r.trav[AT.shimR]).toBe(name('braced_hang_shimmy_right', HANG.name));
      expect(r.trav[AT.shimL]).toBe(name('braced_hang_shimmy_left', HANG.name));
      // (I2b) k 0.744: the braced capture's hold has it in (MIXAMO_HOLD: from k 0.58), the stand-up not yet past half
      expect(r.trav[AT.climbCrouch]).toBe(name('braced_hang_to_crouch', CLIMB_UP.name));
      expect(r.trav[AT.climbStand]).toBe(name('freehang_climb', CLIMB_UP.name));
      expect(r.trav[AT.pipe]).toBe(HANG.name);
      expect(r.trav[AT.ladder]).toBe(name('climbing_ladder', CLIMB.name));
      expect(r.trav[AT.topOut]).toBe(name('climbing_ladder_to_standing', CLIMB_UP.name));
      expect(r.trav[AT.crawl]).toBe(name('crawling_hands_and_knees', CRAWL.name));
      expect(r.trav[AT.team]).toBe(CLIMB_UP_TEAM.name);
      if (on) for (const slug of Object.keys(MIXAMO_TRAV)) expect(MIXAMO_ON[slug], slug).toBe(true);
    };
    want(false);
    // with every capture let on, each slot plays its capture
    allOn();
    want(true);
    // the hand-made clips are the ones replaced
    expect([HANG, CLIMB, CRAWL, CLIMB_UP].map((c) => c.name)).toEqual(['hang', 'climb', 'crawl', 'climbUp']);
  });

  it('no pop where the stand-up end fades in (k past the crouch) or the shimmy turns round', () => {
    allOn();
    setMixamo(true);
    const r = runGraph(true);
    const N = r.pose.length / r.trav.length;
    const step = (f: number): number => {
      let m = 0;
      for (let c = 0; c < N; c++) m = Math.max(m, Math.abs(r.pose[f * N + c]! - r.pose[(f - 1) * N + c]!));
      return m;
    };
    // the fade (k 0.654 - 0.734: frames 51 - 58 of the climb-up) against the climb-up's own frames outside it
    let climb = 0;
    let fade = 0;
    for (let f = 182; f < 180 + 78; f++) {
      if (f >= 180 + 50 && f <= 180 + 60) fade = Math.max(fade, step(f));
      else climb = Math.max(climb, step(f));
    }
    // the shimmy turning round (right to left at frame 120) against the steady shimmy's frames
    let steady = 0;
    for (let f = 80; f < 120; f++) steady = Math.max(steady, step(f));
    let turn = 0;
    for (let f = 120; f < 150; f++) turn = Math.max(turn, step(f));
    console.info(`(mixamo I2) largest channel change a frame: climb-up ${climb.toFixed(4)}, stand-up fade ${fade.toFixed(4)}; shimmy ${steady.toFixed(4)}, turning round ${turn.toFixed(4)}`);
    expect(fade).toBeLessThanOrEqual(climb * 1.25);
    expect(turn).toBeLessThanOrEqual(Math.max(steady * 1.5, 0.05));
  });

  it('a capture giving way to a hand-made clip (or the reverse) is inertialized: no channel jump at the switch frame', () => {
    // from the still hanging idle (a capture) to the hand-made lip climb-up; from the hand-made ladder to the top-out capture
    const air: Frame[] = [];
    for (let n = 0; n < 20; n++) air.push({ trav: 'none', t: 0 });
    const hang = [...air];
    for (let n = 0; n < 90; n++) hang.push({ trav: 'hang', t: 0.02 * Math.sin(n * 0.1) + 0.001 });
    const hangAt = hang.length;
    for (let n = 0; n <= 20; n++) hang.push({ trav: 'climbUp', t: n / 78, ledge: true });
    const lad = [...air];
    for (let n = 0; n < 90; n++) lad.push({ trav: 'climb', t: (n * 0.03) % 1 });
    const ladAt = lad.length;
    for (let n = 0; n <= 20; n++) lad.push({ trav: 'climbUp', t: (n / 51) * CLIMB_UP_CROUCH_K, ledge: true });
    const switchStep = (seq: Frame[], b: number): number => seeded(() => {
      const g = new AnimGraph(proportions('average', 1.68));
      g.wrenReady = true;
      const i = defaultInput();
      const prev = new Float64Array(g.pose.length);
      let m = 0;
      for (let f = 0; f <= b; f++) {
        const fr = seq[f]!;
        i.traverse = fr.trav;
        i.traverseT = fr.t;
        i.speed = fr.speed ?? 0;
        i.ledgeClimb = fr.ledge ?? false;
        i.grounded = fr.trav === 'none';
        g.update(DT, i);
        if (f === b) for (let c = 0; c < g.pose.length; c++) m = Math.max(m, Math.abs(g.pose[c]! - prev[c]!));
        prev.set(g.pose);
      }
      return m;
    });
    const handHang = switchStep(hang, hangAt);
    const handLad = switchStep(lad, ladAt);
    // (I2b) the braced capture's held climb-up (hand-made under it to k 0.58): the hanging idle capture to it is a capture to
    // capture switch across a move change, inertialized too
    setMixamo(true);
    expect(WREN_TRAV.climbUpCrouch).not.toBeNull();
    const heldHang = switchStep(hang, hangAt);
    // (I2b) the hand-made ladder to the top-out capture (the ladder capture to it: the anchor test's first exit frame), and
    // the hanging idle to the hand-made climb-up (the braced capture off)
    MIXAMO_ON.climbing_ladder = false;
    MIXAMO_ON.braced_hang_to_crouch = false;
    setMixamo(true);
    expect(WREN_TRAV.hangIdle).not.toBeNull();
    expect(WREN_TRAV.climbUpCrouch).toBeNull();
    expect(WREN_TRAV.ladder).toBeNull();
    expect(WREN_TRAV.ladderTop).not.toBeNull();
    const capHang = switchStep(hang, hangAt);
    const capLad = switchStep(lad, ladAt);
    console.info(`(mixamo I2) largest channel change on the switch frame: hanging idle -> climb-up ${capHang.toFixed(4)} (held braced ${heldHang.toFixed(4)}, hand-made ${handHang.toFixed(4)}), ladder -> top-out capture ${capLad.toFixed(4)} (hand-made ${handLad.toFixed(4)})`);
    // (before the fix: 0.73 rad hanging idle -> climb-up, 0.92 ladder -> top-out; the hand-made switches 0.40 and 0.25)
    expect(capHang).toBeLessThanOrEqual(handHang * 1.25);
    expect(heldHang).toBeLessThanOrEqual(handHang * 1.25);
    expect(capLad).toBeLessThanOrEqual(handLad * 1.25);
  });

  it('no allocation per frame on the capture path (as the hand-made path)', async () => {
    const { bytesPerCall, HEAP_NUMBER } = await import('./helpers/allocPerCall');
    allOn();
    setMixamo(true);
    const g = new AnimGraph(proportions('average', 1.68));
    g.wrenReady = true;
    const i = defaultInput();
    i.grounded = false;
    for (let k = 0; k < 10; k++) g.update(DT, i);
    // The capture path's own code, read directly (allocPerCall's gc + new-space method): every line the capture path runs
    // and the hand-made path does not is in `mixamoTrav` (with `mxOver`, `keepSave`, `keepApply` inlined into it), plus
    // one typed-array store in update. The whole graph's frame is not compared: its own 0.3-2.4 KB a frame (not this
    // slice's: AnimGraph's fields are tagged, every double stored boxes 16 B) moved by up to 1.4 KB between rounds of one
    // run as its tiers changed (hang moving 1664 then 616 on the capture path, 2368 then 271 hand-made, on one PC), so a
    // capture vs hand-made difference of the whole frame was noise either way (CI +128 B, a PC -432 B). Read this way the
    // kept channels' `evalCurve` calls (not inlined once mixamoTrav's budget ran out) boxed their time and value: 32-160 B a
    // frame, fixed with `evalCurveIO` (no double crosses a call). Limit: under one boxed double.
    type Trav = { mixamoTrav(src: Pose, i: AnimInput, tc: Clip): boolean; travFrom: TraverseKind; src: Pose };
    const G = g as unknown as Trav;
    const STATES = [
      { name: 'hang moving', trav: 'hang', t: -0.1, speed: 0.5, ledge: false, from: 'hang', tc: HANG },
      { name: 'hang still', trav: 'hang', t: 0.001, speed: 0, ledge: false, from: 'hang', tc: HANG },
      { name: 'climb-up', trav: 'climbUp', t: 0.7, speed: 0, ledge: true, from: 'hang', tc: CLIMB_UP },
      { name: 'top-out', trav: 'climbUp', t: 0.7, speed: 0, ledge: true, from: 'climb', tc: CLIMB_UP },
      { name: 'ladder', trav: 'climb', t: 0.3, speed: 0, ledge: false, from: 'climb', tc: CLIMB },
    ] as const;
    const rows: string[] = [];
    const res: [string, number][] = [];
    for (const s of STATES) {
      i.traverse = s.trav;
      i.traverseT = s.t;
      i.speed = s.speed;
      i.ledgeClimb = s.ledge;
      G.travFrom = s.from;
      const tc = s.tc;
      const src = G.src;
      const b = await bytesPerCall(
        (n) => {
          for (let k = 0; k < n; k++) G.mixamoTrav(src, i, tc);
        },
        0,
        { n: 1000, warm: 20_000 },
      );
      res.push([s.name, b]);
      rows.push(`${s.name} ${b.toFixed(1)}`);
    }
    setMixamo(false);
    console.info(`(mixamo I2) capture path (mixamoTrav) bytes a frame: ${rows.join('; ')}`);
    for (const [name, b] of res) expect(b, name).toBeLessThanOrEqual(HEAP_NUMBER / 2);
  }, 600_000);
});

/** Per state: the palms' worst miss of their grips (rig.gripError, 3 frames after a grip lands, as e2e-traverse) and the
 *  soles' worst miss of their plants (the ankle's distance to the plant target past its first planted offset), in m; on a
 *  climb-up or top-out `sw`: the largest joint step on its first frame (the switch from the hang's or ladder's clip). */
type Reach = { hand: number; foot: number; frames: number; at?: string; sw: number; swAt?: string };
type State = 'hang' | 'shimmyR' | 'shimmyL' | 'ladder' | 'climbUp' | 'topOut';

async function reach(state: State): Promise<Reach> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { operatorRig, PLAYER_HEIGHT } = await import('../src/operators/runtime/playerFigure');
  const { AttachGrips } = await import('../src/player/attachGrips');
  const { ATTACH, attachPose, GAMEPLAY_HEIGHT } = await import('../src/player/attach');
  const { CLIMB_UP_PATH, CLIMB_UP_TIME, CLIMB_UP_STAND, LADDER_TOPOUT_TIME } = await import('../src/player/attachController');
  const { attachGripWeight, climbUpFootWeight } = await import('../src/player/moveState');
  const { makeLedge, TraversalAnchors, HANG: HANG_A } = await import('../src/world/anchors');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const anchors = new TraversalAnchors();
  const lip = anchors.add<Ledge>(makeLedge(0, 0, 8, 0, 2.4));
  const ladder = anchors.add<Ladder>({ kind: 'ladder', base: { x: 20, y: 0, z: 0 }, top: { x: 20, y: 9, z: 0.45 }, facing: 0, rung: 0.3, width: 0.5 });
  const smooth = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const op = operatorRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 'mixamo-i2');
  const rig = op.rig;
  rig.tuneRows = true;
  const g = new AttachGrips();
  const onLadder = state === 'ladder' || state === 'topOut';
  const a = onLadder ? ladder : lip;
  let s = state === 'topOut' ? 7.5 : onLadder ? 0.6 : state === 'shimmyL' ? 6 : 2;
  g.setup(a, s, 1, PLAYER_HEIGHT);
  const pose: RigPose = { speed: 0, localX: 0, localZ: 0, grounded: false, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, traverse: 'hang', traverseT: 0 };
  const ap = { x: 0, y: 0, z: 0, yaw: 0 };
  const p0 = attachPose(lip, s, 1, GAMEPLAY_HEIGHT, { x: 0, y: 0, z: 0, yaw: 0 });
  const end ={ x: p0.x - lip.nx * (HANG_A.out + 0.45), z: p0.z - lip.nz * (HANG_A.out + 0.45) };
  const P = CLIMB_UP_PATH;
  const exiting = state === 'climbUp' || state === 'topOut';
  const N = Math.round((state === 'topOut' ? LADDER_TOPOUT_TIME : CLIMB_UP_TIME + CLIMB_UP_STAND) / DT);
  const WARM = 60;
  const STEPS = exiting ? N + 10 : 150;
  const out: Reach = { hand: 0, foot: 0, frames: 0, sw: 0 };
  const joints = [rig.hips, rig.headNode, rig.wristL, rig.wristR, rig.kneeL, rig.kneeR, rig.ankleL, rig.ankleR];
  const jointName = ['hips', 'head', 'wristL', 'wristR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];
  const prevJ = new Float64Array(joints.length * 3);
  const last = [NaN, NaN, NaN, NaN, NaN, NaN];
  const settle = [0, 0];
  const footRest = [0, 0, 0, 0, 0, 0];
  const plantAt = [NaN, NaN, NaN, NaN, NaN, NaN];
  const footSettle = [0, 0];
  try {
    for (let k = -WARM; k < STEPS; k++) {
      const v = state === 'shimmyR' ? ATTACH.ledge.speed : state === 'shimmyL' ? -ATTACH.ledge.speed : state === 'ladder' ? ATTACH.ladder.speed : 0;
      s += v * DT;
      const exitK = exiting && k >= 0 ? Math.min(1, k / N) : -1;
      if (exitK >= 0) {
        g.footW = climbUpFootWeight(true, exitK);
        g.update(DT, a, s, 0, 1, attachGripWeight('exit', exitK, true), rig);
      } else g.update(DT, a, s, v, 1, 1, rig);
      attachPose(a, s, 1, GAMEPLAY_HEIGHT, ap);
      let x = ap.x;
      let y = ap.y;
      let z = ap.z;
      if (exitK >= 0 && state === 'climbUp') {
        const mid = Math.max(p0.y, lip.top - P.lipDrop);
        y = exitK < P.k1 ? p0.y + (mid - p0.y) * smooth(exitK / P.k1) : mid + (lip.top - mid) * smooth((exitK - P.k1) / (P.k2 - P.k1));
        const fwd = smooth((exitK - P.fwd0) / P.fwdSpan);
        const o = Math.sin(Math.PI * Math.min(1, exitK / P.outK)) * 0.12;
        x = p0.x + (end.x - p0.x) * fwd + lip.nx * o;
        z = p0.z + (end.z - p0.z) * fwd + lip.nz * o;
      } else if (exitK >= 0) {
        const e = smooth(exitK);
        y += 0.9 * e;
        x += Math.sin(ap.yaw) * 0.5 * e;
        z += Math.cos(ap.yaw) * 0.5 * e;
      }
      rig.root.position.set(x + g.lift.x, y + g.lift.y, z + g.lift.z);
      rig.root.rotation.y = ap.yaw;
      pose.traverse = exitK >= 0 ? 'climbUp' : onLadder ? 'climb' : 'hang';
      pose.traverseT = exitK >= 0 ? (state === 'topOut' ? exitK * CLIMB_UP_CROUCH_K : exitK) : g.cadence();
      pose.speed = Math.abs(v);
      rig.animate(DT, pose);
      // the exit's first frame: each joint's world step from the last hang / ladder frame
      if (exiting && (k === -1 || k === 0)) {
        for (let j = 0; j < joints.length; j++) {
          const q = joints[j]!.computeWorldMatrix(true).getTranslation();
          if (k === 0) {
            const d = Math.sqrt((q.x - prevJ[j * 3]!) ** 2 + (q.y - prevJ[j * 3 + 1]!) ** 2 + (q.z - prevJ[j * 3 + 2]!) ** 2);
            if (d > out.sw) out.swAt = jointName[j];
            out.sw = Math.max(out.sw, d);
          }
          prevJ[j * 3] = q.x;
          prevJ[j * 3 + 1] = q.y;
          prevJ[j * 3 + 2] = q.z;
        }
      }
      if (k < 0) continue;
      out.frames++;
      // palms: a grip that moved restarts its 3-frame landing (e2e-traverse's settle window)
      const tg = [rig.reachL, rig.reachR];
      for (let h = 0; h < 2; h++) {
        const t = tg[h]!;
        const moved = Math.abs(t.x - last[h * 3]!) + Math.abs(t.y - last[h * 3 + 1]!) + Math.abs(t.z - last[h * 3 + 2]!) > 1e-4;
        last[h * 3] = t.x;
        last[h * 3 + 1] = t.y;
        last[h * 3 + 2] = t.z;
        settle[h] = moved || !(t.w > 0.99) ? 0 : settle[h]! + 1;
        if (settle[h]! <= 3) continue;
        const e = rig.gripError(h === 0 ? -1 : 1);
        if (e !== null && e > out.hand) out.at = `k${k} h${h} w${t.w.toFixed(2)}`;
        if (e !== null) out.hand = Math.max(out.hand, e);
      }
      // soles: a foot on a full-weight plant stays where it landed (the ankle's world drift while its plant holds still,
      // 3 frames after it lands: e2e-traverse's planted contacts)
      const pl = [rig.plantL, rig.plantR];
      const an = [rig.ankleL, rig.ankleR];
      for (let f = 0; f < 2; f++) {
        const t = pl[f]!;
        const moved = Math.abs(t.x - plantAt[f * 3]!) + Math.abs(t.y - plantAt[f * 3 + 1]!) + Math.abs(t.z - plantAt[f * 3 + 2]!) > 1e-4;
        plantAt[f * 3] = t.x;
        plantAt[f * 3 + 1] = t.y;
        plantAt[f * 3 + 2] = t.z;
        footSettle[f] = moved || !(t.w > 0.99) ? 0 : footSettle[f]! + 1;
        if (footSettle[f]! < 3) continue;
        const q = an[f]!.computeWorldMatrix(true).getTranslation();
        if (footSettle[f] === 3) {
          footRest[f * 3] = q.x;
          footRest[f * 3 + 1] = q.y;
          footRest[f * 3 + 2] = q.z;
        }
        out.foot = Math.max(out.foot, Math.sqrt((q.x - footRest[f * 3]!) ** 2 + (q.y - footRest[f * 3 + 1]!) ** 2 + (q.z - footRest[f * 3 + 2]!) ** 2));
      }
    }
  } finally {
    op.figure.dispose();
    rig.dispose();
    scene.dispose();
  }
  return out;
}

/** The vent crawl on Wren's rig (headless, its cadence 0.01 a frame) with the switch as it stands: the joints' world
 *  positions every frame past a 60-frame warm-up, the largest joint step a frame and the largest change of step (a pop). */
async function crawlJoints(): Promise<{ pos: number[]; step: number; pop: number }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { operatorRig } = await import('../src/operators/runtime/playerFigure');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const op = operatorRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 'mixamo-i2-crawl');
  const rig = op.rig;
  const pose: RigPose = { speed: 0.6, localX: 0, localZ: 1, grounded: false, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, traverse: 'crawl', traverseT: 0 };
  const joints = [rig.hips, rig.torso, rig.neck, rig.headNode, rig.shoulderL, rig.shoulderR, rig.wristL, rig.wristR, rig.kneeL, rig.kneeR, rig.ankleL, rig.ankleR];
  const J = joints.length;
  const pos: number[] = [];
  let step = 0;
  let pop = 0;
  // seeded as runGraph (the graph's idle fidgets), so two runs compare bit for bit
  const random = Math.random;
  let seed = 4242;
  Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  try {
    for (let n = 0; n < 240; n++) {
      pose.traverseT = (n * 0.01) % 1;
      rig.animate(DT, pose);
      if (n < 60) continue;
      const f = pos.length / (J * 3);
      for (const j of joints) {
        const q = j.computeWorldMatrix(true).getTranslation();
        pos.push(q.x, q.y, q.z);
      }
      for (let j = 0; j < J && f >= 1; j++) {
        let d2 = 0;
        let p2 = 0;
        for (let a = 0; a < 3; a++) {
          const c = (f * J + j) * 3 + a;
          const d = pos[c]! - pos[c - J * 3]!;
          d2 += d * d;
          if (f >= 2) p2 += (d - (pos[c - J * 3]! - pos[c - J * 6]!)) ** 2;
        }
        step = Math.max(step, Math.sqrt(d2));
        pop = Math.max(pop, Math.sqrt(p2));
      }
    }
  } finally {
    Math.random = random;
    op.figure.dispose();
    rig.dispose();
    scene.dispose();
  }
  return { pos, step, pop };
}

describe('mixamo I2: the vent crawl (headless, Wren rig)', () => {
  it('the crawl capture plays without a visible break (I2b: the chest yaw no longer flips), and MIXAMO_ON ships it', async () => {
    const hand = await crawlJoints();
    // with every capture let on, the capture plays
    allOn();
    setMixamo(true);
    const cap = await crawlJoints();
    // as shipped with the flag on: the hand-made crawl, joint for joint
    Object.assign(MIXAMO_ON, ON0);
    setMixamo(true);
    const shipped = await crawlJoints();
    console.info(`(mixamo I2b) vent crawl joint step a frame: capture ${(cap.step * 100).toFixed(1)} cm, pop ${(cap.pop * 100).toFixed(1)} cm (hand-made ${(hand.step * 100).toFixed(1)} / ${(hand.pop * 100).toFixed(1)})`);
    expect(hand.step).toBeGreaterThan(0);
    expect(differ(cap.pos, hand.pos)).toBeGreaterThan(0);
    // a visible break (I2b cap: Michael 2026-10-26, the capture wins unless visibly broken): the yaw flip stepped 13.8 cm a
    // frame and popped 24.9 cm; the fixed take 3.4 / 1.7 (a 1.8 s crawl's reach)
    expect(cap.step).toBeLessThanOrEqual(0.06);
    expect(cap.pop).toBeLessThanOrEqual(0.04);
    // as shipped: the capture plays (off it would be the hand-made crawl, joint for joint)
    expect(differ(shipped.pos, MIXAMO_ON.crawling_hands_and_knees ? cap.pos : hand.pos)).toBe(0);
  }, 300_000);
});

describe('mixamo I2: hands and feet on the anchors (headless, Wren rig)', () => {
  const STATES: State[] = ['hang', 'shimmyR', 'shimmyL', 'ladder', 'climbUp', 'topOut'];
  it('each capture keeps the palms on their grips and the soles on their plants as the hand-made clip does (1 cm)', async () => {
    const rows: string[] = [];
    const res: [State, Reach, Reach][] = [];
    for (const st of STATES) {
      setMixamo(false);
      const hand = await reach(st);
      setMixamo(true);
      const mix = await reach(st);
      rows.push(`${st}: palms ${(mix.hand * 100).toFixed(2)} cm (hand-made ${(hand.hand * 100).toFixed(2)}), soles ${(mix.foot * 100).toFixed(2)} cm (hand-made ${(hand.foot * 100).toFixed(2)}) at ${mix.at}${mix.swAt ? `, first exit frame ${(mix.sw * 100).toFixed(1)} cm ${mix.swAt} (hand-made ${(hand.sw * 100).toFixed(1)} ${hand.swAt})` : ''}`);
      res.push([st, hand, mix]);
    }
    console.info(`(mixamo I2) reach / plant errors: ${rows.join('; ')}`);
    for (const [st, hand, mix] of res) {
      expect(mix.frames, st).toBeGreaterThan(0);
      expect(mix.hand, `${st} palms`).toBeLessThanOrEqual(Math.max(0.01, hand.hand + 0.002));
      // (I2b) the ladder's sole measure is the rig's climb foot cap on both clips (I2-REPORT "Known gaps"), not contact: the
      // capture reads 38 cm vs 32 (Michael 2026-10-26: worse numbers are tuned in the Chamber); capped for a visible break
      if (st === 'ladder') expect(mix.foot, `${st} soles`).toBeLessThanOrEqual(hand.foot + 0.1);
      else expect(mix.foot, `${st} soles`).toBeLessThanOrEqual(Math.max(0.01, hand.foot + 0.002));
      // the switch from the hang's / ladder's clip to the exit's (a capture to the hand-made clip, or the reverse) steps no
      // joint further than the hand-made switch does (the graph inertializes it)
      // (I2b) the ladder capture to the top-out capture (inertialized across the move change): 19.9 cm on the right ankle
      // vs the hand-made 15.7 (was 23.5 before the capture-to-capture trigger); capped at +5 cm for a visible break
      expect(mix.sw, `${st} first exit frame`).toBeLessThanOrEqual(hand.sw + (st === 'topOut' && MIXAMO_ON.climbing_ladder ? 0.05 : 0.005));
    }
  }, 600_000);
});
