/**
 * Common scalar wrappers and helpers used across the type system.
 *
 * These are TypeScript brand types. They give us nominal typing on top of
 * structural primitives so that, for example, a `QuarterIndex` can't be
 * accidentally passed where a `RelationshipScore` is expected, even though
 * both are numbers at runtime.
 */

declare const brand: unique symbol;
export type Brand<T, B> = T & { readonly [brand]: B };

/** Quarter index since campaign start. Q1 2026 = 0, Q2 2026 = 1, ... Q4 2040 = 59. */
export type QuarterIndex = Brand<number, 'QuarterIndex'>;

/** Cash in CAD millions. Engine math is in $M; UI humanizes for display. */
export type CashMillions = Brand<number, 'CashMillions'>;

/** Ridership in raw daily-rider count. 4.2M = 4_200_000. */
export type DailyRiders = Brand<number, 'DailyRiders'>;

/** A 0-100 score. Trust, board confidence, tolerance, relationship, etc. */
export type Score100 = Brand<number, 'Score100'>;

/** A -100 to +100 score. Used by consultantAlignment and similar. */
export type SignedScore = Brand<number, 'SignedScore'>;

/** A percentage 0-1 (decimal). 0.30 = 30%. */
export type Percent = Brand<number, 'Percent'>;

/** Basis points (1bp = 0.01%). Coupons, spreads, rate deltas. */
export type BasisPoints = Brand<number, 'BasisPoints'>;

/** ISO 8601 date string (game-internal calendar). */
export type DateISO = Brand<string, 'DateISO'>;

/**
 * Constructors. These are no-ops at runtime — they only exist to let calling
 * code declare intent. The engine never validates these at the type boundary
 * because we trust internal callers; validation belongs at save-load.
 */
export const cash = (n: number) => n as CashMillions;
export const riders = (n: number) => n as DailyRiders;
export const quarter = (n: number) => n as QuarterIndex;
export const score = (n: number) => n as Score100;
export const signed = (n: number) => n as SignedScore;
export const pct = (n: number) => n as Percent;
export const bp = (n: number) => n as BasisPoints;
