# Night Shift - scope ledger
Owner: the orchestrator. Status: current (first draft, planning run 2026-11-02; re-checked at every gate).

What ships, what might, and what waits (master brief section 10). Must = needed to ship the minimum campaign on Steam.
Anything not listed goes through the five questions below before any work.

## Must
- Exactly 2 players online: own WebRTC with a relay, room codes, clear connection state (done in Phase 0, #748).
- Steam build: Windows .exe (Electron), saves as files, a join-only Friend's Pass build (D3, D5).
- Local split-screen (master brief section 3; timing D6).
- Core feel signed off: movement and camera on the Mixamo character, readable darkness (picture lifted, meter and
  guards agree), night vision toned down, guards that lose you when you hide, level bounds.
- The minimum co-op loop that survives Phase 4 (master brief 5.1): handshake framework, boost, ledge relay, jam
  alternation, revive, pings in player colour with the player number, compass bar, partner state readouts,
  checkpoints, both-player extraction, one two-key action, partner throw with far-side release, hang-down, double drop.
- Mission framework: 3-5 steps, objective chain with intel used, up to 2 signposted mission rules, checkpoints,
  percent rating with breakdown, ratings saved per mission.
- Gear chosen before each mission from the vision list; pistol hold-to-jam always carried.
- Hitman-style interaction (N37): context actions on people and objects, overheard talk that opens opportunities,
  world tricks (cut power, break a pipe, start a machine, stage an accident, throw something to pull a guard); 1-3
  unarmed staff per mission with routines (harming them costs rating).
- Same abilities for both players; roles come from the situation and alternate beat to beat (N34).
- Marlow Yard prologue rebuilt, plus the Target tier: prologue + 7 missions (N31; final at Phase 7).
- The ending and its early hints, written in Phase 1 (N36); co-operative to the last scene.
- Story: text radio, banter between Wren and Moth, documents, subtitles.
- Adaptive music (menu, infiltration, caution, alert) with a recurring signature in sound and rhythm (N35), and sound
  for readability (footsteps per surface, guard barks,
  partner-down and partner-waiting sounds).
- Accessibility basics: remapping, subtitles, colour-safe player marks, FOV and motion options.
- A dropped player reconnects to the last checkpoint with the same partner (no lost progress).
- Store page, AI content disclosure, complete credits files, Friend's Pass app (Phase 8).

## Should
- One short optional quiet beat per night (Hazelight research: A Way Out's most loved moments).
- Assists for the skill gap between partners (reduced damage, skip to the next checkpoint, holds instead of mashing).
- A partner view on demand or a small inset at holds and splits (D7, if the render cost allows).
- One joint approach choice per mission (D12).
- Quiet moments between tense ones: short, optional, off the critical path.
- Intel and two-person questioning steps.
- Steam Deck "Playable" (D14, once measured).
- Achievements and Steam Cloud saves.
- Second-wave co-op moves if Phase 4 keeps them: rope descent, pull, shutter hold, stack, belay line.

## Could
- The Stretch campaign tier (one mission per night) if the slice shows missions are cheaper than planned.
- Optional quick competitive side bits in the fiction (a hack race, most intel found); D30 may raise them to Should.
- Click-to-join from the Steam friends list; rich presence.
- Hint layer, off by default.
- WebGPU option (D2); strip lamps as line sources; night-vision realism extras; thermal as CT.
- Free soundtrack release; localisation (decided in Phase 10 with costs).
- Kit moves from the old list: deadweight, drop catch, chimney pair, swing pass, plank bridge (in code today; each must
  pass the Phase 4 gym or it is cut).

## Parked (with the reason)
- Sector Ops, 3-4 players, other modes, progression, cosmetics - vision section 12.
- Solo play, a bot partner - vision section 1.
- In-game voice chat - voice stays on Discord (vision section 8).
- More difficulties - one difficulty (vision section 9; D17 in Phase 10).
- Host leaving rules (N26) - Michael: "Don't bother with the leave job yet."
- Kestrel as a whole-game editor - D19 recommends minimal.
- Dogs, riot shields, drone operators, the drone gadget - few, readable guards; no drone (vision).
- Steam Networking, Epic Online Services - own WebRTC (D4).
- Consoles, Linux and Mac builds, phones beyond test launch - D14.
- Host migration.
- Disguises and crowds (N37: declined).
- Per-mission or per-character special abilities (N34: declined).

## Verb budget
Fixed after Phase 4. Today's code has 12 team moves (`src/game/teamMoves.ts`: boost, ledge relay, throw, hang-down,
rope, pull, shutter, deadweight, drop catch, chimney pair, swing pass, plank bridge); Phase 4 keeps the ones that pass
fun twice, multi-use, readable and swap, and expects to cut about a quarter. After that, adding a verb needs Michael's
explicit yes and something cut in return. Each mission adds at most one new mission toy, used 3+ times with rising
difficulty.

## The five questions for any new idea
1. Which pillar does it serve, and does it pass the one rule (it must not work as well solo)?
2. Is it needed for the next gate?
3. Can it be tested in greybox?
4. What does it cost, and what does it replace or delay?
5. Would the game still ship without it?
Not needed for the next gate: it goes to Parked with a one-line reason, and Michael hears it in one line.

## Standing limits
- **Polish ban:** no art, animation polish, VFX, final audio or music on anything that has not passed its playtest gate.
- **Time boxes:** every prototype gets one; two failed iterations means cut or park.
- **Work in progress:** one stage testing on GitHub, one being prepared; one mission in greybox at a time.
- **Process creep watch:** docs stay short (split or trim past about 2 pages); new tooling needs a reason tied to a gate.
- **Gate re-plan:** at every gate compare plan and reality, update estimates, offer scope cuts before dates slip.
