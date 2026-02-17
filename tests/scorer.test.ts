import { describe, it, expect } from 'vitest';
import { calculateFileScore, calculateProjectScore } from '../src/scorer.js';
import { FileAnalysis, AnalysisResult } from '../src/analyzer/types.js';

function makeFileAnalysis(overrides: Partial<FileAnalysis> = {}): FileAnalysis {
  return {
    file: 'test.ts',
    complexity: { cyclomatic: 1, cognitive: 0, functions: [] },
    issues: [],
    ...overrides,
  };
}

function makeResult(files: FileAnalysis[]): AnalysisResult {
  return {
    timestamp: '',
    targetDir: '.',
    files,
    summary: {
      totalFiles: files.length,
      totalIssues: files.flatMap(f => f.issues).length,
      issuesBySeverity: { error: 0, warning: 0, info: 0 },
      averageComplexity: 0,
      maxComplexity: null,
    },
  };
}

describe('calculateFileScore', () => {
  it('perfect file gets 100 (grade A)', () => {
    const fa = makeFileAnalysis({
      complexity: { cyclomatic: 3, cognitive: 2, functions: [{ name: 'fn', line: 1, complexity: 3, cognitiveComplexity: 2 }] },
    });
    const score = calculateFileScore(fa);
    expect(score.score).toBe(100);
    expect(score.grade).toBe('A');
  });

  it('high cyclomatic complexity reduces score', () => {
    const fa = makeFileAnalysis({
      complexity: {
        cyclomatic: 20,
        cognitive: 5,
        functions: [{ name: 'fn', line: 1, complexity: 20, cognitiveComplexity: 5 }],
      },
    });
    const score = calculateFileScore(fa);
    // 40 - (20-10)*3 = 10 complexity + 40 issue + 20 structure = 70
    expect(score.score).toBe(70);
    expect(score.grade).toBe('C');
  });

  it('high cognitive complexity reduces score', () => {
    const fa = makeFileAnalysis({
      complexity: {
        cyclomatic: 5,
        cognitive: 25,
        functions: [{ name: 'fn', line: 1, complexity: 5, cognitiveComplexity: 25 }],
      },
    });
    const score = calculateFileScore(fa);
    // 40 - (25-15)*2 = 20 complexity + 40 issue + 20 structure = 80
    expect(score.score).toBe(80);
    expect(score.grade).toBe('B');
  });

  it('errors reduce score significantly', () => {
    const fa = makeFileAnalysis({
      issues: [
        { file: 'test.ts', line: 1, column: 1, severity: 'error', rule: 'no-any', message: 'err' },
        { file: 'test.ts', line: 2, column: 1, severity: 'error', rule: 'no-any', message: 'err' },
      ],
    });
    const score = calculateFileScore(fa);
    // 40 complexity + (40 - 8*2) = 24 issue + 20 structure = 84
    expect(score.score).toBe(84);
    expect(score.grade).toBe('B');
  });

  it('warnings reduce score moderately', () => {
    const fa = makeFileAnalysis({
      issues: [
        { file: 'test.ts', line: 1, column: 1, severity: 'warning', rule: 'no-var', message: 'warn' },
        { file: 'test.ts', line: 2, column: 1, severity: 'warning', rule: 'no-var', message: 'warn' },
        { file: 'test.ts', line: 3, column: 1, severity: 'warning', rule: 'no-var', message: 'warn' },
      ],
    });
    const score = calculateFileScore(fa);
    // 40 + (40 - 3*3) + 20 = 91
    expect(score.score).toBe(91);
    expect(score.grade).toBe('A');
  });

  it('structural issues (max-lines, max-depth, max-params) reduce score', () => {
    const fa = makeFileAnalysis({
      issues: [
        { file: 'test.ts', line: 1, column: 1, severity: 'warning', rule: 'max-lines', message: 'too long' },
        { file: 'test.ts', line: 1, column: 1, severity: 'warning', rule: 'max-depth', message: 'too deep' },
        { file: 'test.ts', line: 1, column: 1, severity: 'warning', rule: 'max-params', message: 'too many params' },
      ],
    });
    const score = calculateFileScore(fa);
    // 40 + (40 - 3*3) + (20 - 10 - 5 - 5) = 40 + 31 + 0 = 71
    expect(score.score).toBe(71);
    expect(score.grade).toBe('C');
  });

  it('extreme issues floor at 0 per component', () => {
    const fa = makeFileAnalysis({
      issues: Array.from({ length: 20 }, (_, i) => ({
        file: 'test.ts', line: i, column: 1, severity: 'error' as const, rule: 'no-any', message: 'err',
      })),
    });
    const score = calculateFileScore(fa);
    // 40 complexity + max(40 - 20*8, 0) = 0 issue + 20 structure = 60
    expect(score.score).toBe(60);
    expect(score.grade).toBe('C');
  });

  it('grade F for terrible file', () => {
    const fa = makeFileAnalysis({
      complexity: {
        cyclomatic: 30,
        cognitive: 40,
        functions: [{ name: 'fn', line: 1, complexity: 30, cognitiveComplexity: 40 }],
      },
      issues: Array.from({ length: 10 }, (_, i) => ({
        file: 'test.ts', line: i, column: 1, severity: 'error' as const, rule: 'no-any', message: 'err',
      })),
    });
    const score = calculateFileScore(fa);
    expect(score.grade).toBe('F');
  });
});

describe('calculateProjectScore', () => {
  it('empty project gets A', () => {
    const result = makeResult([]);
    const score = calculateProjectScore(result);
    expect(score.score).toBe(100);
    expect(score.grade).toBe('A');
  });

  it('all clean files get A', () => {
    const files = [
      makeFileAnalysis({ file: 'a.ts', complexity: { cyclomatic: 2, cognitive: 1, functions: [{ name: 'a', line: 1, complexity: 2, cognitiveComplexity: 1 }] } }),
      makeFileAnalysis({ file: 'b.ts', complexity: { cyclomatic: 3, cognitive: 2, functions: [{ name: 'b', line: 1, complexity: 3, cognitiveComplexity: 2 }] } }),
    ];
    const result = makeResult(files);
    const score = calculateProjectScore(result);
    expect(score.score).toBe(100);
    expect(score.grade).toBe('A');
  });

  it('distribution counts grades correctly', () => {
    const files = [
      makeFileAnalysis({ file: 'good.ts' }),
      makeFileAnalysis({
        file: 'bad.ts',
        complexity: {
          cyclomatic: 30,
          cognitive: 40,
          functions: [{ name: 'fn', line: 1, complexity: 30, cognitiveComplexity: 40 }],
        },
        issues: Array.from({ length: 10 }, (_, i) => ({
          file: 'bad.ts', line: i, column: 1, severity: 'error' as const, rule: 'no-any', message: 'err',
        })),
      }),
    ];
    const result = makeResult(files);
    const score = calculateProjectScore(result);
    expect(score.distribution.A).toBe(1);
    expect(score.distribution.F).toBe(1);
  });
});
