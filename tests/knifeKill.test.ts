// (piano-knife S1, S2; knife-kills) The knife kill's pure parts: no gate (every map's lethal takedown, the clips at match
// start), the row pick (A3), the rows (A15, the bible's 1.0-1.5 s takedown, clips that exist), the buckle's shape and the
// menu row.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import * as knifeKill from '../src/game/knifeKill';
import { attackerPhase, buckleAt, KNIFE, KNIFE_KILL_IDS, KNIFE_KILLS, knifeClip, knifeClipsReady, loadKnifeClips, pickKnifeKill, resetKnifeClipsForTest, takedownRow } from '../src/game/knifeKill';
import { MOCAP_SOURCES } from '../src/anim/mocapSources';
import type { TakedownKind } from '../src/game/takedown';

const KINDS: readonly TakedownKind[] = ['behind', 'front', 'side', 'overCover', 'corner', 'above', 'below', 'window', 'drop', 'inverted', 'hangDown', 'assist'];

describe('knife-kills: no gate', () => {
  it('no scene gate or switch; the clips load at match start on any map', () => {
    for (const gone of ['knifeSceneOn', 'PIANO_SCENE', 'PIANO_MAP_ID']) expect(gone in knifeKill, gone).toBe(false);
    const td = fs.readFileSync('src/game/takedownController.ts', 'utf8');
    expect(td).not.toMatch(/setKnifeScene|\bknife = false/);
    const gs = fs.readFileSync('src/game/gameState.ts', 'utf8');
    expect(gs).toContain('this.takedown = new TakedownController(this);');
    expect(gs).toContain('void loadKnifeClips();');
    expect(gs).not.toMatch(/takedown\.knife\b|knifeAttack/);
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

  it('(S2) the real pairs: S2 clip names, the brief timing ranges, the attacker window inside his clip', () => {
    const S2_ATT = ['mocap_stabbing', 'mocap_standing_melee_attack_downward'];
    const S2_VIC = ['mocap_falling_forward_death', 'mocap_dying', 'mocap_falling_back_death'];
    const want: Record<string, [string, string]> = {
      behind: ['mocap_stabbing', 'mocap_falling_forward_death'],
      behindLow: ['mocap_stabbing', 'mocap_dying'],
      corner: ['mocap_standing_melee_attack_downward', 'mocap_falling_back_death'],
      front: ['mocap_stabbing', 'mocap_dying'],
    };
    for (const r of KNIFE_KILLS) {
      expect([r.attacker, r.victim], r.id).toEqual(want[r.id]);
      expect(S2_ATT).toContain(r.attacker);
      expect(S2_VIC).toContain(r.victim);
      for (const c of [r.attacker, r.victim]) expect(c).not.toMatch(/cross_punch|crouch_to_stand|rifle_death/);
      expect(r.seconds).toBeGreaterThanOrEqual(1.0);
      expect(r.seconds).toBeLessThanOrEqual(1.5);
      expect(r.contact).toBeGreaterThanOrEqual(0.35);
      expect(r.contact).toBeLessThanOrEqual(0.55);
      expect(r.limp).toBeGreaterThan(r.contact);
      expect(r.limp).toBeLessThanOrEqual(0.9);
      expect(r.victimFrom).toBeGreaterThanOrEqual(0);
      expect(r.victimTo).toBeGreaterThan(r.victimFrom);
      expect(r.victimTo).toBeLessThanOrEqual(1);
      expect(r.attackerFrom).toBeGreaterThanOrEqual(0);
      expect(r.attackerTo).toBeGreaterThan(r.attackerFrom);
      expect(r.attackerTo).toBeLessThanOrEqual(1);
      // the window from its start to its end over the move, on at the same speed past it
      expect(attackerPhase(r, 0)).toBe(r.attackerFrom);
      expect(attackerPhase(r, 1)).toBeCloseTo(r.attackerTo, 12);
      expect(attackerPhase(r, 1.1) - attackerPhase(r, 1)).toBeCloseTo(0.1 * (r.attackerTo - r.attackerFrom), 12);
    }
  });

  it('(S2) loadKnifeClips: every row ready, each clip its row clip; no static import of a clip module in knifeKill.ts', async () => {
    resetKnifeClipsForTest();
    expect(knifeClip(0, false)).toBeNull();
    await loadKnifeClips();
    expect(knifeClipsReady()).toBe(true);
    KNIFE_KILLS.forEach((r, k) => {
      expect(knifeClip(k, false)?.name, r.id).toBe(r.attacker);
      expect(knifeClip(k, true)?.name, r.id).toBe(r.victim);
    });
    const src = fs.readFileSync('src/game/knifeKill.ts', 'utf8');
    expect(src).not.toMatch(/^import\s[^;]*clips\//m);
    expect(src).toContain("import('../anim/clips/mixamo/piano/stabbing')");
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

  it('the menu row: the grab from behind on a guard on two legs (the knife kill never replaces it)', () => {
    expect(takedownRow('behind', false)).toBe('grab');
    expect(takedownRow('hangDown', false)).toBe('grab');
    expect(takedownRow('behind', true)).toBe('ko');
    for (const k of KINDS) if (k !== 'behind' && k !== 'hangDown') expect(takedownRow(k, false), k).toBe('ko');
  });
});
