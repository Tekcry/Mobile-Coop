// e2e-coop-real checks (coop-real H1b, PLAN "The generic checks" + PLAN-CHECK 1-3, 9, 15): the read-only state hash, the
// pass-through taps, KNOWN BUG marks, every offered prompt (context rows, world prompts, the team prompt), the prompt
// watchdog with an expected-change table per row kind and a control window, and the sweep at a route stop. Reads only;
// every action goes through lib's device helpers.
import { run, fail, assert, until, waitHostSim, pickRow, hold, tap, aimAt, drive, me, read, PROMPT_S } from './lib.mjs';

// ------------------------------------------------------------------------------------------------- KNOWN BUG

/**
 * (BRIEF A5, PLAN-CHECK 9) An expected-fail case. Only a failed `assert` whose message matches `expect` counts: it
 * prints `KNOWN BUG <id> -> <slice>: <message>` and the run carries on. Any other throw (a walk timeout, a harness error,
 * a new regression) is rethrown and fails the part; a pass prints `UNEXPECTED PASS <id>` and fails the run, so the fix
 * slice removes the mark. Setup belongs outside `fn`, with its own asserts. Returns true when it failed as expected.
 */
export async function knownBug(id, slice, { expect }, fn) {
  if (!(expect instanceof RegExp)) throw new Error(`knownBug ${id}: needs { expect: /<assert text>/ }`);
  try {
    await fn();
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (msg.startsWith('ASSERT: ') && expect.test(msg)) {
      run.known.push(id);
      console.log(`KNOWN BUG ${id} -> ${slice}: ${msg.slice(8).split('\n')[0]}`);
      return true;
    }
    fail(`knownBug ${id}: a failure other than the marked one (${expect.source}): ${msg.split('\n')[0]}`);
    throw e;
  }
  run.unexpected.push(id);
  fail(`UNEXPECTED PASS ${id} (marked KNOWN BUG -> ${slice}): remove the mark`);
  console.log(`UNEXPECTED PASS ${id}`);
  return false;
}

/** The summary line (PLAN "The generic checks"): `KNOWN BUG: n (ids)`. */
export function knownBugSummary() {
  console.log(`KNOWN BUG: ${run.known.length}${run.known.length ? ` (${run.known.join(', ')})` : ''}`);
  if (run.unexpected.length) console.log(`UNEXPECTED PASS: ${run.unexpected.length} (${run.unexpected.join(', ')})`);
}

// ------------------------------------------------------------------------------------------------- state hash

/**
 * The page's state hash, read only: a flat map key -> value string. `g.<id>` guard alive / ko / taken (host; client:
 * puppet alive / dead / taken), `g.<id>.alert`, `g.<id>.pos` (0.25 m), `b.<id>` body hidden / carried, `b.<id>.pos`,
 * `d.<i>` door target / open / locked / cracked, `lamps` (a digit a light: 0 off, 1 on, 2 shot), `i.<id>` item enabled /
 * done | label, `p.<id>` partner, `p.self` alive | hp, `self` crouched / grounded | attach phase | team state, `view`
 * optic / door peek / remote view, `td` takedowns by kind, `carry`, `course` (bay, checkpoint, locks, anchors, airlocks,
 * gates, refusal, lights). VOLATILE keys move on their own (patrols, the walk) and never count as a row's effect.
 */
export function pageHash() {
  const g = window.__app?.current;
  if (!g) return null;
  const out = {};
  const r = (v, s) => (Math.round(v / s) * s).toFixed(2);
  const net = g.net;
  const host = !net || !!net.remotes;
  if (host) {
    for (const e of g.enemyMgr?.enemies ?? []) {
      out[`g.${e.id}`] = `${e.alive ? 1 : 0}${e.ko ? 1 : 0}${e.taken ? 1 : 0}`;
      out[`g.${e.id}.alert`] = String(e.aware?.level ?? '');
      out[`g.${e.id}.pos`] = `${r(e.pos.x, 0.25)},${r(e.pos.z, 0.25)}`;
    }
    for (const b of g.enemyMgr?.bodies ?? []) {
      out[`b.${b.enemyId || b.id}`] = `${b.hidden ? 1 : 0}${b.carried ? 1 : 0}`;
      out[`b.${b.enemyId || b.id}.pos`] = `${r(b.pos.x, 0.5)},${r(b.pos.z, 0.5)}`;
    }
    for (const rm of net?.remotes?.values() ?? []) out[`p.${rm.id}`] = `${rm.state ? 1 : 0}|${rm.state?.mv?.m ?? ''}`;
  } else {
    for (const [id, p] of net.puppets ?? []) {
      out[`g.${id}`] = `${p.alive ? 1 : 0}${p.dead ? 1 : 0}${p.taken ? 1 : 0}`;
      out[`g.${id}.pos`] = `${r(p.pos.x, 0.25)},${r(p.pos.z, 0.25)}`;
    }
    for (const [id, b] of net.kept ?? []) {
      out[`b.${b.enemyId || id}`] = `${b.hidden ? 1 : 0}${b.carried ? 1 : 0}`;
      out[`b.${b.enemyId || id}.pos`] = `${r(b.pos.x, 0.5)},${r(b.pos.z, 0.5)}`;
    }
    for (const [id, a] of net.avatars ?? []) out[`p.${id}`] = `${a.mode ?? ''}`;
  }
  for (const d of g.world?.doors?.list ?? []) out[`d.${d.index}`] = `${d.target}${d.open > 0.01 ? 1 : 0}${d.anchor?.locked ? 1 : 0}${d.cracked ? 1 : 0}`;
  const reg = g.world?.level?.lights;
  if (reg?.lights) out.lamps = reg.lights.map((l) => (l.kind === 'flashlight' ? 1 : l.destroyed ? 2 : reg.baseOn?.(l) ? 1 : 0)).join('');
  for (const it of g.interactables?.items ?? []) out[`i.${it.id}`] = `${it.enabled ? 1 : 0}${it.done ? 1 : 0}|${it.label}`;
  const c = g.player.controller;
  out['p.self'] = `${g.player.alive ? 1 : 0}|${Math.round(g.player.health?.hp ?? g.target?.health?.hp ?? -1)}`;
  out.self = `${c.crouched ? 1 : 0}${c.grounded ? 1 : 0}|${g.traversal?.attach?.phase ?? ''}|${g.team?.state ?? ''}`;
  out.view = `${g.optic?.active ? 1 : 0}${g.doorPeek?.active ? 1 : 0}${g.gadgets?.remote ? 1 : 0}`;
  out.td = JSON.stringify(g.takedown?.done?.byKind ?? {});
  out.carry = String(g.stealth?.carrying ?? '');
  const k = window.__course?.debug?.() ?? {};
  out.course = JSON.stringify([k.bay, k.checkpoint, k.locks, k.anchors, k.air, k.gates, k.refusal, k.lights]);
  return out;
}
export const VOLATILE = /\.(pos|alert)$/;
export const hashState = (P) => P.evaluate(pageHash);

/** Keys whose values differ between two hashes (`all`: volatile keys too). */
export function diffKeys(a, b, all = false) {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  return [...keys].filter((k) => (all || !VOLATILE.test(k)) && (a ?? {})[k] !== (b ?? {})[k]);
}

// ------------------------------------------------------------------------------------------------- taps

/**
 * Pass-through taps on page P (idempotent; again after a restart, a reload or a new page): `events.emit` of the current
 * match logs { type, t (sim), w (wall ms) } in `__tap.ev`; `weaponAudio.shot` / `remoteShot` (app level) log { k, gun,
 * suppressed, t, w } in `__tap.au`. Each wrapper calls the original with the same arguments and returns its result.
 */
export const installTaps = (P) =>
  P.evaluate(() => {
    const tap = (window.__tap ??= { ev: [], au: [] });
    const g = window.__app?.current;
    if (g?.events && !g.events.__tapped) {
      const bus = g.events;
      const orig = bus.emit;
      bus.emit = function (type, payload) {
        tap.ev.push({ type, t: +(window.__app.current?.time ?? 0).toFixed(3), w: performance.now() });
        return orig.call(this, type, payload);
      };
      bus.__tapped = true;
    }
    const wa = window.__app?.weaponAudio;
    if (wa && !wa.__tapped) {
      const shot = wa.shot;
      const remote = wa.remoteShot;
      const t = () => +(window.__app.current?.time ?? 0).toFixed(3);
      wa.shot = function (gunId, suppressed, surface) {
        tap.au.push({ k: 'shot', gun: gunId, suppressed: !!suppressed, t: t(), w: performance.now() });
        return shot.call(this, gunId, suppressed, surface);
      };
      wa.remoteShot = function (gunId, dist, level, pan, suppressed = false) {
        tap.au.push({ k: 'remote', gun: gunId, suppressed: !!suppressed, t: t(), w: performance.now() });
        return remote.call(this, gunId, dist, level, pan, suppressed);
      };
      wa.__tapped = true;
    }
    return { ev: tap.ev.length, au: tap.au.length };
  });
/** Events with no player behind them (guard chatter, the remote-shot audio cue): never a row's effect. */
const NOISE_EVENTS = new Set(['bark', 'remoteShot']);
/** The event log on page P from index `from`, without NOISE_EVENTS: [{ type, t, w }]. */
export const events = (P, from = 0) => P.evaluate(([f, noise]) => (window.__tap?.ev ?? []).slice(f).filter((e) => !noise.includes(e.type)), [from, [...NOISE_EVENTS]]);
/** Log lengths now (marks for `events` / `audioLog`). */
export const tapMark = (P) => P.evaluate(() => ({ ev: window.__tap?.ev.length ?? 0, au: window.__tap?.au.length ?? 0, t: window.__app.current?.time ?? 0 }));
/** The weapon audio log on page P from index `from`: [{ k: 'shot' | 'remote', gun, suppressed, t, w }]. */
export const audioLog = (P, from = 0) => P.evaluate((f) => (window.__tap?.au ?? []).slice(f), from);

// ------------------------------------------------------------------------------------------------- prompts

/** The world prompt ids (ui/hud/worldPrompts.ts:5) and the input that runs each ('state' is a display, never run). */
export const WORLD_PROMPT_INPUT = { vault: 'jump', jumpTo: 'jump', drop: 'crouch', takedown: 'interact', coop: 'coop', state: null };

/**
 * (PLAN-CHECK 2) Everything page P offers now: the context rows (`src: 'ctx'`, kind / opt / ref / label / hold), every
 * shown world prompt (`src: 'world'`, id, label) and the team prompt (`src: 'team'`, label).
 */
export const prompts = (P) =>
  P.evaluate((ids) => {
    const g = window.__app.current;
    const out = [];
    const m = g.ctxMenu;
    for (let i = 0; i < m.count; i++) {
      const o = m.opts[i];
      out.push({ src: 'ctx', kind: o.kind, opt: o.opt, ref: o.ref, label: o.label, hold: o.hold, index: i });
    }
    const w = g.hud?.world;
    for (const id of ids) {
      const l = w?.label?.(id) ?? '';
      if (l) out.push({ src: 'world', id, label: l.replace(/<[^>]*>/g, '').trim() || id });
    }
    if (g.team?.prompt) out.push({ src: 'team', label: String(g.team.prompt) });
    return out;
  }, Object.keys(WORLD_PROMPT_INPUT));

/** (PLAN-CHECK 3) Presence: a prompt whose label matches `re` shows on page P within `timeout` (sim ms); returns it. */
export async function expectPrompt(P, re, what, timeout = 4000) {
  try {
    await until(P, `(src) => { const g = window.__app.current; const r = new RegExp(src, 'i'); const m = g.ctxMenu; for (let i = 0; i < m.count; i++) if (r.test(m.opts[i].label)) return true; const w = g.hud?.world; for (const id of ${JSON.stringify(Object.keys(WORLD_PROMPT_INPUT))}) if (r.test(w?.label?.(id) ?? '')) return true; return r.test(String(g.team?.prompt ?? '')); }`, re.source, timeout, what);
  } catch {
    assert(false, `${what}: no "${re.source}" prompt (offered: ${JSON.stringify((await prompts(P)).map((p) => p.label))})`);
  }
  const p = (await prompts(P)).find((x) => re.test(x.label));
  assert(!!p, `${what}: "${p?.label}" offered`);
  return p;
}

// ------------------------------------------------------------------------------------------------- watchdog

const DESTRUCTIVE = /kill|knock ?out|choke|neck|lethal/i;
const TD_LIKE = (row) => row.kind === 'td' || row.kind === 'grab' || row.kind === 'joint' || (row.src === 'world' && row.id === 'takedown');

/**
 * (PLAN-CHECK 1) What a row must change, by kind: { page: 'host' | 'acting', keys: RegExp, s: window sim s }. A door row
 * that door on the host; a takedown / grab / bluff a guard (or the takedown counts) on the host within 6 s; a switch the
 * lamps; an unbolt / gate the course state, an item or a door; a body row the bodies or the carry; an optic / peek the
 * acting page's own view; a world prompt or the team prompt the acting page's move state. Anything else: any host key.
 */
export function expected(row) {
  const L = row.label ?? '';
  if (row.kind === 'door' && /optic/i.test(row.opt ?? L)) return { page: 'acting', keys: /^view$/, s: PROMPT_S };
  if (row.kind === 'door') return { page: 'host', keys: new RegExp(`^d\\.${row.ref}$`), s: PROMPT_S };
  if (row.kind === 'gap') return /optic/i.test(row.opt ?? L) ? { page: 'acting', keys: /^view$/, s: PROMPT_S } : { page: 'host', keys: /^(d\.|course$|i\.)/, s: PROMPT_S };
  if (TD_LIKE(row)) return { page: 'host', keys: /^(g\.[^.]+|td|b\.[^.]+)$/, s: 6 };
  if (row.src === 'world' || row.src === 'team') return { page: 'acting', keys: /^(self|view|carry)$/, s: PROMPT_S };
  if (/switch|light|lamp/i.test(L)) return { page: 'host', keys: /^lamps$/, s: PROMPT_S };
  if (/bolt|gate|unlock|lock/i.test(L)) return { page: 'host', keys: /^(course|d\.\d+|i\..+)$/, s: PROMPT_S };
  if (/body|pick up|drop|hide|carry/i.test(L)) return { page: 'host', keys: /^(b\.[^.]+|carry)$/, s: PROMPT_S };
  if (/open door|close door/i.test(L)) return { page: 'host', keys: /^d\.\d+$/, s: PROMPT_S };
  return { page: 'host', keys: /./, s: PROMPT_S };
}

/** (PLAN-CHECK 1) Keys that move with no input: both hashes over `s` sim s of nobody touching anything. Returns the
 *  non-volatile keys that changed on each page ({ host: Set, client: Set }), to leave out of a row's effect. */
export async function controlWindow(h, s = PROMPT_S) {
  const [a0, b0] = await Promise.all([hashState(h.A), hashState(h.B)]);
  await waitHostSim(h.A, s * 1000);
  const [a1, b1] = await Promise.all([hashState(h.A), hashState(h.B)]);
  return { host: new Set(diffKeys(a0, a1)), client: new Set(diffKeys(b0, b1)) };
}

/**
 * (PLAN "Prompt watchdog") Run prompt `re` on page P by its input (a context row by `pickRow`; a world / team prompt by
 * its bound button) and require its expected change (`expected`) within the window, which starts after the row ran (a
 * hold row once full). A row run on the client must move the HOST hash unless its kind is local (optic / peek / world
 * prompts: the acting page). Keys in `noise` (a `controlWindow`) never count. Fails with the label, page, expected keys
 * and both hashes' diffs. Returns { row, host, client, events }.
 */
export async function runRow(h, P, who, re, { noise = { host: new Set(), client: new Set() }, timeout = 6000 } = {}) {
  const side = P === h.A ? 'host' : 'client';
  const offered = (await prompts(P)).find((x) => re.test(x.label));
  const [hA0, hB0, mA, mB] = await Promise.all([hashState(h.A), hashState(h.B), tapMark(h.A), tapMark(h.B)]);
  let row;
  if (!offered || offered.src === 'ctx') row = { src: 'ctx', ...(await pickRow(P, who, re, { timeout })) };
  else {
    const action = offered.src === 'team' ? 'coop' : WORLD_PROMPT_INPUT[offered.id];
    if (!action) throw new Error(`runRow: the ${offered.id} prompt has no input`);
    if (who === 'pad') await tap(P, who, action);
    else {
      await hold(P, who, action, true);
      await waitHostSim(P, 200);
      await hold(P, who, action, false);
    }
    row = { ...offered, t: (await me(P)).t };
  }
  const exp = expected(row);
  const target = exp.page === 'host' ? 'host' : side;
  const hits = (hA, hB) => {
    const kA = diffKeys(hA0, hA).filter((k) => !noise.host.has(k));
    const kB = diffKeys(hB0, hB).filter((k) => !noise.client.has(k));
    const want = (target === 'host' ? kA : kB).filter((k) => exp.keys.test(k));
    return { kA, kB, want };
  };
  let last = hits(hA0, hB0);
  await waitHostSim(P, exp.s * 1000, async () => {
    if (last.want.length) return;
    const [hA, hB] = await Promise.all([hashState(h.A), hashState(h.B)]);
    last = hits(hA, hB);
  });
  const [eA, eB] = await Promise.all([events(h.A, mA.ev), events(h.B, mB.ev)]);
  const ev = [...eA.map((e) => `host:${e.type}`), ...eB.map((e) => `client:${e.type}`)];
  assert(
    last.want.length > 0,
    `row "${row.label}" (${row.src}${row.kind ? ` ${row.kind}/${row.opt}` : ''}) run on the ${side} ${last.want.length ? 'changed' : 'changed nothing expected'} on the ${target} within ${exp.s} s (expected ${exp.keys.source}; host keys ${JSON.stringify(last.kA)}, client keys ${JSON.stringify(last.kB)}, events ${JSON.stringify(ev)})`,
  );
  return { row, host: last.kA, client: last.kB, events: ev };
}

// ------------------------------------------------------------------------------------------------- sweep

/** Page-side: nudge the left stick (creep) toward world heading `a.yaw` until the body faces it (0.3 rad). */
function faceCtl(g, a, st, pad) {
  st.axes = [0, 1];
  st.t0 ??= g.time;
  const c = g.player.controller;
  let e = a.yaw - c.yaw;
  e = Math.atan2(Math.sin(e), Math.cos(e));
  if (Math.abs(e) < 0.3) return { r: 'ok', e: +e.toFixed(2) };
  if (g.time - st.t0 > 3) return { r: 'timeout', e: +e.toFixed(2) };
  const cy = g.player.cam.yaw;
  const wx = Math.sin(a.yaw);
  const wz = Math.cos(a.yaw);
  pad.axis(0, 0.3 * (Math.cos(cy) * wx - Math.sin(cy) * wz));
  pad.axis(1, -0.3 * (Math.sin(cy) * wx + Math.cos(cy) * wz));
  return undefined;
}

/**
 * Face world heading `yaw` on page P: the camera by `aimAt` (a point 10 m out at eye height) and, on the pad, the body by
 * a creep nudge of the left stick (a few cm of travel). The keyboard player turns the body with the walk keys' camera
 * frame: a short Alt + W tap after the camera turn.
 */
export async function faceTo(P, who, yaw) {
  const s = await me(P);
  await aimAt(P, who, [s.x + Math.sin(yaw) * 10, s.y + 1.5, s.z + Math.cos(yaw) * 10], { tol: 0.05, maxS: 4 }).catch(() => {});
  if (who === 'pad') return drive(P, faceCtl, { yaw }, 8000, `the pad player faces ${yaw.toFixed(2)}`);
  await P.keyboard.down('AltLeft');
  await P.keyboard.down('KeyW');
  await until(P, (y) => { const e = y - window.__app.current.player.controller.yaw; return Math.abs(Math.atan2(Math.sin(e), Math.cos(e))) < 0.3; }, yaw, 3000, 'the keyboard player faces the heading').catch(() => {});
  await P.keyboard.up('KeyW');
  await P.keyboard.up('AltLeft');
  return { r: 'ok' };
}

/**
 * (PLAN "Sweep", PLAN-CHECK 3) The sweep at a route stop: on each page in `pages` ([[P, who], ...]), face 8 headings and
 * read every prompt (`prompts`); then run each prompt once (by label) through `runRow`, at the heading where it showed,
 * with one control window per stop as the noise. `skip(prompt)` leaves a prompt out (default: destructive takedown rows,
 * 'state', and anything already run on that page); `variant` names the partner state the case set up. Every failure is
 * collected and asserted at the end (`fail` text names stop, variant, page and row). Returns the list of
 * { page, heading, prompt, ok, err }.
 */
export async function sweepStop(h, stop, { pages = [[h.A, 'kbm'], [h.B, 'pad']], variant = 'idle', headings = 8, skip = null, done = new Set() } = {}) {
  const noise = await controlWindow(h);
  const out = [];
  const skipOf = skip ?? ((p) => DESTRUCTIVE.test(p.label) || (p.src === 'world' && !WORLD_PROMPT_INPUT[p.id]));
  for (const [P, who] of pages) {
    const side = P === h.A ? 'host' : 'client';
    const seen = new Map();
    const base = (await me(P)).yaw;
    for (let k = 0; k < headings; k++) {
      const yaw = base + (k * 2 * Math.PI) / headings;
      await faceTo(P, who, yaw).catch(() => {});
      for (const p of await prompts(P)) {
        const key = `${p.src}:${p.label}`;
        if (!seen.has(key)) seen.set(key, { p, yaw });
      }
    }
    console.log(`  sweep ${stop} [${variant}] ${side}: ${seen.size} prompt(s): ${JSON.stringify([...seen.keys()])}`);
    for (const [key, { p, yaw }] of seen) {
      const id = `${side}:${key}`;
      if (done.has(id) || skipOf(p)) continue;
      done.add(id);
      const r = { page: side, heading: +yaw.toFixed(2), prompt: key, ok: true, err: '' };
      try {
        await faceTo(P, who, yaw).catch(() => {});
        await runRow(h, P, who, new RegExp(`^${p.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), { noise });
      } catch (e) {
        r.ok = false;
        r.err = String(e.message).split('\n')[0];
      }
      out.push(r);
    }
  }
  const bad = out.filter((r) => !r.ok);
  for (const r of bad) console.log(`  SWEEP FAIL ${stop} [${variant}] ${r.page} "${r.prompt}": ${r.err}`);
  assert(bad.length === 0, `sweep ${stop} [${variant}]: ${out.length - bad.length} of ${out.length} prompts changed state${bad.length ? `; dead: ${bad.map((r) => `${r.page} "${r.prompt}"`).join(', ')}` : ''}`);
  return out;
}

/**
 * (PLAN-CHECK 3) The sweep at one stop under each partner state: `variants` = [{ name, setup, teardown }] (async, input
 * only, run by the case); each variant sweeps the pages with the partner held in that state. The `done` set is shared,
 * so a prompt runs once per page unless a later variant shows a new one.
 */
export async function sweepVariants(h, stop, variants, opts = {}) {
  const done = new Set();
  const all = [];
  for (const v of variants) {
    await v.setup?.();
    try {
      all.push(...(await sweepStop(h, stop, { ...opts, variant: v.name, done })));
    } finally {
      await v.teardown?.();
    }
  }
  return all;
}

/** Read-only convenience for cases: `read` re-exported, so a part imports reads and checks from one place. */
export { read };
