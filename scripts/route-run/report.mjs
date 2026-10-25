// Route-run report (J13 R2). Pure: no Babylon, no browser, no clock, no file access.
//   buildReport(log) -> { json, markdown }   json is the stable route-run.json shape, markdown is REPORT.md
//   merge(parts[])   -> one log              the per-section step outputs joined, ready for buildReport
//   jsonText(json)   -> string               the exact bytes written to route-run.json
// Spec: docs/route-runs/PLAN.md slice R2, docs/route-runs/BRIEF.md (Q7 pass rule, A5, A14, M9, walk-card snippet).
// Input log (R4a): the header fields of the JSON shape plus `runs[]`; a run holds the same fields as the output run.
// Verdict, why, time and the summary are always worked out here, never trusted from the log, so a published
// route-run.json can be fed back in and gives the same report. Extra, optional input: run.unplannable (the planner's
// reason) and run.walkedLinks (count of links the robots really walked).

export const TOOL = 'route-run 1';
/** The Marlow Yard run-length band in game seconds (G272, 15-20 min). Report only, never a pass rule (A11). */
export const M9_BAND_S = [900, 1200];

const ROUTE_KINDS = ['shadow', 'high', 'loud'];
const DEAD_STOP_TEXT = {
  'no-nav-path': 'there was no walkable path',
  'could-not-follow': 'the robot could not follow the path',
  'step-timeout': 'a door, ladder or drop took too long',
  locked: 'a locked door never opened',
  'restart-loop': 'the game kept sending the pair back',
};

// ---------- small helpers ----------

const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v, d = null) => (typeof v === 'string' ? v : d);
const arr = (v) => (Array.isArray(v) ? v : []);
const round1 = (v) => Math.round(v * 10) / 10;

/** Copy with object keys sorted, for free-form objects (sense inputs, positions), so the bytes never depend on order. */
function stable(v) {
  if (Array.isArray(v)) return v.map(stable);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = stable(v[k]);
    return out;
  }
  return v === undefined ? null : v;
}

/** "carriage_shed" / "carriageShed" / "S1_gatehouse" -> "carriage shed" / "carriage shed" / "gatehouse". */
export function humanise(id) {
  if (id === null || id === undefined || id === '') return '';
  let s = String(id)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const stripped = s.replace(/^[a-z]{1,2}\d{1,2} /, '');
  if (stripped) s = stripped;
  return s;
}

const titleCase = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** Game seconds -> "2:31". */
export function formatTime(s) {
  const t = Math.max(0, Math.round(num(s)));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

const times = (n) => (n === 1 ? 'once' : n === 2 ? 'twice' : `${n} times`);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Natural order for section ids: S1 < S2 < S10, A2 < A10; no section first. */
function sectionKey(sec) {
  if (sec === null || sec === undefined || sec === '') return [0, '', 0];
  const m = /^(\D*)(\d+)?/.exec(String(sec));
  return [1, (m && m[1]) || String(sec), m && m[2] ? Number(m[2]) : 0];
}
function cmpSection(a, b) {
  const ka = sectionKey(a);
  const kb = sectionKey(b);
  if (ka[0] !== kb[0]) return ka[0] - kb[0];
  if (ka[1] !== kb[1]) return ka[1] < kb[1] ? -1 : 1;
  return ka[2] - kb[2];
}

// ---------- normalising a run ----------

function normGuard(g) {
  if (!g || typeof g !== 'object') return null;
  return { id: g.id ?? null, kind: g.kind ?? null, role: g.role ?? null, zone: g.zone ?? null };
}

function normDetection(d) {
  return {
    t: num(d.t),
    robot: d.robot ?? null,
    guard: normGuard(d.guard),
    sense: d.sense ?? null,
    inferred: d.inferred === true,
    level: d.level ?? null,
    restart: d.restart === 'set' || d.restart === 'retry' ? d.restart : null,
    guardAt: stable(d.guardAt ?? null),
    robotAt: stable(d.robotAt ?? null),
    space: d.space ?? null,
    inputs: stable(d.inputs ?? null),
  };
}

function normRun(r) {
  const deadStops = arr(r.deadStops).map((s) => ({
    t: num(s.t),
    robot: s.robot ?? null,
    at: stable(s.at ?? null),
    space: s.space ?? null,
    link: s.link ?? null,
    class: s.class ?? null,
    shot: s.shot ?? null,
  }));
  const unplannable = r.verdict === 'unplannable' || (r.unplannable !== undefined && r.unplannable !== null && r.unplannable !== false);
  const verdict = unplannable ? 'unplannable' : deadStops.length > 0 ? 'stuck' : 'pass';
  let why = '';
  if (verdict === 'unplannable') {
    why = str(typeof r.unplannable === 'string' ? r.unplannable : r.why, 'could not be planned');
  } else if (verdict === 'stuck') {
    const s = deadStops[0];
    const first = `${DEAD_STOP_TEXT[s.class] ?? 'the robot stopped'} at the ${humanise(s.space) || 'route'}`;
    why = deadStops.length > 1 ? `${first} (and ${deadStops.length - 1} more)` : first;
  }
  return {
    id: r.id ?? null,
    section: r.section ?? null,
    kind: r.kind ?? null,
    covers: arr(r.covers).map((c) => (Array.isArray(c) ? c.slice() : c)),
    verdict,
    why,
    // A5: a run that needed a recovery after a dead stop, or was never walked, has no valid time.
    time_s: verdict === 'pass' && typeof r.time_s === 'number' && Number.isFinite(r.time_s) ? r.time_s : null,
    walked_m: num(r.walked_m),
    guards: { spawned: num(r.guards?.spawned), alive: num(r.guards?.alive) },
    deadStops,
    detections: arr(r.detections).map(normDetection),
    notices: arr(r.notices).map(normDetection),
    stubs: arr(r.stubs).map((s) => ({ link: s.link ?? null, kind: s.kind ?? null, hold_s: num(s.hold_s), why: s.why ?? null })),
    drills: arr(r.drills).map((d) => ({
      id: d.id ?? null,
      player: d.player ?? null,
      verb: d.verb ?? null,
      hold_s: num(d.hold_s),
      why: d.why ?? null,
    })),
    restarts: arr(r.restarts).map((x) => ({
      t: num(x.t),
      space: x.space ?? null,
      set: x.set ?? null,
      restart: x.restart ?? null,
      detection: typeof x.detection === 'number' ? x.detection : null,
      then: x.then ?? null,
    })),
  };
}

// ---------- per-run facts ----------

/** Steps whose timer ran out twice, so their drills were done as stubs (A14): the "not made at sneak pace" steps. */
function slowSteps(run) {
  const seen = [];
  for (const x of run.restarts) {
    if (x.restart === 'timer' && x.then === 'drill-stub' && !seen.includes(x.space)) seen.push(x.space);
  }
  return seen;
}
const pushPasts = (run) => run.restarts.filter((x) => x.then === 'pushed-past');
const holdOf = (run) =>
  run.stubs.reduce((a, s) => a + s.hold_s, 0) + run.drills.reduce((a, d) => a + d.hold_s, 0);

// ---------- build ----------

export function buildReport(log) {
  const src = log && typeof log === 'object' ? log : {};
  const ordered = arr(src.runs)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => cmpSection(a.r.section, b.r.section) || a.i - b.i)
    .map((x) => x.r);
  const runs = ordered.map(normRun);

  let walkedLinks = 0;
  for (const r of ordered) walkedLinks += num(r.walkedLinks);
  const sum = (f) => runs.reduce((a, r) => a + f(r), 0);
  const stuck = runs.filter((r) => r.verdict === 'stuck').length;
  const unplannable = runs.filter((r) => r.verdict === 'unplannable').length;
  const summary = {
    runs: runs.length,
    stuck,
    unplannable,
    detections: sum((r) => r.detections.length),
    notices: sum((r) => r.notices.length),
    stubbed: sum((r) => r.stubs.length),
    drillStubs: sum((r) => r.drills.length),
    restarts: sum((r) => r.restarts.length),
    pushedPast: sum((r) => pushPasts(r).length),
    notAtSneakPace: sum((r) => slowSteps(r).length),
    walkedLinks,
    // Q7: pass when no run has a dead stop and none is unplannable. A log with no runs walked nothing, so it fails.
    verdict: runs.length > 0 && stuck === 0 && unplannable === 0 ? 'pass' : 'fail',
    runTime_s: round1(sum((r) => r.time_s ?? 0)),
  };

  const json = {
    tool: str(src.tool, TOOL),
    map: src.map ?? null,
    mode: src.mode ?? null,
    version: src.version ?? null,
    sha: src.sha ?? null,
    date: src.date ?? null,
    players: num(src.players, 2),
    pace: str(src.pace, 'sneak'),
    detections: src.detections === 'keep' ? 'keep' : 'forgive',
    graphs: arr(src.graphs).slice(),
    geom: src.geom ?? null,
    routes: src.routes === 'code' ? 'code' : 'graph',
    notes: arr(src.notes).slice(),
    runs,
    summary,
  };
  return { json, markdown: renderMarkdown(json) };
}

/** The exact text of route-run.json: two-space indent, one trailing newline. */
export function jsonText(json) {
  return JSON.stringify(json, null, 2) + '\n';
}

// ---------- merge ----------

/**
 * Join per-section logs (or route-run.json parts) into one log. Parts must agree on map, mode, sha and version
 * (else it throws: parts from different builds are not one report). A run id in two parts keeps the later part's
 * run (a rerun of one section). The date is the latest; the header otherwise comes from the first part.
 */
export function merge(parts) {
  const list = arr(parts).filter((p) => p && typeof p === 'object');
  if (list.length === 0) throw new Error('merge: no parts');
  const head = list[0];
  for (const p of list) {
    for (const k of ['map', 'mode', 'sha', 'version']) {
      if ((p[k] ?? null) !== (head[k] ?? null)) {
        throw new Error(`merge: parts disagree on ${k} (${String(head[k] ?? null)} and ${String(p[k] ?? null)})`);
      }
    }
  }
  const runs = [];
  for (const p of list) {
    for (const r of arr(p.runs)) {
      const at = r.id === null || r.id === undefined ? -1 : runs.findIndex((x) => x.id === r.id);
      if (at >= 0) runs[at] = r;
      else runs.push(r);
    }
  }
  const union = (key) => {
    const out = [];
    for (const p of list) for (const v of arr(p[key])) if (!out.includes(v)) out.push(v);
    return out;
  };
  const dates = list.map((p) => p.date).filter((d) => typeof d === 'string');
  const merged = { ...head, graphs: union('graphs'), notes: union('notes'), runs };
  if (dates.length > 0) merged.date = dates.reduce((a, b) => (b > a ? b : a));
  delete merged.summary;
  return merged;
}

// ---------- plain English ----------

const placeOf = (space) => (space ? `the ${humanise(space)}` : 'an unnamed place');

function whoOf(d) {
  if (d.sense === 'camera' || d.guard?.kind === 'camera') return 'a camera';
  const name = humanise(d.guard?.role || d.guard?.kind);
  return name ? `the ${name}` : 'a guard';
}

function verbOf(d) {
  const s = String(d.sense ?? '').toLowerCase();
  let v = 'noticed you';
  if (s.includes('camera')) v = 'spotted you';
  else if (s.includes('shadow')) v = 'noticed your shadow';
  else if (s.includes('hear')) v = 'heard you';
  else if (s.includes('close')) v = 'saw you up close';
  else if (s.includes('sight')) v = 'saw you';
  else if (s.includes('radio') || s.includes('shout') || s.includes('told')) v = 'was told about you';
  else if (s.includes('body')) v = 'found a body';
  else if (s.includes('smell')) v = 'smelt you';
  return d.inferred ? `probably ${v}` : v;
}

/** "lit, 9 m" from the sight inputs, for one sighting only. */
function detailOf(d) {
  const out = [];
  const inp = d.inputs;
  if (inp && typeof inp === 'object') {
    const light = inp.light;
    if (typeof light === 'string' && light) out.push(humanise(light));
    else if (typeof light === 'number') out.push(light > 0.5 ? 'lit' : 'in shadow');
    if (typeof inp.distance === 'number') out.push(`${Math.round(inp.distance)} m`);
  }
  return out;
}

/** Group sightings by who and where, keeping first-seen order. */
function groupSightings(list) {
  const groups = [];
  for (const d of list) {
    const who = whoOf(d);
    const place = placeOf(d.space);
    let g = groups.find((x) => x.who === who && x.place === place);
    if (!g) {
      g = { who, place, items: [] };
      groups.push(g);
    }
    g.items.push(d);
  }
  return groups;
}

const sentenceOf = (g, withDetail) => {
  const first = g.items[0];
  const stamps = g.items.map((d) => formatTime(d.t));
  const inside = withDetail && g.items.length === 1 ? [...stamps, ...detailOf(first)] : stamps;
  return `${g.who} ${verbOf(first)} at ${g.place} (${inside.join(', ')})`;
};

/** One walk-card sentence for a list of sightings: "Seen once: ..." / "Seen twice by X at Y (1:12, 1:40)". */
function sightingSentence(list, label) {
  if (list.length === 0) return '';
  const groups = groupSightings(list);
  const n = list.length;
  if (n === 1) return `${label} once: ${sentenceOf(groups[0], true)}`;
  const g0 = groups[0];
  if (groups.length === 1) {
    return `${label} ${times(n)} by ${g0.who} at ${g0.place} (${g0.items.map((d) => formatTime(d.t)).join(', ')})`;
  }
  return `${label} ${times(n)}: ${groups.map((g) => sentenceOf(g, true)).join('; ')}`;
}

function stuckSentence(run) {
  const stops = run.deadStops;
  const one = (s) => `at ${placeOf(s.space)} (${DEAD_STOP_TEXT[s.class] ?? 'the robot stopped'})`;
  if (stops.length === 1) return `Stuck once ${one(stops[0])}.`;
  return `Stuck ${times(stops.length)}: ${stops.map(one).join('; ')}.`;
}

function routeLabel(run) {
  const spaces = [];
  for (const c of run.covers) {
    const name = humanise(Array.isArray(c) ? c[0] : c);
    if (name && !spaces.includes(name)) spaces.push(name);
  }
  const sec = run.section ? `${run.section} ` : '';
  if (ROUTE_KINDS.includes(run.kind)) {
    return `${sec}${run.kind} route${spaces.length ? ` (${spaces.join(', ')})` : ''}`;
  }
  const name = spaces.length ? titleCase(spaces.join(', ')) : titleCase(humanise(run.id));
  return `${sec}${name}`.trim();
}

/** One plain line per run, in Michael's words: no ids, hashes or jargon. */
function walkCardLine(run) {
  const label = routeLabel(run);
  if (run.verdict === 'unplannable') return `${label}: not walked (${run.why}).`;
  const head = run.verdict === 'stuck' ? `${label}: no valid time.` : `${label}: ${formatTime(run.time_s ?? 0)}, never stuck.`;
  const parts = [head];
  if (run.verdict === 'stuck') parts.push(stuckSentence(run));
  const seen = sightingSentence(run.detections, 'Seen');
  const pushed = pushPasts(run).map((x) => `seen again at ${placeOf(x.space)}, robot pushed past`);
  if (seen) parts.push(`${seen}${pushed.map((p) => `; ${p}`).join('')}.`);
  else if (pushed.length) parts.push(`${cap(pushed.join('; '))}.`);
  const noticed = sightingSentence(run.notices, 'Noticed');
  if (noticed) parts.push(`${noticed}.`);
  return parts.join(' ');
}

// ---------- markdown ----------

function timeCell(run) {
  if (run.verdict === 'unplannable') return 'n/a, not walked';
  if (run.verdict === 'stuck') return 'n/a, stuck';
  const marks = [];
  const pp = pushPasts(run).length;
  const slow = slowSteps(run).length;
  if (pp) marks.push(`includes ${plural(pp, 'push-past', 'push-pasts')}`);
  if (slow) marks.push(`${plural(slow, 'step', 'steps')} not made at sneak pace`);
  return formatTime(run.time_s ?? 0) + (marks.length ? ` (${marks.join('; ')})` : '');
}

const resultCell = (run) => (run.verdict === 'pass' ? 'pass' : run.verdict === 'stuck' ? 'STUCK' : 'NOT WALKED');

function restartCause(x) {
  return x.restart === 'timer' ? 'timer' : x.restart === 'other' ? 'other' : 'seen';
}

function m9Line(json) {
  const runs = json.runs;
  const total = json.summary.runTime_s;
  const holds = round1(runs.reduce((a, r) => a + (r.time_s === null ? 0 : holdOf(r)), 0));
  const walk = round1(Math.max(0, total - holds));
  const [lo, hi] = M9_BAND_S;
  const band = total < lo ? 'under' : total > hi ? 'over' : 'inside';
  const noTime = runs.filter((r) => r.time_s === null).length;
  const bits = [
    `M9 run time: ${formatTime(total)} in total (walked ${formatTime(walk)}, held ${formatTime(holds)}), ${band} the 15-20 min target (${lo}-${hi} s)`,
  ];
  if (noTime) bits[0] += `; ${plural(noTime, 'run has', 'runs have')} no valid time and ${noTime === 1 ? 'is' : 'are'} left out`;
  bits[0] += '. A lower bound, report only';

  const drills = [];
  const stubs = [];
  const restarts = [];
  const pushed = [];
  const slow = [];
  for (const r of runs) {
    for (const d of r.drills) {
      drills.push(`${humanise(d.id) || 'a drill'} (player ${d.player ?? '?'}, ${humanise(d.verb) || 'drill'}, held ${d.hold_s} s${d.why === 'timer' ? ', after two timer retries' : ''})`);
    }
    for (const s of r.stubs) stubs.push(`${humanise(s.kind) || 'a move'} at link ${s.link ?? '?'} (held ${s.hold_s} s)`);
    for (const x of r.restarts) {
      restarts.push({ cause: restartCause(x), text: `${x.restart === 'set' ? 'set restart' : x.restart === 'retry' ? 'retry' : 'restart'} at ${placeOf(x.space)}, ${formatTime(x.t)}` });
    }
    for (const x of pushPasts(r)) pushed.push(`${placeOf(x.space)}, ${formatTime(x.t)}`);
    for (const s of slowSteps(r)) slow.push(placeOf(s));
  }
  const byCause = (c) => restarts.filter((x) => x.cause === c).map((x) => x.text);
  const cause = (c) => {
    const l = byCause(c);
    return `${c} ${l.length}${l.length ? ` (${l.join('; ')})` : ''}`;
  };
  const list = (l) => (l.length ? l.join('; ') : 'none');
  bits.push(
    `Drill stubs: ${list(drills)}`,
    `Co-op stubs: ${list(stubs)}`,
    `Restarts by cause: ${cause('seen')}, ${cause('timer')}, ${cause('other')}`,
    `Pushed past: ${list(pushed)}`,
    `Not made at sneak pace: ${list(slow)}`,
  );
  return `${bits.join('. ')}.`;
}

function renderMarkdown(json) {
  const s = json.summary;
  const out = [];
  out.push(`# Route run report: ${json.map ?? 'unknown map'}`, '');
  out.push(`**Result: ${s.verdict === 'pass' ? 'PASS' : 'FAIL'}.** ${verdictWords(json)}`, '');
  if (json.routes === 'code') out.push('Code routes, not a gate run.', '');
  out.push(
    `- Map: ${json.map ?? 'unknown'}${json.mode ? ` (${json.mode})` : ''}`,
    `- Game version: ${json.version ?? 'unknown'}, commit ${json.sha ? String(json.sha).slice(0, 8) : 'unknown'}, ${json.date ?? 'no date'}`,
    `- Graph files: ${json.graphs.length ? json.graphs.join(', ') : 'none listed'}${json.geom ? `, geometry stamp ${json.geom}` : ''}`,
    `- Players: ${json.players}, pace: ${json.pace}, being seen: ${json.detections === 'keep' ? 'kept as it happened' : 'forgiven after each sighting'}`,
    `- Walked links: ${s.walkedLinks}, stubbed links: ${s.stubbed}, drill stubs: ${s.drillStubs}`,
    '',
  );

  out.push('## Summary', '', '| Run | Section | Route | Result | Time | Seen | Noticed | Stubs |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const r of json.runs) {
    out.push(
      `| ${cell(r.id)} | ${cell(r.section ?? '-')} | ${cell(ROUTE_KINDS.includes(r.kind) ? r.kind : humanise(r.kind) || '-')} | ${resultCell(r)} | ${timeCell(r)} | ${r.detections.length} | ${r.notices.length} | ${r.stubs.length + r.drills.length} |`,
    );
  }
  out.push('', `Total: ${plural(s.runs, 'run', 'runs')}, ${s.stuck} stuck, ${s.unplannable} not walked, ${s.detections} seen, ${s.notices} noticed, valid time ${formatTime(s.runTime_s)}.`, '');

  out.push('## Runs', '');
  for (const r of json.runs) {
    out.push(`### ${routeLabel(r)} (${r.id ?? 'no id'})`, '');
    out.push(`- Result: ${resultCell(r)}${r.why ? ` - ${r.why}` : ''}`);
    out.push(`- Time: ${timeCell(r)}, walked ${round1(r.walked_m)} m, guards ${r.guards.alive} alive of ${r.guards.spawned}`);
    out.push(`- Seen: ${r.detections.length ? '' : 'never'}`.trimEnd());
    for (const d of r.detections) out.push(`  - ${formatTime(d.t)}: ${sightingLine(d)}${d.restart ? `, the game sent the pair back (${d.restart})` : ''}`);
    out.push(`- Noticed: ${r.notices.length ? '' : 'never'}`.trimEnd());
    for (const d of r.notices) out.push(`  - ${formatTime(d.t)}: ${sightingLine(d)}`);
    out.push(`- Dead stops: ${r.deadStops.length ? '' : 'none'}`.trimEnd());
    for (const d of r.deadStops) out.push(`  - ${formatTime(d.t)}: ${DEAD_STOP_TEXT[d.class] ?? 'the robot stopped'}, at ${placeOf(d.space)}, link ${d.link ?? '?'}${d.shot ? `, picture ${d.shot}` : ''}`);
    out.push(`- Stubs: ${r.stubs.length || r.drills.length ? '' : 'none'}`.trimEnd());
    for (const x of r.stubs) out.push(`  - ${humanise(x.kind) || 'move'} at link ${x.link ?? '?'}, held ${x.hold_s} s${x.why ? `, ${x.why}` : ''}`);
    for (const x of r.drills) out.push(`  - drill ${humanise(x.id) || '?'}, player ${x.player ?? '?'}, ${humanise(x.verb) || 'drill'}, held ${x.hold_s} s${x.why ? `, ${x.why}` : ''}`);
    if (r.restarts.length) {
      out.push('- Restarts:');
      for (const x of r.restarts) out.push(`  - ${formatTime(x.t)}: ${restartCause(x)} (${x.restart ?? 'unknown'}) at ${placeOf(x.space)}, then ${humanise(x.then) || 'unknown'}`);
    }
    out.push('');
  }

  if (json.notes.length || json.players === 2) {
    out.push('## Notes', '');
    for (const n of json.notes) out.push(`- ${n}`);
    out.push('- Two robots walked every run (the tool does two players only).', '');
  }

  if (isCourse(json)) out.push('## Marlow time', '', m9Line(json), '');

  out.push('## Walk card', '');
  for (const r of json.runs) out.push(`- ${walkCardLine(r)}`);
  out.push('');
  return out.join('\n');
}

const cell = (v) => String(v ?? '-').replace(/\|/g, '/');

function isCourse(json) {
  if (json.mode === 'training' || json.mode === 'course' || json.mode === 'ctcourse') return true;
  return json.runs.some((r) => r.drills.length > 0 || r.restarts.length > 0);
}

function verdictWords(json) {
  const s = json.summary;
  if (s.runs === 0) return 'No runs were walked.';
  if (s.verdict === 'pass') return 'No run got stuck and every run was walked. Being seen never fails a map.';
  const bits = [];
  if (s.stuck) bits.push(`${plural(s.stuck, 'run', 'runs')} got stuck`);
  if (s.unplannable) bits.push(`${plural(s.unplannable, 'run', 'runs')} could not be walked`);
  return `${cap(bits.join(' and '))}.`;
}

function sightingLine(d) {
  const detail = detailOf(d);
  return `${whoOf(d)} ${verbOf(d)} at ${placeOf(d.space)}${detail.length ? ` (${detail.join(', ')})` : ''}`;
}
