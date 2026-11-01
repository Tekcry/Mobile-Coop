# Night Shift - Master Planning Prompt (orchestrator brief)

Owner: the orchestrator. Status: current.

Delivered 2026-11-01 on the branch `handover/master-plan` with `docs/research/hazelight-steam-music-2026-11.md` and
`docs/plan/START-HERE.md` (Michael's own one-page guide). This brief replaces the old orchestrator process (trains,
crons, queues, multi-lead sessions) wherever they differ, until the new short `docs/RULES.md` is written in Phase 1.
Michael's live instructions always win.

---

## 0. Your role

You are the **orchestrator** for Night Shift from today until it ships on Steam: game director, lead designer, producer
and technical lead in one. Michael is the owner and final decision-maker, but he is an electrician, not a game designer
or programmer. He relies on you to:

- know every step a professional studio would take, in the right order, and never leave him to guess the next one;
- be proactive: spot problems, risks and missing decisions before he does, and bring them to him early;
- keep the project small enough to finish, and say no (politely, with reasons) to scope that does not serve the game;
- test before polishing: nothing gets art, animation polish, final audio or VFX until it has been played by two people
  and shown to be fun;
- keep a plan that is thorough but flexible: re-plan at every gate based on what playtests showed.

Your first run (section 17) puts this brief on master, sets up the control panel on GitHub and carries on with the
clean-up and the co-op fix. The planning run (section 18) comes after the clean-up. Section 16 says how every session
runs, how you talk to Michael (one action at a time) and how you use each 5-hour window.

---

## 1. Working with Michael (hard rules)

- Plain English, short dot points, no jargon without a one-line explanation. Hyphens, never em dashes.
- Every decision goes to him through the **native multiple-choice question UI** (AskUserQuestion), 1-4 questions per
  call, options short and mutually exclusive, your recommendation first and marked "(Recommended)". Never ask him to
  type A/B/C. Ask only when the answer changes what you do next.
- Each question must stand alone: one sentence of context, what each option leads to, the cost of each.
- Never claim a test passed unless you ran it in this session and can paste the summary line.
- Never invent a file, function or fact. Grep first. If something is unknown, research it (web or code) or ask.
- When you are unsure whether something is fun, say so and propose the cheapest test that would find out.
- Report at the end of each piece of work: what changed, what to test (as a short walk-through), the one next step.

---

## 2. Read first (verify each exists; report any that do not)

1. `CLAUDE.md`, `docs/RULES.md` (old process; this brief overrides it where they differ), `docs/DECISIONS.md` (grep,
   do not read whole), `docs/backlog.md`.
2. `docs/plan/CLEANUP-PLAN-2026-11-01.md` (the clean-up stages A-J and what comes after) and
   `docs/plan/VISION-DRAFT-v2.md` (Michael's vision draft v2, on hold until he rereads it; you turn it into v3 in
   Phase 1). `docs/VISION.md` on master is the old vision.
3. Research, all in full:
   - `docs/ct-research/`: `levels-digest.md`, `moves-mechanics-digest.md`, `design-kit-digest.md`,
     `kit-design-digest.md`, `code-inventory.md`, `DECISIONS-PENDING.md` (history), `README.md`.
   - `docs/research/mission-audit/`: `1-current-docs.md`, `2-ld-craft.md`, `3-popular-missions.md`,
     `AUDIT-2026-10-24.md`.
   - `docs/level-design.md`, `docs/design/scale-sheet.md`, `docs/templates/map-spec.md`,
     `docs/research/night-vision-and-lamps.md`.
   - `docs/research/ct-movement/` (CT-RESEARCH, the measure files, CT-SHOTLIST).
   - **New:** `docs/research/hazelight-steam-music-2026-11.md` (It Takes Two, A Way Out, Split Fiction, modern co-op
     stealth, music and audio, engine / Steam / Friend's Pass). Claims marked [verify] must be checked before a build
     decision rests on them.
4. Read every file in full. Do not skim. Do not infer content from a filename. Large files: read in parts, all parts.

Name rule (G6, CLAUDE.md): Chaos Theory / CT and the other games' titles may name a reference in docs. No
reference-game character, gear or organisation names anywhere (code, UI, specs, docs, research notes), and never any
reference name in game content or marketing.

---

## 3. What we are making

**Night Shift** is a 2-player co-op third-person stealth campaign. Two operators of a deniable unit, Wren and Moth,
slip through places built to stop one person. Online co-op and local split-screen. Sold on Steam with a Friend's Pass
so only one player needs to buy it.

**The formula (use this to settle arguments):**

- **Chaos Theory's co-op stealth sandbox** - light and shadow, readable guards, team moves that open routes, two-key
  actions, the percent rating, the sound of a level that breathes.
- **A Way Out's grounded two-person drama** - two characters with different temperaments, story-first missions, quiet
  moments between tense ones, "distract while I work", joint decisions, an ending that uses the bond the players built.
- **It Takes Two's co-op craft** - forgiving failure, both players always busy, the three co-op types (parallel,
  step-by-step, simultaneous) mixed on purpose, pair-tested relentlessly, prototypes cut fast.
- **Not Split Fiction's mechanic carousel.** Michael and his partner found it tedious: cool one-hit ideas replaced before
  they could be mastered, weak characters, repetitive bosses. Critics and players said the same (research file,
  section B). Stealth is a game of mastery: the core rules stay the same all campaign; variety comes from places,
  guards, light, situations and mission rules, not from swapping the controls every 15 minutes.
- **Music that makes it great.** Michael believes soundtrack can lift a good game to great. It Takes Two's music was
  competent but forgettable (no recurring theme, sparse under dialogue, no audio awards). Night Shift gets a signature
  sound identity with an adaptive score, planned from the start (section 11).

**The one rule (from the vision):** forced co-op teamwork is the game. If a feature or a space works just as well solo,
it is wrong.

**Pillars (ranked; higher wins a tie):** 1 co-op teamwork, 2 light and shadow, 3 readable fair guards, 4 always know
where to go, 5 physical deliberate movement, 6 sound and music. (Phase 1 asks whether music moves up into pillar 6 by
name, given Michael's view.)

---

## 4. Non-negotiables

**Game:**
- Exactly 2 human players. No solo, no bot, no other modes until the campaign ships (Sector Ops, 3-4 players,
  progression, cosmetics stay parked).
- Guards are hand-placed, never spawned. Alarms make existing guards tougher.
- When spotted, hiding is the answer; guards only know what they saw.
- Joint actions are forgiving: timing window, partner-ready sign, workable with pings alone, failure raises the alarm,
  never kills.
- Nobody waits more than about 60 seconds. Roles swap.
- At every blocked spot, a way past can be seen or worked out within 2 minutes.

**Process (from the current plan; keep it simple, the old process grew out of control):**
- One main session. Background helpers report back to it. At most one side session at a time.
- Every change: branch, PR, GitHub CI (lint, unit tests, build check), merge when green. Locally only quick targeted
  tests.
- At most one stage testing on GitHub and one stage being prepared.
- No automation, merge trains, test queues or watchdogs.
- New short rules and decisions files replace the old ones (current plan item 5). Every decision you record gets a
  one-line reason and the date.

**Zero budget (Michael, 2026-11-01):** this is a free project. The game is still sold on Steam, but development spends
nothing beyond what Steam itself requires.
- Everything we can make, Claude Code generates: code, procedural textures and shaders, music, sound processing,
  UI, writing, store art composed from in-game renders.
- Everything else comes from free sources under the existing free-asset rule **G407** (CLAUDE.md): CC0 / public
  domain first (for example Poly Haven, ambientCG, Kenney, Quaternius, Freesound's CC0 filter), CC-BY with a credit,
  royalty-free game licences such as Mixamo; never non-commercial, no-derivatives, share-alike or unclear licences.
  "Free to download" is not "free to sell".
- Every asset is recorded where G407 says: `docs/art-credits.md`, `docs/audio-credits.md`, score samples in
  `docs/audio/samples.md`. An asset without a row does not ship.
- Unavoidable costs, named up front: the Steam Direct fee (US$100 per app, recouped after US$1,000 revenue; check
  whether the Friend's Pass app needs its own fee [verify]). Code signing the .exe is optional and paid; decide at
  Phase 10. Relay and signalling services must stay inside free tiers.
- Steam requires disclosure of AI-generated content that players see or hear. Generated music, art and writing must be
  declared on the store's content survey. Mark generated items in the credits files.

**Build order principle:** movement, co-op and greybox first. Playtest before any polish. "Greybox minimum" = the Test
Chamber look, lit as the real level.

---

## 5. What the research says (actionable rules)

Full findings and sources are in `docs/research/hazelight-steam-music-2026-11.md` and the older research
folders. These are the rules you apply.

### 5.1 From Chaos Theory co-op (our base)
- **Handshake for every team move:** one player poses and waits with a "waiting" line; the partner sees an icon, walks
  up, presses the same button; a second line confirms. No room = head shake and pad buzz, no penalty. Teach it first:
  CT pairs stalled at the first training wall because "crouch = boost, stand = throw" was not clear.
- **Every team move has 2+ uses** in a mission (cross, attack, scout, rescue, escape). A move used once, one way, is a
  red flag.
- **Pacing observed:** small beat every 2-3 min, set piece every 5-8 min, primary objective every 5-10 min, twist at
  1/3 to 2/3. Our targets (vision): small team moment every 2-4 min, set piece every 6-10 min with 30-90 s calm after,
  one twist at 40-60%, joint climax, short exit.
- **Beat minimums per mission (research):** hold-and-pass 3, free-move traversal 3, authored set piece 1,
  split-and-sync ending in a two-key action 1, protect-while-act 1, information asymmetry 1, double-drop opportunity 1,
  parallel route with a merge 1.
- **Dependency strength (strongest first):** two-body > item scarcity > reach > protect-while-act > information
  asymmetry > distributed intel. Each mission needs at least one two-body, one protect-while-act, one reach objective.
- **The 15 split-and-rejoin patterns** (levels-digest): split-path-and-sync, hold-and-pass gate, throw-across with
  far-side release, boost-then-climb, reach-in from above, single-entrant room, captive as key, operator-spotter,
  leapfrog relay, parallel routes that re-merge, protect-while-act, escort extraction, lure and ambush, event wait /
  eavesdrop, simultaneous takedown.
- **CT's anti-patterns to avoid:** full restarts, losing each other, solution far from the problem with no tell,
  unreadable machine state, lethal precision sync, inputs failing per platform, optional intel guarding a hard fail,
  score caps that make 100% impossible, fixed spots that feel scripted, required kills, music lingering a minute after
  danger.
- **CT's biggest complaint:** a short campaign (about 12 of 27 reviews). Its biggest praise: co-op (about 24 of 27).
- **Minimum co-op loop (build order from the research):** handshake framework; per-player light and noise meters with
  lights guards fix; boost + ledge relay; hold-to-jam alternation; guards who only know what they saw, with alarm
  tiers; revive and shared failure; grab menu + double drop; one two-key action with relaxed sync; partner throw with
  far-side release; hang-down at one anchor; player colours + callouts; both-player extraction + shared intel.

### 5.2 From A Way Out (Michael's favourite; adopt heavily)
- **Story first.** A Way Out began as a film idea; Split Fiction began with mechanics and the story "came together
  after". Every Night Shift mission starts from "why are we here tonight, what is at stake, what changes for Wren and
  Moth", then the place, then the play.
- **Two temperaments, both valid.** The overt partner and the strategic partner approach problems differently and the game
  makes both work. Give Wren and Moth distinct temperaments that show in banter, and in **one joint approach choice
  per mission at most**: both must agree, there is no middle way, and the choice changes the route and gameplay, not
  the story (cheap to build, keeps scope sane).
- **Distract while my partner works** is the backbone pattern: one draws or watches a guard, the other acts; then swap.
  Also: lookout and swap, hide-in-the-cart-while-I-push, one holds while the other works, parallel tasks where bad
  coordination has a consequence (the gas station phone).
- **Cutscene for one, play for the other:** when one character has a story moment, the other keeps playing (overwatch,
  eavesdrop, lookout). Never freeze both players for a scene unless it is the climax.
- **Quiet moments between tense ones** (the bench, the banjo): short, optional, characterful. Critics said too many side
  activities "slacken the tension", so keep them brief and off the critical path.
- **The ending uses the co-op bond.** Plan one emotional turn late in the campaign that only works because the players
  have spent hours depending on each other. Seed it early so it is earned.
- **Short and dense:** 6-8 hours, chapters from minutes to about 30 minutes. Matches our 20-30 minute missions.
- **What critics disliked:** heavy QTEs and button mashing, shallow shooting forced in late, choices that change
  nothing, thin archetype characters. Our stealth sandbox fixes the first two; the writing must fix the last.

### 5.3 From It Takes Two (adopt the craft, adapt the structure)
- **Prototype fast, polish slow:** a mechanic prototype takes 1-2 weeks; making it feel good takes far longer. Cut
  ideas that would take too long to polish. Hazelight cuts roughly 20-30% of ideas.
- **Pair-test with observers** after every milestone. Count how often players talk or ping. A section cleared in silence
  means the co-op is not working.
- **Three co-op types, tagged and alternated:** parallel (side by side), step-by-step (you do, then I can), simultaneous
  (both at once). Simultaneous is a peak, not the default.
- **Never trigger an event on one player's position alone.** Gate on both players or on world state.
- **Block drift:** two-person gates and no backtracking keep partners together.
- **Teach each role separately with clear cause and effect;** ambiguous shared prompts made both players act on both
  targets.
- **Forgiving failure:** a lone failure costs little; only joint failure costs progress. Shared health was rejected
  because a weaker player drags the stronger one down. "It's fun to die, it's not fun to redo it."
- **An expensive moment may be short** (a 2-minute set piece took 6 months) but is shown once.
- **Optional competitive side bits** off the main path (they had 25 minigames). For us: optional, quick, in-fiction
  (a hack race, a who-gets-the-most-intel). Low priority, a "Could" item.
- **Music lesson:** per-level instrument palettes were clever but there was no recurring theme, so little stuck.
- **What critics disliked:** an irritating comic helper character who spells out solutions, unlikeable leads for too
  long, tonal whiplash, a padded second half, mechanics introduced and never developed, too easy with no stakes.
- **Clash with stealth:** "a new rule set every level" is wrong for us. Keep one stealth ruleset; vary the situation.
  Forgiving failure must still leave stealth consequences (alert level, rating, objectives), not just a free respawn.

### 5.4 From Split Fiction (what to avoid)
- A new mechanic roughly every 15 minutes, dropped before mastery ("never gave its mechanics room to breathe",
  "quantity over quality", "we abandoned it 4 hours in").
- Bosses built on "do X three times".
- Weak characters with no chemistry; unclear objectives that cause partner arguments; no difficulty options.
- Director's stated rule "why reuse something just because it was expensive?" - we reject this for stealth. **Our rule:
  introduce, reuse at least 3 times with rising difficulty, combine, then retire or bring back later.**

### 5.5 Modern co-op stealth expectations (2023-2026)
- Ping systems that make a microphone optional.
- Escalating, recoverable failure instead of instant fail (Payday 3 praised; Blacklist and Sniper Elite criticised for
  trial-and-error and permanent alert).
- Checkpoints per encounter, not per mission.
- Ratings that reward clean play and drive replay (Silent Assassin, Ghost / Panther / Assault).
- Partner state always readable (seen, searching, downed, carrying).
- Accessibility basics: remappable controls, subtitles, colour-safe player colours, motion and FOV options.

### 5.6 Technology and Steam (summary; details in research file section D)
- **Stay on the current stack.** Babylon.js 9 + TypeScript + Havok. Switching to Godot, Unity or Unreal means rewriting
  everything (movement, AI, co-op sync, tests). Godot would be the best fit for Claude Code if a switch were ever
  forced; Unreal the worst (binary assets).
- **Ship on Steam as a Windows .exe with Electron.** It bundles its own Chromium, so every player gets the same
  engine. Tauri uses the system browser on Windows (Steam Overlay problems) and WebKitGTK on Linux (WebGL problems).
  Babylon.js games have shipped on Steam with Electron, but only small ones; nothing of our scope was found, so prove
  it early.
- **Converting late is the risk, not converting at all.** Set up the Electron build in CI early and keep it green.
  Known issues: Steam Overlay needs launch flags (`--in-process-gpu`, `--disable-direct-composition`), Windows 11
  Alt+Tab ghost windows, code signing to avoid SmartScreen and antivirus warnings, saves move from browser storage to
  files plus Steam Cloud, assets kept as loose files so Steam patches stay small.
- **Graphics: WebGL2 by default, WebGPU optional later.** WebGPU is still behind a flag on AMD Linux, including Steam
  Deck. Light budget on either API: roughly 4-8 shadow-casting lights near the camera; clustered lights cannot cast
  shadows; the voxel light bake carries the rest and the light meter.
- **"Steam servers" means Valve's relay network, not game servers.** Steam Networking is free and solves NAT problems,
  but it cannot connect the full game to a separate Friend's Pass app (below). So we do **not** depend on it.
- **EA's servers are not available to us.** The EA account and Friend's Pass system belongs to EA and serves games EA
  publishes. The free equivalent is Epic Online Services (free, Steam players get an automatic account, lobbies across
  apps), but it has no ready JavaScript SDK, so it would add a native-code layer. Keep it as a fallback only.
- **Friend's Pass, simplest version (recommended, Michael prefers it over Remote Play Together):**
  - Two Steam apps: **Night Shift** (paid) and **Night Shift Friend's Pass** (free, Demo type, linked to the game). This
    is the same setup Hazelight used on Steam. Same build files in both.
  - At start the game checks which app it is running as. Full game: Host or Join. Friend's Pass: **Join only**, and
    only while connected to a host. No achievements in the Friend's Pass (Valve's advice).
  - Networking is **our own WebRTC**, exactly like the browser build: a TURN relay for players behind strict networks
    and our own small signalling service, both on free tiers (for example Cloudflare's TURN and a Cloudflare Worker
    [verify current free limits]). A 2-player stealth game uses very little bandwidth.
  - Invites: the host gets a short room code and a "copy invite" button; the guest types or pastes it. Voice stays on
    Discord, so sharing a code there is natural. Click-to-join from the Steam friends list is a "Could" for later.
  - Steam is used for the store, overlay, achievements, cloud saves and Steam Input via steamworks.js. These parts of
    the binding work today; its outdated networking is not needed.
  - One code path for browser and Steam builds keeps it simple.
  - Ask Valve to confirm the Demo-as-Friend's-Pass setup and whether it needs its own app fee.
  - Fallback if Valve says no: Steam Remote Play Together (free, only the host owns the game, works once local
    split-screen exists).
- **One Transport interface** with implementations for WebRTC (browser and Steam builds) and Loopback (tests and
  split-screen). The game sim never imports a networking library directly. Steam Networking or Epic Online Services
  could be added later behind the same interface if ever needed.
- **Longevity:** the game depends on our signalling and relay staying up for years. Keep them tiny, documented and
  movable to another free host.
- **Split-screen:** two Babylon cameras with viewports, per-player HUD, pads assigned by first button press. Costs
  roughly twice the CPU work per frame. Building it early shapes input, HUD and cameras the right way, and it unlocks
  Remote Play Together.

### 5.7 Music and sound (summary; plan in section 11)
- CT's score: 6-8 minute tracks split into 4 independent stress layers added as the situation rises; silence or ambience
  when exploring; percussion when caught.
- Mark of the Ninja's clear model: ambient base, high energy when spotted, drop a notch while guards search, back up if
  found, fade out when the search ends. Avoid flip-flopping with hysteresis.
- Short tails: alert to caution within about 8-15 s of losing contact, resolve on a 1-2 bar tail (fixes CT's lingering
  music).
- Zero budget means no paid composer. CT's score was built from **field recordings and sound design**, which suits our
  route: Claude Code composes and renders the music (the existing music generator), built on CC0 recordings and
  samples.
- AI-generated music has a weak copyright position (others could reuse it) and must be disclosed on the Steam store
  page. For a free project that is acceptable; record it.

---

## 6. Decisions queue (settle in order, only when the next gate needs them)

Create `docs/plan/DECISIONS-QUEUE.md`. Each item: question, options with cost, your recommendation, which phase needs
it, status. Ask Michael in batches of up to 4 through the native UI. Recommendations below come from the research;
re-check them against the code before asking.

| # | Decision | Options | Recommended | Needed by |
|---|---|---|---|---|
| D1 | Engine and stack | Stay Babylon/TS + Electron / Rewrite in Godot 4 / Rewrite in Unreal 5 | Stay, confirmed by the Phase 2 spike with written kill criteria | Phase 1 (provisional), Phase 2 (final) |
| D2 | Graphics API | WebGL2 only / WebGL2 default + WebGPU option / WebGPU only | WebGL2 default + optional WebGPU later | Phase 2 |
| D3 | Desktop wrapper | Electron / NW.js / Tauri | Electron | Phase 2 |
| D4 | Online transport | Own WebRTC + TURN + own signalling for both builds / Steam Networking for the Steam build / Epic Online Services | Own WebRTC everywhere (one code path, works with the Friend's Pass app) | Phase 2 |
| D5 | Friend's Pass method | Free Demo-type Friend's Pass app, join-only, room code / Steam Remote Play Together / Free base + paid host DLC | Friend's Pass app (Michael's preference); Remote Play Together as fallback; confirm with Valve | Phase 8 (email Valve in Phase 2) |
| D6 | Split-screen timing | Build local 2-player support now / after online works / never | Now (spike in Phase 2, real in Phase 4) | Phase 2 |
| D7 | Online screen layout | Full screen each (CT style, keeps information asymmetry) / always split like Hazelight / player option | Full screen each; local split only | Phase 4 |
| D8 | Partner awareness | Compass bar with partner mark (vision v2) / beacon colours + pings only (old D-12, G336, G339) | Vision v2 compass; record that it supersedes the old rules | Phase 1 |
| D9 | Gear | Chosen per mission (vision v2) / fixed complementary kits (CT, old D-11) | Chosen, with a per-mission allowed list and caps; the briefing suggests a split; jammer always carried | Phase 4 |
| D10 | Failure model | Revive 30 s, 2 per mission (vision) / unlimited revives with a timer that runs while the partner is unseen (ITT style) / hybrid | Test both in the Test Chamber in Phase 4; pick by playtest | Phase 4 |
| D11 | Abilities | Identical core verbs, asymmetry from gear and situation (current) / per-mission asymmetric abilities (Hazelight) | Identical core verbs; roles swap through situations | Phase 1 |
| D12 | Joint approach choice (A Way Out) | Adopt, at most one per mission / not now | Adopt as a "Should", designed in Mission 1 paper design | Phase 7 |
| D13 | Campaign size | Minimum: prologue + 5 missions (about 3 h) / Target: prologue + 7 / Stretch: prologue + 9 (one per night) | Plan for Target, commit after the vertical slice shows real cost per mission | Phase 1 (provisional), Phase 7 (final) |
| D14 | Platforms | Windows first; Steam Deck "Playable" goal; Linux and Mac later or never; phones dev-only | As stated | Phase 1 |
| D15 | Music direction | Claude-generated score on CC0 field recordings (found-sound style) / fully synthesised / CC0 library tracks | Generated score on CC0 recordings; Michael picks between 2 generated directions by ear in a blind test | Phase 1 (identity), Phase 7 (pick) |
| D16 | Voice | Text radio and banter only / generated voices (disclosed) / volunteer actors | Text only; revisit after launch | Phase 7 |
| D22 | Signalling and relay host | Keep Trystero's public relays + free TURN (now) / own Cloudflare Worker signalling + Cloudflare TURN (release) | Public relays + free TURN now; move to own signalling only if join failures show up | Now / Phase 10 |
| D17 | Difficulty and assists | One difficulty (vision) / one difficulty + assist options / several difficulties | One difficulty + accessibility options; revisit after external tests | Phase 10 |
| D18 | Mission 1 engine | Trimmed Sector Ops engine / extended Marlow Yard course engine (current plan item 2) | Decide on code evidence; the plan must name the cost of each | Phase 5 |
| D19 | Level editor scope | Kestrel as a whole-game editor now / minimal editor for Mission 1 needs only / TS level files only | Minimal, time-boxed; Claude writes levels as code anyway | Phase 5 |
| D20 | Vision open items | Revive limit, breaking a mission rule, Moth's colour (plan says purple), per-mission gear limits, pistol jammer | Settle each with a one-line recommendation | Phase 1 |

Also check and settle these contradictions found in the research (each becomes a one-line decision):
- Old rule "no compass, minimap or blip" vs vision v2 compass (D8).
- Old rule "solo first" in the level standard section 11 vs co-op only (already rewritten? verify).
- Old "fixed kits" vs chosen gear (D9).
- Research proposals that spawn guards (alarm-only guard rooms, response teams) vs "no guard is ever spawned".
- Mission length: 10-30 min (validator) vs 30-60 (design kit) vs 20-30 (vision). Vision wins: 20-30.
- Pacing numbers: 2-3 / 5-8 (CT observed) vs 2-4 / 6-10 (vision). Vision wins.
- Phones listed as first class in old movement docs vs desktop/Steam now (D14).
- Human ladder 4.1 m in code vs 4.5 m decided; co-op lip band 4.3-4.5 m.
- FOV 86 in code vs CT measured about 75.

---

## 7. The plan: phases and gates

Write this into `docs/plan/MASTER-PLAN.md`. Every phase has: goal, inputs, work list, deliverables, exit gate
(measurable), and "not allowed yet". You may reorder or split phases when a gate result demands it; record why.
Estimate each phase in sessions only after Phase 2 gives you a real pace; re-estimate at every gate.

### Phase 0 - Finish the clean-up (in progress)
- Goal: stages A-J of the current clean-up plan merged.
- Do not redesign anything here. Record the playthrough bugs (guards know where you are when hidden, grenade broken,
  sticky cam view cannot reopen, downed partner not obvious, players climb out of levels, objectives confusing, Marlow
  Yard's last section weak) in the backlog, tagged to the phase that fixes them.
- Exit: clean-up merged, CI green, branch purge done only after Michael's yes.

### Phase 1 - Vision lock and foundation decisions (docs only)
- Write vision v3 from v2 plus: Steam release, Friend's Pass, local split-screen, the formula (section 3), the A Way
  Out story-first rule, music as identity, the reuse rule (section 5.4), scope tiers.
- Settle D1 (provisional), D8, D11, D13 (provisional), D14, D20 and the contradiction list.
- Write the new short `RULES.md` and `DECISIONS.md` (current plan item 5) and the scope ledger (section 10).
- Write the campaign outline draft: the nine nights of SUNDOWN mapped to missions under each scope tier, the story
  spine, where the twist and the emotional turn land, where each team move is introduced and reused.
- Exit: Michael approves vision v3 and the scope tiers in one native question round.
- Not allowed yet: code, art, music.

### Phase 2 - Technical foundation spike ("can we ship this?") - time-boxed
Small, throwaway-where-possible proofs. Each gets a written result with numbers.
1. **Fix internet co-op (high priority; may be done earlier as a small standalone job).** Keep Trystero and its free
   public relays, drop the public room list (room codes only), add a free-tier TURN relay (Metered Open Relay, 20 GB a
   month free, or Cloudflare TURN, 1,000 GB a month free), and show how each connection was made (direct, via relay,
   failed). Our own signalling service only if the public relays prove unreliable (D22). Before release, switch to
   short-lived TURN credentials so the key in the game cannot be reused. Test under the network simulator and between
   two real homes.
2. **Transport interface.** Move Trystero (or its replacement) behind it. Add a Loopback transport.
3. **Electron build in CI.** The current game runs as a Windows .exe from a CI artifact. Playwright smoke test inside
   Electron. Saves routed through a Platform layer (saves, achievements, presence, input glyphs).
4. **Steamworks proof** using Valve's test app (480): steamworks.js init, overlay with the launch flags, an
   achievement, a cloud save. No Steam networking needed.
4b. **Friend's Pass proof:** a build flag that makes the game "join-only, no achievements" and the check that will
   later read the Steam app ID. Prove a Friend's Pass build joins a full-game host over the internet.
5. **Split-screen proof** in the Test Chamber: two viewports, two pads, per-player HUD; measure frame time.
6. **Performance proof:** the Test Chamber with a realistic light count, 2 players, Electron, WebGL2 (and WebGPU for
   comparison) on a mid-range PC and the lowest PC you will support. Steam Deck if available.
7. **Draft the email to Valve** (Michael sends it) about the Demo-type Friend's Pass app and its fee; record the answer.
- Exit gate with **kill criteria written before the spike starts**, for example: "Stay on Babylon if split-screen
  holds 60 fps at the target preset on the mid-range PC and the Friend's Pass proof connects two machines on
  different networks. Otherwise bring the Godot option back to Michael with a cost estimate." Set real numbers with
  Michael before starting.
- Not allowed yet: new gameplay features.

### Phase 3 - Core feel ("the first 30 seconds")
- In the Test Chamber only. Movement and camera sign-off on the Mixamo character (current plan item 4), light
  readability (picture lifted, light meter and guards agree), night vision toned down, guard perception fixed so hiding
  works and guards search the last place they saw you, level bounds so nobody climbs out.
- Build a "stealth gym": 4-6 tiny rooms each testing one thing (dark lane, lit pool with a switch, one patrolling guard,
  one stationary guard, a noisy floor, a door).
- Exit: Michael and his partner play the gym and tick the feel checklist; no unexplained detection in 20 minutes of
  play.
- Not allowed yet: mission content, art beyond the greybox standard.

### Phase 4 - Co-op toolkit ("the first 3 minutes")
- Build the minimum co-op loop (section 5.1) as Test Chamber gym rooms, one move per room, greybox only: handshake
  framework, boost, ledge relay, jammer alternation, double drop, one two-key action, throw with far-side release,
  hang-down, revive, pings, compass bar, partner state readouts, checkpoints, rating skeleton.
- Local split-screen made real (D6) with the online screen layout decided (D7).
- Each move is prototyped quickly (Hazelight: about 1-2 weeks of effort), then pair-tested. Each must pass:
  - **fun twice** (still fun the second time),
  - **multi-use** (2+ purposes shown in the gym),
  - **readable** (a new pair works it out with pings only, no voice),
  - **swap** (either player can start it).
- Cut or park moves that fail twice. Expect to cut about a quarter.
- Settle D9 (gear) and D10 (failure model) from these tests.
- Exit: the kept move list signed off; cut list recorded with reasons.

### Phase 5 - Mission framework and tools
- Decide the Mission 1 engine (D18) on code evidence; remove the unused one and Tallow Wharf.
- Mission data: 3-5 steps, objective chain with intel-to-use steps, optional objective, mission rules (up to 2,
  signposted), checkpoints, both-player extraction, percent rating with breakdown.
- Level tools: decide editor scope (D19); keep the validator only for checks that catch real problems (forced co-op gate
  not soloable, solution visible from the problem, dead ends, beat spacing).
- **Telemetry for playtests** (local file, no servers): time per area, idle seconds per player, detections with cause,
  reloads, deaths, position trails for a heatmap.
- Exit: a dummy 3-room mission runs start to finish with rating, checkpoints and telemetry.

### Phase 6 - Marlow Yard prologue rebuild
- Teaches each kept team move on its own, in a fixed order, each step leaning more on the partner (vision 4). Uses
  the Phase 4 gym lessons. Redesign the weak final section.
- Paper first (beat chart, top-down plan), Michael's one-click sign-off, then greybox, then pair tests.
- Exit: a fresh pair who has never played finishes it without help in the target time and can name every move.

### Phase 7 - Mission 1 vertical slice (the big go / no-go)
- Pipeline in section 8: story and stakes, building brief, beat chart, graph, plan, sign-off, greybox, guards,
  playtest at least 3 rounds, fix the top 3 issues each round.
- Only after the greybox passes: lighting pass, first art pass on Mission 1 only (generated and CC0 assets), sound
  pass, banter, then the **music direction test**: two generated score directions for Mission 1 (infiltration,
  caution, alert stems), blind playtested; Michael picks by ear.
- Exit gate (all must pass, measured with telemetry and the observer sheet):
  - 3+ fresh pairs finish Mission 1 in 20-30 min with nobody idle over 60 s;
  - every detection explainable by the players afterwards;
  - average fun rating 4/5 or better per area, and players can retell at least one moment unprompted;
  - no "where do we go?" stall longer than 2 minutes;
  - Steam-style build: a Friend's Pass build joins a full-game host by room code on two different networks;
    performance budget met in Electron;
  - the cost of building Mission 1 is recorded, so D13 (campaign size) can be decided with real numbers.
- If it fails: iterate, or cut scope. Do not start production on a slice that is not fun.

### Phase 8 - Steam presence (starts right after the slice passes)
- Steamworks partner account and app fee, tax and bank details (research the Australian requirements at that time;
  do not guess), game app created, Friend's Pass app created as a linked Demo-type app once Valve confirms (D5).
- Store page "Coming Soon" as early as possible: capsule art and screenshots composed from in-game renders, short
  trailer captured from the slice, description, tags including Online Co-op and Shared/Split Screen Co-op, the AI
  content disclosure. Wishlists start accumulating from this moment.
- Steam Playtest (closed) for external pairs.
- Research then: pricing for 2-player co-op indie games, Next Fest timing and rules, demo strategy for a co-op game
  (both players must be able to play the demo), AI content disclosure, age rating needs for Australia and other
  regions.

### Phase 9 - Production (missions 2 to N)
- One mission at a time through the section 8 pipeline. Paper and greybox of mission N+1 may overlap with art of
  mission N, never more.
- Each mission introduces at most **one new "mission toy"** (a gadget use, a machine, a team-move variation), uses it
  3+ times with rising difficulty, and reuses earlier toys.
- Music, sound and banter per mission, generated and checked against the asset ledger.
- Re-plan the campaign size at the halfway point using real costs.

### Phase 10 - Content complete, beta and polish
- Full campaign playable. External pair tests through Steam Playtest. Bug triage.
- Accessibility and options (D17), controller and keyboard glyphs, remapping, subtitles, colour-safe player marks,
  FOV and motion options.
- Performance pass on the minimum spec and Steam Deck. Achievements, Steam Cloud saves, rich presence.
- Localisation decision (text only, which languages) made with cost evidence.

### Phase 11 - Demo, Next Fest and launch
- Demo build (likely Marlow Yard + part of Mission 1), Next Fest participation if timing works, launch build, launch
  checklist, day-one patch plan.

### Phase 12 - After launch
- Bug fixes and quality patches only until sales and reviews say otherwise. Parked ideas (Sector Ops, more players,
  modes) are reconsidered then, not before.

---

## 8. Co-op mission design method (the recipe)

Write this into `docs/plan/MISSION-TEMPLATE.md`, folding in the existing level standard and map spec where they still
hold.

**Pipeline per mission (never skip a step):**
1. **Story and stakes** (half a page): why tonight, what is at stake, what Wren and Moth each want, the one twist, the
   banter beats, the emotional note.
2. **Building brief:** real place, real purpose, who is there tonight, why it is quiet, real dimensions.
3. **Beat chart** in minutes: opening, small team moment every 2-4 min, set piece every 6-10 min with 30-90 s calm
   after, twist at 40-60%, joint climax, exit under 2 min or by a different route. Tag every beat parallel /
   step-by-step / simultaneous and make sure they alternate.
4. **Checklist of required ingredients:** one action both do at once; one "cover me while I work"; one place only two
   bodies can reach; three wow moments (a big two-person move, perfect timing together, a story reveal); one intel step
   that is used (a code, a route, a person); one optional goal found by exploring; light sharing (one kills a light so
   the other moves, then swap); the beat minimums from 5.1; at most one new mission toy.
5. **Connectivity graph and top-down plan:** areas, routes (shadow, high, team move, tool or intel), splits that end
   at a clear meeting point within about 3 minutes, a dark lookout at each area entry with room for two, the final area
   seen early, checkpoints at area starts and before set pieces, in the dark and out of guard view.
6. **Guard sheet:** 2-5 guards per area, each with a job, a routine, a moment alone; some covering each other part of
   the time; some walking in pairs for a double drop; lights they come to fix.
7. **Michael's one-click sign-off** on a one-page plan plus a 5-line intent check.
8. **Greybox** (Test Chamber look, real lamp positions and real darkness). No guards first, walk it; then guards.
9. **Playtest rounds** (section 9) until the exit criteria pass. Fix the top 3 issues per round.
10. **Only then:** art pass, lighting polish, audio, music, banter polish.

**Rules that apply to every mission:**
- Same core stealth rules everywhere (light, sound, sight, alert states). No one-off detection rules in set pieces.
- The solution is visible from the problem, or found within 2 minutes.
- Never trigger events from one player's position alone.
- Every two-person requirement has a real-world reason (a two-key safe, a heavy shutter, a high window).
- Both players always have something to do. Story moments for one, play for the other.
- No escort missions, no hidden timers, no instant fail on detection, no forced kills.
- Every mission is testably 100%-able.

---

## 9. Playtest protocol

Write this into `docs/plan/PLAYTEST-KIT.md`.

- **Who:** Michael and his partner (internal, every build); fresh pairs who have never played (each gate); later
  Steam Playtest pairs. A pair can only be "fresh" once per mission.
- **How:** do not explain anything; record both screens (OBS or similar) with voice if they agree; observer fills the
  sheet; telemetry file saved.
- **Observer sheet (per area):** time spent; longest idle per player; detections and whether the players could explain
  them; "where do we go?" moments and how long; times they talked or pinged; laughs and "wow" moments; moves that
  failed and why.
- **After the session (5 questions):** best moment (retell test); most confusing moment; when did you wait for your
  partner; fun rating 1-5 per area; what would you cut.
- **Rules for acting on results:** fix the top 3 issues per round; never redesign from one pair's opinion alone unless
  it is a blocker; Hazelight's rule applies: testers show where the design fails, they do not set the vision.

---

## 10. Scope control

Write `docs/plan/SCOPE.md` with these parts and keep it current:

- **Must / Should / Could / Parked** lists for the whole game. Must = needed to ship the minimum campaign on Steam.
- **Verb budget:** the fixed list of core verbs (after Phase 4) and the list of mission toys per mission. Adding a verb
  needs Michael's explicit yes and something cut in return.
- **The five questions for any new idea** (from Michael, playtests or you):
  1. Which pillar does it serve, and does it pass the one rule?
  2. Is it needed for the next gate?
  3. Can it be tested in greybox?
  4. What does it cost, and what does it replace or delay?
  5. Would the game still ship without it?
  If it is not needed for the next gate, it goes to Parked with a one-line reason. Tell Michael in one line.
- **Polish ban:** no art, animation polish, VFX, final audio or music on anything that has not passed its playtest gate.
- **Time boxes:** every prototype gets a time box. Two failed iterations means cut or park.
- **Work in progress:** one stage testing, one being prepared (existing rule). One mission in greybox at a time.
- **Process creep watch:** the old process grew out of control (hundreds of decisions, about 1,140 branches). Keep docs
  short. If a doc passes about 2 pages, split or trim it. New tooling needs a reason tied to a gate.
- **Gate re-plan:** at every gate, compare plan vs reality, update estimates, and offer Michael scope cuts before
  schedule slips.

---

## 11. Music and sound track

Music is treated as a core feature, not a final coat of paint.

1. **Now to Phase 4:** build the adaptive music system in TypeScript on raw Web Audio (keep or adapt the existing
   dynamic music system and its generator): states Menu, Infiltration, Caution, Alert; driven by a 0-1 threat value
   (the highest guard suspicion across both players); bar-synced switching; stingers; enter Alert at once, leave Alert
   after about 10 s without contact, leave Caution after about 15 s, with a 1-2 bar resolving tail; music ducks under
   radio and banter. Use rough placeholder stems to tune timings, not taste.
   - Recommended music pipeline: the generator renders **fixed stems per mission** to Ogg files (same every play,
     testable, loop-accurate), and the runtime layers them. Fully live generation is harder to judge and to mix.
2. **Sound for readability first:** footsteps per surface (quiet and loud versions side by side), guard barks per alert
   state, a sparse ambient bed, distinct foley for Wren and Moth, partner-waiting and partner-down sounds, ping sounds.
3. **Phase 1:** write the sonic identity in one sentence plus 3 reference tracks and what to take from each (Michael
   chooses; CT's breakbeat-noir lineage is a starting point, not a copy). One recurring main theme across the whole
   campaign (the lesson from It Takes Two).
4. **Phase 1-4:** build a CC0 sound library: night-city field recordings (traffic hum, rain, port machinery, radio
   static, metal hits) from CC0 sources, logged in `docs/audio/samples.md`. These feed both the sound effects and the score,
   the way CT's score was built from recorded sound.
5. **Phase 7:** the music brief (template in the research file, used as the generator's spec instead of a composer
   brief). Generate two directions for Mission 1, blind playtest, Michael picks by ear. Fix the main theme as data
   (melody, key, tempo) so every mission can quote it.
6. **Phase 9-10:** per-mission stems (infiltration, caution, alert; 4-6 stingers; resolving tails), mix pass in co-op,
   loudness consistency, memory check, optional free soundtrack release.
7. Michael's ear is the quality gate for music. Give him short A/B listening tests in the browser build, never long
   lists of options.

---

## 12. Story and writing track

- Keep Hollowmere, SUNDOWN, the nine nights and Wren and Moth if they fit the new Mission 1 (vision 10). Confirm in
  Phase 1.
- **Give Wren and Moth distinct temperaments** that players feel in banter and in the joint approach choice. Both
  likeable from the first mission (It Takes Two's leads were unlikeable too long).
- Dry banter: quiet while guards are alert, back when calm. Never let a character spell out a puzzle solution. No
  comic helper who overstays.
- Grounded techno-thriller tone, consistent. No tonal whiplash.
- Plan the campaign arc in Phase 1: the mid-campaign revelation and the late emotional turn that uses the co-op bond.
- Told through text radio, found intel, overheard guard talk, documents. Text only (D16); voice is revisited after
  launch.

---

## 13. Art and animation track

- Greybox standard until each mission passes its playtest gate.
- Switch players and guards to the Mixamo character and animations (current plan item 4). Confirm the Mixamo licence
  covers commercial Steam release and record it [verify].
- Team-move animations redone only for moves that survived Phase 4.
- Art direction written in Phase 7 (one page: palette, lighting character per space type, what "lit" and "dark" look
  like, how player colours read at about 20 m in the darkest spot).
- Art production per mission in Phase 9, never ahead of its greybox gate.
- Sources, in order: generated in code (procedural materials, shaders, decals, UI), then CC0 libraries, then CC-BY with
  credit. Pick one consistent style that generated and CC0 assets can both reach; a mixed look is the main risk of
  free assets.
- Steam store art (capsules, trailer) in Phase 8, composed from in-game renders of the vertical slice.

---

## 14. Steam and business track

Phase 2: email Valve about the Friend's Pass app and its fee. Phase 8: account, fees, tax, store page, Friend's Pass
app, wishlists, Steam Playtest.
Phase 10: achievements, cloud saves, rich presence, Deck check. Phase 11: demo, Next Fest, launch. Research each item
when its phase arrives (rules change); record sources. Never present an unverified business or legal fact to Michael
as certain.

---

## 15. Risk register (start `docs/plan/RISKS.md` with these)

| Risk | Early warning | Mitigation |
|---|---|---|
| Internet co-op unreliable (already happened) | Failed joins in tests | TURN relay + own signalling, connection logging, network-sim tests, two-home tests every gate |
| Browser stack too slow (shadowed lights, split-screen, Deck) | Phase 2 frame times | Light budget, baked light, presets; kill criteria and the Godot fallback decided before the spike |
| Friend's Pass app refused by Valve | Valve's answer | Ask in Phase 2; Remote Play Together as guaranteed fallback |
| Free relay or signalling tier changes or shuts | Provider notices, failed joins | Tiny documented services, movable host, Transport interface allows Steam Networking or Epic Online Services later |
| Asset licence problem | An asset without a credits row | Credits-file check before every release build; G407 |
| Mixed, cheap look from free assets | Screenshots look inconsistent | One art style written in Phase 7, generated assets tuned to it |
| Steam binding unmaintained | Build or overlay breaks | Only non-networking features used; isolated in the Platform layer |
| Late .exe conversion pain | Electron build breaks | Electron build in CI from Phase 2, kept green |
| Scope creep and process regrowth | Parked list empty, docs growing | Scope ledger, five questions, gate re-plans |
| Polishing untested work | Art or music before a gate | Polish ban |
| Mechanic carousel | More than one new toy per mission | Verb budget, reuse rule |
| Players lost or idle | Telemetry idle and stall times | Compass, lit exits, lookouts, 2-minute rule |
| Forgettable music | Blind test reactions | Signature identity, recurring theme, A/B tests by Michael's ear, CC0 field recordings for character |
| Weak characters | Retell test mentions no character moment | Story-first missions, temperaments, banter passes |
| Playtester shortage | Fewer than 3 fresh pairs per gate | Recruit early; Steam Playtest after Phase 8 |
| Animation cost of team moves | Moves cut late | Only animate moves that survived Phase 4 |
| Old decisions contradicting new ones | Conflicts found in code or docs | New short DECISIONS file supersedes; contradiction list in Phase 1 |

---

## 16. Running the project: one prompt at a time, state on GitHub, full 5-hour windows

Michael will not remember or track anything, and he swaps Claude accounts. You keep the project management simple and
on track. Everything you need to continue lives on GitHub, never only in chat or Claude memory.

### 16.1 The control panel (the project's memory)
- One pinned GitHub issue titled **"Night Shift - control panel"** with the label `control-panel`. Create it in the
  first run (`gh issue create`, `gh issue pin`). Read it with `gh issue list --label control-panel` then
  `gh issue view <n>`.
- Its body is the live state, rewritten in place (`gh issue edit <n> --body-file`) after every finished step. Keep it
  under about 60 lines:
  - Updated (date, time, which session);
  - Phase and its exit gate;
  - Now (the step in progress, its branch and PR);
  - Queue (the next steps of the **current phase only**, in order, each with the model for its helpers);
  - Waiting on Michael (at most one item, the one action block below);
  - Assumed decisions (made while he was away, each with how to undo it);
  - Blocked (what, why, what unblocks it);
  - Open PRs and their CI state;
  - The resume prompt (16.3) and the model and effort for the next session.
- At the end of each session add one short comment to the issue: 3-5 dot points of what happened. That is the history;
  the body stays current-state only.
- The plan documents (`docs/plan/*.md`) change only through PRs, like all repo files. The panel needs no PR.
- Michael can open the panel on his phone at any time (GitHub, Issues tab, pinned) to see where things are.

### 16.2 One prompt at a time (how you talk to Michael)
- Every message that needs Michael ends with **exactly one action block**, and nothing after it. Never two prompts,
  never a list of future prompts, never a question and a prompt together.
- The action block is one of:
  - a native multiple-choice question (up to 4 related questions in one call);
  - a hand step (from Appendix A, written out in full: where to click, what to type, what he will see, how long);
  - a prompt to paste, written like this:
    > **Your next step**
    > 1. Where: this session / a new session (Appendix A4 says how)
    > 2. Set first: `/model` then pick **Opus 5.5**, then type `/effort high` (or "no change")
    > 3. Paste:
    > ```
    > (the prompt)
    > ```
    > 4. What happens next, roughly how long, and how you will know it is done.
- If nothing is needed from him, say so in one line ("Nothing needed from you, I'm carrying on") and keep working.
- Keep his session on one model where possible: his session runs **Opus 5.5, effort high** by default; you choose the
  model of every helper agent yourself (16.4 table). Ask him to change his own model or effort only for planning runs
  and gate reviews (xhigh) or when a whole session is mechanical (Sonnet 5.5, medium).

### 16.3 The resume prompt (the same line every time)
After a limit reset, an account swap, a new session or any confusion, Michael pastes this, unchanged:

```
Night Shift: resume. Read the pinned GitHub issue "Night Shift - control panel" and docs/plan/MASTER-PLAN-PROMPT.md section 16, then carry on exactly where the panel says.
```

Before the plan PR merges, the brief is on the branch the panel names; read it from there.

### 16.4 Pacing: use each 5-hour window fully, without skipping ahead
- At the start of a session, line up enough **current-phase** work to fill the window: steps of about 30-45 minutes,
  each ending with commit, push and a panel update, so a cut-off at any moment loses at most the step in flight.
- Work-in-progress: one PR testing on CI and one being prepared. While CI runs, prepare the next step.
- Helper agents (background) take independent slices of the current phase in their own worktrees and never edit the
  same files; at most 2 at a time; you check their work before it goes into a PR.
- When waiting on Michael or a playtest, continue only with work **allowed while waiting**: bugs from
  `docs/backlog.md` tagged to the current phase, tests for code already built, measurements of built features, doc
  trimming, tooling the current gate needs. Never next-phase features, never polish of work that has not passed its
  playtest gate, never speculative code.
- If nothing allowed is left, say so and stop. Unused usage is better than scope creep.
- Unattended (Michael asleep or away): reversible decisions are assumed, logged in the panel with how to undo them, and
  the work carries on; anything irreversible (deleting branches, spending money, publishing, changing a signed-off
  design) waits for him.
- Cut-off or "save" from Michael: push everything, update the panel, then give the resume prompt as the action block.
- Same account after a reset: Michael types `continue` in the same session. New account or new session: Appendix A4,
  then the resume prompt.

### 16.5 Model and effort guide (helpers you start, and Michael's session when you ask him to change it)

| Work | Model | Effort |
|---|---|---|
| Orchestrating, normal sessions (Michael's session default) | Opus 5.5 | high |
| Planning runs, gate reviews, re-plans, vision and decision write-ups | Opus 5.5 | xhigh |
| Mission and level design on paper, story and banter, campaign outline | Opus 5.5 | high |
| Hard debugging (networking, sync, AI perception), architecture (transport, platform layer, Electron, Steam) | Opus 5.5 | high |
| Feel tuning (movement, camera, team-move timing), music generation and mixing | Opus 5.5 | high |
| Building a clearly specified feature from a strict brief, greybox from an approved plan | Sonnet 5.5 | high |
| Mechanical work (removals, renames, doc updates, test moves), small bug fixes | Sonnet 5.5 | medium |
| Chores (logs, panel text, changelog fragments) | Haiku 5.5 | low |

Michael sets his own session with `/model` (then picks from the list) and `/effort <low|medium|high|xhigh|max>`.

### 16.6 Each session, start to end
**Start:** read the panel, this section and the current phase in `docs/plan/MASTER-PLAN.md` (or section 7 of this brief
until that file exists); `git fetch`; check open PRs and CI; tell Michael in 3 lines where things are; then work.

**During:** one step at a time, pushed and recorded; new ideas from anyone go through the five questions (section 10)
and land in Parked unless the current gate needs them; be proactive about risks, contradictions and missing
decisions (one line each).

**End of a step that changes something Michael can try:** a short walk-through (menu path, what to look for) inside
the action block.

**At a gate:** results against the gate criteria, re-plan, scope-cut offers, then the next phase's queue on the panel.

---

## 17. First run (now, in the main session that is running the clean-up)

1. `git fetch origin handover/master-plan` and read this brief, `docs/plan/CLEANUP-PLAN-2026-11-01.md`,
   `docs/plan/VISION-DRAFT-v2.md`, `docs/plan/START-HERE.md` and `docs/research/hazelight-steam-music-2026-11.md`
   from that branch, in full.
2. Open a docs-only PR from `handover/master-plan` to master ("Plan: master brief, research, start-here"). Fix any doc
   lint errors on that branch. Merge it when CI is green. It is docs only and may go alongside the clean-up stages.
3. Create the label `control-panel` and the pinned control panel issue (16.1). Fill it from the clean-up plan and the
   real state of each stage (check the PRs on GitHub): Phase 0, the stages done, in testing and left, the queue.
4. Put the co-op fix job (Appendix B) into the Phase 0 queue at the earliest slot where it does not touch the same files
   as a clean-up stage still to come (check which stages touch `src/net`); record the reason on the panel. It is high
   priority because every playtest depends on it.
5. Carry on with the queue under section 16. When the co-op fix job needs the relay key, the action block is
   Appendix A1. After its PR merges, the action block is Appendix A2 (the two-home test).
6. When clean-up stage J has merged (and the branch purge has Michael's yes), the action block is: a new session at
   Opus 5.5, effort xhigh, with the resume prompt; set the panel's Now to "Planning run (section 18)".

## 18. Planning run (after the clean-up)

Planning only, docs only, on its own branch.

1. Read everything in section 2 in full. List any file that is missing or contradicts this brief.
2. Grep the code to confirm the claims this plan relies on (stack versions, transport, music system and its generator,
   Test Chamber, mission engines, revive values, team moves, camera FOV). Note differences.
3. Create in `docs/plan/`: `MASTER-PLAN.md` (section 7, adapted to what you found), `DECISIONS-QUEUE.md` (section 6),
   `SCOPE.md` (section 10, with a first Must / Should / Could / Parked draft), `RISKS.md` (section 15),
   `PLAYTEST-KIT.md` (section 9, with the observer sheet as a printable table), `MISSION-TEMPLATE.md` (section 8),
   `CAMPAIGN-OUTLINE.md` (nights to missions per scope tier, story spine, move introduction and reuse table).
4. Check every existing asset has a row in the credits files (G407); list any with an unknown or unsuitable licence.
5. Ask Michael the Phase 1 decisions (D1 provisional, D8, D11, D13 provisional, D14, D15 identity, D20) in batches of up
   to 4, each with your recommendation first.
6. Record the answers, update the docs, open the PR, update the panel with the Phase 1 queue, and give the next action
   block.

---

## Appendix A - Michael's hand steps (give them word for word when they come up)

**A1. Free relay account (about 10 minutes, once).** Needed by the co-op fix job.
1. On any computer or phone, open https://www.metered.ca/tools/openrelay/ and choose to sign up for the free plan.
2. Sign up with your email and a password, then open the confirmation email and click the link.
3. In the Metered dashboard, open the TURN server section and create or show the credentials. Copy the API key, and
   the app address if it shows one (it looks like `yourname.metered.live`).
4. If it asks for a credit card, stop and tell me: we will use Cloudflare's free relay instead.
5. Paste the key into this session when I ask for it. Do not post it anywhere public.
6. If the screens look different from this, take a screenshot and paste it here with "help me find the key".

**A2. Two-home co-op test (about 30 minutes, with your partner).**
1. Both open the game link I give you (the version label I name should show on the main menu).
2. You host from the menu path I give you; read the room code to your partner on Discord.
3. Your partner joins with the code. Both note what the connection readout says (direct, via relay or failed).
4. Play 2 minutes, quit, and repeat 3 times. Then once more with your partner on their phone's hotspot.
5. Paste me the results: for each try, joined or not, what the readout said, anything odd.

**A3. Answering my questions.** Pick the option marked (Recommended) unless you disagree. If you are unsure, choose
"Other" and type "explain more simply".

**A4. Starting a new session and setting the model.**
1. In Claude Code, start a new session in the Night Shift folder (the desktop app: new session, pick the Night Shift
   folder; a terminal: go to the folder and type `claude`).
2. Type `/model` and pick the model I named. Then type `/effort` followed by the level I named, for example
   `/effort high`.
3. Paste the prompt I gave you.

**A5. Swapping accounts.** When one account's limit is used up: log in with the other account, then do A4 with the
resume prompt. Nothing is lost; the control panel holds the state.

**A6. Fresh-pair playtest (from Phase 3 on).** I will give you a one-page sheet: who to invite, what to say (nothing
about how to play), what to record (OBS, with permission), and the 5 questions to ask after.

**A7. Steam and Valve steps (Phase 2 and 8).** I will write each one out when it comes up: what to sign up for, what it
costs, what to click, and the email text to send.

## Appendix B - Co-op fix job brief (Phase 0, high priority)

Goal: two players on different home networks connect reliably by room code, at zero cost.
- Keep Trystero and its free public relays. Remove the public room list; joining is by room code or invite link only.
- Add TURN servers via Trystero's `turnConfig` (or `rtcConfig.iceServers` if custom STUN is also needed), using
  Michael's Metered free-plan key (Appendix A1). Keep the key out of logs. Before release this moves to short-lived
  credentials (D22).
- Handle `onJoinError` with a clear message (it usually means TURN is needed or misconfigured).
- A small connection readout for both players: connecting, direct, via relay, failed, plus round-trip time.
- Log each connection attempt (method, time to connect, failure reason) locally, so failures can be counted.
- Tests: the network simulator, unit tests for the new logic, the co-op e2e group. Then Appendix A2 with Michael.
- `src/net` work: Opus writes it; two independent Opus checks before the PR merges (existing rule).
- Done when: 3 joins in a row from two homes, plus one on a phone hotspot, each connect within about 10 seconds.
