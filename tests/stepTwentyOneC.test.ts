import { describe, expect, it } from 'vitest';
import { sample } from '../src/anim/clip';
import { BRISK, CROUCH_RUN, DASH, JOG, WALK } from '../src/anim/clips/locomotion';
import { emptyPlannerInput, FootPlanner } from '../src/anim/footPlanner';

// (locomotion step 21, D2 / D5.6, A80)
describe('step 21: one low / one high per step, head travel <= pelvis', () => {
  it('gait clips hold their pelvis and head pitch through the cycle (no nod in phase with the loading dip)', () => {
    for (const c of [WALK, BRISK, JOG, DASH, CROUCH_RUN]) {
      for (const ch of ['pelPitch', 'hdPitch'] as const) {
        const v0 = sample(c, ch, 0);
        for (let t = 0; t < 1; t += 0.05) expect(Math.abs(sample(c, ch, t) - v0), `${c.name} ${ch} @${t}`).toBeLessThan(1e-6);
      }
    }
  });

  it('the toe-off pitch eases in: the lift frame turns the foot by < 15 deg (was 26 deg)', () => {
    const p = new FootPlanner();
    const i = emptyPlannerInput();
    const dt = 1 / 60;
    i.dt = dt;
    i.duty = 0.6;
    i.cycleTime = 1;
    i.liftH = 0.06;
    let x = 0;
    let worst = 0;
    let prevL = 0;
    let prevR = 0;
    for (let f = 0; f < 240; f++) {
      i.moving = f > 10;
      i.velZ = i.moving ? 1.3 : 0;
      x += i.velZ * dt;
      i.rootZ = x;
      i.phase = ((f * dt) / i.cycleTime) % 1;
      p.update(i);
      if (f > 12) worst = Math.max(worst, Math.abs(p.L.pitch - prevL), Math.abs(p.R.pitch - prevR));
      prevL = p.L.pitch;
      prevR = p.R.pitch;
    }
    expect(worst).toBeLessThan((15 * Math.PI) / 180);
  });
});
