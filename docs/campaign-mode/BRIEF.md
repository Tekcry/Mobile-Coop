# campaign-mode (J22) - BRIEF

Owner: Night Shift | Campaign Build. Status: current.

The job: the campaign's front door and its record. The co-op lobby enters the campaign (exactly two players, no bot),
the missions run in order (Marlow Yard prologue, then Mission 1 Tallow Wharf), the picked mission travels in the session,
both players read its briefing, the end shows a 0-100% rating, and the host's saved mission can be continued with any
partner. Scope: FOLDED-PLAN J22 (C S17: MF8-MF12) and ROADMAP Now row 18 (both on feature/menu). Plan: `PLAN.md`.

## Michael said (verbatim)
- G2 (2026-10-17): "2 player coop campaign only, unable to be completed solo."
- G48 (2026-10-17): "No bot anywhere"
- Q6 (2026-10-25 ~16:40, G371): "coop lobby. Marlow Yard is mission 1, which is training"
- G146 (2026-10-18): "No kills + no alarms + all primary objectives."
- G147 (2026-10-18): "Any partner can join"
- G126 (2026-10-18): "30-second revive, 2 per mission"
- G138 (2026-10-18): "Both players must reach the exit"
- G416 (2026-10-26): "why are you hiding all new features until switched on? i trial them all in the preview server"
- G422 (2026-10-26): "definitely keep in mind that this is all a prototype, and cannot get bogged down with fine tuning
  or re-running tests constantly."

## Michael picked (option text)
- Q6 follow-up, asked whether Tallow Wharf becomes Mission 2: "Tallow stays Mission 1" (option: Marlow Yard is a
  Mission 0 / prologue before it) (G371).
- Q19 campaign rewards: "None (Recommended)" (option: "None; optional objectives only raise the rating, as CT") (G384).
- Mission 1 (2026-10-25 ~10:45): "Tallow Wharf" (G340).
- G416 preview: "All on in preview".

## Settled elsewhere (read, not re-decided here)
- Design bible 5.8 "Campaign progress": the lobby lists every mission; finishing one records it with its rating for both
  players; a mission beyond your own progress shows "Story spoilers ahead"; saved per player, per mission: completed,
  best rating, intel found; the main menu shows Continue. "Results": 0-100%, each category shown.
- Already on master from J7 (mission-rules R2 / R4 / R5): `src/game/mission/campaign.ts` (exactly-two start block, the
  campaign room of 2, revives 2 per mission, no grants), `NetSession.campaign` / `campaignBlock` and the resumed
  campaign host's wait for its partner (`src/net/session.ts`, `src/net/coopUi.ts`).
- MF8 (the lobby's "Campaign" label opens Marlow Yard) is no longer a break: G371 makes Marlow Yard the campaign's
  prologue. J22 keeps the label and adds Mission 1 beside the prologue.

## Assumed (A1..; each with its undo)
- A1 Mission 1 lists both Tallow Wharf missions, in this order: "Mission 1: Three Grey Coats" then "Mission 1: Two-Key
  Ledger" (Two-Key Ledger starts at W2). Each has its own record and save. Undo: rename the second to Mission 2 (one
  line in the campaign order table), or drop it from the list. Asked as Q1 (`PLAN.md` 9).
- A2 The lobby keeps the two modes it shows today, Campaign and Sector Ops. Campaign gets a Mission row: Prologue
  (Marlow Yard, training) and the Mission 1 entries. No separate "Marlow Yard (training)" mode. Undo: add it as a third
  mode row entry that maps to the prologue.
- A3 Nothing is locked: every entry can be picked; an entry past the host's own progress shows "Story spoilers ahead"
  (bible 5.8). Undo: lock entries past the host's progress.
- A4 The briefing is shown in the lobby, to both players, in the context panel of the picked entry: the mission's
  briefing lines, its rules line, "Needs exactly two players" and the difficulty. No extra screen between Start and
  play. Undo: push the existing `BriefingScreen` on both peers at start, Start on the host.
- A5 Rating, starting values (G422; Michael tunes after he plays): 100 minus 10 per kill and 15 per alarm, plus 5 per
  optional objective done, clamped 0-100; any kill or alarm caps it at 99, so 100% is exactly G146. Knock-outs are not
  kills (the section-rating default). Times spotted and bodies found are shown, not scored. Undo: change the numbers in one pure
  function and its test.
- A6 The prologue has no percentage: Marlow Yard is training (G370); finishing it records "Completed". Undo: rate it
  with A5's formula from the course tallies.
- A7 The save is one slot per host: the mission in progress, written at each section's begin (the section checkpoint a
  section restart already reloads to), cleared on the mission's end or when the host starts another entry. It holds
  the mission, difficulty, section, steps and facts done, revives used, rule breaks and the rating tallies. Guards,
  bodies and doors need no saving: a section restart rebuilds the section from its start. Undo: one slot per mission.
- A8 The campaign records are two new keys in the existing IndexedDB `kv` store (`campaign:progress`, `campaign:save`),
  each with its own `v` and a sanitiser, as `sector:ops`, `course:fallow` and `rating:sections` do: the profile shape
  (`SaveData`) does not change, so `SAVE_VERSION` stays. Undo: move them into `SaveData` with a `SAVE_VERSION` bump and
  a migration test on a literal old save.
- A9 Continue: the lobby's Mission row offers "Continue: <mission>, <section>" when the host has a save; the main menu's
  Co-op entry gets a "Continue campaign" item (hidden with no save) that hosts a room with the save picked. The saved
  difficulty is locked for a Continue. Any partner joins by the code (G147); the start waits for exactly two (G2).
- A10 Everything ships dark behind a new flag `campaign` (`?campaign=1`, owner Campaign Build, switch-on at Michael's
  walk of Mission 1); on /preview/ it is on (G416). The Mission 1 entries also need `flags.missions` and the Tallow map
  (PR #583); without them the list shows the prologue only. Flag off: the lobby is as today.
- A11 The 10-minute "Resume hosting" record (tab storage, not a save) also carries the campaign mission, and a Sector Ops
  match resumes at its current section (today it restarts at section 1). Undo: drop the field; resume from the start.
