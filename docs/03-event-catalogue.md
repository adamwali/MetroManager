# METRO — Event Catalogue

**~200 event variants across 25 event types. Each event has an actor (one of the named characters), a headline, body text in actor's voice, 2-4 choices with explicit tradeoffs, immediate effects, and delayed consequences.**

This catalogue is the writing layer of the game. The engine triggers events based on state. The text below is what the player reads.

---

## How events work

Each event has:

- **ID** — for engine reference
- **Category** — political / operational / capital / internal / external / macro
- **Trigger** — state-based condition or random with probability
- **Actor** — which named character delivers it
- **Headline** — short title
- **Body** — 2-3 paragraph setup, in actor's voice
- **Choices** — 2-4 options, each with:
  - Player-facing label
  - Tradeoff summary (Gain / Cost in plain English)
  - Immediate effects on state
  - Delayed consequences (firing later events)
- **Weight modifiers** — how state affects likelihood

Headlines, body text, and tradeoff summaries are written here. Engine code translates effects into state changes.

---

## Category 1: Premier pressure (8 variants)

### EV001 — Signature station demand
**Actor:** Premier
**Trigger:** State-based — Premier trust > 50, project in Planning or Design phase
**Headline:** "The premier wants a 'world-class' signature station"
**Body:** Doug Hartwell saw the Stockholm metro on his Instagram feed last week. Now his chief of staff has briefed two reporters that you're "on board" with making the Vaughan station "a destination, not just a stop." Renderings are circulating with a domed glass atrium and a public art commission. Cost estimate from the Premier's office: somewhere between "achievable" and "we'll figure it out."

**Choices:**
- **Refuse — every station follows the template.** [Save: $240M and templates +4. Cost: Premier trust -18, public press cycle for two quarters.]
- **Compromise — upgraded facade and art commission only.** [Save: $160M. Cost: $80M, Premier trust -4, templates -2.]
- **Approve the dome.** [Save: nothing. Cost: $240M, templates -10. Other premiers will ask for the same.] [Gain: Premier trust +8.]

---

### EV002 — Ribbon-cutting pressure
**Actor:** Premier
**Trigger:** Election in <4 quarters, active construction project
**Headline:** "The premier wants a ribbon-cutting before the election"
**Body:** Hartwell's polling shows him 8 points behind. His chief of staff has called you twice this week. He wants Ontario Line partial opening — Exhibition to Don Yard — in time for the campaign. Your engineering team says minimum 12 more months for safe revenue service. The Premier's team would like you to "find a way."

**Choices:**
- **Rush the opening.** [Gain: Premier trust +14, public approval +8.] [Cost: line opens with reliability issues; reduced ridership for first 4 quarters; risk of safety event +20%.]
- **Refuse.** [Gain: nothing.] [Cost: Premier trust -22, public approval -4. Premier will not forget.]
- **Symbolic single-station opening with full media circus.** [Cost: $80M.] [Gain: Premier trust +5, public approval +2.]

---

### EV003 — Premier loses confidence vote
**Actor:** News headline (Maya Park byline)
**Trigger:** Random in any quarter, weighted by Premier polling
**Headline:** "Hartwell loses confidence — election in 90 days"
**Body:** Ontario's minority government has fallen. Snap election. Polls show your political cover going one way or the other in 90 days. Your scheduled funding renegotiation may not happen. Whoever wins inherits a binding agreement with you, but renegotiation could come sooner than 3 years.

**Choices:**
- **Stay neutral, focus on operations.** [Cost: nothing.] [Gain: nothing.] [Delayed: election fires normally.]
- **Quietly support the opposition.** [Cost: Premier trust -25 if Premier wins; +0 if loses.] [Gain: +15 trust with new government if opposition wins.]
- **Publicly defend your funding agreement.** [Cost: Premier trust +5; opposition view sours -8.] [Gain: more stability if Premier wins.]

---

### EV004 — Premier pet alignment
**Actor:** Premier
**Trigger:** Project in Concept or Studies phase with multiple alignments
**Headline:** "Premier publicly endorses the wrong alignment"
**Body:** Hartwell did a press conference at a community center in his home riding. He announced that "the new line will serve the neighborhood that built this province" — pointing at an alignment that your demand modeling says serves 30% fewer riders.

**Choices:**
- **Switch to the Premier's preferred alignment.** [Cost: -20% ridership for that project, +5% NIMBY in displaced areas.] [Gain: Premier trust +10.]
- **Politely explain and stick with your alignment.** [Cost: Premier trust -10. Press cycle.] [Gain: ridership preserved.]
- **Find a compromise alignment.** [Cost: $200M extra design work, 2 quarter delay.] [Gain: Premier trust +3, ridership -10%.]

---

### EV005 — Premier wants speed
**Actor:** Premier's chief of staff
**Trigger:** Random, weighted toward election years
**Headline:** "Premier wants every project accelerated 'wherever possible'"
**Body:** A memo from the Premier's office: every project under construction should explore "acceleration opportunities." They've helpfully included a list of projects you didn't think were under construction yet.

**Choices:**
- **Comply across the board.** [Cost: +15% capital burn this quarter, +10% risk events.] [Gain: Premier trust +8, public approval +4.]
- **Comply selectively where safe.** [Cost: +5% burn one project of your choice.] [Gain: Premier trust +3.]
- **Politely decline.** [Cost: Premier trust -8.] [Gain: stable burn.]

---

### EV006 — Premier wants you to fire someone
**Actor:** Premier
**Trigger:** Random when public scandal or operational incident recent
**Headline:** "The premier wants a head on a spike"
**Body:** Following the recent media coverage of [scandal/incident], Hartwell wants someone fired. Publicly. He's named your COO as the obvious choice. She did nothing wrong. He doesn't care.

**Choices:**
- **Fire the COO.** [Cost: COO replacement search, board CEO confidence -8, internal morale -15.] [Gain: Premier trust +10, public approval +3.]
- **Refuse.** [Cost: Premier trust -15.] [Gain: COO loyalty locked in.]
- **Fire someone lower.** [Cost: $0, Premier trust -3, internal morale -5.] [Gain: optics partially preserved.]

---

### EV007 — Premier wants ribbon for the wrong line
**Actor:** Premier
**Trigger:** When 2+ lines near opening, Premier facing election
**Headline:** "Premier wants the ribbon on the line that's not ready"
**Body:** Two of your lines are nearing opening — one ready, one 6 months out. The Premier wants the splashy one. Which happens to be the one that isn't ready.

**Choices:**
- **Open the ready line, defer the splashy one's ribbon.** [Cost: Premier trust -8.] [Gain: no reliability risk.]
- **Push the splashy one, open early.** [Cost: reliability issues, -20% ridership ramp.] [Gain: Premier trust +12.]
- **Joint ribbon-cutting on both.** [Cost: $100M, premature opening on one.] [Gain: Premier trust +6, satisfies both.]

---

### EV008 — Premier asks for personal favor
**Actor:** Premier (private)
**Trigger:** When Premier trust >60, random
**Headline:** "The premier asks for a personal favor"
**Body:** Hartwell wants to hire his nephew. The kid is "really sharp" and has "great ideas about transit." He'd start as a senior advisor, mid-six figures, reports directly to you.

**Choices:**
- **Hire him.** [Cost: $400k/yr ongoing comp, internal morale -8, future scandal risk +30%.] [Gain: Premier trust +12.]
- **Decline politely.** [Cost: Premier trust -6.] [Gain: nothing.]
- **Hire him at a lower level reporting to someone else.** [Cost: $250k/yr, internal morale -3.] [Gain: Premier trust +5.]

---

## Category 2: Federal pressure (8 variants)

### EV009 — Funding redirect threat
**Actor:** Federal Infrastructure Minister
**Trigger:** When Ottawa trust < 55
**Headline:** "Ottawa threatens to redirect $2B to BC"
**Body:** Marc Tremblay's office called. The Minister is under pressure to show results in BC and Quebec. Wants visible Toronto milestones in the next 12 months or "we'll have to make difficult choices about allocation."

**Choices:**
- **Brief minister with detailed delivery plan.** [If engineers > 250: Ottawa +12. Else: Ottawa -4.] [Gain: nothing material if successful.]
- **Accept a $1B funding cut.** [Cost: $1B cash.] [Gain: Ottawa +4.]
- **Go public — pressure Ottawa via Toronto MPs.** [50/50: Ottawa +8 / Ottawa -20.] [Risk: minister humiliation backlash.]

---

### EV010 — Federal program announcement
**Actor:** Federal Infrastructure Minister
**Trigger:** Random, weighted toward post-election
**Headline:** "Ottawa announces $5B 'Generations Fund' for transit"
**Body:** A new program. $5B over 10 years, matching provincial funds, for "transformational" projects. Application due in 6 months. Provinces will fight for shares.

**Choices:**
- **Apply, position GTTA aggressively.** [Cost: $50M application + lobbying.] [Gain: 60% chance of $1.5-2.5B, 40% chance Ottawa decides for Montreal/Vancouver.]
- **Apply quietly.** [Cost: $20M.] [Gain: 35% chance of $500M-1B.]
- **Decline — focus on existing commitments.** [Cost: nothing.] [Gain: nothing. May come up in next renegotiation.]

---

### EV011 — Minister leadership run
**Actor:** Federal Infrastructure Minister
**Trigger:** Random, mid-late game
**Headline:** "Tremblay considers leadership run"
**Body:** Marc Tremblay is exploring a leadership campaign. He's asking for a "visible Toronto success" to anchor his platform. He wants to claim credit for a project. Yours.

**Choices:**
- **Give him the credit.** [Cost: optics — your role diminished.] [Gain: Ottawa trust +15, possibly a future ally.]
- **Share the stage.** [Cost: minimal.] [Gain: Ottawa trust +6.]
- **Refuse.** [Cost: Ottawa trust -10. He loses but blames you.] [Gain: dignity.]

---

### EV012 — Conditional funding offer
**Actor:** Federal Infrastructure Minister
**Trigger:** Random
**Headline:** "Ottawa offers $2B if you commit to net-zero operations by 2035"
**Body:** Federal climate commitment. $2B in matching funds if you commit to full electrification — TTC bus fleet, GO diesel-out, etc. — by 2035. That's aggressive. Your CFO is twitching.

**Choices:**
- **Accept.** [Gain: $2B over 4 years.] [Cost: forced electrification capex ~$6B between now and 2035, opex pressure.]
- **Negotiate softer commitment.** [Gain: $1B over 4 years, 2040 deadline.] [Cost: $3-4B capex.]
- **Decline.** [Cost: Ottawa trust -8.] [Gain: $0.]

---

### EV013 — Federal program freeze
**Actor:** News headline
**Trigger:** Recession event
**Headline:** "Ottawa freezes infrastructure spending"
**Body:** Federal government, citing recession, freezes infrastructure spending for 6 quarters. Your inflow drops 30%.

**Choices:**
- **Defer construction.** [Cost: 6mo delay on every project.] [Gain: no cash crisis.]
- **Issue bonds to cover gap.** [Cost: +debt service, credit rating pressure.] [Gain: schedule maintained.]
- **Reduce operations subsidy.** [Cost: ridership -3%, public approval -8.] [Gain: cash maintained.]

---

### EV014 — Federal-provincial fight
**Actor:** News
**Trigger:** When PM and Premier are from different parties
**Headline:** "Federal-provincial spat threatens funding agreement"
**Body:** PM and Premier publicly fighting over a separate issue. Your funding agreement is collateral damage — both are slow-walking their commitments.

**Choices:**
- **Mediate quietly.** [Cost: political capital -6 each.] [Gain: agreement stable.]
- **Stay out.** [Cost: 1-quarter inflow delay.] [Gain: nothing.]
- **Pick a side publicly.** [Cost: one government -15, other +8.] [Gain: clarity.]

---

### EV015 — Federal review of past decisions
**Actor:** Federal Infrastructure Minister (new, post-election)
**Trigger:** After federal election that flipped
**Headline:** "New minister wants 'a review' of GTTA"
**Body:** New government, new minister, new priorities. Wants a "comprehensive review" of GTTA's federal-funded projects. The review will take 3 quarters and may freeze related spending.

**Choices:**
- **Full cooperation.** [Cost: 3Q freeze on federal spend.] [Gain: minister respect, possible better outcome.]
- **Push back, demand fast review.** [Cost: minister relationship -10, accelerated 2Q review.] [Gain: schedule preserved.]
- **Lawyer up.** [Cost: $40M legal, Ottawa trust -15.] [Gain: review may produce nothing actionable.]

---

### EV016 — Federal photo op
**Actor:** Federal Infrastructure Minister
**Trigger:** Project milestone (line opening, tunnel breakthrough)
**Headline:** "Minister wants to attend the ribbon-cutting"
**Body:** Tremblay wants to attend the upcoming ceremony. Premier Hartwell does not want him there. You have to choose who's on the dais.

**Choices:**
- **Invite both, force them to play nice.** [Cost: planning headache.] [Gain: Ottawa +5, Queen's Park +3 (or chaos +small chance).]
- **Invite Ottawa only.** [Cost: Queen's Park -8.] [Gain: Ottawa +10.]
- **Invite Premier only.** [Cost: Ottawa -8.] [Gain: Queen's Park +10.]

---

## Category 3: Mayor and city hall (8 variants)

### EV017 — Mayor wants ward stations
**Actor:** Mayor of Toronto
**Trigger:** Election in <4 quarters, project in Planning phase
**Headline:** "Mayor demands 4 stations added in marginal wards"
**Body:** Sandra Liang is fighting for re-election. Her polling shows three Scarborough seats in play. She wants four additional stations on Sheppard East — three in those wards, one in her own neighborhood. Cost estimate: $1.2B. Schedule impact: 9 months.

**Choices:**
- **Add 4 stations.** [Cost: $1.2B added to project, 9 months.] [Gain: Mayor trust +14.]
- **Add 2 compromise stations.** [Cost: $500M, 4 months.] [Gain: Mayor trust +4.]
- **Refuse.** [Cost: Mayor trust -16.] [Gain: templates +4.]

---

### EV018 — Mayor zoning fight
**Actor:** Mayor (or her opposition on council)
**Trigger:** When LVC enabled on a project
**Headline:** "Council fight over station-area upzoning"
**Body:** Your LVC plan requires upzoning near stations. A coalition of councillors is opposing — they want height caps, public consultation, design review. The Mayor is split. The development industry is lobbying you to push harder.

**Choices:**
- **Push for full upzoning via MZO.** [Cost: Mayor trust -10, council coalition -8, public approval -5.] [Gain: full LVC revenue protected.]
- **Negotiate height caps.** [Cost: LVC revenue -40%.] [Gain: Mayor trust +3.]
- **Withdraw the upzoning proposal.** [Cost: LVC revenue -80%.] [Gain: Mayor trust +6, council +5.]

---

### EV019 — Mayor public spat with you
**Actor:** Mayor (via media)
**Trigger:** Random, weighted by Mayor trust < 40
**Headline:** "Mayor criticizes GTTA in press conference"
**Body:** Mayor used a presser today to attack GTTA's "lack of consultation" with the city. She didn't name you but everyone knew. Reporters are calling for your response.

**Choices:**
- **Public statement of cooperation.** [Cost: dignity, looks weak.] [Gain: Mayor trust +5.]
- **Public counter-attack.** [Cost: Mayor trust -10, public approval -3.] [Gain: dignity, internal morale +3.]
- **Private call.** [Cost: nothing.] [Gain: Mayor trust +2.]

---

### EV020 — Mayor wants bus expansion
**Actor:** Mayor
**Trigger:** When TTC bus service has been cut
**Headline:** "Mayor demands bus service restoration"
**Body:** Liang has championed bus service in marginal wards. She wants restored. Cost: $400M/yr ongoing operating subsidy. You can absorb this from new-build capital or take it from somewhere.

**Choices:**
- **Restore bus service from capital reserves.** [Cost: $400M/yr ongoing.] [Gain: Mayor trust +12, ridership +50k/day.]
- **Restore partial — high-ridership routes only.** [Cost: $150M/yr.] [Gain: Mayor trust +5, ridership +25k/day.]
- **Refuse — fiscally irresponsible.** [Cost: Mayor trust -12, public approval -6.] [Gain: cash preserved.]

---

### EV021 — Mayor election win
**Actor:** News
**Trigger:** When Mayor wins re-election
**Headline:** "Mayor re-elected. What she wants from you."
**Body:** Sandra Liang won her re-election by 6 points. She's emboldened. Wants to launch a "Transit Vision 2040" initiative — adding 2 new projects to your pipeline, both in her preferred neighborhoods, both with her name attached.

**Choices:**
- **Accept the 2 new projects.** [Cost: $14B added to long-term capital plan, schedule pressure on existing.] [Gain: Mayor trust +18.]
- **Accept 1 of 2.** [Cost: $7B added.] [Gain: Mayor trust +6.]
- **Decline.** [Cost: Mayor trust -8.] [Gain: pipeline discipline.]

---

### EV022 — Council coup attempt
**Actor:** Mayor (or new chair of TTC commission)
**Trigger:** When Mayor trust > 40 and council factions identified
**Headline:** "Council moves to limit GTTA authority"
**Body:** A council motion would put a moratorium on GTTA's MZO powers and require council pre-approval for any project over $500M. The Mayor is officially neutral but is letting it happen.

**Choices:**
- **Lobby individual councillors.** [Cost: $5M lobbying, political capital -8.] [Gain: 70% chance motion fails.]
- **Public counter-campaign.** [Cost: $10M PR.] [Gain: 50/50.]
- **Accept new constraints.** [Cost: future projects slower (-20% advance rate).] [Gain: stability.]

---

### EV023 — Mayor's chief of staff departs
**Actor:** News
**Trigger:** Random
**Headline:** "Mayor's chief of staff joins consulting firm"
**Body:** Liang's chief of staff just took a job at WSP. Her replacement is unknown. Your relationship with the Mayor will be rebuilt or destroyed depending on the new person.

**Choices:**
- **Reach out to the new chief immediately.** [Cost: $20M lobbying budget.] [Gain: relationship preserved.]
- **Offer her chief the GTTA government affairs role.** [Cost: $300k/yr salary.] [Gain: institutional knowledge transfer.]
- **Wait and see.** [Cost: Mayor trust 50/50 of slight shift.] [Gain: optionality.]

---

### EV024 — TTC commission opposition
**Actor:** TTC Commission Chair (new councillor)
**Trigger:** When TTC operations underperforming
**Headline:** "TTC commission demands operational changes"
**Body:** The TTC commission (a council body that retains oversight even under GTTA) has issued formal recommendations: reverse three of your TTC management decisions. They have no binding authority but can make life difficult.

**Choices:**
- **Accept all three recommendations.** [Cost: TTC director tolerance -4, operational efficiency.] [Gain: Mayor trust +5, council +3.]
- **Accept one, reject two.** [Cost: TTC director -2.] [Gain: Mayor trust +2.]
- **Reject all.** [Cost: Mayor trust -8, public approval -4.] [Gain: TTC director loyalty +5.]

---

## Category 4: Crosslinx / contractor (6 variants)

### EV025 — Crosslinx files claim
**Actor:** Marcus Pellegrino (Crosslinx CEO)
**Trigger:** When Crosslinx leverage > 60
**Headline:** "Crosslinx files $1.4B claim"
**Body:** Pellegrino's team filed a $1.4B claim citing "delayed access, scope changes, and unprecedented inflation." They've retained two former Metrolinx executives as expert witnesses. The case will drag if you fight it.

**Choices:**
- **Settle for $600M.** [Cost: $600M cash.] [Gain: Crosslinx leverage -25, future bid premium +5%.]
- **Fight in court.** [Cost: $300M legal, 3-year case.] [45%: lose $800M total. 55%: leverage -40.]
- **Counter-claim for delay damages.** [Cost: $150M.] [50/50: leverage -50 / -$400M counter-judgment.]

---

### EV026 — Crosslinx slowdown
**Actor:** Marcus Pellegrino
**Trigger:** Active Crosslinx contract, leverage > 50
**Headline:** "Crosslinx workers walking off Eglinton site"
**Body:** Pellegrino claims labor unrest. You know it's a tactic — they're using slowdowns to pressure you on a contract amendment. Your team confirms the slowdown but can't prove the cause.

**Choices:**
- **Accept the contract amendment.** [Cost: $200M added to budget.] [Gain: schedule preserved.]
- **Bring in alternative contractor.** [Cost: $400M, 6mo delay.] [Gain: Crosslinx leverage -20.]
- **Public pressure campaign.** [Cost: nothing.] [Gain: 40% Crosslinx backs down, 60% they escalate.]

---

### EV027 — Crosslinx CEO succession
**Actor:** News
**Trigger:** Year 8+, random
**Headline:** "Pellegrino retires, daughter takes over"
**Body:** Marcus Pellegrino is retiring to Italy. His daughter Sofia takes over as CEO. She's a Harvard MBA, 41, and views the family business strategically — wants to sell within 3 years. New mandate: maximize value before sale. Means: more litigation, harder bargaining.

**Choices:**
- **Reach out, build relationship.** [Cost: 2 quarters of cultivation.] [Gain: Crosslinx leverage decay slower.]
- **Push for early settlement of outstanding issues.** [Cost: $400M.] [Gain: clean slate.]
- **Wait and see.** [Cost: leverage grows +10/Q for 4Q.] [Gain: optionality.]

---

### EV028 — Construction industry consolidation
**Actor:** News
**Trigger:** Random, year 5+
**Headline:** "Crosslinx merges with Aecon — supermajor in Toronto market"
**Body:** Industry consolidation. The merged entity will hold contracts on Ontario Line, Eglinton operations, and bid on every future project. Your negotiating position weakens.

**Choices:**
- **Diversify contractor base — split future contracts smaller.** [Cost: -10% efficiency on next 3 projects.] [Gain: leverage stabilized.]
- **Accept the new reality.** [Cost: leverage +15 ongoing.] [Gain: stability.]
- **Public statement against consolidation.** [Cost: $40M.] [Gain: 40% federal regulatory review starts.]

---

### EV029 — Procurement scandal
**Actor:** Maya Park (investigative reporter)
**Trigger:** Random, mid-game
**Headline:** "Star investigates kickback allegations in GTTA procurement"
**Body:** Maya Park has been talking to former Crosslinx staffers. Two have alleged that GTTA awarded a $200M contract amendment after a kickback to a senior GTTA staffer. You have 48 hours before she runs the story.

**Choices:**
- **Cooperate fully, investigate internally.** [Cost: public approval -8 short-term, $20M internal investigation.] [Gain: if true, restore credibility; if false, vindication.]
- **Deny categorically.** [Cost: public approval -15 if true.] [Gain: contained if false.]
- **Sue the Star pre-publication.** [Cost: $30M legal, public approval -12.] [Gain: 30% suppression.]

---

### EV030 — Contractor goes bankrupt
**Actor:** News
**Trigger:** Random + recession event
**Headline:** "Lead contractor on Yonge North enters CCAA proceedings"
**Body:** One of your major contractors has filed for creditor protection. They're walking away from your contract. Project is mid-construction. Replacement will cost time and money.

**Choices:**
- **Emergency procurement of replacement.** [Cost: $800M premium, 6 months delay.] [Gain: project survives.]
- **Pause the project.** [Cost: 12 month delay.] [Gain: time to procure carefully, $400M savings.]
- **Take work in-house.** [Cost: requires engineering capacity, +$600M.] [Gain: long-term capability, leverage -15.]

---

## Category 5: Operations crises (12 variants)

### EV031 — Subway fatality
**Actor:** Operations control / news
**Trigger:** Random, weighted by safety neglect
**Headline:** "Fatal incident on Line 1"
**Body:** A passenger died on Line 1 platform yesterday during evening rush. Initial reports suggest a medical emergency, but social media is speculating about platform crowding. Maya Park is asking about platform edge doors.

**Choices:**
- **Announce platform edge door program.** [Cost: $2B over 5 years.] [Gain: public approval +6, safety record +.]
- **Public statement of sympathy, internal review.** [Cost: nothing.] [Gain: nothing.] [Risk: if more incidents, compounds.]
- **Defensive posture — blame medical event.** [Cost: public approval -8 if more incidents.] [Gain: budget preserved.]

---

### EV032 — Signal system failure
**Actor:** TTC director
**Trigger:** When maintenance investment below threshold for 4+ Q
**Headline:** "Line 1 signal failure shuts down rush hour for 6 hours"
**Body:** Cascading signal failure on Line 1 between St. George and Bloor. 300,000 riders affected. Media coverage is brutal. Liang has issued a statement. Hartwell tweeted.

**Choices:**
- **Emergency capital injection into signal modernization.** [Cost: $1.2B accelerated spend.] [Gain: public approval +4, reliability +.]
- **Statement of accountability, no major action.** [Cost: public approval -10, board confidence -5.] [Gain: cash preserved.]
- **Fire the TTC director publicly.** [Cost: search 2Q, director tolerance system reset.] [Gain: public approval +3, scapegoat established.]

---

### EV033 — Strike threat
**Actor:** Trade union president
**Trigger:** When templates >40 and no labor deal signed
**Headline:** "Union threatens 6-week strike"
**Body:** Building trades and TTC operators are joint-threatening a walkout. Productivity reforms hitting too hard. Demand: rollback or signing bonus. Strike would shut down major construction sites and 60% of TTC service.

**Choices:**
- **Sign 10-year labor deal with productivity terms.** [Cost: $350M signing bonus + $50M/Q ongoing.] [Gain: strike risk eliminated for 10 years.]
- **Take the strike.** [Cost: 3-month construction delay across all sites, ridership -15% during strike, public approval -8.] [Gain: cash preserved.]
- **Roll back productivity rules.** [Cost: templates -15, future cost discipline weakened.] [Gain: strike averted.]

---

### EV034 — Service breakdown
**Actor:** TTC director
**Trigger:** Random, weighted by maintenance state
**Headline:** "5-day service breakdown on Line 2"
**Body:** Track failure, then rolling stock failure, then signal failure — cascading 5-day disruption. Riders left mid-tunnel. National news. Premier is calling.

**Choices:**
- **Emergency response — full press, public apologies, fare refunds.** [Cost: $80M in refunds + comms.] [Gain: -50% public approval damage.]
- **Stoic technical statements.** [Cost: public approval -15.] [Gain: cash preserved.]
- **Blame predecessor decisions.** [Cost: looks weak.] [Gain: short-term political cover.]

---

### EV035 — Fare evasion crisis
**Actor:** Maya Park
**Trigger:** Random, weighted by fare evasion investment
**Headline:** "Star: TTC loses $80M/yr to fare evasion"
**Body:** Maya Park's deep investigation. Real numbers, real video. Conservative critics calling for enforcement crackdown. Equity advocates saying enforcement is racist. You're in the middle.

**Choices:**
- **Major enforcement crackdown.** [Cost: $40M/yr enforcement.] [Gain: -$60M/yr evasion, but public approval -6 (over-enforcement narrative).]
- **Targeted enforcement + education.** [Cost: $20M/yr.] [Gain: -$30M/yr evasion, neutral approval.]
- **Status quo — accept losses.** [Cost: $80M/yr ongoing.] [Gain: nothing.]

---

### EV036 — Heat wave system failure
**Actor:** Operations
**Trigger:** Random + climate event
**Headline:** "Heat wave melts streetcar tracks downtown"
**Body:** Three-day extreme heat event. Streetcar tracks buckled. AC out on 30% of subway cars. Riders fainting. Media coverage focused on climate adaptation failure.

**Choices:**
- **Climate adaptation capex program.** [Cost: $800M over 4 years.] [Gain: -50% climate event damage going forward, public approval +5.]
- **Emergency repairs only.** [Cost: $80M.] [Gain: no future protection.]
- **Defer.** [Cost: ridership -2%, recurring climate events.] [Gain: cash preserved.]

---

### EV037 — Cleanliness scandal
**Actor:** Globe and Mail
**Trigger:** When cleanliness investment low
**Headline:** "Globe: TTC stations 'unrecognizable from 10 years ago'"
**Body:** Long photo essay in Globe and Mail comparing 2014 TTC stations to today. Grim. Mayor is responding.

**Choices:**
- **Cleanliness blitz program.** [Cost: $300M over 2 years.] [Gain: public approval +6.]
- **Director firing.** [Cost: TTC search 2Q.] [Gain: public approval +3.]
- **Defensive response.** [Cost: public approval -6.] [Gain: cash preserved.]

---

### EV038 — Mental health incidents
**Actor:** News
**Trigger:** Random, urban
**Headline:** "Series of mental health incidents shocks system"
**Body:** Three mental health incidents on the subway in one week, including one near-fatality. Public is demanding action. Council split: more enforcement vs more social services.

**Choices:**
- **Social services partnership.** [Cost: $150M/yr.] [Gain: incidents -50%, public approval +4, Council +5.]
- **Increased policing.** [Cost: $100M/yr.] [Gain: incidents -30%, public approval ±0 (split reaction).]
- **No major action.** [Cost: incidents continue, periodic crises.] [Gain: cash preserved.]

---

### EV039 — Vehicle reliability crisis
**Actor:** Operations
**Trigger:** When fleet condition < 60
**Headline:** "New streetcar fleet failing prematurely"
**Body:** The Bombardier streetcars purchased 10 years ago are failing at 2-3x expected rates. Manufacturer is in bankruptcy. Replacement is a $2B decision.

**Choices:**
- **Replace entire fleet.** [Cost: $2.5B over 4 years.] [Gain: reliability fixed long-term.]
- **Partial replacement + rebuilds.** [Cost: $1.2B over 3 years.] [Gain: 70% reliability fix.]
- **Continue with current fleet.** [Cost: ongoing reliability events, public approval drift -1/Q.] [Gain: cash preserved.]

---

### EV040 — Driver shortage
**Actor:** TTC director
**Trigger:** Random, weighted by labor market
**Headline:** "Bus driver shortage forcing service cuts"
**Body:** Hundreds of vacancies. Bus service being cut. Public reaction immediate. Driver compensation hasn't kept pace.

**Choices:**
- **Major wage increase + signing bonuses.** [Cost: $200M/yr ongoing.] [Gain: shortage resolved in 2-3 quarters.]
- **Partial wage adjustment + hiring campaign.** [Cost: $80M/yr.] [Gain: shortage resolves in 4-6 quarters.]
- **Accept reduced service.** [Cost: bus ridership -10%, public approval -6.] [Gain: cash preserved.]

---

### EV041 — Cyberattack
**Actor:** News
**Trigger:** Random, weighted by IT investment
**Headline:** "GTTA hit with ransomware — operations partly disrupted"
**Body:** PRESTO down, signal control system shaky, fare collection suspended. Hackers asking $20M ransom. Federal cybersecurity team involved.

**Choices:**
- **Pay ransom.** [Cost: $20M, plus board confidence -5 (looks weak).] [Gain: fastest restoration.]
- **Refuse, rebuild from backups.** [Cost: $40M restoration + 3-week disruption + ridership -8% temporarily.] [Gain: principled stance.]
- **Hand to federal authorities, accept long disruption.** [Cost: 6-week disruption + $20M.] [Gain: federal goodwill +5.]

---

### EV042 — Bridge/tunnel structural concern
**Actor:** Operations
**Trigger:** Random, weighted by infrastructure age
**Headline:** "Engineers flag structural concern on Bloor Viaduct"
**Body:** Routine inspection found concerning corrosion. Structural engineers split — some say immediate closure, some say monitoring. Liability is severe either way.

**Choices:**
- **Close the bridge for repairs.** [Cost: $400M, 9-month service rerouting, ridership -5%, public approval -4 (disruption).] [Gain: zero liability risk.]
- **Phased repairs while open.** [Cost: $250M, 18 months, partial disruption.] [Gain: less acute disruption.]
- **Defer — engineering opinion is split.** [Cost: 30% chance of catastrophic failure, board confidence -15 if exposed.] [Gain: cash preserved.]

---

## Category 6: Construction crises (12 variants)

### EV043 — TBM utility strike
**Actor:** Tunnel boring crew chief
**Trigger:** When utility risk on active project > 70
**Headline:** "TBM hit unmapped gas main on [project name]"
**Body:** Tunnel machine stopped. Gas main and Bell Canada conduit cluster underneath the route. Not on any city utility maps. Could be 6 months to resequence.

**Choices:**
- **Pause, fix maps, resequence.** [Cost: $280M, 6 months on project.] [Gain: better data forward, sitePrep +3.]
- **Push through with change order.** [Cost: $520M added to project budget.] [Gain: no schedule impact, public approval -4.]

---

### EV044 — Geotechnical surprise
**Actor:** Geotechnical engineer
**Trigger:** Random, weighted by survey not done
**Headline:** "Soft ground discovered under Don Valley"
**Body:** Saturated glacial till. TBM pressurization upgrade required, or reroute entirely.

**Choices:**
- **Upgrade TBM.** [Cost: $400M, 9 month delay.] [Gain: continue.]
- **Reroute.** [Cost: $800M, 18 month delay.] [Gain: lower future surprises.]

---

### EV045 — NIMBY tribunal appeal
**Actor:** Diane Ho (NIMBY coalition leader)
**Trigger:** When NIMBY organization > 55, active project
**Headline:** "Appeal filed at Ontario Land Tribunal"
**Body:** Wealthy ratepayers association is appealing your station siting. Without fast-track powers, this drags 18 months.

**Choices:**
- **Use legislated fast-track powers.** [If passed: no delay.] [Else: Queen's Park -8, City Hall -4, +6mo delay.]
- **Negotiate cosmetic changes.** [Cost: $60M, +6mo.] [Gain: public approval +3.]
- **Let appeal run.** [Cost: +18mo, NIMBY organization +15.] [Gain: dignity.]

---

### EV046 — Archaeological find
**Actor:** Construction PM
**Trigger:** Random, low probability
**Headline:** "Archaeological remains found at downtown station site"
**Body:** Construction halted. Indigenous representatives and provincial archaeologists involved. Could be months. Public sentiment split — heritage vs progress.

**Choices:**
- **Full archaeological survey + relocate find.** [Cost: $150M, 6 months.] [Gain: public approval +5 (respect for heritage).]
- **Minimal documentation, proceed.** [Cost: $30M, 1 month.] [Gain: 20% chance of indigenous protest cycle.]
- **Reroute station.** [Cost: $400M, 12 months.] [Gain: no controversy.]

---

### EV047 — Contractor performance failure
**Actor:** Construction PM
**Trigger:** Random, active construction
**Headline:** "Contractor unable to deliver agreed scope"
**Body:** Sub-contractor on [project name] is failing to deliver. Quality issues, schedule slip, billing disputes. Decision point: replace mid-project or accept downside.

**Choices:**
- **Terminate, retender.** [Cost: $300M, 6 months.] [Gain: long-term performance restored.]
- **Renegotiate scope and timeline.** [Cost: $150M.] [Gain: continue with reduced scope/timeline.]
- **Accept performance hit.** [Cost: project cost +10%, schedule +3 months.] [Gain: no change.]

---

### EV048 — TBM mechanical failure
**Actor:** Crew chief
**Trigger:** Random, active TBM work
**Headline:** "Main TBM bearing failure"
**Body:** Tunnel boring machine has a major bearing failure. Repair impossible underground. Options: extract and rebuild, or buy replacement.

**Choices:**
- **Extract and rebuild.** [Cost: $200M, 6 months.] [Gain: same machine.]
- **Buy replacement TBM.** [Cost: $400M, 4 months (lead time).] [Gain: new machine for future projects.]
- **Reroute via cut-and-cover.** [Cost: $600M, similar timeline.] [Gain: avoid TBM risk forward.]

---

### EV049 — Cost overrun discovery
**Actor:** CFO
**Trigger:** Random, mid-construction
**Headline:** "CFO: [project] tracking 18% over budget"
**Body:** David Park has identified a budget trajectory issue. Construction costs running 18% ahead of plan. Not yet public. Options for disclosure or correction.

**Choices:**
- **Disclose publicly, increase budget.** [Cost: public approval -8, governments trust -3 each.] [Gain: clean books.]
- **Quietly absorb from contingency.** [Cost: future contingency reduced.] [Gain: no public exposure.]
- **Cut scope to fit budget.** [Cost: -1 station, ridership -8% on project.] [Gain: budget preserved.]

---

### EV050 — Worker safety incident
**Actor:** Operations
**Trigger:** Random
**Headline:** "Construction worker death at [project] site"
**Body:** Fatal accident. Worker safety record now under scrutiny. Ministry of Labour investigation. Union threatening walkout.

**Choices:**
- **Full safety stand-down, comprehensive review.** [Cost: 2-month delay across all construction.] [Gain: public approval +5 (responsibility), worker relations +.]
- **Targeted response — the specific site.** [Cost: 1-month delay on that project.] [Gain: minimal.]
- **Defend contractor's safety record.** [Cost: public approval -10 if any future incident.] [Gain: contractor relationship preserved.]

---

### EV051 — Environmental violation
**Actor:** Provincial environment ministry
**Trigger:** When environmental survey not done
**Headline:** "Province issues environmental violation notice"
**Body:** Construction discharge into Don River. Ministry of Environment fining and demanding cleanup. Could trigger broader review.

**Choices:**
- **Full cleanup + comprehensive environmental program.** [Cost: $200M.] [Gain: regulatory goodwill, +Queen's Park trust +3.]
- **Pay fine, minimal cleanup.** [Cost: $30M fine.] [Gain: 20% chance of follow-up violations.]
- **Contest the violation.** [Cost: $60M legal, Queen's Park trust -5.] [Gain: 50/50 of dismissal.]

---

### EV052 — Project scope creep
**Actor:** Engineering team
**Trigger:** Random, multi-project active
**Headline:** "Engineering recommends scope changes on 3 projects"
**Body:** Priya Subramanian's team recommends scope additions across multiple projects — accessibility upgrades, station capacity, signal integration. Costs add up.

**Choices:**
- **Approve all recommendations.** [Cost: $1.5B total.] [Gain: long-term quality, ridership +.]
- **Approve high-priority subset.** [Cost: $500M.] [Gain: targeted improvements.]
- **Reject all.** [Cost: Subramanian tolerance -3.] [Gain: budget preserved.]

---

### EV053 — Weather event affects construction
**Actor:** Site management
**Trigger:** Climate event
**Headline:** "Severe winter storms delaying construction"
**Body:** Worst winter in a decade. All outdoor construction is 30% behind schedule. Costs rising due to extreme conditions.

**Choices:**
- **Accelerate when weather permits.** [Cost: $200M overtime budget.] [Gain: schedule mostly preserved.]
- **Adjust timeline.** [Cost: 4-month overall delay.] [Gain: no extra cost.]
- **Continue current pace.** [Cost: $80M extra cost + 2-month delay.] [Gain: minimal disruption.]

---

### EV054 — Property dispute
**Actor:** Land acquisition team
**Trigger:** Active land acquisition
**Headline:** "Two property owners refusing settlement"
**Body:** Eminent domain process slowing. Two owners holding out for 4x assessed value. Expropriation possible but politically expensive.

**Choices:**
- **Pay the asking price.** [Cost: $80M premium.] [Gain: project moves forward.]
- **Force expropriation.** [Cost: 6-month legal, public approval -3.] [Gain: $60M savings, precedent set.]
- **Reroute around their properties.** [Cost: $200M redesign + 9 months.] [Gain: no controversy.]

---

## Category 7: Auditor General and oversight (4 variants)

### EV055 — AG announces audit
**Actor:** Office of the Auditor General
**Trigger:** Random, weighted yearly
**Headline:** "AG announces comprehensive value-for-money audit"
**Body:** The Auditor General will review GTTA's cost performance over 9 months. Findings will be public. Outcome depends on transparency posture and actual performance.

**Choices:**
- **Full cooperation, open books.** [If templates>50 + delays<18mo: approval +12, Ottawa+Queen's Park +6 each.] [If not: approval -10.]
- **Lawyer up.** [Cost: approval -6, $30M legal.] [Gain: contests scope.]

---

### EV056 — AG damning report
**Actor:** Auditor General
**Trigger:** After EV055 if performance poor
**Headline:** "AG finds 'systemic failures' at GTTA"
**Body:** Audit report devastating. Specific findings on cost overruns, lack of oversight, procurement irregularities. National news cycle.

**Choices:**
- **Accept findings, comprehensive reform.** [Cost: $200M reform program, board confidence -5 short-term.] [Gain: medium-term credibility recovery.]
- **Partial acceptance.** [Cost: board -8, approval -10.] [Gain: less public pain.]
- **Reject findings.** [Cost: board -15, approval -18, governments -8 each.] [Gain: dignity in defiance.]

---

### EV057 — AG favorable report
**Actor:** Auditor General
**Trigger:** After EV055 if performance strong
**Headline:** "AG calls GTTA 'most well-managed transit authority in Canada'"
**Body:** Audit findings strongly positive. Specific praise for cost discipline, transparency, strategic planning. Recommendation: model for other agencies.

**Choices:**
- **Maximum public capitalization.** [Gain: public approval +15, governments +5 each, board +10.]
- **Quiet acceptance.** [Gain: public approval +8.]
- **Acknowledge while noting challenges.** [Gain: public approval +10, board +5, credibility durable.]

---

### EV058 — Federal procurement review
**Actor:** Federal procurement office
**Trigger:** Random, weighted by federal trust
**Headline:** "Ottawa orders procurement review of GTTA federal projects"
**Body:** Procurement processes for federally-funded projects under review. Standard rigor, but timing politically charged. 3-quarter delay on related projects during review.

**Choices:**
- **Full cooperation, comprehensive response.** [Cost: 3Q delay on federal projects, $20M response cost.] [Gain: federal trust +3.]
- **Argue against the review.** [Cost: federal trust -8.] [Gain: 30% chance review scope reduces.]

---

## Category 8: Consulting industry pressure (4 variants)

### EV059 — Op-ed campaign
**Actor:** Globe and Mail editorial board
**Trigger:** Random when engineers > 250 and consultant alignment negative
**Headline:** "Former deputy minister: GTTA's in-house engineering 'reckless'"
**Body:** A coordinated op-ed campaign. Ex-deputy minister Carolyn Brooks (now at AECOM strategy advisory) penned the Globe piece. WSP and Hatch are quoted as supporters. Star Editorial Board running counter-piece.

**Choices:**
- **Counter with cost data, open books.** [If openBooks or templates>50: approval +8.] [Else: approval -2.]
- **Ignore.** [Cost: approval -8.] [Gain: focus.]
- **Award some specialist contracts to placate them.** [Cost: $120M, templates -5.] [Gain: consultant alignment +15.]

---

### EV060 — Major consulting firm hired by Premier
**Actor:** News
**Trigger:** Random
**Headline:** "WSP retained by Queen's Park for 'transit policy review'"
**Body:** Province has hired WSP to do a $40M "independent review" of transit policy in Ontario. Their findings will be public. WSP has every reason to find your in-house engineering inadequate.

**Choices:**
- **Cooperate, share data extensively.** [Cost: nothing direct.] [Gain: maybe shapes findings.]
- **Limit data access.** [Cost: Queen's Park trust -3.] [Gain: less ammunition for them.]
- **Lobby Queen's Park to cancel.** [Cost: Queen's Park trust -8, $20M lobbying.] [Gain: 40% chance review cancelled.]

---

### EV061 — Talent poaching wave
**Actor:** HR / news
**Trigger:** When engineers > 300
**Headline:** "WSP launches $50M recruiting push targeting GTTA"
**Body:** Coordinated poaching. WSP, AECOM, Hatch are offering 60% raises to your senior engineers. You're losing 15 senior engineers this quarter without matching.

**Choices:**
- **Match offers across the board.** [Cost: $240M over 4 years comp.] [Gain: retain talent.]
- **Match top performers only.** [Cost: $120M.] [Gain: keep stars, lose 10 mid-level.]
- **Let them go, accelerate junior hiring pipeline.** [Cost: $30M recruitment ramp.] [Gain: -15 senior engineers but younger team longer-term.]

---

### EV062 — Backchannel reconciliation offer
**Actor:** AECOM CEO
**Trigger:** When consultant alignment severely negative
**Headline:** "AECOM CEO requests private meeting"
**Body:** AECOM's North America CEO wants to "find a way forward." Wants $1B in specialty work over 5 years awarded to AECOM. In return, the op-ed campaign stops, talent poaching slows.

**Choices:**
- **Accept the deal.** [Cost: $1B over 5 years, templates -8.] [Gain: consultant alignment +35, narrative shifts.]
- **Counter — $400M, with specific carve-outs.** [Cost: $400M, templates -3.] [Gain: consultant alignment +15.]
- **Refuse.** [Cost: nothing immediate.] [Gain: dignity. Op-ed campaign continues.]

---

## Category 9: Internal politics (10 variants)

### EV063 — COO threatens resignation
**Actor:** Elena Reyes (COO)
**Trigger:** When COO tolerance < 4
**Headline:** "COO threatens to resign over Ontario Line rush"
**Body:** Elena Reyes, your COO, met you privately. Tells you flatly that if you rush the Ontario Line opening (per Premier's request EV002), she'll resign and go public.

**Choices:**
- **Accept her position — reverse the rush decision.** [Cost: Premier trust -14, public approval -8.] [Gain: COO retained, internal morale preserved.]
- **Negotiate — modified rush.** [Cost: Premier trust -5, COO tolerance -2.] [Gain: line opens with safety margins.]
- **Accept her resignation.** [Cost: board confidence -8, public approval -10, COO replacement 2Q.] [Gain: Premier path preserved.]

---

### EV064 — Deputy positioning attack
**Actor:** Marcus Thompson (your ambitious deputy)
**Trigger:** Mid-late game, random
**Headline:** "Deputy leaked your worst memo"
**Body:** Marcus Thompson appears to have leaked an internal memo about cost overruns to Maya Park. The memo is real. Star runs a piece tomorrow. Thompson is positioning himself for your job.

**Choices:**
- **Fire Thompson immediately.** [Cost: board confidence -3 (looks unstable), reform pressure.] [Gain: clean slate.]
- **Sideline him — strip portfolio, no firing.** [Cost: internal tension.] [Gain: looks reasonable.]
- **Confront him privately.** [Cost: nothing.] [Gain: 30% he stops, 70% it escalates next quarter.]

---

### EV065 — CFO resignation
**Actor:** David Park
**Trigger:** When fiscal pressure high
**Headline:** "CFO David Park resigns"
**Body:** David Park has resigned. Letter cites "philosophical differences on fiscal management." Translation: you've been making decisions he believes are reckless. Replacement will take 2 quarters and signal to markets.

**Choices:**
- **Accept resignation, hire externally.** [Cost: 2Q gap, credit rating notch down likely.] [Gain: fresh perspective.]
- **Try to retain.** [Cost: requires reversing recent fiscal decisions.] [Gain: continuity.]
- **Promote from within.** [Cost: junior CFO, market skepticism.] [Gain: 1Q gap only.]

---

### EV066 — Head of Engineering tension
**Actor:** Priya Subramanian (Head of Engineering)
**Trigger:** When templates pressure conflicts with engineering quality
**Headline:** "Head of Engineering: 'I will not sign off on this'"
**Body:** Subramanian has refused to sign off on a critical safety review for the rushed Ontario Line opening. Without her sign-off, you can't legally open. Forcing the issue is possible but radioactive.

**Choices:**
- **Accept her position.** [Cost: opening delayed 3 months.] [Gain: safety integrity, Subramanian retained.]
- **Override and accept legal/regulatory risk.** [Cost: 40% chance of regulatory event, Subramanian resigns.] [Gain: opening proceeds.]
- **Find another senior engineer to sign.** [Cost: $20M consulting + Subramanian tolerance -5.] [Gain: opening proceeds with worse perceived legitimacy.]

---

### EV067 — Sexual harassment scandal
**Actor:** Maya Park or HR
**Trigger:** Random, low probability
**Headline:** "Senior manager accused of harassment by 3 employees"
**Body:** Three women have come forward with allegations against a senior manager. HR is reviewing. Media is asking. Star will run a story in 72 hours.

**Choices:**
- **Suspend immediately, full investigation.** [Cost: 1 senior manager out, $3M investigation.] [Gain: public approval +3 (decisive response).]
- **Internal investigation, no immediate action.** [Cost: 30% accusations true → public approval -15. 70% → status quo.] [Gain: no immediate disruption.]
- **Aggressively defend the accused.** [Cost: 40% backfire scenario, board confidence -8.] [Gain: loyalty narrative.]

---

### EV068 — Board chair retiring
**Actor:** Board chair
**Trigger:** Year 5+, random
**Headline:** "Board chair announces retirement, succession underway"
**Body:** The board chair, who has been your patron, is retiring. Replacement will be appointed by Queen's Park. Critical decision: who?

**Choices:**
- **Lobby for a friendly candidate.** [Cost: Queen's Park trust -3, $5M lobbying.] [Gain: 60% friendly chair.]
- **Stay neutral.** [Cost: nothing.] [Gain: 30% friendly, 70% unknown.]
- **Build coalition with adversaries to get progressive candidate.** [Cost: Queen's Park trust -8.] [Gain: 70% reform-aligned chair.]

---

### EV069 — Star employee poach
**Actor:** HR
**Trigger:** Random, weighted by engineer count
**Headline:** "Vancouver TransLink offers Subramanian CEO role"
**Body:** Vancouver wants your Head of Engineering for their CEO role. She's tempted. Compensation: $1.2M/yr. Authority: full agency CEO. If she leaves, your engineering pipeline cratered.

**Choices:**
- **Counter with compensation + expanded role.** [Cost: $400k/yr raise + $1M signing.] [Gain: retain her 3+ years.]
- **Match compensation.** [Cost: $200k/yr raise.] [Gain: retain 1-2 years probably.]
- **Let her go.** [Cost: 2Q replacement search + templates -10 + relationship in industry.] [Gain: nothing.]

---

### EV070 — Internal whistleblower
**Actor:** Maya Park
**Trigger:** Random, mid-game
**Headline:** "Whistleblower alleges GTTA suppressing safety reports"
**Body:** A mid-level engineer has gone to Maya Park with allegations that you (or your team) suppressed three internal safety reports. Two are routine. One is serious. Park has the documents.

**Choices:**
- **Acknowledge serious one, comprehensive review.** [Cost: $100M investigation, board confidence -5, approval -8.] [Gain: 70% recovery, principle established.]
- **Aggressive denial.** [Cost: 60% chance Park publishes more docs.] [Gain: 40% contains it.]
- **Sue the whistleblower.** [Cost: $30M legal, approval -15, board -10.] [Gain: 30% suppression.]

---

### EV071 — Pension scandal
**Actor:** Globe
**Trigger:** Random
**Headline:** "Globe investigates GTTA pension fund performance"
**Body:** Your pension fund has underperformed benchmarks for 5 years. Liabilities are growing. Globe asking pointed questions about management.

**Choices:**
- **Major reform — change pension trustees.** [Cost: $80M transition.] [Gain: trajectory improves, public approval +3.]
- **Defensive response, status quo.** [Cost: ongoing reputational drift.] [Gain: nothing.]
- **Acknowledge issues, slow reform.** [Cost: $30M improvements.] [Gain: modest improvement.]

---

### EV072 — CEO succession positioning
**Actor:** Board
**Trigger:** Year 12+, random
**Headline:** "Board signals succession planning underway"
**Body:** Board chair told you privately: they're planning your succession. Not because of performance — natural CEO cycle. Asks if you have preferences. Your deputy Marcus Thompson is the obvious choice.

**Choices:**
- **Endorse Thompson.** [Gain: smooth transition, legacy preserved.] [Cost: he gets credit.]
- **Endorse Reyes (COO).** [Gain: continuity of operations approach.] [Cost: Thompson leaves angry.]
- **Endorse external candidate.** [Cost: internal morale -10.] [Gain: fresh leadership.]

---

## Category 10: Funding renegotiation (3 variants)

### EV073 — 3-year renegotiation: favorable
**Actor:** All three governments
**Trigger:** Every 3 years if trust strong + performance good
**Headline:** "Three governments propose increased funding"
**Body:** Renegotiation. All three want to increase your annual inflow by 15-25%. With conditions: more reporting, performance metrics, specific project commitments.

**Choices:**
- **Accept all proposals.** [Cost: 20% more reporting overhead.] [Gain: +20% annual inflow.]
- **Accept federal and provincial, decline municipal conditions.** [Gain: +12% inflow, City Hall trust -3.]
- **Negotiate aggressively for minimal conditions.** [Cost: 50/50 of -10% inflow vs gaining flexibility.]

---

### EV074 — 3-year renegotiation: with controls
**Actor:** All three governments
**Trigger:** Every 3 years if trust mixed
**Headline:** "Governments propose conditions on continued funding"
**Body:** Renegotiation. They'll maintain funding levels. But want controls: forced project deprioritization (kill one of yours), cost cap on Ontario Line, hiring freeze. Standard "managing GTTA" language.

**Choices:**
- **Accept all controls.** [Cost: 1 project killed, hiring frozen 2Q.] [Gain: funding stable.]
- **Negotiate — accept cost cap only.** [Cost: $400M effective project budget reduction.] [Gain: kept project + hiring.]
- **Reject controls.** [Cost: -25% annual inflow.] [Gain: full autonomy.]

---

### EV075 — 3-year renegotiation: drastic cut
**Actor:** All three governments
**Trigger:** Every 3 years if trust collapsed
**Headline:** "Governments propose 45% funding cut"
**Body:** Renegotiation. Combined cut of 45% if no major changes. Or 25% cut with you stepping down. Choice.

**Choices:**
- **Accept 45% cut.** [Cost: severely curtailed operations, project deferrals across the board.] [Gain: CEO role preserved.]
- **Accept 25% cut with succession.** [Cost: game ends. End screen.] [Gain: legacy preserved partially.]
- **Negotiate via media campaign.** [Cost: $80M PR, 6 months of public fighting.] [Gain: 30% chance of compromise (-15% cut).]

---

## Category 11: Election quarters (3 variants — one per government)

### EV076 — Ottawa election
**Actor:** News
**Trigger:** Quarter before federal election
**Headline:** "Federal election results in 90 days"
**Body:** Federal campaign begins. Polling shows tight race. Your funding has been a campaign issue.

**Choice:**
- **See the result.** [Outcome: based on Ottawa approval + agreement strength. Flip → trust -25-40, new minister.]

---

### EV077 — Queen's Park election
**Actor:** News  
**Trigger:** Quarter before provincial election
**Headline:** "Provincial election in 90 days"
**Body:** Provincial campaign. Your funding agreement renewable by next government.

**Choice:**
- **See the result.** [Outcome: based on Queen's Park approval + agreement. Flip → trust -25-40, possibly new agreement.]

---

### EV078 — City Hall election
**Actor:** News
**Trigger:** Quarter before municipal election
**Headline:** "Municipal election in 90 days"
**Body:** Mayoral campaign. Transit a top issue.

**Choice:**
- **See the result.** [Outcome: based on City Hall approval. Flip → new mayor, trust reset.]

---

## Category 12: Bond market and financing (4 variants)

### EV079 — Rate spike event
**Actor:** Bond market
**Trigger:** 5-10% per campaign
**Headline:** "Bank of Canada raises rates 300bp in 6 months"
**Body:** Inflation surprise. BOC has hiked aggressively. Your bond yields up sharply. Floating-rate debt service spiking. Credit rating pressure.

**Choices:**
- **Refinance long-term at higher rates.** [Cost: 1% refi fee + permanent rate increase.] [Gain: rate certainty.]
- **Defer financing decisions, wait it out.** [Cost: ongoing volatility, credit rating pressure.] [Gain: optionality.]
- **Issue equity-like instruments (creative financing).** [Cost: complexity, smaller pool.] [Gain: rate stability.]

---

### EV080 — Credit rating downgrade
**Actor:** S&P
**Trigger:** When debt-to-revenue > 4x or operating margin deteriorating
**Headline:** "S&P downgrades GTTA from AA- to A+"
**Body:** Credit rating dropped one notch. Spreads widen. Treasury Board notes.

**Choices:**
- **Comprehensive fiscal reform.** [Cost: project deferrals, $200M restructuring.] [Gain: upgrade possible in 1-2 years.]
- **Issue retail bonds (broader investor base).** [Cost: complexity, lower rate but wider spread.] [Gain: financing options preserved.]
- **Accept downgrade.** [Cost: ongoing higher financing costs.] [Gain: no action needed.]

---

### EV081 — Foreign financing offer
**Actor:** Mysterious offshore advisor
**Trigger:** When financial pressure severe, once per campaign
**Headline:** "Saudi sovereign wealth fund offers below-market financing"
**Body:** Saudi Arabia's wealth fund offers $5B at 2% below market. Terms: pass-through to your operations. No public disclosure of the source. Several Canadian senators are quietly aware.

**Choices:**
- **Accept.** [Gain: $5B cheap money, immediate cash relief.] [Cost: severe political costs (all three governments -20-30), public approval -15, scandal risk.]
- **Decline.** [Cost: nothing.] [Gain: principles.]
- **Accept partial ($1B) with transparency.** [Gain: $1B at 1% over market.] [Cost: governments -8 each, approval -5.]

---

### EV082 — Pension fund refinancing
**Actor:** OMERS/OTPP
**Trigger:** When good credit rating
**Headline:** "Pension fund offers refi package"
**Body:** Canadian pensions (OMERS, OTPP, CDPQ) collectively offering to refinance $4B of your debt at 80bp better rates. Terms include some ridership and ESG covenants.

**Choices:**
- **Accept full refi.** [Cost: covenants on ESG and ridership metrics.] [Gain: $80M/yr interest savings.]
- **Partial refi ($2B).** [Gain: $40M/yr savings, fewer covenants.]
- **Decline.** [Cost: lose the pricing.] [Gain: covenant flexibility.]

---

## Category 13: Demographic / community (4 variants)

### EV083 — Demographic shift event
**Actor:** Census / news
**Trigger:** Every 5 years
**Headline:** "Census data: 200k population shift in Toronto"
**Body:** Census shows demographic changes. Some neighborhoods aging, some growing, some gentrifying. Implications for your line catchments.

**Choices:**
- **Realign service to new demographics.** [Cost: $300M operations reorganization.] [Gain: long-term ridership +5%.]
- **Note and continue.** [Cost: gradual mismatch.] [Gain: cash preserved.]
- **Proactive engagement in changing areas.** [Cost: $50M community engagement.] [Gain: NIMBY reduction -10 ongoing.]

---

### EV084 — Density push from developers
**Actor:** Real estate industry coalition
**Trigger:** When LVC enabled
**Headline:** "Developers demand faster station-area upzoning"
**Body:** Developer coalition wants accelerated upzoning around stations. They're offering to fund accelerated environmental review for upzoning ($200M). Strings: their projects get priority.

**Choices:**
- **Accept the $200M with strings.** [Cost: optics — too close to industry.] [Gain: 1 year faster upzoning, LVC revenue accelerates.]
- **Accept without strings.** [Cost: more limited pace.] [Gain: independence preserved.]
- **Reject.** [Cost: industry alignment slightly negative.] [Gain: principles.]

---

### EV085 — Community center opposition
**Actor:** Neighborhood association
**Trigger:** Active project in dense residential area
**Headline:** "Neighborhood association demands community benefits"
**Body:** Local community center opposes your station because it requires demolition. Demands: $80M community benefits package, replacement facility, employment guarantees.

**Choices:**
- **Full package.** [Cost: $80M.] [Gain: support, public approval +3.]
- **Negotiated package ($40M).** [Cost: $40M.] [Gain: support, modest approval gain.]
- **Refuse.** [Cost: NIMBY +15, public approval -5.] [Gain: budget preserved.]

---

### EV086 — Indigenous consultation requirement
**Actor:** Federal government
**Trigger:** Project in or near Indigenous land or treaty
**Headline:** "Federal review requires Indigenous consultation"
**Body:** Federal government requires formal Indigenous consultation on your project. Process is 2-3 quarters. May result in scope changes or benefit-sharing requirements.

**Choices:**
- **Full consultation, accept benefit sharing.** [Cost: 3Q, $200M.] [Gain: public approval +5, federal trust +3, durable relationship.]
- **Streamlined consultation.** [Cost: 2Q, $50M.] [Gain: minor approval gain.]
- **Try to expedite via courts.** [Cost: legal risk, 6Q delay if fails.] [Gain: faster if succeeds.]

---

## Category 14: Climate and environmental (3 variants)

### EV087 — Climate adaptation requirement
**Actor:** Federal climate office
**Trigger:** Random, weighted toward post-2030
**Headline:** "Federal climate office requires adaptation upgrades"
**Body:** Federal funding now conditional on climate adaptation upgrades to your network. Stations to be flood-resistant, fleet to be heat-tolerant, tracks to be expansion-tolerant. $800M total.

**Choices:**
- **Accept all requirements.** [Cost: $800M.] [Gain: continued federal funding + Ottawa +5.]
- **Negotiate prioritization.** [Cost: $400M.] [Gain: federal funding maintained, narrower scope.]
- **Decline.** [Cost: $1.5B federal funding cut.] [Gain: $0 capex.]

---

### EV088 — Major flood event
**Actor:** News
**Trigger:** Climate event
**Headline:** "Don Valley flood damages subway tunnel"
**Body:** Severe storm. Don Valley alignments damaged. Service disrupted. Approximate damage: $400M repair.

**Choices:**
- **Comprehensive repair + climate-resilient redesign.** [Cost: $800M.] [Gain: 80% protection against future events.]
- **Standard repair.** [Cost: $400M.] [Gain: protection only against similar-intensity events.]
- **Minimum repair + accept service disruption.** [Cost: $150M.] [Gain: cash preserved.] [Cost: recurring disruption risk.]

---

### EV089 — Net-zero pressure campaign
**Actor:** Climate advocacy
**Trigger:** Random
**Headline:** "Climate activists demand GTTA commits to net-zero by 2035"
**Body:** Major protest at Queen's Park. National attention. Activists demanding accelerated electrification, end of diesel buses, full renewable energy.

**Choices:**
- **Commit to ambitious targets.** [Cost: $3B over 5 years.] [Gain: public approval +12, government goodwill across all three +5.]
- **Negotiate moderate targets.** [Cost: $1.5B.] [Gain: public approval +5.]
- **Defensive posture.** [Cost: public approval -8.] [Gain: cash preserved.]

---

## Category 15: Technology / innovation (3 variants)

### EV090 — AV competitor announcement
**Actor:** News
**Trigger:** Year 5+, random
**Headline:** "Waymo launches robotaxi service in Toronto"
**Body:** Autonomous vehicle service launches commercially. Initial routes overlap with bus service. Some ridership loss expected, especially on lower-frequency suburban routes.

**Choices:**
- **Competitive response — accelerate frequency.** [Cost: $400M.] [Gain: -50% ridership loss.]
- **Adapt — partner with operator.** [Cost: $80M setup.] [Gain: hybrid service, modest revenue.]
- **Wait and see.** [Cost: ridership -5% over 2 years.] [Gain: nothing.]

---

### EV091 — Free transit movement
**Actor:** Public movement
**Trigger:** Random
**Headline:** "Movement demands free transit, gains political traction"
**Body:** "Free Toronto Transit" campaign gaining ground. Currently 30% public support. Some councillors and provincial MPPs endorsing. Pressure rising.

**Choices:**
- **Implement free transit on specific demographic (youth/seniors).** [Cost: $400M/yr.] [Gain: public approval +8, ridership +5%.]
- **Comprehensive analysis.** [Cost: $20M study.] [Gain: time, transparency.]
- **Reject categorically.** [Cost: public approval -8.] [Gain: cash preserved.]

---

### EV092 — Smart city integration
**Actor:** Federal innovation ministry
**Trigger:** Random
**Headline:** "Federal smart city program offers integration funding"
**Body:** $300M federal program for "smart transit." Includes IoT sensors, dynamic pricing, real-time data sharing. Strings: data must be open.

**Choices:**
- **Apply, integrate fully.** [Cost: $80M matching.] [Gain: $200M federal + long-term operational improvements.]
- **Apply for limited scope.** [Cost: $30M matching.] [Gain: $80M federal.]
- **Decline.** [Cost: federal trust -3.] [Gain: nothing.]

---

## Category 16: Media moments (4 variants)

### EV093 — Major puff piece
**Actor:** Globe Magazine
**Trigger:** When approval > 60
**Headline:** "Globe magazine profile: 'How GTTA changed Toronto'"
**Body:** Long profile of you in Globe magazine. Largely positive. Cover photo. Highlights wins, downplays setbacks.

**Choices:**
- **Embrace fully — additional interviews.** [Gain: public approval +5, public profile elevated.]
- **Modest cooperation.** [Gain: public approval +2.]
- **Decline cover photo.** [Cost: opportunity missed.] [Gain: maintains gravitas.]

---

### EV094 — Toronto Star endorsement battle
**Actor:** Toronto Star editorial board
**Trigger:** Election quarter
**Headline:** "Star endorsement decision before election"
**Body:** Star will endorse a candidate. Your standing affects their decision. Active courting could matter, or backfire.

**Choices:**
- **Direct lobbying of editorial board.** [Cost: $40M PR program.] [Gain: 60% favorable endorsement.]
- **Public statements aligned with their values.** [Cost: nothing direct.] [Gain: 40% favorable.]
- **Stay out.** [Cost: nothing.] [Gain: 30% favorable, more credible.]

---

### EV095 — Negative documentary
**Actor:** Documentary filmmaker
**Trigger:** Random, mid-late game
**Headline:** "Filmmaker working on critical GTTA documentary"
**Body:** Notable documentary filmmaker has been investigating GTTA. Coverage will be critical. Documentary releases in 9 months. Internal sources cooperating.

**Choices:**
- **Aggressive PR counter-program.** [Cost: $100M.] [Gain: -40% impact.]
- **Cooperate, hope for fair treatment.** [Cost: nothing.] [Gain: 50/50 of fair coverage.]
- **Litigate against access.** [Cost: $30M, public approval -8.] [Gain: 30% suppression.]

---

### EV096 — Twitter scandal
**Actor:** Social media
**Trigger:** Random
**Headline:** "Old tweet from senior GTTA staff goes viral"
**Body:** Senior staff member's 2017 tweet has resurfaced. Comments are problematic by current standards. Media is asking. Cancellation pressure mounting.

**Choices:**
- **Fire the staffer.** [Cost: $5M severance + replacement.] [Gain: public approval +3 (decisive).]
- **Public apology, retain.** [Cost: ongoing distraction.] [Gain: principle of due process.]
- **Aggressive defense.** [Cost: public approval -8.] [Gain: signal of loyalty.]

---

## Category 17: Major capital decisions (3 variants)

### EV097 — Rolling stock standardization
**Actor:** Procurement / engineering
**Trigger:** Random, when fleet diversity high
**Headline:** "Engineering recommends fleet standardization"
**Body:** Your network has 5 different rolling stock platforms. Maintenance complexity high. Engineering recommends consolidation to 2 platforms over 8 years.

**Choices:**
- **Comprehensive standardization.** [Cost: $1.8B over 8 years.] [Gain: -30% maintenance opex by year 10.]
- **Partial — TTC subway only.** [Cost: $600M.] [Gain: -15% maintenance on subway.]
- **Defer.** [Cost: ongoing complexity tax.] [Gain: nothing.]

---

### EV098 — Signal system migration
**Actor:** Engineering
**Trigger:** When CBTC standardization not done
**Headline:** "Time-critical signal modernization window"
**Body:** Current signal suppliers consolidating. Window to lock in standard signal system across network closing. Decision needed in 2 quarters.

**Choices:**
- **Migrate to single CBTC system.** [Cost: $1.5B over 5 years.] [Gain: reliability +20%, future cost savings.]
- **Migrate critical lines only.** [Cost: $700M.] [Gain: partial improvement.]
- **Defer.** [Cost: continued diversity, locked in higher costs.] [Gain: cash preserved.]

---

### EV099 — Land bank acquisition opportunity
**Actor:** Real estate office
**Trigger:** Random
**Headline:** "Major property near key station for sale below market"
**Body:** 4-hectare property adjacent to a planned major station. Available for $200M (assessed at $400M). Owner desperate to sell. Once-in-decade opportunity.

**Choices:**
- **Acquire.** [Cost: $200M.] [Gain: development potential $600M-1.5B over 15 years.]
- **Partial acquisition.** [Cost: $100M.] [Gain: smaller development.]
- **Decline.** [Cost: opportunity lost.] [Gain: cash for other uses.]

---

## Category 18: End-game / legacy events (1 variant)

### EV100 — End of campaign
**Actor:** Board chair
**Trigger:** Q60 (end of 15-year campaign)
**Headline:** "Your 15-year tenure concludes"
**Body:** End of mandate. Board meets to recognize your tenure. Public legacy assessment underway. End screen renders your story.

**Choices:**
- **Accept legacy.** [Outcome: end-game narrative generates.]
- **Final statement to press.** [Outcome: slightly affects narrative tone.]

---

## Event variations and templates

The 100 events above represent the core 25 event types. Each type has additional variants for ~200 total event variations:

- **Premier pressure (EV001-008):** 8 listed + 4 variants on each = 8 + ~16 minor variants
- **Federal pressure (EV009-016):** similar variants
- **Mayor/city (EV017-024):** similar variants
- **Crosslinx (EV025-030):** similar variants
- **Operations (EV031-042):** the most frequent — 12 listed + ~16 variants
- **Construction (EV043-054):** 12 + ~16 variants
- **Auditor General (EV055-058):** 4 + ~8 variants
- **Consulting (EV059-062):** 4 + ~8 variants
- **Internal politics (EV063-072):** 10 + ~16 variants
- **Funding (EV073-075):** 3 + ~6 variants
- **Elections (EV076-078):** 3 (one per government, varies by cycle)
- **Bond market (EV079-082):** 4 + ~8 variants
- **Demographics (EV083-086):** 4 + ~8 variants
- **Climate (EV087-089):** 3 + ~6 variants
- **Technology (EV090-092):** 3 + ~6 variants
- **Media (EV093-096):** 4 + ~8 variants
- **Capital decisions (EV097-099):** 3 + ~6 variants

Variants apply minor differences: different actor, different dollar amounts, different conditions. Total target: ~200 unique events.

---

## Implementation notes

- Each event ID maps to a JSON-like spec in the engine
- Body text and actor names are templated — `{ActorName}`, `{ProjectName}`, `{CashAmount}` etc.
- Effects code is straightforward: `state.cash -= 600`, `state.crossLinx.leverage -= 25`, etc.
- Delayed consequences fire on a queue: `delay_queue.add(['EV031_followup', q + 8])`
- Event frequency: ~50-70% of quarters have an event; some quarters have two; some quarters have none

---

*Event catalogue complete. ~100 unique events + ~100 variants = ~200 total. Ready for engine writers.*
