import { describe, expect, it } from 'vitest';
import { createLocalTransport } from '../src/net/localTransport';

describe('local transport', () => {
  it('drops a send after leave() instead of throwing on the closed channel', async () => {
    const t = createLocalTransport('closed-guard');
    await t.leave();
    expect(() => t.send({ t: 'late' } as never)).not.toThrow();
  });
});
