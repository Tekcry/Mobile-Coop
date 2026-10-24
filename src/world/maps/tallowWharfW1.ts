import { emptySection, type WharfSection } from './tallowWharfKit';

/**
 * Tallow Wharf section W1 (GB0 stub: GB1 takes this file over and fills it). Keep the export name and the `WharfSection`
 * shape; `entry` and `exit` are the no-bypass test's ends.
 */
export const W1: WharfSection = emptySection('W1', [7, 0, 10], [38, 0, 60]);
