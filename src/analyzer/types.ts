export type Severity = 'error' | 'warning' | 'info';

export interface DuplicationSummary {
  percentage: number;
  totalDuplicatedLines: number;
  totalLines: number;
  cloneCount: number;
}

export interface Issue {
  file: string;
  line: number;
  column: number;
  severity: Severity;
  rule: string;
  message: string;
}

export interface FileAnalysis {
  file: string;
  complexity: {
    cyclomatic: number;
    cognitive: number;
    functions: Array<{
      name: string;
      line: number;
      complexity: number;
      cognitiveComplexity: number;
    }>;
  };
  issues: Issue[];
  score?: {
    score: number;
    grade: string;
  };
}

export interface AnalysisResult {
  timestamp: string;
  targetDir: string;
  files: FileAnalysis[];
  summary: {
    totalFiles: number;
    totalIssues: number;
    issuesBySeverity: Record<Severity, number>;
    averageComplexity: number;
    maxComplexity: { file: string; function: string; complexity: number } | null;
    duplication?: DuplicationSummary;
  };
  score?: {
    overall: number;
    grade: string;
    distribution: Record<string, number>;
    duplicationPenalty?: number;
  };
  duplication?: import('../duplication/types.js').DuplicationResult;
}
