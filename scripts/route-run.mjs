// Route-run (J13 R4a, docs/route-runs/PLAN.md "R4a Harness core, one page"; BRIEF docs/route-runs/BRIEF.md): a robot
// walks every planned route of a map against its live guards, headless, and writes a plain report.
//   node scripts/route-run.mjs <url> --graph <files...> [--points <file|auto>] [--section S1] [--routes graph|code]
//     [--players 1|2] [--pace sneak|walk|run] [--detections forgive|keep] [--out <dir>] [--publish] [--dry-run]
//     [--selftest [<fixture>]]
//   node scripts/route-run.mjs --merge <map> <sha> --out <dir>            (no browser: the published parts -> one report)
// Laptop queue only (BRIEF "Where it runs"): an alone request, one step per section, E2E_GPU=1, e.g.
//   request.mjs --alone --step "serve scripts/route-run.mjs http://127.0.0.1:4189/ --selftest --players 1" ...
// `--points` is read through R6's loader (scripts/route-run/points.mjs `loadPoints`: checked against the graphs; `auto`
// makes it with level-measure); a selftest fixture keeps its own table, unchecked.
// `<url>` keeps every query param the caller gives (e.g. `?campusv2=2`) on every page the harness opens (`bootUrl`).
// `--dry-run` prints the plan (R1) and opens no browser. `--routes code` walks the map's own `SectorRoute` lists (read
// from the page; `climbs` legs stubbed) for an early number before J12: its report says "code routes, not a gate run".
// `--players 2` (R4b, BRIEF A6's default for every map; a selftest takes its fixture's `expect.players`): the robot pair,
// two pages on `?net=local` (scripts/route-run/pair.mjs); `--players 1` walks one robot (R4a's selftest, R4c / R5 runs).
// Outputs: the run log (`route-run-log.json`, R2's input), `route-run.json` and `REPORT.md` (R2) and `shots/` in
// `--out` (default: a temp folder, printed); the log is also printed between the `ROUTE-RUN-REPORT` markers; `--publish`
// commits the log and REPORT.md to branch `route-run-results` (publish.mjs, BRIEF A9).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeGraphs, COOP_KINDS } from './level-validate.mjs';
import { planRuns, KIT_HOLD_FALLBACK_S } from './route-run/plan.mjs';
import { paceFor, stepLimit, METRICS_FILE } from './route-run/progress.mjs';
import { buildReport, jsonText, merge, TOOL } from './route-run/report.mjs';
import { PAST_M } from './route-run/driver.mjs';
import { checkCourseExpect } from './route-run/course.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_SELFTEST = 'tests/fixtures/route-run/selftest.graph.json';
export const LOG_FILE = 'route-run-log.json';
export const MARK_BEGIN = 'ROUTE-RUN-REPORT BEGIN';
export const MARK_END = 'ROUTE-RUN-REPORT END';
/** A selftest `atLimit` stop: at most this far (game s) past its limit (two pair ticks of steps.mjs polls, plus one). */
export const AT_LIMIT_S = 0.5;
/** The graph's `meta.mode` -> the game's `?mode=` (a training graph is the course). */
export const GAME_MODES = { training: 'course' };

const USAGE = `usage: node scripts/route-run.mjs <url> --graph <files...> [--points <file|auto>] [--section S1] [--routes graph|code]
  [--players 1|2] [--pace sneak|walk|run] [--detections forgive|keep] [--out <dir>] [--publish] [--dry-run] [--selftest [<fixture>]]
       node scripts/route-run.mjs --merge <map> <sha> --out <dir>`;

// ---------------------------------------------------------------------------------------------------------------
// Pure parts (tests/routeRunCli.test.ts)
// ---------------------------------------------------------------------------------------------------------------

/** The command line -> options; throws a usage error on anything it does not know. */
export function parseArgs(argv) {
  const o = { url: null, graphs: [], points: null, section: null, routes: 'graph', players: 1, pace: 'sneak', detections: 'forgive', out: null, publish: false, dryRun: false, selftest: null, merge: null };
  const value = (i, flag) => {
    const v = argv[i];
    if (v === undefined || v.startsWith('--')) throw new Error(`${flag} needs a value\n${USAGE}`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      if (o.url !== null) throw new Error(`unexpected argument ${a}\n${USAGE}`);
      o.url = a;
      continue;
    }
    switch (a) {
      case '--graph':
        while (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) o.graphs.push(argv[++i]);
        if (!o.graphs.length) throw new Error(`--graph needs at least one file\n${USAGE}`);
        break;
      case '--points': o.points = value(++i, a); break;
      case '--section': o.section = value(++i, a); break;
      case '--routes': o.routes = value(++i, a); break;
      case '--players': o.players = Number(value(++i, a)); o.playersGiven = true; break;
      case '--pace': o.pace = value(++i, a); break;
      case '--detections': o.detections = value(++i, a); break;
      case '--out': o.out = value(++i, a); break;
      case '--publish': o.publish = true; break;
      case '--dry-run': o.dryRun = true; break;
      case '--selftest':
        o.selftest = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') && /\.json$/i.test(argv[i + 1]) ? argv[++i] : DEFAULT_SELFTEST;
        break;
      case '--merge':
        o.merge = { map: value(++i, a), sha: value(++i, a) };
        break;
      default:
        throw new Error(`unknown option ${a}\n${USAGE}`);
    }
  }
  if (!['graph', 'code'].includes(o.routes)) throw new Error(`--routes is graph or code (${o.routes})`);
  if (![1, 2].includes(o.players)) throw new Error(`--players is 1 or 2 (${o.players})`);
  if (!['sneak', 'walk', 'run'].includes(o.pace)) throw new Error(`--pace is sneak, walk or run (${o.pace})`);
  if (!['forgive', 'keep'].includes(o.detections)) throw new Error(`--detections is forgive or keep (${o.detections})`);
  if (o.merge) {
    if (!o.out) throw new Error(`--merge needs --out <dir>\n${USAGE}`);
    return o;
  }
  if (!o.selftest && !o.graphs.length) throw new Error(`--graph is required\n${USAGE}`);
  if (!o.dryRun && !o.url) throw new Error(`the game's <url> is required (except with --dry-run or --merge)\n${USAGE}`);
  return o;
}

/**
 * The boot URL: every query param the caller gave in `<url>` is kept on every page (as `params`, so e2e-lib's boot
 * sees `autostart` and the caller's `gfx` / `gear`), then the harness's own params for the keys the caller did not set.
 * Returns `{ url, params }` for e2e-lib `launch` / `openPage` (R4b's second page uses the same call).
 */
export function bootUrl(url, own) {
  const u = new URL(url);
  const keep = new URLSearchParams(u.search);
  const out = new URLSearchParams(keep);
  for (const [k, v] of new URLSearchParams(own)) if (!keep.has(k)) out.append(k, v);
  u.search = '';
  u.hash = '';
  return { url: u.toString(), params: out.toString() };
}

/** The harness's own boot params for a map (R3 `paceFor(...).minGear`: e2e-lib's default gear 4 caps a run). */
export function ownParams(meta, pace, players) {
  const mode = GAME_MODES[meta.mode] ?? meta.mode;
  const p = new URLSearchParams({ autostart: meta.map, mode, gear: String(Math.max(4, pace.minGear)) });
  if (players === 2) p.set('net', 'local');
  return p.toString();
}

/** A course section's bay: its first set's 1-based position in `CourseDef.bays`, matched by id (exact, any case; else
 *  the bay whose id starts with the section id and then a non-digit, e.g. A2 -> a2CarriageShed). 0: none. */
export function bayIndexFor(bays, section) {
  const s = String(section).toLowerCase();
  let i = bays.findIndex((b) => String(b).toLowerCase() === s);
  if (i < 0) i = bays.findIndex((b) => { const id = String(b).toLowerCase(); return id.startsWith(s) && !/\d/.test(id.charAt(s.length)); });
  return i + 1;
}

/** A Sector Ops section's index among the map's sectors (the graph's S1 is the sector `s1`), or -1. */
export function sectorIndexFor(ids, section) {
  const s = String(section).toLowerCase();
  return ids.findIndex((id) => String(id).toLowerCase() === s);
}

const ACTIONS = {
  door: 'door', double_door: 'door', roller_door: 'door',
  opening: 'walk', corridor: 'walk', tunnel: 'walk', fire_stair: 'walk', open_stair: 'walk',
  ladder: 'ladder', drop: 'drop', window: 'window', hatch: 'hatch', duct: 'duct', rappel: 'rappel',
};

function tableOf(points) {
  const spaces = new Map();
  if (points?.spaces) for (const s of Array.isArray(points.spaces) ? points.spaces : Object.entries(points.spaces).map(([id, p]) => ({ id, ...p }))) spaces.set(s.id, s);
  return { spaces, links: Array.isArray(points?.links) ? points.links : [] };
}

/** A space's centre from the points table (or null). */
export function centreOf(points, id) {
  const c = tableOf(points).spaces.get(id)?.centre;
  return Array.isArray(c) ? c : null;
}

/**
 * Steps for a fixed path (`--selftest`: a list of merged link indices, walked in their declared direction), in R1's
 * step shape (scripts/route-run/plan.mjs header): walk to each link's point, the link step, then a walk to the last
 * link's far space centre. (R4b) An item `{ split, a: [indices], b: [indices] }` is R1's split step: leg a the leader's,
 * leg b the follower's, from the first a-link's near space to the last a-link's far space.
 */
export function stepsForPath(graphs, points, indices, speed) {
  const g = mergeGraphs(Array.isArray(graphs) ? graphs : [graphs]);
  const t = tableOf(points);
  const steps = [];
  for (const item of indices) {
    if (item && typeof item === 'object') {
      const leg = (list) => stepsForPath(graphs, points, list, speed).slice(0, -1);
      steps.push({ type: 'split', id: item.split, fork: g.links[item.a[0]]?.from ?? null, a: leg(item.a), b: leg(item.b), rejoin: g.links[item.a[item.a.length - 1]]?.to ?? null });
      continue;
    }
    const index = item;
    const l = g.links[index];
    if (!l) throw new Error(`selftest path: no link ${index}`);
    const at = Array.isArray(t.links[index]?.at) ? t.links[index].at : Array.isArray(l.at) ? l.at : null;
    const coop = COOP_KINDS.has(l.kind);
    const action = coop ? 'stub' : ACTIONS[l.kind] ?? l.kind;
    const hold = typeof l.measured?.time_s === 'number' ? l.measured.time_s : typeof l.time_s === 'number' ? l.time_s : !coop && typeof l.length === 'number' ? l.length / speed : KIT_HOLD_FALLBACK_S;
    steps.push({ type: 'walk', to: at, space: l.from, link: index });
    steps.push({ type: 'link', index, kind: l.kind, route: l.route, from: l.from, to: l.to, reverse: false, at, action, limit_s: action === 'walk' || action === 'stub' ? null : stepLimit(action, l.level_change ?? l.length), hold_s: hold, holdFrom: 'selftest' });
  }
  const lastItem = indices[indices.length - 1];
  const end = lastItem && typeof lastItem === 'object' ? g.links[lastItem.a[lastItem.a.length - 1]]?.to : g.links[lastItem]?.to;
  if (end) steps.push({ type: 'walk', to: centreOf(points, end), space: end, link: null });
  return steps;
}

/** A selftest fixture's runs (`expect.runs[]`, each a fixed `path`), each link step with its `past`. */
export function selftestRuns(fixture, graphs, points, speed) {
  return fixture.expect.runs.map((r) => ({ id: r.id, section: r.section, kind: null, name: r.name ?? r.id, covers: [], unplannable: null, steps: addPast(stepsForPath(graphs, points, r.path, speed), points) }));
}

/** Each link step gets `past`:`PAST_M` past its point toward its far space's centre (that floor's height), else the
 *  next walk's target, else its own point. Recurses into split legs. */
export function addPast(steps, points) {
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.type === 'split') {
      addPast(s.a, points);
      addPast(s.b, points);
      continue;
    }
    if (s.type !== 'link' || s.past) continue;
    const c = centreOf(points, s.to);
    const nextWalk = steps.slice(i + 1).find((q) => q.type === 'walk' && q.to)?.to ?? null;
    if (s.at && c) {
      const dx = c[0] - s.at[0];
      const dz = c[2] - s.at[2];
      const len = Math.sqrt(dx * dx + dz * dz);
      const k = len > 1e-6 ? Math.min(1, PAST_M / len) : 0;
      s.past = [s.at[0] + dx * k, c[1], s.at[2] + dz * k];
    } else s.past = nextWalk ?? s.at ?? null;
  }
  return steps;
}

/**
 * `--routes code`: one run per `SectorRoute` of the section (read from the page): a walk to every point, the objective
 * at `pts[obj]`, each `climbs` leg a stub placed at its far point (the planner's fallback hold). Runs are named by the
 * route, kind null; the report header says "code routes, not a gate run". The last point is the connector's checkpoint:
 * the run ends as the robot enters the open connector (driver `exitAt`), before its hold starts the cycle.
 */
export function codeRuns(sector, section) {
  return (sector?.routes ?? []).map((r, ri) => {
    const steps = [];
    for (let k = 0; k < r.pts.length; k++) {
      const [x, z, y] = r.pts[k];
      const to = [x, y ?? 0, z];
      if (k > 0 && r.climbs.includes(k - 1)) {
        const [px, pz, py] = r.pts[k - 1];
        steps.push({ type: 'link', index: k - 1, kind: 'climb', route: null, from: null, to: null, reverse: false, at: [px, py ?? 0, pz], past: to, action: 'stub', limit_s: null, hold_s: KIT_HOLD_FALLBACK_S, holdFrom: 'fallback' });
      } else steps.push({ type: 'walk', to, space: null, link: null });
      if (k === r.obj) steps.push({ type: 'objective', space: null });
    }
    return { id: `${section}-code-${ri + 1}`, section, kind: null, name: `${r.name} (code route)`, covers: [], unplannable: null, steps };
  });
}

/**
 * The selftest's verdict: the fixture's `expect.runs[]` against the run logs. Each expected run names `outcomes`
 * (link index -> 'walked' | 'stub' | a stop class) and `lines` (`{ type: 'deadStop', class, link, within_s }`: a stop of
 * that class on that link, at most `within_s` game seconds after the robot's last progress, with `atLimit` a link step's
 * stop at its limit (the step's own time `step_t` within `AT_LIMIT_S` past `limit_s`); `{ type: 'noDeadStops' }`;
 * `{ type: 'guardsAll' }`: every spawned guard alive; R4b's pair lines: `{ type: 'split', id, a, b, rejoin }` both legs at once
 * by those robots, each at the rejoin; `{ type: 'stub', link, time_s, robots }` stubbed with that hold, those robots
 * placed; `{ type: 'robots', names }` the robots the log names). Returns the problems ([] = pass).
 */
export function checkSelftest(expect, logs) {
  const problems = [];
  for (const er of expect?.runs ?? []) {
    const log = logs.find((l) => l.id === er.id);
    if (!log) {
      problems.push(`${er.id}: not run`);
      continue;
    }
    if (log.unplannable) problems.push(`${er.id}: not walked (${log.unplannable})`);
    for (const [index, want] of Object.entries(er.outcomes ?? {})) {
      const got = log.links.find((l) => String(l.index) === String(index))?.outcome ?? 'not reached';
      if (got !== want) problems.push(`${er.id}: link ${index} ${got}, expected ${want}`);
    }
    for (const line of er.lines ?? []) {
      if (line.type === 'deadStop') {
        const s = log.deadStops.find((d) => d.class === line.class && String(d.link) === String(line.link));
        if (!s) problems.push(`${er.id}: no ${line.class} stop on link ${line.link} (stops: ${JSON.stringify(log.deadStops.map((d) => [d.class, d.link]))})`);
        else if (typeof line.within_s === 'number' && s.t - s.since > line.within_s + 1e-6) problems.push(`${er.id}: the ${line.class} stop came ${(s.t - s.since).toFixed(2)} s after the last progress (at most ${line.within_s})`);
        else if (line.atLimit && !(typeof s.limit_s === 'number' && s.step_t >= s.limit_s - 1e-6 && s.step_t <= s.limit_s + AT_LIMIT_S + 1e-6)) problems.push(`${er.id}: the ${line.class} stop came ${s.step_t ?? '?'} s into its step (its limit ${s.limit_s ?? 'none'} s)`);
      } else if (line.type === 'noDeadStops') {
        if (log.deadStops.length) problems.push(`${er.id}: dead stops ${JSON.stringify(log.deadStops.map((d) => [d.class, d.link]))}, expected none`);
      } else if (line.type === 'split') {
        // (R4b) both legs at once: leg a by line.a, leg b by line.b, each reaching the rejoin space
        const sp = (log.splits ?? []).find((x) => x.id === line.id);
        const [la, lb] = [sp?.legs.find((x) => x.side === 'a'), sp?.legs.find((x) => x.side === 'b')];
        if (!sp || !la || !lb) problems.push(`${er.id}: split ${line.id} not walked by two legs`);
        else {
          if (la.robot !== line.a || lb.robot !== line.b) problems.push(`${er.id}: split ${line.id} legs by ${la.robot} / ${lb.robot}, expected ${line.a} / ${line.b}`);
          if (line.rejoin && sp.rejoin !== line.rejoin) problems.push(`${er.id}: split ${line.id} rejoins at ${sp.rejoin}, expected ${line.rejoin}`);
          for (const x of [la, lb]) if (!x.reached) problems.push(`${er.id}: split ${line.id} leg ${x.side} (${x.robot}) did not reach ${sp.rejoin} (in ${x.space})`);
          if (!(la.start_s === lb.start_s && la.end_s > lb.start_s && lb.end_s > la.start_s)) problems.push(`${er.id}: split ${line.id} legs not walked at once`);
        }
      } else if (line.type === 'stub') {
        // (R4b) a co-op link stubbed with its time, both robots placed
        const st = log.stubs.find((x) => String(x.link) === String(line.link));
        if (!st) problems.push(`${er.id}: link ${line.link} not stubbed`);
        else {
          if (typeof line.time_s === 'number' && Math.abs(st.hold_s - line.time_s) > 1e-6) problems.push(`${er.id}: stub ${line.link} held ${st.hold_s} s, expected ${line.time_s}`);
          if (line.robots && JSON.stringify(st.robots ?? []) !== JSON.stringify(line.robots)) problems.push(`${er.id}: stub ${line.link} placed ${JSON.stringify(st.robots ?? [])}, expected ${JSON.stringify(line.robots)}`);
        }
      } else if (line.type === 'robots') {
        if (JSON.stringify(log.robots ?? []) !== JSON.stringify(line.names)) problems.push(`${er.id}: robots ${JSON.stringify(log.robots ?? [])} in the log, expected ${JSON.stringify(line.names)}`);
      } else if (line.type === 'guardsAll') {
        if (!(log.guards.spawned > 0 && log.guards.alive === log.guards.spawned)) problems.push(`${er.id}: guards ${log.guards.alive} of ${log.guards.spawned}`);
      } else problems.push(`${er.id}: unknown expected line ${JSON.stringify(line)}`);
    }
    // (SR5) a course run's own block (R4c: drills, restarts, raises)
    if (er.course) problems.push(...checkCourseExpect(er.course, log));
  }
  return problems;
}

/** (SR1, BRIEF A2) The in-page forgive: `--detections forgive`, except in course mode (the game's restart or retry is the
 *  forgive step there; a calmed guard would never fire it). */
export function forgiveFor(detections, mode) {
  return detections === 'forgive' && mode !== 'course';
}

/** The steps context's run-wide parts (steps.mjs, course.mjs): the shots, the notes, the host clock, one clock advance
 *  that steps every page, the run's approach stick (a split leg's robot driver does not carry it), and (SR2) the graphs
 *  (A13's `teach`) and the selftest's `expect` (the raise hook; null outside a selftest). */
export function stepsContext(ctx, { shots, notes, stick, graphs, fixture = null }) {
  const d = ctx.driver;
  return Object.assign(ctx, { shots, notes, clock: () => d.call('time'), advance: (s) => d.advance(s), stick, graphs, selftest: fixture?.expect ?? null });
}

/** R6's loader (scripts/route-run/points.mjs); until R6 is on the branch, today's plain read with a note. */
async function pointsLoader() {
  try {
    return (await import('./route-run/points.mjs')).loadPoints;
  } catch (e) {
    if (!/Cannot find module '[^']*points\.mjs'/.test(String(e?.message))) throw e;
    return ({ src }) => {
      if (src === 'auto') throw new Error('--points auto needs scripts/route-run/points.mjs (R6)');
      return { ...readJson(src), notes: ['the points table was not checked against the graphs (R6 points.mjs is not on this branch)'] };
    };
  }
}

/** The points table: a selftest fixture's own (unchecked); else `--points <file|auto>` through R6's `loadPoints` (it
 *  throws on a stale table: exit 2), its notes printed; else a fixture given as --graph keeps its own. `load` (tests)
 *  replaces the loader. */
export async function readPoints(o, graphs, fixture = null, load = null) {
  if (fixture?.points) return fixture.points;
  if (!o.points) return graphs.find((gr) => gr.points)?.points ?? null;
  const table = await (load ?? (await pointsLoader()))({ graphs, files: fixture ? [o.selftest] : o.graphs, src: o.points });
  for (const n of table?.notes ?? []) console.error(`route-run points: ${n}`);
  return table;
}

/** The `--dry-run` text: the plan, one block per run. */
export function dryRunText(plan, { section = null } = {}) {
  const out = [`route-run plan: ${plan.map} (${plan.mode}), sections ${plan.sections.join(', ')}`];
  for (const n of plan.notes) out.push(`note: ${n}`);
  const runs = plan.runs.filter((r) => !section || r.section === section);
  out.push(`${runs.length} run(s)${section ? ` in ${section}` : ''}`);
  for (const r of runs) {
    out.push(`- ${r.id} (${r.section ?? 'all'}, ${r.kind ?? 'whole course'})${r.unplannable ? ` UNPLANNABLE: ${r.unplannable}` : ''}`);
    if (r.covers.length) out.push(`  covers: ${r.covers.map((c) => c.join(' ')).join(', ')}`);
    for (const s of r.steps) out.push(`  ${stepText(s)}`);
  }
  return out.join('\n');
}

function stepText(s) {
  const pt = (p) => (p ? `(${p.map((v) => Math.round(v * 10) / 10).join(', ')})` : '(no point)');
  if (s.type === 'walk') return `walk to ${pt(s.to)}${s.link !== null ? ` for link ${s.link}` : ` in ${s.space}`}`;
  if (s.type === 'link') {
    const lim = typeof s.limit_s === 'number' ? `, limit ${Math.round(s.limit_s * 10) / 10} s` : '';
    return `link ${s.index} ${s.from} -> ${s.to} ${s.kind} [${s.action}${s.action === 'stub' ? ` ${Math.round(s.hold_s * 10) / 10} s` : lim}]`;
  }
  if (s.type === 'objective') return `objective in ${s.space}`;
  if (s.type === 'split') return `split ${s.id}: a ${s.a.length} steps, b ${s.b.length} steps, rejoin ${s.rejoin}`;
  return JSON.stringify(s);
}

/** The run log printed between the markers (the laptop log's fallback, BRIEF A9). */
export function markedLog(log) {
  return `${MARK_BEGIN}\n${JSON.stringify(log)}\n${MARK_END}`;
}

// ---------------------------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------------------------

const readJson = (f) => JSON.parse(fs.readFileSync(path.resolve(f), 'utf8'));
const soft = (fn, d) => {
  try {
    return fn();
  } catch {
    return d;
  }
};

/** `--merge`: the published parts of one map at one commit -> route-run.json + REPORT.md. */
async function runMerge(o) {
  const { readParts } = await import('./route-run/publish.mjs');
  const parts = readParts(o.merge.map, o.merge.sha);
  if (!parts.length) throw new Error(`route-run --merge: no published parts for ${o.merge.map} at ${o.merge.sha}`);
  const { json, markdown } = buildReport(merge(parts.map((p) => p.log)));
  fs.mkdirSync(o.out, { recursive: true });
  fs.writeFileSync(path.join(o.out, 'route-run.json'), jsonText(json));
  fs.writeFileSync(path.join(o.out, 'REPORT.md'), markdown);
  console.log(`route-run --merge: ${parts.length} part(s) (${parts.map((p) => p.dir).join(', ')}) -> ${o.out}: ${json.summary.verdict}`);
}

async function main(argv) {
  const o = parseArgs(argv);
  if (o.merge) return runMerge(o);

  const metrics = readJson(path.join(ROOT, METRICS_FILE));
  const pace = paceFor(o.pace, metrics);
  let graphs;
  let fixture = null;
  if (o.selftest) {
    // a selftest fixture is a graph with its own points table and an `expect` block (`checkSelftest`)
    fixture = readJson(o.selftest);
    graphs = [fixture];
  } else graphs = o.graphs.map(readJson);
  // (R6) `--points` checked against the graphs; a fixture (--selftest, or given as --graph) keeps its own table
  const points = await readPoints(o, graphs, fixture);
  // BRIEF A6: two robots on every map unless --players says otherwise; a selftest walks as its fixture says (R4a's: 1).
  // (parseArgs keeps R4a's 1 when --players is absent: tests/routeRunCli.test.ts asserts it.)
  const players = o.playersGiven ? o.players : fixture?.expect?.players ?? 2;
  o.players = players;
  const meta = mergeGraphs(graphs).meta;

  let plan = null;
  if (!fixture && o.routes === 'graph') plan = planRuns(graphs, points, { metrics });
  if (o.dryRun) {
    if (fixture) {
      // (--selftest <fixture> --dry-run) the selftest's own runs, as the run below walks them, with their limits
      const runs = selftestRuns(fixture, graphs, points, metrics.rules.split_speed_mps).map((r) => ({ ...r, kind: 'selftest' }));
      console.log(dryRunText({ map: meta.map, mode: meta.mode, sections: meta.sections ?? [], notes: [`selftest ${path.basename(o.selftest)}, ${players} robot(s)`], runs }, { section: o.section }));
      return;
    }
    if (!plan) throw new Error('route-run --dry-run: the plan needs --routes graph (code routes are read from the page)');
    console.log(dryRunText(plan, { section: o.section }));
    return;
  }

  const notes = [...(plan?.notes ?? [])];
  if (o.players === 1) notes.push('one robot walked every run (--players 1)');
  const { runOne } = await import('./route-run/driver.mjs');
  const own = ownParams(meta, pace, o.players);
  const boot = bootUrl(o.url, own);
  const out = path.resolve(o.out ?? fs.mkdtempSync(path.join(os.tmpdir(), 'route-run-')));
  fs.mkdirSync(out, { recursive: true });
  console.log(`route-run: ${meta.map} (${meta.mode}), ${boot.url}?${boot.params}, ${o.players} robot(s), out ${out}`);

  const mode = GAME_MODES[meta.mode] ?? meta.mode;
  const forgive = forgiveFor(o.detections, mode);
  let browser;
  let page;
  let errorLists;
  let ctx;
  if (o.players === 2) {
    // (R4b) the pair; a course section past bay 1 is the host session's start bay, known once the course data is read
    const { openPair } = await import('./route-run/pair.mjs');
    const first = o.section ?? (fixture ? fixture.expect.runs[0]?.section : plan?.runs[0]?.section) ?? null;
    const start = async (courseBay) => openPair({ url: o.url, own, mode, map: meta.map, courseBay, pace, forgive, points, notes });
    let p = await start(0);
    if (mode === 'course' && first) {
      const bay = bayIndexFor((await p.pair.call('course')).bays, first);
      if (bay > 1) {
        await p.browser.close();
        p = await start(bay);
      }
    }
    browser = p.browser;
    page = p.host;
    errorLists = p.errors;
    ctx = { host: p.host, client: p.client, pads: p.pads, driver: p.pair, pair: p.pair, players: 2 };
  } else {
    const { launch } = await import('./e2e-lib.mjs');
    const { PageDriver } = await import('./route-run/driver.mjs');
    const l = await launch({ url: boot.url, params: boot.params });
    browser = l.browser;
    page = l.page;
    errorLists = [l.errors];
    const driver = new PageDriver(page, { pace, forgive, points });
    await driver.install();
    ctx = { host: page, client: null, pads: null, driver, players: 1 };
  }
  const logs = [];
  let failed = false;
  try {
    const driver = ctx.driver;
    stepsContext(ctx, { shots: path.join(out, 'shots'), notes, stick: pace.stick, graphs, fixture });

    // the runs, by section in graph order
    let runs;
    if (fixture) {
      runs = selftestRuns(fixture, graphs, points, metrics.rules.split_speed_mps);
    } else if (plan) {
      runs = plan.runs.filter((r) => !o.section || r.section === o.section).map((r) => ({ ...r, steps: addPast(structuredClone(r.steps), points) }));
    } else {
      const info = await driver.call('sectors');
      const secs = o.section ? [o.section] : meta.sections ?? [];
      runs = secs.flatMap((s) => {
        const i = sectorIndexFor(info.list.map((q) => q.id), s);
        if (i < 0) return [{ id: `${s}-code`, section: s, kind: null, covers: [], unplannable: `no Sector Ops section ${s} on the page`, steps: [] }];
        return codeRuns(info.list[i], s);
      });
    }
    const order = meta.sections ?? [];
    runs.sort((a, b) => (order.indexOf(a.section) - order.indexOf(b.section)));

    let live = null;
    for (const run of runs) {
      if (run.section !== live && run.section) {
        live = run.section;
        const why = await setupSection(driver, meta, run.section, o);
        if (why) for (const r of runs) if (r.section === run.section) r.unplannable ??= why;
      }
      console.log(`run ${run.id}${run.unplannable ? ` (not walked: ${run.unplannable})` : ''}`);
      const log = await runOne(ctx, run);
      logs.push(log);
      console.log(`  ${log.unplannable ? 'not walked' : `${log.deadStops.length ? 'STUCK' : 'done'} in ${log.time_s} s, ${log.walkedLinks} links walked, ${log.stubs.length} stubs, ${log.detections.length} seen, ${log.notices.length} noticed`}`);
    }
  } catch (e) {
    failed = true;
    console.error(`route-run: ${e?.stack ?? e}`);
    await page.screenshot({ path: path.join(out, 'route-run-error.png') }).catch(() => {});
  } finally {
    await browser.close();
  }

  const sha = soft(() => execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', cwd: ROOT, windowsHide: true, timeout: 30000 }).trim(), null);
  const runLog = {
    tool: TOOL, map: meta.map, mode: meta.mode, version: soft(() => readJson(path.join(ROOT, 'package.json')).version, null), sha,
    date: new Date().toISOString(), players: o.players, pace: o.pace, detections: o.detections,
    graphs: fixture ? [path.basename(o.selftest)] : o.graphs.map((f) => path.basename(f)), geom: meta.measured?.geom ?? points?.geom ?? null,
    routes: o.routes, notes, runs: logs,
  };
  const errors = errorLists.flat();
  if (errors.length) runLog.notes.push(`${errors.length} console error(s) in the page (first: ${errors[0].slice(0, 200)})`);
  const { json, markdown } = buildReport(runLog);
  fs.writeFileSync(path.join(out, LOG_FILE), `${JSON.stringify(runLog, null, 2)}\n`);
  fs.writeFileSync(path.join(out, 'route-run.json'), jsonText(json));
  fs.writeFileSync(path.join(out, 'REPORT.md'), markdown);
  console.log(markedLog(runLog));
  console.log(`route-run: ${json.summary.verdict} (${json.summary.runs} runs, ${json.summary.stuck} stuck, ${json.summary.unplannable} not walked); ${out}`);
  if (o.publish) {
    const { publishLog } = await import('./route-run/publish.mjs');
    const { dir, commit } = publishLog({ map: meta.map, sha: sha ?? 'unknown', date: runLog.date, files: { [LOG_FILE]: `${JSON.stringify(runLog, null, 2)}\n`, 'REPORT.md': markdown } });
    console.log(`route-run --publish: ${dir} (${commit.slice(0, 8)}) on route-run-results`);
  }
  if (fixture) {
    const problems = checkSelftest(fixture.expect, logs);
    for (const p of problems) console.error(`SELFTEST FAIL: ${p}`);
    console.log(problems.length || failed ? 'SELFTEST FAIL' : 'SELFTEST PASS');
    return problems.length || failed ? 1 : 0;
  }
  // a crash mid-run is not a pass (RULES "Test tiers"); a stuck map is a report, not a tool failure
  return failed ? 1 : 0;
}

/** Put the page at the section's start; returns why it cannot be (the section's runs are then `unplannable`), or null. */
async function setupSection(driver, meta, section, o) {
  const mode = GAME_MODES[meta.mode] ?? meta.mode;
  if (mode === 'sector') {
    const info = await driver.call('sectors');
    const i = sectorIndexFor(info.list.map((q) => q.id), section);
    if (i < 0) return `no Sector Ops section ${section} on the page`;
    if (i < info.index) return `section ${section} is behind the live one (run the sections in order, or one per step)`;
    // (the pair: both robots into the connector, its cycle needs everyone inside)
    if (i > info.index && (driver.advanceSector ? await driver.advanceSector(i) : await driver.call('advanceSector', i)) !== i) return `the connector cycle did not reach section ${section}`;
    return null;
  }
  if (mode === 'course') {
    const c = await driver.call('course');
    const bay = bayIndexFor(c.bays, section);
    if (!bay) return `no course set ${section} in the course data`;
    // one page boots solo at bay 1; a later bay is the host session's `courseBay`, set before the client joins (R4b)
    if (bay > 1 && o.players === 1) return `course set ${section} is bay ${bay}: a later bay needs the two-page start (--players 2)`;
    if (o.players === 2 && c.bay && c.bay !== bay) return `course set ${section} is bay ${bay}, the pair started at bay ${c.bay} (one course section per step)`;
    return null;
  }
  const first = (meta.sections ?? [])[0];
  return section === first ? null : `section setup for ${mode} maps is not built (R4a: Sector Ops and the course)`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code ?? 0),
    (e) => {
      console.error(String(e?.message ?? e));
      process.exit(2);
    },
  );
}
