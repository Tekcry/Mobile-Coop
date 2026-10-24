// (guard-render S10b) The freeze reads the torch / character shadow atlas slots (intensity-0 spots that only drive
// their maps) as shadowing lights: each ACTIVE slot as it renders this frame, unused slots skipped, a torch slot never
// for its own holder. The atlases list a frozen guard's casters too and re-render a slot the frame he is thawed.
import { describe, expect, it, vi } from 'vitest';
import type { Enemy } from '../src/ai/enemy';
import { FREEZE_LAMP_BIT0, FREEZE_LAMP_IN, FreezeLights, guardFrustum } from '../src/game/sectorGuardFreeze';
import type { FreezeCharSlots, FreezeTorchSlots } from '../src/game/sectorGuardFreezeView';
import { LightRegistry, makeCone } from '../src/world/lights';
import { TORCH_DRAW_SLOTS, TORCH_DRAW_STRIDE } from '../src/world/shadowAccuracy';
import { addTorchSlots, TORCH } from '../src/world/torches';

/** The S10 test frustum: from (0, 1.6, 0) looking down +z. */
const S = Math.SQRT1_2;
const PL = new Float64Array([S, 0, S, 0, -S, 0, S, 0, 0, S, S, -1.6 * S, 0, -S, S, 1.6 * S, 0, 0, 1, -0.1, 0, 0, -1, 100]);
const H = 1.8;

describe('guard-render S10b: a torch slot is no shadowing light for its holder', () => {
  it('his own torch (feet = placeTorch undone) is skipped; another guard in the beam keeps the lamp bit', () => {
    // a torch 8 m behind the camera's back aimed +z (into the view)
    const L = new FreezeLights();
    const fx = -TORCH.side;
    const fz = -14 - TORCH.ahead;
    L.addSpot(0, 1.45, -14, 15, 0, 0, 1, 0.37, fx, fz);
    // the holder at those feet: frozen (his map drops him)
    expect(guardFrustum(PL, fx, 0, fz, H, 0, 1.6, 0, L)).toBe(0);
    // a second guard 4 m ahead in the beam: his shadow runs into the view
    expect(guardFrustum(PL, 0, 0, -10, H, 0, 1.6, 0, L)).toBe(FREEZE_LAMP_IN | FREEZE_LAMP_BIT0);
    // without a holder the first guard counted the torch at his body: drawn
    const N = new FreezeLights();
    N.addSpot(0, 1.45, -14, 15, 0, 0, 1, 0.37);
    expect(guardFrustum(PL, fx, 0, fz, H, 0, 1.6, 0, N)).not.toBe(0);
  });
});

/** A dark registry (torch slots added) and its first flashlight's id. */
function registry(): { reg: LightRegistry; torch: number } {
  const reg = new LightRegistry();
  reg.ambient = 0.2;
  reg.add({ x: 0, y: 3, z: 40, radius: 4 });
  addTorchSlots(reg);
  const torch = reg.lights.findIndex((l) => l.kind === 'flashlight');
  expect(torch).toBeGreaterThanOrEqual(0);
  return { reg, torch };
}

async function world() {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { ENEMIES } = await import('../src/ai/enemyDefs');
  const { SectorGuardFreeze } = await import('../src/game/sectorGuardFreezeView');
  const { TorchShadows } = await import('../src/world/torchShadows');
  vi.spyOn(Math, 'random').mockReturnValue(0.25);
  const scene = new B.Scene(new NullEngine());
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, 0), scene);
  cam.setTarget(new B.Vector3(0, 1.6, 10));
  const lib = new PartLibrary(scene);
  const def = ENEMIES.grunt;
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, `enemy-${sl}`), def.look, def.height, 'g', { build: def.build, armor: def.plated, merge: true });
  const e = { alive: true, taken: false, dog: null, def, bodyRig: rig, thawPose: vi.fn() } as unknown as Enemy;
  // a wall across z = 3 in view: every ray stops on it
  const ray = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => {
    const full = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
    if ((a.z - 3) * (b.z - 3) >= 0) return full;
    return (full * (3 - a.z)) / (b.z - a.z);
  };
  const { reg, torch } = registry();
  const casters = [...rig.renderMeshes];
  const chars = new Set(casters);
  const ids = new Int32Array(TORCH_DRAW_SLOTS).fill(-1);
  const ts = new TorchShadows(scene, reg, { casters, torchSlotIds: ids }, new Float32Array(TORCH_DRAW_SLOTS * TORCH_DRAW_STRIDE), [], (m) => chars.has(m));
  // (the null engine has no WebGL2 float target: report the GPU's answer as yes)
  vi.spyOn(ts as unknown as { supported: () => boolean }, 'supported').mockReturnValue(true);
  ts.configure(256, 8);
  expect(ts.slotCount).toBe(TORCH_DRAW_SLOTS);
  /** Torch slot 0 on at (x, y, z) aimed along +z (`dir` 1) or -z (-1); `World.frame` places the slot. */
  const aim = (x: number, y: number, z: number, dir: number): void => {
    const l = reg.lights[torch]!;
    l.on = true;
    l.x = x;
    l.y = y;
    l.z = z;
    l.cone = makeCone(0, 0, dir, TORCH.outer, TORCH.inner);
    ids[0] = torch;
    ts.frame(0, 1.6, 0);
  };
  return { B, scene, rig, e, ray, ts, ids, aim, SectorGuardFreeze, dispose: () => scene.getEngine().dispose() };
}

describe('guard-render S10b: SectorGuardFreeze with the atlas slots (NullEngine, a torch atlas, a fake wall)', () => {
  it('an active torch slot whose shadow of him lands in view keeps him drawn; without the atlas he froze (the gap)', async () => {
    const { scene, rig, e, ray, ts, aim, SectorGuardFreeze, dispose } = await world();
    // the guard behind the camera, a partner's torch 4 m behind him aimed past him into the view: his shadow on the wall
    rig.root.position.set(0, 0, -6);
    aim(0, 1.45, -10, 1);
    expect(ts.slotLight(0)).not.toBeNull();
    const old = new SectorGuardFreeze(scene, { enemies: [e] }, ray);
    scene.render();
    // (S10 alone skips the intensity-0 slot spot: frozen, his shadow missing on the wall)
    expect(rig.root.isEnabled(false)).toBe(false);
    old.dispose();
    const f = new SectorGuardFreeze(scene, { enemies: [e] }, ray, null, { torch: ts });
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(true);
    // the same slot unused (no torch in it this frame): ignored, he freezes
    const unused: FreezeTorchSlots = { slotCount: 1, slotLight: () => null };
    f.dispose();
    const g = new SectorGuardFreeze(scene, { enemies: [e] }, ray, null, { torch: unused });
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    g.dispose();
    ts.dispose();
    dispose();
  });

  it('a slot behind the camera whose shadow of him cannot reach the screen leaves him frozen', async () => {
    const { scene, rig, e, ray, ts, aim, SectorGuardFreeze, dispose } = await world();
    // the torch 9 m behind the camera aimed away from the view, the guard 3 m on in its beam
    rig.root.position.set(0, 0, -12);
    aim(0, 1.45, -9, -1);
    expect(ts.slotLight(0)).not.toBeNull();
    const f = new SectorGuardFreeze(scene, { enemies: [e] }, ray, null, { torch: ts });
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    expect(f.count).toBe(1);
    f.dispose();
    ts.dispose();
    dispose();
  });

  it('a character-atlas slot: its lamp in reach throwing his shadow into view keeps him drawn; an unused slot is ignored', async () => {
    const { scene, rig, e, ray, ts, SectorGuardFreeze, dispose } = await world();
    rig.root.position.set(0, 0, -6);
    let used = true;
    const chars: FreezeCharSlots = {
      slotCount: 2,
      slotLamp: (s, out) => {
        if (s !== 1 || !used) return false;
        out.set([0, 1, -12, 20]);
        return true;
      },
    };
    const f = new SectorGuardFreeze(scene, { enemies: [e] }, ray, null, { chars });
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(true);
    f.dispose();
    used = false;
    const g = new SectorGuardFreeze(scene, { enemies: [e] }, ray, null, { chars });
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    g.dispose();
    ts.dispose();
    dispose();
  });

  it('timing: a frozen guard stays in the slot list, and the frame the freeze thaws him the slot map re-renders', async () => {
    const { scene, rig, e, ray, ts, ids, aim, SectorGuardFreeze, dispose } = await world();
    rig.root.position.set(0, 0, -6);
    // no torch yet: frozen
    const f = new SectorGuardFreeze(scene, { enemies: [e] }, ray, null, { torch: ts });
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(false);
    expect(ids[0]).toBe(-1);
    // a partner's torch takes slot 0 (World.frame, before the render): his frozen body is listed at his rig root
    aim(0, 1.45, -10, 1);
    expect(ts.stats()[0]!.casters).toBeGreaterThan(0);
    const slot = (ts as unknown as { slots: { map: { resetRefreshCounter: () => void }; frozen: unknown[] }[] }).slots[0]!;
    expect(slot.frozen.length).toBeGreaterThan(0);
    const reset = vi.spyOn(slot.map, 'resetRefreshCounter');
    // the render: the freeze (before the evaluation) thaws him from this frame's slot, the atlas (after it) re-renders
    // the slot's map in this same frame, with him enabled
    scene.render();
    expect(rig.root.isEnabled(false)).toBe(true);
    expect(e.thawPose).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
    expect(slot.frozen.length).toBe(0);
    f.dispose();
    ts.dispose();
    dispose();
  });
});

describe('guard-render S10b: the character atlas getter', () => {
  it('slotLamp: the slot lamp x, y, z and the far reach (light reach + 0.5); false when unused', async () => {
    const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
    const { Scene } = await import('../src/core/babylon');
    const { CharShadows } = await import('../src/world/charShadows');
    const scene = new Scene(new NullEngine());
    const cs = new CharShadows(scene, { count: 2, spheres: new Float32Array([0, 4, 0, 6, 5, 3, 1, 7]), lightReach: new Float32Array([8, 9]), lampLit: () => true }, []);
    (cs as unknown as { slots: { lamp: number }[] }).slots = [{ lamp: -1 }, { lamp: 1 }];
    const out = new Float32Array(4);
    expect(cs.slotCount).toBe(2);
    expect(cs.slotLamp(0, out)).toBe(false);
    expect(cs.slotLamp(1, out)).toBe(true);
    expect([...out]).toEqual([5, 3, 1, 9.5]);
    expect(cs.slotLamp(2, out)).toBe(false);
    scene.getEngine().dispose();
  });
});

describe('guard-render S10b: no allocation in the per-frame atlas paths (structure)', () => {
  const ALLOC = /\bnew\s|=>|\[\s*\]|\{\s*\}|\.(map|filter|forEach|slice|concat)\(|\bfor\s*\([^)]*\bof\b/;
  const body = (src: string, head: string): string => {
    const i = src.indexOf(head);
    expect(i).toBeGreaterThanOrEqual(0);
    const m = (head.startsWith('  ') ? /\r?\n {2}\}\r?\n/ : /\r?\n\}\r?\n/).exec(src.slice(i));
    expect(m).not.toBeNull();
    // (the body only, past the signature's types)
    const b = src.slice(i, i + m!.index);
    return b.slice(/\{\r?\n/.exec(b)!.index);
  };
  it('frozenCasterSphere, thawed, the freeze slot reads and the atlas thaw checks make no closures, arrays or objects', async () => {
    const { readFileSync } = await import('node:fs');
    const fc = readFileSync('src/world/frozenCaster.ts', 'utf8');
    for (const h of ['export function frozenCasterSphere(', 'export function thawed(']) expect(body(fc, h)).not.toMatch(ALLOC);
    const view = readFileSync('src/game/sectorGuardFreezeView.ts', 'utf8');
    expect(body(view, '  private readLights(')).not.toMatch(ALLOC);
    expect(body(view, '  private addSpotLight(')).not.toMatch(ALLOC);
    for (const f of ['src/world/torchShadows.ts', 'src/world/charShadows.ts']) {
      const src = readFileSync(f, 'utf8');
      // (the observer itself is the one closure, made once per configure)
      expect(body(src, '  private readonly onThaw = ')).not.toMatch(ALLOC);
    }
  });
});
