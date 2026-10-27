import { describe, expect, it } from 'vitest';
import { MAX_ENEMIES, MAX_ITEMS, MAX_PLAYERS, packAlert, parseMessage, snapEnemyState, snapItem, snapPlayerState, wireNum, type EnemyState, type Msg, type NetItem, type PlayerState } from '../src/net/protocol';
import { emptyMoveState } from '../src/player/moveState';
import { ENEMY_KINDS } from '../src/ai/enemyDefs';
import { mulberry } from '../src/core/rng';

/**
 * (coop4 N1, A24, PLAN section 2) The host's one broadcast snapshot at 4 players stays inside the budget: steady (4
 * players, 32 guards, no items) <= 6 KB of JSON; the worst case (items, doors, cracked doors and bodies all sent, 128
 * items) <= 32 KB (Trystero's message cap is 64 KB). Synthetic worst-case content through the host's own wire
 * functions (`snapPlayerState` / `snapEnemyState` / `snapItem`: numbers in 1 mm / 1 mrad steps): every optional player
 * field set, a committed move and planted grips at once, long ids and full-length labels.
 */

const STEADY_MAX = 6 * 1024;
const WORST_MAX = 32 * 1024;

const rnd = mulberry(4242);
/** A float as the sim makes one (17 significant digits on the wire). */
const f = (lo: number, hi: number): number => lo + (hi - lo) * rnd() + 1e-9 * rnd();
const idOf = (p: string, i: number, len: number): string => `${p}${i}`.padEnd(len, 'x');

function player(i: number): PlayerState {
  const mv = emptyMoveState();
  mv.m = 'vault';
  mv.a = 1234;
  mv.s = f(0, 40);
  mv.sub = 1023;
  mv.ph = f(0, 1);
  mv.tid = idOf('guard-', i, 16);
  mv.r = f(0, 1);
  mv.ay = f(-3, 3);
  mv.dw = 2;
  mv.u = f(-1, 1);
  mv.rd = 2;
  mv.gp = [f(0, 9), f(0, 9), f(0, 9), f(0, 9)];
  mv.c = { n: 200, x0: f(-200, 200), y0: f(0, 9), z0: f(-200, 200), x1: f(-200, 200), y1: f(0, 9), z1: f(-200, 200), top: f(0, 3), v: f(0, 6), dur: f(0, 2) };
  return {
    id: idOf('peer', i, 20),
    x: f(-200, 200),
    y: f(0, 9),
    z: f(-200, 200),
    yaw: f(-3, 3),
    pitch: f(-1.5, 1.5),
    speed: f(0, 6),
    f: 1023,
    w: 'rifle',
    hp: f(0, 100),
    sc: 255,
    mv,
    t: f(0, 9999),
    gph: f(0, 1),
    qs: f(0, 1),
    hs: f(0, 6),
    mo: 5,
    mt: f(0, 60),
    ax: f(-100, 100),
    az: f(-100, 100),
  };
}

function guard(i: number): EnemyState {
  return {
    id: idOf('s4-guard-', i, 16),
    k: ENEMY_KINDS[i % ENEMY_KINDS.length]!,
    x: f(-200, 200),
    y: f(0, 9),
    z: f(-200, 200),
    yaw: f(-3, 3),
    st: i % 3,
    hp: f(0, 1),
    al: packAlert(3, true, true, true, true, true, 3),
  };
}

function item(i: number): NetItem {
  return { id: idOf('s3-door-panel-', i, 24), k: 'switch', x: f(-200, 200), y: f(0, 9), z: f(-200, 200), yaw: f(-3, 3), label: 'Hold to override the loc'.slice(0, 24), hold: f(0, 5), reach: f(1, 3), on: true, hn: f(0, 20) };
}

function snap(withItems: boolean): Extract<Msg, { t: 'snap' }> {
  const players: PlayerState[] = [];
  for (let i = 0; i < MAX_PLAYERS; i++) players.push(snapPlayerState(player(i)));
  const enemies: EnemyState[] = [];
  for (let i = 0; i < MAX_ENEMIES; i++) enemies.push(snapEnemyState(guard(i)));
  const s: Extract<Msg, { t: 'snap' }> = { t: 'snap', time: f(0, 9999), players, enemies, obj: 'O'.repeat(80), info: 'I'.repeat(120), pk: 2 ** 30 };
  if (withItems) {
    s.items = [];
    for (let i = 0; i < MAX_ITEMS; i++) s.items.push(snapItem(item(i)));
    s.doors = Array.from({ length: 64 }, (_, i) => 200 + i);
    s.dcr = [1, 2, 3, 4];
    s.bodies = Array.from({ length: MAX_ENEMIES }, (_, i) => idOf('s4-guard-', i, 16));
  }
  return s;
}

describe('coop4 N1: snapshot bandwidth at 4 players (A24)', () => {
  it('steady: 4 players and 32 guards fit in 6 KB of JSON, and the message parses whole', () => {
    const s = snap(false);
    const bytes = JSON.stringify(s).length;
    console.info(`[snapBudget] steady 4p x 32 guards: ${bytes} B (budget ${STEADY_MAX})`);
    expect(bytes).toBeLessThanOrEqual(STEADY_MAX);
    const m = parseMessage(JSON.parse(JSON.stringify(s)));
    expect(m?.t).toBe('snap');
    if (m?.t !== 'snap') return;
    expect(m.players).toHaveLength(MAX_PLAYERS);
    expect(m.enemies).toHaveLength(MAX_ENEMIES);
  });

  it('worst case: with 128 items, doors and bodies it fits in 32 KB (Trystero caps a message at 64 KB)', () => {
    const s = snap(true);
    const bytes = JSON.stringify(s).length;
    console.info(`[snapBudget] worst 4p x 32 guards + 128 items: ${bytes} B (budget ${WORST_MAX})`);
    expect(bytes).toBeLessThanOrEqual(WORST_MAX);
    const m = parseMessage(JSON.parse(JSON.stringify(s)));
    expect(m?.t === 'snap' && m.items?.length).toBe(MAX_ITEMS);
  });

  it('typical play (players walking: no committed move, no grips) sits well under the steady budget', () => {
    const s = snap(false);
    for (const p of s.players) {
      const mv = p.mv as unknown as Record<string, unknown>;
      delete mv.c;
      delete mv.gp;
      delete mv.u;
    }
    const bytes = JSON.stringify(s).length;
    console.info(`[snapBudget] typical 4p x 32 guards: ${bytes} B`);
    expect(bytes).toBeLessThan(STEADY_MAX);
  });

  it('the rounding keeps 1 mm and a living body alive', () => {
    expect(wireNum(1.23456789)).toBe(1.235);
    expect(wireNum(-200.0004)).toBe(-200);
    const p = snapPlayerState({ ...player(0), hp: 0.0001 });
    expect(p.hp).toBe(0.001);
    expect(snapEnemyState({ ...guard(0), hp: 0.0002 }).hp).toBe(0.001);
    expect(snapEnemyState({ ...guard(0), hp: 0 }).hp).toBe(0);
    // the source state is not touched (the host keeps its own copy)
    const src = player(1);
    const x = src.x;
    snapPlayerState(src);
    expect(src.x).toBe(x);
  });

  it('the host upload at 15 Hz to 3 clients stays near the plan (<= ~2.2 Mbit/s at the steady budget)', () => {
    const bytes = JSON.stringify(snap(false)).length;
    const mbit = (bytes * 15 * (MAX_PLAYERS - 1) * 8) / 1e6;
    console.info(`[snapBudget] host upload steady: ${mbit.toFixed(2)} Mbit/s`);
    expect(mbit).toBeLessThanOrEqual(2.25);
  });
});
