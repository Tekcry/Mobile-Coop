import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error plain .mjs tool script without types
import * as S from '../scripts/route-run/steps.mjs';
// @ts-expect-error plain .mjs tool script without types
import { COOP_KINDS } from '../scripts/level-validate.mjs';
// @ts-expect-error plain .mjs tool script without types
import { addPast, checkSelftest, stepsForPath } from '../scripts/route-run.mjs';

// Route-runs R5 (docs/route-runs/PLAN.md "R5 Link steps"): the step table, each step machine on scripted readings, the
// follower, the code-climb classifier, the page reader (Node vm) and the selftest fixture. The page runs are pending PC
// runs on the laptop queue.

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = (f: string) => JSON.parse(readFileSync(new URL(`./fixtures/route-run/${f}`, import.meta.url), 'utf8'));
const metrics = JSON.parse(readFileSync(new URL('../docs/design/metrics.json', import.meta.url), 'utf8'));
const DT = S.STEP_POLL_S as number;

/**
 * A scripted world: one robot on the plan (camera yaw 0: the stick's x is world +x, its y world +z), moving at `speed`
 * along the stick while grounded and free; `rule(w, o, dt)` is the anchor's own behaviour (offers, attaching, climbing).
 * `read()` gives the reading the machines read (R5 reader fields plus `hint`).
 */
class World {
  x: number; y: number; z: number;
  grounded = true; attached = false; kind: string | null = null; phase: string | null = null;
  hint: string | null = null; prompt: string | null = null; tkind: string | null = 'none'; vent = -1; geo: string | null = null;
  t = 0; speed = 1.2; sx = 0; sy = 0; freeze = false;
  presses: number[][] = []; holds: number[][] = [];
  rule: (w: World, o: Obj, dt: number) => void;
  constructor(p: number[], rule: (w: World, o: Obj, dt: number) => void = () => {}) {
    [this.x, this.y, this.z] = p as [number, number, number];
    this.rule = rule;
  }
  read(): Obj {
    return { t: this.t, x: this.x, y: this.y, z: this.z, yaw: 0, camYaw: 0, grounded: this.grounded, crouched: true, attached: this.attached, kind: this.kind, phase: this.phase, s: 0, hint: this.hint, prompt: this.prompt, dropPrompt: null, vent: this.vent, tkind: this.tkind, geo: this.geo };
  }
  apply(o: Obj, dt: number) {
    this.sx = o.stick[0];
    this.sy = o.stick[1];
    this.presses.push([...o.press]);
    this.holds.push([...o.hold]);
    if (!this.attached && this.grounded && !this.freeze) {
      this.x += this.sx * this.speed * dt;
      this.z += this.sy * this.speed * dt;
    }
    this.rule(this, o, dt);
    this.t = Math.round((this.t + dt) * 1e6) / 1e6;
  }
  /** The stick's direction along (fx, fz) (the hint reads it, as the game's `probeDir`). */
  facing(fx: number, fz: number) {
    const m = Math.hypot(this.sx, this.sy);
    return m < 1e-6 ? 0 : (this.sx * fx + this.sy * fz) / m;
  }
}

/** Run a machine on a world until done (or `maxS`): the result, the time and the world. */
function sim(m: Obj, w: World, maxS = 60) {
  for (let k = 0; k <= maxS / DT; k++) {
    const o = m.update(w.read(), w.t);
    if (o.done) return { res: o.result, t: w.t, w };
    w.apply(o, DT);
  }
  return { res: null, t: w.t, w };
}

const has = (rows: number[][], b: number) => rows.some((r) => r.includes(b));

// A ladder against a wall facing +z (the climber faces the wall): base (0, 0, 0), top (0, 4.4, 0.4).
const LADDER = { id: 7, base: [0, 0, 0], top: [0, 4.4, 0.4], facing: 0 };
/** The game's ladder (anchors.ts `reach`, simplified): offered at the foot facing it, or at the top facing the edge; Y
 *  attaches; the stick climbs at 0.5 m/s; the top-out / foot steps off. */
function ladderRule(w: World, o: Obj, dt: number) {
  if (!w.attached) {
    w.z = Math.min(w.z, w.y < 1 ? -0.25 : 99);
    const foot = w.y < 0.4 && Math.hypot(w.x, w.z) < 0.85 && w.facing(0, 1) > 0.2;
    const top = Math.abs(w.y - 4.4) < 0.4 && Math.hypot(w.x, w.z - 0.4) < 0.9 && w.facing(0, 1) < -0.3;
    w.hint = foot ? 'ladder:bottom' : top ? 'ladder:top' : null;
    if (w.hint && o.press.includes(S.BTN.Y)) {
      w.attached = true;
      w.kind = 'ladder';
      w.hint = null;
    }
    return;
  }
  w.y += o.stick[1] * 0.5 * dt;
  if (w.y >= 4.4) Object.assign(w, { y: 4.4, z: 0.7, attached: false, kind: null });
  if (w.y <= 0) Object.assign(w, { y: 0, z: -0.3, attached: false, kind: null });
}

const ladderLink = (at: number[], past: number[]) => ({ index: 12, kind: 'ladder', action: 'ladder', at, past, level_change: 4.4, limit_s: 19.4 });

describe('route-run R5 step table', () => {
  it('each R5 kind maps to its step by the step action (R1), not to the stub', () => {
    for (const k of S.STEP_KINDS) {
      expect(S.stepFor({ kind: k, action: k }), k).toBe(S.STEPS[k]);
      expect(S.STEPS[k], k).not.toBe(S.stub);
    }
    expect(S.STEPS.window).toBe(S.windowStep);
    expect(S.stepFor({ kind: 'ladder', action: 'ladder' })).toBe(S.ladder);
  });

  it('the rare solo kinds stay stubs, held as R4a holds, with "no step yet: <kind>"', async () => {
    for (const k of S.RARE_KINDS) {
      expect(S.stepFor({ kind: k, action: k }), k).toBe(S.rareStub);
      const calls: unknown[] = [];
      const ctx = { driver: { hold: async (s: number) => calls.push(['hold', s]), place: async (p: unknown) => calls.push(['place', p]) } };
      const r = await S.rareStub(ctx, { index: 3, kind: k, at: [0, 0, 0], past: [1, 0, 0], hold_s: 4 });
      expect(r).toEqual({ outcome: 'stub', stub: { link: 3, kind: k, hold_s: 4, why: `no step yet: ${k}` } });
      expect(calls).toEqual([['hold', 4], ['place', [1, 0, 0]]]);
    }
  });

  it('co-op kinds stay stubs (R9); door and walk are the driver own (as R4a); no action is the stub', () => {
    for (const k of COOP_KINDS) expect(S.stepFor({ kind: k, action: 'stub' }), k).toBe(S.stub);
    expect(S.stepFor({ kind: 'coop_boost', action: 'ladder' })).toBe(S.stub);
    expect(Object.hasOwn(S.STEPS, 'door')).toBe(false);
    expect(Object.hasOwn(S.STEPS, 'walk')).toBe(false);
    expect(S.stepFor({ kind: 'door', action: 'door' })).toBe(S.stub);
    expect(S.stepFor({ kind: 'opening', action: 'walk' })).toBe(S.stub);
    expect(S.stepFor({ kind: 'ladder' })).toBe(S.stub);
    expect(S.stepFor({ kind: 'something_new', action: 'something_new' })).toBe(S.stub);
    expect(S.stepFor({ kind: 'climb', action: 'stub' })).toBe(S.climb);
  });

  it('limits: R1 limit_s, else R3 stepLimit (a rappel, a duct with no length: none)', () => {
    expect(S.limitFor('ladder', { limit_s: 19.4 })).toBe(19.4);
    expect(S.limitFor('ladder', { level_change: 4.4 })).toBeCloseTo(19.4, 9);
    expect(S.limitFor('drop', {})).toBe(5);
    expect(S.limitFor('window', {})).toBe(8);
    expect(S.limitFor('hatch', {})).toBe(8);
    expect(S.limitFor('duct', { length: 6 })).toBe(12);
    expect(S.limitFor('duct', {})).toBe(null);
    expect(S.limitFor('rappel', {})).toBe(null);
  });
});

describe('route-run R5 step machines (scripted readings)', () => {
  const mk = (kind: string, link: Obj, anchor: Obj | null, info: Obj = {}) => S.makeMachine(kind, S.geometry(kind, link, anchor, info), S.limitFor(kind, link), { stick: 0.6 });

  it('ladder up from the bottom: the hint, Y, the stick up, the top-out, done on the upper storey', () => {
    const link = ladderLink([0, 0, -3], [0, 4.4, 1.5]);
    const m = mk('ladder', link, { kind: 'ladder', ...LADDER }, { toY: 4.4 });
    const { res, t, w } = sim(m, new World([0, 0, -3], ladderRule));
    expect(res).toMatchObject({ outcome: 'walked', limit_s: 19.4 });
    expect(w.y).toBe(4.4);
    expect(t).toBeLessThan(19.4);
    // Y pressed once, on the poll the foot offered it; the climb held the stick up
    expect(w.presses.flat().filter((b) => b === S.BTN.Y)).toHaveLength(1);
  });

  it('ladder down from the top: turned to the edge, Y, the stick down, done at the foot', () => {
    const link = { ...ladderLink([0, 4.4, 1.5], [0, 0, -3]), reverse: true };
    const m = mk('ladder', link, { kind: 'ladder', ...LADDER }, { toY: 0 });
    expect(m.geo).toMatchObject({ down: true, want: 'ladder:top' });
    // (the roof is z > 0.4, beyond the ladder's top)
    let minRoofZ = Infinity;
    const rule = (w: World, o: Obj, dt: number) => {
      ladderRule(w, o, dt);
      if (!w.attached && w.y > 4) minRoofZ = Math.min(minRoofZ, w.z);
    };
    const { res, w } = sim(m, new World([0, 4.4, 1.5], rule));
    expect(res?.outcome).toBe('walked');
    expect(w.y).toBe(0);
    // the push toward the edge never walked it off (the hint came first, then Y)
    expect(minRoofZ).toBeGreaterThan(0.4);
    expect(w.presses.flat().filter((b) => b === S.BTN.Y)).toHaveLength(1);
  });

  it('a ladder never offered (no anchor there): step-timeout at 15 + 1 s/m, not one poll before', () => {
    const link = ladderLink([20, 0, -44], [18.8, 4.4, -43.8]);
    const m = mk('ladder', link, null, { toY: 4.4 });
    const w = new World([20, 0, -44]);
    let far = 0;
    for (let k = 0; k <= 194; k++) {
      const o = m.update(w.read(), k / 10);
      expect(o.done, `t ${k / 10}`).toBe(false);
      w.apply(o, DT);
      far = Math.max(far, Math.hypot(w.x - 20, w.z + 44));
    }
    const o = m.update(w.read(), 19.5);
    expect(o.done).toBe(true);
    expect(o.result).toMatchObject({ outcome: 'step-timeout', t: 19.5, why: 'limit', limit_s: 19.4, phase: 'approach' });
    expect(o.stick).toEqual([0, 0]);
    // it pushed toward the far side and walked back, never off across the lawn
    expect(far).toBeLessThan(S.PUSH_MAX_M + 0.3);
  });

  it('drop walked off the edge: done grounded on the lower storey', () => {
    const rule = (w: World) => {
      if (w.grounded && w.y > 4 && w.z > 0.5) w.grounded = false;
      if (!w.grounded && (w.y -= 1) <= 0) Object.assign(w, { y: 0, grounded: true });
    };
    const m = mk('drop', { index: 20, kind: 'drop', action: 'drop', at: [0, 4.4, 0], past: [0, 0, 1.2], limit_s: 5 }, null, { toY: 0 });
    const { res, t, w } = sim(m, new World([0.3, 4.4, -0.2], rule));
    expect(res).toMatchObject({ outcome: 'walked' });
    expect(w.y).toBe(0);
    expect(t).toBeLessThan(5);
    expect(has(w.holds, S.BTN.B) || has(w.presses, S.BTN.B)).toBe(false);
  });

  it('drop that stalls at the edge: B held, the hang, B tapped, done on the lower storey', () => {
    let heldB = 0;
    const rule = (w: World, o: Obj, dt: number) => {
      if (!w.attached && w.grounded && w.y > 4) {
        w.z = Math.min(w.z, 0.45);
        w.hint = w.z >= 0.4 ? 'ledge:above' : null;
        heldB = o.hold.includes(S.BTN.B) ? heldB + dt : 0;
        if (heldB >= 0.5) Object.assign(w, { attached: true, kind: 'ledge', y: 2.2, hint: null });
        return;
      }
      if (w.attached && o.press.includes(S.BTN.B)) Object.assign(w, { attached: false, kind: null, grounded: false });
      if (!w.attached && !w.grounded && (w.y -= 1) <= 0) Object.assign(w, { y: 0, grounded: true });
    };
    const m = mk('drop', { index: 19, kind: 'drop', action: 'drop', at: [0, 4.4, 0], past: [0, 0, 1.2], limit_s: 5 }, null, { toY: 0 });
    const { res, t, w } = sim(m, new World([0, 4.4, 0], rule));
    expect(res?.outcome).toBe('walked');
    expect(t).toBeLessThan(5);
    const firstHold = w.holds.findIndex((h) => h.includes(S.BTN.B));
    const tap = w.presses.findIndex((p) => p.includes(S.BTN.B));
    expect(firstHold).toBeGreaterThan(0);
    expect(tap).toBeGreaterThan(firstHold);
  });

  // A window in a wall along x, its normal +z: the near side (the from space) is -z.
  const WINDOW = { id: 3, c: [0, 1, 0], w: 1.2, h: 1.2, yaw: 0, sill: 0.9, open: true };
  const windowRule = (w: World, o: Obj) => {
    if (w.tkind === 'vault') {
      Object.assign(w, { z: 0.8, tkind: 'none' });
      return;
    }
    w.z = Math.min(w.z, -0.3);
    const side = Math.abs(w.z);
    w.prompt = side > 0.25 && side < 1.4 && Math.abs(w.x) < 0.4 && w.facing(0, 1) > 0.6 ? 'Vault' : null;
    if (w.prompt && o.press.includes(S.BTN.Y)) w.tkind = 'vault';
  };

  it('open window: the vault offered, Y, done past the sill', () => {
    const m = mk('window', { index: 0, kind: 'window', action: 'window', at: [0, 0, -3], past: [0, 0, 1.2], limit_s: 8 }, { kind: 'window', ...WINDOW }, { fromC: [0, 0, -6] });
    expect(m.geo.stand).toEqual([0, 0, -0.8]);
    const { res, w } = sim(m, new World([0, 0, -3], windowRule));
    expect(res?.outcome).toBe('walked');
    expect(w.z).toBeGreaterThan(S.PAST_SIDE_M);
    expect(w.presses.flat().filter((b) => b === S.BTN.Y)).toHaveLength(1);
  });

  it('window: the traversal vault offer alone (no HUD label yet) is the offer', () => {
    const rule = (w: World, o: Obj) => {
      windowRule(w, o);
      w.geo = w.prompt ? 'vault' : null;
      w.prompt = null;
    };
    const m = mk('window', { index: 2, kind: 'window', action: 'window', at: [0, 0, -3], past: [0, 0, 1.2], limit_s: 8 }, { kind: 'window', ...WINDOW, open: false });
    const { res } = sim(m, new World([0, 0, -3], rule));
    expect(res?.outcome).toBe('walked');
  });

  it('window: the near side from the from space, whichever side the link point sits', () => {
    const g = S.geometry('window', { at: [0, 0, 0], past: [0, 0, -1.2] }, { kind: 'window', ...WINDOW }, { fromC: [0, 0, 5] });
    expect(g.stand[2]).toBeCloseTo(0.8, 9);
    expect(g.face[1]).toBeCloseTo(-1, 9);
  });

  it('hatch never offered: step-timeout at 8 s', () => {
    const m = mk('hatch', { index: 5, kind: 'hatch', action: 'hatch', at: [0, 3, 0], past: [0, 0, 1.2], limit_s: 8 }, null, { toY: 0 });
    const w = new World([0, 3, 0]);
    for (let k = 0; k <= 80; k++) {
      expect(m.update(w.read(), k / 10).done, `t ${k / 10}`).toBe(false);
      w.apply(m.out, DT);
    }
    expect(m.update(w.read(), 8.1).result).toMatchObject({ outcome: 'step-timeout', t: 8.1, limit_s: 8 });
  });

  it('duct: Y then A held until in the duct, the stick forward, done past the far end; limit 2 s/m of its length', () => {
    const DUCT = { id: 9, entry: { pos: [0, 0, 0], nx: 0, nz: -1, where: 'wall' }, exit: { pos: [0, 0, 6], nx: 0, nz: 1, where: 'wall' }, length: 6 };
    let unscrew = 0;
    const rule = (w: World, o: Obj, dt: number) => {
      if (!w.attached) {
        w.z = Math.min(w.z, w.z < 3 ? -0.2 : 99);
        if (w.z > 3) return;
        w.hint = Math.hypot(w.x, w.z) < 1.1 && w.facing(0, 1) > 0.3 ? 'duct:side' : null;
        if (w.vent < 0 && w.hint && o.press.includes(S.BTN.Y) && o.hold.includes(S.BTN.A)) w.vent = 0;
        if (w.vent >= 0) {
          unscrew = o.hold.includes(S.BTN.A) ? unscrew + dt : unscrew;
          w.vent = Math.min(1, unscrew / 1.8);
          if (w.vent >= 1) Object.assign(w, { attached: true, kind: 'duct', hint: null, vent: -1 });
        }
        return;
      }
      w.z += o.stick[1] * 0.9 * dt;
      if (w.z >= 6) Object.assign(w, { z: 6.6, attached: false, kind: null });
    };
    const link = { index: 8, kind: 'duct', action: 'duct', at: [0, 0, -2], past: [0, 0, 7], length: 6, limit_s: 12 };
    const m = mk('duct', link, { kind: 'duct', ...DUCT });
    expect(m.limit).toBe(12);
    const { res, t, w } = sim(m, new World([0, 0, -2], rule));
    expect(res?.outcome).toBe('walked');
    expect(t).toBeLessThan(12);
    const first = w.presses.findIndex((p) => p.includes(S.BTN.Y));
    expect(w.holds[first]).toContain(S.BTN.A);
    expect(w.holds[first + 5]).toContain(S.BTN.A);
    expect(S.limitFor('duct', { length: 6 })).toBe(12);
  });

  // A rappel point on a roof edge at y 6, the rope out over +z, 6 m down.
  const RAPPEL = { id: 4, top: [0, 6, 0], nx: 0, nz: 1, length: 6 };
  const rappelRule = (w: World, o: Obj, dt: number) => {
    if (!w.attached) {
      if (w.y > 5) {
        w.z = Math.min(w.z, 0.1);
        w.hint = Math.hypot(w.x, w.z) < 0.9 && w.facing(0, 1) > 0.3 ? 'rappel:above' : null;
        if (w.hint && o.press.includes(S.BTN.Y)) Object.assign(w, { attached: true, kind: 'rappel', phase: 'hook', hint: null, hookT: 0 });
      }
      return;
    }
    const ww = w as World & { hookT: number };
    if (w.phase === 'hook') {
      ww.hookT += dt;
      if (ww.hookT >= 1.8) w.phase = 'on';
      return;
    }
    w.y += o.stick[1] * 0.6 * dt;
    if (w.y <= 0) Object.assign(w, { y: 0, z: 0.6, attached: false, kind: null, phase: null });
  };

  it('rappel: Y at the edge, the hook, the stick back to descend, done grounded below', () => {
    const m = mk('rappel', { index: 6, kind: 'rappel', action: 'rappel', at: [0, 6, -2], past: [0, 0, 1.2] }, { kind: 'rappel', ...RAPPEL });
    expect(m.limit).toBe(null);
    expect(m.geo.toY).toBe(0);
    const { res, w } = sim(m, new World([0, 6, -2], rappelRule));
    expect(res?.outcome).toBe('walked');
    expect(w.y).toBe(0);
  });

  it('rappel with no limit falls to the 8 s stall watch (3D progress): not at 7.9 s, at 8 s', () => {
    const m = mk('rappel', { index: 6, kind: 'rappel', action: 'rappel', at: [0, 6, 0], past: [0, 0, 1.2] }, null);
    const w = new World([0, 6, 0]);
    w.freeze = true;
    for (let k = 0; k < 80; k++) {
      expect(m.update(w.read(), k / 10).done, `t ${k / 10}`).toBe(false);
      w.apply(m.out, DT);
    }
    expect(m.update(w.read(), 8).result).toMatchObject({ outcome: 'step-timeout', why: 'stall', limit_s: null });
  });

  it('a stall watch restarts with 3D progress (a descent keeps it alive)', () => {
    const m = mk('rappel', { index: 6, kind: 'rappel', action: 'rappel', at: [0, 6, -2], past: [0, 0, 1.2] }, { kind: 'rappel', ...RAPPEL });
    // a slow rope: 0.1 m/s, 60 s down; never 8 s without 0.5 m of progress
    const slow = (w: World, o: Obj, dt: number) => rappelRule(w, { ...o, stick: [o.stick[0], o.stick[1] / 6] }, dt);
    const { res, t } = sim(m, new World([0, 6, -2], slow), 90);
    expect(res?.outcome).toBe('walked');
    expect(t).toBeGreaterThan(55);
  });

  it('update allocates nothing per poll: the same output object and arrays every poll', () => {
    const m = mk('ladder', ladderLink([0, 0, -3], [0, 4.4, 1.5]), { kind: 'ladder', ...LADDER }, { toY: 4.4 });
    const w = new World([0, 0, -3], ladderRule);
    const o0 = m.update(w.read(), 0);
    const { stick, press, hold } = o0;
    for (let k = 1; k < 50; k++) {
      w.apply(m.out, DT);
      const o = m.update(w.read(), k / 10);
      expect(o).toBe(o0);
      expect(o.stick).toBe(stick);
      expect(o.press).toBe(press);
      expect(o.hold).toBe(hold);
    }
  });
});

/** A Playwright-like page over a scripted world: the reader's calls by name (`[name, args]`), the install script. */
function simPage(w: World, log: string[], name: string) {
  const mask = (m: number) => [0, 1, 3].filter((b) => m & (1 << b));
  return {
    async evaluate(fn: unknown, arg?: unknown) {
      if (typeof fn === 'string') return true;
      const [n, a] = arg as [string, number[]];
      log.push(`${name} ${n}`);
      const o = (ax = 0, ay = 0, p = 0, h = 0) => ({ stick: [ax, ay], press: mask(p), hold: mask(h) });
      // (the page gives the hint as its anchor kind and entry)
      const rd = () => {
        const r = w.read();
        const [hintKind, hintEntry] = r.hint ? r.hint.split(':') : [null, null];
        return { ...r, hint: undefined, hintKind, hintEntry };
      };
      switch (n) {
        case 'begin': (w as Obj).beginDt = a[0]; w.apply(o(), a[0]!); return rd();
        case 'poll': w.apply(o(a[0], a[1], a[2], a[3]), a[4]!); return rd();
        case 'input': (w as Obj).pending = o(a[0], a[1], a[2], a[3]); return null;
        case 'after': return rd();
        case 'release': return rd();
        case 'anchors': return { ladders: (w as Obj).ladders ?? [], windows: [], ducts: [], rappels: [] };
        default: throw new Error(n);
      }
    },
  };
}

describe('route-run R5 robots (Node side against scripted pages)', () => {
  const link = ladderLink([0, 0, -3], [0, 4.4, 1.5]);
  const driver = { points: null, opts: { stick: 0.6 }, onChunk: async () => {} };
  const withLadder = (w: World) => Object.assign(w, { ladders: [LADDER] });

  it('one robot: the anchor is read from the page near the link point, the ladder walked', async () => {
    const log: string[] = [];
    const host = simPage(withLadder(new World([0, 0, -3], ladderRule)), log, 'host');
    const r = await S.ladder({ host, client: null, driver }, link);
    expect(r).toMatchObject({ outcome: 'walked', robot: 'host', kind: 'ladder', anchor: 7 });
    expect(log[0]).toBe('host anchors');
    expect(log.at(-1)).toBe('host release');
  });

  it('with a client the leader takes the step first, then the follower; a follower timeout names the follower', async () => {
    const log: string[] = [];
    const host = simPage(withLadder(new World([0, 0, -3], ladderRule)), log, 'host');
    // the follower's page has no ladder there: its prompt never shows
    const client = simPage(new World([0, 0, -3], ladderRule), log, 'client');
    const r = await S.ladder({ host, client, driver }, { ...link, at: [0, 0, -3] });
    const lastHost = log.lastIndexOf('host release');
    const firstClient = log.indexOf('client anchors');
    expect(lastHost).toBeGreaterThan(0);
    expect(firstClient).toBeGreaterThan(lastHost);
    expect(r).toMatchObject({ outcome: 'step-timeout', robot: 'follower', limit_s: 19.4, why: 'limit' });
  });

  it('a leader timeout ends the step: the follower does not take it; the pair leader is named leader', async () => {
    const log: string[] = [];
    const host = simPage(new World([0, 0, -3], ladderRule), log, 'host');
    const client = simPage(withLadder(new World([0, 0, -3], ladderRule)), log, 'client');
    const r = await S.ladder({ host, client, driver }, link);
    expect(r).toMatchObject({ outcome: 'step-timeout', robot: 'leader' });
    expect(log.some((l) => l.startsWith('client'))).toBe(false);
  });

  /** R4b's ctx: `clock()` a read of the host's game time, `advance(s)` the one advance (here: every world given). */
  const r4b = (worlds: World[], log: string[]) => ({
    clock: () => {
      log.push('clock read');
      return worlds[0]!.t;
    },
    advance: async (s: number) => {
      log.push(`advance ${s}`);
      for (const w of worlds) w.apply((w as Obj).pending ?? { stick: [0, 0], press: [], hold: [] }, s);
    },
  });

  it('with R4b advance the page gets begin(0) / input / after, the game moves only by ctx.advance; clock is never called', async () => {
    const log: string[] = [];
    const w = withLadder(new World([0, 0, -3], ladderRule));
    const host = simPage(w, log, 'host');
    const r = await S.ladder({ host, client: null, driver, ...r4b([w], log) }, link);
    expect(r).toMatchObject({ outcome: 'walked', robot: 'host' });
    expect(log).not.toContain('host poll');
    expect(log).not.toContain('clock read');
    expect(log.filter((l) => l === `advance ${DT}`).length).toBeGreaterThan(10);
    // begin advanced nothing: the world's first poll was ctx.advance's
    expect(log.indexOf('host begin')).toBeLessThan(log.indexOf(`advance ${DT}`));
    expect((w as Obj).beginDt).toBe(0);
  });

  it('a clock that stops moving ends in a step-timeout (why cap) after the poll bound, not a hang', async () => {
    const log: string[] = [];
    const w = new World([0, 0, -3], ladderRule);
    const host = simPage(w, log, 'host');
    const r = await S.ladder({ host, client: null, driver, advance: async () => {} }, link);
    expect(r).toMatchObject({ outcome: 'step-timeout', robot: 'host', why: 'cap', t: 0 });
    expect(log.filter((l) => l === 'host input')).toHaveLength(S.STEP_MAX_POLLS);
  });

  it('inside a split leg only that robot takes the step, on its own page', async () => {
    const log: string[] = [];
    const wh = withLadder(new World([0, 0, -3], ladderRule));
    const wc = withLadder(new World([0, 0, -3], ladderRule));
    const host = simPage(wh, log, 'host');
    const client = simPage(wc, log, 'client');
    const f = await S.ladder({ host, client, driver, robot: 'follower', ...r4b([wh, wc], log) }, link);
    expect(f).toMatchObject({ outcome: 'walked', robot: 'follower' });
    expect(log.some((l) => l.startsWith('host '))).toBe(false);
    expect(wc.y).toBe(4.4);
    log.length = 0;
    const l = await S.ladder({ host, client, driver, robot: 'leader', ...r4b([wh, wc], log) }, link);
    expect(l).toMatchObject({ outcome: 'walked', robot: 'leader' });
    expect(log.some((x) => x.startsWith('client '))).toBe(false);
    expect(wh.y).toBe(4.4);
  });

  it('the approach pace: ctx.stick, else the page driver opts, else the pair host opts, else the default', () => {
    expect(S.stickOf({ stick: 0.4, driver: { opts: { stick: 0.9 } } })).toBe(0.4);
    expect(S.stickOf({ driver: { opts: { stick: 0.9 } } })).toBe(0.9);
    expect(S.stickOf({ driver: { host: { opts: { stick: 0.7 } } } })).toBe(0.7);
    expect(S.stickOf({ driver: {} })).toBe(undefined);
    const m = S.makeMachine('drop', S.geometry('drop', { at: [0, 0, 0], past: [1, 0, 0] }, null), 5, { stick: S.stickOf({ driver: {} }) });
    expect(m.mag).toBe(S.DEFAULT_STICK);
  });
});

describe('route-run R5 code-climb classifier', () => {
  const none = { ladders: [], windows: [], ducts: [], rappels: [] };
  it('campus S1 high route: leg 8 is the yard ladder, leg 12 the drop off the canopy', () => {
    const yard = { ...none, ladders: [{ id: 1, base: [-38, 0, -40.4], top: [-38, 4.4, -39.95], facing: 0 }] };
    const l8 = S.classifyClimb([-38, 0, -41.3], [-38, 4.4, -38.5], yard);
    expect(l8).toMatchObject({ kind: 'ladder', anchor: { id: 1 } });
    expect(l8.lengthM).toBeCloseTo(4.4, 9);
    expect(S.classifyClimb([-15, 4.4, -36], [-13, 0, -37], none)).toEqual({ kind: 'drop', anchor: null, lengthM: 4.4 });
  });

  it('each anchor kind within 1.5 m of either end, a ladder first; farther or flat and bare: none', () => {
    const lad = { id: 1, base: [10, 0, 0], top: [10, 3, 0.4], facing: 0 };
    const win = { id: 2, c: [0.5, 1, 1], yaw: 0 };
    const duct = { id: 3, entry: { pos: [9, 0, 9] }, exit: { pos: [1, 0, 1.2] }, length: 12 };
    const rap = { id: 4, top: [10.5, 6, 10], nx: 0, nz: 1, length: 6 };
    const a = [0, 0, 0];
    const b = [10, 0, 10];
    expect(S.classifyClimb(a, [10, 0, 1], { ...none, ladders: [lad], windows: [win] }).kind).toBe('ladder');
    expect(S.classifyClimb(a, b, { ...none, windows: [win] }).kind).toBe('window');
    expect(S.classifyClimb(a, b, { ...none, ducts: [duct] })).toMatchObject({ kind: 'duct', lengthM: 12 });
    expect(S.classifyClimb(a, b, { ...none, rappels: [rap] }).kind).toBe('rappel');
    expect(S.classifyClimb(a, b, { ...none, ladders: [{ ...lad, base: [2.1, 0, 0], top: [2.1, 3, 0] }] }).kind).toBe(null);
    expect(S.classifyClimb([0, 3, 0], [0, 2.5, 3], none).kind).toBe(null);
    expect(S.classifyClimb([0, 3, 0], [0, 1.9, 3], none).kind).toBe('drop');
    expect(S.classifyClimb(null, b, none).kind).toBe(null);
  });

  it('an unclassified code climb stays a stub, "code climb: unclassified"', async () => {
    const calls: unknown[] = [];
    const host = simPage(new World([0, 0, 0]), [], 'host');
    const ctx = { host, client: null, driver: { hold: async (s: number) => calls.push(['hold', s]), place: async (p: unknown) => calls.push(['place', p]) } };
    const r = await S.climb(ctx, { type: 'link', index: 4, kind: 'climb', at: [0, 0, 0], past: [3, 0, 0], action: 'stub', hold_s: 6 });
    expect(r).toEqual({ outcome: 'stub', stub: { link: 4, kind: 'climb', hold_s: 6, why: S.STUB_WHY_CLIMB } });
    expect(calls).toEqual([['hold', 6], ['place', [3, 0, 0]]]);
  });

  it('a classified code climb is taken by that kind step (a ladder: its limit by the anchor height)', async () => {
    const w = Object.assign(new World([0, 0, -3], ladderRule), { ladders: [LADDER] });
    const host = simPage(w, [], 'host');
    const r = await S.climb({ host, client: null, driver: { points: null, opts: { stick: 0.6 } } }, { type: 'link', index: 8, kind: 'climb', at: [0, 0, -1], past: [0, 4.4, 1.2], action: 'stub', hold_s: 6 });
    expect(r).toMatchObject({ outcome: 'walked', climb: 'ladder', anchor: 7 });
    expect(r.limit_s).toBeCloseTo(19.4, 9);
  });
});

describe('route-run R5 page reader (Node vm, no browser)', () => {
  function fakePage({ rr = false } = {}) {
    const buttons: number[] = Array(17).fill(0);
    const axes = [0, 0];
    const seen: string[] = [];
    const game: Obj = {
      time: 0,
      player: { position: { x: 1, y: 2, z: 3 }, cam: { yaw: 0.5 }, controller: { yaw: 1, grounded: true, crouched: true } },
      traversal: { kind: 'none', hint: { kind: 'vault' }, attachCtl: { active: false, m: { anchor: null, phase: 'off', s: 0 }, hint: { anchor: { kind: 'ladder' }, entry: 'bottom' }, lower: null, vent: null } },
      hud: { world: { label: (k: string) => (k === 'vault' ? 'Climb' : '') } },
      world: { level: { anchors: { ladders: [{ id: 5, base: { x: 0, y: 0, z: 0 }, top: { x: 0, y: 4, z: 0.4 }, facing: 0 }, { id: 6, base: { x: 50, y: 0, z: 0 }, top: { x: 50, y: 4, z: 0 }, facing: 0 }], windows: [], ducts: [{ id: 2, path: [{ x: 1, y: 0, z: 0 }, { x: 4, y: 0, z: 4 }], entry: { pos: { x: 1, y: 0, z: 0 }, nx: 0, nz: -1, where: 'wall' }, exit: { pos: { x: 4, y: 0, z: 4 }, nx: 0, nz: 1, where: 'ceiling' } }], rappels: [] } } },
    };
    const step = (dt: number) => {
      seen.push(`step ${dt} Y${buttons[3]} A${buttons[0]} ax${axes[1]}`);
      game.time += dt;
    };
    const window: Obj = {
      __app: { current: game, loop: { manual: false, stepHeadless: step } },
      __pad: { set: (i: number, v: number) => { buttons[i] = v; }, axis: (i: number, v: number) => { axes[i] = v; } },
    };
    if (rr) window.__rr = { holdStart: () => seen.push('holdStart'), tick: (dt: number) => { seen.push(`tick ${dt}`); if (dt < 1) step(dt); } };
    const ctx = vm.createContext({ window, Math });
    vm.runInContext(S.stepPageScript(), ctx);
    const page = {
      async evaluate(fn: unknown, arg?: unknown) {
        const r = typeof fn === 'string' ? vm.runInContext(fn, ctx) : vm.runInContext(`(${String(fn)})(${JSON.stringify(arg)})`, ctx);
        return r === undefined ? undefined : JSON.parse(JSON.stringify(r));
      },
    };
    return { page, buttons, axes, seen, game, ctx };
  }
  const call = (page: Obj, n: string, ...a: unknown[]) => page.evaluate(([nn, aa]: [string, unknown[]]) => (globalThis as Obj).window.__rrStep[nn](...aa), [n, a]);

  it('reads the e2e-traverse fields into one reading; a press is down for one poll, a hold stays', async () => {
    const f = fakePage();
    const r = S.withHint(await call(f.page, 'begin', 0.1));
    expect(r).toMatchObject({ t: 0.1, x: 1, y: 2, z: 3, yaw: 1, camYaw: 0.5, grounded: true, attached: false, kind: null, hint: 'ladder:bottom', prompt: 'Climb', dropPrompt: null, vent: -1, tkind: 'none', geo: 'vault' });
    await call(f.page, 'poll', 0, 1, 1 << 3, 1 << 0, 0.1);
    // during the advance: Y and A down, the stick forward (pad axis 1 is +down)
    expect(f.seen.at(-1)).toBe('step 0.1 Y1 A1 ax-1');
    expect(f.buttons[3]).toBe(0);
    expect(f.buttons[0]).toBe(1);
    await call(f.page, 'release');
    expect(f.buttons[0]).toBe(0);
    expect(f.axes).toEqual([0, -0]);
    // the reader reuses one reading object
    const same = vm.runInContext('window.__rrStep.read() === window.__rrStep.read()', f.ctx);
    expect(same).toBe(true);
  });

  it('begin only idles the driver when Node advances (dt 0): no tick, no step on this page alone', async () => {
    const f = fakePage({ rr: true });
    const r = await call(f.page, 'begin', 0);
    expect(f.seen).toEqual(['holdStart']);
    expect(r.t).toBe(0);
  });

  it('with no Node-side advance it steps through the page driver (its guard poll runs), idle first', async () => {
    const f = fakePage({ rr: true });
    await call(f.page, 'begin', 0.1);
    expect(f.seen.slice(0, 2)).toEqual(['holdStart', 'tick 0.1']);
    await call(f.page, 'poll', 0, 0, 0, 0, 0.1);
    expect(f.seen.at(-2)).toBe('tick 0.1');
  });

  it('anchors near either end, in plain shapes (a duct with its path length)', async () => {
    const f = fakePage();
    const a = await call(f.page, 'anchors', 0, -1, 30, 30, 1.5);
    expect(a.ladders).toEqual([{ id: 5, base: [0, 0, 0], top: [0, 4, 0.4], facing: 0 }]);
    expect(a.ducts).toEqual([{ id: 2, entry: { pos: [1, 0, 0], nx: 0, nz: -1, where: 'wall' }, exit: { pos: [4, 0, 4], nx: 0, nz: 1, where: 'ceiling' }, length: 5 }]);
  });

  it('end to end on the vm page: a missing ladder runs to its limit in game time', async () => {
    const f = fakePage();
    f.game.traversal.attachCtl.hint = null;
    f.game.world.level.anchors.ladders = [];
    const r = await S.ladder({ host: f.page, client: null, driver: { points: null, opts: { stick: 0.6 } } }, ladderLink([20, 0, -44], [18.8, 4.4, -43.8]));
    expect(r).toMatchObject({ outcome: 'step-timeout', robot: 'host', why: 'limit', limit_s: 19.4, t: 19.5, anchor: null });
  });
});

describe('route-run R5 selftest fixture', () => {
  const fx = json('selftest-steps.graph.json');
  const graph = json('campusOps-S1.graph.json');
  const points = json('campusOps-S1.points.json');

  // (F29) the step links' walk points, moved off R1's edge points to where the robot stands (each with its `note`)
  const MOVED: Record<number, number[]> = { 0: [20.8, 0, -76], 2: [13.2, 0, -76], 12: [-38, 0, -41.2], 19: [-21, 4.4, -35.45], 20: [-11, 4.4, -33.6] };
  const unmoved = (l: Obj, i: number) => {
    if (!(i in MOVED)) return l;
    const c = { ...l };
    delete c.at;
    delete c.note;
    return c;
  };

  it('is the campus S1 copy plus one fixture-only ladder (link 22) where the map has none, its step points moved (F29)', () => {
    expect(fx.meta.map).toBe('campusOps');
    expect(fx.spaces).toEqual(graph.spaces);
    expect(fx.links.slice(0, 22)).toEqual(graph.links);
    expect(fx.points.links.slice(0, 22).map(unmoved)).toEqual(points.links.map(unmoved));
    for (const [i, at] of Object.entries(MOVED)) {
      expect(fx.points.links[Number(i)].at).toEqual(at);
      expect(fx.points.links[Number(i)].note).toMatch(/^F29: /);
    }
    expect(fx.points.spaces).toEqual(points.spaces);
    expect(fx.points.geom).toBe(points.geom);
    expect(fx.links[22]).toMatchObject({ from: 's1-lawn', to: 's1-plantroof', kind: 'ladder', level_change: 4.4 });
    expect(fx.points.links[22]).toMatchObject({ from: 's1-lawn', to: 's1-plantroof', kind: 'ladder', at: fx.links[22].at });
    expect(fx.links).toHaveLength(23);
    expect(fx.points.links).toHaveLength(23);
  });

  it('its runs (as --selftest builds them) take the ladder, drop and window steps with their limits', () => {
    const steps = (path: number[]) => addPast(stepsForPath([fx], fx.points, path, metrics.rules.split_speed_mps), fx.points).filter((s: Obj) => s.type === 'link');
    const byIndex = new Map<number, Obj>();
    for (const r of fx.expect.runs) for (const s of steps(r.path)) byIndex.set(s.index, s);
    expect(byIndex.get(12)).toMatchObject({ action: 'ladder' });
    expect(byIndex.get(12)!.limit_s).toBeCloseTo(19.4, 9);
    expect(byIndex.get(22)).toMatchObject({ action: 'ladder' });
    expect(byIndex.get(22)!.limit_s).toBeCloseTo(19.4, 9);
    expect(byIndex.get(19)).toMatchObject({ action: 'drop', limit_s: 5 });
    expect(byIndex.get(20)).toMatchObject({ action: 'drop', limit_s: 5 });
    expect(byIndex.get(0)).toMatchObject({ action: 'window', limit_s: 8 });
    expect(byIndex.get(2)).toMatchObject({ action: 'window', limit_s: 8 });
    expect(byIndex.get(17)).toMatchObject({ action: 'stub' });
    expect(byIndex.get(18)).toMatchObject({ action: 'stub' });
    // each goes to its step
    for (const i of [12, 22]) expect(S.stepFor(byIndex.get(i))).toBe(S.ladder);
    for (const i of [19, 20]) expect(S.stepFor(byIndex.get(i))).toBe(S.drop);
    for (const i of [0, 2]) expect(S.stepFor(byIndex.get(i))).toBe(S.windowStep);
    for (const i of [17, 18]) expect(S.stepFor(byIndex.get(i))).toBe(S.stub);
    // the fixture ladder's far side is on the plant roof, its point on open lawn far from the real ladder
    const fix = byIndex.get(22)!;
    expect(Math.hypot(fix.at[0] + 38, fix.at[2] + 40.4)).toBeGreaterThan(50);
  });

  it('its expect block reads in R4a selftest checker: the briefed outcomes pass, a stubbed ladder fails', () => {
    const logs = fx.expect.runs.map((r: Obj) => ({
      id: r.id, links: Object.entries(r.outcomes).map(([index, outcome]) => ({ index: Number(index), outcome })),
      deadStops: r.id === 'missing-ladder' ? [{ class: 'step-timeout', link: 22, t: 40, since: 40, step_t: 19.5, limit_s: 19.4 }] : r.id === 'window-open' ? [{ class: 'step-timeout', link: 0, t: 12.7, since: 12.7, step_t: 8.1, limit_s: 8 }] : [], guards: { spawned: 8, alive: 8 },
    }));
    expect(checkSelftest(fx.expect, logs)).toEqual([]);
    // the missing ladder's stop must come at its limit (the step's own time against its limit), not early
    const early = logs.find((l: Obj) => l.id === 'missing-ladder');
    early.deadStops[0].step_t = 3;
    expect(checkSelftest(fx.expect, logs)).toEqual(['missing-ladder: the step-timeout stop came 3 s into its step (its limit 19.4 s)']);
    early.deadStops[0].step_t = 19.5;
    const want = Object.fromEntries(fx.expect.runs.map((r: Obj) => [r.id, r.outcomes]));
    expect(want['ladder-canopy-drop']).toEqual({ 12: 'walked', 14: 'walked', 19: 'walked' });
    expect(want['ladder-pavilion-drop']).toEqual({ 12: 'walked', 15: 'walked', 20: 'walked' });
    // (F29) the PC desk under the open window's landing: the vault is never offered (an F-row for Sector Ops)
    expect(want['window-open']).toEqual({ 0: 'step-timeout' });
    expect(fx.expect.runs.find((r: Obj) => r.id === 'window-open').note).toContain('F-row for Sector Ops (campus S1 vault window blocked by the PC desk)');
    expect(want['window-glazed']).toEqual({ 2: 'walked' });
    expect(want['missing-ladder']).toEqual({ 4: 'walked', 22: 'step-timeout', 7: 'walked' });
    expect(want['boost-stubs']).toMatchObject({ 17: 'stub', 18: 'stub' });
    logs[0].links[0].outcome = 'stub';
    expect(checkSelftest(fx.expect, logs)).toEqual(['ladder-canopy-drop: link 12 stub, expected walked']);
  });

  it('--dry-run --selftest prints its runs with each link step limit, no browser', () => {
    const out = execFileSync(process.execPath, ['scripts/route-run.mjs', '--dry-run', '--selftest', 'tests/fixtures/route-run/selftest-steps.graph.json'], { encoding: 'utf8', timeout: 60000 });
    expect(out).toContain('note: selftest selftest-steps.graph.json, 1 robot(s)');
    expect(out).toContain('6 run(s)');
    expect(out).not.toContain('UNPLANNABLE');
    expect(out).toContain('- missing-ladder (S1, selftest)');
    expect(out).toContain('link 22 s1-lawn -> s1-plantroof ladder [ladder, limit 19.4 s]');
    expect(out).toContain('link 12 s1-dyard -> s1-plantroof ladder [ladder, limit 19.4 s]');
    expect(out).toMatch(/link 19 \S+ -> s1-forecourt drop \[drop, limit 5 s\]/);
    expect(out).toMatch(/link 0 s1-verge -> s1-gatehouse window \[window, limit 8 s\]/);
    expect(out).toMatch(/link 17 \S+ -> \S+ coop_boost \[stub [\d.]+ s\]/);
  });
});
