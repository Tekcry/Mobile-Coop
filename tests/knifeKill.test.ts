// (piano-knife S1) The knife kill's pure parts: the gate over every map (BRIEF A1), the row pick (A3), the rows (A15,
// the bible's 1.0-1.5 s takedown, clips that exist), the buckle's shape and the menu row with the switch on (A2).
import { describe, expect, it } from 'vitest';
import { DEV_MAPS, MAPS } from '../src/world/maps';
import { buckleAt, KNIFE, KNIFE_KILL_IDS, KNIFE_KILLS, knifeSceneOn, PIANO_MAP_ID, PIANO_SCENE, pickKnifeKill, takedownRow } from '../src/game/knifeKill';
import { MOCAP_SOURCES } from '../src/anim/mocapSources';
import type { TakedownKind } from '../src/game/takedown';

const KINDS: readonly TakedownKind[] = ['behind', 'front', 'side', 'overCover', 'corner', 'above', 'below', 'window', 'drop', 'inverted', 'hangDown', 'assist'];

describe('piano-knife S1: the gate', () => {
  it('true only on a piano-scene map with the flag on and the switch live', () => {
    const maps: { id: string; scene?: string }[] = [...MAPS, ...DEV_MAPS].map((m) => ({ id: m.id, scene: (m as { scene?: string }).scene }));
    maps.push({ id: PIANO_MAP_ID, scene: PIANO_SCENE });
    expect(maps.length).toBeGreaterThan(2);
    for (const m of maps) {
      for (const flag of [false, true]) {
        for (const live of [false, true]) {
          expect(knifeSceneOn(flag, m.scene, live), `${m.id} flag ${flag} live ${live}`).toBe(flag && live && m.scene === 'piano');
        }
      }
    }
    expect(knifeSceneOn(true, undefined, true)).toBe(false);
  });
});

describe('piano-knife S1: the rows', () => {
  it('pickKnifeKill over every kind, crouched or not', () => {
    const want: Partial<Record<TakedownKind, [number, number]>> = { behind: [0, 1], corner: [2, 2], overCover: [2, 2], front: [3, 3], side: [3, 3] };
    for (const k of KINDS) {
      const w = want[k] ?? [-1, -1];
      expect([pickKnifeKill(k, false), pickKnifeKill(k, true)], k).toEqual(w);
    }
  });

  it('every row: 1.0-1.5 s, 0 < contact < limp < 1, both clips are mocapSources keys; at most 8 ids', () => {
    expect(KNIFE_KILL_IDS.length).toBeLessThanOrEqual(8);
    expect(KNIFE_KILLS.length).toBe(KNIFE_KILL_IDS.length);
    const keys = new Set(Object.keys(MOCAP_SOURCES));
    KNIFE_KILLS.forEach((r, i) => {
      expect(r.id).toBe(KNIFE_KILL_IDS[i]);
      expect(r.seconds).toBeGreaterThanOrEqual(1.0);
      expect(r.seconds).toBeLessThanOrEqual(1.5);
      expect(r.contact).toBeGreaterThan(0);
      expect(r.limp).toBeGreaterThan(r.contact);
      expect(r.limp).toBeLessThan(1);
      expect(keys.has(r.attacker), r.attacker).toBe(true);
      expect(keys.has(r.victim), r.victim).toBe(true);
    });
    expect(KNIFE.noise).toBe(1.2);
  });

  it('buckleAt: 0 before contact, never past 1, back to 0 after rise + decay', () => {
    expect(buckleAt(-0.01)).toBe(0);
    expect(buckleAt(-1)).toBe(0);
    expect(buckleAt(0)).toBe(0);
    let top = 0;
    for (let t = 0; t <= 1; t += 0.005) {
      const b = buckleAt(t);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
      top = Math.max(top, b);
    }
    expect(top).toBeCloseTo(1, 3);
    expect(buckleAt(KNIFE.buckleRise + KNIFE.buckleDecay)).toBe(0);
    expect(buckleAt(KNIFE.buckleRise + KNIFE.buckleDecay + 0.5)).toBe(0);
  });

  it('the menu row: the grab from behind with the switch off, never with it on', () => {
    expect(takedownRow('behind', false, false)).toBe('grab');
    expect(takedownRow('behind', true, false)).toBe('ko');
    for (const k of KINDS) expect(takedownRow(k, false, true), k).toBe('ko');
  });
});
