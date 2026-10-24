/**
 * (mission NET) The co-op client's copy of the host's mission (PLAN section 3: host-authoritative). Each `sector` message's
 * `ms` (`missionWire.ts`) is applied to a `MissionRunner` built from the map's own missions by `ms.id`; the client never
 * evaluates steps or rules. The rule-break line `rl`: the host already sends it as a radio line (`radioLine`, a `feed`
 * event) the moment a rule breaks, so the client never barks it again; only a late joiner, whose first `ms` already has
 * breaks (`rb` > 0), gets the last line shown once (its feed). Pure (no net imports beyond types).
 */
import { MissionRunner } from '../game/mission/missionRunner';
import { applyMissionWire, type MissionWire } from '../game/mission/missionWire';
import type { MissionDef } from '../game/mission/missionDef';

/** The co-op sector modes take two players (P1 host, P2 client). */
const COOP_PLAYERS = 2;

export class MissionMirror {
  /** The applied mission (null: none running, or not one of this map's). */
  runner: MissionRunner | null = null;
  /** The host's rule-break counter as last seen (-1: no `ms` yet) and its last line. */
  rb = -1;
  line = '';
  /** Rules kept per scope ([mission, a, b] bits), as last seen. */
  readonly kept = [0, 0, 0];

  /**
   * Apply one `ms` (from the map's `missions`). Returns the line to show now (a late joiner's first `ms` with breaks),
   * else null.
   */
  take(missions: readonly MissionDef[] | undefined, w: MissionWire): string | null {
    if (!this.runner || this.runner.def.id !== w.id) {
      const def = missions?.find((m) => m.id === w.id) ?? null;
      this.runner = def ? new MissionRunner(def, COOP_PLAYERS) : null;
      this.rb = -1;
      this.line = '';
    }
    if (!this.runner) return null;
    applyMissionWire(this.runner, w);
    for (let i = 0; i < 3; i++) this.kept[i] = w.rk[i] ?? 0;
    const first = this.rb < 0;
    const moved = w.rb !== this.rb;
    this.rb = w.rb;
    if (moved) this.line = w.rl;
    return first && moved && w.rb > 0 && w.rl !== '' ? w.rl : null;
  }
}
