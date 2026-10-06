import { describe, expect, it } from 'vitest';
import { emptyTrainingStatus, stepDone, TrainingCourse, TRAINING_STEPS } from '../src/game/training';

describe('training course', () => {
  it('runs the verbs in order, each done once the game reports it', () => {
    const c = new TrainingCourse();
    const s = emptyTrainingStatus();
    expect(c.step?.id).toBe('move');
    expect(c.update(s)).toBeNull();
    s.moved = 5;
    expect(c.update(s)?.id).toBe('move');
    expect(c.step?.id).toBe('sneak');
    // counters are measured from the step's start
    s.takedowns = 1;
    while (c.step?.id !== 'takedown') c.skip(s);
    expect(c.update(s)).toBeNull();
    s.takedowns = 2;
    expect(c.update(s)?.id).toBe('takedown');
    expect(c.fraction).toBeGreaterThan(0.5);
  });
  it('every step has a hint for each input type; skipping ends the course', () => {
    for (const t of TRAINING_STEPS) expect(t.hint.pad && t.hint.kbm && t.hint.touch).toBeTruthy();
    const c = new TrainingCourse();
    for (let i = 0; i < TRAINING_STEPS.length; i++) c.skip(emptyTrainingStatus());
    expect(c.done).toBe(true);
    expect(c.step).toBeNull();
    expect(stepDone('mark', { ...emptyTrainingStatus(), marks: 2 }, emptyTrainingStatus())).toBe(true);
  });
});
