/**
 * T H4 (validator-port S6, docs/validator-port/PLAN.md section 3; VISION 4 rules 3 and 4, G127, G146): no mission forces
 * a kill, read from the game code. Sector Ops: every `SectorObjective.kind` across `MAPS`' sector defs is non-lethal
 * (`hack`, `grab`, `download`, `src/game/sectors.ts:20`). Marlow Yard: every flag or gate a `CourseObjective.done` names
 * has a setter that is a player action, never a guard's death; each one is traced and listed in `TRACE` below, and the
 * test derives the same table from the built course so a new or changed setter fails here.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { MAPS } from '../src/world/maps';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';
import type { StepCond } from '../src/game/course/courseDef';

const ROOT = path.resolve(__dirname, '..');
const src = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** The non-lethal objective kinds (G127): take something, copy something, break into something. */
const SECTOR_KINDS = ['hack', 'grab', 'download'];

describe('T H4: Sector Ops objectives are non-lethal', () => {
  it("SectorObjectiveKind is 'hack' | 'grab' | 'download' (src/game/sectors.ts)", () => {
    const m = /export type SectorObjectiveKind = ([^;]+);/.exec(src('src/game/sectors.ts'));
    expect(m, 'SectorObjectiveKind declaration').not.toBeNull();
    const kinds = m![1]!.split('|').map((k) => k.trim().replace(/^'|'$/g, ''));
    expect(kinds).toEqual(SECTOR_KINDS);
  });

  it('every sector objective of every map in MAPS is one of them', () => {
    const withSectors = MAPS.filter((m) => m.sectors?.length);
    expect(withSectors.length).toBeGreaterThan(0);
    for (const m of withSectors) {
      for (const s of m.sectors!) {
        expect(SECTOR_KINDS, `${m.id} ${s.id}`).toContain(s.objective.kind);
      }
    }
  });
});

/**
 * Every condition a Marlow `CourseObjective.done` names (step id: condition -> setter), traced by hand through
 * `src/world/maps/ctcourseSets/*.ts` (flag and gate ids as built), `src/game/ctDevices.ts` (pass zones `:875-905` and
 * scanner pairs `:570-573` call the mode's `flag` hook, `src/game/modes/courseMode.ts:304`) and
 * `src/game/course/courseState.ts` (a pickup gate's switch press `:442-456`, a pair gate's two presses `:1105-1116`,
 * `CourseState.gateOpen` for gates). Setters:
 * - `passZone:<id>`: the player(s) stand in the zone (alive), `PassZone.any` = one is enough;
 * - `scanner:<id>`: both players hold the two scanners in sync;
 * - `pickup:<switch>`: a player presses the device (a console loop, a release key, a panel);
 * - `bolt:<gate>`: a player unbolts the door from its far side; `egress:<switch>`: a player presses the push bar.
 * A guard's death only records `kills` / `knockouts` (`courseMode.ts` `onEnemyKilled`); a console's `guard` only turns
 * its loop back off (`consoleBack`), never sets the flag.
 */
const TRACE: Record<string, string[]> = {
  // A1 Gate (a1Gate.ts:142 the wicket's bolt gate, :222 the yard zone)
  'a1-over gate:g-a1-wicket': ['bolt:g-a1-wicket'],
  'a1-over flag:a1-yard': ['passZone:a1-p-yard'],
  // A2 Carriage Shed (a2CarriageShed.ts:306-307)
  'a2-neck flag:a2-east1': ['passZone:a2-p-east1'],
  'a2-back flag:a2-east': ['passZone:a2-p-east'],
  // A3 Office Range (a3OfficeRange.ts:315-316)
  'a3-in flag:a3-far1': ['passZone:a3-p-far1'],
  'a3-swap flag:a3-far': ['passZone:a3-p-far'],
  // A4 Goods Shed (a4GoodsShed.ts:327 the console loop, :386 the west zone, :324 the push bar)
  'a4-room flag:a4-loop': ['pickup:a4-console'],
  'a4-floor flag:a4-west': ['passZone:a4-p-west'],
  'a4-dock gate:g-a4-wicket': ['egress:a4-pushbar'],
  // A5 Substation (a5Substation.ts:354 the inner zone, :268 the greybox pickup on the kiosk release)
  'a5-throw flag:a5-in1': ['passZone:a5-p-in1'],
  'a5-kiosk flag:a5-release': ['pickup:sw-a5-release'],
  // A6 Pump House (a6PumpHouse.ts:330 the gallery zone, :297 the drive panel)
  'a6-up flag:a6-gal': ['passZone:a6-p-gal'],
  'a6-hang flag:a6-drive': ['pickup:sw-a6-panel'],
  // A7 Data Hall (a7DataHall.ts:381 the pod zone, :332 the scanner pair)
  'a7-split flag:a7-pod': ['passZone:a7-p-pod'],
  'a7-sync flag:a7-sync': ['scanner:sc-a7'],
  // A8 Strongroom (a8Strongroom.ts:546-548 the zones, :497 the console loop, :467 the scanner pair)
  'a8-split flag:a8-gal1': ['passZone:a8-p-gal1'],
  'a8-office flag:a8-loop': ['pickup:a8-console'],
  'a8-grille flag:a8-lobby': ['passZone:a8-p-lobby'],
  'a8-beams flag:a8-inner1': ['passZone:a8-p-inner1'],
  'a8-sync flag:a8-sync': ['scanner:sc-a8'],
};
/** Setter kinds that are player actions (none is a guard's death). */
const PLAYER_ACTIONS = new Set(['passZone', 'scanner', 'pickup', 'pair', 'bolt', 'egress', 'lever']);

describe('T H4: no Marlow objective is done only by a guard death', () => {
  const lay = buildCtcourse(new LevelBuilder()).layout;
  const course = lay.course!;
  const gates = course.def.bays.flatMap((b) => b.gates);

  /** The setters of a course flag in the built data. */
  const flagSetters = (flag: string): string[] => [
    ...(lay.passZones ?? []).filter((z) => z.flag === flag).map((z) => `passZone:${z.id}`),
    ...(lay.scanners ?? []).filter((s) => s.flag === flag).map((s) => `scanner:${s.id}`),
    ...gates.flatMap((g) => {
      if (g.kind === 'pickup' && g.flag === flag) return [`pickup:${g.switchId}`];
      if (g.kind === 'pair' && g.flag === flag) return [`pair:${g.a}+${g.b}`];
      return [];
    }),
  ];
  /** What opens gate `id`. */
  const gateSetters = (id: string): string[] => gates.filter((g) => g.id === id).map((g) => {
    if (g.kind === 'egress' || g.kind === 'lever') return `${g.kind}:${g.switchId}`;
    return `${g.kind}:${g.id}`;
  });
  const conds = (c: StepCond | StepCond[] | undefined, out: string[]): string[] => {
    if (c === undefined) return out;
    if (Array.isArray(c)) {
      for (const x of c) conds(x, out);
    } else if ('all' in c) {
      conds(c.all, out);
    } else if ('gate' in c) {
      out.push(`gate:${c.gate}`);
    } else {
      out.push(`flag:${c.flag}`);
    }
    return out;
  };

  it('every done condition and its setters, from the built course, match the traced list', () => {
    const found: Record<string, string[]> = {};
    for (const o of course.def.objectives ?? []) {
      for (const c of conds(o.done, [])) {
        const [kind, id] = c.split(':') as [string, string];
        found[`${o.id} ${c}`] = kind === 'gate' ? gateSetters(id) : flagSetters(id);
      }
    }
    expect(found).toEqual(TRACE);
  });

  it('each setter is a player action', () => {
    for (const [cond, setters] of Object.entries(TRACE)) {
      expect(setters.length, cond).toBeGreaterThan(0);
      for (const s of setters) expect(PLAYER_ACTIONS.has(s.split(':')[0]!), `${cond}: ${s}`).toBe(true);
    }
  });

  it('a guard death sets no course flag: the flag paths into CourseState are the device hook and intel codes only', () => {
    const mode = src('src/game/modes/courseMode.ts');
    const killed = /\n {2}onEnemyKilled\([^)]*\): void \{\n([\s\S]*?)\n {2}\}\n/.exec(mode);
    expect(killed, 'CourseMode.onEnemyKilled').not.toBeNull();
    expect(killed![1]).not.toMatch(/flag|Flag|gate|Gate/);
    // Every `.setFlag(` call under src/: the devices' hook (pass zones, scanners) and an interrogation's code.
    // src/game/mission/ is skipped: the campaign mission runner keeps its own flags, never CourseState's.
    const calls: string[] = [];
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${e.name}`;
        if (rel === 'src/game/mission') continue;
        if (e.isDirectory()) walk(rel);
        else if (rel.endsWith('.ts')) for (const line of src(rel).split('\n')) if (/\.setFlag\(/.test(line)) calls.push(`${rel}: ${line.trim()}`);
      }
    };
    walk('src');
    expect(calls).toEqual([
      'src/game/modes/courseMode.ts: flag: (f) => this.state?.setFlag(f),',
      'src/game/modes/courseMode.ts: this.state?.setFlag(flag);',
    ]);
    expect(mode).toMatch(/onIntelCode\(flag: string\): void \{\n {4}this\.state\?\.setFlag\(flag\);/);
    const dev = src('src/game/ctDevices.ts').split('\n').filter((l) => l.includes('hooks.flag?.(')).map((l) => l.trim());
    expect(dev).toEqual(['this.hooks.flag?.(sc.def.flag);', 'this.hooks.flag?.(zone.flag);']);
  });
});
