import { emptySection, type WharfSection } from './tallowWharfKit';

/**
 * Tallow Wharf section W4 (GB0 stub: GB4 takes this file over and fills it). Keep the export name and the `WharfSection`
 * shape; `entry` and `exit` are the no-bypass test's ends.
 */
export const W4: WharfSection = emptySection('W4', [90, 0, 32], [90, -1, 3]);
