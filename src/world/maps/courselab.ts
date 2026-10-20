import { Vector3 } from '../../core/babylon';
import type { MapDef, MapLayout } from '../mapDef';
import type { CourseDef, CourseDevice, GateDef } from '../../game/course/courseDef';

const WALL = '#5d646b';
const H = 3;
const DOOR_W = 1.2;
/** Door gap along z on every cross wall. */
const GZ0 = 3.4;
const GZ1 = GZ0 + DOOR_W;
/** The light group the mains gate cuts (a wall switch in cell 6). */
const MAINS_GROUP = 7;

/**
 * Courselab (debug map, course mode only, not listed; `?autostart=courselab&mode=course`): two 8 x 8 rooms joined by a
 * 6 x 6 airlock, then a strip of 4 m cells along +x, one gate kind per cell door (lever, bolt, hold, timed hold, pair,
 * egress, mains with a lamp group, flag via a pickup) and a ladder behind an anchorLock in the last cell, beside the
 * course end device ("Finish", `devices.end`).
 */
export const courselab: MapDef = {
  id: 'courselab',
  name: 'Courselab',
  description: 'Course framework debug rooms (not listed).',
  theme: { sky: '#1b1f24', horizon: '#2a2f36', ground: '#3a3f45', fogStart: 60, fogEnd: 160, sunDir: [-0.4, -1, -0.3], sunIntensity: 0.4, ambient: 0.5, lightLevel: 0.5 },
  modes: ['course'],
  build(b): MapLayout {
    b.floor(29, 4, 58, 8, '#474c52');
    b.wallZ(0, 0, 8, [], H, WALL);
    b.wallX(0, 0, 8, [], H, WALL);
    b.wallX(8, 0, 8, [], H, WALL);
    b.wallX(0, 14, 58, [], H, WALL);
    b.wallX(8, 14, 58, [], H, WALL);
    // the airlock A1: x 8..14, z 1..7
    b.wallX(1, 8, 14, [], H, WALL);
    b.wallX(7, 8, 14, [], H, WALL);
    b.wallZ(8, 0, 8, [[GZ0, GZ1]], H, WALL);
    b.wallZ(14, 0, 8, [[GZ0, GZ1]], H, WALL);
    const near = b.door(8, 0, GZ0, DOOR_W, 0);
    const far = b.door(14, 0, GZ0, DOOR_W, 0);
    // the strip: cross walls at x 22 + 4k, each with a door
    const cells: number[] = [];
    for (let k = 0; k < 9; k++) {
      const x = 22 + 4 * k;
      b.wallZ(x, 0, 8, [[GZ0, GZ1]], H, WALL);
      cells.push(b.door(x, 0, GZ0, DOOR_W, 0).id);
    }
    b.wallZ(58, 0, 8, [], H, WALL);
    const ladder = b.ladder(57.6, 6.5, 0, H, Math.PI / 2);
    // L1's vault drill: a thin low wall (x 4, z 5.8..7.8)
    b.block(4, 6.8, 0.3, 0.9, 2, '#6b7178');
    b.light({ x: 4, y: 2.8, z: 4, radius: 8, intensity: 1 });
    b.light({ x: 18, y: 2.8, z: 4, radius: 8, intensity: 1 });
    b.light({ x: 48, y: 2.8, z: 4, radius: 6, intensity: 1, group: MAINS_GROUP });
    const dev = (x: number, z: number, label?: string): CourseDevice => ({ x, y: 0, z, yaw: -Math.PI / 2, label });
    const devices: Record<string, CourseDevice> = {
      'sw-l1': dev(7.6, 1.5, 'Press panel'),
      'sw-lever': dev(21.2, 1.5),
      'h-hold': dev(29.2, 1.5),
      'h-timed': dev(33.2, 1.5),
      'sw-pa': dev(37.2, 1.5),
      'sw-pb': dev(37.2, 6.5),
      'sw-egress': dev(41.2, 1.5),
      'sw-key': dev(49.2, 1.5, 'Take key'),
      // the course end (the last bay's exit 'end'): refused while L2's drill is open
      end: dev(57.2, 1.5, 'Finish'),
    };
    const gates: GateDef[] = [
      { kind: 'lever', id: 'g-lever', switchId: 'sw-lever', doorId: 'd0' },
      { kind: 'bolt', id: 'g-bolt', doorId: 'd1', side: [-1, 0], at: [26, 4] },
      { kind: 'hold', id: 'g-hold', holdId: 'h-hold', doorId: 'd2' },
      { kind: 'timedHold', id: 'g-timed', holdId: 'h-timed', doorId: 'd3' },
      { kind: 'pair', id: 'g-pair', a: 'sw-pa', b: 'sw-pb', doorId: 'd4' },
      { kind: 'egress', id: 'g-egress', switchId: 'sw-egress', doorIds: ['d5'] },
      { kind: 'mains', id: 'g-mains', group: 'mains', doorId: 'd6' },
      { kind: 'pickup', id: 'g-key', switchId: 'sw-key', flag: 'key', perPlayer: false },
      { kind: 'flag', id: 'g-flag', flag: 'key', doorId: 'd7' },
      { kind: 'anchorLock', id: 'g-ladder', anchorId: 'ladder', flag: 'key' },
    ];
    const def: CourseDef = {
      id: 'courselab',
      airlocks: [{ id: 'A1', box: [8, 1, 14, 7], floorY: 0, nearDoor: 'A1-near', farDoor: 'A1-far' }],
      bays: [
        {
          id: 'L1',
          entry: 'start',
          exit: 'A1',
          squad: [],
          gates: [{ kind: 'pickup', id: 'g-l1', switchId: 'sw-l1', flag: 'l1-panel', perPlayer: false }],
          radio: [{ at: 'enter', text: 'Courselab. Three drills, then both of you into the airlock.' }],
          drills: [
            { id: 'l-gear', verb: 'gear', who: 'both', name: 'pace', text: 'Change your pace. Push the stick further, or ease off it.', marker: { x: 3, y: 1, z: 2 } },
            { id: 'l-vault', verb: 'vault', who: 'either', name: 'vault', text: 'Low wall by the far corner. Run at it and press {Y:traverse} to go over.', marker: { x: 4, y: 1.2, z: 6.8 } },
            { id: 'l-switch', verb: 'switch', who: 'either', name: 'panel', text: 'Panel on the wall. Press it with {Y:traverse}. Thrilling, I know.', marker: 'sw-l1' },
          ],
          elements: [],
        },
        {
          id: 'L2',
          entry: 'A1',
          exit: 'end',
          squad: [],
          gates,
          radio: [{ at: 'enter', text: 'One gate per door. Work them.' }],
          drills: [{ id: 'l-ladder', verb: 'ladder', who: 'either', text: 'Climb the ladder.', marker: { x: 57.6, y: 0, z: 6.5 } }],
          elements: [],
        },
      ],
    };
    const doors: Record<string, number> = { 'A1-near': near.id, 'A1-far': far.id };
    cells.forEach((id, k) => (doors[`d${k}`] = id));
    // d8 (the ladder cell) is a plain door: no gate names it
    delete doors.d8;
    return {
      playerSpawns: [
        { pos: new Vector3(2, 0, 3.4), yaw: Math.PI / 2 },
        { pos: new Vector3(2, 0, 5), yaw: Math.PI / 2 },
      ],
      enemySpawns: [],
      props: [],
      objectives: [],
      pickups: [],
      switches: [{ pos: new Vector3(45.2, 0, 1.5), yaw: -Math.PI / 2, group: MAINS_GROUP }],
      course: { def, doors, anchors: { ladder: ladder.id }, groups: { mains: MAINS_GROUP }, devices, squads: {} },
    };
  },
};
