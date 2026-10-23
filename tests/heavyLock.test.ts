import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  checkLock, formatLock, isStale, lockHasLabel, parseArgs, parseLock, pidAlive, releaseLock, takeLockText, tryTake,
  // @ts-expect-error plain .mjs process script without types
} from '../scripts/heavy-lock.mjs';

const HOST = 'desk';
const quiet = (): void => {};
const withDir = async (fn: (lock: string) => Promise<void> | void): Promise<void> => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heavy-lock-'));
  try { await fn(path.join(dir, 'heavy.lock')); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
};

describe('heavy-lock text', () => {
  it('formats and parses "<label> | <iso> | pid <n> | host <h>"', () => {
    const t: string = formatLock('Night Shift | Player Build | e2e', { pid: 4321, host: HOST, start: new Date('2026-10-23T08:00:00Z') });
    expect(t).toBe('Night Shift | Player Build | e2e | 2026-10-23T08:00:00.000Z | pid 4321 | host desk');
    expect(parseLock(t)).toEqual({ pid: 4321, host: 'desk' });
    expect(parseLock(`${t}\n`)).toEqual({ pid: 4321, host: 'desk' });
    expect(parseLock('Marlow Build | marlow-final | 18:48')).toEqual({ pid: null, host: null });
  });

  it('isStale: only a dead pid on this host; old-format lines never', () => {
    const t: string = formatLock('x', { pid: 5, host: HOST });
    expect(isStale(t, { host: HOST, alive: () => false })).toBe(true);
    expect(isStale(t, { host: HOST, alive: () => true })).toBe(false);
    expect(isStale(t, { host: 'laptop', alive: () => false })).toBe(false);
    expect(isStale('Marlow Build | marlow-final | 18:48', { host: HOST, alive: () => false })).toBe(false);
  });

  it('pidAlive: this process yes, an unused pid no', () => {
    expect(pidAlive(process.pid)).toBe(true);
    expect(pidAlive(2 ** 22 + 12_345)).toBe(false);
  });

  it('lockHasLabel matches the label prefix only', () => {
    expect(lockHasLabel('a | b | t | pid 1 | host h', 'a | b')).toBe(true);
    expect(lockHasLabel('a | b', 'a | b')).toBe(true);
    expect(lockHasLabel('a | bc | t', 'a | b')).toBe(false);
  });
});

describe('heavy-lock take, release, check', () => {
  it('takes with wx and never overwrites a live or old-format lock', () => withDir((lock) => {
    expect(tryTake(lock, 'me | t | pid 1 | host desk', { host: HOST, alive: () => true, log: quiet })).toEqual({ taken: true, holder: null });
    const r = tryTake(lock, 'you | t | pid 2 | host desk', { host: HOST, alive: () => true, log: quiet });
    expect(r).toEqual({ taken: false, holder: 'me | t | pid 1 | host desk' });
    fs.writeFileSync(lock, 'Marlow Build | marlow-final | 18:48');
    expect(tryTake(lock, 'you | t', { host: HOST, alive: () => false, log: quiet }).taken).toBe(false);
    expect(fs.readFileSync(lock, 'utf8')).toBe('Marlow Build | marlow-final | 18:48');
  }));

  it('breaks a stale lock: logs, renames it to .stale, creates its own', () => withDir((lock) => {
    fs.writeFileSync(lock, 'old | t | pid 77 | host desk');
    const logs: string[] = [];
    expect(tryTake(lock, 'new | t | pid 1 | host desk', { host: HOST, alive: () => false, log: (m: string) => logs.push(m) }).taken).toBe(true);
    expect(fs.readFileSync(lock, 'utf8')).toBe('new | t | pid 1 | host desk');
    expect(fs.readFileSync(`${lock}.stale`, 'utf8')).toBe('old | t | pid 77 | host desk');
    expect(logs[0]).toMatch(/stale.*pid 77/);
  }));

  it('a lock from another host is not broken', () => withDir((lock) => {
    fs.writeFileSync(lock, 'old | t | pid 77 | host laptop');
    expect(tryTake(lock, 'new', { host: HOST, alive: () => false, log: quiet }).taken).toBe(false);
  }));

  it('takeLockText retries, then gives up after maxMs', () => withDir(async (lock) => {
    fs.writeFileSync(lock, 'someone | job | t');
    await expect(takeLockText(lock, 'me', { retryMs: 1, maxMs: 20, log: quiet })).rejects.toThrow(/stayed held/);
    let waits = 0;
    await takeLockText(lock, 'me', { retryMs: 1, maxMs: 10_000, log: quiet, sleepFn: async () => { if (++waits === 2) fs.rmSync(lock); } });
    expect(waits).toBe(2);
    expect(fs.readFileSync(lock, 'utf8')).toBe('me');
  }));

  it('release removes only its own label; check reports free, held, stale', () => withDir((lock) => {
    expect(checkLock(lock)).toEqual({ held: false, stale: false, text: null });
    fs.writeFileSync(lock, 'Night Shift | Test Runner | train 31 | t | pid 9 | host desk');
    expect(checkLock(lock, { host: HOST, alive: () => true })).toMatchObject({ held: true, stale: false });
    expect(checkLock(lock, { host: HOST, alive: () => false })).toMatchObject({ held: true, stale: true });
    expect(releaseLock(lock, 'Night Shift | Player Build')).toBe(false);
    expect(fs.existsSync(lock)).toBe(true);
    expect(releaseLock(lock, 'Night Shift | Test Runner | train 31')).toBe(true);
    expect(fs.existsSync(lock)).toBe(false);
    expect(releaseLock(lock, 'x')).toBe(false);
  }));
});

describe('heavy-lock parseArgs', () => {
  const env = { ppid: 4242, msys: false };

  it('take: path, label, --wait, --pid (default the parent pid)', () => {
    expect(parseArgs(['take', 'C:/NightShift/heavy.lock', 'S | job'], env)).toEqual({
      cmd: 'take', lock: 'C:/NightShift/heavy.lock', label: 'S | job', waitMin: 0, pid: 4242 });
    expect(parseArgs(['take', 'l', 'S', '--wait', '30', '--pid', '17'], env)).toMatchObject({ waitMin: 30, pid: 17 });
  });

  it('take under Git Bash needs --pid', () => {
    expect(() => parseArgs(['take', 'l', 'S'], { ppid: 1, msys: true })).toThrow(/winpid/);
    expect(parseArgs(['take', 'l', 'S', '--pid', '12008'], { ppid: 1, msys: true }).pid).toBe(12008);
  });

  it('release and check; rejects bad input', () => {
    expect(parseArgs(['release', 'l', 'S'], env)).toMatchObject({ cmd: 'release', label: 'S' });
    expect(parseArgs(['check', 'l'], env)).toMatchObject({ cmd: 'check', label: null });
    expect(() => parseArgs([], env)).toThrow(/no command/);
    expect(() => parseArgs(['take', 'l'], env)).toThrow(/label/);
    expect(() => parseArgs(['take', 'l', 'S', '--pid', 'x'], env)).toThrow(/--pid needs a number/);
    expect(() => parseArgs(['release', 'l', 'S', '--wait', '5'], env)).toThrow(/take only/);
    expect(() => parseArgs(['check', 'l', 'extra'], env)).toThrow(/unexpected argument/);
    expect(() => parseArgs(['take', 'l', 'S', '--force'], env)).toThrow(/usage:/);
  });
});
