/** One numbered step of a Marlow bay (J14). Retry = back to `marks`, only this station's guards / gates / flags reset. */
export interface StationDef {
  n: number;                       // 1-18, the badge number (REPLAN, STATIONS.md)
  id: string;                      // 'a2-plank'
  lesson: string;                  // move or skill taught, the graph's teach id ('plank_bridge')
  marks: readonly [{ x: number; z: number; y: number; yaw: number }, { x: number; z: number; y: number; yaw: number }];
  retry: 'none' | 'station' | 'caught'; // none: nothing can fail; station: spotted / drill = retry (A1-A7); caught: A8 (A14)
  drillS?: number;                 // the graph's drill_s: the timed window that fails into a retry
  guards: readonly string[];       // squad ids reset by a retry (A17)
  gates: readonly string[];        // gate / device ids reset by a retry
  doneFlag: string;                // the flag that ends the station (the next one starts)
  kit?: 'deadweight' | 'dropCatch' | 'chimneyPair' | 'swingPass' | 'plankBridge'; // kitMoves id; stand-in while off (A18)
  standIn?: string;                // the gate the host opens when `kit` is off on the host
}
