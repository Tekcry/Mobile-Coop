/**
 * (char-shadow-meter S2c, J16) A co-op client's partners in the character contract (`src/net/charMates.ts`; brief
 * `briefs/char-shadow-meter-s2c.md`, PLAN row S2c):
 * - (a) one shown partner fills slot 1 as the host fills a remote: feet, the rig's standing height and the crouch flag
 *   (the meter's sample height), on a wall the sim body's head (`posedHeadSample` of `playerBody`), dead on a wall none;
 * - (b) unshown partners are skipped, `max` caps the slots, `set` keeps an entry whose source is the same object;
 * - (b2, fix round 1) a partner the host holds as away (`PlayerInfo.away`) gets no slot, and gets it back when away clears;
 * - (c) the flag off runs as before: the hook is read only in `fillChars` after its flag-off return, the flag-off meter
 *   never reaches it, gameState and the fill never import `src/net`, and the client sets the hook only with the contract;
 * - (d) `into` allocates nothing per call;
 * - (e) two machines agree: the host's `RemotePlayer.ref` through `slotInto` and the client's `CharMates` from the same
 *   sim view give the same slot and the same capsule (real Havok on a NullEngine, the real `pstate` parse).
 * - (player-j16) loads: `loadsInto` walks as `into` does (same slot per partner), `hostLoadsInto` writes only the
 *   carrying refs' slots, host and client give the same load capsule, the hooks are set only with the contract and read
 *   only in `fillLoads`, and neither allocates.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import HavokPhysics from '@babylonjs/havok';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { HavokPlugin, Scene, Vector3 } from '../src/core/babylon';
import { GRAVITY } from '../src/physics/havok';
import { CharMates, hostLoadsInto, mateOrderInto, type MateSource } from '../src/net/charMates';
import { FILL, FILL_IN, fillOperator, fillPlayers, LOAD_IN, slotInto, type MateLike } from '../src/game/charOccluderFill';
import { lightSampleHeight } from '../src/game/bodyHeight';
import { posedHeadSample } from '../src/player/wallController';
import { emptyPlayerBodyIn, emptyPlayerBodyOut, playerBody, type PlayerBodyIn } from '../src/player/playerVolumes';
import { emptyMoveState, packMoveState } from '../src/player/moveState';
import { CharOccluders, OCC, OCC_KIND, occKey } from '../src/world/charOccluders';
import { parseMessage, PF, type PlayerState } from '../src/net/protocol';
import { RemotePlayer } from '../src/net/remotePlayer';
import { bytesPerCall, HEAP_NUMBER, inputs, sink } from './helpers/allocPerCall';

/** A source read with CRLF as LF (a Windows checkout, core.autocrlf=true). */
const lf = (s: string): string => s.replace(/\r\n/g, '\n');

/** Field by field, no allocation (the stub's `bodyIn`, as `RemoteAvatar.bodyIn` fills its `out`). */
function copyBodyIn(p: PlayerBodyIn, out: PlayerBodyIn): PlayerBodyIn {
  out.x = p.x;
  out.y = p.y;
  out.z = p.z;
  out.yaw = p.yaw;
  out.crouch = p.crouch;
  out.kneel = p.kneel;
  out.speed = p.speed;
  out.strafe = p.strafe;
  out.drawn = p.drawn;
  out.raise = p.raise;
  out.pitch = p.pitch;
  out.wall = p.wall;
  out.wallSide = p.wallSide;
  out.peek = p.peek;
  out.traverse = p.traverse;
  out.traverseT = p.traverseT;
  out.tumble = p.tumble;
  out.liftX = p.liftX;
  out.liftY = p.liftY;
  out.liftZ = p.liftZ;
  out.height = p.height;
  return out;
}

/** A `MateSource` with fixed fields; `pre` is the sim view its `bodyIn` copies. */
class Src implements MateSource {
  readonly pos: { x: number; y: number; z: number };
  flags = 0;
  dead = false;
  shown = true;
  readonly rig = { height: 1.68 };
  readonly pre = emptyPlayerBodyIn();
  constructor(x: number, y: number, z: number) {
    this.pos = { x, y, z };
    this.pre.x = x;
    this.pre.y = y;
    this.pre.z = z;
  }
  bodyIn(out: PlayerBodyIn): PlayerBodyIn {
    return copyBodyIn(this.pre, out);
  }
}

/** gameState.ts `rtCapsule`, as float32: [ax, ay, az, r, bx, by, bz]. */
const rt = (x: number, y: number, z: number, h: number): number[] =>
  [x, y + 0.25, z, 0.22, x, y + Math.max(0.5, h - 0.2), z].map((v) => Math.fround(v));
/** Capsule `i` of a contract as [ax, ay, az, r, bx, by, bz]. */
const capOf = (c: CharOccluders, i: number): number[] => {
  const o = i * OCC.stride;
  return [c.cap[o]!, c.cap[o + 1]!, c.cap[o + 2]!, c.cap[o + 6]!, c.cap[o + 3]!, c.cap[o + 4]!, c.cap[o + 5]!];
};
const slotOf = (pin: Float64Array, s: number): number[] => Array.from(pin.subarray(s * FILL_IN, (s + 1) * FILL_IN));
/** A `pin` with the local slot 0 set (feet at the origin, standing) and every other double NaN. */
const pinWithLocal = (): Float64Array => {
  const p = new Float64Array(FILL.players * FILL_IN).fill(Number.NaN);
  p.set([-5, 0, 0, 1.75, 0, 0], 0);
  return p;
};
/** A wall stance in a sim view: back to the wall, its right side, peeking half way. */
const onWall = (s: Src): void => {
  s.pre.wall = true;
  s.pre.wallSide = 1;
  s.pre.peek = 0.5;
  s.pre.yaw = 0.7;
};

describe('CharMates: one partner fills slot 1 (a)', () => {
  it('standing at (3, 0, 4): slot 1 is rtCapsule at lightSampleHeight(1.68, 0), owner occKey(player, 1); crouched: (1.68, 1)', () => {
    const m = new CharMates();
    const a = new Src(3, 0, 4);
    m.set([a]);
    const pin = pinWithLocal();
    expect(m.into(pin, 1, 4)).toBe(1);
    expect(slotOf(pin, 1)).toEqual([3, 0, 4, lightSampleHeight(1.68, 0), 0, 0]);
    const occ = new CharOccluders();
    const keys = new Int32Array(FILL.players).fill(-7);
    fillPlayers(occ, pin, 2, keys);
    expect(capOf(occ, 1)).toEqual(rt(3, 0, 4, lightSampleHeight(1.68, 0)));
    expect(keys[1]).toBe(occKey(OCC_KIND.player, 1));
    expect(occ.owner[1]).toBe(occKey(OCC_KIND.player, 1));
    // the crouch flag
    a.flags = PF.crouch | PF.grounded;
    expect(m.into(pin, 1, 4)).toBe(1);
    fillPlayers(occ, pin, 2, keys);
    expect(capOf(occ, 1)).toEqual(rt(3, 0, 4, lightSampleHeight(1.68, 1)));
    expect(m.refOf(0)!.crouched).toBe(true);
    // (the feet follow the source's position each call)
    a.pos.x = 3.5;
    m.into(pin, 1, 4);
    expect(pin[FILL_IN]).toBe(3.5);
  });

  it('on a wall the slot is posedHeadSample of playerBody(...).head; dead on a wall the head is null (the upright sample)', () => {
    const m = new CharMates();
    const a = new Src(3, 0, 4);
    onWall(a);
    m.set([a]);
    const pin = pinWithLocal();
    expect(m.into(pin, 1, 4)).toBe(1);
    const h = playerBody(copyBodyIn(a.pre, emptyPlayerBodyIn()), emptyPlayerBodyOut()).head;
    const hs = posedHeadSample(3, 0, 4, h.x, h.y, h.z, { ox: 0, oz: 0, h: 0 });
    expect(slotOf(pin, 1)).toEqual([3, 0, 4, hs.h, hs.ox, hs.oz]);
    expect(m.refOf(0)!.head).not.toBeNull();
    // (the posed head is not the upright sample: the case can fail)
    const flat = lightSampleHeight(1.68, 0);
    expect(Math.abs(hs.h - flat) + Math.abs(hs.ox) + Math.abs(hs.oz)).toBeGreaterThan(0.01);
    // dead, still on the wall: no posed head, the upright sample with no peek
    a.dead = true;
    expect(m.into(pin, 1, 4)).toBe(1);
    expect(m.refOf(0)!.head).toBeNull();
    expect(slotOf(pin, 1)).toEqual([3, 0, 4, flat, 0, 0]);
    // alive again: the head comes back
    a.dead = false;
    m.into(pin, 1, 4);
    expect(slotOf(pin, 1)).toEqual([3, 0, 4, hs.h, hs.ox, hs.oz]);
  });
});

describe('CharMates: skips and caps (b)', () => {
  it('an unshown source returns 0 and writes nothing to pin', () => {
    const m = new CharMates();
    const a = new Src(3, 0, 4);
    a.shown = false;
    m.set([a]);
    const pin = new Float64Array(FILL.players * FILL_IN).fill(Number.NaN);
    expect(m.into(pin, 1, 4)).toBe(0);
    for (let i = 0; i < pin.length; i++) expect(Number.isNaN(pin[i]!)).toBe(true);
    // (an empty list: 0 too)
    expect(new CharMates().into(pin, 1, 4)).toBe(0);
  });

  it('three sources from 2 with max 4 write 2 (slots 2 and 3, list order); an unshown one in between is skipped', () => {
    const m = new CharMates();
    const ss = [new Src(1, 0, 1), new Src(2, 0, 2), new Src(3, 0, 3)];
    m.set(ss);
    const pin = new Float64Array(FILL.players * FILL_IN).fill(Number.NaN);
    expect(m.into(pin, 2, 4)).toBe(2);
    expect(slotOf(pin, 2).slice(0, 3)).toEqual([1, 0, 1]);
    expect(slotOf(pin, 3).slice(0, 3)).toEqual([2, 0, 2]);
    for (let i = 0; i < 2 * FILL_IN; i++) expect(Number.isNaN(pin[i]!)).toBe(true);
    // the second one unshown: the first and the third fill slots 2 and 3
    ss[1]!.shown = false;
    expect(m.into(pin, 2, 4)).toBe(2);
    expect(slotOf(pin, 3).slice(0, 3)).toEqual([3, 0, 3]);
    // from 1: all three shown fill slots 1..3
    ss[1]!.shown = true;
    expect(m.into(pin, 1, 4)).toBe(3);
    expect(m.into(pin, 4, 4)).toBe(0);
  });

  it('set twice with the same source keeps the same ref object; a new source gets its own; order follows the list', () => {
    const m = new CharMates();
    const a = new Src(1, 0, 1);
    const b = new Src(2, 0, 2);
    m.set([a]);
    const ra = m.refOf(0);
    expect(ra).not.toBeNull();
    m.set([a]);
    expect(m.refOf(0)).toBe(ra);
    m.set([b, a]);
    expect(m.size).toBe(2);
    expect(m.refOf(1)).toBe(ra);
    expect(m.refOf(0)).not.toBe(ra);
    const pin = new Float64Array(FILL.players * FILL_IN);
    m.into(pin, 1, 4);
    expect(slotOf(pin, 1).slice(0, 3)).toEqual([2, 0, 2]);
    expect(slotOf(pin, 2).slice(0, 3)).toEqual([1, 0, 1]);
    // (dropped: gone)
    m.set([a]);
    expect(m.size).toBe(1);
    expect(m.refOf(0)).toBe(ra);
    expect(m.refOf(1)).toBeNull();
  });
});

describe('CharMates: a held partner counts on neither machine (b2, fix round 1)', () => {
  it('a partner the host holds as away gets no slot; when away clears it gets its slot back', () => {
    // the client's lobby (`s.players`): self, A, B; avatars for A and B (the host's snapshot still carries a held B)
    const players = [
      { id: 'me', away: false },
      { id: 'A', away: false },
      { id: 'B', away: false },
    ];
    const a = new Src(3, 0, 4);
    const b = new Src(-6, 0, 2);
    const avatars = new Map<string, Src>([
      ['A', a],
      ['B', b],
    ]);
    const order: Src[] = [];
    const m = new CharMates();
    const pin = pinWithLocal();
    m.set(mateOrderInto(players, 'me', avatars, order));
    expect(m.into(pin, 1, 4)).toBe(2);
    expect(slotOf(pin, 2).slice(0, 3)).toEqual([-6, 0, 2]);
    // B drops mid-match: the host's lobby marks it away (session.ts) and its `hold` takes it out of `remoteRefs`
    players[2]!.away = true;
    m.set(mateOrderInto(players, 'me', avatars, order));
    expect(order).toEqual([a]);
    pin.fill(Number.NaN, 2 * FILL_IN);
    expect(m.into(pin, 1, 4)).toBe(1);
    expect(slotOf(pin, 1).slice(0, 3)).toEqual([3, 0, 4]);
    expect(slotOf(pin, 2).every((v) => Number.isNaN(v))).toBe(true);
    // B rejoins: the hello clears away; its slot is back
    players[2]!.away = false;
    m.set(mateOrderInto(players, 'me', avatars, order));
    expect(order).toEqual([a, b]);
    expect(m.into(pin, 1, 4)).toBe(2);
    expect(slotOf(pin, 2).slice(0, 3)).toEqual([-6, 0, 2]);
    // the client's relist goes through it, on every lobby event (where away is set and cleared)
    const cc = lf(readFileSync('src/net/coopClient.ts', 'utf8'));
    const i = cc.indexOf('private relistMates(): void {');
    expect(i).toBeGreaterThan(0);
    expect(cc.slice(i, cc.indexOf('\n  }\n', i))).toContain('mateOrderInto(this.s.players.values(), this.s.selfId, this.avatars, this.mateOrder, this.partnerOut)');
    expect(cc).toMatch(/s\.events\.on\('lobby', \(\) => \{\n\s*this\.recolour\(\);\n\s*this\.relistMates\(\);/);
  });
});

describe('CharMates: an out partner counts on neither machine (coop4 merge 6 F2)', () => {
  it('a partner the OUT test names gets no slot; back in, it gets its slot back; the client relists on an OUT change', () => {
    const players = [
      { id: 'me', away: false },
      { id: 'A', away: false },
      { id: 'B', away: false },
    ];
    const a = new Src(3, 0, 4);
    const b = new Src(-6, 0, 2);
    const avatars = new Map<string, Src>([
      ['A', a],
      ['B', b],
    ]);
    const order: Src[] = [];
    let outB = true;
    const isOut = (id: string): boolean => outB && id === 'B';
    expect(mateOrderInto(players, 'me', avatars, order, isOut)).toEqual([a]);
    outB = false;
    expect(mateOrderInto(players, 'me', avatars, order, isOut)).toEqual([a, b]);
    // the default: nobody out
    expect(mateOrderInto(players, 'me', avatars, order)).toEqual([a, b]);
    const cc = lf(readFileSync('src/net/coopClient.ts', 'utf8'));
    expect(cc).toContain('private readonly partnerOut = (id: string): boolean => slotOut(this.outMask, this.s.slotOf(id));');
    const i = cc.indexOf('private onSector(');
    const mask = cc.indexOf('this.outMask = om;', i);
    expect(mask).toBeGreaterThan(i);
    expect(cc.slice(mask, cc.indexOf('\n    }\n', mask))).toContain('this.relistMates();');
  });
});

describe('fillChars: an out local player shifts no partner off its slot (coop4 merge 6 F1, source level)', () => {
  it('slots 1+ skip the local ref, and updateLight writes each slot back through charRefAt', () => {
    const gs = lf(readFileSync('src/game/gameState.ts', 'utf8'));
    const fi = gs.indexOf('private fillChars(): void {');
    const fill = gs.slice(fi, gs.indexOf('\n  }\n', fi));
    expect(fill).toContain('if (r === this.localRef) continue;');
    expect(fill).toContain('at[nr++] = i;');
    expect(fill).not.toMatch(/slotInto\(L, s, refs\[s\]/);
    const ui = gs.indexOf('private updateLight(dt: number): void {');
    const ul = gs.slice(ui, gs.indexOf('\n  }\n', ui));
    expect(ul).toContain('this.charRefAt[s]');
    expect(ul).not.toContain('this.charRefs[s]!.light');
  });
});

describe('CharMates: the flag off runs as before (c, source level)', () => {
  /** Code without comments, CRLF read as LF (a Windows checkout, core.autocrlf=true; as tests/animGear.test.ts `lf`). */
  const code = (f: string): string => lf(readFileSync(f, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
  /** A method's body from its signature line to the first line closing it at two spaces. */
  const method = (src: string, sig: string): string => {
    const i = src.indexOf(sig);
    expect(i, sig).toBeGreaterThanOrEqual(0);
    const j = src.indexOf('\n  }\n', i);
    expect(j).toBeGreaterThan(i);
    return src.slice(i, j);
  };

  it('gameState: charMatesInto only in its declaration and in fillChars after `if (!occ) return;`; the flag-off meter never reaches it', () => {
    const gs = code('src/game/gameState.ts');
    const all = gs.match(/\bcharMatesInto\b/g) ?? [];
    expect(all.length).toBe(2);
    expect(gs).toMatch(/\n\s*charMatesInto: \(pin: Float64Array, from: number, max: number\) => number = NO_MATES;/);
    const fill = method(gs, 'private fillChars(): void {');
    const ret = fill.indexOf('if (!occ) return;');
    const call = fill.indexOf('this.charMatesInto(');
    expect(ret).toBeGreaterThan(0);
    expect(call).toBeGreaterThan(ret);
    expect(fill.match(/\bcharMatesInto\b/g)?.length).toBe(1);
    // the flag-off branch of updateLight: after the contract branch's `return;`
    const ul = method(gs, 'private updateLight(dt: number): void {');
    const on = ul.indexOf('if (occ) {');
    expect(on).toBeGreaterThan(0);
    const off = ul.slice(ul.indexOf('\n      return;\n    }\n', on));
    expect(off).toContain('this.localSampleInto(0);');
    expect(off).toContain('const rs = this.remotePlayers();');
    expect(off).not.toMatch(/charMates|slotInto/);
  });

  it('gameState.ts and charOccluderFill.ts import nothing from src/net; the client sets the hook only inside `if (g.charOccluders`', () => {
    for (const f of ['src/game/gameState.ts', 'src/game/charOccluderFill.ts']) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/from '\.\.\/net\/|from '\.\.\/\.\.\/net\//);
      expect(src, f).not.toMatch(/import\(['"]\.\.\/(\.\.\/)?net\//);
    }
    const cc = code('src/net/coopClient.ts');
    const sets = [...cc.matchAll(/g\.charMatesInto =/g)].map((m) => m.index);
    expect(sets.length).toBeGreaterThanOrEqual(1);
    const open = cc.indexOf('if (g.charOccluders) {');
    expect(open).toBeGreaterThan(0);
    const close = cc.indexOf('\n    }\n', open);
    for (const at of sets) {
      expect(at).toBeGreaterThan(open);
      expect(at).toBeLessThan(close);
    }
    // (coopClient reads gameState as a type only)
    expect(lf(readFileSync('src/net/coopClient.ts', 'utf8'))).toMatch(/import type \{[^}]*\bGameState\b[^}]*\} from '\.\.\/game\/gameState'/);
  });
});

describe('CharMates: no allocation per call (d)', () => {
  it('into(pin, 1, 4) with three shown partners, one on a wall, reads under one HeapNumber per call; a vector per call reads 32 B+', async () => {
    const m = new CharMates();
    const ss = [new Src(3, 0, 4), new Src(-6, 0, 2), new Src(1, 3, -9)];
    onWall(ss[0]!);
    ss[1]!.flags = PF.crouch;
    m.set(ss);
    const pin = pinWithLocal();
    const N = 2000;
    const per = (fn: (n: number) => void, goal: number): Promise<number> => bytesPerCall(fn, goal, { n: N, warm: 100000 });
    const into = await per((n) => {
      for (let i = 0; i < n; i++) sink[0] = m.into(pin, 1, 4);
    }, 0);
    const P = inputs(N * 3, (k) => k * 0.5);
    const ring: object[] = new Array<object>(64);
    const ctl = await per((n) => {
      for (let i = 0; i < n; i++) {
        const v = { x: P[i * 3]!, y: P[i * 3 + 1]!, z: P[i * 3 + 2]! };
        ring[i & 63] = v;
      }
    }, -Infinity);
    console.info(`bytes per call: CharMates.into (3 partners, 1 on a wall) ${into.toFixed(1)}, control with a vector ${ctl.toFixed(1)}`);
    expect(m.into(pin, 1, 4)).toBe(3);
    expect(m.refOf(0)!.head).not.toBeNull();
    expect(into).toBeLessThan(HEAP_NUMBER);
    expect(ctl).toBeGreaterThanOrEqual(32);
  }, 120_000);
});

// (after (d): the host's `RemotePlayer.ref` is a second ref shape at `slotInto`'s loads, which (d)'s one-machine
// reading must not inherit)
describe('CharMates: two machines agree (e)', () => {
  const DT = 1 / 60;
  let engine: NullEngine;
  let scene: Scene;

  beforeAll(async () => {
    const wasm = readFileSync(path.resolve('node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'));
    const hk = await HavokPhysics({ wasmBinary: wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer });
    engine = new NullEngine();
    scene = new Scene(engine);
    const plugin = new HavokPlugin(false, hk);
    plugin.setTimeStep(DT);
    scene.enablePhysics(GRAVITY, plugin);
  });

  afterAll(() => {
    scene?.dispose();
    engine?.dispose();
  });

  /** 90 states at 60 Hz through the real `pstate` parse into the host's `RemotePlayer`; after each, the host's slot
   *  (`slotInto` of `rp.ref`) and the client's (`CharMates.into` from the same sim view) and their capsules. Returns
   *  the worst difference and whether the host's head was set on the last state. */
  function run(x0: number, z0: number, f: number, wall: boolean): { worst: number; head: boolean } {
    const registry = { register() {}, removeTarget() {} } as never;
    const avatar = { rig: { height: 1.68 }, dispose() {} } as never;
    const rp = new RemotePlayer(scene, registry, 'client', avatar, new Vector3(x0, 0, z0));
    const src = new Src(x0, 0, z0);
    src.flags = f;
    // the client's own sim view of the partner is the host's: the source's bodyIn copies `rp.bodyIn`
    src.bodyIn = (out: PlayerBodyIn): PlayerBodyIn => copyBodyIn(rp.bodyIn, out);
    const mates = new CharMates();
    mates.set([src]);
    const pinH = pinWithLocal();
    const pinC = pinWithLocal();
    const occH = new CharOccluders();
    const occC = new CharOccluders();
    const kH = new Int32Array(FILL.players);
    const kC = new Int32Array(FILL.players);
    const mv = packMoveState({ ...emptyMoveState(), m: wall ? 'wall' : 'ground', a: wall ? 0 : -1, dw: 2 });
    let worst = 0;
    let head = false;
    for (let k = 0; k < 90; k++) {
      const msg = parseMessage({ t: 'pstate', s: { id: 'client', x: x0, y: 0, z: z0, yaw: 0.4, pitch: 0, speed: 0, f, w: 'pistolSd', hp: 100, mv } });
      expect(msg?.t).toBe('pstate');
      const st = (msg as { s: PlayerState }).s;
      rp.accept(st, (k + 1) * DT);
      // the client's view: the state's feet and flags
      src.pos.x = st.x;
      src.pos.y = st.y;
      src.pos.z = st.z;
      src.flags = st.f;
      slotInto(pinH, 1, rp.ref);
      expect(mates.into(pinC, 1, 4)).toBe(1);
      const hostHead = !!rp.ref.head;
      const clientHead = !!mates.refOf(0)!.head;
      expect(clientHead, `state ${k}`).toBe(hostHead);
      head = hostHead;
      for (let i = 0; i < FILL_IN; i++) worst = Math.max(worst, Math.abs(pinH[FILL_IN + i]! - pinC[FILL_IN + i]!));
      fillPlayers(occH, pinH, 2, kH);
      fillPlayers(occC, pinC, 2, kC);
      const a = capOf(occH, 1);
      const b = capOf(occC, 1);
      for (let i = 0; i < 7; i++) worst = Math.max(worst, Math.abs(a[i]! - b[i]!));
      expect(Array.from(kC)).toEqual(Array.from(kH));
    }
    expect(Array.from(rp.feet.asArray())).toEqual([x0, 0, z0]);
    return { worst, head };
  }

  it('standing: every pin double and capsule float within 1e-6, no head on either', () => {
    const r = run(-10, 0, PF.grounded, false);
    expect(r.worst).toBeLessThanOrEqual(1e-6);
    expect(r.head).toBe(false);
  });

  it('crouched still: within 1e-6, no head on either', () => {
    const r = run(0, 10, PF.crouch | PF.grounded, false);
    expect(r.worst).toBeLessThanOrEqual(1e-6);
    expect(r.head).toBe(false);
  });

  it('on a wall: within 1e-6, the posed head on both', () => {
    const r = run(10, -10, PF.grounded, true);
    expect(r.worst).toBeLessThanOrEqual(1e-6);
    expect(r.head).toBe(true);
  });
});

// (player-j16) Last in the file: its sources are a second shape at `into`'s loads, which (d)'s reading must not inherit.
describe('loads (player-j16)', () => {
  /** A `MateSource` with the optional carry fields (`RemoteAvatar`'s): carrying while `carryKnees` is set. */
  class Carrier extends Src {
    yaw = 0;
    carrySide = 1;
    carryKnees: object | null = null;
  }
  const linOf = (fill = 0): Float64Array => new Float64Array(FILL.players * LOAD_IN).fill(fill);
  const loadOf = (lin: Float64Array, s: number): number[] => [lin[s * LOAD_IN]!, lin[s * LOAD_IN + 1]!];
  /** Capsule `i` of a contract as its 7 floats and kind. */
  const capAll = (c: CharOccluders, i: number): number[] => Array.from(c.cap.subarray(i * OCC.stride, (i + 1) * OCC.stride));
  const code = (f: string): string => lf(readFileSync(f, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
  const method = (src: string, sig: string): string => {
    const i = src.indexOf(sig);
    expect(i, sig).toBeGreaterThanOrEqual(0);
    const j = src.indexOf('\n  }\n', i);
    expect(j).toBeGreaterThan(i);
    return src.slice(i, j);
  };

  it('(9) loadsInto walks as into: the carrying third partner (the middle one unshown) gets slot 2 with (-1, 0.7) there, every other slot 0; max caps both alike', () => {
    const m = new CharMates();
    const plain = new Src(1, 0, 1);
    const hidden = new Carrier(2, 0, 2);
    hidden.shown = false;
    hidden.carryKnees = {};
    const third = new Carrier(3, 0, 3);
    third.carryKnees = {};
    third.carrySide = -1;
    third.yaw = 0.7;
    m.set([plain, hidden, third]);
    const pin = pinWithLocal();
    expect(m.into(pin, 1, 4)).toBe(2);
    expect(slotOf(pin, 2).slice(0, 3)).toEqual([3, 0, 3]);
    const lin = linOf();
    m.loadsInto(lin, 1, 4);
    expect(loadOf(lin, 2)).toEqual([-1, 0.7]);
    for (const s of [0, 1, 3]) expect(loadOf(lin, s), `slot ${s}`).toEqual([0, 0]);
    // (a source without the optional fields, and one with them but not carrying: nothing written)
    const idle = new Carrier(4, 0, 4);
    m.set([plain, idle]);
    const l2 = linOf(Number.NaN);
    m.loadsInto(l2, 1, 4);
    expect(Array.from(l2).every((v) => Number.isNaN(v))).toBe(true);
    // (any side but -1 is the right shoulder; the yaw as shown)
    idle.carryKnees = {};
    idle.carrySide = 1;
    idle.yaw = -2.5;
    m.loadsInto(l2, 1, 4);
    expect(loadOf(l2, 2)).toEqual([1, -2.5]);
    // max: into and loadsInto stop at the same slot (the carrier past it gets nothing)
    m.set([plain, hidden, third]);
    pin.fill(Number.NaN, FILL_IN);
    expect(m.into(pin, 1, 2)).toBe(1);
    expect(slotOf(pin, 2).every((v) => Number.isNaN(v))).toBe(true);
    const l3 = linOf();
    m.loadsInto(l3, 1, 2);
    expect(Array.from(l3).every((v) => v === 0)).toBe(true);
    // (from 2: the carrier takes slot 3 in both)
    expect(m.into(pin, 2, 4)).toBe(2);
    expect(slotOf(pin, 3).slice(0, 3)).toEqual([3, 0, 3]);
    m.loadsInto(l3, 2, 4);
    expect(loadOf(l3, 3)).toEqual([-1, 0.7]);
    expect(loadOf(l3, 2)).toEqual([0, 0]);
  });

  it('(10) hostLoadsInto: refs [local, A, B], a carry view for B (side 1, yaw -1.2): slot 2 written, slots 0 and 1 left; an id not in refs ignored', () => {
    const refs = [{ id: 'me' }, { id: 'A' }, { id: 'B' }];
    const carries = new Map([
      ['B', { avatar: { carrySide: 1, yaw: -1.2 } }],
      ['Z', { avatar: { carrySide: -1, yaw: 3 } }],
    ]);
    const lin = linOf(9);
    hostLoadsInto(lin, refs, 3, carries);
    expect(loadOf(lin, 2)).toEqual([1, -1.2]);
    expect([...loadOf(lin, 0), ...loadOf(lin, 1), ...loadOf(lin, 3)]).toEqual([9, 9, 9, 9, 9, 9]);
    // (the host's own carry is slot 0's, never read from the map; side -1 is the left; nr caps the slots)
    carries.set('me', { avatar: { carrySide: -1, yaw: 1 } });
    carries.set('A', { avatar: { carrySide: -1, yaw: 0.25 } });
    const l2 = linOf(9);
    hostLoadsInto(l2, refs, 2, carries);
    expect(loadOf(l2, 0)).toEqual([9, 9]);
    expect(loadOf(l2, 1)).toEqual([-1, 0.25]);
    expect(loadOf(l2, 2)).toEqual([9, 9]);
  });

  it('(11) two machines: the host slot from hostLoadsInto and the client partner slot from loadsInto give the same load capsule', () => {
    for (const [f, side, yaw] of [[PF.grounded, -1, 0.9], [PF.crouch | PF.grounded, 1, -2.4]] as const) {
      // host: client X is ref slot 1 (`RemotePlayer.ref`'s fields), its carry view's avatar
      const refX: MateLike & { id: string } = { id: 'X', feet: { x: 4, y: 0.5, z: -3 }, crouched: (f & PF.crouch) !== 0, height: 1.68 };
      const pinH = pinWithLocal();
      slotInto(pinH, 1, refX);
      const linH = linOf();
      hostLoadsInto(linH, [{ id: 'me' }, refX], 2, new Map([['X', { avatar: { carrySide: side, yaw } }]]));
      // client: X is a partner (the same feet, flags, rig height), its avatar carrying with the same side and yaw
      const src = new Carrier(4, 0.5, -3);
      src.flags = f;
      src.carryKnees = {};
      src.carrySide = side;
      src.yaw = yaw;
      const m = new CharMates();
      m.set([src]);
      const pinC = pinWithLocal();
      const n = 1 + m.into(pinC, 1, FILL.players);
      expect(n).toBe(2);
      const linC = linOf();
      m.loadsInto(linC, 1, n);
      expect(Array.from(linC)).toEqual(Array.from(linH));
      const occH = new CharOccluders();
      const occC = new CharOccluders();
      const kH = new Int32Array(FILL.players);
      const kC = new Int32Array(FILL.players);
      fillPlayers(occH, pinH, 2, kH);
      fillPlayers(occC, pinC, 2, kC);
      expect(fillOperator(occH, pinH, linH, 2, kH)).toBe(0);
      expect(fillOperator(occC, pinC, linC, 2, kC)).toBe(0);
      expect(occH.n).toBe(3);
      expect(occC.n).toBe(3);
      expect(capAll(occC, 2)).toEqual(capAll(occH, 2));
      expect(occH.owner[2]).toBe(occKey(OCC_KIND.player, 1));
      expect(occC.owner[2]).toBe(occH.owner[2]);
    }
  });

  it('(12) source: charLoadsInto only in its declaration and in fillLoads after `if (!occ) return;`; fillLoads right after fillChars; the hosts set it only inside `if (g.charOccluders`', () => {
    const gs = code('src/game/gameState.ts');
    expect(gs.match(/\bcharLoadsInto\b/g)?.length).toBe(2);
    expect(gs).toMatch(/\n\s*charLoadsInto: \(\(lin: Float64Array, refs: readonly PlayerRef\[\], nr: number, n: number\) => void\) \| null = null;/);
    const fl = method(gs, 'private fillLoads(): void {');
    const ret = fl.indexOf('if (!occ) return;');
    expect(ret).toBeGreaterThan(0);
    expect(fl.indexOf('this.charLoadsInto?.(')).toBeGreaterThan(ret);
    expect(fl.indexOf('fillOperator(')).toBeGreaterThan(ret);
    expect(gs).toMatch(/\n(\s*)this\.fillChars\(\);\n\1this\.fillLoads\(\);\n/);
    expect(gs.match(/this\.fillLoads\(\);/g)?.length).toBe(1);
    expect(method(gs, 'private fillChars(): void {')).not.toContain('fillOperator');
    for (const f of ['src/net/coopHost.ts', 'src/net/coopClient.ts']) {
      const src = code(f);
      const sets = [...src.matchAll(/g\.charLoadsInto =/g)].map((x) => x.index);
      expect(sets.length, f).toBe(2);
      for (const at of sets) {
        const open = src.lastIndexOf('if (g.charOccluders) {', at);
        expect(open, f).toBeGreaterThan(0);
        expect(src.indexOf('\n    }\n', open), f).toBeGreaterThan(at);
      }
    }
    // (gameState.ts and charOccluderFill.ts import nothing from src/net: the (c) case above, unedited)
  });

  it('(13) loadsInto(lin, 1, 4) with three partners and hostLoadsInto with three refs read under one HeapNumber per call', async () => {
    const m = new CharMates();
    const ss = [new Carrier(3, 0, 4), new Carrier(-6, 0, 2), new Carrier(1, 3, -9)];
    ss[0]!.carryKnees = {};
    ss[0]!.yaw = 1.1;
    ss[2]!.carryKnees = {};
    ss[2]!.carrySide = -1;
    ss[2]!.yaw = -0.4;
    m.set(ss);
    const lin = linOf();
    const refs = [{ id: 'me' }, { id: 'A' }, { id: 'B' }, { id: 'C' }];
    const carries = new Map([
      ['A', { avatar: { carrySide: 1, yaw: 0.3 } }],
      ['C', { avatar: { carrySide: -1, yaw: 2.2 } }],
    ]);
    const N = 2000;
    const per = (fn: (n: number) => void, goal: number): Promise<number> => bytesPerCall(fn, goal, { n: N, warm: 100000 });
    const mates = await per((n) => {
      for (let i = 0; i < n; i++) m.loadsInto(lin, 1, 4);
    }, 0);
    const host = await per((n) => {
      for (let i = 0; i < n; i++) hostLoadsInto(lin, refs, 4, carries);
    }, 0);
    const P = inputs(N * 3, (k) => k * 0.5);
    const ring: object[] = new Array<object>(64);
    const ctl = await per((n) => {
      for (let i = 0; i < n; i++) {
        const v = { x: P[i * 3]!, y: P[i * 3 + 1]!, z: P[i * 3 + 2]! };
        ring[i & 63] = v;
      }
    }, -Infinity);
    console.info(`bytes per call: CharMates.loadsInto (3 partners, 2 carrying) ${mates.toFixed(1)}, hostLoadsInto (3 refs, 2 carrying) ${host.toFixed(1)}, control with a vector ${ctl.toFixed(1)}`);
    const l2 = linOf();
    m.loadsInto(l2, 1, 4);
    expect([...loadOf(l2, 1), ...loadOf(l2, 2), ...loadOf(l2, 3)]).toEqual([1, 1.1, 0, 0, -1, -0.4]);
    sink[0] = lin[2]!;
    expect(mates).toBeLessThan(HEAP_NUMBER);
    expect(host).toBeLessThan(HEAP_NUMBER);
    expect(ctl).toBeGreaterThanOrEqual(32);
  }, 120_000);
});
