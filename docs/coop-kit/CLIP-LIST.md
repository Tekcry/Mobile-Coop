# Mixamo clips to download for the co-op kit (for the orchestrator)
Owner: Night Shift | Player Build. Status: current (job doc, 2026-10-26).

Sent by the coop-kit lead to the orchestrator, which downloads them in the browser pane (Michael ~00:20 2026-10-26: "i
approve downloading any additional mixamo animations and implemeting into the game"; no question to Michael). Every
co-op kit move gets a hand-made version plus a Mixamo version wherever a clip exists; the "Animation source: Hand-made /
CMU / Mixamo" setting picks which one plays (Michael ~00:25; BRIEF A9 / A14). Under Hand-made and CMU (the default) a
kit move plays its hand-made version; under Mixamo it plays the Mixamo clip, or the hand-made version if none exists.

**Every clip, the same settings** (as `docs/mixamo-retarget/CLIP-LIST.md`): Format "FBX Binary (.fbx)", Skin "Without
Skin", Frames per Second 30, Keyframe Reduction "none". Use the same character as the 21 clips already downloaded (the
auto-rig of Wren's own body; Y Bot works too). Save into `C:/NightShift/scratch/mixamo/clips/` with the name as it
shows on the site; if a clip is for one move, add the move in brackets, e.g. `Climbing Rope (rope descent).fbx`.
"In Place": leave it unticked on every clip (we read the body's travel ourselves).

Most useful first. "search:" means type those words in the Mixamo search box and pick the closest match; if nothing
close comes up, skip it (that move then has only its hand-made version).

| # | Name on Mixamo | What it is for in our game | In Place |
| --- | --- | --- | --- |
| 1 | search: rope climb | Climbing the two-person rope, and played backwards, lowering down it hand under hand | no: we read the travel |
| 2 | search: climbing up wall | Stepping up onto the partner's thigh and shoulders (shoulder stand) | no: we read the travel |
| 3 | search: drop to hang | Going over a ledge onto the rope (start of the rope descent) | no: we read the travel |
| 4 | search: pulling rope | The partner at the top holding the rope with the body braced and paying it out | (no box) |
| 5 | search: catch | Catching the partner who drops from above (Drop Catch) | (no box) |
| 6 | search: jumping down | Stepping or dropping down off the partner's shoulders, and the drop in Drop Catch | no: we read the travel |
| 7 | search: carry box | Two players carrying a scaffold board (Plank Bridge) | no: we read the travel |
| 8 | search: put down | Laying the board down over a gap (Plank Bridge) | (no box) |
| 9 | search: jump to hang | Jumping up to grab the chain (Deadweight) | no: we read the travel |
| 10 | search: hanging drop | Letting go of the chain and dropping to the floor (Deadweight) | no: we read the travel |
| 11 | search: swing | Swinging on a held arm across a gap (Swing Pass) | no: we read the travel |
| 12 | search: balance | Keeping balance standing on the partner's shoulders | (no box) |
| 13 | search: rappel | A real rappel down a wall, if the site has one (a better version of 1 for the descent) | no: we read the travel |
| 14 | search: side step | The rope holder stepping sideways along the edge (later: only if that move is built after Michael's playthrough) | no: we read the travel |

Nothing needed for these, already in the folder: hanging, ladder climbing, climb-up from a hang, crouch down and
up, the heavy lift, the ledge pull-up, crawling, crouched walking, kneeling down, standing still.

None of the Mixamo character or its skin is used: only the movement, moved onto our own characters.

## Which clip for which role (for the builders)
Each role is "hand-made + Mixamo <slug>", or hand-made only where no clip fits. Folder files first (on master as
`src/anim/clips/mixamo/<slug>.ts`), then the downloads above by #. No CMU take is hunted per kit role (BRIEF A9). Each
actor plays from its owner's Animation source (PR #498). A Mixamo row is on unless the capture is visibly broken (PLAN
"Animation" step 3); a missing Mixamo clip is named in the slice report. New rows in the Mixamo pipeline files are
append-only and shared with feature/mixamo-kit (Marlow) and the mixamo-retarget branches (PLAN "Shared"). Row ids are
the ones PLAN slices cite.

| Row | Slice | Role | In the folder now | Download # |
| --- | --- | --- | --- | --- |
| R1 | A2 | Descender over the edge onto the rope (`ropeOver`) | Braced Hang To Crouch (`trav_braced_hang_to_crouch`, played backwards) | 3 |
| R2 | A2 | Descender on the rope, hand under hand, feet on the wall | Climbing Ladder (`trav_climbing_ladder`, backwards; fallback) | 1, 13 |
| R3 | A2 | Holder's braced belay, load and pay-out (`ropeB`) | Kneeling Pull Up (`kneeling_pull_up`, the haul arms; fallback) | 4 |
| R4 | A2 | Climber's top-out over the lip (existing climb, if the capture passes) | Freehang Climb (`trav_freehang_climb`) | - |
| R5 | A3 (parked) | Holder stepping sideways with the rope | - | 14 (only when A3 is built) |
| S1 | B2 | Base: dropping into the leg stance at the wall and rising with the legs | Stand To Crouch, Crouch To Stand (`stand_to_crouch`, `crouch_to_stand`) | - |
| S2 | B2 | Rider: stepping thigh -> shoulders | Climbing Ladder (`trav_climbing_ladder`; fallback) | 2 |
| S3 | B2 | Rider: balance and pistol stance on top | Standing Idle (`standing_idle`, hands freed) | 12 |
| S4 | B2 | Base: the press with the rider's soles in the palms; rider: the lip take | Lifting Heavy Object (`lifting_heavy_object`), Pulling Up To A Ledge (`pulling_up_to_a_ledge`) | - |
| S5 | B2 | Rider: stepping down behind the base | - | 6 |
| K1 | K1 | Deadweight holder: chain grab, hang, drop; partner: under the grate | Hanging Idle (`trav_hanging_idle`), Crawling Prone / Crawling Hands And Knees, Crouched Walking | 9, 10 |
| K2 | K2 | Drop Catch: catcher ready and take; dropper's drop | - | 5, 6 |
| K3 | K3 | Chimney Pair: back-to-back brace and climb | - (expected gap: hand-made only) | 2 (the leg push only) |
| K4 | K4 | Swing Pass: anchor braced on the pipe; rider swing and release | Hanging Idle (`trav_hanging_idle`, the rider's grip) | 11, 4 |
| K5 | K5a, K5b | Plank Bridge: lift, carry, lay | Lifting Heavy Object (`lifting_heavy_object`), Kneel Down (`kneel_down`) | 7, 8 |
