#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { findSourceFiles } from './utils/file.js';
import { AnalysisResult } from './analyzer/types.js';
import { loadConfig } from './config.js';
import { createColors, Colors } from './utils/colors.js';
import { isGitRepository, getChangedFiles } from './utils/git.js';
import { buildAnalysisResult, analyzeFiles } from './analyze.js';
import { formatReport, generateReport, ReportFormat } from './reporter/index.js';
import { initAction } from './commands/init.js';
import { saveBaseline, loadBaseline, compareWithBaseline } from './baseline.js';
import { detectHotspots } from './analyzer/hotspot.js';
import { printSummary, printVerbose, printHotspots, printBaselineComparison } from './commands/print.js';

interface AnalyzeOptions {
  output?: string;
  format: string;
  maxComplexity: string;
  maxCognitiveComplexity: string;
  failOnWarning?: boolean;
  failOnError?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  noColor?: boolean;
  diff?: string;
  saveBaseline?: boolean;
  baselinePath?: string;
  noDegradation?: boolean;
  hotspots?: boolean;
}

interface AnalyzeContext {
  targetDir: string;
  maxComplexity: number;
  maxCognitiveComplexity: number;
  format: ReportFormat;
  isStdout: boolean;
  colors: Colors;
  log: (...args: unknown[]) => void;
}

function validateOptions(dir: string, options: AnalyzeOptions): { targetDir: string; maxComplexity: number; maxCognitiveComplexity: number; format: ReportFormat } {
  const targetDir = path.resolve(dir);
  if (!fs.existsSync(targetDir)) {
    console.error(`Error: directory "${targetDir}" does not exist.`);
    process.exit(1);
  }
  const maxComplexity = parseInt(options.maxComplexity, 10);
  const maxCognitiveComplexity = parseInt(options.maxCognitiveComplexity, 10);
  const format = options.format as ReportFormat;
  if (format !== 'json' && format !== 'html' && format !== 'sarif') {
    console.error(`Error: unsupported format "${format}". Use "json", "html", or "sarif".`);
    process.exit(1);
  }
  return { targetDir, maxComplexity, maxCognitiveComplexity, format };
}

function createContext(dir: string, options: AnalyzeOptions): AnalyzeContext {
  const validated = validateOptions(dir, options);
  const isStdout = options.output === '-';
  const colorEnabled = !options.noColor && !process.env.NO_COLOR && (isStdout ? process.stderr.isTTY : process.stdout.isTTY);
  return { ...validated, isStdout, colors: createColors(colorEnabled ?? false), log: isStdout ? console.error : console.log };
}

async function resolveFiles(targetDir: string, options: AnalyzeOptions, log: (...args: unknown[]) => void): Promise<string[] | null> {
  if (!options.quiet) log(`Analyzing ${targetDir} ...`);
  let files = await findSourceFiles(targetDir);
  if (options.diff) {
    if (!isGitRepository(targetDir)) { console.error('Error: --diff requires a git repository.'); process.exit(1); }
    const changedSet = new Set(getChangedFiles(targetDir, options.diff));
    files = files.filter((f) => changedSet.has(f));
  }
  if (files.length === 0) { log('No source files found.'); return null; }
  if (!options.quiet) log(`Found ${files.length} source file(s).`);
  return files;
}

function handleOutput(result: AnalysisResult, format: ReportFormat, outputPath: string | undefined, c: Colors): void {
  if (outputPath === '-') {
    process.stdout.write(formatReport(result, format));
  } else {
    const resolvedOutput = path.resolve(outputPath ?? `codopsy-report.${format}`);
    generateReport(result, resolvedOutput, format);
    printSummary(result, c);
    console.log(`Report written to: ${resolvedOutput}`);
  }
}

function handleBaseline(result: AnalysisResult, options: AnalyzeOptions, isStdout: boolean, c: Colors): void {
  const baselinePath = path.resolve(options.baselinePath ?? '.codopsy-baseline.json');
  if (options.saveBaseline) {
    saveBaseline(result, baselinePath);
    if (!isStdout) console.log(`Baseline saved to: ${baselinePath}`);
    return;
  }
  const baseline = loadBaseline(baselinePath);
  if (baseline && !isStdout) {
    const comparison = compareWithBaseline(result, baseline);
    printBaselineComparison(comparison, c);
    if (options.noDegradation && comparison.status === 'degraded') process.exit(1);
  }
}

function printOptionalSections(fileAnalyses: import('./analyzer/types.js').FileAnalysis[], options: AnalyzeOptions, ctx: AnalyzeContext): void {
  if (options.verbose && !ctx.isStdout) {
    for (const analysis of fileAnalyses) printVerbose(analysis, ctx.colors, ctx.log);
  }
  if (options.hotspots && !ctx.isStdout && isGitRepository(ctx.targetDir)) {
    printHotspots(detectHotspots(ctx.targetDir, fileAnalyses), ctx.colors);
  }
}

function checkFailConditions(result: AnalysisResult, options: AnalyzeOptions): void {
  if (options.failOnWarning && result.summary.issuesBySeverity.warning > 0) process.exit(1);
  if (options.failOnError && result.summary.issuesBySeverity.error > 0) process.exit(1);
}

async function analyzeAction(dir: string, options: AnalyzeOptions): Promise<void> {
  const ctx = createContext(dir, options);
  const config = loadConfig(ctx.targetDir);
  const files = await resolveFiles(ctx.targetDir, options, ctx.log);
  if (!files) return;

  const fileAnalyses = analyzeFiles(files, { config, maxComplexity: ctx.maxComplexity, maxCognitiveComplexity: ctx.maxCognitiveComplexity });
  const result = buildAnalysisResult(fileAnalyses, files, ctx.targetDir);

  printOptionalSections(fileAnalyses, options, ctx);
  handleOutput(result, ctx.format, options.output, ctx.colors);
  handleBaseline(result, options, ctx.isStdout, ctx.colors);
  checkFailConditions(result, options);
}

const program = new Command();
program.name('codopsy-ts').description('A code quality analysis CLI tool').version('1.1.0');

program.command('analyze')
  .description('Analyze source files in a directory')
  .argument('<dir>', 'Target directory to analyze')
  .option('-o, --output <path>', 'Output file path (use "-" for stdout)')
  .option('-f, --format <type>', 'Output format: json, html, or sarif', 'json')
  .option('--max-complexity <n>', 'Complexity threshold for warnings', '10')
  .option('--max-cognitive-complexity <n>', 'Cognitive complexity threshold for warnings', '15')
  .option('--fail-on-warning', 'Exit with code 1 if warnings are found')
  .option('--fail-on-error', 'Exit with code 1 if errors are found')
  .option('-q, --quiet', 'Show summary only')
  .option('-v, --verbose', 'Show per-file analysis results')
  .option('--no-color', 'Disable colored output')
  .option('--diff <base>', 'Only analyze files changed from base ref')
  .option('--save-baseline', 'Save current results as baseline')
  .option('--baseline-path <path>', 'Path to baseline file', '.codopsy-baseline.json')
  .option('--no-degradation', 'Exit 1 if quality degrades vs baseline')
  .option('--hotspots', 'Show hotspot analysis (high complexity + high churn)')
  .action(analyzeAction);

program.command('init')
  .description('Create a .codopsyrc.json configuration file')
  .argument('[dir]', 'Target directory', '.')
  .option('--force', 'Overwrite existing config')
  .action(initAction);

program.parse();
