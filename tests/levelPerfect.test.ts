import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
// @ts-expect-error plain .mjs process script without types
import { mergeGraphs, validate } from '../scripts/level-validate.mjs';
// @ts-expect-error plain .mjs process script without types
import { checkPerfect } from '../scripts/level-checks/perfect.mjs';

// validator-port S6 (docs/validator-port/PLAN.md section 3; BRIEF A10, A11; VISION 4 rules 3-5): the no-kill path (ERR on
// every mode), the ghost path (no `loud` link; ERR on campaign and Sector Ops, INFO on training), `requires_kill` a
// bool, `mark` any value (ERR on campaign and Sector Ops, one INFO count on training).
const ROOT = path.resolve(__dirname, '..');
const read = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const METRICS = read('docs/design/metrics.json') as Record<string, unknown>;

interface Report { errors: string[]; warns: string[]; infos: string[] }
type Obj = Record<string, unknown>;
interface Link { from: string; to: string; kind: string; route: string; [k: string]: unknown }
interface Graph { meta: Obj & { mode: string; sections: string[] }; spaces: Obj[]; links: Link[] }

const sp = (id: string, type: string, room_class: string, size: number[], tension: number, tags: string[], extra: Obj = {}): Obj =>
  ({ id, section: 'S1', type, room_class, function: `${id} test space`, storey: 0, size, tension, tags, ...extra });
const ln = (from: string, to: string, kind: string, route: string, extra: Obj = {}): Link => ({ from, to, kind, route, ...extra });
const DOOR = { width: 1.2, height: 2.1 };

/** One section: the gate yard (start), the guarded court under a roof walk, the vault (objective) off the court by a
 *  quiet door, the hut (exit, exfil) behind team doors. Every way is ghost-clean. */
const map = (mode = 'campaign'): Graph => ({
  meta: { map: 'probe', name: 'Probe', mode, players: [2], sections: ['S1'] },
  spaces: [
    sp('gate', 'exterior', 'yard', [14, 14, 12], 1, ['start', 'entry']),
    sp('court', 'encounter', 'yard', [14, 20, 12], 3, ['unavoidable'],
      { los_break_s: 4, vantage: { from: 'roof', sees_pct: 0.75 }, guards: { 2: 4 } }),
    sp('roof', 'connector', 'corridor', [3.5, 14, 3], 2, []),
    sp('vault', 'objective', 'storage', [4, 4, 3], 2, ['objective']),
    sp('hut', 'utility', 'security_room', [5.5, 7, 3], 2, ['exit', 'exfil']),
  ],
  links: [
    ln('gate', 'court', 'opening', 'shadow', { width: 3, height: 2.1, length: 17 }),
    ln('gate', 'court', 'roller_door', 'loud', { width: 3, height: 3, length: 17 }),
    ln('gate', 'court', 'duct', 'secret', { width: 1.2, height: 1.5, length: 17, time_s: 20 }),
    ln('gate', 'roof', 'ladder', 'high', { level_change: 4.5, length: 10, time_s: 12 }),
    ln('roof', 'court', 'ladder', 'high', { level_change: 4.5, length: 10, time_s: 12 }),
    ln('court', 'roof', 'coop_boost', 'high', { level_change: 4.5, length: 6, time_s: 5 }),
    ln('court', 'vault', 'door', 'shadow', { ...DOOR, length: 6 }),
    ln('court', 'hut', 'pair_gate', 'shadow', { ...DOOR, length: 13 }),
    ln('court', 'hut', 'pair_gate', 'loud', { width: 2, height: 2.1, length: 13 }),
  ],
});
const linkOf = (g: Graph, from: string, to: string, kind: string): Link => {
  const l = g.links.find((x) => x.from === from && x.to === to && x.kind === kind);
  if (!l) throw new Error(`no link ${from} -> ${to} (${kind})`);
  return l;
};
const perfect = (g: Graph): Report => checkPerfect(g, METRICS, {}) as Report;
const EMPTY: Report = { errors: [], warns: [], infos: [] };
const MODES = ['campaign', 'sector', 'training'];

const KILL = 'needs a requires_kill link (no mission forces a kill, VISION 4 rule 4, G127)';
const GHOST = 'needs a loud or requires_kill link (no ghost path: a perfect run is always possible, VISION 4 rule 3, G146)';
const TO_VAULT = "vault: every way from start 'gate' to this objective";

/** The vault's only door is loud. */
const loudVault = (mode: string): Graph => {
  const g = map(mode);
  linkOf(g, 'court', 'vault', 'door').route = 'loud';
  return g;
};
/** The vault's only door needs a kill (a quiet route, a guard who must go down). */
const killVault = (mode: string): Graph => {
  const g = map(mode);
  linkOf(g, 'court', 'vault', 'door').requires_kill = true;
  return g;
};

describe('validator-port S6: ghost and no-kill paths (A10, A11)', () => {
  it('a map with a quiet way to every objective and on to its end is clean on every mode', () => {
    for (const mode of MODES) expect(perfect(map(mode)), mode).toEqual(EMPTY);
  });

  it('a loud-only objective: ERR on a campaign and on Sector Ops; the same graph on training prints INFO', () => {
    for (const mode of ['campaign', 'sector']) {
      expect(perfect(loudVault(mode)), mode).toEqual({ ...EMPTY, errors: [`${TO_VAULT} ${GHOST}`] });
    }
    expect(perfect(loudVault('training'))).toEqual({ ...EMPTY, infos: [`${TO_VAULT} ${GHOST}`] });
  });

  it('a requires_kill-only objective ERRs on every mode, training included, once (no ghost line beside it)', () => {
    for (const mode of MODES) expect(perfect(killVault(mode)), mode).toEqual({ ...EMPTY, errors: [`${TO_VAULT} ${KILL}`] });
  });

  it('a requires_kill link with a quiet way around it is no error', () => {
    for (const mode of MODES) {
      const g = map(mode);
      g.links.push(ln('court', 'vault', 'door', 'shadow', { ...DOOR, length: 6, requires_kill: true }));
      linkOf(g, 'gate', 'court', 'roller_door').requires_kill = true;
      expect(perfect(g), mode).toEqual(EMPTY);
    }
  });

  it('an objective reached quietly but left only by a loud (or a kill) way is stranded', () => {
    const stranded = (mode: string, field: Obj): Graph => {
      const g = map(mode);
      g.links = g.links.filter((l) => !(l.from === 'court' && l.to === 'vault'));
      g.links.push(ln('court', 'vault', 'drop', 'shadow', { level_change: 2 }),
        ln('vault', 'court', 'door', 'shadow', { ...DOOR, length: 6, one_way: true, ...field }));
      return g;
    };
    const exfil = "vault: every way on from this objective to exfil 'hut'";
    const exit = "vault: every way on from this objective to the last section's exit 'hut'";
    expect(perfect(stranded('campaign', { route: 'loud' })).errors).toEqual([`${exfil} ${GHOST}`]);
    expect(perfect(stranded('sector', { route: 'loud' })).errors).toEqual([`${exit} ${GHOST}`]);
    expect(perfect(stranded('training', { route: 'loud' })).infos).toEqual([`${exit} ${GHOST}`]);
    for (const mode of MODES) {
      const end = mode === 'campaign' ? exfil : exit;
      expect(perfect(stranded(mode, { requires_kill: true })), mode).toEqual({ ...EMPTY, errors: [`${end} ${KILL}`] });
    }
  });

  it("the run's end: exfil on a campaign; the last section's exit on Sector Ops (no exfil needed) and training", () => {
    const loudHut = (mode: string, tags: string[]): Graph => {
      const g = map(mode);
      for (const l of g.links) if (l.to === 'hut') l.route = 'loud';
      (g.spaces[4] as Obj).tags = tags;
      return g;
    };
    expect(perfect(loudHut('campaign', ['exit', 'exfil'])).errors).toEqual([
      `vault: every way on from this objective to exfil 'hut' ${GHOST}`, `exfil 'hut': every way from start 'gate' ${GHOST}`]);
    for (const mode of ['sector', 'training']) {
      const r = perfect(loudHut(mode, ['exit']));
      const lines = [`vault: every way on from this objective to the last section's exit 'hut' ${GHOST}`,
        `the last section's exit 'hut': every way from start 'gate' ${GHOST}`];
      expect(mode === 'sector' ? r.errors : r.infos, mode).toEqual(lines);
    }
    // No objective: the start still needs a quiet way to the end.
    const g = loudHut('campaign', ['exit', 'exfil']);
    g.spaces = g.spaces.filter((s) => s.id !== 'vault');
    g.links = g.links.filter((l) => l.to !== 'vault');
    expect(perfect(g).errors).toEqual([`exfil 'hut': every way from start 'gate' ${GHOST}`]);
  });

  it('the end of a multi-section Sector Ops map is its last section\'s exit, not an earlier one', () => {
    const g = map('sector');
    g.meta.sections = ['S1', 'S2'];
    (g.spaces[4] as Obj).tags = ['exit'];
    g.spaces.push({ ...sp('s2-entry', 'connector', 'corridor', [3.5, 14, 3], 1, ['entry']), section: 'S2' },
      { ...sp('s2-lawn', 'exterior', 'yard', [14, 14, 12], 1, ['exit']), section: 'S2' });
    g.links.push(ln('hut', 's2-entry', 'door', 'spine', { ...DOOR, length: 4 }),
      ln('s2-entry', 's2-lawn', 'roller_door', 'loud', { width: 3, height: 3, length: 10 }));
    expect(perfect(g).errors).toEqual([
      `vault: every way on from this objective to the last section's exit 's2-lawn' ${GHOST}`,
      `the last section's exit 's2-lawn': every way from start 'gate' ${GHOST}`]);
  });

  it('runs inside validate() on the merged graph', () => {
    expect((validate(loudVault('campaign'), { metrics: METRICS }) as Report).errors).toContain(`${TO_VAULT} ${GHOST}`);
    expect((validate(loudVault('training'), { metrics: METRICS }) as Report).infos).toContain(`${TO_VAULT} ${GHOST}`);
    expect((validate(killVault('training'), { metrics: METRICS }) as Report).errors).toContain(`${TO_VAULT} ${KILL}`);
  });

  it('the worked example and the campus graphs have ghost paths: nothing to report', () => {
    expect(perfect(read('docs/level-validator/example.graph.json') as Graph)).toEqual(EMPTY);
    const campus = [1, 2, 3, 4, 5].map((n) => read(`docs/sector-redesign/graph/campusOps-S${n}.json`));
    expect(perfect(mergeGraphs(campus) as Graph)).toEqual(EMPTY);
  });
});

describe('validator-port S6: requires_kill and mark fields', () => {
  it('requires_kill must be a bool (ERR)', () => {
    for (const v of [true, false]) {
      const g = map();
      g.links.push(ln('court', 'vault', 'door', 'shadow', { ...DOOR, length: 6, requires_kill: v }));
      expect(perfect(g).errors, String(v)).toEqual([]);
    }
    for (const v of ['yes', 1, null]) {
      const g = map('training');
      g.links.push(ln('court', 'vault', 'door', 'shadow', { ...DOOR, length: 6, requires_kill: v }));
      expect(perfect(g).errors, String(v)).toEqual(['link court -> vault (door): requires_kill must be true or false']);
    }
  });

  it('a mark (any value) on a space or link: ERR each on a campaign and on Sector Ops', () => {
    for (const mode of ['campaign', 'sector']) {
      const g = map(mode);
      (g.spaces[3] as Obj).mark = 'arrow';
      linkOf(g, 'gate', 'court', 'opening').mark = 0;
      linkOf(g, 'court', 'hut', 'pair_gate').mark = false;
      const why = 'mark (no markers in the campaign or Sector Ops, VISION 4 rule 5, G290, G339)';
      expect(perfect(g), mode).toEqual({ ...EMPTY, errors: [`vault: ${why}`, `link gate -> court (opening): ${why}`,
        `link court -> hut (pair_gate): ${why}`] });
    }
  });

  it('marks on a training map are one INFO count (Marlow Yard keeps its guidance marks)', () => {
    const g = map('training');
    (g.spaces[3] as Obj).mark = 'arrow';
    (g.spaces[1] as Obj).mark = { paint: 'yellow' };
    linkOf(g, 'gate', 'court', 'opening').mark = true;
    expect(perfect(g)).toEqual({ ...EMPTY,
      infos: ['marks: 3 guidance mark(s) on spaces and links (Marlow Yard keeps its guidance marks, G292)'] });
    expect(perfect(map('training')).infos).toEqual([]);
  });
});
