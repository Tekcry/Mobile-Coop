// Laptop queue (docs/laptop-queue/PLAN.md): the pure logic, no fs, no child_process, no network. service.mjs (the loop)
// and request.mjs (the desktop CLI) import it; tests/laptop-queue.test.ts covers it.

/** Minutes an alone-measurement may wait before it goes ahead of PR suites (BRIEF A5). */
export const ALONE_AGE_MIN = 45;

const sortById = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** "20261023T191500-guard-ai-d7a3b887" -> epoch ms of its UTC time; NaN when the id has no time prefix. */
export function idTime(id) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(String(id));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : NaN;
}

/** A sortable request id: UTC time, the requester as a short slug, the first 8 hex of the sha. */
export function requestId(now, requester, sha) {
  const ts = new Date(now).toISOString().replace(/[-:]/g, '').slice(0, 15);
  const slug = String(requester ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20).replace(/-+$/, '');
  return `${ts}-${slug || 'anon'}-${String(sha).slice(0, 8)}`;
}

/** Commit status context: `laptop-e2e/<set>` (alone: `laptop-e2e/alone-<set>`), set cut to [a-z0-9+._-], 40 chars. */
export function contextName(kind, set, suites = []) {
  const raw = set || (kind === 'full' ? 'full' : suites.join('+'));
  const clean = String(raw).toLowerCase().replace(/[^a-z0-9+._-]/g, '-').slice(0, 40) || 'run';
  return `laptop-e2e/${kind === 'alone' ? 'alone-' : ''}${clean}`;
}

/** The problem with a request object, or '' when it is fine. */
export function requestProblem(r) {
  if (!r || typeof r !== 'object') return 'not an object';
  if (typeof r.id !== 'string' || !r.id) return 'no id';
  if (!/^[0-9a-f]{40}$/.test(String(r.sha))) return 'sha is not a full 40-hex sha';
  if (!['pr', 'full', 'alone'].includes(r.kind)) return `bad kind ${r.kind}`;
  const strings = (a) => Array.isArray(a) && a.length > 0 && a.every((x) => typeof x === 'string' && x);
  if (r.kind === 'pr' && !strings(r.suites)) return 'pr request needs suites';
  if (r.kind === 'alone' && !strings(r.steps)) return 'alone request needs steps';
  return '';
}

/** A `claims/<id>.json` record { worker, pid, at, done } from its text; null when absent or unreadable. */
export function parseClaim(text) {
  if (!text) return null;
  try {
    const c = JSON.parse(text);
    return c && typeof c.worker === 'string' && Number.isFinite(Date.parse(c.at)) ? c : null;
  } catch { return null; }
}

/**
 * True when a claim keeps `worker` off the request: a done claim (any worker), or another worker's claim younger than
 * maxMs (an older one is a dead worker's and may be taken over). The worker's own open claim never blocks (its process
 * restarted; the in-memory claim set guards the live one).
 */
export function claimBlocks(claim, worker, now, maxMs) {
  if (!claim) return false;
  if (claim.done) return true;
  if (claim.worker === worker) return false;
  return now - Date.parse(claim.at) < maxMs;
}

/** Desktop overflow lane gate: start new work only while the backlog is over minBacklog and CPU under maxCpu. */
export function desktopGate(backlog, cpu, minBacklog, maxCpu) {
  if (!(backlog > minBacklog)) return `backlog ${backlog} <= ${minBacklog}`;
  if (!Number.isFinite(cpu)) return 'cpu unknown';
  if (cpu >= maxCpu) return `cpu ${cpu}% >= ${maxCpu}%`;
  return '';
}

/**
 * Per-slot desktop gate: '' when the slot may start, else why it waits. s = { lockName, lockHeld, dirOk, backlog, cpu,
 * minBacklog, maxCpu } (the slot's own lock file, worktree dir and max CPU); lock and dir are checked before desktopGate.
 */
export function desktopSlotGate(s) {
  if (s.lockHeld) return `${s.lockName} held`;
  if (!s.dirOk) return 'worktree missing';
  return desktopGate(s.backlog, s.cpu, s.minBacklog, s.maxCpu);
}

/**
 * What to start next. queue = { trains: [{ sha, n }], requests: [request] }, slots = [{ port, busy }].
 * Returns { kind: 'train', train } or { kind: 'alone', request } (both need BOTH slots idle), { kind: 'request',
 * request, slot } (one free slot), or null. A pending train wins and, while a slot is busy, blocks all new work so the
 * slots drain (preemption). An alone request over ALONE_AGE_MIN old blocks pr / full work the same way (never starved).
 * Among pr / full requests the requester goes by arrival (the requester whose OLDEST open request has the smallest id),
 * and that requester's NEWEST non-alone request runs (older ones are stale; superseded() normally retires them).
 */
export function pick(queue, now, slots) {
  const idle = slots.filter((s) => !s.busy);
  const bothIdle = idle.length === slots.length;
  if (queue.trains.length > 0) return bothIdle ? { kind: 'train', train: queue.trains[0] } : null;
  const reqs = [...queue.requests].sort(sortById);
  const alone = reqs.filter((r) => r.kind === 'alone');
  const aged = alone.find((r) => {
    const t = idTime(r.id);
    return Number.isFinite(t) && now - t > ALONE_AGE_MIN * 60_000;
  });
  if (aged) return bothIdle ? { kind: 'alone', request: aged } : null;
  const nonAlone = reqs.filter((r) => r.kind !== 'alone');
  const newest = new Map(); // requester -> its newest request (reqs is sorted, so the last wins)
  for (const r of nonAlone) newest.set(r.requester ?? '', r);
  const first = nonAlone[0]; // the oldest request overall belongs to the requester who has waited longest
  const next = first ? newest.get(first.requester ?? '') : undefined;
  if (next && idle[0]) return { kind: 'request', request: next, slot: idle[0].port };
  if (!next && alone[0] && bothIdle) return { kind: 'alone', request: alone[0] };
  return null;
}

const suiteBase = (s) => String(s).replace(/:.*$/, '');

/**
 * Open requests made redundant by a newer one: Map(olderId -> newerId). R is superseded by the newest N (later id)
 * with the same requester and the same kind ('pr' or 'full' only, never 'alone'), when either both name the same
 * non-empty `set`, or R.sha is N.sha or an ancestor of it (isAncestor(R.sha, N.sha); injected, false on doubt) and N
 * covers every suite of R ('full': always; 'pr': ":part" suffixes ignored). Two different non-empty sets never
 * supersede (deliberate configurations, e.g. a flag off / on pair); nor does a request with no requester.
 */
export function superseded(requests, isAncestor) {
  const reqs = [...requests].sort(sortById);
  const out = new Map();
  reqs.forEach((r, i) => {
    if (r.kind !== 'pr' && r.kind !== 'full') return;
    if (!r.requester || r.requester === 'unknown') return;
    for (let j = reqs.length - 1; j > i; j--) {
      const n = reqs[j];
      if (n.id === r.id || n.requester !== r.requester || n.kind !== r.kind) continue;
      const rSet = typeof r.set === 'string' && r.set !== '' ? r.set : '';
      const nSet = typeof n.set === 'string' && n.set !== '' ? n.set : '';
      if (rSet && nSet && rSet !== nSet) continue;
      let ok = rSet !== '' && rSet === nSet;
      if (!ok) {
        const nBases = new Set((n.suites ?? []).map(suiteBase));
        const covers = r.kind === 'full' || (r.suites ?? []).every((s) => nBases.has(suiteBase(s)));
        ok = covers && (r.sha === n.sha || Boolean(isAncestor(r.sha, n.sha)));
      }
      if (ok) { out.set(r.id, n.id); return; }
    }
  });
  return out;
}

/**
 * Splits a job list into `bins` bins, longest first into the lighter bin. weights = suite -> seconds; a suite with no
 * time weighs the median of the known ones (1 when none are known). Deterministic: ties go by name, then the first bin.
 * Returns [{ suites, weight }].
 */
export function shard(list, times, bins = 2) {
  const known = list.map((s) => times[s]).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const median = known.length ? known[Math.floor(known.length / 2)] : 1;
  const items = [...new Set(list)].map((s) => ({ s, w: Number.isFinite(times[s]) ? times[s] : median }));
  items.sort((a, b) => b.w - a.w || (a.s < b.s ? -1 : 1));
  const out = Array.from({ length: bins }, () => ({ suites: [], weight: 0 }));
  for (const it of items) {
    const bin = out.reduce((lo, b) => (b.weight < lo.weight ? b : lo), out[0]);
    bin.suites.push(it.s);
    bin.weight += it.w;
  }
  return out;
}

/**
 * Reads a run-e2e.mjs output. Suite lines come from its "times (...)" block ("  <s> ok|FAIL|FAIL (KNOWN FLAKY)|REPORT
 * ONLY (exit N) <n>s"). Returns { suites: [{ s, ok, flaky, report, sec }], wall, passed, failed, complete } with
 * failed = the names in its "<k> suite(s) failed: a, b" line and complete = its summary line ("all e2e suites passed"
 * or the failed line) was seen; a runner that died before its summary is not complete.
 */
export function parseRun(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => /^times \(/.test(l));
  const suites = [];
  if (start >= 0) {
    for (const l of lines.slice(start + 1)) {
      const m = /^ {2}(\S+) (ok|FAIL \(KNOWN FLAKY\)|FAIL|REPORT ONLY \(exit \d+\)) (\d+)s$/.exec(l);
      if (m) suites.push({ s: m[1], ok: m[2] === 'ok' || m[2].startsWith('REPORT'), flaky: m[2].includes('KNOWN FLAKY'), report: m[2].startsWith('REPORT'), sec: +m[3] });
      else if (suites.length && l.trim() === '') break;
    }
  }
  const wall = /^wall (\d+)s/m.exec(text);
  const failed = /^(\d+) suite\(s\) failed: (.+)$/m.exec(text);
  return {
    suites,
    wall: wall ? +wall[1] : 0,
    passed: /^all e2e suites passed$/m.test(text),
    failed: failed ? failed[2].split(', ').map((x) => x.trim()) : [],
    complete: /^all e2e suites passed$/m.test(String(text)) || Boolean(failed),
  };
}

/**
 * True when a parsed run is a full verdict: its summary line was seen and it reports at least `expected` suites
 * (exact = true: exactly `expected`, for a train shard whose job list is already expanded). Anything else (a runner
 * killed before its summary, a missing suite) must never post success.
 */
export function runComplete(run, expected, exact = false) {
  if (!run || !run.complete) return false;
  const n = run.suites.length;
  return exact ? n === expected : n >= expected && n > 0;
}

/** The last `max` characters of a text, with a cut marker when cut. */
export function capTail(text, max) {
  const t = String(text);
  return t.length > max ? `...(cut)\n${t.slice(t.length - max + 9)}` : t;
}

/** Folds the ok, non-report suites of a run into the times map (suite -> seconds); returns a new map. */
export function mergeTimes(times, suites) {
  const out = { ...times };
  for (const x of suites) if (x.ok && !x.report && x.sec > 0) out[x.s] = x.sec;
  return out;
}

/** Status description: "<pass>/<n> pass, <wall> s" + "; flake: a,b" + "; known flaky: c" + "; FAIL: d", cut to 140. */
export function describe(result) {
  const real = result.suites.filter((x) => !x.report);
  const pass = real.filter((x) => x.ok).length;
  const names = (a) => a.map((x) => x.s).join(',');
  let d = `${pass}/${real.length} pass, ${Math.round(result.wall)} s`;
  if (result.flakes?.length) d += `; flake: ${result.flakes.join(',')}`;
  const kf = real.filter((x) => !x.ok && x.flaky);
  if (kf.length) d += `; known flaky: ${names(kf)}`;
  const bad = real.filter((x) => !x.ok && !x.flaky);
  if (bad.length) d += `; FAIL: ${names(bad)}`;
  return d.length > 140 ? `${d.slice(0, 137)}...` : d;
}

/** True when package-lock.json differs beyond its "version" lines (the npm ci rule). */
export function lockChanged(oldText, newText) {
  const keep = (t) => String(t).replace(/\r\n/g, '\n').split('\n').filter((l) => !/"version":/.test(l));
  const a = keep(oldText);
  const b = keep(newText);
  return a.length !== b.length || a.some((l, i) => l !== b[i]);
}


/**
 * A suite's section of a run log: from "=== <s> (" (or the streamed "=== <s> ===" header at E2E_JOBS=1) up to the next
 * "=== " line or the "times (" block ('' when absent).
 */
export function suiteSection(logText, suite) {
  const lines = String(logText).replace(/\r\n/g, '\n').split('\n');
  const from = lines.findIndex((l) => l.startsWith(`=== ${suite} (`) || l.trimEnd() === `=== ${suite} ===`);
  if (from < 0) return '';
  let to = lines.findIndex((l, i) => i > from && (l.startsWith('=== ') || /^times \(/.test(l)));
  if (to < 0) to = lines.length;
  return lines.slice(from + 1, to).join('\n');
}

/**
 * For the PR comment, from one suite's section text: the failing assert (first line matching
 * /not ok|Error:|timed out|FAIL/, '' when none) and the last 40 lines of the section.
 */
export function failureExcerpt(sectionText) {
  const lines = String(sectionText).replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  const assert = lines.find((x) => /not ok|Error:|timed out|FAIL/.test(x)) ?? '';
  return { assert, tail40: lines.slice(-40).join('\n') };
}

/**
 * An assert line reduced to what names it: bracketed parts ([host: sim 90.30 s ...] timing and state dumps) dropped,
 * numbers as #, spaces collapsed. '' for no assert.
 */
export function assertKey(line) {
  return String(line ?? '').replace(/\[[^\]]*\]/g, '').replace(/\d+(?:\.\d+)?/g, '#').replace(/\s+/g, ' ').trim();
}

/**
 * The failure stands without an alone rerun: the same suite flaked within windowMs on the same assert key. A flake
 * recorded without a key (older state) or a failure with no assert never matches, so it is rerun.
 */
export function flakeStands(flakes, suite, key, now, windowMs) {
  return Boolean(key) && (flakes ?? []).some((f) => f.suite === suite && f.key === key && now - Date.parse(f.date) < windowMs);
}

/**
 * The train's own build already failed: the first auto-train/* status (auto-train/vitest, ...) in failure or error as
 * { context, state }, else null. statuses = a combined status list (latest per context). Such a head never takes the slots.
 */
export function trainBuildFailed(statuses) {
  return (statuses ?? []).find((s) => /^auto-train\//.test(String(s?.context)) && (s.state === 'failure' || s.state === 'error')) ?? null;
}

/**
 * A worker's claim pushes on the laptop-queue branch, from `git log --format="%ct %s" -- claims/` lines (writeClaims
 * subjects end "(<worker>)"): { last, trainClaims } = epoch ms of its newest push (NaN when none) and whether it ever
 * pushed a "claim train ..." (it runs the service that claims trains).
 */
export function workerActivity(logText, worker) {
  let last = NaN;
  let trainClaims = false;
  const tail = ` (${worker})`;
  for (const l of String(logText).replace(/\r\n/g, '\n').split('\n')) {
    const m = /^(\d+) (.*)$/.exec(l.trim());
    if (!m || !m[2].endsWith(tail)) continue;
    const t = Number(m[1]) * 1000;
    if (!(t <= last)) last = t;
    if (m[2].startsWith('claim train ')) trainClaims = true;
  }
  return { last, trainClaims };
}

/**
 * Desktop train gate: '' when the desktop may take a train head, else why not. a = { laptop: workerActivity(...,
 * 'laptop'), now, silentMs, trainAgeMs, graceMs }. Only while the laptop has pushed no claim / done for silentMs, only
 * once the laptop claims trains itself (an older laptop service would rerun a desktop-claimed train), and only for a
 * head older than graceMs (a live idle laptop claims a new head within one pass). The claim push stays the real guard.
 */
export function desktopTrainGate(a) {
  if (!a.laptop.trainClaims) return 'laptop service does not claim trains yet';
  const quiet = a.now - a.laptop.last;
  if (quiet < a.silentMs) return `laptop active ${Math.round(quiet / 60_000)} min ago`;
  if (!(a.trainAgeMs >= a.graceMs)) return 'train head too new';
  return '';
}
