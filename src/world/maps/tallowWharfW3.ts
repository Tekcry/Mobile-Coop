import { emptySection, type WharfSection } from './tallowWharfKit';

/**
 * Tallow Wharf section W3 (GB0 stub: GB3 takes this file over and fills it). Keep the export name and the `WharfSection`
 * shape; `entry` and `exit` are the no-bypass test's ends.
 */
export const W3: WharfSection = emptySection('W3', [100, 8.4, 70], [90, 0, 36]);
