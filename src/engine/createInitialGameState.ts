import type { GameState } from '@/types/gameState';
import { bp, cash, quarter, riders, score, signed } from '@/types/scalars';
import { createRngSeeds } from './rng';

/**
 * Produce Q1 2026 starting state per design doc §5 v3.3.
 *
 * Numbers reconciled with the v3.3 financing pivot:
 * - $5B opening cash (residual from previous regime)
 * - Operating allowance $2.4B/yr, signed for Y1-Y4 (renegotiates Q16)
 * - $8.2B inherited debt at AA, 70/30 fixed/floating split, ~4.2% weighted
 * - opex EXCLUDES maintenance (separate budget per subsystem)
 *   - TTC opex $275M/Q (was $675M; the $400M/Q maintenance moved to subsystems)
 *   - GO opex $190M/Q
 *   - UP opex $15M/Q
 * - Subsystem maintenance at "required" level (stable conditions)
 * - Per-agency catchment growth: TTC 0.8%/yr, GO 1.5%/yr, UP 0.3%/yr
 * - Ontario Line inherited at 21% complete with a synthetic consortium
 *   financing record reflecting the historical tri-government split.
 *
 * Deterministic from `seed`: same seed → identical starting state and
 * identical 60-quarter trajectory.
 */
export function createInitialGameState(seed: number): GameState {
  return {
    schemaVersion: 1,
    ceo: { archetype: 'steadyOperator', name: 'CEO' },
    quarter: quarter(0),
    // $1B starting cash — realistic working capital for a transit agency.
    // Not enough to coast on; player has to make decisions from Q1.
    cash: { balance: cash(1_000), lastQuarterDelta: cash(0) },
    debt: {
      tranches: [
        {
          id: 't_pension_fixed',
          creditor: 'pension',
          principal: cash(3_500),
          coupon: { kind: 'fixed', rate: bp(410) },
          maturity: quarter(40),
          issuedAt: quarter(-24),
        },
        {
          id: 't_institutional_fixed',
          creditor: 'institutional',
          principal: cash(2_240),
          coupon: { kind: 'fixed', rate: bp(425) },
          maturity: quarter(28),
          issuedAt: quarter(-16),
        },
        {
          id: 't_institutional_floating',
          creditor: 'institutional',
          principal: cash(2_460),
          coupon: { kind: 'floating', spreadOverBOC: bp(90) },
          maturity: quarter(36),
          issuedAt: quarter(-8),
        },
      ],
      rating: 'AA',
      bocPolicyRate: bp(350),
    },
    operatingAllowance: {
      annualAmount: cash(2_400),
      signedAt: quarter(0),
      renegotiatesAt: quarter(16),
      controls: [],
    },
    politics: {
      ottawa: {
        id: 'ottawa',
        partyInPower: 'liberal',
        trust: score(50),
        nextElectionAt: quarter(12),
        nextRenegotiationAt: quarter(16),
        approval: score(48),
        cabinetCharacterIds: ['c_tremblay'],
        oppositionCharacterIds: [],
      },
      queensPark: {
        id: 'queensPark',
        partyInPower: 'conservative',
        trust: score(50),
        nextElectionAt: quarter(10),
        nextRenegotiationAt: quarter(16),
        approval: score(46),
        cabinetCharacterIds: ['c_hartwell'],
        oppositionCharacterIds: [],
      },
      cityHall: {
        id: 'cityHall',
        partyInPower: 'other',
        trust: score(50),
        nextElectionAt: quarter(8),
        nextRenegotiationAt: quarter(16),
        approval: score(54),
        cabinetCharacterIds: ['c_liang'],
        oppositionCharacterIds: [],
      },
    },
    boardConfidence: { score: score(60), recentComponents: [], warningActive: false },
    agencies: {
      // Starting numbers tuned for modest deficit at default settings —
      // the agency runs in the red without active player decisions.
      // Per-Q fare totals ~$510M ($2.04B/yr ≈ spec's $2.1B), per-Q opex
      // ~$545M ($2.18B/yr, captures unmodeled categories: security,
      // cleanliness, accessibility — these become Phase 5 sliders).
      // Plus $2.3B/yr maintenance + $0.35B/yr debt service brings total
      // outflow to ~$4.83B/yr vs ~$4.44B/yr inflow → -$390M/yr baseline.
      ttc: {
        id: 'ttc',
        dailyRiders: riders(4_400_000),
        subsystems: [
          { id: 'rollingStock', condition: score(72), maintenanceBudget: cash(100) },
          { id: 'track', condition: score(68), maintenanceBudget: cash(100) },
          { id: 'signals', condition: score(62), maintenanceBudget: cash(100) },
          { id: 'stations', condition: score(70), maintenanceBudget: cash(100) },
        ],
        operatingParams: { frequencyPolicy: 'current', farePolicy: 'current' },
        catchmentGrowthRate: 0.008,
        directorCharacterId: 'c_ttc_director',
        lastQuarterOpex: cash(340), // was 275; bumped for unmodeled cost categories
        lastQuarterFareRevenue: cash(295), // was 350; aligned to spec's $1.18B/yr
      },
      go: {
        id: 'go',
        dailyRiders: riders(335_000),
        subsystems: [
          { id: 'rollingStock', condition: score(78), maintenanceBudget: cash(40) },
          { id: 'track', condition: score(80), maintenanceBudget: cash(40) },
          { id: 'catenary', condition: score(55), maintenanceBudget: cash(40) },
          { id: 'stations', condition: score(74), maintenanceBudget: cash(40) },
        ],
        operatingParams: { frequencyPolicy: 'current', farePolicy: 'current' },
        catchmentGrowthRate: 0.015,
        directorCharacterId: 'c_go_director',
        lastQuarterOpex: cash(225), // was 190
        lastQuarterFareRevenue: cash(200), // was 230
      },
      up: {
        id: 'up',
        dailyRiders: riders(12_000),
        subsystems: [
          { id: 'rollingStock', condition: score(82), maintenanceBudget: cash(3) },
          { id: 'track', condition: score(80), maintenanceBudget: cash(3) },
          { id: 'stations', condition: score(78), maintenanceBudget: cash(3) },
        ],
        operatingParams: { frequencyPolicy: 'current', farePolicy: 'current' },
        catchmentGrowthRate: 0.003,
        directorCharacterId: 'c_up_director',
        lastQuarterOpex: cash(20), // was 15
        lastQuarterFareRevenue: cash(12), // was 14
      },
    },
    projects: [
      {
        state: 'under_construction',
        templateId: 'P00',
        chosenAlignment: 'A',
        chosenStationCount: 15,
        stationQuality: 'standard',
        lvc: { capexPerStation: cash(0), stationsCovered: 0 },
        brokeGroundAt: quarter(-16),
        totalBudget: cash(27_000),
        spent: cash(9_000),
        remainingFunding: cash(18_000),
        forecastOpenAt: quarter(20),
        financing: [
          {
            approach: 'consortium',
            amount: cash(27_000),
            rateBp: 400,
            conditions: [],
            signedAt: quarter(-24),
            trancheId: 't_ol_consortium',
          },
        ],
        perProject: { sitePrep: score(40), megaContract: true, settlementPremium: score(10) },
      },
    ],
    characters: {},
    inbox: [],
    delayedQueue: [],
    standingOrders: [],
    engineVars: {
      templates: score(30),
      crosslinxLeverage: score(55),
      consultantAlignment: signed(0),
      nimbyOrganization: score(25),
      openBooks: false,
      engineers: 180,
      publicApproval: score(50),
    },
    rng: createRngSeeds(seed),
    actionLog: [],
    nextLogId: 1,
  };
}
