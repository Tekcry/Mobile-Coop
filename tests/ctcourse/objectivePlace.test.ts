/**
 * (marlow-objective-place, VISION 4 rule 5 / G336 / G351) Every objective line of Marlow Yard names WHAT and WHERE in plain
 * English: no internal id on screen (a holding room code, a step or set id) and at least one place word from the map's own
 * rooms and devices. The HUD's own fallbacks for a bay with no closing line follow the same rule.
 */
import { describe, expect, it } from 'vitest';
import { LevelBuilder } from '../../src/world/levelBuilder';
import { buildCtcourse } from '../../src/world/maps/ctcourse';
import { COURSE_TEXT_MAX } from '../../src/config/course';
import { exitLine, exitPlace } from '../../src/ui/hud/courseHud';

const def = buildCtcourse(new LevelBuilder()).layout.course!.def;

/** The map's own place and device words (rooms, runs, devices and landmarks of the eight sets and the facility). */
const PLACE_WORDS: readonly string[] = [
  'holding room', 'striped mark', 'yard', 'wall', 'gate', 'wicket', 'neck', 'cabinet', 'cabin', 'van ends', 'shunter', 'corridor', 'lobby', 'recess',
  'office', 'floor', 'desk', 'dock', 'aisle', 'mezzanine', 'racking', 'gateway', 'transformer', 'kiosk', 'drums', 'beams', 'gallery',
  'davit', 'gland plate', 'drive panel', 'drive cabinet', 'outfall', 'hall', 'plant', 'terminal', 'cage', 'counters', 'vault', 'grille',
  'board', 'time lock', 'camera', 'stair', 'room', 'door', 'exit',
];

const ID_PATTERNS: readonly RegExp[] = [/\bL\d\b/, /\b[A-Z]\d-/, /\b[a-z]\d-[a-z]/, /\bA\d\b/, /\bset \d\b/i];

function linesOf(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const bay of def.bays) {
    for (const d of bay.drills) out.push({ where: `${bay.id} drill ${d.id}`, text: d.text });
    for (const o of def.objectives ?? []) {
      if (o.bay !== bay.id) continue;
      out.push({ where: `${bay.id} ${o.id} text`, text: o.text });
      if (o.a !== undefined) out.push({ where: `${bay.id} ${o.id} a`, text: o.a });
      if (o.b !== undefined) out.push({ where: `${bay.id} ${o.id} b`, text: o.b });
    }
  }
  return out;
}

describe('objective lines name the place', () => {
  const lines = linesOf();

  it('there are lines to check, for every bay', () => {
    expect(lines.length).toBeGreaterThan(30);
    for (const bay of def.bays) expect(lines.some((l) => l.where.startsWith(`${bay.id} `))).toBe(true);
  });

  it('no line carries an internal id or code name', () => {
    const coded = lines.filter((l) => ID_PATTERNS.some((re) => re.test(l.text))).map((l) => `${l.where}: ${l.text}`);
    expect(coded).toEqual([]);
  });

  it('every line names a place (a verb alone fails)', () => {
    const bare = lines.filter((l) => !PLACE_WORDS.some((w) => l.text.toLowerCase().includes(w))).map((l) => `${l.where}: ${l.text}`);
    expect(bare).toEqual([]);
  });

  it('every line fits the text limit', () => {
    for (const l of lines) expect(l.text.length, `${l.where}: ${l.text}`).toBeLessThanOrEqual(COURSE_TEXT_MAX);
  });

  it('the two Marlow lines that named no place now do', () => {
    const text = (id: string): string => def.objectives!.find((o) => o.id === id)!.text;
    expect(text('a2-back')).toBe('Now the other way round: back across the neck.');
    expect(text('a3-swap')).toBe('Swap: jam the corridor camera from the far lobby.');
  });
});

describe('the HUD closing-line fallbacks name the place', () => {
  it('a holding room code becomes a room in words', () => {
    const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
    for (let n = 1; n <= 7; n++) {
      expect(exitPlace(`L${n}`)).toBe(`holding room ${words[n - 1]}`);
      expect(exitLine(`L${n}`)).toBe(`Both of you into holding room ${words[n - 1]}.`);
    }
  });

  it('the finish is the cash dock, with no code in any fallback', () => {
    expect(exitLine('end')).toBe('Both of you out to the cash dock.');
    for (const exit of ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'end']) {
      expect(exitLine(exit)).not.toMatch(/\bL\d\b/);
      expect(exitLine(exit).length).toBeLessThanOrEqual(COURSE_TEXT_MAX);
    }
  });
});
