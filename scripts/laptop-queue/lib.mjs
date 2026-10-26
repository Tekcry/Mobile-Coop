// Laptop queue (docs/laptop-queue/PLAN.md): the pure logic, no fs, no child_process, no network. service.mjs (the loop)
// and request.mjs (the desktop CLI) import it; tests/laptop-queue.test.ts covers it. e2e-affected.mjs is pure too (the
// suite selection affectedSuites shares with request.mjs --affected).
import { affectedPick } from '../e2e-affected.mjs';
// parseLock is pure (heavy-lock.mjs's own fs use stays in its functions, none run on import)
import { parseLock } from '../heavy-lock.mjs';

/**
 * Minutes an alone-measurement may wait before it goes ahead of PR suites (BRIEF A5; 45 -> 30, Orchestrator audit
 * 2026-10-24: coop4's alone gate waited 106 min while newer PR requests kept the slots busy).
 */
export const ALONE_AGE_MIN = 30;

const sortById = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * A request's queue place (laptop-queue-8 A4): its `place` (the id of the older request a supersede retired, lib
 * placeFor) when that is a string below its own id, else its id. pick sorts pr / full work by it.
 */
export const placeKey = (r) => (typeof r?.place === 'string' && r.place < r.id ? r.place : r?.id);
const sortByPlace = (a, b) => { const x = placeKey(a); const y = placeKey(b); return x < y ? -1 : x > y ? 1 : sortById(a, b); };

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

/** The `laptop-e2e` description a passed train rerun posts: "laptop rerun passed: <suites> (<why>)", 140 chars (why: desktop fail, or confirm rerun). */
export function rerunPassed(suites, why = 'desktop fail') {
  const tail = ` (${why})`;
  let list = (suites ?? []).join(',');
  const room = 140 - 'laptop rerun passed: '.length - tail.length;
  if (list.length > room) list = `${list.slice(0, room - 3)}...`;
  return `laptop rerun passed: ${list}${tail}`;
}

/**
 * The branch a request names when --branch is not given (Orchestrator 2026-10-25: 171 open requests had branch ""), so
 * its failure comments reach the right PR: the ref asked for; else nothing for a sha already on master (every later
 * branch contains it); else the requester's checkout branch when the sha IS its head; else the one remote work branch
 * whose tip is the sha, then the one that contains it (master, train/*, dev, laptop-queue and HEAD never count); ''
 * when none or several (checker FIX: a master or stacked-parent sha took the requester's branch and PR).
 */
const NOT_WORK_BRANCH = /^(HEAD|master|main|dev|laptop-queue|cloud-queue|ct-movement|train\/.*)$/;
export function pickBranch({ ref = '', onMaster = false, headBranch = '', headIsSha = false, pointsAt = [], containing = [] } = {}) {
  if (ref) return ref.replace(/^origin\//, '');
  if (onMaster) return '';
  if (headBranch && headIsSha && !NOT_WORK_BRANCH.test(headBranch)) return headBranch;
  const work = (lines) => [...new Set(lines.map((b) => b.trim().replace(/^origin\//, '')).filter((b) => b && !b.includes(' -> ') && !NOT_WORK_BRANCH.test(b)))];
  const tips = work(pointsAt);
  if (tips.length) return tips.length === 1 ? tips[0] : '';
  const all = work(containing);
  return all.length === 1 ? all[0] : '';
}

/** --suites text -> suite names, split on spaces and / or commas ("e2e-a,e2e-b" reached run-e2e as one name). */
export const splitSuites = (text) => String(text ?? '').split(/[\s,]+/).filter(Boolean);

/** scripts/e2e-<x>.mjs files that are modules, not suites (run-e2e NOT_SUITES plus the shared e2e libraries). */
export const NOT_SUITE_SCRIPTS = ['e2e-affected', 'e2e-lib', 'e2e-net-lib'];

/**
 * The suite names run-e2e can run at a sha, from its `git ls-tree --name-only <sha> scripts/` paths: `smoke`,
 * `anim-audit` and every scripts/e2e-<x>.mjs that is not a module (run-e2e runs a named suite as `scripts/<name>.mjs`,
 * so this is its whole REQUIRED / LEGACY / AUDIO / GPU / REPORT table plus by-name suites like e2e-editor).
 */
export function knownSuites(paths) {
  const names = (paths ?? []).map((p) => /^scripts\/((?:e2e-[a-z0-9-]+)|smoke|anim-audit)\.mjs$/.exec(String(p).trim())?.[1]).filter(Boolean);
  return new Set(names.filter((n) => !NOT_SUITE_SCRIPTS.includes(n)));
}

/** The suite names not in `known` (a `name:N` part counts as its base name); [] when all are known. */
export const unknownSuites = (suites, known) => (suites ?? []).filter((s) => !known.has(String(s).split(':')[0]));

/**
 * The problem with a request object, or '' when it is fine. `known` (request.mjs: knownSuites at the request's sha)
 * refuses an unknown suite name at request time (before, a bad name reached run-e2e: MODULE_NOT_FOUND, a false failure).
 */
export function requestProblem(r, { known } = {}) {
  if (!r || typeof r !== 'object') return 'not an object';
  if (typeof r.id !== 'string' || !r.id) return 'no id';
  if (!/^[0-9a-f]{40}$/.test(String(r.sha))) return 'sha is not a full 40-hex sha';
  if (!['pr', 'full', 'alone'].includes(r.kind)) return `bad kind ${r.kind}`;
  const strings = (a) => Array.isArray(a) && a.length > 0 && a.every((x) => typeof x === 'string' && x);
  if (r.kind === 'pr' && !strings(r.suites)) return 'pr request needs suites';
  const bad = r.kind === 'pr' && known ? unknownSuites(r.suites, known) : [];
  if (bad.length) return `unknown suite(s) ${bad.join(', ')} (run-e2e runs smoke, anim-audit and scripts/e2e-<name>.mjs at the sha; a part is name:N)`;
  if (r.kind === 'alone' && !strings(r.steps)) return 'alone request needs steps';
  if (r.trainRerun && (r.kind !== 'pr' || !(Number(r.pr) > 0))) return 'train rerun needs kind pr and a pr number';
  if (r.laptopRerun && r.kind !== 'pr') return 'laptop rerun needs kind pr';
  if (r.priority !== undefined && !Number.isInteger(r.priority)) return 'priority must be an integer';
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
 * restarted; the in-memory claim set guards the live one). laptop-queue-8 A17: a claim that carries `beat` (ms, its
 * worker's heartbeat) blocks only while younger than min(maxMs, beats x beat) when beats > 0 (LQ_CLAIM_BEATS): a run
 * whose heartbeat stopped is stale after a few beats, not hours.
 */
export function claimBlocks(claim, worker, now, maxMs, beats = 0) {
  if (!claim) return false;
  if (claim.done) return true;
  if (claim.worker === worker) return false;
  const beat = Number(claim.beat);
  const limit = beats > 0 && beat > 0 ? Math.min(maxMs, beats * beat) : maxMs;
  return now - Date.parse(claim.at) < limit;
}

/**
 * Desktop overflow lane gate: start new work only while the backlog is over minBacklog and CPU under maxCpu. cpu is the
 * gated load (gatedCpu: BelowNormal / Idle processes left out); total (optional, the whole machine) only goes into the
 * reason so the log explains a wait, e.g. "cpu 62% >= 50% (Normal+ priority; total 95%)". mode 'total'
 * (LQ_DESKTOP_CPU_MODE=total, laptop-queue-8 A11: cpu is then the whole machine, lib gateCpu) says so in the reason.
 */
export function desktopGate(backlog, cpu, minBacklog, maxCpu, total, mode = 'normal') {
  if (!(backlog > minBacklog)) return `backlog ${backlog} <= ${minBacklog}`;
  if (!Number.isFinite(cpu)) return 'cpu unknown';
  if (cpu >= maxCpu && mode === 'total') return `cpu ${cpu}% >= ${maxCpu}% (total mode: whole machine)`;
  if (cpu >= maxCpu) return `cpu ${cpu}% >= ${maxCpu}%${Number.isFinite(total) ? ` (Normal+ priority; total ${total}%)` : ''}`;
  return '';
}

/**
 * Per-slot desktop gate: '' when the slot may start, else why it waits. s = { lockName, lockHeld, dirOk, backlog, cpu,
 * cpuTotal?, minBacklog, maxCpu, cpuMode? } (the slot's own lock file, worktree dir and max CPU; cpu the load the gate
 * reads (lib gateCpu), cpuTotal the whole machine for the reason only, cpuMode 'normal' | 'total'); lock and dir are
 * checked before desktopGate.
 */
export function desktopSlotGate(s) {
  if (s.lockHeld) return `${s.lockName} held`;
  if (!s.dirOk) return 'worktree missing';
  return desktopGate(s.backlog, s.cpu, s.minBacklog, s.maxCpu, s.cpuTotal, s.cpuMode);
}

/**
 * Waste audit 2026-10-25 (4191 blocked by heavy.lock 21:57 to 01:20+ with 4-10 requests waiting; the gate only checked
 * that the file exists): what to do with a slot lock read twice. `first` / `second` are the file text of two reads
 * (null: absent); `host` this machine, `alive(pid)` the pid probe (heavy-lock.mjs pidAlive). -> { action, why }:
 * 'free' (no lock), 'break' (it names a pid that is dead on this host and both reads match, so no fresh taker raced
 * us), or 'hold' (no parseable pid, another host, a live pid, or the text changed between the reads). Same rule and
 * parser as heavy-lock.mjs isStale: an old-format line with no pid is never broken; the service's own "laptop-queue |
 * ... pid <n> | <iso>" line names no host and is this machine's (2026-10-25 ~10:51: a killed desktop service's pid 4484
 * lines held heavy.lock / heavy2.lock for 10+ min because the gate read no pid in them).
 */
export function slotLockDecision(first, second, { host, alive }) {
  const a = first == null ? '' : String(first).trim();
  if (!a) return { action: 'free', why: 'no lock' };
  const { pid, host: h } = parseLock(a);
  if (pid === null) return { action: 'hold', why: 'no pid in the lock' };
  if (h !== null && h !== host) return { action: 'hold', why: `pid ${pid} is on ${h}, not ${host}` };
  if (alive(pid)) return { action: 'hold', why: `pid ${pid} is alive` };
  const b = second == null ? '' : String(second).trim();
  if (b !== a) return { action: 'hold', why: 'the lock changed between two reads' };
  return { action: 'break', why: `pid ${pid} is not alive on ${host}` };
}

/**
 * Whole-machine busy % between two os.cpus() snapshots (user+nice+sys+irq over all times, idle included), rounded and
 * clamped 0-100; NaN when either is missing, the core count differs or no time passed.
 */
export function cpuTotalPct(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after) || !before.length || before.length !== after.length) return NaN;
  let busy = 0;
  let all = 0;
  for (let i = 0; i < after.length; i++) {
    const a = before[i]?.times;
    const b = after[i]?.times;
    if (!a || !b) return NaN;
    const d = (k) => (Number(b[k]) || 0) - (Number(a[k]) || 0);
    const work = d('user') + d('nice') + d('sys') + d('irq');
    busy += work;
    all += work + d('idle');
  }
  if (!(all > 0)) return NaN;
  return Math.round(Math.min(100, Math.max(0, (busy / all) * 100)));
}

/**
 * Background CPU from service.mjs BG_CPU_PS output: "a <pid> <ms>" lines (first Get-Process snapshot) and "b <pid> <ms>"
 * (second) for processes below Normal base priority (< 8: BelowNormal 6, Idle 4; pid 0 is left out), plus "el <ms>" (wall
 * time between the snapshots). Returns { bgMs, elapsedMs }: CPU ms the background processes used in the window, summed
 * over pids in both snapshots (a pid in only one started, ended or changed priority in the window and is skipped, so
 * the gate leans toward counting load). elapsedMs is NaN when the el line is missing or not positive.
 * laptop-queue-10 A9 (F24): a line may carry a 4th token, the process name or `e2e` (a Playwright browser: they run at
 * Idle priority; old 3-token lines name ''). With countE2e (LQ_CPU_COUNT_E2E) the e2e rows stay out of bgMs: they are
 * the queue's own load. Also returns e2eMs (their ms) and top: the 3 heaviest subtracted names by ms.
 */
export function backgroundCpuMs(text, { countE2e = true } = {}) {
  const a = new Map();
  const b = new Map();
  let elapsedMs = NaN;
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const m = /^\s*([ab])\s+(\d+)\s+(\d+(?:\.\d+)?)(?:\s+(\S+))?\s*$/.exec(line);
    if (m) {
      if (m[2] !== '0') (m[1] === 'a' ? a : b).set(m[2], { ms: Number(m[3]), name: m[4] ?? '' });
      continue;
    }
    const e = /^\s*el\s+(\d+(?:\.\d+)?)\s*$/.exec(line);
    if (e && Number(e[1]) > 0) elapsedMs = Number(e[1]);
  }
  let bgMs = 0;
  let e2eMs = 0;
  const byName = new Map();
  for (const [pid, { ms, name }] of b) {
    if (!a.has(pid)) continue;
    const d = Math.max(0, ms - a.get(pid).ms);
    if (name === 'e2e') e2eMs += d;
    if (name === 'e2e' && countE2e) continue;
    bgMs += d;
    if (name) byName.set(name, (byName.get(name) ?? 0) + d);
  }
  const top = [...byName].filter(([, ms]) => ms > 0).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([name, ms]) => ({ name, ms }));
  return { bgMs, elapsedMs, e2eMs, top };
}

/**
 * The CPU % the desktop gates use: total (cpuTotalPct over the same window) minus the background processes' share
 * (bgMs / (elapsedMs * cores)), rounded and clamped 0-100; NaN when total, elapsedMs or cores is unusable. 2026-10-24
 * 22:34-23:36: port 4192 started nothing for ~62 min with 5 requests waiting because a BelowNormal Blender bake kept the
 * machine over its 50% gate; work below Normal priority yields to the e2e run, so it no longer blocks a start.
 */
export function gatedCpu({ total, bgMs, elapsedMs, cores }) {
  if (!Number.isFinite(total) || !(elapsedMs > 0) || !(cores > 0)) return NaN;
  const bg = ((Number(bgMs) || 0) / (elapsedMs * cores)) * 100;
  return Math.round(Math.min(100, Math.max(0, total - bg)));
}

/**
 * The CPU % a desktop gate reads (laptop-queue-8 A11, LQ_DESKTOP_CPU_MODE): c = { gated, total } (service cpuGated);
 * mode 'total' -> the whole machine, anything else ('normal', the default) -> the gated load (lib gatedCpu).
 */
export const gateCpu = (c, mode) => (mode === 'total' ? c?.total : c?.gated);

/**
 * The CPU reading a desktop start or refusal logs (laptop-queue-10 A9, F24): c = service cpuGated { gated, total, top,
 * elapsedMs, cores }. "cpu <gated>% gated / <total>% total (<mode>)", plus the top subtracted processes ("; subtracted:
 * <name> <pct>%, ...", pct of the whole machine) when total - gated >= 20.
 */
export function cpuNote(c, mode) {
  const pct = (v) => (Number.isFinite(v) ? `${v}%` : '?');
  const out = `cpu ${pct(c?.gated)} gated / ${pct(c?.total)} total (${mode})`;
  if (!(c?.total - c?.gated >= 20) || !(c?.elapsedMs > 0) || !(c?.cores > 0) || !c?.top?.length) return out;
  return `${out}; subtracted: ${c.top.map((x) => `${x.name} ${Math.round((x.ms / (c.elapsedMs * c.cores)) * 100)}%`).join(', ')}`;
}

/**
 * The desktop leaves a request to the laptop when its wall at E2E_JOBS=1 (lib desktopWallS) is over maxS (laptop-queue-8
 * A9, LQ_DESKTOP_MAX_MIN 15): times = the seed merged with the desktop's times.json; parts = what still runs (A10 kept
 * suites) as run-e2e lists it (service partsOf; default lib suiteParts over times). A part with no time weighs the
 * median, so an unknown request is no longer taken (laptop-queue-10 A6, F14); maxS <= 0 = no limit.
 */
export function desktopTooLong(r, times, maxS, parts = suiteParts(keptPlan(r, r?.sha, times).rest, times)) {
  return maxS > 0 && desktopWallS(parts, times, 1) > maxS;
}

/**
 * A desktop run's wall in s (laptop-queue-10 A6): the heaviest of `jobs` bins (lib shard) of its parts, a part weighing
 * its times.json value, else the median of every time there (60 s when none: run-e2e's own default). 0 for no parts,
 * never NaN (lib expectedWallS is NaN for any suite with no time: tallow-prg1's 17 parts, ~60 min, were taken).
 */
export function desktopWallS(parts, times, jobs = 1) {
  if (!(parts ?? []).length) return 0;
  const m = median(Object.values(times ?? {}));
  const fill = Number.isFinite(m) ? m : 60;
  const w = Object.fromEntries(parts.map((p) => [p, Number.isFinite(times?.[p]) ? times[p] : fill]));
  return Math.max(...shard(parts, w, Math.max(1, Number(jobs) || 1)).map((b) => b.weight));
}

/** Front tier of lib pick (laptop-queue-7): a branch naming a LQ_FRONT_BRANCHES entry (case-insensitive substring), or an early-id re-file (no id time, or before 2020). */
export function isFront(r, frontBranches = []) {
  const t = idTime(r?.id);
  if (!Number.isFinite(t) || t < Date.UTC(2020, 0, 1)) return true;
  const b = String(r?.branch ?? '').toLowerCase();
  return Boolean(b) && (frontBranches ?? []).some((f) => f && b.includes(String(f).toLowerCase()));
}

/**
 * Fix tier of lib pick (laptop-queue-8 A2): a pr / full request with `fix: true` (request.mjs --fix) or whose PR carries
 * the `fix` label on the board (lib prBoard, read live each pass). Never an alone, spare, train rerun or laptop rerun
 * request (those sit above or apart).
 */
export function isFix(r, board) {
  if (!r || (r.kind !== 'pr' && r.kind !== 'full') || r.trainRerun || r.laptopRerun || r.requester === SPARE_REQUESTER) return false;
  return r.fix === true || board?.get(r.pr)?.fix === true;
}

/**
 * Ids of the requests that are green PR work: kind pr (not a train or laptop rerun, not spare) whose PR is on the board
 * at the request's own sha with a green check + checker (a stale sha is not green). board = lib prBoard Map; empty = none.
 */
export function greenIds(requests, board) {
  const out = new Set();
  for (const r of requests ?? []) {
    if (r.kind !== 'pr' || r.trainRerun || r.laptopRerun || r.requester === SPARE_REQUESTER) continue;
    const b = board?.get(r.pr);
    if (b && b.green && b.head === r.sha) out.add(r.id);
  }
  return out;
}

/**
 * What to start next. queue = { trains: [{ sha, n }], requests: [request] }, slots = [{ port, busy }].
 * Returns { kind: 'train', train } or { kind: 'alone', request } (both need BOTH slots idle), { kind: 'request',
 * request, slot } (one free slot; a sharded train rerun adds `ports`, both slots), or null. The lowest pending train wins and, while a slot is busy, blocks all new work
 * so the slots drain (preemption); only a rerun of a LOWER train (rerunTrain) goes before it, on one free slot (overlap
 * plan section 3: train N's rerun never waits behind N+1's full run). A train rerun (trainRerun, oldest first) comes next, on one free slot, ahead of every other
 * request and alone run. An alone request over ALONE_AGE_MIN old blocks pr / full work the same way (never starved).
 * An alone run preempted by a train (queue.front, a Set of ids; cutShort) goes first among alone requests and counts as
 * aged, so it runs as soon as the trains and their reruns leave both slots idle.
 * Among pr / full requests the requester goes by arrival (the requester whose OLDEST open request has the smallest id),
 * and that requester's OLDEST non-alone request runs, unless one of its requests has a higher `priority` (request.mjs
 * --priority N, default 0; higher first, then oldest). A stale older request is retired before pick by superseded()
 * (same PR / branch, newer head), so oldest-first never runs it. Orchestrator 2026-10-24: newest-first let Guard AI's
 * newer #360 / #363 requests jump its #317 request for 70 min while that PR waited for train-ready. A laptop rerun
 * keeps its place by its id time. priority only orders one requester's own requests, never across requesters.
 * The auto affected-e2e requests queue one requester per branch (queueRequester), so PRs take turns with the leads.
 * Spare work (SPARE_REQUESTER) is picked only when no other request is open: never aged, never at the front. The
 * service also sets queue.realOpen (lib realWaiting on the full listing, before its alone hold filters) so a real
 * request it holds back still keeps a spare from starting.
 * queue.order (laptop-queue-7, the service passes it; absent = the arrival rule above) changes only which pr / full request
 * runs next: 1. the front tier (isFront: a LQ_FRONT_BRANCHES branch or an early-id re-file), oldest first; 2. green PR heads
 * (order.green, a Set of ids), smallest order.wallS first, unknown wall last, ties by id, skipped for this pick when the
 * oldest non-front request, green or not, has waited over order.maxWaitMs (the starvation bound); 3. the arrival rule over
 * the non-front requests. Trains, reruns and aged alone runs go before all of it; spare-only picks ignore it.
 * laptop-queue-8: order.fix (a Set of ids, lib isFix) is tier 0, before the front tier: the smallest queue place first,
 * no wait bound (A1, A3). pr / full work sorts by placeKey (a new head keeps its old request's place, A4) wherever it
 * sorted by id: the front tier, the starvation check (the place's time), green ties and the arrival rule.
 * order.smallest (the desktop, laptop-queue-8 A8) replaces the front / green / arrival tiers after the fix tier: the
 * smallest order.wallS first (the service fills it for every request at E2E_JOBS=1), unknown wall last, ties by place.
 */
export function pick(queue, now, slots) {
  const all = [...queue.requests].sort(sortById);
  const real = all.filter((r) => r.requester !== SPARE_REQUESTER);
  if (real.length || queue.realOpen || !all.length || queue.trains.length) return pickFrom({ ...queue, requests: real }, now, slots);
  return pickFrom({ trains: [], requests: all, front: new Set() }, -Infinity, slots); // spare only: nothing ages
}

function pickFrom(queue, now, slots) {
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
  if (rerun && !idle[0]) return null;
  // laptop-queue-7 A10: the only open train rerun shards across both slots when both are idle and the service marked it
  // (queue.shardRerun: LQ_RERUN_SHARD on, its suites expand to 2+ parts); else one free slot at once, as before
  if (rerun && bothIdle && idle.length > 1 && queue.shardRerun?.has(rerun.id) && reqs.filter((r) => r.trainRerun).length === 1) {
    return { kind: 'request', request: rerun, slot: idle[0].port, ports: idle.map((s) => s.port) };
  }
  if (rerun) return { kind: 'request', request: rerun, slot: idle[0].port };
  const front = queue.front ?? new Set();
  const alone = reqs.filter((r) => r.kind === 'alone').sort((a, b) => Number(front.has(b.id)) - Number(front.has(a.id)));
  const aged = alone.find((r) => front.has(r.id)) ?? agedAlone(alone, now);
  if (aged) return bothIdle ? { kind: 'alone', request: aged } : null;
  const nonAlone = reqs.filter((r) => r.kind !== 'alone').sort(sortByPlace);
  const order = queue.order;
  if (order && idle[0]) {
    const fix = nonAlone.find((r) => order.fix?.has(r.id)); // laptop-queue-8 tier 0: fixes, smallest place first
    if (fix) return { kind: 'request', request: fix, slot: idle[0].port };
    if (order.smallest) { // laptop-queue-8 A8 (the desktop): smallest expected wall first, unknown last, ties by place
      const wall = (r) => { const w = order.wallS?.[r.id]; return Number.isFinite(w) ? w : Infinity; };
      const small = [...nonAlone].sort((a, b) => wall(a) - wall(b) || sortByPlace(a, b))[0];
      return small ? { kind: 'request', request: small, slot: idle[0].port } : arrivalNext([], alone, idle, bothIdle);
    }
    const early = nonAlone.find((r) => isFront(r, order.frontBranches));
    const rest = nonAlone.filter((r) => r !== early && !isFront(r, order.frontBranches));
    let chosen = early;
    if (!chosen) {
      const oldest = rest.find((r) => Number.isFinite(idTime(placeKey(r))));
      const starved = order.maxWaitMs > 0 && oldest && now - idTime(placeKey(oldest)) > order.maxWaitMs;
      if (!starved) {
        const wall = (r) => { const w = order.wallS?.[r.id]; return Number.isFinite(w) ? w : Infinity; };
        chosen = rest.filter((r) => order.green?.has(r.id)).sort((a, b) => wall(a) - wall(b) || sortByPlace(a, b))[0];
      }
    }
    if (chosen) return { kind: 'request', request: chosen, slot: idle[0].port };
    return arrivalNext(rest, alone, idle, bothIdle);
  }
  return arrivalNext(nonAlone, alone, idle, bothIdle);
}

/** pickFrom's arrival rule over the non-alone requests (sorted by placeKey): the longest-waiting requester, priority, oldest. */
function arrivalNext(nonAlone, alone, idle, bothIdle) {
  const first = nonAlone[0]; // the oldest request overall belongs to the requester who has waited longest
  const prio = (r) => (Number.isInteger(r.priority) ? r.priority : 0);
  let next;
  // that requester's highest priority, then oldest (reqs is sorted by id, so the first of a priority wins)
  if (first) for (const r of nonAlone) if (queueRequester(r) === queueRequester(first) && (!next || prio(r) > prio(next))) next = r;
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
  return [...(requests ?? [])].sort(sortById).find((r) => isAgedAlone(r, now)) ?? null;
}
const isAgedAlone = (r, now) => {
  if (r?.kind !== 'alone' || r.requester === SPARE_REQUESTER) return false;
  const t = idTime(r.id);
  return Number.isFinite(t) && now - t > ALONE_AGE_MIN * 60_000;
};

// ---------- laptop-queue-7 A12: an aged alone gets the gap after the coming train ----------

/**
 * The due marks of alone requests (id -> ms first held), a new plain object (state.json `aloneDue`). prev = the last
 * marks; requests = the open requests (the full listing, running ones included); front = the preempted alone ids (lib
 * pick queue.front); held = the ids a hold (aloneHold, aloneSoon, train soon) dropped this pass. An open alone request
 * that is aged (agedAlone rule) or in front and held gets stamped at now; an old stamp stays while its id is open.
 * Spare work and young alone requests are never stamped.
 */
export function aloneDue(prev, { requests = [], front = new Set(), now, held = new Set() } = {}) {
  const open = new Map((requests ?? []).filter((r) => r?.kind === 'alone' && r.requester !== SPARE_REQUESTER).map((r) => [r.id, r]));
  const out = {};
  for (const [id, t] of Object.entries(prev ?? {})) if (open.has(id) && Number.isFinite(t)) out[id] = t;
  for (const [id, r] of open) {
    if (id in out || !held.has(id)) continue;
    if (front.has(id) || isAgedAlone(r, now)) out[id] = now;
  }
  return out;
}

/** true when alone request id is due (aloneDue) and a train's laptop-e2e ended after its mark (lastTrainEndMs). */
export function aloneGapOpen(due, id, lastTrainEndMs) {
  const t = due?.[id];
  return Number.isFinite(t) && Number.isFinite(lastTrainEndMs) && lastTrainEndMs > t;
}

/**
 * The newest final laptop-e2e time (success or failure; pending and error are not an end) on the open train heads
 * ([{ laptop, laptopAt }], pendingTrains' status reads), never below prev: whoever posted it (this worker, the desktop,
 * a carry or a train-rerun pass). ms, or prev (NaN when none ever).
 */
export function lastTrainEndFrom(heads, prev) {
  let best = Number.isFinite(prev) ? prev : NaN;
  for (const h of heads ?? []) {
    if (!['success', 'failure'].includes(h?.laptop)) continue;
    const t = Date.parse(h?.laptopAt ?? '');
    if (Number.isFinite(t) && !(t <= best)) best = t;
  }
  return best;
}

/**
 * The train-soon filter (lib nextTrain): true when request r still starts while the next train is due. Without a hold
 * (next null) everything; else a train rerun, a run that fits before the train (fits, lib fitsBeforeTrain) and an alone
 * request whose gap after a train is open (aloneGapOpen on due; due null = LQ_ALONE_GAP off).
 */
export function holdKeeps(r, { next = null, due = null, lastTrainEnd = NaN, fits = false } = {}) {
  return !next || Boolean(r?.trainRerun) || Boolean(fits) || aloneGapOpen(due, r?.id, lastTrainEnd);
}

const suiteBase = (s) => String(s).replace(/:.*$/, '');

/**
 * Open requests made redundant by a newer one: Map(olderId -> newerId). R is superseded by the newest N (later id)
 * with the same requester and the same kind ('pr' or 'full' only, never 'alone'), when either both name the same
 * non-empty `set`, or R.sha is N.sha or an ancestor of it (isAncestor(R.sha, N.sha); injected, false on doubt) and N
 * covers every suite of R ('full': always; 'pr': ":part" suffixes ignored). Two different non-empty sets never
 * supersede (deliberate configurations, e.g. a flag off / on pair); nor does a request with no requester, nor a pinned
 * one (`pin: true`, request.mjs --pin: an A/B or baseline run kept on purpose; it may still supersede older ones).
 * A laptop rerun (`laptopRerun`, a desktop failure handed to the laptop) supersedes nothing; a newer head may supersede it.
 * The auto affected-e2e requests (requester AFFECTED_REQUESTER, set 'affected') compare per branch (queueRequester): a
 * newer head of the same PR branch supersedes the older one (rebased or not), another PR's never does.
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
      if (n.id === r.id || queueRequester(n) !== queueRequester(r) || n.kind !== r.kind || Boolean(n.trainRerun) !== Boolean(r.trainRerun)) continue;
      if (n.laptopRerun) continue; // a laptop rerun rechecks an older run's failure: it never retires another request
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
 * The queue places supersedes pass on (laptop-queue-8 A4): Map survivorId -> place for each survivor in `requests` (the
 * open ones) that a retired request (sup: lib superseded's Map olderId -> newerId) had waited longer than. place = the
 * smallest placeKey over the survivor and every request it retires (a chain R1 -> R2 -> R3 gives R3 R1's place); a
 * survivor whose own placeKey is already the smallest gets no entry. Pure.
 */
export function placeFor(sup, requests) {
  const byId = new Map((requests ?? []).map((r) => [r.id, r]));
  const out = new Map();
  for (const [oldId, newId] of sup ?? []) {
    const n = byId.get(newId);
    if (!n) continue;
    const o = byId.get(oldId);
    const best = out.get(newId) ?? placeKey(n);
    const cand = o ? placeKey(o) : oldId;
    if (cand < best) out.set(newId, cand);
  }
  return out;
}

/**
 * Running requests a newer head makes moot (laptop-queue-8 A6, BRIEF 3): Map runningId -> newer id. running = the pr
 * requests claimed or running on this worker (lock wait and prepare included); candidates = the open requests plus the
 * ones claimed or running on either worker (R itself is skipped). R pairs with the newest N exactly as lib superseded
 * pairs two open requests (same queueRequester, same kind, no train rerun, compatible set: two different non-empty sets
 * never pair; R not pinned, R's requester known; N not a laptop rerun; N newer by id), with three changes: the suite
 * bases overlap (not cover), R.sha !== N.sha and isAncestor(R.sha, N.sha) always (affected requests too: a rebased
 * head never stops a run), and R is under PREEMPT_MAX_PROGRESS of its expected wall (progressOf(id), NaN = unknown).
 * Kind 'pr' only: a full run is never stopped. Pure.
 */
export function supersededRunning(running, candidates, isAncestor, progressOf = () => NaN) {
  const out = new Map();
  const cands = [...(candidates ?? [])].sort(sortById);
  for (const r of running ?? []) {
    if (r?.kind !== 'pr' || r.trainRerun || r.pin) continue;
    if (!r.requester || r.requester === 'unknown') continue;
    if (progressOf(r.id) >= PREEMPT_MAX_PROGRESS) continue;
    const rSet = typeof r.set === 'string' && r.set !== '' ? r.set : '';
    const rBases = new Set((r.suites ?? []).map(suiteBase));
    for (let j = cands.length - 1; j >= 0; j--) {
      const n = cands[j];
      if (!n || n.id === r.id || !(n.id > r.id)) continue;
      if (queueRequester(n) !== queueRequester(r) || n.kind !== 'pr' || n.trainRerun || n.laptopRerun) continue;
      const nSet = typeof n.set === 'string' && n.set !== '' ? n.set : '';
      if (rSet && nSet && rSet !== nSet) continue;
      if (!(n.suites ?? []).some((s) => rBases.has(suiteBase(s)))) continue;
      if (r.sha === n.sha || !isAncestor(r.sha, n.sha)) continue;
      out.set(r.id, n.id);
      break;
    }
  }
  return out;
}

/**
 * How far a run is through its expected wall: elapsedMs over the heaviest of `jobs` bins of its suites by times.json
 * weight (lib shard, unknown suites at the median), so 1 = due to finish now. NaN when nothing is known.
 */
export function runProgress(suites, times, jobs, elapsedMs) {
  const wallS = expectedWallS(suites, times, jobs);
  return wallS > 0 ? elapsedMs / (wallS * 1000) : NaN;
}

/**
 * The parts a suite list runs as: a named suite with parts in times.json (e2e-desktop -> e2e-desktop:1..4, the keys
 * times.json holds) expands to them; any other name (a part, a suite without parts, an unknown one) stays as given.
 * expectedWallS and the train rerun shard (laptop-queue-7 A10) read it.
 */
export function suiteParts(suites, times) {
  const keys = Object.keys(times ?? {});
  return (suites ?? []).flatMap((s) => {
    const own = keys.filter((k) => k.startsWith(`${s}:`));
    return own.length ? own : [s];
  });
}

/**
 * A run's expected wall in s: the heaviest of `jobs` bins of its suites by times.json weight (runProgress's
 * denominator; a train posts it per shard as "expect ~N s" for auto-train's late poll). NaN when unknown.
 */
export function expectedWallS(suites, times, jobs) {
  if (!(suites ?? []).length || !Object.keys(times ?? {}).length) return NaN;
  // a suite with no time at all makes the estimate unknown (NaN: cut as before), never a 1 s guess (checker FIX)
  const keys = Object.keys(times);
  if (suites.some((s) => !Number.isFinite(times[s]) && !keys.some((k) => k.startsWith(`${s}:`)))) return NaN;
  const parts = suiteParts(suites, times);
  const bins = shard(parts, times, Math.max(1, Number(jobs) || 1));
  const wallS = Math.max(...bins.map((b) => b.weight));
  return wallS > 0 ? wallS : NaN;
}

/**
 * The laptop's alone hold before a train exists (Orchestrator audit 2026-10-24: #323 was labelled 18 s before a 30-min
 * guard-cap alone run claimed both slots): '' or why new alone claims wait. openTrains = open train/<n> PRs, candidates =
 * open train-ready PRs with a green check. An alone request older than ALONE_AGE_MIN still starts (aged; never starved).
 */
export function aloneSoon(openTrains, candidates) {
  return openTrains === 0 && candidates > 0 ? `${candidates} train-ready PR(s) waiting for a train` : '';
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

// ---------- a train head that moves (laptop-queue-7 slice C, BRIEF A7-A9) ----------

/**
 * The G325 docs-only set (`docs/`, `changes/`, `CHANGELOG*`, `*.md`); an empty list is not docs-only. scripts/watchdog.mjs
 * re-exports this one definition (it imports lib, so lib cannot import it back; BRIEF F4).
 */
export const docsOnlyFiles = (files) => files.length > 0 && files.every((f) => /^(docs\/|changes\/|CHANGELOG)|\.md$/.test(f));

/** True when a commit subject is train n's version commit "<v>: version at merge, train <n> (G183)". */
export function isVersionHead(subject, n) {
  const m = /^\d+\.\d+\.\d+: version at merge, train (\d+) \(G183\)$/.exec(String(subject ?? '').trim());
  return !!m && m[1] === String(n);
}

/**
 * Train n's newest version commit in `git log --first-parent -n <depth> --format=%H%x09%s <head>` lines (newest
 * first): { versionSha, index } (index 0 = the head itself), or null when it is not within depth lines or another
 * train's version commit comes first (the walk never passes another train).
 */
export function versionAt(lines, n, depth = Infinity) {
  const rows = (lines ?? []).map((l) => String(l).trim()).filter(Boolean).slice(0, depth);
  for (let i = 0; i < rows.length; i++) {
    const tab = rows[i].indexOf('\t');
    const sha = tab < 0 ? rows[i] : rows[i].slice(0, tab);
    const subject = tab < 0 ? '' : rows[i].slice(tab + 1);
    if (isVersionHead(subject, n)) return { versionSha: sha, index: i };
    if (/: version at merge, train \d+ \(G183\)$/.test(subject.trim())) return null;
  }
  return null;
}

/**
 * A delta a train verdict may carry over: docs-only (G325) and no non-`.md` file under `docs/` (BRIEF F6: docs/kestrel
 * JSON is read by the game and by suites). Not a list (a git error) is false.
 */
export function carryFiles(files) {
  return Array.isArray(files) && docsOnlyFiles(files) && !files.some((f) => f.startsWith('docs/') && !f.endsWith('.md'));
}

const FINAL = new Set(['success', 'failure', 'error']);
/**
 * The carry decision for a moved train head H (BRIEF A7). chain = [{ sha, laptop }] from H's parent back to the version
 * commit, newest first (laptop = that commit's laptop-e2e state, '' when none). filesBetween(sha) = the changed files
 * from sha to H. live(sha) = its run is going (a claim held here, or an open claim under LQ_CLAIM_MAX_H).
 * C = the newest commit with a final verdict (success, failure or error): { from: C } when that verdict is success and
 * the C..H delta carries (carryFiles); a newer failure is never skipped. A pending commit newer than C whose run is live:
 * { wait: P } when the P..H delta carries, else null. A pending commit with no live run counts as no verdict (skipped).
 * null = H runs as a normal train.
 */
export function carryFrom(chain, filesBetween, live = () => false) {
  for (const c of chain ?? []) {
    const st = c?.laptop ?? '';
    if (FINAL.has(st)) return st === 'success' && carryFiles(filesBetween(c.sha)) ? { from: c.sha } : null;
    if (st === 'pending' && live(c.sha)) return carryFiles(filesBetween(c.sha)) ? { wait: c.sha } : null;
  }
  return null;
}

/** The carried laptop-e2e success description (GitHub caps it at 140 chars). */
export const carryDesc = (sha) => `carried from ${String(sha).slice(0, 8)}, docs-only delta`;

/**
 * A PR head's carry chain (laptop-queue-8 A12): `git log --first-parent -n <depth> --format=%H <H>` lines (newest first)
 * minus H itself, cut before the merge-base with origin/master (master's own commits never carry an affected-e2e
 * verdict). The merge-base not within the lines: every line after H (the depth bounds the walk).
 */
export function prChain(lines, mergeBase) {
  const out = [];
  for (const sha of (lines ?? []).map((l) => String(l).trim()).filter(Boolean).slice(1)) {
    if (mergeBase && sha === mergeBase) break;
    out.push(sha);
  }
  return out;
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
  // a laptop rerun of a desktop failure never matches the desktop run it rechecks (that run is still active when it is
  // pushed); the extra element only on reruns, so older keys in state.done stay comparable
  return JSON.stringify([r.sha, r.kind, Boolean(r.trainRerun), what, env, opt(r.set), opt(r.jobs), opt(r.pr), ...(r.laptopRerun ? ['laptopRerun'] : [])]);
}

/**
 * Open requests that repeat another request: Map(id -> the id it duplicates). requests = the open ones plus the claimed
 * or running ones (`active: true`, never marked themselves); recentDone = [{ id, key: dupKey, result, date }]. An open
 * request R is a duplicate (same dupKey) of an active request, else of the oldest older open request, else of a request
 * done within windowMs before now with result success. A failure / error / build / nosha / incomplete result never
 * retires a request (a rerun of a failure is meant to run: checker FIX 2026-10-24, the desktop retired the laptop
 * reruns of its own failures). Different requesters still match (player a8ff2d45, 2026-10-23: supersede only joins
 * one requester's pr / full requests and never alone ones); a different set, jobs or pr does not (dupKey).
 * An auto affected request (AFFECTED_REQUESTER) is retired only against another affected request (active, else open) or
 * a recent success, never against another requester's open or running run: that run posts no affected-e2e, so the
 * head's check would stay pending (Orchestrator audit 2026-10-25; duplicateStatuses posts the retired one's status).
 */
export function duplicates(requests, recentDone, now, windowMs) {
  const reqs = [...(requests ?? [])].sort(sortById);
  const out = new Map();
  const active = new Map();
  const activeAff = new Map();
  const firstOpen = new Map();
  const firstOpenAff = new Map();
  const aff = (r) => r.requester === AFFECTED_REQUESTER;
  for (const r of reqs) {
    if (!r.active) continue;
    const k = dupKey(r);
    if (!active.has(k)) active.set(k, r.id);
    if (aff(r) && !activeAff.has(k)) activeAff.set(k, r.id);
  }
  const done = new Map();
  for (const d of recentDone ?? []) {
    if (!d?.key || d.result !== 'success' || !(now - Date.parse(d.date) < windowMs)) continue;
    if (!done.has(d.key)) done.set(d.key, d.id);
  }
  for (const r of reqs) {
    if (r.active) continue;
    const k = dupKey(r);
    const by = aff(r) ? activeAff.get(k) ?? firstOpenAff.get(k) ?? done.get(k) : active.get(k) ?? firstOpen.get(k) ?? done.get(k);
    if (by) { out.set(r.id, by); continue; }
    if (!firstOpen.has(k)) firstOpen.set(k, r.id);
    if (aff(r) && !firstOpenAff.has(k)) firstOpenAff.set(k, r.id);
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
 * train 56 waited 11 min; checker FIX: no preemption beside a run that cannot give way), except an alone run whose steps
 * started under ALONE_PREEMPT_MIN ago (startedAt, now; Orchestrator 2026-10-24 ~21:05 after train 64 went to the
 * desktop behind a 4-min-old guard-cap run): it is killed and queued again at the head of the alone queue, unless it is
 * due (laptop-queue-7 A12: started in its gap after a train, aloneGapOpen). A pr run at
 * or past PREEMPT_MAX_PROGRESS of its expected wall (progress, lib runProgress; unknown = NaN cuts as before) finishes.
 * A spare run (SPARE_REQUESTER) is cut by any pending train ('train') or any waiting real request ('real', realOpen).
 * 'superseded' (laptop-queue-8 A6) when `superseded` names the newer request lib supersededRunning paired with it, at any
 * stage (lock wait, prepare, suites); 'withdrawn' wins over it. 'taken' (laptop-queue-8 G, checker FIX 1) first of
 * all when `taken` names the worker that now holds the run's claim (a heartbeat push found it blocking, e.g. after a
 * long push outage): the run stops and posts nothing, that worker's run owns the head. 'hung' (laptop-queue-10 A3, F10)
 * when `hung` (lib idleStep: no suite event for the idle limit), after 'withdrawn' and 'superseded', before the spare and
 * train rules.
 */
export const ALONE_PREEMPT_MIN = 10;
/** A pr run this far through its expected wall (runProgress) finishes instead (Orchestrator audit 2026-10-24: a coop4 run cut at 15/15 shards). */
export const PREEMPT_MAX_PROGRESS = 0.8;
const preemptible = (r) => r?.kind === 'pr' && !r.trainRerun;
const youngAlone = (r, startedAt, now) => r?.kind === 'alone' && Number.isFinite(startedAt) && now - startedAt < ALONE_PREEMPT_MIN * 60_000;
export function cutShort(r, { taken = '', withdrawn = false, superseded = '', trains = [], started = false, others = [], startedAt = NaN, now = NaN, progress = NaN, realOpen = false, due = false, hung = false } = {}) {
  if (taken) return 'taken';
  if (withdrawn) return 'withdrawn';
  // laptop-queue-8 A6: a newer head of the same PR is queued (lib supersededRunning; the id): stop at any stage
  if (superseded) return 'superseded';
  // laptop-queue-10 A3: no suite event for the idle limit (#317 held 4192 for 65 min); a hung run frees its slot
  if (hung) return 'hung';
  // spare work (laptop-queue-5) never holds a train or a real request: cut whatever its kind, age or progress (the
  // service marks it done); realOpen = a non-spare request waits on the branch (lib realWaiting)
  if (r?.requester === SPARE_REQUESTER && (trains ?? []).length) return 'train';
  if (r?.requester === SPARE_REQUESTER && realOpen) return 'real';
  // a due alone (aloneGapOpen, laptop-queue-7 A12) started in its gap after a train: no young-alone cut (it still
  // yields between steps)
  const mayCut = (preemptible(r) && !(progress >= PREEMPT_MAX_PROGRESS)) || (!due && youngAlone(r, startedAt, now));
  if (started && mayCut && (trains ?? []).length && (others ?? []).every(preemptible)) return 'train';
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
 * The suites a run-e2e output finished (laptop-queue-8 A10), in log order: [{ s, ok, report, sec }] from its result
 * lines "=== <s> (ok|FAIL|REPORT ONLY, exit n, <N>s) ===" (the parallel header; streamed runs print it after each suite
 * since laptop-queue-8). A streamed start header ("=== s ===") and the times table are not results.
 */
export function finishedSuites(text) {
  const out = [];
  for (const l of String(text ?? '').replace(/\r\n/g, '\n').split('\n')) {
    const m = /^=== (\S+) \((ok|FAIL|REPORT ONLY, exit -?\d+), (\d+)s\) ===\s*$/.exec(l);
    if (m) out.push({ s: m[1], ok: m[2] === 'ok', report: m[2].startsWith('REPORT'), sec: +m[3] });
  }
  return out;
}

/**
 * The suite events in a run-e2e log (laptop-queue-10 A3): its result lines (lib finishedSuites) plus its streamed start
 * headers ("=== s ===", "=== s (REPORT ONLY: never fails the run) ===", run-e2e at E2E_JOBS=1). The times table is not
 * an event. A count that grows means the run is alive.
 */
const START_HEADER = /^=== \S+( \(REPORT ONLY: never fails the run\))? ===\s*$/;
const RESULT_LINE = /^=== \S+ \((ok|FAIL|REPORT ONLY, exit -?\d+), \d+s\) ===\s*$/;
export function suiteEvents(text) {
  let n = 0;
  for (const l of String(text ?? '').split('\n')) if (START_HEADER.test(l) || RESULT_LINE.test(l)) n++;
  return n;
}

/**
 * The hung-run limit in ms (laptop-queue-10 A3): 0 (off) unless idleMin > 0, else the longer of idleMin and run-e2e's
 * own suite timeout plus 2 min, so a legal suite that runs to its timeout is never cut (17 min at 15 and 900 s).
 */
export function idleLimitMs(idleMin, suiteTimeoutS) {
  if (!(idleMin > 0)) return 0;
  return Math.max(idleMin * 60_000, (suiteTimeoutS + 120) * 1000);
}

/**
 * One tick of the hung watch: prev = the last { count, at, hung } (null: the clock starts now), count = the attempt's
 * suite events (lib suiteEvents). `at` moves to now when the count grows; hung once limitMs > 0 and now - at >= limitMs.
 */
export function idleStep(prev, count, now, limitMs) {
  const at = !prev || count > prev.count ? now : prev.at;
  return { count, at, hung: limitMs > 0 && now - at >= limitMs };
}

/** The parts (run-e2e names, in order) that have no finished row (lib finishedSuites) yet. */
export function unfinishedParts(parts, rows) {
  const done = new Set((rows ?? []).map((x) => x.s));
  return (parts ?? []).filter((p) => !done.has(p));
}

/**
 * A desktop run's fail fast (laptop-queue-10 A5, F11): null until a result row (lib finishedSuites) failed that is not
 * REPORT ONLY and not quarantined (isQuarantined(s), any key); then { failed, rerun }: the failed suites in log order
 * and those plus the parts with no row yet (lib unfinishedParts), the laptop rerun's list. Passed suites are not rerun.
 */
export function failFast(rows, parts, isQuarantined) {
  const failed = [...new Set((rows ?? []).filter((x) => !x.ok && !x.report && !isQuarantined(x.s)).map((x) => x.s))];
  if (!failed.length) return null;
  return { failed, rerun: [...new Set([...failed, ...unfinishedParts(parts, rows)])] };
}

/**
 * A hung train's laptop-e2e description (laptop-queue-10 A4): "<ok>/<parts> pass, <wall> s; hung <min> min; FAIL:
 * <failed + unfinished>", prefix first (the desktop's "desktop: "), cut to 140 with "..." (auto-train failSuites then
 * reads no list). A later row of a suite wins (a flake rerun that passed); a REPORT ONLY row never fails.
 */
export function hungTrainDesc(rows, parts, wallS, min, prefix = '') {
  const last = new Map();
  for (const x of rows ?? []) last.set(x.s, x);
  let ok = 0;
  const bad = [];
  for (const x of last.values()) { if (x.ok || x.report) ok++; else bad.push(x.s); }
  const d = `${prefix}${ok}/${(parts ?? []).length} pass, ${Math.round(wallS)} s; hung ${min} min; FAIL: ${[...bad, ...unfinishedParts(parts, rows)].join(',')}`;
  return d.length > 140 ? `${d.slice(0, 137)}...` : d;
}

/**
 * The folder of a new run attempt (laptop-queue-10 A12, F27): base when free, else the first free base-2, base-3, ...
 * so a rerun of the same train or request never mixes its logs into an earlier attempt's. exists = fs.existsSync.
 */
export function attemptDir(base, exists) {
  if (!exists(base)) return base;
  let n = 2;
  while (exists(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * What a pr request still runs after a train preempt kept its passed suites (laptop-queue-8 A10): r.kept = { sha,
 * suites: [{ s, sec }] } from the cut run. -> { kept: [{ s, sec }], rest: [suite] }. Only when r.kept.sha is `sha`
 * (else nothing is kept). A suite of r.suites is kept when a kept row names it exactly; a base name with parts (lib
 * suiteParts over times) only when every one of its parts is kept, else it reruns whole. Kept rows of suites no longer
 * in r.suites (an affected-cap re-file dropped them) do not count.
 */
export function keptPlan(r, sha, times = {}) {
  const suites = [...(r?.suites ?? [])];
  const k = r?.kept;
  if (!k || typeof k !== 'object' || k.sha !== sha || !Array.isArray(k.suites)) return { kept: [], rest: suites };
  const rows = new Map(k.suites.filter((x) => x && typeof x.s === 'string' && x.s).map((x) => [x.s, { s: x.s, sec: Number(x.sec) || 0 }]));
  const kept = [];
  const rest = [];
  const seen = new Set();
  const keep = (x) => { if (!seen.has(x.s)) { seen.add(x.s); kept.push(x); } };
  for (const s of suites) {
    if (rows.has(s)) { keep(rows.get(s)); continue; }
    const parts = suiteParts([s], times).filter((p) => p !== s);
    if (parts.length && parts.every((p) => rows.has(p))) { for (const p of parts) keep(rows.get(p)); continue; }
    rest.push(s);
  }
  return { kept, rest };
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
export function trainHold(heads, lost = () => false) {
  // laptop-queue-8 A18: a head this worker finished (or with a done claim) whose laptop-e2e post was lost holds nothing
  return (heads ?? []).find((h) => h.laptop !== 'success' && !(['', 'pending'].includes(h.laptop ?? '') && lost(h.sha))) ?? null;
}

/** laptop-queue-8 A16: a state.trains entry's final laptop-e2e state: `state`, else from a pre-G `result`, else ''. */
export function trainFinal(entry) {
  if (!entry) return '';
  if (['success', 'failure', 'error'].includes(entry.state)) return entry.state;
  const r = entry.result;
  if (r === 'success' || r === 'carried') return 'success';
  if (r === 'failure' || r === 'build' || r === 'incomplete') return 'failure';
  if (r === 'nosha') return 'error';
  return '';
}

/**
 * laptop-queue-8 A15, A16: what a lost train verdict needs. entry = state.trains[sha]; gh = the head's laptop-e2e state
 * now ('' none, null / 'unknown' unread); other = the worker whose claim on the sha is live or done ('' none): then
 * nothing (its run owns the verdict, a done push would replace its claim). post = { state, desc } when a final state is
 * known, not posted yet and GitHub shows none or pending (never over another final verdict); desc verbatim (a desktop
 * "desktop: ...; FAIL: a,b" stays readable by auto-train), legacy prefix + "<result> (re-posted)". done = the done claim
 * is not known to have landed.
 */
export function trainRepair(entry, gh, other = '', prefix = '') {
  if (other) return { post: null, done: false, superseded: other };
  const st = trainFinal(entry);
  const desc = entry?.desc ?? `${prefix}${entry?.result ?? st} (re-posted)`;
  const post = st && entry?.posted !== true && (gh === '' || gh === 'pending') ? { state: st, desc } : null;
  return { post, done: entry?.doneSynced !== true, superseded: '' };
}

/**
 * The open train about to be released, for nextTrain's releasing case: of heads ([{ n, laptop, laptopAt }], laptopAt =
 * the laptop-e2e status' updated_at), the one whose laptop-e2e success is youngest, as { n, ageMs }; null when none
 * has a success with a readable time.
 */
export function releasingTrain(heads, now) {
  let best = null;
  for (const h of heads ?? []) {
    const t = Date.parse(h?.laptopAt ?? '');
    if (h?.laptop !== 'success' || !Number.isFinite(t)) continue;
    if (!best || now - t < best.ageMs) best = { n: h.n, ageMs: Math.max(0, now - t) };
  }
  return best;
}

/**
 * Train-ready PR heads split by their `check` run: prs = [{ head, check: { status, conclusion } | null }] (gh's
 * statusCheckRollup); green = check passed, running = check not completed; a failed or missing check counts for
 * nothing, nor a head inTrain(head) says an open train or origin/master already carries (members keep the label until
 * the release tail closes them). { green: [heads], running: [heads] }, new arrays.
 */
export function readyHeads(prs, inTrain = () => false) {
  const out = { green: [], running: [] };
  for (const p of Array.isArray(prs) ? prs : []) {
    const c = p?.check;
    if (!c || !p.head || inTrain(p.head)) continue;
    if (String(c.conclusion ?? '').toUpperCase() === 'SUCCESS') out.green.push(p.head);
    else if (Boolean(c.status) && String(c.status).toUpperCase() !== 'COMPLETED') out.running.push(p.head);
  }
  return out;
}

/**
 * The open PR board (one `gh pr list` of number, headRefOid, mergeable, statusCheckRollup, labels rows): Map pr number ->
 * { head, conflicting, green, fix }; fix = the PR carries the `fix` label. conflicting = mergeable CONFLICTING (UNKNOWN, MERGEABLE or missing is not); green = the
 * `check` run concluded SUCCESS and the `checker` status context is SUCCESS. A row without a number or head is skipped.
 */
export function prBoard(rows) {
  const out = new Map();
  for (const p of Array.isArray(rows) ? rows : []) {
    const head = String(p?.headRefOid ?? '');
    if (!Number.isInteger(Number(p?.number)) || !head) continue;
    const roll = p.statusCheckRollup ?? [];
    const check = roll.find((s) => s?.name === 'check');
    const checker = roll.find((s) => s?.context === 'checker');
    out.set(Number(p.number), {
      head,
      conflicting: String(p.mergeable ?? '').toUpperCase() === 'CONFLICTING',
      green: String(check?.conclusion ?? '').toUpperCase() === 'SUCCESS' && String(checker?.state ?? '').toUpperCase() === 'SUCCESS',
      fix: (p.labels ?? []).some((l) => l?.name === 'fix'), // laptop-queue-8 A2: the fix tier (lib isFix)
    });
  }
  return out;
}

/** Train-ready PRs whose check passed or still runs, not the open train members (readyHeads green + running). */
export function readyOrPending(prs, inTrain = () => false) {
  const h = readyHeads(prs, inTrain);
  return h.green.length + h.running.length;
}

/**
 * First-seen-green times (state.trainReady): head -> ms. prev's time stays for a head still green, a new green head gets
 * now, a head no longer green is dropped. New object; prev is not changed.
 */
export function seenSince(prev, greenHeads, now) {
  const out = {};
  for (const h of greenHeads ?? []) out[h] = Number.isFinite(prev?.[h]) ? prev[h] : now;
  return out;
}

/** A run fits before the next train when prep + FIT_SLACK x its expected wall ends by the ETA (fitsBeforeTrain). */
export const FIT_SLACK = 1.2;

/**
 * When the next train is due, so the laptop starts only runs that end before it (laptop-queue-6; trains 102-106 cut 6
 * PR runs claimed after the old 3-min gap: merge-train release waits ~5 min for the deploy, then builds). null, or
 * { why, etaMs, untilMs }: the hold lasts until untilMs.
 * building = an open train PR without its version head ({ n, ageMs }): held while younger than buildMaxMs, ETA = now.
 * releasing = an open train with its laptop-e2e success ({ n, laptopAtMs }): merge = laptopAtMs + mergeLagMs.
 * lastMerge = the newest merged train ({ n, atMs }), passed only while no train PR is open. green = the green
 * candidates' first-seen-green times (ms), running = candidates whose check still runs (a count).
 * With a merge and green or running candidates: ETA = max(merge + gapMs, newest green + readyLagMs); running heads keep
 * the hold on but never set or extend the ETA. Merge long past: green candidates alone give ETA = newest + readyLagMs
 * (auto-train builds only on green). The hold ends at ETA + lateMs (auto-train's pacing may wait).
 */
export function nextTrain({ building = null, releasing = null, lastMerge = null, green = [], running = 0, now } = {}, { buildMaxMs, gapMs, readyLagMs, mergeLagMs, lateMs }) {
  if (building && building.ageMs < buildMaxMs) return { why: `train ${building.n} building`, etaMs: now, untilMs: now - building.ageMs + buildMaxMs };
  const anchor = releasing ? { n: releasing.n, atMs: releasing.laptopAtMs + mergeLagMs } : lastMerge;
  const k = green.length + (Number(running) || 0);
  if (!anchor || !Number.isFinite(anchor.atMs) || k === 0) return null;
  const readyEta = green.length ? Math.max(...green) + readyLagMs : -Infinity;
  const etaMs = Math.max(anchor.atMs + gapMs, readyEta);
  if (now < etaMs + lateMs) {
    const why = releasing ? `train ${anchor.n} releasing, ${k} train-ready PR(s) next`
      : now < anchor.atMs + gapMs + lateMs ? `train ${anchor.n} released, ${k} train-ready PR(s) waiting`
        : `${green.length} train-ready PR(s) waiting for a train`; // merge long past: a newly green PR (train 102)
    return { why, etaMs, untilMs: etaMs + lateMs };
  }
  return null;
}

/**
 * Whether request r may start under nextTrain's hold: a pr run (not alone / full) whose expected wall is known
 * (expectedWallS over jobs ?? r.jobs ?? 2 jobs; the desktop passes 1, laptop-queue-10 A1) and whose prep (prepS) +
 * FIT_SLACK x wall ends by etaMs. A fitted run an early train catches falls to cutShort's 80% rule.
 */
export function fitsBeforeTrain(r, { now, etaMs, times, prepS, jobs }) {
  if (r?.kind !== 'pr') return false;
  const wallS = expectedWallS(r.suites, times, jobs ?? r.jobs ?? 2);
  return Number.isFinite(wallS) && now + (prepS + FIT_SLACK * wallS) * 1000 <= etaMs;
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

// ---------- flake budget and quarantine (process audit 2026-10-24 finding 5; replaces "flake stands") ----------

/** Days a flake counts against its suite's budget. */
export const FLAKE_BUDGET_DAYS = 7;
/** Flakes a suite may have in FLAKE_BUDGET_DAYS; one more quarantines it (autoQuarantine). */
export const FLAKE_BUDGET = 2;
/** How long an automatic quarantine lasts. */
export const QUARANTINE_TTL_MS = 48 * 3600_000;
export const DEFAULT_OWNER = 'Night Shift | Orchestrator';

/** The live quarantine entry for suite (its own name, or a whole-suite entry for a part), null when none or expired. */
export function quarantined(list, suite, now) {
  const base = String(suite).split(':')[0];
  return (list ?? []).find((q) => (q?.suite === suite || q?.suite === base) && Date.parse(q.expiry) > now) ?? null;
}

/** The owner of suite in an owners map (its own name, then the whole suite), else DEFAULT_OWNER. */
export function suiteOwner(owners, suite) {
  return owners?.[suite] ?? owners?.[String(suite).split(':')[0]] ?? DEFAULT_OWNER;
}

/** Adds one run per suite name to day counts { 'YYYY-MM-DD': { suite: n } }; days older than keepDays drop. New map. */
export function countRuns(days, suites, now, keepDays = FLAKE_BUDGET_DAYS) {
  const out = {};
  const oldest = new Date(now - keepDays * 86400_000).toISOString().slice(0, 10);
  for (const [d, m] of Object.entries(days ?? {})) if (d >= oldest) out[d] = { ...m };
  const today = new Date(now).toISOString().slice(0, 10);
  out[today] ??= {};
  for (const s of suites) out[today][s] = (out[today][s] ?? 0) + 1;
  return out;
}

/**
 * Per-suite budget rows for the suites that flaked in the window: { suite, runs, flakes, rate, over } (over = flakes past
 * budget), worst first. flakes = state.flakes ({ suite, date }), days = countRuns' map. starts = { suite: ISO } of each
 * suite's last automatic quarantine: only flakes after it count, so an expired quarantine never renews itself on the
 * same flakes (checker FIX 2026-10-24: it re-armed every 48 h for the whole 7-day window).
 */
export function flakeBudget(flakes, days, now, windowDays = FLAKE_BUDGET_DAYS, budget = FLAKE_BUDGET, starts = {}) {
  const since = now - windowDays * 86400_000;
  const oldest = new Date(since).toISOString().slice(0, 10);
  const count = new Map();
  for (const f of flakes ?? []) {
    const t = Date.parse(f.date);
    if (t >= since && !(t <= Date.parse(starts?.[f.suite] ?? ''))) count.set(f.suite, (count.get(f.suite) ?? 0) + 1);
  }
  const rows = [...count].map(([suite, n]) => {
    let runs = 0;
    for (const [d, m] of Object.entries(days ?? {})) if (d >= oldest) runs += m[suite] ?? 0;
    runs = Math.max(runs, n);
    return { suite, runs, flakes: n, rate: n / runs, over: n > budget };
  });
  return rows.sort((a, b) => b.flakes - a.flakes || b.rate - a.rate || a.suite.localeCompare(b.suite));
}

/**
 * New quarantine entries for the over-budget rows that no list already quarantines: { suite, owner, expiry, reason, auto }.
 * lists = the arrays to check (the committed file's and the service's own).
 */
export function autoQuarantine(rows, lists, owners, now, ttlMs = QUARANTINE_TTL_MS) {
  const out = [];
  for (const r of rows ?? []) {
    if (!r.over || lists.some((l) => quarantined(l, r.suite, now))) continue;
    out.push({ suite: r.suite, owner: suiteOwner(owners, r.suite), expiry: new Date(now + ttlMs).toISOString(), reason: `flake budget: ${r.flakes} flakes in ${r.runs} runs over ${FLAKE_BUDGET_DAYS} d (budget ${FLAKE_BUDGET})`, auto: true });
  }
  return out;
}

/** Markdown: the budget rows (flaked suites only) with each one's quarantine, or '' when nothing flaked. */
export function flakeSummary(rows, quarantine, owners, now) {
  if (!rows?.length) return '';
  const lines = [`Flake budget (${FLAKE_BUDGET_DAYS} d, ${FLAKE_BUDGET} flakes allowed; over it a suite is quarantined: it runs, its failure prints KNOWN FLAKY):`, '', '| Suite | Flakes / runs | Owner | Quarantine |', '| --- | --- | --- | --- |'];
  for (const r of rows) {
    const q = quarantined(quarantine, r.suite, now);
    lines.push(`| ${r.suite} | ${r.flakes} / ${r.runs} (${Math.round(r.rate * 100)}%) | ${q?.owner ?? suiteOwner(owners, r.suite)} | ${q ? `until ${q.expiry.slice(0, 16).replace('T', ' ')} UTC` : r.over ? 'over budget' : '-'} |`);
  }
  return lines.join('\n');
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
  // only the NEWEST train claim counts: an older claim whose done push was lost must never look open for good (checker FIX)
  let newest = '';
  let newestAt = -Infinity;
  for (const [n, e] of seen) if (e.open && e.t > newestAt) { newest = n; newestAt = e.t; }
  for (const e of seen.values()) if (e.t > newestAt) newest = ''; // a later done / release of any train: the laptop moved on
  return { last, trainClaims, openTrain: newest };
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

/**
 * The permanent scheduled tasks the task guard never disables (exact names; service.mjs adds env LQ_TASK_ALLOW).
 * "NightShift watchdog" (scripts/watchdog-task.ps1) runs C:\NightShift\scratch\watchdog-task.vbs, so without its entry
 * staleTasks disabled it within one guard pass (Orchestrator audit 2026-10-25).
 */
export const TASK_ALLOW = ['NightShift-laptop-queue', 'NightShift-desktop-queue', 'NightShift auto-train', 'NightShift watchdog'];

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

// ---------- affected e2e on every PR head (process audit 2026-10-24, finding 5) ----------

/** The requester (and request id slug) of the requests the laptop service enqueues for PR heads by itself. */
export const AFFECTED_REQUESTER = 'affected-e2e';
/** The commit status context the affected pass posts on a PR head (beside the request's own laptop-e2e/affected). */
export const AFFECTED_CTX = 'affected-e2e';
/** A PR with this label gets no automatic affected request (a lead's own requests still run). */
export const AFFECTED_SKIP_LABEL = 'no-affected-e2e';

/**
 * The requester a request queues under (pick's turn order, superseded's "same requester"): an auto affected request
 * queues per PR branch ("affected-e2e:<branch>"), any other request under its own requester.
 */
export function queueRequester(r) {
  return r?.requester === AFFECTED_REQUESTER ? `${AFFECTED_REQUESTER}:${r.branch ?? ''}` : r?.requester;
}

/**
 * The suites a committed change must pass, shared by request.mjs --affected and the service's affected pass: the files
 * from the merge-base of `base` and sha to sha (`git diff --name-only --no-renames`), through e2e-affected affectedPick
 * (DIRECT_COVERS, wide: WIDE_COVERS; the wire rule from sha's src/net/protocol.ts, skipped when it cannot be read; the
 * gate; the cap: max unset = AFFECTED_MAX, but wide unset = no cap; 0 = no cap). run(args) runs git and returns its
 * stdout (injected: this file stays pure); it must throw on failure (a failed diff read as "no files" would pass the
 * head). Returns { base: merge-base, files, suites }, or null when there is no merge-base or git failed; suites [] = no
 * browser suite reached (docs / unit only).
 */
export function affectedSuites(run, sha, { base = 'origin/master', wide = false, max } = {}) {
  let mb;
  let out;
  try {
    mb = String(run(['merge-base', base, sha]) ?? '').trim();
    if (!mb) return null;
    out = String(run(['diff', '--name-only', '--no-renames', mb, sha]) ?? '');
  } catch { return null; }
  const files = out.split(/\r?\n/).map((f) => f.trim()).filter(Boolean);
  let protocolTs = '';
  try { protocolTs = String(run(['show', `${sha}:src/net/protocol.ts`]) ?? ''); } catch { /* no protocol.ts: no wire rule */ }
  return { base: mb, files, suites: affectedPick(files, { wide, max, protocolTs }) };
}

/**
 * The open PR heads the affected pass must handle now: [{ pr, sha, branch }], PR order kept. prs = `gh pr list --json
 * number,headRefName,headRefOid,isDraft,labels,mergeable,statusCheckRollup` rows. Skipped: a train/* branch, a draft, the
 * AFFECTED_SKIP_LABEL label, a head with a final affected-e2e status already (its StatusContext in the rollup: success,
 * failure or error), a head an affected request already names (`requests`: the open, claimed or running ones), and
 * one this process enqueued (`seen`, a Set of shas: the push the next listing has not caught up with). A head whose
 * affected-e2e is pending with no such request is stuck (its request was retired or withdrawn without a final status,
 * Orchestrator audit 2026-10-25) and is requested again: { pr, sha, branch, stuck: true }. A head with mergeable
 * CONFLICTING is listed with conflicting: true (the service posts the error once instead of running it).
 */
export function affectedNeeds(prs, requests = [], seen = new Set()) {
  const have = new Set((requests ?? []).filter((r) => r?.requester === AFFECTED_REQUESTER).map((r) => r.sha));
  const out = [];
  for (const p of prs ?? []) {
    const sha = String(p?.headRefOid ?? '');
    const branch = String(p?.headRefName ?? '');
    if (!/^[0-9a-f]{40}$/.test(sha) || !branch || branch.startsWith('train/') || p.isDraft) continue;
    if ((p.labels ?? []).some((l) => (typeof l === 'string' ? l : l?.name) === AFFECTED_SKIP_LABEL)) continue;
    const st = (p.statusCheckRollup ?? []).find((s) => s?.context === AFFECTED_CTX);
    const pending = Boolean(st) && String(st.state ?? '').toUpperCase() === 'PENDING';
    if (st && !pending) continue;
    if (have.has(sha) || seen.has(sha)) continue;
    out.push({ pr: Number(p.number), sha, branch, ...(pending ? { stuck: true } : {}), ...(String(p.mergeable ?? '').toUpperCase() === 'CONFLICTING' ? { conflicting: true } : {}) });
  }
  return out;
}

/**
 * Ids of the open affected requests (set 'affected', automatic or filed) to retire unrun: their PR is on the board,
 * CONFLICTING, and the board head is the request's sha (an older sha is superseded's job). A named-suite request (any
 * other set) still runs. An empty board (a GitHub error) retires nothing.
 */
export function conflictRetire(requests, board) {
  const out = [];
  for (const r of requests ?? []) {
    const b = r?.set === 'affected' && r.pr != null ? board?.get(Number(r.pr)) : null;
    if (b?.conflicting && b.head === r.sha) out.push(r.id);
  }
  return out;
}

/**
 * The statuses for an affected request retired as conflicting: its own laptop-e2e/affected error, and affected-e2e for
 * an auto request or one filed with set affected (the context the pass and the PR's required check read).
 */
export function conflictStatuses(r) {
  if (!r) return [];
  const description = `not run: PR #${r.pr} conflicts with master (a new head runs again)`;
  const out = [{ sha: r.sha, state: 'error', context: contextName(r.kind, r.set, r.suites ?? []), description }];
  if (r.requester === AFFECTED_REQUESTER || r.set === 'affected') out.push({ sha: r.sha, state: 'error', context: AFFECTED_CTX, description });
  return out;
}

/**
 * The request the affected pass enqueues for a PR head: the shape request.mjs --affected writes (kind pr, set
 * 'affected', so its own context is laptop-e2e/affected), requester AFFECTED_REQUESTER, the PR number (the failure
 * comment goes there). suffix = 4 random hex (injected), as request.mjs adds.
 */
export function affectedRequest({ now, pr, sha, branch, suites, suffix }) {
  return { id: `${requestId(now, AFFECTED_REQUESTER, sha)}-${suffix}`, sha, branch, pr: Number(pr), kind: 'pr', requester: AFFECTED_REQUESTER, suites: [...suites], set: 'affected', note: `auto affected-e2e, PR #${pr}` };
}

/**
 * (affected-cap A7) The open automatic affected requests to re-file at the cap: kind pr, requester AFFECTED_REQUESTER
 * (only: set 'affected' alone is a lead's hand-filed request, never narrowed), not pinned, not a train or laptop rerun,
 * naming more distinct suites than max (two parts of one suite count once). max 0 = no cap: none. Pure.
 */
export function overCapAffected(requests, max) {
  if (!(max > 0)) return [];
  return (requests ?? []).filter((r) => r?.kind === 'pr' && r.requester === AFFECTED_REQUESTER && !r.pin && !r.trainRerun && !r.laptopRerun
    && new Set((r.suites ?? []).map((s) => String(s).split(':')[0])).size > max);
}

// ---------- desktop failures rechecked on the laptop (Orchestrator waste audit 2026-10-24, laptop-queue-3) ----------

/** Median of the finite numbers in xs, NaN when none. */
export function median(xs) {
  const v = (xs ?? []).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/** Desktop CPU median over this (%): the handed-off status says so, the failure may be load, not the change. */
export const DESKTOP_HOT_CPU = 90;

/**
 * The pending description a desktop PR run posts when suites failed and the laptop rerun is queued:
 * "desktop FAIL a,b (cpu 87%), laptop rerun queued", plus "; desktop cpu>90%" when the run's median CPU was over
 * DESKTOP_HOT_CPU; the suite list is cut to keep the whole within GitHub's 140 chars.
 */
export function desktopFailDesc(suites, cpu) {
  const pct = Number.isFinite(cpu) ? `${Math.round(cpu)}%` : '?%';
  const tail = ` (cpu ${pct}), laptop rerun queued${cpu > DESKTOP_HOT_CPU ? `; desktop cpu>${DESKTOP_HOT_CPU}%` : ''}`;
  const head = 'desktop FAIL ';
  let list = (suites ?? []).join(',');
  const room = 140 - head.length - tail.length;
  if (list.length > room) list = `${list.slice(0, room - 3)}...`;
  return `${head}${list}${tail}`;
}

/**
 * The laptop-only request for a desktop run's failed suites: same sha, set, pr, requester and branch, suites = the
 * failed ones, "laptopRerun": true (the desktop never claims it). With no set, the set is the original suites joined
 * by "+", so the rerun posts its verdict on the very context the desktop left pending (lib contextName). suffix = 4
 * random hex (injected), as request.mjs adds.
 */
export function laptopRerunRequest(r, suites, { now, suffix }) {
  return { id: `${requestId(now, r.requester, r.sha)}-${suffix}`, sha: r.sha, branch: r.branch ?? '', pr: r.pr ?? null, kind: 'pr', requester: r.requester, suites: [...suites], set: r.set || (r.suites ?? []).join('+'), laptopRerun: true, note: `desktop failure of ${r.id}, rerun on the laptop` };
}

/**
 * The statuses applySupersedes closes when request `old` is retired by `by` (a newer head): [{ sha, state, context,
 * description }]. A laptop rerun closes its "desktop FAIL ..., laptop rerun queued" pending on its own context (else it
 * stays pending forever: the rerun never runs); an auto affected request (rerun or not) closes its affected-e2e, or,
 * when the surviving request (`survivor`, optional) is an affected request on the same sha, hands affected-e2e over to
 * it (pending "handed over to <by>"; the survivor posts the verdict there).
 */
export function supersedeStatuses(old, by, survivor = null) {
  if (!old) return [];
  const out = [];
  if (old.laptopRerun) out.push({ sha: old.sha, state: 'error', context: contextName(old.kind, old.set, old.suites ?? []), description: `superseded by ${by}` });
  if (old.requester === AFFECTED_REQUESTER) {
    out.push(survivor?.requester === AFFECTED_REQUESTER && survivor.sha === old.sha
      ? { sha: old.sha, state: 'pending', context: AFFECTED_CTX, description: `handed over to ${by}` }
      : { sha: old.sha, state: 'error', context: AFFECTED_CTX, description: `superseded by a newer head (${by})` });
  }
  return out;
}

// ---------- spare work when the laptop is idle (laptop-queue-5) ----------

/** The requester of a spare-work request (docs/laptop-queue/spare-jobs.json). */
export const SPARE_REQUESTER = 'laptop-queue spare';

/**
 * Whether the idle laptop queues its next spare job (env LQ_SPARE_IDLE_MIN, 0 = off): `idleSince` = ms both slots went
 * idle with an empty queue (null when not idle), `openSpare` = a spare request is open, claimed or running anywhere,
 * `jobs` = spare-jobs.json's `jobs` ({ set, ... }), `history` = state.spare { last: index, ran: { [sha]: [set] } }.
 * Round-robin from the job after `last`, skipping a set already queued on `sha`. -> { job, index } or { why }.
 */
export function spareNext({ now, idleSince, idleMin, openSpare, sha, jobs, history }) {
  if (!(idleMin > 0)) return { why: 'off' };
  if (idleSince == null) return { why: 'not idle' };
  if (now - idleSince < idleMin * 60_000) return { why: `idle ${Math.floor((now - idleSince) / 60_000)}/${idleMin} min` };
  if (openSpare) return { why: 'a spare request is open' };
  if (!/^[0-9a-f]{40}$/.test(String(sha))) return { why: 'no origin/master sha' };
  const list = (jobs ?? []).filter((j) => j && typeof j.set === 'string' && j.set);
  if (!list.length) return { why: 'no spare jobs' };
  const ran = new Set(history?.ran?.[sha] ?? []);
  const last = Number.isInteger(history?.last) ? history.last : -1;
  for (let k = 1; k <= list.length; k++) {
    const index = (last + k) % list.length;
    if (!ran.has(list[index].set)) return { job: list[index], index };
  }
  return { why: `every spare job already ran on ${String(sha).slice(0, 8)}` };
}

/**
 * The request for spare job `job` on `sha` (kind pr / full / alone as the job says; requester SPARE_REQUESTER, no
 * branch or PR). `<sha8>` and `<n>` in its steps become the sha's first 8 hex and the spare count `n`.
 */
export function spareRequest({ now, job, sha, n, suffix }) {
  const fill = (s) => String(s).replaceAll('<sha8>', String(sha).slice(0, 8)).replaceAll('<n>', String(n));
  const r = { id: `${requestId(now, SPARE_REQUESTER, sha)}-${suffix}`, sha, branch: '', pr: null, kind: job.kind ?? 'pr', requester: SPARE_REQUESTER, set: job.set, note: `spare work ${n}: ${job.set}` };
  if (r.kind === 'pr') r.suites = [...(job.suites ?? [])];
  if (r.kind === 'alone') { r.steps = (job.steps ?? []).map(fill); r.env = { ...(job.env ?? {}) }; }
  if (job.jobs) r.jobs = job.jobs;
  return r;
}

/**
 * Whether a real (non-spare) request waits: one in `listed` (the open requests of the branch listing, before any hold
 * filter) that this worker has not claimed (`claimedIds`, a Set). While one does, no spare job starts (pick
 * queue.realOpen) and a running one stops (cutShort realOpen): spare work never blocks real work.
 */
export function realWaiting(listed, claimedIds = new Set()) {
  return (listed ?? []).some((r) => r && r.requester !== SPARE_REQUESTER && !claimedIds.has(r.id));
}

/** state.spare after queueing job `index` on `sha`: only that sha's sets are kept (an older sha never blocks again). */
export function spareRecord(history, sha, index, set) {
  return { last: index, n: (history?.n ?? 0) + 1, ran: { [sha]: [...new Set([...(history?.ran?.[sha] ?? []), set])] } };
}

/**
 * The statuses applyDuplicates posts when request `old` is retired as a duplicate of `by` (Orchestrator audit
 * 2026-10-25: a retired affected request left affected-e2e pending forever). Only an auto affected request posts:
 * survivor (the open, claimed or running request `by`) an affected request -> affected-e2e pending "handed over to
 * <by>" (it posts the verdict); else doneResult 'success' (`by` passed this exact run here) -> affected-e2e success
 * "duplicate of <by>, passed"; else error "duplicate of <by>, no affected verdict" (lib duplicates never retires an
 * affected request against another requester's run, so this is a fallback). Others: [] (the survivor posts on the same
 * context).
 */
export function duplicateStatuses(old, by, survivor = null, doneResult = '') {
  if (old?.requester !== AFFECTED_REQUESTER) return [];
  const s = (state, description) => [{ sha: old.sha, state, context: AFFECTED_CTX, description }];
  if (survivor?.requester === AFFECTED_REQUESTER) return s('pending', `handed over to ${by}`);
  if (!survivor && doneResult === 'success') return s('success', `duplicate of ${by}, passed`);
  return s('error', `duplicate of ${by}, no affected verdict`);
}

/**
 * The statuses for a request withdrawn before it ran (its file left the laptop-queue branch while unclaimed; a running
 * one posts its own "withdrawn by the requester, run stopped"): an auto affected request closes affected-e2e, a laptop
 * rerun closes its "desktop FAIL ..., laptop rerun queued" pending (both would stay pending forever).
 */
export function withdrawnStatuses(old) {
  if (!old) return [];
  const out = [];
  const description = 'withdrawn by the requester (not run)';
  if (old.laptopRerun) out.push({ sha: old.sha, state: 'error', context: contextName(old.kind, old.set, old.suites ?? []), description });
  if (old.requester === AFFECTED_REQUESTER) out.push({ sha: old.sha, state: 'error', context: AFFECTED_CTX, description });
  return out;
}

/**
 * Open requests whose file left the branch (withdrawn), two listings in a row as for a running request (one bad
 * listing never counts). tracked = Map(id -> request) of open requests seen before, listed = the ids on the branch now
 * (the caller skips an empty listing), misses = Map(id -> listings missed so far). -> { gone: [request], misses: the new
 * Map } (an id listed again starts over).
 */
export function vanishedRequests(tracked, listed, misses = new Map()) {
  const gone = [];
  const next = new Map();
  for (const [id, r] of tracked ?? []) {
    if (listed.has(id)) continue;
    const n = (misses.get(id) ?? 0) + 1;
    if (n >= 2) gone.push(r); else next.set(id, n);
  }
  return { gone, misses: next };
}
