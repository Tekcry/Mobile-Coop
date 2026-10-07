import { describe, expect, it } from 'vitest';
import { feedbackReportHtml, feedbackText, MAX_PHOTOS, newEntry, sanitizeFeedback, summaryLine } from '../src/feedback/feedback';

describe('feedback notes', () => {
  it('a new note starts as a bug with the context it was written in', () => {
    const e = newEntry({ map: 'warehouse', mode: 'clear' }, 1000);
    expect(e.category).toBe('bug');
    expect(e.context.map).toBe('warehouse');
    expect(e.photos).toEqual([]);
    expect(e.id).toMatch(/^fb-/);
  });
  it('stored notes are sanitised and listed newest first', () => {
    const photo = new Blob(['x'], { type: 'image/jpeg' });
    const list = sanitizeFeedback([
      { id: 'a', created: 1, category: 'visual', text: 'old', context: { map: 'port', n: 3, bad: {} }, photos: [photo, 'nope'] },
      { id: 'b', created: 5, category: 'weird', text: 42 },
      { nope: true },
      'junk',
      { id: 'c', created: 3, photos: Array.from({ length: 20 }, () => photo) },
    ]);
    expect(list.map((e) => e.id)).toEqual(['b', 'c', 'a']);
    expect(list[0]!.category).toBe('other');
    expect(list[0]!.text).toBe('');
    expect(list[2]!.context).toEqual({ map: 'port', n: '3' });
    expect(list[2]!.photos.length).toBe(1);
    expect(list[1]!.photos.length).toBe(MAX_PHOTOS);
    expect(sanitizeFeedback(null)).toEqual([]);
  });
  it('the text list and the HTML report carry every note, photos embedded and text escaped', () => {
    const a = { ...newEntry({ map: 'mansion', mode: 'infiltration' }, 0), category: 'gameplay' as const, text: 'Guards <too> fast\nsecond line' };
    const b = { ...newEntry({}, 0), category: 'visual' as const, done: true, photos: [new Blob(['p'])] };
    expect(summaryLine(a, 0)).toBe('1. [Gameplay] Guards <too> fast second line (mansion / infiltration)');
    expect(summaryLine(b, 1)).toBe('2. [Visual] [done] (no text) [1 photo]');
    // (3.1.7: a note's context follows its line; a note without context is one line)
    expect(feedbackText([a, b]).split('\n')).toEqual([summaryLine(a, 0), '   map: mansion | mode: infiltration', summaryLine(b, 1)]);
    const html = feedbackReportHtml([a, b], [[], ['data:image/jpeg;base64,AAA']], 'Silent But Deadly', 0);
    expect(html).toContain('Guards &lt;too&gt; fast<br>second line');
    expect(html).toContain('<img src="data:image/jpeg;base64,AAA"');
    expect(html).toContain('playtest feedback (2)');
    expect(html).not.toContain('<too>');
  });
});

describe('settings in feedback (3.1.7)', () => {
  it('the digest lists every graphics setting and only the other settings that changed', async () => {
    const { defaultSettings, settingsDigest } = await import('../src/core/settings');
    const s = defaultSettings();
    const d0 = settingsDigest(s);
    expect(d0.changed).toBe('defaults');
    expect(d0.video).toContain('gfx.shadows=');
    expect(d0.video).toContain('renderScale=');
    expect(d0.video).toContain('upscaler=');
    s.gameplay.sprintHold = !s.gameplay.sprintHold;
    s.touch.layout.fire = { ...s.touch.layout.fire, x: 0.5 };
    const d1 = settingsDigest(s);
    expect(d1.changed).toContain(`gameplay.sprintHold=${s.gameplay.sprintHold ? 'on' : 'off'}`);
    expect(d1.changed).toContain('touch.layout=custom');
    expect(d1.changed).not.toContain('touch.lookSensitivity');
  });
  it('long context values survive (the digest is ~1 KB)', () => {
    const e = sanitizeFeedback([{ id: 'x', context: { settings: 'a'.repeat(1500) } }])[0]!;
    expect(e.context.settings!.length).toBe(1500);
  });
});
