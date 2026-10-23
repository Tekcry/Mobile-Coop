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
  | 'joining'
  // (guard-ai S4, design 4 / 10) bodies: waking a knocked-out squadmate, the reports
  | 'koFound'
  | 'koReport'
  | 'deadReport'
  // (guard-ai S6, design 7) the command call: the alarm by radio
  | 'command'
  // (guard-ai S8, design 8) squad tactics: the point bounds, the overwatch covers it, the flanker goes round
  | 'moving'
  | 'covering'
  | 'flanking';

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
  koFound: ['Hey. Hey! Wake up.'],
  koReport: ["Found him out cold. He's okay, checking around."],
  deadReport: ['Man down. Stay sharp.', 'We lost one. Stay sharp.'],
  command: ['Command, contact. Send backup.', 'Command, we have an intruder. Requesting backup.'],
  moving: ['Moving up!', 'Moving!', 'Cover me!'],
  covering: ['Covering!', 'Got you covered!', 'Go, go!'],
  flanking: ['Flanking!', 'Going round!', 'Taking the side!'],
};

/** Radio lines (a chirp plays with them). */
export const RADIO_BARKS: ReadonlySet<BarkEvent> = new Set<BarkEvent>(['radioCheck', 'radioOk', 'missed', 'alarm', 'drone', 'search', 'callIn', 'ack', 'checking', 'lightOut', 'standDown', 'missing', 'koReport', 'deadReport', 'command']);
/** Urgent lines cut through a speaker's cooldown. */
const URGENT: ReadonlySet<BarkEvent> = new Set<BarkEvent>(['contact', 'body', 'blind', 'grenade', 'alarm', 'callIn', 'koFound', 'koReport', 'deadReport', 'command']);

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

/**
 * (guard-ai S7, design 10 `camBody`) The security desk's radio line when a camera sees a downed guard: the camera's
 * label ("Camera 2"), the room it is in (`RoomRect.name`; '' drops it), and who should go (one for a knocked-out guard,
 * two for a dead one). Original text, under 90 characters with a short room name, written to be voiced later (G82).
 */
export function camBodyLine(camera: string, room: string, lethal: boolean): string {
  const where = room ? `, ${room}` : '';
  return lethal ? `${camera} has a man down${where}. He's not moving. Two of you, go.` : `${camera} has a man down${where}. Nearest unit, check on him.`;
}
