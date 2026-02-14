export type Severity = 'error' | 'warning' | 'info';

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
  };
}
