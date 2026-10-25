# Consolidation questions (M27, 2026-10-17)

These 143 questions merge and deduplicate the questions from the seven documentation audits in docs/consolidation/AUDIT.md. Each question lists its options with the recommended one first; the source finding and question IDs are in the context line. Michael's answers go to docs/DECISIONS.md.

| Area | Questions |
| --- | --- |
| Vision and pillars | 6 |
| Platform and performance | 5 |
| Controls | 10 |
| Movement and camera | 16 |
| Stealth and AI | 11 |
| Co-op | 6 |
| Levels and maps | 10 |
| Audio and music | 12 |
| Art and characters | 14 |
| Weapons and gadgets | 12 |
| UI and HUD | 10 |
| Training | 14 |
| Story | 4 |
| Process and branches | 13 |
| Total | 143 |

## Vision and pillars

### VIS-01 Solo / co-op

Is Night Shift a solo game that co-op adds to, or a co-op game that also works solo?

- a) Solo first (recommended): Every mission fully playable alone; co-op adds routes and team moments
- b) Co-op first: Designed around 2-4 players; solo is supported
- c) Equal weight: Both designed and tested the same

*The pillars say solo first, but the operators work says 'mostly co-op' and the training bunker is co-op only; the answer sets fairness rules, training and test effort [V15]. Sources: Q-vision-2.*

### VIS-02 CT in bible

Your pure Chaos Theory movement decisions are not in the design bible yet. How should the bible take them?

- a) Rewrite it now (recommended): Bible follows your decisions now; numbers marked as starting values, tuned after you play the prototype
- b) Point to decisions file: Bible stays as is with a note that the decisions file overrides it
- c) Rewrite after prototype: Rewrite only once you have played and approved the prototype

*Every bible still describes sprint, lean-out shooting, the SWAT turn, instant stops, the elbow strike and the 13 October movement rules your later answers overturned [V3 / MV1, MV2, MV4, MV5, MV6]. Sources: Q-vision-9.*

### VIS-03 Hunter, Wave

Hunter (clear the building) and Wave Survival are called history in the project rules but 'coming back' in your newer note of 11 October. Which is right?

- a) Return after campaign (recommended): Parked now; rebuilt on campaign maps after the campaign, as your 11 October note says
- b) Only Hunter returns: Hunter comes back later; Wave stays history
- c) Remove for good: Both deleted from the plan

*The rules line dates from 8 October; your 11 October note in the bible and Kestrel log unparks both. One audit recommended keeping Wave as history, two recommended a later return [V4 / LV6 / TU15]. Sources: Q-vision-3, Q-levels-2, Q-ui-12.*

### VIS-04 Team vs team

On 11 October you said the old Mission mode returns as team-versus-team attack and defend. Do you still want it?

- a) Yes, after campaign (recommended): A later mode after the campaign; deathmatch and free-for-all stay parked
- b) No: The only versus play is the Mission 8 finale and the Confrontation
- c) Decide later: Decide once the campaign is done

*The same 11 October note planned it on Cinder Yard after the slice; the rules call PvP Blacklist history [V4 / LV6 / TU15]. Sources: Q-vision-4, Q-levels-2, Q-ui-12.*

### VIS-05 Nine ideas

Nine game ideas from the movement work are waiting (guards relight lamps, paired searches, a last-known-position marker, eavesdropping, adaptive music and more). How to handle them?

- a) Backlog, decide later (recommended): Each is decided when its part of the game is planned
- b) Go through now: Answer all nine now

*They sit in the movement run's bible proposals with no answer [ASSUMED BIBLE-PROPOSALS 1-9]. Sources: Q-vision-13.*

### VIS-06 Ref names

Research notes and the prototype plan call the reference game's hero by name and name his rifle, which the bible bans in docs. Which rule?

- a) Research notes only (recommended): Allowed only in research notes about the reference game; specs, docs, code and UI say 'the operator'
- b) Banned everywhere: No reference names anywhere, research included

*The IP rule bans reference names in code, UI and docs; the footage research needs to talk about the reference game [MV24 / AR29]. Sources: Q-move-19.*

## Platform and performance

### PLAT-01 Phones

Phones and touch are out (your 17 October decision). What happens to the phone and touch rules and code still in the game and its documents?

- a) Docs desktop, code parked (recommended): Phone and touch rules leave the docs; the code stays switched off until a clean-up job you approve
- b) Delete code in merge: Delete the phone and touch code as part of this merge too
- c) Phone loads on Low: Desktop first, but a phone must still load and play at the lowest setting

*Only two rule files say desktop only; every bible, the menu plan and the level, light, audio and art docs still set phone targets, touch controls and phone checks [PL1 / V1 / MV3 / TU13, MV12 / TU8, LV10, AU8, AR21, PL2, PL5, PL7]. Sources: Q-vision-1, Q-platform-1, Q-ui-7.*

### PLAT-02 Test device

Most automatic tests pretend to be a touch-screen phone. Should they run as a desktop with controller, keyboard and mouse instead?

- a) Yes, first job after (recommended): Switch every test to desktop in the first job after the merge
- b) When phone code goes: Switch only when the phone code is removed
- c) Leave as is: Keep phone emulation

*The test launcher defaults to a Pixel 7 phone, so the desktop game is mostly not what the required tests exercise [PL3]. Sources: Q-platform-2.*

### PLAT-03 Touch test

What happens to the automatic touch-control test?

- a) Report only (recommended): Keeps running but can no longer fail a build; deleted with the phone code
- b) Delete now: Remove it in the merge
- c) Keep required: It must keep passing

*It is still a required test that runs on almost every change, although the movement run's rules made it report-only [PL4]. Sources: Q-platform-3.*

### PLAT-04 Perf gate

The target laptop is slower than the written performance goals (about 4.3 ms of work per frame against 3 ms). Which rule should stop a change from merging?

- a) Never slower than now (recommended): Goals stay goals; a change may not make the laptop slower than its last result; gaps listed openly
- b) Lower the goals: Rewrite the goals to today's laptop numbers
- c) Hard goals now: Fix performance to the goals before any new feature

*Three different performance gates exist for the same thing and none says which blocks a merge [PL6]. Sources: Q-platform-4.*

### PLAT-05 Editor phone

The level editor can be opened from your iPhone over home Wi-Fi. With the game desktop only, what about the editor's phone launcher?

- a) Keep, no new work (recommended): It stays as a dev tool but gets no new phone work
- b) Remove it: Remove the phone launcher too

*It is a development tool, not the game, so M21 does not settle it [LV10]. Sources: Q-levels-10.*

## Controls

### CTRL-01 Pad layout

'Pure Chaos Theory' covers movement, animation timing and the camera. Should the button layout copy Chaos Theory too?

- a) Keep our layout (recommended): Keep our own pad-first, fully remappable layout
- b) Move toward CT: Change the default layout toward Chaos Theory's

*Your decision names mechanics and feel; the current pad layout is our own and fully remappable [MV1, M20]. Sources: Q-controls-1.*

### CTRL-02 Aim assist

Aim assist was 'light, touch only', and touch is gone. What do controller and mouse players get?

- a) Light, controller only (recommended): Light assist on the controller with a setting to turn it off; none with a mouse
- b) None, like CT: No aim assist on any input
- c) Setting, off by default: Controller aim assist exists but starts switched off
- d) All inputs: Aim assist on controller and mouse

*With touch dropped the rule now means no aim assist by accident. Two audits recommend light controller assist (the menu plan already has a controller row); one recommends none, as in Chaos Theory [MV26 / V18 / AR13]. Sources: Q-vision-15, Q-controls-5, Q-weapons-4.*

### CTRL-03 Shoulder

In Chaos Theory the shoulder swap works only while aiming and moves the gun to the other hand. What should the swap button do when you are not aiming?

- a) Nothing (CT) (recommended): Swaps only while aiming; the exploring camera swings by itself
- b) Flip explore camera: Also moves the exploring camera to the other side

*Ours swaps any time; the menu plan also has a 'Default shoulder' setting that may not survive [MV27, MV9]. Sources: Q-controls-2.*

### CTRL-04 Free L3

Clicking the left stick (L3) was sprint, which is gone. What goes there?

- a) Nothing for now (recommended): Leave it unbound
- b) Back to wall: Back-to-wall on L3 as in CT; A kept for doors and other actions
- c) Crouch: Crouch moves to L3

*Sprint was removed by your pure Chaos Theory decision, leaving the button free [MV10]. Sources: Q-controls-3.*

### CTRL-05 Door choice

With the stick now pushing doors open slowly and sprint gone, how do you choose between a stealth open, a normal open and a bash on a pad?

- a) One press, stick sets (recommended): One press starts the stealth open, the stick sets the angle; bash is the press at full run
- b) Pop-up list: A CT-style list at the door: open, stealth open, bash, later optic cable
- c) Separate buttons: One button per door action

*No document says how door actions are chosen now; bash used to need a sprint [LV11 / MV18]. Sources: Q-controls-7.*

### CTRL-06 Medkit key

Medkit button: hold X for 0.4 s to use a medkit, tap X to reload, and hold X while aiming still swaps weapon. Approve?

- a) Approve (recommended): Keep it as built
- b) D-pad hold medkit: Medkit on a D-pad hold; X only reloads

*Built in the movement run as an assumption, never confirmed [A55]. Sources: Q-controls-6.*

### CTRL-07 Holstered

Holstered rules: a mission starts holstered; swapping while holstered picks the gun the next aim draws; RB swaps while aiming; grenades and gadgets work holstered. Approve?

- a) Approve (recommended): Keep it as built
- b) Block holstered swaps: Weapon swaps blocked while holstered

*Built in the movement run as an assumption, never confirmed [A41]. Sources: Q-controls-8.*

### CTRL-08 Remap cancel

In the button remap screen, how do you cancel a capture?

- a) Menu/Start or Esc (recommended): B can still be bound to an action (menu plan)
- b) Hold B or Esc: As built in the movement work

*The movement build cancels with B held 1 s or Esc; the menu plan says Menu / Start or Esc so B can be rebound [MV15, TU10, A69, MD13]. Sources: Q-controls-4, Q-ui-8.*

### CTRL-09 Grab hold

With grab set to 'hold' in settings, letting go knocks the guard out and there is no way to kill. Keep that?

- a) Approve as is (recommended): Letting go knocks out; no kill in hold mode
- b) Add a kill input: A kill input while holding, for example fire

*Built in the movement run as an assumption, never confirmed [A70]. Sources: Q-controls-10.*

### CTRL-10 Emotes

Emotes are parked but still hold a pad button (View held) and three keys (J, K, L). What should happen?

- a) Unbind until return (recommended): Free those inputs until emotes come back
- b) Keep bindings: Leave them bound

*A parked feature is using inputs [MV25]. Sources: Q-controls-9.*

## Movement and camera

### MOVE-01 Turning

Your turning answer kept 'today's reversal pivot', but your CT footage shows on-the-spot turns as a tight walking circle and run reversals as one smooth 0.4 s turn. Which to copy?

- a) The footage (recommended): Tight walking circle, smooth reversal, no planted pivot
- b) Pivot at run only: A planted pivot for run reversals; footage for the rest
- c) As option text said: Keep the step-turn on the spot and the pivot

*The option you picked was worded before the footage was measured; the prototype plan follows the footage [MV5, MV22]. Sources: Q-move-1.*

### MOVE-02 Run stop

Stopping from a run: your answer said a short braking stop at run, but the footage shows the feet freezing mid-stride at every speed, the body sliding about 0.3 m. Which?

- a) Freeze at every speed (recommended): Feet freeze mid-stride; from a run the body slides up to about 0.3 m
- b) Braking step at run: Freeze at walk and crouch only; a braking step at run

*The bible (8 October) and your M20 answer keep a braking step; the footage, which M20 makes the authority, does not [MV5, MV22]. Sources: Q-move-2.*

### MOVE-03 After stop

After a stop, in 3.2.0 you approved holding the frozen stride until the next input. The footage holds it about 1.7 s, then eases to a feet-together idle. Which?

- a) Ease after 1.7 s (recommended): As the footage shows
- b) Hold until you move: As approved in 3.2.0

*The prototype plan follows the footage and so contradicts the 3.2.0 approval [MV5]. Sources: Q-move-3.*

### MOVE-04 Camera dist

Exploring camera: the bible says pulled back with the whole body in view; CT's camera is closer (about 1.8 m), aims at the head and cuts the legs off below the knee. Which?

- a) CT framing (recommended): Closer, head at screen centre, legs partly out of frame
- b) Whole body in view: Keep the bible's pulled-back framing

*Corridor widths and crawl heights also depend on this answer [MV9, LV3]. Sources: Q-move-6.*

### MOVE-05 Camera feel

Earlier plans asked for a springy camera with look-ahead, corner shoulder swaps, zoom with speed and a tiny bob. CT's camera follows rigidly with none of those. Which?

- a) CT camera (recommended): Rigid follow, gentle swing toward travel, no bob, no zoom when aiming
- b) Keep the extras: CT camera plus the earlier extras

*The system doc's tiny bob also breaks your 13 October 'no camera bob' rule, and it still names Blacklist as the framing model [MV9]. Sources: Q-move-7.*

### MOVE-06 Modern layer

Your 13 October 'modern layer' adds things the CT footage lacks: a bounce on stopping, planted pivots, soft knees, heavy breathing after sprints. Which items stay?

- a) Only what CT shows (recommended): Keep start lean, head look-at, hands on doors and ledges, feet on stairs, faster vaults from a run
- b) Keep all: All of the layer on top of CT
- c) Drop the layer: None of it

*Your pure CT decision says the footage overrides the layer where they differ, but nobody listed which items survive [MV21]. Sources: Q-move-8.*

### MOVE-07 Sprint moves

Sprint is gone. The fast ladder climb, fast rappel descent, small gap hops and door bashes all needed a sprint. What should they need now?

- a) Full run speed (recommended): Top speed at full stick triggers them
- b) Drop fast versions: No fast ladder or rappel; gap hop and bash at full run
- c) Remove them all: None of these moves

*Bindings, settings, sounds, training lanes and these moves still hang off sprint [MV10 / TU9]. Sources: Q-move-4.*

### MOVE-08 Roll

Forward roll: CT rolls when you hold crouch while running; ours rolls on a crouch tap at high speed. Which?

- a) Hold crouch (CT) (recommended): Hold crouch while running rolls; a tap just crouches
- b) Tap at speed: Keep today's tap

*Tap versus hold changes what a plain crouch press does while running [MV17]. Sources: Q-move-5.*

### MOVE-09 Quick 180

The bible has a special quick 180 (a 0.25 s pivot on a stick flick). CT has none: a flick turns you round in about 0.4 s while you keep walking. Which?

- a) Normal flick turn (recommended): No special move, as in CT
- b) Keep fast quick 180: A faster special turn on top

*The training bunker also has a quick 180 drill waiting on this answer [MV16, TRAIN-06]. Sources: Q-move-10.*

### MOVE-10 Wall entry

Getting onto a wall: the bible allows a button press or holding the stick into the wall; we turned stick entry off after accidental entries, and CT uses the button only. Which?

- a) Button only (recommended): As CT and today
- b) Button or stick: Button, or the stick held into the wall for a moment

*Entry, slide speed, leaving and stance each have two or three answers across the docs; your later answers settled leaving and stance [MV6, A83]. Sources: Q-move-12.*

### MOVE-11 Wall slide

Sliding along a wall: the bible says your current speed, your 16 October note about 0.9 m/s, and the CT footage a slow shuffle of about 0.35 m/s. Which?

- a) CT shuffle 0.35 m/s (recommended): A little slower at the lower speed settings
- b) About 0.9 m/s: Your 16 October value
- c) Normal walking speed: Same as walking

*Three different slide speeds are written down [MV6, A84]. Sources: Q-move-11.*

### MOVE-12 Wall peek

Wall edge peek: CT peeks the moment you reach the edge while still pushing; ours waits a quarter second of pushing. Which?

- a) Peek at once (CT) (recommended): Peek as soon as you reach the edge while pushing
- b) Keep short wait: So brushing the edge does not peek

*The wait was added so a brush does not peek; the footage shows none [MV6]. Sources: Q-move-13.*

### MOVE-13 Wall hug

The Kestrel toolkit plan still builds its own wall hug with lean-out shooting, the SWAT turn and a touch button, all removed. Keep only the movement work's back-to-wall?

- a) One wall move (recommended): Cancel Kestrel's wall hug; the CT back-to-wall is the only one; the toolkit step keeps the optic cable
- b) Rewrite Kestrel's: Rewrite the toolkit's wall hug to the CT rules and keep it as Kestrel's reference

*Kestrel sessions are told to cite the toolkit for which moves exist, so they would design spots for removed moves [V13 / LV5, MV7]. Sources: Q-levels-5, Q-vision-14.*

### MOVE-14 Cam height

Operators now have real heights (Wren about 1.68 m, Moth about 1.78 m) and the CT camera is set from the head. Should the camera be the same for everyone?

- a) Same for everyone (recommended): Tied to the body capsule, so maps read the same for every player
- b) Follow each head: Each operator's own head height

*No document says whether the camera follows each operator's head [MV31]. Sources: Q-move-18.*

### MOVE-15 Open items

Approve as written: head look-at order (aim, noise, team-mate, travel); aiming across a team-mate lowers the gun; bodies cool over 60 s in thermal; the electro device list?

- a) Approve all (recommended): All four as written
- b) One by one: Ask me each one

*Open movement-run assumptions A11, A13 and the rest of A53 (electro shows cameras, lasers, switches, alarms, terminals and charges). Sources: Q-move-20.*

### MOVE-16 Loco tech

Approve the movement run's 39 technical assumptions as written, strike the 22 that later decisions overturned, and confirm the one they imply?

- a) Approve and strike (recommended): As listed in the audit
- b) Show me the list: Review before approving

*Listed in the audit's locomotion table; includes the settings storage, audit file and flashlight items the platform audit also raised [A0-A89]. Sources: Q-move-21, Q-platform-6.*

## Stealth and AI

### STEALTH-01 Silent speed

In your CT footage the two slowest standing and three slowest crouched speeds are silent. Today the four slowest crouched speeds are silent, and maps are built on that. Which rule?

- a) CT bands (recommended): Two standing, three crouched silent; level rules, Kestrel timings and sensor rules re-checked
- b) Keep today's bands: Four crouched and two standing speeds stay silent

*This is an engine fact maps rely on, so the level rules, Kestrel timings and sensor rules follow it. One audit misread the footage as two crouched; the research shows three [LV1 / MV20, LV2]. Sources: Q-move-9, Q-stealth-1.*

### STEALTH-02 Guard doors

Doors past about 15% open pass light, sound and sight, and guards notice doors left open. Guards also open doors on their rounds. How should guards treat doors?

- a) Close behind them (recommended): Guards close doors on a calm patrol and notice any door open that should be shut; one 15% threshold
- b) Leave as found: Guards leave doors and notice only doors the player opened
- c) Never close: Only doors shut at the start count

*Without a rule guards could notice their own doors; the code also cuts light at 5% open, not 15% [LV11 / MV18]. Sources: Q-stealth-2.*

### STEALTH-03 Door bash

Door bash used to need a sprint. How does bashing a door work now?

- a) Run push knocks out (recommended): A fast push at run speed; knocks out a guard right behind the door, as in CT
- b) Bash, no knockout: A separate button or menu choice; no knockout
- c) Remove bash: No door bash

*Bash needs a new trigger and its knockout was never decided [LV11 / MV18]. Sources: Q-stealth-3.*

### STEALTH-04 Palm strike

The palm strike knocks a guard out in one hit from any side. Does that include heavy guards in armour?

- a) Every human guard (recommended): Heavies included; dogs cannot be palm-struck
- b) Heavies stagger: Heavies are only staggered from the front

*Your answer did not say; the bible and the guard rules still make heavies stagger from the front [LV20, MV8]. Sources: Q-stealth-5.*

### STEALTH-05 Finale hit

In the Mission 8 finale the unarmed player fights a traitor. Should a palm strike from the front knock the traitor out there too?

- a) No, front shoves (recommended): In the finale a front strike only shoves; side or back knocks out; one stated exception
- b) Yes, pure CT: One-hit knockout everywhere; the finale is rebalanced
- c) Decide in prototype: Decide when the finale prototype is played

*A frontal one-hit knockout would break the finale's rule that neither side may win straight away [V16]. Sources: Q-vision-11.*

### STEALTH-06 Takedowns

On the ground the takedown button is tap = knock out, hold = kill. In CT it grabs the guard, then you knock out, kill or interrogate. Which?

- a) Grab first (CT) (recommended): Ground button grabs, then knock out, kill or later interrogate; drop, ledge, window and pipe keep tap / hold
- b) Keep tap / hold: Tap knocks out, hold kills, on the ground too
- c) Grab and strike only: Remove ground takedowns

*With a one-hit palm strike, tap-to-knock-out duplicates the strike [MV8]. Sources: Q-move-14.*

### STEALTH-07 Looking up

The level rules say guards do not look up, but in the game a guard sees a player above him as easily as one in front. Which?

- a) Limited up-down view (recommended): A player well above a guard is hard to spot, as in CT
- b) Change the rule: Keep full sight; the rule becomes 'height breaks lines of sight'

*High routes rely on a promise the engine does not keep [LV12]. Sources: Q-stealth-4.*

### STEALTH-08 Glass

Kestrel uses many glass doors and walls, but no rule says what glass does. Which rule?

- a) Clear sees, frosted not (recommended): Clear glass passes light and sight; frosted glass and blinds pass light only; thermal never sees through
- b) All glass blocks sight: Only light passes

*Light parity needs one rule for light, guard sight, cameras and thermal; Kestrel's handover cites a bible rule that does not exist [LV17]. Sources: Q-stealth-7.*

### STEALTH-09 Awake cap

At most 12 characters are awake at once. Do guard dogs and civilians count toward that limit?

- a) Everyone counts (recommended): Anyone who can see or smell you counts; desktop may raise the limit after a speed test
- b) Only guards count: Dogs and civilians are extra

*Kestrel's roster depends on the dormant-guard system, which is not built; the map template still says 9 guards [LV13, Kestrel ASK-17]. Sources: Q-stealth-8.*

### STEALTH-10 Light order

The test proving light meter, screen and guard sight agree is not built, and motion lights are planned twice. What order after the movement prototype?

- a) Parity work first (recommended): Parity test, full-length lamps, co-op light sync and fuse boxes; motion lights built once in Kestrel security
- b) Sort out when building: Keep both plans as they are

*The light parity hard rule has no automated check, and long lamps have two different plans [LV18]. Sources: Q-stealth-9.*

### STEALTH-11 Difficulty

Approve the difficulty rules as built: custom sliders 0.5-2.0 on a base preset, and 'alarm tolerance' changes how fast guards radio in and reach panels, not how many alarms fail a mission?

- a) Approve (recommended): As built
- b) Alarms count too: Alarm tolerance also changes how many alarms a mission allows

*Open movement-run assumptions A31, A32 and A72 (A31 was replaced by A72 in the same run). Sources: Q-stealth-10, Q-move-22.*

## Co-op

### COOP-01 Bot partner

The computer-controlled test partner was dropped, but the bible and the training bunker plan still ask for one. What applies everywhere?

- a) No bot anywhere (recommended): Testing uses two browser tabs, the automatic two-player tests and the bunker's solo switch
- b) Bunker bot only: No bot for missions; one for the training bunker when it resumes
- c) Bot in co-op phase: Build one later in the big co-op phase
- d) With the AI traitor: Build it together with the computer traitor for Mission 8

*Your movement-run decision dropped it; the bunker's later answer asked for one in the debug menu, and its next step waits for it [PL11 / V12 / TU1]. Sources: Q-vision-10, Q-coop-1, Q-training-2.*

### COOP-02 Team damage

Can players hurt each other with weapons in co-op missions, given the training bunker already has it on as a drill?

- a) Off in missions (recommended): Off in missions; on only in the training bunker
- b) On everywhere: A hit partner goes down and can be revived
- c) Host choice: A lobby option, off by default

*Missions have no rule, and the muzzle discipline rule assumes the game stops you shooting a partner [PL13]. Sources: Q-coop-2.*

### COOP-03 4-player

Nothing automatically tests a 3 or 4 player game. Should there be one?

- a) Yes, four pages (recommended): One automatic four-player test covering walls, takedowns, strikes and medkits
- b) By hand only: 3-4 players tested by hand on playtest nights

*The planned four-player check used bot pages, which were dropped [PL14]. Sources: Q-coop-3.*

### COOP-04 Flaky tests

The two co-op tests sometimes fail on timing, so today a real co-op break can slip through. What should happen?

- a) Fix, then required (recommended): A short job makes them reliable; then they must pass like every other test
- b) Rerun twice: Stay 'known flaky'; a failure is rerun twice before accepting
- c) Leave as is: No change

*Both are marked 'known flaky' and can never fail a run [PL15]. Sources: Q-coop-4.*

### COOP-05 Parked modes

Code and docs still describe deathmatch, free-for-all and Wave as live. Until anything returns, how should master treat them?

- a) Parked, legacy only (recommended): Behind the hidden legacy switch, a short 'parked' section, tested only in the legacy run
- b) Delete completely: Remove code, docs and tests
- c) Keep as they are: No change

*The required co-op test also walks these parked modes [PL12, PL17]. Sources: Q-coop-5.*

### COOP-06 Co-op tech

Approve the co-op technical items: network version 11 for the merge, removing SWAT-turn and lean-out network data with the prototype, team-move polish for today's four moves only?

- a) Approve all (recommended): As written in the audit
- b) One by one: Ask me each one

*Two merged co-op changes both used version numbers; the list also covers the training network rows and partner collision as one rule [PL10 / TU22, PL16, A4]. Sources: Q-coop-7, Q-move-22.*

## Levels and maps

### LEVEL-01 Mission 1

The bible makes Mission 1 6 guarded areas, 16 guards, 30-40 min; the later Kestrel plan about 8 areas, 21 guards, 2 dogs, 7 civilians, 35-45 min. Which size is right?

- a) Kestrel size (recommended): Update the bible to the Kestrel plan; drop the phone reason for mission length
- b) Bible's smaller size: Trim Kestrel back toward the bible
- c) Kestrel is exception: Bible size stays the goal for later missions

*Kestrel's numbers are your later decisions but the bible and progress were never updated; the bible's mission length was set for phones [LV4]. Sources: Q-levels-1.*

### LEVEL-02 Kestrel next

Kestrel's floor plans depend on speeds, noise and camera, which the prototype is about to change. What should Kestrel do after the merge?

- a) Non-movement work (recommended): Block plan approval, review and massing walk only; floor plans wait for the prototype and a facts refresh
- b) Floor plans now: Carry on and fix later
- c) Pause Kestrel: Stop until the prototype is approved

*Its approved facts sheet and time budget use pre-CT speeds [LV19, LV2]. Sources: Q-levels-4.*

### LEVEL-03 Room sizes

Corridor widths, the 1.5 m crawl height and data hall aisles were worked out for the old camera. What happens with the new CT camera?

- a) Re-measure (recommended): Right after the camera part of the prototype; size sheet updated before new floor plans
- b) Old as minimums: Accept a cramped camera in tight spaces

*The CT camera sits about 2.3 m high, so 2.4 m ceilings and 1.5 m voids will squash it [LV3]. Sources: Q-levels-6.*

### LEVEL-04 Map docs

Map documents live in four different places. Where should each map's documents live?

- a) One folder per map (recommended): Every map gets its own folder under one maps folder; Kestrel and the bunker move there after the merge
- b) Keep as they are: Keep each map's own folder; write down which is which

*The standard, template, systems doc and bible each name a different home; the working method is asked in Process [LV8]. Sources: Q-levels-3.*

### LEVEL-05 Crawl spaces

The level rules say crawl spaces are crouch-walked, but an editor piece and Kestrel's route table use the old automatic crawl. Which?

- a) Crouch-walk spaces (recommended): Automatic crawl only in real duct ends inside plant shafts
- b) Auto crawl in ducts: Allowed wherever a real duct exists
- c) Remove auto crawl: No automatic crawl in the game

*Kestrel's corridor voids also miss the 1.5 m crawl height by 2 cm [LV14]. Sources: Q-levels-7.*

### LEVEL-06 Co-op ledges

Co-op ledges are set at 4.3-4.5 m, but the human ladder reaches only 4.3 m, so the bunker lowered one wall to 4.25 m. Which fix?

- a) Ladder reaches 4.5 m (recommended): One band for boost and human ladder; the bunker lip can go back up
- b) Two bands: Boost ledges 4.3-4.5 m, human-ladder ledges exactly 4.3 m
- c) Accept bunker lip: Standard unchanged; the bunker's 4.25 m lip is a one-off exception
- d) Lower the band: Whole band 4.2-4.3 m

*A ledge in the band works for a boost but not always for a human ladder; the solo reach may also move with the prototype [LV15, TU21, training A35]. Sources: Q-levels-8, Q-training-9.*

### LEVEL-07 Old maps

The retired maps (the 1934 Exchange, Trunk Annex, Dead Line v1 and v2) can still be picked in the game's map list. What should happen?

- a) Hide now (recommended): Hide them now; delete their code in a later clean-up
- b) Delete now: Remove them in the merge
- c) Keep listed: Leave them selectable

*The systems doc omits Kestrel, the editor and the test lab while listing retired maps [LV23]. Sources: Q-levels-9.*

### LEVEL-08 Editor items

Approve five Kestrel editor items: north-facing roof glass, British 1.2 x 1.0 m pallets, 2.38 m corridor ceilings, Kestrel lit as night, and keeping the moved guard sight code?

- a) Approve all five (recommended): As the report suggests
- b) One by one: Ask me each one

*The editor's overnight report flagged them for you [LV26]. Sources: Q-levels-12.*

### LEVEL-09 Kestrel ASKs

Approve the open Kestrel mission details as recommended (mission clock, objective rules, which guards wake, grabbing the engineer, rating, door and fence sizes, desk feeds later)?

- a) Approve all (recommended): As recommended in the audit
- b) One by one: Ask me each one

*Clock 01:10-02:10; objective 3 needs cameras and beams off; two guard pairs wake at objectives 4 and 6; no detections in the rating; generic employers; fence 2.4 m; doors 2.4 m; gallery 2.1 m [Kestrel ASK rows]. Sources: Q-levels-14.*

### LEVEL-10 Level tech

Approve the 10 technical level and light assumptions as written, and stating the nav-layer and slope limits in the level rules?

- a) Approve all (recommended): As written
- b) Show me each: Review before approving

*Posed-head light sampling on walls, one flashlight shadow, slider snapping, guard poses on clients, Kestrel triggers and sizes, editor defaults [LV21, LV22]. Sources: Q-levels-13.*

## Audio and music

### AUDIO-01 CC0 sounds

On 16 October you said 'allow CC0 for everything' for sound. Is that the rule for the whole game?

- a) Any sound may be CC0 (recommended): Bundled, never downloaded, each credited; code-made sound where it sounds better
- b) Music, steps, guns only: Everything else made in code
- c) Code-made only: Remove the recordings

*The audio rule has six versions across branches; only the weapon-audio branch has your 16 October answer [AU1 / V6 / PL8]. Sources: Q-vision-5, Q-audio-1, Q-platform-5.*

### AUDIO-02 Sound size

Music, footsteps and guns are now about 8.5 MB, over the 8 MB limit set for phones, with ambience and guard sounds still to come. What limit?

- a) About 12 MB (recommended): Room for ambience and guard sounds
- b) About 25 MB: A generous desktop limit
- c) Keep 8 MB: Shorten or lower the quality of the menu music
- d) No limit: It is a desktop game

*Four different audio budgets are written down; the audits suggested about 12 MB and about 25 MB [AU2]. Sources: Q-vision-6, Q-audio-2.*

### AUDIO-03 Music style

The first music brief said dark electronic, 'never orchestral', but you chose the dark orchestral score as built. What should master state as the direction?

- a) Dark orchestral (recommended): One hook (Hook A): low strings and brass, near silence while sneaking, rising with the alert
- b) Back to electronic: Move toward Chaos Theory's electronic style in the music revision
- c) A blend: Orchestral and electronic, decided in the music revision

*The bible has no music section and the music docs contradict the shipped score [AU3 / V7]. Sources: Q-vision-7, Q-audio-8.*

### AUDIO-04 Loud steps

You said the footsteps are too loud. The gun sounds were balanced against the footstep level. How should we fix it?

- a) Steps and guns down (recommended): Footsteps about 6 dB down, guns moved with them; then you re-check
- b) Steps only down: Guns become louder relative to steps
- c) Footsteps slider: A separate Footsteps volume slider

*Lowering only the steps breaks the gun mix, which is set relative to a running step [AU5]. Sources: Q-audio-3.*

### AUDIO-05 Own steps

When you creep, guards cannot hear you. Should you still hear your own footsteps?

- a) Yes, very softly (recommended): As in CT; the sound meter shows what guards hear
- b) Silent then: Steps silent whenever guards cannot hear them
- c) Match guards exactly: Step loudness follows what guards hear

*Light has a parity rule; sound has none for the player's own steps [AU17]. Sources: Q-audio-5.*

### AUDIO-06 Run sound

The footsteps have a special sprint sound, but sprint is gone. What should the fastest run sound like?

- a) Normal run sound (recommended): One run sound for all running speeds; walk / run switch reset to the new speeds
- b) Harder top speed: A harder slapping step at top run speed only

*The walk / run switch also sits between the new speeds by accident [AU6]. Sources: Q-audio-4.*

### AUDIO-07 Search music

When guards are searching for you but have not seen you, which music should play?

- a) Cautious, as now (recommended): The stripped-down chase music plays only after you were seen
- b) Evasion music: The chase music, as in Metal Gear Solid

*You approved the Cautious track, not this mapping [AU16, AS1]. Sources: Q-audio-6.*

### AUDIO-08 Menu theme

The menu music is now the long version with low drums and brass (2 min 50 s) that you asked for last, but you have not heard the final cut. What should master ship?

- a) Long version (recommended): Ship it; you confirm or change it in the music revision
- b) 90-second version: Until you approve the long one

*Two branches describe two different menu tracks [AU4, AS6]. Sources: Q-audio-7.*

### AUDIO-09 No-music UI

Briefing, results, pause and the Mission 8 Confrontation have no music decision yet. What should happen?

- a) Music revision decides (recommended): Master lists them as not built yet
- b) Quiet menu theme: Briefing and results use a quiet menu theme now; pause lowers the music
- c) Silence: No music on those screens

*The menu redesign adds new briefing and results screens with no music stated [AU15]. Sources: Q-audio-9.*

### AUDIO-10 Sound order

Still missing: guards' and team-mates' footsteps, ambient sound, bullet impacts, climbing and grenade throws. Which comes first after the merge?

- a) Guards' footsteps (recommended): Hearing guards is part of sneaking; then ambience, then the rest
- b) Ambience first: Rain and machinery that hide your noise
- c) Gun details first: Impacts and gun details

*Master needs one list of what audio exists, what is planned and what is out [AU15]. Sources: Q-audio-11.*

### AUDIO-11 Old music

The music folders hold four generations of old plans, an old test lab and 8.8 MB of unused music files. What should we do?

- a) Archive and delete (recommended): Plans to the archive, old lab and files deleted, one short current music section
- b) Keep old lab: Archive the plans but keep the lab for comparison
- c) Keep everything: No change

*The unused lab is also still a required test [AU10, AU11, AU18, AS11]. Sources: Q-audio-10.*

### AUDIO-12 Audio tech

Approve the 7 technical audio choices as written (music timing ladder, cooldown counts as calm, file format, suppressed-shot threshold, cover and landing step levels, suit damping, one step event)?

- a) Approve all (recommended): As written
- b) One by one: Ask me each one

*Session-made choices found in the audio docs [AS2, AS3, AS10, AS14, AS16, AU7]. Sources: Q-audio-12.*

## Art and characters

### ART-01 Operators

Your operator rules (Blender pipeline on a free base body, real heights, hits and light following each body) are only on the unmerged operators branch. What should master say?

- a) Copy them now (recommended): Your approved rules minus phones; maps size low cover for the tallest operator
- b) Wait for its merge: Master keeps the old rules until the operators branch merges
- c) One light height: Copy them, but keep one shared light-check height for fairness
- d) Change them first: You revise the rules before they go into master

*Master would otherwise say 'code-built, identical hitboxes and light heights' and the operators merge would collide with it [AR1 / V8 / LV16]. Sources: Q-vision-8, Q-art-1, Q-stealth-6.*

### ART-02 Look

The world is drawn as small cubes (voxels) and guards are blocky, while the new operators are smooth and realistic. What look do you want?

- a) Realistic everywhere (recommended): Operators now, guards and weapons later from the same pipeline; voxels only as how the world is drawn
- b) Mixed for good: Realistic operators; guards and weapons stay in today's style
- c) Voxel everything: One blocky style, operators included

*The bible's visual target never mentions voxels, and the operators spec forbids voxelising them [AR3]. Sources: Q-art-2.*

### ART-03 Goggle look

The in-game goggle and the menu plan's brightness symbol use the banned three-lens Splinter Cell look. When should they change?

- a) Soon (recommended): A small job swaps in a simple original goggle; the menu uses an original symbol
- b) With new operators: Goggle changes when the operators go in; the symbol in the menu job
- c) Keep three-lens: Keep both as they are

*It is the one design element the IP rule names [AR2 / TU11]. Sources: Q-art-3, Q-ui-6.*

### ART-04 Wren order

The weapon-carry step waits for Wren to be in the game, and Wren waits for the movement work, so each waits for the other. How should they be ordered?

- a) Wren job first (recommended): After you approve the prototype, a short job puts Wren in behind a dev switch; then the weapon step
- b) Stand-in shapes: Weapon step uses stand-ins of Wren's kit; re-checked later
- c) Drop the link: Tune weapons on today's model

*Your 2026-10-15 rule also names kit Wren no longer has [AR4]. Sources: Q-art-4.*

### ART-05 Four ops

4-player co-op needs four operators, but only Wren and Moth are being made, and the story gives Tally a cap and Sexton a long coat, which the art rules ban. Which?

- a) Four, adjusted looks (recommended): Tally and Sexton later with the same pipeline; story looks adjusted
- b) Four, story looks kept: Cap and coat kept as exceptions
- c) Fewer designs: Co-op players can share a design

*No plan builds Tally or Sexton [AR17]. Sources: Q-art-8.*

### ART-06 Body fix

The shared body is slightly off real measurements (shoulders too high, hands short, thighs long). Fixing it changes guards, hit areas and reach a little. What should happen?

- a) Fix all characters (recommended): When Wren goes in; movement and climbing tests re-run
- b) Operators only: Guards keep the current body
- c) Leave as is: No change

*Scheduled 'at integration' with no answer from you [AR20]. Sources: Q-art-10.*

### ART-07 Goggle spot

Where should the goggles sit, and when do they glow?

- a) Brow off, eyes on (recommended): On the brow, dim glow with vision off; over the eyes, full glow with vision on
- b) Eyes in missions: Always over the eyes in missions; brow only in menus
- c) Brow, no glow: On the brow with no glow when vision is off

*Three goggle behaviours are documented and none says where they sit with vision off; the switch itself is asked in Weapons and gadgets [AR9]. Sources: Q-art-6.*

### ART-08 Drone pod

Wren carries a pod for the tri-rotor drone, but the drone is a parked gadget. What should happen?

- a) Pod holds other kit (recommended): Drone stays parked; the pod holds a spare goggle battery or tools
- b) Bring drone back: As a campaign gadget
- c) Remove the pod: No pod

*Approved kit and layout work went into a gadget the game parks [AR5]. Sources: Q-art-5.*

### ART-09 Kit poses

Wren's gear was checked for crawling flat and climbing a rope, but the game has neither, like CT. What should the checks use?

- a) Real game poses (recommended): No prone or rope climb; re-check on crouch, rappel, pipe, ladder and ledge poses after the prototype
- b) Add prone crawl: The game gets a prone crawl
- c) Add rope climbing: The game gets rope climbing

*The real game poses and the CT posture were not checked [AR6, AR7]. Sources: Q-art-7.*

### ART-10 Ops size

One finished operator is about 80 MB of files; the bible's rough limit is 60 MB of textures for the whole campaign. What limit do you want?

- a) New desktop limit (recommended): Includes operators; close-up files load only for menus
- b) Keep 60 MB: Cut operator detail to fit
- c) No limit: Desktop only, cached offline

*Four operators would be about 320 MB, and the frame budget has little room left [AR8]. Sources: Q-art-9.*

### ART-11 Gaits

Should operators move differently from each other (stance, walk)?

- a) One CT set (recommended): They differ in look and height only
- b) Small differences: Stance and walk differ within CT timing

*The bible allows small gait differences; your pure CT decision covers animation timing without exception [AR19]. Sources: Q-art-12.*

### ART-12 Wren height

The story calls Wren small, but she is built at 1.68 m, tall for a woman. Which?

- a) Keep 1.68 m (recommended): Reword the story line
- b) About 1.60 m: Make her shorter

*Your operators decision set 1.68 m [AR18]. Sources: Q-art-11.*

### ART-13 Art guide

Should the operators' art direction (identity, colours, materials, things to avoid) become the master art guide for all characters now?

- a) Yes, copy now (recommended): As the character section of a master art guide
- b) Wait: Until the operators merge and the visual target phase

*The bible asks for an art direction file that does not exist on any merging branch [AR23]. Sources: Q-art-13.*

### ART-14 Ops tech

Approve the operators run's 67 technical assumptions (cloth, fitting, baking, detail levels, test lab) as written?

- a) Approve all (recommended): As written
- b) One by one: Ask me each one

*Listed in the audit's operators table; the run is not merged, so nothing changes in master [OPS-A1-A80]. Sources: Q-art-14.*

## Weapons and gadgets

### WEAP-01 Pistol tool

On 11 October you made the camera jammer and light disruptor one tool on the pistol, with the knife and ring airfoil later. The bible still splits them. Should it follow?

- a) Follow the toolkit (recommended): One pistol tool does both; knife and airfoil in later missions
- b) Bible's split: Light disruptor on the pistol, camera jammer a separate gadget

*The toolkit spec records your approval; one audit recommended the bible's split without seeing it [V13 / LV5, AR15]. Sources: Q-vision-14, Q-weapons-8.*

### WEAP-02 Draw speed

Your CT footage shows about 0.6 s (pistol) and 0.75 s (rifle) to raise a gun; the bible says 0.3 / 0.4 s. Which timing should the game use?

- a) CT footage timings (recommended): About 0.6 / 0.75 s up, 0.5-0.6 s down
- b) Faster bible timings: 0.3 / 0.4 s up, 0.4 s down

*Your pure CT decision makes animation timing follow the footage, but nothing in master says so yet [AR11]. Sources: Q-weapons-2.*

### WEAP-03 Marksman

Normal aiming in CT has no zoom. What about the marksman rifle's scope and hold breath?

- a) Scope and breath later (recommended): Marksman keeps a scope zoom with sway and limited hold breath, built later
- b) Zoom, no breath: Scope zoom only
- c) No zoom anywhere: No zoom for any gun

*The bible promises both, the code has zoom only, and the prototype drops aim zoom [AR14, V19, A61]. Sources: Q-weapons-3, Q-move-22.*

### WEAP-04 Preset names

Loadout presets have two sets of names: Silent / Flash / Loud in the game, Stealth / Assault / Recommended in the bible. Which?

- a) Silent / Flash / Loud (recommended): Used everywhere, presets and briefing kits
- b) Both sets: Presets Silent / Flash / Loud; briefing kits Stealth / Assault / Recommended
- c) Stealth / Assault / Recommended: Used everywhere
- d) Something else: You name them

*'Assault' echoes the removed Blacklist style tracker; one audit suggested keeping both sets for different screens [AR12 / V19, A33]. Sources: Q-weapons-1, Q-move-22, Q-process-8 (A).*

### WEAP-05 Thermal

What should thermal vision see?

- a) Doors, not walls (recommended): CT colours; heat through smoke; people behind closed doors dimly; never walls or glass; never changes guards
- b) Also thin walls: As above, plus people through thin walls

*Thermal is described four ways; your later answer added people behind closed doors [V17, MV19, A26]. Sources: Q-vision-16, Q-move-15.*

### WEAP-06 Grain

On 16 October you asked for more grain on all three goggle modes. CT has heavy grain only on warm bodies in thermal, almost none in night vision, none in electro. Which?

- a) CT look (recommended): Grain as in CT
- b) Grain on all three: As you asked on 16 October

*Your pure CT decision and your earlier grain request disagree [MV19, A87]. Sources: Q-move-16.*

### WEAP-07 Goggle cut

CT cuts instantly between goggle modes; ours plays a short flip, in the order off, night, thermal, electro. Which?

- a) Instant, our order (recommended): Instant cut, night first
- b) Instant, CT order: Instant cut: thermal, electro, night, off
- c) Keep the flip: The short goggle flip stays

*The operators work also decided the goggles should not flip [MV19, AR9]. Sources: Q-move-17.*

### WEAP-08 Optic modes

The game's goggle modes are night, thermal and electro; the operators' art notes say night, thermal and 'camera feed'. Keep the game's three?

- a) Night, thermal, electro (recommended): Keep the game's three
- b) Electro to camera feed: Replace electro with a camera feed

*The art notes renamed a vision mode [AR15]. Sources: Q-weapons-9.*

### WEAP-09 First gun

With the issued kit (rifle plus suppressed pistol), which gun comes out the first time you aim in a mission?

- a) Suppressed pistol (recommended): As now
- b) The rifle: The rifle comes out first

*Built as an assumption, never confirmed [A59]. Sources: Q-weapons-5.*

### WEAP-10 Gun carry

How are guns carried when put away?

- a) As built (recommended): Long guns upright on the back, SMG on a left-hip sling, pistol on the right thigh
- b) All on the back: No hip sling
- c) Diagonal rifle: As Wren's first concept; needs a game change

*The bible, the game, Wren's first concept and Wren's built mount all differ [AR16]. Sources: Q-weapons-6.*

### WEAP-11 Kit look

Wren's model shows two rifle magazines and one medkit, but you may pick a shotgun or SMG and carry 2-3 medkits. What should the kit show?

- a) Fixed look (recommended): Kit look fixed whatever you pick; medkit pouch sized for the game maximum
- b) Changes with loadout: Pouches change with gun and medkit count
- c) One medkit: Change the game to one medkit

*Her storage was meant to map to the game's loadout [AR10]. Sources: Q-weapons-7.*

### WEAP-12 Arsenal

Approve as written: original gun names on old internal ids, suppressors on every gun except shotguns and crossbow, campaign rifle always suppressed, and the medkit rules?

- a) Approve all (recommended): As written
- b) Change one: Ask me each one

*Medkit rules: an interrupted kit is spent, use is stationary, a cancel refunds it [AR30, A27, A28, A56, A60, A62]. Sources: Q-weapons-10, Q-move-22.*

## UI and HUD

### UI-01 Stance icon

You removed the gear indicator from the HUD. The HUD list also has a stance indicator next to it. Should that go too?

- a) Remove both (recommended): Your character's body shows the stance, as in CT
- b) Keep stance icon: Remove only the gear pips
- c) Optional, off: Both as a setting, off by default

*The bible pairs 'stance and gear pips' in its HUD list [TU12 / MV11]. Sources: Q-ui-1.*

### UI-02 Objectives

In the training bunker the objective list is always on screen (your walk note). The campaign shows objective text only when it changes. What should missions do?

- a) Always-on in course (recommended): Missions show objectives on change and in the pause menu
- b) Always-on everywhere: Every mode keeps the list on screen
- c) A setting: Off by default in missions

*The bunker rule contradicts the bible's HUD rule and is not recorded as an exception [TU14]. Sources: Q-ui-2.*

### UI-03 Menu timing

The menu redesign's cinematic backgrounds show the operator's poses, which the CT prototype will change. When should the menu work run?

- a) Menus after merge (recommended): Menus and screens after the merge; cinematic backgrounds after you approve the prototype
- b) After prototype: All of it after the prototype is approved
- c) All right after merge: Everything straight after the merge

*Its start condition was the old locomotion merge, which no longer exists [TU10]. Sources: Q-ui-3.*

### UI-04 Find Fallow

The menu plan puts the co-op Fallow course on the solo Training screen, but you made it co-op and lobby only. Where should players find it?

- a) Co-op lobby only (recommended): The Training screen shows a line pointing to Co-op
- b) Also on Training: The Training screen opens the co-op lobby on it
- c) Playable solo too: Reverses your co-op-only rule

*The menu plan was written from a branch that has no course code [TU6]. Sources: Q-ui-4.*

### UI-05 Lobby course

In the redesigned co-op lobby, how is the training course chosen?

- a) Mode row (recommended): Mission / Training course / Free roam; a course room shows two slots and a Start at bay choice
- b) As a mission card: The course is one more entry in the mission list

*The menu plan has no place for the course, its bay select or its two-player room; the course markers setting and results panel are also missing [TU7, TU18]. Sources: Q-ui-5.*

### UI-06 Mission card

New mission cards want intel found, last played and endings seen, which the save does not hold, and the menu work may not change the save. What should cards show?

- a) What the save has (recommended): Best rating and plays until the mission framework adds the rest
- b) Add save fields: The menu work may change the save

*Adding the fields would need a save version bump [TU17]. Sources: Q-ui-13.*

### UI-07 Prompt font

Should in-game button prompts use the new menu font (Barlow Condensed) too?

- a) One font (recommended): Menus and in-game prompts
- b) Menus only: Prompts keep the current font

*An open question in the menu plan; the font exception exists only in the menu docs [TU23, TU25]. Sources: Q-ui-9.*

### UI-08 Title text

What should the title screen say?

- a) Press any button (recommended): Any key, click or button works
- b) Press (A) to start: The glyph follows the device

*An open question in the menu plan [TU25]. Sources: Q-ui-10.*

### UI-09 Feedback

Keep a Feedback item on the main menu during playtesting, hidden in a release build?

- a) Yes (recommended): Main menu during playtesting
- b) Settings and pause only: Not on the main menu

*An open question in the menu plan [TU25]. Sources: Q-ui-11.*

### UI-10 Menu calls

Approve three menu-plan calls as written: WASD and R / F keys in menus; holstered-only menu shots until aim poses are approved; no profile badge, controls page or menu icons?

- a) Approve all three (recommended): As written
- b) One by one: Ask me each one

*The menu plan's 'for review' rows MD11, MD15 and MD19; the remap cancel (MD13) is asked in Controls. Sources: Q-ui-8.*

## Training

### TRAIN-01 Solo teach

Fallow is a two-player course, and the old solo Training has guards that never react and skips a step after 90 s. Who teaches a solo player?

- a) Rebuild solo course (recommended): Fallow for co-op; solo Training rewritten as a short CT tutorial after the prototype, no auto-skip
- b) Fallow only: Retire solo Training; solo players get no course
- c) Add solo to Fallow: Solo routes in Fallow; old Training retired
- d) Keep old Training: No change

*No document says what solo Training teaches under pure CT movement [TU20 / V14]. Sources: Q-vision-12, Q-ui-14.*

### TRAIN-02 Bunker next

The bunker run waits for your second walk and for the dropped bot partner, while the prototype will change movement. How should it resume after the merge?

- a) Walk 2, layout only (recommended): Lights, drills and guards wait for the approved prototype; then every jump and reach is re-checked
- b) Finish now: Finish the bunker on today's movement
- c) Pause bunker: Until CT movement is final

*Its docs are keyed to old movement step numbers and the dead branch flow [TU4, TU5]. Sources: Q-training-1.*

### TRAIN-03 B6 drills

Bay 6 has drills for leaning out to aim from a corner and the SWAT turn, which pure CT removes. Replace them?

- a) Swap shoulders drill (recommended): One drill: swap shoulders at the corner
- b) Drop both: No replacement

*Every drill is mandatory, so a drill for a removed move blocks its airlock [TU2 / MV28]. Sources: Q-training-3.*

### TRAIN-04 Sprint drill

Bay 2 has sprint, vault and jump drills. With no sprint, what happens to them?

- a) Run drills (recommended): Same obstacles at top run speed
- b) Remove run-up chain: Drop those drills

*Sprint was removed by your pure CT decision [TU2 / MV28]. Sources: Q-training-4.*

### TRAIN-05 Strike drill

Elbow-strike drills become the CT palm strike (one-hit knockout from any side). Keep bay 7's separate takedown drills (behind, front or side, corner, over sandbags)?

- a) Rename, keep drills (recommended): Rename to palm strike; takedown drills unchanged
- b) Merge front drill: Front / side takedown drill merged into the palm strike drill

*The strike now overlaps the front and side takedown [TU2 / MV28]. Sources: Q-training-5.*

### TRAIN-06 Held drills

The quick 180 and momentum carry drills wait on moves the prototype may drop. What should happen?

- a) Grey out (recommended): Drop them if the prototype drops the move
- b) Remove now: Take them out now

*See also the quick 180 question in Movement and camera [TU4, MOVE-09]. Sources: Q-training-6.*

### TRAIN-07 Speed drill

Bay 1 has a speed run (speeds 1 to 6 on floor marks). With no speed indicator on screen, keep it?

- a) Keep it (recommended): The guide text and floor marks teach the speed control; the drill reads your speed
- b) Drop it: No speed drill

*You removed the on-screen speed indicator but kept the speed control [TU3]. Sources: Q-training-7.*

### TRAIN-08 Boost skips

A two-player boost can skip three wall-jump and human-ladder spots, but the airlock still refuses until the real move is done. Is that enough?

- a) Yes, drill backstop (recommended): The drill check stops the skip
- b) Marked boost spots: Boosts work only at marked spots

*Open bunker assumption A51. Sources: Q-training-8.*

### TRAIN-09 Callsigns

The course calls player 1 Wren and player 2 Moth whatever operator each picked. Keep that?

- a) Own callsigns (recommended): Each player's own operator callsign
- b) Fixed Wren / Moth: Keep the fixed names

*Open bunker assumption A19. Sources: Q-training-12.*

### TRAIN-10 Solo switch

The bunker has a test-only switch that lets one person count as both players in two-player airlocks. Keep it?

- a) Test builds only (recommended): Never in normal menus
- b) Remove it: No solo switch

*It replaces the dropped bot partner for solo testing [training A6, COOP-01]. Sources: Q-coop-6.*

### TRAIN-11 Retries

To stop players getting stuck, the bunker re-glazes windows, adds one-way turnstiles, re-lamps lamps and replaces knocked-out role-players after 10-30 s. Approve?

- a) Approve all (recommended): Keep the retry features
- b) Restart bay instead: A stuck pair restarts the bay

*Open bunker assumptions A54, A61 and A62, none asked for by you. Sources: Q-training-11.*

### TRAIN-12 Exceptions

Approve the bunker's six unconfirmed exceptions to the level standard, plus a new exception for its always-on objective list?

- a) Approve all (recommended): As written
- b) One by one: Ask me each one

*Exceptions E5-E10 and a new E13: several verbs per bay, engine ducts and the vent drop, training ladders and ropes, no stop between build steps, text plans, guards spawning per bay with at most 7 at once [TU14]. Sources: Q-training-10.*

### TRAIN-13 Small calls

Approve the small bunker design calls as written (hold switches, own grenade, vaultable rail, airlock cycling, path widths, glass side bay, net drops follow the prototype)?

- a) Approve all (recommended): As written
- b) One by one: Ask me each one

*Open bunker assumptions A11, A17, A43, A44, A50, A55 and A64 [TU24]. Sources: Q-training-13.*

### TRAIN-14 Bunker tech

Approve the 42 technical bunker assumptions and Claude's technical rows as written, and mark the 13 replaced by the rebuild as void?

- a) Approve (recommended): As listed
- b) List them: Review before approving

*Listed in the audit's training table [TU21]. Sources: Q-training-14.*

## Story

### STORY-01 Voice

The rules say 'no voice ever', but the backlog plans a voice test. Which stands?

- a) Text now, test later (recommended): Text only now; the voice test stays a later idea; lines written so they could be voiced
- b) Text forever: Drop the voice test
- c) Plan voice now: Start planning voice acting

*The story's 'no recorded audio' line was meant for voice only and now clashes with recorded sound [V5]. Sources: Q-story-1.*

### STORY-02 3 players

With three players, the Mission 8 finale is one traitor against two (a default Claude chose; you asked for 2 against 2 with four). Keep it?

- a) One against two (recommended): One traitor against two
- b) Two against one: Two traitors against one

*An open bible assumption [ASSUMED bible 5.15]. Sources: Q-story-2.*

### STORY-03 Site names

The site and company names Cinder Yard and Ostler Colocation are still placeholders. Make them final?

- a) Make them final (recommended): Keep both names
- b) Choose again: Pick from the earlier name options

*Kestrel's handover still lists the name options as open [LV25]. Sources: Q-levels-11.*

### STORY-04 Open story

Seven story items are open (ending lines, Mission 6's location, the guard company's name, the van's cargo and more). When should they be decided?

- a) With each mission (recommended): When each mission is written
- b) Now: Decide all seven now

*Also Mission 1's optional intel, Crane's first line and Mission 7's rail scene [story open items]. Sources: Q-story-3.*

## Process and branches

### PROC-01 Branches

How should work flow from now on?

- a) Main is the only base (recommended): One branch per job from main, one merge request each; only you merge; ct-movement and dev retired
- b) Keep a dev stop: Same, with a dev branch as a test stop before main

*Every rule file still orders the dead ct-movement, dev, master flow [PL18 / V2, LV9, TU5, AU9]. Sources: Q-process-1 (G).*

### PROC-02 Work order

After the merge, what order should the work go in?

- a) Prototype first (recommended): CT prototype; then on your call bunker fixes, music revision, parked light steps, then the slice
- b) Slice first: Vertical slice first, prototype after
- c) Something else: You set the order

*The old phase plan no longer describes the work [V9]. Sources: Q-process-1 (A).*

### PROC-03 Job method

Sessions were run three different ways. Which way should every multi-step job use?

- a) Prototype, orchestrator (recommended): Prototype first for feel or look, then the orchestrator method; older ways become history
- b) Orchestrator only: Orchestrator for everything, no prototype step
- c) Planner for maps: Orchestrator for code; Kestrel's planner-and-stage way for map design
- d) Each job chooses: Each job picks and writes down its own way

*The bible's Opus / Sonnet loop, the orchestrator method and Kestrel's planner method contradict each other [PL20 / V11, LV8]. Sources: Q-process-6 (A), Q-process-3 (G), Q-levels-3.*

### PROC-04 AI models

Which AI model should helper agents use?

- a) Opus, light for chores (recommended): Strongest model for building and checking; a lighter one only for mechanical chores
- b) Opus for everything: No exceptions
- c) Sonnet builds: Sonnet builds, Opus plans and checks (old bible rule)

*The bible, the movement run, Kestrel and the menu run each name different models and effort [PL20]. Sources: Q-process-9 (G).*

### PROC-05 What wins

When documents disagree, what wins?

- a) You, then decisions (recommended): You, the decisions file, the bible, job and map docs, then code; every decision also goes into the bible
- b) Bible always: The decisions file is only a record

*There are three authority orders; Kestrel puts its own rules above the bible, the bunker puts the bible above its spec [V11, LV7]. Sources: Q-process-5 (A), Q-levels-3.*

### PROC-06 Decisions

Your decisions are spread over five files with clashing numbers. How should they be kept?

- a) One decisions file (recommended): Old entries keep a job prefix; today's answers get new numbers; each job adds yours when it merges
- b) Per-job files: Keep each job's own file only

*'A49' or 'D8' means different things in different files [PL25 / V22 / AR24]. Sources: Q-process-6 (G).*

### PROC-07 Phase plan

The old phase plan (Phases 0-7) no longer matches the work. Replace it?

- a) Ordered job list (recommended): Progress file lists jobs with branch, folder and status; phases stay chapter names
- b) Mark real state: Keep the phases and mark each with its real state

*A new session would read a phase table a week out of date [V9]. Sources: Q-process-2 (A).*

### PROC-08 Merge number

Training notes already used 3.7 to 3.9, and the game shows 3.5.1. Which version number should the merged game get?

- a) 3.10.0 (recommended): One above the highest number anywhere
- b) 4.0.0: Marks the switch to desktop-only CT play
- c) 3.6.0: Continues from the shown number; training entries renamed

*Three numbering schemes claim the same numbers [PL21 / V10, TU21]. Sources: Q-process-3 (A), Q-process-4 (G).*

### PROC-09 Job versions

How should versions work for jobs after the merge?

- a) Set at merge (recommended): Notes say Unreleased until the merge; then one step up each time
- b) Picked at start: Each job picks the next number when it starts
- c) One per phase: Keep one version per phase

*'One minor version per phase' no longer fits a job-based flow [PL21 / V10, A18]. Sources: Q-process-3 (A), Q-process-5 (G).*

### PROC-10 Previews

The website's three test copies of the game belong to branches about to be deleted. What replaces them?

- a) One chosen preview (recommended): Live game plus one test copy showing the job branch you choose
- b) One per job: Added and removed with each job
- c) Live only: Test builds played on your PC

*The /preview/, /ct/ and /kestrel/ slots silently stop building once their branches are deleted [PL19, V2]. Sources: Q-process-4 (A), Q-process-2 (G).*

### PROC-11 Checklist

The manual test checklist is a long history full of items that no longer apply. What should it become?

- a) Short current list (recommended): One desktop checklist plus a release checklist; old lists archived
- b) Keep adding: Mark old items out of date

*It still lists phones, sprint, lean-out, the SWAT turn and Wave [PL27]. Sources: Q-process-7 (G).*

### PROC-12 Old files

Blacklist-era documents, retired map designs and their tests are still in the working folders, and those tests must pass before any merge. What should happen?

- a) Archive, legacy tests (recommended): Docs and map data to the archive; their tests move to the legacy run that never blocks
- b) Delete all: Delete them with the old maps' code
- c) Leave in place: No change

*Includes the old Chaos Theory movement spec, which still reads as live [V21, PL26, MV14]. Sources: Q-process-7 (A), Q-process-8 (G).*

### PROC-13 Housekeeping

Approve the housekeeping rules as written: a test port table, job folders named after each job, two test suites at a time, the merged test list and a 'Running a job' section?

- a) Approve all (recommended): As written
- b) One by one: Ask me each one

*Also the plain doc fixes (stale numbers, index rows, story wording, run-file banners), texture budget and network notes left for their jobs [PL22-PL24, PL26, PL30, V20, MV23, PL29]. Folders are C:/NightShift/Mobile-Coop-<job>; the plain folder stays on master. Sources: Q-process-10 (G), Q-process-8 (A).*
