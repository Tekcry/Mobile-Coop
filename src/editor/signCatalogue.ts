/**
 * ON14: the sign catalogue (Y > Objects > Signs): wayfinding signs (text from the site's own names, an arrow) and the
 * fixed safety presets, each with its size, colours, how it mounts and its source. Data only, no Babylon. Sign text is
 * in-world text: British spelling, the site's names (docs/story.md section 2), no real brands.
 */
import facts from '../../scripts/kestrel/facts.json';

export type SignGroup = 'way' | 'safety';
export type SignMount = 'wall' | 'hang' | 'both';
export type Arrow = 'none' | 'left' | 'right' | 'up' | 'down' | 'ahead';

export interface SignKind {
  id: string;
  name: string;
  group: SignGroup;
  /** Panel and text colours (the walk test draws the panel colour only). */
  bg: string;
  fg: string;
  /** Face size, metres. */
  w: number;
  h: number;
  mount: SignMount;
  /** The text a new sign of this kind starts with; a safety preset's text is fixed. */
  text: string;
  arrow: Arrow;
  src: string;
}

const TYP = 'editor default: typical product';

/** The kinds, wayfinding first (decision 6). */
export const SIGN_KINDS: readonly SignKind[] = [
  { id: 'direction', name: 'Direction sign', group: 'way', bg: '#1f3a5f', fg: '#ffffff', w: 0.9, h: 0.2, mount: 'both', text: 'Reception', arrow: 'right', src: `${TYP} (a 900 x 200 mm corridor direction sign, wall or hung)` },
  { id: 'room-sign', name: 'Room sign', group: 'way', bg: '#1f3a5f', fg: '#ffffff', w: 0.45, h: 0.15, mount: 'both', text: 'Data Hall', arrow: 'none', src: `${TYP} (a 450 x 150 mm room or area sign)` },
  { id: 'exit', name: 'Fire exit sign', group: 'way', bg: '#1b8a3a', fg: '#ffffff', w: 0.4, h: 0.2, mount: 'both', text: 'Fire exit', arrow: 'ahead', src: `${TYP} (a 400 x 200 mm green running-man sign, BS EN ISO 7010 E001; general knowledge)` },
  { id: 'extinguisher', name: 'Fire extinguisher', group: 'safety', bg: '#c62828', fg: '#ffffff', w: 0.2, h: 0.3, mount: 'wall', text: 'Fire extinguisher', arrow: 'none', src: `${TYP} (a 200 x 300 mm red fire equipment sign, ISO 7010 F001; general knowledge)` },
  { id: 'first-aid', name: 'First aid', group: 'safety', bg: '#1b8a3a', fg: '#ffffff', w: 0.2, h: 0.2, mount: 'wall', text: 'First aid', arrow: 'none', src: `${TYP} (a 200 x 200 mm green first aid sign, ISO 7010 E003; general knowledge)` },
  { id: 'high-voltage', name: 'High voltage', group: 'safety', bg: '#f5c400', fg: '#111111', w: 0.3, h: 0.2, mount: 'wall', text: 'Danger: high voltage', arrow: 'none', src: `${TYP} (a 300 x 200 mm yellow warning sign, ISO 7010 W012; general knowledge)` },
  { id: 'gas-suppression', name: 'Gas suppression warning', group: 'safety', bg: '#f5c400', fg: '#111111', w: 0.3, h: 0.3, mount: 'wall', text: 'Gas suppression system: leave when the alarm sounds', arrow: 'none', src: `${TYP} (a 300 x 300 mm warning sign at a protected room's door; general knowledge)` },
  { id: 'no-entry', name: 'No entry', group: 'safety', bg: '#c62828', fg: '#ffffff', w: 0.3, h: 0.2, mount: 'wall', text: 'No entry', arrow: 'none', src: `${TYP} (a 300 x 200 mm prohibition sign; general knowledge)` },
  { id: 'authorised', name: 'Authorised only', group: 'safety', bg: '#c62828', fg: '#ffffff', w: 0.3, h: 0.2, mount: 'wall', text: 'Authorised personnel only', arrow: 'none', src: `${TYP} (a 300 x 200 mm prohibition sign; general knowledge)` },
  { id: 'cctv', name: 'CCTV in operation', group: 'safety', bg: '#f5c400', fg: '#111111', w: 0.3, h: 0.4, mount: 'wall', text: 'CCTV in operation - Ostler Colocation', arrow: 'none', src: `${TYP} (a 300 x 400 mm yellow CCTV sign naming the operator, as UK guidance asks; general knowledge)` },
];

/** A door name plate (decision 5): its face size and colours (the access level colour is the band, securityCatalogue.ts). */
export const PLATE = { w: 0.3, h: 0.1, fg: '#111111', src: `${TYP} (a 300 x 100 mm door name plate)` } as const;

export const ARROWS: readonly Arrow[] = ['none', 'left', 'right', 'ahead', 'up', 'down'];
export const ARROW_WORDS: Record<Arrow, string> = { none: 'None', left: 'Left', right: 'Right', ahead: 'Ahead', up: 'Up (stairs)', down: 'Down (stairs)' };
const GLYPH: Record<Arrow, string> = { none: '', left: '←', right: '→', ahead: '↑', up: '↗', down: '↘' };

/** The words on the face with the arrow on the side it points (UK practice: left arrows lead, the others follow right). */
export function signFace(text: string, arrow: Arrow): string {
  const g = GLYPH[arrow];
  if (!g) return text;
  return arrow === 'left' || arrow === 'ahead' ? `${g} ${text}` : `${text} ${g}`;
}

export const signKind = (id: string): SignKind => SIGN_KINDS.find((k) => k.id === id) ?? SIGN_KINDS[0]!;
export const isWayfinding = (id: string): boolean => signKind(id).group === 'way';

/** Sign placing facts (scripts/kestrel/facts.json `sign`). */
export const SIGN_F = facts.sign;
