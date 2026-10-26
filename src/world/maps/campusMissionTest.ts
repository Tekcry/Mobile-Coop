import type { MissionDef } from '../../game/mission/missionDef';

/**
 * (mission-framework EN2) The engine's test mission on Saltmarsh Park's sections 1-2 (`?autostart=campusOps&mode=sector&
 * mission=campusMissionTest`): not a designed mission (the Split Shift / Code Relay specs are), only the smallest one
 * that runs every EN2 path on real sector data. Three steps for every team (all shared): copy the courier badge (intel,
 * S1's download), use it on the facilities terminal (the exploit, S2's hack), out over the glazed bridge (the
 * extraction: everyone in C2). One rule, No kills (a knock-out is not a kill), so a kill restarts the section. Tracks
 * split S2 by its floors (team A upstairs, B the ground floor and S1) for the per-area alarm stages and the height band.
 * Step events name the posted guards' posts for Guard AI's walk-to hooks: `c1-door` (S1 #5) and `c2-door` (S2 #11).
 */
export const CAMPUS_MISSION_TEST: MissionDef = {
  id: 'campusMissionTest',
  mode: 'sector',
  players: [1, 2, 3, 4],
  sections: ['s1', 's2'],
  briefing: [
    'Test op on the gatehouse and the HQ: a courier badge copied at the gatehouse opens the facilities office.',
    'Out over the glazed bridge to the lab block.',
  ],
  steps: [
    {
      id: 'badge',
      section: 's1',
      team: 'all',
      kind: 'intel',
      text: 'Copy the courier badge at the gatehouse PC, through the rear window',
      hint: 'The verge east of the gatehouse is dark; the rear window is open.',
      gives: 'courierBadge',
      done: { flag: 's1-obj' },
      events: [{ name: 'badgeCopied', guardTag: 'c1', postId: 'c1-door' }],
    },
    {
      id: 'bms',
      section: 's2',
      team: 'all',
      kind: 'exploit',
      text: 'Badge into the facilities office, first floor, and hack the BMS terminal',
      hint: 'The facilities office is at the north-east corner of the first floor.',
      needs: 'courierBadge',
      done: { flag: 's2-obj' },
      events: [{ name: 'bmsHacked', guardTag: 'c2', postId: 'c2-door', via: 'c2' }],
    },
    {
      id: 'out',
      section: 's2',
      team: 'all',
      kind: 'extract',
      text: 'Out over the glazed bridge to the lab block',
    },
  ],
  rules: [{ kind: 'noKills', scope: 'mission', text: 'Nobody dies tonight: knock them out, never kill.' }],
  tracks: [
    { team: 'a', zones: ['l1-balcony', 'l2-balcony', 'kitchen', 'facilities', 'comms', 'l2-stairs', 'l2-lift', 'c2'], boxes: [[-46, -33, 9, 8]], y: [3, 14] },
    { team: 'b', zones: ['gatehouse', 'carpark', 'c1', 'smoking', 'perimeter', 'dock', 'reception', 'lobby', 'goods'], boxes: [[-42, -82, 30, -33], [-46, -33, 9, 8]], y: [-2, 3] },
  ],
};
