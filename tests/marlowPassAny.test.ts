/**
 * (marlow-final N1) The one-player pass zone (`PassZone.any`): one player inside sets its course flag (a "B east of
 * x 140" step), where a plain zone still needs both. A stand-in match (as tests/laserPanels.test.ts).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { passZoneNeed, type PassZone } from '../src/game/passZones';
import type { CtDevices as CtDevicesT } from '../src/game/ctDevices';

interface Ref {
  id: string;
  feet: Vector3;
  crouched: boolean;
  speed: number;
  light: number;
  target: { alive: boolean; health: { hp: number }; applyDamage: () => void; aimPoint: (o: Vector3) => Vector3 };
}

const ref = (id: string, x: number, y: number, z: number): Ref => ({
  id,
  feet: new Vector3(x, y, z),
  crouched: false,
  speed: 0,
  light: 1,
  target: { alive: true, health: { hp: 100 }, applyDamage: () => undefined, aimPoint: (o) => o },
});

/** A8's "B east of x 140" (any) and "both in the vault lobby" (plain) zones. */
const BEAMS: PassZone = { id: 'p-a8-beams', box: [140, 56, 146, 68], flag: 'a8-beams', any: true };
const LOBBY: PassZone = { id: 'p-a8-lobby', box: [134, 56, 146, 68], flag: 'a8-lobby' };
const GALLERY: PassZone = { id: 'p-a8-gallery', box: [106, 75, 134, 78], flag: 'a8-gallery', floorY: 4.4, any: true };

describe('(N1) passZoneNeed', () => {
  it('any: one player; plain: every player, at least 2; the dev solo flag: one', () => {
    expect(passZoneNeed(true, 2, false)).toBe(1);
    expect(passZoneNeed(true, 1, false)).toBe(1);
    expect(passZoneNeed(undefined, 2, false)).toBe(2);
    expect(passZoneNeed(false, 1, false)).toBe(2);
    expect(passZoneNeed(undefined, 1, true)).toBe(1);
  });
  // (marlow-final 0d) "Marlow's station 3 zone stays a both-players zone" pinned the retired bunker bay; A3's corridor
  // zone (`PassZone.hall`, both players) returns in tests/ctcourse/a3OfficeRange.test.ts
});

describe('(N1) CtDevices: PassZone.any', () => {
  let CtDevices: typeof CtDevicesT;
  beforeAll(async () => {
    (globalThis as unknown as { window: unknown }).window ??= globalThis;
    const gd = globalThis as unknown as { document?: unknown };
    gd.document ??= { createElement: () => ({ className: '', textContent: '', style: { cssText: '', display: '' }, remove: () => undefined }) };
    ({ CtDevices } = await import('../src/game/ctDevices'));
  });
  afterAll(() => {
    delete (globalThis as unknown as { __ctdev?: unknown }).__ctdev;
  });

  const make = (refs: Ref[], solo = false) => {
    const flags = new Set<string>();
    const g = {
      world: { layout: { passZones: [BEAMS, LOBBY, GALLERY] }, level: { lights: { lights: [], setOn: () => undefined } }, parts: { instance: () => null }, lightField: { totalAt: () => 1 } },
      scene: {},
      security: null,
      ballistics: { hitDistance: (a: Vector3, b: Vector3) => Vector3.Distance(a, b) },
      app: { quality: { level: { minimal: false } } },
      vision: { night: 0, kind: 0 },
      hud: { banner: () => undefined, el: { appendChild: () => undefined } },
      playerRefs: () => refs,
      playerRefsInto: (out: unknown[]) => {
        out.length = 0;
        for (const r of refs) out.push(r);
        return out;
      },
      weapons: { slots: [] },
    };
    const d = new CtDevices(g as never, 'host', { say: () => undefined, record: () => undefined, dirty: () => undefined, flag: (f) => flags.add(f), has: (f) => flags.has(f), solo: () => solo });
    return { d, flags };
  };

  it('one of two players past x 140 sets the any flag; the plain lobby zone waits for both', () => {
    // A in the hall (west of the grille at x 134), B on the hall floor too
    const a = ref('host', 130, 0, 62);
    const b = ref('cli', 120, 0, 60);
    const { d, flags } = make([a, b]);
    d.fixedUpdate(1 / 60);
    expect(flags.size).toBe(0);
    // B over the beams (east of x 140): the any zone; the lobby zone has only B
    b.feet.set(142, 0, 62);
    d.fixedUpdate(1 / 60);
    expect([...flags]).toEqual(['a8-beams']);
    // A also in the lobby (west of the beams): both in the plain zone now
    b.feet.set(141, 0, 62);
    a.feet.set(136, 0, 60);
    d.fixedUpdate(1 / 60);
    expect([...flags].sort()).toEqual(['a8-beams', 'a8-lobby']);
    d.dispose();
  });

  it('an any zone checks its floor (the gallery at 4.4); a dead player does not count', () => {
    const a = ref('host', 110, 0, 76);
    const b = ref('cli', 100, 0, 60);
    const { d, flags } = make([a, b]);
    d.fixedUpdate(1 / 60);
    expect(flags.has('a8-gallery')).toBe(false);
    a.feet.y = 4.4;
    a.target.alive = false;
    d.fixedUpdate(1 / 60);
    expect(flags.has('a8-gallery')).toBe(false);
    a.target.alive = true;
    d.fixedUpdate(1 / 60);
    expect(flags.has('a8-gallery')).toBe(true);
    d.dispose();
  });

  it('a bay restart that clears the flag re-arms the any zone', () => {
    const b = ref('cli', 142, 0, 62);
    const { d, flags } = make([ref('host', 100, 0, 60), b]);
    d.fixedUpdate(1 / 60);
    expect(flags.has('a8-beams')).toBe(true);
    flags.delete('a8-beams');
    b.feet.set(120, 0, 60);
    d.fixedUpdate(1 / 60);
    expect(flags.has('a8-beams')).toBe(false);
    b.feet.set(142, 0, 62);
    d.fixedUpdate(1 / 60);
    expect(flags.has('a8-beams')).toBe(true);
    d.dispose();
  });
});
