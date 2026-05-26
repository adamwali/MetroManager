import type { AgencyId } from './agency';
import type { EventEffect } from './events';
import type { QuarterIndex } from './scalars';

/**
 * Active obligations created by event choices that constrain future
 * player actions. Phase 3.2 (post-review polish).
 *
 * Example: accepting a "no fare hike for 4Q" pledge creates a
 * `fareFreezePledge` obligation. The TTC dashboard surfaces this as a
 * visible badge; if the player raises fares while the pledge is active,
 * the engine applies the political costs immediately (transparently).
 *
 * Player isn't blocked — they're informed. Per design doc §0 P8.
 */

export type ActiveObligation = {
  id: string;
  /** Quarter at which the obligation expires (no longer enforces costs). */
  expiresAt: QuarterIndex;
  /** Source event template that created this obligation. */
  sourceEventTemplateId: string;
} & ObligationKind;

export type ObligationKind = {
  kind: 'fareFreezePledge';
  agencyId: AgencyId;
  /** Effects applied if player raises fares while pledge active. */
  costOfBreaking: EventEffect[];
  /** Short description of the political cost for UI display. */
  breakingDescription: string;
};
