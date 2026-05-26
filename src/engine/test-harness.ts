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

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
import { loadGameFromJson, saveGameToJson } from './saveLoad';
import { resolveEventChoice, visibleChoices } from './events/firing';
import { eventTemplateById } from './events/templates';

interface QuarterSnapshot {
  q: number;
  yearLabel: string;
  cash: number;
  cashDelta: number;
  dailyRiders: number;
  ttcRiders: number;
  goRiders: number;
  upRiders: number;
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
    ttcRiders: state.agencies.ttc.dailyRiders as unknown as number,
    goRiders: state.agencies.go.dailyRiders as unknown as number,
    upRiders: state.agencies.up.dailyRiders as unknown as number,
    ttcReliability: avg(conditions),
    bocPolicyRateBp: state.debt.bocPolicyRate as unknown as number,
    ontarioLineState: ontarioLine?.state ?? 'gone',
    operatingGap,
  };
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
    'ΔCash/Q',
    'OpGap/Q',
    'TTC',
    'GO',
    'UP',
    'Total',
    'TTC reliab',
    'OL',
  ];
  const widths = [3, 8, 10, 9, 9, 8, 7, 6, 8, 10, 18];
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
      fmtRiders(s.ttcRiders),
      fmtRiders(s.goRiders),
      fmtRiders(s.upRiders),
      fmtRiders(s.dailyRiders),
      s.ttcReliability.toFixed(1),
      s.ontarioLineState,
    ];
    console.log(row.map((c, i) => pad(c, widths[i] ?? 10)).join(' '));
  }
}

function writeCsv(snapshots: QuarterSnapshot[], path: string): void {
  const lines = [
    'quarter,year_label,cash_M,cash_delta_M,operating_gap_M,ttc_riders,go_riders,up_riders,total_riders,ttc_reliability,boc_bp,ontario_line_state',
  ];
  for (const s of snapshots) {
    lines.push(
      [
        s.q,
        s.yearLabel,
        s.cash.toFixed(2),
        s.cashDelta.toFixed(2),
        s.operatingGap.toFixed(2),
        s.ttcRiders,
        s.goRiders,
        s.upRiders,
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
 * Generate a 3-panel SVG: cash, operating gap, per-agency ridership.
 * Hand-rolled SVG so the harness has zero runtime deps.
 */
function writeSvg(snapshots: QuarterSnapshot[], path: string): void {
  const width = 1000;
  const panelHeight = 240;
  const panelGap = 50;
  const padding = { top: 30, right: 30, bottom: 40, left: 80 };
  const totalHeight = panelHeight * 3 + panelGap * 2 + 30;
  const innerW = width - padding.left - padding.right;
  const innerH = panelHeight - padding.top - padding.bottom;

  function minMax(arrs: number[][]): [number, number] {
    let mn = Infinity;
    let mx = -Infinity;
    for (const arr of arrs) {
      for (const v of arr) {
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
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

  function ticks(yMin: number, yMax: number, yOffset: number, formatter: (v: number) => string) {
    const out: { y: number; label: string }[] = [];
    for (let i = 0; i <= 4; i++) {
      const v = yMin + ((yMax - yMin) * i) / 4;
      const y = yOffset + padding.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
      out.push({ y, label: formatter(v) });
    }
    return out;
  }

  const cashSeries = snapshots.map((s) => s.cash);
  const gapSeries = snapshots.map((s) => s.operatingGap);
  const ttcSeries = snapshots.map((s) => s.ttcRiders);
  const goSeries = snapshots.map((s) => s.goRiders);

  const cashY = 0;
  const gapY = panelHeight + panelGap;
  const ridersY = (panelHeight + panelGap) * 2;

  const [cashMn, cashMx] = minMax([cashSeries]);
  const [gapMn, gapMx] = minMax([gapSeries]);
  const [ttcMn, ttcMx] = minMax([ttcSeries]);
  const [goMn, goMx] = minMax([goSeries]);

  const cashTicks = ticks(cashMn, cashMx, cashY, fmtMoney);
  const gapTicks = ticks(gapMn, gapMx, gapY, (v) => `${v >= 0 ? '+' : ''}${fmtMoney(v)}`);
  const ttcTicks = ticks(ttcMn, ttcMx, ridersY, fmtRiders);

  const xLabels = snapshots
    .filter((_, i) => i % 8 === 0)
    .map((s) => {
      const i = snapshots.indexOf(s);
      const stepX = innerW / Math.max(1, snapshots.length - 1);
      return { x: padding.left + i * stepX, label: s.yearLabel };
    });

  const cashPath = points(cashSeries, cashMn, cashMx, cashY);
  const gapPath = points(gapSeries, gapMn, gapMx, gapY);
  const ttcPath = points(ttcSeries, ttcMn, ttcMx, ridersY);
  // GO scaled to same min/max as TTC for visual comparison? No — too different.
  // Show GO on right-side independent axis instead. Simpler: just show TTC.
  // We'll annotate GO numerically on the chart.

  // Zero line for the gap panel
  const gapZeroPos =
    gapMn < 0 && gapMx > 0
      ? gapY + padding.top + (1 - (0 - gapMn) / (gapMx - gapMn)) * innerH
      : null;

  const cashBottom = cashY + padding.top + innerH;
  const gapBottom = gapY + padding.top + innerH;
  const ridersBottom = ridersY + padding.top + innerH;

  // GO line scaled to TTC axis is unreadable due to scale gap. Show GO on
  // a normalized axis (right-side ticks) by mapping its [min, max] to the
  // same screen [yMin, yMax] coordinates.
  const goPath = goSeries
    .map((v, i) => {
      const stepX = innerW / Math.max(1, goSeries.length - 1);
      const x = padding.left + i * stepX;
      const y = ridersY + padding.top + (1 - (v - goMn) / (goMx - goMn)) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const goRightTicks = ticks(goMn, goMx, ridersY, fmtRiders);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${totalHeight}" font-family="ui-sans-serif, system-ui, -apple-system, sans-serif" font-size="12">
  <style>
    .bg { fill: #0a0a0a; }
    .panel-bg { fill: #171717; }
    .axis { stroke: #404040; stroke-width: 1; }
    .grid { stroke: #262626; stroke-width: 0.5; }
    .zero-line { stroke: #525252; stroke-width: 0.5; stroke-dasharray: 4 4; }
    .label { fill: #a3a3a3; }
    .label-go { fill: #a78bfa; }
    .title { fill: #f5f5f5; font-size: 14px; font-weight: 600; }
    .cash-line { stroke: #fbbf24; stroke-width: 2; fill: none; }
    .gap-line { stroke: #f87171; stroke-width: 2; fill: none; }
    .ttc-line { stroke: #22d3ee; stroke-width: 2; fill: none; }
    .go-line { stroke: #a78bfa; stroke-width: 1.5; fill: none; stroke-dasharray: 3 3; }
    .legend { fill: #d4d4d8; font-size: 11px; }
  </style>
  <rect class="bg" width="${width}" height="${totalHeight}" />

  <!-- Cash panel -->
  <rect class="panel-bg" x="${padding.left}" y="${cashY + padding.top}" width="${innerW}" height="${innerH}" />
  <text class="title" x="${padding.left}" y="${cashY + 20}">Cash on hand ($M)</text>
  ${cashTicks
    .map(
      (t) => `<line class="grid" x1="${padding.left}" y1="${t.y}" x2="${padding.left + innerW}" y2="${t.y}" /><text class="label" x="${padding.left - 8}" y="${t.y + 4}" text-anchor="end">${t.label}</text>`,
    )
    .join('')}
  <line class="axis" x1="${padding.left}" y1="${cashY + padding.top}" x2="${padding.left}" y2="${cashBottom}" />
  <line class="axis" x1="${padding.left}" y1="${cashBottom}" x2="${padding.left + innerW}" y2="${cashBottom}" />
  <polyline class="cash-line" points="${cashPath}" />

  <!-- Operating gap panel -->
  <rect class="panel-bg" x="${padding.left}" y="${gapY + padding.top}" width="${innerW}" height="${innerH}" />
  <text class="title" x="${padding.left}" y="${gapY + 20}">Operating gap per quarter ($M) — agency loss/profit before project burn</text>
  ${gapTicks
    .map(
      (t) => `<line class="grid" x1="${padding.left}" y1="${t.y}" x2="${padding.left + innerW}" y2="${t.y}" /><text class="label" x="${padding.left - 8}" y="${t.y + 4}" text-anchor="end">${t.label}</text>`,
    )
    .join('')}
  ${gapZeroPos !== null ? `<line class="zero-line" x1="${padding.left}" y1="${gapZeroPos}" x2="${padding.left + innerW}" y2="${gapZeroPos}" />` : ''}
  <line class="axis" x1="${padding.left}" y1="${gapY + padding.top}" x2="${padding.left}" y2="${gapBottom}" />
  <line class="axis" x1="${padding.left}" y1="${gapBottom}" x2="${padding.left + innerW}" y2="${gapBottom}" />
  <polyline class="gap-line" points="${gapPath}" />

  <!-- Riders panel (TTC primary, GO on right axis) -->
  <rect class="panel-bg" x="${padding.left}" y="${ridersY + padding.top}" width="${innerW}" height="${innerH}" />
  <text class="title" x="${padding.left}" y="${ridersY + 20}">Daily riders</text>
  <text class="legend" x="${padding.left + 160}" y="${ridersY + 20}">— TTC (left)   ┄ GO (right)</text>
  ${ttcTicks
    .map(
      (t) => `<line class="grid" x1="${padding.left}" y1="${t.y}" x2="${padding.left + innerW}" y2="${t.y}" /><text class="label" x="${padding.left - 8}" y="${t.y + 4}" text-anchor="end">${t.label}</text>`,
    )
    .join('')}
  ${goRightTicks
    .map(
      (t) => `<text class="label-go" x="${padding.left + innerW + 8}" y="${t.y + 4}" text-anchor="start">${t.label}</text>`,
    )
    .join('')}
  <line class="axis" x1="${padding.left}" y1="${ridersY + padding.top}" x2="${padding.left}" y2="${ridersBottom}" />
  <line class="axis" x1="${padding.left}" y1="${ridersBottom}" x2="${padding.left + innerW}" y2="${ridersBottom}" />
  <polyline class="ttc-line" points="${ttcPath}" />
  <polyline class="go-line" points="${goPath}" />

  <!-- X axis labels -->
  ${xLabels
    .map(
      (l) =>
        `<text class="label" x="${l.x}" y="${ridersBottom + 16}" text-anchor="middle">${l.label}</text>`,
    )
    .join('')}
</svg>`;

  writeFileSync(path, svg);
}

/**
 * Run the campaign, keeping the final GameState around (not just snapshots)
 * so we can dump action log and serialize state at the end.
 */
/**
 * Auto-resolve every pending event by picking the first available choice.
 * Lets the harness measure realistic event density (otherwise the inbox
 * fills and re-fires get blocked by the in-inbox eligibility check).
 */
function autoResolveInbox(state: GameState): GameState {
  let s = state;
  for (const active of state.inbox) {
    const tmpl = eventTemplateById(active.templateId);
    if (!tmpl) continue;
    const choices = visibleChoices(s, tmpl);
    if (choices.length === 0) continue;
    s = resolveEventChoice(s, active.templateId, choices[0]!.id).state;
  }
  return s;
}

function runCampaignFull(seed: number, quarters: number): { snapshots: QuarterSnapshot[]; finalState: GameState } {
  let state = createInitialGameState(seed);
  const snapshots: QuarterSnapshot[] = [snapshot(state)];
  for (let i = 0; i < quarters; i++) {
    state = endTurn(state);
    state = autoResolveInbox(state);
    snapshots.push(snapshot(state));
  }
  return { snapshots, finalState: state };
}

function printActionLog(state: GameState, forQuarter: number | undefined): void {
  const entries = state.actionLog.filter(
    (e) => forQuarter === undefined || (e.quarter as unknown as number) === forQuarter,
  );
  if (entries.length === 0) {
    console.log(
      forQuarter === undefined
        ? 'Action log empty.'
        : `No log entries for Q${forQuarter}.`,
    );
    return;
  }
  console.log('');
  console.log(`=== Action log${forQuarter !== undefined ? ` for Q${forQuarter}` : ''} ===`);
  for (const e of entries) {
    const q = e.quarter as unknown as number;
    console.log(`[${e.id}] Q${q} ${e.kind} — ${e.summary}`);
    if (e.kind === 'quarter_summary') {
      const b = e.breakdown;
      console.log(
        `    cash:  alw +${b.cashFlow.operatingAllowance.toFixed(0)} · fare +${b.cashFlow.fareRevenue.toFixed(0)} · opex -${b.cashFlow.operatingExpense.toFixed(0)} · maint -${b.cashFlow.maintenance.toFixed(0)} · debt -${b.cashFlow.debtService.toFixed(0)} · refi -${b.cashFlow.refiFee.toFixed(0)} = ${b.cashFlow.netDelta >= 0 ? '+' : ''}${b.cashFlow.netDelta.toFixed(0)}M`,
      );
      for (const aid of ['ttc', 'go', 'up'] as const) {
        const a = b.ridership.perAgency[aid];
        const net = a.after - a.before;
        const detail = [
          `growth ${a.fromGrowth >= 0 ? '+' : ''}${a.fromGrowth}`,
          `drag ${a.fromReliabilityDrag}`,
        ];
        if (a.fromProjectPrimary) detail.push(`project +${a.fromProjectPrimary}`);
        if (a.fromCannibalization) detail.push(`cannibal ${a.fromCannibalization}`);
        console.log(
          `    ${aid}: ${a.before.toLocaleString()} → ${a.after.toLocaleString()} (${net >= 0 ? '+' : ''}${net.toLocaleString()}) [${detail.join(', ')}]`,
        );
      }
      if (b.projects.transitions.length > 0) {
        for (const t of b.projects.transitions) {
          console.log(`    transition: ${t.templateId} ${t.from} → ${t.to}`);
        }
      }
      if (b.projects.constructionDraws.length > 0) {
        for (const d of b.projects.constructionDraws) {
          console.log(
            `    construction: ${d.templateId} drew $${d.drawn.toFixed(0)}M, remaining $${d.remainingFunding.toFixed(0)}M`,
          );
        }
      }
    }
  }
}

interface CliArgs {
  seed: number;
  quarters: number;
  /** If set, print the action log for this quarter. */
  logQuarter?: number | 'all';
  /** Path to load an existing save and continue from there. */
  load?: string;
  /** Write the final state to this path. Defaults to dist-harness/state.json. */
  save?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { seed: 1, quarters: 60 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--seed') {
      args.seed = Number(argv[++i]);
    } else if (a === '--quarters') {
      args.quarters = Number(argv[++i]);
    } else if (a === '--log') {
      const next = argv[i + 1];
      if (next === 'all') {
        args.logQuarter = 'all';
        i++;
      } else if (next && /^\d+$/.test(next)) {
        args.logQuarter = Number(next);
        i++;
      } else {
        args.logQuarter = 'all';
      }
    } else if (a === '--load') {
      const next = argv[++i];
      if (next) args.load = next;
    } else if (a === '--save') {
      const next = argv[++i];
      if (next) args.save = next;
    } else if (!a.startsWith('--') && i === 0) {
      // Backwards compat: `npm run engine:harness <seed>`
      args.seed = Number(a);
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `METRO engine test harness — seed ${args.seed}, ${args.quarters} quarters${args.load ? ` (resumed from ${args.load})` : ''}`,
  );
  console.log('');

  const start = performance.now();
  let snapshots: QuarterSnapshot[];
  let finalState: GameState;
  if (args.load) {
    const json = readFileSync(args.load, 'utf8');
    let state = loadGameFromJson(json);
    snapshots = [snapshot(state)];
    for (let i = 0; i < args.quarters; i++) {
      state = endTurn(state);
      state = autoResolveInbox(state);
      snapshots.push(snapshot(state));
    }
    finalState = state;
  } else {
    const result = runCampaignFull(args.seed, args.quarters);
    snapshots = result.snapshots;
    finalState = result.finalState;
  }
  const elapsedMs = performance.now() - start;

  printTable(snapshots);
  console.log('');
  console.log(`Run completed in ${elapsedMs.toFixed(1)}ms.`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const csvPath = resolve(OUTPUT_DIR, 'run.csv');
  const svgPath = resolve(OUTPUT_DIR, 'run.svg');
  const statePath = args.save ?? resolve(OUTPUT_DIR, 'state.json');
  writeCsv(snapshots, csvPath);
  writeSvg(snapshots, svgPath);
  writeFileSync(statePath, saveGameToJson(finalState));
  console.log(`Wrote ${csvPath}`);
  console.log(`Wrote ${svgPath}`);
  console.log(`Wrote ${statePath}`);

  if (args.logQuarter !== undefined) {
    printActionLog(finalState, args.logQuarter === 'all' ? undefined : args.logQuarter);
  } else {
    // Default: show the most recent quarter's log entry inline so the user
    // can eyeball that the breakdown looks sane.
    const lastQuarter = finalState.quarter as unknown as number;
    printActionLog(finalState, lastQuarter);
    console.log('');
    console.log(
      `(${finalState.actionLog.length} log entries total. Re-run with --log <quarter> or --log all to see more.)`,
    );
  }
}

main();
