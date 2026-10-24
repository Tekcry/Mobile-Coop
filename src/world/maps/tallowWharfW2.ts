import { emptySection, type WharfSection } from './tallowWharfKit';

/**
 * Tallow Wharf section W2 (GB0 stub: GB2 takes this file over and fills it). Keep the export name and the `WharfSection`
 * shape; `entry` and `exit` are the no-bypass test's ends.
 */
export const W2: WharfSection = emptySection('W2', [42, 0, 55], [60, 8.4, 66]);
