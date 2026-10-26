import { describe, expect, it, vi } from 'vitest';
import { Enemy } from '../src/ai/enemy';
import { ARCHETYPE, DIFFICULTY } from '../src/ai/archetypes';
import { ENEMIES, type EnemyKind } from '../src/ai/enemyDefs';
import { P_STANDARD, R_NONE, Rng } from '../src/ai/squadRoles';
import { Vector3 } from '../src/core/babylon';
import { bytesPerCall } from './helpers/allocPerCall';

// (guard-ai runner-armed, G298) The runner is armed: in a fight he draws and fires like the other armed kinds (no
// strike, no lunge), and keeps his two runner rules: he weaves on the run in (`ARCHETYPE.runner.weave`) and presses in
// while he fires (`ARCHETYPE.runner.pressIn`). Stand-in guards built on Enemy's prototype (no rig, no scene), the
// pattern of guardPolishA's role probe: alerted, outside stealth, the target's feet at the origin.

const DT = 1 / 60;
let n = 0;

type Goal = { point: [number, number] | null; speed: number; face: number | null };

interface ProbeP {
  state: string;
  stateT: number;
  meleeCd: number;
  pos: Vector3;
  knownPt: [number, number];
  tryFire: (dt: number, mode?: string) => void;
  decide(dt: number): Goal;
}

function probe(o: { kind?: EnemyKind; state: string; los: boolean; dist: number; stateT?: number; x?: number }) {
  const applyDamage = vi.fn();
  const target = { id: 'p1', feet: new Vector3(0, 0, 0), speed: 0, crouched: false, cover: null, coverT: 0, target: { applyDamage, aimPoint: (v: Vector3) => v.set(0, 1, 0), headPoint: (v: Vector3) => v.set(0, 1.6, 0) } };
  const e = Object.create(Enemy.prototype) as Enemy;
  const ctx = {
    cover: [],
    coverSegments: [],
    nav: { isWalkable: () => true, cellOf: () => 0, lineClear: () => true },
    reserveCover: vi.fn(() => false),
    releaseCover: vi.fn(),
    stealth: () => false,
    coordinated: () => false,
    diff: DIFFICULTY.normal,
    players: () => [],
    alarmRaised: () => false,
    onMelee: vi.fn(),
  };
  Object.assign(e, {
    ctx,
    def: ENEMIES[o.kind ?? 'runner'],
    num: 9700 + n++,
    pos: new Vector3(o.x ?? 0, 0, -o.dist),
    yaw: 0,
    aware: { alert: true, level: 'alert' },
    health: { alive: true },
    target,
    stagger: 0,
    los: o.los,
    losT: 0,
    losHead: false,
    dist: o.dist,
    lastSeenT: 0,
    lastKnown: new Vector3(0, 1.1, 0),
    sawOnce: true,
    hasStimulus: false,
    stimulus: [0, 0],
    knownV: new Vector3(),
    hunt: -1,
    alarm: null,
    entry: null,
    smelled: false,
    knownPt: [0, 0],
    advanceCd: 0,
    hold: null,
    postDef: null,
    post: [o.x ?? 0, -o.dist],
    doorCheck: 0,
    closingIn: false,
    role: R_NONE,
    onRadio: false,
    tacticsProfile: P_STANDARD,
    coverIdx: -1,
    onRoleBound: false,
    state: o.state,
    stateT: o.stateT ?? 0,
    coverPicked: false,
    advancing: false,
    flanking: false,
    path: [],
    fireGate: { blocked: false, moveT: 0, gate: () => false, plan: () => 'hold' },
    coverPose: 'none',
    coverPeek: 0,
    coverWallSide: 0,
    wantCrouch: false,
    rng: new Rng(7),
    strafeT: 0,
    strafe: 1,
    grenadeCd: 0,
    burstLeft: 0,
    windup: 0,
    meleeCd: 0,
    lunge: 0,
    kick: 0,
    dogBite: 0,
  });
  const p = e as unknown as ProbeP;
  const tryFire = vi.fn();
  p.tryFire = tryFire;
  /** `decide` steps with the clock `update` runs (stateT), as guardPolishA's `roleProbe.step`. */
  const step = (k = 1): Goal => {
    let g: Goal = { point: null, speed: 0, face: null };
    for (let i = 0; i < k; i++) {
      g = p.decide(DT);
      p.stateT += DT;
    }
    return g;
  };
  return { e, p, ctx, target, applyDamage, tryFire, step };
}

/** The goal's component along the line to the target (m; positive: towards him). */
function along(p: ProbeP, g: Goal): number {
  const pt = g.point!;
  const tx = -p.pos.x;
  const tz = -p.pos.z;
  const l = Math.sqrt(tx * tx + tz * tz);
  return ((pt[0] - p.pos.x) * tx + (pt[1] - p.pos.z) * tz) / l;
}

/** The goal's distance off the straight line from him to his known spot (m). */
function offLine(p: ProbeP, g: Goal): number {
  const pt = g.point!;
  const dx = p.knownPt[0] - p.pos.x;
  const dz = p.knownPt[1] - p.pos.z;
  const l = Math.sqrt(dx * dx + dz * dz);
  return Math.abs((pt[0] - p.pos.x) * dz - (pt[1] - p.pos.z) * dx) / l;
}

describe('(guard-ai runner-armed) the runner draws and fires (G298)', () => {
  it('the rules are on', () => {
    expect(ARCHETYPE.runner).toEqual({ weave: true, pressIn: true });
  });

  it('in sight inside 18 m he goes to the attack and fires; no strike', () => {
    const r = probe({ state: 'chase', los: true, dist: 10 });
    r.step();
    expect(r.p.state).toBe('attack');
    expect(r.tryFire).not.toHaveBeenCalled();
    r.step();
    expect(r.tryFire).toHaveBeenCalled();
    expect(r.ctx.onMelee).not.toHaveBeenCalled();
    expect(r.applyDamage).not.toHaveBeenCalled();
  });

  it('point blank he still shoots, never strikes', () => {
    const r = probe({ state: 'attack', los: true, dist: 1.2 });
    r.step();
    expect(r.tryFire).toHaveBeenCalled();
    expect(r.ctx.onMelee).not.toHaveBeenCalled();
    expect(r.applyDamage).not.toHaveBeenCalled();
    expect(r.p.meleeCd).toBe(0);
  });

  it('he presses in while he fires', () => {
    const r = probe({ state: 'attack', los: true, dist: 10 });
    const a = along(r.p, r.step());
    expect(r.tryFire).toHaveBeenCalled();
    expect(a).toBeGreaterThan(0);
    // a standard grunt at the same range strafes only
    const g = probe({ kind: 'grunt', state: 'attack', los: true, dist: 10 });
    expect(Math.abs(along(g.p, g.step()))).toBeLessThan(1e-9);
    // inside `engageMin` (4 m) the runner backs off
    const c = probe({ state: 'attack', los: true, dist: 3 });
    expect(along(c.p, c.step())).toBeLessThan(0);
  });

  it('he weaves on the run in', () => {
    // pos.x 0, stateT 0.3: the weave's sin(0.3 x 4 + 0) = sin(1.2), 0.56 m to the side
    const r = probe({ state: 'chase', los: false, dist: 12, stateT: 0.3 });
    const off = offLine(r.p, r.step());
    expect(r.p.state).toBe('chase');
    expect(off).toBeGreaterThan(0.3);
    const g = probe({ kind: 'grunt', state: 'chase', los: false, dist: 12, stateT: 0.3 });
    expect(offLine(g.p, g.step())).toBeLessThan(1e-6);
  });

  it('no allocation: an attack step (press, strafe) allocates no object', async () => {
    const r = probe({ state: 'attack', los: true, dist: 10 });
    // a plain function (a spy records every call); ten steps first, then each `decide` step measured
    r.p.tryFire = () => undefined;
    r.step(10);
    const p = r.p;
    const per = await bytesPerCall((m) => {
      for (let k = 0; k < m; k++) p.decide(DT);
    }, 16);
    expect(p.state).toBe('attack');
    // guardPolishA A14's bound, per step: boxed doubles only, no object (16 B read here: the goal's `face`, a double on
    // a number | null field, as guardAiAlloc's bite step notes)
    expect(per).toBeLessThan(64);
  });
});
