/**
 * (sector-marks, G290 / G336 / G343 / G351) Every Sector Ops objective line on Saltmarsh Park (campusOps) names what
 * and where, short: an objective line holds the name of the room its objective stands in (the map's room tags); a
 * connector or extraction label holds a place word of the map. campusOps only: warehouseOps is frozen (Q26, it fails
 * on two lines) and Marlow Yard has its own test.
 */
import { describe, expect, it } from 'vitest';
import { inRoom, type RoomRect } from '../src/world/rooms';
import { CAMPUS_SECTORS } from '../src/world/maps/campusSectors';
import { S1_ROOMS } from '../src/world/maps/campusS1';
import { S2_ROOMS } from '../src/world/maps/campusS2';
import { S3_ROOMS } from '../src/world/maps/campusS3';
import { S4_ROOMS } from '../src/world/maps/campusS4';
import { S5_ROOMS } from '../src/world/maps/campusS5';

/** G343 "a short, plain English objective" (the co-op feed cap `INTEL_LINE_MAX` is 60). */
const OBJECTIVE_LINE_MAX = 50;
const ROOMS: readonly RoomRect[] = [...S1_ROOMS, ...S2_ROOMS, ...S3_ROOMS, ...S4_ROOMS, ...S5_ROOMS];
const STOP = new Set(['the', 'and']);
const words = (s: string): string[] => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 0);
/** Place words: every word of 3+ letters in the map's room and section names. */
const PLACE_WORDS: string[] = [];
for (const n of [...ROOMS.map((r) => r.name), ...CAMPUS_SECTORS.map((s) => s.name)]) {
  for (const w of words(n)) if (w.length >= 3 && !STOP.has(w) && !PLACE_WORDS.includes(w)) PLACE_WORDS.push(w);
}
const hasPlaceWord = (label: string): boolean => words(label).some((w) => PLACE_WORDS.some((p) => w.startsWith(p)));
const roomsAt = (x: number, y: number, z: number): RoomRect[] => ROOMS.filter((r) => inRoom(r, x, z, 0, y));

describe('sector-marks: Saltmarsh Park objective lines name what and where (G336, G351)', () => {
  it('five sections', () => {
    expect(CAMPUS_SECTORS.length).toBe(5);
  });

  for (const s of CAMPUS_SECTORS) {
    it(`${s.id}: the objective line names the room it stands in, within ${OBJECTIVE_LINE_MAX} characters`, () => {
      const o = s.objective;
      const here = roomsAt(o.x, o.y, o.z);
      expect(here.length, `${s.id}: no room holds (${o.x}, ${o.y}, ${o.z})`).toBeGreaterThan(0);
      const line = o.label.toLowerCase();
      expect(here.some((r) => line.includes(r.name.toLowerCase())), `${s.id} "${o.label}" names none of: ${here.map((r) => r.name).join(', ')}`).toBe(true);
      expect(o.label.length, `${s.id} "${o.label}"`).toBeLessThanOrEqual(OBJECTIVE_LINE_MAX);
    });

    it(`${s.id}: the connector or extraction label names a place`, () => {
      const zone = s.connector ?? s.extract;
      expect(zone, `${s.id}: no connector or extraction`).toBeDefined();
      if (!zone) return;
      expect(hasPlaceWord(zone.label), `${s.id} "${zone.label}"`).toBe(true);
      expect(zone.label.length, `${s.id} "${zone.label}"`).toBeLessThanOrEqual(OBJECTIVE_LINE_MAX);
    });
  }

  it('the rule bites: a line without its room or a place word fails', () => {
    const o = CAMPUS_SECTORS[0]!.objective;
    const here = roomsAt(o.x, o.y, o.z);
    expect(here.some((r) => "download tonight's visitor list".includes(r.name.toLowerCase()))).toBe(false);
    expect(hasPlaceWord('Hack the production terminal')).toBe(false);
  });
});
