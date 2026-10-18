// (locomotion step 18, D7) hold / toggle for aim, crouch, back-to-wall, sprint and grab (pure input sequences)
import { describe, expect, it } from 'vitest';
import { HoldToggle } from '../src/input/holdToggle';
import { crouchToggleNext, crouchWanted, sprintEdge } from '../src/player/movement';
import { grabDecides } from '../src/game/takedown';
import { buildCoverSegments, type CoverBox } from '../src/cover/coverData';
import { buildWallLinks, emptyWallInput, WallCore, type WallInput } from '../src/player/wallController';

/** [pressed, held] per step. */
type Seq = [boolean, boolean][];
const PRESS_HOLD_RELEASE: Seq = [[true, true], [false, true], [false, false], [false, false]];

describe('hold / toggle (step 18)', () => {
  it('aim', () => {
    const run = (toggle: boolean, seq: Seq): boolean[] => {
      const l = new HoldToggle();
      return seq.map(([p, h]) => l.update(toggle, p, h));
    };
    expect(run(false, PRESS_HOLD_RELEASE)).toEqual([true, true, false, false]);
    expect(run(true, PRESS_HOLD_RELEASE)).toEqual([true, true, true, true]);
    expect(run(true, [...PRESS_HOLD_RELEASE, [true, true], [false, false]])).toEqual([true, true, true, true, false, false]);
  });

  it('crouch', () => {
    const run = (toggle: boolean, seq: Seq, sprinting = false): boolean[] => {
      let latch = false;
      return seq.map(([p, h]) => {
        if (p && toggle) latch = crouchToggleNext(latch, sprinting);
        return crouchWanted(toggle, latch, h);
      });
    };
    expect(run(false, PRESS_HOLD_RELEASE)).toEqual([true, true, false, false]);
    expect(run(true, PRESS_HOLD_RELEASE)).toEqual([true, true, true, true]);
    expect(run(true, [[true, true], [false, false], [true, true], [false, false]])).toEqual([true, true, false, false]);
    // from a sprint a press always crouches
    expect(crouchToggleNext(true, true)).toBe(true);
  });

  it('sprint', () => {
    const run = (toggle: boolean, seq: Seq, mag = 1): boolean[] => {
      let on = false;
      return seq.map(([p, h]) => {
        const e = sprintEdge(toggle, p, h, on, mag);
        if (e > 0) on = true;
        else if (e < 0) on = false;
        return on;
      });
    };
    expect(run(false, PRESS_HOLD_RELEASE)).toEqual([true, true, false, false]);
    expect(run(true, PRESS_HOLD_RELEASE)).toEqual([true, true, true, true]);
    expect(run(true, [[true, true], [false, false], [true, true]])).toEqual([true, true, false]);
    // a still stick never starts it
    expect(run(false, PRESS_HOLD_RELEASE, 0.1)).toEqual([false, false, false, false]);
    expect(run(true, PRESS_HOLD_RELEASE, 0.1)).toEqual([false, false, false, false]);
  });

  it('back to wall (context entry)', () => {
    const box = (x: number, z: number, w: number, h: number, d: number): CoverBox => ({ c: [x, h / 2, z], s: [w, h, d], yaw: 0, pitch: 0, collide: true });
    const segs = buildCoverSegments([box(0, 0, 6, 2.5, 0.4)]);
    const links = buildWallLinks(segs);
    const run = (toggle: boolean): string[] => {
      const w = new WallCore(segs, links, 0.35);
      const i: WallInput = Object.assign(emptyWallInput(), { x: 0, z: 0.2 + 0.35 + 0.1, lookX: 0, lookZ: -1, context: true, contextHeld: true, toggle });
      const out: string[] = [];
      const step = (t: number): void => {
        for (let k = 0; k < Math.round(t * 60); k++) {
          w.update(1 / 60, i);
          i.context = false;
          if (w.active) {
            i.x += w.vx / 60;
            i.z += w.vz / 60;
          }
        }
        out.push(w.phase);
      };
      step(0.6); // pressed and held: on the wall
      i.contextHeld = false;
      step(0.1); // released
      return out;
    };
    expect(run(false)).toEqual(['on', 'leaving']);
    expect(run(true)).toEqual(['on', 'on']);
  });

  it('grab (holding a hostage: what decides the finish)', () => {
    // toggle (the 3.2.0 behaviour): a fresh press decides; letting go of the button does nothing
    expect(grabDecides(true, false, false)).toBe(false);
    expect(grabDecides(true, true, true)).toBe(true);
    // hold: keep the button held to keep them; letting go knocks out
    expect(grabDecides(false, false, true)).toBe(false);
    expect(grabDecides(false, false, false)).toBe(true);
  });
});
