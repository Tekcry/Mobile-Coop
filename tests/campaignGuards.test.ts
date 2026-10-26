/**
 * The campaign guard check (mission-rules R3, G155 / G298): `checkSectors(..., 'campaign')` rejects a dog, a heavy and a
 * section that allows dogs; Sector Ops (the default mode) still allows a handled dog; every campaign map and every campaign
 * mission spawns no quadruped and no heavy.
 */
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../src/ai/enemyDefs';
import { missionSpawnsGuard } from '../src/game/mission/missionDef';
import { checkSectors, type SectorDef, type SectorGuard } from '../src/game/sectors';
import { MAPS } from '../src/world/maps';
import { WHARF_SECTORS } from '../src/world/maps/tallowWharfSectors';

const W3 = WHARF_SECTORS[2]!;

/** A guard of the W3 yard retyped as `kind` (a dog needs the handler index). */
function withKind(g: SectorGuard, kind: SectorGuard['kind'], handler?: number): SectorGuard {
  const out: SectorGuard = { ...g, kind };
  if (handler !== undefined) out.handler = handler;
  return out;
}

/** W3 with its guard 1 swapped for `g`. */
function w3With(g: SectorGuard, extra: Partial<SectorDef> = {}): SectorDef {
  return { ...W3, guards: W3.guards.map((q, k) => (k === 1 ? g : q)), ...extra };
}

describe('campaign guard check', () => {
  const dog = withKind(W3.guards[1]!, 'dog', 0);

  it('the wharf sections are clean in both modes', () => {
    expect(checkSectors(WHARF_SECTORS)).toEqual([]);
    expect(checkSectors(WHARF_SECTORS, undefined, undefined, 'campaign')).toEqual([]);
  });

  it('campaign mode rejects a dog with a handler', () => {
    const errs = checkSectors(WHARF_SECTORS.map((d) => (d.id === 'W3' ? w3With(dog, { dogs: 1 }) : d)), undefined, undefined, 'campaign');
    expect(errs).toContain('W3: guard 1 is a dog (G155: no dogs in the campaign)');
    expect(errs).toContain('W3: dogs 1 in a campaign section (G155)');
  });

  it('campaign mode rejects a dog even when the section allows none', () => {
    const errs = checkSectors(WHARF_SECTORS.map((d) => (d.id === 'W3' ? w3With(dog, { dogs: 0 }) : d)), undefined, undefined, 'campaign');
    expect(errs).toContain('W3: guard 1 is a dog (G155: no dogs in the campaign)');
  });

  it('campaign mode rejects dogs > 0 with no dog in the list', () => {
    const errs = checkSectors(WHARF_SECTORS.map((d) => (d.id === 'W3' ? { ...d, dogs: 1 } : d)), undefined, undefined, 'campaign');
    expect(errs).toEqual(['W3: dogs 1 in a campaign section (G155)']);
  });

  it('a heavy is an error in both modes', () => {
    const heavy = withKind(W3.guards[1]!, 'heavy');
    const defs = WHARF_SECTORS.map((d) => (d.id === 'W3' ? w3With(heavy) : d));
    expect(checkSectors(defs)).toContain('W3: guard 1 is a heavy (G155)');
    expect(checkSectors(defs, undefined, undefined, 'campaign')).toContain('W3: guard 1 is a heavy (G155)');
  });

  it('sector mode still allows a handled dog with dogs 1', () => {
    const defs = WHARF_SECTORS.map((d) => (d.id === 'W3' ? w3With(dog, { dogs: 1 }) : d));
    expect(checkSectors(defs)).toEqual([]);
    expect(checkSectors(defs, undefined, undefined, 'sector')).toEqual([]);
  });
});

describe('campaign maps and missions', () => {
  const campaignMaps = MAPS.filter((m) => (m.missions?.length ?? 0) > 0 && m.missions!.every((q) => q.mode === 'campaign'));

  it('there is at least one campaign map', () => {
    expect(campaignMaps.map((m) => m.id)).toContain('tallowWharf');
  });

  for (const m of campaignMaps) {
    it(`${m.id}: the campaign check passes`, () => {
      expect(checkSectors(m.sectors!, undefined, undefined, 'campaign')).toEqual([]);
    });
  }

  for (const m of MAPS) {
    for (const mission of m.missions ?? []) {
      if (mission.mode !== 'campaign') continue;
      it(`${m.id} / ${mission.id}: every guard it spawns is armed and human, never a dog or a heavy`, () => {
        let spawned = 0;
        for (const d of m.sectors ?? []) {
          d.guards.forEach((g, k) => {
            if (!missionSpawnsGuard(mission, `${d.id}:${k}`)) return;
            spawned++;
            expect(ENEMIES[g.kind].quadruped, `${d.id}:${k}`).toBeFalsy();
            expect(g.kind, `${d.id}:${k}`).not.toBe('heavy');
          });
        }
        expect(spawned).toBeGreaterThan(0);
      });
    }
  }
});
