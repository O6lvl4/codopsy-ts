import { describe, it, expect, afterAll } from 'vitest';
import { generateJsonReport } from '../../src/reporter/json.js';
import type { AnalysisResult } from '../../src/analyzer/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const mockResult: AnalysisResult = {
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

describe('generateJsonReport', () => {
  const tmpDir = path.join(os.tmpdir(), 'codopsy-report-test');
  const outPath = path.join(tmpDir, 'report.json');

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('JSONファイルを出力する', () => {
    generateJsonReport(mockResult, outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(content.timestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('ディレクトリが存在しなくても作成する', () => {
    const deepPath = path.join(tmpDir, 'a', 'b', 'c', 'report.json');
    generateJsonReport(mockResult, deepPath);
    expect(fs.existsSync(deepPath)).toBe(true);
  });
});
