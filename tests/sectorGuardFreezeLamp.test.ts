// (guard-render S10) The freeze's lamp rule: a shadowing spot / point lamp keeps a guard drawn only when his own shadow
// volume from it (the cone his caster sphere throws away from the lamp, out to its reach; none outside a spot's cone)
// meets the frustum, and then the occlusion rays decide where that shadow lands, as for the moon.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { Enemy } from '../src/ai/enemy';
import {
  FREEZE_BODY_IN,
  FREEZE_DRAW,
  FREEZE_LAMP_BIT0,
  FREEZE_LAMP_IN,
  FREEZE_MAX_LAMP_SHADOWS,
  FREEZE_SHADOW_IN,
  FreezeLights,
  guardFrozen,
  guardFrustum,
  lampLanding,
  lampProbe,
  sphereOutside,
} from '../src/game/sectorGuardFreeze';

/** A frustum from (0, 1.6, 0) looking down +z: 45 deg half-angles, near 0.1, far 100 (planes point inwards). */
function frustum(): Float64Array {
  const s = Math.SQRT1_2;
  return new Float64Array([s, 0, s, 0, -s, 0, s, 0, 0, s, s, -1.6 * s, 0, -s, s, 1.6 * s, 0, 0, 1, -0.1, 0, 0, -1, 100]);
}
const PL = frustum();
const H = 1.8;
const at = (L: FreezeLights, x: number, z: number): number => guardFrustum(PL, x, 0, z, H, 0, 1.6, 0, L);

describe('guard-render S10: lamp shadow volume vs the frustum', () => {
  it('a lamp behind the camera whose sphere is in view but whose shadow of him runs away from the view: frozen', () => {
    const L = new FreezeLights();
    L.addSpot(0, 3, -4, 8);
    // (the old rule drew him: the lamp's 8 m sphere reaches into the view)
    expect(sphereOutside(PL, 0, 3, -4, 8)).toBe(false);
    expect(at(L, 0, -8)).toBe(0);
    expect(guardFrozen(PL, 0, 0, -8, H, 0, 1.6, 0, L)).toBe(true);
    // a spot straight down on him behind the camera: its cone misses the view
    const S = new FreezeLights();
    S.addSpot(0, 4, -10, 12, 0, -1, 0, 0.6);
    expect(sphereOutside(PL, 0, 4, -10, 12)).toBe(false);
    expect(at(S, 0, -10)).toBe(0);
  });

  it('a lamp behind him throwing his shadow into the view: the lamp bit, so drawn (or the occlusion rays decide)', () => {
    const L = new FreezeLights();
    L.addSpot(0, 1, -12, 20);
    expect(at(L, 0, -6)).toBe(FREEZE_LAMP_IN | FREEZE_LAMP_BIT0);
    expect(guardFrozen(PL, 0, 0, -6, H, 0, 1.6, 0, L)).toBe(false);
    // the second lamp of the list gets its own bit
    const M = new FreezeLights();
    M.addSpot(500, 0, 500, 1);
    M.addSpot(0, 1, -12, 20);
    expect(at(M, 0, -6)).toBe(FREEZE_LAMP_IN | (FREEZE_LAMP_BIT0 << 1));
    // out of the lamp's reach: no shadow from it
    const F = new FreezeLights();
    F.addSpot(0, 1, -40, 20);
    expect(at(F, 0, -6)).toBe(0);
  });

  it('outside a spot cone: no shadow from that lamp; inside it: his shadow counts', () => {
    const away = new FreezeLights();
    away.addSpot(0, 1, -12, 20, 0, 0, -1, 0.5);
    expect(at(away, 0, -6)).toBe(0);
    const toward = new FreezeLights();
    toward.addSpot(0, 1, -12, 20, 0, 0, 1, 0.5);
    expect(at(toward, 0, -6)).toBe(FREEZE_LAMP_IN | FREEZE_LAMP_BIT0);
    // just off the cone's rim (his caster sphere clear of it): none
    const rim = new FreezeLights();
    rim.addSpot(-8, 1, -6, 20, 0, 0, 1, 0.3);
    expect(at(rim, 0, -6)).toBe(0);
  });

  it('a guard whose body is in view is always drawn, whatever the lamps', () => {
    const L = new FreezeLights();
    L.addSpot(0, 3, -4, 8);
    L.addSpot(0, 4, 30, 12, 0, 0, 1, 0.4);
    expect(at(L, 0, 20) & FREEZE_BODY_IN).toBe(FREEZE_BODY_IN);
    expect(guardFrozen(PL, 0, 0, 20, H, 0, 1.6, 0, L)).toBe(false);
  });

  it('a lamp at his body, an unbounded lamp in reach, or more lamp shadows than the cap: drawn', () => {
    const at0 = new FreezeLights();
    at0.addSpot(0, 1.2, -6.3, 20);
    expect(at(at0, 0, -6)).toBe(FREEZE_DRAW);
    const U = new FreezeLights();
    U.addSpot(0, 3, -40, Infinity);
    expect(at(U, 0, -38)).toBe(FREEZE_DRAW);
    const many = new FreezeLights();
    for (let i = 0; i <= FREEZE_MAX_LAMP_SHADOWS; i++) many.addSpot(i * 0.3, 1, -12, 20);
    expect(at(many, 0, -6)).toBe(FREEZE_DRAW);
  });

  it('the moon rule is unchanged (and lamps out of reach do not touch it)', () => {
    const L = new FreezeLights();
    L.addSpot(500, 0, 500, 1);
    L.sun = true;
    L.sx = 0;
    L.sy = -0.3;
    L.sz = Math.sqrt(1 - 0.09);
    expect(at(L, 0, -6)).toBe(FREEZE_SHADOW_IN);
    expect(at(L, 0, 20)).toBe(FREEZE_BODY_IN | FREEZE_SHADOW_IN);
    L.sz = -Math.sqrt(1 - 0.09);
    expect(at(L, 0, -6)).toBe(0);
  });
});

describe('guard-render S10: lamp shadow probes', () => {
  it('a probe from his head runs away from the lamp to its reach; a hit before the end is a landing, backed 0.2 m', () => {
    const L = new FreezeLights();
    L.addSpot(0, 1.8, -10, 20);
    const pr = new Float64Array(9);
    expect(lampProbe(pr, 0, 0, -6, H, 1, L, 0)).toBe(true);
    expect([pr[0], pr[1], pr[2]]).toEqual([0, 1.8, -6]);
    expect(pr[3]).toBeCloseTo(0, 9);
    expect(pr[4]).toBeCloseTo(1.8, 9);
    expect(pr[5]).toBeCloseTo(10, 9);
    // a wall 10 m on (z = 4)
    expect(lampLanding(pr, 10)).toBe(true);
    expect(pr[8]).toBeCloseTo(3.8, 9);
    // nothing hit within the reach: no landing
    expect(lampLanding(pr, 16)).toBe(false);
    // a point past the reach casts no shadow
    expect(lampProbe(pr, 0, 0, -40, H, 1, L, 0)).toBe(false);
  });
});

describe('guard-render S10: SectorGuardFreeze with a lamp (NullEngine, fake walls)', () => {
  it('his lamp shadow lands in view: drawn; a panel hides the landings from the camera: frozen by occlusion', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const B = await import('../src/core/babylon');
    const { PartLibrary } = await import('../src/world/partLibrary');
    const { CharacterRig } = await import('../src/player/characterRig');
    const { ENEMIES } = await import('../src/ai/enemyDefs');
    const { SectorGuardFreeze } = await import('../src/game/sectorGuardFreezeView');
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const scene = new B.Scene(new NullEngine());
    const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, 0), scene);
    cam.setTarget(new B.Vector3(0, 1.6, 10));
    const lib = new PartLibrary(scene);
    const def = ENEMIES.grunt;
    const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, 'g', { build: def.build, armor: def.plated, merge: true });
    rig.root.position.set(0, 0, -6);
    const e = { alive: true, taken: false, dog: null, def, bodyRig: rig, thawPose: vi.fn() } as unknown as Enemy;
    // a low lamp behind him aimed at the view: his shadow runs along +z onto a wall at z = 5
    const lamp = new B.SpotLight('lamp', new B.Vector3(0, 1, -20), new B.Vector3(0, 0, 1), 1.2, 1, scene);
    lamp.shadowMaxZ = 30;
    new B.ShadowGenerator(256, lamp);
    // the wall across z = 5 (everything stops on it) and, when `panel`, a panel across z = 3 between y 0.95 and 2.2
    // (his probes pass over and under it, the camera's rays to the landings on the wall do not)
    let panel = false;
    const hit = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, pz: number, y0: number, y1: number): number => {
      if ((a.z - pz) * (b.z - pz) >= 0) return 1;
      const t = (pz - a.z) / (b.z - a.z);
      const y = a.y + (b.y - a.y) * t;
      return y >= y0 && y <= y1 ? t : 1;
    };
    const ray = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => {
      const full = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
      let t = hit(a, b, 5, -100, 100);
      if (panel) t = Math.min(t, hit(a, b, 3, 0.95, 2.2));
      return full * t;
    };
    const f = new SectorGuardFreeze(scene, { enemies: [e] }, ray);
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(true);
    panel = true;
    // a hidden verdict needs a re-test: the seen one holds HOLD evaluations
    for (let k = 0; k < 40; k++) scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    expect(f.occluded).toBe(1);
    // the lamp off: frozen by the frustum alone
    lamp.intensity = 0;
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    expect(f.occluded).toBe(0);
    f.dispose();
    expect(rig.root.isEnabled(false)).toBe(true);
  });
});

describe('guard-render S10: no allocation in the per-guard paths (structure)', () => {
  const body = (src: string, head: string): string => {
    const i = src.indexOf(head);
    expect(i).toBeGreaterThanOrEqual(0);
    // (the closing brace at the head's indent; the checkout may have CRLF line ends)
    const m = (head.startsWith('  ') ? /\r?\n {2}\}\r?\n/ : /\r?\n\}\r?\n/).exec(src.slice(i));
    expect(m).not.toBeNull();
    return src.slice(i, i + m!.index);
  };
  const ALLOC = /\bnew\s|=>|\[\s*\]|\{\s*\}|\.(map|filter|forEach|slice|concat|push)\(|\bfor\s*\([^)]*\bof\b/;
  it('guardFrustum, lampProbe, lampLanding and the view occlusion test make no closures, arrays or objects', () => {
    const pure = readFileSync('src/game/sectorGuardFreeze.ts', 'utf8');
    for (const h of ['export function guardFrustum(', 'export function lampProbe(', 'export function lampLanding(']) expect(body(pure, h)).not.toMatch(ALLOC);
    const view = readFileSync('src/game/sectorGuardFreezeView.ts', 'utf8');
    const occ = body(view, '  private occluded3(');
    expect(occ).toContain('lampProbe(');
    expect(occ).not.toMatch(ALLOC);
  });
});
