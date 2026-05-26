/**
 * Number humanization. Per design doc §0 P4 — "every KPI shows the
 * number AND a human comparison." The comparison is what makes the
 * number mean something to the player.
 *
 * All inputs are plain numbers (branded scalars erase at runtime).
 */

/** Format cash in $M as "$1.0B" / "$234M". */
export function formatMoney(millions: number): string {
  const abs = Math.abs(millions);
  if (abs >= 1_000) return `${millions < 0 ? '-' : ''}$${(abs / 1_000).toFixed(2)}B`;
  return `${millions < 0 ? '-' : ''}$${abs.toFixed(0)}M`;
}

/** Format a signed delta: "+$120M" / "-$45M". */
export function formatMoneyDelta(millions: number): string {
  if (millions === 0) return '$0';
  const sign = millions > 0 ? '+' : '-';
  const abs = Math.abs(millions);
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(2)}B`;
  return `${sign}$${abs.toFixed(0)}M`;
}

/** Format daily-rider count: "4.75M" / "335k" / "12k". */
export function formatRiders(daily: number): string {
  if (daily >= 1_000_000) return `${(daily / 1_000_000).toFixed(2)}M`;
  if (daily >= 1_000) return `${(daily / 1_000).toFixed(0)}k`;
  return `${daily}`;
}

/** Format a signed rider delta. */
export function formatRidersDelta(delta: number): string {
  if (delta === 0) return '0';
  const sign = delta > 0 ? '+' : '-';
  const abs = Math.abs(delta);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}k`;
  return `${sign}${abs}`;
}

/** Format a percent. */
export function formatPct(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Format a signed percent delta. */
export function formatPctDelta(fraction: number, digits = 1): string {
  const sign = fraction > 0 ? '+' : '';
  return `${sign}${(fraction * 100).toFixed(digits)}%`;
}

// ----------------------------------------------------------------------
// Human comparisons — the P4 design principle made real.
// ----------------------------------------------------------------------

/** Cash runway estimate: "~3 months" / "~2 quarters" / "9+ years". */
export function describeCashRunway(balanceMillions: number, lastQuarterDeltaMillions: number): string {
  if (lastQuarterDeltaMillions === 0) {
    return balanceMillions > 0 ? 'starting balance' : 'underwater';
  }
  if (lastQuarterDeltaMillions >= 0) {
    return balanceMillions > 0 ? 'growing' : 'recovering';
  }
  if (balanceMillions <= 0) return 'underwater';
  const burnPerQ = Math.abs(lastQuarterDeltaMillions);
  const quartersLeft = balanceMillions / burnPerQ;
  if (quartersLeft < 1) return '<1 quarter runway';
  if (quartersLeft < 4) return `~${quartersLeft.toFixed(1)} quarters runway`;
  const years = quartersLeft / 4;
  if (years < 2) return `~${years.toFixed(1)} years runway`;
  return `${years.toFixed(0)}+ years runway`;
}

/**
 * Ridership delta in plain terms. Thresholds calibrated to Toronto
 * networks (busiest buses ~50k/day, busy bus route up to ~100k incl
 * crowd-source, streetcar lines 60-100k, subway extensions add ~150-400k,
 * full subway lines 700k+).
 */
export function describeRidersDelta(delta: number): string {
  const abs = Math.abs(delta);
  if (abs === 0) return 'flat';
  if (abs < 5_000) return delta > 0 ? 'minor uptick' : 'minor decline';
  if (abs < 25_000) return delta > 0 ? '~1 bus route worth' : '~1 bus route lost';
  if (abs < 100_000) return delta > 0 ? '~a busy bus route' : '~a busy bus route lost';
  if (abs < 250_000) return delta > 0 ? '~a streetcar line worth' : '~a streetcar line lost';
  if (abs < 500_000) return delta > 0 ? '~a subway extension worth' : '~a subway extension lost';
  return delta > 0 ? '~a full subway line' : '~a full subway line lost';
}

/** Trust score qualitative descriptor per design doc §6 thresholds. */
export function describeTrust(score: number): string {
  if (score < 25) return 'hostile';
  if (score < 50) return 'skeptical';
  if (score < 75) return 'cooperative';
  return 'aligned';
}

/** Board confidence descriptor per §3 thresholds. */
export function describeBoardConfidence(score: number): string {
  if (score < 25) return 'firing imminent';
  if (score < 40) return 'formal warning';
  if (score < 60) return 'concerned';
  if (score < 80) return 'supportive';
  return 'strong backing';
}

/** Reliability composite qualitative descriptor. */
export function describeReliability(score: number): string {
  if (score < 25) return 'system at risk';
  if (score < 40) return 'degraded';
  if (score < 60) return 'getting tired';
  if (score < 80) return 'reliable';
  return 'pristine';
}

/** Quarter index → "Q3 2027" label. */
export function quarterLabel(quarterIndex: number): string {
  const year = 2026 + Math.floor(quarterIndex / 4);
  const q = (quarterIndex % 4) + 1;
  return `Q${q} ${year}`;
}

/** Number of quarters → "8 quarters" / "3 years 1 quarter". */
export function quartersUntilLabel(quartersFromNow: number): string {
  if (quartersFromNow <= 0) return 'now';
  if (quartersFromNow === 1) return '1 quarter';
  if (quartersFromNow < 4) return `${quartersFromNow} quarters`;
  const years = Math.floor(quartersFromNow / 4);
  const extraQ = quartersFromNow % 4;
  if (extraQ === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years}y ${extraQ}q`;
}
