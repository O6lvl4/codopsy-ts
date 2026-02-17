import * as fs from 'fs';
import * as path from 'path';
import { AnalysisResult } from './analyzer/types.js';

export interface BaselineEntry {
  file: string;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  maxCyclomatic: number;
  maxCognitive: number;
  score: number;
}

export interface Baseline {
  version: 1;
  timestamp: string;
  overall: {
    totalIssues: number;
    totalErrors: number;
    totalWarnings: number;
    averageComplexity: number;
    score: number;
    grade: string;
  };
  files: BaselineEntry[];
}

export interface BaselineComparison {
  status: 'improved' | 'degraded' | 'unchanged';
  overall: {
    issuesDelta: number;
    scoreDelta: number;
    gradeBefore: string;
    gradeAfter: string;
  };
  newFiles: number;
  removedFiles: number;
  degradedFiles: string[];
  improvedFiles: string[];
}

function toRelativePath(filePath: string, targetDir: string): string {
  return path.relative(targetDir, filePath);
}

export function createBaseline(result: AnalysisResult): Baseline {
  const files: BaselineEntry[] = result.files.map(fa => {
    const errors = fa.issues.filter(i => i.severity === 'error').length;
    const warnings = fa.issues.filter(i => i.severity === 'warning').length;
    const maxCyclomatic = fa.complexity.functions.reduce((m, f) => Math.max(m, f.complexity), 0);
    const maxCognitive = fa.complexity.functions.reduce((m, f) => Math.max(m, f.cognitiveComplexity), 0);

    return {
      file: toRelativePath(fa.file, result.targetDir),
      issueCount: fa.issues.length,
      errorCount: errors,
      warningCount: warnings,
      maxCyclomatic,
      maxCognitive,
      score: fa.score?.score ?? 100,
    };
  }).sort((a, b) => a.file.localeCompare(b.file));

  return {
    version: 1,
    timestamp: result.timestamp,
    overall: {
      totalIssues: result.summary.totalIssues,
      totalErrors: result.summary.issuesBySeverity.error,
      totalWarnings: result.summary.issuesBySeverity.warning,
      averageComplexity: Math.round(result.summary.averageComplexity * 10) / 10,
      score: result.score?.overall ?? 100,
      grade: result.score?.grade ?? 'A',
    },
    files,
  };
}

export function saveBaseline(result: AnalysisResult, outputPath: string): void {
  const baseline = createBaseline(result);
  const dir = path.dirname(outputPath);
  if (dir !== '.' && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(baseline, null, 2) + '\n');
}

export function loadBaseline(baselinePath: string): Baseline | null {
  if (!fs.existsSync(baselinePath)) return null;
  const content = fs.readFileSync(baselinePath, 'utf-8');
  return JSON.parse(content) as Baseline;
}

function diffFiles(
  baseFiles: BaselineEntry[],
  currentFiles: BaselineEntry[],
): { newFiles: number; removedFiles: number; degradedFiles: string[]; improvedFiles: string[] } {
  const baseFileMap = new Map(baseFiles.map(f => [f.file, f]));
  const currentFileMap = new Map(currentFiles.map(f => [f.file, f]));

  let newFiles = 0;
  const degradedFiles: string[] = [];
  const improvedFiles: string[] = [];

  for (const [file, current] of currentFileMap) {
    const base = baseFileMap.get(file);
    if (!base) { newFiles++; continue; }
    if (current.score < base.score) degradedFiles.push(file);
    if (current.score > base.score) improvedFiles.push(file);
  }

  let removedFiles = 0;
  for (const file of baseFileMap.keys()) {
    if (!currentFileMap.has(file)) removedFiles++;
  }

  return { newFiles, removedFiles, degradedFiles, improvedFiles };
}

function determineStatus(scoreDelta: number, issuesDelta: number): BaselineComparison['status'] {
  if (scoreDelta > 0 || issuesDelta < 0) return 'improved';
  if (scoreDelta < 0 || issuesDelta > 0) return 'degraded';
  return 'unchanged';
}

export function compareWithBaseline(result: AnalysisResult, baseline: Baseline): BaselineComparison {
  const currentBaseline = createBaseline(result);
  const fileDiff = diffFiles(baseline.files, currentBaseline.files);

  const scoreDelta = currentBaseline.overall.score - baseline.overall.score;
  const issuesDelta = currentBaseline.overall.totalIssues - baseline.overall.totalIssues;

  return {
    status: determineStatus(scoreDelta, issuesDelta),
    overall: {
      issuesDelta,
      scoreDelta,
      gradeBefore: baseline.overall.grade,
      gradeAfter: currentBaseline.overall.grade,
    },
    ...fileDiff,
  };
}
