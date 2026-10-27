// (prebake-preview) The campus prebake builds campusOps under the same preview signal as the game build
// (`previewBuildOf` -> `__PREVIEW__` / `__PREVIEW_ID__`, defined by vite.config.ts and the prebake's vitest config), so
// the /preview/ build's shipped lamp key is the key /preview/ computes (campusV2 every section), and the live build's
// is unchanged. Babylon-free: `buildCampus` is the prebake's Node build of the game's light set.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { previewBuildOf, previewDefines } from '../src/core/previewBuild';
import { S1_V2_COPY } from '../src/world/maps/campusV2/s1Data';
import { S2_V2_COPY } from '../src/world/maps/campusV2/s2Data';
import { S3_V2_COPY } from '../src/world/maps/campusV2/s3Data';
import { S4_V2_COPY } from '../src/world/maps/campusV2/s4Data';
import { S5_V2_COPY } from '../src/world/maps/campusV2/s5Data';

describe('previewBuildOf', () => {
  it('reads the slot as vite.config.ts always did', () => {
    expect(previewBuildOf({})).toEqual({ preview: false, previewId: '' });
    expect(previewBuildOf({ VITE_PREVIEW: '1' })).toEqual({ preview: true, previewId: '' });
    expect(previewBuildOf({ VITE_PREVIEW: '0' })).toEqual({ preview: false, previewId: '' });
    expect(previewBuildOf({ VITE_PREVIEW_ID: 'ct' })).toEqual({ preview: true, previewId: 'ct' });
    expect(previewBuildOf({ VITE_PREVIEW_ID: 'Bad Id' })).toEqual({ preview: false, previewId: '' });
    expect(previewDefines({ preview: true, previewId: '' })).toEqual({ __PREVIEW__: 'true', __PREVIEW_ID__: '""' });
  });
});

/** The prebake under a build env (its `define`s as globals) and a page URL: the plan's variant and key, the flags. */
async function prebakeUnder(env: Record<string, string>, search = ''): Promise<{ variant: string; key: string; campusV2: readonly number[] }> {
  const d = previewDefines(previewBuildOf(env));
  vi.resetModules();
  vi.stubGlobal('__PREVIEW__', JSON.parse(d.__PREVIEW__) as boolean);
  vi.stubGlobal('__PREVIEW_ID__', JSON.parse(d.__PREVIEW_ID__) as string);
  vi.stubGlobal('location', { search });
  const { flags } = await import('../src/core/flags');
  const { buildCampus, VARIANT } = await import('../scripts/prebake/plan');
  return { variant: VARIANT, key: buildCampus().key, campusV2: flags.campusV2 };
}

describe('the prebake follows the build variant', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('preview bakes the /preview/ layout (campusV2 every section); live and /ct/ bake the live one', async () => {
    const live = await prebakeUnder({});
    const preview = await prebakeUnder({ VITE_PREVIEW: '1' });
    const ct = await prebakeUnder({ VITE_PREVIEW_ID: 'ct' });
    // the key the game computes on the live build with every v2 section named (= the /preview/ default layout)
    const v2All = await prebakeUnder({}, '?campusv2=1,2,3,4,5');

    expect(live.variant).toBe('live');
    expect(live.campusV2).toEqual([]);
    expect(preview.variant).toBe('preview');
    expect(preview.campusV2).toEqual([1, 2, 3, 4, 5]);
    expect(ct.variant).toBe('live');
    expect(ct.key).toBe(live.key);

    expect(preview.key).toBe(v2All.key);
    // while every v2 section is still an exact copy of v1 the two layouts (and keys) are the same; once a lane changes
    // one, the preview key must differ from the live one
    const allCopies = S1_V2_COPY && S2_V2_COPY && S3_V2_COPY && S4_V2_COPY && S5_V2_COPY;
    if (allCopies) expect(preview.key).toBe(live.key);
    else expect(preview.key).not.toBe(live.key);
  });
});
