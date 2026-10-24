// (rig-pose-fix, train 54 e2e-course) `PlayerWeapons.resolveHit` took a required `from` (S2: the round's origin is the
// hit's `sourcePos`); e2e-course's friendly-fire step calls the real hit path as `resolveHit(h, dir, dist, slot)` and
// crashed on `from.clone()` ("Cannot read properties of undefined (reading 'clone')"). Without `from` the source is now
// the sim shot origin along the shot (`shotPoint` -> `shotOrigin`), never undefined and never the rig; a given `from`
// is copied as before.
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { PlayerWeapons } from '../src/weapons/playerWeapons';
import { WEAPONS } from '../src/weapons/weaponDefs';
import { computeStats } from '../src/weapons/weaponStats';
import { emptyShotPose, shotOrigin } from '../src/weapons/shotOrigin';
import { HandSwitch } from '../src/player/handSwitch';
import type { HitInfo } from '../src/game/damage';

type Resolve = (h: unknown, dir: Vector3, travelled: number, s: unknown, from?: Vector3, factor?: number) => void;

/** A `PlayerWeapons` with only the fields `resolveHit` / `shotPoint` read (no scene, no rig: the rig is never read). */
function weapons(feet: { x: number; y: number; z: number }): { w: PlayerWeapons; resolve: Resolve } {
  const w = Object.create(PlayerWeapons.prototype) as PlayerWeapons;
  Object.assign(w, {
    ballistics: { impactFx: () => {} },
    tally: new Map(),
    events: {},
    world: { props: { impulse: () => {}, damage: () => {} } },
    player: { controller: { pos: new Vector3(feet.x, feet.y, feet.z), crouchBlend: 0 }, pose: { lean: 0 }, attachAim: null },
    shotPose: emptyShotPose(),
    hand: new HandSwitch(),
    slots: [{ def: WEAPONS.rifle }],
    index: 0,
    shotO: new Vector3(),
    shotE: new Vector3(),
    simHead: null,
  });
  return { w, resolve: (w as unknown as { resolveHit: Resolve }).resolveHit.bind(w) };
}

function hitOn(): { hit: unknown; got: HitInfo[] } {
  const got: HitInfo[] = [];
  const target = { id: 'partner', team: 'enemy', alive: true, applyDamage: (h: HitInfo) => (got.push(h), { dealt: 10, killed: false }) };
  return { hit: { hit: true, target, part: 'body', point: new Vector3(3, 1.2, 4), distance: 3 }, got };
}

const slot = { def: WEAPONS.rifle, stats: computeStats(WEAPONS.rifle) };

describe('resolveHit source (train 54 e2e-course)', () => {
  it('without `from`: no crash, the source is the sim shot origin along the shot', () => {
    const { resolve } = weapons({ x: 1, y: 0, z: 2 });
    const { hit, got } = hitOn();
    const dir = new Vector3(1, 0, 0);
    expect(() => resolve(hit, dir, 3, slot)).not.toThrow();
    expect(got).toHaveLength(1);
    const sp = emptyShotPose();
    sp.x = 1;
    sp.z = 2;
    sp.dx = 1;
    sp.dz = 0;
    sp.muzzleY = WEAPONS.rifle.muzzle[1];
    sp.muzzleZ = WEAPONS.rifle.muzzle[2];
    const want = shotOrigin(sp, { x: 0, y: 0, z: 0 });
    const src = got[0]!.sourcePos!;
    expect(src.x).toBeCloseTo(want.x, 6);
    expect(src.y).toBeCloseTo(want.y, 6);
    expect(src.z).toBeCloseTo(want.z, 6);
    expect(src.y).toBeGreaterThan(1);
  });

  it('with `from`: the source is a copy of it', () => {
    const { resolve } = weapons({ x: 0, y: 0, z: 0 });
    const { hit, got } = hitOn();
    const from = new Vector3(35.3, 1.2, 4);
    resolve(hit, new Vector3(1, 0, 0), 3, slot, from);
    const src = got[0]!.sourcePos!;
    expect(src).not.toBe(from);
    expect([src.x, src.y, src.z]).toEqual([35.3, 1.2, 4]);
  });
});
