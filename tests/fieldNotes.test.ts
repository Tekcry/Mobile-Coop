import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIELD_NOTES_CAP, FieldNotes } from '../src/game/fieldNotes';

// (hud-guidance B5, R12, BRIEF A9) Field Terminal > Notes: this match's interrogation lines, capped, a repeat kept once;
// solo / host from the `intel` event, a co-op client from the host's `feed` events (no wire change)

describe('FieldNotes', () => {
  it('starts empty (a new match)', () => {
    expect(new FieldNotes().lines()).toEqual([]);
  });

  it('keeps the lines oldest first, trimmed; an empty line is skipped', () => {
    const n = new FieldNotes();
    expect(n.add('Lab door is 4471.')).toBe(true);
    expect(n.add('  Patrols near: 1, loop 21 s ')).toBe(true);
    expect(n.add('   ')).toBe(false);
    expect(n.add('')).toBe(false);
    expect(n.lines()).toEqual(['Lab door is 4471.', 'Patrols near: 1, loop 21 s']);
  });

  it('keeps a repeated line once, in its first place', () => {
    const n = new FieldNotes();
    n.add('Code: Lab door 4471');
    n.add('Cameras: 2');
    expect(n.add('Code: Lab door 4471')).toBe(false);
    expect(n.add(' Code: Lab door 4471 ')).toBe(false);
    expect(n.lines()).toEqual(['Code: Lab door 4471', 'Cameras: 2']);
  });

  it(`caps at ${FIELD_NOTES_CAP} lines: a new line past it drops the oldest`, () => {
    expect(FIELD_NOTES_CAP).toBe(24);
    const n = new FieldNotes();
    for (let i = 0; i < FIELD_NOTES_CAP + 3; i++) n.add(`line ${i}`);
    const l = n.lines();
    expect(l).toHaveLength(FIELD_NOTES_CAP);
    expect(l[0]).toBe('line 3');
    expect(l[FIELD_NOTES_CAP - 1]).toBe(`line ${FIELD_NOTES_CAP + 2}`);
    // a dropped line can come back as new
    expect(n.add('line 0')).toBe(true);
    expect(n.lines()[0]).toBe('line 4');
  });

  it('hands out the live list (no copy per read)', () => {
    const n = new FieldNotes();
    n.add('a');
    expect(n.lines()).toBe(n.lines());
  });
});

describe('the wiring (source)', () => {
  it('solo / host: GameState adds the intel event lines and hands the pause menu its notes', () => {
    const src = readFileSync('src/game/gameState.ts', 'utf8');
    expect(src).toMatch(/readonly notes = new FieldNotes\(\);/);
    expect(src).toMatch(/this\.events\.on\('intel', \(e\) => \{\s*for \(const line of e\.lines\) this\.notes\.add\(line\);\s*\}\);/);
    expect(src).toMatch(/notes: \(\) => this\.notes\.lines\(\),/);
  });

  it('client: the host feed lines go to the notes; no wire change', () => {
    const src = readFileSync('src/net/coopClient.ts', 'utf8');
    expect(src).toMatch(/case 'feed':[\s\S]{0,700}?g\.notes\.add\(e\.text\);[\s\S]{0,40}?break;/);
    expect(readFileSync('src/net/protocol.ts', 'utf8')).toMatch(/\| \{ e: 'feed'; text: string \}/);
  });

  it('the pause menu: a Notes row right after Objectives; "No notes yet" when empty', () => {
    const src = readFileSync('src/ui/screens/pauseScreen.ts', 'utf8');
    expect(src).toMatch(/notes\?: \(\) => readonly string\[\];/);
    expect(src).toMatch(/'objectives'\),\s*item\('Notes',[^\n]*'notes'\),/);
    expect(src).toMatch(/'No notes yet'/);
  });
});
