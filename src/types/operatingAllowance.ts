import type { CashMillions, QuarterIndex } from './scalars';

/**
 * Operating allowance — the 4-year tri-government pact that covers the
 * opex shortfall (opex + maintenance + debt service - fare revenue).
 *
 * v3.3 economic model. Replaces the prior annual indexed government
 * inflow. Renegotiated every 16 quarters (4 years).
 *
 * Amount is FLAT across the 4-year term — no annual indexing. Each quarter
 * the engine credits annualAmount / 4 to cash.
 */
export interface OperatingAllowance {
  /** Annualized $M agreed at the most recent negotiation. Default starts $2.4B. */
  annualAmount: CashMillions;
  /** Quarter at which the current pact was signed. */
  signedAt: QuarterIndex;
  /** Quarter at which renegotiation fires. signedAt + 16. */
  renegotiatesAt: QuarterIndex;
  /** Any controls imposed by the most recent decrease-with-controls outcome. Empty otherwise. */
  controls: OperatingAllowanceControl[];
}

export type OperatingAllowanceControl =
  | { kind: 'projectDeprioritization'; projectIds: string[] }
  | { kind: 'mandatoryPetProject'; projectId: string }
  | { kind: 'costCap'; capPerQuarter: CashMillions }
  | { kind: 'hiringFreezeRoles'; roles: string[] };
