/**
 * ON6 fitting catalogue (pure data, Babylon-free): every light fitting the Light tool places, with its real body size,
 * mount, default mount height, lumens, colour temperature, beam and its defaults (emergency, motion, breakable, the kind
 * of circuit it goes on). Numbers are typical UK products ("editor default: typical product") unless the ON6 brief gives
 * them (then `src` cites it). Michael adds fittings here only (tests/editor/lamps.test.ts checks every entry).
 *
 * `lightParams` is the one conversion from lumens, colour temperature and beam to the game's `LightInit` fields; the light
 * itself is then the game's own formula (src/world/lampMath.ts), never a second one. It is calibrated so a 900 lm downlight
 * lights the floor under it as the Warehouse office ceiling lamp does (facts `light.cal*`).
 */
import facts from '../../scripts/kestrel/facts.json';
import { makeCone } from '../world/lights';
import type { Emergency, LampParams } from '../world/maps/kestrelLights';

export type LightGroup = 'interior' | 'plant' | 'outside' | 'emergency' | 'glow';
/** Where it fixes: recessed or surface on the ceiling, hung below it, a wall face, a pole, the floor, a desk top, over a door, or on an object. */
export type FitMount = 'recessed' | 'surface' | 'pendant' | 'wall' | 'pole' | 'floor' | 'desk' | 'sign' | 'object';
/** The circuit a new lamp goes on: a wall switch, or an unswitchable kind with its real reason (CIRCUIT_REASON). */
export type CircuitKind = 'switched' | 'emergency' | 'pir' | 'photocell' | 'desk' | 'equipment' | 'door';

export interface Fitting {
  id: string;
  name: string;
  group: LightGroup;
  mount: FitMount;
  /** Body [w, h, d] (m): w along x and d along z at yaw 0; a linear fitting's w is across its line (its length is drawn). */
  body: [number, number, number];
  /** Default height of the light above the floor (desk and object fittings: above the top they sit on); null: the ceiling. */
  height: number | null;
  /** Pendant: how far below the ceiling it hangs. */
  drop?: number;
  /** Lumens (linear fittings: per metre). */
  lumens: number;
  kelvin: number;
  /** Beam angle, degrees (180 and over: all round). */
  beam: number;
  linear: boolean;
  emergency: Emergency | null;
  motion: boolean;
  breakable: boolean;
  circuit: CircuitKind;
  /** Aimable (floods, spitfires): the default pitch below the horizontal; the yaw starts facing out of its wall. */
  aimPitch?: number;
  /** Aims along its wall (twin spots), not out of it. */
  alongWall?: boolean;
  /** Lights upwards (a wall uplight). */
  up?: boolean;
  heads?: number;
  /** A colour that is not a colour temperature (exit sign green, a screen's blue-white), linear RGB. */
  colour?: [number, number, number];
  /** Off in its normal state (a fridge's door light). */
  off?: boolean;
  /** Desk and object fittings: the object presets it sits on (src/editor/catalogue.ts ids). */
  onObjects?: string[];
  /** One lamp per unit of the object row (rack status LEDs: one per rack). */
  perUnit?: boolean;
  /** Michael 2026-10-14: one product range in other sizes or shapes (the carousel's versions: D-pad up / down). */
  series?: string;
  src: string;
}

export const LIGHT_GROUPS: readonly { id: LightGroup; name: string }[] = [
  { id: 'interior', name: 'Interior' },
  { id: 'plant', name: 'Plant and goods' },
  { id: 'outside', name: 'Outside' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'glow', name: 'Glow' },
];

/** Why an unswitchable circuit has no switch (schema `circuits[].unswitchable`). */
export const CIRCUIT_REASON: Record<CircuitKind, string> = {
  switched: '',
  emergency: 'Emergency lighting: on its own battery supply, no switch',
  pir: 'PIR: its motion sensor switches it',
  photocell: 'Photocell: on from dusk to dawn',
  desk: 'Switched at the lamp',
  equipment: 'Equipment light: on with the equipment',
  door: 'Door switch: on when the door opens',
};

/** A wall switch: plate size and height of its centre above the floor. */
export const SWITCH = { w: 0.086, h: 0.086, d: 0.03, height: 1.2, src: 'editor default: typical product (UK single gang plate 86 x 86 mm, 1.2 m up)' } as const;

const TYP = 'editor default: typical product';
const B = 'ON6 brief';
type F = Omit<Fitting, 'group' | 'linear' | 'emergency' | 'motion' | 'breakable' | 'circuit' | 'src'> & Partial<Pick<Fitting, 'linear' | 'emergency' | 'motion' | 'breakable' | 'circuit' | 'src'>>;
const set = (group: LightGroup, fs: F[]): Fitting[] => fs.map((f) => ({ linear: false, emergency: null, motion: false, breakable: true, circuit: 'switched', src: TYP, ...f, group }));

export const FITTINGS: readonly Fitting[] = [
  ...set('interior', [
    { id: 'downlight', name: 'Downlight 90 mm', mount: 'recessed', body: [0.09, 0.06, 0.09], height: null, lumens: 900, kelvin: 4000, beam: 60, src: `${B} decision 4: 90 mm, 900 lm, 4000 K, 60 deg; body depth ${TYP}` },
    { id: 'troffer-600', name: 'Troffer 600 x 300', series: 'troffer', mount: 'recessed', body: [0.6, 0.08, 0.3], height: null, lumens: 1800, kelvin: 4000, beam: 110, src: `Michael, 2026-10-14: troffers are 600 x 300 and 1200 x 300; 1800 lm: ${TYP} (a 600 x 300 panel, half the 1200 x 300's 3600 lm of ${B} decision 4); 4000 K, 110 deg: ${B} decision 4` },
    { id: 'troffer-1200', name: 'Troffer 1200 x 300', series: 'troffer', mount: 'recessed', body: [1.2, 0.08, 0.3], height: null, lumens: 3600, kelvin: 4000, beam: 110, src: `Michael, 2026-10-14: troffers are 600 x 300 and 1200 x 300; ${B} decision 4: 1200 x 300, 3600 lm, 4000 K, 110 deg` },
    { id: 'led-strip', name: 'LED strip in aluminium extrusion', mount: 'recessed', body: [0.03, 0.02, 0.03], height: null, lumens: 1000, kelvin: 4000, beam: 120, linear: true, src: `${B} decision 4: 1000 lm per metre, 4000 K, 120 deg, drawn A to B; extrusion 30 mm: ${TYP}` },
    { id: 'pendant', name: 'Pendant', mount: 'pendant', body: [0.35, 0.25, 0.35], height: null, drop: 0.8, lumens: 2000, kelvin: 3000, beam: 120, src: `${B} decision 4: 2000 lm, 3000 K; 350 mm shade on a 0.8 m drop, 120 deg: ${TYP}` },
    { id: 'under-cabinet', name: 'Under-cabinet strip', mount: 'wall', body: [0.03, 0.01, 0.03], height: 1.4, lumens: 500, kelvin: 3000, beam: 120, linear: true, src: `${B} decision 4: 500 lm per metre, 3000 K; under wall units 1.4 m up, 120 deg: ${TYP}` },
    { id: 'wall-uplight', name: 'Wall uplight', mount: 'wall', body: [0.25, 0.12, 0.12], height: 1.9, lumens: 1500, kelvin: 3000, beam: 60, up: true, src: `${B} decision 4: 1500 lm, 3000 K, aimed up; 1.9 m up, 60 deg: ${TYP}` },
    { id: 'step-light', name: 'Stair step light', mount: 'wall', body: [0.08, 0.08, 0.03], height: 0.3, lumens: 50, kelvin: 3000, beam: 120, breakable: false, src: `${B} decision 4: 50 lm, 3000 K, wall, 0.3 m up` },
    { id: 'desk-lamp', name: 'Desk lamp', mount: 'desk', body: [0.15, 0.45, 0.15], height: 0.4, lumens: 500, kelvin: 3000, beam: 90, circuit: 'desk', onObjects: ['desk', 'desk-pod', 'security-desk', 'reception-counter', 'meeting-table'], src: `${B} decision 4: 500 lm, 3000 K, 90 deg, on a desk, switched at the lamp; 0.4 m over the desk top: ${TYP}` },
  ]),
  ...set('plant', [
    { id: 'high-bay', name: 'High bay', mount: 'pendant', body: [0.45, 0.2, 0.45], height: 7, drop: 0.3, lumens: 20000, kelvin: 5000, beam: 90, src: `${B} decision 5: 20000 lm, 5000 K, 90 deg, 6-8 m (7 m, never above the ceiling less its 0.3 m hanger)` },
    { id: 'batten-1500', name: 'LED batten 1500 mm', mount: 'surface', body: [0.07, 0.07, 0.07], height: null, lumens: 2667, kelvin: 5000, beam: 120, linear: true, src: `${B} decision 5: 4000 lm per 1500 mm (2667 per metre), 5000 K, surface; 120 deg: ${TYP}` },
    { id: 'bulkhead-round', name: 'Round bulkhead', series: 'bulkhead', mount: 'wall', body: [0.3, 0.3, 0.1], height: 2.4, lumens: 1000, kelvin: 4000, beam: 120, src: `${B} decision 5: 1000 lm, 4000 K; 2.4 m up: ${TYP}` },
    { id: 'bulkhead-oval', name: 'Oval bulkhead', series: 'bulkhead', mount: 'wall', body: [0.3, 0.18, 0.1], height: 2.4, lumens: 1000, kelvin: 4000, beam: 120, src: `${B} decision 5: 1000 lm; 4000 K, 2.4 m up: ${TYP}` },
    { id: 'cage-light', name: 'Cage light (wire guard)', mount: 'wall', body: [0.2, 0.25, 0.15], height: 2.4, lumens: 800, kelvin: 4000, beam: 120, src: `${B} decision 5: 800 lm, 4000 K; 2.4 m up: ${TYP}` },
  ]),
  ...set('outside', [
    { id: 'floodlight', name: 'Floodlight', mount: 'wall', body: [0.3, 0.25, 0.12], height: 4.5, lumens: 12000, kelvin: 5000, beam: 70, aimPitch: 30, circuit: 'photocell', src: `${B} decision 6: 12000 lm, 5000 K, 70 deg, aimable; 4.5 m up, 30 deg down: ${TYP}` },
    { id: 'wall-pack', name: 'Wall pack over a door', mount: 'wall', body: [0.3, 0.25, 0.18], height: 3, lumens: 3500, kelvin: 4000, beam: 120, circuit: 'photocell', src: `${B} decision 6: 3500 lm, 4000 K; 3 m up: ${TYP}` },
    { id: 'pole-lantern', name: 'Pole lantern on a 6 m pole', mount: 'pole', body: [0.5, 0.15, 0.25], height: 6, lumens: 8000, kelvin: 4000, beam: 140, circuit: 'photocell', src: `${B} decision 6: 8000 lm, 4000 K, 6 m pole; 140 deg: ${TYP}` },
    { id: 'bollard', name: 'Bollard light', mount: 'floor', body: [0.2, 1.0, 0.2], height: 0.9, lumens: 600, kelvin: 3000, beam: 140, breakable: false, circuit: 'photocell', src: `${B} decision 6: 600 lm, 3000 K, 1.0 m; head at 0.9 m: ${TYP}` },
    { id: 'pir-flood', name: 'PIR security flood', mount: 'wall', body: [0.25, 0.2, 0.12], height: 3, lumens: 3000, kelvin: 5000, beam: 90, motion: true, aimPitch: 35, circuit: 'pir', src: `${B} decision 6: 3000 lm, 5000 K, 90 deg, PIR; 3 m up (S0 PIR lights), 35 deg down: ${TYP}` },
  ]),
  ...set('emergency', [
    { id: 'spitfire', name: 'Emergency twin spot', mount: 'wall', body: [0.3, 0.25, 0.12], height: 2.5, lumens: 300, kelvin: 6000, beam: 40, heads: 2, aimPitch: 30, alongWall: true, emergency: 'non-maintained', circuit: 'emergency', src: `${B} decision 7: 2 heads x 300 lm, 6000 K, 40 deg each, non-maintained, aimable; 2.5 m up: ${TYP}` },
    { id: 'exit-sign', name: 'Exit sign (maintained)', mount: 'sign', body: [0.4, 0.2, 0.05], height: null, lumens: 100, kelvin: 6000, beam: 180, colour: [0.2, 1, 0.35], emergency: 'maintained', circuit: 'emergency', src: `${B} decision 7: green, 100 lm, maintained, lit both ways, over a door; 400 x 200 mm: ${TYP}` },
    { id: 'emergency-bulkhead', name: 'Emergency bulkhead (maintained)', mount: 'wall', body: [0.3, 0.2, 0.1], height: 2.4, lumens: 400, kelvin: 6000, beam: 120, emergency: 'maintained', circuit: 'emergency', src: `${B} decision 7: 400 lm, maintained; 2.4 m up: ${TYP}` },
  ]),
  ...set('glow', [
    { id: 'cctv-monitor', name: 'CCTV monitor', mount: 'desk', body: [0.6, 0.38, 0.06], height: 0.35, lumens: 80, kelvin: 6500, beam: 120, colour: [0.7, 0.85, 1], breakable: true, circuit: 'equipment', onObjects: ['security-desk', 'desk', 'desk-pod', 'reception-counter'], src: `${B} decision 8: 80 lm, 6500 K blue-white; a 27 inch screen 0.35 m over the desk: ${TYP}` },
    { id: 'video-wall', name: 'Video wall glow', mount: 'object', body: [0.1, 0.1, 0.1], height: null, lumens: 1500, kelvin: 6500, beam: 120, colour: [0.75, 0.85, 1], breakable: false, circuit: 'equipment', onObjects: ['video-wall'], src: `${B} decision 8: 1500 lm, on the ON4 video wall (its front, half way up)` },
    { id: 'rack-leds', name: 'Rack status LEDs', mount: 'object', body: [0.05, 0.3, 0.02], height: 1.5, lumens: 20, kelvin: 6500, beam: 120, colour: [0.35, 1, 0.6], breakable: false, circuit: 'equipment', onObjects: ['rack-row', 'server-rack', 'network-rack'], perUnit: true, src: `${B} decision 8: 20 lm, one per rack on a rack row; green, 1.5 m up the rack front: ${TYP}` },
    { id: 'vending-front', name: 'Vending machine front', mount: 'object', body: [0.1, 0.1, 0.1], height: null, lumens: 800, kelvin: 4000, beam: 120, breakable: false, circuit: 'equipment', onObjects: ['vending'], src: `${B} decision 8: 800 lm; 4000 K: ${TYP}` },
    { id: 'fridge-light', name: 'Fridge door light', mount: 'object', body: [0.1, 0.1, 0.1], height: null, lumens: 150, kelvin: 3000, beam: 120, off: true, breakable: false, circuit: 'door', onObjects: ['fridge'], src: `${B} decision 8: 150 lm, door opening light, off by default; 3000 K: ${TYP}` },
  ]),
];

export const fittingOf = (id: string): Fitting | undefined => FITTINGS.find((f) => f.id === id);
export const groupFittings = (g: LightGroup): Fitting[] => FITTINGS.filter((f) => f.group === g);
export const lightGroupName = (g: LightGroup): string => LIGHT_GROUPS.find((q) => q.id === g)?.name ?? g;
/** Ceiling fittings (their height is the room's ceiling, or the level height when the room has none). */
export const onCeiling = (f: Fitting): boolean => f.mount === 'recessed' || f.mount === 'surface' || f.mount === 'pendant';

const LF = facts.light;
const r3 = (v: number): number => +v.toFixed(3);
const r4 = (v: number): number => +v.toFixed(4);
const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * Colour temperature to linear RGB, the brightest channel 1: the black-body curve (Tanner Helland's fit), softened half
 * way to white as the game's own lamps are tinted (Warehouse 3000 K ~ [1, 0.9, 0.75]).
 */
export function kelvinColour(k: number): [number, number, number] {
  const t = clamp(k, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = [r, g, b].map((v) => clamp(v, 0, 255) / 255);
  const m = Math.max(...c) || 1;
  return c.map((v) => r3(0.5 + 0.5 * (v / m))) as [number, number, number];
}

/** A beam's share of light against the calibration downlight's: narrower beams throw further (the cone's solid angle). */
const beamGain = (beam: number): number => {
  const half = (Math.min(180, Math.max(1, beam)) / 2) * DEG;
  return Math.sqrt((1 - Math.cos((LF.calBeam.value / 2) * DEG)) / (1 - Math.cos(half)));
};

/** The aim [yaw, pitch] in degrees as a unit direction (yaw 0 north = +z, 90 east = +x; pitch below the horizontal). */
export function aimDir(aim: readonly [number, number]): [number, number, number] {
  const y = aim[0] * DEG;
  const p = aim[1] * DEG;
  return [r4(Math.sin(y) * Math.cos(p)), r4(-Math.sin(p)), r4(Math.cos(y) * Math.cos(p))];
}

export interface ParamInput {
  lumens: number;
  kelvin: number;
  beam: number;
  /** The beam's axis (default straight down). */
  dir?: [number, number, number];
  colour?: [number, number, number];
  fixture?: { sx: number; sy: number; sz: number; oy: number } | null;
  off?: boolean;
}

/**
 * The one conversion (ON6 decision 3): lumens, colour temperature and beam to `LightInit` params. The reach grows with
 * the square root of the beam-weighted lumens and the peak intensity with the fourth root, so the calibration downlight
 * (facts light.calLumens at light.calBeam) gets exactly the Warehouse office lamp's radius and intensity; beams narrower
 * than light.spotBeamMax are spot cones along `dir`, wider ones light the hemisphere below (lampMath.ts).
 */
export function lightParams(p: ParamInput): LampParams {
  const ratio = (Math.max(0, p.lumens) * beamGain(p.beam)) / LF.calLumens.value;
  const radius = r3(clamp(LF.calRadius.value * Math.sqrt(ratio), LF.radiusMin.value, LF.radiusMax.value));
  const intensity = r3(clamp(LF.calIntensity.value * Math.pow(ratio, 0.25), LF.intensityMin.value, LF.intensityMax.value));
  const spot = p.beam < LF.spotBeamMax.value;
  const out: LampParams = { kind: spot ? 'spot' : 'lamp', radius, intensity, color: p.colour ? [p.colour[0], p.colour[1], p.colour[2]] : kelvinColour(p.kelvin) };
  if (spot) {
    const d = p.dir ?? [0, -1, 0];
    const c = makeCone(d[0], d[1], d[2], (p.beam / 2) * DEG);
    out.cone = { dx: r4(c.dx), dy: r4(c.dy), dz: r4(c.dz), cosOuter: r4(c.cosOuter), cosInner: r4(c.cosInner) };
  }
  if (p.fixture) out.fixture = { sx: r3(p.fixture.sx), sy: r3(p.fixture.sy), sz: r3(p.fixture.sz), oy: r3(p.fixture.oy) };
  if (p.off) out.on = false;
  return out;
}

/**
 * Michael 2026-10-14: an area fitting lights across its whole face. Its light is a grid of points over the face, one per
 * facts light.areaCell of its width and depth (rounded, at least 1 each way; at most light.areaMax in all, the longer
 * side giving way first). Returns the counts along the face's width and depth.
 */
export function areaGrid(w: number, d: number): { nw: number; nd: number } {
  const cell = LF.areaCell.value;
  let nw = Math.max(1, Math.round(w / cell - 1e-9));
  let nd = Math.max(1, Math.round(d / cell - 1e-9));
  while (nw * nd > LF.areaMax.value) {
    if (nw >= nd && nw > 1) nw--;
    else if (nd > 1) nd--;
    else break;
  }
  return { nw, nd };
}

/** Colour temperatures the card steps through (K). */
export const KELVIN_STEPS = [2700, 3000, 3500, 4000, 5000, 6000, 6500] as const;
