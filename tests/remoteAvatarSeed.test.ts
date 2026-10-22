import { describe, expect, it } from 'vitest';
import { SnapshotBuffer } from '../src/net/interp';
import { easeRemoteSpeed, isShownTeleport, REMOTE_SPEED_MAX, seedHeading } from '../src/net/remoteSeed';

// (partner-seed) `RemoteAvatar.update` seeds its eased ground speed (and the heading it strides along) from the owner's
// MoveState when the rig is first placed or teleports, instead of easing up from 0 (which played a start one-shot for a
// partner first seen walking under ~0.3 m/s at 60 Hz, ~1.2 m/s at 240 Hz). Driven here the way `update` drives them.
interface St { x: number; y: number; z: number; yaw: number; speed: number }

/** The speed / heading half of `RemoteAvatar.update`, frame by frame off a snapshot buffer. */
class Probe {
  speed = 0;
  placed = false;
  justPlaced = false;
  px = 0;
  pz = 0;
  lx = 0;
  lz = 0;
  buf = new SnapshotBuffer<St>();
  frame(dt: number, t: number): void {
    const s = this.buf.sample(t);
    if (!s) return;
    if (!this.placed) {
      this.placed = true;
      this.justPlaced = true;
      this.px = s.x;
      this.pz = s.z;
    }
    const moved = Math.hypot(s.x - this.px, s.z - this.pz);
    const reseed = this.justPlaced || isShownTeleport(moved, dt);
    this.justPlaced = false;
    this.speed = easeRemoteSpeed(this.speed, s.state.speed, dt, reseed);
    this.lx = s.x - this.px;
    this.lz = s.z - this.pz;
    if (reseed) {
      const h = { x: 0, z: 0 };
      seedHeading(s.from.x, s.from.z, s.to.x, s.to.z, this.speed, dt, h);
      this.lx = h.x;
      this.lz = h.z;
    }
    this.px = s.x;
    this.pz = s.z;
  }
}

const walkTo = (p: Probe, v: number, x0 = 0, z0 = 0): void => {
  for (let i = 0; i < 4; i++) p.buf.push(i * 0.05, { x: x0 + v * i * 0.05, y: 0, z: z0, yaw: 0, speed: v });
};

describe('partner rig seeds its eased speed from the first state', () => {
  for (const hz of [60, 240]) {
    it(`a first snapshot at 1.2 m/s shows 1.2 on the first frame (${hz} Hz)`, () => {
      const p = new Probe();
      walkTo(p, 1.2);
      p.frame(1 / hz, 0.05);
      expect(p.speed).toBeCloseTo(1.2, 6);
      // the heading is the direction of travel (+x), not the zero a rig with no previous spot reads
      expect(p.lx).toBeGreaterThan(0);
      expect(p.lz).toBeCloseTo(0, 9);
      expect(Math.hypot(p.lx, p.lz) / (1 / hz)).toBeCloseTo(1.2, 6);
    });
    it(`the old ease from 0 was under the start threshold on the first frame (${hz} Hz)`, () => {
      expect(easeRemoteSpeed(0, 1.2, 1 / hz, false)).toBeLessThan(hz === 60 ? 0.3 : 1.3);
      expect(easeRemoteSpeed(0, 1.2, 1 / hz, false)).toBeLessThan(1.2);
    });
  }

  it('a state standing still seeds 0 and a sprint is clamped to the rig maximum', () => {
    const p = new Probe();
    walkTo(p, 0);
    p.frame(1 / 60, 0.05);
    expect(p.speed).toBe(0);
    expect(p.lx).toBe(0);
    const q = new Probe();
    walkTo(q, 20);
    q.frame(1 / 60, 0.05);
    expect(q.speed).toBe(REMOTE_SPEED_MAX);
  });

  it('after the first frame the speed eases as before', () => {
    const p = new Probe();
    walkTo(p, 1.2);
    p.frame(1 / 60, 0.05);
    p.buf.push(0.2, { x: 1.2 * 0.2, y: 0, z: 0, yaw: 0, speed: 3 });
    p.buf.push(0.25, { x: 1.2 * 0.2 + 0.15, y: 0, z: 0, yaw: 0, speed: 3 });
    p.frame(1 / 60, 0.25);
    p.frame(1 / 60, 0.25);
    // from the seed 1.2 toward 3 by dt x 10 each frame (not a re-seed)
    const first = 1.2 + (3 - 1.2) / 6;
    expect(p.speed).toBeCloseTo(first + (3 - first) / 6, 6);
  });

  it('a teleport (bay start, respawn) re-seeds; a hitch of the same frames does not', () => {
    const p = new Probe();
    walkTo(p, 3);
    p.frame(1 / 60, 0.05);
    expect(p.speed).toBeCloseTo(3, 6);
    // the owner respawns 40 m away and walks slowly: the eased 3 m/s must not carry over
    for (let i = 0; i < 4; i++) p.buf.push(1 + i * 0.05, { x: 40 + 0.5 * i * 0.05, y: 0, z: 0, yaw: 0, speed: 0.5 });
    p.frame(1 / 60, 1.0);
    expect(p.speed).toBeCloseTo(0.5, 6);
    expect(Math.hypot(p.lx, p.lz)).toBeLessThan(0.05); // not the 40 m jump as a heading
    expect(isShownTeleport(40, 1 / 60)).toBe(true);
    expect(isShownTeleport(3, 0.5)).toBe(false); // 6 m/s over a 0.5 s hitch is a stall, not a teleport
    expect(isShownTeleport(0.1, 1 / 60)).toBe(false);
  });

  it('no heading from two states a teleport apart', () => {
    const h = { x: 9, z: 9 };
    seedHeading(0, 0, 40, 0, 1.2, 1 / 60, h);
    expect(h).toEqual({ x: 0, z: 0 });
    seedHeading(1, 1, 1, 1, 1.2, 1 / 60, h);
    expect(h).toEqual({ x: 0, z: 0 });
  });
});
