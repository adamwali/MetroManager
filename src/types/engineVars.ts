import type { Score100, SignedScore } from './scalars';

/**
 * Agency-level engine variables. Per design doc §5 canonical engine
 * variables table (v3.2). These are referenced by event triggers and
 * effects throughout the catalogue; centralized here so types stay sane.
 */

export interface EngineVars {
  /** 0-100. Standardization adoption. High = lower per-km cost factor. Starts 30. */
  templates: Score100;
  /** 0-100. Bargaining power of the Crosslinx consortium against you. Starts 55. */
  crosslinxLeverage: Score100;
  /** -100 to +100. Consulting-industry relationship. Negative draws op-ed campaigns. Starts 0. */
  consultantAlignment: SignedScore;
  /** 0-100. Aggregate NIMBY coalition organizing strength. Starts 25. */
  nimbyOrganization: Score100;
  /** True once player formally adopts open-data / transparent-procurement. */
  openBooks: boolean;
  /** In-house engineering headcount. Starts 180. */
  engineers: number;
  /** 0-100. Voter sentiment about your agency, distinct from government trust. Starts 50. */
  publicApproval: Score100;
}
