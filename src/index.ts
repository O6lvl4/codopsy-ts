#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { findSourceFiles } from './utils/file.js';
import { analyzeFile } from './analyzer/index.js';
import { generateReport, formatReport, ReportFormat } from './reporter/index.js';
import { AnalysisResult, FileAnalysis, Severity } from './analyzer/types.js';
import { loadConfig, CodopsyConfig } from './config.js';
import { createColors, Colors } from './utils/colors.js';
import { isGitRepository, getChangedFiles } from './utils/git.js';

function buildAnalysisResult(
  fileAnalyses: FileAnalysis[],
  files: string[],
  targetDir: string,
): AnalysisResult {
  const allIssues = fileAnalyses.flatMap((f) => f.issues);
  const issuesBySeverity: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const issue of allIssues) {
    issuesBySeverity[issue.severity]++;
  }

  const allFunctions = fileAnalyses.flatMap((f) => f.complexity.functions);
  const avgComplexity =
    allFunctions.length > 0
      ? allFunctions.reduce((sum, fn) => sum + fn.complexity, 0) / allFunctions.length
      : 0;

  const maxComplexityEntry = fileAnalyses.reduce<AnalysisResult['summary']['maxComplexity']>(
    (max, fa) =>
      fa.complexity.functions.reduce((m, fn) => {
        if (m === null || fn.complexity > m.complexity) {
          return { file: fa.file, function: fn.name, complexity: fn.complexity };
        }
        return m;
      }, max),
    null,
  );

  return {
    timestamp: new Date().toISOString(),
    targetDir,
    files: fileAnalyses,
    summary: {
      totalFiles: files.length,
      totalIssues: allIssues.length,
      issuesBySeverity,
      averageComplexity: avgComplexity,
      maxComplexity: maxComplexityEntry,
    },
  };
}

function formatCount(c: Colors, count: number): string {
  return count === 0 ? c.green(c.bold(String(count))) : c.bold(String(count));
}

function printSummary(result: AnalysisResult, c: Colors): void {
  const { summary } = result;
  console.log('');
  console.log(c.bold('=== Analysis Summary ==='));
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

function printVerbose(analysis: FileAnalysis, c: Colors, log: (...args: unknown[]) => void): void {
  const issueCount = analysis.issues.length;
  const errorCount = analysis.issues.filter(i => i.severity === 'error').length;
  const warningCount = analysis.issues.filter(i => i.severity === 'warning').length;

  const maxCyclomaticFn = analysis.complexity.functions.reduce<number>(
    (max, fn) => Math.max(max, fn.complexity), 0,
  );
  const maxCognitiveFn = analysis.complexity.functions.reduce<number>(
    (max, fn) => Math.max(max, fn.cognitiveComplexity), 0,
  );

  const issuesSummary: string[] = [];
  if (errorCount > 0) issuesSummary.push(`${errorCount} error${errorCount > 1 ? 's' : ''}`);
  if (warningCount > 0) issuesSummary.push(`${warningCount} warning${warningCount > 1 ? 's' : ''}`);

  if (issueCount === 0) {
    log(c.green(`  ✓ ${c.cyan(analysis.file)} (complexity: ${maxCyclomaticFn}, cognitive: ${maxCognitiveFn}, issues: 0)`));
  } else {
    log(c.red(`  ✗ ${c.cyan(analysis.file)} (complexity: ${maxCyclomaticFn}, cognitive: ${maxCognitiveFn}, issues: ${issuesSummary.join(', ')})`));
  }
}

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

function checkMaxComplexity(
  analysis: FileAnalysis,
  filePath: string,
  config: CodopsyConfig,
  defaultMax: number,
): void {
  const rule = config.rules?.['max-complexity'];
  if (rule === false) return;

  const threshold = rule && typeof rule === 'object' && rule.max !== undefined ? rule.max : defaultMax;
  const severity: Severity = rule && typeof rule === 'object' && rule.severity ? rule.severity : 'warning';

  for (const fn of analysis.complexity.functions) {
    if (fn.complexity > threshold) {
      analysis.issues.push({
        file: filePath,
        line: fn.line,
        column: 1,
        severity,
        rule: 'max-complexity',
        message: `Function "${fn.name}" has a cyclomatic complexity of ${fn.complexity} (threshold: ${threshold})`,
      });
    }
  }
}

function checkMaxCognitiveComplexity(
  analysis: FileAnalysis,
  filePath: string,
  config: CodopsyConfig,
  defaultMax: number,
): void {
  const rule = config.rules?.['max-cognitive-complexity'];
  if (rule === false) return;

  const threshold = rule && typeof rule === 'object' && rule.max !== undefined ? rule.max : defaultMax;
  const severity: Severity = rule && typeof rule === 'object' && rule.severity ? rule.severity : 'warning';

  for (const fn of analysis.complexity.functions) {
    if (fn.cognitiveComplexity > threshold) {
      analysis.issues.push({
        file: filePath,
        line: fn.line,
        column: 1,
        severity,
        rule: 'max-cognitive-complexity',
        message: `Function "${fn.name}" has a cognitive complexity of ${fn.cognitiveComplexity} (threshold: ${threshold})`,
      });
    }
  }
}

function analyzeFiles(files: string[], config: CodopsyConfig, maxComplexity: number, maxCognitiveComplexity: number): FileAnalysis[] {
  return files.map((filePath) => {
    const analysis = analyzeFile(filePath, config);
    checkMaxComplexity(analysis, filePath, config, maxComplexity);
    checkMaxCognitiveComplexity(analysis, filePath, config, maxCognitiveComplexity);
    return analysis;
  });
}

const program = new Command();

program
  .name('codopsy-ts')
  .description('A code quality analysis CLI tool / ソースコードの品質を解析するCLIツール')
  .version('1.0.1');

program
  .command('analyze')
  .description('Analyze source files in a directory / 指定ディレクトリのソースファイルを解析する')
  .argument('<dir>', 'Target directory to analyze / 解析対象のディレクトリ')
  .option('-o, --output <path>', 'Output file path (use "-" for stdout) / レポートの出力先ファイルパス（"-"でstdout）')
  .option('-f, --format <type>', 'Output format: json, html, or sarif / 出力形式 (json|html|sarif)', 'json')
  .option('--max-complexity <n>', 'Complexity threshold for warnings / 複雑度の警告閾値', '10')
  .option('--max-cognitive-complexity <n>', 'Cognitive complexity threshold for warnings / 認知的複雑度の警告閾値', '15')
  .option('--fail-on-warning', 'Exit with code 1 if warnings are found / warningがあればexit code 1で終了')
  .option('--fail-on-error', 'Exit with code 1 if errors are found / errorがあればexit code 1で終了')
  .option('-q, --quiet', 'Show summary only / サマリーのみ表示')
  .option('-v, --verbose', 'Show per-file analysis results / 各ファイルの解析結果を逐一表示')
  .option('--no-color', 'Disable colored output / カラー出力を無効化')
  .option('--diff <base>', 'Only analyze files changed from base ref / git差分のファイルのみ解析')
  .action(analyzeAction);

async function resolveFiles(
  targetDir: string,
  options: AnalyzeOptions,
  log: (...args: unknown[]) => void,
): Promise<string[] | null> {
  if (!options.quiet) {
    log(`Analyzing ${targetDir} ...`);
  }

  let files = await findSourceFiles(targetDir);

  if (options.diff) {
    if (!isGitRepository(targetDir)) {
      console.error('Error: --diff requires a git repository.');
      process.exit(1);
    }
    const changedFiles = getChangedFiles(targetDir, options.diff);
    const changedSet = new Set(changedFiles);
    files = files.filter((f) => changedSet.has(f));
  }

  if (files.length === 0) {
    log('No source files found.');
    return null;
  }

  if (!options.quiet) {
    log(`Found ${files.length} source file(s).`);
  }

  return files;
}

interface OutputOptions {
  format: ReportFormat;
  outputPath?: string;
  colors: Colors;
}

function handleOutput(result: AnalysisResult, opts: OutputOptions): void {
  if (opts.outputPath === '-') {
    process.stdout.write(formatReport(result, opts.format));
  } else {
    const resolvedOutput = path.resolve(opts.outputPath ?? `codopsy-report.${opts.format}`);
    generateReport(result, resolvedOutput, opts.format);
    printSummary(result, opts.colors);
    console.log(`Report written to: ${resolvedOutput}`);
  }
}

function checkExitConditions(result: AnalysisResult, options: AnalyzeOptions): void {
  if (options.failOnWarning && result.summary.issuesBySeverity.warning > 0) {
    process.exit(1);
  }
  if (options.failOnError && result.summary.issuesBySeverity.error > 0) {
    process.exit(1);
  }
}

async function analyzeAction(dir: string, options: AnalyzeOptions): Promise<void> {
  const { targetDir, maxComplexity, maxCognitiveComplexity, format } = validateOptions(dir, options);
  const outputPath = options.output;
  const isStdout = outputPath === '-';
  const colorEnabled = !options.noColor && !process.env.NO_COLOR && (isStdout ? process.stderr.isTTY : process.stdout.isTTY);
  const c = createColors(colorEnabled ?? false);
  const config = loadConfig(targetDir);
  const log = isStdout ? console.error : console.log;

  const files = await resolveFiles(targetDir, options, log);
  if (!files) return;

  const fileAnalyses = analyzeFiles(files, config, maxComplexity, maxCognitiveComplexity);
  const result = buildAnalysisResult(fileAnalyses, files, targetDir);

  if (options.verbose && !isStdout) {
    for (const analysis of fileAnalyses) {
      printVerbose(analysis, c, log);
    }
  }

  handleOutput(result, { format, outputPath, colors: c });
  checkExitConditions(result, options);
}
program.parse();
