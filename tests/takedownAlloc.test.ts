// player-hygiene S3 (H3, H4 carry half): the takedown offer scan and the carry pick allocate nothing per step, and
// behave bit-identically.
//
// Parity record (PLAN "Slices"): the sweeps below were recorded from the unchanged master `pickTakedown` + `assistPlan`
// into `tests/fixtures/player-hygiene-s3.json` (`S3_RECORD=1`). Every run checks the allocating wrappers against it, and
// once the `...Into` forms exist (after the refactor) checks them too, through ONE reused scratch plan and `victimTo`
// buffer for the whole sweep (a field left over from the previous case would change the hash). Values are hashed as
// float64 bit patterns (cyrb53 over the two words, as `tests/helpers/animSkeletonIdentity.ts`), -0 kept as -0.
//
// The controller: `fixedUpdate` on a fake game (as `tests/coopWalkFixes.test.ts`) with 3 victims in reach and a stub
// ballistics: `bytesPerCall` for the scan and for a carry wait (asserted <= HEAP_NUMBER once the refactor is in; the
// reading is logged either way), and a started takedown keeps its plan when the next scan overwrites the scratch.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import * as TD from '../src/game/takedown';
import { assistPlan, pickTakedown, type AttackerState, type TakedownInput, type TakedownKind, type TakedownPlan } from '../src/game/takedown';
import { TakedownController, type TakedownVictim } from '../src/game/takedownController';
import type { GameState } from '../src/game/gameState';
import { bytesPerCall, HEAP_NUMBER } from './helpers/allocPerCall';

const FIXTURE = resolve(__dirname, 'fixtures/player-hygiene-s3.json');
const RECORD = !!process.env.S3_RECORD;
const DT = 1 / 60;

type Vec = { x: number; y: number; z: number };
type PickInto = (i: TakedownInput, out: TakedownPlan, to: Vec) => boolean;
type AssistInto = (ax: number, ay: number, az: number, vx: number, vy: number, vz: number, los: boolean, out: TakedownPlan) => boolean;
const api = TD as unknown as { pickTakedownInto?: PickInto; assistPlanInto?: AssistInto };
/** The refactor is in (the `...Into` forms exist). */
const REFACTORED = typeof api.pickTakedownInto === 'function' && typeof api.assistPlanInto === 'function';

class Hasher {
  private h1 = 0xdeadbeef;
  private h2 = 0x41c6ce57;
  private readonly f = new Float64Array(1);
  private readonly u = new Uint32Array(this.f.buffer);
  add(v: number): void {
    this.f[0] = v;
    for (let k = 0; k < 2; k++) {
      const c = this.u[k]!;
      this.h1 = Math.imul(this.h1 ^ c, 2654435761);
      this.h2 = Math.imul(this.h2 ^ c, 1597334677);
    }
  }
  digest(): string {
    let h1 = Math.imul(this.h1 ^ (this.h1 >>> 16), 2246822507);
    h1 ^= Math.imul(this.h2 ^ (this.h2 >>> 13), 3266489909);
    let h2 = Math.imul(this.h2 ^ (this.h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }
}

const KINDS: readonly TakedownKind[] = ['behind', 'front', 'side', 'overCover', 'corner', 'above', 'below', 'window', 'drop', 'inverted', 'hangDown', 'assist'];

interface Group {
  n: number;
  hash: string;
  kinds: Record<string, number>;
}

/** Hashes a sweep's results: every plan field (null as one marker). */
class GroupHash {
  private h = new Hasher();
  n = 0;
  kinds: Record<string, number> = {};
  add(p: TakedownPlan | null): void {
    this.n++;
    if (!p) {
      this.h.add(-1);
      this.kinds.null = (this.kinds.null ?? 0) + 1;
      return;
    }
    this.kinds[p.kind] = (this.kinds[p.kind] ?? 0) + 1;
    this.h.add(KINDS.indexOf(p.kind));
    this.h.add(p.alignX);
    this.h.add(p.alignY);
    this.h.add(p.alignZ);
    this.h.add(p.faceYaw);
    this.h.add(p.approach);
    this.h.add(p.arc);
    this.h.add(p.strike);
    if (p.victimTo) {
      this.h.add(1);
      this.h.add(p.victimTo.x);
      this.h.add(p.victimTo.y);
      this.h.add(p.victimTo.z);
    } else this.h.add(0);
  }
  done(): Group {
    return { n: this.n, hash: this.h.digest(), kinds: this.kinds };
  }
}

const STATES: readonly AttackerState[] = ['ground', 'wallLow', 'wall', 'hang', 'climb', 'zipline', 'duct', 'window', 'split', 'pipe', 'inverted', 'rappel', 'hangDown'];
const ATTACKERS: readonly (readonly [number, number, number])[] = [[0, 0, 0], [1.3, 0.7, -2.1]];
const DXZ = [-1.9, -1.1, -0.4, 0, 0.0004, 0.35, 0.8, 1.5];
const DY = [-5.3, -4.1, -2.6, -1.6, -1.15, -0.7, -0.3, 0, 0.25, 0.5, 0.9, 1.4, 2.0, 2.7];
const VYAW = [0, 0.9, 2.2, Math.PI, -1.7];
type Extra = Partial<Pick<TakedownInput, 'coverNx' | 'coverNz' | 'edgeX' | 'edgeZ' | 'edgeTx' | 'edgeTz' | 'winNx' | 'winNz'>>;
const COVERS: readonly Extra[] = [{}, { coverNx: 0, coverNz: 1 }, { coverNx: 0.6, coverNz: -0.8 }];
/** Edge ends relative to the attacker (shifted per attacker). */
const EDGES: readonly Extra[] = [{}, { edgeX: 0.5, edgeZ: 0.2, edgeTx: 1, edgeTz: 0 }, { edgeX: -0.3, edgeZ: 0.8, edgeTx: 0, edgeTz: -1 }];
const WINDOWS: readonly Extra[] = [{}, { winNx: Math.sin(0.4), winNz: Math.cos(0.4) }, { winNx: Math.sin(2.0), winNz: Math.cos(2.0) }];
const ALL_SET: Extra = { coverNx: 0.6, coverNz: -0.8, edgeX: 0.5, edgeZ: 0.2, edgeTx: 1, edgeTz: 0, winNx: Math.sin(0.4), winNz: Math.cos(0.4) };

function extrasFor(s: AttackerState): Extra[] {
  if (s === 'wall') return COVERS.flatMap((c) => EDGES.map((e) => ({ ...c, ...e })));
  if (s === 'wallLow') return COVERS.flatMap((c) => [EDGES[0]!, EDGES[1]!].map((e) => ({ ...c, ...e })));
  if (s === 'window') return [...WINDOWS];
  return [{}, ALL_SET];
}

/** Every input of one state's sweep, in a fixed order, into `i` (one object, as the controller's). */
function sweepPick(state: AttackerState, each: (i: TakedownInput) => void): void {
  const i: TakedownInput = { state, ax: 0, ay: 0, az: 0, vx: 0, vy: 0, vz: 0, vyaw: 0, vCalm: true, los: true };
  for (const [ax, ay, az] of ATTACKERS) {
    for (const ex of extrasFor(state)) {
      i.coverNx = ex.coverNx;
      i.coverNz = ex.coverNz;
      i.edgeX = ex.edgeX === undefined ? undefined : ax + ex.edgeX;
      i.edgeZ = ex.edgeZ === undefined ? undefined : az + ex.edgeZ!;
      i.edgeTx = ex.edgeTx;
      i.edgeTz = ex.edgeTz;
      i.winNx = ex.winNx;
      i.winNz = ex.winNz;
      for (const dx of DXZ)
        for (const dz of DXZ)
          for (const dy of DY)
            for (const vyaw of VYAW)
              for (const vCalm of [true, false])
                for (const los of [true, false]) {
                  i.ax = ax;
                  i.ay = ay;
                  i.az = az;
                  i.vx = ax + dx;
                  i.vy = ay + dy;
                  i.vz = az + dz;
                  i.vyaw = vyaw;
                  i.vCalm = vCalm;
                  i.los = los;
                  each(i);
                }
    }
  }
}

function sweepAssist(each: (ax: number, ay: number, az: number, vx: number, vy: number, vz: number, los: boolean) => void): void {
  for (const [ax, ay, az] of ATTACKERS)
    for (const dx of DXZ) for (const dz of DXZ) for (const dy of DY) for (const los of [true, false]) each(ax, ay, az, ax + dx, ay + dy, az + dz, los);
}

interface Fixture {
  pick: Record<string, Group>;
  assist: Group;
}

function wrapperFixture(): Fixture {
  const pick: Record<string, Group> = {};
  for (const s of STATES) {
    const h = new GroupHash();
    sweepPick(s, (i) => h.add(pickTakedown(i)));
    pick[s] = h.done();
  }
  const a = new GroupHash();
  sweepAssist((ax, ay, az, vx, vy, vz, los) => a.add(assistPlan(ax, ay, az, vx, vy, vz, los)));
  return { pick, assist: a.done() };
}

function blankPlan(): TakedownPlan {
  return { kind: 'front', alignX: NaN, alignY: NaN, alignZ: NaN, faceYaw: NaN, approach: NaN, arc: NaN, strike: NaN, victimTo: null };
}

/** The `...Into` forms over the same sweeps, one scratch plan and buffer throughout; `bad` counts a `victimTo` that is
 *  neither null nor the buffer. */
function intoFixture(): { fx: Fixture; bad: number } {
  const pickInto = api.pickTakedownInto!;
  const assistInto = api.assistPlanInto!;
  const out = blankPlan();
  const to: Vec = { x: NaN, y: NaN, z: NaN };
  let bad = 0;
  const pick: Record<string, Group> = {};
  for (const s of STATES) {
    const h = new GroupHash();
    sweepPick(s, (i) => {
      const ok = pickInto(i, out, to);
      if (ok && out.victimTo !== null && out.victimTo !== to) bad++;
      h.add(ok ? out : null);
    });
    pick[s] = h.done();
  }
  const a = new GroupHash();
  out.victimTo = to;
  sweepAssist((ax, ay, az, vx, vy, vz, los) => {
    const ok = assistInto(ax, ay, az, vx, vy, vz, los, out);
    if (ok && out.victimTo !== null) bad++;
    a.add(ok ? out : null);
  });
  return { fx: { pick, assist: a.done() }, bad };
}

describe('S3 parity: pickTakedown / assistPlan against the master record', () => {
  it('the wrappers equal the recorded master sweeps (every plan field, bit for bit)', () => {
    const now = wrapperFixture();
    if (RECORD) writeFileSync(FIXTURE, JSON.stringify(now, null, 2) + '\n');
    const rec = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
    // the sweep reaches every kind pickTakedown can return (the record has teeth)
    const seen = new Set<string>();
    for (const g of Object.values(rec.pick)) for (const k of Object.keys(g.kinds)) seen.add(k);
    for (const k of KINDS) if (k !== 'assist') expect(seen.has(k), k).toBe(true);
    expect(rec.assist.kinds.assist ?? 0).toBeGreaterThan(0);
    expect(now).toEqual(rec);
  }, 60_000);

  it.skipIf(!REFACTORED)('pickTakedownInto / assistPlanInto through one reused scratch equal the record', () => {
    const rec = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Fixture;
    const { fx, bad } = intoFixture();
    expect(bad).toBe(0);
    expect(fx).toEqual(rec);
  }, 60_000);
});

// ---- the controller on a fake game ----

type Victim = TakedownVictim & { begins: number };

function victim(id: string, x: number, z: number, yaw: number, kind: string): Victim {
  return {
    id,
    pos: new Vector3(x, 0, z),
    yaw,
    alive: true,
    def: { quadruped: false, kind, scale: 1 } as unknown as TakedownVictim['def'],
    alerted: false,
    level: 'unaware' as TakedownVictim['level'],
    bodyRig: { emote: null } as unknown as TakedownVictim['bodyRig'],
    taken: false,
    begins: 0,
    beginTakedown() {
      this.taken = true;
      this.begins++;
    },
    holdAt() {},
    releaseTakedown() {
      this.taken = false;
    },
    applyDamage() {
      return {} as ReturnType<TakedownVictim['applyDamage']>;
    },
    knockOut() {},
  };
}

/** A victim at (x, z) facing the attacker at the origin (`toward`) or away from him. */
function facing(id: string, x: number, z: number, toward: boolean, kind: string): Victim {
  return victim(id, x, z, toward ? Math.atan2(-x, -z) : Math.atan2(x, z), kind);
}

interface Stage {
  g: GameState;
  td: TakedownController;
  list: { vs: TakedownVictim[] };
  traversal: { attached: boolean; hintWindow: { yaw: number } | null };
  stealth: { carrying: boolean; picked: number; pickUpBody(): void };
}

function stage(vs: TakedownVictim[]): Stage {
  const pos = new Vector3(0, 0, 0);
  const list = { vs };
  const traversal = { attached: false, hintWindow: null as { yaw: number } | null, reset: () => undefined };
  const stealth = {
    carrying: false,
    picked: 0,
    pickUpBody() {
      this.picked++;
    },
  };
  const g = {
    player: {
      alive: true,
      position: pos,
      controller: { pos, override: null, speedCap: Infinity, standUp: () => undefined, gear: 2, crouched: false, yaw: 0, speed: 0 },
      pose: { melee: -1 },
      rig: { reachL: { x: 0, y: 0, z: 0, w: 0 }, reachR: { x: 0, y: 0, z: 0, w: 0 } },
    },
    stealth,
    takedownVictims: () => list.vs,
    team: { hangingDown: false, hangActs: false },
    spottedLocal: false,
    wallCore: null,
    traversal,
    // no hit (line of sight clear): `ray` as the other fakes, `hitDistance` a Smi past any segment here (no boxing)
    ballistics: { ray: () => ({ hit: false, distance: 0 }), hitDistance: () => 100 },
    target: { health: { hp: 100 } },
    events: { emit: () => undefined },
    enemyMgr: { bodies: [{ enemyId: 'b1' }, { enemyId: 'b2' }, { enemyId: 'b3' }], hear: () => undefined },
    strike: { active: false },
    net: null,
  };
  const gs = g as unknown as GameState;
  return { g: gs, td: new TakedownController(gs), list, traversal, stealth };
}

/** Three in reach, nearest first: two enforcers facing him (a frontal grab: refused), then a guard with his back to him
 *  (the grab from behind, on offer): every step tries all three. */
function threeInReach(): Victim[] {
  return [facing('e0', 0, 0.8, true, 'enforcer'), facing('e1', 0.9, 0.3, true, 'enforcer'), facing('e2', -0.5, -1.1, false, 'grunt')];
}

describe('S3 TakedownController: no allocation per step', () => {
  it('the scan (3 victims in reach, 3 tries, the third on offer)', async () => {
    const vs = threeInReach();
    const s = stage(vs);
    s.td.fixedUpdate(DT, false, false);
    expect(s.td.offer?.e).toBe(vs[2]);
    expect(s.td.offer?.plan.kind).toBe('behind');
    expect(s.td.offer?.lethalOnly).toBe(false);
    const td = s.td;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) td.fixedUpdate(DT, false, false);
    }, HEAP_NUMBER);
    console.info(`S3 scan: ${per.toFixed(1)} B per step (${REFACTORED ? 'refactored' : 'master'})`);
    expect(td.offer?.e).toBe(vs[2]);
    if (REFACTORED) expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
  }, 60_000);

  it('a carry wait (the body not there yet)', async () => {
    const s = stage([]);
    const priv = s.td as unknown as { carryId: string; carryT: number };
    priv.carryId = 'nope';
    priv.carryT = 1.5;
    const td = s.td;
    const per = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        priv.carryT = 1.5;
        td.fixedUpdate(DT, false, false);
      }
    }, HEAP_NUMBER);
    console.info(`S3 carry wait: ${per.toFixed(1)} B per step (${REFACTORED ? 'refactored' : 'master'})`);
    expect(priv.carryId).toBe('nope');
    expect(s.stealth.picked).toBe(0);
    if (REFACTORED) expect(per).toBeLessThanOrEqual(HEAP_NUMBER);
  }, 60_000);

  it('the carry pick still finds the first body with the id', () => {
    const s = stage([]);
    const priv = s.td as unknown as { carryId: string; carryT: number };
    priv.carryId = 'b2';
    priv.carryT = 1.5;
    s.td.fixedUpdate(DT, false, false);
    expect(s.stealth.picked).toBe(1);
    expect(priv.carryId).toBe('');
  });
});

describe('S3 the active plan never aliases the scan scratch', () => {
  it('a started takedown keeps its plan (and its victimTo) when the next scan overwrites the scratch', () => {
    // through a window (a plan with a victimTo): A across the sill on offer
    const a = victim('a', 0.3, 1.0, 0, 'grunt');
    const s = stage([a]);
    s.traversal.hintWindow = { yaw: 0 };
    s.td.fixedUpdate(DT, false, false);
    expect(s.td.offer?.plan.kind).toBe('window');
    expect(s.td.offer?.plan.victimTo).not.toBeNull();
    s.td.fixedUpdate(DT, true, true);
    const act = s.td.active!;
    expect(act).not.toBeNull();
    expect(act.e).toBe(a);
    const before = JSON.stringify(act.plan);
    // the next scan (as `fixedUpdate` runs it) on a different guard writes the scratch
    const b = victim('b', -0.8, 0.9, 1.1, 'grunt');
    s.list.vs = [b];
    const next = (s.td as unknown as { find(): { e: TakedownVictim; plan: TakedownPlan } | null }).find();
    expect(next?.e).toBe(b);
    expect(next?.plan.kind).toBe('window');
    expect(next?.plan.victimTo?.x).not.toBe(JSON.parse(before).victimTo.x);
    expect(JSON.stringify(act.plan)).toBe(before);
    expect(act.plan).not.toBe(next!.plan);
    expect(act.plan.victimTo).not.toBe(next!.plan.victimTo);
    // and it runs to the end on its own plan
    for (let k = 0; k < 200 && s.td.active; k++) s.td.fixedUpdate(DT, false, false);
    expect(s.td.active).toBeNull();
    expect(s.td.done.nonLethal).toBe(1);
    expect(s.td.done.byKind.window).toBe(1);
  });

  it('a grab started from the offer gets its own approach; the scratch keeps the scanned one', () => {
    const vs = threeInReach();
    const s = stage(vs);
    s.td.fixedUpdate(DT, false, false);
    s.td.start();
    const act = s.td.active!;
    expect(act.grab).not.toBeNull();
    expect(act.plan.kind).toBe('behind');
    expect(act.plan.approach).toBe(TD.GRAB.approach);
    s.list.vs = [vs[2]!];
    vs[2]!.taken = false;
    const next = (s.td as unknown as { find(): { plan: TakedownPlan } | null }).find();
    expect(next?.plan.kind).toBe('behind');
    expect(next?.plan.approach).toBe(TD.TAKEDOWN.approach);
    expect(act.plan.approach).toBe(TD.GRAB.approach);
  });
});

// (piano-knife S1) a knife kill's steps allocate nothing: the approach and the grab (the guard pulled to the row's spot),
// the move (both clips, the buckle) and the tail after `limp`, each held at its phase while it is measured
describe('piano-knife S1: a knife run allocates nothing per step', () => {
  it('approach, move and tail', async () => {
    const { loadKnifeClips, knifeClipsReady, KNIFE_KILLS } = await import('../src/game/knifeKill');
    await loadKnifeClips();
    expect(knifeClipsReady()).toBe(true);
    // the victim's knife half a class method, as `Enemy.knifeVictim` (it keeps what it is given, as his drive does)
    class KV {
      n = 0.5;
      knifeVictim(_c: unknown, p: number, b: number): void {
        this.n = p + b;
      }
    }
    const v = Object.assign(new KV(), facing('k0', 0, 0.8, false, 'grunt')) as unknown as Victim;
    const s = stage([v]);
    const gm = s.g as unknown as { weapons: unknown; player: { rig: Record<string, unknown> } };
    gm.weapons = { drawPhase: 0, knife: { show: () => undefined } };
    gm.player.rig.graph = { kill: null };
    s.td.fixedUpdate(DT, false, false);
    expect(s.td.offer?.plan.kind).toBe('behind');
    // (knife-kills) the lethal start is the knife kill
    s.td.start(true);
    expect(s.td.kr).toBe(0);
    const td = s.td;
    const act = td.active!;
    const R = KNIFE_KILLS[0]!;
    const priv = td as unknown as { kt: number };
    const at = (t: number, kt: number): ((n: number) => void) => (n) => {
      for (let k = 0; k < n; k++) {
        act.t = t;
        priv.kt = kt;
        td.fixedUpdate(DT, false, false);
      }
    };
    const perAp = await bytesPerCall(at(act.plan.approach * 0.8, 0), HEAP_NUMBER);
    const perMove = await bytesPerCall(at(act.plan.approach + 0.3, R.contact * R.seconds + 0.05), HEAP_NUMBER);
    // (piano-knife S2) the move samples the real clip through `sampleKeyed`, whose own cost (~32 B) is not this slice's:
    // the move may cost what that call alone costs on the same clip, as killDrive.test.ts allows
    const { sampleKeyed, newKeyedPose } = await import('../src/anim/keyed');
    const { MOCAP_LAYERS } = await import('../src/anim/mocap');
    const { knifeClip } = await import('../src/game/knifeKill');
    const kc = knifeClip(0, false)!;
    const kp = newKeyedPose();
    const perSample = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) sampleKeyed(kc, (k % 97) / 97, 1, kp, MOCAP_LAYERS);
    }, HEAP_NUMBER);
    console.info(`(piano-knife S1) knife run: ${perAp.toFixed(1)} B per step in the grab, ${perMove.toFixed(1)} in the move (sampleKeyed alone ${perSample.toFixed(1)})`);
    expect(perAp).toBeLessThanOrEqual(HEAP_NUMBER);
    expect(perMove).toBeLessThanOrEqual(perSample + HEAP_NUMBER);
    // run it to limp, then the tail held mid-way
    for (let k = 0; k < 200 && td.active; k++) td.fixedUpdate(DT, false, false);
    expect(td.active).toBeNull();
    expect(td.kr).toBe(0);
    const perTail = await bytesPerCall((n) => {
      for (let k = 0; k < n; k++) {
        priv.kt = R.seconds * 0.9;
        td.fixedUpdate(DT, false, false);
      }
    }, HEAP_NUMBER);
    console.info(`(piano-knife S1) knife tail: ${perTail.toFixed(1)} B per step`);
    expect(perTail).toBeLessThanOrEqual(HEAP_NUMBER);
  }, 120_000);
});
