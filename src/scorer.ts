import { AnalysisResult, FileAnalysis } from './analyzer/types.js';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface FileScore {
  file: string;
  score: number;
  grade: Grade;
}

export interface ProjectScore {
  score: number;
  grade: Grade;
  distribution: Record<Grade, number>;
}

function toGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function clampMin0(value: number): number {
  return value < 0 ? 0 : value;
}

const STRUCTURE_PENALTIES: Record<string, { perViolation: number; cap: number }> = {
  'max-lines': { perViolation: 10, cap: 12 },
  'max-depth': { perViolation: 4, cap: 12 },
  'max-params': { perViolation: 3, cap: 10 },
};

const STRUCTURE_RULE_NAMES = new Set(Object.keys(STRUCTURE_PENALTIES));

const EXCLUDED_FROM_ISSUES = new Set([
  ...STRUCTURE_RULE_NAMES,
  'max-complexity',
  'max-cognitive-complexity',
]);

function scoreComplexity(analysis: FileAnalysis): number {
  let penalty = 0;
  for (const fn of analysis.complexity.functions) {
    const ccExcess = Math.max(0, fn.complexity - 10);
    const cogExcess = Math.max(0, fn.cognitiveComplexity - 15);
    penalty += Math.min(ccExcess * 2, 15);
    penalty += Math.min(cogExcess * 1.5, 12);
  }
  return clampMin0(35 - penalty);
}

function scoreIssues(analysis: FileAnalysis): number {
  const ruleGroups = new Map<string, { severity: string; count: number }>();

  for (const issue of analysis.issues) {
    if (EXCLUDED_FROM_ISSUES.has(issue.rule)) continue;
    const existing = ruleGroups.get(issue.rule);
    if (existing) {
      existing.count++;
    } else {
      ruleGroups.set(issue.rule, { severity: issue.severity, count: 1 });
    }
  }

  let penalty = 0;
  for (const { severity, count } of ruleGroups.values()) {
    if (severity === 'error') {
      penalty += 8 * count;
    } else if (severity === 'warning') {
      penalty += 4 * Math.pow(count, 0.7);
    } else if (severity === 'info') {
      penalty += 1 * Math.sqrt(count);
    }
  }

  return clampMin0(Math.round(40 - penalty));
}

function scoreStructure(analysis: FileAnalysis): number {
  let score = 25;
  for (const [rule, { perViolation, cap }] of Object.entries(STRUCTURE_PENALTIES)) {
    const count = analysis.issues.filter(i => i.rule === rule).length;
    if (count > 0) {
      score -= Math.min(perViolation * count, cap);
    }
  }
  return clampMin0(score);
}

export function calculateFileScore(analysis: FileAnalysis): FileScore {
  const raw = scoreComplexity(analysis) + scoreIssues(analysis) + scoreStructure(analysis);
  const score = Math.round(raw);
  return { file: analysis.file, score, grade: toGrade(score) };
}

export function calculateProjectScore(result: AnalysisResult): ProjectScore {
  if (result.files.length === 0) {
    return { score: 100, grade: 'A', distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 } };
  }

  const fileScores = result.files.map(f => calculateFileScore(f));
  const distribution: Record<Grade, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const fs of fileScores) {
    distribution[fs.grade]++;
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < result.files.length; i++) {
    const funcCount = result.files[i].complexity.functions.length;
    const weight = Math.sqrt(funcCount + 1);
    weightedSum += fileScores[i].score * weight;
    totalWeight += weight;
  }

  const baseScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;

  // Issue density penalty: prevents clean files from masking widespread issues
  const totalIssues = result.files.reduce((sum, f) => sum + f.issues.length, 0);
  const densityPenalty = Math.min(Math.round(Math.sqrt(totalIssues) * 0.8), 15);

  const score = Math.max(0, baseScore - densityPenalty);
  return { score, grade: toGrade(score), distribution };
}
