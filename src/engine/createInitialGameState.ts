import type { GameState } from '@/types/gameState';
import type { CeoArchetype } from '@/types/ceo';
import { INITIAL_GAME_OVER_COUNTERS } from '@/types/gameOver';
import { bp, cash, quarter, riders, score, signed } from '@/types/scalars';
import { createRngSeeds } from './rng';
import { ARCHETYPE_CONFIGS } from './archetypes';
import { INITIAL_CHARACTERS } from './characterRoster';
import { ARCHETYPE_OPEX_MULTIPLIER } from './policies';

/**
 * Produce Q1 2026 starting state per design doc §5 v3.3, modulated by
 * CEO archetype per §7 / Phase 2.2 deep-divergent configs.
 *
 * Deterministic from `(seed, archetype)`: same inputs → identical starting
 * state and identical 60-quarter trajectory at default settings.
 *
 * Archetype overrides (cash, board, trust, public approval, engineers,
 * templates, openBooks, subsystem condition adjustment) live in
 * `engine/archetypes.ts`.
 */
function clampScore(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function createInitialGameState(
  seed: number,
  archetype: CeoArchetype = 'steadyOperator',
  ceoName: string = 'CEO',
): GameState {
  const mods = ARCHETYPE_CONFIGS[archetype];
  // Archetype opex multiplier — applied to baseline per-agency opex.
  // Persists for the campaign; frequency policy stacks on top.
  const opexMul = ARCHETYPE_OPEX_MULTIPLIER[archetype];
  const opex = (baseM: number): number => Math.round(baseM * opexMul);
  return {
    schemaVersion: 1,
    ceo: { archetype, name: ceoName },
    quarter: quarter(0),
    // Starting cash modulated by archetype. Default $1B (Steady Operator)
    // is realistic working capital for a transit agency — not coast money.
    cash: { balance: cash(mods.startingCashM), lastQuarterDelta: cash(0) },
    debt: {
      // All 3 tranches are the Ontario Line consortium — split across creditors
      // so the player can see the multi-stack financing they inherited. Labels
      // make this explicit in the UI.
      tranches: [
        {
          id: 't_ol_pension',
          creditor: 'pension',
          principal: cash(3_500),
          coupon: { kind: 'fixed', rate: bp(410) },
          maturity: quarter(40),
          issuedAt: quarter(-24),
        },
        {
          id: 't_ol_institutional_fixed',
          creditor: 'institutional',
          principal: cash(2_240),
          coupon: { kind: 'fixed', rate: bp(425) },
          maturity: quarter(28),
          issuedAt: quarter(-16),
        },
        {
          id: 't_ol_institutional_floating',
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
        trust: score(clampScore(mods.trust.ottawa)),
        nextElectionAt: quarter(12),
        nextRenegotiationAt: quarter(16),
        approval: score(48),
        cabinetCharacterIds: ['c_tremblay'],
        oppositionCharacterIds: [],
        actionCooldowns: {},
      },
      queensPark: {
        id: 'queensPark',
        partyInPower: 'conservative',
        trust: score(clampScore(mods.trust.queensPark)),
        nextElectionAt: quarter(10),
        nextRenegotiationAt: quarter(16),
        approval: score(46),
        cabinetCharacterIds: ['c_hartwell'],
        oppositionCharacterIds: [],
        actionCooldowns: {},
      },
      cityHall: {
        id: 'cityHall',
        partyInPower: 'other',
        trust: score(clampScore(mods.trust.cityHall)),
        nextElectionAt: quarter(8),
        nextRenegotiationAt: quarter(16),
        approval: score(54),
        cabinetCharacterIds: ['c_liang'],
        oppositionCharacterIds: [],
        actionCooldowns: {},
      },
    },
    boardConfidence: {
      score: score(clampScore(mods.boardConfidence)),
      recentComponents: [],
      warningActive: false,
    },
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
          { id: 'rollingStock', condition: score(clampScore(72 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(100) },
          { id: 'track', condition: score(clampScore(68 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(100) },
          { id: 'signals', condition: score(clampScore(62 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(100) },
          { id: 'stations', condition: score(clampScore(70 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(100) },
        ],
        operatingParams: {
          frequencyPolicy: 'current',
          farePolicy: 'current',
          securityBudget: cash(50),
          cleanlinessBudget: cash(40),
          accessibilityBudget: cash(30),
        },
        catchmentGrowthRate: 0.008,
        directorCharacterId: 'c_ttc_director',
        lastQuarterOpex: cash(opex(340)),
        lastQuarterFareRevenue: cash(295), // was 350; aligned to spec's $1.18B/yr
      },
      go: {
        id: 'go',
        dailyRiders: riders(335_000),
        subsystems: [
          { id: 'rollingStock', condition: score(clampScore(78 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(40) },
          { id: 'track', condition: score(clampScore(80 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(40) },
          { id: 'catenary', condition: score(clampScore(55 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(40) },
          { id: 'stations', condition: score(clampScore(74 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(40) },
        ],
        operatingParams: {
          frequencyPolicy: 'current',
          farePolicy: 'current',
          securityBudget: cash(15),
          cleanlinessBudget: cash(10),
          accessibilityBudget: cash(8),
        },
        catchmentGrowthRate: 0.015,
        directorCharacterId: 'c_go_director',
        lastQuarterOpex: cash(opex(225)),
        lastQuarterFareRevenue: cash(200), // was 230
      },
      up: {
        id: 'up',
        dailyRiders: riders(12_000),
        subsystems: [
          { id: 'rollingStock', condition: score(clampScore(82 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(3) },
          { id: 'track', condition: score(clampScore(80 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(3) },
          { id: 'stations', condition: score(clampScore(78 + mods.subsystemConditionAdjust)), maintenanceBudget: cash(3) },
        ],
        operatingParams: {
          frequencyPolicy: 'current',
          farePolicy: 'current',
          securityBudget: cash(3),
          cleanlinessBudget: cash(2),
          accessibilityBudget: cash(1),
        },
        catchmentGrowthRate: 0.003,
        directorCharacterId: 'c_up_director',
        lastQuarterOpex: cash(opex(20)),
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
        // Inherited consortium financing — 3 tranches across creditors.
        // Combined $8.2B of issued debt + ~$18B committed-but-undrawn from
        // consortium (drawn as construction progresses, becomes new tranches).
        financing: [
          {
            approach: 'pensionConsortium',
            amount: cash(3_500),
            rateBp: 410,
            conditions: [],
            signedAt: quarter(-24),
            trancheId: 't_ol_pension',
          },
          {
            approach: 'consortium',
            amount: cash(2_240),
            rateBp: 425,
            conditions: [],
            signedAt: quarter(-16),
            trancheId: 't_ol_institutional_fixed',
          },
          {
            approach: 'consortium',
            amount: cash(2_460),
            rateBp: 490,
            conditions: [],
            signedAt: quarter(-8),
            trancheId: 't_ol_institutional_floating',
          },
        ],
        perProject: { sitePrep: score(40), megaContract: true, settlementPremium: score(10) },
      },
    ],
    characters: { ...INITIAL_CHARACTERS },
    inbox: [],
    delayedQueue: [],
    standingOrders: [],
    activeObligations: [],
    engineVars: {
      templates: score(clampScore(mods.templates)),
      crosslinxLeverage: score(55),
      consultantAlignment: signed(0),
      nimbyOrganization: score(25),
      openBooks: mods.openBooks,
      engineers: mods.engineers,
      publicApproval: score(clampScore(mods.publicApproval)),
    },
    rng: createRngSeeds(seed),
    actionLog: [],
    nextLogId: 1,
    gameOverCounters: { ...INITIAL_GAME_OVER_COUNTERS },
  };
}
