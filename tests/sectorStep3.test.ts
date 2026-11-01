import { describe, expect, it } from 'vitest';
import { DIFFICULTIES } from '../src/ai/archetypes';
import { SECTOR, sectorInfoHtml, syringesFor } from '../src/game/sectors';
import { ReviveClock, REVIVES_PER_MISSION } from '../src/game/reviveClock';
import { starsText } from '../src/save/sectorRecord';
import { parseMessage, MAX_DOORS } from '../src/net/protocol';
import { CameraUnit } from '../src/security/camera';
import type { CameraDevice } from '../src/security/data';

// Sector Ops slice 2 step 3 (M7, A9, A10): syringes, the HUD line, the stars text, the `sector` message extras and the
// shot camera restored on a restart.
describe('sector ops step 3', () => {
  it('revive syringes per difficulty (A10): Rookie 3, Normal 2, Realistic 1, Perfectionist 1; unknown reads Normal', () => {
    expect(DIFFICULTIES.map((d) => syringesFor(d))).toEqual([3, 2, 1, 1]);
    expect(syringesFor(undefined)).toBe(SECTOR.syringes.normal);
  });

  it('the revive clock takes the op syringes as its cap; a checkpoint keeps the count used', () => {
    const c = new ReviveClock();
    expect(c.cap).toBe(REVIVES_PER_MISSION);
    c.cap = syringesFor('perfectionist');
    expect(c.down('a')).toBe(true);
    expect(c.revive('a')).toBe(true);
    c.checkpoint();
    // the one syringe is spent: the next down is out at once
    expect(c.down('a')).toBe(false);
    c.reset();
    expect(c.down('a')).toBe(true);
  });

  it('the HUD line: section, alarm and, in co-op only, the syringes left', () => {
    const solo = sectorInfoHtml(2, 3, 1, null);
    expect(solo).toContain('Section <b>2/3</b>');
    expect(solo).toContain(`Alarm <b>1/${SECTOR.alarmMax}</b>`);
    expect(solo).not.toContain('Syringes');
    expect(sectorInfoHtml(1, 3, 0, 2)).toContain('Syringes <b>2</b>');
    expect(sectorInfoHtml(1, 3, 0, -1)).toContain('Syringes <b>0</b>');
  });

  it('stars as text, one per difficulty, filled when completed', () => {
    expect(starsText([false, true, false, true])).toBe('☆★☆★');
    expect(starsText([false, false, false, false])).toBe('☆☆☆☆');
  });

  it('the sector message carries the live section, locked doors, shot cameras and syringes', () => {
    const sec = { ck: [1.5], j: ['', 'cam-dock'], ch: [3, 5], cd: [2.5, 0], dv: [['cam-dock', 1, 0.5]], al: 1 };
    const msg = { t: 'sector', sec, ls: 1, lk: [3, 7], dn: ['cam-floor'], sy: 2 };
    expect(parseMessage(JSON.parse(JSON.stringify(msg)))).toEqual(msg);
    // clamps and junk: section and syringes clamped, door indices in range, bad ids dropped
    const bad = parseMessage({ t: 'sector', ls: 99, lk: [-1, 2, MAX_DOORS + 5, 'x'], dn: ['ok-1', '<x>', 5], sy: 50 });
    expect(bad).toEqual({ t: 'sector', ls: 63, lk: [0, 2, MAX_DOORS - 1], dn: ['ok-1'], sy: 9 });
    // an old-shape message (no extras) still parses
    expect(parseMessage({ t: 'sector', sec })).toEqual({ t: 'sector', sec });
  });

  it('a shot camera is repaired (a section restart): seeing again, meters at zero', () => {
    const dev: CameraDevice = { id: 'c', kind: 'camera', level: 'ground', at: [0, 0], y: 3, facing: 0, reason: 't' };
    const c = new CameraUnit(dev, 0);
    c.meter('p').meter = 0.8;
    c.destroy();
    expect(c.mode).toBe('destroyed');
    c.setMode('online');
    expect(c.mode).toBe('destroyed');
    c.repair();
    expect(c.mode).toBe('online');
    expect(c.sees).toBe(true);
    expect(c.meter('p').meter).toBe(0);
    c.setMode('off');
    c.repair();
    expect(c.mode).toBe('off');
  });
});
