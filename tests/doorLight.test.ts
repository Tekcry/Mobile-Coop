/** (sector-batch, G41) One door threshold: the light field's cut is the stick-driven door's crack line, 15% open. */
import { describe, expect, it } from 'vitest';
import { DOOR_SHUT } from '../src/world/lightField';
import { DOOR } from '../src/world/doors';

describe('sector-batch: one door threshold at 15% (G41)', () => {
  it('DOOR_SHUT is 0.15', () => {
    expect(DOOR_SHUT).toBe(0.15);
  });

  it('DOOR_SHUT is DOOR.driveShut: light and the stick-driven door share one line', () => {
    expect(DOOR_SHUT).toBe(DOOR.driveShut);
  });
});
