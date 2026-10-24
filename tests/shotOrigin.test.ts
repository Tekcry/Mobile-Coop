// (rig-pose-fix S2, audit G6) The player's shot origin and sim eye from the sim (`src/weapons/shotOrigin.ts`): the pure
// model, the host's origin checks accept it, and its parity with Wren's rig (NullEngine, as `operatorRig` builds her) at
// rest in the fitted stances. `SHOT_ORIGIN_SWEEP=<file.tsv>` writes the rig sweep the tables were fitted from (columns:
// weapon, side, crouch, pitch, lean, inverted, muzzle xyz, head xyz; root at the origin, facing +z; the fit is a least
// squares of the model's terms on muzzle - barrel and on the head, 1 mm rounding).
import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import type { RigPose } from '../src/player/characterRig';
import { emptyShotPose, shotEye, shotOrigin, type P3, type ShotPose } from '../src/weapons/shotOrigin';
import { WEAPONS } from '../src/weapons/weaponDefs';
import { withAttachments } from '../src/progression/attachments';
import { checkShot, SHOT_UNDER } from '../src/net/validate';
import { LAMP_SHOT_ORIGIN } from '../src/net/lampSync';

const d3 = (a: P3, b: P3): number => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);

function pose(o: Partial<ShotPose> & { yaw?: number; pitch?: number; w?: 'rifle' | 'pistolSd' } = {}): ShotPose {
  const s = emptyShotPose();
  const w = WEAPONS[o.w ?? 'rifle'];
  s.pistol = w.class === 'pistol';
  s.muzzleY = w.muzzle[1];
  s.muzzleZ = w.muzzle[2];
  const yaw = o.yaw ?? 0;
  const p = o.pitch ?? 0;
  s.dx = Math.sin(yaw) * Math.cos(p);
  s.dy = Math.sin(p);
  s.dz = Math.cos(yaw) * Math.cos(p);
  for (const k of ['x', 'y', 'z', 'crouch', 'lean', 'side', 'inverted', 'muzzleY', 'muzzleZ'] as const) if (o[k] !== undefined) (s as unknown as Record<string, unknown>)[k] = o[k];
  return s;
}

describe('shotOrigin: the pure model', () => {
  it('writes out in place, finite, at the right shoulder in front of the feet, below the eye height', () => {
    const out = { x: 0, y: 0, z: 0 };
    expect(shotOrigin(pose(), out)).toBe(out);
    // standing, level: right of the centre line, about chest-to-eye height, the rifle's muzzle ~0.93 m ahead
    expect(out.x).toBeGreaterThan(0.1);
    expect(out.x).toBeLessThan(0.3);
    expect(out.y).toBeGreaterThan(1.35);
    expect(out.y).toBeLessThan(1.6);
    expect(out.z).toBeGreaterThan(0.8);
    expect(out.z).toBeLessThan(1.05);
    const e = shotEye(pose(), { x: 0, y: 0, z: 0 });
    expect(e.y).toBeGreaterThan(out.y);
    expect(e.z).toBeLessThan(out.z);
  });

  it('the left shoulder mirrors the side; a turn of the aim turns both points about the feet; the feet translate them', () => {
    const r = shotOrigin(pose({ crouch: 0.6, pitch: 0.3 }), { x: 0, y: 0, z: 0 });
    const l = shotOrigin(pose({ crouch: 0.6, pitch: 0.3, side: -1 }), { x: 0, y: 0, z: 0 });
    expect(l.x).toBeCloseTo(-r.x, 9);
    expect(l.y).toBeCloseTo(r.y, 9);
    expect(l.z).toBeCloseTo(r.z, 9);
    const yaw = 2.1;
    const t = shotOrigin(pose({ crouch: 0.6, pitch: 0.3, yaw, x: 4, y: -1, z: 7 }), { x: 0, y: 0, z: 0 });
    // rotate r by yaw (forward (sin, cos), right (cos, -sin)) and add the feet
    expect(t.x).toBeCloseTo(4 + r.x * Math.cos(yaw) + r.z * Math.sin(yaw), 9);
    expect(t.z).toBeCloseTo(7 - r.x * Math.sin(yaw) + r.z * Math.cos(yaw), 9);
    expect(t.y).toBeCloseTo(r.y - 1, 9);
  });

  it('a longer barrel (a suppressor) moves the origin along the aim by the added length; the eye does not move', () => {
    const base = WEAPONS.rifle;
    const sup = withAttachments(base, ['suppressor']);
    const added = sup.muzzle[2] - base.muzzle[2];
    const pitch = -0.4;
    const a = shotOrigin(pose({ pitch }), { x: 0, y: 0, z: 0 });
    const b = shotOrigin(pose({ pitch, muzzleZ: sup.muzzle[2] }), { x: 0, y: 0, z: 0 });
    expect(b.y - a.y).toBeCloseTo(Math.sin(pitch) * added, 9);
    expect(b.z - a.z).toBeCloseTo(Math.cos(pitch) * added, 9);
    expect(shotEye(pose({ pitch, muzzleZ: sup.muzzle[2] }), { x: 0, y: 0, z: 0 })).toEqual(shotEye(pose({ pitch }), { x: 0, y: 0, z: 0 }));
  });

  it('crouching lowers both points; the lean moves them to its side; inverted they hang under the feet', () => {
    const st = shotOrigin(pose(), { x: 0, y: 0, z: 0 });
    const cr = shotOrigin(pose({ crouch: 1 }), { x: 0, y: 0, z: 0 });
    expect(st.y - cr.y).toBeGreaterThan(0.35);
    const lr = shotOrigin(pose({ lean: 0.2 }), { x: 0, y: 0, z: 0 });
    const ll = shotOrigin(pose({ lean: -0.2 }), { x: 0, y: 0, z: 0 });
    expect(lr.x - st.x).toBeGreaterThan(0.06);
    expect(st.x - ll.x).toBeGreaterThan(0.06);
    const inv = shotOrigin(pose({ w: 'pistolSd', inverted: true }), { x: 0, y: 0, z: 0 });
    expect(inv.y).toBeLessThan(-0.3);
    expect(shotEye(pose({ w: 'pistolSd', inverted: true }), { x: 0, y: 0, z: 0 }).y).toBeLessThan(-0.2);
  });

  it('straight up / down and past the camera range stay finite (the stance terms clamp the pitch)', () => {
    for (const p of [-Math.PI / 2, -1.5, 1.4, Math.PI / 2]) {
      const o = shotOrigin(pose({ pitch: p }), { x: 0, y: 0, z: 0 });
      const e = shotEye(pose({ pitch: p }), { x: 0, y: 0, z: 0 });
      for (const v of [o.x, o.y, o.z, e.x, e.y, e.z]) expect(Number.isFinite(v)).toBe(true);
      expect(d3(o, e)).toBeLessThan(1.5);
    }
  });
});

describe('shotOrigin: the host accepts the claimed origin (src/net/validate.ts checkShot, lampSync LAMP_SHOT_ORIGIN)', () => {
  it('every stance, both weapons, the aim range: inside checkShot; upright inside the lamp / pendant origin check, inverted not', () => {
    const worst = { up: 0, inv: 0 };
    for (const w of ['rifle', 'pistolSd'] as const)
      for (const inverted of w === 'pistolSd' ? [false, true] : [false])
        for (const side of [1, -1])
          for (const crouch of inverted ? [0] : [0, 0.5, 1])
            for (const lean of inverted ? [0] : [0, -0.2, 0.2])
              // the camera's pitch range; inverted, the pipe's (PIPE.pitchMax 30 deg; the camera's -1.2 below)
              for (const pitch of inverted ? [-1.2, -0.6, 0, 0.52] : [-1.2, -0.6, 0, 0.6, 1.05])
                for (const yaw of [0, 1.3, -2.6]) {
                  const s = pose({ w, inverted, side, crouch, lean, pitch, yaw, x: 3, y: 2, z: -5 });
                  // the suppressed barrel too (the longest muzzle an attachment gives)
                  for (const mz of [s.muzzleZ, withAttachments(WEAPONS[w], ['suppressor']).muzzle[2]]) {
                    s.muzzleZ = mz;
                    const o = shotOrigin(s, { x: 0, y: 0, z: 0 });
                    const feet = { x: 3, y: 2, z: -5 };
                    const target = { x: o.x + s.dx * 10, y: o.y + s.dy * 10, z: o.z + s.dz * 10 };
                    const v = checkShot({ origin: o, dir: { x: s.dx, y: s.dy, z: s.dz }, part: 'body' }, feet, target, target, 50, 1.1, SHOT_UNDER);
                    expect(v.ok, `${w} inv ${inverted} side ${side} c ${crouch} lean ${lean} p ${pitch}`).toBe(true);
                    const dl = d3(o, { x: feet.x, y: feet.y + 1.2, z: feet.z });
                    if (inverted) worst.inv = Math.max(worst.inv, dl);
                    else worst.up = Math.max(worst.up, dl);
                  }
                }
    console.info(`shot origin vs the lamp check's chest point (feet + 1.2): upright max ${worst.up.toFixed(3)} m, inverted max ${worst.inv.toFixed(3)} m (limit ${LAMP_SHOT_ORIGIN})`);
    expect(worst.up).toBeLessThan(LAMP_SHOT_ORIGIN - 0.5);
    // (open item, S2-REPORT) hanging inverted the round starts up to ~2.02 m from feet + 1.2 (the rig's muzzle did too: the
    // fit is within 0.4 cm there): a client's lamp / pendant shot from an inverted pipe can fail the host's 2 m check
    expect(worst.inv).toBeLessThan(2.1);
  });
});

const DT = 1 / 60;

/** A Wren rig as `operatorRig` (playerFigure.ts) builds it, holding `weapon`; `at` poses it and returns the rig's muzzle
 *  and head node (world). */
async function wrenRig(weapon: 'rifle' | 'pistolSd') {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Scene, Vector3 } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { WeaponModel, DEFAULT_WEAPON_COLORS } = await import('../src/weapons/weaponModel');
  const { WREN_HANDS, WREN_HOLSTER, WREN_BACK_MOUNT } = await import('../src/operators/handFrame');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, 'shot-origin', { build: 'average', style: 'detailed' });
  rig.setHands(WREN_HANDS);
  rig.thighMount = WREN_HOLSTER as unknown as typeof rig.thighMount;
  rig.backMount = WREN_BACK_MOUNT as unknown as typeof rig.backMount;
  rig.tuneRows = true;
  rig.carrier = true;
  const def = WEAPONS[weapon];
  const gun = new WeaponModel(scene, lib, def, DEFAULT_WEAPON_COLORS, rig.weaponPivot);
  gun.hold(rig);
  const m = new Vector3();
  /** Aimed and still at the stance, settled 2 s; root yaw `yaw` (the aim's), feet at the origin. */
  const at = (side: number, crouch: number, pitch: number, lean: number, inverted: boolean, yaw = 0) => {
    rig.openLeft = side < 0;
    rig.root.rotation.y = inverted ? yaw - Math.PI : yaw;
    const rp: RigPose = {
      speed: 0, localX: 0, localZ: 1, grounded: true, crouch, aimPitch: inverted ? -pitch : pitch, aim: 1, kick: 0, aimYaw: 0,
      carry: { low: 1, high: 0, compressed: 0 }, weight: def.class === 'pistol' ? 0.7 : 1, armed: true, lean,
      tumble: inverted ? Math.PI : 0, aimWorldYaw: inverted ? yaw : undefined, aimWorldPitch: inverted ? pitch : undefined,
    };
    for (let k = 0; k < 120; k++) rig.animate(DT, rp);
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
    gun.muzzleWorld(m);
    const h = rig.headNode.getAbsolutePosition();
    return { muzzle: { x: m.x, y: m.y, z: m.z }, head: { x: h.x, y: h.y, z: h.z } };
  };
  return { scene, at };
}

const SWEEP_PITCH = [-1.2, -0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9, 1.05];
const INV_PITCH = [-0.8, -0.4, 0, 0.3, 0.6];

describe('shotOrigin: parity with Wren rig at rest (NullEngine)', () => {
  it('the fitted stances: muzzle and head within the fit tolerances; the turned aim and the in-between stances too', async () => {
    const rows: string[] = ['w\tside\tc\tp\tlean\tinv\tmx\tmy\tmz\thx\thy\thz'];
    const lines: string[] = [];
    for (const w of ['rifle', 'pistolSd'] as const) {
      const { scene, at } = await wrenRig(w);
      const worst = { m: 0, h: 0, mi: 0, hi: 0, off: 0, sum: 0, n: 0 };
      const run = (side: number, crouch: number, pitch: number, lean: number, inverted: boolean, yaw: number, fitted: boolean): void => {
        const r = at(side, crouch, pitch, lean, inverted, yaw);
        const s = pose({ w, side, crouch, pitch, lean, inverted, yaw });
        const em = d3(shotOrigin(s, { x: 0, y: 0, z: 0 }), r.muzzle);
        const eh = d3(shotEye(s, { x: 0, y: 0, z: 0 }), r.head);
        if (!fitted) worst.off = Math.max(worst.off, em);
        else if (inverted) {
          worst.mi = Math.max(worst.mi, em);
          worst.hi = Math.max(worst.hi, eh);
        } else {
          worst.m = Math.max(worst.m, em);
          worst.h = Math.max(worst.h, eh);
          worst.sum += em * em;
          worst.n++;
        }
        if (fitted && yaw === 0) rows.push([w, side, crouch, pitch, lean, inverted ? 1 : 0, r.muzzle.x, r.muzzle.y, r.muzzle.z, r.head.x, r.head.y, r.head.z].map((v) => (typeof v === 'number' ? +v.toFixed(4) : v)).join('\t'));
      };
      for (const side of [1, -1]) for (const crouch of [0, 0.5, 1]) for (const pitch of SWEEP_PITCH) for (const lean of [0, -0.2, 0.2]) run(side, crouch, pitch, lean, false, 0, true);
      if (w === 'pistolSd') for (const pitch of INV_PITCH) run(1, 0, pitch, 0, true, 0, true);
      // not fitted: the aim turned (the model's frame turns with it), in-between crouch / pitch / lean
      for (const [crouch, pitch, lean, yaw] of [[0, 0.15, 0, 0.9], [0.25, -0.45, 0.1, -2.2], [0.75, 0.45, -0.1, 3.0], [1, -0.15, 0, 1.6]] as const) run(1, crouch, pitch, lean, false, yaw, false);
      scene.dispose();
      const rms = Math.sqrt(worst.sum / Math.max(1, worst.n));
      lines.push(`${w}: muzzle max ${(worst.m * 100).toFixed(1)} cm rms ${(rms * 100).toFixed(1)} cm, head max ${(worst.h * 100).toFixed(1)} cm; turned / in-between muzzle max ${(worst.off * 100).toFixed(1)} cm` + (w === 'pistolSd' ? `; inverted muzzle max ${(worst.mi * 100).toFixed(1)} cm head ${(worst.hi * 100).toFixed(1)} cm` : ''));
      // tolerances: the fit's residual plus ~1 cm (shotOrigin.ts header); the low pistol's 6 cm body clearance push is in its row
      const tol = w === 'rifle' ? { m: 0.045, h: 0.035, off: 0.045 } : { m: 0.095, h: 0.06, off: 0.095 };
      expect(worst.m, `${w} muzzle`).toBeLessThan(tol.m);
      expect(worst.h, `${w} head`).toBeLessThan(tol.h);
      expect(worst.off, `${w} turned / in-between`).toBeLessThan(tol.off);
      if (w === 'pistolSd') {
        expect(worst.mi, 'inverted muzzle').toBeLessThan(0.02);
        expect(worst.hi, 'inverted head').toBeLessThan(0.025);
      }
    }
    for (const l of lines) console.info(`shot origin parity ${l}`);
    if (process.env.SHOT_ORIGIN_SWEEP) writeFileSync(process.env.SHOT_ORIGIN_SWEEP, rows.join('\n'));
  });
});
