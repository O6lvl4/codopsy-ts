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

const SEVERITY_PENALTY: Record<string, number> = {
  error: 8,
  warning: 3,
  info: 1,
};

const STRUCTURE_RULES: Record<string, number> = {
  'max-lines': 10,
  'max-depth': 5,
  'max-params': 5,
};

function scoreComplexity(analysis: FileAnalysis): number {
  let score = 40;
  for (const fn of analysis.complexity.functions) {
    if (fn.complexity > 10) score -= (fn.complexity - 10) * 3;
    if (fn.cognitiveComplexity > 15) score -= (fn.cognitiveComplexity - 15) * 2;
  }
  return clampMin0(score);
}

function scoreIssues(analysis: FileAnalysis): number {
  let score = 40;
  for (const issue of analysis.issues) {
    score -= SEVERITY_PENALTY[issue.severity] ?? 0;
  }
  return clampMin0(score);
}

function scoreStructure(analysis: FileAnalysis): number {
  let score = 20;
  for (const [rule, penalty] of Object.entries(STRUCTURE_RULES)) {
    if (analysis.issues.some(i => i.rule === rule)) score -= penalty;
  }
  return clampMin0(score);
}

export function calculateFileScore(analysis: FileAnalysis): FileScore {
  const score = scoreComplexity(analysis) + scoreIssues(analysis) + scoreStructure(analysis);
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

  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;
  return { score, grade: toGrade(score), distribution };
}
