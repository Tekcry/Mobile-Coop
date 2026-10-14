/**
 * ON12: the Security tab's devices as data (one list, a `src` per entry): the S0 kinds the editor places (cameras fixed
 * and pan, card readers and keypads, PIR motion sensors, infrared beams), their drawn sizes, the reader types (ON9's
 * door reader ids) and the access level plate colours. Numbers come from scripts/kestrel/facts.json `security` (S0
 * section 5) or the game's own src/config/security.ts. Babylon-free.
 */
import facts from '../../scripts/kestrel/facts.json';
import { CAMERA } from '../config/security';

export const SF = facts.security;
const EDITOR = 'editor default: typical product';

/** The Security tab's tools (one per tile). */
export type SecTool = 'camera' | 'pan' | 'reader' | 'keypad' | 'pir' | 'beam';

export interface SecToolDef {
  id: SecTool;
  name: string;
  desc: string;
  /** The device kind it places (S0 section 6). */
  kind: 'camera' | 'reader' | 'pir' | 'beam';
}

export const SEC_TOOLS: readonly SecToolDef[] = [
  { id: 'camera', name: 'Fixed camera', desc: 'Wall or ceiling, then aim', kind: 'camera' },
  { id: 'pan', name: 'Pan camera', desc: 'Sweeps between two angles', kind: 'camera' },
  { id: 'reader', name: 'Card reader', desc: 'By a door, card level', kind: 'reader' },
  { id: 'keypad', name: 'Keypad', desc: 'PIN pad by a door', kind: 'reader' },
  { id: 'pir', name: 'Motion sensor', desc: 'Lights or the alarm', kind: 'pir' },
  { id: 'beam', name: 'Beam', desc: 'Wall point to wall point', kind: 'beam' },
];

export const secTool = (id: string): SecToolDef => SEC_TOOLS.find((t) => t.id === id) ?? SEC_TOOLS[0]!;

/** Reader types: ON9's door `reader` ids a device can be (openingCatalogue READERS less none and key switch). */
export const READER_TYPES: readonly { id: 'card' | 'card-pin' | 'keypad'; name: string; pin: boolean; src: string }[] = [
  { id: 'card', name: 'Card reader', pin: false, src: 'S0 2.3 reader' },
  { id: 'card-pin', name: 'Card and PIN', pin: true, src: 'S0 2.3 reader flagged pin' },
  { id: 'keypad', name: 'Keypad', pin: true, src: 'ON9 door reader keypad; S0 2.3 pin' },
];

/** Access level plate colours, 0-5 (ON9 card levels; S0 2.3 levels 1-5, 0 = no card needed). */
export const LEVEL_COLOURS: readonly { level: number; hex: string; name: string; src: string }[] = [
  { level: 0, hex: '#adb5bd', name: 'grey', src: EDITOR },
  { level: 1, hex: '#40c057', name: 'green', src: EDITOR },
  { level: 2, hex: '#228be6', name: 'blue', src: EDITOR },
  { level: 3, hex: '#fab005', name: 'yellow', src: EDITOR },
  { level: 4, hex: '#fd7e14', name: 'orange', src: EDITOR },
  { level: 5, hex: '#e03131', name: 'red', src: EDITOR },
];
export const levelColour = (n: number): string => LEVEL_COLOURS.find((c) => c.level === n)?.hex ?? LEVEL_COLOURS[0]!.hex;

/** Drawn sizes (m): width, height, depth of each device's body. */
export const DEVICE_SIZES = {
  camera: { w: CAMERA.housing.w, h: CAMERA.housing.h, d: CAMERA.housing.len, src: 'SN05 (src/config/security.ts CAMERA.housing)' },
  reader: { w: 0.08, h: 0.12, d: 0.03, src: EDITOR },
  pir: { w: 0.1, h: 0.06, d: 0.1, src: `${EDITOR} (a white dome, S0 section 3)` },
  beamPost: { w: 0.08, h: 0, d: 0.08, src: `${EDITOR} (a beam post, S0 section 3)` },
  beamLine: { w: 0.03, src: 'SN46' },
} as const;

/** Colours the editor draws devices in. */
export const DEVICE_COLOURS = { camera: '#343a40', reader: '#212529', pir: '#f1f3f5', beam: '#e03131', cone: '#1c7ed6', pirFan: '#7048e8' } as const;
