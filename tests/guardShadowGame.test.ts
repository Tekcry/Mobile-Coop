/**
 * (guard-ai-j16 G4a / G4b, PLAN rows G4a / G4b, BRIEF A7, A9, A10) GameState's side of the guard shadows:
 * - `fillChars` (GameState's own method on a stub, no constructor): solo / host fills the guard side from the manager
 *   (`EnemyManager.fillOccluders`: guards, dogs and lying bodies keyed by number), a co-op client (no manager) keeps
 *   `fillVictims` for its puppets to the bit, the flag off (no contract) touches nothing; no allocation;
 * - the constructor: `enemyMgr.chars` and `enemyMgr.cues` set right after the manager is built, from the contract and
 *   `shadowCues` (both null with the flag off, `shadowCues` null on a client, which has no manager anyway). The getters
 *   carry a late set to a guard: tests/shadowNoticePerceive.test.ts "AiContext reads chars and cues through getters".
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { GameState } from '../src/game/gameState';
import { EnemyManager } from '../src/ai/enemyManager';
import type { PlayerRef } from '../src/ai/enemy';
import { DIFFICULTY } from '../src/ai/archetypes';
import { FILL, FILL_IN, fillPlayers, fillVictims } from '../src/game/charOccluderFill';
import { CharOccluders, OCC, OCC_KIND, occKey } from '../src/world/charOccluders';
import { Vector3, type Scene } from '../src/core/babylon';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { World } from '../src/world/world';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

// GameState's module graph reaches the PWA's Vite-only virtual module (the settings screen); nothing here uses it
vi.mock('virtual:pwa-register', () => ({ registerSW: () => async () => undefined }));

/** A real manager on stubs (as tests/shadowNoticePerceive.test.ts `manager`). */
function manager(): EnemyManager {
  const world = { level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] }, layout: { rooms: [] }, doors: { list: [] }, lightField: { totalAt: () => 0.5 } };
  const nav = { walk: new Uint8Array(4), version: 0, nearestWalkable: vi.fn(() => -1), lineClear: vi.fn(() => true), findPath: vi.fn(() => null), heightAt: vi.fn(() => 0), flowField: (_g: unknown, out: Float32Array) => out };
  return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => [] as readonly PlayerRef[]);
}

/** A guard or dog as `fillOccluders` reads it, and as `fillVictims` does (`def.height`). */
function ch(num: number, x: number, z: number, o: { dog?: boolean; alive?: boolean } = {}) {
  return { num, alive: o.alive ?? true, dog: o.dog ? {} : null, pos: new Vector3(x, 0, z), yaw: 0, simHead: new Vector3(x, 1.6, z + (o.dog ? 0.5 : 0)), occR: 0.21, def: { height: 1.8 } };
}
/** A lying body as `fillOccluders` reads it. */
function bd(num: number, x: number, z: number) {
  return { num, present: true, lie: { x, y: 0.13, z, headYaw: 0 }, occR: 0.13, occReach: 0.8, pos: new Vector3(x, 0.13, z) };
}

/** The fields `fillChars` reads, on GameState's prototype (no constructor: no scene, no Babylon). */
interface Stub {
  charOccluders: CharOccluders | null;
  enemyMgr: EnemyManager | null;
  takedownVictims: () => readonly unknown[];
  lightIn: Float64Array;
  charKeys: Int32Array;
  charRefs: PlayerRef[];
  charN: number;
  charFull: number;
  fillChars(): void;
}

/** One player (slot 0, the local one) at the origin; `em` the manager (solo / host) or null (a client, `puppets`). */
function game(occ: CharOccluders | null, em: EnemyManager | null, puppets: readonly unknown[] = []): Stub {
  const g = Object.create(GameState.prototype) as Stub;
  const lightIn = new Float64Array(FILL.players * FILL_IN);
  const local = { id: 'local' } as PlayerRef;
  Object.assign(g, {
    charOccluders: occ,
    enemyMgr: em,
    takedownVictims: () => puppets,
    lightIn,
    charKeys: new Int32Array(FILL.players),
    charRefs: [] as PlayerRef[],
    charN: 0,
    charFull: 0,
    charMatesInto: () => 0,
    playerRefsInto: (out: PlayerRef[]) => {
      if (out.length === 0) out.push(local);
      return out;
    },
    localSampleInto: (o: number) => {
      lightIn[o] = 0;
      lightIn[o + 1] = 0;
      lightIn[o + 2] = 0;
      lightIn[o + 3] = 1.3;
    },
  });
  return g;
}

const owners = (occ: CharOccluders): number[] => Array.from(occ.owner.subarray(0, occ.n));

describe('G4a: fillChars fills the guard side from the manager (solo / host)', () => {
  it('guards, dogs and lying bodies keyed by number after the players; dead and far skipped; no list-index key', () => {
    const em = manager();
    const list = em.enemies as unknown as ReturnType<typeof ch>[];
    list.push(ch(7, 1, 1), ch(8, 2, 2, { alive: false }), ch(9, 3, 3, { dog: true }), ch(10, 100, 100));
    (em.bodies as unknown as ReturnType<typeof bd>[]).push(bd(4, 0, 2));
    const occ = new CharOccluders();
    const g = game(occ, em, [{ alive: true, pos: new Vector3(5, 0, 5), def: { height: 1.8 } }]);
    const spy = vi.spyOn(em, 'fillOccluders');
    g.fillChars();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0]).toBe(occ);
    expect(spy.mock.calls[0]![2]).toBe(1);
    expect(g.charN).toBe(1);
    expect(g.charFull).toBe(0);
    expect(owners(occ)).toEqual([occKey(OCC_KIND.player, 0), occKey(OCC_KIND.guard, 7), occKey(OCC_KIND.dog, 9), occKey(OCC_KIND.body, 4)]);
    // the interim keys (list index 0 / 2) are gone, and `takedownVictims` is not read on solo / host
    expect(owners(occ)).not.toContain(occKey(OCC_KIND.guard, 0));
    expect(owners(occ)).not.toContain(occKey(OCC_KIND.guard, 2));
    // to the bit what the manager writes after fillPlayers
    const ref = new CharOccluders();
    fillPlayers(ref, g.lightIn, 1, new Int32Array(FILL.players));
    em.fillOccluders(ref, g.lightIn, 1);
    expect(ref.n).toBe(occ.n);
    expect(Array.from(occ.cap.subarray(0, occ.n * OCC.stride))).toEqual(Array.from(ref.cap.subarray(0, ref.n * OCC.stride)));
  });

  it('a full contract: the overflow is the manager\'s count', () => {
    const em = manager();
    const list = em.enemies as unknown as ReturnType<typeof ch>[];
    for (let i = 0; i < OCC.max + 3; i++) list.push(ch(30 + i, (i % 9) - 4, ((i / 9) | 0) - 4));
    const occ = new CharOccluders();
    const g = game(occ, em);
    g.fillChars();
    expect(occ.n).toBe(OCC.max);
    expect(g.charFull).toBe(4);
  });

  it('allocates nothing per fill', async () => {
    const em = manager();
    const list = em.enemies as unknown as ReturnType<typeof ch>[];
    for (let i = 0; i < 10; i++) list.push(ch(50 + i, i - 5, i % 3, { dog: i % 4 === 0 }));
    (em.bodies as unknown as ReturnType<typeof bd>[]).push(bd(70, 1, -2), bd(71, -1, -3));
    const occ = new CharOccluders();
    const g = game(occ, em);
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) g.fillChars();
    }, 0);
    expect(occ.n).toBe(13);
    expect(per).toBeLessThan(HEAP_NUMBER);
  }, 60000);
});

describe('G4a: the co-op client and the flag off are unchanged', () => {
  it('a client (no manager) keeps fillVictims for its puppets, to the bit', () => {
    const puppets = [ch(7, 1, 1), ch(8, 2, 2, { alive: false }), ch(9, 3, 3), ch(10, 100, 100)];
    const occ = new CharOccluders();
    const g = game(occ, null, puppets);
    g.fillChars();
    expect(owners(occ)).toEqual([occKey(OCC_KIND.player, 0), occKey(OCC_KIND.guard, 0), occKey(OCC_KIND.guard, 2)]);
    const ref = new CharOccluders();
    fillPlayers(ref, g.lightIn, 1, new Int32Array(FILL.players));
    const over = fillVictims(ref, puppets, g.lightIn, 1);
    expect(g.charFull).toBe(over);
    expect(ref.n).toBe(occ.n);
    expect(Array.from(occ.cap.subarray(0, occ.n * OCC.stride))).toEqual(Array.from(ref.cap.subarray(0, ref.n * OCC.stride)));
  });

  it('the flag off (no contract): nothing filled, the manager never asked', () => {
    const em = manager();
    (em.enemies as unknown as ReturnType<typeof ch>[]).push(ch(7, 1, 1));
    const spy = vi.spyOn(em, 'fillOccluders');
    const g = game(null, em);
    g.fillChars();
    expect(spy).not.toHaveBeenCalled();
    expect(g.charN).toBe(0);
    expect(g.charFull).toBe(0);
    expect(g.charRefs.length).toBe(0);
  });
});

describe('G4a / G4b: the constructor hands the contract and the cues to the manager', () => {
  /** Code without comments, CRLF read as LF. */
  const code = (f: string): string =>
    readFileSync(f, 'utf8').replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\n\s*\n/g, '\n');

  it('right after `new EnemyManager(`: chars = the contract, cues = shadowCues (built before it; null flag off / client)', () => {
    const gs = code('src/game/gameState.ts');
    expect(gs).toMatch(/\n {6}w\.enemyMgr = new EnemyManager\([^\n]*\);\n {6}w\.enemyMgr\.chars = this\.charOccluders;\n/);
    // one set, nowhere else
    expect(gs.match(/\.chars = /g)?.length).toBe(1);
    // shadowCues exists before the manager does (the constructor builds it after `puppet`)
    expect(gs.indexOf('this.shadowCues = shadowCuesFor(')).toBeGreaterThan(0);
    expect(gs.indexOf('this.shadowCues = shadowCuesFor(')).toBeLessThan(gs.indexOf('w.enemyMgr = new EnemyManager('));
    // the contract is the flag: null with it off, so the manager's reads stay today's
    expect(gs).toMatch(/readonly charOccluders: CharOccluders \| null = flags\.charShadowLight \? new CharOccluders\(\) : null;/);
    // only the non-puppet branch builds the manager (a client has none, and no cues)
    const at = gs.indexOf('w.enemyMgr = new EnemyManager(');
    expect(gs.lastIndexOf('} else if (opts.mode !== \'sandbox\') {', at)).toBeGreaterThan(gs.lastIndexOf('if (this.puppet) {', at));
  });

  it('fillChars: fillOccluders with a manager, fillVictims without, after the flag-off return', () => {
    const gs = code('src/game/gameState.ts');
    const i = gs.indexOf('private fillChars(): void {');
    const body = gs.slice(i, gs.indexOf('\n  }\n', i));
    expect(body).toContain('if (!occ) return;');
    expect(body).toMatch(/this\.charFull = em \? em\.fillOccluders\(occ, L, n\) : fillVictims\(occ, this\.takedownVictims\(\), L, n\);/);
    expect(body.indexOf('if (!occ) return;')).toBeLessThan(body.indexOf('fillOccluders'));
  });
});
