/**
 * guard-render S3a: the fit sweep behind the movement tables in `src/ai/guardHead.ts` (reproducible; off by default).
 * `GUARD_HEAD_SWEEP=1 GUARD_HEAD_OUT=<file> npx vitest run tests/guardHeadSweep.test.ts` runs the rig through the
 * sweep cases (the same harness as the parity test) and writes one line per sampled frame: case, kind, time, the rig
 * head, the sim head and the sim's still stance (speed 0) root-local (side, up, forward, m), and the sim input (speed, moveX, moveZ, phase, crouch, aim,
 * aim pitch, wall side, lean, lean drop, motion state). `scripts/guard-head-fit.mjs <file>` fits the tables from it.
 */
import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { ARMED, COVER, FREE, run, setup, walk, type Env, type Kind, type Sc } from './helpers/guardHeadHarness';

const ON = process.env.GUARD_HEAD_SWEEP === '1';

/** Moving along the wall, facing held, at `speed` in local direction `deg`; `peek` the raw lean. */
function wallSweep(ws: number, peek: number, deg: number, speed: number): Sc {
  return {
    id: `wall ws ${ws} peek ${peek} dir ${deg} sp ${speed}`,
    tier: 2,
    kinds: COVER,
    settle: Number(process.env.GUARD_HEAD_SETTLE ?? 1.5),
    len: Number(process.env.GUARD_HEAD_LEN ?? 1.5),
    step: (c) => {
      c.wall = true;
      c.wallSide = ws;
      c.peek = peek;
      c.aim = 1;
      walk(c, deg, speed, true);
    },
  };
}

/** Moving free (off a wall) in local direction `deg` at `speed`, facing held when `face` (aim `aim`). */
function freeSweep(deg: number, speed: number, aim: number, face: boolean, crouch: number): Sc {
  return {
    id: `free dir ${deg} sp ${speed} aim ${aim} face ${face ? 1 : 0} crouch ${crouch}`,
    tier: 1,
    kinds: aim >= 0.5 ? ARMED : FREE,
    settle: Number(process.env.GUARD_HEAD_SETTLE ?? 1.5),
    len: Number(process.env.GUARD_HEAD_LEN ?? 1.5),
    step: (c) => {
      c.aim = aim;
      c.wantCrouch = crouch;
      walk(c, deg, speed, face);
    },
  };
}

/** `GUARD_HEAD_CASES`: 'wall' (default), 'free'. */
function cases(): Sc[] {
  const out: Sc[] = [];
  if (process.env.GUARD_HEAD_CASES === 'free') {
    for (const deg of [0, 30, 50, 70, 90, 120, 150, 180, -90, -135])
      for (const sp of [0.4, 0.75, 0.9, 1.3])
        for (const aim of [0.2, 1]) out.push(freeSweep(deg, sp, aim, deg !== 0, 0));
    return out;
  }
  // the wall: lean 0 and the lean away from the wall side (the only lean the game gives), every direction relative to the
  // wall side (`thr` = the local direction times the wall side's sign) of `WALL_TH`, the speeds of `WALL_SP`
  for (const ws of [-1, 1])
    for (const peek of [0, -ws])
      for (const thr of [-180, -150, -120, -90, -70, -50, -30, 0, 30, 50, 70, 90, 120, 150, 180])
        for (const sp of [0.3, 0.6, 0.9, 1.3]) out.push(wallSweep(ws, peek, thr * ws, sp));
  return out;
}

describe.runIf(ON)('guard head fit sweep (GUARD_HEAD_SWEEP=1)', () => {
  it('writes the sweep', async () => {
    const env: Env = await setup();
    const lines: string[] = ['case\tkind\tt\trs\tru\trf\tss\tsu\tsf\tbs\tbu\tbf\tspeed\tmx\tmz\tphase\tcrouch\taim\tpitch\tws\tlean\tdrop\tstate'];
    const random = Math.random;
    try {
      for (const sc of cases()) {
        for (const kind of sc.kinds as readonly Kind[]) {
          let seed = 12345;
          Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
          run(kind, 0.7, sc, env, (fr) => {
            const i = fr.inp;
            const f = (v: number): string => v.toFixed(4);
            lines.push([sc.id, kind, f(fr.t), ...fr.rig.map(f), ...fr.sim.map(f), ...fr.base.map(f), f(i.speed), f(i.moveX), f(i.moveZ), f(i.phase), f(i.crouch), f(i.aim), f(i.aimPitch), String(i.wallSide), f(i.lean), f(i.leanDrop), fr.state].join('\t'));
          });
        }
      }
    } finally {
      Math.random = random;
    }
    writeFileSync(process.env.GUARD_HEAD_OUT ?? 'guard-head-sweep.tsv', `${lines.join('\n')}\n`);
  }, 600000);
});
