/**
 * Mandate Bet. Phase 11.
 *
 * At Q0 the CEO declares ONE of three mandates. The campaign tracks
 * progress against it through Q60 and the final grade is mandate-based,
 * giving the 15-year arc a thesis instead of "max all numbers."
 *
 * - **ridership**: grow daily riders by +500k vs Q0 baseline (~+25%)
 * - **reliability**: avg reliability ≥ 80 across TTC + GO at Q60
 * - **affordability**: hold real fares flat (no aggressive hikes) AND end
 *    with approval ≥ 65
 *
 * Each mandate reweights the final scoring: hitting the mandate target
 * by Q60 = LEGACY achievement, missing it = a footnote even if other
 * stats are fine.
 */

export type MandateId = 'ridership' | 'reliability' | 'affordability';

export interface MandateConfig {
  id: MandateId;
  shortLabel: string;       // chip text
  headline: string;         // 3-5 word pitch
  pitch: string;            // 1-2 sentence framing
  target: string;           // measurable goal copy
}

export const MANDATES: Record<MandateId, MandateConfig> = {
  ridership: {
    id: 'ridership',
    shortLabel: 'Ridership',
    headline: 'Move more people, period.',
    pitch:
      'Your legacy will be measured in daily journeys. Grow ridership to 2.45M/day. Cut fares if you have to, expand frequencies, open lines — whatever puts butts in seats.',
    target: 'Daily riders ≥ 2.45M at Q60 (~+25% vs Q0)',
  },
  reliability: {
    id: 'reliability',
    shortLabel: 'Reliability',
    headline: "Make it work like it's Tokyo.",
    pitch:
      "Your legacy will be a network people can trust. Hit a sustained reliability score of 80+ on TTC and GO by the end of the campaign. Maintenance discipline above flash.",
    target: 'TTC + GO reliability avg ≥ 80 at Q60',
  },
  affordability: {
    id: 'affordability',
    shortLabel: 'Affordability',
    headline: 'Keep transit a public good.',
    pitch:
      'Your legacy will be a system the city can still afford to ride. Hold real fares flat across the campaign AND end with public approval ≥ 65.',
    target: 'No aggressive fare hikes + approval ≥ 65 at Q60',
  },
};
