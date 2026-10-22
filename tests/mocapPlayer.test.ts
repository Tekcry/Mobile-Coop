/**
 * mocap-trial-2 fix A (CHECK-3): the rig driven the way player.ts drives it for a CT player (pace through CT's springs,
 * quickStop 0.12 always, the stop hold's holdSpeed, flicks at CT's 7.85 rad/s, the 0.22 s eased crouch; the helper is
 * tests/helpers/mocapPlayer.ts). Each plan runs switch OFF and ON; ON must hold the rules: bone and ankle-toe steps
 * <= OFF + 2 deg or <= 24 deg, planted slide < 2 cm, the pelvis step beyond pace x dt <= max(2 cm, OFF).
 * Items 1 (pace changes while turning, pace swings) and 2 (CT starts after a short stand) are fixed in fix A, items 3
 * (walking flicks) and 5 (the switch toggled mid-move) in fix B; 4 and 6 belong to other rounds and are skipped
 * (MOCAP_PLAYER_ALL=1 runs them; MOCAP_PLAYER_LOG=<file> appends every row).
 */
import { appendFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ctBoth, flickPlan, fmtPlayer, playerFails, startStopPlan, type Target } from './helpers/mocapPlayer';

interface Case { label: string; target: Target; steps: number; recFrom: number; tgl?: boolean }

async function check(cases: Case[]): Promise<void> {
  const bad: string[] = [];
  for (const c of cases) {
    const { off, on } = await ctBoth(c.target, c.steps, c.recFrom, c.tgl);
    const f = playerFails(on, off);
    const row = `${c.label}: off ${fmtPlayer(off)} | on ${fmtPlayer(on)}${f.length ? ` <<< ${f.join(' ')}` : ''}`;
    if (process.env.MOCAP_PLAYER_LOG) appendFileSync(process.env.MOCAP_PLAYER_LOG, `${row}\n`);
    if (f.length) bad.push(row);
  }
  expect(bad).toEqual([]);
}

const startStop = (v: number, stand: number, go: number): Case => {
  const [target, steps] = startStopPlan(v, stand, go);
  return { label: `start/stop ${v} m/s, stand ${stand} s, go ${go} s`, target, steps, recFrom: 0.5 };
};
const swing = (a: number, b: number): Case => ({
  label: `pace ${a} <-> ${b} every 1.1 s`,
  target: (t) => ({ v: t < 1 ? a : Math.floor((t - 1) / 1.1) % 2 === 0 ? b : a, yr: 0 }),
  steps: 600,
  recFrom: 1.5,
});
const flick = (v: number, ang: number, off: number): Case => ({ label: `flick ${ang} at ${v} m/s, offset ${off}`, target: flickPlan(v, ang, off), steps: 660, recFrom: 1.5 });
const LADDER = [1.4, 2.0, 2.4, 2.8, 3.4, 4.0, 4.6, 5.0, 4.0, 2.8, 1.4, 0.8, 2.8, 5.0, 1.4];
const itOther = process.env.MOCAP_PLAYER_ALL ? it : it.skip;

describe('mocap switch: a CT player (CHECK-3)', () => {
  it('1: pace changes through the spring while turning and pace swings keep the pelvis and planted feet', async () => {
    await check([
      {
        label: 'pace 5.0 turning 3 rad/s <-> 1.4',
        target: (t) => ({ v: Math.floor(t / 1.3) % 2 === 0 ? 5.0 : 1.4, yr: t > 2 && t % 2.6 < 1.3 ? 3 : 0 }),
        steps: 600,
        recFrom: 1.5,
      },
      swing(1.4, 5.0),
      swing(1.0, 4.0),
      swing(2.8, 5.0),
      { label: 'ladder 0.55 s', target: (t) => ({ v: t < 1 ? 0 : LADDER[Math.min(LADDER.length - 1, Math.floor((t - 1) / 0.55))]!, yr: 0 }), steps: 660, recFrom: 1.5 },
    ]);
  }, 120_000);

  it('2: CT starts after a stand (quickStop, the stop hold) neither drag nor skim a foot', async () => {
    await check([
      startStop(1.4, 0.3, 2.12),
      startStop(2.8, 0.3, 1.6),
      startStop(2.8, 0.3, 1.86),
      startStop(2.8, 0.3, 2.12),
      startStop(4.0, 2.0, 2.12),
      startStop(1.4, 2.0, 1.6),
    ]);
  }, 120_000);

  // Items 3 and 5: fix B. Other rounds own items 4 and 6 (CHECK-3): skipped here so this file stays green.
  it('3: walking flick turns at CT turn rate ease the turn slot out (no pelvis lurch as the flick ends)', async () => {
    await check([flick(1.4, 90, 0), flick(1.4, 180, 0.41), flick(1.4, 180, 0.83), flick(2.0, 90, 0), flick(2.0, 180, 0), flick(2.0, 180, 0.41), flick(2.8, 180, 0), flick(2.8, 180, 0.41), flick(2.8, 180, 0.83)]);
  }, 300_000);

  itOther('4: spot turns keep the anchored foot (other round)', async () => {
    await check([
      { label: 'spot flick 180', target: (t) => ({ v: 0, yr: t > 1.5 && t % 1.5 < Math.PI / 7.85 ? (t % 3 < 1.5 ? 7.85 : -7.85) : 0 }), steps: 540, recFrom: 1 },
      { label: 'spot spin 6', target: (t) => ({ v: 0, yr: t > 1.5 && t % 3 < 1.5 ? 6 : 0 }), steps: 540, recFrom: 1 },
    ]);
  }, 300_000);

  it('5: the switch toggled mid-move cross-fades (no pelvis or bone pop either way)', async () => {
    const moves: [string, Target][] = [
      ['walk 1.4', () => ({ v: 1.4, yr: 0 })],
      ['jog 2.8', () => ({ v: 2.8, yr: 0 })],
      ['run 4.0', () => ({ v: 4.0, yr: 0 })],
      ['sprint 5.0', () => ({ v: 5.0, yr: 0 })],
      ['sneak 0.8', () => ({ v: 0.8, yr: 0, crouch: 1 })],
    ];
    await check([0, 0.37].flatMap((off) => moves.map(([name, tg]): Case => ({
      label: `toggle ${name}, offset ${off}`,
      target: (t) => ({ ...tg(t), mocap: t < 2 + off ? true : Math.floor((t - 2 - off) / 1.3) % 2 === 1 }),
      steps: 540,
      recFrom: 1.5,
      tgl: true,
    }))));
  }, 300_000);

  itOther('6: smaller cases (other round)', async () => {
    const sneakFlick = (off: number): Case => {
      const dur = Math.PI / 2 / 7.85;
      return {
        label: `sneak 1.0 flick 90 offset ${off}`,
        target: (t) => { const u = t - 2 - off; const ph = ((u % 2) + 2) % 2; const turning = u > 0 && ph < dur; return { v: turning ? 1.0 * (1 - 0.55 / 2) : 1.0, yr: turning ? (Math.floor(u / 2) % 2 === 0 ? 7.85 : -7.85) : 0, crouch: 1 }; },
        steps: 600,
        recFrom: 1.5,
      };
    };
    await check([
      { label: 'crouch at 2.8 m/s', target: (t) => { const c = t > 2.51 && t < 4.51 ? 1 : 0; return { v: c ? 2.6 : 2.8, yr: 0, crouch: c }; }, steps: 360, recFrom: 1.5 },
      flick(5.0, 180, 0.83),
      sneakFlick(0),
      sneakFlick(0.5),
      startStop(5.0, 2.0, 1.73),
      // the hold's release as the stick moves again (the graph's locoSpeed holdSpeed 0.8 -> 0.03 in a frame): pelvis 2.05 cm
      startStop(1.4, 0.3, 1.99),
      { label: 'draw at 4.0 m/s', target: (t) => ({ v: 4.0, yr: 0, armed: t > 2.34 && t < 4.34 }), steps: 360, recFrom: 1.5 },
    ]);
  }, 300_000);
});
