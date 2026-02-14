import { describe, it, expect, afterAll } from 'vitest';
import { generateHtmlReport } from '../../src/reporter/html.js';
import type { AnalysisResult } from '../../src/analyzer/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockResult: AnalysisResult = {
  timestamp: '2026-01-01T00:00:00.000Z',
  targetDir: '/tmp/test',
  files: [{
    file: '/tmp/test/foo.ts',
    complexity: { cyclomatic: 5, cognitive: 3, functions: [{ name: 'foo', line: 1, complexity: 5, cognitiveComplexity: 3 }] },
    issues: [{ file: '/tmp/test/foo.ts', line: 1, column: 1, severity: 'warning', rule: 'no-any', message: 'test' }],
  }],
  summary: {
    totalFiles: 1,
    totalIssues: 1,
    issuesBySeverity: { error: 0, warning: 1, info: 0 },
    averageComplexity: 5,
    maxComplexity: { file: '/tmp/test/foo.ts', function: 'foo', complexity: 5 },
  },
};

describe('generateHtmlReport', () => {
  const tmpDir = path.join(os.tmpdir(), 'codopsy-html-test');
  const outPath = path.join(tmpDir, 'report.html');

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('HTMLファイルを出力する', () => {
    generateHtmlReport(mockResult, outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    const html = fs.readFileSync(outPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Codopsy Report');
  });

  it('サマリー情報が含まれる', () => {
    generateHtmlReport(mockResult, outPath);
    const html = fs.readFileSync(outPath, 'utf-8');
    expect(html).toContain('1');
    expect(html).toContain('foo');
  });

  it('XSSエスケープが機能する', () => {
    const xssResult: AnalysisResult = {
      ...mockResult,
      targetDir: '<script>alert("xss")</script>',
    };
    generateHtmlReport(xssResult, outPath);
    const html = fs.readFileSync(outPath, 'utf-8');
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
