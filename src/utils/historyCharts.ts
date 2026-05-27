import type { GameState } from '@/types/gameState';

/**
 * Chart-ready time series extracted from action-log quarter_summary entries.
 * Phase 9. Reads the endOfQuarterMetrics snapshots populated by endTurn.
 */

export interface QuarterPoint {
  quarter: number;
  /** Human-readable label "Q3 2027". */
  label: string;
  cashM: number;
  cashDelta: number;
  cashFlow: {
    operatingAllowance: number;
    fareRevenue: number;
    operatingExpense: number;
    maintenance: number;
    debtService: number;
    refiFee: number;
    netDelta: number;
  };
  ttcRiders: number;
  goRiders: number;
  upRiders: number;
  totalRiders: number;
  trustOttawa: number;
  trustQueensPark: number;
  trustCityHall: number;
  boardConfidence: number;
  publicApproval: number;
  operatingAllowanceAnnualM: number;
}

function quarterLabel(quarterIndex: number): string {
  const year = 2026 + Math.floor(quarterIndex / 4);
  const q = (quarterIndex % 4) + 1;
  return `Q${q} ${year}`;
}

export function buildQuarterPoints(state: GameState): QuarterPoint[] {
  const points: QuarterPoint[] = [];
  for (const entry of state.actionLog) {
    if (entry.kind !== 'quarter_summary') continue;
    const m = entry.breakdown.endOfQuarterMetrics;
    points.push({
      quarter: entry.quarter as unknown as number,
      label: quarterLabel(entry.quarter as unknown as number),
      cashM: m.cashM,
      cashDelta: entry.cashDelta,
      cashFlow: { ...entry.breakdown.cashFlow },
      ttcRiders: m.perAgencyRiders.ttc,
      goRiders: m.perAgencyRiders.go,
      upRiders: m.perAgencyRiders.up,
      totalRiders: m.totalRiders,
      trustOttawa: m.trustOttawa,
      trustQueensPark: m.trustQueensPark,
      trustCityHall: m.trustCityHall,
      boardConfidence: m.boardConfidence,
      publicApproval: m.publicApproval,
      operatingAllowanceAnnualM: m.operatingAllowanceAnnualM,
    });
  }
  return points;
}

/** Group debt portfolio principal by maturity year for the ladder chart. */
export interface MaturityBucket {
  /** Year label e.g. "2030". */
  year: string;
  /** Total principal maturing that year, $M. */
  principalM: number;
}

export function buildMaturityLadder(state: GameState): MaturityBucket[] {
  const buckets: Record<string, number> = {};
  for (const t of state.debt.tranches) {
    const q = t.maturity as unknown as number;
    const year = String(2026 + Math.floor(q / 4));
    const principal = t.principal as unknown as number;
    buckets[year] = (buckets[year] ?? 0) + principal;
  }
  return Object.entries(buckets)
    .map(([year, principalM]) => ({ year, principalM }))
    .sort((a, b) => Number(a.year) - Number(b.year));
}

export interface ProjectGanttBar {
  templateId: string;
  /** Quarter break-ground happened (or initiated if proposed). */
  startQ: number;
  /** Quarter expected open / current quarter if operating. */
  endQ: number;
  state: 'proposed' | 'under_construction' | 'operating';
}

export function buildProjectGantt(state: GameState): ProjectGanttBar[] {
  return state.projects.map((p) => {
    if (p.state === 'proposed') {
      return {
        templateId: p.templateId,
        startQ: p.initiatedAt as unknown as number,
        endQ: ((p.initiatedAt as unknown as number) + 2),
        state: 'proposed',
      };
    }
    if (p.state === 'under_construction') {
      return {
        templateId: p.templateId,
        startQ: p.brokeGroundAt as unknown as number,
        endQ: p.forecastOpenAt as unknown as number,
        state: 'under_construction',
      };
    }
    return {
      templateId: p.templateId,
      startQ: p.openedAt as unknown as number,
      endQ: (state.quarter as unknown as number) + 4,
      state: 'operating',
    };
  });
}
