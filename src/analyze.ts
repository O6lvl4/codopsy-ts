import { findSourceFiles } from './utils/file.js';
import { analyzeFile } from './analyzer/index.js';
import { AnalysisResult, FileAnalysis, Severity } from './analyzer/types.js';
import { loadConfig, CodopsyConfig } from './config.js';
import { calculateFileScore, calculateProjectScore } from './scorer.js';
import { loadPlugins, RuleDefinition } from './plugin.js';

export interface AnalyzeOptions {
  targetDir: string;
  maxComplexity?: number;
  maxCognitiveComplexity?: number;
  config?: CodopsyConfig;
  files?: string[];
}

export function buildAnalysisResult(
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

  // Attach per-file scores
  for (const fa of fileAnalyses) {
    const fs = calculateFileScore(fa);
    fa.score = { score: fs.score, grade: fs.grade };
  }

  const result: AnalysisResult = {
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

  // Attach project score
  const projectScore = calculateProjectScore(result);
  result.score = {
    overall: projectScore.score,
    grade: projectScore.grade,
    distribution: projectScore.distribution,
  };

  return result;
}

export function checkMaxComplexity(
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

export function checkMaxCognitiveComplexity(
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

export interface AnalyzeFilesOptions {
  config: CodopsyConfig;
  maxComplexity: number;
  maxCognitiveComplexity: number;
  externalRules?: RuleDefinition[];
}

export function analyzeFiles(files: string[], opts: AnalyzeFilesOptions): FileAnalysis[] {
  return files.map((filePath) => {
    const analysis = analyzeFile(filePath, opts.config, opts.externalRules);
    checkMaxComplexity(analysis, filePath, opts.config, opts.maxComplexity);
    checkMaxCognitiveComplexity(analysis, filePath, opts.config, opts.maxCognitiveComplexity);
    return analysis;
  });
}

export async function analyze(options: AnalyzeOptions): Promise<AnalysisResult> {
  const config = options.config ?? loadConfig(options.targetDir);
  const files = options.files ?? await findSourceFiles(options.targetDir);
  const maxComplexity = options.maxComplexity ?? 10;
  const maxCognitiveComplexity = options.maxCognitiveComplexity ?? 15;

  const externalRules = config.plugins?.length
    ? await loadPlugins(config.plugins, options.targetDir)
    : undefined;

  const fileAnalyses = analyzeFiles(files, { config, maxComplexity, maxCognitiveComplexity, externalRules });
  return buildAnalysisResult(fileAnalyses, files, options.targetDir);
}
