/**
 * (anim-n4b, anim-natural PASS2 rows 61 / 64 / 66, AUDIT fixes 26 / 28 / 36) Pure-pose checks of the traversal fixes:
 * the mantle's hand plant on the edge, the drop's air pose and its landing flex by the drop, the grounded roll (feet under
 * the hips, the pelvis low, the wrists slow) and the split brace (palms on the walls, the trunk breathing).
 */
import { describe, expect, it } from 'vitest';
import { Matrix, Quaternion, Vector3 } from '../src/core/babylon';
import { AIR_POSE, AnimGraph, defaultInput, type AnimInput } from '../src/anim/animGraph';
import { DROP } from '../src/anim/clips/actions';
import { sample } from '../src/anim/clip';
import { LAND_GRAVITY, MANTLE_PLANT, ROLL_BODY, rollTurn, SPLIT_HANDS, splitBreath, type SplitBreathOut } from '../src/anim/clips/traverse';
import { MANTLE_PATH, mantleAlong, mantleRise, rollRide, traversePath } from '../src/player/traversePath';
import { proportions } from '../src/player/proportions';
import { AttachGrips } from '../src/player/attachGrips';
import { TraversalAnchors, type SplitAnchor } from '../src/world/anchors';
import { SPLIT, CT } from '../src/config/movement';

const P = proportions();
const k = P.height / 1.75;
const bodyPivot = P.y.hip * 0.62; // characterRig: the tumble pivot
const pelvisRest = P.y.hip - bodyPivot;

/** Drive a graph through a committed move of `dur` s at 120 Hz; `each` sees the progress and the outputs. */
function play(kind: AnimInput['traverse'], dur: number, set: (i: AnimInput) => void, each: (t: number, g: AnimGraph) => void): void {
  const g = new AnimGraph(P);
  const i = defaultInput();
  i.armed = false;
  i.ready = true;
  set(i);
  for (let n = 0; n < 30; n++) g.update(1 / 120, i);
  i.traverse = kind;
  const N = Math.round(dur * 120);
  for (let n = 0; n <= N; n++) {
    i.traverseT = n / N;
    g.update(1 / 120, i);
    each(n / N, g);
  }
}

describe('anim-n4b: the mantle plants both hands on the top edge (row 61)', () => {
  it('the path shares are the traversal path (traversePath mantle)', () => {
    const f = { x: 0, y: 0, z: 0 };
    const e = { x: 0, y: 1.2, z: 0.8 };
    const o = { x: 0, y: 0, z: 0 };
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      traversePath('mantle', f, e, 1.2, 0, t, o);
      expect(o.y).toBeCloseTo((1.2 + MANTLE_PATH.topLift) * mantleRise(t), 9);
      expect(o.z).toBeCloseTo(0.8 * mantleAlong(t), 9);
    }
  });

  for (const [H, D] of [
    [0.9, 0.75],
    [1.4, 0.9],
  ] as const) {
    it(`a ${H} m top: a phase with both palms on the edge (world-still), then they leave`, () => {
      const edgeZ = D - MANTLE_PATH.standIn;
      let planted = 0;
      let maxW = 0;
      let lastW = 1;
      play('mantle', 1.0, (i) => ((i.travH = H), (i.travD = D)), (t, g) => {
        const o = g.out;
        // the root's place along the path (relative to the start feet)
        const ry = (H + MANTLE_PATH.topLift) * mantleRise(t);
        const rz = D * mantleAlong(t);
        const lY = ry + o.handL.y;
        const rY = ry + o.handR.y;
        const lZ = rz + o.handL.z;
        if (t > 0.25 && t < 0.48) {
          // planted: both palms at the top's height (the wrist a palm's thickness over it), just past the edge
          expect(Math.abs(lY - (H + MANTLE_PLANT.palmY))).toBeLessThan(0.03);
          expect(Math.abs(rY - (H + MANTLE_PLANT.palmY))).toBeLessThan(0.03);
          expect(Math.abs(lZ - (edgeZ + MANTLE_PLANT.palmZ))).toBeLessThan(0.03);
          expect(o.handL.x).toBeLessThan(-0.1);
          expect(o.handR.x).toBeGreaterThan(0.1);
          planted++;
        }
        if (t > 0.9) lastW = Math.min(lastW, Math.abs(lY - (H + MANTLE_PLANT.palmY)));
        maxW = Math.max(maxW, t);
      });
      expect(planted).toBeGreaterThan(20);
      // the hands left the edge by the end (back at the sides, well off the top)
      expect(lastW).toBeGreaterThan(0.15);
      expect(maxW).toBe(1);
    });
  }
});

describe('anim-n4b: the drop has an air pose and a landing that flexes by the drop (row 64)', () => {
  it('the step off ends in the air pose: legs ahead, arms out and up', () => {
    expect(sample(DROP, 'fLZ', 1)).toBeGreaterThan(0.1);
    expect(sample(DROP, 'hLY', 1)).toBeCloseTo(AIR_POSE.armY, 2);
    expect(sample(DROP, 'hRX', 1)).toBeCloseTo(AIR_POSE.armX, 2);
  });

  it('falling: the legs go ahead and the free arms out and up', () => {
    const g = new AnimGraph(P);
    const i = defaultInput();
    i.armed = false;
    i.ready = true;
    for (let n = 0; n < 120; n++) g.update(1 / 120, i);
    const lz0 = g.out.stance.lZ;
    const hy0 = g.out.handL.y;
    const hx0 = g.out.handL.x;
    i.grounded = false;
    for (let n = 0; n < 72; n++) g.update(1 / 120, i);
    expect(g.out.stance.lZ - lz0).toBeGreaterThan(0.1 * k);
    expect(g.out.handL.y - hy0).toBeGreaterThan(0.2);
    expect(hx0 - g.out.handL.x).toBeGreaterThan(0.15);
  });

  it('the landing dip grows with the drop height (0.6 -> 0.9 -> 1.2 -> 1.5 m); a step under 0.25 m none', () => {
    // the controller's landing strength (playerController: landT from the fall speed at the game's gravity, Player:
    // landing = 2 landT; it tops out at ~1.5 m, and from LANDING.roll 2.5 m a fall is a roll)
    const landingOf = (h: number) => {
      const v = Math.sqrt(2 * LAND_GRAVITY * h);
      const landT = v > 3 ? Math.min(0.7, 0.15 + (v - 3) * 0.08) : 0;
      return Math.min(1, landT * 2);
    };
    const dip = (h: number) => {
      const g = new AnimGraph(P);
      const i = defaultInput();
      for (let n = 0; n < 60; n++) g.update(1 / 60, i);
      const y0 = g.out.pelvis.y;
      i.landing = landingOf(h);
      let lo = 0;
      for (let n = 0; n < 60; n++) {
        g.update(1 / 60, i);
        i.landing = Math.max(0, i.landing - 2 / 60);
        lo = Math.min(lo, g.out.pelvis.y - y0);
      }
      // and it recovers
      expect(Math.abs(g.out.pelvis.y - y0)).toBeLessThan(0.02);
      return -lo;
    };
    expect(landingOf(0.25)).toBe(0);
    expect(dip(0.24)).toBeLessThan(0.001);
    const d = [0.6, 0.9, 1.2, 1.5].map(dip);
    expect(d[0]).toBeGreaterThan(0.005);
    for (let n = 1; n < d.length; n++) expect(d[n]!).toBeGreaterThan(d[n - 1]! + 0.02);
    expect(d[3]).toBeGreaterThan(0.3);
  });
});

describe('anim-n4b: the grounded roll (row 66)', () => {
  it("rollTurn is the rig's body rotation (the spin about the tilted line, then the pitch)", () => {
    const axis = new Vector3(0, Math.cos(ROLL_BODY.tilt), -Math.sin(ROLL_BODY.tilt));
    const m = new Matrix();
    const o = { x: 0, y: 0, z: 0 };
    for (const [p, s] of [
      [0.4, 0],
      [1.2, -1],
      [1.5, -3.5],
      [0.7, -5.9],
    ] as const) {
      const q = Quaternion.RotationAxis(Vector3.Right(), p).multiply(Quaternion.RotationAxis(axis, s));
      q.toRotationMatrix(m);
      for (const v of [new Vector3(0.1, -0.4, 0.08), new Vector3(-0.2, 0.6, 0.15)]) {
        const w = Vector3.TransformCoordinates(v, m);
        rollTurn(p, s, v.x, v.y, v.z, o);
        expect(o.x).toBeCloseTo(w.x, 6);
        expect(o.y).toBeCloseTo(w.y, 6);
        expect(o.z).toBeCloseTo(w.z, 6);
      }
    }
    // no spin: the old tumble's pitch (characterRig: vy2 = vy cos - vf sin)
    rollTurn(0.9, 0, 0, -0.5, 0.2, o);
    expect(o.y).toBeCloseTo(-0.5 * Math.cos(0.9) - 0.2 * Math.sin(0.9), 9);
  });

  for (const dur of [CT.rollTime, 0.62]) {
    it(`over ${dur} s: feet never above the hips, the pelvis low through the roll, the right shoulder down first, wrists under 9 m/s`, () => {
      const o = { x: 0, y: 0, z: 0 };
      let prevL: { x: number; y: number; z: number } | null = null;
      let prevR: { x: number; y: number; z: number } | null = null;
      let wristMax = 0;
      let pelvisMaxMid = 0;
      let pelvisMin = 9;
      let feetOver = -9;
      let shoulderSide = 0;
      play('roll', dur, () => {}, (t, g) => {
        const r = g.out;
        // the rig: the body pivot sunk by tumbleDrop over the root (the root rides `rollRide` over the floor)
        const ride = rollRide(t);
        const pivot = bodyPivot - r.tumbleDrop + ride;
        rollTurn(r.tumble, r.tumbleSpin, r.pelvis.x, pelvisRest + r.pelvis.y, r.pelvis.z, o);
        const hips = pivot + o.y;
        const st = r.stance;
        rollTurn(r.tumble, r.tumbleSpin, st.lX, P.y.ankle + st.lY - bodyPivot, st.lZ, o);
        const footL = pivot + o.y;
        rollTurn(r.tumble, r.tumbleSpin, st.rX, P.y.ankle + st.rY - bodyPivot, st.rZ, o);
        const footR = pivot + o.y;
        feetOver = Math.max(feetOver, footL - hips, footR - hips);
        pelvisMin = Math.min(pelvisMin, hips);
        if (t > 0.3 && t < 0.7) pelvisMaxMid = Math.max(pelvisMaxMid, hips);
        // the shoulders as the spin starts: the right one goes down first
        if (t > 0.2 && t < 0.3) {
          const sy = P.y.shoulder + r.pelvis.y - bodyPivot;
          rollTurn(r.tumble, r.tumbleSpin, P.shoulderHalf, sy, 0, o);
          const right = o.y;
          rollTurn(r.tumble, r.tumbleSpin, -P.shoulderHalf, sy, 0, o);
          shoulderSide += right < o.y ? 1 : -1;
        }
        // wrists (the free-hand targets, body frame) in the root frame (less the ride)
        const wl = rollTurn(r.tumble, r.tumbleSpin, r.handL.x, r.handL.y - bodyPivot, r.handL.z, { x: 0, y: 0, z: 0 });
        wl.y += pivot - ride;
        const wr = rollTurn(r.tumble, r.tumbleSpin, r.handR.x, r.handR.y - bodyPivot, r.handR.z, { x: 0, y: 0, z: 0 });
        wr.y += pivot - ride;
        if (prevL && prevR && t > 0.02) {
          const dt = dur / Math.round(dur * 120);
          wristMax = Math.max(wristMax, Math.hypot(wl.x - prevL.x, wl.y - prevL.y, wl.z - prevL.z) / dt, Math.hypot(wr.x - prevR.x, wr.y - prevR.y, wr.z - prevR.z) / dt);
        }
        prevL = wl;
        prevR = wr;
      });
      expect(feetOver).toBeLessThanOrEqual(0);
      expect(pelvisMaxMid).toBeLessThan(0.45);
      expect(pelvisMin).toBeGreaterThan(0.12);
      expect(shoulderSide).toBeGreaterThan(0);
      expect(wristMax).toBeLessThan(9);
    });
  }
});

describe('anim-n4b: the split brace (AUDIT fix 36, row 58)', () => {
  const anchors = new TraversalAnchors();
  const zero = () => ({ x: 0, y: 0, z: 0, w: 0 });
  const gap = (width: number) =>
    anchors.add<SplitAnchor>({ kind: 'split', a: { x: 0, y: 0, z: 0 }, b: { x: 0, y: 0, z: 6 }, tx: 0, tz: 1, nx: 1, nz: 0, len: 6, width, height: 4.3 });

  for (const width of [SPLIT.minWidth, 1.8]) {
    it(`a ${width} m gap: the palms on the two wall planes under the shoulders, the elbows bent where the gap allows`, () => {
      const a = gap(width);
      const g = new AttachGrips();
      const rig = { reachL: zero(), reachR: zero(), plantL: zero(), plantR: zero(), height: 1.75 };
      g.setup(a, 3, 1, 1.75);
      for (let n = 0; n < 60; n++) g.update(1 / 60, a, 3, 0, 1, 1, rig);
      const wall = width / 2 - 0.05 + 0.02;
      const fy = SPLIT.feetHeight;
      for (const h of [rig.reachL, rig.reachR]) {
        expect(h.w).toBeGreaterThan(0.99);
        expect(Math.abs(Math.abs(h.x) - wall)).toBeLessThan(1e-6);
        expect(h.y).toBeCloseTo(fy + SPLIT_HANDS.up, 6);
      }
      // the shoulders braced ~0.57 m over the feet line (attach: the root rootDrop under it, the hips sunk 0.46)
      const shY = fy - SPLIT.rootDrop + P.y.hip - 0.46 + (P.y.shoulder - P.y.hip);
      expect(shY - rig.reachL.y).toBeGreaterThan(0.18);
      if (width <= 1.4) {
        // the wrist (behind the palm) within the arm's reach: the elbow bends
        const dx = wall - P.shoulderHalf;
        const dy = shY - rig.reachL.y;
        const dz = SPLIT_HANDS.fwd;
        const d = Math.hypot(dx, dy, dz) - P.hand.len * 0.45;
        const u = P.upperArm.len;
        const f = P.forearm.len;
        const bend = Math.PI - Math.acos(Math.max(-1, Math.min(1, (u * u + f * f - d * d) / (2 * u * f))));
        expect(bend).toBeGreaterThan(0.35);
      }
    });
  }

  it('the trunk breathes and balances over the brace (range > 0)', () => {
    const o: SplitBreathOut = { spPitch: 0, hdPitch: 0, pelRoll: 0, pelX: 0, spRoll: 0, hdRoll: 0 };
    let pMin = 9, pMax = -9, rMin = 9, rMax = -9;
    for (let t = 0; t < 6; t += 0.05) {
      splitBreath(t, o);
      pMin = Math.min(pMin, o.spPitch);
      pMax = Math.max(pMax, o.spPitch);
      rMin = Math.min(rMin, o.pelRoll);
      rMax = Math.max(rMax, o.pelRoll);
    }
    expect(pMax - pMin).toBeGreaterThan(0.03);
    expect(rMax - rMin).toBeGreaterThan(0.04);
    // and the graph puts it on the braced body
    const g = new AnimGraph(P);
    const i = defaultInput();
    i.traverse = 'split';
    let lo = 9, hi = -9;
    for (let n = 0; n < 6 * 60; n++) {
      g.update(1 / 60, i);
      if (n > 60) {
        lo = Math.min(lo, g.out.pelvis.roll);
        hi = Math.max(hi, g.out.pelvis.roll);
      }
    }
    expect(hi - lo).toBeGreaterThan(0.03);
  });
});
