import { describe, expect, it } from 'vitest';
import { AttachController } from '../src/player/attachController';
import { InputState } from '../src/input/inputState';
import { KICK_TAP, UNSCREW_TIME, ventStep, type VentHold } from '../src/player/ventOpen';
import { TraversalAnchors, type Duct, type ReachResult } from '../src/world/anchors';

// (vent-kick) Opening a closed duct grate: the jump / traverse press starts it, a short press kicks, a hold unscrews.
// Before the fix the keyboard could not unscrew with Space then E: the kick was decided on the second fixed step after
// the press (33 ms) unless E was already down, so the human gap between the two keys always kicked. M1 (Michael,
// 2026-10-22, "Yes, match keyboard"): the pad works the same way (Y held is no kick, the hold carries into A).

const FIXED = 1 / 60;
/** The input sources' holder names: the keyboard (`KeyboardMouseSource`), its mouse buttons, the pad. */
const KB = 'kbm';
const MOUSE = 'kbmm';
const PAD = 'pad';

/** The pre-fix rule (attachController.ts updateVent, 4.7.x): a scripted tap (no held jump) keeps it bit for bit. */
function oldStep(v: { t: number; progress: number }, dt: number, useHeld: boolean, useHeldT: number): 'wait' | 'kick' | 'unscrew' | 'stop' {
  v.t += dt;
  if (!useHeld && v.t > 0.02) {
    if (v.progress <= 0 && v.t < KICK_TAP + 0.1) return 'kick';
    return 'stop';
  } else if (useHeldT >= KICK_TAP) {
    v.progress = Math.min(1, (useHeldT - KICK_TAP) / UNSCREW_TIME);
    if (v.progress >= 1) return 'unscrew';
  }
  return 'wait';
}

/** The real AttachController at a closed grate (a stub player; attaching after the grate opens is stubbed). */
function rig() {
  const anchors = new TraversalAnchors();
  const duct = anchors.add<Duct>({
    kind: 'duct',
    path: [
      { x: 0, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 },
    ],
    entry: { pos: { x: 0, y: 0, z: 0 }, nx: -1, ny: 0, nz: 0, where: 'wall' },
    exit: { pos: { x: 5, y: 0, z: 0 }, nx: 1, ny: 0, nz: 0, where: 'wall' },
    grates: [],
  });
  const player = { alive: true, controller: { override: null } } as never;
  const ac = new AttachController(player, anchors, { x: 0, y: 0, z: 0 } as never, () => true, () => 0, () => true);
  const opened: string[] = [];
  ac.breakables = {
    isOpen: () => opened.length > 0,
    open: (_k: string, how: string) => {
      opened.push(how);
      return true;
    },
  } as never;
  (ac as unknown as { attachTo: () => boolean }).attachTo = () => true;
  const reach = { anchor: duct, entry: 'side', s: 0, dist: 0.3 } as unknown as ReachResult;
  return { ac, reach, opened };
}

type Ev = [frame: number, source: string, action: 'jump' | 'interact', down: boolean];

/**
 * Drive it like the app: per render frame `InputState.tick` (the poll), then up to 4 fixed steps, edges consumed after
 * each; each step reads the input the way GameState feeds traversal (`useHeld` / `useHeldT` from interact, `startHeld`
 * = jump down from any source) and a jump press at the prompt starts the vent (`attachFrom`). Returns per-step progress.
 */
function play(events: Ev[], frames: number, frameDt = FIXED, tapJumpAt = -1) {
  const { ac, reach, opened } = rig();
  const inp = new InputState();
  const progress: number[] = [];
  let steps = 0;
  let openedAt = -1;
  let ventEver = false;
  for (let f = 0; f < frames; f++) {
    for (const [ef, src, a, d] of events) if (ef === f) inp.set(src, a, d);
    if (f === tapJumpAt) inp.tap('jump');
    inp.tick(frameDt);
    let n = Math.min(4, Math.round(frameDt / FIXED));
    while (n-- > 0) {
      const ti = ac.input;
      ti.useHeld = inp.down('interact');
      ti.useHeldT = inp.heldTime('interact');
      ti.startHeld = inp.down('jump');
      if (!ac.updateVent(FIXED) && inp.pressed('jump') && opened.length === 0 && !ventEver) {
        ac.attachFrom(reach);
        ventEver = true;
      }
      steps++;
      if (opened.length > 0 && openedAt < 0) openedAt = steps;
      progress.push(ac.vent ? ac.vent.progress : -1);
      inp.consumeEdges();
    }
  }
  return { opened, openedAt, progress, vent: ac.vent, maxP: Math.max(...progress) };
}

/** The same pattern with the jump and interact events moved to other sources. */
const as = (events: Ev[], jump: string, use: string): Ev[] => events.map(([f, , a, d]) => [f, a === 'jump' ? jump : use, a, d]);

describe('vent: the tap / hold classifier (ventOpen.ts)', () => {
  it('a scripted tap (startHeld false) is bit-identical to the old rule on every use press / hold pattern', () => {
    // useHeld pattern per step: down from step `a` to step `b` (exclusive), its held time ticking at 60 Hz
    for (let a = 0; a < 6; a++) {
      for (let b = a; b < 120; b += 7) {
        const nv: VentHold = { t: 0, progress: 0, carried: false };
        const ov = { t: 0, progress: 0 };
        for (let s = 0; s < 130; s++) {
          const held = s >= a && s < b;
          const heldT = held ? (s - a) * FIXED : 0;
          const n = ventStep(nv, FIXED, held, heldT);
          const o = oldStep(ov, FIXED, held, heldT);
          expect(n).toBe(o);
          expect(nv.progress).toBe(ov.progress);
          expect(nv.t).toBe(ov.t);
          if (o !== 'wait') break;
        }
      }
    }
  });

  it('jump held keeps it open, a short press kicks, a long hold unscrews, letting go mid-way stops', () => {
    // jump tapped for 5 steps: a kick on the release
    let v: VentHold = { t: 0, progress: 0, carried: false };
    for (let s = 0; s < 5; s++) expect(ventStep(v, FIXED, false, 0, true)).toBe('wait');
    let r = ventStep(v, FIXED, false, 0, false);
    expect(r).toBe('kick');
    // jump held 0.9 s: progress rises, then let go: stopped, no kick
    v = { t: 0, progress: 0, carried: false };
    for (let s = 0; s < 54; s++) expect(ventStep(v, FIXED, false, 0, true)).toBe('wait');
    expect(v.progress).toBeGreaterThan(0.4);
    expect(ventStep(v, FIXED, false, 0, false)).toBe('stop');
    // jump held into use (use down 6 steps in, jump up at 8): the hold runs on from the press, monotonic, to the unscrew
    v = { t: 0, progress: 0, carried: false };
    let last = 0;
    r = 'wait';
    for (let s = 0; s < 200 && r === 'wait'; s++) {
      const e = s >= 6;
      r = ventStep(v, FIXED, e, e ? (s - 6) * FIXED : 0, s < 8);
      expect(v.progress).toBeGreaterThanOrEqual(last);
      last = v.progress;
    }
    expect(r).toBe('unscrew');
    expect(v.t).toBeCloseTo(KICK_TAP + UNSCREW_TIME, 1);
  });
});

describe('vent: keyboard through InputState and the real AttachController', () => {
  it('Space, then E held 100 ms later (Space let go): unscrew progress rises, no kick', () => {
    const r = play(
      [
        [0, KB, 'jump', true],
        [6, KB, 'interact', true],
        [8, KB, 'jump', false],
      ],
      66,
    );
    expect(r.opened).toEqual([]);
    expect(r.maxP).toBeGreaterThan(0.4);
    expect(r.vent).not.toBeNull();
  });

  it('E let go early stops the unscrew without a kick', () => {
    const r = play(
      [
        [0, KB, 'jump', true],
        [0, KB, 'interact', true],
        [2, KB, 'jump', false],
        [50, KB, 'interact', false],
      ],
      90,
    );
    expect(r.maxP).toBeGreaterThan(0.2);
    expect(r.maxP).toBeLessThan(1);
    expect(r.opened).toEqual([]);
    expect(r.vent).toBeNull();
  });

  it('slow frames (100 ms, 4 steps each): Space and E in different frames still unscrew (the e2e case)', () => {
    const r = play(
      [
        [0, KB, 'jump', true],
        [1, KB, 'interact', true],
        [3, KB, 'jump', false],
      ],
      30,
      0.1,
    );
    expect(r.opened).toEqual(['unscrew']);
    expect(r.maxP).toBeGreaterThan(0.8);
  });

  it('Space held alone unscrews; E held first then Space unscrews', () => {
    const a = play([[0, KB, 'jump', true]], 100);
    expect(a.opened).toEqual(['unscrew']);
    const b = play(
      [
        [0, KB, 'interact', true],
        [10, KB, 'jump', true],
        [12, KB, 'jump', false],
      ],
      100,
    );
    expect(b.opened).toEqual(['unscrew']);
  });

  it('a Space tap kicks, quick', () => {
    const r = play(
      [
        [0, KB, 'jump', true],
        [4, KB, 'jump', false],
      ],
      30,
    );
    expect(r.opened).toEqual(['kick']);
    expect(r.openedAt * FIXED).toBeLessThan(0.15);
  });

  it('jump bound to a mouse button, then E 100 ms later: unscrews (CHECK should-fix 1)', () => {
    const r = play(
      [
        [0, MOUSE, 'jump', true],
        [6, KB, 'interact', true],
        [8, MOUSE, 'jump', false],
      ],
      100,
    );
    expect(r.opened).toEqual(['unscrew']);
    expect(r.progress[60]).toBeGreaterThan(0.4);
  });
});

describe('vent: the pad matches the keyboard (M1)', () => {
  it('a Y tap kicks, quick', () => {
    const r = play(
      [
        [0, PAD, 'jump', true],
        [4, PAD, 'jump', false],
      ],
      30,
    );
    expect(r.opened).toEqual(['kick']);
    expect(r.openedAt * FIXED).toBeLessThan(0.15);
  });

  it('Y held alone does not kick: it unscrews', () => {
    const r = play([[0, PAD, 'jump', true]], 100);
    expect(r.opened).toEqual(['unscrew']);
    // no kick while Y is down: the vent still runs past KICK_TAP + 0.1
    expect(r.openedAt * FIXED).toBeGreaterThan(KICK_TAP + UNSCREW_TIME - 0.05);
  });

  it('Y, then A held 100 ms later (Y let go): the hold carries into A, unscrews', () => {
    const r = play(
      [
        [0, PAD, 'jump', true],
        [6, PAD, 'interact', true],
        [8, PAD, 'jump', false],
      ],
      100,
    );
    expect(r.opened).toEqual(['unscrew']);
    expect(r.progress[60]).toBeGreaterThan(0.4);
  });

  it('Y + A together unscrews (the e2e-traverse pad check reads 0.3..0.9 at 1 s)', () => {
    const r = play(
      [
        [0, PAD, 'jump', true],
        [0, PAD, 'interact', true],
        [1, PAD, 'jump', false],
      ],
      100,
    );
    expect(r.opened).toEqual(['unscrew']);
    expect(r.progress[60]).toBeGreaterThan(0.3);
    expect(r.progress[60]).toBeLessThan(0.9);
  });

  it('A let go early stops the unscrew without a kick', () => {
    const r = play(
      [
        [0, PAD, 'jump', true],
        [6, PAD, 'interact', true],
        [8, PAD, 'jump', false],
        [50, PAD, 'interact', false],
      ],
      90,
    );
    expect(r.maxP).toBeGreaterThan(0.2);
    expect(r.maxP).toBeLessThan(1);
    expect(r.opened).toEqual([]);
    expect(r.vent).toBeNull();
  });

  it('a scripted tap (tests, tools) holds nothing: a kick, as before', () => {
    const tap = play([], 30, FIXED, 0);
    expect(tap.opened).toEqual(['kick']);
    // and A held 100 ms after a scripted tap is too late (the pre-fix rule): a kick
    const late = play([[6, PAD, 'interact', true]], 30, FIXED, 0);
    expect(late.opened).toEqual(['kick']);
  });

  it('pad, keyboard and pad Y with keyboard E give the same progress and outcome on every pattern', () => {
    // Y / Space down at 0 for `j` frames, A / E down at `u` for `h` frames, at 60 Hz and on 33 ms frames
    for (const dt of [FIXED, 2 * FIXED]) {
      for (const j of [1, 3, 8, 20, 120]) {
        for (const u of [-1, 0, 3, 6, 9]) {
          for (const h of [20, 60, 200]) {
            const ev: Ev[] = [
              [0, '', 'jump', true],
              [j, '', 'jump', false],
            ];
            if (u >= 0) ev.push([u, '', 'interact', true], [u + h, '', 'interact', false]);
            const frames = Math.round(4 / dt) + 10;
            const kb = play(as(ev, KB, KB), frames, dt);
            const pad = play(as(ev, PAD, PAD), frames, dt);
            const mix = play(as(ev, PAD, KB), frames, dt);
            expect(pad.opened).toEqual(kb.opened);
            expect(pad.progress).toEqual(kb.progress);
            expect(mix.opened).toEqual(kb.opened);
            expect(mix.progress).toEqual(kb.progress);
          }
        }
      }
    }
  });
});
