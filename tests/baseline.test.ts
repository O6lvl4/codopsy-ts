import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createBaseline, saveBaseline, loadBaseline, compareWithBaseline } from '../src/baseline.js';
import { AnalysisResult } from '../src/analyzer/types.js';

const tmpDir = path.join(os.tmpdir(), 'codopsy-baseline-test-' + Date.now());

beforeAll(() => { fs.mkdirSync(tmpDir, { recursive: true }); });
afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    timestamp: '2026-01-01T00:00:00.000Z',
    targetDir: '/project',
    files: [],
    summary: {
      totalFiles: 0,
      totalIssues: 0,
      issuesBySeverity: { error: 0, warning: 0, info: 0 },
      averageComplexity: 0,
      maxComplexity: null,
    },
    score: { overall: 100, grade: 'A', distribution: { A: 0, B: 0, C: 0, D: 0, F: 0 } },
    ...overrides,
  };
}

describe('createBaseline', () => {
  it('creates baseline from analysis result', () => {
    const result = makeResult({
      files: [{
        file: '/project/src/index.ts',
        complexity: { cyclomatic: 5, cognitive: 3, functions: [{ name: 'fn', line: 1, complexity: 5, cognitiveComplexity: 3 }] },
        issues: [{ file: '/project/src/index.ts', line: 1, column: 1, severity: 'warning', rule: 'no-var', message: 'msg' }],
        score: { score: 90, grade: 'A' },
      }],
      summary: { totalFiles: 1, totalIssues: 1, issuesBySeverity: { error: 0, warning: 1, info: 0 }, averageComplexity: 5, maxComplexity: null },
    });

    const baseline = createBaseline(result);
    expect(baseline.version).toBe(1);
    expect(baseline.files).toHaveLength(1);
    expect(baseline.files[0].file).toBe('src/index.ts');
    expect(baseline.files[0].issueCount).toBe(1);
    expect(baseline.files[0].warningCount).toBe(1);
    expect(baseline.files[0].maxCyclomatic).toBe(5);
    expect(baseline.overall.totalIssues).toBe(1);
  });
});

describe('saveBaseline / loadBaseline', () => {
  it('round-trips baseline to disk', () => {
    const result = makeResult();
    const filePath = path.join(tmpDir, 'test-baseline.json');
    saveBaseline(result, filePath);

    const loaded = loadBaseline(filePath);
    expect(loaded).not.toBeNull();
    expect(loaded!.version).toBe(1);
    expect(loaded!.overall.score).toBe(100);
  });

  it('returns null for non-existent file', () => {
    expect(loadBaseline(path.join(tmpDir, 'nope.json'))).toBeNull();
  });
});

describe('compareWithBaseline', () => {
  it('detects unchanged state', () => {
    const result = makeResult({ score: { overall: 90, grade: 'A', distribution: {} } });
    const baseline = createBaseline(result);
    const comparison = compareWithBaseline(result, baseline);
    expect(comparison.status).toBe('unchanged');
    expect(comparison.overall.scoreDelta).toBe(0);
  });

  it('detects improvement (higher score)', () => {
    const old = makeResult({ score: { overall: 80, grade: 'B', distribution: {} } });
    const baseline = createBaseline(old);

    const current = makeResult({ score: { overall: 95, grade: 'A', distribution: {} } });
    const comparison = compareWithBaseline(current, baseline);
    expect(comparison.status).toBe('improved');
    expect(comparison.overall.scoreDelta).toBe(15);
  });

  it('detects degradation (lower score)', () => {
    const old = makeResult({ score: { overall: 95, grade: 'A', distribution: {} } });
    const baseline = createBaseline(old);

    const current = makeResult({
      score: { overall: 70, grade: 'C', distribution: {} },
      summary: { totalFiles: 0, totalIssues: 5, issuesBySeverity: { error: 0, warning: 5, info: 0 }, averageComplexity: 0, maxComplexity: null },
    });
    const comparison = compareWithBaseline(current, baseline);
    expect(comparison.status).toBe('degraded');
    expect(comparison.overall.scoreDelta).toBe(-25);
    expect(comparison.overall.issuesDelta).toBe(5);
  });

  it('counts new and removed files', () => {
    const old = makeResult({
      files: [
        { file: '/project/a.ts', complexity: { cyclomatic: 1, cognitive: 0, functions: [] }, issues: [], score: { score: 100, grade: 'A' } },
        { file: '/project/removed.ts', complexity: { cyclomatic: 1, cognitive: 0, functions: [] }, issues: [], score: { score: 100, grade: 'A' } },
      ],
    });
    const baseline = createBaseline(old);

    const current = makeResult({
      files: [
        { file: '/project/a.ts', complexity: { cyclomatic: 1, cognitive: 0, functions: [] }, issues: [], score: { score: 100, grade: 'A' } },
        { file: '/project/new.ts', complexity: { cyclomatic: 1, cognitive: 0, functions: [] }, issues: [], score: { score: 100, grade: 'A' } },
      ],
    });
    const comparison = compareWithBaseline(current, baseline);
    expect(comparison.newFiles).toBe(1);
    expect(comparison.removedFiles).toBe(1);
  });

  it('tracks degraded and improved files', () => {
    const old = makeResult({
      files: [
        { file: '/project/good.ts', complexity: { cyclomatic: 1, cognitive: 0, functions: [] }, issues: [], score: { score: 60, grade: 'C' } },
        { file: '/project/bad.ts', complexity: { cyclomatic: 1, cognitive: 0, functions: [] }, issues: [], score: { score: 90, grade: 'A' } },
      ],
    });
    const baseline = createBaseline(old);

    const current = makeResult({
      files: [
        { file: '/project/good.ts', complexity: { cyclomatic: 1, cognitive: 0, functions: [] }, issues: [], score: { score: 90, grade: 'A' } },
        { file: '/project/bad.ts', complexity: { cyclomatic: 1, cognitive: 0, functions: [] }, issues: [], score: { score: 50, grade: 'D' } },
      ],
    });
    const comparison = compareWithBaseline(current, baseline);
    expect(comparison.improvedFiles).toContain('good.ts');
    expect(comparison.degradedFiles).toContain('bad.ts');
  });
});
