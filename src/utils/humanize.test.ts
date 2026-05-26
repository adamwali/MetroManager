import { describe, expect, it } from 'vitest';
import {
  describeBoardConfidence,
  describeCashRunway,
  describeRidersDelta,
  describeTrust,
  formatMoney,
  formatMoneyDelta,
  formatPctDelta,
  formatRiders,
  formatRidersDelta,
  quarterLabel,
  quartersUntilLabel,
} from './humanize';

describe('formatMoney', () => {
  it('formats millions correctly', () => {
    expect(formatMoney(234)).toBe('$234M');
    expect(formatMoney(-100)).toBe('-$100M');
  });
  it('formats billions correctly', () => {
    expect(formatMoney(1_000)).toBe('$1.00B');
    expect(formatMoney(8_200)).toBe('$8.20B');
    expect(formatMoney(-3_230)).toBe('-$3.23B');
  });
});

describe('formatMoneyDelta', () => {
  it('always has a sign', () => {
    expect(formatMoneyDelta(120)).toBe('+$120M');
    expect(formatMoneyDelta(-134)).toBe('-$134M');
    expect(formatMoneyDelta(0)).toBe('$0');
  });
});

describe('formatRiders / formatRidersDelta', () => {
  it('formats by magnitude', () => {
    expect(formatRiders(4_750_000)).toBe('4.75M');
    expect(formatRiders(335_000)).toBe('335k');
    expect(formatRiders(12_000)).toBe('12k');
  });
  it('signed deltas', () => {
    expect(formatRidersDelta(145_000)).toBe('+145k');
    expect(formatRidersDelta(-30_125)).toBe('-30k');
  });
});

describe('formatPctDelta', () => {
  it('signs and rounds', () => {
    expect(formatPctDelta(0.05)).toBe('+5.0%');
    expect(formatPctDelta(-0.123)).toBe('-12.3%');
  });
});

describe('describeCashRunway', () => {
  it('says growing when positive delta', () => {
    expect(describeCashRunway(1_000, 50)).toBe('growing');
  });
  it('reports quarters when burning hard', () => {
    expect(describeCashRunway(400, -200)).toContain('quarters');
  });
  it('reports years when long runway', () => {
    expect(describeCashRunway(10_000, -200)).toContain('years');
  });
  it('underwater when negative', () => {
    expect(describeCashRunway(-100, -100)).toBe('underwater');
  });
});

describe('describeRidersDelta', () => {
  it('describes magnitudes', () => {
    expect(describeRidersDelta(0)).toBe('flat');
    expect(describeRidersDelta(2_000)).toContain('minor');
    expect(describeRidersDelta(85_000)).toContain('bus route');
    expect(describeRidersDelta(-150_000)).toContain('streetcar');
    expect(describeRidersDelta(400_000)).toContain('subway');
  });
});

describe('describeTrust', () => {
  it('maps thresholds per design doc §6', () => {
    expect(describeTrust(10)).toBe('hostile');
    expect(describeTrust(40)).toBe('skeptical');
    expect(describeTrust(60)).toBe('cooperative');
    expect(describeTrust(80)).toBe('aligned');
  });
});

describe('describeBoardConfidence', () => {
  it('signals firing zone', () => {
    expect(describeBoardConfidence(20)).toBe('firing imminent');
    expect(describeBoardConfidence(30)).toBe('formal warning');
    expect(describeBoardConfidence(70)).toBe('supportive');
  });
});

describe('quarter labels', () => {
  it('quarterLabel formats correctly', () => {
    expect(quarterLabel(0)).toBe('Q1 2026');
    expect(quarterLabel(3)).toBe('Q4 2026');
    expect(quarterLabel(4)).toBe('Q1 2027');
    expect(quarterLabel(20)).toBe('Q1 2031');
  });
  it('quartersUntilLabel handles various ranges', () => {
    expect(quartersUntilLabel(0)).toBe('now');
    expect(quartersUntilLabel(1)).toBe('1 quarter');
    expect(quartersUntilLabel(3)).toBe('3 quarters');
    expect(quartersUntilLabel(4)).toBe('1 year');
    expect(quartersUntilLabel(8)).toBe('2 years');
    expect(quartersUntilLabel(9)).toBe('2y 1q');
  });
});
