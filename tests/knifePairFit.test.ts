/**
 * (piano-knife S2, brief item 8) The one measuring run for the knife rows on the real clips, only with KP_FIT=1 (about
 * 5 min: 4 rows x 56 rig runs). Per row:
 * - the attacker clip's window (lead, S2 part B): the move is `seconds` = the clip's own seconds clamped to 1.0-1.5 (A15)
 *   and plays the clip's window of that length at its own speed (share w = seconds / clip seconds), placed so the stab's
 *   full reach (`stabPhase`) lands at `contact`. The brief's rule (`contact` = `stabPhase` clamped to 0.35-0.55, the
 *   whole clip over `seconds`) carried over to the window: `contact` = the stab's time into the clip over `seconds`
 *   (stab / w) clamped to 0.35-0.55, the window from stab - contact x w (as much of the wind-up as the clamp allows);
 * - `limp` = min(contact + 0.35, 0.9); `victimFrom` 0, `victimTo` = min(`standsUntil(victim)`, 1);
 * - a grid `standoff` 0.25-0.60 step 0.05 x `side` -0.15-0.15 step 0.05 (56 runs), scored by the largest of the four
 *   contact maxima (`tests/helpers/knifePairRun.ts`); the lowest wins, a tie (within 0.5 mm) goes to the value nearer
 *   S1's (0.3 / -0.1; front 0.5 / 0).
 * Writes `build/mocap/knife-fit.json` and prints the table. The builder copies the winners into `KNIFE_KILLS` by hand
 * once; no second run (prototype mode).
 *
 * Always on: `stabPhase` / `standsUntil` on each row's clips are in range, and each row's window plays its clip at its
 * own speed.
 */
import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { runRow, stabPhase, standsUntil, worstContact, type RowResult } from './helpers/knifePairRun';
import { KNIFE_KILLS } from '../src/game/knifeKill';
import type { KeyedClip } from '../src/anim/keyed';
import { MOCAP_STABBING, MOCAP_STABBING_SECONDS } from '../src/anim/clips/mixamo/piano/stabbing';
import { MOCAP_STANDING_MELEE_ATTACK_DOWNWARD, MOCAP_STANDING_MELEE_ATTACK_DOWNWARD_SECONDS } from '../src/anim/clips/mixamo/piano/standing_melee_attack_downward';
import { MOCAP_FALLING_FORWARD_DEATH } from '../src/anim/clips/mixamo/piano/falling_forward_death';
import { MOCAP_DYING } from '../src/anim/clips/mixamo/piano/dying';
import { MOCAP_FALLING_BACK_DEATH } from '../src/anim/clips/mixamo/piano/falling_back_death';

// the knife's GLB is not loaded headless (the tip is the node's frame and `KNIFE_TIP`)
vi.mock('../src/weapons/weaponMesh', () => ({ loadWeaponMesh: () => false }));

const CLIPS: Record<string, KeyedClip | null> = {
  mocap_stabbing: MOCAP_STABBING,
  mocap_standing_melee_attack_downward: MOCAP_STANDING_MELEE_ATTACK_DOWNWARD,
  mocap_falling_forward_death: MOCAP_FALLING_FORWARD_DEATH,
  mocap_dying: MOCAP_DYING,
  mocap_falling_back_death: MOCAP_FALLING_BACK_DEATH,
};
/** The attacker clips' own seconds (the generated `_SECONDS`). */
const SECONDS: Record<string, number> = {
  mocap_stabbing: MOCAP_STABBING_SECONDS,
  mocap_standing_melee_attack_downward: MOCAP_STANDING_MELEE_ATTACK_DOWNWARD_SECONDS,
};

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/** A row's timing from its clips (pure): the window, contact, limp and victim span. */
function timing(row: number): { seconds: number; attackerFrom: number; attackerTo: number; contact: number; limp: number; victimFrom: number; victimTo: number; stab: number; stands: number } {
  const R = KNIFE_KILLS[row]!;
  const att = CLIPS[R.attacker]!;
  const vic = CLIPS[R.victim]!;
  const C = SECONDS[R.attacker]!;
  const seconds = r3(clamp(C, 1.0, 1.5));
  const w = seconds / C;
  const stab = stabPhase(att);
  let from = stab - clamp(stab / w, 0.35, 0.55) * w;
  if (from < 0) from = 0;
  if (from + w > 1) from = 1 - w;
  const attackerFrom = r3(from);
  const attackerTo = r3(from + w);
  const contact = r3(clamp((stab - attackerFrom) / (attackerTo - attackerFrom), 0.35, 0.55));
  const limp = r3(Math.min(contact + 0.35, 0.9));
  const stands = standsUntil(vic);
  return { seconds, attackerFrom, attackerTo, contact, limp, victimFrom: 0, victimTo: r3(Math.min(stands, 1)), stab, stands };
}

describe('piano-knife S2: the knife pair fit', () => {
  it('stabPhase / standsUntil on every row clip in range; each window plays its clip at its own speed', () => {
    for (const R of KNIFE_KILLS) {
      const att = CLIPS[R.attacker];
      const vic = CLIPS[R.victim];
      expect(att, R.attacker).toBeTruthy();
      expect(vic, R.victim).toBeTruthy();
      const s = stabPhase(att!);
      expect(s).toBeGreaterThanOrEqual(0.2);
      expect(s).toBeLessThanOrEqual(0.8);
      const u = standsUntil(vic!);
      expect(u).toBeGreaterThanOrEqual(0.05);
      expect(u).toBeLessThanOrEqual(1);
      // the window x the clip's own seconds = the move (within 2%: natural speed, not sped up)
      const C = SECONDS[R.attacker]!;
      expect(R.attackerFrom).toBeGreaterThanOrEqual(0);
      expect(R.attackerTo).toBeLessThanOrEqual(1);
      expect(Math.abs(((R.attackerTo - R.attackerFrom) * C) / R.seconds - 1)).toBeLessThan(0.02);
    }
  });

  it.skipIf(!process.env.KP_FIT)('KP_FIT=1: the one measuring run (window, contact, limp, victimTo, standoff x side)', async () => {
    const S1 = [
      { standoff: 0.3, side: -0.1 },
      { standoff: 0.3, side: -0.1 },
      { standoff: 0.3, side: -0.1 },
      { standoff: 0.5, side: 0 },
    ];
    const rows: unknown[] = [];
    const lines: string[] = [];
    for (let row = 0; row < KNIFE_KILLS.length; row++) {
      const R = KNIFE_KILLS[row]!;
      const T = timing(row);
      const base = { contact: T.contact, limp: T.limp, victimTo: T.victimTo, attackerFrom: T.attackerFrom, attackerTo: T.attackerTo };
      let best: { standoff: number; side: number; r: RowResult; score: number } | null = null;
      for (let i = 0; i <= 7; i++) {
        for (let j = 0; j <= 6; j++) {
          const standoff = r3(0.25 + i * 0.05);
          const side = r3(-0.15 + j * 0.05);
          const r = await runRow(row, { ...base, standoff, side });
          const score = worstContact(r);
          const near = (c: { standoff: number; side: number }): number => Math.abs(c.standoff - S1[row]!.standoff) + Math.abs(c.side - S1[row]!.side);
          if (!best || score < best.score - 0.0005 || (Math.abs(score - best.score) <= 0.0005 && near({ standoff, side }) < near(best))) best = { standoff, side, r, score };
        }
      }
      const b = best!;
      rows.push({ id: R.id, attacker: R.attacker, victim: R.victim, ...T, standoff: b.standoff, side: b.side, grip: r3(b.r.grip), tip: r3(b.r.tip), handR: r3(b.r.handR), handL: r3(b.r.handL), root: b.r.root, at: b.r.at });
      const cm = (v: number): string => (v * 100).toFixed(1);
      lines.push(`${R.id}\tsec ${T.seconds} win ${T.attackerFrom}-${T.attackerTo} (stab ${T.stab.toFixed(3)}) contact ${T.contact} limp ${T.limp} victimTo ${T.victimTo} (stands ${T.stands.toFixed(3)}) standoff ${b.standoff} side ${b.side} | grip ${cm(b.r.grip)} tip ${cm(b.r.tip)} handR ${cm(b.r.handR)} handL ${cm(b.r.handL)} cm (${b.r.at}) root ${(b.r.root * 1000).toFixed(2)} mm`);
    }
    const out = path.resolve('build/mocap/knife-fit.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), rows }, null, 2));
    console.info('(piano-knife S2) knife fit\n' + lines.join('\n'));
    expect(rows.length).toBe(KNIFE_KILLS.length);
  }, 3_600_000);
});
