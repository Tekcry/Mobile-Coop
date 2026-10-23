// (hang-down) The takedown controller from the co-op hang-down: the offer, the grab (lifted, held, the held rules, no
// let-go, KO by default when the hang ends), the quick RT takedown (tap the choke, held the neck snap), and the team
// move keeping the body (the takedown never touches its override).
import { describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import { GRAB, HANG_GRAB, hangLiftY } from '../src/game/takedown';
import { CQ } from '../src/game/closeQuarters';
import { HANG_HEAD } from '../src/game/teamMoves';
import { TakedownController, type TakedownVictim } from '../src/game/takedownController';
import type { GameState } from '../src/game/gameState';

const DT = 1 / 60;
const HEAD = 2.2;

type Ev = [string, { phase?: string; kind?: string; lethal?: boolean }];
type Victim = TakedownVictim & { ko: boolean; killed: boolean; solid: boolean };

function victim(x: number, z: number, quadruped = false): Victim {
  return {
    id: 'e1',
    pos: new Vector3(x, 0, z),
    yaw: 0,
    alive: true,
    ko: false,
    killed: false,
    solid: true,
    def: { quadruped, kind: 'grunt' } as unknown as TakedownVictim['def'],
    alerted: false,
    level: 'unaware' as TakedownVictim['level'],
    bodyRig: { emote: null } as unknown as TakedownVictim['bodyRig'],
    taken: false,
    beginTakedown() {
      this.taken = true;
    },
    holdAt(px: number, py: number, pz: number, yaw: number) {
      this.pos.set(px, py, pz);
      (this as { yaw: number }).yaw = yaw;
    },
    releaseTakedown() {
      this.taken = false;
    },
    setSolid(on: boolean) {
      this.solid = on;
    },
    holdAsHostage() {},
    holdPose() {},
    applyDamage() {
      (this as { alive: boolean }).alive = false;
      this.killed = true;
      return {} as ReturnType<TakedownVictim['applyDamage']>;
    },
    knockOut() {
      (this as { alive: boolean }).alive = false;
      this.ko = true;
    },
  };
}

/** The hanging player: the rig root `HANG_HEAD` over the head at `HEAD`, the team move holding the body. */
function stage(v: Victim): { g: GameState; td: TakedownController; ev: Ev[]; team: { hangActs: boolean; hangingDown: boolean }; teamOv: object } {
  const ev: Ev[] = [];
  const pos = new Vector3(0, HEAD + HANG_HEAD, 0);
  const teamOv = { kinematic: pos, yaw: 0, turnRate: 20, crouch: false };
  const controller = { pos, override: teamOv as object | null, speedCap: Infinity, gear: 2, crouched: false, yaw: 0, speed: 0, grounded: false, standUp() {} };
  const team = { hangActs: true, hangingDown: true };
  const g = {
    player: { alive: true, pose: { melee: -1, traverse: 'none', traverseT: 0 }, controller, position: pos, rig: { reachL: { w: 0 }, reachR: { w: 0 } } },
    events: { emit: (n: string, d: Ev[1]) => ev.push([n, d]) },
    target: { health: { hp: 100 } },
    traversal: { attached: false, hintWindow: null },
    strike: { active: false },
    team,
    weapons: { drawPhase: 0 },
    enemyMgr: null,
    stealth: null,
    wallCore: null,
    spottedLocal: false,
    ballistics: { ray: () => ({ hit: false, distance: 0 }) },
    hud: { feedItem() {}, barks: { say() {} } },
    takedownVictims: () => [v],
  } as unknown as GameState;
  const td = new TakedownController(g);
  return { g, td, ev, team, teamOv };
}

const steps = (td: TakedownController, n: number): void => {
  for (let i = 0; i < n; i++) td.fixedUpdate(DT, false, false);
};

describe('hang-down takedowns: the offer', () => {
  it('a guard by the hanging head is offered as hangDown; a dog, a guard out of reach or a hang not settled is not', () => {
    const v = victim(0, 0.5);
    const s = stage(v);
    steps(s.td, 1);
    expect(s.td.offer?.plan.kind).toBe('hangDown');
    expect(s.td.offer?.lethalOnly).toBe(false);
    s.team.hangActs = false;
    steps(s.td, 1);
    expect(s.td.offer).toBeNull();
    expect(stageOffer(victim(0, 0.5, true))).toBeNull();
    expect(stageOffer(victim(1.5, 0))).toBeNull();
  });
});

function stageOffer(v: Victim): string | null {
  const s = stage(v);
  steps(s.td, 1);
  return s.td.offer?.plan.kind ?? null;
}

describe('hang-down takedowns: the grab', () => {
  it('lifted to the hands, held (the menu ready), the team move keeps the body; RT tap knocks him out', () => {
    const v = victim(0, 0.5);
    const s = stage(v);
    steps(s.td, 1);
    s.td.start();
    expect(s.td.active?.grab).toBeTruthy();
    expect(s.td.active?.plan.approach).toBe(HANG_GRAB.reach);
    // reaching down: he stands where he was
    steps(s.td, Math.floor(HANG_GRAB.reach / DT) - 1);
    expect(v.pos.y).toBe(0);
    expect(s.td.menuReady).toBe(false);
    // lifted
    steps(s.td, Math.ceil(HANG_GRAB.lift / DT) + 2);
    expect(s.td.menuReady).toBe(true);
    expect(s.td.hostage).toBe(v);
    expect(v.pos.y).toBeCloseTo(hangLiftY(HEAD, 0), 6);
    expect(v.pos.z).toBeCloseTo(HANG_GRAB.hold, 6);
    expect(v.solid).toBe(false);
    // the body is the team move's throughout: never overridden, never cleared, no speed cap
    expect(s.g.player.controller.override).toBe(s.teamOv);
    expect(s.g.player.controller.speedCap).toBe(Infinity);
    // no let-go: a held guard stays held (nothing picked)
    steps(s.td, 300);
    expect(s.td.hostage).toBe(v);
    // RT tap (the menu's knockout pick)
    s.td.menuPick = 'knockout';
    steps(s.td, Math.ceil(CQ.koTime / DT) + 2);
    expect(v.ko).toBe(true);
    expect(v.killed).toBe(false);
    expect(s.td.active).toBeNull();
    expect(s.td.grabs.ko).toBe(1);
    expect(s.g.player.controller.override).toBe(s.teamOv);
    expect(s.ev.find(([n, d]) => n === 'takedown' && d.phase === 'done')?.[1].kind).toBe('hangGrab');
  });

  it('RT hold kills (the neck snap); a carry pick from the hang is a plain knockout', () => {
    const v = victim(0.4, 0);
    const s = stage(v);
    steps(s.td, 1);
    s.td.start();
    steps(s.td, Math.ceil((HANG_GRAB.reach + HANG_GRAB.lift) / DT) + 2);
    s.td.menuPick = 'kill';
    steps(s.td, Math.ceil(GRAB.killTime / DT) + 2);
    expect(v.killed).toBe(true);
    expect(s.td.grabs.killed).toBe(1);
    expect(s.td.tailU).toBe(-1);
    expect(s.g.player.pose.melee).toBe(-1);
    const w = victim(0, 0.5);
    const t = stage(w);
    steps(t.td, 1);
    t.td.start();
    steps(t.td, Math.ceil((HANG_GRAB.reach + HANG_GRAB.lift) / DT) + 2);
    t.td.menuPick = 'carry';
    steps(t.td, Math.ceil(CQ.koTime / DT) + 2);
    expect(w.ko).toBe(true);
  });

  it('KO by default: the hang ending while he is held knocks him out at once (never let go)', () => {
    const v = victim(0, 0.5);
    const s = stage(v);
    steps(s.td, 1);
    s.td.start();
    steps(s.td, Math.ceil((HANG_GRAB.reach + HANG_GRAB.lift) / DT) + 2);
    s.team.hangActs = false;
    steps(s.td, 1);
    expect(v.ko).toBe(true);
    expect(s.td.active).toBeNull();
    expect(s.td.done.aborted).toBe(0);
  });

  it('the hang ending during the reach knocks him out too (no let-go once seized)', () => {
    const v = victim(0, 0.5);
    const s = stage(v);
    steps(s.td, 1);
    s.td.start();
    steps(s.td, 3);
    s.team.hangActs = false;
    steps(s.td, 1);
    expect(v.ko).toBe(true);
  });
});

describe('hang-down takedowns: the quick RT takedown', () => {
  it('held: the neck snap kills after the strike, the hanger stays, no elbow arc', () => {
    const v = victim(0, 0.5);
    const s = stage(v);
    steps(s.td, 1);
    s.td.start(true);
    expect(s.td.active?.grab).toBeNull();
    let melee = -1;
    for (let i = 0; i < Math.ceil(HANG_GRAB.strike / DT) + 2 && s.td.active; i++) {
      s.td.fixedUpdate(DT, false, false);
      melee = Math.max(melee, s.g.player.pose.melee);
    }
    expect(v.killed).toBe(true);
    expect(melee).toBe(-1);
    expect(s.g.player.controller.override).toBe(s.teamOv);
    expect(s.g.player.position.y).toBeCloseTo(HEAD + HANG_HEAD, 9);
  });

  it('tap: the choke knocks out; the hang ending mid-way ends it as decided', () => {
    const v = victim(0, 0.5);
    const s = stage(v);
    steps(s.td, 1);
    s.td.start(false);
    steps(s.td, 5);
    // lifted towards the hands on the way
    expect(v.pos.y).toBeGreaterThan(0);
    s.team.hangActs = false;
    steps(s.td, 1);
    expect(v.ko).toBe(true);
    expect(s.td.active).toBeNull();
  });
});
