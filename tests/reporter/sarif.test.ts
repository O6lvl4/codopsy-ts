import { describe, it, expect, afterAll } from 'vitest';
import { formatSarifReport, generateSarifReport } from '../../src/reporter/sarif.js';
import type { AnalysisResult } from '../../src/analyzer/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockResult: AnalysisResult = {
  timestamp: '2026-01-01T00:00:00.000Z',
  targetDir: '/tmp/test',
  files: [{
    file: '/tmp/test/foo.ts',
    complexity: {
      cyclomatic: 5,
      cognitive: 3,
      functions: [{ name: 'foo', line: 1, complexity: 5, cognitiveComplexity: 3 }],
    },
    issues: [
      { file: '/tmp/test/foo.ts', line: 1, column: 1, severity: 'warning', rule: 'no-any', message: 'Avoid using "any" type' },
      { file: '/tmp/test/foo.ts', line: 5, column: 1, severity: 'error', rule: 'max-complexity', message: 'Function "foo" has a cyclomatic complexity of 15' },
    ],
  }],
  summary: {
    totalFiles: 1,
    totalIssues: 2,
    issuesBySeverity: { error: 1, warning: 1, info: 0 },
    averageComplexity: 5,
    maxComplexity: { file: '/tmp/test/foo.ts', function: 'foo', complexity: 5 },
  },
};

const emptyResult: AnalysisResult = {
  timestamp: '2026-01-01T00:00:00.000Z',
  targetDir: '/tmp/test',
  files: [],
  summary: {
    totalFiles: 0,
    totalIssues: 0,
    issuesBySeverity: { error: 0, warning: 0, info: 0 },
    averageComplexity: 0,
    maxComplexity: null,
  },
};

describe('SARIF Reporter', () => {
  const tmpDir = path.join(os.tmpdir(), 'codopsy-sarif-test');

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('有効なSARIF 2.1.0フォーマットを生成する', () => {
    const sarif = JSON.parse(formatSarifReport(mockResult));
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-schema-2.1.0');
    expect(sarif.runs).toHaveLength(1);
  });

  it('ツール情報にcodopsy-tsが含まれる', () => {
    const sarif = JSON.parse(formatSarifReport(mockResult));
    const driver = sarif.runs[0].tool.driver;
    expect(driver.name).toBe('codopsy-ts');
    expect(driver.version).toBe('1.0.1');
  });

  it('issueがresultsに変換される', () => {
    const sarif = JSON.parse(formatSarifReport(mockResult));
    const results = sarif.runs[0].results;
    expect(results).toHaveLength(2);
    expect(results[0].ruleId).toBe('no-any');
    expect(results[0].level).toBe('warning');
    expect(results[1].ruleId).toBe('max-complexity');
    expect(results[1].level).toBe('error');
  });

  it('issueがない場合は空のresults', () => {
    const sarif = JSON.parse(formatSarifReport(emptyResult));
    expect(sarif.runs[0].results).toHaveLength(0);
  });

  it('ファイルに出力できる', () => {
    const outPath = path.join(tmpDir, 'report.sarif');
    generateSarifReport(mockResult, outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(content.version).toBe('2.1.0');
  });
});
