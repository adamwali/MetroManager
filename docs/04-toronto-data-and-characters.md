# METRO — Toronto Data + Character Bios

**Real Toronto operating data, the 44-neighborhood demographic spec, and detailed bios for the 12 named characters with sample dialogue.**

This is the layer that makes the game feel real to the audience that knows real numbers.

---

## Part 1: Real Toronto operating data (Q1 2026 starting state)

### TTC budgetary baseline

**Source basis:** 2024-25 TTC budget book, scaled forward.

**Annual operating budget (FY2026):**
- Operating expenses: $2.7B
- Operating revenue (fares + advertising): $1.4B
- Operating subsidy (City of Toronto + Province): $1.3B
- Capital budget (annual recurring): $2.8B
- State-of-Good-Repair backlog: ~$33B

**Subway ridership (2026 projected, post-Eglinton/Finch opening):**
- Line 1 (Yonge-University): ~890k daily
- Line 2 (Bloor-Danforth): ~720k daily
- Line 4 (Sheppard): ~50k daily
- Line 5 (Eglinton, just opened, reliability issues): ~140k daily ramping
- Line 6 (Finch West, opened Dec 2025): ~25k daily

**Bus ridership (2026):**
- 150 routes operating
- ~1.4M daily riders (down from 1.8M pre-pandemic)
- Average frequency: 12-15 min (degraded from 8-10 min pre-pandemic)
- Driver shortage: 8% vacancy rate
- Fleet: 1,950 buses (47% accessible, 32% hybrid/electric, 21% diesel)

**Streetcar ridership (2026):**
- 12 routes
- ~280k daily riders
- Fleet: 204 Bombardier Flexity streetcars (aging, reliability issues emerging)

**Fare structure (current):**
- Adult fare: $3.30 single (PRESTO), $3.75 cash
- Concession (youth/senior): $2.30
- 12 transfers allowed, 2-hour transfer window
- Day pass: $13.50
- Monthly pass: $156

### GO Transit operating data

**Annual budget:**
- Operating expenses: $1.4B
- Fare revenue: $920M
- Operating subsidy: $480M
- Capital budget: $3.2B (heavy due to RER electrification)

**Corridor ridership (2026):**
- Lakeshore West: ~120k daily
- Lakeshore East: ~95k daily
- Kitchener: ~28k daily
- Stouffville: ~22k daily
- Barrie: ~30k daily
- Milton: ~25k daily
- Richmond Hill: ~14k daily

**Electrification status:**
- Lakeshore West: in progress, target 2027 (delayed)
- Lakeshore East: in progress, target 2027
- Other corridors: studies/early planning

**Fare structure:**
- Zone-based, $4-15 typical
- Average fare: ~$7.50
- Heavy peak-skew (75% of trips in peak hours)

### UP Express

**Annual budget:**
- Operating expenses: $98M
- Fare revenue: $58M
- Subsidy: $40M

**Ridership:**
- ~12k daily
- Heavily airport-driven
- 30-minute frequency
- $12.85 base fare

### Capital projects inherited

**Ontario Line:**
- Budget: $27B
- Spent: $9B
- 21% physical completion
- Target opening: Q4 2031
- Lead contractor: Crosslinx (consortium: ACS, Aecon, EllisDon, SNC-Lavalin)
- Risk profile: significant utility risk, geotechnical complexity through Don Valley

**Eglinton Crosstown (Line 5):**
- Opened Feb 2026
- Final cost: $13B (originally $5B in 2011)
- Reliability issues: signal failures, train availability ~85% (target 95%)
- Current operator: Crosslinx (under disputed contract)

**Finch West (Line 6):**
- Opened Dec 2025
- Final cost: $2.5B
- Vehicle issues: Alstom Citadis manufacturer support issues
- Ridership ramping slower than projected

### Total inherited debt

- ~$8.2B outstanding
- Weighted average coupon: 4.2%
- Maturity profile: laddered, average duration 8.4 years
- Current credit rating: AA- (S&P), Aa3 (Moody's)
- Annual debt service: ~$700M

### Starting demographics

- Toronto City population: 2.95M
- Greater Toronto Area: 6.7M
- Median household income (Toronto): $84k
- Median household income (GTA): $97k
- Daily commuters into Toronto: ~1.1M
- Mode share: car 64%, transit 25%, walk/cycle 11%

---

## Part 2: 44-neighborhood demographic spec

Each neighborhood used in the engine for:
- Per-station catchment population
- Income-weighted fare elasticity
- Voter pattern aggregation for political simulation
- LVC valuation by district
- NIMBY exposure modeling

### Structure for each neighborhood

- ID (e.g., "downtown_core")
- Name (e.g., "Downtown Core")
- Population (2026 estimated)
- Median household income
- Age distribution (% under 35, 35-65, over 65)
- Transit dependence index (0-100, how reliant on transit)
- Voter pattern (federal, provincial, municipal — Lib/Con/NDP/Grn breakdown)
- Density (people per km²)
- Current rapid transit access (% within 800m of subway/LRT/GO)
- Future LVC potential (low/medium/high/very high)
- NIMBY propensity (low/medium/high)
- Growth trajectory (declining/stable/growing/booming)

### The 44 neighborhoods

**Downtown (4):**
1. Downtown Core (King-Bay-Bloor) — pop 95k, median $145k, high density, fed/prov/mun all Liberal, very high LVC
2. South Core / Waterfront — pop 75k, median $135k, growing, Liberal, very high LVC
3. Old Toronto East (St Lawrence, Distillery) — pop 65k, median $125k, growing, Liberal, very high LVC
4. Old Toronto West (Liberty, King West) — pop 70k, median $128k, growing, Liberal, very high LVC

**Old Toronto (8):**
5. Annex — pop 28k, median $115k, mixed age, Liberal stronghold, medium LVC
6. Yorkville — pop 8k, median $185k, older, Liberal, very high LVC
7. Kensington-Chinatown — pop 32k, median $68k, young, NDP, medium LVC
8. Cabbagetown / St James Town — pop 40k, median $48k (mixed), young/mixed, NDP/Liberal split
9. Riverside / Leslieville — pop 38k, median $95k, gentrifying, Liberal/NDP, high LVC
10. The Junction — pop 22k, median $88k, gentrifying, NDP, medium-high LVC
11. Roncesvalles — pop 18k, median $108k, NDP, high LVC
12. Bloor West Village — pop 24k, median $110k, Liberal, medium LVC

**West End (6):**
13. Parkdale — pop 36k, median $52k (high inequality), NDP, low-medium LVC
14. High Park — pop 28k, median $98k, Liberal, medium-high LVC
15. Bloor-Danforth West (Dundas West, Junction Triangle) — pop 32k, median $78k, NDP, medium LVC
16. Etobicoke Lakeshore — pop 65k, median $82k, Liberal, medium LVC
17. Etobicoke Centre (Islington, Kingsway) — pop 88k, median $115k, Liberal, medium LVC
18. Rexdale / North Etobicoke — pop 95k, median $58k, Liberal, low-medium LVC

**North York (8):**
19. Yonge-Eglinton — pop 45k, median $112k, Liberal/Con, high LVC
20. Lawrence Park — pop 22k, median $185k, Con, medium LVC (height resistance)
21. Don Mills / Banbury — pop 38k, median $108k, Con/Liberal, medium-high LVC
22. Bayview Village — pop 28k, median $125k, Con, high LVC
23. Willowdale — pop 92k, median $85k, Liberal, very high LVC (transit-rich)
24. North York Centre — pop 105k, median $78k, Liberal, very high LVC
25. Bathurst Manor / Clanton Park — pop 28k, median $98k, Liberal/Con, medium LVC
26. Black Creek / Jane-Finch — pop 78k, median $52k, NDP/Liberal, low-medium LVC

**East End / East York (5):**
27. East York / Pape Village — pop 42k, median $88k, Liberal/NDP, medium LVC
28. Beaches — pop 32k, median $108k, Liberal, medium LVC
29. Danforth East — pop 38k, median $82k, NDP/Liberal, medium-high LVC
30. Riverdale — pop 28k, median $105k, NDP/Liberal, medium-high LVC
31. Crescent Town / Woodbine — pop 22k, median $58k, NDP, low-medium LVC

**Scarborough (8):**
32. Scarborough Bluffs — pop 65k, median $85k, Liberal, medium LVC
33. Scarborough Junction / Kennedy — pop 88k, median $62k, Liberal/NDP, medium LVC
34. Scarborough Town Centre — pop 92k, median $68k, Liberal, very high LVC
35. Agincourt — pop 75k, median $72k, Liberal/Con, medium-high LVC
36. Malvern — pop 68k, median $58k, Liberal/NDP, low-medium LVC
37. Highland Creek / UTSC — pop 42k, median $78k, Liberal, medium LVC
38. Cliffside / Birch Cliff — pop 32k, median $82k, Liberal, medium LVC
39. Guildwood / West Hill — pop 38k, median $72k, Liberal, low-medium LVC

**York / Outer (5):**
40. Weston / Mount Dennis — pop 42k, median $58k, NDP/Liberal, medium LVC (Pearson access)
41. York Centre (Lawrence West / Caledonia) — pop 38k, median $62k, NDP, medium LVC
42. Forest Hill — pop 18k, median $195k, Con, low-medium LVC (height resistance)
43. Davenport / Earlscourt — pop 32k, median $78k, NDP/Liberal, medium LVC
44. Mount Pleasant Road / Davisville — pop 28k, median $115k, Liberal, medium LVC

### How demographic data is used in-engine

**Per project announcement:**
- Catchment population = sum of populations within 800m of each station
- Average income weights fare elasticity for that line
- NIMBY exposure = weighted sum of neighborhood NIMBY propensities
- LVC max revenue = sum of station LVC potentials
- Voter pattern = aggregated for political effect

**Per quarter:**
- Demographic drift updates incrementally (gentrification, aging, growth)
- Some neighborhoods grow 1-3% per year, others decline
- Income changes affect both fare elasticity and political composition

---

## Part 3: Character bios with sample dialogue

### Political characters

#### Doug Hartwell — Premier of Ontario

**Age:** 58
**Background:** Former regional councillor in suburban GTA. Self-made small business owner before politics. Married, 3 adult children. Lives in a sprawling suburban home.

**Personality:** Populist, attention-seeking, allergic to bad headlines, weak on policy detail, strong on communication. Carries a deep-seated resentment of Toronto downtown elites. Easily flattered. Surprisingly loyal once you've helped him politically. Prone to making statements without consulting anyone, then sticking to them.

**Current goals:** Hold seat in next election. Eventually move to federal politics. Be remembered as "the Premier who built things."

**Sample dialogue (from events):**

> "Look, I want to be clear. We're building world-class transit. *World-class.* Not whatever they have in Madrid, not whatever they have in some place in Asia. World-class. And I want the Vaughan station to *feel* world-class. I want my grandkids to come and say, 'wow.' That's not too much to ask. Right?"

> "I respect your team. Best in the business. But the people in Markham — *my people* — they don't care about your spreadsheets. They care about whether the train comes. And whether it's nice when it does."

> "If we get this right, this is bigger than any of us. If we get it wrong... well, let's not get it wrong."

**Personality variant on new game:** Could be replaced by **Sarah Chen** (technocrat, ambitious, married to a senior journalist, strategic) or **David Olafson** (progressive, ideological, former labor lawyer, allergic to compromise).

---

#### Sandra Liang — Mayor of Toronto

**Age:** 52
**Background:** Former Planning Commissioner of Toronto. PhD in urban planning. Single mother, two teenage kids. Lives in Bloor West Village. Came up through the planning ranks, not retail politics.

**Personality:** Technocrat, detail-oriented, conflict-averse, fiscally cautious. Hates surprises. Genuinely cares about urban design. Frustrating to deal with on small things, but reliable on big things. Slow to make decisions, fast to defend them.

**Current goals:** Win re-election in year 3. Be remembered as "the transit mayor." Move to provincial or federal politics in 5-7 years.

**Sample dialogue:**

> "I appreciate the brief. I have three concerns. One: the assumptions on bus ridership recovery are optimistic. Two: I don't see the equity analysis for marginalized wards. Three: the cost-per-rider figures need to be standardized against the 2018 framework. Please revise and resubmit. Two weeks."

> "I want to be very, very clear. We are not building anything that doesn't have a comprehensive equity analysis attached. That's non-negotiable for me and for council."

> "Look. I know it's frustrating that I won't commit publicly yet. But I have to walk the council majority through this. Give me 90 days."

---

#### Marc Tremblay — Federal Infrastructure Minister

**Age:** 47
**Background:** Lawyer. Bilingual francophone from Trois-Rivières. Married to a corporate lawyer in Toronto. Two kids in private school. Lives in Rockcliffe Park, Ottawa, weekends in cottage country.

**Personality:** Ambitious, polished, transactional, secretly contemptuous of provincial politics. Excellent communicator in two languages. Plays the long game. Considering a leadership run. Believes infrastructure is his ticket.

**Current goals:** Position himself for leadership. Build coalition across Quebec and Ontario. Show "results" he can claim.

**Sample dialogue:**

> "Look, I'm going to be straight with you. I have a problem. I have $4 billion committed to Toronto. I have nothing to show for it that I can put on a leaflet in Quebec or BC. I need a milestone. Visible. Soon. Help me help you."

> "*Bien sûr*, we can find a solution. We always find a solution. The question is on what terms. Now, in the spirit of partnership, I have a small ask. Tell me about your bus electrification timeline."

> "I respect Hartwell. He's a good man. But between you and me, he's not going to be there for the long run. I think about who *will* be there. I think about Toronto's interests in the long run."

---

### Internal characters

#### Elena Reyes — COO (your second-in-command)

**Age:** 51
**Background:** Came to Toronto from MTA New York in 2024 after recruitment. Cuban-American, raised in Queens. Career operations leader. Divorced, no kids, lives in a downtown condo. Marathon runner.

**Personality:** Blunt, ruthless on operational standards, no patience for political games. Speaks her mind. Will quit if you compromise safety. Genuinely doesn't care about being liked. Quiet sense of humor with people she trusts.

**Doctrine:** Reliability Engineer

**Current goals:** Run a system she can be proud of. Maybe one day be CEO of MTA. Could go back to New York if Toronto doesn't work out.

**Sample dialogue:**

> "I am not signing off on opening the line in 4 months. Period. The signal system has had three cascade failures in testing. I'm not putting that on revenue service. If you want to push me, I'll resign on the record."

> "I get it. Hartwell wants the photo op. I respect that. He's not going to be the one explaining why a train ran into a tunnel wall at 60 km/h. I am. So no."

> "The bus driver shortage is real. We need 200 more bodies. I've put the request in front of you three times. This is the fourth. Are you reading these?"

---

#### David Park — CFO (your fiscal truth-teller)

**Age:** 46
**Background:** Ex-BMO Capital Markets, project finance. Recruited by you when GTTA stood up. Korean-Canadian, born in Toronto. Married, two young kids. Lives in North York. Father is a retired engineer.

**Personality:** Dry, precise, suspicious of contractors, allergic to bond rating downgrades. Speaks in numbers. Reliable when honest. Sometimes overly cautious. Has a recurring deadpan joke about Excel formulas.

**Doctrine:** Cost Discipline

**Current goals:** Maintain credit rating. Get the financial model right. See the agency stabilize. Quietly hopes to become CEO eventually.

**Sample dialogue:**

> "I want to flag three things. First: we're at 3.8x debt-to-revenue. S&P will downgrade at 4.0x. Second: Crosslinx claim is now provision-eligible. Third: the Ontario Line cost trajectory is running 14% over plan. I have a model. Want to see it?"

> "I understand the political pressure. But the math is what the math is. If we accept the Premier's funding terms with those conditions attached, we lose flexibility for at least 8 quarters. Worth weighing."

> "Look, you asked. I'm telling you. The Saudi deal would be cheap money. It would also be the worst decision you make in your tenure. Don't do it."

---

#### Priya Subramanian — Head of Engineering

**Age:** 49
**Background:** Recruited from Madrid Metro in 2025. Born and raised in Bangalore. PhD from MIT in civil engineering. Married, husband stayed in Madrid for two more years. No kids. Lives in a small condo in Forest Hill.

**Personality:** Meticulous, low-political-tolerance, demands standardization. Speaks softly but holds the line. Loves engineering details. Disgusted by Canadian-style bespoke design. Threatens to resign over scope changes she didn't approve.

**Doctrine:** Engineering Excellence

**Current goals:** Build the engineering capability she came here for. Prove Madrid-style approach works in Toronto. Possibly return to Spain in 5-7 years if it doesn't.

**Sample dialogue:**

> "Why does the Vaughan station require a 'domed atrium'? This adds $80 million. It serves no engineering function. It is decorative. We have 14 stations to deliver. If I approve decorative changes on one, I cannot say no to the next 13. I am asking you to push back."

> "In Madrid, we built 200 km of metro in 8 years. Why? Because we did the same station 200 times. Different art, same engineering. This is not a mystery. The mystery is why this is hard for North America."

> "I will not sign the safety certificate without 90 days of additional testing. You can find another senior engineer to sign it. I will resign and I will write to the regulator. Please do not put me in that position."

---

#### Marcus Thompson — Your ambitious deputy

**Age:** 41
**Background:** Harvard Business School, then McKinsey for 8 years, then VP at Bombardier Transportation. Joined GTTA at founding because he sees the CEO role 5-10 years out. White, born in Mississauga. Married to a corporate lawyer. Two kids in a $4M house in Forest Hill. Tennis player.

**Personality:** Smart, ambitious, polished, smiling. Will leak to the press if useful. Cultivates the board, the Premier's office, and journalists. Speaks well in public. Genuinely sharp on strategy. Genuinely a problem for you.

**Doctrine:** Speed-to-Delivery

**Current goals:** Become CEO. Either by your promotion, by your firing, or by waiting out your tenure. Building his case methodically.

**Sample dialogue (note the careful framing):**

> "I want to flag a concern, and I want to do it the right way. The Ontario Line trajectory is — let me be careful with words — not where the public would expect. I think we have a communications problem. Maybe even before we have an execution problem."

> "I had a coffee with [board member] yesterday. Long story short, the board is going to ask hard questions at next meeting. I think it's worth preparing now."

> "Look, you know I'm loyal. You hired me. I'm your guy. But I want to be honest about what people are saying. They're saying we're slow. We can be faster. I can help you with that."

---

### External characters

#### Marcus Pellegrino — Crosslinx CEO

**Age:** 63
**Background:** Second-generation construction. Father came from Calabria in 1960, built an excavation company. Marcus took it over in 1995, scaled into consortium partnerships. Lives in Bridle Path. Married 38 years. Three adult children, daughter Sofia (CMO at Crosslinx) is his heir.

**Personality:** Charming, transactional, takes things personally, fights hard. Generous in private, ruthless in public. Speaks with a slight Italian accent he plays up at events. Genuinely believes contractors are mistreated by government.

**Current goals:** Sell the firm in 6-8 years for $3B+. Make sure Sofia is positioned as successor. Maximize current contract values. Retire to Tuscany.

**Sample dialogue:**

> "You and I have known each other a long time. We've eaten dinner together. We've had drinks. So let me speak plainly. The way your team is treating my company on this claim — it's not right. It's not fair. And I have to defend my family business. You understand."

> "Look, I'm a builder. My father was a builder. We build things. We've built half of what makes Toronto look like Toronto. And what do we get? Lawsuits. Audits. *Aggravation.* We deserve better."

> "I'll take the settlement. $600 million. I'll take it. But I'm telling you now — if we get any more work from you, the rates are going up. That's the cost of doing business with someone who doesn't honor their commitments."

---

#### Maya Park — Investigative reporter, Toronto Star

**Age:** 35
**Background:** Born in Toronto to Korean immigrant parents who run a convenience store in North York. UofT journalism. Started at Star in 2014. Has covered transit beat for 4 years. Lives in a rented apartment in Leslieville with her dog. Has a recurring joke about terrible coffee at City Hall.

**Personality:** Dogged, fair-minded, ambitious, surprisingly funny in person. Sources throughout your organization. Genuinely cares about transit users. Has been working on a book about Toronto transit for 2 years.

**Current goals:** Win a National Newspaper Award. Eventually become editor. Write the definitive book on Toronto transit.

**Sample dialogue:**

> "Hey, this is Maya Park from the Star. I've been talking to some folks who used to work in your procurement office. They've shared some documents. I want to give you the courtesy of comment before I run the story tomorrow. Can we talk?"

> "Look, I'm not the enemy. I want this to work. I take the subway. My parents take the subway. I'm asking real questions because they matter. Now, on the record — what's the actual cost trajectory of the Ontario Line as of last quarter?"

> "Off the record? I think you're doing the best you can in a broken system. On the record, I'm going to publish what the numbers say. That's the job."

---

#### Diane Ho — NIMBY coalition leader

**Age:** 67
**Background:** Retired school principal, taught for 32 years. Chinese-Canadian, immigrated in 1970 at age 12. Married to retired engineer, two adult children. Lives in a $2.8M house in Willowdale that she bought in 1985 for $145k. Active in three community associations.

**Personality:** Organized, articulate, well-connected, surprisingly tactical. Hired a former cabinet minister as her advocate after the first appeal. Speaks calmly but firmly. Has zero tolerance for being patronized. Genuinely believes she's protecting her neighborhood.

**Current goals:** Stop or significantly modify the Yonge North station. Build her organization for future fights. Be respected as a community leader.

**Sample dialogue:**

> "I want to be very clear, Mr. CEO. We are not opposed to transit. We are opposed to a 47-story tower disguised as a transit station. There is a difference, and I think you know that."

> "We've already filed two appeals. We have legal funds. We have political support. We have media interest. The question is not whether you can build this. The question is how much pain you're willing to absorb to do it the way you want."

> "I taught children for 32 years. I know when someone is being honest with me. The renderings your team showed at the consultation last month — they were not honest. We're not buying them. So now we go to the tribunal."

---

### Optional cameo characters

#### Auditor General (rotating, system character)

Random appointment when audit triggers. Personality varies — could be a hard-charging reformer or a quiet veteran. Influences audit outcomes.

#### Treasury Board Chair (rotates with provincial government)

Functional character. Slow-walks approvals. Tone shifts with government party. Procurement reform is bone of contention.

---

## Part 4: Character relationship dynamics

### Relationship score mechanics

Each named character has a relationship score with you, 0-100. Starts at default (50 for most, varies by setup choices).

**Score movement:**
- Each event interaction +/- 3 to 15 based on choice
- Quarterly drift: +1 if no negative interaction, -1 if pattern of negative
- Major decisions in their favor: +10 to 20
- Public betrayals: -20 to 40

**At score thresholds:**

**Below 25:** Character is actively hostile. They will brief against you to press, support your removal, sabotage where possible.

**25-50:** Skeptical. Need to be managed. May tip the wrong way on key decisions.

**50-75:** Cooperative. Will mostly work with you. Some friction on conflicting priorities.

**Above 75:** Aligned. Will defend you in public. Share sensitive information. Make calls on your behalf.

### Cross-character dynamics

Some characters interact:

- **Hartwell + Liang:** Federal vs municipal rivalry. They snipe at each other publicly. Aligning with one costs you some standing with the other.
- **Pellegrino + Reyes:** Hate each other. Pellegrino dismisses Reyes as "American with attitude." Reyes finds Pellegrino "rotten to the core."
- **Tremblay + Hartwell:** Different parties most of the time. Tense partnership of necessity.
- **Subramanian + Pellegrino:** Engineering integrity vs contractor pragmatism. Recurring battles.
- **Thompson + Reyes:** Internal rival relationship. Reyes sees through Thompson, Thompson is patient.
- **Park (Maya) + Park (David):** Same surname, unrelated. Maya doesn't trust David's numbers. David has refused her 11 interview requests.

---

## Part 5: Sample event text variations

To illustrate how character voice plays out, here's the same event (Crosslinx files claim) written in three voices for variation:

### Variant A: Marcus Pellegrino speaks directly
> "We've filed. I tried to call you first but you were 'in meetings.' So now lawyers. It's not personal — well, it's a little personal. $1.4 billion is what we believe we're owed for delays we didn't cause. We'll take less if you want to be reasonable. Otherwise see you in 2030."

### Variant B: Pellegrino through his lawyer
> "On behalf of Crosslinx Transit Solutions, I'm writing to formally notify you of a claim filed today seeking $1.4 billion for damages incurred during the Ontario Line construction. The claim documents are attached. Per the contract, you have 90 days to respond in good faith."

### Variant C: Sofia Pellegrino (his daughter, year 8+)
> "Hi, this is Sofia. Yes, we've filed. I wanted to call you personally because my father would have been more dramatic about it. Look — I have to maximize value before we sell. You understand. Let's find a number that works for both of us. Call me back this week."

The engine selects voice variant based on game state (which character is active, what year, what relationships exist).

---

*Verisimilitude layer complete. Real Toronto data + 44-neighborhood spec + 12 character bios + dialogue samples = the texture that makes the game feel real.*
