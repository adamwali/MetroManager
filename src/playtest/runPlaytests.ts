import { writeFileSync } from 'node:fs';
import type { CeoArchetype } from '@/types/ceo';
import { runPlaytest, type Strategy } from './harness';
import { buildReport, formatReportText } from './report';

/**
 * CLI entrypoint: npm run playtest -- [--seeds N] [--out path.json]
 *
 * Runs N seeds × 5 archetypes × 4 strategies = 20N total runs.
 * Writes JSON report + prints text summary.
 */

function parseArgs() {
  const args = process.argv.slice(2);
  let seeds = 20;
  let maxQuarters = 60;
  let out = 'playtest-report.json';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seeds') seeds = Number(args[++i]);
    else if (args[i] === '--quarters') maxQuarters = Number(args[++i]);
    else if (args[i] === '--out') out = args[++i] ?? out;
  }
  return { seeds, maxQuarters, out };
}

const ARCHETYPES: CeoArchetype[] = [
  'steadyOperator',
  'internationalTechnocrat',
  'insider',
  'coalitionBuilder',
  'disruptor',
];
const STRATEGIES: Strategy[] = ['conservative', 'aggressive', 'random', 'reactive', 'balanced'];

function main() {
  const { seeds, maxQuarters, out } = parseArgs();
  console.log(`Running ${seeds} seeds × ${ARCHETYPES.length} archetypes × ${STRATEGIES.length} strategies = ${seeds * ARCHETYPES.length * STRATEGIES.length} total runs...`);
  console.log(`Max quarters per run: ${maxQuarters}`);
  console.log('');

  const t0 = Date.now();
  const runs = [];
  for (let s = 1; s <= seeds; s++) {
    for (const archetype of ARCHETYPES) {
      for (const strategy of STRATEGIES) {
        runs.push(runPlaytest({ seed: s, archetype, strategy, maxQuarters }));
      }
    }
    if (s % 5 === 0) process.stdout.write(`  seed ${s}/${seeds}\r`);
  }
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n${runs.length} runs in ${elapsed}s`);
  console.log('');

  const report = buildReport(runs);
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(formatReportText(report));
  console.log('');
  console.log(`Full JSON written to ${out}`);
}

main();
