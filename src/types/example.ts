/**
 * Example GameState satisfying all types. Lives in the type package so it
 * also serves as a compile-time check: if a type changes incompatibly,
 * this file fails to compile.
 *
 * Numbers reflect the design doc starting position (§5, Q1 2026):
 *   - $5B opening cash, ~$8B debt at AA-
 *   - 50/50/50 trust across three governments
 *   - Board confidence 60
 *   - TTC / GO / UP with starting ridership
 *   - No projects in flight beyond the inherited Ontario Line
 *
 * The engine's `createInitialGameState` (Phase 1.2) will compute a real
 * starting state with full Ontario Line catalogue data. This object is
 * the minimal shape proof.
 */

import type { GameState } from './gameState';
import { bp, cash, quarter, riders, score, signed } from './scalars';

export const exampleGameState: GameState = {
  schemaVersion: 1,
  ceo: {
    archetype: 'steadyOperator',
    name: 'A. Wali',
  },
  quarter: quarter(0),
  cash: {
    balance: cash(5_000),
    lastQuarterDelta: cash(0),
  },
  operatingAllowance: {
    annualAmount: cash(2_400),
    signedAt: quarter(0),
    renegotiatesAt: quarter(16),
    controls: [],
  },
  debt: {
    tranches: [
      {
        id: 't_inherited_fixed_a',
        creditor: 'pension',
        principal: cash(3_500),
        coupon: { kind: 'fixed', rate: bp(420) },
        maturity: quarter(40),
        issuedAt: quarter(-24),
      },
      {
        id: 't_inherited_fixed_b',
        creditor: 'institutional',
        principal: cash(2_240),
        coupon: { kind: 'fixed', rate: bp(420) },
        maturity: quarter(28),
        issuedAt: quarter(-16),
      },
      {
        id: 't_inherited_floating',
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
  politics: {
    ottawa: {
      id: 'ottawa',
      partyInPower: 'liberal',
      trust: score(50),
      nextElectionAt: quarter(12),
      nextRenegotiationAt: quarter(12),
      approval: score(48),
      cabinetCharacterIds: ['c_tremblay'],
      oppositionCharacterIds: [],
    },
    queensPark: {
      id: 'queensPark',
      partyInPower: 'conservative',
      trust: score(50),
      nextElectionAt: quarter(10),
      nextRenegotiationAt: quarter(12),
      approval: score(46),
      cabinetCharacterIds: ['c_hartwell'],
      oppositionCharacterIds: [],
    },
    cityHall: {
      id: 'cityHall',
      partyInPower: 'other',
      trust: score(50),
      nextElectionAt: quarter(8),
      nextRenegotiationAt: quarter(12),
      approval: score(54),
      cabinetCharacterIds: ['c_liang'],
      oppositionCharacterIds: [],
    },
  },
  boardConfidence: {
    score: score(60),
    recentComponents: [],
    warningActive: false,
  },
  agencies: {
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
      catchmentGrowthRate: 0,
      directorCharacterId: 'c_ttc_director',
      lastQuarterOpex: cash(675),
      lastQuarterFareRevenue: cash(350),
    },
    go: {
      id: 'go',
      dailyRiders: riders(335_000),
      subsystems: [
        { id: 'rollingStock', condition: score(78), maintenanceBudget: cash(50) },
        { id: 'track', condition: score(80), maintenanceBudget: cash(60) },
        { id: 'catenary', condition: score(55), maintenanceBudget: cash(20) },
        { id: 'stations', condition: score(74), maintenanceBudget: cash(30) },
      ],
      operatingParams: { frequencyPolicy: 'current', farePolicy: 'current' },
      catchmentGrowthRate: 0,
      directorCharacterId: 'c_go_director',
      lastQuarterOpex: cash(350),
      lastQuarterFareRevenue: cash(230),
    },
    up: {
      id: 'up',
      dailyRiders: riders(12_000),
      subsystems: [
        { id: 'rollingStock', condition: score(82), maintenanceBudget: cash(4) },
        { id: 'track', condition: score(80), maintenanceBudget: cash(4) },
        { id: 'stations', condition: score(78), maintenanceBudget: cash(2) },
      ],
      operatingParams: { frequencyPolicy: 'current', farePolicy: 'current' },
      catchmentGrowthRate: 0,
      directorCharacterId: 'c_up_director',
      lastQuarterOpex: cash(24),
      lastQuarterFareRevenue: cash(14),
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
      financing: [],
      perProject: {
        sitePrep: score(40),
        megaContract: true,
        settlementPremium: score(10),
      },
    },
  ],
  characters: {},
  inbox: [],
  delayedQueue: [],
  standingOrders: [],
  activeObligations: [],
  engineVars: {
    templates: score(30),
    crosslinxLeverage: score(55),
    consultantAlignment: signed(0),
    nimbyOrganization: score(25),
    openBooks: false,
    engineers: 180,
    publicApproval: score(50),
  },
  rng: {
    masterSeed: 0,
    subsystems: {
      events: { seed: 1, callCount: 0 },
      characterMoods: { seed: 2, callCount: 0 },
      contractorBehavior: { seed: 3, callCount: 0 },
      economic: { seed: 4, callCount: 0 },
      elections: { seed: 5, callCount: 0 },
      demographicDrift: { seed: 6, callCount: 0 },
      projectCostRealization: { seed: 7, callCount: 0 },
      climate: { seed: 8, callCount: 0 },
      technology: { seed: 9, callCount: 0 },
      media: { seed: 10, callCount: 0 },
      nimbyOrganizing: { seed: 11, callCount: 0 },
      gaffe: { seed: 12, callCount: 0 },
    },
  },
  actionLog: [],
  nextLogId: 1,
  gameOverCounters: { quartersInDeepDeficit: 0, quartersWithFiringBoard: 0 },
};
