import type { PlaytestRun } from './harness';
import { EVENT_TEMPLATES } from '@engine/events/templates';

/**
 * Aggregate playtest reports — surfaces balance + mechanical issues.
 */

export interface PlaytestReport {
  totalRuns: number;
  outcomes: {
    won: number;
    fiscalFailure: number;
    boardFired: number;
    inProgress: number;
  };
  medianQuartersPlayed: number;
  medianFinalCash: number;
  cashByQuarter: { quarter: number; p10: number; p50: number; p90: number }[];
  approvalByQuarter: { quarter: number; p10: number; p50: number; p90: number }[];
  // Coverage
  eventsNeverFired: string[];
  eventsFiredCount: { id: string; count: number; cooldownQ?: number }[];
  choicesNeverPicked: { eventId: string; choiceId: string }[];
  choicesPickedCount: { eventId: string; choiceId: string; count: number }[];
  // Anomalies
  earlyFailures: { seed: number; archetype: string; strategy: string; quarter: number; lastSummaries: string[] }[];
  consistentlyBrokenArchetypes: string[];
  // Per-archetype / per-strategy breakdown
  byArchetype: Record<string, { runs: number; failureRate: number; medianFinalCash: number }>;
  byStrategy: Record<string, { runs: number; failureRate: number; medianFinalCash: number }>;
}

export function buildReport(runs: PlaytestRun[]): PlaytestReport {
  if (runs.length === 0) {
    throw new Error('No runs to report on');
  }

  const outcomes = { won: 0, fiscalFailure: 0, boardFired: 0, inProgress: 0 };
  for (const r of runs) outcomes[r.outcome]++;

  const quartersPlayed = runs.map((r) => r.quartersPlayed).sort((a, b) => a - b);
  const medianQuartersPlayed = percentile(quartersPlayed, 50);

  const finalCash = runs.map((r) => r.finalCash).sort((a, b) => a - b);
  const medianFinalCash = percentile(finalCash, 50);

  // Cash trajectory percentiles per quarter
  const maxLen = Math.max(...runs.map((r) => r.cashTrajectory.length));
  const cashByQuarter: PlaytestReport['cashByQuarter'] = [];
  const approvalByQuarter: PlaytestReport['approvalByQuarter'] = [];
  for (let q = 0; q < maxLen; q++) {
    const cashAt = runs
      .map((r) => r.cashTrajectory[q])
      .filter((v): v is number => v !== undefined)
      .sort((a, b) => a - b);
    const apprAt = runs
      .map((r) => r.approvalTrajectory[q])
      .filter((v): v is number => v !== undefined)
      .sort((a, b) => a - b);
    if (cashAt.length === 0) continue;
    cashByQuarter.push({
      quarter: q,
      p10: percentile(cashAt, 10),
      p50: percentile(cashAt, 50),
      p90: percentile(cashAt, 90),
    });
    if (apprAt.length > 0) {
      approvalByQuarter.push({
        quarter: q,
        p10: percentile(apprAt, 10),
        p50: percentile(apprAt, 50),
        p90: percentile(apprAt, 90),
      });
    }
  }

  // Event coverage
  const allEventIds = new Set(EVENT_TEMPLATES.map((t) => t.id));
  const firedIds = new Set<string>();
  const eventsFiredCount: PlaytestReport['eventsFiredCount'] = [];
  const totalsById = new Map<string, number>();
  for (const r of runs) {
    for (const [id, count] of Object.entries(r.eventsFired)) {
      firedIds.add(id);
      totalsById.set(id, (totalsById.get(id) ?? 0) + count);
    }
  }
  for (const [id, count] of totalsById.entries()) {
    const tmpl = EVENT_TEMPLATES.find((t) => t.id === id);
    const cd =
      tmpl?.trigger.kind === 'random' || tmpl?.trigger.kind === 'conditional'
        ? tmpl.trigger.cooldownQuarters
        : undefined;
    eventsFiredCount.push(cd !== undefined ? { id, count, cooldownQ: cd } : { id, count });
  }
  eventsFiredCount.sort((a, b) => b.count - a.count);
  const eventsNeverFired = [...allEventIds].filter((id) => !firedIds.has(id)).sort();

  // Choice coverage
  const choicesNeverPicked: PlaytestReport['choicesNeverPicked'] = [];
  const choicesPickedCount: PlaytestReport['choicesPickedCount'] = [];
  for (const tmpl of EVENT_TEMPLATES) {
    for (const choice of tmpl.choices) {
      const totalForChoice = runs.reduce(
        (acc, r) => acc + (r.choicesPicked[tmpl.id]?.[choice.id] ?? 0),
        0,
      );
      if (totalForChoice === 0 && firedIds.has(tmpl.id)) {
        choicesNeverPicked.push({ eventId: tmpl.id, choiceId: choice.id });
      } else if (totalForChoice > 0) {
        choicesPickedCount.push({ eventId: tmpl.id, choiceId: choice.id, count: totalForChoice });
      }
    }
  }
  choicesPickedCount.sort((a, b) => b.count - a.count);

  // Early failures (< Q10 game over)
  const earlyFailures = runs
    .filter((r) => r.outcome !== 'inProgress' && r.outcome !== 'won' && r.quartersPlayed < 10)
    .map((r) => ({
      seed: r.opts.seed,
      archetype: r.opts.archetype,
      strategy: r.opts.strategy,
      quarter: r.quartersPlayed,
      lastSummaries: r.lastSummaries,
    }));

  // Per-archetype rollup
  const byArchetype: PlaytestReport['byArchetype'] = {};
  const byStrategy: PlaytestReport['byStrategy'] = {};
  for (const r of runs) {
    const a = (byArchetype[r.opts.archetype] ??= { runs: 0, failureRate: 0, medianFinalCash: 0 });
    a.runs++;
    if (r.outcome === 'fiscalFailure' || r.outcome === 'boardFired') a.failureRate++;
    const s = (byStrategy[r.opts.strategy] ??= { runs: 0, failureRate: 0, medianFinalCash: 0 });
    s.runs++;
    if (r.outcome === 'fiscalFailure' || r.outcome === 'boardFired') s.failureRate++;
  }
  for (const [arch, data] of Object.entries(byArchetype)) {
    const archRuns = runs.filter((r) => r.opts.archetype === arch);
    data.medianFinalCash = percentile(
      archRuns.map((r) => r.finalCash).sort((a, b) => a - b),
      50,
    );
    data.failureRate = data.failureRate / data.runs;
  }
  for (const [strat, data] of Object.entries(byStrategy)) {
    const stratRuns = runs.filter((r) => r.opts.strategy === strat);
    data.medianFinalCash = percentile(
      stratRuns.map((r) => r.finalCash).sort((a, b) => a - b),
      50,
    );
    data.failureRate = data.failureRate / data.runs;
  }

  const consistentlyBrokenArchetypes = Object.entries(byArchetype)
    .filter(([, d]) => d.failureRate > 0.7)
    .map(([a]) => a);

  return {
    totalRuns: runs.length,
    outcomes,
    medianQuartersPlayed,
    medianFinalCash,
    cashByQuarter,
    approvalByQuarter,
    eventsNeverFired,
    eventsFiredCount,
    choicesNeverPicked,
    choicesPickedCount,
    earlyFailures: earlyFailures.slice(0, 20),
    consistentlyBrokenArchetypes,
    byArchetype,
    byStrategy,
  };
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.floor((sortedAsc.length - 1) * (p / 100));
  return sortedAsc[idx] ?? 0;
}

/** Human-readable summary printed to stdout. */
export function formatReportText(report: PlaytestReport): string {
  const lines: string[] = [];
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const m = (n: number) => `$${n.toFixed(0)}M`;

  lines.push(`=== PLAYTEST REPORT — ${report.totalRuns} runs ===`);
  lines.push('');
  lines.push('OUTCOMES');
  lines.push(`  Won (Q60):        ${report.outcomes.won}   ${pct(report.outcomes.won / report.totalRuns)}`);
  lines.push(`  Fiscal failure:   ${report.outcomes.fiscalFailure}   ${pct(report.outcomes.fiscalFailure / report.totalRuns)}`);
  lines.push(`  Board fired:      ${report.outcomes.boardFired}   ${pct(report.outcomes.boardFired / report.totalRuns)}`);
  lines.push(`  In progress:      ${report.outcomes.inProgress}   ${pct(report.outcomes.inProgress / report.totalRuns)}`);
  lines.push('');
  lines.push('MEDIAN STATS');
  lines.push(`  Quarters played: ${report.medianQuartersPlayed}`);
  lines.push(`  Final cash:      ${m(report.medianFinalCash)}`);
  lines.push('');
  lines.push('CASH TRAJECTORY (P10 / P50 / P90)');
  for (const c of report.cashByQuarter.slice(0, 20)) {
    lines.push(
      `  Q${c.quarter.toString().padStart(2)}: ${m(c.p10).padStart(8)} / ${m(c.p50).padStart(8)} / ${m(c.p90).padStart(8)}`,
    );
  }
  lines.push('');
  lines.push('BY ARCHETYPE');
  for (const [arch, d] of Object.entries(report.byArchetype)) {
    lines.push(`  ${arch.padEnd(28)} ${d.runs} runs · failure ${pct(d.failureRate)} · final ${m(d.medianFinalCash)}`);
  }
  lines.push('');
  lines.push('BY STRATEGY');
  for (const [strat, d] of Object.entries(report.byStrategy)) {
    lines.push(`  ${strat.padEnd(28)} ${d.runs} runs · failure ${pct(d.failureRate)} · final ${m(d.medianFinalCash)}`);
  }
  lines.push('');
  lines.push(`EVENTS NEVER FIRED (${report.eventsNeverFired.length}/${report.eventsNeverFired.length + report.eventsFiredCount.length})`);
  for (const id of report.eventsNeverFired.slice(0, 20)) lines.push(`  ${id}`);
  if (report.eventsNeverFired.length > 20) lines.push(`  ... +${report.eventsNeverFired.length - 20} more`);
  lines.push('');
  lines.push(`CHOICES NEVER PICKED (${report.choicesNeverPicked.length})`);
  for (const c of report.choicesNeverPicked.slice(0, 20)) lines.push(`  ${c.eventId} → ${c.choiceId}`);
  if (report.choicesNeverPicked.length > 20) lines.push(`  ... +${report.choicesNeverPicked.length - 20} more`);
  lines.push('');
  lines.push(`TOP EVENTS (most fired)`);
  for (const e of report.eventsFiredCount.slice(0, 10))
    lines.push(`  ${e.id.padEnd(36)} ${e.count}× (cooldown ${e.cooldownQ ?? '-'}Q)`);
  lines.push('');
  if (report.earlyFailures.length > 0) {
    lines.push(`EARLY FAILURES (< Q10, sample of ${Math.min(5, report.earlyFailures.length)})`);
    for (const ef of report.earlyFailures.slice(0, 5)) {
      lines.push(`  seed=${ef.seed} ${ef.archetype}/${ef.strategy} died Q${ef.quarter}`);
      for (const s of ef.lastSummaries.slice(-2)) lines.push(`     · ${s}`);
    }
    lines.push('');
  }
  if (report.consistentlyBrokenArchetypes.length > 0) {
    lines.push(`⚠ CONSISTENTLY BROKEN ARCHETYPES (>70% failure)`);
    for (const a of report.consistentlyBrokenArchetypes) lines.push(`  ${a}`);
  }
  return lines.join('\n');
}
