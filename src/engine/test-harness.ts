/**
 * CLI test harness for the engine.
 *
 * Runs 60 quarters from a deterministic seed, prints a formatted table of
 * the per-quarter financial heartbeat, writes a CSV with all KPIs, and
 * generates a two-panel SVG chart (cash + ridership) you can open in a
 * browser to eyeball whether the trajectory looks plausible.
 *
 * Usage:
 *   npm run engine:harness
 *
 * Outputs (relative to cwd):
 *   dist-harness/run.csv
 *   dist-harness/run.svg
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GameState } from '@/types/gameState';
import { createInitialGameState } from './createInitialGameState';
import { endTurn } from './endTurn';
import { quarterlyDebtService } from './finance';
import {
  quarterlyFareRevenue,
  quarterlyMaintenanceExpense,
  quarterlyOperatingAllowance,
  quarterlyOperatingExpense,
} from './cashflow';

interface QuarterSnapshot {
  q: number;
  yearLabel: string;
  cash: number;
  cashDelta: number;
  dailyRiders: number;
  ttcReliability: number;
  bocPolicyRateBp: number;
  ontarioLineState: string;
  /** Operating-side ins (allowance + fare) - outs (opex + maint + debt service). */
  operatingGap: number;
}

const OUTPUT_DIR = resolve(process.cwd(), 'dist-harness');

function quarterLabel(qIndex: number): string {
  const year = 2026 + Math.floor(qIndex / 4);
  const q = (qIndex % 4) + 1;
  return `Q${q} ${year}`;
}

function totalDailyRiders(state: GameState): number {
  return (
    (state.agencies.ttc.dailyRiders as unknown as number) +
    (state.agencies.go.dailyRiders as unknown as number) +
    (state.agencies.up.dailyRiders as unknown as number)
  );
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function snapshot(state: GameState): QuarterSnapshot {
  const q = state.quarter as unknown as number;
  const conditions = state.agencies.ttc.subsystems.map((s) => s.condition as unknown as number);
  const ontarioLine = state.projects.find((p) => p.templateId === 'P00');

  const allowance = quarterlyOperatingAllowance(state.operatingAllowance) as unknown as number;
  const fare = quarterlyFareRevenue(state.agencies) as unknown as number;
  const opex = quarterlyOperatingExpense(state.agencies) as unknown as number;
  const maint = quarterlyMaintenanceExpense(state.agencies) as unknown as number;
  const debtSvc = quarterlyDebtService(state.debt) as unknown as number;
  const operatingGap = allowance + fare - opex - maint - debtSvc;

  return {
    q,
    yearLabel: quarterLabel(q),
    cash: state.cash.balance as unknown as number,
    cashDelta: state.cash.lastQuarterDelta as unknown as number,
    dailyRiders: totalDailyRiders(state),
    ttcReliability: avg(conditions),
    bocPolicyRateBp: state.debt.bocPolicyRate as unknown as number,
    ontarioLineState: ontarioLine?.state ?? 'gone',
    operatingGap,
  };
}

function runCampaign(seed: number, quarters: number): QuarterSnapshot[] {
  let state = createInitialGameState(seed);
  const snapshots: QuarterSnapshot[] = [snapshot(state)];
  for (let i = 0; i < quarters; i++) {
    state = endTurn(state);
    snapshots.push(snapshot(state));
  }
  return snapshots;
}

function fmtMoney(m: number): string {
  if (Math.abs(m) >= 1_000) return `$${(m / 1_000).toFixed(2)}B`;
  return `$${m.toFixed(0)}M`;
}

function fmtRiders(r: number): string {
  return `${(r / 1_000_000).toFixed(2)}M`;
}

function printTable(snapshots: QuarterSnapshot[]): void {
  const header = [
    'Q',
    'When',
    'Cash',
    'ΔCash',
    'OpGap/Q',
    'Riders/day',
    'TTC reliab',
    'OL state',
  ];
  const widths = [3, 8, 10, 9, 9, 11, 11, 18];
  const pad = (s: string, w: number) => s.padEnd(w);
  console.log(header.map((h, i) => pad(h, widths[i] ?? 10)).join(' '));
  console.log(widths.map((w) => '-'.repeat(w)).join(' '));
  for (const s of snapshots) {
    const row = [
      String(s.q),
      s.yearLabel,
      fmtMoney(s.cash),
      `${s.cashDelta >= 0 ? '+' : ''}${fmtMoney(s.cashDelta)}`,
      `${s.operatingGap >= 0 ? '+' : ''}${fmtMoney(s.operatingGap)}`,
      fmtRiders(s.dailyRiders),
      s.ttcReliability.toFixed(1),
      s.ontarioLineState,
    ];
    console.log(row.map((c, i) => pad(c, widths[i] ?? 10)).join(' '));
  }
}

function writeCsv(snapshots: QuarterSnapshot[], path: string): void {
  const lines = [
    'quarter,year_label,cash_M,cash_delta_M,operating_gap_M,daily_riders,ttc_reliability,boc_bp,ontario_line_state',
  ];
  for (const s of snapshots) {
    lines.push(
      [
        s.q,
        s.yearLabel,
        s.cash.toFixed(2),
        s.cashDelta.toFixed(2),
        s.operatingGap.toFixed(2),
        s.dailyRiders,
        s.ttcReliability.toFixed(2),
        s.bocPolicyRateBp,
        s.ontarioLineState,
      ].join(','),
    );
  }
  writeFileSync(path, lines.join('\n') + '\n');
}

/**
 * Generate a two-panel SVG chart: cash over time and daily riders over time.
 * No chart libraries; hand-rolled SVG so the harness has zero runtime deps.
 */
function writeSvg(snapshots: QuarterSnapshot[], path: string): void {
  const width = 1000;
  const panelHeight = 280;
  const padding = { top: 30, right: 30, bottom: 40, left: 80 };
  const totalHeight = panelHeight * 2 + 60;
  const innerW = width - padding.left - padding.right;
  const innerH = panelHeight - padding.top - padding.bottom;

  const cashSeries = snapshots.map((s) => s.cash);
  const ridersSeries = snapshots.map((s) => s.dailyRiders);

  function minMax(arr: number[]): [number, number] {
    let mn = Infinity;
    let mx = -Infinity;
    for (const v of arr) {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    if (mn === mx) {
      mn -= 1;
      mx += 1;
    }
    return [mn, mx];
  }

  function points(series: number[], yMin: number, yMax: number, yOffset: number): string {
    const stepX = innerW / Math.max(1, series.length - 1);
    return series
      .map((v, i) => {
        const x = padding.left + i * stepX;
        const y = yOffset + padding.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  function axisTicks(yMin: number, yMax: number, yOffset: number, formatter: (v: number) => string) {
    const ticks: { y: number; label: string }[] = [];
    const N = 4;
    for (let i = 0; i <= N; i++) {
      const v = yMin + ((yMax - yMin) * i) / N;
      const y = yOffset + padding.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
      ticks.push({ y, label: formatter(v) });
    }
    return ticks;
  }

  const [cashMin, cashMax] = minMax(cashSeries);
  const [ridersMin, ridersMax] = minMax(ridersSeries);

  const cashTicks = axisTicks(cashMin, cashMax, 0, (v) => fmtMoney(v));
  const ridersTicks = axisTicks(ridersMin, ridersMax, panelHeight + 60, (v) => fmtRiders(v));

  const xLabels = snapshots
    .filter((_, i) => i % 8 === 0)
    .map((s) => {
      const i = snapshots.indexOf(s);
      const stepX = innerW / Math.max(1, snapshots.length - 1);
      const x = padding.left + i * stepX;
      return { x, label: s.yearLabel };
    });

  const cashPanelBottom = padding.top + innerH;
  const ridersPanelTop = panelHeight + 60 + padding.top;
  const ridersPanelBottom = ridersPanelTop + innerH;

  const cashPath = points(cashSeries, cashMin, cashMax, 0);
  const ridersPath = points(ridersSeries, ridersMin, ridersMax, panelHeight + 60);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="12">
  <style>
    .bg { fill: #0a0a0a; }
    .panel-bg { fill: #171717; }
    .axis { stroke: #404040; stroke-width: 1; }
    .grid { stroke: #262626; stroke-width: 0.5; }
    .label { fill: #a3a3a3; }
    .title { fill: #f5f5f5; font-size: 14px; font-weight: 600; }
    .cash-line { stroke: #fbbf24; stroke-width: 2; fill: none; }
    .riders-line { stroke: #22d3ee; stroke-width: 2; fill: none; }
  </style>
  <rect class="bg" width="${width}" height="${totalHeight}" />

  <!-- Cash panel -->
  <rect class="panel-bg" x="${padding.left}" y="${padding.top}" width="${innerW}" height="${innerH}" />
  <text class="title" x="${padding.left}" y="20">Cash on hand ($M)</text>
  ${cashTicks
    .map(
      (t) => `
  <line class="grid" x1="${padding.left}" y1="${t.y}" x2="${padding.left + innerW}" y2="${t.y}" />
  <text class="label" x="${padding.left - 8}" y="${t.y + 4}" text-anchor="end">${t.label}</text>`,
    )
    .join('')}
  <line class="axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${cashPanelBottom}" />
  <line class="axis" x1="${padding.left}" y1="${cashPanelBottom}" x2="${padding.left + innerW}" y2="${cashPanelBottom}" />
  <polyline class="cash-line" points="${cashPath}" />

  <!-- Riders panel -->
  <rect class="panel-bg" x="${padding.left}" y="${ridersPanelTop}" width="${innerW}" height="${innerH}" />
  <text class="title" x="${padding.left}" y="${panelHeight + 60 + 20}">Daily riders (M)</text>
  ${ridersTicks
    .map(
      (t) => `
  <line class="grid" x1="${padding.left}" y1="${t.y}" x2="${padding.left + innerW}" y2="${t.y}" />
  <text class="label" x="${padding.left - 8}" y="${t.y + 4}" text-anchor="end">${t.label}</text>`,
    )
    .join('')}
  <line class="axis" x1="${padding.left}" y1="${ridersPanelTop}" x2="${padding.left}" y2="${ridersPanelBottom}" />
  <line class="axis" x1="${padding.left}" y1="${ridersPanelBottom}" x2="${padding.left + innerW}" y2="${ridersPanelBottom}" />
  <polyline class="riders-line" points="${ridersPath}" />

  <!-- X axis labels -->
  ${xLabels
    .map(
      (l) =>
        `<text class="label" x="${l.x}" y="${ridersPanelBottom + 16}" text-anchor="middle">${l.label}</text>`,
    )
    .join('')}
</svg>`;

  writeFileSync(path, svg);
}

function main() {
  const seed = Number(process.argv[2] ?? 1);
  console.log(`METRO engine test harness — seed ${seed}, 60 quarters`);
  console.log('');

  const start = performance.now();
  const snapshots = runCampaign(seed, 60);
  const elapsedMs = performance.now() - start;

  printTable(snapshots);
  console.log('');
  console.log(`Run completed in ${elapsedMs.toFixed(1)}ms.`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const csvPath = resolve(OUTPUT_DIR, 'run.csv');
  const svgPath = resolve(OUTPUT_DIR, 'run.svg');
  writeCsv(snapshots, csvPath);
  writeSvg(snapshots, svgPath);
  console.log(`Wrote ${csvPath}`);
  console.log(`Wrote ${svgPath}`);
}

main();
