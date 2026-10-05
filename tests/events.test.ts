import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/events';

describe('EventBus', () => {
  it('delivers typed payloads and unsubscribes', () => {
    const bus = new EventBus<{ hit: { dmg: number } }>();
    const got: number[] = [];
    const off = bus.on('hit', (p) => got.push(p.dmg));
    bus.emit('hit', { dmg: 5 });
    off();
    bus.emit('hit', { dmg: 7 });
    expect(got).toEqual([5]);
  });
});
