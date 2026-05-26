import type { GameState } from '@/types/gameState';
import { bp, cash, quarter, riders, score, signed } from '@/types/scalars';
import { createRngSeeds } from './rng';

/**
 * Produce Q1 2026 starting state per design doc §5.
 *
 * Numbers match the doc within rounding:
 * - $5B opening cash
 * - $8.2B inherited debt at AA, 70/30 fixed/floating split, ~4.2% weighted
 * - Three governments, trust 50 each
 * - TTC + GO + UP with the operating-data ridership baselines
 * - Ontario Line inherited at 21% complete (9B/27B), forecast open Q+20
 *
 * Deterministic from `seed`: same seed → identical starting state and
 * identical 60-quarter trajectory.
 */
export function createInitialGameState(seed: number): GameState {
  return {
    schemaVersion: 1,
    ceo: { archetype: 'steadyOperator', name: 'CEO' },
    quarter: quarter(0),
    cash: { balance: cash(5_000), lastQuarterDelta: cash(0) },
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
    boardConfidence: { score: score(60), recentComponents: [], warningActive: false },
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
        directorCharacterId: 'c_ttc_director',
        lastQuarterOpex: cash(675),
        lastQuarterFareRevenue: cash(350),
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
        directorCharacterId: 'c_go_director',
        lastQuarterOpex: cash(350),
        lastQuarterFareRevenue: cash(230),
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
        forecastOpenAt: quarter(20),
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
  };
}
