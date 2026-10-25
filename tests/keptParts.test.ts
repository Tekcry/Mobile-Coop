/**
 * (map-ready S9) The kept parts holder (`src/core/keptParts.ts`): the pure part on fake textures (step 1).
 */
import { describe, expect, it } from 'vitest';
import { KEPT_TEXTURE_MB, KeptParts, textureBytes, type KeptTex } from '../src/core/keptParts';

/** A fake InternalTexture: counts references and disposes (as Babylon's: released at 0). */
class FakeTex implements KeptTex {
  _references = 1;
  disposed = 0;
  constructor(readonly width = 4, readonly height = 4) {}
  incrementReferences(): void {
    this._references++;
  }
  dispose(): void {
    this._references--;
    this.disposed++;
  }
}

const MB = 1024 * 1024;

function holder(): KeptParts {
  const k = new KeptParts();
  k.enabled = true;
  return k;
}

describe('KeptParts (pure)', () => {
  it('a hand-over holds one reference per texture, once (not per hand-over)', () => {
    const k = holder();
    const t = new FakeTex();
    const s1 = {};
    k.useTexture(s1, 'glb-img:1', t, false, 100);
    expect(t._references).toBe(1);
    k.handOver(s1);
    expect(t._references).toBe(2);
    // the scene's own Texture goes with its dispose: the held reference keeps it alive
    t.dispose();
    expect(t._references).toBe(1);
    // the next scene gets it from the engine cache (Babylon increments), uses it, hands over: no second hold
    const s2 = {};
    t.incrementReferences();
    k.useTexture(s2, 'glb-img:1', t, true, 100);
    k.handOver(s2);
    expect(t._references).toBe(2);
    expect(k.stats.heldTextures).toBe(1);
    expect(k.stats.texReused).toBe(1);
    expect(k.stats.texDecoded).toBe(1);
  });

  it('a texture unused in two consecutive hand-overs is disposed once', () => {
    const k = holder();
    const a = new FakeTex();
    const b = new FakeTex();
    const s1 = {};
    k.useTexture(s1, 'a', a, false, 10);
    k.useTexture(s1, 'b', b, false, 10);
    k.handOver(s1);
    // s2 uses only b; a was used by the hand-over before: kept
    const s2 = {};
    k.useTexture(s2, 'b', b, true, 10);
    k.handOver(s2);
    expect(a.disposed).toBe(0);
    expect(k.heldKeys().sort()).toEqual(['a', 'b']);
    // s3 uses only b: a is unused in two consecutive hand-overs (s2, s3): released once
    const s3 = {};
    k.useTexture(s3, 'b', b, true, 10);
    k.handOver(s3);
    expect(a.disposed).toBe(1);
    expect(k.heldKeys()).toEqual(['b']);
    // and never again
    k.handOver({});
    k.handOver({});
    expect(a.disposed).toBe(1);
    expect(b.disposed).toBe(1);
    expect(k.stats.heldTextures).toBe(0);
  });

  it('the byte budget drops the least recently used first', () => {
    const k = holder();
    k.budgetBytes = 3 * MB;
    const t = [new FakeTex(), new FakeTex(), new FakeTex(), new FakeTex()];
    const s1 = {};
    // used in order 0, 1, 2, 3; then 0 again (most recent)
    for (let i = 0; i < 4; i++) k.useTexture(s1, `t${i}`, t[i]!, false, MB);
    k.useTexture(s1, 't0', t[0]!, false, MB);
    k.handOver(s1);
    // 4 MB over 3 MB: t1 (the least recently used) goes
    expect(t[1]!.disposed).toBe(1);
    expect(t[0]!.disposed + t[2]!.disposed + t[3]!.disposed).toBe(0);
    expect(k.heldKeys().sort()).toEqual(['t0', 't2', 't3']);
    expect(k.stats.heldMb).toBe(3);
    expect(KEPT_TEXTURE_MB).toBe(256);
  });

  it('dropTextures disposes every held one once', () => {
    const k = holder();
    const a = new FakeTex();
    const b = new FakeTex();
    const s = {};
    k.useTexture(s, 'a', a, false, 1);
    k.useTexture(s, 'b', b, false, 1);
    k.handOver(s);
    k.dropTextures();
    expect([a.disposed, b.disposed]).toEqual([1, 1]);
    expect(k.stats.heldTextures).toBe(0);
    k.dropTextures();
    k.handOver({});
    expect([a.disposed, b.disposed]).toEqual([1, 1]);
  });

  it('a released texture is never held again; a new one under a held key replaces it', () => {
    const k = holder();
    const gone = new FakeTex();
    gone._references = 0;
    const s1 = {};
    k.useTexture(s1, 'x', gone, false, 1);
    k.handOver(s1);
    expect(gone._references).toBe(0);
    expect(k.stats.heldTextures).toBe(0);
    const a = new FakeTex();
    const s2 = {};
    k.useTexture(s2, 'y', a, false, 1);
    k.handOver(s2);
    const a2 = new FakeTex();
    const s3 = {};
    k.useTexture(s3, 'y', a2, false, 1);
    k.handOver(s3);
    expect(a.disposed).toBe(1);
    expect(a2._references).toBe(2);
    expect(k.heldKeys()).toEqual(['y']);
  });

  it('files unused in two consecutive hand-overs are forgotten (kit, props, art)', () => {
    const k = holder();
    const forgot: string[] = [];
    k.forgetFile = (u) => forgot.push(u);
    const s1 = {};
    k.useFile(s1, '/kit.glb', false);
    k.useFile(s1, '/props.glb', false);
    k.handOver(s1);
    const s2 = {};
    k.useFile(s2, '/kit.glb', true);
    k.handOver(s2);
    expect(forgot).toEqual([]);
    const s3 = {};
    k.useFile(s3, '/kit.glb', true);
    k.handOver(s3);
    expect(forgot).toEqual(['/props.glb']);
    expect(k.stats.filesFetched).toBe(2);
    expect(k.stats.filesReused).toBe(2);
  });

  it('enabled false: every call is a no-op (flag off = today)', () => {
    const k = new KeptParts();
    const t = new FakeTex();
    const forgot: string[] = [];
    k.forgetFile = (u) => forgot.push(u);
    const s = {};
    k.useTexture(s, 'a', t, false, 1);
    k.useFile(s, '/kit.glb', false);
    k.handOver(s);
    k.handOver({});
    k.handOver({});
    k.dropTextures();
    expect(t._references).toBe(1);
    expect(t.disposed).toBe(0);
    expect(forgot).toEqual([]);
    expect(k.stats).toEqual({ texReused: 0, texDecoded: 0, filesReused: 0, filesFetched: 0, heldTextures: 0, heldMb: 0 });
  });

  it('textureBytes: RGBA8 or KTX2, with the mip chain', () => {
    expect(textureBytes(1024, 1024, false)).toBe(Math.round((1024 * 1024 * 16) / 3));
    expect(textureBytes(1024, 1024, true)).toBe(Math.round((1024 * 1024 * 4) / 3));
  });
});
