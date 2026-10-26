/**
 * (sector-redesign gear, guard-ai S11 data) Saltmarsh Park gear tags and response-team sweep points: S1-S3 carry no gear,
 * S4 / S5 put body armour on the NOC pair + security supervisor (S4) and the response team + token room officers (S5)
 * (guard-rules S1, A15: no helmet tags, no section gear: helmets come from the difficulty and the stage), shield-led
 * response teams in S4 / S5 only (A4), no dog has gear, every section passes `validateGuardAi` and `checkSectorGuards`,
 * and every sweep point is on the runtime nav grid (ground storey) and reachable from the section's reinforce entry.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../src/world/levelBuilder';
import { campusOps } from '../src/world/maps/campusOps';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { validateGuardAi } from '../src/ai/guardAiData';
import { checkSectorGuards } from '../src/game/sectors';
import { WAREHOUSE_SECTORS } from '../src/world/maps/warehouseSectors';
import type { GearGuard } from '../src/world/maps/campusS4Data';
import { runtimeNav } from './helpers/runtimeNav';

const b = new LevelBuilder();
const lay = campusOps.build(b, 0);
const nav = runtimeNav(b, lay.playerSpawns[0]!.pos, campusOps.navLayers ?? 3, lay.navSeeds ?? []);

const guardsOf = (s: number): GearGuard[] => CAMPUS_SECTORS[s]!.guards;
const both = (s: number, role: string, zone?: string): number[] =>
  guardsOf(s).flatMap((g, i) => (g.role === role && (zone === undefined || g.zone === zone) ? [i] : []));

describe('campus gear tags', () => {
  it('S1-S3 have no gear anywhere', () => {
    for (let s = 0; s < 3; s++) {
      expect(CAMPUS_SECTORS[s]!.gear).toBeUndefined();
      for (const g of guardsOf(s)) expect(g.gear).toBeUndefined();
    }
  });

  it('S4: no section gear; the NOC pair and the security room supervisor wear armour', () => {
    expect(CAMPUS_SECTORS[3]!.gear).toBeUndefined();
    const noc = both(3, 'noc');
    const sup = both(3, 'supervisor', 'sec');
    expect(noc).toHaveLength(2);
    expect(sup).toHaveLength(1);
    const expected = new Set([...noc, ...sup]);
    guardsOf(3).forEach((g, i) => expect(g.gear, `S4 #${i + 1}`).toBe(expected.has(i) ? 'armour' : undefined));
  });

  it('S5: no section gear; the response team and the token room officers wear armour', () => {
    expect(CAMPUS_SECTORS[4]!.gear).toBeUndefined();
    const team = both(4, 'response');
    const token = both(4, 'posted', 'token');
    expect(team).toHaveLength(4);
    expect(token).toHaveLength(2);
    const expected = new Set([...team, ...token]);
    guardsOf(4).forEach((g, i) => expect(g.gear, `S5 #${i + 1}`).toBe(expected.has(i) ? 'armour' : undefined));
  });

  it('(guard-rules S1, A15) no helmet tag anywhere; every section passes checkSectorGuards', () => {
    for (let s = 0; s < CAMPUS_SECTORS.length; s++) {
      const sec = CAMPUS_SECTORS[s]!;
      expect(sec.gear === 'helmet' || sec.gear === 'both', `section ${s + 1}`).toBe(false);
      for (const g of guardsOf(s)) expect(g.gear === 'helmet' || g.gear === 'both', `section ${s + 1}`).toBe(false);
      expect(checkSectorGuards(sec), `section ${s + 1}`).toEqual([]);
    }
  });

  it('(guard-rules S1, A4) shield-led response teams in S4 / S5 only; warehouseOps none', () => {
    expect(CAMPUS_SECTORS.map((s) => s.shieldTeams === true)).toEqual([false, false, false, true, true]);
    for (const s of WAREHOUSE_SECTORS) expect(s.shieldTeams, s.id).toBeUndefined();
  });

  it('no dog has gear', () => {
    for (let s = 0; s < CAMPUS_SECTORS.length; s++) for (const g of guardsOf(s)) if (g.kind === 'dog') expect(g.gear).toBeUndefined();
  });

  it('validateGuardAi passes for every campus section', () => {
    const n = CAMPUS_SECTORS.length;
    for (let s = 0; s < n; s++) expect(validateGuardAi({}, guardsOf(s), { sections: n, section: s }), `section ${s + 1}`).toEqual([]);
  });
});

describe('campus sweep points', () => {
  for (const s of [3, 4]) {
    const sec = CAMPUS_SECTORS[s]!;
    it(`S${s + 1}: 4-6 sweep points, on the ground-storey nav grid and reachable from the reinforce entry`, () => {
      const sweep = sec.sweep ?? [];
      expect(sweep.length).toBeGreaterThanOrEqual(4);
      expect(sweep.length).toBeLessThanOrEqual(6);
      const bad: string[] = [];
      for (const [x, z] of sweep) {
        const c = nav.cellOf(x, z, 0);
        if (c < 0 || !nav.isWalkable(c) || Math.abs(nav.heightAt(x, z, 0)) > 0.6) {
          bad.push(`${x},${z} not walkable on the ground`);
          continue;
        }
        for (const [rx, rz] of sec.reinforce) if (!nav.findPath([rx, rz], [x, z], 200000, 0, 0)) bad.push(`${x},${z} unreachable from reinforce ${rx},${rz}`);
      }
      expect(bad).toEqual([]);
    });
  }

  it('S1-S3 have no sweep override', () => {
    for (let s = 0; s < 3; s++) expect(CAMPUS_SECTORS[s]!.sweep).toBeUndefined();
  });
});
