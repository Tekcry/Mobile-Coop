/**
 * (mixamo-retarget Toggle) The Animation source (`src/anim/animSource.ts`): one global look choice, Hand-made / CMU /
 * Mixamo, resolved once per change into the CMU mocap locomotion switch (`mocap.ts` LOCO) and the Mixamo captures
 * (`mixamo.ts` WREN_TRAV). The default (CMU) is today's game: the switch exactly as app.ts set it before the toggle
 * (`applyMocapSwitch(?mocap ?? tuner, true)`, the Mixamo flag off). The setting is saved with the settings (an old save
 * without the field takes the default); `?anim=` / `?mocap=` / `?mixamo=` override it for a page; other owners'
 * Mixamo tables follow through `addMixamoResolver`; the Anim Studio's set filter; the Now playing line's source.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ANIM_SOURCE, ANIM_SOURCE_DEFAULT, ANIM_SOURCES, applyAnimSource, parseAnimSource, resolveAnimSource, setAnimSource } from '../src/anim/animSource';
import { applyMocapSwitch, HAND_KEYED_SET, LOCO, MOCAP_SET } from '../src/anim/mocap';
import { addMixamoResolver, MIXAMO, MIXAMO_LOCO, MIXAMO_ON, MIXAMO_TRAV, setMixamo, setMixamoStudio, WREN_TRAV } from '../src/anim/mixamo';
import { defaultSettings, sanitizeSettings, settingAnimSource, SettingsStore } from '../src/core/settings';
import { STUDIO_ENTRIES, studioEntriesOf, studioEntrySet } from '../src/anim/studio';
import { mocapSource } from '../src/anim/mocapSources';
import { nowPlayingSourceText } from '../src/anim/nowPlaying';
import { MOCAP_CROUCHED_WALKING } from '../src/anim/clips/mixamo/crouched_walking';

/** Everything the graph reads from the two switches (it reads nothing else of them). */
function snap(): unknown {
  return { set: LOCO.set, mocap: LOCO.mocap, slots: LOCO.slots, mixamo: MIXAMO.on, trav: { ...WREN_TRAV } };
}

afterEach(() => setAnimSource(ANIM_SOURCE_DEFAULT));

describe('animation source: the default is today\'s game', () => {
  it('CMU is the default, in the code and in a fresh or old settings save', () => {
    expect(ANIM_SOURCE_DEFAULT).toBe('cmu');
    expect(defaultSettings().gameplay.animSource).toBe('cmu');
  });

  it('CMU sets the switches exactly as app.ts did before the toggle (mocap on, no Mixamo capture)', () => {
    // before: applyMocapSwitch(flags.mocap ?? mocapTuner, true) with no URL / tuner, and the mixamo flag null = off
    applyMocapSwitch(null, true);
    setMixamo(false);
    const before = snap();
    setAnimSource('hand');
    setAnimSource('cmu');
    expect(snap()).toEqual(before);
    expect(LOCO.set).toBe(MOCAP_SET);
    expect(LOCO.mocap).toBe(true);
    expect(WREN_TRAV.any).toBe(false);
    // the app's call with no overrides (the setting only) is the same
    applyAnimSource({ setting: defaultSettings().gameplay.animSource, url: null, mocapUrl: null, mocapTuner: null, mixamoUrl: null });
    expect(snap()).toEqual(before);
  });
});

describe('animation source: each source', () => {
  it('Hand-made: the hand-keyed locomotion, no capture', () => {
    setAnimSource('hand');
    expect(ANIM_SOURCE).toMatchObject({ source: 'hand', mocap: false, mixamo: false });
    expect(LOCO.mocap).toBe(false);
    expect(LOCO.set).toBe(HAND_KEYED_SET);
    expect(WREN_TRAV.any).toBe(false);
  });

  it('Mixamo: the CMU locomotion with the captures MIXAMO_ON lets play on top; a row off keeps its clip', () => {
    setAnimSource('mixamo');
    expect(ANIM_SOURCE).toMatchObject({ source: 'mixamo', mocap: true, mixamo: true });
    // the CMU set, with each Mixamo capture in its slot when its row is on (I4 crouched walk, I6 MIXAMO_LOCO: mocap.ts
    // MOCAP_SET_MX), the rest by reference
    expect(LOCO.mocap).toBe(true);
    const mx: Record<string, unknown> = {};
    for (const [slug, r] of Object.entries(MIXAMO_LOCO)) if (MIXAMO_ON[slug] && r.clip) mx[r.slot] = r.clip;
    if (MIXAMO_ON.crouched_walking) mx.crouchWalk = MOCAP_CROUCHED_WALKING;
    for (const k of Object.keys(MOCAP_SET) as (keyof typeof MOCAP_SET)[]) expect(LOCO.set[k], k).toBe(mx[k] ?? MOCAP_SET[k]);
    expect(LOCO.set === MOCAP_SET).toBe(Object.keys(mx).length === 0);
    expect(MIXAMO.on).toBe(true);
    for (const [slug, r] of Object.entries(MIXAMO_TRAV)) expect(WREN_TRAV[r.slot], slug).toBe(MIXAMO_ON[slug] ? r.clip : null);
    expect(WREN_TRAV.any).toBe(true);
  });

  it('every source and back: the default state comes back exactly', () => {
    setAnimSource('cmu');
    const base = snap();
    for (const s of ANIM_SOURCES) setAnimSource(s);
    setAnimSource('cmu');
    expect(snap()).toEqual(base);
  });
});

describe('animation source: page overrides', () => {
  const r = { source: 'cmu' as const, mocap: false, mixamo: false };
  it('?anim= over the setting; ?mocap= and the tuner box over the mocap half; ?mixamo= over the Mixamo half', () => {
    expect(resolveAnimSource({ setting: 'cmu', url: 'hand' }, { ...r })).toEqual({ source: 'hand', mocap: false, mixamo: false });
    expect(resolveAnimSource({ setting: 'hand', url: 'mixamo' }, { ...r })).toEqual({ source: 'mixamo', mocap: true, mixamo: true });
    expect(resolveAnimSource({ setting: 'cmu', mocapUrl: false }, { ...r })).toMatchObject({ mocap: false, mixamo: false });
    expect(resolveAnimSource({ setting: 'hand', mocapTuner: true }, { ...r })).toMatchObject({ mocap: true });
    expect(resolveAnimSource({ setting: 'hand', mocapUrl: false, mocapTuner: true }, { ...r })).toMatchObject({ mocap: false });
    expect(resolveAnimSource({ setting: 'cmu', mixamoUrl: true }, { ...r })).toMatchObject({ mocap: true, mixamo: true });
    expect(resolveAnimSource({ setting: 'mixamo', mixamoUrl: false }, { ...r })).toMatchObject({ mocap: true, mixamo: false });
    expect(parseAnimSource('cmu')).toBe('cmu');
    expect(parseAnimSource('CMU')).toBeNull();
    expect(parseAnimSource(null)).toBeNull();
  });

  it('the URL: ?anim=hand|cmu|mixamo reads, anything else is null', async () => {
    const read = async (search: string): Promise<unknown> => {
      vi.resetModules();
      vi.stubGlobal('location', { search });
      try {
        return (await import('../src/core/flags')).flags.anim;
      } finally {
        vi.unstubAllGlobals();
      }
    };
    expect(await read('?anim=hand')).toBe('hand');
    expect(await read('?anim=mixamo')).toBe('mixamo');
    expect(await read('?anim=cmu&mixamo=1')).toBe('cmu');
    expect(await read('?anim=x')).toBeNull();
    expect(await read('')).toBeNull();
  });
});

describe('animation source: saved with the settings', () => {
  it('an old save (no animSource field: a literal from before the toggle) loads as CMU; a bad value too', () => {
    const old = { gameplay: { defaultShoulder: 'left', crouchToggle: true, slowBeat: false, sprintHold: false, autoRecentre: true, wallToggle: true, grabToggle: true, rumble: 0.5, courseMarkers: true, mocapLoco: true }, mocapV: 1 };
    const s = sanitizeSettings(old);
    expect(s.gameplay.animSource).toBe('cmu');
    expect(s.gameplay.defaultShoulder).toBe('left');
    expect(sanitizeSettings({ gameplay: { animSource: 'mocap' } }).gameplay.animSource).toBe('cmu');
  });

  it('a chosen source is saved and comes back on the next load', async () => {
    vi.useFakeTimers();
    try {
      const saved: unknown[] = [];
      const st = new SettingsStore(async (v) => void saved.push(structuredClone(v)));
      st.update((d) => void (d.gameplay.animSource = 'mixamo'));
      await vi.advanceTimersByTimeAsync(300);
      expect(saved.length).toBe(1);
      const next = new SettingsStore();
      next.load(saved[0]);
      expect(next.get().gameplay.animSource).toBe('mixamo');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('addMixamoResolver: other owners follow the switch', () => {
  it('runs once on registration and after every change (the flag, the source, the Studio pick)', () => {
    const seen: boolean[] = [];
    addMixamoResolver(() => seen.push(MIXAMO.on));
    expect(seen.length).toBe(1);
    setAnimSource('mixamo');
    expect(seen[seen.length - 1]).toBe(true);
    setAnimSource('hand');
    expect(seen[seen.length - 1]).toBe(false);
    const n = seen.length;
    setMixamoStudio('hanging_idle');
    setMixamoStudio('');
    expect(seen.length).toBe(n + 2);
    // a source change that leaves the Mixamo half as it is rebuilds nothing
    setAnimSource('cmu');
    expect(seen.length).toBe(n + 2);
  });
});

describe('the Anim Studio: the animation-set filter on the Loop list', () => {
  it('All is the whole list; Hand-made, CMU and Mixamo split it with nothing left over', () => {
    const all = STUDIO_ENTRIES.map((e) => e.id);
    expect(studioEntriesOf('all')).toEqual(all);
    const hand = studioEntriesOf('hand');
    const cmu = studioEntriesOf('cmu');
    const mix = studioEntriesOf('mixamo');
    expect(hand.length + cmu.length + mix.length).toBe(all.length);
    expect(cmu.length).toBeGreaterThan(0);
    expect(mix.length).toBeGreaterThan(0);
    for (const id of cmu) expect(mocapSource(id.replace(/^keyed:/, ''))?.source, id).toBe('cmu');
    // every traversal capture is Mixamo, as is every keyed Mixamo capture
    for (const slug of Object.keys(MIXAMO_TRAV)) expect(mix.some((id) => id.endsWith(`/${slug}`)), slug).toBe(true);
    for (const id of mix) expect(studioEntrySet(id)).toBe('mixamo');
    expect(studioEntrySet('state:idle')).toBe('hand');
    expect(studioEntrySet('trav:ledge')).toBe('hand');
  });
});

describe('the Now playing line names the source', () => {
  it('appends the source word; an unknown source leaves the line', () => {
    expect(nowPlayingSourceText('Now playing: motion-capture (CMU) walk', 'cmu')).toBe('Now playing: motion-capture (CMU) walk (animation source: CMU)');
    expect(nowPlayingSourceText('Now playing: hand-made walk', 'hand')).toBe('Now playing: hand-made walk (animation source: Hand-made)');
    expect(nowPlayingSourceText('x', 'mixamo')).toBe('x (animation source: Mixamo)');
    expect(nowPlayingSourceText('x', '')).toBe('x');
  });
});

describe('F45: /preview/ plays Mixamo until the player picks a source', () => {
  it('not picked: Mixamo on /preview/, the default (CMU) on the live game', () => {
    const g = defaultSettings().gameplay;
    expect(g.animSourceSet).toBe(false);
    expect(settingAnimSource(g, true)).toBe('mixamo');
    expect(settingAnimSource(g, false)).toBe(ANIM_SOURCE_DEFAULT);
  });

  it('picked: the pick wins on both builds (CMU picked on /preview/ stays CMU)', () => {
    for (const s of ANIM_SOURCES) {
      const g = { animSource: s, animSourceSet: true };
      expect(settingAnimSource(g, true), s).toBe(s);
      expect(settingAnimSource(g, false), s).toBe(s);
    }
  });

  it('a save from before the field reads as not picked; a picked save keeps the bit', () => {
    const old = sanitizeSettings({ gameplay: { animSource: 'cmu' } });
    expect(old.gameplay.animSourceSet).toBe(false);
    expect(settingAnimSource(old.gameplay, true)).toBe('mixamo');
    const picked = sanitizeSettings({ gameplay: { animSource: 'hand', animSourceSet: true } });
    expect(settingAnimSource(picked.gameplay, true)).toBe('hand');
    // an old save holding Hand-made or Mixamo was a pick (only CMU was the default)
    for (const s of ['hand', 'mixamo'] as const) expect(sanitizeSettings({ gameplay: { animSource: s } }).gameplay.animSourceSet, s).toBe(true);
  });

  it('applied on /preview/ with no pick, the Mixamo switch is on', () => {
    const r = applyAnimSource({ setting: settingAnimSource(defaultSettings().gameplay, true) });
    expect(r.mixamo).toBe(true);
    expect(MIXAMO.on).toBe(true);
    setAnimSource(ANIM_SOURCE_DEFAULT);
    expect(MIXAMO.on).toBe(false);
  });
});
