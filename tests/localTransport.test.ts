import { describe, expect, it } from 'vitest';
import { createLocalTransport, LOCAL_DROP_MS, parseNetDrop } from '../src/net/localTransport';

describe('local transport', () => {
  it('drops a send after leave() instead of throwing on the closed channel', async () => {
    const t = createLocalTransport('closed-guard');
    await t.leave();
    expect(() => t.send({ t: 'late' } as never)).not.toThrow();
  });
});

describe('netdrop (coop-real A6)', () => {
  it('reads seconds into the drop limit', () => {
    expect(parseNetDrop('8')).toBe(8000);
    expect(parseNetDrop('1.5')).toBe(1500);
    expect(parseNetDrop('60')).toBe(60000);
  });
  it('keeps the 60 s default when missing, not a number or out of range', () => {
    expect(LOCAL_DROP_MS).toBe(60000);
    for (const v of [null, undefined, '', ' ', 'abc', '0', '0.5', '-3', '61', 'Infinity']) expect(parseNetDrop(v)).toBe(LOCAL_DROP_MS);
  });
});
