import { describe, expect, it, vi } from 'vitest';
import { LoadoutSnapshot, type AmmoSlot } from '../src/weapons/loadoutSnapshot';
import { EnemyManager } from '../src/ai/enemyManager';
import { DIFFICULTY, ARCHETYPE } from '../src/ai/archetypes';
import { GameMusic } from '../src/audio/score/game/gameMusic';
import { loadoutEntries } from '../src/progression/profile';
import { defaultSave } from '../src/save/schema';
import { computeStats } from '../src/weapons/weaponStats';
import { WEAPONS } from '../src/weapons/weaponDefs';
import { SectorRun } from '../src/game/sectors';
import type { Enemy, PlayerRef } from '../src/ai/enemy';
import type { Body } from '../src/ai/body';
import type { Scene } from '../src/core/babylon';
import type { World } from '../src/world/world';
import type { NavGrid } from '../src/ai/navGrid';
import type { DamageRegistry } from '../src/game/damage';
import type { Ballistics } from '../src/weapons/ballistics';
import type { Vfx } from '../src/vfx/vfx';
import type { AudioEngine } from '../src/audio/audioEngine';
import type { SectorDef } from '../src/game/sectors';
import { PlayerWeapons } from '../src/weapons/playerWeapons';
import { GadgetInventory } from '../src/game/gadgets';

// (sector-restart, M9) a Sector Ops checkpoint restart is a clean start: the loadout as the section began (reloaded), the
// guards' shared memory at its match-start state, the music back in Calm, and the rifle issued suppressed

const slot = (mag: number, reserve: number, magSize = 30): AmmoSlot => ({ mag, reserve, stats: { magSize } });
const carry = (): { counts: Record<'frag' | 'flash' | 'noise', number>; selected: 'frag' | 'flash' | 'noise' } => ({ counts: { frag: 2, flash: 1, noise: 3 }, selected: 'frag' });

describe('LoadoutSnapshot (the checkpoint loadout)', () => {
  it('does nothing before a snapshot is taken', () => {
    const k = new LoadoutSnapshot();
    const s = [slot(3, 10)];
    expect(k.restore(s, carry())).toBe(false);
    expect(s[0]!.mag).toBe(3);
  });

  it('gives back every gun reloaded (full magazine, the snapshot rounds kept) and the gadgets as they were', () => {
    const k = new LoadoutSnapshot<'frag' | 'flash' | 'noise'>();
    const guns = [slot(30, 90), slot(12, 36, 15)];
    const g = carry();
    g.selected = 'noise';
    k.take(guns, g);
    // the section is played: shots fired, a reload, gadgets used, another one selected
    guns[0]!.mag = 0;
    guns[0]!.reserve = 20;
    guns[1]!.mag = 4;
    guns[1]!.reserve = 0;
    g.counts.frag = 0;
    g.counts.noise = 0;
    g.selected = 'flash';
    expect(k.restore(guns, g)).toBe(true);
    expect(guns.map((s) => [s.mag, s.reserve])).toEqual([[30, 90], [15, 33]]);
    expect(g.counts).toEqual({ frag: 2, flash: 1, noise: 3 });
    expect(g.selected).toBe('noise');
    // a second restart gives the same (the snapshot is not consumed)
    guns[0]!.mag = 1;
    k.restore(guns, g);
    expect(guns[0]!.mag).toBe(30);
  });

  it('(sd-rounds) the quiet rounds come back with the loadout; a slot without them restores as before', () => {
    const k = new LoadoutSnapshot();
    const guns: AmmoSlot[] = [{ mag: 10, reserve: 50, sd: 30, stats: { magSize: 30 } }, slot(10, 50)];
    k.take(guns, carry());
    guns[0]!.sd = 0;
    guns[0]!.mag = 0;
    guns[1]!.mag = 0;
    expect(k.restore(guns, carry())).toBe(true);
    expect(guns[0]!.sd).toBe(30);
    expect(guns[1]!.sd).toBeUndefined();
    expect([guns[1]!.mag, guns[1]!.reserve]).toEqual([30, 30]);
  });

  it('a magazine short at the checkpoint is topped up from its reserve, never from nowhere', () => {
    const k = new LoadoutSnapshot();
    const guns = [slot(10, 5), slot(0, 0)];
    k.take(guns, carry());
    guns[0]!.mag = 0;
    k.restore(guns, carry());
    expect([guns[0]!.mag, guns[0]!.reserve]).toEqual([15, 0]);
    expect([guns[1]!.mag, guns[1]!.reserve]).toEqual([0, 0]);
    // infinite ammo (tests / debug): always a full magazine, the reserve untouched
    k.restore(guns, carry(), true);
    expect([guns[0]!.mag, guns[0]!.reserve]).toEqual([30, 5]);
  });
});

function manager(refs: PlayerRef[]) {
  const world = {
    level: { lights: { lights: [], setOn: vi.fn() }, cover: [], coverSegments: [] },
    layout: { rooms: [] },
    doors: { list: [] },
  };
  const nav = { walk: new Uint8Array(4), nearestWalkable: vi.fn(() => -1) };
  return new EnemyManager({} as Scene, world as unknown as World, nav as unknown as NavGrid, {} as DamageRegistry, {} as Ballistics, {} as Vfx, DIFFICULTY.normal, () => refs);
}

describe('EnemyManager.resetMemory (a checkpoint restart)', () => {
  it('empties the world of guards and clears every shared memory back to the match start', () => {
    // (down: the manager's constructor builds no chase field for it on the stub nav)
    const ref = { id: 'local', spotted: true, target: { alive: false } } as unknown as PlayerRef;
    const em = manager([ref]);
    const g = { id: 'g1', alive: true, dog: null, coverIdx: -1, dispose: vi.fn() } as unknown as Enemy;
    em.enemies.push(g);
    em.joinSquad(g, 1);
    em.bodies.push({ enemyId: 'x', dispose: vi.fn() } as unknown as Body);
    em.lkp.set(4, 0, 9);
    em.lkpValid = true;
    em.sightT = 0;
    em.alarmRaised = true;
    em.flanker = g;
    const priv = em as unknown as { alarmRunner: Enemy | null; grenadeT: number; radioT: number; flowField: Float32Array; squads: Map<number, Enemy[]> };
    priv.alarmRunner = g;
    priv.grenadeT = 8;
    priv.radioT = 1;
    priv.flowField.fill(3);
    em.resetMemory();
    expect(em.enemies).toEqual([]);
    expect(em.bodies).toEqual([]);
    expect(g.dispose).toHaveBeenCalledTimes(1);
    expect(em.lkpValid).toBe(false);
    expect([em.lkp.x, em.lkp.z]).toEqual([0, 0]);
    expect(em.sightT).toBe(99);
    expect(em.alarmRaised).toBe(false);
    expect(priv.alarmRunner).toBeNull();
    expect(em.flanker).toBeNull();
    expect(priv.squads.size).toBe(0);
    expect(priv.grenadeT).toBe(0);
    expect(priv.radioT).toBe(ARCHETYPE.radio.period);
    // no chase field left pointing at the old last known position
    expect([...priv.flowField].every((v) => v === Infinity)).toBe(true);
    expect(ref.spotted).toBe(false);
    expect(em.anyAlerted).toBe(false);
    expect(em.hunting).toBe(false);
  });
});

describe('the music after a checkpoint restart', () => {
  it('Alert (or anything) goes back to Calm at once; the menu is untouched', () => {
    const audio = { ctx: null, whenReady: () => undefined } as unknown as AudioEngine;
    const m = new GameMusic(audio);
    m.calm();
    expect(m.state).toBe('off');
    m.mission();
    const d = (m as unknown as { director: { update(now: number, g: string): unknown } }).director;
    d.update(1, 'alert');
    expect(m.state).toBe('alert');
    m.calm();
    expect(m.state).toBe('calm');
    // the director climbs again from Calm (a guard alerted after the restart is Alert at once)
    d.update(2, 'alert');
    expect(m.state).toBe('alert');
  });
});

describe('the Sector Ops kit (A2)', () => {
  it('issues the campaign rifle suppressed in Sector Ops, as in Infiltration', () => {
    const s = defaultSave();
    s.loadout = { primary: 'pistolSd', secondary: 'rifle' };
    const kit = loadoutEntries(s, 'sector', true);
    const rifle = kit.find((e) => e.id === 'rifle')!;
    expect(rifle.attachments).toContain('suppressor');
    expect(computeStats(WEAPONS.rifle, s.weapons.rifle.upgrades, rifle.mods).noise).toBeLessThanOrEqual(0.6);
    expect(computeStats(WEAPONS.pistolSd, s.weapons.pistolSd.upgrades, kit.find((e) => e.id === 'pistolSd')!.mods).noise).toBeLessThanOrEqual(0.6);
    // ?legacy=1 (no campaign): the save as is
    expect(loadoutEntries(s, 'sector', false).find((e) => e.id === 'rifle')!.attachments).toEqual([]);
  });
});

describe('PlayerWeapons.restoreCheckpoint (check fix 1)', () => {
  it('ends a throw still in hand at the down: nothing leaves the hand after the respawn, the gadget is back', () => {
    // a PlayerWeapons without a scene: only the fields the throw, the reload cut and the restore read
    const w = Object.create(PlayerWeapons.prototype) as PlayerWeapons;
    const player = { grenadeT: -1, aimLockTimer: 0, rig: { holdingMag: false } };
    const gun = { def: WEAPONS.rifle, stats: { magSize: 30 }, mag: 30, reserve: 90, model: { magSeated: vi.fn() } };
    Object.assign(w, {
      player,
      slots: [gun],
      gadgets: new GadgetInventory(),
      checkpointKit: new LoadoutSnapshot(),
      held: 0,
      index: 0,
      infiniteAmmo: false,
      grenadeCd: 0,
      grenadeT: -1,
      grenadeThrown: false,
      reloadT: -1,
      swapT: -1,
      stowed: false,
      attachMode: false,
    });
    w.gadgets.select('frag');
    w.markCheckpoint();
    const frags = w.gadgets.counts.frag;
    // a frag is pulled (taken from the pouch), then the player goes down before its release
    expect(w.useGadget()).toBe(true);
    expect(w.throwing).toBe(true);
    expect(w.gadgets.counts.frag).toBe(frags - 1);
    const priv = w as unknown as { grenadeT: number; grenadeThrown: boolean; grenadeCd: number };
    priv.grenadeT = 0.5;
    player.grenadeT = 0.5 / 1.2;
    player.aimLockTimer = 0.4;
    expect(w.restoreCheckpoint()).toBe(true);
    expect(w.throwing).toBe(false);
    expect([priv.grenadeT, priv.grenadeThrown, priv.grenadeCd]).toEqual([-1, false, 0]);
    expect([player.grenadeT, player.aimLockTimer]).toEqual([-1, 0]);
    expect(w.gadgets.counts.frag).toBe(frags);
    // a fresh throw works after the respawn (no cooldown or throw left over)
    expect(w.useGadget()).toBe(true);
  });
});

describe('the run after a restart', () => {
  it('section 1: an alarm, a restart: stage 0, objective open again', () => {
    const def = {
      id: 'a',
      name: 'A',
      start: { x: 0, y: 0, z: 0, yaw: 0 },
      objective: { kind: 'hack', label: 'Hack', x: 1, y: 0, z: 1 },
      guards: [],
      routes: [],
      reinforce: [],
      perStage: 2,
      extract: { box: [0, 0, 1, 1], label: 'Out' },
    } as unknown as SectorDef;
    const r = new SectorRun([def]);
    r.raiseAlarm();
    r.raiseAlarm();
    expect(r.alarm).toBe(2);
    r.restartSection();
    expect(r.alarm).toBe(0);
    expect(r.phase).toBe('objective');
    expect(r.index).toBe(0);
  });
});
