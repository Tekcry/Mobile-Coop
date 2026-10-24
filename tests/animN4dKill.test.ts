// (anim-n4d, M1 applied to the kills) The lethal takedown blow and the grab kill land their visual contact on the kill:
// the gameplay timing unchanged (the kill at approach + TAKEDOWN.strike, GRAB.killTime), the arc warped onto it
// (killWarp), the follow-through and the return after the kill (pose only), the wire keeps the blow's own phase and a
// remote poses it the same. Also (n4c checker polish 7) a co-op client's accept never steps the posed strike back.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import type { RigPose } from '../src/player/characterRig';
import { GRAB_KILL_BLOW, KILL_SEEN, KILL_TAIL_END, STRIKE_ARC_CONTACT, STRIKE_ARM_LAG, TAKEDOWN_BLOW, killWarp, strikeWarp, type KillBlow } from '../src/anim/strikeBody';
import { GRAB, TAKEDOWN, type TakedownPlan } from '../src/game/takedown';
import { STRIKE_DUR, strikePhase } from '../src/game/elbowStrike';
import { TakedownController, type TakedownVictim } from '../src/game/takedownController';
import { StrikeController } from '../src/game/strikeController';
import { localMoveState } from '../src/game/localMoveState';
import type { GameState } from '../src/game/gameState';
import { emptyMovePose, emptyMoveState, poseFromMoveState } from '../src/player/moveState';

const DT = 1 / 60;
const C = STRIKE_ARC_CONTACT;
const ms = (s: number): string => `${(s * 1000).toFixed(0)} ms`;

describe('anim-n4d: the kill warp (pure)', () => {
  it('both blows: contact a frame before the kill, the wind-up and drive slowed to it, 0 -> 0, the tail end -> 1', () => {
    for (const [name, b, dur] of [['takedown', TAKEDOWN_BLOW, TAKEDOWN.strike], ['grab kill', GRAB_KILL_BLOW, GRAB.killTime]] as const) {
      expect(b.dur, name).toBe(dur);
      expect(b.tail).toBeCloseTo((1 - C) * dur, 12); // the arc's own pace after contact
      expect(b.hit).toBeGreaterThan(C); // the contact is later than the arc's own: slowed
      expect(killWarp((dur - STRIKE_ARM_LAG) / dur, b)).toBeCloseTo(C, 9);
      expect(killWarp(1, b)).toBeGreaterThan(C); // just past contact at the kill
      expect(killWarp(0, b)).toBe(0);
      expect(killWarp(KILL_TAIL_END, b)).toBe(1);
      expect(killWarp(-1, b)).toBe(-1);
      // the old contact (0.56 of the blow) is now well before contact
      expect(killWarp(C, b)).toBeLessThan(0.36);
    }
  });

  it('strikeWarp is monotonic and continuous both ways (contact earlier or later than the arc\'s own)', () => {
    for (const hit of [0.12, 0.3, C, 0.69, 0.9]) {
      let prev = 0;
      let maxStep = 0;
      for (let k = 1; k <= 1000; k++) {
        const w = strikeWarp(k / 1000, hit);
        expect(w).toBeGreaterThan(prev);
        maxStep = Math.max(maxStep, w - prev);
        prev = w;
      }
      expect(strikeWarp(hit, hit)).toBeCloseTo(C, 12);
      // no jump: the steepest slope is the larger of C / hit and (1 - C) / (1 - hit)
      expect(maxStep).toBeLessThanOrEqual(Math.max(C / hit, (1 - C) / (1 - hit)) / 1000 + 1e-12);
    }
    for (const b of [TAKEDOWN_BLOW, GRAB_KILL_BLOW]) {
      let prev = 0;
      for (let k = 1; k <= 1440; k++) {
        const w = killWarp((k / 1440) * KILL_TAIL_END, b);
        expect(w).toBeGreaterThan(prev);
        expect(w - prev).toBeLessThan(0.005);
        prev = w;
      }
    }
  });

  it('a remote poses the wire\'s raw phase as the local pose (takedown, grab kill; the knockout and choke unchanged)', () => {
    const out = emptyMovePose();
    for (let k = 0; k <= 20; k++) {
      const u = k / 20;
      expect(poseFromMoveState({ ...emptyMoveState(), m: 'takedown', ph: u, sub: 1, tid: 'e1' }, 0, out).melee).toBeCloseTo(killWarp(u, TAKEDOWN_BLOW), 12);
      expect(poseFromMoveState({ ...emptyMoveState(), m: 'grab', ph: u, sub: 1, tid: 'e1' }, 0, out).melee).toBeCloseTo(killWarp(u, GRAB_KILL_BLOW), 12);
      // the grab's knockout and interrogation pose no blow
      expect(poseFromMoveState({ ...emptyMoveState(), m: 'grab', ph: u, sub: 0, tid: 'e1' }, 0, out).melee).toBe(-1);
      expect(poseFromMoveState({ ...emptyMoveState(), m: 'grab', ph: u, sub: 2, tid: 'e1' }, 0, out).melee).toBe(-1);
    }
    // (pose-parity) a choke / the lethal approach (no blow: the takedown sub bit 1 clear) poses no arc, as the owner's -1
    expect(poseFromMoveState({ ...emptyMoveState(), m: 'takedown', ph: 0, sub: 0, tid: 'e1' }, 0, out).melee).toBe(-1);
  });
});

// ------------------------------------------------------------------------------------------
// The producers: TakedownController (the lethal blow, the grab kill) on a stand-in game state
// ------------------------------------------------------------------------------------------

type Ev = [string, { phase?: string }];

function victim(z: number, yaw: number): TakedownVictim & { dead: boolean } {
  return {
    id: 'e1',
    pos: new Vector3(0, 0, z),
    yaw,
    alive: true,
    dead: false,
    def: { quadruped: false } as TakedownVictim['def'],
    alerted: false,
    level: 'calm' as TakedownVictim['level'],
    bodyRig: { emote: null } as unknown as TakedownVictim['bodyRig'],
    taken: false,
    beginTakedown() {},
    holdAt(x: number, y: number, zz: number) {
      this.pos.set(x, y, zz);
    },
    releaseTakedown() {},
    setSolid() {},
    holdAsHostage() {},
    holdPose() {},
    applyDamage() {
      (this as { alive: boolean }).alive = false;
      return {} as ReturnType<TakedownVictim['applyDamage']>;
    },
    knockOut() {
      (this as { alive: boolean }).alive = false;
    },
  };
}

function stage(): { g: GameState; td: TakedownController; ev: Ev[] } {
  const ev: Ev[] = [];
  const pos = new Vector3(0, 0, 0);
  const controller = { pos, override: null, speedCap: Infinity, gear: 2, crouched: false, yaw: 0, speed: 0, grounded: true, paceBand: 0, standUp() {} };
  const player = {
    alive: true,
    pose: { melee: -1, traverse: 'none', traverseT: 0 },
    controller,
    position: pos,
    rig: { reachL: { w: 0 }, reachR: { w: 0 } },
    carry: { raise: 0, w: { high: 0, low: 1, compressed: 0 } },
    cam: { yaw: 0 },
  };
  const g = {
    player,
    events: { emit: (n: string, d: { phase?: string }) => ev.push([n, d]) },
    target: { health: { hp: 100 } },
    traversal: { attached: false },
    strike: { active: false },
    team: { mode: null },
    weapons: { drawPhase: 0 },
    enemyMgr: null,
    stealth: null,
    doorPeek: { active: false },
    optic: { core: { active: false } },
    wallCore: null,
    takedownVictims: () => [],
  } as unknown as GameState & { takedown: TakedownController };
  const td = new TakedownController(g);
  (g as { takedown: TakedownController }).takedown = td;
  return { g, td, ev };
}

const plan = (kind: TakedownPlan['kind']): TakedownPlan => ({ kind, alignX: 0, alignY: 0, alignZ: 0, faceYaw: 0, approach: TAKEDOWN.approach, arc: 0, strike: TAKEDOWN.strike, victimTo: null });

/** One step's record: sim time, the posed arc phase, the wire's phase and mode, the remote's pose from the wire. */
type Step = { t: number; melee: number; wm: string; wph: number; remote: number; killed: boolean };

function record(g: GameState, td: TakedownController, ev: Ev[], n: number, t0: number): Step[] {
  const out: Step[] = [];
  const mv = emptyMoveState();
  const mp = emptyMovePose();
  for (let k = 1; k <= n; k++) {
    const before = ev.length;
    td.fixedUpdate(DT, false, true);
    const killed = ev.slice(before).some(([name, d]) => name === 'takedown' && d.phase === 'done');
    localMoveState(g, mv);
    const remote = mv.m === 'takedown' || mv.m === 'grab' ? poseFromMoveState(mv, 0, mp).melee : -1;
    out.push({ t: t0 + k * DT, melee: g.player.pose.melee, wm: mv.m, wph: mv.ph, remote, killed });
  }
  return out;
}

describe('anim-n4d: the lethal takedown blow and the grab kill land on the kill (M1)', () => {
  it('the lethal takedown: kill time unchanged, contact one frame before it, the wire raw, the tail after, back to rest', () => {
    const { g, td, ev } = stage();
    td.offer = { e: victim(0.6, Math.PI), plan: plan('front'), lethalOnly: false };
    td.start(true);
    const steps = record(g, td, ev, 120, 0);
    const kill = steps.findIndex((s) => s.killed);
    const total = TAKEDOWN.approach + TAKEDOWN.strike;
    expect(kill).toBeGreaterThan(0);
    // the kill: on the first step at or past approach + strike (unchanged)
    expect(steps[kill]!.t).toBeGreaterThanOrEqual(total - 1e-9);
    expect(steps[kill]!.t).toBeLessThan(total + DT + 1e-9);
    // the posed arc's contact: the first step at or past the arc's contact, one frame before the kill
    const contact = steps.findIndex((s) => s.melee >= C - 1e-9);
    const oldContact = TAKEDOWN.approach + C * TAKEDOWN.strike;
    console.info(`[n4d] lethal takedown: kill ${ms(steps[kill]!.t)} (approach ${ms(TAKEDOWN.approach)} + ${ms(TAKEDOWN.strike)}); arc contact before ${ms(oldContact)} (${ms(C * TAKEDOWN.strike)} into the blow), after ${ms(steps[contact]!.t)} (${ms(steps[contact]!.t - TAKEDOWN.approach)} into the blow)`);
    // (one frame: the float sum of the steps can put the kill a step later)
    expect(kill - contact).toBeGreaterThanOrEqual(1);
    expect(kill - contact).toBeLessThanOrEqual(2);
    // the blow: the wire carries the raw phase; the remote's pose from it is the local pose
    for (let k = 0; k <= kill - 1; k++) {
      const s = steps[k]!;
      expect(s.wm).toBe('takedown');
      const raw = Math.max(0, Math.min(1, (s.t - TAKEDOWN.approach) / TAKEDOWN.strike));
      expect(s.wph).toBeCloseTo(raw, 9);
      if (s.melee >= 0) expect(s.remote).toBeCloseTo(s.melee, 9);
    }
    // monotonic through the blow and the tail, then back to rest (the tail ~ (1 - C) of the blow)
    const posed = steps.filter((s) => s.melee >= 0);
    for (let k = 1; k < posed.length; k++) expect(posed[k]!.melee).toBeGreaterThanOrEqual(posed[k - 1]!.melee);
    const end = steps.findIndex((s, i) => i > kill && s.melee < 0);
    expect((end - kill) * DT).toBeCloseTo(TAKEDOWN_BLOW.tail, 1);
    expect(steps[end - 1]!.melee).toBeGreaterThan(0.95);
    expect(td.active).toBeNull();
    expect(td.tailU).toBe(-1);
    // after the kill the wire has moved on (a remote plays its own tail)
    expect(steps[kill]!.wm).not.toBe('takedown');
  });

  it('the grab kill: kill at GRAB.killTime (unchanged), contact one frame before it, the wire raw, the tail after', () => {
    const { g, td, ev } = stage();
    td.offer = { e: victim(0.6, 0), plan: plan('behind'), lethalOnly: false };
    td.start();
    // step in and pull in to the hold
    let n = 0;
    while (!td.hostage && n++ < 200) td.fixedUpdate(DT, false, false);
    expect(td.hostage).not.toBeNull();
    td.fixedUpdate(DT, false, false);
    td.menuPick = 'kill';
    td.fixedUpdate(DT, false, false); // the pick: the kill's clock starts at 0
    const steps = record(g, td, ev, 90, 0);
    const kill = steps.findIndex((s) => s.killed);
    expect(td.grabs.killed).toBe(1);
    expect(steps[kill]!.t).toBeGreaterThanOrEqual(GRAB.killTime - 1e-9);
    expect(steps[kill]!.t).toBeLessThan(GRAB.killTime + DT + 1e-9);
    const contact = steps.findIndex((s) => s.melee >= C - 1e-9);
    console.info(`[n4d] grab kill: kill ${ms(steps[kill]!.t)} (GRAB.killTime); arc contact before ${ms(C * GRAB.killTime)}, after ${ms(steps[contact]!.t)}`);
    // (one frame: the float sum of the steps can put the kill a step later)
    expect(kill - contact).toBeGreaterThanOrEqual(1);
    expect(kill - contact).toBeLessThanOrEqual(2);
    for (let k = 0; k < kill; k++) {
      const s = steps[k]!;
      expect(s.wm).toBe('grab');
      expect(s.wph).toBeCloseTo(Math.min(1, s.t / GRAB.killTime), 9);
      expect(s.remote).toBeCloseTo(s.melee, 9);
    }
    const posed = steps.filter((s) => s.melee >= 0);
    for (let k = 1; k < posed.length; k++) expect(posed[k]!.melee).toBeGreaterThanOrEqual(posed[k - 1]!.melee);
    const end = steps.findIndex((s, i) => i > kill && s.melee < 0);
    expect((end - kill) * DT).toBeCloseTo(GRAB_KILL_BLOW.tail, 1);
    expect(KILL_SEEN).toBeLessThan(1 - 3 * DT / GRAB.killTime); // a remote at 20 Hz still sees the kill's last phase
  });

  it('the tail yields: a death ends it, reset clears it', () => {
    const { g, td, ev } = stage();
    td.offer = { e: victim(0.6, Math.PI), plan: plan('front'), lethalOnly: false };
    td.start(true);
    record(g, td, ev, 57, 0);
    expect(td.tailU).toBeGreaterThan(1);
    td.reset();
    expect(td.tailU).toBe(-1);
    expect(g.player.pose.melee).toBe(-1);
  });
});

// ------------------------------------------------------------------------------------------
// The rig (NullEngine): where the hand arrives against the kill, before and after
// ------------------------------------------------------------------------------------------

type Sample = { wx: number; wp: number[]; tq: number[] };

async function rigRun(seq: readonly number[]): Promise<{ arc: Sample[]; rest: Sample; after: Sample }> {
  const { NullEngine } = await import('@babylonjs/core/Engines/nullEngine');
  const { Matrix, Scene } = await import('../src/core/babylon');
  const { PartLibrary } = await import('../src/world/partLibrary');
  const { CharacterRig } = await import('../src/player/characterRig');
  const { defaultLook } = await import('../src/cosmetics/avatarLook');
  const { WREN_HANDS } = await import('../src/operators/handFrame');
  const scene = new Scene(new NullEngine());
  const lib = new PartLibrary(scene);
  const rig = new CharacterRig(scene, (s, h, sl) => lib.instance(s, h, sl), defaultLook(), 1.75, 'n4d-wren', { build: 'average', style: 'detailed' });
  rig.groundProbe = () => 0;
  rig.carrier = true;
  rig.setHands(WREN_HANDS);
  rig.tuneRows = true;
  const inv = new Matrix();
  const wr = new Vector3();
  const sample = (): Sample => {
    rig.root.computeWorldMatrix(true);
    for (const d of rig.root.getDescendants(false)) (d as { computeWorldMatrix?: (f: boolean) => void }).computeWorldMatrix?.(true);
    rig.torso.getWorldMatrix().invertToRef(inv);
    Vector3.TransformCoordinatesToRef(rig.wristR.getAbsolutePosition(), inv, wr);
    const tq = rig.torso.absoluteRotationQuaternion;
    const wp = rig.wristR.getAbsolutePosition();
    return { wx: wr.x, wp: [wp.x, wp.y, wp.z], tq: [tq.x, tq.y, tq.z, tq.w] };
  };
  const pose: RigPose = { speed: 0, localX: 0, localZ: 1, grounded: true, crouch: 0, aimPitch: 0, aim: 0, kick: 0, armed: false, stride: 'facing', melee: -1 };
  for (let k = 0; k < 120; k++) rig.animate(DT, pose);
  const rest = sample();
  const arc: Sample[] = [];
  for (const m of seq) {
    pose.melee = m;
    rig.animate(DT, pose);
    arc.push(sample());
  }
  pose.melee = -1;
  for (let k = 0; k < 60; k++) rig.animate(DT, pose);
  return { arc, rest, after: sample() };
}

/** The blow's frames (time-linear `u` to the kill, then -1: before) or warped with its tail (after). */
function blowSeq(b: KillBlow, warp: boolean): { seq: number[]; killK: number } {
  const seq: number[] = [];
  const killK = Math.ceil(b.dur / DT - 1e-9) - 1;
  for (let k = 0; k <= killK; k++) {
    const u = Math.min(1, ((k + 1) * DT) / b.dur);
    seq.push(warp ? killWarp(u, b) : u);
  }
  if (warp) for (let u = 1 + DT / b.dur; u < KILL_TAIL_END; u += DT / b.dur) seq.push(killWarp(u, b));
  for (let k = 0; k < 6; k++) seq.push(-1);
  return { seq, killK };
}

const dist3 = (a: readonly number[], b: readonly number[]): number => Math.sqrt((a[0]! - b[0]!) ** 2 + (a[1]! - b[1]!) ** 2 + (a[2]! - b[2]!) ** 2);
const qAngle = (a: readonly number[], b: readonly number[]): number => 2 * Math.acos(Math.min(1, Math.abs(a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]! + a[3]! * b[3]!)));

describe('anim-n4d: the hand arrives on the kill (Wren rig)', () => {
  beforeAll(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  for (const [name, b] of [['lethal takedown blow', TAKEDOWN_BLOW], ['grab kill', GRAB_KILL_BLOW]] as const) {
    it(`${name}: the hand across within 2 frames of the kill (was ~0.56 of the blow), no snap after, back to rest`, async () => {
      const stats = async (warp: boolean) => {
        const { seq, killK } = blowSeq(b, warp);
        const r = await rigRun(seq);
        const wxs = r.arc.map((s) => s.wx);
        const wxMin = Math.min(...wxs);
        // the hand within 1 cm of its furthest across, and at its furthest (the sweep's peak)
        const near = wxs.findIndex((w) => w <= wxMin + 0.01);
        const contact = wxs.indexOf(wxMin);
        let wrist = 0;
        let torso = 0;
        let wristAfter = 0;
        for (let k = 0; k < r.arc.length; k++) {
          const a = k === 0 ? r.rest : r.arc[k - 1]!;
          const s = r.arc[k]!;
          wrist = Math.max(wrist, dist3(a.wp, s.wp));
          torso = Math.max(torso, qAngle(a.tq, s.tq));
          if (k > killK) wristAfter = Math.max(wristAfter, dist3(a.wp, s.wp));
        }
        return { tNear: (near + 1) * DT, tContact: (contact + 1) * DT, tKill: (killK + 1) * DT, wrist, wristAfter, torso: (torso * 180) / Math.PI, back: dist3(r.after.wp, r.rest.wp) };
      };
      const before = await stats(false);
      const after = await stats(true);
      for (const [k, s] of [['before', before], ['after', after]] as const) {
        console.info(`[n4d] ${name} ${k}: hand furthest across ${ms(s.tContact)} into the blow (within 1 cm from ${ms(s.tNear)}), kill ${ms(s.tKill)}; largest per-frame step: right wrist ${(s.wrist * 100).toFixed(1)} cm (after the kill ${(s.wristAfter * 100).toFixed(1)} cm), chest ${s.torso.toFixed(1)} deg; 1 s after: wrist ${(s.back * 100).toFixed(1)} cm off rest`);
      }
      expect(before.tContact).toBeLessThan(before.tKill - 0.15);
      expect(Math.abs(after.tContact - after.tKill)).toBeLessThanOrEqual(2 * DT + 1e-9);
      // no snap: the follow-through after the kill moves the wrist less than the old drop to rest at the kill
      expect(after.wristAfter).toBeLessThan(0.2);
      expect(after.wrist).toBeLessThan(0.35);
      expect(after.back).toBeLessThan(0.02);
    });
  }
});

// ------------------------------------------------------------------------------------------
// (n4c checker polish 7) A co-op client's accept: the posed strike never steps back
// ------------------------------------------------------------------------------------------

function strikeStage(): { g: GameState; sk: StrikeController } {
  const pos = new Vector3(0, 0, 0);
  const controller = { speedCap: Infinity, crouched: false, grounded: true, yaw: 0 };
  const foe = { id: 'e1', pos: new Vector3(0, 0, 0.8), yaw: Math.PI, alive: true, taken: false };
  const g = {
    player: { alive: true, pose: { melee: -1 }, controller, position: pos, cam: { yaw: 0 } },
    weapons: { drawPhase: 0, reloadBusy: false },
    traversal: { attached: false, committed: null },
    takedown: { active: null },
    team: { active: false },
    stealth: null,
    target: { health: { hp: 100 } },
    net: { commitRequest() {} },
    takedownVictims: () => [foe],
  } as unknown as GameState;
  const sk = new StrikeController(g);
  sk.authority = false;
  return { g, sk };
}

describe('anim-n4d: a client accept keeps the posed strike moving on (n4c polish 7)', () => {
  for (const rtt of [0.04, 0.08, 0.1]) {
    it(`RTT ${ms(rtt)}: t rewinds onto the host's clock, pose.melee and the wire's ph never step back`, () => {
      const { g, sk } = strikeStage();
      expect(sk.begin('e1')).toBe(true);
      const acceptAt = Math.round(rtt / DT);
      const melee: number[] = [];
      const ph: number[] = [];
      let tAfter = -1;
      let oldBack = 0;
      for (let k = 1; k <= 70 && (k === 1 || sk.active); k++) {
        if (k === acceptAt) {
          const t0 = sk.t;
          const pre = strikeWarp(strikePhase(t0));
          sk.accepted(sk.id, rtt / 2); // the host's clock: the press reached it one way in
          tAfter = sk.t;
          // the old accept posed the rewound clock: this far back
          oldBack = pre - strikeWarp(strikePhase(tAfter));
          expect(tAfter).toBeCloseTo(Math.min(t0, rtt / 2), 12); // the gameplay clock rewound as before
        }
        sk.fixedUpdate(DT, false);
        if (sk.active) {
          melee.push(g.player.pose.melee);
          ph.push(sk.ph);
        }
      }
      let worst = 0;
      for (let k = 1; k < melee.length; k++) worst = Math.min(worst, melee[k]! - melee[k - 1]!);
      for (let k = 1; k < ph.length; k++) expect(ph[k]!).toBeGreaterThanOrEqual(ph[k - 1]!);
      console.info(`[n4d] accept at RTT ${ms(rtt)}: the old rewind stepped the posed arc back ${oldBack.toFixed(3)}; now the largest step back ${(-worst).toFixed(3)}; frames posed ${melee.length} (strike ${Math.round(STRIKE_DUR / DT)})`);
      expect(worst).toBeGreaterThanOrEqual(0);
      expect(sk.approved).toBe(true);
      expect(tAfter).toBeGreaterThanOrEqual(0);
      // the strike still ends on the host's clock (t rewound): it lasts its full length from the rewound t
      expect(melee.length).toBeGreaterThanOrEqual(Math.floor((STRIKE_DUR - tAfter) / DT) + acceptAt - 2);
    });
  }
});
