import { describe, expect, it, vi } from 'vitest';
import { parseMessage, type Msg } from '../src/net/protocol';
import { applyCourseLights, applyCourseWire, deadLamps } from '../src/game/modes/courseMode';
import type { CourseWire } from '../src/game/course/courseWire';
import type { GameState } from '../src/game/gameState';
import { LightRegistry, type LightDef } from '../src/world/lights';
import { addTorchSlots } from '../src/world/torches';

// `applyCourseWire`'s client mirror without a DOM or scene: stand-ins for the course state, devices, HUD and card
vi.mock('../src/game/course/courseState', async (orig) => ({
  ...(await orig<object>()),
  CourseState: class {
    bay = 0;
    currentBay = { drills: [] };
    apply(): void {}
  },
}));
vi.mock('../src/game/ctDevices', async (orig) => ({ ...(await orig<object>()), CtDevices: class { apply(): void {} } }));
vi.mock('../src/ui/hud/courseHud', async (orig) => ({ ...(await orig<object>()), CourseHud: class {} }));
vi.mock('../src/ui/hud/ratingCard', async (orig) => ({ ...(await orig<object>()), RatingCard: class {} }));

/** One page's level lights (host and client build the same, in the same order). */
function level(): LightRegistry {
  const reg = new LightRegistry();
  reg.ambient = 0.05;
  // circuit 3: two ceiling lamps over the room at x 0..6
  reg.add({ x: 0, y: 3, z: 0, radius: 8, intensity: 0.9, group: 3 });
  reg.add({ x: 6, y: 3, z: 0, radius: 8, intensity: 0.9, group: 3 });
  // a lamp on no circuit, not destructible
  reg.add({ x: 20, y: 3, z: 0, radius: 6, intensity: 0.8, destructible: false });
  // a non-electric fire
  reg.add({ x: -20, y: 0.5, z: 0, radius: 4, intensity: 0.6, kind: 'fire', electric: false });
  addTorchSlots(reg);
  return reg;
}

/** The host's `course` lights as they reach the client: through JSON and the parser, as on the wire. */
function wire(lights: CourseWire['lights']): CourseWire['lights'] {
  const m = parseMessage(JSON.parse(JSON.stringify({ t: 'course', s: { bay: 0 }, locks: [], anchors: [], lights }))) as Extract<Msg, { t: 'course' }> | null;
  expect(m).not.toBeNull();
  return m!.lights;
}

/** The host's `course` lights for its registry (group 3's switch state as given). */
const hostLights = (host: LightRegistry, g3: boolean): CourseWire['lights'] => ({ groups: [[3, g3]], dead: deadLamps(host, []) });

describe('Course mode client lamp shots (coop-real F1a, S2)', () => {
  it("a lamp the host shot out goes dark on the client with the cue once", () => {
    const host = level();
    const client = level();
    expect(host.destroy(1)).toBe(true);
    expect(deadLamps(host, [])).toEqual([1]);
    const lights = wire(hostLights(host, true));
    expect(lights.dead).toEqual([1]);
    const shots: number[] = [];
    const cue = (l: LightDef): void => void shots.push(l.id);
    expect(applyCourseLights(client, lights, cue)).toBe(1);
    expect(client.lights[1]!.destroyed).toBe(true);
    expect(client.lights[1]!.on).toBe(false);
    expect(shots).toEqual([1]);
    expect(client.lights[0]!.on).toBe(true);
    expect(client.lights[0]!.destroyed).toBe(false);
    // the same message again (the keepalive): no second cue, the lamp stays dead
    expect(applyCourseLights(client, wire(hostLights(host, true)), cue)).toBe(0);
    expect(shots).toEqual([1]);
    expect(client.lights[1]!.destroyed).toBe(true);
  });

  it('deadLamps clears its output first', () => {
    const host = level();
    host.destroy(0);
    const out = [7, 8, 9];
    expect(deadLamps(host, out)).toBe(out);
    expect(out).toEqual([0]);
  });

  it('the first message after a join (no cue) still darkens the lamp', () => {
    const host = level();
    const client = level();
    host.destroy(1);
    expect(() => applyCourseLights(client, wire(hostLights(host, true)))).not.toThrow();
    expect(client.lights[1]!.destroyed).toBe(true);
    expect(client.lights[1]!.on).toBe(false);
  });

  it('a course restart brings the lamp back on with its group', () => {
    const host = level();
    const client = level();
    host.destroy(1);
    applyCourseLights(client, wire(hostLights(host, true)));
    expect(client.lights[1]!.destroyed).toBe(true);
    host.restore(1);
    expect(applyCourseLights(client, wire(hostLights(host, true)))).toBe(0);
    expect(client.lights[1]!.destroyed).toBe(false);
    expect(client.lights[1]!.on).toBe(true);
  });

  it('groups: a switched-off circuit stays off, a shot lamp stays dead when the circuit comes back', () => {
    const host = level();
    const client = level();
    host.setGroup(3, false);
    host.destroy(1);
    const shots: number[] = [];
    expect(applyCourseLights(client, wire(hostLights(host, false)), (l) => void shots.push(l.id))).toBe(1);
    expect(shots).toEqual([1]);
    expect(client.lights[0]!.on).toBe(false);
    expect(client.lights[0]!.destroyed).toBe(false);
    expect(client.lights[1]!.destroyed).toBe(true);
    host.setGroup(3, true);
    applyCourseLights(client, wire(hostLights(host, true)), (l) => void shots.push(l.id));
    expect(client.lights[0]!.on).toBe(true);
    expect(client.lights[1]!.destroyed).toBe(true);
    expect(client.lights[1]!.on).toBe(false);
    expect(shots).toEqual([1]);
  });

  it('an id the client registry lacks is skipped without a throw', () => {
    const client = level();
    const shots: number[] = [];
    let n = -1;
    expect(() => { n = applyCourseLights(client, wire({ groups: [], dead: [900, 1] }), (l) => void shots.push(l.id)); }).not.toThrow();
    expect(n).toBe(1);
    expect(shots).toEqual([1]);
    expect(client.lights[1]!.destroyed).toBe(true);
  });

  it('applyCourseWire: no cue on the first course message, one when a later message adds a newly dead lamp', () => {
    const host = level();
    const client = level();
    const sparks = vi.fn();
    const g = {
      world: { doors: { list: [] }, layout: { course: { def: { airlocks: [], bays: [] }, consoles: [] } }, level: { lights: client } },
      traversal: { attachCtl: { disabled: new Set<number>() } },
      hud: { el: {}, banner: vi.fn() },
      vfx: { sparks },
      sectionRatings: [],
    } as unknown as GameState;
    const msg = (): CourseWire => {
      const m = parseMessage(JSON.parse(JSON.stringify({ t: 'course', s: { bay: 0 }, locks: [], anchors: [], lights: hostLights(host, true), ref: '', rn: 0 })));
      expect(m).not.toBeNull();
      return m as unknown as CourseWire;
    };
    const win = globalThis as { window?: unknown };
    const hadWindow = 'window' in win;
    if (!hadWindow) win.window = {};
    try {
      // a join: lamp 1 is already out on the host, so it goes dark here with no sparks
      host.destroy(1);
      applyCourseWire(g, msg());
      expect(client.lights[1]!.destroyed).toBe(true);
      expect(sparks).not.toHaveBeenCalled();
      // the next message adds lamp 0, newly dead: one cue, at that lamp
      host.destroy(0);
      applyCourseWire(g, msg());
      expect(client.lights[0]!.destroyed).toBe(true);
      expect(sparks).toHaveBeenCalledTimes(1);
      const at = sparks.mock.calls[0]![0] as { x: number; y: number; z: number };
      expect([at.x, at.y, at.z]).toEqual([0, 3, 0]);
      // the keepalive repeats it: no second cue
      applyCourseWire(g, msg());
      expect(sparks).toHaveBeenCalledTimes(1);
    } finally {
      if (!hadWindow) delete win.window;
    }
  });
});
