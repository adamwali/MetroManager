import type { CashMillions, DailyRiders, Score100 } from './scalars';

/**
 * Operating agencies (TTC, GO, UP). Per design doc §4, §8.
 *
 * Each agency has subsystems whose 0-100 condition scores decay over time
 * and can be invested into preventively or replaced reactively. The
 * director (a Character with operating-director doctrine) runs the agency
 * within the player's set frequency / fare / maintenance parameters.
 */

export type AgencyId = 'ttc' | 'go' | 'up';

export type SubsystemId = 'rollingStock' | 'track' | 'signals' | 'stations' | 'catenary';

export interface SubsystemCondition {
  id: SubsystemId;
  /** 0-100 condition. Decays each quarter at the subsystem-specific rate. */
  condition: Score100;
  /** Quarterly maintenance budget allocated to this subsystem, $M. */
  maintenanceBudget: CashMillions;
}

export type FarePolicyTier = 'reduced' | 'current' | 'modestIncrease' | 'aggressiveIncrease';

export interface AgencyOperatingParams {
  /** Frequency policy per line — affects ridership and opex. Phase 5.1 implements specifics. */
  frequencyPolicy: 'reduced' | 'current' | 'enhanced';
  farePolicy: FarePolicyTier;
}

export interface Agency {
  id: AgencyId;
  /** Latest daily-ridership number from the operating network this agency runs. */
  dailyRiders: DailyRiders;
  subsystems: SubsystemCondition[];
  operatingParams: AgencyOperatingParams;
  /** Character id of the director running this agency. */
  directorCharacterId: string;
  /** Latest quarter opex, $M. Updated by engine.endTurn. */
  lastQuarterOpex: CashMillions;
  /** Latest quarter fare revenue, $M. */
  lastQuarterFareRevenue: CashMillions;
}

export type Agencies = Record<AgencyId, Agency>;
