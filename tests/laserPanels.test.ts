/**
 * (sector-fixes P, item 6, Michael 2026-10-22: "If there's lasers, there should be panels nearby that power them which
 * can be interrupted using the jammer. Must be hard to access and not in plain sight. Electro vision should show the
 * panel.") The laser power panels: the pure rules (`game/laserPanels.ts`), every map's data, each panel's placement
 * traced through the level's pieces (hidden from the floor round its band, jammable from a reachable vantage), and the
 * jam path in `CtDevices` with a stand-in match (host and client).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Vector3, Vector4, type Color4 } from '../src/core/babylon';
import { DEV_IDLE, DEV_JAMMED, DEV_RECOVER, JAMMER, newDevJam, recoverTime, stepDevJam, type LaserDef } from '../src/game/jammer';
import {
  LED_BOOT,
  LED_DARK,
  LED_JAM,
  LED_JAM_DIM,
  LED_ON,
  PANEL,
  PANEL_LED_PART,
  PANEL_PART,
  checkPanels,
  laserLive,
  panelFor,
  panelLed,
  panelTarget,
  type LaserPanelDef,
} from '../src/game/laserPanels';
import type { CtDevices as CtDevicesT } from '../src/game/ctDevices';
import { LevelBuilder } from '../src/world/levelBuilder';
import { MAPS } from '../src/world/maps';
import { warehouseOps } from '../src/world/maps/warehouseOps';
import { WAREHOUSE_OPS_PANELS } from '../src/world/maps/warehouseSectors';
import { SightWorld } from '../src/game/sectorCheck';
import { distToSegment } from '../src/game/jammer';
import { hyp2, hyp3 } from '../src/core/mathx';

const L1: LaserDef = { id: 'l1', x1: 10, z1: 4, x2: 10, z2: 10, ys: [0.35, 0.9, 1.45], label: 'Test laser' };
const L2: LaserDef = { id: 'l2', x1: 14, z1: 4, x2: 14, z2: 10, ys: [0.35, 0.9, 1.45] };
const P1: LaserPanelDef = { id: 'p1', lasers: ['l1', 'l2'], x: 12, y: 2, z: 0, yaw: 0 };

describe('(sector-fixes P) the panel rules', () => {
  it('the jam point sits PANEL.face out of the wall, along the yaw', () => {
    const o = { x: 0, y: 0, z: 0 };
    expect(panelTarget(P1, o)).toEqual({ x: 12, y: 2, z: PANEL.face });
    panelTarget({ ...P1, yaw: Math.PI / 2 }, o);
    expect(o.x).toBeCloseTo(12 + PANEL.face);
    expect(o.z).toBeCloseTo(0);
  });

  it('panel -> lasers: one panel powers several bands; a laser without a panel is found by none', () => {
    const panels = [P1, { ...P1, id: 'p2', lasers: ['l3'] }];
    expect(panelFor(panels, 'l1')).toBe(0);
    expect(panelFor(panels, 'l2')).toBe(0);
    expect(panelFor(panels, 'l3')).toBe(1);
    expect(panelFor(panels, 'nope')).toBe(-1);
  });

  it('a laser is live only while its panel is idle, its section live and no release switched it off', () => {
    expect(laserLive(DEV_IDLE, false, false)).toBe(true);
    expect(laserLive(DEV_JAMMED, false, false)).toBe(false);
    expect(laserLive(DEV_RECOVER, false, false)).toBe(false);
    expect(laserLive(DEV_IDLE, true, false)).toBe(false);
    expect(laserLive(DEV_IDLE, false, true)).toBe(false);
    // no panel: always powered
    expect(laserLive(-1, false, false)).toBe(true);
  });

  it('a jam cuts the lasers for the jam and the 1.5 s reboot, then they come back', () => {
    expect(recoverTime('panel')).toBe(JAMMER.reboot);
    const d = newDevJam();
    const dt = 1 / 60;
    stepDevJam(d, true, 'panel', dt);
    expect(d.ph).toBe(DEV_JAMMED);
    expect(laserLive(d.ph, false, false)).toBe(false);
    for (let t = 0; t < 3; t += dt) stepDevJam(d, true, 'panel', dt);
    stepDevJam(d, false, 'panel', dt);
    expect(d.ph).toBe(DEV_RECOVER);
    let t = 0;
    while (d.ph === DEV_RECOVER && t < 5) {
      expect(laserLive(d.ph, false, false)).toBe(false);
      stepDevJam(d, false, 'panel', dt);
      t += dt;
    }
    expect(t).toBeGreaterThan(JAMMER.reboot - 0.05);
    expect(t).toBeLessThan(JAMMER.reboot + 0.05);
    expect(laserLive(d.ph, false, false)).toBe(true);
  });

  it('the LED: on, a blink while jammed, amber while rebooting, dark when its section is dead or its bands released', () => {
    expect(panelLed(DEV_IDLE, 0, false, false)).toBe(LED_ON);
    expect(panelLed(DEV_JAMMED, 0.01, false, false)).toBe(LED_JAM);
    expect(panelLed(DEV_JAMMED, 0.13, false, false)).toBe(LED_JAM_DIM);
    expect(panelLed(DEV_JAMMED, 0.26, false, false)).toBe(LED_JAM);
    expect(panelLed(DEV_RECOVER, 0.5, false, false)).toBe(LED_BOOT);
    expect(panelLed(DEV_IDLE, 0, true, false)).toBe(LED_DARK);
    expect(panelLed(DEV_JAMMED, 0, true, false)).toBe(LED_DARK);
    expect(panelLed(DEV_IDLE, 0, false, true)).toBe(LED_DARK);
  });

  it('checkPanels: exactly one panel per laser, every listed laser exists, ids unique, sections match', () => {
    expect(checkPanels([L1, L2], [P1])).toEqual([]);
    expect(checkPanels([L1, L2], [{ ...P1, lasers: ['l1'] }])).toEqual(['laser l2: 0 panels (one needed)']);
    expect(checkPanels([L1, L2], [P1, { ...P1, id: 'p2', lasers: ['l2'] }])).toEqual(['laser l2: 2 panels (one needed)']);
    expect(checkPanels([L1], [{ ...P1, lasers: ['l1', 'ghost'] }])).toEqual(['panel p1: no laser ghost']);
    expect(checkPanels([], [{ ...P1, lasers: [] }])).toEqual(['panel p1: powers no laser']);
    expect(checkPanels([L1, L2], [P1, { ...P1, lasers: [] }])).toContain('panel p1: id used twice');
    expect(checkPanels([{ ...L1, section: 0 }, { ...L2, section: 0 }], [{ ...P1, section: 1 }])).toEqual([
      'panel p1: section 1 but laser l1 is in 0',
      'panel p1: section 1 but laser l2 is in 0',
    ]);
  });
});

describe('(sector-fixes P) every map with lasers has their panels', () => {
  it('every laser in every map has exactly one panel and every panel powers lasers that exist', () => {
    let lasers = 0;
    for (const map of MAPS) {
      const lay = map.build(new LevelBuilder(), 0);
      expect(checkPanels(lay.lasers ?? [], lay.laserPanels ?? []), map.id).toEqual([]);
      // (marlow-final 0d) Marlow Yard's lasers come and go with its set slices (A5, A8): the frame there checks them
      if (map.id !== 'ctcourse') lasers += (lay.lasers ?? []).length;
    }
    // Sector Ops' five bands and Saltmarsh Park's four (las-gown, las-store; sector-redesign slice 3; + S4's las-tray,
    // S5's las-shaft) = 9. Marlow Yard's lasers are left out above (marlow-final 0d); master's count of 10 included
    // Marlow Yard's station 4
    expect(lasers).toBe(9);
    expect(WAREHOUSE_OPS_PANELS.map((p) => p.id)).toEqual(['panel-workshop', 'panel-deck', 'panel-vna', 'panel-mezz']);
    expect(WAREHOUSE_OPS_PANELS.find((p) => p.id === 'panel-mezz')!.lasers).toEqual(['laser-deck-stairs', 'laser-deck-west']);
  });
});

/**
 * Placement (Michael: "near", "hard to access and not in plain sight", reachable with the jammer). Per panel: the feet
 * spot it is jammed from (a top a player climbs to, or round a corner), and the floor regions round its band it must be
 * hidden from [x0, z0, x1, z1, floor y]: from every free spot there (eye 1.6 m), no line reaches it inside the game's
 * `JAMMER.losSlack` (the jam's own line test).
 */
interface Place {
  map: 'w';
  panel: LaserPanelDef;
  jam: [number, number, number];
  hidden: [number, number, number, number, number][];
}
const W = (id: string): LaserPanelDef => WAREHOUSE_OPS_PANELS.find((p) => p.id === id)!;
const PLACES: Place[] = [
  // the workshop floor, both sides of the band: the void's east wall; jammed from the catwalk through its opening
  { map: 'w', panel: W('panel-workshop'), jam: [10.5, 3.0, -9.55], hidden: [[8.4, -17.6, 23.6, -9.4, 0]] },
  // the open deck north of the AHU, both sides of the band; jammed round the AHU from the deck's south-west corner (re-merge with R: moved 0.4 m west off R1's plant-room sill)
  { map: 'w', panel: W('panel-deck'), jam: [-3.6, 3.3, -17.2], hidden: [[-7.5, -15.0, 4.5, -14.3, 3.3]] },
  // the VNA aisle and the gangway round the sensor; jammed from R1N's top across the aisle
  { map: 'w', panel: W('panel-vna'), jam: [-18.75, 4.0, 12.5], hidden: [[-19.6, 8, -12.6, 17.6, 0]] },
  // the deck strip both bands cross, and the hall floor south of the deck; jammed along the slot behind the shelving
  { map: 'w', panel: W('panel-mezz'), jam: [19, 0, 17.4], hidden: [[8.5, 12.2, 23.5, 14.2, 3.3], [0, 0, 23.5, 11, 0]] },
];

describe('(sector-fixes P) each panel: near its band, hidden from the floor round it, jammable from a spot a player reaches', () => {
  const bw = new LevelBuilder();
  const wl = warehouseOps.build(bw, 0);
  const worlds = { w: new SightWorld(bw.boxes, bw.cylinders) };
  const lasersOf = { w: wl.lasers ?? [] };
  /** The jam's line test: clear up to `JAMMER.losSlack` short of the target (`CtDevices.clearFrom`). */
  const jamLine = (w: SightWorld, ax: number, ay: number, az: number, t: { x: number; y: number; z: number }): boolean => {
    const d = hyp3(t.x - ax, t.y - ay, t.z - az);
    const k = Math.max(0, (d - JAMMER.losSlack) / d);
    return w.clear(ax, ay, az, ax + (t.x - ax) * k, ay + (t.y - ay) * k, az + (t.z - az) * k);
  };

  for (const pl of PLACES) {
    it(pl.panel.id, () => {
      const w = worlds[pl.map];
      const t = panelTarget(pl.panel, { x: 0, y: 0, z: 0 });
      // mounted: a solid face just behind its back, or a solid top just under its housing (the rack-top one)
      const bx = pl.panel.x - Math.sin(pl.panel.yaw) * 0.05;
      const bz = pl.panel.z - Math.cos(pl.panel.yaw) * 0.05;
      const onWall = !w.clear(t.x, t.y, t.z, bx, pl.panel.y, bz);
      const onTop = !w.clear(t.x, t.y, t.z, t.x, pl.panel.y - PANEL.h / 2 - 0.1, t.z);
      expect(onWall || onTop, 'a solid face behind the panel or a top under it').toBe(true);
      // near: its nearest band within 8 m, every band it powers within 15 m
      const ds = pl.panel.lasers.map((id) => {
        const l = lasersOf[pl.map].find((q) => q.id === id)!;
        const fy = l.floorY ?? 0;
        const dy = Math.max(0, fy - t.y, t.y - (fy + l.ys[l.ys.length - 1]!));
        return hyp2(distToSegment(t.x, t.z, l.x1, l.z1, l.x2, l.z2), dy);
      });
      expect(Math.min(...ds), 'near its band').toBeLessThan(8);
      expect(Math.max(...ds), 'near every band it powers').toBeLessThan(15);
      // the vantage: a free spot on a solid top (or the ground), a clear line from the eye within the jammer's range
      const [jx, jy, jz] = pl.jam;
      expect(w.blocked(jx, jy, jz), 'the vantage is free').toBe(false);
      if (jy > 0) expect(w.clear(jx, jy + 0.1, jz, jx, jy - 0.2, jz), 'the vantage stands on a top').toBe(false);
      const ey = jy + 1.6;
      expect(w.clear(jx, ey, jz, t.x, t.y, t.z), 'a clear line from the vantage').toBe(true);
      expect(hyp3(t.x - jx, t.y - ey, t.z - jz)).toBeLessThan(JAMMER.range - 2);
      // hidden: no jam line from any free spot of the regions round the band
      const seen: string[] = [];
      for (const [x0, z0, x1, z1, fy] of pl.hidden) {
        for (let x = x0; x <= x1 + 1e-6; x += 0.5) {
          for (let z = z0; z <= z1 + 1e-6; z += 0.5) {
            if (w.blocked(x, fy, z)) continue;
            if (jamLine(w, x, fy + 1.6, z, t)) seen.push(`(${x}, ${fy}, ${z})`);
          }
        }
      }
      expect(seen, 'hidden from the floor round its band').toEqual([]);
    });
  }
});

// ---- the jam path in CtDevices (a stand-in match, as tests/laserAlarm.test.ts) ----

interface FakePart {
  name: string;
  hex: string;
  enabled: boolean;
  instancedBuffers: { pattern: Vector4; color: Color4 | null };
  scaling: Vector3;
  position: Vector3;
  rotation: Vector3;
  isPickable: boolean;
  setEnabled(on: boolean): void;
  isEnabled(): boolean;
  dispose(): void;
}

function part(name: string, hex: string): FakePart {
  return {
    name,
    hex,
    enabled: true,
    instancedBuffers: { pattern: new Vector4(0, 1, 0, 0), color: null },
    scaling: new Vector3(),
    position: new Vector3(),
    rotation: new Vector3(),
    isPickable: true,
    setEnabled(on) {
      this.enabled = on;
    },
    isEnabled() {
      return this.enabled;
    },
    dispose() {},
  };
}

function world(sections = false) {
  const parts: FakePart[] = [];
  const player = {
    id: 'host',
    feet: new Vector3(4, 0, 7),
    crouched: false,
    speed: 0,
    light: 1,
    target: { alive: true, health: { hp: 100 }, applyDamage: () => undefined, aimPoint: (o: Vector3) => o },
  };
  const lasers = sections ? [{ ...L1, section: 0 }, { ...L2, section: 0 }] : [L1, L2];
  const panels = [sections ? { ...P1, section: 0 } : P1];
  const g = {
    world: {
      layout: { lasers, laserPanels: panels },
      level: { lights: { lights: [], setOn: () => undefined } },
      parts: { instance: (_s: string, hex: string, name: string) => { const p = part(name, hex); parts.push(p); return p; } },
      lightField: { totalAt: () => 1 },
    },
    scene: {},
    security: null,
    ballistics: { hitDistance: (a: Vector3, b: Vector3) => Vector3.Distance(a, b) },
    app: { quality: { level: { minimal: false } } },
    vision: { night: 0, kind: 0 },
    hud: { banner: () => undefined, el: { appendChild: () => undefined } },
    playerRefs: () => [player],
    playerRefsInto: (out: unknown[]) => {
      out.length = 0;
      out.push(player);
      return out;
    },
    weapons: { slots: [] },
  };
  return { g, parts, player };
}

describe('(sector-fixes P) CtDevices: jamming the panel cuts its lasers', () => {
  let CtDevices: typeof CtDevicesT;
  beforeAll(async () => {
    (globalThis as unknown as { window: unknown }).window ??= globalThis;
    const gd = globalThis as unknown as { document?: unknown };
    gd.document ??= { createElement: () => ({ className: '', textContent: '', style: { cssText: '', display: '' }, remove: () => undefined }) };
    ({ CtDevices } = await import('../src/game/ctDevices'));
  });
  afterAll(() => {
    delete (globalThis as unknown as { __ctdev?: unknown }).__ctdev;
  });

  type Dbg = { lasers: { id: string; on: boolean; panel: string; live: boolean }[]; panels: { id: string; ph: number; led: number; live: boolean; lasers: string[] }[]; jam: string[]; hits: number };
  const dbg = (d: CtDevicesT): Dbg => d.debug() as unknown as Dbg;
  const make = (role: 'host' | 'client' = 'host', sections = false) => {
    const w = world(sections);
    const said: string[] = [];
    const dev = new CtDevices(w.g as never, role, { say: (t) => said.push(t), record: () => undefined, dirty: () => undefined });
    return { ...w, dev, said };
  };
  /** Step the host `s` seconds with the host's jam intent on `want` ('' none; the trigger's job in the game). */
  const step = (dev: CtDevicesT, s: number, want = ''): void => {
    const p = dev as unknown as { want: string[]; wantAt: number[]; time: number };
    for (let t = 0; t < s - 1e-9; t += 1 / 60) {
      p.want[0] = want;
      p.wantAt[0] = p.time;
      dev.fixedUpdate(1 / 60);
    }
  };

  it('the panel is the jam target, the lasers are not (A1); it builds a housing electro paints and an LED', () => {
    const m = make();
    expect(m.dev.targets.map((t) => [t.id, t.kind])).toEqual([['p1', 'panel']]);
    expect(m.dev.targets[0]!.z).toBeCloseTo(PANEL.face);
    const housing = m.parts.filter((p) => p.name === PANEL_PART);
    const led = m.parts.filter((p) => p.name === PANEL_LED_PART);
    expect(housing.length).toBeGreaterThanOrEqual(4);
    expect(led.length).toBe(1);
    // render only, never picked
    expect(m.parts.every((p) => !p.isPickable)).toBe(true);
    expect(dbg(m.dev).lasers.map((l) => l.panel)).toEqual(['p1', 'p1']);
    step(m.dev, 0.1);
    expect(dbg(m.dev).panels[0]!.led).toBe(LED_ON);
    expect(led[0]!.instancedBuffers.pattern.w).toBeGreaterThan(0);
    m.dev.dispose();
  });

  it('a jam cuts every laser it powers: no break inside the jam and the reboot; then they are back and trip', () => {
    const m = make();
    step(m.dev, 0.2);
    expect(dbg(m.dev).lasers.every((l) => l.on)).toBe(true);
    step(m.dev, 0.5, 'p1');
    let d = dbg(m.dev);
    expect(d.jam[0]).toBe('p1');
    expect(d.panels[0]!.ph).toBe(DEV_JAMMED);
    expect([LED_JAM, LED_JAM_DIM]).toContain(d.panels[0]!.led);
    expect(d.lasers.every((l) => !l.on)).toBe(true);
    // walk through both bands while jammed: no break
    m.player.feet.set(10.1, 0, 7);
    step(m.dev, 0.3, 'p1');
    m.player.feet.set(14.1, 0, 7);
    step(m.dev, 0.3, 'p1');
    expect(m.dev.hits).toBe(0);
    // let go: the reboot keeps them off for JAMMER.reboot
    m.player.feet.set(4, 0, 7);
    step(m.dev, 1 / 60);
    d = dbg(m.dev);
    expect(d.panels[0]!.ph).toBe(DEV_RECOVER);
    expect(d.panels[0]!.led).toBe(LED_BOOT);
    expect(d.lasers.every((l) => !l.on)).toBe(true);
    m.player.feet.set(10.1, 0, 7);
    step(m.dev, JAMMER.reboot - 0.2);
    expect(m.dev.hits).toBe(0);
    step(m.dev, 0.3);
    d = dbg(m.dev);
    expect(d.panels[0]!.ph).toBe(DEV_IDLE);
    expect(d.panels[0]!.led).toBe(LED_ON);
    expect(d.lasers.every((l) => l.on)).toBe(true);
    expect(m.dev.hits).toBe(1);
    // the trip's radio line names the panel
    expect(m.said[0]).toMatch(/Test laser tripped: alarm stage 1\. Jam its power panel/);
    m.dev.dispose();
  });

  it('(S3-7 S1) the props renderer is told each laser\'s state on its change: dark while the panel is jammed and rebooting, lit again after (the beam towers\' lenses)', () => {
    const w = world();
    const calls: string[] = [];
    (w.g.world as unknown as { facilityProps: unknown }).facilityProps = { setDevice: (id: string, on: boolean) => calls.push(`${id}:${on}`) };
    const dev = new CtDevices(w.g as never, 'host', { say: () => undefined, record: () => undefined, dirty: () => undefined });
    step(dev, 0.2);
    expect(calls).toEqual([]);
    step(dev, 0.5, 'p1');
    expect(calls.sort()).toEqual([`${L1.id}:false`, `${L2.id}:false`].sort());
    calls.length = 0;
    step(dev, JAMMER.reboot + 0.3);
    expect(calls.sort()).toEqual([`${L1.id}:true`, `${L2.id}:true`].sort());
    dev.dispose();
  });

  it('(S3-7 S1) co-op: a client mirror tells the props renderer each laser\'s state too: dark when a snapshot jams the panel, lit again after the reboot', () => {
    const h = make('host');
    const c = make('client');
    const calls: string[] = [];
    (c.g.world as unknown as { facilityProps: unknown }).facilityProps = { setDevice: (id: string, on: boolean) => calls.push(`${id}:${on}`) };
    step(h.dev, 0.3, 'p1');
    c.dev.apply(h.dev.wire());
    expect(calls.sort()).toEqual([`${L1.id}:false`, `${L2.id}:false`].sort());
    calls.length = 0;
    step(h.dev, 1 / 60);
    c.dev.apply(h.dev.wire());
    expect(calls).toEqual([]);
    for (let t = 0; t < JAMMER.reboot + 0.1; t += 1 / 60) c.dev.frame(1 / 60);
    expect(calls.sort()).toEqual([`${L1.id}:true`, `${L2.id}:true`].sort());
    h.dev.dispose();
    c.dev.dispose();
  });

  it('Sector Ops: a panel of a section that is not live is dark like its lasers and no jam target', () => {
    const m = make('host', true);
    m.dev.setLive(0);
    step(m.dev, 0.1);
    expect(dbg(m.dev).panels[0]!.live).toBe(true);
    expect(dbg(m.dev).panels[0]!.led).toBe(LED_ON);
    m.dev.setLive(1);
    step(m.dev, 0.1, 'p1');
    const d = dbg(m.dev);
    expect(m.dev.targets.length).toBe(0);
    expect(d.panels[0]!.live).toBe(false);
    expect(d.panels[0]!.led).toBe(LED_DARK);
    expect(d.panels[0]!.ph).toBe(DEV_IDLE);
    expect(d.jam[0]).toBe('');
    expect(d.lasers.every((l) => !l.on && !l.live)).toBe(true);
    m.dev.dispose();
  });

  it('co-op: the host wire lists the jammed panel; the client mirror turns its lasers off and back on', () => {
    const h = make('host');
    const c = make('client');
    step(h.dev, 0.3, 'p1');
    const w1 = h.dev.wire();
    expect(w1.dv.map((e) => [e[0], e[1]])).toEqual([['p1', DEV_JAMMED]]);
    c.dev.apply(w1);
    let d = dbg(c.dev);
    expect(d.panels[0]!.ph).toBe(DEV_JAMMED);
    expect(d.lasers.every((l) => !l.on)).toBe(true);
    // the host lets go: the reboot mirrors, then the client runs it down itself
    step(h.dev, 1 / 60);
    c.dev.apply(h.dev.wire());
    expect(dbg(c.dev).panels[0]!.ph).toBe(DEV_RECOVER);
    expect(dbg(c.dev).lasers.every((l) => !l.on)).toBe(true);
    for (let t = 0; t < JAMMER.reboot + 0.1; t += 1 / 60) c.dev.frame(1 / 60);
    d = dbg(c.dev);
    expect(d.panels[0]!.ph).toBe(DEV_IDLE);
    expect(d.panels[0]!.led).toBe(LED_ON);
    expect(d.lasers.every((l) => l.on)).toBe(true);
    h.dev.dispose();
    c.dev.dispose();
  });
});

// (marlow-final 0d) The station 4 panel cases (it powers the training laser, sits past the gap high on the far wall, is
// hidden from the near side's south half and jammed diagonally through the gap) pinned the old bunker bay. A5's beam-tower
// power panel (`A5_PANEL`, its jam spot and vantage trace) returns in tests/ctcourse/a5Substation.test.ts (SPEC 16).

