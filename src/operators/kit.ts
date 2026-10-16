/**
 * The operators' kit as data (docs/operators/SPEC.md Section 5): the logical-detail rule in checkable form.
 * Pure data and a validator, no Babylon. Concepts vary the details, never the logic recorded here.
 *
 * Rules (`validateKit`):
 * - every item has a job;
 * - every strap has two anchors;
 * - every pouch names its contents and its closure;
 * - every cable has a source, a device and retention points no more than 15 cm apart (ends included).
 */
import type { OperatorId } from './operatorBody';

export type KitZone = 'head' | 'torso' | 'belt' | 'climbing' | 'legs' | 'hands' | 'feet';
export type KitKind = 'garment' | 'strap' | 'pouch' | 'cable' | 'device' | 'mount' | 'hardware' | 'pad' | 'panel';

/** A named point on an item where something is fixed. */
export interface KitAnchor {
  item: string;
  point: string;
}

/** A fixing along a cable, `at` metres from the source end. */
export interface CableRetention {
  at: number;
  by: string;
}

export interface KitItem {
  id: string;
  name: string;
  kind: KitKind;
  zone: KitZone;
  where: string;
  /** What it does or holds. Never empty: no decorative kit. */
  job: string;
  /** How it is attached or worn. */
  attach: string;
  count?: number;
  /** Present only in some loadouts. */
  when?: string;
  /** Straps: both ends. */
  anchors?: KitAnchor[];
  /** Pouches: what is inside, and how it closes. */
  contents?: string[];
  closure?: string;
  /** Cables: the powering or signal end, the device end, the routed length and the fixings between. */
  source?: string;
  device?: string;
  length?: number;
  retention?: CableRetention[];
}

export interface Kit {
  operator: OperatorId;
  items: KitItem[];
  /** SPEC 5 "Wear" line: where use shows. */
  wear: string[];
}

/** Longest free span of cable allowed between two fixings (m). */
export const MAX_CABLE_SPAN = 0.15;

const a = (item: string, point: string): KitAnchor => ({ item, point });

export const WREN_KIT: Kit = {
  operator: 'wren',
  items: [
    // Head
    { id: 'balaclava', name: 'Fitted balaclava', kind: 'garment', zone: 'head', where: 'head and neck', job: 'covers all skin (D4); one eye port sealed by the goggle eyecups', attach: 'worn under everything' },
    { id: 'hood', name: 'Close-fitting hood', kind: 'garment', zone: 'head', where: 'over the balaclava', job: 'covers the head and harness base; part of the soft-shell top', attach: 'sewn to the soft-shell top; rear shock-cord volume adjuster with a cord lock' },
    { id: 'headHarness', name: 'Head harness (split crown)', kind: 'mount', zone: 'head', where: 'over the hood', job: 'carries the battery pod and seats the goggle band', attach: 'hard brow plate, two crown straps, two side straps, hard rear battery pod, chin strap' },
    { id: 'crownStrap', name: 'Harness crown straps (split)', kind: 'strap', zone: 'head', where: 'over the crown, forking from the brow plate', job: 'hold the brow plate and the pod up against the goggle and battery weight', attach: 'sewn and bar-tacked to the brow plate and the rear pod', count: 2, anchors: [a('headHarness', 'brow plate'), a('headHarness', 'rear pod')] },
    { id: 'sideStraps', name: 'Harness side straps', kind: 'strap', zone: 'head', where: 'above each ear', job: 'clamp the harness round the head', attach: 'low-profile cam buckles, tails doubled back', count: 2, anchors: [a('headHarness', 'brow plate'), a('headHarness', 'rear pod')] },
    { id: 'chinStrap', name: 'Chin strap', kind: 'strap', zone: 'head', where: 'under the chin', job: 'stops the harness riding up when the goggle is pulled down or slid up', attach: 'side-release buckle on the left', anchors: [a('headHarness', 'left side strap'), a('headHarness', 'right side strap')] },
    { id: 'goggleBand', name: 'Goggle band', kind: 'strap', zone: 'head', where: 'round the back of the head over the harness', job: 'holds the goggle over the eyes in use or on the brow when stowed (no flip mount, D19); carries the goggle cable', attach: 'through a lug on each side of the housing', anchors: [a('goggle', 'left lug'), a('goggle', 'right lug')] },
    { id: 'goggle', name: 'Square goggle housing (green)', kind: 'device', zone: 'head', where: 'over the eyes in use, on the brow when stowed', job: 'night vision: one square shroud over two optics, rubber eyecups', attach: 'goggle band through the side lugs' },
    { id: 'batteryPack', name: 'Battery pod', kind: 'device', zone: 'head', where: 'rear of the harness, on the occiput', job: 'powers the goggle; counterweight; anchors the crown and side straps', attach: 'hard shell of the harness; screw cap on the right' },
    { id: 'goggleCable', name: 'Goggle cable', kind: 'cable', zone: 'head', where: 'pod along the goggle band, off it before the left lug into a plug on the housing side', job: 'goggle power', attach: 'strain relief boots at both ends', source: 'batteryPack', device: 'goggle', length: 0.29, retention: [{ at: 0.07, by: 'band keeper, rear' }, { at: 0.14, by: 'band keeper, middle' }, { at: 0.22, by: 'band keeper, front' }] },
    { id: 'earpiece', name: 'Earpiece', kind: 'device', zone: 'head', where: 'left ear, under the hood', job: 'radio audio', attach: 'in the ear, under the balaclava' },
    { id: 'earpieceCable', name: 'Earpiece cable', kind: 'cable', zone: 'head', where: 'PTT up the neck to the left ear', job: 'radio audio to the earpiece', attach: 'plugs into the PTT', source: 'ptt', device: 'earpiece', length: 0.44, retention: [{ at: 0.03, by: 'clip on the shirt collar' }, { at: 0.17, by: 'tucked under the balaclava edge' }, { at: 0.3, by: 'held under the balaclava up the neck' }] },
    // Torso
    { id: 'combatShirt', name: 'Combat shirt', kind: 'garment', zone: 'torso', where: 'torso and arms', job: 'knit torso under the carrier, ripstop raglan sleeves', attach: 'worn' },
    { id: 'elbowPockets', name: 'Elbow pad pockets', kind: 'pouch', zone: 'torso', where: 'both elbows', job: 'hold the elbow pads', attach: 'sewn into the sleeves', count: 2, contents: ['elbow pad'], closure: 'hook-and-loop opening inside the forearm' },
    { id: 'armPocketL', name: 'Upper-arm pocket, left', kind: 'pouch', zone: 'torso', where: 'left upper arm', job: 'carries the marker light', attach: 'sewn to the sleeve', contents: ['marker light'], closure: 'flap with hook-and-loop' },
    { id: 'armPocketR', name: 'Upper-arm pocket, right', kind: 'pouch', zone: 'torso', where: 'right upper arm', job: 'carries a spare goggle battery', attach: 'sewn to the sleeve', contents: ['spare goggle battery'], closure: 'flap with hook-and-loop' },
    { id: 'softShell', name: 'Soft-shell top (concept option)', kind: 'garment', zone: 'torso', where: 'over the shirt', job: 'wind and weather layer; carries the hood', attach: 'worn; hood attached', when: 'concepts that use it' },
    { id: 'carrier', name: 'Low-profile plate carrier', kind: 'panel', zone: 'torso', where: 'chest and back', job: 'slim front and back plates; the platform for the torso kit', attach: 'shoulder straps and cummerbund' },
    { id: 'carrierShoulders', name: 'Carrier shoulder straps', kind: 'strap', zone: 'torso', where: 'over each shoulder', job: 'hang the front plate from the back plate; route the radio cable (left)', attach: 'padded; adjustable at the front', count: 2, anchors: [a('carrier', 'front plate top'), a('carrier', 'back plate top')] },
    { id: 'cummerbund', name: 'Elastic cummerbund', kind: 'strap', zone: 'torso', where: 'round the ribs', job: 'closes the carrier round the body; carries the radio and medical pouches', attach: 'closes under a front flap', count: 2, anchors: [a('carrier', 'back plate side'), a('carrier', 'front flap')] },
    { id: 'magPouches', name: 'Rifle magazine pouches', kind: 'pouch', zone: 'torso', where: 'front of the carrier', job: 'rifle reloads', attach: 'woven into the webbing', count: 3, contents: ['rifle magazine'], closure: 'shock-cord retention with a pull tab' },
    { id: 'adminPouch', name: 'Admin pouch', kind: 'pouch', zone: 'torso', where: 'above the magazine pouches', job: 'small tools and notes', attach: 'woven into the webbing', contents: ['notebook', 'marker', 'multitool', 'small white / IR light'], closure: 'zip with a pull loop' },
    { id: 'radioPouch', name: 'Radio pouch', kind: 'pouch', zone: 'torso', where: 'left side of the cummerbund', job: 'holds the team radio', attach: 'woven into the cummerbund', contents: ['team radio'], closure: 'shock-cord over the top' },
    { id: 'radio', name: 'Team radio', kind: 'device', zone: 'torso', where: 'in the radio pouch', job: 'team comms', attach: 'in its pouch; antenna bent down and held by an elastic loop' },
    { id: 'radioCable', name: 'Radio cable', kind: 'cable', zone: 'torso', where: 'radio up the left shoulder strap', job: 'radio to the PTT', attach: 'plugs into the radio top', source: 'radio', device: 'ptt', length: 0.45, retention: [{ at: 0.11, by: 'elastic loop, cummerbund' }, { at: 0.22, by: 'elastic loop, strap front' }, { at: 0.33, by: 'elastic loop, strap top' }] },
    { id: 'ptt', name: 'PTT button', kind: 'device', zone: 'torso', where: 'left shoulder strap at the collarbone', job: 'transmits', attach: 'strap mount' },
    { id: 'medPouch', name: 'Medical pouch', kind: 'pouch', zone: 'torso', where: 'right side of the cummerbund', job: 'first aid', attach: 'woven into the cummerbund', contents: ['medkit'], closure: 'pull tab and a quiet buckle' },
    { id: 'backPanel', name: 'Back panel', kind: 'panel', zone: 'torso', where: 'on the back plate bag', job: 'carries the rifle: moulded butt cup at the bottom; drag handle at the top edge', attach: 'fixed to the back plate bag' },
    { id: 'rifleBungee', name: 'Rifle bungee loop', kind: 'strap', zone: 'torso', where: 'top of the back panel', job: 'holds the rifle barrel against the back panel', attach: 'pull tab release', anchors: [a('backPanel', 'top left'), a('backPanel', 'top right')] },
    { id: 'carrierRelease', name: 'Quick-release cable', kind: 'hardware', zone: 'torso', where: 'front of the carrier: pull loop at the bottom centre of the front flap', job: 'one pull frees the shoulder straps and the cummerbund and drops the carrier', attach: 'cable sleeved inside the plate bags through grommets; the pull loop in a sleeve' },
    { id: 'buttPatch', name: 'Shoulder reinforcement', kind: 'pad', zone: 'torso', where: 'right shoulder of the shirt', job: 'rifle butt patch', attach: 'sewn on' },
    // Belt
    { id: 'belt', name: 'Inner and outer belt', kind: 'strap', zone: 'belt', where: 'waist', job: 'carries the belt kit and the drop-leg hanger', attach: 'two-part metal quick-release buckle; outer belt hook-and-loop to the inner', anchors: [a('belt', 'buckle male'), a('belt', 'buckle female')] },
    { id: 'grenadePouches', name: 'Grenade pouches', kind: 'pouch', zone: 'belt', where: 'front left of the belt', job: 'grenades (GRENADE_POUCHES)', attach: 'threaded on the belt', count: 3, contents: ['grenade'], closure: 'flap with a quiet snap' },
    { id: 'pistolMagPouch', name: 'Pistol magazine pouch', kind: 'pouch', zone: 'belt', where: 'front right of the belt', job: 'pistol reloads', attach: 'threaded on the belt', contents: ['pistol magazine', 'pistol magazine'], closure: 'shock-cord retention' },
    { id: 'dumpPouch', name: 'Dump pouch', kind: 'pouch', zone: 'belt', where: 'rear right', job: 'empty magazines', attach: 'threaded on the belt', contents: ['empty magazines'], closure: 'rolled, held by elastic' },
    { id: 'knifeSheath', name: 'Knife sheath', kind: 'pouch', zone: 'belt', where: 'rear centre, horizontal', job: 'the knife (Phase 6 verb)', attach: 'two belt straps', contents: ['knife'], closure: 'friction fit and a snap strap' },
    { id: 'dropHanger', name: 'Drop-leg hanger', kind: 'strap', zone: 'belt', where: 'right side', job: 'carries the holster platform', attach: 'belt loop plus a short adjustable strap', anchors: [a('belt', 'right side loop'), a('thighHolster', 'platform top')] },
    // Legs
    { id: 'baseLayer', name: 'Base layer', kind: 'garment', zone: 'torso', where: 'torso, arms and legs', job: 'thin compression top and leggings next to the skin; seen only at the collar and cuffs', attach: 'worn under everything; the top laps over the leggings waistband' },
    { id: 'kneePads', name: 'Knee pad pockets', kind: 'pouch', zone: 'legs', where: 'both knees, inside the trousers', job: 'hold the internal knee pads behind a reinforced outer panel', attach: 'sewn into the trouser knees', count: 2, contents: ['knee pad'], closure: 'opening inside at the top, hook-and-loop' },
    { id: 'trousers', name: 'Soft-shell trousers', kind: 'garment', zone: 'legs', where: 'legs', job: 'articulated knees, crotch gusset, reinforced seat, internal knee pads', attach: 'worn under the belt' },
    { id: 'cargoL', name: 'Cargo pocket, left', kind: 'pouch', zone: 'legs', where: 'left thigh, angled', job: 'map card', attach: 'sewn on; drain grommet at the bottom', contents: ['map card'], closure: 'flap with a quiet closure' },
    { id: 'cargoR', name: 'Cargo pocket, right', kind: 'pouch', zone: 'legs', where: 'right thigh, angled', job: 'spare gloves', attach: 'sewn on; drain grommet at the bottom', contents: ['spare gloves'], closure: 'flap with a quiet closure' },
    { id: 'thighHolster', name: 'Thigh holster', kind: 'pouch', zone: 'legs', where: 'right thigh', job: 'the pistol (suppressed: open muzzle)', attach: 'drop-leg platform on the hanger', contents: ['pistol'], closure: 'retention hood' },
    { id: 'legStraps', name: 'Holster leg straps', kind: 'strap', zone: 'legs', where: 'round the right thigh', job: 'hold the platform against the thigh', attach: 'elastic sections and side-release buckles', count: 2, anchors: [a('thighHolster', 'platform rear edge'), a('thighHolster', 'platform front buckle')] },
    { id: 'smgSling', name: 'SMG sling', kind: 'strap', zone: 'belt', where: 'left hip (sling slot)', job: 'carries the SMG', attach: 'quick-detach swivel on the belt', when: 'an SMG in the loadout', anchors: [a('belt', 'left QD swivel'), a('smg', 'rear sling point')] },
    // Hands and feet
    { id: 'gloves', name: 'Gloves', kind: 'garment', zone: 'hands', where: 'hands', job: 'grip and protection: leather palm, stretch back, reinforced trigger finger', attach: 'wrist tab' },
    { id: 'boots', name: 'Mid boots', kind: 'garment', zone: 'feet', where: 'feet', job: 'quiet footing: suede and nylon, toe rand, quiet lug sole', attach: 'laced; speed hooks, lace garage' },
  ],
  wear: [
    'scuffed carrier bottom edge',
    'polished glove palms and trigger finger',
    'worn webbing tails',
    'tape on the mount knob',
    'dust in the boot lugs and trouser cuffs',
    'abraded rifle-butt patch',
  ],
};

export const MOTH_KIT: Kit = {
  operator: 'moth',
  items: [
    // Head
    { id: 'balaclava', name: 'Fitted balaclava', kind: 'garment', zone: 'head', where: 'head and neck', job: 'covers all skin (D4); one eye port sealed by the goggle eyecups', attach: 'worn under everything' },
    { id: 'hood', name: 'Hood', kind: 'garment', zone: 'head', where: 'over the balaclava', job: 'covers the head; part of the lighter knit top, looser than Wren\'s', attach: 'sewn to the knit top; drawcord at the face opening' },
    { id: 'headHarness', name: 'Head harness (slim straps)', kind: 'mount', zone: 'head', where: 'over the hood', job: 'carries the goggle mount and the battery pack', attach: 'crown strap, two side straps, rear cradle, chin strap' },
    { id: 'crownStrap', name: 'Harness crown strap', kind: 'strap', zone: 'head', where: 'over the crown', job: 'holds the front plate up; carries the cable clips', attach: 'sewn to the front plate and the rear cradle', anchors: [a('headHarness', 'front plate'), a('headHarness', 'rear cradle')] },
    { id: 'sideStraps', name: 'Harness side straps', kind: 'strap', zone: 'head', where: 'above each ear', job: 'clamp the harness round the head', attach: 'adjustable through ladder locks', count: 2, anchors: [a('headHarness', 'front plate'), a('headHarness', 'rear cradle')] },
    { id: 'chinStrap', name: 'Chin strap', kind: 'strap', zone: 'head', where: 'under the chin', job: 'stops the harness riding up when the goggles are pulled down or slid up', attach: 'side-release buckle on the right', anchors: [a('headHarness', 'left side strap'), a('headHarness', 'right side strap')] },
    { id: 'goggleBand', name: 'Goggle band', kind: 'strap', zone: 'head', where: 'round the back of the head over the harness', job: 'holds the goggles over the eyes in use or on the brow when stowed (no flip mount, D19)', attach: 'through a lug on each side of the goggles', anchors: [a('goggle', 'left lug'), a('goggle', 'right lug')] },
    { id: 'goggle', name: 'Round twin-lens goggles (amber)', kind: 'device', zone: 'head', where: 'over the eyes in use, on the brow when stowed', job: 'night vision: two round barrels on a bridge with an interpupillary slide; rubber eyecups', attach: 'dovetail into the mount' },
    { id: 'batteryPack', name: 'Battery pack', kind: 'device', zone: 'head', where: 'rear cradle', job: 'powers the goggles; counterweight', attach: 'hook-and-loop to the cradle plus a retention strap' },
    { id: 'batteryStrap', name: 'Battery retention strap', kind: 'strap', zone: 'head', where: 'over the battery pack', job: 'keeps the pack in the cradle', attach: 'hook-and-loop tab', anchors: [a('headHarness', 'cradle left'), a('headHarness', 'cradle right')] },
    { id: 'goggleCable', name: 'Goggle cable (right side)', kind: 'cable', zone: 'head', where: 'pack to mount, routed on the right', job: 'goggle power', attach: 'strain relief boots at both ends', source: 'batteryPack', device: 'goggle', length: 0.42, retention: [{ at: 0.14, by: 'right side strap clip, rear' }, { at: 0.28, by: 'right side strap clip, front' }] },
    { id: 'earpiece', name: 'Earpiece', kind: 'device', zone: 'head', where: 'right ear', job: 'radio audio', attach: 'in the ear, under the balaclava' },
    { id: 'earpieceCable', name: 'Earpiece cable', kind: 'cable', zone: 'head', where: 'chest PTT up the neck to the right ear', job: 'radio audio to the earpiece', attach: 'plugs into the PTT', source: 'ptt', device: 'earpiece', length: 0.36, retention: [{ at: 0.12, by: 'elastic loop, right H-strap' }, { at: 0.22, by: 'clip on the shirt collar' }, { at: 0.3, by: 'tucked under the balaclava edge' }] },
    // Torso and arms
    { id: 'combatShirt', name: 'Combat shirt, sleeves rolled', kind: 'garment', zone: 'torso', where: 'torso and arms', job: 'outer sleeves rolled to just below the elbow in three or four bands, held by a sleeve tab and button', attach: 'worn' },
    { id: 'baseLayer', name: 'Knit base layer', kind: 'garment', zone: 'torso', where: 'forearms below the roll', job: 'covers the forearms under the rolled sleeves: no skin (D4)', attach: 'worn under the shirt' },
    { id: 'chestRig', name: 'Chest rig (H-harness)', kind: 'panel', zone: 'torso', where: 'front of the chest', job: 'the platform for the front kit', attach: 'H-harness and a side strap' },
    { id: 'hStraps', name: 'H-harness straps', kind: 'strap', zone: 'torso', where: 'over each shoulder', job: 'hang the chest rig; route the radio cable (left)', attach: 'adjustable at the front', count: 2, anchors: [a('chestRig', 'panel top'), a('backPanel', 'crossing point')] },
    { id: 'sideStrap', name: 'Chest rig side strap', kind: 'strap', zone: 'torso', where: 'round the ribs', job: 'holds the rig against the chest', attach: 'side-release buckle', anchors: [a('chestRig', 'left edge'), a('chestRig', 'right edge')] },
    { id: 'magPouches', name: 'Rifle magazine pouches', kind: 'pouch', zone: 'torso', where: 'chest rig front panel', job: 'rifle reloads', attach: 'sewn into the panel', count: 2, contents: ['rifle magazine'], closure: 'shock-cord retention with a pull tab' },
    { id: 'radioPouch', name: 'Radio pouch', kind: 'pouch', zone: 'torso', where: 'chest rig, left', job: 'holds the team radio', attach: 'sewn into the panel', contents: ['team radio'], closure: 'shock-cord over the top' },
    { id: 'radio', name: 'Team radio', kind: 'device', zone: 'torso', where: 'in the radio pouch', job: 'team comms', attach: 'in its pouch' },
    { id: 'adminPouch', name: 'Admin pouch', kind: 'pouch', zone: 'torso', where: 'top of the chest rig', job: 'small tools and notes', attach: 'sewn on top of the panel', contents: ['notebook', 'marker', 'multitool'], closure: 'zip with a pull loop' },
    { id: 'backPanel', name: 'Slim back panel', kind: 'panel', zone: 'torso', where: 'H-harness crossing point', job: 'carries the rifle: butt cup and bungee give the gun two anchors without a plate carrier', attach: 'at the H-harness crossing' },
    { id: 'rifleBungee', name: 'Rifle bungee loop', kind: 'strap', zone: 'torso', where: 'top of the back panel', job: 'holds the rifle barrel against the back panel', attach: 'pull tab release', anchors: [a('backPanel', 'top left'), a('backPanel', 'top right')] },
    { id: 'radioCable', name: 'Radio cable', kind: 'cable', zone: 'torso', where: 'radio up the left H-strap to the chest PTT', job: 'radio to the PTT', attach: 'plugs into the radio top', source: 'radio', device: 'ptt', length: 0.3, retention: [{ at: 0.1, by: 'elastic loop, H-strap low' }, { at: 0.2, by: 'elastic loop, H-strap high' }] },
    { id: 'ptt', name: 'PTT button', kind: 'device', zone: 'torso', where: 'on the chest', job: 'transmits', attach: 'H-strap mount' },
    { id: 'medPouch', name: 'Medical pouch', kind: 'pouch', zone: 'climbing', where: 'left side of the harness waist belt', job: 'first aid', attach: 'threaded on the waist belt', contents: ['medkit'], closure: 'pull tab and a quiet buckle' },
    // Climbing
    { id: 'sitHarness', name: 'Sit harness', kind: 'strap', zone: 'climbing', where: 'waist and thighs', job: 'rappel and fall arrest; Moth\'s belt (no duty belt): padded waist belt, leg loops, belay loop, four gear loops, haul loop', attach: 'waist buckle', anchors: [a('sitHarness', 'waist buckle male'), a('sitHarness', 'waist buckle female')] },
    { id: 'legLoops', name: 'Harness leg loops', kind: 'strap', zone: 'climbing', where: 'round each thigh', job: 'carry the body in the harness', attach: 'adjustable buckles', count: 2, anchors: [a('sitHarness', 'belay loop'), a('sitHarness', 'rear elastic riser')] },
    { id: 'lockingBiner', name: 'Locking carabiner with a plate descender', kind: 'hardware', zone: 'climbing', where: 'belay loop', job: 'the rappel', attach: 'clipped to the belay loop' },
    { id: 'snapGates', name: 'Snap-gate carabiners', kind: 'hardware', zone: 'climbing', where: 'front gear loops', job: 'clip anchors', attach: 'clipped to the gear loops', count: 3 },
    { id: 'sling', name: 'Sewn anchor sling', kind: 'strap', zone: 'climbing', where: 'over the left shoulder to the right hip', job: 'rigs an anchor', attach: 'both ends on one snap-gate on a right gear loop', anchors: [a('snapGates', 'sling end 1'), a('snapGates', 'sling end 2')] },
    { id: 'frictionCord', name: 'Friction-hitch cord', kind: 'hardware', zone: 'climbing', where: 'on a gear loop', job: 'rappel backup', attach: 'clipped to a gear loop' },
    { id: 'ropeBag', name: 'Rope bag', kind: 'pouch', zone: 'climbing', where: 'right hip', job: 'the rappel rope', attach: 'on the haul loop and a gear loop', contents: ['rappel rope'], closure: 'drawcord and a buckled lid' },
    { id: 'chalkBag', name: 'Chalk bag', kind: 'pouch', zone: 'climbing', where: 'rear, on the haul loop', job: 'chalk (a steeplejack\'s habit; it explains the dusty gloves)', attach: 'clipped to the haul loop', contents: ['chalk'], closure: 'drawcord' },
    { id: 'grenadePouches', name: 'Grenade pouches', kind: 'pouch', zone: 'climbing', where: 'front left of the harness waist belt', job: 'grenades (GRENADE_POUCHES)', attach: 'threaded on the waist belt', count: 3, contents: ['grenade'], closure: 'flap with a quiet snap' },
    { id: 'dropHanger', name: 'Drop-leg hanger', kind: 'strap', zone: 'climbing', where: 'round the harness waist belt, right side', job: 'carries the holster platform', attach: 'loop round the waist belt plus a short adjustable strap', anchors: [a('sitHarness', 'right side waist belt'), a('thighHolster', 'platform top')] },
    // Legs
    { id: 'trousers', name: 'Stretch climbing trousers', kind: 'garment', zone: 'legs', where: 'legs', job: 'articulated knees, gusset, reinforced knees and seat', attach: 'worn under the harness' },
    { id: 'kneePads', name: 'Thin external knee pads', kind: 'pad', zone: 'legs', where: 'both knees', job: 'protect the knees on edges and roofs', attach: 'elastic straps', count: 2 },
    { id: 'cargoL', name: 'Cargo pocket, left', kind: 'pouch', zone: 'legs', where: 'left thigh', job: 'map card', attach: 'sewn on', contents: ['map card'], closure: 'zip' },
    { id: 'thighHolster', name: 'Thigh holster', kind: 'pouch', zone: 'legs', where: 'right thigh, straps below the harness leg loop', job: 'the pistol (suppressed: open muzzle)', attach: 'drop-leg platform on the hanger', contents: ['pistol'], closure: 'retention hood' },
    { id: 'legStraps', name: 'Holster leg straps', kind: 'strap', zone: 'legs', where: 'round the right thigh, below the leg loop', job: 'hold the platform against the thigh', attach: 'elastic sections and side-release buckles', count: 2, anchors: [a('thighHolster', 'platform rear edge'), a('thighHolster', 'platform front buckle')] },
    // Hands and feet
    { id: 'gloves', name: 'Gloves', kind: 'garment', zone: 'hands', where: 'hands', job: 'grip on rope and rifle: thicker leather palm, rope-wear patch on the right (brake) hand, stretch back', attach: 'wrist tab' },
    { id: 'boots', name: 'Approach boots', kind: 'garment', zone: 'feet', where: 'feet', job: 'climbing and quiet footing: low cut, sticky rubber rand up the toe, flat toe edge', attach: 'laced; speed hooks' },
  ],
  wear: [
    'abraded belay loop',
    'chalk dust on the gloves, sleeves and thighs',
    'carabiner gate with worn anodising',
    'tape on the rope bag buckle and a goggle barrel',
    'scuffed knee pads',
    'rubbed boot rands',
  ],
};

export const KITS: Record<OperatorId, Kit> = { wren: WREN_KIT, moth: MOTH_KIT };

/** Items outside the kit that a strap may anchor to (the carried weapons). */
export const EXTERNAL_ANCHORS: readonly string[] = ['rifle', 'smg', 'pistol'];

/** Every rule the kit breaks, as readable lines. Empty means the kit is logical. */
export function validateKit(kit: Kit): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const it of kit.items) {
    if (ids.has(it.id)) errors.push(`${it.id}: duplicate id`);
    ids.add(it.id);
  }
  const known = (id: string) => ids.has(id) || EXTERNAL_ANCHORS.includes(id);
  for (const it of kit.items) {
    const tag = `${kit.operator}.${it.id}`;
    if (!it.job.trim()) errors.push(`${tag}: no job`);
    if (!it.attach.trim()) errors.push(`${tag}: no attachment`);
    if (it.count !== undefined && (!Number.isInteger(it.count) || it.count < 1)) errors.push(`${tag}: bad count`);
    if (it.kind === 'strap') {
      const an = it.anchors ?? [];
      if (an.length !== 2) errors.push(`${tag}: a strap needs two anchors, has ${an.length}`);
      for (const x of an) {
        if (!known(x.item)) errors.push(`${tag}: anchor on unknown item "${x.item}"`);
        if (!x.point.trim()) errors.push(`${tag}: anchor without a point`);
      }
      const [a0, a1] = an;
      if (a0 && a1 && a0.item === a1.item && a0.point === a1.point) errors.push(`${tag}: both anchors are the same point`);
    }
    if (it.kind === 'pouch') {
      if (!it.contents || it.contents.length === 0 || it.contents.some((c) => !c.trim())) errors.push(`${tag}: a pouch must name its contents`);
      if (!it.closure?.trim()) errors.push(`${tag}: a pouch must name its closure`);
    }
    if (it.kind === 'cable') {
      if (!it.source || !ids.has(it.source)) errors.push(`${tag}: cable source "${it.source ?? ''}" is not a kit item`);
      if (!it.device || !ids.has(it.device)) errors.push(`${tag}: cable device "${it.device ?? ''}" is not a kit item`);
      const len = it.length ?? 0;
      if (!(len > 0)) errors.push(`${tag}: cable needs a routed length`);
      else {
        let prev = 0;
        for (const r of it.retention ?? []) {
          if (r.at <= prev || r.at >= len) errors.push(`${tag}: retention "${r.by}" at ${r.at} m is out of order or off the cable`);
          if (r.at - prev > MAX_CABLE_SPAN + 1e-9) errors.push(`${tag}: ${(r.at - prev).toFixed(2)} m free before "${r.by}" (max ${MAX_CABLE_SPAN})`);
          if (!r.by.trim()) errors.push(`${tag}: retention without a fixing`);
          prev = r.at;
        }
        if (len - prev > MAX_CABLE_SPAN + 1e-9) errors.push(`${tag}: ${(len - prev).toFixed(2)} m free before the device (max ${MAX_CABLE_SPAN})`);
      }
    }
  }
  return errors;
}

/**
 * The pipeline's kit check for one built item (`npm run operators:check`): the kit ids the build claims (the garment
 * and everything sewn or fixed onto it) that the kit does not list, and the kit's own rule breaks.
 */
export function kitCoverage(kit: Kit, claimed: readonly string[]): { missing: string[]; errors: string[] } {
  const ids = new Set(kit.items.map((i) => i.id));
  return { missing: claimed.filter((id) => !ids.has(id)), errors: validateKit(kit) };
}
