import { describe, expect, it } from 'vitest';
import { DiagLog } from '../src/feedback/diag';
import { resetDbCache } from '../src/save/db';

// (diagnostics log) no IndexedDB (a blocked or private browser): the session lives in memory and still copies
describe('diagnostics log without IndexedDB', () => {
  it('starts, logs, flushes and copies without throwing', async () => {
    expect(typeof indexedDB).toBe('undefined');
    resetDbCache();
    let t = 1_780_000_000_000;
    const log = new DiagLog(t, () => (t += 50));
    await log.start();
    log.add('err', 'something broke');
    log.add('game', 'player down');
    await log.flush();
    await log.loadOld();
    const txt = await log.fullText(t);
    expect(txt).toMatch(/something broke/);
    expect(txt).toMatch(/player down/);
    expect(txt).toMatch(/Older sessions on this device: 0/);
    await log.clear();
    expect(log.text()).toMatch(/log cleared/);
    log.stop();
  });
});
