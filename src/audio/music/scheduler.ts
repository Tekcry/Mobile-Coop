/**
 * Step clock for the sequencer: sixteenth-note steps with a lookahead, a tempo that can change or glide, and a
 * re-anchor for a tab that was backgrounded. Pure (no Web Audio): the engine feeds it `currentTime`.
 */
export class StepScheduler {
  /** Step index of the next step to schedule (0 = the start). */
  step = 0;
  /** Absolute time (s) of the next step. */
  nextTime = 0;
  bpm: number;
  private started = false;
  private rampTo = 0;
  private rampLeft = 0;
  private rampPerStep = 0;
  readonly stepsPerBeat: number;

  constructor(bpm = 120, stepsPerBeat = 4) {
    this.bpm = bpm;
    this.stepsPerBeat = stepsPerBeat;
  }

  get running(): boolean {
    return this.started;
  }

  stepDur(): number {
    return 60 / this.bpm / this.stepsPerBeat;
  }

  /** Start the grid: step 0 plays at `time`. */
  start(time: number, bpm = this.bpm): void {
    this.started = true;
    this.step = 0;
    this.nextTime = time;
    this.bpm = bpm;
    this.rampLeft = 0;
  }

  stop(): void {
    this.started = false;
    this.rampLeft = 0;
  }

  /** Change tempo for the steps not yet scheduled. */
  setTempo(bpm: number): void {
    this.bpm = bpm;
    this.rampLeft = 0;
  }

  /** Glide linearly to `bpm` over the next `steps` steps (a fall between states). */
  rampTempo(bpm: number, steps: number): void {
    if (steps <= 0) return this.setTempo(bpm);
    this.rampTo = bpm;
    this.rampLeft = steps;
    this.rampPerStep = (bpm - this.bpm) / steps;
  }

  /**
   * Schedule every step whose time is before `horizon`. `cb(step, time, dur)` is called once per step, in order.
   * If the clock has fallen behind `now` by more than `maxLate` (the tab was suspended), the grid jumps to `now`
   * instead of replaying what was missed; the step counter keeps counting so bar positions stay aligned to beats.
   */
  advance(now: number, horizon: number, cb: (step: number, time: number, dur: number) => void, maxLate = 0.25): number {
    if (!this.started) return 0;
    if (this.nextTime < now - maxLate) {
      const missed = Math.floor((now - this.nextTime) / this.stepDur());
      // keep the position inside the bar: skip whole bars of steps only
      const barSteps = this.stepsPerBeat * 4;
      const skipSteps = Math.ceil(missed / barSteps) * barSteps;
      this.step += skipSteps;
      this.nextTime += skipSteps * this.stepDur();
      // still behind (tempo ramps, very long gaps): land on now
      if (this.nextTime < now) this.nextTime = now;
    }
    let n = 0;
    while (this.nextTime < horizon) {
      const dur = this.stepDur();
      cb(this.step, this.nextTime, dur);
      this.nextTime += dur;
      this.step++;
      n++;
      if (this.rampLeft > 0) {
        this.bpm += this.rampPerStep;
        if (--this.rampLeft === 0) this.bpm = this.rampTo;
      }
    }
    return n;
  }
}
