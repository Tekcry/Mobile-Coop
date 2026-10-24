// Laptop queue (docs/laptop-queue/PLAN.md): the pure logic, no fs, no child_process, no network. service.mjs (the loop)
// and request.mjs (the desktop CLI) import it; tests/laptop-queue.test.ts covers it.

/**
 * Minutes an alone-measurement may wait before it goes ahead of PR suites (BRIEF A5; 45 -> 30, Orchestrator audit
 * 2026-10-24: coop4's alone gate waited 106 min while newer PR requests kept the slots busy).
 */
export const ALONE_AGE_MIN = 30;

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

/**
 * Commit status context: `laptop-e2e/<set>` (alone: `laptop-e2e/alone-<set>`), set cut to [a-z0-9+._-], 40 chars. A train
 * rerun with a set uses that same `laptop-e2e/<set>` (auto-train sends `--set train<n>-rerun` and reads
 * `laptop-e2e/train<n>-rerun`); only one with no set gets `laptop-e2e/rerun-<suites short>` (the suites without their
 * e2e- prefix, joined by +, 40 chars with "rerun-").
 */
export function contextName(kind, set, suites = [], trainRerun = false) {
  const cut = (raw, n) => String(raw).toLowerCase().replace(/[^a-z0-9+._-]/g, '-').slice(0, n);
  if (trainRerun && !set) return `laptop-e2e/rerun-${cut((suites ?? []).map((s) => String(s).replace(/^e2e-/, '')).join('+'), 34) || 'run'}`;
  const clean = cut(set || (kind === 'full' ? 'full' : suites.join('+')), 40) || 'run';
  return `laptop-e2e/${kind === 'alone' ? 'alone-' : ''}${clean}`;
}

/** The `laptop-e2e` description a passed train rerun posts: "laptop rerun passed: <suites> (desktop fail)", 140 chars. */
export function rerunPassed(suites) {
  const tail = ' (desktop fail)';
  let list = (suites ?? []).join(',');
  const room = 140 - 'laptop rerun passed: '.length - tail.length;
  if (list.length > room) list = `${list.slice(0, room - 3)}...`;
  return `laptop rerun passed: ${list}${tail}`;
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
  if (r.trainRerun && (r.kind !== 'pr' || !(Number(r.pr) > 0))) return 'train rerun needs kind pr and a pr number';
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
 * request, slot } (one free slot), or null. The lowest pending train wins and, while a slot is busy, blocks all new work
 * so the slots drain (preemption); only a rerun of a LOWER train (rerunTrain) goes before it, on one free slot (overlap
 * plan section 3: train N's rerun never waits behind N+1's full run). A train rerun (trainRerun, oldest first) comes next, on one free slot, ahead of every other
 * request and alone run. An alone request over ALONE_AGE_MIN old blocks pr / full work the same way (never starved).
 * Among pr / full requests the requester goes by arrival (the requester whose OLDEST open request has the smallest id),
 * and that requester's NEWEST non-alone request runs (older ones are stale; superseded() normally retires them).
 */
export function pick(queue, now, slots) {
  const idle = slots.filter((s) => !s.busy);
  const bothIdle = idle.length === slots.length;
  const reqs = [...queue.requests].sort(sortById);
  if (queue.trains.length > 0) {
    const front = sortTrains(queue.trains)[0];
    const early = reqs.find((r) => r.trainRerun && trainBelow(rerunTrain(r), front.n));
    if (early) return idle[0] ? { kind: 'request', request: early, slot: idle[0].port } : null;
    return bothIdle ? { kind: 'train', train: front } : null;
  }
  const rerun = reqs.find((r) => r.trainRerun);
  if (rerun) return idle[0] ? { kind: 'request', request: rerun, slot: idle[0].port } : null;
  const alone = reqs.filter((r) => r.kind === 'alone');
  const aged = agedAlone(alone, now);
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

/**
 * The oldest alone request that has waited over ALONE_AGE_MIN (by its id time), or null. While there is one no new pr /
 * full request starts (pick; the service applies it also while the train hold keeps alone requests back), so the
 * slots drain for it; trains and train reruns still go first.
 */
export function agedAlone(requests, now) {
  return [...(requests ?? [])].sort(sortById).find((r) => {
    if (r.kind !== 'alone') return false;
    const t = idTime(r.id);
    return Number.isFinite(t) && now - t > ALONE_AGE_MIN * 60_000;
  }) ?? null;
}

const suiteBase = (s) => String(s).replace(/:.*$/, '');

/**
 * Open requests made redundant by a newer one: Map(olderId -> newerId). R is superseded by the newest N (later id)
 * with the same requester and the same kind ('pr' or 'full' only, never 'alone'), when either both name the same
 * non-empty `set`, or R.sha is N.sha or an ancestor of it (isAncestor(R.sha, N.sha); injected, false on doubt) and N
 * covers every suite of R ('full': always; 'pr': ":part" suffixes ignored). Two different non-empty sets never
 * supersede (deliberate configurations, e.g. a flag off / on pair); nor does a request with no requester, nor a pinned
 * one (`pin: true`, request.mjs --pin: an A/B or baseline run kept on purpose; it may still supersede older ones).
 */
export function superseded(requests, isAncestor) {
  const reqs = [...requests].sort(sortById);
  const out = new Map();
  reqs.forEach((r, i) => {
    if (r.kind !== 'pr' && r.kind !== 'full') return;
    if (r.pin) return;
    if (!r.requester || r.requester === 'unknown') return;
    for (let j = reqs.length - 1; j > i; j--) {
      const n = reqs[j];
      if (n.id === r.id || n.requester !== r.requester || n.kind !== r.kind || Boolean(n.trainRerun) !== Boolean(r.trainRerun)) continue;
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

/** Train heads by train number, lowest first (ls-remote lists them as text: train/100 before train/99). New array. */
export function sortTrains(trains) {
  return [...(trains ?? [])].sort((a, b) => Number(a.n) - Number(b.n));
}

/** true when train number a is below b (both numeric); '?' or '' never is. */
export function trainBelow(a, b) {
  const x = Number(a);
  const y = Number(b);
  return String(a ?? '') !== '' && String(b ?? '') !== '' && Number.isFinite(x) && Number.isFinite(y) && x < y;
}

/** The train a train rerun belongs to: its set train<n>-rerun (auto-train rerunSet), else a train/<n> branch; '' when neither. */
export function rerunTrain(r) {
  return /^train(\d+)-rerun$/.exec(String(r?.set ?? ''))?.[1] ?? /^train\/(\d+)$/.exec(String(r?.branch ?? ''))?.[1] ?? '';
}

/**
 * Trains the desktop may still start while auto-train's build marker stands: only those below the train being built
 * (overlap plan section 3; the N+1 build must not hold back train N). An unreadable marker ('?') blocks every train.
 */
export function trainsUnderMarker(trains, marker) {
  return (trains ?? []).filter((t) => trainBelow(t.n, marker?.train));
}

/**
 * Void-train watch: consecutive checks on which a running train head was not an open train PR head. heads = the open
 * train PR head shas (a Set), or null when the listing failed (the count stays). The run is cut at VOID_MISSES, so one
 * bad listing never kills it (as withdrawn requests).
 */
export const VOID_MISSES = 2;
export function voidMisses(prev, sha, heads) {
  if (!heads) return prev;
  return heads.has(sha) ? 0 : prev + 1;
}

/**
 * auto-train's build marker (auto-train-building.json, { train, version, pid, at }, written while `merge-train build`
 * runs): null when absent (text null), else { train, key, ageMs, stale }. Its age is from `at` (the file's mtime when
 * unreadable); stale = not younger than maxMs (a marker left by a killed auto-train never blocks for good).
 */
export function buildMarker(text, mtimeMs, now, maxMs) {
  if (text === null || text === undefined) return null;
  let m = {};
  try { m = JSON.parse(text) ?? {}; } catch { /* unreadable: mtime only */ }
  const at = Date.parse(m.at);
  const ageMs = now - (Number.isFinite(at) ? at : mtimeMs);
  return { train: m.train ?? '?', key: [m.train, m.version, m.pid, Number.isFinite(at) ? m.at : mtimeMs].join('|'), ageMs, stale: !(ageMs < maxMs) };
}

/**
 * What a request runs, as one string: sha, kind, train-rerun flag, suites (sorted) or steps (in order), env (sorted),
 * set, jobs and pr (a different set posts a different context, --jobs 1 is a solo rerun, a pr gets the failure comment).
 * Requester and note do not count (two sessions asking for the same run on the same sha).
 */
export function dupKey(r) {
  const env = Object.entries(r.env ?? {}).map(([k, v]) => `${k}=${v}`).sort();
  const what = r.kind === 'alone' ? r.steps ?? [] : r.kind === 'pr' ? [...(r.suites ?? [])].sort() : [];
  const opt = (v) => (v === undefined || v === null || v === '' ? '' : String(v));
  return JSON.stringify([r.sha, r.kind, Boolean(r.trainRerun), what, env, opt(r.set), opt(r.jobs), opt(r.pr)]);
}

/**
 * Open requests that repeat another request: Map(id -> the id it duplicates). requests = the open ones plus the claimed
 * or running ones (`active: true`, never marked themselves); recentDone = [{ id, key: dupKey, result, date }]. An open
 * request R is a duplicate (same dupKey) of an active request, else of the oldest older open request, else of a request
 * done within windowMs before now with result success. A failure / error / build / nosha / incomplete result never
 * retires a request (a rerun of a failure is meant to run: checker FIX 2026-10-24, the desktop retired the laptop
 * reruns of its own failures). Different requesters still match (player a8ff2d45, 2026-10-23: supersede only joins
 * one requester's pr / full requests and never alone ones); a different set, jobs or pr does not (dupKey).
 */
export function duplicates(requests, recentDone, now, windowMs) {
  const reqs = [...(requests ?? [])].sort(sortById);
  const out = new Map();
  const active = new Map();
  const firstOpen = new Map();
  for (const r of reqs) if (r.active && !active.has(dupKey(r))) active.set(dupKey(r), r.id);
  const done = new Map();
  for (const d of recentDone ?? []) {
    if (!d?.key || d.result !== 'success' || !(now - Date.parse(d.date) < windowMs)) continue;
    if (!done.has(d.key)) done.set(d.key, d.id);
  }
  for (const r of reqs) {
    if (r.active) continue;
    const k = dupKey(r);
    const by = active.get(k) ?? firstOpen.get(k) ?? done.get(k);
    if (by) out.set(r.id, by); else firstOpen.set(k, r.id);
  }
  return out;
}

/**
 * state.done without the entries older than maxMs whose done claim is on the branch (synced(id) true); entries with no
 * readable date stay. A new object; the service prunes on every state save (7 days).
 */
export function pruneDone(done, now, maxMs, synced = () => true) {
  const out = {};
  for (const [id, d] of Object.entries(done ?? {})) {
    const t = Date.parse(d?.date);
    if (Number.isFinite(t) && !(now - t < maxMs) && synced(id)) continue;
    out[id] = d;
  }
  return out;
}

/**
 * The train a non-train run gives its slot back to, or null: the first pending train head (pendingTrains non-empty)
 * while the run (r = the request) has not started its suites or steps (started = false: lock wait, fetch, npm ci,
 * build). A train rerun never yields (it runs at train priority).
 */
export function yieldTo(r, started, trains) {
  if (started || r?.trainRerun || !(trains ?? []).length) return null;
  return trains[0];
}

/**
 * Why a running request stops early, or '': 'withdrawn' when its request file left the laptop-queue branch (the
 * service decides that from two listings in a row, so one bad listing never kills a run); 'train' when a train head is
 * pending and the run is a plain pr request already in its suites (before that, yieldTo gives the slot back), but only
 * when every other run on this worker (others) is a plain pr request too: a train starts with both slots idle, so
 * killing one beside a full, alone or train-rerun run would only waste it. A train rerun, a full run and an alone run
 * never give way to a train once started (Orchestrator audit 2026-10-24: a withdrawn request held 4191 for 67 min and
 * train 56 waited 11 min; checker FIX: no preemption beside a run that cannot give way).
 */
const preemptible = (r) => r?.kind === 'pr' && !r.trainRerun;
export function cutShort(r, { withdrawn = false, trains = [], started = false, others = [] } = {}) {
  if (withdrawn) return 'withdrawn';
  if (started && preemptible(r) && (trains ?? []).length && (others ?? []).every(preemptible)) return 'train';
  return '';
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
 * The open train that holds alone requests back, or null: the first open train PR head (heads = [{ n, sha, laptop }],
 * laptop = its laptop-e2e state, '' for none) without a laptop-e2e success. A failed train still open waits for a rerun
 * or a release decision, and a head still building has no status yet: both hold (CLAUDE.md "measurements that need a
 * slot alone only while no train is queued"; train 46 waited 30 min behind the LR16-8 sheets, 2026-10-24).
 */
export function trainHold(heads) {
  return (heads ?? []).find((h) => h.laptop !== 'success') ?? null;
}

/**
 * Why the laptop should start no new non-train work now because a train is about to need both slots, or '' (Orchestrator
 * audit 2026-10-24: the laptop claimed an alone run 51 s before train 60's build began, so the train waited ~4.5 min).
 * building = an open train PR whose head is not its version commit yet ({ n, ageMs }; merge-train opens the PR before it
 * pushes the version commit), held while younger than buildMaxMs; release = the newest merged train PR ({ n, ageMs }),
 * held for gapMs after it while candidates (open train-ready PRs with a green check) > 0, the next build being due.
 */
export function trainSoon({ building = null, release = null, candidates = 0 } = {}, { gapMs, buildMaxMs }) {
  if (building && building.ageMs < buildMaxMs) return `train ${building.n} building`;
  if (release && release.ageMs < gapMs && candidates > 0) return `train ${release.n} released, ${candidates} train-ready PR(s) waiting`;
  return '';
}

/**
 * The slots a manual lock (any holder line not written by the queue service: `laptop-queue |`) holds now: { port: line }.
 * locks = { port: lock file text, or null when absent }. A pr / alone request is not claimed onto such a slot (a
 * requester's own heavy.lock left its claimed run waiting 12.9 min, audit 2026-10-24); trains keep their own wait.
 */
export function manualLocks(locks) {
  const out = {};
  for (const [port, text] of Object.entries(locks ?? {})) {
    const line = String(text ?? '').trim();
    if (line && !line.startsWith('laptop-queue |')) out[port] = line;
  }
  return out;
}

/**
 * Whether an aged alone request may stop new pr claims under this train hold: only while the holding train can still
 * clear by running here (laptop-e2e none or pending). A failed train, an error or an unreadable PR list ('unknown')
 * may hold for hours, so pr requests keep running then (checker FIX 2026-10-24: no starvation the other way).
 */
export function holdClears(hold) {
  return Boolean(hold) && ['', 'pending'].includes(hold.laptop ?? '');
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
 * subjects end "(<worker>)", newest first): { last, trainClaims, openTrain } = epoch ms of its newest push (NaN when
 * none), whether it ever pushed a "claim train ..." (it runs the service that claims trains), and the train number of its
 * newest "claim train <n>" with no later "done train <n>" / "release train <n>" ('' when none: it runs no train).
 */
export function workerActivity(logText, worker) {
  let last = NaN;
  let trainClaims = false;
  const tail = ` (${worker})`;
  const seen = new Map(); // train n -> { t, open } of its newest event (the first line wins a same-second tie)
  for (const l of String(logText).replace(/\r\n/g, '\n').split('\n')) {
    const m = /^(\d+) (.*)$/.exec(l.trim());
    if (!m || !m[2].endsWith(tail)) continue;
    const t = Number(m[1]) * 1000;
    if (!(t <= last)) last = t;
    if (m[2].startsWith('claim train ')) trainClaims = true;
    const e = /^(claim|done|release) train (\d+)\b/.exec(m[2]);
    if (e && !(seen.get(e[2])?.t >= t)) seen.set(e[2], { t, open: e[1] === 'claim' });
  }
  let openTrain = '';
  let openAt = -Infinity;
  for (const [n, e] of seen) if (e.open && e.t > openAt) { openTrain = n; openAt = e.t; }
  return { last, trainClaims, openTrain };
}

/**
 * Desktop train gate: '' when the desktop may take a train head, else why not. a = { laptop: workerActivity(...,
 * 'laptop'), now, silentMs, trainAgeMs, graceMs, train }. Only while the laptop has pushed no claim / done for silentMs,
 * or while it runs a DIFFERENT train (laptop.openTrain; overlap plan section 3: train N+1 goes to the desktop beside N;
 * train omitted = any train other than the laptop's), only once the laptop claims trains itself (an older laptop service
 * would rerun a desktop-claimed train), and only for a head older than graceMs (a live idle laptop claims a new head
 * within one pass). The claim push stays the real guard.
 */
export function desktopTrainGate(a) {
  if (!a.laptop.trainClaims) return 'laptop service does not claim trains yet';
  const open = String(a.laptop.openTrain ?? '');
  const beside = open !== '' && (a.train === undefined || String(a.train) !== open);
  const quiet = a.now - a.laptop.last;
  if (!beside && quiet < a.silentMs) return `laptop active ${Math.round(quiet / 60_000)} min ago`;
  if (!(a.trainAgeMs >= a.graceMs)) return 'train head too new';
  return '';
}

const SCRATCH_RE = /c:[\\/]+nightshift[\\/]+scratch/i;
const RUNNER_RE = /laptop-runner\.ps1/i;

/**
 * Stale scheduled tasks for the task guard (2026-10-23 23:59: 87 hand-made NightShift-chain-* one-shots fired again and
 * held the slot locks for hours). tasks = [{ name, path, state, actions: [{ execute, args }], ends: [EndBoundary] }],
 * allow = exact names. Stale: not Disabled, not allowed, and its name starts NightShift- or an action mentions
 * C:\NightShift\scratch or laptop-runner.ps1. Allowed: a name in allow, or NightShift-run-* with a trigger EndBoundary
 * (one-shot-task.ps1). Allowed names skip the action rule too (the auto-train task runs a .vbs in scratch).
 * Returns [{ name, path, state, why }].
 */
export function staleTasks(tasks, allow) {
  const ok = new Set(allow ?? []);
  const out = [];
  for (const t of tasks ?? []) {
    const name = String(t?.name ?? '');
    if (!name || t.state === 'Disabled' || ok.has(name)) continue;
    if (name.startsWith('NightShift-run-') && (t.ends ?? []).some((e) => e)) continue;
    const acts = (t.actions ?? []).map((a) => `${a?.execute ?? ''} ${a?.args ?? ''}`);
    let why = '';
    if (name.startsWith('NightShift-')) why = 'not on the allowlist';
    else if (acts.some((a) => SCRATCH_RE.test(a))) why = 'runs from C:\\NightShift\\scratch';
    else if (acts.some((a) => RUNNER_RE.test(a))) why = 'runs laptop-runner.ps1';
    if (why) out.push({ name, path: t.path ?? '\\', state: t.state, why });
  }
  return out;
}
