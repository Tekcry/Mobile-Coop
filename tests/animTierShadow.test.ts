// (guard-cap T1-SHADOW, A195) The anim tier's shadow rule on a NullEngine scene: a guard the camera does not draw counts
// as seen (full rate) when a shadow of his can fall in the view (a shadowing lamp, the moon, a character atlas slot, a
// light overflow); camera culling alone otherwise (the off-screen period). Frustum only, read through the freeze's
// `guardFrustum` and `readFreezeLights`.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AnimTierShadowSource, GuardAnimTier } from '../src/ai/animTierView';
import type { Scene } from '../src/core/babylon';

interface Seen {
  frame: number;
  camFrame: number;
  shadowFrame: number;
  x: number;
}

async function setup(z = -15, height = 1.8, src: AnimTierShadowSource | null = null) {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const B = await import('../src/core/babylon');
  const V = await import('../src/ai/animTierView');
  const scene = new B.Scene(new NullEngine());
  const cam = new B.FreeCamera('cam', new B.Vector3(0, 1.6, 0), scene);
  cam.setTarget(new B.Vector3(0, 1.6, 10));
  scene.activeCamera = cam;
  const body = B.CreateBox('body', { width: 0.6, height: 1.8, depth: 0.6 }, scene);
  body.position.set(0, 0.9, z);
  const tier = new V.GuardAnimTier(scene, body, 0, height, src);
  const pos = new B.Vector3(0, 0, z);
  return { B, V, scene, cam, body, tier, pos };
}

const seenOf = (t: GuardAnimTier): Seen => (t as unknown as { seen: Seen }).seen;

/** One frame: the tier's update (as `Enemy.frame` runs it), then the render. True when it solved. */
function frame(scene: Scene, tier: GuardAnimTier, pos: { x: number; y: number; z: number }): boolean {
  const d = tier.dt(1 / 60, pos as never, [], false);
  scene.render();
  return d >= 0;
}

/** Solves over `n` frames after a first (always solving) one. */
function solves(scene: Scene, tier: GuardAnimTier, pos: { x: number; y: number; z: number }, n = 16): number {
  frame(scene, tier, pos);
  let k = 0;
  for (let i = 0; i < n; i++) if (frame(scene, tier, pos)) k++;
  return k;
}

describe('guard-cap T1-SHADOW: shadow in view counts as seen (NullEngine)', () => {
  let saved: { animTier: boolean; animShadow: boolean; animOff: number };
  beforeEach(async () => {
    const { flags } = await import('../src/core/flags');
    saved = { animTier: flags.animTier, animShadow: flags.animShadow, animOff: flags.animOff };
    flags.animTier = true;
    flags.animShadow = true;
    flags.animOff = 0;
  });
  afterEach(async () => {
    const { flags } = await import('../src/core/flags');
    flags.animTier = saved.animTier;
    flags.animShadow = saved.animShadow;
    flags.animOff = saved.animOff;
  });

  it('no shadowing light, body behind the camera: never seen, the off-screen period (8)', async () => {
    const { scene, tier, pos } = await setup();
    expect(solves(scene, tier, pos)).toBe(2);
    const s = seenOf(tier);
    expect(s.camFrame).toBe(-1);
    expect(s.shadowFrame).toBe(-1);
    expect(s.frame).toBe(-1);
  });

  it('a spot lamp behind him aimed into the view: seen every frame by the shadow rule, full rate', async () => {
    const { B, V, scene, tier, pos } = await setup();
    const lamp = new B.SpotLight('lamp', new B.Vector3(0, 1, -20), new B.Vector3(0, 0, 1), 1.2, 1, scene);
    lamp.shadowMaxZ = 30;
    new B.ShadowGenerator(256, lamp);
    frame(scene, tier, pos);
    let k = 0;
    for (let i = 0; i < 16; i++) {
      if (frame(scene, tier, pos)) k++;
      const s = seenOf(tier);
      expect(s.shadowFrame).toBe(scene.getFrameId());
      expect(s.frame).toBe(scene.getFrameId());
      expect(s.camFrame).not.toBe(s.frame);
      expect(V.animTierShadowSeen(scene)).toBe(1);
    }
    expect(k).toBe(16);
  });

  it('the lamp at intensity 0, or without its shadow generator: off-screen again', async () => {
    const { B, V, scene, tier, pos } = await setup();
    const lamp = new B.SpotLight('lamp', new B.Vector3(0, 1, -20), new B.Vector3(0, 0, 1), 1.2, 1, scene);
    lamp.shadowMaxZ = 30;
    const gen = new B.ShadowGenerator(256, lamp);
    lamp.intensity = 0;
    expect(solves(scene, tier, pos)).toBe(2);
    expect(V.animTierShadowSeen(scene)).toBe(0);
    lamp.intensity = 1;
    gen.dispose();
    expect(lamp.getShadowGenerator()).toBeNull();
    expect(solves(scene, tier, pos)).toBe(2);
    expect(seenOf(tier).shadowFrame).toBe(-1);
  });

  it('the moon: his shadow running into the view is seen; running away from it is not', async () => {
    // (z -6: at -4 the near rule draws him anyway. A low moon, 8.5 deg: his ground shadow is 12 m long and reaches
    // z +6, in view; the camera sees the ground from z 3.8, so a 27 deg moon's 3.6 m shadow would not reach it)
    const { B, scene, tier, pos } = await setup(-6);
    const moon = new B.DirectionalLight('moon', new B.Vector3(0, -0.15, 1).normalize(), scene);
    new B.ShadowGenerator(256, moon);
    frame(scene, tier, pos);
    frame(scene, tier, pos);
    const s = seenOf(tier);
    expect(s.shadowFrame).toBe(scene.getFrameId());
    expect(s.camFrame).toBe(-1);
    moon.direction = new B.Vector3(0, -0.15, -1).normalize();
    const before = s.shadowFrame;
    frame(scene, tier, pos);
    frame(scene, tier, pos);
    expect(s.shadowFrame).toBe(before);
    expect(s.frame).not.toBe(scene.getFrameId());
  });

  it('a character atlas slot lamp (intensity-0 slot spots skipped): seen while the slot is active', async () => {
    let active = true;
    const src: AnimTierShadowSource = {
      torchShadows: null,
      charShadows: {
        slotCount: 1,
        slotLamp: (_s: number, o: Float32Array) => {
          if (!active) return false;
          o[0] = 0;
          o[1] = 3;
          o[2] = -17;
          o[3] = 25;
          return true;
        },
      },
    };
    const { B, scene, tier, pos } = await setup(-15, 1.8, src);
    // the atlas's own slot spot: intensity 0, a generator, aimed into the view; `readFreezeLights` skips it
    const slot = new B.SpotLight('slot', new B.Vector3(0, 1, -20), new B.Vector3(0, 0, 1), 1.2, 1, scene);
    slot.intensity = 0;
    slot.shadowMaxZ = 30;
    new B.ShadowGenerator(256, slot);
    frame(scene, tier, pos);
    frame(scene, tier, pos);
    expect(seenOf(tier).shadowFrame).toBe(scene.getFrameId());
    active = false;
    expect(solves(scene, tier, pos)).toBe(2);
    expect(seenOf(tier).frame).not.toBe(scene.getFrameId());
  });

  it('?animshadow=0: camera only, the lamp does not count', async () => {
    const { flags } = await import('../src/core/flags');
    flags.animShadow = false;
    const { B, scene, tier, pos } = await setup();
    const lamp = new B.SpotLight('lamp', new B.Vector3(0, 1, -20), new B.Vector3(0, 0, 1), 1.2, 1, scene);
    lamp.shadowMaxZ = 30;
    new B.ShadowGenerator(256, lamp);
    expect(solves(scene, tier, pos)).toBe(2);
    expect(seenOf(tier).shadowFrame).toBe(-1);
  });

  it('no height, no position yet, or render-frozen: no shadow test', async () => {
    const { B, scene, body, pos } = await setup();
    const V = await import('../src/ai/animTierView');
    const lamp = new B.SpotLight('lamp', new B.Vector3(0, 1, -20), new B.Vector3(0, 0, 1), 1.2, 1, scene);
    lamp.shadowMaxZ = 30;
    new B.ShadowGenerator(256, lamp);
    // height 0 (the old constructor): camera only
    const flat = new V.GuardAnimTier(scene, body, 0);
    expect(solves(scene, flat, pos)).toBe(2);
    expect(seenOf(flat).shadowFrame).toBe(-1);
    // a render before any `dt` (no position): no throw, not seen
    const fresh = new V.GuardAnimTier(scene, body, 0, 1.8);
    expect(Number.isNaN(seenOf(fresh).x)).toBe(true);
    expect(() => scene.render()).not.toThrow();
    expect(seenOf(fresh).shadowFrame).toBe(-1);
    // seen once updated; render-frozen (body disabled): the shadow rule leaves him alone
    frame(scene, fresh, pos);
    frame(scene, fresh, pos);
    const at = seenOf(fresh).shadowFrame;
    expect(at).toBe(scene.getFrameId());
    body.setEnabled(false);
    frame(scene, fresh, pos);
    frame(scene, fresh, pos);
    expect(seenOf(fresh).shadowFrame).toBe(at);
  });

  it('more shadowing lights than the freeze reads (overflow): every guard counts as seen (conservative)', async () => {
    const { B, scene, tier, pos } = await setup();
    for (let i = 0; i < 17; i++) {
      // far away, behind the camera, aimed away from the view
      const l = new B.SpotLight(`far${i}`, new B.Vector3(200 + i * 3, 5, -200), new B.Vector3(0, -1, -1), 0.8, 1, scene);
      l.shadowMaxZ = 10;
      new B.ShadowGenerator(64, l);
    }
    expect(solves(scene, tier, pos)).toBe(16);
    expect(seenOf(tier).shadowFrame).toBe(scene.getFrameId());
  });

  it('?animoff=4: the off-screen period override (A/B), no light: every 4th frame', async () => {
    const { flags } = await import('../src/core/flags');
    flags.animOff = 4;
    const { scene, tier, pos } = await setup();
    expect(solves(scene, tier, pos)).toBe(4);
  });
});
