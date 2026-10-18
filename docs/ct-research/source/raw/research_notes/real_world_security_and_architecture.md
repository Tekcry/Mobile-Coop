# Real-world security and architecture grounding (background research)

Purpose: realism rules for facility layouts, security systems and daily operations in a co-op stealth game. All text paraphrased. Tags: [VERIFIED - 2+ sources], [SINGLE SOURCE], [UNCERTAIN]. Numbered refs [R#] map to the Sources section.

Status: COMPLETE (2026-10-17). Web search budget ran out late in this file; see Gaps.

---

## 1. Layered physical security

### 1.1 UK NPSA (formerly CPNI) protective security methodology [R1 overview page; R2-R6 zone pages; all read via the UK Government Web Archive mirror because npsa.gov.uk returned 403]
- **Principles:** Deter, Detect, Delay, Mitigate, Respond - supported by a security plan - aimed at disrupting the attacker's timeline from planning through execution. Physical, personnel and cyber measures must complement each other; attackers probe for the weakest point. [VERIFIED - 2+ sources: R1, and ProtectUK/WaterISAC pages via search R7]
- **Five zones**, each with its own D-D-D-M-R measures: beyond the perimeter, the perimeter, within the site, the building, the asset. [SINGLE SOURCE: R1-R6 (one site)]
- **Beyond the perimeter:** limit public information so attackers must make physical recce visits (raising chance of detection); keep approaches clear and easily watched; staff challenge strangers with a polite "can I help you?"; CCTV covering approaches outside the fence; keyholder call-out system out of hours. [SINGLE SOURCE: R2]
- **Perimeter:** security-rated fence with as few gates ("portals") as possible; **sterile zone** = two fences with ground between - outer fence is sacrificial and carries detection, inner fence provides delay; perimeter intrusion detection (PIDS) plus fixed and PTZ cameras plus lighting to detect and track day and night; hostile vehicle mitigation; screening facilities placed where blast effects are contained. [SINGLE SOURCE: R3]
- **Within the site:** do not signpost critical buildings; channel intruders toward non-critical areas where a response force can intervene safely; "keep out" signs that do not reveal what system is there; natural/man-made obstacles (ditches, banks, planting, internal fences, non-critical buildings) to slow progress; car parks outside the perimeter or far from critical assets; control room uses CCTV to track an intruder and direct responders. [SINGLE SOURCE: R4]
- **Building:** intrusion detection on the outer fabric for earliest detection; access control zones the building so the most sensitive areas have the fewest people with access and alarms show where intrusion happened; **multiple, varied layers** (walls, doors, floors, locks) between fabric and asset, using different technologies on the path so one tool cannot defeat all; doors lockable remotely from the security control room; internal CCTV tracks intruders; reception has procedures to alert the control room; signage should not reveal where sensitive assets are. [SINGLE SOURCE: R5]
- **Asset:** fabric, windows and doors should give *similar* delay (no weak side); approved products give quantified delay times; detection placed outside the asset's own boundary; need-to-know about asset location; exercise response plans with emphasis on response time. [SINGLE SOURCE: R6]
- Game translation: each zone gives a distinct gameplay layer; "balanced delay" means designers must justify any weak side (vent, roof hatch) as a known flaw; sterile zones with outer-fence sensors are a classic perimeter set-piece. [Design inference]

### 1.2 US federal: Interagency Security Committee (ISC) Risk Management Process [R8 NIH summary page; R9 CISA 2024 update listing; R10 IDManagement.gov listing - via search snippets]
- A facility is assigned a **Facility Security Level (FSL)** from five evaluation factors: mission criticality, symbolism, facility population, facility size, and threat to tenant agencies. The FSL sets a baseline **Level of Protection** (set of countermeasures), then adjusted to the assessed risk. Declining to fund a countermeasure is formally an acceptance of risk. [VERIFIED - 2+ sources: R8, R9/R10 snippets]
- Countermeasure detail (Appendix B) is restricted (FOUO), so specifics are not public. [SINGLE SOURCE: search summary]
- Game translation: rank a facility's security "tier" from those five factors - a symbolic embassy is high even if small; a big low-value warehouse is low. [Design inference]

## 2. Access control

### 2.1 Credentials and zoning
- **Factors:** something you have (card/fob), know (PIN), are (biometric); high-security doors combine two (card + PIN, card + biometric). [VERIFIED - 2+ sources: Wikipedia Mantrap R11; open-exam-prep data centre study guide R12 snippet; Boon Edam R13 mentions secondary biometric]
- **Anti-passback:** a badge cannot be used to enter again until it has been used to exit - stops passing a card back to a second person. [SINGLE SOURCE: R12 snippet - UNCERTAIN]
- **Building zoning:** access control "zones" a building so the most sensitive areas have the fewest authorised people and alarms pinpoint where intrusion happened; access points can be locked down from the security control room. [SINGLE SOURCE: NPSA R5]
- UBC campus guideline: intrusion systems are armed/disarmed by keypads, card readers or key switches; keypads are inside the protected area at 1220-1524 mm height, minimum 5-digit codes. [SINGLE SOURCE: UBC Technical Guidelines 28 16 00, Nov 2025, R14]

### 2.2 Mantraps / interlocked vestibules (airlocks)
- Two doors with a small space between; the second will not open until the first has closed. Operated manually by a guard (often remotely via intercom/camera) or automatically with a credential at each door, sometimes different factors per door. [VERIFIED - 2+ sources: R11, R13 Boon Edam manufacturer page]
- Sensors (time-of-flight, stereo vision, weight) detect a second person; some include metal detectors; glazing may be bullet- or burglar-resistant. [VERIFIED - 2+ sources: R11, R12 snippet]
- Used at data centres (dual authentication typical), banks, jewellers, research labs, server rooms, some corporate offices. [VERIFIED - 2+ sources: R11, R13]
- **Life safety:** automatic mantraps must still let people out of the intermediate space; egress fails safe on fire alarm or power loss. [VERIFIED - 2+ sources: R11; R12 snippet citing NFPA 101]
- A manually controlled mantrap can hold a suspect between doors. [SINGLE SOURCE: R11]

### 2.3 Two-person rule / dual control / no-lone zones
- **Definitions (US government):** a *no-lone zone* is a space that, when occupied, must hold two or more cleared people who stay within sight of each other; *two-person integrity* forbids any single person accessing certain material (e.g. crypto keys). [VERIFIED - 2+ sources: NIST CSRC glossary citing CNSSI 4009 R15; Wikipedia Two-person rule R16]
- **Mechanics:** two separate locks/combinations, no one person holds both; physical separation (Minuteman launch-key slots too far apart for one person to turn both); simultaneous action; each person watches for improper acts by the other. Banks: two keys or split combinations so all holders must be present; vault time locks set under dual control. [VERIFIED - 2+ sources: R16; USAF AFI 91-104 R17 snippet; bank policy page R18 snippet]
- Bank time-delay locks: digital vault locks offer dual control, time delay (up to 99 minutes on one product) and penalty lockout after wrong codes; mechanical time locks use two or three redundant clock movements. [SINGLE SOURCE each: Security Sales on Sargent and Greenleaf lock R19 snippet; patent literature R20 snippet - UNCERTAIN]
- Game translation: a real-world-grounded justification for "both players must act together" moments (dual key turns, simultaneous retinal scans, two-person vault opening). [Design inference]

## 3. Intrusion detection sensors
Sources: Archives and Records Association (UK and Ireland) security guidance, Appendix 7 "Intruder sensor selection" [R21]; UBC Technical Guidelines 28 16 00 Intrusion Detection [R14]; vendor/training pages via search [R22].

| Sensor | How it works / deployment | Weaknesses (from sources) | Tag |
|---|---|---|---|
| Door/window contact (magnetic reed) | Detects opening; UBC: concealed in top of the frame, magnet within 13 mm when closed | Cables can be cut or bypassed; wireless only acceptable at lower grades | VERIFIED (R21, R14) |
| PIR motion | Senses body-heat movement across zones; UBC: 2286 mm wall height, corner-mounted facing away from windows | Can be obscured; sunlight, heat changes, animals cause false alarms | VERIFIED (R21, R14, R22) |
| Dual-tech (PIR + microwave) | Both must trigger; fewer false alarms; UBC specifies dual-tech as standard | Slight extra cost | VERIFIED (R21, R14, R22) |
| Acoustic glass-break | Microphone listens for glass breaking; UBC: 2438 mm height, facing the glass | Only covers glass; similar sounds can false-alarm | VERIFIED (R21, R14, R22) |
| Vibration / shock / seismic | Detects impact of forced entry on walls, doors, safes, display cases; ARA: about 2.5 m2 per sensor | False alarms where public can touch the surface; weather on outer doors | VERIFIED (R21, R22) |
| Photoelectric (IR) beams | Transmitter/receiver pair, "electronic fence"; UBC: pole height 610-1829 mm, mostly external | Weather, animals, vegetation; towers moved or spoofed with a foreign beam | VERIFIED (R21, R14, R22) |
| Microwave beams (perimeter) | Up to ~200 m range, most weather | Vegetation false alarms; needs hard power | SINGLE SOURCE (R21) |
| Fence-mounted PIDS | Senses climbing/cutting on fence - earliest warning | Costly, maintenance | VERIFIED (R21, NPSA R3) |
| Buried PIDS | Senses pressure/disturbance above | Hard to repair; livestock false alarms | SINGLE SOURCE (R21) |
| Duress/panic buttons, movable-object detectors | Listed as standard alarm devices | - | SINGLE SOURCE (R14) |
- Panels are supervised: end-of-line resistors, tamper switches, comms-line, mains-fail and low-battery supervision - cutting a wire or power raises a fault, not silence. Panels sit in a secure comms room inside the protected area, not in a return-air ceiling plenum. [SINGLE SOURCE: R14]

## 4. CCTV practice
- **Operational requirement levels** (UK Home Office CCTV Operational Requirements Manual 2009, ref 28/09, as summarised): Monitor/control ~5% of screen height for a 1.7 m person; Detect >=10%; Observe 25-30%; Recognise >=50%; Identify >=100%. [VERIFIED - 2+ sources: Somerset police licensing OR guidance R23; IFSEC Insider R24 snippet - original manual not retrieved]
- **DORI pixel densities (IEC/BS EN 62676-4:2014):** Detect 25 px/m, Observe 62-63 px/m, Recognise 125 px/m, Identify 250 px/m. Lighting direction, optics and compression also affect results, and display resolution matters for live viewing. [VERIFIED - 2+ sources: Axis Communications whitepaper R25 (read); CCTV design tool / Vigi FAQ R26 snippets]
- Implication: a camera that "detects" a whole car park cannot identify faces in it; identification needs narrow, close coverage (typically entrances, tills, doors). [Design inference from R23-R25]
- **NPSA placement practice:** perimeter cameras (fixed plus PTZ) with lighting to detect and then track intruders day and night; internal CCTV to track intruders and direct officers; cameras on approaches beyond the fence to spot hostile reconnaissance. [SINGLE SOURCE: NPSA R3-R6]
- Retention commonly 30-90 days; card-payment standards often require 90. [UNCERTAIN - R12 snippet]
- **Police guidance for licensed premises (Avon and Somerset, read in full):** every public entrance gets a colour camera able to *identify* everyone entering/leaving, ideally mounted inside; external coverage to about 4 m around doors; internal cameras at least *recognition* standard; record at least 6 fps everywhere and 12 fps on entrances (event/motion-triggered recording allowed); recorder and monitor in a secure room, monitor never visible to the public or from outside; full-HD equivalents Identify 40% / Recognise 20% / Observe 10% of screen height (250 / 125 / 62.5 px per metre). [SINGLE SOURCE: R23]
- **Where CCTV goes blind (from the same guidance):** excessive shadows, glare into the lens, back-lighting (e.g. a camera facing a bright doorway or window), mixed external lighting, and rapid light changes; entrance lighting should be white light for colour accuracy. [SINGLE SOURCE: R23] Other blind spots implied by the levels: anything beyond a camera's detect range, directly beneath a high-mounted camera, behind obstructions, and areas without lighting at night (NPSA pairs cameras with lighting R3). [Design inference]

## 5. Fire-code egress (why the "way out" is always easier than the way in)

### 5.1 Exit doors must open from inside
- **UK Approved Document B Vol 2 (non-dwellings), read in full for egress sections [R27]:** escape-route doors should have no lock/latch, or only simple fastenings that are obvious, operable from the escape side, need no key and only one action. Doors may be locked when rooms are empty; hotel rooms may be key-locked from outside but opened by hand from inside. If a door is secured by keypad, card, proximity or biometric reader, there must be an override on the escape side. **Electric locks must release** when the fire alarm operates, on power loss or system error, or when the override (a green break-glass call point, BS 7273-4 Type A) is used - with call points on both sides if escape runs both ways. Final exits of offices/industrial buildings may have security locks used only when the building is empty. [SINGLE SOURCE: R27 primary]
- **Panic hardware:** in assembly and shop/commercial buildings, escape doors from rooms holding more than 60 people must be unlocked or fitted with panic fastenings (push bars, BS EN 1125). [SINGLE SOURCE: R27]
- **US OSHA (workplaces) [R28 fact sheet, read]:** exit-route doors must be unlocked from the inside and free of devices or alarms that could block use if they fail; side-hinged doors must swing outward when a room holds more than 50 people or is high-hazard. [SINGLE SOURCE: R28]
- Both regimes agree exits are unlockable from inside without a key. [VERIFIED - 2+ sources: R27, R28; mantrap egress rule R11]
- **Door swing:** open in the direction of escape where practicable, and always when more than 60 people use it or fire risk is high; open at least 90 degrees; doors onto corridors/stairs recessed so the swing does not block the route; vision panels where doors divide corridors or swing both ways. Revolving doors, automatic doors and turnstiles on escape routes must fail open or have an adjacent swing door. [SINGLE SOURCE: R27]
- **Alarmed and delayed-egress exits:** emergency-only doors are commonly alarmed ("alarm will sound if opened") to catch misuse; some systems unlock only after the user pushes the bar or presses a button for a period (about 20 s cited); emergency door-release call points disengage maglocks and electric locks. Stairwell doors in some towers lock behind you on the stair side, so stair users can be trapped until the discharge level. [SINGLE SOURCE: Wikipedia "Emergency exit" R39; door-release call points corroborated by ADB R27 -> VERIFIED for call points]
- **Crash/panic bars** came from crowd-crush disasters (Victoria Hall 1883, Iroquois Theatre 1903) and are now often the everyday opener on commercial doors; vertical-rod versions latch top and bottom. [SINGLE SOURCE: Wikipedia "Crash bar" R40]
- Game implications: interior exit doors and fire doors are the natural "one-way shortcut" (easy out, hard in); fire alarms unlock maglocks (an intentional, realistic exploit with consequences); a turnstile or revolving door always has a side door next to it. [Design inference]

### 5.2 Routes, exits and travel distances
- **OSHA:** normally at least two exit routes per workplace, as far apart as practical so one fire cannot block both; exits separated by 1-hour fire-resistant construction for up to three storeys, 2-hour for more; openings into an exit only via self-closing fire doors; exit route capacity cannot shrink toward the discharge; exit stairs continuing below the discharge level must be interrupted by doors/partitions so people do not miss the exit; exit signs must be visible along the route. [SINGLE SOURCE: R28]
- **UK travel distance limits (Table 2.1, ADB Vol 2):** offices and shops 18 m if escape is in one direction only, 45 m if alternatives exist; storage/industrial normal hazard 25 m / 45 m, higher hazard 12 m / 25 m; places of special fire hazard 9 m / 18 m; within a plant room 9 m / 35 m. [SINGLE SOURCE: R27]
- **Dead ends:** OSHA outdoor exit routes may not have a dead end longer than 20 ft (about 6 m) [R28]; ADB treats dead-end corridors over 4.5 m as needing protection/alternatives [R27]. [VERIFIED - 2+ sources that long dead ends are restricted; specific numbers differ by regime]
- **Stair cores and firefighting:** buildings with a storey 18 m or more above ground trigger firefighting shaft and lobby-protected stair requirements in ADB; very tall buildings (storey over 45 m) may need extra measures. [SINGLE SOURCE: R27]
- Game implication: in any realistic office floor the player is never more than roughly 18-45 m from an escape route, and every floor of a multi-storey building has at least two protected stair cores in separated positions - a guaranteed, believable alternative route. [Design inference from R27, R28]

## 6. Scale and dimension reference
All metric unless stated. Codes give minimums; real buildings are usually bigger.

| Element | Figure | Source | Tag |
|---|---|---|---|
| Accessible route clear width (US) | 36 in (915 mm) min; passing space 60 x 60 in (1525 mm) every 200 ft (61 m) if narrower than 60 in | ADA 2010 Standards 403.5.1, 403.5.3 [R29] | SINGLE SOURCE (primary) |
| Wheelchair turning circle | 60 in (1525 mm) diameter | ADA 304.3.1 [R29] | SINGLE SOURCE |
| Door clear opening (US accessible) | 32 in (815 mm) min; 36 in (915 mm) if doorway deeper than 24 in | ADA 404.2.3 [R29] | SINGLE SOURCE |
| Vertical clearance / headroom | 80 in (2030 mm) min (US); 2.0 m min on stairs and escape routes (UK) | ADA 307.4 [R29]; Approved Doc K 1.11-1.12 [R30] | VERIFIED - 2+ sources (about 2 m) |
| Exit route width (US workplace) | 28 in (about 710 mm) min | OSHA [R28] | SINGLE SOURCE |
| Exit route ceiling (US workplace) | 7 ft 6 in (about 2.29 m) min | OSHA [R28] | SINGLE SOURCE |
| UK escape route/exit width by headcount | 750 mm up to 60 people; 850 mm up to 110; 1050 mm up to 220; then 5 mm per person | ADB Table 2.3 [R27] | SINGLE SOURCE |
| UK escape stair width | 800 mm min for small stairs (up to 50 people); 1000-1100 mm for institutional/assembly; firefighting stairs recommended at least 1100 mm | ADB Table 3.1 [R27] | SINGLE SOURCE |
| Stair riser / tread (US accessible) | riser 4-7 in (100-180 mm); tread 11 in (280 mm) min; no open risers | ADA 504.2 [R29] | SINGLE SOURCE |
| Stair rise / going (UK) | general access: rise 150-170 mm, going 250-400 mm; utility: rise 150-190, going 250-400; private: rise up to 220, going 220-300, max pitch 42 deg; 2R+G between 550 and 700 mm | Approved Doc K Table 1.1 [R30] | SINGLE SOURCE |
| Risers per flight (UK) | general access 12 max (16 in small premises); utility 16; change direction after 36 risers in consecutive flights | Approved Doc K 1.17-1.19 [R30] | SINGLE SOURCE |
| Handrail height (US) | 34-38 in (865-965 mm) | ADA 505.4 [R29] | SINGLE SOURCE |
| Riser max / tread min agreement | about 170-180 mm rise, 250-280 mm tread for public stairs | R29, R30 | VERIFIED - 2+ sources |
| Alarm keypad mounting | 1220-1524 mm above floor | UBC [R14] | SINGLE SOURCE |
| Motion detector mounting | about 2.29 m wall height, corner-mounted | UBC [R14] | SINGLE SOURCE |
| Glass-break detector mounting | about 2.44 m, facing glazing | UBC [R14] | SINGLE SOURCE |
| IR beam pole height | 0.61-1.83 m | UBC [R14] | SINGLE SOURCE |
| Door contact gap | magnet within 13 mm of contact | UBC [R14] | SINGLE SOURCE |
| Vibration sensor coverage | about 2.5 m2 each | ARA [R21] | SINGLE SOURCE |
| Corridor widths in practice, floor-to-floor heights, ceiling-void depths | not found in an authoritative source in this session | - | Gap |

## 7. Alarm systems, response and verification

- **Arming:** systems are disarmed when authorised people are present via keys, codes, badges or biometrics at a panel near the entry; failed codes cause an alarm or timed lockout; individual sensors/zones can be bypassed (e.g. one door) while the rest stays armed; high-end systems allow single-use codes, day-restricted codes, or codes valid only together with another user's (escorted). Monitoring centres use a spoken password to cancel false alarms. [SINGLE SOURCE: Wikipedia "Security alarm" R31]
- **Entry/exit delay:** example procedure gives about 20 seconds to present the fob after unlocking, and a 20-second exit sounder while setting; if no sounder, the alarm has not set. [SINGLE SOURCE: ARA Appendix 9 example procedure R32]
- **Signalling:** panels report to a 24/7 alarm receiving centre; dual-path signalling (e.g. radio/cellular plus line) so cutting one path raises a supervisory alarm; encoders report which sensor tripped; some systems push video from cameras linked to the tripped zone. [VERIFIED - 2+ sources: R31; ARA main guidance R33 recommends dual-path DP3/4 signalling to a 24/7 ARC; UBC panel supervision R14]
- **Response chain:** the monitoring centre, depending on zone and time, may call police immediately, or first call the premises/keyholders to check; keyholders may be sent to look. [SINGLE SOURCE: R31] NPSA expects an out-of-hours keyholder able to reach the site within a set time [R2].
- **False alarms dominate:** US DOJ estimates 94-98% of alarm calls to police are false; about 1% involve a crime. Many US municipalities fine repeat offenders or put the property on a no-response list; some require **verified response** (eyewitness, audio or video confirmation) before police dispatch, except for holdup/duress/panic alarms. [SINGLE SOURCE: R31 citing DOJ]
- **UK:** police response to a registered (URN) intruder alarm is subject to availability, and two false alarms in a rolling 12 months can lead police to withdraw immediate response. Grade 3 systems with dual-path signalling are recommended for archives. [SINGLE SOURCE: ARA R33]
- **Verification methods:** audio/video verification (clips before/after the trigger sent to the centre); **cross-zoning** - a second sensor in an adjacent zone tripping shortly after the first confirms a real intrusion and triggers dispatch; enhanced call verification (two calls before dispatch) is not true verification. [SINGLE SOURCE: R31]
- Game translation (strong, realistic mechanics): a single sensor trip is ambiguous and often treated as a fault; two adjacent zones in sequence = confirmed intruder; panic/duress buttons skip verification; the response is a time-delayed escalation (operator call -> keyholder/guard check -> police) rather than instant SWAT. [Design inference from R31-R33]
- Real numeric police response times were not found in an authoritative source this session. [Gap]

## 8. Guard patrols and guard tour systems
- **Guard tour systems:** officers scan a tag at each checkpoint (NFC from about 4 cm, QR codes or barcodes); each tag has a unique ID so the log proves the exact checkpoint visited; supervisors get alerts if a tour starts late, ends late or stops early; managers can set a time window per checkpoint; tours can be scheduled or ad hoc; NFC is favoured outdoors/high-security, QR/barcodes indoors. [VERIFIED - 2+ sources: Omnigo R34 (intro read; detail via snippet), TrackTik/Trackforce R35 snippet, Parim R36 snippet]
- **Control room role:** CCTV in the security control room is used to track intruders and direct responding officers; communications plans keep information to responders accurate. [SINGLE SOURCE: NPSA R4-R5]
- **Challenge culture:** staff and officers politely challenge unknown people ("can I help you?") to disrupt hostile reconnaissance. [SINGLE SOURCE: NPSA R2]
- **Randomised patrol timing:** no authoritative source found; the snippet sources describe fixed checkpoint windows. [Gap - treat "randomised patrols" as a design choice, not a documented norm]
- Game translation: guards follow checkpoint rounds with time windows; a missed checkpoint (e.g. a guard who was knocked out) raises a supervisor alert after the window - a realistic "body discovered by absence" mechanic. [Design inference from R34]

## 9. CPTED (Crime Prevention Through Environmental Design)
Sources: Wikipedia CPTED article [R37]; municipal CPTED guides (Phoenix, Las Vegas 2022, Chandler 2025, Tustin, Calgary) via search snippets [R38]; ARA archive guidance [R33].
- **Core principles:** natural surveillance, natural access control, territorial reinforcement, maintenance/image; some guides add activity support and target hardening. [VERIFIED - 2+ sources: R37, R38]
- **Underlying theory:** offenders are deterred more by the perceived risk of being caught than by reward or difficulty; CPTED raises perceived risk of detection. [SINGLE SOURCE: R37]
- **Natural surveillance:** windows overlooking paths and car parks; low fences; transparent entrance vestibules; light the faces of people on paths; avoid over-bright lights that create glare and deep shadows (eyes cannot adapt to extreme contrasts); avoid badly placed lights that leave blind spots; use CCTV where windows cannot see. [SINGLE SOURCE: R37 for lighting detail; principle VERIFIED with R38]
- **Natural access control:** a single clearly identifiable entrance; structures that steer people to reception; thorny planting under ground-floor windows; remove features that give access to roofs and upper levels. [SINGLE SOURCE: R37]
- **Territorial reinforcement:** fences, signage, paving and landscaping that mark public vs private. **Maintenance:** neglect signals nobody is watching. [VERIFIED - 2+ sources: R37, R38]
- Archive/museum application: central reception where all visitors report; separate public from back-of-house; search-room furniture arranged so staff have clear sightlines and no one sits with their back to them; fewer concealment spots; lockers keep bags out of reading rooms. [SINGLE SOURCE: R33]
- Game translation: CPTED is the "good" baseline; a stealth level becomes interesting where CPTED has been compromised (overgrown planting, broken lights, a roof-access bin, staff who stopped challenging). [Design inference]

## 10. Building services (the "hidden building" stealth routes live in)

- **Core:** the vertical space holding stairs, lifts, electrical cables, water pipes and risers; usually central in offices (larger than in residential because of more lifts), sometimes on the perimeter, sometimes several cores; often structural. [SINGLE SOURCE: Wikipedia "Core (architecture)" R41]
- **Mechanical floors:** tall buildings have dedicated plant floors - rule of thumb about one per 10 tenant floors - housing air handling units, chillers, generators, pumps and tanks (water is relayed upward by intermediate pumps/tanks), communications gear; reached only by service lifts; often coincide with structural outrigger levels and split stacked lift shafts (sky lobbies just below); a rooftop mechanical penthouse holds lift machine rooms, cooling towers and window-cleaning gear. [SINGLE SOURCE: Wikipedia "Mechanical floor" R42]
- **Ceiling voids and raised floors (plenums):** the space above a dropped ceiling or under a raised floor usually carries supply/return air, ducts and cabling; cables there must be plenum-rated. [SINGLE SOURCE: Wikipedia "Plenum space" R43] Intruder alarm panels must not be mounted in return-air ceiling plenums. [SINGLE SOURCE: UBC R14]
- **Air ducts:** real HVAC ducts scale with the building - large runs are vertical shafts branching into small horizontal ducts; big ducts contain fans, not just grilles; most are too small for a person. [SINGLE SOURCE: Kotaku/architect, see file 1 S72]
- **Loading docks:** service infrastructure giving direct access to staging, storage and freight lifts; features include bumpers, dock levellers/lifts, dock seals, vehicle restraints, dock lights and indicator lights; North American dock height typically 48-52 in (1.2-1.3 m). [SINGLE SOURCE: Wikipedia "Loading dock" R44]
- **Data centre services:** UPS, battery banks and generators with redundant A/B power feeds (N+1); cable routing overhead in trays or under raised floors; hot/cold aisle containment with exhaust to the ceiling plenum; gaseous suppression or mist rather than wet sprinklers in the white space; server areas can reach 92-96 dB(A). [SINGLE SOURCE: Wikipedia "Data center" R45]
- Gap: no authoritative source found this session for typical ceiling-void depths, riser dimensions or floor-to-floor heights.

## 11. Facility types: rooms, operations, security profile
Each entry: rooms/zones that exist and why; operations; how security differs. Tags per line. Real-world facilities vary - treat as plausible baselines.

### 11.1 Office tower
- Rooms: lobby/reception (single controlled entrance per CPTED R37), lift banks and sky lobbies, central core(s) with stairs and risers, tenant floors, mechanical floors about every 10 floors, rooftop plant, basement plant and loading dock. [SINGLE SOURCE each: R41, R42, R44, R37]
- Security: reception steers visitors; visitors pre-booked, collected by host and escorted; sensitive storage logged in/out (ARA example office procedure R32/R46); access control zones floors; at least two separated protected stairs; final exit doors may be security-locked only when empty (ADB R27). [SINGLE SOURCE each as cited]
- Daily rhythm: last person out clears desks, locks cabinets, closes windows, sets alarm (ARA Appendix 9 R32). [SINGLE SOURCE]

### 11.2 Data centre
- Rooms: fenced perimeter with bollards; mantrap entrance; data halls ("white space") with raised floors and contained aisles; UPS/battery rooms; generator yard; cooling plant. [SINGLE SOURCE: R45]
- Security: layered fencing, bollards, mantraps, CCTV and permanent guards for large/sensitive sites; fingerprint readers common; access logged at site entry, internal rooms and individual cabinets (cabinet locks networked via power distribution units); "lights-out" facilities run unattended and dark. [VERIFIED for mantraps and dual authentication: R45, R11; rest SINGLE SOURCE R45]
- Uptime tiers: Tier I basic, no maintenance without shutdown; Tier II redundant components; Tier III redundant components and distribution paths - maintainable without shutdown; Tier IV physically isolated independent systems - fault tolerant. [SINGLE SOURCE: Uptime Institute R47]

### 11.3 Hospital
- Rooms: inpatient wards; emergency department, operating theatres, intensive care; pharmacy, radiology, pathology/labs; outpatients; support: medical records, clinical engineering, facilities/plant, dining, security. Design minimises staff travel and patient transport, accommodates heavy departments (radiology, theatres) and special wiring/plumbing/waste. Many hospitals are agglomerations of additions over decades. [SINGLE SOURCE: Wikipedia "Hospital" R48]
- Operations: 24/7 by definition (inpatients, emergency). [Inference] Specific shift patterns not sourced. [Gap]

### 11.4 Research lab with biosafety levels (CDC BMBL framework)
- BSL-1: standard practices, open bench, handwash sink, door separating lab. BSL-2: access restricted during work, self-closing doors, eyewash, biosafety cabinet for aerosol work, autoclave/decontamination. BSL-3: access controlled at all times, staff medically monitored, all work in cabinets, respirators possible, hands-free sink near exit, exhaust not recirculated, airflow drawn from clean to contaminated areas, entry through two sets of self-closing locking doors. BSL-4: change clothes before entry, shower on exit, decontaminate everything leaving, Class III cabinet or air-supplied positive-pressure suit, separate building or isolated zone, dedicated air/vacuum/decon systems; entries and exits recorded; airlocks. [VERIFIED - 2+ sources: CDC quicklearn R49, Wikipedia "Biosafety level" R50; BMBL 6th ed. existence R51]
- Game translation: BSL-3/4 suites are realistic "airlock + one-way flow" spaces where doors interlock and exit takes longer than entry (showers, decon). [Design inference]

### 11.5 Port / container terminal
- Function: containers transferred between ships, trains, trucks and barges; terminals store loaded (short term) and empty (longer) containers in stacks; ship-to-shore gantry cranes, sometimes remote-controlled. Example: one 18,000 TEU ship's cargo leaving Rotterdam on about 19 trains, 32 barges and 1,560 trucks. [SINGLE SOURCE: Wikipedia "Container terminal" R52]
- Security regime: ISPS Code (SOLAS XI-2, in force July 2004) requires a Port Facility Security Officer and plan per facility, a Ship Security Officer per ship and a Company Security Officer; three security levels (1 normal, 2 heightened, 3 exceptional/imminent, time-limited); ships carry a silent Ship Security Alert System the master can trigger from the bridge without alerting crew. [VERIFIED - 2+ sources: IMO ISPS page R53, Wikipedia ISPS R54]

### 11.6 Power substation
- Function: transforms voltage between transmission and distribution levels; usually **unattended**, supervised remotely by SCADA from a central control centre; larger sites have a climate-controlled control room with protective relays, breaker controls, batteries, communications and event recorders; live equipment separated by screens or clearance distance; grounding grid buried about 0.5-0.6 m under the yard; maintenance by inspection, infrared scanning, transformer oil analysis. [SINGLE SOURCE: Wikipedia "Electrical substation" R55]
- Security case (Metcalf, California, April 2013): attackers cut fibre cables in nearby vaults, then shot 17 transformers over about an hour; a motion-sensor alarm reached the utility, a 911 call came from a nearby plant, the remote control centre about 90 miles away saw equipment alarms; police arrived about 14 minutes after the motion alarm, found nothing and left; over $15 million damage; prompted major utility security spending and a 2014 FERC order for mandatory substation physical security standards. [SINGLE SOURCE: Wikipedia "Metcalf sniper attack" R56]
- Game translation: remote sites mean long response times, alarms that may be read as equipment faults, and comms cables as an attack surface. [Design inference]

### 11.7 Hotel
- Departments: front office (front desk, concierge, bell, valet, switchboard, night audit), housekeeping (floor managers, laundry), food and beverage (restaurants, room service, bars, banquets), events, finance, engineering/maintenance, HR, security (small hotels often contract security out). Runs 24 h with night shifts; senior managers keep office hours; overnight manager/night auditor in charge at night. [SINGLE SOURCE: Wikipedia "Hotel manager" R57]
- Locks: guest-room doors may be key-locked from outside but always open manually from inside. [SINGLE SOURCE: ADB R27]

### 11.8 Museum / archive
- Zoning: separate public spaces from back-of-house; lock non-public rooms; secure stores on their own alarm zone; compartmentalise so intruders cross several barriers; keep critical assets away from external walls and limit knowledge of strongroom locations; strongroom doors to LPS 1175 C5/D10; keys never leave the premises and live in a safe; limit alarm codes/fobs. [SINGLE SOURCE: ARA security guidance R33 - UK professional body]
- Alarms: Grade 3 to BS EN 50131/BS 8243, dual-path signalling to a 24/7 receiving centre; police response depends on availability and can be withdrawn after two false alarms in 12 months. [SINGLE SOURCE: R33]
- Sensors: vibration sensors on display cases and store walls; PIRs and dual-tech in galleries; perimeter beam systems rarely practical for cultural sites. [SINGLE SOURCE: R21]
- Public operations: central reception; lockers; reading/search rooms laid out for invigilator sightlines; CCTV for deterrence/evidence. [SINGLE SOURCE: R33]

### 11.9 Airport back-of-house
- Zones: landside (public, check-in, shops, ground transport) vs airside/sterile area (beyond screening, gates); apron/ramp where aircraft park; Security Identification Display Areas (SIDA) restricted further. Access: passengers with boarding pass, crew with ID, staff with airside pass after background checks; crew are screened too; staff passes cannot be used to fly; restricted areas guarded by physical gates or sensors that alert on entry. [VERIFIED - 2+ sources: Wikipedia "Airport" R58, Wikipedia "Sterile area" R59 (same site - treat as one source; landside/airside split is widely documented) -> SINGLE SOURCE strictly]

### 11.10 Embassy (US model)
- After the 1985 Inman Report: walled compounds, greater setback from public streets, avoid busy streets and shared buildings, limit windows, full US control of the site; concern about neighbouring buildings enabling eavesdropping. [SINGLE SOURCE: Wikipedia "Inman Report" R60]
- Interior: Marine Security Guard detachments (minimum seven plus a commander) guard the interior of the building and classified material, under the Regional Security Officer. [SINGLE SOURCE: Wikipedia "Marine Security Guard" R61]

### 11.11 Casino
- Security split into a patrolling physical security force and a separate surveillance department running CCTV ("eye in the sky"); some casinos have ceiling catwalks with one-way glass over tables and slots; rules of conduct (e.g. card players keep cards visible); cameras on tables, seats, halls, restaurants and lifts; surveillance staff in a separate room steer cameras toward suspects. [VERIFIED - 2+ sources: Wikipedia "Casino" R62, Wikipedia "Eye in the sky (camera)" R63 (same site)]
- Count room / cage procedures not sourced. [Gap]

### 11.12 Rail depot
- Traction maintenance depots house, refuel and maintain locomotives/trains, with workshops for day-to-day repairs (major overhauls at separate works); modern depots give access to undersides (pits) and upper bodies; stabling/fuelling points hold trains overnight or between duties. In the UK some depots are run by train manufacturers under contract. [SINGLE SOURCE: Wikipedia "Traction maintenance depot" R64]
- Security and shift patterns not sourced. [Gap]

### 11.13 Security intensity comparison (synthesis)
| Facility | Primary asset | Typical layering | Response model | Basis |
|---|---|---|---|---|
| Office tower | people, data, documents | reception, card zones, alarmed after hours | ARC -> keyholder/guard -> police | R27, R31-R33, R37 |
| Data centre | uptime, data | fence, bollards, mantrap, biometrics, cabinet locks, guards | on-site guards | R45, R11 |
| BSL-3/4 lab | containment | controlled access, interlocked doors, isolated zone | on-site; entries logged | R49, R50 |
| Substation | grid function | fence, motion sensors, SCADA alarms | remote; long response | R55, R56 |
| Port | cargo, ships | ISPS plans, three security levels | PFSO/SSO, authorities | R53, R54 |
| Museum/archive | collections | zoned stores, strongrooms, Grade 3 alarm | ARC; police subject to availability | R33 |
| Airport airside | aviation security | screening, passes, SIDA | on-site police/security | R58, R59 |
| Embassy | staff, classified material | walled setback compound, interior Marines | on-site guards | R60, R61 |
| Casino | cash, game integrity | dense CCTV, separate surveillance dept, floor security | on-site | R62, R63 |
[Table is a synthesis of the cited rows - design inference]

## 12. Gaps
- Web search budget for the session ran out partway through this file; remaining topics were filled only from known authoritative URLs fetched directly. Not covered as a result: US police alarm response time statistics, UK NPCC alarm policy text, ASIS guidelines (members-only), NFPA 101/IBC text (ICC site 403/paywalled), US GSA/ISC Appendix B countermeasures (FOUO), CPNI/NPSA CCTV and mantrap guidance pages, typical delivery schedules, shift patterns for hospitals/rail depots/ports, casino count-room procedures, real-world corridor widths, floor-to-floor heights and ceiling-void depths.
- Many facility profiles rest on a single Wikipedia article; treat as baseline, not authority.
- npsa.gov.uk returned 403 directly; content read through the UK Government Web Archive mirror (tnaqa.mirrorweb.com) - dated snapshot April 2026.

## Sources (file 2)
R1 https://tnaqa.mirrorweb.com/ukgwa/20260407052501mp_/https://www.npsa.gov.uk/protecting-your-assets - NPSA principles (read; direct npsa.gov.uk and cpni.gov.uk URLs 403)
R2 .../https://www.npsa.gov.uk/beyond-perimeter-0 - NPSA beyond perimeter (read via same mirror)
R3 .../https://www.npsa.gov.uk/perimeter-0 - NPSA perimeter (read)
R4 .../https://www.npsa.gov.uk/within-site-0 - NPSA within site (read)
R5 .../https://www.npsa.gov.uk/building-0 - NPSA building (read)
R6 .../https://www.npsa.gov.uk/asset-0 - NPSA asset (read)
R7 https://protectuk.police.uk/introduction ; https://www.waterisac.org/tlpclear-uk-national-protective-security-authority-releases-guidance-on-perimeter-security-security-fences-and-gates - (search snippets)
R8 https://news2use.ors.nih.gov/Pages/THE-RISK-MANAGEMENT-PROCESS.aspx - ISC RMP summary (search snippet)
R9 https://cisa.gov/news-events/events/isc-updates-risk-management-process - (search snippet); CISA one-pager PDF FAILED 404
R10 https://idmanagement.gov/laws-policies-standards/risk-management-process-for-federal-facilities - (search snippet)
R11 https://en.wikipedia.org/wiki/Mantrap_(access_control) - (read)
R12 https://open-exam-prep.com/study-guides/exin-cdcp/fire-protection-physical-security/layered-physical-security-access-control - (search snippet)
R13 https://www.boonedam.com/en-us/mantrap-security-doors - manufacturer (read)
R14 https://technicalguidelines.ubc.ca/guidelines/281600-Intrusion_Detection_UBCV.pdf - UBC Technical Guidelines Intrusion Detection, Nov 2025 (read in full)
R15 https://csrc.nist.gov/glossary/term/no_lone_zone ; https://csrc.nist.gov/glossary/term/two_person_integrity - NIST glossary citing CNSSI 4009 (read / snippet)
R16 https://en.wikipedia.org/wiki/Two-person_rule - (read)
R17 https://nuke.fas.org/guide/usa/doctrine/usaf/91010400.pdf - AFI 91-104 (search snippet)
R18 https://sandbox-ccbg.helpjuice.com/office-security/977763-vault-access - bank policy page (search snippet)
R19 https://www.securitysales.com/news/sargent-greenleaf-digital-vault-lock/93785/ - (search snippet)
R20 https://patents.google.com/patent/US4643010A - time lock patent (search snippet)
R21 https://www.archives.org.uk/security-guidance/appendix-7-intruder-sensor-selection - ARA (read)
R22 https://callmc.com/modern-intrusion-detection-sensors/ ; https://open-exam-prep.com/study-guides/ca-ab-abst/alarm-systems/types-of-alarm-sensors - (search snippets)
R23 https://democracy.somersetwestandtaunton.gov.uk/documents/s18670/Appendix%204%20-%20Somerset%20Policing%20District%20Surveillance%20Camera%20Systems%20Within%20Licensed%20Premises%20Operati.pdf - police CCTV OR guidance (read)
R24 https://www.ifsecglobal.com/installers/cctv-guide-setting-objectives-requirements/ - (FAILED 403; snippet)
R25 https://whitepapers.axis.com/download/wp_pixel_density_based_on_iec_62676_4_2014_t10176489_pl_2604.pdf - Axis whitepaper (read; Polish-language edition)
R26 https://www.cctvdesigntool.com/blog/dori-standard-cctv/ ; https://vigi.com/gr/support/faq/4098 - (search snippets)
R27 https://assets.publishing.service.gov.uk/media/6aa3bb7492e72b8ac437f145/AD_B2_2026.pdf - Approved Document B Vol 2 (read egress sections)
R28 https://www.osha.gov/sites/default/files/publications/emergency-exit-routes-factsheet.pdf - OSHA (read)
R29 https://www.access-board.gov/ada/ - 2010 ADA Standards (read sections 304, 307, 403, 404, 504, 505)
R30 https://assets.publishing.service.gov.uk/media/60d5bdcde90e07716f516cfd/Approved_Document_K.pdf - Approved Document K (read stair sections)
R31 https://en.wikipedia.org/wiki/Security_alarm - (read via API)
R32 https://www.archives.org.uk/security-guidance/appendix-9-example-opening-and-closing-procedure - (read)
R33 https://www.archives.org.uk/security-guidance/security-guidance - ARA main guidance (read first 100k chars)
R34 https://www.omnigo.com/article/understanding-checkpoint-options-digital-guard-tour-system - (read intro)
R35 https://www.trackforce.com/resources/blog-articles/enterprise-guard-tour-systems-with-nfc-integration-what-security-leaders-need-to-know/ - (search snippet)
R36 https://www.parim.co/features/security-guard-tour-system-for-patrols - (search snippet)
R37 https://en.wikipedia.org/wiki/Crime_prevention_through_environmental_design - (read via API)
R38 https://phoenix.gov/nsdsite/Documents/BUSINESS%20CPTED.pdf (FAILED 404 on fetch); https://files.lasvegasnevada.gov/public-safety/CLV CPTED-Handbook-2022.pdf ; https://chandlerazpd.gov/wp-content/uploads/2025/07/CPTED-Handbook-2025-1.pdf ; https://tustinca.org/399/Crime-Prevention-Through-Environmental-D ; https://www.calgary.ca/cps/Documents/CPTED-brochure.pdf - (search snippets)
R39 https://en.wikipedia.org/wiki/Emergency_exit - (read via API)
R40 https://en.wikipedia.org/wiki/Crash_bar - (read via API)
R41 https://en.wikipedia.org/wiki/Core_(architecture) - (read via API)
R42 https://en.wikipedia.org/wiki/Mechanical_floor - (read via API)
R43 https://en.wikipedia.org/wiki/Plenum_space - (read)
R44 https://en.wikipedia.org/wiki/Loading_dock - (read via API)
R45 https://en.wikipedia.org/wiki/Data_center - (read via API)
R46 https://www.archives.org.uk/security-guidance/appendix-10-example-access-control-procedure - (read)
R47 https://uptimeinstitute.com/tiers - (read)
R48 https://en.wikipedia.org/wiki/Hospital - (read via API)
R49 https://www.cdc.gov/training/quicklearns/biosafety/ - CDC (read via WebFetch; curl 403)
R50 https://en.wikipedia.org/wiki/Biosafety_level - (read)
R51 https://www.cdc.gov/labs/bmbl/index.html - BMBL 6th ed. landing page (read)
R52 https://en.wikipedia.org/wiki/Container_terminal - (read via API)
R53 https://www.imo.org/en/OurWork/Security/Pages/SOLAS-XI-2%20ISPS%20Code.aspx - IMO (read)
R54 https://en.wikipedia.org/wiki/International_Ship_and_Port_Facility_Security_Code - (read via API)
R55 https://en.wikipedia.org/wiki/Electrical_substation - (read via API)
R56 https://en.wikipedia.org/wiki/Metcalf_sniper_attack - (read)
R57 https://en.wikipedia.org/wiki/Hotel_manager - (read)
R58 https://en.wikipedia.org/wiki/Airport - (read via API, requested as "Airside")
R59 https://en.wikipedia.org/wiki/Sterile_area - (read)
R60 https://en.wikipedia.org/wiki/Inman_Report - (read)
R61 https://en.wikipedia.org/wiki/Marine_Security_Guard - (read)
R62 https://en.wikipedia.org/wiki/Casino - (read via API)
R63 https://en.wikipedia.org/wiki/Eye_in_the_sky_(camera) - (read)
R64 https://en.wikipedia.org/wiki/Traction_maintenance_depot - (read via API)
Other failed: https://codes.iccsafe.org/content/IBC2021P1/chapter-10-means-of-egress (JS-only page / 403 to WebFetch); https://www.wbdg.org/building-types/* (JS single-page app, no content); https://www.cdc.gov/safe-labs/about/biosafety-levels.html (403); https://www.phe.gov/... (proxy 502); https://en.wikipedia.org/wiki/Museum_security (404 - no such article); Wikipedia API rate-limited (HTTP 429-style text) for several titles (Diplomatic mission, Hotel, Stairs, Security guard, Guard tour patrol system, Server room, Riser, Operating theater, Airport security, Panic hardware, Fire door, Laboratory).
