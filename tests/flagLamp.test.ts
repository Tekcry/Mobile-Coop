/**
 * (marlow-polish P3-1) The A6 interlock lamp: a props status lamp (`PropPlacement.device` + `flag`) that `CtDevices` drives
 * from a shared course flag on both roles (host `fixedUpdate`, client `frame` / `apply`), telling the props renderer only
 * on a change. Red (device off) until `a6-drive` is set, green after, red again when a bay restart clears it. Render only.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Vector3 } from '../src/core/babylon';
import type { CtDevices as CtDevicesT } from '../src/game/ctDevices';
import { LevelBuilder } from '../src/world/levelBuilder';
import { buildCtcourse } from '../src/world/maps/ctcourse';
import { A6_DRIVE_FLAG, A6_INTERLOCK } from '../src/world/maps/ctcourseSets/a6PumpHouse';
import type { PropPlacement } from '../src/world/props/facilityProps';

/** The course's props as the map lays them out (the A6 interlock station among them). */
const COURSE_PROPS: PropPlacement[] = buildCtcourse(new LevelBuilder()).layout.facilityProps ?? [];

/** A stand-in match (as `laserPanels.test.ts`'s, no lasers or panels): the given props, the renderer's `setDevice` logged. */
function world(props: PropPlacement[]) {
  const player = {
    id: 'host',
    feet: new Vector3(4, 0, 7),
    crouched: false,
    speed: 0,
    light: 1,
    target: { alive: true, health: { hp: 100 }, applyDamage: () => undefined, aimPoint: (o: Vector3) => o },
  };
  const calls: string[] = [];
  const g = {
    world: {
      layout: { facilityProps: props },
      level: { lights: { lights: [], setOn: () => undefined } },
      parts: { instance: () => ({}) },
      lightField: { totalAt: () => 1 },
      facilityProps: { setDevice: (id: string, on: boolean) => calls.push(`${id}:${on}`) },
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
  return { g, calls };
}

describe('(P3-1) the A6 interlock lamp', () => {
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

  const make = (role: 'host' | 'client', props: PropPlacement[] = COURSE_PROPS) => {
    const w = world(props);
    const flags = new Set<string>();
    const dev = new CtDevices(w.g as never, role, { say: () => undefined, record: () => undefined, dirty: () => undefined, hasShared: (f) => flags.has(f) });
    return { ...w, dev, flags };
  };
  const lamps = (d: CtDevicesT): { id: string; on: boolean }[] => (d.debug() as { flagLamps: { id: string; on: boolean }[] }).flagLamps;

  it('the course lays out exactly one flag lamp: the A6 interlock on a6-drive', () => {
    const flagged = COURSE_PROPS.filter((p) => p.flag !== undefined);
    expect(flagged.map((p) => [p.prop, p.device, p.flag])).toEqual([['pushStation', A6_INTERLOCK, A6_DRIVE_FLAG]]);
    expect(flagged[0]!.lampOff).toBeDefined();
  });

  it('(P3-1) the A6 interlock lamp: red until a6-drive, green after, on the host and the client', () => {
    for (const role of ['host', 'client'] as const) {
      const m = make(role);
      const tick = (): void => (role === 'host' ? m.dev.fixedUpdate(1 / 60) : m.dev.frame(1 / 60));
      expect(lamps(m.dev)).toEqual([{ id: A6_INTERLOCK, on: false }]);
      // the first pass always tells the renderer: off (red)
      tick();
      expect(m.calls, role).toEqual([`${A6_INTERLOCK}:false`]);
      // more steps: no more calls (only on a change)
      for (let i = 0; i < 30; i++) tick();
      expect(m.calls, role).toEqual([`${A6_INTERLOCK}:false`]);
      // the drive isolated: green
      m.calls.length = 0;
      m.flags.add(A6_DRIVE_FLAG);
      tick();
      tick();
      expect(m.calls, role).toEqual([`${A6_INTERLOCK}:true`]);
      expect(lamps(m.dev)).toEqual([{ id: A6_INTERLOCK, on: true }]);
      // a bay restart clears the flag: red again
      m.calls.length = 0;
      m.flags.delete(A6_DRIVE_FLAG);
      tick();
      expect(m.calls, role).toEqual([`${A6_INTERLOCK}:false`]);
      expect(lamps(m.dev)).toEqual([{ id: A6_INTERLOCK, on: false }]);
      m.dev.dispose();
    }
  });

  it('teeth: without a flag placement there is no flag lamp and no call; a device without a flag is not one; one lamp per device id', () => {
    const plain = COURSE_PROPS.filter((p) => p.flag === undefined);
    const noFlag = make('host', plain);
    noFlag.flags.add(A6_DRIVE_FLAG);
    for (let i = 0; i < 5; i++) noFlag.dev.fixedUpdate(1 / 60);
    expect(noFlag.calls).toEqual([]);
    expect(lamps(noFlag.dev)).toEqual([]);
    noFlag.dev.dispose();
    const st = COURSE_PROPS.find((p) => p.flag !== undefined)!;
    const twice = make('client', [st, { ...st, x: st.x + 1 }, { ...st, flag: undefined, device: 'other' }]);
    twice.dev.frame(1 / 60);
    expect(twice.calls).toEqual([`${A6_INTERLOCK}:false`]);
    expect(lamps(twice.dev)).toEqual([{ id: A6_INTERLOCK, on: false }]);
    twice.dev.dispose();
  });
});
