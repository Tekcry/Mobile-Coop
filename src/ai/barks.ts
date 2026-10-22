/**
 * Enemy callouts (pure): short lines shown near the speaker (no voice audio; a radio chirp plays for radio
 * lines). Lines rotate per speaker; a speaker waits `BARK.cooldown` between lines (urgent ones cut in sooner).
 */
export type BarkEvent =
  | 'suspicious'
  | 'investigate'
  | 'contact'
  | 'lost'
  | 'search'
  | 'body'
  | 'radioCheck'
  | 'radioOk'
  | 'missed'
  | 'dog'
  | 'blind'
  | 'grenade'
  | 'alarm'
  | 'clear'
  | 'callIn'
  | 'drone'
  // (guard-ai S2, design 10) the incident board's lines
  | 'ack'
  | 'checking'
  | 'lightOut'
  | 'standDown'
  | 'missing'
  // (guard-ai S3, design 5) a guard joining on a shout or a radio call
  | 'joining';

export const BARKS: Record<BarkEvent, readonly string[]> = {
  suspicious: ['Huh?', 'What was that?', 'Hello?', 'Something there...'],
  investigate: ['Checking it out.', 'Going to look.', 'I heard something.', 'Moving to check.'],
  contact: ['Contact!', 'There he is!', 'Intruder!', 'Hostile spotted!'],
  lost: ['Lost him!', "Where'd he go?", 'No visual!'],
  search: ['Spread out!', 'Search the area!', 'Find him!'],
  body: ['Man down!', 'Got a body here!', 'Someone took him out!'],
  radioCheck: ['Radio check.', 'All units, report.', 'Check in.'],
  radioOk: ['All clear.', 'Nothing here.', 'Clear.'],
  missed: ['No answer...', "He's not responding.", 'Unit, respond!'],
  dog: ['*growl*', '*bark bark*', '*snarl*'],
  blind: ["I can't see!", 'My eyes!'],
  grenade: ['Grenade!', 'Take cover!'],
  alarm: ['Raising the alarm!', 'Sound the alarm!'],
  clear: ['Must have been nothing.', 'Back to it.', 'All quiet.'],
  drone: ['Drone has him!', 'Eyes in the sky - contact!'],
  // (guard-ai S3) the spotter's section call, when it gets through ("Command" is the S6 alarm call)
  callIn: ['Control, contact. Moving on him.', 'Control, I have contact.', 'Control, contact, my position.'],
  ack: ['Copy.', 'Copy, holding.'],
  checking: ['Checking it out.'],
  lightOut: ["Light's gone. Taking a look."],
  standDown: ['Nothing here. Back to it.'],
  missing: ["He's not answering. Two of us, go."],
  joining: ['Copy, moving!', 'On my way!', 'Coming to you!'],
};

/** Radio lines (a chirp plays with them). */
export const RADIO_BARKS: ReadonlySet<BarkEvent> = new Set<BarkEvent>(['radioCheck', 'radioOk', 'missed', 'alarm', 'drone', 'search', 'callIn', 'ack', 'checking', 'lightOut', 'standDown', 'missing']);
/** Urgent lines cut through a speaker's cooldown. */
const URGENT: ReadonlySet<BarkEvent> = new Set<BarkEvent>(['contact', 'body', 'blind', 'grenade', 'alarm', 'callIn']);

export const BARK = {
  /** Seconds between one speaker's lines; on screen this long. */
  cooldown: 3.5,
  show: 2.2,
  /** At most this many lines on screen. */
  max: 4,
} as const;

/** Per-speaker line state. */
export class BarkVoice {
  private next = 0;
  private t = 0;
  private turn = 0;

  constructor(private seed: number) {
    this.turn = seed % 7;
  }

  /** Advance the voice clock. */
  tick(dt: number): void {
    this.t += dt;
  }

  /** The line for `ev` if this speaker may talk now (else null). */
  say(ev: BarkEvent): string | null {
    if (this.t < this.next && !URGENT.has(ev)) return null;
    const lines = BARKS[ev];
    const line = lines[(this.turn + this.seed) % lines.length]!;
    this.turn++;
    this.next = this.t + BARK.cooldown;
    return line;
  }
}
