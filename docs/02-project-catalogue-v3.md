# METRO — Project Catalogue

**29 buildable transit projects for Toronto plus 1 inherited (Ontario Line). Each project specifies traits the engine uses to compute cost, demand, risk, and political support over its lifecycle.**

---

## How projects work

Every project moves through phases: **Concept → Studies → Planning → Design → Tender → Construction → Operations.**

At Concept, the project exists in the catalogue but costs nothing to evaluate. Each subsequent phase commits the player further. Studies are optional and narrow uncertainty. Lobbying is optional and shifts political support. Greenlight is the commitment moment.

### Trait categories

Each project has:

- **ID / name / description**
- **Length range** (km) — affects build duration and base cost
- **Alignment options** (2-4 where geography permits)
- **Mode options per alignment** (subway / elevated / LRT / BRT / RER)
- **Above/below ground choice** per segment for longer lines
- **Station count range** (min/max, with cost implications)
- **Station quality dial** (basic / standard / premium → +0/+25/+60% station cost)
- **Cost range** at Concept (±35%), narrows with studies to ±5% at Tender
- **Demand range** at Concept (±40%), narrows with ridership study to ±10%
- **NIMBY exposure** per neighborhood the line passes through
- **LVC potential** (low / medium / high / very high)
- **Geotechnical risk** (low / medium / high)
- **Political support starting position** by government (Ottawa / Queen's Park / City Hall)
- **Connection points** to existing network
- **Build duration range** scales with mode and length
- **Project size tier:** small / medium / large / mega (drives uncertainty and political capital required)

### Size tier mechanics

| Tier | Initial cost band | Political capital needed | Failure risk | Impact when delivered |
|---|---|---|---|---|
| Small | ±20% | Low (5-10 PC) | Low | Modest |
| Medium | ±30% | Medium (15-25 PC) | Medium | Solid |
| Large | ±35% | High (30-45 PC) | Medium-high | Major |
| Mega | ±45% | Very high (50-75 PC) | High | Transformational |

---

## Inherited project (locked in)

### P00 — Ontario Line

**Status:** Under construction, 21% complete. 2031 target opening.


### LVC slider (added in v3)

Per project, at Greenlight phase, player sets LVC investment level via slider 0 to $400M per major station.

Revenue scales by formula: `lvc_revenue_per_quarter = sqrt(lvc_capex_M / 10) × $3M per major station`

Examples:
- $0 capex: $0/Q revenue (no LVC chosen)
- $50M capex: $6M/Q revenue per station
- $200M capex: $13M/Q revenue per station  
- $400M capex: $19M/Q revenue per station

Political costs scale with capex:
- $0-50M: trivial
- $50-200M: City Hall -3 to -8
- $200-400M: City Hall -8 to -15, NIMBY +10-20, requires Queen's Park trust >55

Revenue begins 4-8 quarters after station opens. Runs for life of station.

Each project specifies the number of "major stations" eligible for LVC. Smaller projects (BRT, LRT) may have fewer or no eligible stations.

**Description:** 15.3 km north-south subway through downtown core, Exhibition to Science Centre, 15 stations.

**Tier:** Mega
**Mode:** Subway (locked)
**Budget:** $27B (committed), $9B spent
**Cost range remaining:** ±15% (already in construction)
**Daily ridership at opening (ramp):** 290k → 380k by Q+8
**LVC potential:** Very high (downtown stations, 7 high-density catchments)
**Geotechnical risk:** Medium (some Don Valley exposure, Queen Street tunneling)
**NIMBY exposure:** Medium-high (Leslieville, Riverside, downtown construction disruption)
**Political support starting:** Ottawa +20, Queen's Park +15, City Hall +10
**Build duration remaining:** ~20 quarters
**Connection points:** Line 1 (Osgoode), Line 2 (Pape, future Yonge), GO Lakeshore (Exhibition), future Eglinton (Don Mills connection)

**Player decisions remaining:** Per-quarter priority (defer/normal/accelerate), risk mitigation buy-downs, station quality on remaining 12 stations, procurement renegotiation, partial-opening decisions.

---

## Subway projects (9)

### P01 — Yonge North extension

**Tier:** Large
**Description:** Extend Line 1 from Finch to Richmond Hill Centre.

**Alignment options:**
- **A: Yonge corridor** (direct) — 8.0 km, 6 stations, max 140k riders, NIMBY high (organized ratepayer groups in Willowdale/Thornhill), LVC high
- **B: Bayview corridor** (alternate) — 9.5 km, 7 stations, max 90k riders, NIMBY low, LVC medium

**Mode:** Subway (only viable; elevated possible north of 7)
**Cost range:** $5.5B - $8.5B
**Geotechnical risk:** Medium (Yonge fault line near Hwy 401)
**Political support starting:** Ottawa +5, Queen's Park +12 (Vaughan/Markham caucus), City Hall +3 (out-of-Toronto sentiment)
**Build duration:** 28-32 quarters
**Connection points:** Line 1 (Finch), GO Stouffville (potential Richmond Hill interchange)

---

### P02 — Bloor-Danforth West extension

**Tier:** Medium
**Description:** Extend Line 2 from Kipling to Sherway Gardens / Mississauga border.

**Alignment options:**
- **A: Subway** — 5.5 km, 4 stations, max 80k riders, fully below grade, NIMBY low
- **B: Subway + elevated** — 5.5 km, 4 stations, max 75k riders, partially elevated west of Six Points, NIMBY medium, cost -30%

**Cost range:** $2.4B - $4.2B
**LVC potential:** Medium-high (Mississauga border has development potential)
**Geotechnical risk:** Low
**Political support starting:** Ottawa +5, Queen's Park +8, City Hall +5 (Etobicoke caucus)
**Build duration:** 20-24 quarters

---

### P04 — Sheppard subway extension east

**Tier:** Large
**Description:** Extend Line 4 from Don Mills to Scarborough Town Centre.

**Alignment options:**
- **A: Full subway** — 13.0 km, 6 stations, max 90k riders, NIMBY low, LVC medium-high
- **B: Subway + elevated** — 13.0 km, 6 stations, max 85k riders, partially elevated east of Victoria Park, NIMBY medium, cost -25%

**Cost range:** $4.5B - $7.5B
**Political support starting:** Ottawa +8, Queen's Park +5, City Hall +12 (Scarborough caucus)
**Build duration:** 24-30 quarters
**Connection points:** Line 4 (Don Mills), future Line 5 East (Kennedy/STC)

---

### P05 — Sheppard subway extension west

**Tier:** Medium
**Description:** Extend Line 4 from Yonge to Downsview.

**Alignment options:**
- **A: Subway** — 6.0 km, 3 stations, max 50k riders, NIMBY low

**Cost range:** $2.5B - $4B
**Political support starting:** Ottawa +3, Queen's Park +3, City Hall +5
**Build duration:** 18-22 quarters
**Connection points:** Line 4 (Yonge), Line 1 (Downsview/Sheppard West)

---

### P06 — Don Mills subway

**Tier:** Mega
**Description:** New subway line from Bloor/Don Mills north to Steeles, with eventual extension potential.

**Alignment options:**
- **A: Pure subway** — 9.0 km, 6 stations, max 130k riders, NIMBY medium, LVC very high
- **B: Subway + elevated north of 401** — 9.0 km, 6 stations, max 125k riders, NIMBY high (Don Mills residents)

**Cost range:** $5.5B - $9B
**Geotechnical risk:** Medium-high (Don River crossings, Don Mills bedrock variability)
**Political support starting:** Ottawa +5, Queen's Park +3, City Hall +8
**Build duration:** 26-32 quarters
**Connection points:** Line 2 (Pape), future Line 5 (Eglinton/Don Mills), future Line 4 extension

---

### P07 — Jane subway

**Tier:** Large
**Description:** New subway from Bloor/Jane north to Steeles, serving an underserved corridor.

**Alignment options:**
- **A: Pure subway** — 14.0 km, 9 stations, max 110k riders, NIMBY low-medium, LVC medium
- **B: Subway + elevated** — 14.0 km, 9 stations, max 105k riders, NIMBY medium, cost -25%

**Cost range:** $6B - $9B
**Political support starting:** Ottawa +5, Queen's Park +3, City Hall +10 (Equity-oriented councillors)
**Build duration:** 28-34 quarters
**Connection points:** Line 2 (Jane)

---

### P08 — Yonge South extension

**Tier:** Medium
**Description:** Extend Line 1 south of Union to Queens Quay / Cherry Beach.

**Alignment options:**
- **A: Subway** — 2.5 km, 2 stations, max 60k riders, NIMBY low, LVC very high (waterfront)

**Cost range:** $1.5B - $3B
**Geotechnical risk:** Very high (under lake / harbor)
**Political support starting:** Ottawa +3, Queen's Park +5, City Hall +12
**Build duration:** 18-24 quarters
**Connection points:** Line 1 (Union)

---

### P09 — Eglinton west subway conversion

**Tier:** Large
**Description:** Convert proposed Eglinton West LRT extension to full subway, Mount Dennis to Pearson.

**Alignment options:**
- **A: Full subway** — 14.0 km, 8 stations, max 80k riders, NIMBY low (mostly tunneled), LVC medium

**Cost range:** $7B - $11B (vs LRT alternative at $3.5B)
**Political support starting:** Ottawa +10 (airport connection), Queen's Park +5, City Hall +3 (cost concerns)
**Build duration:** 28-34 quarters
**Connection points:** Line 5 (Mount Dennis), Pearson Airport (UP Express interchange)

---

### P10 — Queen Subway (alternate downtown relief)

**Tier:** Mega
**Description:** New east-west subway under Queen Street from Roncesvalles to Coxwell.

**Alignment options:**
- **A: Subway** — 9.0 km, 9 stations, max 220k riders, NIMBY medium, LVC very high

**Cost range:** $7.5B - $12B
**Geotechnical risk:** High
**Political support starting:** Ottawa +5, Queen's Park +5, City Hall +15
**Build duration:** 30-38 quarters
**Connection points:** Lines 1, 2, future Ontario Line, multiple streetcar routes

---

## LRT projects (10)

### P11 — Eglinton East LRT

**Tier:** Medium
**Description:** Extension of Line 5 from Kennedy east to UTSC and Malvern.

**Alignment options:**
- **A: Surface LRT** — 18.0 km, 11 stations, max 55k riders, NIMBY low-medium (some surface disruption)

**Cost range:** $2.5B - $4B
**LVC potential:** Low-medium
**Geotechnical risk:** Low
**Political support starting:** Ottawa +5, Queen's Park +8, City Hall +12
**Build duration:** 20-24 quarters
**Connection points:** Line 5 (Kennedy), GO Lakeshore East

---

### P12 — Eglinton West LRT

**Tier:** Medium
**Description:** Surface LRT extension Mount Dennis to Pearson, alternative to P09.

**Alignment options:**
- **A: Surface + tunneled sections** — 14.0 km, 8 stations, max 60k riders, NIMBY medium (Eglinton surface widening)
- **B: Mostly elevated** — 14.0 km, 8 stations, max 55k riders, NIMBY medium-high, cost -10%

**Cost range:** $2.8B - $4.5B
**Political support starting:** Ottawa +5, Queen's Park +5, City Hall +5
**Build duration:** 18-22 quarters
**Connection points:** Line 5 (Mount Dennis), Pearson

---

### P13 — Waterfront LRT

**Tier:** Small
**Description:** Surface LRT from Union to Cherry Street to Polson Quay.

**Alignment options:**
- **A: Surface LRT** — 6.0 km, 5 stations, max 50k riders, NIMBY medium (condo board pushback), LVC very high

**Cost range:** $900M - $1.5B
**Political support starting:** Ottawa +3, Queen's Park +3, City Hall +18 (waterfront priority)
**Build duration:** 12-16 quarters
**Connection points:** Line 1 (Union), Distillery District streetcar

---

### P14 — Don Mills LRT

**Tier:** Medium
**Description:** Surface LRT Eglinton to Steeles along Don Mills, lower-cost alternative to P06 subway.

**Alignment options:**
- **A: Surface LRT** — 9.0 km, 7 stations, max 45k riders, NIMBY medium

**Cost range:** $1.8B - $2.8B
**Political support starting:** Ottawa +3, Queen's Park +3, City Hall +5
**Build duration:** 14-18 quarters
**Connection points:** Line 5 (Eglinton/Don Mills)

---

### P15 — Finch West LRT extension

**Tier:** Small
**Description:** Extend Line 6 from Finch West Station to Pearson Airport.

**Alignment options:**
- **A: Surface LRT** — 8.0 km, 5 stations, max 30k riders, NIMBY low

**Cost range:** $1.2B - $2B
**Political support starting:** Ottawa +5, Queen's Park +3, City Hall +5
**Build duration:** 12-16 quarters
**Connection points:** Line 6 (Finch West), Pearson

---

### P16 — Wilson LRT

**Tier:** Small
**Description:** East-west LRT along Wilson Avenue, Yonge to Keele.

**Alignment options:**
- **A: Surface LRT** — 7.5 km, 6 stations, max 28k riders, NIMBY low

**Cost range:** $1B - $1.8B
**Political support starting:** Ottawa +2, Queen's Park +3, City Hall +5
**Build duration:** 12-14 quarters
**Connection points:** Line 1 (Wilson), future Yonge North

---

### P17 — Lakeshore West LRT (Mississauga connector)

**Tier:** Medium
**Description:** Surface LRT from Long Branch streetcar end to Port Credit (Mississauga GO).

**Alignment options:**
- **A: Surface LRT** — 11.0 km, 8 stations, max 35k riders, NIMBY low

**Cost range:** $1.8B - $2.8B
**Political support starting:** Ottawa +3, Queen's Park +3, City Hall +2 (out-of-city)
**Build duration:** 16-20 quarters
**Connection points:** 501 streetcar (Long Branch), GO Lakeshore West (Port Credit)

---

### P18 — Scarborough LRT network

**Tier:** Medium
**Description:** Three-corridor LRT network in Scarborough connecting STC, Malvern, UTSC, Sheppard.

**Alignment options:**
- **A: Three-corridor LRT** — 22.0 km combined, 16 stations, max 60k riders, NIMBY low

**Cost range:** $3.2B - $5B
**Political support starting:** Ottawa +3, Queen's Park +5, City Hall +10 (Scarborough caucus)
**Build duration:** 22-28 quarters
**Connection points:** Line 2 (Kennedy), Line 5 East, future Sheppard East subway

---

### P19 — Jane LRT (alternative to P07)

**Tier:** Small
**Description:** Surface LRT Bloor to Steeles along Jane, lower-cost alternative.

**Alignment options:**
- **A: Surface LRT** — 14.0 km, 11 stations, max 40k riders, NIMBY low-medium

**Cost range:** $2.2B - $3.5B
**Political support starting:** Ottawa +3, Queen's Park +3, City Hall +8
**Build duration:** 16-20 quarters
**Connection points:** Line 2 (Jane)

---

### P20 — Toronto West LRT (Kingsway to Mississauga)

**Tier:** Small
**Description:** Surface LRT through Etobicoke connecting Kipling to Mississauga.

**Alignment options:**
- **A: Surface LRT** — 9.0 km, 7 stations, max 32k riders, NIMBY low-medium

**Cost range:** $1.5B - $2.3B
**Political support starting:** Ottawa +3, Queen's Park +3, City Hall +5
**Build duration:** 14-18 quarters
**Connection points:** Line 2 (Kipling)

---

## BRT projects (4)

### P21 — Steeles cross-city BRT

**Tier:** Small
**Description:** BRT along Steeles from Pearson to Scarborough Town Centre.

**Alignment options:**
- **A: BRT** — 32.0 km, 20 stations, max 45k riders, NIMBY low (mostly dedicated lanes)

**Cost range:** $400M - $700M
**LVC potential:** Low
**Political support starting:** Ottawa +5, Queen's Park +5, City Hall +5
**Build duration:** 10-14 quarters
**Connection points:** Various subway and LRT lines at major intersections

---

### P22 — Eglinton crosstown BRT

**Tier:** Small
**Description:** BRT supplementing Line 5 in low-frequency areas. Bus-only lanes Yonge to Don Mills, Don Mills to STC.

**Alignment options:**
- **A: BRT** — 12.0 km, 8 stations, max 25k riders, NIMBY medium (lane removal)

**Cost range:** $250M - $450M
**Political support starting:** Ottawa +2, Queen's Park +3, City Hall +3
**Build duration:** 8-10 quarters

---

### P23 — Lakeshore BRT

**Tier:** Small
**Description:** BRT along Lakeshore Boulevard West, downtown to Long Branch.

**Alignment options:**
- **A: BRT** — 14.0 km, 12 stations, max 30k riders, NIMBY medium

**Cost range:** $300M - $500M
**Political support starting:** Ottawa +2, Queen's Park +3, City Hall +5
**Build duration:** 10-14 quarters

---

### P24 — Highway 7 BRT (Vaughan)

**Tier:** Small
**Description:** Extension of existing York Region BRT through Vaughan, integration with Yonge North if built.

**Alignment options:**
- **A: BRT** — 18.0 km, 14 stations, max 35k riders, NIMBY low

**Cost range:** $500M - $800M
**Political support starting:** Ottawa +3, Queen's Park +8 (Vaughan/Markham), City Hall +0
**Build duration:** 10-14 quarters

---

## GO / RER projects (4)

### P25 — Lakeshore RER full electrification

**Tier:** Large
**Description:** Complete Lakeshore East and West electrification, 15-minute all-day service. Inherits some existing capital.

**Alignment options:**
- **A: Electrification + signaling** — 50 km combined, max +180k riders incremental, NIMBY very low

**Cost range:** $4B - $6.5B
**LVC potential:** Medium (along corridor stations)
**Political support starting:** Ottawa +15, Queen's Park +12, City Hall +5
**Build duration:** 16-22 quarters
**Connection points:** All existing GO stations plus subway connections at Union, Exhibition

---

### P26 — Kitchener corridor RER

**Tier:** Medium
**Description:** Electrify Kitchener line, expand to 15-minute service.

**Alignment options:**
- **A: Electrification + service expansion** — 35 km, max +90k riders, NIMBY very low

**Cost range:** $2.5B - $4B
**Political support starting:** Ottawa +8, Queen's Park +10 (suburban caucus), City Hall +3
**Build duration:** 14-18 quarters

---

### P27 — Stouffville / Markham RER

**Tier:** Medium
**Description:** Electrify Stouffville line, 15-min service to Markham.

**Alignment options:**
- **A: Full electrification** — 32 km, max +75k riders, NIMBY low

**Cost range:** $2B - $3.5B
**Political support starting:** Ottawa +5, Queen's Park +10 (Markham), City Hall +0
**Build duration:** 14-18 quarters

---

### P28 — Barrie corridor RER

**Tier:** Medium
**Description:** Electrify Barrie line, expand to 30-min off-peak service.

**Alignment options:**
- **A: Electrification, partial frequency boost** — 45 km, max +60k riders, NIMBY low

**Cost range:** $2.5B - $4B
**Political support starting:** Ottawa +5, Queen's Park +8, City Hall +0
**Build duration:** 16-20 quarters

---

## Specialty projects (2)

### P29 — Pearson Airport / Union Express upgrade

**Tier:** Small
**Description:** Increase UP Express frequency to 7-min peak, extend service hours, integrate fare with TTC.

**Alignment options:**
- **A: Frequency + fare integration** — uses existing track, max +25k riders, NIMBY zero

**Cost range:** $300M - $600M
**Political support starting:** Ottawa +5, Queen's Park +5, City Hall +5
**Build duration:** 6-10 quarters
**Connection points:** Existing UP infrastructure

---

### P30 — Cross-boundary regional rail / hyper-loop / autonomous BRT

**Tier:** Mega
**Description:** Speculative project — long-distance high-speed link Toronto to Hamilton or Kitchener-Waterloo. High variance, late-game unlock based on technology drift events.

**Alignment options:**
- **A: Conventional high-speed rail** — 80 km, max +100k riders, NIMBY medium
- **B: Autonomous BRT corridor** — 80 km, max +50k riders, NIMBY low, cost -60%

**Cost range:** $8B - $20B (very wide)
**Political support starting:** Ottawa +5 (federal program), Queen's Park +5, City Hall +0
**Build duration:** 30-40 quarters
**Connection points:** Union Station, regional GO

**Special:** Locked at game start. Unlocks if technology drift event in year 8+ triggers.

---

## Project tier distribution

| Tier | Count | Notes |
|---|---|---|
| Small | 10 | Quick wins, low risk |
| Medium | 11 | Bread-and-butter expansion |
| Large | 5 | Major capital commitments |
| Mega | 4 (incl. Ontario Line) | Transformational, high-risk |

Totals to 30 (29 selectable + P00 Ontario Line inherited). This distribution ensures players have small wins to build credibility before tackling mega-projects, while still offering ambitious paths from the start.

---

## Project selection at game setup

Player picks 3 projects to start (in addition to inherited Ontario Line). Constraints:

- Must include at least one Small or Medium (training wheels)
- Cannot pick two projects that are direct alternatives (P06 + P14, P07 + P19, P09 + P12, P10 + Ontario Line, A/B variants of P30)
- Total estimated capex of selected projects ≤ $20B at Concept (rough budgetary sanity check, can be exceeded during play)

After game start, additional projects can be added one at a time, subject to political capital and capacity constraints.

---

*Catalogue complete. 29 selectable projects + 1 inherited (Ontario Line). Ready for engine implementation.*
