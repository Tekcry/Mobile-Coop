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
    { id: 'hood', name: 'Close-fitting hood', kind: 'garment', zone: 'head', where: 'over the balaclava', job: 'covers the head and harness base; its skirt laps over the mock neck of the suit', attach: 'pulled on over the balaclava; rear shock-cord volume adjuster with a cord lock' },
    { id: 'headHarness', name: 'Head harness (split crown)', kind: 'mount', zone: 'head', where: 'over the hood', job: 'carries the battery pod and seats the goggle band', attach: 'hard brow plate, two crown straps, two side straps, hard rear battery pod, chin strap' },
    { id: 'crownStrap', name: 'Harness crown straps (split)', kind: 'strap', zone: 'head', where: 'over the crown, forking from the brow plate', job: 'hold the brow plate and the pod up against the goggle and battery weight', attach: 'sewn and bar-tacked to the brow plate and the rear pod', count: 2, anchors: [a('headHarness', 'brow plate'), a('headHarness', 'rear pod')] },
    { id: 'sideStraps', name: 'Harness side straps', kind: 'strap', zone: 'head', where: 'above each ear', job: 'clamp the harness round the head', attach: 'low-profile cam buckles, tails doubled back', count: 2, anchors: [a('headHarness', 'brow plate'), a('headHarness', 'rear pod')] },
    { id: 'chinStrap', name: 'Chin strap', kind: 'strap', zone: 'head', where: 'under the chin', job: 'stops the harness riding up when the goggle is pulled down or slid up', attach: 'side-release buckle on the left', anchors: [a('headHarness', 'left side strap'), a('headHarness', 'right side strap')] },
    { id: 'goggleBand', name: 'Goggle band', kind: 'strap', zone: 'head', where: 'round the back of the head over the harness', job: 'holds the goggle over the eyes in use or on the brow when stowed (no flip mount, D19); carries the goggle cable', attach: 'through a lug on each side of the housing', anchors: [a('goggle', 'left lug'), a('goggle', 'right lug')] },
    { id: 'goggle', name: 'Square goggle housing (green)', kind: 'device', zone: 'head', where: 'over the eyes in use, on the brow when stowed', job: 'night vision: one square shroud over two optics, rubber eyecups', attach: 'goggle band through the side lugs' },
    { id: 'batteryPack', name: 'Battery pod', kind: 'device', zone: 'head', where: 'rear of the harness, on the occiput', job: 'powers the goggle; counterweight; anchors the crown and side straps', attach: 'hard shell of the harness; screw cap on the right' },
    { id: 'goggleCable', name: 'Goggle cable', kind: 'cable', zone: 'head', where: 'pod along the goggle band, off it before the left lug into a plug on the housing side', job: 'goggle power', attach: 'strain relief boots at both ends', source: 'batteryPack', device: 'goggle', length: 0.29, retention: [{ at: 0.07, by: 'band keeper, rear' }, { at: 0.14, by: 'band keeper, middle' }, { at: 0.22, by: 'band keeper, front' }] },
    { id: 'earpiece', name: 'Earpiece', kind: 'device', zone: 'head', where: 'left ear, under the hood', job: 'radio audio', attach: 'in the ear, under the balaclava' },
    { id: 'earpieceCable', name: 'Earpiece cable', kind: 'cable', zone: 'head', where: 'PTT on the left shoulder strap at the collarbone, under the hood skirt, up the left of the neck to the left ear', job: 'radio audio to the earpiece', attach: 'plugs into the PTT top', source: 'ptt', device: 'earpiece', length: 0.225, retention: [{ at: 0.03, by: 'clip on the suit collar' }, { at: 0.11, by: 'tucked under the balaclava edge' }, { at: 0.17, by: 'held under the balaclava up the neck' }] },
    // Torso
    { id: 'suit', name: 'Stealth suit', kind: 'garment', zone: 'torso', where: 'whole body under the head items, gloves and boots', job: 'one-piece bonded soft-shell, wetsuit-fitted; taped seams, no stitching; grip (forearms, knees), abrasion (shoulder yokes, elbows, seat), stretch (inner elbows, rear shoulders) and perforated vent (underarm side panels, backs of the knees) zones; no base layer under it', attach: 'worn; mock neck under the hood skirt, ankle cuffs inside the boot collars' },
    { id: 'suitZip', name: 'Suit chest zip', kind: 'hardware', zone: 'torso', where: 'diagonal, left of the collar to the right ribs', job: 'opens the suit to step into it; the puller parks in a zip garage at the collar so it cannot dig in or snag', attach: 'bonded into the suit front' },
    { id: 'thumbLoops', name: 'Thumb loops', kind: 'hardware', zone: 'hands', where: 'sleeve ends, under the glove cuffs', job: 'hold the sleeves down over the wrists so no skin shows between sleeve and glove (D4)', attach: 'bonded to the sleeve cuffs', count: 2 },
    { id: 'chestPlate', name: 'Composite chest plate', kind: 'panel', zone: 'torso', where: 'chest, its neck scoop clear of the earpiece plug and the PTT', job: 'protection; the platform for the chest rig', attach: 'shoulder straps at its tabs and side straps at its sides, magnetic buckles' },
    { id: 'ribSegments', name: 'Composite rib segments', kind: 'panel', zone: 'torso', where: 'below the chest plate, each lapping the one below', job: 'protection that bends with the torso', attach: 'bonded to an internal elastic web under the chest plate', count: 3 },
    { id: 'backPlate', name: 'Composite back plate', kind: 'panel', zone: 'torso', where: 'upper back, ending at the ribs', job: 'protection; carries the radio recess (upper left) and the weapon mount', attach: 'shoulder straps at its top tabs, side straps at its sides' },
    { id: 'harnessShoulders', name: 'Harness shoulder straps', kind: 'strap', zone: 'torso', where: 'over each shoulder', job: 'carry the plates; the left one keeps the radio cable (three keepers)', attach: 'bonded to the back plate tab; magnetic buckle at the chest plate tab', count: 2, anchors: [a('chestPlate', 'shoulder tab'), a('backPlate', 'top tab')] },
    { id: 'torsoSideStraps', name: 'Harness side straps (22 mm)', kind: 'strap', zone: 'torso', where: 'under each arm', job: 'close the plates round the ribs', attach: 'bonded to the back plate side; magnetic buckle at the chest plate side', count: 2, anchors: [a('chestPlate', 'side'), a('backPlate', 'side')] },
    { id: 'magBuckle', name: 'Magnetic quick-release buckle', kind: 'hardware', zone: 'torso', where: 'every strap closure: shoulder straps 2, side straps 2, the belt 1, the leg bands 4, the leg hangers 2', job: 'closes a strap flush and silently; opens with one pull', attach: 'two gunmetal halves on a rubber-edged base, one bonded to each strap end or anchor', count: 11 },
    { id: 'weaponMount', name: 'Weapon mount receiver', kind: 'mount', zone: 'torso', where: 'back plate, on the spine', job: "where the game's back carry slots attach the long gun (backL / backC / backR frames, upright, muzzle up; no gun modelled, D24)", attach: 'flush gunmetal receiver bar inlaid in the back plate, three keyhole sockets, two flush screws' },
    // Chest rig on the chest plate (step 09, concept A2)
    { id: 'magPouches', name: 'Rifle magazine pouches', kind: 'pouch', zone: 'torso', where: 'low on the chest plate, a pair either side of the centre line, vertical, base plates up (D28 R1)', job: 'rifle reloads: the left hand grips a base plate and pulls up (true 178 mm magazines with their own curve)', attach: 'slim pouches on one flat placard panel, on a moulded saddle bonded to the chest plate', count: 2, contents: ['rifle magazine'], closure: 'open top, shock-cord loop over the base plate with a moulded pull tab' },
    { id: 'gadgetSlot', name: 'Gadget slot', kind: 'pouch', zone: 'torso', where: 'chest plate, upper right beside the magazines', job: 'the EMP and the noisemakers (gadgets.ts carry 1 and 2): flat stick-on discs taken often', attach: 'bonded to the chest plate', contents: ['EMP disc', 'noisemaker disc', 'noisemaker disc'], closure: 'flap with a gunmetal magnetic tab' },
    { id: 'knife', name: 'Knife in a moulded sheath', kind: 'pouch', zone: 'legs', where: 'left thigh, outer front, handle up (D28)', job: 'the knife (Phase 6 verb), 190 mm (a 90 mm blade); the left hand draws it straight up', attach: 'sheath on a moulded seat on the thigh panel', contents: ['knife'], closure: 'moulded friction fit with a gunmetal release at the throat' },
    { id: 'ptt', name: 'PTT button', kind: 'device', zone: 'torso', where: 'left shoulder strap at the collarbone', job: 'transmits; the radio cable and the earpiece cable plug into its top', attach: 'moulded clip round the strap' },
    { id: 'radio', name: 'Team radio module', kind: 'device', zone: 'torso', where: 'set into the back plate recess, upper left', job: 'team comms', attach: 'held by the recess (1.8 mm clear of its walls); a short stub antenna along the plate top edge under a moulded keeper' },
    { id: 'radioCable', name: 'Radio cable', kind: 'cable', zone: 'torso', where: 'radio top connector over the back plate onto the left shoulder strap, along its inner edge over the shoulder to the PTT', job: 'radio to the PTT', attach: 'plugs into the radio top and the PTT top; strain-relief boots at both ends', source: 'radio', device: 'ptt', length: 0.27, retention: [{ at: 0.03, by: 'keeper bridge, strap back' }, { at: 0.13, by: 'keeper bridge, strap top' }, { at: 0.26, by: 'keeper bridge, strap front' }] },
    // Belt
    { id: 'waistBelt', name: 'Slim laminate waist belt', kind: 'strap', zone: 'belt', where: 'waist', job: 'carries the belt kit and the two leg hangers', attach: 'flush magnetic front closure', anchors: [a('magBuckle', 'belt closure, left half'), a('magBuckle', 'belt closure, right half')] },
    { id: 'pistolMagPouch', name: 'Pistol magazine pouch (double)', kind: 'pouch', zone: 'belt', where: "left hip side at 9 o'clock, two horizontal rows, base plates forward (D28)", job: 'pistol reloads: the left hand pulls each magazine forward along its axis', attach: 'a slim double pouch on a flat panel, on a moulded seat over the belt and hip', contents: ['pistol magazine', 'pistol magazine'], closure: 'open at the front, a shock-cord loop with a pull tab per magazine' },
    { id: 'camMinePouch', name: 'Cam and mine pouch', kind: 'pouch', zone: 'belt', where: 'front left of the belt (D28: the old pistol-magazine spot)', job: 'the sticky cams and the prox mine (gadgets.ts carry 2 and 1); the left hand reaches it', attach: 'its back over the belt, bonded', contents: ['sticky cam', 'sticky cam', 'prox mine'], closure: 'flap with a gunmetal magnetic tab' },
    { id: 'slingSocket', name: 'Sling socket', kind: 'mount', zone: 'belt', where: "left hip at about 8 o'clock, behind the pistol magazines (D28)", job: "the anchor of the game's compact-gun sling slot (A41, moved back by D28); no sling modelled (D24)", attach: 'flush gunmetal quick-detach socket on a laminate boss bonded to the belt' },
    { id: 'rappelRing', name: 'Rappel ring', kind: 'hardware', zone: 'belt', where: 'back centre, in a low tunnel', job: 'the rope work Wren needs without a sit harness', attach: 'gunmetal D folded flat in a laminate tunnel on the belt; only its bow shows' },
    { id: 'dronePod', name: 'Drone pod', kind: 'pouch', zone: 'belt', where: 'rear right of the belt, outside the back-carry lane (A39, A88)', job: 'the folded tri-rotor and its battery (gadgets.ts carry 1); either hand reaches it', attach: 'flat hard shell on a moulded saddle over the belt, hung by a laminate tab (D28, D1)', contents: ['tri-rotor drone (folded)', 'drone battery'], closure: 'lid with a rubber seal and a gunmetal latch' },
    { id: 'medPouch', name: 'Medkit pouch', kind: 'pouch', zone: 'belt', where: 'right side of the belt, in front of the holster hanger (A88)', job: 'first aid; either hand reaches it', attach: 'its back over the belt, bonded', contents: ['medkit'], closure: 'tear-away front (visible tear seam) with a webbing pull handle along the bottom edge' },
    // Legs
    { id: 'thighHolster', name: 'Thigh holster (empty)', kind: 'pouch', zone: 'legs', where: "right thigh, at the game's thigh slot (frame pistolHolster)", job: "holds the game's sidearm (D24, A40): the cavity fits the widest thigh-slot sidearm in weaponDefs.ts; open at the muzzle end", attach: 'moulded polymer shell on a laminate platform, on two leg bands and a hanger from the belt', contents: ["the game's sidearm (not modelled)"], closure: 'retention hood with a gunmetal release, shown closed' },
    { id: 'holsterHanger', name: 'Holster hanger', kind: 'strap', zone: 'legs', where: 'right hip, belt to the holster platform', job: 'carries the holster platform from the belt', attach: 'loop round the belt closed by a magnetic buckle; bonded to the platform top', anchors: [a('waistBelt', 'right side'), a('thighHolster', 'platform top')] },
    { id: 'legBands', name: 'Elastic leg bands', kind: 'strap', zone: 'legs', where: 'round each thigh, two per thigh', job: 'hold the holster platform (right) and the sleeve panel (left) against the thigh', attach: 'elastic, a flush magnetic buckle each', count: 4, anchors: [a('magBuckle', 'leg band, near half'), a('magBuckle', 'leg band, far half')] },
    { id: 'sleevePanel', name: 'Throwable sleeve panel', kind: 'panel', zone: 'legs', where: 'left thigh, outer side (D28)', job: 'carries the knife and the three throwable sleeves', attach: 'laminate panel bonded over the two leg bands, hung from the belt' },
    { id: 'throwableSleeves', name: 'Double throwable sleeves', kind: 'pouch', zone: 'legs', where: 'on the sleeve panel, outer left thigh, straight, caps up (D28)', job: 'the throwables (gadgets.ts carry 2 each), one type per sleeve; the caps differ by touch', attach: 'elastic sleeves bonded to the panel', count: 3, contents: ['frag x2 (knurled ring cap)', 'sleeping gas x2 (dome cap)', 'flashbang x2 (two-ridge cap)'], closure: 'shock-cord loop over each cap with a pull tab' },
    { id: 'sleeveHanger', name: 'Sleeve panel hanger', kind: 'strap', zone: 'legs', where: 'left front, belt to the sleeve panel', job: 'carries the sleeve panel from the belt', attach: 'loop round the belt closed by a magnetic buckle; bonded to the panel top', anchors: [a('waistBelt', 'left front'), a('sleevePanel', 'panel top')] },
    // Hands and feet
    { id: 'gloves', name: 'Gloves', kind: 'garment', zone: 'hands', where: 'hands', job: 'grip and protection: leather palm, stretch back, reinforced trigger finger', attach: 'wrist tab' },
    { id: 'boots', name: 'Approach boots', kind: 'garment', zone: 'feet', where: 'feet', job: 'light, climbing-capable footing (D23): an approach-shoe last with a toe spring, a sticky rubber rand rising over the toe, a flat edging zone under the toes, low lugs with a heel brake, a firm thin midsole; suede and nylon upper, bellows tongue', attach: 'laced close to the toe through low-profile eyelets (no speed hooks), the bow in a lace garage; a padded collar about 13 cm with a heel pull loop over the bonded ankle cuff of the suit' },
  ],
  wear: [
    'scuffed plate and rib segment edges (the rubber trim and the chamfers)',
    'polished glove palms and trigger finger',
    'worn webbing tails',
    'tape on the mount knob',
    'dust in the boot lugs and on the suit knees',
    'polished grip pebble on the forearms and knees',
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
