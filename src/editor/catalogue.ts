/**
 * ON4 object catalogue (pure data, Babylon-free): every preset the Object tool places, with its real size. Sizes are
 * typical real products ("editor default: typical product") unless the brief, facts.json or level-design gives one (then
 * `src` cites it). Michael adds presets by editing this file only (tests/editor/objects.test.ts checks every entry).
 *
 * `w` runs along x and `d` along z at yaw 0 (a quarter turn swaps them); `h` is the height of the top above the base `y`.
 * A drawn preset (`draw`) is laid like a wall: A at the start, A at the end; its length runs along the line in whole
 * `unit`s (a rack row: whole racks) or on the object grid, `d` across it.
 */
import facts from '../../scripts/kestrel/facts.json';

export type ObjGroup = 'dataHall' | 'plant' | 'office' | 'goodsIn' | 'yard';
export type Mount = 'floor' | 'wall' | 'ceiling';

export interface Preset {
  id: string;
  name: string;
  group: ObjGroup;
  w: number;
  d: number;
  h: number;
  y: number;
  noLedge: boolean;
  mount: Mount;
  /** Mesh, chairs, glass: collision is real but it hides no one. */
  seeThrough?: boolean;
  /** Drawn as a line; `unit` is the length step along it (absent: the object grid). */
  draw?: { unit?: number };
  src: string;
}

export const GROUPS: readonly { id: ObjGroup; name: string }[] = [
  { id: 'dataHall', name: 'Data hall' },
  { id: 'plant', name: 'Plant' },
  { id: 'office', name: 'Office and security' },
  { id: 'goodsIn', name: 'Goods-in' },
  { id: 'yard', name: 'Yard and roof' },
];

const TYP = 'editor default: typical product';
const RACK_W = facts.rules.rackWidth.value;
const AISLE = facts.rules.aisleMin.value;
const STOREY = facts.room.storey.value;

type P = Omit<Preset, 'group' | 'noLedge' | 'mount' | 'y' | 'src'> & Partial<Pick<Preset, 'noLedge' | 'mount' | 'y' | 'src'>>;
const set = (group: ObjGroup, ps: P[]): Preset[] => ps.map((p) => ({ y: 0, noLedge: false, mount: 'floor', src: TYP, ...p, group }));

export const PRESETS: readonly Preset[] = [
  ...set('dataHall', [
    { id: 'server-rack', name: 'Server rack 42U', w: RACK_W, d: 1.2, h: 2.0, noLedge: true, src: `width: facts rules.rackWidth (${RACK_W}); depth, height: ${TYP}` },
    { id: 'rack-row', name: 'Rack row', w: RACK_W, d: 1.2, h: 2.0, noLedge: true, draw: { unit: RACK_W }, src: `rack width: facts rules.rackWidth (${RACK_W}); depth, height: ${TYP}` },
    { id: 'network-rack', name: 'Network rack', w: 0.8, d: 1.2, h: 2.0, noLedge: true },
    { id: 'containment-door', name: 'Aisle containment end door', w: 1.2, d: 0.1, h: 2.1, noLedge: true },
    { id: 'containment-roof', name: 'Aisle containment roof', w: 1.2, d: AISLE, h: 0.05, y: 2.0, noLedge: true, mount: 'ceiling', draw: {}, src: `width across the aisle: facts rules.aisleMin (${AISLE}); height 2.0, 0.05 thick: ON4 brief` },
    { id: 'in-row-cooler', name: 'In-row cooler', w: 0.3, d: 1.2, h: 2.0, noLedge: true },
    { id: 'crah', name: 'Floor cooling unit (CRAH)', w: 2.5, d: 0.9, h: 1.95, noLedge: true },
    { id: 'pdu-cabinet', name: 'Power distribution cabinet', w: 0.8, d: 0.6, h: 1.9, noLedge: true },
    { id: 'cable-tray', name: 'Overhead cable tray', w: 0.6, d: 0.6, h: 0.1, y: 2.7, noLedge: true, mount: 'ceiling', draw: {}, src: 'ON4 brief: 0.6 wide at 2.7, 0.1 high' },
    { id: 'gas-cylinders', name: 'Gas suppression cylinder bank', w: 1.8, d: 0.4, h: 1.7 },
    { id: 'cage-mesh', name: 'Customer cage mesh', w: 0.05, d: 0.05, h: 2.4, noLedge: true, seeThrough: true, draw: {}, src: 'ON4 brief: drawn line 2.4 high, see-through; 0.05 mesh: editor default: typical product' },
    { id: 'crash-cart', name: 'Crash cart', w: 0.5, d: 0.4, h: 1.0 },
    { id: 'tape-library', name: 'Tape library', w: 1.0, d: 1.2, h: 2.0, noLedge: true },
    { id: 'step-ladder', name: 'Step ladder', w: 0.5, d: 0.6, h: 1.5, seeThrough: true },
  ]),
  ...set('plant', [
    { id: 'ups', name: 'UPS cabinet', w: 1.2, d: 0.85, h: 1.9, noLedge: true },
    { id: 'battery-rack', name: 'Battery rack', w: 1.5, d: 0.8, h: 1.8 },
    { id: 'lv-section', name: 'LV switchboard section', w: 0.8, d: 0.8, h: 2.2, noLedge: true },
    { id: 'lv-row', name: 'LV switchboard row', w: 0.8, d: 0.8, h: 2.2, noLedge: true, draw: { unit: 0.8 } },
    { id: 'generator', name: 'Diesel generator', w: 6.0, d: 2.2, h: 2.6 },
    { id: 'day-tank', name: 'Day tank', w: 2.0, d: 1.0, h: 1.2 },
    { id: 'bulk-tank', name: 'Bulk fuel tank', w: 8.0, d: 2.5, h: 2.5 },
    { id: 'chiller', name: 'Chiller', w: 6.0, d: 2.2, h: 2.4 },
    { id: 'condenser', name: 'Condenser unit', w: 1.2, d: 0.6, h: 1.4 },
    { id: 'pump-set', name: 'Pump set', w: 1.2, d: 0.6, h: 1.0 },
    { id: 'transformer', name: 'Pad transformer', w: 2.2, d: 1.8, h: 2.0, noLedge: true },
    { id: 'rmu', name: 'Ring main unit', w: 1.6, d: 0.8, h: 1.6 },
    { id: 'ahu', name: 'Air handling unit', w: 5.0, d: 2.0, h: 2.0 },
  ]),
  ...set('office', [
    { id: 'desk', name: 'Desk', w: 1.6, d: 0.8, h: 0.75 },
    { id: 'desk-pod', name: 'Desk pod of 4 with screens', w: 3.2, d: 1.6, h: 1.2 },
    { id: 'office-chair', name: 'Office chair', w: 0.65, d: 0.65, h: 1.1, seeThrough: true },
    { id: 'filing-cabinet', name: 'Filing cabinet', w: 0.47, d: 0.62, h: 1.32 },
    { id: 'tall-cupboard', name: 'Tall cupboard', w: 0.9, d: 0.45, h: 1.8 },
    { id: 'lockers', name: 'Locker bank of 3', w: 0.9, d: 0.5, h: 1.8 },
    { id: 'reception-counter', name: 'Reception counter', w: 3.0, d: 0.8, h: 1.1 },
    { id: 'security-desk', name: 'Security desk', w: 2.4, d: 0.9, h: 1.15, src: `desk 0.75 with monitors to 1.15 (the top here): ${TYP}` },
    { id: 'video-wall', name: 'CCTV video wall', w: 3.6, d: 0.3, h: 2.2, y: 0.8, noLedge: true, mount: 'wall' },
    { id: 'meeting-table', name: 'Meeting table', w: 2.4, d: 1.2, h: 0.75 },
    { id: 'sofa', name: 'Sofa', w: 2.0, d: 0.9, h: 0.85 },
    { id: 'kitchenette', name: 'Kitchenette run', w: 2.4, d: 0.6, h: 0.9 },
    { id: 'fridge', name: 'Fridge', w: 0.6, d: 0.65, h: 1.8 },
    { id: 'vending', name: 'Vending machine', w: 0.9, d: 0.85, h: 1.83 },
    { id: 'water-cooler', name: 'Water cooler', w: 0.35, d: 0.35, h: 1.1 },
    { id: 'copier', name: 'Copier', w: 0.6, d: 0.7, h: 1.2 },
    { id: 'shredder', name: 'Shredder', w: 0.4, d: 0.3, h: 0.7 },
    { id: 'whiteboard', name: 'Whiteboard', w: 1.8, d: 0.05, h: 1.2, y: 0.9, noLedge: true, mount: 'wall' },
    { id: 'pot-plant', name: 'Pot plant', w: 0.5, d: 0.5, h: 1.2 },
  ]),
  ...set('goodsIn', [
    { id: 'pallet', name: 'Pallet', w: 1.165, d: 1.165, h: 0.15, src: 'ON4 brief: Australian standard pallet 1165 x 1165' },
    { id: 'pallet-stack', name: 'Pallet stack', w: 1.165, d: 1.165, h: 1.5, src: 'ON4 brief: Australian standard pallet, stacked to 1.5' },
    { id: 'boxed-equipment', name: 'Boxed equipment', w: 1.2, d: 0.8, h: 1.0 },
    { id: 'packing-bench', name: 'Packing bench', w: 2.0, d: 0.8, h: 0.9 },
    { id: 'roll-cage', name: 'Roll cage', w: 0.8, d: 0.7, h: 1.8, seeThrough: true },
    { id: 'pallet-jack', name: 'Pallet jack', w: 1.6, d: 0.55, h: 1.2, seeThrough: true },
    { id: 'shelving', name: 'Shelving bay', w: 1.8, d: 0.6, h: 2.4, noLedge: true },
    { id: 'crate-1.0', name: 'Crate 1.0 m', w: 1.0, d: 1.0, h: 1.0 },
    { id: 'crate-1.2', name: 'Crate 1.2 m', w: 1.2, d: 1.2, h: 1.2 },
  ]),
  ...set('yard', [
    { id: 'car', name: 'Car', w: 4.7, d: 1.85, h: 1.45 },
    { id: 'van', name: 'Van', w: 5.3, d: 2.0, h: 2.3 },
    { id: 'ute', name: 'Pickup (ute)', w: 5.3, d: 1.9, h: 1.8 },
    { id: 'skip', name: 'Skip', w: 3.6, d: 1.8, h: 1.5 },
    { id: 'wheelie-bin', name: 'Wheelie bin 240 L', w: 0.58, d: 0.73, h: 1.07 },
    { id: 'bulk-bin', name: 'Bulk bin 1100 L', w: 1.37, d: 1.07, h: 1.33 },
    { id: 'bollard', name: 'Bollard', w: 0.2, d: 0.2, h: 1.0 },
    { id: 'boom-gate', name: 'Boom gate', w: 4.3, d: 0.3, h: 1.1, noLedge: true, seeThrough: true, src: 'ON4 brief: arm 4.0 long at 1.0 high, post 0.3 x 0.3 x 1.1 (one box: post and arm)' },
    { id: 'bike-rack', name: 'Bike rack', w: 2.0, d: 0.6, h: 0.8, seeThrough: true },
    { id: 'smoking-shelter', name: 'Smoking shelter roof', w: 3.0, d: 1.5, h: 0.1, y: 2.3, noLedge: true, src: 'ON4 brief: 3.0 x 1.5 x 2.4, open front: its roof slab (top at 2.4)' },
    { id: 'gas-cage', name: 'Gas bottle cage', w: 1.2, d: 0.8, h: 1.8, seeThrough: true },
    { id: 'low-wall', name: 'Low wall', w: 0.2, d: 0.2, h: 0.9, draw: {}, src: 'ON4 brief: 0.2 thick, 0.9 high, drawn' },
    { id: 'planter', name: 'Planter', w: 2.0, d: 0.6, h: 0.6 },
    { id: 'column', name: 'Column', w: 0.4, d: 0.4, h: STOREY, noLedge: true, src: `0.4 x 0.4: ${TYP}; height: facts room.storey (${STOREY})` },
    { id: 'walkway', name: 'Roof walkway grating', w: 0.6, d: 0.6, h: 0.1, draw: {}, src: 'ON4 brief: 0.6 wide, drawn, top at 0.1' },
  ]),
];

const byId = new Map(PRESETS.map((p) => [p.id, p]));
export const presetOf = (id: string | undefined): Preset | undefined => (id ? byId.get(id) : undefined);
export const groupPresets = (g: ObjGroup): Preset[] => PRESETS.filter((p) => p.group === g);
export const groupName = (g: ObjGroup): string => GROUPS.find((q) => q.id === g)?.name ?? g;
