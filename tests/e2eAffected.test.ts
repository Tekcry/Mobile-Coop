import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { selectSuites as selectUntyped, suitesForFile as fileUntyped, COVERS, CORE } from '../scripts/e2e-affected.mjs';

const selectSuites = selectUntyped as (files: string[]) => string[];
const suitesForFile = fileUntyped as (file: string) => string[] | null;
const covers = COVERS as Record<string, string[]>;
const core = CORE as string[];

const has = (files: string[], ...suites: string[]): void => {
  const got = selectSuites(files);
  for (const s of suites) expect(got, `${files.join(', ')} -> ${s}`).toContain(s);
};

describe('e2e-affected selection', () => {
  it('returns a sorted unique list', () => {
    const got = selectSuites(['src/weapons/a.ts', 'src/weapons/b.ts', 'src/ai/x.ts']);
    expect(got).toEqual([...new Set(got)].sort());
  });

  it('docs, markdown, changelog fragments and unit tests need no suites', () => {
    expect(selectSuites(['docs/ROADMAP.md', 'docs/systems/testing-tools.md', 'README.md', 'src/ai/notes.md', 'changes/feature-x.md', 'CHANGELOG.md'])).toEqual([]);
    expect(selectSuites(['tests/e2eAffected.test.ts'])).toEqual([]);
    expect(selectSuites([])).toEqual([]);
  });

  it('a docs file beside a code file does not change the code file pick', () => {
    expect(selectSuites(['docs/a.md', 'src/pwa/sw.ts'])).toEqual(['e2e-offline', 'smoke']);
  });

  it('train 30: a weapons change picks e2e-stealth-ai (weapons.lastShotNoise drives guard hearing)', () => {
    has(['src/weapons/playerWeapons.ts'], 'smoke', 'e2e-stealth-ai', 'e2e-sectorops:1', 'e2e-combat', 'e2e-weapons-carry');
  });

  it('src/ai picks the stealth AI, guard carry and Sector Ops parts', () => {
    has(['src/ai/hearing.ts'], 'e2e-stealth-ai', 'e2e-weapons-carry', 'e2e-takedown', 'e2e-sectorops:1', 'e2e-sectorops:6');
    has(['src/ai/carryState.ts'], 'e2e-weapons-carry', 'e2e-stealth-ai');
  });

  it('src/net, the protocol and the save shape pick the co-op group', () => {
    for (const f of ['src/net/coopHost.ts', 'src/net/protocol.ts', 'src/net/coopUi.ts', 'src/save/schema.ts', 'src/save/migrations.ts', 'src/save/saveManager.ts', 'src/security/data.ts']) {
      has([f], 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse');
    }
  });

  it('the tuner store is not the save shape', () => {
    const got = selectSuites(['src/save/animTuneStore.ts']);
    expect(got).toEqual(['e2e-menus', 'e2e-studio', 'smoke']);
  });

  it('lamp, light and voxel files pick the bake suite and the light suites', () => {
    for (const f of ['src/world/lights.ts', 'src/world/lightBake.ts', 'src/world/lightField.ts', 'src/world/lampMath.ts', 'src/world/bakedLamps.ts', 'src/voxel/lampBake.ts']) {
      has([f], 'e2e-lightbake', 'e2e-desktop', 'e2e-stealth-ai', 'e2e-security', 'e2e-darkness');
    }
    // other world files keep the folder default
    expect(selectSuites(['src/world/doors.ts'])).toEqual(['e2e-anchors', 'e2e-ctcourse', 'e2e-levels', 'e2e-lightbake', 'smoke']);
  });

  it('src/player and src/anim pick anim, clip, takedown and move', () => {
    has(['src/player/controller.ts'], 'e2e-anim', 'e2e-clip', 'e2e-takedown', 'e2e-move');
    has(['src/anim/footPlanner.ts'], 'e2e-anim', 'e2e-clip', 'e2e-takedown', 'e2e-move');
  });

  it('the studio and tuner files keep their own picks (not the player group)', () => {
    expect(selectSuites(['src/anim/studio.ts'])).toEqual(['anim-audit', 'e2e-anim', 'e2e-studio', 'smoke']);
    expect(selectSuites(['src/anim/tuneHistory.ts'])).toEqual(['e2e-studio', 'smoke']);
  });

  it('a change to a suite script picks that suite, a helper picks what it serves', () => {
    expect(selectSuites(['scripts/e2e-takedown.mjs'])).toEqual(['e2e-takedown', 'smoke']);
    expect(selectSuites(['scripts/e2e-net-lib.mjs'])).toEqual(['anim-audit', 'e2e-netmove', 'smoke']);
    expect(selectSuites(['scripts\\e2e-wall.mjs'])).toEqual(['e2e-wall', 'smoke']);
  });

  it('the shared helpers, the runner and the build files run the default set', () => {
    for (const f of ['scripts/e2e-lib.mjs', 'scripts/run-e2e.mjs', 'scripts/e2e-affected.mjs', 'package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'public/icon.png']) {
      expect(selectSuites([f]), f).toEqual([...core, 'smoke'].sort());
    }
  });

  it('an unknown src path runs smoke plus the default set', () => {
    expect(selectSuites(['src/brandnew/thing.ts'])).toEqual([...core, 'smoke'].sort());
    expect(selectSuites(['src/main.ts'])).toEqual([...core, 'smoke'].sort());
  });

  it('files with no browser reach add nothing: the timings file, other scripts', () => {
    expect(selectSuites(['scripts/e2e-times.json', 'scripts/changelog-assemble.mjs', '.github/workflows/ci.yml'])).toEqual([]);
  });

  it('the first matching prefix wins: a specific file before its folder', () => {
    expect(suitesForFile('src/net/coopUi.ts')).toEqual(covers['src/net/coopUi']);
    expect(suitesForFile('src/ui/tuner/tunerMouse.ts')).toEqual(covers['src/ui/tuner']);
    expect(suitesForFile('src/ui/hud.ts')).toEqual(covers['src/ui/']);
  });

  it('a whole suite absorbs its parts', () => {
    const got = selectSuites(['src/ai/hearing.ts', 'src/game/sectors.ts']);
    expect(got).toContain('e2e-sectorops');
    expect(got.filter((s) => s.startsWith('e2e-sectorops'))).toEqual(['e2e-sectorops']);
  });

  it('a union over many files stays sorted and unique', () => {
    const got = selectSuites(['src/weapons/a.ts', 'src/net/b.ts', 'docs/x.md', 'src/voxel/c.ts']);
    expect(got).toEqual([...new Set(got)].sort());
    expect(got).toContain('e2e-coop');
    expect(got).toContain('e2e-lightbake');
    expect(got).toContain('e2e-stealth-ai');
  });
});
