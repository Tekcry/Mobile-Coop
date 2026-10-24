import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { instantDetect, sightRate, stepMeter, type SightInput } from '../src/ai/perception';
import { parseMessage, wirePlayerState, type PlayerState } from '../src/net/protocol';
import { VISION_CYCLE, VisionState } from '../src/game/vision';

/**
 * Step 14: vision is rendering only and local only (D8, CLAUDE.md "gameplay never reads graphics state").
 * Perception gives the same result in every mode; no vision field exists on the wire.
 */

const scene: SightInput[] = [
  { dist: 8, angle: 0.1, light: 0.15, crouched: true, speed: 1.2, exposure: 0.8, sensitivity: 1 },
  { dist: 4, angle: 0.6, light: 0.6, crouched: false, speed: 2.8, exposure: 1, sensitivity: 1.3 },
  { dist: 1.5, angle: 2.8, light: 0.02, crouched: false, speed: 1.6, exposure: 0.5, sensitivity: 1 },
  { dist: 12, angle: 0, light: 1, crouched: false, speed: 0, exposure: 1, sensitivity: 1 },
];

/** A guard watching the scene for 3 s: the meter per input and the instant flags. */
function detect(): number[] {
  const out: number[] = [];
  for (const i of scene) {
    let m = 0;
    for (let t = 0; t < 180; t++) m = stepMeter(m, sightRate(i), 1 / 60, 0);
    out.push(m, sightRate(i), instantDetect(i) ? 1 : 0);
  }
  return out;
}

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (p.endsWith('.ts')) acc.push(p);
  }
  return acc;
};

describe('vision never changes detection (step 14)', () => {
  it('perception of a fixed scene is identical in all four modes', () => {
    const v = new VisionState();
    const base = detect();
    const seen = new Set<string>();
    for (let k = 0; k < VISION_CYCLE.length * 2; k++) {
      v.cycle();
      seen.add(v.shown);
      expect(detect()).toEqual(base);
    }
    expect([...seen].sort()).toEqual(['electro', 'night', 'off', 'thermal']);
  });

  it('src/ai, src/net and the light meter never read the vision state or its render flags', () => {
    // the dog's body (DogModel) and the guard's figure (GuardBody, guard-models) are the render-only views that carry
    // the glow (like CharacterRig in src/player; both run once per render from the scene observer); nothing else in
    // src/ai may touch it
    for (const f of walk('src/ai')) {
      const n = f.replace(/\\/g, '/');
      if (n.endsWith('src/ai/dogModel.ts') || n.endsWith('src/ai/guardBody.ts')) continue;
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/vision\.mode|\.heat\b|setHeat|visionKind|bodyFrame|downAge|partHeat|LIVE_DOGS/);
    }
    for (const f of walk('src/net')) expect(readFileSync(f, 'utf8'), f).not.toMatch(/vision|thermal|electro/);
    for (const f of ['src/ai/perception.ts', 'src/world/lightField.ts', 'src/world/lightBake.ts']) {
      let src: string;
      try {
        src = readFileSync(f, 'utf8');
      } catch {
        continue;
      }
      expect(src, f).not.toMatch(/VisionState|vision\.|visionGain|\.heat\b/);
    }
  });

  it('no vision field in the player state, pstate or snap (D8: vision is never sent)', () => {
    const ps = { id: 'peerA', x: 1, y: 0, z: 2, yaw: 0.5, pitch: 0.1, speed: 3, f: 16, w: 'rifle', hp: 80 } as PlayerState;
    const wire = wirePlayerState(ps);
    const keys = Object.keys(wire).sort();
    expect(keys).toMatchSnapshot();
    const bad = /vis|^vk$|^nv$|heat|thermal|electro|goggle/i;
    for (const k of keys) expect(k).not.toMatch(bad);
    const p = parseMessage(JSON.parse(JSON.stringify({ t: 'pstate', s: { ...wire, vision: 'thermal', vk: 1 } })));
    expect(p?.t).toBe('pstate');
    if (p?.t === 'pstate') for (const k of Object.keys(p.s)) expect(k).not.toMatch(bad);
    const sn = parseMessage(JSON.parse(JSON.stringify({ t: 'snap', time: 1, players: [{ ...wire, vision: 'electro' }], enemies: [], obj: '', info: '', pk: 0, vision: 'night' })));
    expect(sn?.t).toBe('snap');
    if (sn?.t === 'snap') {
      for (const k of Object.keys(sn)) expect(k).not.toMatch(bad);
      for (const pl of sn.players) for (const k of Object.keys(pl)) expect(k).not.toMatch(bad);
    }
  });
});
