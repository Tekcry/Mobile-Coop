/**
 * mocap-trial-2 pop3 (CHECK-2 required 3): walking starts after a short stand with the mocap switch on. After a stand of
 * 0.3-0.5 s one foot is still in its idle stop step when the move starts; the clip lifted the other foot late in its swing
 * window (0.89-0.98 of it), 0.3-0.4 m to its landing in one frame (ankle-toe / knee-ankle 26-37 deg), or a late first step
 * left a foot planted far behind for the clip's whole stance (the pelvis sank to 21-27 cm). Starts after stands of 0.3 /
 * 0.5 / 0.8 / 1.5 s at 1.0 / 1.4 / 2.0 m/s, each over ten walk lengths (the gait phase at the stop), three starts a run:
 * in the 0.8 s after each start no bone turns more than 24 deg in a frame, the pelvis moves no more than the pace plus
 * 2 cm a frame and never sinks under 55 cm, and the planner drags no planted foot.
 */
import { describe, expect, it } from 'vitest';
import { setMocapLocomotion } from '../src/anim/mocap';
import { driveRig, plantSlide, pops, type Plan } from './helpers/mocapMeasure';

const SPEEDS = [1.0, 1.4, 2.0];
const STANDS = [0.3, 0.5, 0.8, 1.5];

describe('mocap switch: starts after a short stand (CHECK-2 required 3)', () => {
  it('no pop, pelvis drop or planted-foot drag in the start windows', async () => {
    const rows: string[] = [];
    setMocapLocomotion(true);
    try {
      for (const v of SPEEDS) {
        for (const stand of STANDS) {
          let step = 0;
          let where = '';
          let pel = 0;
          let low = 9;
          let drag = 0;
          let slide = 0;
          for (let w = 0; w < 10; w++) {
            const walk = 1.6 + w * 0.09;
            const cyc = walk + stand;
            // stand 0.5 s, then walk / stand cycles; recorded from 0.5 s
            const plan: Plan = (_k, t) => ({ speed: t < 1 ? 0 : (t - 1) % cyc < walk ? v : 0, yawRate: 0, rec: t > 0.5 });
            let dragged = 0;
            const R = await driveRig(Math.round(60 * (1 + cyc * 3)), plan, (rig) => {
              dragged = Math.max(dragged, rig.planner.L.slide, rig.planner.R.slide);
            });
            drag = Math.max(drag, dragged);
            slide = Math.max(slide, plantSlide(R, 0.01));
            const H = R.pos.hips;
            for (let r = 0; r < 3; r++) {
              // the start's frame in the record (recorded from frame 31), then 0.8 s
              const from = Math.round((1 + r * cyc) * 60) - 31;
              const to = Math.min(R.n, from + 48);
              const q = pops(R, from, to);
              if (q.maxStepDeg > step) {
                step = q.maxStepDeg;
                where = `walk ${walk.toFixed(2)} start ${r} ${q.bone}`;
              }
              for (let f = Math.max(1, from); f < to; f++) {
                const d = Math.hypot(H[f * 3]! - H[f * 3 - 3]!, H[f * 3 + 1]! - H[f * 3 - 2]!, H[f * 3 + 2]! - H[f * 3 - 1]!);
                pel = Math.max(pel, d - R.speed[f]! / 60);
                low = Math.min(low, H[f * 3 + 1]!);
              }
            }
          }
          rows.push(`${v} m/s after ${stand} s: bone step ${step.toFixed(1)} deg (${where}), pelvis beyond pace ${(pel * 100).toFixed(2)} cm, lowest hips ${(low * 100).toFixed(1)} cm, planner drag ${(drag * 100).toFixed(2)} cm, plant slide ${(slide * 100).toFixed(2)} cm`);
          const name = `${v} m/s after a ${stand} s stand`;
          // (was 26-37 deg after 0.3-0.5 s stands: the clip's late lift)
          expect(step, `${name}: bone step (${where})`).toBeLessThanOrEqual(24);
          // (bible 5.12.2, as tests/mocapSwitch.test.ts)
          expect(pel, `${name}: pelvis step beyond pace x dt`).toBeLessThanOrEqual(0.02);
          // (was 21-27 cm at 2.0 m/s: a foot pinned far behind for the clip's stance; switched off 46-79 cm)
          expect(low, `${name}: lowest pelvis`).toBeGreaterThan(0.55);
          expect(drag, `${name}: planner slide`).toBe(0);
          // (a clip landing's first planted frames at 2.0 m/s: 2.4-2.5 cm, 3.5-7.1 cm before this fix; 1.0 / 1.4 m/s 0.01)
          expect(slide, `${name}: planted ankle slide`).toBeLessThan(0.03);
        }
      }
    } finally {
      setMocapLocomotion(false);
    }
    console.info(rows.join(String.fromCharCode(10)));
    // (train build) all start sweeps; timed out once on a loaded desktop
  }, 300_000);
});
