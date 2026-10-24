/**
 * Tallow Wharf GB5: the sector data (`tallowWharfSectors.ts`) and the two missions (`tallowWharfMissions.ts`). The sector and code
 * checks are clean; each mission passes `checkMission` with the guards and talkers; the missions match their graph files (ids,
 * kinds, edges, facts, texts, rules, start, sections); guards sit in their section boxes on walkable floor; starts, checkpoints
 * and extraction are in their boxes on a surface; the bolts sit on the sections' doors; every non-climb leg of every route has a
 * path on the guards' runtime nav grid; the runner opens `tgc-2` from the two intel flags.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MISSION } from '../../src/game/mission/missionDef';
import { checkMission, missionSpawnsGuard, type MissionDef } from '../../src/game/mission/missionDef';
import { MissionRunner } from '../../src/game/mission/missionRunner';
import { sectorGuardIds, sectorGuardTalkers } from '../../src/game/mission/sectorMission';
import { checkSectorCodes, checkSectors, INTEL_LINE_MAX, onBoltSide, SECTOR, type PlanBox, type SectorDef } from '../../src/game/sectors';
import { inRoom } from '../../src/world/rooms';
import { tallowWharf } from '../../src/world/maps/tallowWharf';
import { WHARF_GUARD_EXTRAS, WHARF_GUARD_MISSIONS, WHARF_SECTORS } from '../../src/world/maps/tallowWharfSectors';
import { THREE_GREY_COATS, TWO_KEY_LEDGER, WHARF_MISSIONS } from '../../src/world/maps/tallowWharfMissions';
import { W1 } from '../../src/world/maps/tallowWharfW1';
import { W2, W2_ROTA_DESK } from '../../src/world/maps/tallowWharfW2';
import { W3, W3_KEY_POSTS } from '../../src/world/maps/tallowWharfW3';
import { W4 } from '../../src/world/maps/tallowWharfW4';
import { SECTION_BOX, type WharfSection } from '../../src/world/maps/tallowWharfKit';
import { downCast, runtimeNav } from '../helpers/runtimeNav';
import { builtWharf, GRAPH, solidOf } from './helpers';

const SECTIONS: readonly WharfSection[] = [W1, W2, W3, W4];
const guards = sectorGuardIds(WHARF_SECTORS);
const talkers = sectorGuardTalkers(WHARF_SECTORS);

interface GraphObjective {
  id: string;
  section: string;
  kind: string;
  after?: string[];
  gives?: string;
  needs?: string;
  twist?: boolean;
  optional?: { reward: string };
  text: string;
  hint: string;
}
interface MissionGraph {
  mission: { id: string; sections: string[]; start: string };
  objectives: GraphObjective[];
  rules: { kind: string; scope: string; step?: string; text: string }[];
}
const graphOf = (dir: string): MissionGraph => JSON.parse(readFileSync(new URL(`../../docs/missions/prototypes/${dir}/graph.json`, import.meta.url), 'utf8')) as MissionGraph;

/** The two graph hints over the 90-character limit (`checkMission`), trimmed in the mission data; every other hint is the graph's, character for character. */
const TRIMMED_HINTS: Record<string, string> = {
  'tgc-5': 'The boat waits at the jetty under the crane. The gangway is the quiet way aboard.',
  'tkl-4': 'Coal chute, strongroom passage: one boosts, the other crawls out and unbars the yard door.',
};

/** Walkable links the graph makes no room of (the section files' deviations): the warden stair core, the W2 lane landing, the W3 coal-yard vestibule and fire escape, the W4 apron and jetty steps. */
const LINKS: Record<string, [number, number, number, number][]> = {
  W1: [[6, 44, 8, 46]],
  W2: [[76, 62, 82, 70]],
  W3: [[98, 50, 99.9, 51.7], [100, 49, 108, 52.5]],
  W4: [[72, 28, 100, 30], [84, 5, 96, 6]],
};

const inBox = (box: readonly number[], x: number, z: number): boolean => x >= Math.min(box[0]!, box[2]!) && x <= Math.max(box[0]!, box[2]!) && z >= Math.min(box[1]!, box[3]!) && z <= Math.max(box[1]!, box[3]!);

/** The solid (collide, unturned) piece holding the point (x, y, z), or null: the plain-box probe the section tests use for walls. */
function solidAt(x: number, y: number, z: number): string | null {
  const p = solidOf(builtWharf().b).find((q) => Math.abs(x - q.c[0]) < q.s[0] / 2 && Math.abs(y - q.c[1]) < q.s[1] / 2 && Math.abs(z - q.c[2]) < q.s[2] / 2);
  return p ? `box (${p.c.map((v) => v.toFixed(2)).join(', ')}) size (${p.s.map((v) => v.toFixed(2)).join(', ')})` : null;
}

/** The angle (rad, 0..PI) between a facing yaw and the bearing from (x, z) to (tx, tz). */
function offFacing(x: number, z: number, yaw: number, tx: number, tz: number): number {
  const d = Math.atan2(tx - x, tz - z) - yaw;
  return Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
}

describe('tallowWharf sectors: the data checks', () => {
  it('checkSectors and checkSectorCodes are clean', () => {
    expect(checkSectors(WHARF_SECTORS)).toEqual([]);
    expect(checkSectorCodes(WHARF_SECTORS)).toEqual([]);
  });

  it('the sections are the graph sections in order, with the map wired to them', () => {
    expect(WHARF_SECTORS.map((s) => s.id)).toEqual(GRAPH.meta.sections);
    expect(tallowWharf.sectors).toBe(WHARF_SECTORS);
    expect(tallowWharf.missions).toBe(WHARF_MISSIONS);
    expect(tallowWharf.unlisted).toBe(true);
  });

  it('every intel line fits the co-op feed; the code flags are the graph steps\' flags', () => {
    for (const s of WHARF_SECTORS) for (const n of s.intel ?? []) expect(n.line.length, `${s.id} ${n.grants}`).toBeLessThanOrEqual(INTEL_LINE_MAX);
    const grants = WHARF_SECTORS.flatMap((s) => (s.intel ?? []).map((n) => n.grants));
    expect(grants.sort()).toEqual(['tgc-1', 'tgc-opt', 'tgc-tally', 'tgc-tea', 'tkl-4-yard', 'tkl-gate-code', 'tkl-opt']);
  });

  it('perStage 2 everywhere; dogs 1 in W3 and W4; the pair gate uses W3_KEY_POSTS; the keypad is the east gate', () => {
    for (const s of WHARF_SECTORS) expect(s.perStage).toBe(2);
    expect(WHARF_SECTORS.map((s) => s.dogs ?? 0)).toEqual([0, 0, 1, 1]);
    const w3 = WHARF_SECTORS[2]!;
    const g = w3.pairGates![0]!;
    expect(g.a.at).toEqual([W3_KEY_POSTS.east[0], W3_KEY_POSTS.east[2]]);
    expect(g.b.at).toEqual([W3_KEY_POSTS.west[0], W3_KEY_POSTS.west[2]]);
    expect(g.door).toEqual([W3.doors['w3-strongroom']![0], W3.doors['w3-strongroom']![2]]);
    expect(w3.keypads![0]).toEqual({ at: [W3.doors['w3-east-gate']![0], W3.doors['w3-east-gate']![2]], code: 'tkl-gate-code' });
    expect(w3.connector!.nearAt).toEqual([W3.doors['w3-conn-near']![0], W3.doors['w3-conn-near']![2]]);
  });
});

describe('tallowWharf missions: against the graph files', () => {
  for (const [def, dir] of [[THREE_GREY_COATS, 'three-grey-coats'], [TWO_KEY_LEDGER, 'two-key-ledger']] as [MissionDef, string][]) {
    const g = graphOf(dir);
    describe(def.id, () => {
      it('checkMission passes with the guards and the talkers', () => {
        expect(checkMission(def, guards, talkers)).toEqual([]);
        expect(checkMission(def, guards)).toEqual([]);
      });

      it('id, sections and start match the graph; the briefing has the five lines', () => {
        expect(def.id).toBe(g.mission.id);
        expect(def.sections).toEqual(g.mission.sections);
        expect(def.start).toBe(g.mission.start === 'w1-canal-steps' ? 'W1' : 'W2');
        expect(def.mode).toBe('campaign');
        expect(def.players).toEqual([2]);
        expect(def.briefing).toHaveLength(5);
      });

      it('steps match the graph objectives (ids, kinds, edges, facts, twist, optional, text, hint)', () => {
        expect(def.steps.map((s) => s.id)).toEqual(g.objectives.map((o) => o.id));
        for (const o of g.objectives) {
          const s = def.steps.find((q) => q.id === o.id)!;
          expect(s.section, o.id).toBe(o.section);
          expect(s.kind, o.id).toBe(o.kind);
          expect(s.after, o.id).toEqual(o.after);
          expect(s.gives, o.id).toBe(o.gives);
          expect(s.needs, o.id).toBe(o.needs);
          expect(s.twist, o.id).toBe(o.twist);
          expect(s.optional?.reward, o.id).toBe(o.optional?.reward);
          expect(s.text, o.id).toBe(o.text);
          expect(s.hint, o.id).toBe(TRIMMED_HINTS[o.id] ?? o.hint);
          expect(s.team, o.id).toBe('all');
        }
      });

      it('rules match the graph (kind, scope, step, text)', () => {
        expect(def.rules.map((r) => ({ kind: r.kind, scope: r.scope, step: r.step, text: r.text }))).toEqual(g.rules.map((r) => ({ kind: r.kind, scope: r.scope, step: r.step, text: r.text })));
      });

      it('every text, hint and briefing line is at most the mission limit', () => {
        for (const s of def.steps) {
          expect(s.text.length).toBeLessThanOrEqual(MISSION.textMax);
          expect(s.hint!.length).toBeLessThanOrEqual(MISSION.textMax);
        }
        for (const l of def.briefing) expect(l.length).toBeLessThanOrEqual(90);
      });
    });
  }

  it('Three Grey Coats: W3 is crossed with no step and no guards; the twist guards are tagged', () => {
    expect(THREE_GREY_COATS.steps.some((s) => s.section === 'W3')).toBe(false);
    expect(THREE_GREY_COATS.guards!.find((e) => e.section === 'W3')!.slots).toEqual([]);
    const w4 = WHARF_SECTORS[3]!;
    expect([4, 5].map((k) => w4.guards[k]!.zone)).toEqual(['tgc-minders', 'tgc-minders']);
    expect(THREE_GREY_COATS.steps.find((s) => s.id === 'tgc-4')!.events![0]!.guardTag).toBe('tgc-minders');
  });

  it('Two-Key Ledger: starts at W2; the lodge porter is tagged for the telltale', () => {
    expect(TWO_KEY_LEDGER.start).toBe('W2');
    expect(WHARF_SECTORS[2]!.guards[2]!.zone).toBe('w3-lodge-porter');
    expect(TWO_KEY_LEDGER.steps.find((s) => s.id === 'tkl-3')!.events![0]!.guardTag).toBe('w3-lodge-porter');
    expect(TWO_KEY_LEDGER.steps.find((s) => s.id === 'tkl-3')!.window).toBe(1.0);
  });
});

describe('tallowWharf guards', () => {
  it('counts: W1 9, W2 10, W3 10, W4 12; the graph\'s sums plus the listed extras', () => {
    expect(WHARF_SECTORS.map((s) => s.guards.length)).toEqual([9, 10, 10, 12]);
    const sums: Record<string, number> = { W1: 0, W2: 0, W3: 0, W4: 0 };
    for (const sp of GRAPH.spaces) {
      const gs = (sp as unknown as { guards?: Record<string, number> }).guards;
      if (gs) sums[sp.section] = (sums[sp.section] ?? 0) + (gs['2'] ?? 0);
    }
    const extra = (id: string): number => WHARF_GUARD_EXTRAS.filter((e) => e.id.startsWith(id + ':')).length;
    for (const s of WHARF_SECTORS) {
      expect(s.guards.length, s.id).toBe(sums[s.id]! + extra(s.id));
      for (const e of WHARF_GUARD_EXTRAS) expect(guards.has(e.id), e.id).toBe(true);
    }
  });

  it('each mission spawns at most Sector Ops\' 32 live guards: Three Grey Coats 30, Two-Key Ledger 27', () => {
    const live = (m: MissionDef): number => [...guards].filter((id) => missionSpawnsGuard(m, id)).length;
    expect(live(THREE_GREY_COATS)).toBe(30);
    expect(live(TWO_KEY_LEDGER)).toBe(27);
    for (const m of [THREE_GREY_COATS, TWO_KEY_LEDGER]) expect(live(m)).toBeLessThanOrEqual(SECTOR.maxAlive);
    // the data and the mission lists agree
    for (const [id, m] of [['threeGreyCoats', THREE_GREY_COATS], ['twoKeyLedger', TWO_KEY_LEDGER]] as const) {
      for (const e of m.guards!) {
        const want = WHARF_GUARD_MISSIONS[id][e.section]!;
        expect(e.slots, `${id} ${e.section}`).toEqual(want === 'all' ? undefined : [...want]);
      }
    }
  });

  it('Fenn (W2:7) sits with his back to the lit rota desk (the tgc-opt hint): the desk is more than 90 degrees off his facing', () => {
    const fenn = WHARF_SECTORS[1]!.guards[7]!;
    expect(fenn.zone).toBe('tgc-fenn');
    const off = offFacing(fenn.x, fenn.z, fenn.yaw, W2_ROTA_DESK[0], W2_ROTA_DESK[2]);
    expect(off).toBeGreaterThan(Math.PI / 2);
    // the board he turns his back on is the one at the desk
    const board = WHARF_SECTORS[1]!.intel!.find((n) => n.grants === 'tgc-opt')!;
    expect(board).toMatchObject({ kind: 'board', at: [...W2_ROTA_DESK] });
  });

  it('Teale has his two lines; the decoys have lines; only the interrogation people and no one else needs them', () => {
    const w2 = WHARF_SECTORS[1]!;
    expect(w2.guards[6]!.info!.lines).toEqual(['Shed three. Candle on the lid.', 'Under the tea.']);
    for (const k of [6, 7, 8]) expect(talkers.has(`W2:${k}`)).toBe(true);
    for (const id of ['W2:6', 'W2:7', 'W2:8']) expect(guards.has(id)).toBe(true);
  });

  it('every guard (and his takedown spot) lies inside his section box; the start is on walkable floor', () => {
    const { b } = builtWharf();
    const cast = downCast(b);
    const bad: string[] = [];
    WHARF_SECTORS.forEach((s, i) => {
      const box = SECTION_BOX[s.id as keyof typeof SECTION_BOX];
      s.guards.forEach((g, k) => {
        if (!inBox(box, g.x, g.z)) bad.push(`${s.id}:${k} at (${g.x}, ${g.z}) outside the box`);
        if (!inBox(box, g.takedownSpot[0], g.takedownSpot[1])) bad.push(`${s.id}:${k} takedown spot outside the box`);
        for (const p of g.route ?? []) if (!inBox(box, p[0], p[1])) bad.push(`${s.id}:${k} route point (${p[0]}, ${p[1]}) outside the box`);
        const y = g.y ?? 0;
        const hit = cast(g.x, y + 1, g.z);
        if (!hit || Math.abs(hit.y - y) > 0.1) bad.push(`${s.id}:${k} at (${g.x}, ${y}, ${g.z}): floor ${hit ? hit.y.toFixed(2) : 'none'}`);
        const sp = g.takedownSpot;
        const hit2 = cast(sp[0], y + 1, sp[1]);
        if (!hit2 || Math.abs(hit2.y - y) > 0.1) bad.push(`${s.id}:${k} takedown spot (${sp[0]}, ${sp[1]}): floor ${hit2 ? hit2.y.toFixed(2) : 'none'}`);
      });
      void i;
    });
    expect(bad).toEqual([]);
  });

  it('every route point lies inside a room of its section', () => {
    const bad: string[] = [];
    WHARF_SECTORS.forEach((s, i) => {
      for (const r of s.routes) {
        r.pts.forEach((p, n) => {
          const y = p[2] ?? 0;
          const cb = s.connector?.box;
          const ok = SECTIONS[i]!.rooms.some((room) => inRoom(room, p[0], p[1], 0)) || (LINKS[s.id] ?? []).some((l) => inBox(l, p[0], p[1])) || (!!cb && inBox(cb, p[0], p[1]));
          void y;
          if (!ok) bad.push(`${s.id} "${r.name}" point ${n} (${p.join(', ')})`);
        });
      }
    });
    expect(bad).toEqual([]);
  });

  it('every section has at least 2 routes, each with its objective at `obj`', () => {
    for (const s of WHARF_SECTORS) {
      expect(s.routes.length, s.id).toBeGreaterThanOrEqual(2);
      for (const r of s.routes) {
        const p = r.pts[r.obj]!;
        if (s.objective) expect(Math.hypot(p[0] - s.objective.x, p[1] - s.objective.z), `${s.id} ${r.name}`).toBeLessThan(2);
      }
    }
  });
});

describe('tallowWharf starts, checkpoints and extraction', () => {
  it('every start, start2, checkpoint, checkpoint2 and the extraction box are in their boxes on a surface', () => {
    const { b } = builtWharf();
    const cast = downCast(b);
    const bad: string[] = [];
    const onSurface = (label: string, x: number, y: number, z: number): void => {
      const hit = cast(x, y + 1, z);
      if (!hit || Math.abs(hit.y - y) > 0.1) bad.push(`${label} (${x}, ${y}, ${z}): surface ${hit ? hit.y.toFixed(2) : 'none'}`);
    };
    for (const s of WHARF_SECTORS) {
      const box = SECTION_BOX[s.id as keyof typeof SECTION_BOX];
      for (const [n, p] of [['start', s.start], ['start2', s.start2]] as const) {
        if (!p) continue;
        onSurface(`${s.id} ${n}`, p.x, p.y, p.z);
        if (n === 'start' && !inBox(box, p.x, p.z)) bad.push(`${s.id} start outside its box`);
      }
      const c = s.connector;
      if (c) {
        const cb = c.box as PlanBox;
        expect(inBox([0, 0, 120, 80], (cb[0] + cb[2]) / 2, (cb[1] + cb[3]) / 2), `${s.id} connector inside the map`).toBe(true);
        onSurface(`${s.id} connector centre`, (cb[0] + cb[2]) / 2, c.floorY ?? 0, (cb[1] + cb[3]) / 2);
        onSurface(`${s.id} checkpoint`, c.checkpoint.x, c.checkpoint.y, c.checkpoint.z);
        if (c.checkpoint2) onSurface(`${s.id} checkpoint2`, c.checkpoint2.x, c.checkpoint2.y, c.checkpoint2.z);
      }
      if (s.extract) {
        const eb = s.extract.box;
        expect(inBox(box, (eb[0] + eb[2]) / 2, (eb[1] + eb[3]) / 2), 'extract in W4').toBe(true);
        onSurface(`${s.id} extract centre`, (eb[0] + eb[2]) / 2, s.extract.floorY ?? 0, (eb[1] + eb[3]) / 2);
      }
      // the objective sits on the surface it names
      onSurface(`${s.id} objective`, s.objective.x, s.objective.y, s.objective.z);
    }
    expect(bad).toEqual([]);
  });

  it('every board, objective and key post prompt stands on a floor at its own y, in the open (not in a stair core, a wall or a void); every overhear box has open floor', () => {
    const cast = downCast(builtWharf().b);
    const bad: string[] = [];
    /** A floor within 0.1 of y under (x, z), and no solid at +0.5 or +1.2 (null: fine). */
    const standing = (x: number, y: number, z: number): string | null => {
      const hit = cast(x, y + 1, z);
      if (!hit || Math.abs(hit.y - y) > 0.1) return `floor ${hit ? hit.y.toFixed(2) : 'none'}`;
      for (const h of [0.5, 1.2]) {
        const solid = solidAt(x, y + h, z);
        if (solid) return `inside ${solid} at +${h}`;
      }
      return null;
    };
    const pts: [string, number, number, number][] = [];
    for (const s of WHARF_SECTORS) {
      for (const n of s.intel ?? []) {
        if (n.kind === 'board') {
          pts.push([`${s.id} board ${n.grants}`, n.at[0], n.at[1], n.at[2]]);
          continue;
        }
        if (n.kind !== 'overhear') continue;
        // an overhear box is a zone, not a prompt: some of it (sampled every 0.5 m) is open floor at its floorY
        const [x0, z0, x1, z1] = n.box;
        let open = 0;
        for (let x = x0 + 0.25; x < x1; x += 0.5) for (let z = z0 + 0.25; z < z1; z += 0.5) if (!standing(x, n.floorY ?? 0, z)) open++;
        if (open === 0) bad.push(`${s.id} overhear ${n.grants}: no open floor at y ${n.floorY ?? 0}`);
      }
      pts.push([`${s.id} objective`, s.objective.x, s.objective.y, s.objective.z]);
    }
    for (const [k, p] of Object.entries(W3_KEY_POSTS)) pts.push([`W3 key post ${k}`, p[0], p[1], p[2]]);
    for (const [label, x, y, z] of pts) {
      const why = standing(x, y, z);
      if (why) bad.push(`${label} (${x}, ${y}, ${z}): ${why}`);
    }
    expect(pts.length).toBe(3 + 4 + 2);
    expect(bad).toEqual([]);
  });

  it('each section starts where the previous connector\'s checkpoint is; W2\'s checkpoint is the bulkhead stair head, near the W3 roof door', () => {
    for (let i = 1; i < WHARF_SECTORS.length; i++) {
      const prev = WHARF_SECTORS[i - 1]!.connector!;
      const s = WHARF_SECTORS[i]!;
      expect(s.start).toEqual(prev.checkpoint);
      expect(s.start2).toEqual(prev.checkpoint2);
    }
    const cp = WHARF_SECTORS[1]!.connector!.checkpoint;
    const roofDoor = W3.doors['w3-bridge']!;
    // the bulkhead roof door: the head of the stair is within 1.5 m of the roof door of the bulkhead (debug point w3-bulkhead-head)
    const head = W3.debugPoints.find((p) => p.id === 'w3-bulkhead-head')!.pos;
    expect(Math.hypot(cp.x - head.x, cp.z - head.z)).toBeLessThanOrEqual(1.5);
    expect(cp.y).toBeCloseTo(head.y, 5);
    void roofDoor;
  });
});

describe('tallowWharf bolts', () => {
  it('each bolt sits on a section door; its named side is the side a point 0.6 m in lies on, and the other side is not', () => {
    const all = SECTIONS.flatMap((s) => Object.entries(s.doors).map(([name, d]) => ({ name, x: d[0], z: d[2] })));
    for (const s of WHARF_SECTORS) {
      s.bolts?.forEach((bolt, k) => {
        expect(all.some((d) => d.x === bolt.at[0] && d.z === bolt.at[1]), `${s.id} bolt ${k} at (${bolt.at.join(', ')})`).toBe(true);
        const len = Math.hypot(bolt.side[0], bolt.side[1]);
        const nx = (bolt.side[0] / len) * 0.6;
        const nz = (bolt.side[1] / len) * 0.6;
        expect(onBoltSide(bolt, bolt.at[0] + nx, bolt.at[1] + nz), `${s.id} bolt ${k} near side`).toBe(true);
        expect(onBoltSide(bolt, bolt.at[0] - nx, bolt.at[1] - nz), `${s.id} bolt ${k} far side`).toBe(false);
      });
    }
  });

  it('the bolt counts and indexes are the brief\'s (the flags W<n>-bolt<k> fix them)', () => {
    expect(WHARF_SECTORS.map((s) => s.bolts?.length)).toEqual([2, 5, 4, 2]);
    expect(WHARF_SECTORS[1]!.bolts![3]!.w).toBe(2.0);
    expect(WHARF_SECTORS[1]!.bolts![4]!.w).toBe(2.0);
  });

  it('W3 bolts both leaves of the cart gate: the wicket by the connector, the roller leaf by a bolt on the same line', () => {
    const w3 = WHARF_SECTORS[2]!;
    const roller = W3.doors['w3-conn-roller']!;
    const wicket = W3.doors['w3-conn-near']!;
    expect(roller[2]).toBe(wicket[2]);
    expect(w3.bolts!.some((bl) => bl.at[0] === roller[0] && bl.at[1] === roller[2])).toBe(true);
    expect(w3.connector!.nearAt).toEqual([wicket[0], wicket[2]]);
  });
});

describe('tallowWharf routes on the runtime nav grid', () => {
  it('every walked leg of every route has a path (doors open, 200000 expansions)', () => {
    const { b, layout } = builtWharf();
    const nav = runtimeNav(b, layout.playerSpawns[0]!.pos, tallowWharf.navLayers ?? 3, layout.navSeeds ?? []);
    const fails: string[] = [];
    for (const s of WHARF_SECTORS) {
      for (const r of s.routes) {
        for (let i = 0; i + 1 < r.pts.length; i++) {
          if ((r.climbs ?? []).includes(i)) continue;
          const a = r.pts[i]!;
          const c = r.pts[i + 1]!;
          if (!nav.findPath([a[0], a[1]], [c[0], c[1]], 200000, a[2] ?? 0, c[2] ?? 0)) fails.push(`${s.id} "${r.name}" leg ${i} ${JSON.stringify([a, c])}`);
        }
      }
    }
    expect(fails).toEqual([]);
  });
});

describe('tallowWharf mission runner', () => {
  it('Three Grey Coats: tgc-1, then the tally book and the tea talk, opens tgc-2 done and holds tgc-courier', () => {
    const r = new MissionRunner(THREE_GREY_COATS, 2);
    r.snapshot('W1', 0);
    expect(r.isOpen(r.stepIndex('tgc-1'))).toBe(true);
    r.setFlag('tgc-1');
    r.update(1);
    expect(r.isDone(r.stepIndex('tgc-1'))).toBe(true);
    expect(r.isOpen(r.stepIndex('tgc-2'))).toBe(true);
    r.setFlag('tgc-tally');
    r.update(2);
    expect(r.isDone(r.stepIndex('tgc-2'))).toBe(false);
    r.setFlag('tgc-tea');
    r.update(3);
    expect(r.isDone(r.stepIndex('tgc-2'))).toBe(true);
    expect(r.hasFlag('tgc-courier')).toBe(true);
  });

  it('Two-Key Ledger: the gate code opens tkl-2, the keypad flag finishes it, the gate flag finishes the sync', () => {
    const r = new MissionRunner(TWO_KEY_LEDGER, 2);
    r.snapshot('W2', 0);
    expect(r.isOpen(r.stepIndex('tkl-1'))).toBe(true);
    r.setFlag('tkl-gate-code');
    r.update(1);
    expect(r.isDone(r.stepIndex('tkl-1'))).toBe(true);
    r.snapshot('W3', 2);
    expect(r.isOpen(r.stepIndex('tkl-2'))).toBe(true);
    r.setFlag('W3-key0');
    r.update(3);
    expect(r.isDone(r.stepIndex('tkl-2'))).toBe(true);
    r.setFlag('W3-gate0');
    r.update(4);
    expect(r.isDone(r.stepIndex('tkl-3'))).toBe(true);
    expect(r.isOpen(r.stepIndex('tkl-4'))).toBe(true);
  });
});

describe('tallowWharf guard ids', () => {
  it('sectorGuardIds has W2:6, W2:7 and W2:8; W2:6 has info', () => {
    const defs: readonly SectorDef[] = WHARF_SECTORS;
    expect(sectorGuardIds(defs).has('W2:6')).toBe(true);
    expect(sectorGuardIds(defs).has('W2:7')).toBe(true);
    expect(sectorGuardIds(defs).has('W2:8')).toBe(true);
    expect(sectorGuardTalkers(defs).has('W2:6')).toBe(true);
  });
});
