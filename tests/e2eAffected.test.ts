import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs process script without types
import { selectSuites as selectUntyped, suitesForFile as fileUntyped, QUICK_COVERS, DIRECT_COVERS, WIDE_COVERS, CORE, LEGACY, GPU, affectedGateSuites, affectedReportSuites, withWireSuites } from '../scripts/e2e-affected.mjs';

type Covers = Record<string, string[]>;
const wireSuites = withWireSuites as (suites: string[], files: string[], protocolTs: string) => string[];
const reportSuites = affectedReportSuites as (suites: string[]) => string[];
const select = selectUntyped as (files: string[], map?: Covers) => string[];
const forFile = fileUntyped as (file: string, map?: Covers) => string[] | null;
const quick = QUICK_COVERS as Covers;
const direct = DIRECT_COVERS as Covers;
const wide = WIDE_COVERS as Covers;
const core = CORE as string[];
const coreSet = [...core, 'smoke'].sort();

// Frozen copy of master's --quick map (scripts/run-e2e.mjs on origin/master d7a1b6c0, train 62, merged into this branch at 16f932a7): --quick must keep
// master's picks exactly. Change it only together with a deliberate change to QUICK_COVERS.
const MASTER_QUICK: [string, string[]][] = [
  ['src/anim/studio', ['e2e-studio', 'anim-audit', 'e2e-anim']],
  ['src/anim/tuneHistory', ['e2e-studio']],
  ['src/anim/moveTune', ['e2e-studio', 'e2e-coop', 'e2e-traverse', 'e2e-anim']],
  ['src/game/studioStage', ['e2e-studio', 'e2e-tuner-phone']],
  ['src/player/freeView', ['e2e-tuner-phone', 'e2e-studio', 'anim-audit', 'e2e-anim', 'e2e-move']],
  ['src/world/maps/studio.ts', ['e2e-studio']],
  ['src/save/animTuneStore', ['e2e-studio', 'e2e-menus']],
  ['src/ui/studio', ['e2e-studio']],
  ['src/ui/tuneSnapshots', ['e2e-studio', 'e2e-menus']],
  ['src/ui/overlayProject', ['e2e-studio', 'e2e-menus']],
  ['src/ui/animTune', ['e2e-studio', 'e2e-tuner-phone', 'e2e-pad', 'e2e-desktop', 'e2e-feedback', 'e2e-park', 'e2e-menus']],
  ['src/ui/tuner', ['e2e-studio', 'e2e-tuner-phone', 'e2e-menus']],
  ['src/core/quality', ['e2e-desktop', 'e2e-lightbake']],
  ['src/core/display', ['e2e-desktop']],
  ['src/core/settings', ['e2e-desktop', 'e2e-menus']],
  ['src/core/flags', ['e2e-park', 'e2e-move', 'e2e-combat', 'e2e-anim']],
  ['src/core/', ['e2e-offline', 'e2e-move', 'e2e-combat', 'e2e-anim']],
  ['src/input/', ['e2e-pad', 'e2e-mouse', 'e2e-move', 'e2e-menus']],
  ['src/ui/hud/ratingCard', ['e2e-section-rating']],
  ['src/ui/screens/missionsScreen', ['e2e-sectorops', 'e2e-menus', 'e2e-pad', 'e2e-park']],
  ['src/ui/', ['e2e-pad', 'e2e-desktop', 'e2e-feedback', 'e2e-park', 'e2e-menus']],
  ['src/game/course/', ['e2e-course', 'e2e-ctcourse', 'e2e-coop']],
  ['src/game/modes/courseMode.ts', ['e2e-course', 'e2e-ctcourse', 'e2e-coop', 'e2e-section-rating']],
  ['src/game/modes/sectorMode.ts', ['e2e-sectorops', 'e2e-park', 'e2e-section-rating']],
  ['src/game/rating/', ['e2e-section-rating', 'e2e-sectorops', 'e2e-course']],
  ['src/save/ratingRecord', ['e2e-section-rating']],
  ['src/game/sectors', ['e2e-sectorops']],
  ['src/world/maps/warehouseOps.ts', ['e2e-sectorops']],
  ['src/world/maps/warehouseSectors.ts', ['e2e-sectorops']],
  ['src/world/maps/warehouseS', ['e2e-sectorops', 'e2e-lightbake', 'e2e-levels', 'e2e-anchors']],
  ['src/game/', ['e2e-takedown', 'e2e-gadgets', 'e2e-tactics', 'e2e-park', 'e2e-ctcourse', 'e2e-sectorops']],
  ['src/physics/', ['e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-ct']],
  ['src/player/shoulderCamera', ['e2e-camera-bounds', 'e2e-move', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-clip', 'e2e-mouse']],
  ['src/player/cameraBounds', ['e2e-camera-bounds', 'e2e-move', 'e2e-anim', 'e2e-clip']],
  ['src/config/camera', ['e2e-camera-bounds', 'e2e-anim', 'e2e-clip', 'e2e-move', 'e2e-combat', 'e2e-anim']],
  ['src/player/', ['anim-audit', 'e2e-guard-carry', 'e2e-wall', 'e2e-move', 'e2e-traverse', 'e2e-anchors', 'e2e-stealth', 'e2e-anim', 'e2e-ct', 'e2e-clip', 'e2e-weapons-carry']],
  ['src/anim/', ['anim-audit', 'e2e-anim', 'e2e-clip', 'e2e-weapons-carry', 'e2e-move']],
  ['src/cover/', ['e2e-stealth', 'e2e-clip', 'e2e-tactics', 'e2e-wall']],
  ['src/weapons/', ['e2e-combat', 'e2e-weapons-carry', 'e2e-enemies', 'e2e-gadgets', 'e2e-clip']],
  ['src/ai/', ['e2e-stealth-ai', 'e2e-guard-carry', 'e2e-levels', 'e2e-tactics', 'e2e-takedown', 'e2e-enemies']],
  ['src/world/maps/kestrel', ['e2e-kestrel']],
  ['src/world/maps/courselab.ts', ['e2e-course']],
  ['src/world/maps/bunker', ['e2e-course']],
  ['src/world/maps/ctcourse.ts', ['e2e-ctcourse']],
  ['src/world/maps/ctcourseSets/', ['e2e-ctcourse']],
  ['src/world/maps/ctcourseGreybox.ts', ['e2e-ctcourse']],
  ['src/world/', ['e2e-lightbake', 'e2e-guard-carry', 'e2e-levels', 'e2e-anchors', 'e2e-ctcourse']],
  ['src/voxel/', ['e2e-lightbake', 'e2e-desktop']],
  ['src/vfx/', ['e2e-desktop']],
  ['src/net/coopUi', ['e2e-park', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse']],
  ['src/net/', ['anim-audit', 'e2e-coop', 'e2e-netmove', 'e2e-ctcourse', 'e2e-sectorops']],
  ['src/security/', ['e2e-security', 'e2e-sectorops']],
  ['src/progression/', ['e2e-park']],
  ['src/cosmetics/', ['e2e-park']],
  ['src/save/sectorRecord', ['e2e-sectorops', 'e2e-menus']],
  ['src/save/', ['e2e-park', 'e2e-offline', 'e2e-feedback']],
  ['src/feedback/', ['e2e-feedback']],
  ['src/audio/', ['e2e-foley', 'e2e-music', 'e2e-score', 'e2e-weapon-audio']],
  ['src/pwa/', ['e2e-offline']],
  ['src/config/', ['e2e-move', 'e2e-combat', 'e2e-anim']],
];

/** One path that reaches a map row: the file itself, or a file in the folder / with the prefix. */
const probe = (prefix: string): string => (prefix.endsWith('/') ? `${prefix}zz.ts` : prefix.endsWith('.ts') ? prefix : `${prefix}.ts`);
/** Master's lookup: the first row whose prefix the path starts with, else CORE. */
const masterPick = (f: string): string[] => MASTER_QUICK.find(([p]) => f.startsWith(p))?.[1] ?? core;

// The file lists of two train-31 PRs (merge-base to branch head)
const OPTIC_CABLE = ['TESTING.md', 'changes/feature-optic-cable.md', 'docs/optic-cable/CHECK.md', 'docs/systems/ct-toolkit.md', 'docs/systems/testing-tools.md', 'scripts/e2e-stealth-ai.mjs', 'src/config/tools.ts', 'src/game/doorMenu.ts', 'src/game/gameState.ts', 'src/game/opticSystem.ts', 'src/player/opticCable.ts', 'src/world/anchors.ts', 'tests/opticCable.test.ts'];
const GUARD_CARRY_FIX = ['changes/feature-guard-ai-carry-fix.md', 'docs/guard-ai/slices/CARRY-FIX-CHECK.md', 'docs/systems/testing-tools.md', 'docs/systems/world-and-characters.md', 'scripts/e2e-guard-carry.mjs', 'scripts/run-e2e.mjs', 'src/core/babylon.ts', 'src/player/bodyEffectRecovery.ts', 'src/player/smoothBody.ts', 'tests/bodyEffectRecovery.test.ts'];
// jobs on the laptop: a suite in parts is one job per part (run-e2e.mjs PARTS)
const PARTS: Record<string, number> = { 'e2e-desktop': 3, 'e2e-ctcourse': 4, 'e2e-sectorops': 6 };
const jobs = (suites: string[]): number => suites.reduce((n, s) => n + (PARTS[s] ?? 1), 0);

describe('--quick keeps master picks', () => {
  it('QUICK_COVERS is master map unchanged, row by row and in order', () => {
    const rows = Object.entries(quick);
    expect(rows.length).toBe(MASTER_QUICK.length);
    MASTER_QUICK.forEach(([p, suites], i) => expect(rows[i], p).toEqual([p, suites]));
  });

  it('a file under each master row picks what master picked', () => {
    for (const [p] of MASTER_QUICK) {
      const f = probe(p);
      expect(forFile(f, quick), f).toEqual(masterPick(f));
      expect(select([f], quick), f).toEqual([...new Set(['smoke', ...masterPick(f)])].sort());
    }
  });

  it('master handling outside the map: markdown under src/, package-lock.json, e2e-affected.mjs', () => {
    expect(forFile('src/ai/notes.md', quick)).toEqual(masterPick('src/ai/notes.md'));
    expect(forFile('package-lock.json', quick)).toBeNull();
    expect(forFile('scripts/e2e-affected.mjs', quick)).toEqual(['e2e-affected']);
    for (const f of ['package.json', 'scripts/run-e2e.mjs', 'scripts/e2e-lib.mjs', 'index.html', 'vite.config.ts', 'public/x.png', 'src/brandnew/a.ts']) expect(forFile(f, quick), f).toEqual(core);
    for (const f of ['docs/a.md', 'README.md', 'changes/x.md', 'tests/a.test.ts', 'scripts/e2e-times.json']) expect(forFile(f, quick), f).toBeNull();
    expect(forFile('scripts/e2e-net-lib.mjs', quick)).toEqual(['e2e-netmove', 'anim-audit']);
    expect(forFile('scripts/e2e-wall.mjs', quick)).toEqual(['e2e-wall']);
  });

  it('master SUITE_DIRS rule: a set step module of e2e-ctcourse reruns it', () => {
    expect(forFile('scripts/e2e-ctcourse/a1Gate.mjs', quick)).toEqual(['e2e-ctcourse']);
    expect(select(['scripts/e2e-ctcourse/a8Strongroom.mjs'], quick)).toEqual(['e2e-ctcourse', 'smoke']);
  });
});

describe('--affected: the DIRECT tier (default)', () => {
  it('checker FIX: traversal, wall, team moves, Marlow devices and the sector record pick their suites', () => {
    expect(select(['src/player/traversal.ts'])).toContain('e2e-traverse');
    expect(select(['src/player/wallController.ts'])).toContain('e2e-wall');
    for (const f of ['src/game/teamMoves.ts', 'src/game/teamController.ts', 'src/game/pairPress.ts', 'src/game/dualTakedown.ts']) expect(select([f])).toContain('e2e-coop');
    for (const f of ['src/game/ctDevices.ts', 'src/game/reviveClock.ts', 'src/game/laserPanels.ts']) expect(select([f])).toContain('e2e-ctcourse');
    expect(select(['src/save/sectorRecord.ts'])).toEqual(expect.arrayContaining(['e2e-sectorops', 'e2e-menus', 'e2e-coop']));
  });

  it('defaults to DIRECT_COVERS', () => {
    expect(select(OPTIC_CABLE)).toEqual(select(OPTIC_CABLE, direct));
  });

  it('optic-cable runs 13 jobs', () => {
    const got = select(OPTIC_CABLE);
    expect(got).toEqual(['e2e-anchors', 'e2e-anim', 'e2e-clip', 'e2e-combat', 'e2e-gadgets', 'e2e-levels', 'e2e-move', 'e2e-park', 'e2e-stealth', 'e2e-stealth-ai', 'e2e-tactics', 'e2e-takedown', 'smoke']);
    expect(jobs(got)).toBe(13);
  });

  it('guard-ai-carry-fix runs 7 jobs', () => {
    const got = select(GUARD_CARRY_FIX);
    expect(got).toEqual(['e2e-anim', 'e2e-clip', 'e2e-combat', 'e2e-guard-carry', 'e2e-move', 'e2e-stealth', 'smoke']);
    expect(jobs(got)).toBe(7);
  });

  it('train 30: a weapons change picks e2e-stealth-ai (weapons.lastShotNoise drives guard hearing)', () => {
    expect(select(['src/weapons/playerWeapons.ts'])).toEqual(['e2e-combat', 'e2e-sectorops:1', 'e2e-stealth-ai', 'e2e-weapons-carry', 'smoke']);
  });

  it('each folder rule', () => {
    const rows: [string, string[]][] = [
      ['src/player/controller.ts', ['e2e-anim', 'e2e-clip', 'e2e-move', 'e2e-stealth']],
      ['src/anim/footPlanner.ts', ['e2e-anim', 'e2e-clip', 'e2e-move']],
      ['src/game/takedowns.ts', ['e2e-gadgets', 'e2e-park', 'e2e-tactics', 'e2e-takedown']],
      ['src/game/sectors.ts', ['e2e-gadgets', 'e2e-park', 'e2e-sectorops', 'e2e-tactics', 'e2e-takedown']],
      ['src/game/modes/sectorMode.ts', ['e2e-gadgets', 'e2e-park', 'e2e-section-rating', 'e2e-sectorops', 'e2e-tactics', 'e2e-takedown']],
      ['src/game/modes/gameMode.ts', ['e2e-gadgets', 'e2e-park', 'e2e-sectorops', 'e2e-tactics', 'e2e-takedown']],
      ['src/game/course/station.ts', ['e2e-course', 'e2e-ctcourse', 'e2e-gadgets', 'e2e-park', 'e2e-tactics', 'e2e-takedown']],
      ['src/world/doors.ts', ['e2e-anchors', 'e2e-levels']],
      ['src/ai/hearing.ts', ['e2e-guard-carry', 'e2e-sectorops:1', 'e2e-stealth-ai']],
      ['src/config/tools.ts', core],
      ['src/core/babylon.ts', core],
      ['src/brandnew/thing.ts', core],
      ['src/main.ts', core],
    ];
    for (const [f, suites] of rows) expect(select([f]), f).toEqual([...suites, 'smoke'].sort());
  });

  it('light, lamp and voxel files pick the bake suite, the desktop and the GPU darkness read-back', () => {
    for (const f of ['src/world/lights.ts', 'src/world/lightBake.ts', 'src/world/lampMath.ts', 'src/world/bakedLamps.ts', 'src/world/ambientGrid.ts', 'src/world/darkCurve.ts', 'src/voxel/lampBake.ts']) {
      expect(select([f]), f).toEqual(['e2e-darkness', 'e2e-desktop', 'e2e-lightbake', 'smoke']);
    }
  });

  it('src/net, the save shape and the mirrored camera count pick the co-op group', () => {
    for (const f of ['src/net/coopHost.ts', 'src/net/protocol.ts', 'src/net/coopUi.ts', 'src/save/schema.ts', 'src/save/migrations.ts', 'src/security/data.ts']) {
      expect(select([f]), f).toEqual(['e2e-coop', 'e2e-ctcourse', 'e2e-netmove', 'smoke']);
    }
    expect(select(['src/save/animTuneStore.ts'])).toEqual(['e2e-menus', 'e2e-studio', 'smoke']);
  });

  it('a suite script picks that suite, a helper what it serves, the runner and build files CORE', () => {
    expect(select(['scripts/e2e-takedown.mjs'])).toEqual(['e2e-takedown', 'smoke']);
    expect(select(['scripts\\e2e-wall.mjs'])).toEqual(['e2e-wall', 'smoke']);
    expect(select(['scripts/e2e-net-lib.mjs'])).toEqual(['anim-audit', 'e2e-netmove', 'smoke']);
    for (const f of ['scripts/e2e-lib.mjs', 'scripts/run-e2e.mjs', 'scripts/e2e-affected.mjs', 'scripts/e2e-verdict.mjs', 'package.json', 'package-lock.json', 'index.html', 'vite.config.ts', 'public/icon.png']) {
      expect(select([f]), f).toEqual(coreSet);
    }
  });

  it('section rating: the card, the rules, the record and the two modes that rate', () => {
    expect(select(['src/ui/hud/ratingCard.ts'])).toEqual(['e2e-section-rating', 'smoke']);
    expect(select(['src/game/rating/sectionRating.ts'])).toEqual(['e2e-section-rating', 'smoke']);
    expect(select(['src/save/ratingRecord.ts'])).toEqual(['e2e-section-rating', 'smoke']);
    expect(select(['src/game/modes/courseMode.ts'])).toContain('e2e-section-rating');
    expect(select(['src/game/modes/sectorMode.ts'])).toContain('e2e-section-rating');
  });

  it('Marlow Yard sets, the greybox helpers and the e2e-ctcourse step modules pick e2e-ctcourse', () => {
    for (const f of ['src/world/maps/ctcourseSets/a3OfficeRange.ts', 'src/world/maps/ctcourseSets/facility.ts', 'src/world/maps/ctcourseGreybox.ts', 'scripts/e2e-ctcourse/a1Gate.mjs', 'scripts\\e2e-ctcourse\\revive.mjs']) {
      expect(select([f]), f).toEqual(['e2e-ctcourse', 'smoke']);
    }
  });

  it('the smooth body and its effect recovery pick e2e-guard-carry', () => {
    for (const f of ['src/player/smoothBody.ts', 'src/player/smoothBodyMerge.ts', 'src/player/bodyEffectRecovery.ts']) expect(select([f]), f).toContain('e2e-guard-carry');
    expect(select(['src/player/controller.ts'])).not.toContain('e2e-guard-carry');
  });

  it('the legacy and GPU suites are reachable from the area that owns them', () => {
    const rows: [string, string][] = [
      ['src/progression/xp.ts', 'e2e-progression'],
      ['src/cosmetics/catalogue.ts', 'e2e-cosmetics'],
      ['src/game/modes/clearMode.ts', 'e2e-clear'],
      ['src/world/maps/bunkerDeep.ts', 'e2e-bunker'],
      ['src/game/missions.ts', 'e2e-missions'],
      ['src/game/modes/infiltrationMode.ts', 'e2e-missions'],
      ['src/game/modes/missionMode.ts', 'e2e-modes'],
      ['src/ai/archetypes.ts', 'e2e-enemies'],
      ['src/world/maps/warehouse.ts', 'e2e-ct-warehouse'],
      ['src/player/shoulderCamera.ts', 'e2e-camera-bounds'],
      ['src/config/camera.ts', 'e2e-camera-bounds'],
      ['src/world/lightBake.ts', 'e2e-darkness'],
      ['src/net/remoteAvatar.ts', 'e2e-coop-gpu'],
    ];
    for (const [f, s] of rows) {
      expect(select([f]), f).toContain(s);
      expect(select([f], wide), f).toContain(s);
    }
  });

  it('docs, markdown, changelog fragments and tests need no suites', () => {
    expect(select(['docs/ROADMAP.md', 'README.md', 'src/ai/notes.md', 'changes/feature-x.md', 'CHANGELOG.md', 'tests/e2eAffected.test.ts', 'scripts/e2e-times.json', '.github/workflows/ci.yml'])).toEqual([]);
    expect(select([])).toEqual([]);
  });

  it('a whole suite absorbs its parts; the result is sorted and unique', () => {
    const got = select(['src/ai/hearing.ts', 'src/game/sectors.ts', 'src/weapons/a.ts']);
    expect(got.filter((s) => s.startsWith('e2e-sectorops'))).toEqual(['e2e-sectorops']);
    expect(got).toEqual([...new Set(got)].sort());
  });
});

describe('--affected --wide: the cross-area readers', () => {
  it('is a superset of DIRECT on the two PRs', () => {
    for (const files of [OPTIC_CABLE, GUARD_CARRY_FIX]) {
      const w = select(files, wide);
      for (const s of select(files)) expect(w, s).toContain(s);
    }
    expect(jobs(select(OPTIC_CABLE, wide))).toBe(30); // e2e-ctcourse is 4 parts since marlow-final 0d
    expect(jobs(select(GUARD_CARRY_FIX, wide))).toBe(15);
  });

  it('keeps the cross-area rules', () => {
    expect(select(['src/weapons/playerWeapons.ts'], wide)).toEqual(expect.arrayContaining(['e2e-stealth-ai', 'e2e-sectorops:1', 'e2e-gadgets', 'e2e-clip']));
    expect(select(['src/ai/hearing.ts'], wide)).toEqual(expect.arrayContaining(['e2e-weapons-carry', 'e2e-takedown', 'e2e-coop', 'e2e-sectorops:6']));
    expect(select(['src/world/lights.ts'], wide)).toEqual(expect.arrayContaining(['e2e-stealth-ai', 'e2e-security', 'e2e-darkness', 'e2e-levels']));
    expect(select(['src/save/schema.ts'], wide)).toEqual(expect.arrayContaining(['e2e-coop', 'e2e-park', 'e2e-offline']));
  });

  it('section rating and Marlow Yard: the cross-area readers', () => {
    expect(select(['src/game/rating/sectionRating.ts'], wide)).toEqual(['e2e-course', 'e2e-section-rating', 'e2e-sectorops', 'smoke']);
    expect(select(['src/save/ratingRecord.ts'], wide)).toEqual(['e2e-menus', 'e2e-section-rating', 'e2e-sectorops', 'smoke']);
    expect(select(['src/ui/hud/ratingCard.ts'], wide)).toEqual(['e2e-section-rating', 'smoke']);
    for (const f of ['src/world/maps/ctcourseSets/a5Substation.ts', 'src/world/maps/ctcourseGreybox.ts', 'src/world/maps/ctcourse.ts']) {
      expect(select([f], wide), f).toEqual(['e2e-ctcourse', 'e2e-section-rating', 'smoke']);
    }
    expect(select(['scripts/e2e-ctcourse/a1Gate.mjs'], wide)).toEqual(['e2e-ctcourse', 'smoke']);
    expect(select(['src/player/smoothBody.ts'], wide)).toContain('e2e-guard-carry');
  });

  it('the first matching prefix wins', () => {
    expect(forFile('src/net/coopUi.ts', wide)).toEqual(wide['src/net/coopUi']);
    expect(forFile('src/ui/tuner/tunerMouse.ts', wide)).toEqual(wide['src/ui/tuner']);
    expect(forFile('src/game/modes/courseMode.ts')).toEqual(direct['src/game/modes/courseMode.ts']);
  });
});

describe('affected requests skip GPU and legacy suites (testing-tools: GPU never, legacy REPORT ONLY)', () => {
  const gate = affectedGateSuites as (s: string[]) => string[];
  it('drops every GPU-only and LEGACY suite, whole or as a part, and keeps the rest in order', () => {
    // PR #400's affected request (2026-10-25) named these beside the required suites
    const req = ['anim-audit', 'e2e-anchors', 'e2e-bunker', 'e2e-camera-bounds', 'e2e-coop-gpu', 'e2e-darkness', 'e2e-desktop', 'e2e-lightbake', 'e2e-security', 'smoke'];
    expect(gate(req)).toEqual(['anim-audit', 'e2e-anchors', 'e2e-desktop', 'e2e-lightbake', 'smoke']);
    expect(gate(['e2e-desktop:3', 'e2e-desktop:1', 'e2e-wall:flanker', 'e2e-wall', 'e2e-bunker:1'])).toEqual(['e2e-desktop:1', 'e2e-wall']);
    for (const s of [...(LEGACY as string[]), ...(GPU as string[])]) expect(gate([s, 'smoke']), s).toEqual(['smoke']);
    expect(gate([])).toEqual([]);
  });
  it('the lamp files no longer gate an affected request on e2e-darkness (GPU) or e2e-security (legacy)', () => {
    const picked = select(['src/world/lightBake.ts'], wide);
    expect(picked).toEqual(expect.arrayContaining(['e2e-darkness']));
    const got = gate(picked);
    expect(got).not.toContain('e2e-darkness');
    expect(got).not.toContain('e2e-security');
    expect(got).toContain('e2e-lightbake');
  });
});

describe('laptop-queue lib affectedSuites applies the gate (the service affected pass and request.mjs --affected)', () => {
  it('a Fallow / lamp change requests no legacy or GPU suite', async () => {
    // @ts-expect-error plain .mjs process script without types
    const { affectedSuites } = await import('../scripts/laptop-queue/lib.mjs');
    const run = (files: string) => (args: string[]) => (args[0] === 'merge-base' ? 'b'.repeat(40) : files);
    const got = affectedSuites(run('src/world/maps/bunker.ts\nsrc/world/lightBake.ts\n'), 'a'.repeat(40), { wide: true });
    expect(got.suites).toContain('smoke');
    expect(got.suites).toContain('e2e-lightbake');
    for (const s of ['e2e-bunker', 'e2e-darkness', 'e2e-security', 'e2e-coop-gpu']) expect(got.suites).not.toContain(s);
  });
});

describe('J20', () => {
  const protocol = readFileSync(new URL('../src/net/protocol.ts', import.meta.url), 'utf8');
  it('wire files pull the co-op group', () => {
    for (const f of ['src/player/moveState.ts', 'src/game/sectors.ts', 'src/weapons/weaponDefs.ts', 'src/world/lampSway.ts', 'src/anim/motion.ts']) {
      const got = wireSuites(['smoke'], [f], protocol);
      for (const s of ['e2e-coop', 'e2e-netmove', 'e2e-ctcourse']) expect(got, `${f} ${s}`).toContain(s);
    }
  });
  it('non-wire files and an empty protocol add nothing', () => {
    expect(wireSuites(['smoke'], ['src/world/other.ts'], protocol)).toEqual(['smoke']);
    expect(wireSuites(['smoke'], ['src/player/moveState.ts'], '')).toEqual(['smoke']);
  });
  it('a whole suite absorbs its parts', () => {
    expect(wireSuites(['e2e-coop:1', 'smoke'], ['src/anim/motion.ts'], protocol)).not.toContain('e2e-coop:1');
  });
  it('campus map files pull the campus suite', () => {
    for (const f of ['src/world/maps/campusS4.ts', 'src/world/maps/campusBake.ts']) {
      const got = select([f]);
      for (const s of ['e2e-sectorops:6', 'e2e-levels', 'e2e-anchors']) expect(got, `${f} ${s}`).toContain(s);
    }
    expect(forFile('src/world/maps/campusS4.ts', wide)).toContain('e2e-sectorops');
  });
  it('the gate drops audio, the report list keeps LEGACY and AUDIO only', () => {
    const gate = affectedGateSuites(['e2e-foley', 'e2e-coop']) as string[];
    expect(gate).toEqual(['e2e-coop']);
    expect(reportSuites(['smoke', 'e2e-security', 'e2e-foley', 'e2e-darkness', 'e2e-wall:flanker'])).toEqual(['e2e-security', 'e2e-foley', 'e2e-wall:flanker']);
  });
});
