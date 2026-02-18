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
    // 35 - min((20-10)*2, 15) = 35 - 15 = 20 complexity + 40 issues + 25 structure = 85
    expect(score.score).toBe(85);
    expect(score.grade).toBe('B');
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
    // 35 - min((25-15)*1.5, 12) = 35 - 12 = 23 complexity + 40 issues + 25 structure = 88
    expect(score.score).toBe(88);
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
    // 35 complexity + round(40 - 8*2) = 24 issues + 25 structure = 84
    expect(score.score).toBe(84);
    expect(score.grade).toBe('B');
  });

  it('warnings reduce score with sqrt diminishing returns', () => {
    const fa = makeFileAnalysis({
      issues: [
        { file: 'test.ts', line: 1, column: 1, severity: 'warning', rule: 'no-var', message: 'warn' },
        { file: 'test.ts', line: 2, column: 1, severity: 'warning', rule: 'no-var', message: 'warn' },
        { file: 'test.ts', line: 3, column: 1, severity: 'warning', rule: 'no-var', message: 'warn' },
      ],
    });
    const score = calculateFileScore(fa);
    // 35 + round(40 - 4*sqrt(3)) = round(40 - 6.93) = 33 + 25 = 93
    expect(score.score).toBe(93);
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
    // 35 complexity + 40 issues (structure rules excluded) + (25 - 10 - 4 - 3) = 35 + 40 + 8 = 83
    expect(score.score).toBe(83);
    expect(score.grade).toBe('B');
  });

  it('multiple max-depth violations increase penalty gradually', () => {
    const fa = makeFileAnalysis({
      issues: [
        { file: 'test.ts', line: 1, column: 1, severity: 'warning', rule: 'max-depth', message: 'too deep' },
        { file: 'test.ts', line: 5, column: 1, severity: 'warning', rule: 'max-depth', message: 'too deep' },
        { file: 'test.ts', line: 10, column: 1, severity: 'warning', rule: 'max-depth', message: 'too deep' },
      ],
    });
    const score = calculateFileScore(fa);
    // 35 complexity + 40 issues + (25 - min(4*3, 12)) = 35 + 40 + 13 = 88
    expect(score.score).toBe(88);
    expect(score.grade).toBe('B');
  });

  it('extreme issues floor at 0 per component', () => {
    const fa = makeFileAnalysis({
      issues: Array.from({ length: 20 }, (_, i) => ({
        file: 'test.ts', line: i, column: 1, severity: 'error' as const, rule: 'no-any', message: 'err',
      })),
    });
    const score = calculateFileScore(fa);
    // 35 complexity + max(round(40 - 8*20), 0) = 0 issues + 25 structure = 60
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
    // complexity: 35 - min(20*2,15) - min(25*1.5,12) = 8
    // issues: round(40 - 80) = 0
    // structure: 25
    // total: 33 → F
    expect(score.score).toBe(33);
    expect(score.grade).toBe('F');
  });

  it('max-complexity and max-cognitive-complexity excluded from issues', () => {
    const fa = makeFileAnalysis({
      issues: [
        { file: 'test.ts', line: 1, column: 1, severity: 'warning', rule: 'max-complexity', message: 'too complex' },
        { file: 'test.ts', line: 1, column: 1, severity: 'warning', rule: 'max-cognitive-complexity', message: 'too complex' },
      ],
    });
    const score = calculateFileScore(fa);
    // Both rules excluded from issues → no penalty
    // 35 + 40 + 25 = 100
    expect(score.score).toBe(100);
    expect(score.grade).toBe('A');
  });

  it('many same-rule warnings get sqrt diminishing returns', () => {
    const fa = makeFileAnalysis({
      issues: Array.from({ length: 10 }, (_, i) => ({
        file: 'test.ts', line: i, column: 1, severity: 'warning' as const, rule: 'no-var', message: 'warn',
      })),
    });
    const score = calculateFileScore(fa);
    // 35 + round(40 - 4*sqrt(10)) = round(40 - 12.65) = 27 + 25 = 87
    expect(score.score).toBe(87);
    expect(score.grade).toBe('B');
  });

  it('diverse warnings from different rules accumulate more', () => {
    const rules = ['no-var', 'no-eval', 'eqeqeq', 'no-shadow', 'no-redeclare',
                    'no-dupe-keys', 'no-unreachable', 'no-debugger', 'no-alert', 'no-with'];
    const fa = makeFileAnalysis({
      issues: rules.map((rule, i) => ({
        file: 'test.ts', line: i, column: 1, severity: 'warning' as const, rule, message: 'warn',
      })),
    });
    const score = calculateFileScore(fa);
    // 35 + round(40 - 10 * 4*sqrt(1)) = round(40 - 40) = 0 + 25 = 60
    expect(score.score).toBe(60);
    expect(score.grade).toBe('C');
  });

  it('many info issues have minimal impact with sqrt', () => {
    const fa = makeFileAnalysis({
      issues: Array.from({ length: 29 }, (_, i) => ({
        file: 'test.ts', line: i, column: 1, severity: 'info' as const, rule: 'no-console', message: 'console',
      })),
    });
    const score = calculateFileScore(fa);
    // 35 + round(40 - 1*sqrt(29)) = round(40 - 5.39) = 35 + 25 = 95
    expect(score.score).toBe(95);
    expect(score.grade).toBe('A');
  });

  it('complexity cap prevents single function from draining all points', () => {
    const fa = makeFileAnalysis({
      complexity: {
        cyclomatic: 50,
        cognitive: 80,
        functions: [{ name: 'fn', line: 1, complexity: 50, cognitiveComplexity: 80 }],
      },
    });
    const score = calculateFileScore(fa);
    // CC excess=40 → min(40*2, 15) = 15; CogCC excess=65 → min(65*1.5, 12) = 12
    // complexity: 35 - 15 - 12 = 8
    // 8 + 40 + 25 = 73
    expect(score.score).toBe(73);
    expect(score.grade).toBe('C');
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
