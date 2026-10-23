/**
 * guard-render S3a: the fit sweep behind the movement tables in `src/ai/guardHead.ts` (reproducible; off by default).
 * `GUARD_HEAD_SWEEP=1 GUARD_HEAD_OUT=<file> npx vitest run tests/guardHeadSweep.test.ts` runs the rig through the
 * sweep cases (the same harness as the parity test) and writes one line per sampled frame: case, kind, time, the rig
 * head, the sim head and the sim's still stance (speed 0) root-local (side, up, forward, m), and the sim input (speed,
 * moveX, moveZ, phase, crouch, aim, aim pitch, wall side, lean, lean drop, motion state). `GUARD_HEAD_CASES` picks the
 * sweep ('wall', 'free', 'hostage'); `scripts/guard-head-fit.mjs <mode> <files>` fits the tables from it (the commands
 * are in the header of `src/ai/guardHead.ts`).
 */
import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { ALL_ARMED, COVER, FREE, run, setup, walk, type Env, type Kind, type Sc } from './helpers/guardHeadHarness';

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

/** Moving free (off a wall) in local direction `deg` at `speed` (capped at the kind's run speed), facing held off
 *  straight ahead (the look walk, the aimed strafe / backpedal), at aim `aim` and aim pitch `pitch`, crouch 0 / 1. */
/** The pace a free case asks for (a kind runs it capped at its run speed; a capped repeat is skipped). */
const PACE = new Map<Sc, number>();

function freeSweep(kinds: readonly Kind[], deg: number, speed: number, aim: number, pitch: number, crouch: number): Sc {
  const sc: Sc = {
    id: `free dir ${deg} sp ${speed} aim ${aim} pitch ${pitch} crouch ${crouch}`,
    tier: 1,
    kinds,
    settle: Number(process.env.GUARD_HEAD_SETTLE ?? 3),
    len: Number(process.env.GUARD_HEAD_LEN ?? 1.5),
    step: (c, _t, d) => {
      c.aim = aim;
      c.aimPitch = pitch;
      c.wantCrouch = crouch;
      walk(c, deg, Math.min(speed, d.runSpeed), deg !== 0);
    },
  };
  PACE.set(sc, speed);
  return sc;
}

/** The free sweep: every `MOVE` class (AF0 / AF1 / AV0 / AV1 / DF / DV / NF0 / NF1 / NV0 / NV1 in `src/ai/guardHead.ts`).
 *  Armed kinds at the game's aim levels 0.2 / 0.4 (the weapon low: the facing stride ahead, the velocity stride
 *  sideways and back, the dash near the run speed), 0.7 / 1 (the velocity stride), aim 1 also at pitch -0.3 / 0.3; the
 *  melee runner (aim 0); standing at the standing speed knots, crouched at the crouched ones. Both sides. */
function freeCases(): Sc[] {
  const out: Sc[] = [];
  const dirs = [0, 30, -30, 50, -50, 70, -70, 90, -90, 120, -120, 150, -150, 180];
  const spW = [0.15, 0.4, 0.7, 1, 1.4, 1.8, 2.2, 2.8, 3.4, 4.2];
  const spC = [0.15, 0.4, 0.7, 1, 1.4];
  for (const crouch of [0, 1]) {
    const sps = crouch ? spC : spW;
    for (const deg of dirs)
      for (const sp of sps) {
        for (const aim of [0.2, 0.4, 0.7, 1]) out.push(freeSweep(ALL_ARMED, deg, sp, aim, 0, crouch));
        out.push(freeSweep(['runner'], deg, sp, 0, 0, crouch));
      }
    for (const deg of dirs)
      for (const sp of crouch ? [0.4, 1] : [0.4, 1, 1.8])
        for (const pitch of [-0.3, 0.3]) out.push(freeSweep(ALL_ARMED, deg, sp, 1, pitch, crouch));
  }
  return out;
}

/** A hostage walked by the operator (`Enemy.holdAt`) along local `deg` at `speed`. */
function hostageSweep(deg: number, speed: number): Sc {
  return {
    id: `hostage dir ${deg} sp ${speed}`,
    tier: 2,
    kinds: FREE,
    settle: Number(process.env.GUARD_HEAD_SETTLE ?? 1.5),
    len: Number(process.env.GUARD_HEAD_LEN ?? 1.5),
    held: 'hostage',
    heldMove: { deg, speed },
    step: () => {},
  };
}

/** `GUARD_HEAD_CASES`: 'wall' (default), 'free', 'hostage'. */
function cases(): Sc[] {
  const out: Sc[] = [];
  if (process.env.GUARD_HEAD_CASES === 'hostage') {
    for (const deg of [0, 30, 60, 90, 120, 150, 180, -90])
      for (const sp of [0.15, 0.3, 0.6, 0.9, 1.2, 1.6]) out.push(hostageSweep(deg, sp));
    return out;
  }
  if (process.env.GUARD_HEAD_CASES === 'free') return freeCases();
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
    let env: Env = await setup();
    let built = 0;
    const lines: string[] = ['case\tkind\tt\trs\tru\trf\tss\tsu\tsf\tbs\tbu\tbf\tspeed\tmx\tmz\tphase\tcrouch\taim\tpitch\tws\tlean\tdrop\tstate'];
    const random = Math.random;
    /** `GUARD_HEAD_EVERY`: write every n-th sampled frame (default 1). */
    const every = Number(process.env.GUARD_HEAD_EVERY ?? 1);
    const done = new Set<string>();
    try {
      // `GUARD_HEAD_PART=i/n`: only every n-th case from the i-th (0-based; one vitest per part keeps the heap small)
      const [pi, pn] = (process.env.GUARD_HEAD_PART ?? '0/1').split('/').map(Number);
      for (const sc of cases().filter((_, i) => i % pn! === pi)) {
        for (const kind of sc.kinds as readonly Kind[]) {
          const pace = PACE.get(sc);
          if (pace !== undefined) {
            // a pace over the kind's run speed runs at the run speed: once per kind
            const run0 = env.ENEMIES[kind].runSpeed;
            const key = `${kind} ${sc.id.replace(/ sp [d.]+/, ` sp ${Math.min(pace, run0)}`)}`;
            if (done.has(key)) continue;
            done.add(key);
          }
          // a fresh scene every 100 rigs (the part library keeps what the disposed rigs used)
          if (++built % 100 === 0) {
            const eng = env.scene.getEngine();
            env.scene.dispose();
            eng.dispose();
            env = await setup();
          }
          let nf = 0;
          let seed = 12345;
          Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
          run(kind, 0.7, sc, env, (fr) => {
            if (nf++ % every !== 0) return;
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
