/**
 * (char-shadow-meter S1, J16) The character-occluder contract: the soft-capsule formula is the shaders' `lampCapsule`
 * (one formula, two languages), the product over a contract (owner skip, holder rule, broad phase), the fixed layout,
 * no allocation, and no graphics state (G352, bible P1 / L11 / L13; PLAN section 4).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { CAPSULE, capsuleTransmit, CHAR_LIGHT, CharOccluders, holds, LAMP_CAPSULE_GLSL, OCC, OCC_KIND, occKey } from '../src/world/charOccluders';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

type V = [number, number, number];

/** The GLSL `lampCapsule` (bakedLamps.ts before S1, now `LAMP_CAPSULE_GLSL`) ported with vector helpers and its own
 *  literal numbers, the reference the TS port is held to. */
function lampCapsuleRef(p: V, l: V, a: V, b: V, r: number): number {
  const sub = (u: V, v: V): V => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const add = (u: V, v: V): V => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
  const mul = (u: V, k: number): V => [u[0] * k, u[1] * k, u[2] * k];
  const dot = (u: V, v: V): number => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const length = (u: V): number => Math.sqrt(dot(u, u));
  const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
  const mix = (x: number, y: number, k: number): number => x * (1 - k) + y * k;
  const smoothstep = (e0: number, e1: number, x: number): number => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const d2 = sub(b, a);
  const c2 = Math.max(dot(d2, d2), 1e-6);
  const w0 = sub(p, a);
  if (length(sub(w0, mul(d2, clamp(dot(w0, d2) / c2, 0, 1)))) < r * 1.6) return 1;
  const d1 = sub(l, p);
  const c1 = Math.max(dot(d1, d1), 1e-6);
  const c12 = dot(d1, d2);
  const e1 = dot(d1, w0);
  const e2 = dot(d2, w0);
  const den = c1 * c2 - c12 * c12;
  let s = den > 1e-6 ? clamp((c12 * e2 - c2 * e1) / den, 0, 1) : 0;
  const t = clamp((c12 * s + e2) / c2, 0, 1);
  s = clamp((c12 * t - e1) / c1, 0, 1);
  const dist = length(sub(sub(add(p, mul(d1, s)), a), mul(d2, t)));
  const behind = s * Math.sqrt(c1);
  const pen = r * 0.35 + behind * 0.12;
  return mix(0.15, 1, smoothstep(r - pen, r + pen, dist));
}

function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** An upright capsule (feet to head) at (x, z). */
function upright(c: CharOccluders, kind: number, index: number, x: number, y: number, z: number, h = 1.75, r = 0.3): number {
  return c.add(kind, index, x, y + r, z, x, y + h - r, z, r);
}

/** The brute force: every capsule, no broad phase, the same skips. */
function brute(c: CharOccluders, sx: number, sy: number, sz: number, px: number, py: number, pz: number, skip: number): number {
  let t = 1;
  for (let i = 0; i < c.n; i++) {
    if (c.owner[i] === skip) continue;
    const o = i * OCC.stride;
    const C = c.cap;
    if (holds(sx, sy, sz, C[o]!, C[o + 1]!, C[o + 2]!, C[o + 3]!, C[o + 4]!, C[o + 5]!, C[o + 6]!)) continue;
    t *= capsuleTransmit(px, py, pz, sx, sy, sz, C[o]!, C[o + 1]!, C[o + 2]!, C[o + 3]!, C[o + 4]!, C[o + 5]!, C[o + 6]!);
  }
  return t;
}

describe('capsule formula: the GLSL lampCapsule in TS (one formula, two languages)', () => {
  it('equals the GLSL reference port on 10k random cases within 1e-6', () => {
    const rnd = rng(11);
    let umbra = 0;
    let soft = 0;
    let clear = 0;
    let worst = 0;
    for (let k = 0; k < 10000; k++) {
      const p: V = [-5 + rnd() * 10, rnd() * 2, -5 + rnd() * 10];
      // a light 1-12 m away, any direction
      const th = rnd() * Math.PI * 2;
      const ph = -0.3 + rnd() * 1.8;
      const dl = 1 + rnd() * 11;
      const l: V = [p[0] + Math.cos(th) * Math.cos(ph) * dl, p[1] + Math.sin(ph) * dl, p[2] + Math.sin(th) * Math.cos(ph) * dl];
      // a capsule near the segment (so the umbra, the soft edge and the clear side all come up), any lean
      const f = rnd();
      const spread = rnd() < 0.5 ? 0.4 : 1.6;
      const cx = p[0] + (l[0] - p[0]) * f + (rnd() - 0.5) * spread;
      const cy = p[1] + (l[1] - p[1]) * f + (rnd() - 0.5) * spread;
      const cz = p[2] + (l[2] - p[2]) * f + (rnd() - 0.5) * spread;
      const h = 0.3 + rnd() * 1.6;
      const lx = (rnd() - 0.5) * 0.8;
      const lz = (rnd() - 0.5) * 0.8;
      const a: V = [cx - lx * h * 0.5, cy - h * 0.5, cz - lz * h * 0.5];
      const b: V = [cx + lx * h * 0.5, cy + h * 0.5, cz + lz * h * 0.5];
      const r = 0.15 + rnd() * 0.35;
      const ref = lampCapsuleRef(p, l, a, b, r);
      const ts = capsuleTransmit(p[0], p[1], p[2], l[0], l[1], l[2], a[0], a[1], a[2], b[0], b[1], b[2], r);
      worst = Math.max(worst, Math.abs(ts - ref));
      if (ref === CAPSULE.floor) umbra++;
      else if (ref < 1) soft++;
      else clear++;
    }
    expect(worst).toBeLessThan(1e-6);
    // (every branch exercised)
    expect(umbra).toBeGreaterThan(500);
    expect(soft).toBeGreaterThan(500);
    expect(clear).toBeGreaterThan(500);
  });

  it('LAMP_CAPSULE_GLSL is built from CAPSULE and is the lamp loop\'s lampCapsule', async () => {
    expect(LAMP_CAPSULE_GLSL).toContain('float lampCapsule(vec3 p, vec3 l, vec3 a, vec3 b, float r) {');
    expect(LAMP_CAPSULE_GLSL).toContain(`< r * ${CAPSULE.self}) return 1.0;`);
    expect(LAMP_CAPSULE_GLSL).toContain(`float pen = r * ${CAPSULE.penR} + behind * ${CAPSULE.penBehind};`);
    expect(LAMP_CAPSULE_GLSL).toContain(`return mix(${CAPSULE.floor}, 1.0, smoothstep(r - pen, r + pen, dist));`);
    const { LAMP_GLSL } = await import('../src/world/bakedLamps');
    expect(LAMP_GLSL).toContain(LAMP_CAPSULE_GLSL);
    expect(LAMP_GLSL.split('float lampCapsule(').length).toBe(2);
  });

  it('reads the floor 0.15 inside the umbra, 1 well clear and on the own surface', () => {
    // a lamp 4 m up, the point on the floor, a 0.3 m capsule lying across the ray 1 m above the point
    const T = (r: number, ay: number): number => capsuleTransmit(0, 0, 0, 0, 4, 0, -1, ay, 0, 1, ay, 0, r);
    expect(T(0.3, 1)).toBe(CAPSULE.floor);
    // off to the side by 3 m: clear
    expect(capsuleTransmit(0, 0, 0, 0, 4, 0, -1, 1, 3, 1, 1, 3, 0.3)).toBe(1);
    // the point on the capsule's own surface (within 1.6 r of its axis): no self shadow
    expect(capsuleTransmit(0, 1.4, 0, 0, 4, 0, -1, 1, 0, 1, 1, 0, 0.3)).toBe(1);
    // the soft edge: between the floor and 1, rising as the capsule moves off the ray
    let last: number = CAPSULE.floor;
    for (let off = 0.25; off <= 0.6; off += 0.05) {
      const v = capsuleTransmit(0, 0, 0, 0, 4, 0, -1, 1, off, 1, 1, off, 0.3);
      expect(v).toBeGreaterThanOrEqual(last);
      last = v;
    }
    expect(last).toBeGreaterThan(CAPSULE.floor);
  });
});

describe('CharOccluders (the contract)', () => {
  it('fixed layout: owner keys, kinds, -1 past OCC.max, clear bumps the version', () => {
    const c = new CharOccluders();
    expect(c.cap.length).toBe(OCC.max * OCC.stride);
    expect(occKey(OCC_KIND.guard, 7)).toBe((2 << 16) | 7);
    expect(occKey(OCC_KIND.player, 0)).not.toBe(-1);
    for (let i = 0; i < OCC.max; i++) expect(upright(c, OCC_KIND.guard, i, i, 0, 0)).toBe(i);
    expect(upright(c, OCC_KIND.guard, 99, 0, 0, 0)).toBe(-1);
    expect(c.n).toBe(OCC.max);
    expect(c.owner[5]).toBe(occKey(OCC_KIND.guard, 5));
    expect(c.cap[5 * OCC.stride + 7]).toBe(OCC_KIND.guard);
    const v = c.version;
    c.clear();
    expect(c.n).toBe(0);
    expect(c.version).toBe(v + 1);
    c.transmitInto(0, 4, 0, 0, 0, 0, -1);
    expect(c.t).toBe(1);
  });

  it('one capsule between a source and the point gives its formula; the owner skip removes it', () => {
    const c = new CharOccluders();
    // a guard standing 1 m from the point, a lamp beyond him at head height
    upright(c, OCC_KIND.guard, 3, 1, 0, 0);
    c.transmitInto(4, 1.2, 0, 0, 1.2, 0, -1);
    const f = capsuleTransmit(0, 1.2, 0, 4, 1.2, 0, 1, 0.3, 0, 1, 1.45, 0, 0.3);
    expect(c.t).toBe(f);
    expect(c.t).toBe(CAPSULE.floor);
    c.transmitInto(4, 1.2, 0, 0, 1.2, 0, occKey(OCC_KIND.guard, 3));
    expect(c.t).toBe(1);
    // another owner key skips nothing
    c.transmitInto(4, 1.2, 0, 0, 1.2, 0, occKey(OCC_KIND.player, 3));
    expect(c.t).toBe(f);
  });

  it('the holder rule: a light within r + 0.6 m of a capsule\'s axis is never shadowed by it (A5)', () => {
    const c = new CharOccluders();
    upright(c, OCC_KIND.guard, 0, 0, 0, 0);
    // his flashlight at the chest, 0.4 m in front, shining at a point 5 m on: his own capsule is beside the source
    c.transmitInto(0.4, 1.3, 0, 5, 1.3, 0, -1);
    expect(c.t).toBe(1);
    expect(holds(0.4, 1.3, 0, 0, 0.3, 0, 0, 1.45, 0, 0.3)).toBe(true);
    // a lamp just past the reach behind him, the point in front: he shadows it
    const d = 0.3 + CAPSULE.holder + 0.05;
    expect(holds(-d, 1.3, 0, 0, 0.3, 0, 0, 1.45, 0, 0.3)).toBe(false);
    c.transmitInto(-d, 1.3, 0, 3, 1.3, 0, -1);
    expect(c.t).toBeLessThan(1);
  });

  it('two capsules multiply', () => {
    const c = new CharOccluders();
    upright(c, OCC_KIND.guard, 0, 1.5, 0, 0.35);
    upright(c, OCC_KIND.player, 1, 3, 0, -0.4, 1.6, 0.28);
    const one = new CharOccluders();
    upright(one, OCC_KIND.guard, 0, 1.5, 0, 0.35);
    const two = new CharOccluders();
    upright(two, OCC_KIND.player, 1, 3, 0, -0.4, 1.6, 0.28);
    c.transmitInto(5, 1.5, 0, 0, 1.1, 0, -1);
    one.transmitInto(5, 1.5, 0, 0, 1.1, 0, -1);
    const a = one.t;
    two.transmitInto(5, 1.5, 0, 0, 1.1, 0, -1);
    const b = two.t;
    expect(a).toBeLessThan(1);
    expect(b).toBeLessThan(1);
    expect(c.t).toBe(a * b);
  });

  it('the broad phase gives the brute-force product to the bit on random scenes', () => {
    const rnd = rng(29);
    let shaded = 0;
    for (let scene = 0; scene < 60; scene++) {
      const c = new CharOccluders();
      const nc = 1 + Math.floor(rnd() * 30);
      for (let i = 0; i < nc; i++) {
        const x = -6 + rnd() * 12;
        const z = -6 + rnd() * 12;
        if (rnd() < 0.2) {
          // a body lying flat
          const yaw = rnd() * Math.PI * 2;
          c.add(OCC_KIND.body, i, x, 0.2, z, x + Math.cos(yaw) * 1.4, 0.2, z + Math.sin(yaw) * 1.4, 0.2);
        } else upright(c, rnd() < 0.5 ? OCC_KIND.guard : OCC_KIND.player, i, x, rnd() * 0.5, z, 1.2 + rnd() * 0.6, 0.25 + rnd() * 0.1);
      }
      for (let q = 0; q < 200; q++) {
        const px = -6 + rnd() * 12;
        const py = rnd() * 1.8;
        const pz = -6 + rnd() * 12;
        // a lamp overhead-ish, or the moon 60 m off
        const far = rnd() < 0.2 ? CHAR_LIGHT.moonFar : 2 + rnd() * 6;
        const sx = px + (rnd() - 0.5) * far;
        const sy = py + 1 + rnd() * far * 0.5;
        const sz = pz + (rnd() - 0.5) * far;
        const skip = rnd() < 0.3 ? c.owner[Math.floor(rnd() * c.n)]! : -1;
        c.transmitInto(sx, sy, sz, px, py, pz, skip);
        const want = brute(c, sx, sy, sz, px, py, pz, skip);
        expect(Object.is(c.t, want), `scene ${scene} query ${q}: ${c.t} vs ${want}`).toBe(true);
        if (want < 1) shaded++;
      }
    }
    expect(shaded).toBeGreaterThan(300);
  });

  it('allocation-free under a loop (transmitQ: nothing; transmitInto / capsuleTransmit: only boxed arguments)', async () => {
    const c = new CharOccluders();
    const rnd = rng(3);
    for (let i = 0; i < 24; i++) upright(c, OCC_KIND.guard, i, -4 + rnd() * 8, 0, -4 + rnd() * 8);
    const N = 2000;
    const P = inputs(N * 6, (k) => (k % 6 === 1 ? 0.5 + rnd() * 1.2 : k % 6 === 4 ? 3 + rnd() * 2 : -4 + rnd() * 8));
    const per = (fn: (n: number) => void, goal: number): Promise<number> => bytesPerCall(fn, goal, { n: N, warm: 200000 });
    const ring: Float64Array[] = new Array<Float64Array>(64);
    const ctl = await per((n) => {
      let acc = 0;
      for (let i = 0; i < n; i++) {
        const v = new Float64Array(3);
        c.transmitInto(P[i * 6 + 3]!, P[i * 6 + 4]!, P[i * 6 + 5]!, P[i * 6]!, P[i * 6 + 1]!, P[i * 6 + 2]!, -1);
        v[0] = c.t;
        ring[i & 63] = v;
        acc += v[0];
      }
      sink[0] = acc;
    }, -Infinity);
    // the field's way: the six doubles into `q`, one small int passed (what LightField does per source)
    const q = c.q;
    const tq = await per((n) => {
      let acc = 0;
      for (let i = 0; i < n; i++) {
        q[0] = P[i * 6 + 3]!;
        q[1] = P[i * 6 + 4]!;
        q[2] = P[i * 6 + 5]!;
        q[3] = P[i * 6]!;
        q[4] = P[i * 6 + 1]!;
        q[5] = P[i * 6 + 2]!;
        c.transmitQ(-1);
        acc += c.t;
      }
      sink[0] = acc;
    }, 0);
    let shaded = 0;
    for (let i = 0; i < N; i++) {
      c.transmitInto(P[i * 6 + 3]!, P[i * 6 + 4]!, P[i * 6 + 5]!, P[i * 6]!, P[i * 6 + 1]!, P[i * 6 + 2]!, -1);
      if (c.t < 1) shaded++;
    }
    // the argument forms: at most their doubles boxed when V8 does not inline the call (6 in, 13 in + 1 out)
    const tr = await per((n) => {
      let acc = 0;
      for (let i = 0; i < n; i++) {
        c.transmitInto(P[i * 6 + 3]!, P[i * 6 + 4]!, P[i * 6 + 5]!, P[i * 6]!, P[i * 6 + 1]!, P[i * 6 + 2]!, -1);
        acc += c.t;
      }
      sink[0] = acc;
    }, 0);
    const one = await per((n) => {
      let acc = 0;
      for (let i = 0; i < n; i++) acc += capsuleTransmit(P[i * 6]!, P[i * 6 + 1]!, P[i * 6 + 2]!, P[i * 6 + 3]!, P[i * 6 + 4]!, P[i * 6 + 5]!, 0, 0.3, 0, 0, 1.45, 0, 0.3);
      sink[1] = acc;
    }, 0);
    console.info(`bytes per call: transmitQ ${tq.toFixed(1)}, transmitInto ${tr.toFixed(1)}, capsuleTransmit ${one.toFixed(1)}, control with a vector ${ctl.toFixed(1)}; ${shaded} of ${N} shaded`);
    // (the loop really walks capsules: a good share of the queries is shaded)
    expect(shaded).toBeGreaterThan(N / 10);
    expect(tq).toBeLessThan(HEAP_NUMBER);
    expect(tr).toBeLessThan(ctl - 32);
    expect(tr).toBeLessThanOrEqual(6 * HEAP_NUMBER);
    expect(one).toBeLessThanOrEqual(14 * HEAP_NUMBER);
  });
});

describe('no graphics state (CLAUDE.md: gameplay never reads graphics state; PLAN section 1)', () => {
  it('the contract, the field and the cue files read no preset, picker, quality, governor, rig or Babylon', () => {
    const files = ['src/world/charOccluders.ts', 'src/world/lightField.ts', 'src/world/shadowCues.ts', 'src/game/charOccluderFill.ts'];
    let read = 0;
    for (const f of files) {
      let src: string;
      try {
        src = readFileSync(f, 'utf8');
      } catch {
        // (shadowCues.ts is S3's, charOccluderFill.ts S2's: checked once they exist)
        continue;
      }
      read++;
      const imports = src.split('\n').filter((l) => /^\s*import\b/.test(l) || /\bimport\(/.test(l)).join('\n');
      expect(imports, f).not.toMatch(/core\/quality|qualityManager|governor|charShadowSet|charShadows|torchShadow|core\/babylon|@babylonjs|characterRig|\/rig|mesh/i);
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code, f).not.toMatch(/CHAR_SHADOW_PRESET|LampSlotPicker|charShadowSpec|ShadowQuality|governor|qualityManager/);
    }
    expect(read).toBeGreaterThanOrEqual(2);
  });
});

describe('the flag (BRIEF A9: dark until Michael\'s walk)', () => {
  it('flags.charShadowLight is false without ?charlight=1 and true with it', async () => {
    vi.resetModules();
    vi.stubGlobal('location', { search: '' });
    expect((await import('../src/core/flags')).flags.charShadowLight).toBe(false);
    vi.resetModules();
    vi.stubGlobal('location', { search: '?charlight=0' });
    expect((await import('../src/core/flags')).flags.charShadowLight).toBe(false);
    vi.resetModules();
    vi.stubGlobal('location', { search: '?debug=1&charlight=1' });
    expect((await import('../src/core/flags')).flags.charShadowLight).toBe(true);
    vi.unstubAllGlobals();
    vi.resetModules();
  });
});
