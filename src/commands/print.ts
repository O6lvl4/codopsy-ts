import { AnalysisResult, FileAnalysis } from '../analyzer/types.js';
import { Colors } from '../utils/colors.js';
import type { BaselineComparison } from '../baseline.js';
import type { HotspotResult } from '../analyzer/hotspot.js';

function formatCount(c: Colors, count: number): string {
  return count === 0 ? c.green(c.bold(String(count))) : c.bold(String(count));
}

function gradeColor(c: Colors, grade: string): string {
  if (grade === 'A') return c.green(c.bold(grade));
  if (grade === 'B') return c.green(grade);
  if (grade === 'C') return c.yellow(grade);
  if (grade === 'D') return c.red(grade);
  if (grade === 'F') return c.red(c.bold(grade));
  return grade;
}

export function printSummary(result: AnalysisResult, c: Colors): void {
  const { summary } = result;
  console.log('');
  console.log(c.bold('=== Analysis Summary ==='));
  if (result.score) {
    console.log(`  Quality Score:  ${gradeColor(c, result.score.grade)} (${result.score.overall}/100)`);
  }
  console.log(`  Files analyzed: ${c.bold(String(summary.totalFiles))}`);
  console.log(`  Total issues:   ${formatCount(c, summary.totalIssues)}`);
  console.log(`    ${c.red('Error:')}   ${formatCount(c, summary.issuesBySeverity.error)}`);
  console.log(`    ${c.yellow('Warning:')} ${formatCount(c, summary.issuesBySeverity.warning)}`);
  console.log(`    ${c.blue('Info:')}    ${formatCount(c, summary.issuesBySeverity.info)}`);
  console.log(`  Avg complexity: ${summary.averageComplexity.toFixed(1)}`);
  if (summary.maxComplexity) {
    console.log(`  Max complexity: ${summary.maxComplexity.complexity} (${summary.maxComplexity.function} in ${c.cyan(summary.maxComplexity.file)})`);
  }
  console.log('');
}

export function printVerbose(analysis: FileAnalysis, c: Colors, log: (...args: unknown[]) => void): void {
  const issueCount = analysis.issues.length;
  const errorCount = analysis.issues.filter(i => i.severity === 'error').length;
  const warningCount = analysis.issues.filter(i => i.severity === 'warning').length;

  const maxCyclomaticFn = analysis.complexity.functions.reduce<number>((max, fn) => Math.max(max, fn.complexity), 0);
  const maxCognitiveFn = analysis.complexity.functions.reduce<number>((max, fn) => Math.max(max, fn.cognitiveComplexity), 0);

  const issuesSummary: string[] = [];
  if (errorCount > 0) issuesSummary.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
  if (warningCount > 0) issuesSummary.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);

  if (issueCount === 0) {
    log(c.green(`  ✓ ${c.cyan(analysis.file)} (complexity: ${maxCyclomaticFn}, cognitive: ${maxCognitiveFn}, issues: 0)`));
  } else {
    log(c.red(`  ✗ ${c.cyan(analysis.file)} (complexity: ${maxCyclomaticFn}, cognitive: ${maxCognitiveFn}, issues: ${issuesSummary.join(', ')})`));
  }
}

function riskLabel(risk: string, c: Colors): string {
  if (risk === 'high') return c.red('HIGH  ');
  if (risk === 'medium') return c.yellow('MEDIUM');
  return c.green('LOW   ');
}

export function printHotspots(hotspotResult: HotspotResult, c: Colors): void {
  if (hotspotResult.hotspots.length === 0) return;
  console.log(c.bold(`=== Hotspot Analysis (last ${hotspotResult.period}) ===`));
  for (const h of hotspotResult.hotspots) {
    console.log(`  ${riskLabel(h.risk, c)} ${c.cyan(h.file)} (${h.commits} commits, ${h.authors} authors, complexity: ${h.complexity})`);
  }
  console.log('');
}

function deltaArrow(delta: number, c: Colors): string {
  if (delta > 0) return c.green('↑');
  if (delta < 0) return c.red('↓');
  return '→';
}

function comparisonStatusLabel(status: string, c: Colors): string {
  if (status === 'improved') return c.green('IMPROVED');
  if (status === 'degraded') return c.red('DEGRADED');
  return c.blue('UNCHANGED');
}

export function printBaselineComparison(comparison: BaselineComparison, c: Colors): void {
  const { overall } = comparison;
  console.log(c.bold('=== Baseline Comparison ==='));
  console.log(`  Status: ${comparisonStatusLabel(comparison.status, c)}`);
  console.log(`  Score:  ${overall.gradeBefore} → ${overall.gradeAfter} (${deltaArrow(overall.scoreDelta, c)} ${overall.scoreDelta >= 0 ? '+' : ''}${overall.scoreDelta})`);
  console.log(`  Issues: ${overall.issuesDelta >= 0 ? '+' : ''}${overall.issuesDelta}`);
  if (comparison.degradedFiles.length > 0) {
    console.log(`  Degraded: ${comparison.degradedFiles.join(', ')}`);
  }
  if (comparison.improvedFiles.length > 0) {
    console.log(`  Improved: ${comparison.improvedFiles.join(', ')}`);
  }
  console.log('');
}
