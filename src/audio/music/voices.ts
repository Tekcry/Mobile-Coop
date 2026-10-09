/**
 * Voice cap (direction 11.6): at most `cap` sources sounding at the same time. Counting is by scheduled time, so it works
 * for events scheduled ahead and for an offline render alike. When full, the new voice either steals the oldest voice of
 * the lowest priority (if that is not more important than the newcomer) or is refused.
 */
export const PRIO = { tex: 0, metal: 1, harm: 2, motif: 3, drum: 4, bass: 5, stinger: 6, bed: 7 } as const;

export interface Voice {
  prio: number;
  start: number;
  /** Scheduled end (s); Infinity for a sustained layer until it is stopped. */
  end: number;
  /** Cut this voice at time t (a steal). */
  cut?: (t: number) => void;
}

export class VoicePool {
  private voices: Voice[] = [];
  /** The most voices ever sounding at once, by scheduled time. */
  peak = 0;
  /** Voices refused because the pool was full of more important ones. */
  refused = 0;
  /** Voices stolen. */
  stolen = 0;

  constructor(readonly cap = 24) {}

  /** Voices sounding at time t. */
  active(t: number): number {
    let n = 0;
    for (const v of this.voices) if (v.start <= t && v.end > t) n++;
    return n;
  }

  /** Try to start a voice. Returns it, or null when refused. */
  begin(prio: number, start: number, end: number, cut?: (t: number) => void): Voice | null {
    // forget voices that ended well before this one starts
    if (this.voices.length > 64) this.voices = this.voices.filter((v) => v.end > start - 8);
    let n = 0;
    let victim: Voice | null = null;
    for (const v of this.voices) {
      if (v.start <= start && v.end > start) {
        n++;
        // steal order: lowest priority first, then the oldest
        if (!victim || v.prio < victim.prio || (v.prio === victim.prio && v.start < victim.start)) victim = v;
      }
    }
    if (n >= this.cap) {
      if (!victim || victim.prio > prio) {
        this.refused++;
        return null;
      }
      victim.cut?.(start);
      victim.end = start;
      this.stolen++;
      n--;
    }
    const v: Voice = { prio, start, end, cut };
    this.voices.push(v);
    if (n + 1 > this.peak) this.peak = n + 1;
    return v;
  }

  /** End a sustained voice at time t. */
  finish(v: Voice, t: number): void {
    if (t < v.end) v.end = t;
  }

  clear(): void {
    this.voices = [];
  }
}
