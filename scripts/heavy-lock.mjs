// Heavy lock helper (CLAUDE.md "Machines"): one heavy job per machine, held in a lock file created atomically (wx).
// The lock text is "<label> | <iso start> | pid <n> | host <hostname>". A lock whose pid is dead on this host is stale:
// `take` logs it and replaces it (rename to <path>.stale.<pid>, unique per taker, then a wx create; the renamed file is
// removed). Old-format lines with no pid (the noclobber way) are never broken automatically.
// takeTouchLock: the auto-train tick lock (mtime staleness, heartbeat), also taken by merge-train build / release / single.
// Usage:
//   node scripts/heavy-lock.mjs take <path> "<label>" [--wait <min>] [--pid <n>]
//   node scripts/heavy-lock.mjs release <path> "<label>"
//   node scripts/heavy-lock.mjs check <path>
// --pid: the long-lived process that holds the lock (default process.ppid, the process that ran node). Under Git Bash
// ($MSYSTEM set) --pid is required: `$$` there is an MSYS pid, not a Windows one, and node's parent is a short-lived
// fork; pass the shell's Windows pid, `--pid "$(cat /proc/$$/winpid)"`, and take, run and release in that one shell.
// --wait: retry every 30 s for up to <min> minutes (default 0: one try).
// Exit: take 0 taken, 1 still held (or the pid is not alive); release 0 removed, 1 not ours or absent;
// check 0 free, 1 held, 3 stale (take would break it); 2 usage.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The lock text: "<label> | <iso start> | pid <n> | host <hostname>". */
export function formatLock(label, { pid, host = os.hostname(), start = new Date() }) {
  return `${label} | ${start.toISOString()} | pid ${pid} | host ${host}`;
}

/**
 * { pid, host } from a slot lock text, the one parser for both writers: this file's "<label> | <iso> | pid <n> | host
 * <h>", and the laptop queue service's own "laptop-queue | <label> <sha8> pid <n> | <iso>" (no host: lock files are per
 * machine, so host null with a pid means this machine's). pid and host null for an old-format line with no pid.
 * 2026-10-25 ~10:51: a killed desktop service left heavy.lock / heavy2.lock naming pid 4484; the gate read no pid and held
 * them for 10+ min.
 */
export function parseLock(text) {
  const t = String(text ?? '').trim();
  const m = /\|\s*pid (\d+)\s*\|\s*host ([^|\r\n]+?)\s*$/.exec(t);
  if (m) return { pid: Number(m[1]), host: m[2] };
  const q = /^laptop-queue \|[^|\r\n]*\bpid (\d+)\s*\|\s*[^|\r\n]+$/.exec(t);
  return q ? { pid: Number(q[1]), host: null } : { pid: null, host: null };
}

/** True unless signal 0 to `pid` fails with ESRCH (EPERM means alive, owned by someone else). */
export function pidAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (e) { return e?.code !== 'ESRCH'; }
}

/**
 * True when the lock names a pid on `host` (a laptop-queue line: this machine) that is not alive; an old-format line is
 * never stale.
 */
export function isStale(text, { host = os.hostname(), alive = pidAlive } = {}) {
  const { pid, host: h } = parseLock(text);
  return pid !== null && (h === null || h === host) && !alive(pid);
}

/** True when the lock text was written for `label` ("<label> | ..." or exactly "<label>"). */
export function lockHasLabel(text, label) {
  const t = text.trim();
  return t === label || t.startsWith(`${label} |`);
}

const readLock = (lock) => { try { return fs.readFileSync(lock, 'utf8').trim(); } catch { return null; } };

/**
 * One attempt to create `lock` with `text` (wx). A stale lock is logged, renamed to <lock>.stale and replaced; when the
 * renamed file is not the stale one (another taker replaced it first) it is put back. { taken, holder }.
 */
export function tryTake(lock, text, { host = os.hostname(), alive = pidAlive, log = console.log } = {}) {
  const create = () => { try { fs.writeFileSync(lock, text, { flag: 'wx' }); return true; } catch (e) { if (e?.code !== 'EEXIST') throw e; return false; } };
  if (create()) return { taken: true, holder: null };
  const holder = readLock(lock);
  if (holder === null) return { taken: create(), holder: '?' };
  if (!isStale(holder, { host, alive })) return { taken: false, holder };
  log(`  heavy lock is stale (pid ${parseLock(holder).pid} is not alive on ${host}): breaking "${holder}"`);
  const stale = staleName(lock); // unique per taker: two breakers never rename onto one file
  try { fs.renameSync(lock, stale); } catch { return { taken: false, holder }; }
  try {
    if (readLock(stale) !== holder) { // someone replaced it between our read and the rename: give theirs back
      try { fs.copyFileSync(stale, lock, fs.constants.COPYFILE_EXCL); } catch { /* a third taker got there */ }
      return { taken: false, holder: readLock(lock) ?? holder };
    }
    return { taken: create(), holder };
  } finally { fs.rmSync(stale, { force: true }); }
}

/** The file a stale lock is renamed to while it is broken: `<lock>.stale.<pid>`. */
export const staleName = (lock, pid = process.pid) => `${lock}.stale.${pid}`;

/**
 * A touch lock (the auto-train tick lock, shared by merge-train build / release / single): text
 * "<label> | pid <n> | <iso>", created wx; stale when its mtime is `staleMin` min old (a holder touches it every
 * minute). One try (a stale one is replaced once): { release } when taken (release stops the heartbeat and removes the
 * lock while it still holds our text), { holder, ageMin } when held.
 */
export function takeTouchLock(lock, label, { staleMin = 30, log = console.log, pid = process.pid, beatMs = 60_000 } = {}) {
  fs.mkdirSync(path.dirname(lock), { recursive: true });
  const text = `${label} | pid ${pid} | ${new Date().toISOString()}`;
  for (let i = 0; ; i++) {
    try { fs.writeFileSync(lock, text, { flag: 'wx' }); break; } catch (e) {
      if (e?.code !== 'EEXIST') throw e;
      let ageMin = 0, holder = '?';
      try { ageMin = (Date.now() - fs.statSync(lock).mtimeMs) / 60_000; holder = fs.readFileSync(lock, 'utf8').trim(); } catch { /* gone: retry */ }
      if (ageMin < staleMin || i) return { release: null, holder, ageMin };
      log(`stale lock (${Math.round(ageMin)} min, "${holder}") removed`);
      fs.rmSync(lock, { force: true });
    }
  }
  const beat = beatMs > 0 ? setInterval(() => { try { const t = new Date(); fs.utimesSync(lock, t, t); } catch { /* gone */ } }, beatMs) : null;
  beat?.unref?.();
  return {
    text,
    release: () => {
      if (beat) clearInterval(beat);
      try { if (fs.readFileSync(lock, 'utf8') === text) fs.rmSync(lock, { force: true }); } catch { /* gone */ }
    },
  };
}

/** Takes `lock` with `text`, retrying every `retryMs` up to `maxMs` (0: one try); throws when it stays held. */
export async function takeLockText(lock, text, { retryMs = 30_000, maxMs = 0, sleepFn = sleep, log = console.log, host, alive } = {}) {
  const t0 = Date.now();
  for (;;) {
    const r = tryTake(lock, text, { host, alive, log });
    if (r.taken) return;
    if (Date.now() - t0 >= maxMs) throw new Error(`${lock} stayed held (${r.holder}) for ${Math.round(maxMs / 60_000)} min`);
    log(`  heavy lock held (${r.holder}); retrying in ${Math.round(retryMs / 1000)} s`);
    await sleepFn(retryMs);
  }
}

/** Removes `lock` only while it names `label`; true when removed. */
export function releaseLock(lock, label) {
  const t = readLock(lock);
  if (t === null || !lockHasLabel(t, label)) return false;
  fs.rmSync(lock, { force: true });
  return true;
}

/** { held, stale, text } for `lock`. */
export function checkLock(lock, opts = {}) {
  const text = readLock(lock);
  if (text === null) return { held: false, stale: false, text: null };
  return { held: true, stale: isStale(text, opts), text };
}

const USAGE = [
  'usage:',
  '  node scripts/heavy-lock.mjs take <path> "<label>" [--wait <min>] [--pid <n>]',
  '  node scripts/heavy-lock.mjs release <path> "<label>"',
  '  node scripts/heavy-lock.mjs check <path>',
].join('\n');

/** argv (after `node script`) -> { cmd, lock, label, waitMin, pid }; throws an Error carrying the usage text. */
export function parseArgs(argv, { ppid = process.ppid, msys = !!process.env.MSYSTEM } = {}) {
  const bad = (why) => new Error(`${why}\n${USAGE}`);
  const pos = [];
  let waitMin = 0, pid = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--wait' || a === '--pid') {
      const v = argv[++i];
      if (!(a === '--wait' ? /^\d+(\.\d+)?$/ : /^\d+$/).test(v ?? '')) throw bad(`${a} needs a number`);
      if (a === '--wait') waitMin = Number(v); else pid = Number(v);
    } else if (a.startsWith('--')) throw bad(`unknown flag ${a}`);
    else pos.push(a);
  }
  const [cmd, lock, label] = pos;
  if (!['take', 'release', 'check'].includes(cmd)) throw bad(cmd ? `unknown command "${cmd}"` : 'no command');
  if (!lock) throw bad(`${cmd} needs <path>`);
  if (cmd !== 'check' && !label) throw bad(`${cmd} needs "<label>"`);
  if (pos.length > (cmd === 'check' ? 2 : 3)) throw bad(`unexpected argument "${pos[cmd === 'check' ? 2 : 3]}"`);
  if ((waitMin || pid !== null) && cmd !== 'take') throw bad('--wait and --pid apply to take only');
  if (cmd === 'take' && pid === null) {
    if (msys) throw bad('under Git Bash pass the holding shell\'s Windows pid: --pid "$(cat /proc/$$/winpid)"');
    pid = ppid;
  }
  return { cmd, lock, label: label ?? null, waitMin, pid };
}

async function main(argv) {
  const a = parseArgs(argv);
  if (a.cmd === 'check') {
    const c = checkLock(a.lock);
    console.log(c.held ? `${c.stale ? 'STALE' : 'held'}: ${c.text}` : 'free');
    return c.held ? (c.stale ? 3 : 1) : 0;
  }
  if (a.cmd === 'release') {
    const ok = releaseLock(a.lock, a.label);
    console.log(ok ? `released ${a.lock}` : `not released: ${a.lock} is absent or does not name "${a.label}"`);
    return ok ? 0 : 1;
  }
  if (!pidAlive(a.pid)) { console.error(`pid ${a.pid} is not a live process on this host; the lock would be stale at once`); return 1; }
  try {
    await takeLockText(a.lock, formatLock(a.label, { pid: a.pid }), { maxMs: a.waitMin * 60_000 });
  } catch (e) { console.error(e.message); return 1; }
  console.log(`took ${a.lock}: ${readLock(a.lock)}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`heavy-lock: ${e.message}`); process.exit(2); });
}
